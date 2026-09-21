export type Sender = 'You' | 'AI' | 'Action' | 'Error'

// A vision image the agent just created, attached to the log line that
// announces it. Shown inline in the chat: the file name alone says nothing
// about WHAT was cropped, so a wrong crop stays invisible until the macro
// misbehaves. Raw pixel size travels along so the view can scale tiny icon
// crops up to something a human can actually judge.
export interface ConversationImage {
  dataUrl: string
  width: number
  height: number
}

export interface ConversationItem {
  sender: Sender
  message: string
  image?: ConversationImage
}

export class AiConversation {
  private static instance: AiConversation
  private _conversation: ConversationItem[] = []

  // Private constructor to prevent instantiation
  private constructor() {}

  /**
   * Get the single instance of the AiConversation class.
   */
  static getInstance(): AiConversation {
    if (!AiConversation.instance) {
      AiConversation.instance = new AiConversation()
    }
    return AiConversation.instance
  }

  /**
   * Add a message to the conversation.
   * @param sender - The name of the sender.
   * @param message - The content of the message.
   */
  addMessage(sender: Sender, message: string, image?: ConversationImage): void {
    this._conversation.push({
      sender,
      message,
      image
    })
  }

  get conversation(): ConversationItem[] {
    return [...this._conversation]
  }

  /**
   * Clear the conversation history.
   */
  clearHistory(): void {
    this._conversation = []
  }
}

// Example usage:
// const chat = AiConversation.getInstance();
// chat.addMessage("Alice", "Hi, Bob!");
// chat.addMessage("Bob", "Hello, Alice!");
// const consversation = chat.conversation;
