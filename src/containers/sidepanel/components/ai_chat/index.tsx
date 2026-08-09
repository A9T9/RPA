import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { State } from '@/reducers/state'
import './ai-chat.scss'
import { ConversationItem, Sender } from './ai_conversation'

import { getVarsInstance } from '@/common/variables'
import { captureScreenShot } from '@/modules/helper'
import { getAIProviderConfig } from '@/services/ai/computer_use/service'
import { isFreeTierConsentPending } from '@/services/ai/uivision_free_tier'
import { MacroAgentService } from '@/services/ai/macro_agent/service'
import { ComputerUseMessageType } from '@/services/ai/computer_use/model'
import { MacroResultStatus } from '@/services/kv_data/macro_extra_data'
import { Button, Tooltip } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// Deep-path imports keep webpack from bundling the whole icon set (tree-shaking
// is disabled by the CommonJS babel transform in webpack.prod.config.js)
import { faArrowUp } from '@fortawesome/free-solid-svg-icons/faArrowUp'
import { faStop } from '@fortawesome/free-solid-svg-icons/faStop'
import { faPlus } from '@fortawesome/free-solid-svg-icons/faPlus'
import { faBroom } from '@fortawesome/free-solid-svg-icons/faBroom'
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
}

interface AiChatStateProps {
  config: { [key: string]: any }
  editing: { commands: any[]; meta: { src: null | { id: string; name: string } } }
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

  componentDidMount() {
    this.maybeConsumePrefill()
  }

  // "Open AI settings" links: settings live on the options page — one
  // surface for sidebar and IDE alike
  openAiSettings = () => {
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
    isActionOrResult: 'action' | 'result' | null = null
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
        this.addConversation('Action', message)
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
        // the screenshot tool's scope: "desktop" wins; otherwise follow the
        // CV scope setting like the classic commands do
        const isDesktop = !!(opts && opts.desktop) || this.props.config.cvScope === 'desktop'
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

  addConversation = (sender: Sender, message: string, isError?: boolean) => {
    // functional update — several log calls can land before a re-render, and
    // spreading this.state.conversation would drop all but the last of them
    this.setState((prev) => ({
      conversation: [
        ...prev.conversation,
        {
          sender,
          message
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
    this.setState({
      processRunning: true,
      aiPromptText: '',
      statusText: 'Starting'
    })

    return this.getMacroAgentService()
      .run(prompt)
      .then(() => {
        this.running = false
        this.setState({ processRunning: false, statusText: '' })
      })
      .catch((error) => {
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

  newChat = () => {
    if (this.state.processRunning) {
      return
    }

    this.getMacroAgentService().createNewChat()
    this.setState({
      conversation: []
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
    if (this.props.updateConfig) {
      // the tier is explicit: "free" here must not inherit a PRO tier left
      // over in config from a previous selection
      this.props.updateConfig({ aiProvider: 'uivision', uivisionTier: 'free' })
    }
    this.setState({ freeTierJustChosen: true })
  }

  // one-time AI setup choice, shown until the user picks the free tier here
  // or a provider in Settings > AI (both save config.aiProvider). Doubles as
  // the privacy consent for the free tier — see isFreeTierConsentPending.
  renderProviderChoice = () => (
    <div className="ai-welcome">
      <div className="ai-setup-card">
        <p>
          <strong>One-time setup: choose your AI</strong>
        </p>
        <p>
          Ui.Vision is built for 100% local operation — you can connect your own AI (local, or with your API key) in
          the settings at any time. Because local AI takes some setup and a fast machine, we offer a free Ui.Vision AI
          service during the beta.
        </p>
        <p>
          If you use it, your chat content (including screenshots) is sent to our server only to compute the AI
          answer. It is not stored.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '10px 0' }}>
          <Button type="primary" onClick={this.chooseFreeTier}>
            Use Ui.Vision AI — free, no setup needed
          </Button>
          <Button onClick={this.openAiSettings}>I use my own AI — open settings</Button>
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
                label: `Improve the current macro (${macroName})`,
                prompt: 'Review the current macro and improve it — make it more robust and easier to read.'
              },
          {
            label: 'Explain the current macro',
            prompt: 'Explain what the current macro does, step by step, in simple terms.'
          },
          {
            label: 'Add error handling',
            prompt: 'Add error handling to the current macro, so it reports a clear message when a step fails.'
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
          {examplePrompts.map((p: { label: string; prompt?: string; disabled?: boolean }) => (
            <button
              key={p.label}
              className="ai-example-prompt"
              disabled={!!p.disabled}
              onClick={() => this.send(p.prompt || p.label)}
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
            {isFreeTierConsentPending(this.props.config)
              ? this.renderProviderChoice()
              : this.state.conversation.length === 0
                ? this.renderWelcome()
                : null}
            {this.state.conversation.map((item, i) => {
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
                        Increase your AI limit 10 times with our new AI PRO plan — more details at{' '}
                        <a href="https://go.ui.vision/?help=aipro" target="_blank" rel="noreferrer">
                          AI PRO
                        </a>
                        .
                      </div>
                    ) : null}
                  </div>
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
          <textarea
            className="chat-input"
            placeholder='e.g. "Fix the current macro" or "Create a macro that fills out this form"'
            value={this.state.aiPromptText}
            onChange={(e) => this.setState({ aiPromptText: e.target.value })}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter inserts a newline
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                this.send()
              }
            }}
          />
          <div className="chat-actions">
            <Tooltip title="New chat">
              <Button
                className="new-chat-button"
                shape="circle"
                disabled={this.state.processRunning}
                onClick={() => {
                  this.newChat()
                }}
              >
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            </Tooltip>
            <Tooltip title="Clear chat (keeps the session)">
              <Button
                className="clear-chat-button"
                shape="circle"
                disabled={this.state.conversation.length === 0}
                onClick={this.clearChat}
              >
                <FontAwesomeIcon icon={faBroom} />
              </Button>
            </Tooltip>
            {this.state.processRunning ? (
              <Tooltip title="Stop">
                <Button className="send-button stop" shape="circle" type="primary" danger onClick={this.stop}>
                  <FontAwesomeIcon icon={faStop} />
                </Button>
              </Tooltip>
            ) : (
              <Tooltip title="Send (Enter)">
                <Button
                  className="send-button"
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
