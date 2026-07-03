export const enum ExtensionMessageSenderType {
    Background,
    ContentScript,
    Popup
}

export const enum ExtensionMessageType {
    Initialized,
    FocusPopup,
    SelectRegion,
    CaptureRegion,
    CaptureScreen,
    CaptureFullScreen,
    StartCaptureFullScreen,
    EndCaptureFullScreen,
    ScrollPage,
    GetScrollOffset,
    ClearRegions,
    HighlightRegions,
    ClickRegion
}

export interface ExtensionMessageSender {
    type: ExtensionMessageSenderType;
    tabId?: number;
}

export interface ExtensionMessage {
    sender: ExtensionMessageSender;
    type: ExtensionMessageType;
    data: any;
}

export interface ExtensionConnection {
    sendAsync(type: ExtensionMessageType, data?: any): Promise<any>;
}

export type ExtensionMessageListener = (message: ExtensionMessage) => Promise<any>;

export class ContentScriptConnection implements ExtensionConnection {
    private tabId: number;

    constructor(tabId: number) {
        this.tabId = tabId;
    }

    sendAsync(type: ExtensionMessageType, data?: any): Promise<any> {
        const msg: ExtensionMessage = {
            type,
            sender: {
                type: ExtensionMessageSenderType.Background,
                tabId: undefined
            },
            data: data || {}
        };
        return browser.tabs.sendMessage(this.tabId, msg, undefined);
    }
}

export class BackgroundConnection implements ExtensionConnection {
    private senderType: ExtensionMessageSenderType;
    private senderTabId?: number;
    private listener: ExtensionMessageListener;

    constructor(senderType: ExtensionMessageSenderType, listener: ExtensionMessageListener) {
        this.senderType = senderType;
        this.listener = listener;

        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (sender.tab) {
                this.senderTabId = sender.tab.id;
            }

            this.listener(message).then(response => {
                sendResponse(response);
            });

            return true;
        });
    }

    sendAsync(type: ExtensionMessageType, data?: any): Promise<any> {
        const msg: ExtensionMessage = {
            type,
            sender: {
                type: this.senderType,
                tabId: this.senderTabId
            },
            data: data || {}
        };
        return browser.runtime.sendMessage(undefined, msg, undefined);
    }
}
