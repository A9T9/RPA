import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'
import { AutoComplete, Button, Checkbox, Input, Modal, Select, Switch } from 'antd'
import AnthropicService, { NO_ANTHROPIC_API_KEY_ERROR } from '@/services/ai/anthropic/anthropic.service'
import { DEFAULT_MACRO_AGENT_SYSTEM_PROMPT } from '@/services/ai/macro_agent/service'
import { Actions as simpleActions } from '@/actions/simple_actions'
import * as actions from '@/actions'
import { State } from '@/reducers/state'
import { message } from 'antd'

// Provider ids stored in config.aiProvider
export type AIProvider = 'anthropic' | 'openrouter' | 'local' | 'uivision'

// What the AI Provider dropdown offers: the provider ids, plus PRO as its own
// entry. PRO is NOT a provider id — it is the 'uivision' provider with
// config.uivisionTier = 'pro' (see uivision_free_tier.ts for why).
type ProviderSelection = AIProvider | 'uivision-pro'

import { ANTHROPIC, MCP_BRIDGE, OPENAI_COMPAT } from '@/common/constant'
import {
  getInstallId,
  getProKey,
  isProKeyFormat,
  isProTier,
  mapUIVisionFreeTierError,
  PRO_KEY_CONFIG_NAME,
  PRO_KEY_FORMAT_ERROR,
  uivInstallHeader
} from '@/services/ai/uivision_free_tier'
import { isDevTestBrowser, testMcpBridge, probeBridgeConnections } from '@/services/mcp_bridge'
import { normalizeApiKey } from '@/services/ai/computer_use/service'

// One-line installer for the MCP bridge (shown with a Copy button in the
// bridge settings). `--setup` writes the server entry into every MCP client
// installed on the machine and prints the pairing token.
//
// It replaces the old `claude mcp add uivision -- ...` one-liner, which only
// worked when the `claude` CLI was on PATH — it is not in the desktop app, the
// VS Code extension, Cursor or Windsurf, and that was the single biggest
// reason first-time setup failed.
//
// Uses the published npm package so end users never need the repo; developers
// can point at mcp/uivision-mcp-bridge.js directly (see mcp/README.md).
const MCP_BRIDGE_SETUP_CMD = 'npx uivision-mcp-bridge --setup'

// Manual fallback for MCP clients the installer does not know about: the raw
// server entry to paste into whatever config file that client uses.
const MCP_BRIDGE_SETUP_JSON = JSON.stringify(
  { mcpServers: { uivision: { command: 'npx', args: ['-y', 'uivision-mcp-bridge'] } } },
  null,
  2
)

const OPENROUTER_BASE_URL = OPENAI_COMPAT.OPENROUTER_BASE_URL
const DEFAULT_OPENROUTER_MODEL = OPENAI_COMPAT.DEFAULT_OPENROUTER_MODEL
const DEFAULT_LOCAL_BASE_URL = OPENAI_COMPAT.DEFAULT_LOCAL_BASE_URL
const UIVISION_BASE_URL = OPENAI_COMPAT.UIVISION_BASE_URL

// Curated picks (vision-capable models with good UI grounding — same family
// of recommendations as Midscene/Nanobrowser). Users can type any model id.
const OPENROUTER_MODEL_OPTIONS = [
  { value: 'anthropic/claude-sonnet-5', label: 'anthropic/claude-sonnet-5 — recommended: best results' },
  { value: 'openai/gpt-5.6-luna', label: 'openai/gpt-5.6-luna — low cost, good results' },
  { value: 'qwen/qwen3.7-plus', label: 'qwen/qwen3.7-plus — low cost, slower on visual tasks' },
  { value: 'google/gemini-3.7-flash', label: 'google/gemini-3.7-flash — low cost, fast, weaker on desktop visual tasks' }
]

const ANTHROPIC_MODEL_OPTIONS = [
  { value: 'claude-opus-4-8', label: 'claude-opus-4-8 — recommended for computer use' },
  { value: 'claude-sonnet-5', label: 'claude-sonnet-5 — faster and cheaper' }
]
interface AiTabProps {
  config: { [key: string]: any }
  updateConfig: (config: { [key: string]: any }) => void
}

interface AiTabAppState {
  apiKeyInput: string
  prompt: string
  promptResponse: string
  error: string
  testing: boolean
  // system prompt editor is collapsed by default to keep the tab compact
  showSystemPrompt: boolean
  // MCP bridge "Test" button: a connection attempt is in flight
  testingBridge: boolean
  // dev/test browser (unpacked install or Firefox Dev/Beta): token waived
  devTestBrowser: boolean
  // connected browsers as the bridge labels them (chrome#1, firefox#2, ...)
  // — null until a probe answered; the active one gets the marker
  bridgeConnections: string[] | null
  bridgeActive: string | null
}

class AITab extends React.Component<AiTabProps, AiTabAppState> {
  componentDidMount () {
    isDevTestBrowser().then(dev => this.setState({ devTestBrowser: dev }))
    this.refreshBridgeConnections()
  }

  // ask the bridge who is connected (chrome#1, firefox#2, ...) — settings
  // run outside the panel, so a one-shot probe is how this page learns it
  refreshBridgeConnections = () => {
    probeBridgeConnections().then(info => {
      this.setState({
        bridgeConnections: info ? info.connections : null,
        bridgeActive: info ? info.active : null
      })
    })
  }

  constructor(props: any) {
    super(props)
    this.onClickTestPrompt = this.onClickTestPrompt.bind(this)
  }

  state: AiTabAppState = {
    apiKeyInput: '',
    // The Test button sends this as a bare user message — no system prompt,
    // no Ui.Vision context — so the prompt must not lean on either. (The old
    // "Explain a random uiv. api command" did, and the model confidently
    // explained a Linux shell command.) A joke request needs no context to
    // answer, any working model can do it, and a chuckle beats an API
    // explainer for "is my key working".
    prompt: 'Tell a Ui.Vision joke',
    promptResponse: '',
    error: '',
    testing: false,
    showSystemPrompt: false,
    testingBridge: false,
    devTestBrowser: false,
    bridgeConnections: null,
    bridgeActive: null
  }

  testBridge = () => {
    this.setState({ testingBridge: true })
    testMcpBridge()
      .then((r) => (r.ok ? message.success(r.text, 5) : message.error(r.text, 6)))
      .finally(() => {
        this.setState({ testingBridge: false })
        this.refreshBridgeConnections()
      })
  }

  getProvider(): AIProvider {
    // free tier as default so new installs have working AI out of the box;
    // keep in sync with getAIProviderConfig() in computer_use/service.ts
    return this.props.config.aiProvider || 'uivision'
  }

  // PRO tier picked in the dropdown (with or without a key entered yet)
  isPro(): boolean {
    return isProTier(this.props.config)
  }

  // PRO picked AND a key saved. The tier on its own still runs on free quota,
  // so this is what error texts and the test call must key off.
  hasProKey(): boolean {
    return this.isPro() && !!getProKey(this.props.config)
  }

  // The dropdown lists the two Ui.Vision tiers separately; everything else
  // maps 1:1 to a provider id.
  getProviderSelection(): ProviderSelection {
    const provider = this.getProvider()
    return provider === 'uivision' && this.isPro() ? 'uivision-pro' : provider
  }

  onSelectProvider = (selection: ProviderSelection) => {
    if (selection === 'uivision' || selection === 'uivision-pro') {
      // one provider, two tiers — written together so the pair is never
      // half-updated (PRO selected with the free tier still recorded)
      this.props.updateConfig({ aiProvider: 'uivision', uivisionTier: selection === 'uivision-pro' ? 'pro' : 'free', ...(selection === 'uivision' ? { shareUsageStatistics: true } : {}) })
    } else {
      this.props.updateConfig({ aiProvider: selection })
    }
    this.setState({ apiKeyInput: '', promptResponse: '' })
  }

  // Which config key stores the API key of the currently selected provider
  getApiKeyConfigName(): string | null {
    switch (this.getProvider()) {
      case 'anthropic':
        return 'anthropicAPIKey'
      case 'openrouter':
        return 'openRouterAPIKey'
      case 'local':
        return null // local endpoints usually need no key
      case 'uivision':
        // The FREE tier has no key entry at all — it authenticates with a
        // generated install ID. Only PRO shows a field.
        return this.isPro() ? PRO_KEY_CONFIG_NAME : null
    }
  }

  saveApiKey = () => {
    const configName = this.getApiKeyConfigName()
    if (!configName) return

    // Checked here rather than left to the server: the shape is fixed, and a
    // typo that only surfaces as a rejected AI call minutes later reads as
    // "the key I paid for does not work".
    if (configName === PRO_KEY_CONFIG_NAME && !isProKeyFormat(this.state.apiKeyInput)) {
      message.error(PRO_KEY_FORMAT_ERROR)
      return
    }

    const doSave = () => {
      // strip paste artifacts (whitespace, auto-capitalized "Sk-") that make
      // providers reject the key with confusing 401s
      this.props.updateConfig({ [configName]: normalizeApiKey(this.state.apiKeyInput) })
      this.setState({ apiKeyInput: '' })
      message.success('API key saved')
    }

    if (this.props.config[configName]) {
      Modal.confirm({
        title: 'Confirm',
        content: 'Do you want to overwrite the existing API key?',
        okText: 'Yes',
        cancelText: 'No',
        onOk: doSave
      })
    } else {
      doSave()
    }
  }

  // Test the prompt against the ACTIVE provider, so a misconfigured
  // key/endpoint/model shows up here and not first in the AI chat
  async onClickTestPrompt() {
    const provider = this.getProvider()
    this.setState({ testing: true, promptResponse: '' })

    try {
      if (provider === 'anthropic') {
        const anthropicAPIKey = normalizeApiKey(this.props.config.anthropicAPIKey || '')
        if (!anthropicAPIKey) {
          message.error(NO_ANTHROPIC_API_KEY_ERROR)
          return
        }

        const anthropicService = new AnthropicService(anthropicAPIKey)
        const response = await anthropicService.getPromptResponse(this.state.prompt)
        this.setState({ promptResponse: response, error: '' })
        return
      }

      // OpenRouter, local endpoints and the Ui.Vision free tier all speak
      // the OpenAI chat format
      const isLocal = provider === 'local'
      const isUIVision = provider === 'uivision'
      const baseURL = isUIVision
        ? UIVISION_BASE_URL
        : isLocal
          ? (this.props.config.localAIBaseURL || DEFAULT_LOCAL_BASE_URL)
          : OPENROUTER_BASE_URL
      const model = isUIVision
        ? OPENAI_COMPAT.UIVISION_PLACEHOLDER_MODEL // server forces the real model
        : isLocal
          ? (this.props.config.localAIModel || '')
          : (this.props.config.openRouterModel || DEFAULT_OPENROUTER_MODEL)
      // on PRO the purchased key is the bearer token; the install ID rides in
      // X-UIV-Install below. Tier picked but no key yet = still the free tier.
      const proKey = this.hasProKey() ? getProKey(this.props.config) : ''
      const apiKey = isUIVision
        ? proKey || (await getInstallId())
        : isLocal ? '' : normalizeApiKey(this.props.config.openRouterAPIKey || '')

      if (provider === 'openrouter' && !apiKey) {
        message.error('Please enter and save your OpenRouter API key first.')
        return
      }
      if (isLocal && !model) {
        message.error('Please enter the local model name (e.g. qwen3-vl).')
        return
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      if (!isLocal) headers['X-Title'] = 'Ui.Vision RPA'
      // device id — our proxy only; on PRO the Bearer header is the account key
      Object.assign(headers, uivInstallHeader(baseURL))
      // without this the Settings test call lands in the proxy's "unlabelled"
      // bucket, where it is indistinguishable from an unknown caller — and
      // most of that bucket is this button, hit before a key is entered
      headers['X-UIV-Task'] = 'settings.test'
      // build cohort marker (retention.md 9.4), same as the real AI calls
      headers['X-UIV-Version'] = chrome.runtime.getManifest().version

      // Reasoning models (qwen3.7 family and friends) burn "thinking" tokens
      // against max_tokens and then return an EMPTY answer with finish_reason
      // "length" — observed live with qwen3.7-plus on this very button. Same
      // fix the chat and computer-use loops carry: OpenRouter's unified
      // reasoning switch, sent only there (local endpoints may not know the
      // param, and the Ui.Vision proxy forces it server-side anyway).
      const body: any = {
        model,
        messages: [{ role: 'user', content: this.state.prompt }],
        max_tokens: 300
      }
      if (/openrouter\.ai/i.test(baseURL)) body.reasoning = { enabled: false }

      const res = await fetch(`${baseURL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!res.ok) {
        const body = await res.text().catch(() => '')
        throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`)
      }

      const data = await res.json()
      const text = data?.choices?.[0]?.message?.content
      if (!text) throw new Error(`Empty response: ${JSON.stringify(data).slice(0, 300)}`)

      this.setState({ promptResponse: text, error: '' })
    } catch (error: any) {
      console.error('Error getting response:', error)
      const freeTierMessage = mapUIVisionFreeTierError(error?.message || '', this.hasProKey())
      message.error(freeTierMessage || error.message)
    } finally {
      this.setState({ testing: false })
    }
  }

  render() {
    const onConfigChange = (key: string, val: any) => {
      this.props.updateConfig({ [key]: val })
    }

    const provider = this.getProvider()
    const isPro = this.isPro()
    const apiKeyConfigName = this.getApiKeyConfigName()
    const hasSavedKey = !!(apiKeyConfigName && this.props.config[apiKeyConfigName])
    const isPromptOverridden = ((this.props.config.aiMacroAgentSystemPrompt || '') as string).trim().length > 0

    return (
      <div className="ai-tab">
        <div className="row" style={{ marginBottom: '20px' }}>
          The AI commands feature is currently experimental/beta. The built-in Ui.Vision AI works without an API key; for the
          other providers, enter their API key{' '}
          <a href="https://go.ui.vision/?help=aiprovider" target="_blank">
            (more information)
          </a>
          :
        </div>

        <div className="ai-settings-item">
          <span className="label-text">AI Provider:</span>
          <Select
            style={{ minWidth: 320 }}
            value={this.getProviderSelection()}
            onChange={this.onSelectProvider}
            options={[
              { value: 'uivision', label: 'Ui.Vision AI (Free Beta) — no API key needed' },
              // a ratio, not a number: the daily limits are server settings
              // and change without an extension release
              { value: 'uivision-pro', label: 'Ui.Vision AI PRO (Beta) - 10x the free limit' },
              { value: 'anthropic', label: 'Anthropic Claude — best overall results' },
              { value: 'openrouter', label: 'OpenRouter — many models, one key' },
              { value: 'local', label: 'Local — OpenAI-compatible (e.g. Ollama), no key' }
            ]}
          />
        </div>

        {apiKeyConfigName && (
          <div className="ai-settings-item">
            <span className="label-text">
              {isPro ? 'PRO Key' : 'API Key'}
              {hasSavedKey ? ' (saved)' : ''}:
            </span>
            <Input
              type="password"
              placeholder={
                hasSavedKey
                  ? '••••••••  (enter a new key to replace it)'
                  : isPro
                    ? 'Paste your PRO key'
                    : 'Enter API key'
              }
              value={this.state.apiKeyInput}
              onChange={(e) => {
                this.setState({ apiKeyInput: e.target.value })
              }}
            />
            <Button type="primary" disabled={!this.state.apiKeyInput} onClick={this.saveApiKey}>
              Save
            </Button>
            {isPro && (
              <a href="https://go.ui.vision/?help=apiprogetkey" target="_blank" style={{ marginLeft: '10px', whiteSpace: 'nowrap' }}>
                Get a PRO key
              </a>
            )}
          </div>
        )}

        {provider === 'anthropic' && (
          <div className="ai-settings-item">
            <span className="label-text">Model:</span>
            <AutoComplete
              style={{ minWidth: 420 }}
              value={this.props.config.anthropicModel || ANTHROPIC.COMPUTER_USE_MODEL}
              options={ANTHROPIC_MODEL_OPTIONS}
              onChange={(val: string) => onConfigChange('anthropicModel', val)}
              placeholder="Pick a model or type any Anthropic model id"
            />
          </div>
        )}

        {provider === 'openrouter' && (
          <div className="ai-settings-item">
            <span className="label-text">Model:</span>
            <AutoComplete
              style={{ minWidth: 420 }}
              value={this.props.config.openRouterModel || DEFAULT_OPENROUTER_MODEL}
              options={OPENROUTER_MODEL_OPTIONS}
              onChange={(val: string) => onConfigChange('openRouterModel', val)}
              placeholder="Pick a model or type any OpenRouter model id"
            />
          </div>
        )}

        {provider === 'local' && (
          <>
            <div className="ai-settings-item">
              <span className="label-text">Base URL:</span>
              <Input
                type="text"
                placeholder={DEFAULT_LOCAL_BASE_URL}
                value={this.props.config.localAIBaseURL || ''}
                onChange={(e) => onConfigChange('localAIBaseURL', e.target.value)}
              />
            </div>
            <div className="ai-settings-item">
              <span className="label-text">Model name:</span>
              <Input
                type="text"
                placeholder="e.g. qwen3-vl"
                value={this.props.config.localAIModel || ''}
                onChange={(e) => onConfigChange('localAIModel', e.target.value)}
              />
            </div>
            <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
              The chat's instructions alone are about 40k tokens, so load the model with a context window of at least 64k
              (LM Studio: "Context Length" when loading, base URL http://localhost:1234/v1; Ollama: num_ctx).
              A smaller context fails with "exceeds the available context size" in LM Studio and is cut silently in Ollama.
            </div>
            <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
              For Ollama, allow extension access first: set OLLAMA_ORIGINS=chrome-extension://* before starting Ollama.
            </div>
          </>
        )}

        {provider === 'uivision' && !isPro && (
          <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
            Free beta: a shared daily spending allowance for both engines, per installation. This tier includes basic usage statistics. Switch to another AI option to turn them off in Settings &gt; Advanced &gt; Privacy.
            For unlimited and reliable use, select another provider and add your own API key.
          </div>
        )}

        {provider === 'uivision' && isPro && (
          <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
            {hasSavedKey ? (
              <>
                PRO beta: 10x the free daily limit. Use "Test Prompt" below to check the key.
              </>
            ) : (
              // the silent-downgrade warning: PRO is selected, so the free
              // tier's own limit notice above is hidden — without this the tab
              // would say nothing about which quota the requests are spending
              <>No PRO key saved yet, so requests still run on the free daily limit. Paste your key above and click Save.</>
            )}
          </div>
        )}

        {provider !== 'anthropic' && provider !== 'uivision' && (
          <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
            The AI chat and aiComputerUse use this provider. The models in the list above are tested with Ui.Vision; other
            (vision-capable) models may work but can misplace clicks.
          </div>
        )}

        <div className="ai-settings-item">
          <span className="label-text">Test Prompt:</span>
          <Input
            type="text"
            value={this.state.prompt}
            onChange={(e) => {
              this.setState({ prompt: e.target.value })
            }}
          />
          <Button type="primary" loading={this.state.testing} onClick={this.onClickTestPrompt}>
            Test
          </Button>
        </div>
        {/* answer area only exists once a test ran — keeps the tab compact */}
        {this.state.testing || this.state.promptResponse ? (
          <>
            <div className="row" style={{ marginBottom: '10px' }}>
              AI Answer:
            </div>
            <div className="ai-response">
              <pre>{this.state.promptResponse}</pre>
            </div>
          </>
        ) : null}
        <div className="ai-settings-item" style={{ marginTop: '20px' }}>
          <span className="label-text">
            <strong>MCP bridge (Claude Code):</strong>
          </span>
          <Switch
            checked={!!this.props.config.mcpBridgeEnabled}
            onChange={(checked: boolean) => onConfigChange('mcpBridgeEnabled', checked)}
          />
          <a href="https://go.ui.vision/?help=mcp" target="_blank" style={{ marginLeft: '10px' }}>
            (more info)
          </a>
        </div>
        {this.props.config.mcpBridgeEnabled ? (
          <>
            {this.state.bridgeConnections && this.state.bridgeConnections.length ? (
              // who holds a bridge connection right now — with several
              // browsers on one bridge these labels (chrome#1, firefox#2)
              // are how the user tells them apart; the ACTIVE one is where
              // the AI's tool calls go (select_browser switches it)
              <div className="row" style={{ marginBottom: '10px', fontSize: '12px', color: '#389e0d' }}>
                <strong>Connected now:</strong>{' '}
                {this.state.bridgeConnections.map(l => l === this.state.bridgeActive ? `${l} (active)` : l).join(', ')}
                {' '}&mdash; the AI drives the <em>active</em> one; its <code>select_browser</code> tool switches.
              </div>
            ) : null}
            <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
              Lets Claude Code (or any MCP client) build and run macros in this browser. The side panel connects to a
              small local bridge process on 127.0.0.1 and must stay open while the AI works.
            </div>
            <div className="ai-settings-item">
              <span className="label-text">Run this once:</span>
              <Input readOnly value={MCP_BRIDGE_SETUP_CMD} style={{ fontFamily: 'monospace', fontSize: '12px' }} />
              <Button
                onClick={() => {
                  navigator.clipboard
                    .writeText(MCP_BRIDGE_SETUP_CMD)
                    .then(() => message.success('Command copied — run it in a terminal, then quit and reopen Claude Code'))
                    .catch(() => message.error('Could not copy — select the text and copy manually'))
                }}
              >
                Copy
              </Button>
            </div>
            <div className="row" style={{ marginBottom: '10px', fontSize: '12px' }}>
              Paste it into a terminal. It registers Ui.Vision with every MCP client on this machine (Claude Code,
              Claude Desktop, Cursor, Windsurf, VS Code).{' '}
              <strong>Then quit and reopen Claude Code</strong> — or whichever of those apps you use. MCP servers are
              loaded only at startup, so an app that was already running will not see Ui.Vision, and opening a new chat
              or tab is not enough.
              <Button
                type="link"
                style={{ padding: '0 4px', fontSize: '12px', height: 'auto' }}
                onClick={() => {
                  navigator.clipboard
                    .writeText(MCP_BRIDGE_SETUP_JSON)
                    .then(() => message.success('JSON copied — add it to your MCP client’s config file'))
                    .catch(() => message.error('Could not copy — see ui.vision/mcp'))
                }}
              >
                Copy the JSON config instead
              </Button>
              for any other MCP client.
            </div>
            <div className="ai-settings-item">
              <span className="label-text">Connection:</span>
              <Button loading={this.state.testingBridge} onClick={this.testBridge}>
                Test
              </Button>
              <span style={{ marginLeft: 8, fontSize: '12px', color: '#389e0d' }}>
                Chrome, Edge and Firefox pair automatically — the bridge recognises the Ui.Vision extension by its origin.
              </span>
            </div>
            <div className="ai-settings-item">
              <span className="label-text">Bridge port:</span>
              <Input
                type="number"
                style={{ width: '120px' }}
                placeholder={String(MCP_BRIDGE.DEFAULT_PORT)}
                value={this.props.config.mcpBridgePort || ''}
                onChange={(e) => onConfigChange('mcpBridgePort', e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="ai-system-prompt">
          <div className="row" style={{ marginBottom: '5px' }}>
            <strong>AI Chat system prompt</strong>
            {isPromptOverridden ? <span style={{ marginLeft: '8px', color: '#ad6800' }}>(edited)</span> : null}
            <Button
              size="small"
              style={{ marginLeft: '10px' }}
              onClick={() => this.setState({ showSystemPrompt: !this.state.showSystemPrompt })}
            >
              {this.state.showSystemPrompt ? 'Hide' : 'Show'}
            </Button>
            <a href="https://go.ui.vision/?help=aiprompt" target="_blank" style={{ marginLeft: '10px' }}>
              (more info)
            </a>
            {this.state.showSystemPrompt ? (
              <Button
                size="small"
                style={{ marginLeft: '10px' }}
                disabled={!isPromptOverridden}
                onClick={() => {
                  // empty override = use the built-in default (and pick up
                  // future improvements of it automatically)
                  onConfigChange('aiMacroAgentSystemPrompt', '')
                  message.success('Restored the default system prompt')
                }}
              >
                Restore default
              </Button>
            ) : null}
          </div>
          {this.state.showSystemPrompt ? (
            <>
              <div className="row" style={{ marginBottom: '5px', fontSize: '12px' }}>
                The instructions the sidebar AI Chat (macro assistant) works with. Edit at your own risk — the tool
                descriptions and working rules are tuned; as long as it is unedited, updates to Ui.Vision may improve it.
                On the built-in Ui.Vision AI, an unedited prompt is served server-side (always up to date); other
                providers use the prompt below.
              </div>
              <div className="row" style={{ marginBottom: '5px', fontSize: '12px' }}>
                <Checkbox
                  checked={!!this.props.config.aiDevLocalPrompt}
                  onChange={(e) => onConfigChange('aiDevLocalPrompt', e.target.checked)}
                >
                  DEV: send this build's prompt on the Ui.Vision AI too (skip the server-served prompt — for testing
                  local prompt changes without a server deploy)
                </Checkbox>
              </div>
              <Input.TextArea
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: '11px' }}
                value={
                  isPromptOverridden
                    ? this.props.config.aiMacroAgentSystemPrompt
                    : DEFAULT_MACRO_AGENT_SYSTEM_PROMPT
                }
                onChange={(e) => {
                  onConfigChange('aiMacroAgentSystemPrompt', e.target.value)
                }}
              />
            </>
          ) : null}
        </div>

        <div className="row" style={{ marginBottom: '10px', color: 'red' }}>
          {this.state.error}
        </div>
      </div>
    )
  }
}

export default connect(
  (state: State) => ({
    status: state.status,
    config: state.config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(AITab)
