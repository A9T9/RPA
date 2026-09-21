import { ConversationItem } from './ai_conversation'

// Self-test hook: lets the MCP bridge drive the REAL in-panel chat — same
// model, same tools, same prompts a user gets — so an agent regression can be
// reproduced and re-verified from outside without a human typing into the
// composer. The chat component registers itself on mount; null means the AI
// Chat pane has not been mounted in this panel yet (the pane mounts on first
// activation of its tab).
export interface BridgeChatHandle {
  send: (prompt: string) => void
  newChat: () => void
  transcript: () => ConversationItem[]
  running: () => boolean
  // the panel's MCP emergency stop halts a chat run the agent started too
  stop: () => void
}

let handle: BridgeChatHandle | null = null

export const registerChatForBridge = (h: BridgeChatHandle | null): void => {
  handle = h
}

export const getChatForBridge = (): BridgeChatHandle | null => handle
