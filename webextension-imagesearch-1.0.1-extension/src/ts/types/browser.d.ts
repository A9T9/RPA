/**
 * Incomplete type definitions for WebExtensions API.
 */

declare namespace browser {
    interface ExtensionEvent<T> {
        addListener(listener: T): void;
        removeListener(listener: T): void;
        hasListener(listener: T): void;
    }

    namespace browserAction {
        type ClickEventListener = (tab: tabs.Tab) => void;

        const onClicked: ExtensionEvent<ClickEventListener>;
    }

    namespace extension {
        function getURL(path: string): string;
    }

    namespace runtime {
        interface MessageSender {
            tab?: tabs.Tab;
            frameId?: number;
            id?: string;
            url?: string;
            tlsChannelId?: string;
        }

        type MessageEventListener = (message: any, sender: MessageSender, sendResponse: (arg: any) => void) => boolean | Promise<any>;

        const onMessage: ExtensionEvent<MessageEventListener>;

        function sendMessage(extensionId: string|undefined, message: any, options: any): Promise<any>;
    }

    namespace tabs {
        interface ImageDetails {
            format?: string;
            quality?: number;
        }

        interface QueryInfo {
            active?: boolean;
            audible?: boolean;
            autoDiscardable?: boolean;
            cookieStoreId?: string;
            currentWindow?: boolean;
            discarded?: boolean;
            highlighted?: boolean;
            index?: number;
            muted?: boolean;
            lastFocusedWindow?: boolean;
            openerTabId?: number;
            pinned?: boolean;
            status?: string;
            title?: string;
            url?: string;
            windowId?: number;
            windowType?: string;
        }

        interface MutedInfo {
            extensionId?: string;
            muted: boolean;
            reason?: string;
        }

        interface Tab {
            active?: boolean;
            audible?: boolean;
            autoDiscardable?: boolean;
            cookieStoreId?: string;
            discarded?: boolean;
            favIconUrl?: string;
            height?: number;
            hidden: boolean;
            highlighted: boolean;
            id?: number;
            incognito: boolean;
            index: number;
            isArticle: boolean;
            isInReaderMode: boolean;
            lastAccessed: number;
            mutedInfo?: tabs.MutedInfo;
            openerTabId?: number;
            pinned: boolean;
            selected: boolean;
            sessionId?: string;
            status?: string;
            title?: string;
            url?: string;
            width?: number;
            windowId: number;
        }

        interface ActiveInfo {
            tabId: number;
            windowId: number;
        }

        type ActivatedEventListener = (activeInfo: ActiveInfo) => void;
        const onActivated: ExtensionEvent<ActivatedEventListener>;

        function captureVisibleTab(windowId?: number, options?: ImageDetails): Promise<string>;
        function get(tabId: number): Promise<tabs.Tab>;
        function query(queryInfo: QueryInfo): Promise<Array<tabs.Tab>>;
        function sendMessage(tabId: number, message: any, options: any): Promise<any>;
        function update(tabId: number | undefined, updateProperties: any): Promise<tabs.Tab>;
    }

    namespace windows {
        interface Window {
            alwaysOnTop: boolean;
            focused: boolean;
            height?: number;
            id?: number;
            incognito: boolean;
            left?: number;
            sessionId?: string;
            state?: string;
            tabs?: Array<tabs.Tab>;
            title?: string;
            top?: number;
            type?: string;
            width?: number;
        }

        function create(createData?: any): Promise<windows.Window>;
        function getCurrent(getInfo?: any): Promise<windows.Window>;
        function getLastFocused(getInfo?: any): Promise<windows.Window>;
        function update(windowId: number, updateInfo: any): Promise<windows.Window>;
    }
}
