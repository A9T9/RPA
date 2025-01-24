export type Sender = 'You' | 'AI' | 'Action' | 'Error'
export interface ConversationItem {
  sender: Sender
  message: string
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
  addMessage(sender: Sender, message: string): void {
    this._conversation.push({
      sender,
      message
    })
  }

  get conversation(): { sender: Sender; message: string }[] {
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
