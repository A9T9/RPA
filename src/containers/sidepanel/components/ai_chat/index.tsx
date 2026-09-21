import AIEnginePicker from '@/components/ai_engine_picker'
import { isXModuleOcrAvailable } from '@/modules/ocr'
import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { State } from '@/reducers/state'
import './ai-chat.scss'
import { ConversationImage, ConversationItem, Sender } from './ai_conversation'
import { registerChatForBridge } from './bridge_hook'

import { getVarsInstance } from '@/common/variables'
import { captureScreenShot } from '@/modules/helper'
import { getAIProviderConfig } from '@/services/ai/computer_use/service'
import { isFreeTierConsentPending } from '@/services/ai/uivision_free_tier'
import { MacroAgentService } from '@/services/ai/macro_agent/service'
import { ComputerUseMessageType } from '@/services/ai/computer_use/model'
import { MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { Button, Dropdown, Input, Tooltip } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// Deep-path imports keep webpack from bundling the whole icon set (tree-shaking
// is disabled by the CommonJS babel transform in webpack.prod.config.js)
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp'
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import { openSettings } from '@/ext/common/tab'

interface AiChatState {
  processRunning: boolean
  conversation: ConversationItem[]
  aiPromptText: string
  // live one-liner shown in the status bar while the agent works ("Waiting
  // for AI answer", tool being executed, ...) so the chat never looks hung
  statusText: string
  // true right after the free-tier opt-in — greets once in the welcome screen
  freeTierJustChosen: boolean
  debugProviderChoice: boolean
}

interface AiChatStateProps {
  config: { [key: string]: any }
  editing: { script?: string; commands: any[]; meta: { src: null | { id: string; name: string } } }
  ui?: { [key: string]: any }
  logs?: any[]
  macrosExtra?: { [id: string]: any }
  updateUI?: (data: { [key: string]: any }) => void
  updateConfig?: (config: { [key: string]: any }) => void
  renderStatus: (statusText: string) => void
}

// Minimal inline markdown for AI answers — just **bold** and `code`, the two
// forms the model actually uses in chat. Output is React nodes (no HTML
// injection); real newlines are preserved by white-space: pre-wrap in the scss.
const renderInlineMarkdown = (text: string): React.ReactNode => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

// On-screen size for an inline vision image. Crops arrive in raw device
// pixels, so a toolbar icon is ~30px — too small to judge — while a button
// crop from a HiDPI shot can be wider than the panel. Scale tiny ones UP to
// MIN_SIDE and large ones down to fit, aspect ratio preserved; an upscaled
// crop renders pixelated so icon edges stay readable instead of smearing.
const VISION_IMAGE_MIN_SIDE = 64
const VISION_IMAGE_MAX_WIDTH = 260
const VISION_IMAGE_MAX_HEIGHT = 220

const visionImageStyle = ({ width, height }: ConversationImage): React.CSSProperties => {
  const w = Math.max(1, width)
  const h = Math.max(1, height)
  const up = Math.max(1, VISION_IMAGE_MIN_SIDE / Math.max(w, h))
  const scale = up * Math.min(1, VISION_IMAGE_MAX_WIDTH / (w * up), VISION_IMAGE_MAX_HEIGHT / (h * up))
  const rendering: 'pixelated' | 'auto' = scale > 1 ? 'pixelated' : 'auto'
  // WIDTH ONLY, height comes from the CSS (height: auto). The panel can be
  // dragged to its 260px minimum, narrower than this width plus the 56px of
  // container insets, and the stylesheet's max-width: 100% is what stops the
  // crop from putting a horizontal scrollbar across the whole transcript.
  // An inline height would beat that rule's height: auto and squash the
  // aspect ratio the moment max-width clamped the width — so the height is
  // left to the intrinsic ratio, which yields the same box when nothing
  // clamps (the scale below already honours both caps) and the right one when
  // something does. Floor at 1px: a crop clamped against the capture edge can
  // come back 600x1, and rounding its short side to 0 would render nothing.
  return {
    width: Math.max(1, Math.round(w * scale)),
    imageRendering: rendering
  }
}

// Open a chat image full-size in its own tab. The inline rendering is a few
// hundred px wide — fine for "is the red box on the right icon", useless for
// reading a full-desktop run screenshot. A data: URL cannot be a top-level
// page in Chrome, so it goes out as a blob URL; not revoked, because the tab
// may live (and be reloaded) long after any timer we could pick, and the
// backing bytes are already held in chat state anyway.
const openImageFullSize = (dataUrl: string) => {
  try {
    const [meta, b64] = dataUrl.split(',')
    const mime = (meta.match(/^data:([^;]+)/) || [])[1] || 'image/png'
    const bytes = atob(b64)
    const arr = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
    const url = URL.createObjectURL(new Blob([arr], { type: mime }))
    window.open(url, '_blank')
  } catch (e) {
    // a broken image is not worth an error dialog
  }
}

// AI chat = macro assistant. The agent reads/edits the macro in the editor,
// runs it through the player, inspects the page and iterates — it does not
// click around via computer use (that mode was removed from the chat; the
// aiComputerUse macro command still exists).
class AiChat extends React.Component<AiChatStateProps, AiChatState> {
  macroAgentService: MacroAgentService | null = null
  conversationRef: React.RefObject<HTMLDivElement>
  // instance flag, not state: setState is batched, and the agent loop checks
  // this synchronously right after Send is clicked
  running = false
  // which run the promise handlers in send() belong to — "new chat" bumps it
  // so an abandoned run resolving late cannot flip processRunning or drop an
  // error message into the fresh conversation
  runSeq = 0
  // fixed per mount so the randomly picked creation chip in the welcome
  // screen doesn't change on every re-render
  welcomeChipSeed = Math.random()
  // stick-to-bottom: keep the newest message in view unless the user
  // scrolled up to read older ones (scrolling back down re-enables it)
  stickToBottom = true

  constructor(props: AiChatStateProps) {
    super(props)
    this.conversationRef = React.createRef<HTMLDivElement>()
    this.appendMessage = this.appendMessage.bind(this)
  }

  state: AiChatState = {
    processRunning: false,
    conversation: [],
    aiPromptText: ``,
    statusText: '',
    debugProviderChoice: window.location.hash === '#debugbluebutton',
    freeTierJustChosen: false
  }

  // entry point for other parts of the app ("Fix with AI" in the status bar):
  // they set ui.aiChatPrefill and switch to this tab; the text lands in the
  // composer for the user to review and send
  maybeConsumePrefill = () => {
    const prefill = this.props.ui && this.props.ui.aiChatPrefill
    if (!prefill || !this.props.updateUI) return

    this.props.updateUI({ aiChatPrefill: null })
    this.setState({ aiPromptText: prefill })
  }

  onDebugHashChange = () => {
    this.setState({ debugProviderChoice: window.location.hash === '#debugbluebutton' })
  }

  dismissDebugProviderChoice = () => {
    this.setState({ debugProviderChoice: false })
    if (window.location.hash === '#debugbluebutton') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }

  componentDidMount() {
    window.addEventListener('hashchange', this.onDebugHashChange)
    this.maybeConsumePrefill()
    // the bridge drives THIS instance — the closures read live state, so the
    // handle never goes stale while the pane stays mounted (antd keeps
    // inactive panes mounted once activated)
    registerChatForBridge({
      send: (p: string) => {
        void this.send(p)
      },
      newChat: this.newChat,
      transcript: () => this.state.conversation,
      running: () => this.state.processRunning,
      stop: this.stop
    })
  }

  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onDebugHashChange)
    registerChatForBridge(null)
  }

  // "Open AI settings" links: settings live on the options page — one
  // surface for sidebar and IDE alike
  openAiSettings = () => {
    this.dismissDebugProviderChoice()
    openSettings('ai')
  }

  componentDidUpdate(prevProps: AiChatStateProps, prevState: AiChatState) {
    this.maybeConsumePrefill()

    // auto-scroll on every new message — and again when the chat tab comes
    // back into view: while it is hidden (the agent switches to the Macro tab
    // during run_macro) the pane has no height, so scrolling there is a no-op
    // and must be redone on return
    const tabBecameVisible =
      this.props.ui &&
      this.props.ui.sidebarTab === 'AiChat' &&
      (!prevProps.ui || prevProps.ui.sidebarTab !== 'AiChat')

    if ((prevState.conversation !== this.state.conversation && this.stickToBottom) || tabBecameVisible) {
      this.scrollToBottom()
      // once more after layout settles (long messages wrap, fonts load)
      setTimeout(this.scrollToBottom, 100)
    }
  }

  scrollToBottom = () => {
    const el = this.conversationRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    // fallback for layouts where the tabs content holder ends up scrolling
    // instead of the conversation div
    const holder = el.closest('.ant-tabs-content-holder')
    if (holder) holder.scrollTop = holder.scrollHeight
  }

  onConversationScroll = () => {
    const el = this.conversationRef.current
    if (!el || el.clientHeight === 0) return // hidden pane — not a user scroll
    this.stickToBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  appendMessage = (
    message: string,
    type: ComputerUseMessageType | null = null,
    isActionOrResult: 'action' | 'result' | null = null,
    image?: ConversationImage
  ) => {
    // keep the status bar current: API waits are the long silent stretches,
    // everything else (actions, tool results) shows as "what runs right now"
    if (type === 'status') {
      const calling = /^Calling API \((.+)\)$/.exec(message)
      this.setState({ statusText: calling ? `Waiting for AI answer (${calling[1]})` : message })
    } else if (isActionOrResult) {
      this.setState({ statusText: message })
    }

    if (type === 'ai') {
      if (isActionOrResult === 'action') {
        this.addConversation('Action', message)
      } else if (isActionOrResult === 'result') {
        // tool results are fed back to the model; don't clutter the chat
      } else {
        this.addConversation('AI', message)
      }
    } else if (type === 'user') {
      if (isActionOrResult === 'result') {
        this.addConversation('Action', message, false, image)
      } else if (isActionOrResult !== 'action') {
        this.addConversation('You', message)
      }
    } else if (type === 'status') {
      this.props.renderStatus(message)
    }
  }

  getMacroAgentService = (): MacroAgentService => {
    if (!this.macroAgentService) {
      const captureScreenShotFunction = async (opts?: { desktop?: boolean }) => {
        const vars = getVarsInstance()
        // an explicit scope from the tool wins in BOTH directions (the MCP
        // screenshot tool promises "the browser tab unless scope: desktop");
        // only a call without one follows the CV scope setting like the
        // classic commands do (OPEN-ISSUES 20.3)
        const isDesktop = (opts && typeof opts.desktop === 'boolean') ? opts.desktop : this.props.config.cvScope === 'desktop'
        const shot = await captureScreenShot({
          vars,
          isDesktop
        })
        if (!shot) throw new Error('screenshot capture failed')
        return shot
      }

      this.macroAgentService = new MacroAgentService({
        logMessage: this.appendMessage,
        shouldStop: () => !this.running,
        captureScreenShotFunction
      })
    }
    return this.macroAgentService
  }

  addConversation = (sender: Sender, message: string, isError?: boolean, image?: ConversationImage) => {
    // functional update — several log calls can land before a re-render, and
    // spreading this.state.conversation would drop all but the last of them
    this.setState((prev) => ({
      conversation: [
        ...prev.conversation,
        {
          sender,
          message,
          image
        }
      ]
    }))
    // scrolling happens in componentDidUpdate (stick-to-bottom)
  }

  send = async (prompt_?: string) => {
    const prompt = prompt_ || this.state.aiPromptText
    if (this.state.processRunning || prompt === '') {
      return
    }

    // Reopen onboarding for review without resetting the saved provider or transcript.
    if (prompt.trim().toLowerCase() === '#debugbluebutton') {
      this.setState({ debugProviderChoice: true, aiPromptText: '' })
      return
    }
    if (this.state.debugProviderChoice) return

    // QA hook: type debugshowaiprobanner to render the daily-limit error with
    // its AI PRO banner — the SAME error text and match path a real E703
    // takes, so what this shows is exactly what users get. No AI call is made.
    if (prompt.trim().toLowerCase() === 'debugshowaiprobanner') {
      this.setState({ aiPromptText: '' })
      this.addConversation('Error', 'Daily free AI limit reached. It resets at midnight. Add your own API key in Settings > AI for unlimited use or sign-up for the Ui.Vision AI PRO plan.', true)
      return
    }

    // consent gate: without an explicit choice the default provider would be
    // the free tier, and nothing may be sent to its server before the opt-in
    if (isFreeTierConsentPending(this.props.config)) {
      this.addConversation('AI', 'Please choose your AI setup first (see above): the free Ui.Vision AI, or your own AI in the settings.')
      return
    }

    this.addConversation('You', prompt)
    this.running = true
    const runSeq = ++this.runSeq
    this.setState({
      processRunning: true,
      aiPromptText: '',
      statusText: 'Starting'
    })

    return this.getMacroAgentService()
      .run(prompt)
      .then(() => {
        if (runSeq !== this.runSeq) return
        this.running = false
        this.setState({ processRunning: false, statusText: '' })
      })
      .catch((error) => {
        if (runSeq !== this.runSeq) return
        console.log('error:>> ', error)
        this.running = false
        this.setState({ processRunning: false, statusText: '' })
        this.addConversation('Error', error.message, true)
      })
  }

  stop = () => {
    this.running = false
    this.setState({ processRunning: false, statusText: '' })
  }

  // works during a run too: the click means "abandon this run and start
  // fresh" — the service's generation bump silences whatever is still in
  // flight (API response, remaining tool calls)
  newChat = () => {
    this.running = false
    this.runSeq++
    this.getMacroAgentService().createNewChat()
    this.setState({
      conversation: [],
      processRunning: false,
      statusText: ''
    })
  }

  // wipe only the visible transcript — the agent keeps its session/context
  // (unlike newChat, which starts a fresh conversation with the model)
  clearChat = () => {
    this.setState({
      conversation: []
    })
  }

  chooseFreeTier = () => {
    this.dismissDebugProviderChoice()
    if (this.props.updateConfig) {
      // the tier is explicit: "free" here must not inherit a PRO tier left
      // over in config from a previous selection
      this.props.updateConfig({ aiProvider: 'uivision', uivisionTier: 'free', shareUsageStatistics: true })
    }
    this.setState({ freeTierJustChosen: true })
  }

  // one-time AI setup choice, shown until the user picks the free tier here
  // or a provider in Settings > AI (both save config.aiProvider). Doubles as
  // the privacy consent for the free tier — see isFreeTierConsentPending.
  renderProviderChoice = () => (
    <div className="ai-welcome">
      <div className="ai-setup-card">
        {this.state.debugProviderChoice && <Button size="small" onClick={this.dismissDebugProviderChoice}>Close preview</Button>}
        <p>
          <strong>One-time setup: choose your AI</strong>
        </p>
        <p>
          Ui.Vision is built for 100% local operation - you can connect your own AI (local, or with your API key)
          in the settings at any time. Because local AI takes some setup and a fast machine, we offer a free
          Ui.Vision AI service.
        </p>
        <p>
          If you use it, your chat content (including screenshots) is sent to our server only to compute the AI
          answer. We do not store this content on our server. Selecting the Free Plan turns on basic extension
          usage statistics. You can review them or turn them off anytime in Settings &gt; Advanced &gt; Privacy.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
          <Button type="primary" onClick={this.chooseFreeTier} style={{ height: 'auto', whiteSpace: 'normal', padding: '8px 15px' }}>
            Use Ui.Vision AI - free, no setup needed
          </Button>
          <Button onClick={this.openAiSettings} style={{ height: 'auto', whiteSpace: 'normal', padding: '8px 15px' }}>I use my own AI - open settings</Button>
        </div>
        <p>Either way, the created macros run 100% locally in this browser extension.</p>
      </div>
    </div>
  )

  // empty-chat welcome: what the assistant does, one-click example prompts,
  // and — if the configured provider has no API key yet — a setup hint shown
  // BEFORE the first send can fail on the missing key
  renderWelcome = () => {
    const providerConfig = getAIProviderConfig()
    const needsApiKey = providerConfig.provider !== 'local' && !providerConfig.apiKey

    // context-aware starter prompts: with a macro loaded the chips work ON
    // that macro (fix / explain / extend); without one they show what the
    // assistant can create. Clicking sends directly.
    const { editing } = this.props
    const src = editing && editing.meta ? editing.meta.src : null
    const hasCommands = !!(editing && editing.commands && editing.commands.length)
    const macroLoaded = !!(src || hasCommands)
    const macroName = src && src.name ? src.name : 'unsaved macro'

    // did the loaded macro's last run fail? (same per-macro status the file
    // tree and status bar use)
    const extra = src && src.id && this.props.macrosExtra ? this.props.macrosExtra[src.id] : null
    const lastRunFailed = !!(extra && (extra.status === MacroResultStatus.Error || extra.status === MacroResultStatus.ErrorInSub))
    const logs = this.props.logs || []
    const lastError = logs
      .slice()
      .reverse()
      .find((log: any) => log.type === 'error' && !(log.options && log.options.ignored))
    const lastErrorText = lastError && typeof lastError.text === 'string' ? lastError.text : null

    const creationPrompts = [
      {
        label: 'Search Wikipedia for "Solar cell"',
        prompt: 'Search Wikipedia for "Solar cell".'
      },
      {
        label: 'Extract GitHub stars to CSV',
        prompt:
          'Extract the star count from https://github.com/A9T9/RPA and save it to a csv file with a date/time stamp.'
      },
      {
        label: 'Fill the Ui.Vision contact form with test data',
        prompt:
          'Fill out the Ui.Vision contact form with funny test data and submit it. Use subject [AI Test] so the team can filter these out.'
      },
      {
        label: 'Download the 3 XModules (Win, Mac, Linux)',
        prompt: 'Download the 3 Ui.Vision XModules (Win, Mac, Linux) from https://ui.vision/rpa/x/download'
      },
      {
        label: 'Run OCR on the Ui.Vision logo at ocr.space',
        prompt: 'Go to ocr.space and run OCR on https://ui.vision/content/images/ui.vision.logo2.webp'
      },
      {
        label: 'What can you automate?',
        prompt: 'What kinds of tasks can you automate for me? Give a few concrete examples.'
      }
    ]

    const examplePrompts = macroLoaded
      ? [
          lastRunFailed
            ? {
                label: `Fix the last error (${macroName})`,
                prompt: `My macro "${macroName}" failed${lastErrorText ? ` with this error:\n${lastErrorText}` : ''}.\n\nPlease fix the current macro.`
              }
            : {
                label: `Run again (${macroName})`,
                runAgain: true
              },
          {
            label: 'Explain the current macro',
            prompt: 'Explain what the current macro does, step by step, in simple terms.'
          },
          // keep one creation example so "build something new" stays visible —
          // randomly drawn from the pool (minus the informational last entry)
          creationPrompts[Math.floor(this.welcomeChipSeed * (creationPrompts.length - 1))]
        ]
      : creationPrompts

    return (
      <div className="ai-welcome">
        {this.state.freeTierJustChosen ? (
          <p>
            <strong>Great — you are all set!</strong> What macro should we create?
          </p>
        ) : null}
        <p>
          Tell the AI what to automate. It builds the macro in the editor, runs it and fixes it until it works. Try an
          example:
        </p>
        <div className="ai-example-prompts">
          {examplePrompts.map((p: { label: string; prompt?: string; disabled?: boolean; runAgain?: boolean }) => (
            <button
              key={p.label}
              className="ai-example-prompt"
              disabled={!!p.disabled}
              onClick={() => p.runAgain ? window.dispatchEvent(new Event('uiv-play-current-macro')) : this.send(p.prompt || p.label)}
            >
              {p.label}
            </button>
          ))}
        </div>
        {needsApiKey ? (
          <p className="ai-key-hint">
            One-time setup: add a {providerConfig.label} API key first —{' '}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                this.openAiSettings()
              }}
            >
              open AI settings
            </a>
            .
          </p>
        ) : null}
      </div>
    )
  }

  render() {
    return (
      <>
        <div className="ai-chat">
          <div ref={this.conversationRef} className="ai-conversation" onScroll={this.onConversationScroll}>
            {(this.state.debugProviderChoice || isFreeTierConsentPending(this.props.config))
              ? this.renderProviderChoice()
              : this.state.conversation.length === 0
                ? this.renderWelcome()
                : null}
            {!this.state.debugProviderChoice && this.state.conversation.map((item, i) => {
              return (
                <div className="ai-conversation-item" key={i}>
                  <div
                    className={`${item.sender === 'Error' ? 'sender-error' : item.sender === 'You' ? 'sender-you' : item.sender === 'AI' ? 'sender-ai' : 'sender-action'}`}
                  >
                    <span className="sender">{`${item.sender}: `}</span>
                    {item.sender === 'AI' ? renderInlineMarkdown(item.message) : item.message}
                    {/* shortcut into the AI settings tab: missing/invalid API
                        key errors, missing local model name, and the loop-limit
                        notice (the max-loops setting lives there too) */}
                    {(item.sender === 'Error' && /API key|model name/i.test(item.message)) ||
                    /Loop Limit Reached/i.test(item.message) ? (
                      <a
                        href="#"
                        style={{ marginLeft: '6px' }}
                        onClick={(e) => {
                          e.preventDefault()
                          this.openAiSettings()
                        }}
                      >
                        Open AI settings
                      </a>
                    ) : null}
                    {/* AI PRO upsell under the daily-limit error — the one
                        moment the user is guaranteed to be looking. The log
                        keeps the plain error; the clickable pitch lives here. */}
                    {item.sender === 'Error' && /Daily free AI limit|E703/i.test(item.message) ? (
                      <div className="ai-pro-banner">
                        Increase your AI limit 10 times with our new AI PRO plan - more details at{' '}
                        <a href="https://go.ui.vision/?help=aipro" target="_blank" rel="noreferrer">
                          AI PRO
                        </a>
                        .
                      </div>
                    ) : null}
                  </div>
                  {item.sender === 'Error' && /XModule|native.*host|local OCR/i.test(item.message) && <div>
                    <Button onClick={() => openSettings('desktop-automation')}>Install XModule</Button>
                    <Button onClick={async () => { const available = await isXModuleOcrAvailable(true); this.addConversation('AI', available ? 'Local OCR is available. Your next message will use the updated capabilities.' : 'Local OCR is still unavailable. Check XModule installation and connection in Desktop Automation settings.'); }}>Check again</Button>
                  </div>}
                  {/* the vision image a save_element_image / save_relative_image
                      step just created — the file name alone hides a wrong
                      crop, and this is the moment the user can catch it */}
                  {item.image ? (
                    <div className="ai-vision-image">
                      <img
                        src={item.image.dataUrl}
                        style={visionImageStyle(item.image)}
                        alt={item.message}
                        title="Click to open full size in a new tab"
                        onClick={() => openImageFullSize(item.image!.dataUrl)}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {this.state.processRunning ? (
            <div className="ai-status-bar">
              <span className="ai-status-spinner" />
              <span className="ai-status-text">{this.state.statusText || 'Working'}</span>
            </div>
          ) : null}
        </div>
        <div className="chat-footer">
          <Input.TextArea
            className="chat-input"
            aria-label="Message AI"
            placeholder="Ask anything or describe a task…"
            autoSize={{ minRows: 1, maxRows: 6 }}
            value={this.state.aiPromptText}
            onChange={(e) => this.setState({ aiPromptText: e.target.value })}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter inserts a newline
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                this.send()
              }
            }}
          />
          <div className="chat-actions">
            <Dropdown trigger={['click']} placement="topLeft" menu={{
              items: [
                { key: 'new', label: this.state.processRunning ? 'New chat (stops the current run)' : 'New chat' },
                { key: 'clear', label: 'Clear chat', disabled: this.state.conversation.length === 0 }
              ],
              onClick: ({ key }) => {
                if (key === 'new') this.newChat()
                if (key === 'clear') this.clearChat()
              }
            }}>
              <Button
                className="new-chat-button"
                shape="circle"
                type="text"
                aria-label="Chat actions"
              >
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            </Dropdown>
            <div className="chat-model-control">
              {!this.state.debugProviderChoice && !isFreeTierConsentPending(this.props.config) && <AIEnginePicker config={this.props.config} updateConfig={this.props.updateConfig} disabled={this.state.processRunning} />}
            </div>
            {this.state.processRunning ? (
              <Tooltip title="Stop">
                <Button aria-label="Stop" className="send-button stop" shape="circle" type="primary" danger onClick={this.stop}>
                  <FontAwesomeIcon icon={faStop} />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Send (Enter)">
                <Button
                  className="send-button"
                  aria-label="Send message"
                  shape="circle"
                  type="primary"
                  disabled={this.state.aiPromptText.trim() === ''}
                  onClick={() => {
                    this.send()
                  }}
                >
                  <FontAwesomeIcon icon={faArrowUp} />
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </>
    )
  }
}

export default connect(
  (state: State) => ({
    status: state.status,
    config: state.config,
    editing: state.editor.editing,
    ui: state.ui,
    logs: state.logs,
    macrosExtra: state.editor.macrosExtra
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(AiChat)
