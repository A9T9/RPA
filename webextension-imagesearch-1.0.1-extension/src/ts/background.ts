import "./web-extensions";
import {
    ExtensionConnection,
    ContentScriptConnection,
    ExtensionMessage,
    ExtensionMessageType,
    ExtensionMessageSenderType
} from "./extension-connection";
import { CaptureAdapter } from "./capture-adapter";
import { ScreenCapturer, CaptureData } from "./screen-capturer";
import { ImageHelper } from "./image-helper";
import { Rect } from "./rect";
import { Point } from "./point";
import { delayAsync } from "./utils";

interface AppTabCollection {
    firstPlay?: number;
    toPlay?: number;
    panel?: number;
}

interface TabConnectionCache {
    [tabId: number]: ExtensionConnection;
}

class AppState {
    private tabConnections: TabConnectionCache;
    tabIds: AppTabCollection;

    constructor() {
        this.tabIds = {} as AppTabCollection;
        this.tabConnections = {} as TabConnectionCache;
    }

    getTabConnection(tabId: number): ExtensionConnection {
        if (tabId in this.tabConnections) {
            return this.tabConnections[tabId];
        }

        const connection = new ContentScriptConnection(tabId);
        this.tabConnections[tabId] = connection;
        return connection;
    }
}

const state = new AppState();

async function activateTabAsync(tabId: number, focusWindow: boolean): Promise<browser.tabs.Tab> {
    const tab = await browser.tabs.get(tabId);
    if (focusWindow) {
        await browser.windows.update(tab.windowId, { focused: true });
    }

    await browser.tabs.update(tab.id, { active: true });
    return tab;
}

function bindEvents() {
    browser.tabs.onActivated.addListener(async activeInfo => {
        if (activeInfo.tabId === state.tabIds.panel) {
            return;
        }

        const tab = await browser.tabs.get(activeInfo.tabId);
        // In Firefox, while panel window is loading, "onActivated" triggered with "about:blank"
        if (tab.url !== "about:blank" && tab.url!.indexOf(browser.extension.getURL("")) === -1) {
            state.tabIds.toPlay = state.tabIds.firstPlay = activeInfo.tabId;
        }
    });

    browser.browserAction.onClicked.addListener(async (tab: browser.tabs.Tab) => {
        let found = false;
        if (state.tabIds.panel) {
            try {
                await activateTabAsync(state.tabIds.panel, true);
                found = true;
            } catch (e) {}
        }

        if (!found) {
            // Can be read from a stored configuration data source.
            const size = {
                width: 800,
                height: 600
            };

            const url = browser.extension.getURL("index.html");

            // We can't use "window.open" in here due to Firefox bug.
            // https://bugzilla.mozilla.org/show_bug.cgi?id=1282021
            //
            await browser.windows.create({
                type: "panel",
                width: size.width,
                height: size.height,
                url
            });
        }
    });
}

async function handleRequest(msg: ExtensionMessage): Promise<any> {
    console.log("Message received: ", msg);
    switch (msg.type) {
        case ExtensionMessageType.Initialized: {
            if (msg.sender.type === ExtensionMessageSenderType.Popup) {
                state.tabIds.panel = msg.sender.tabId;

                // Note: when the panel first open first, it could be marked as the tab to play
                // That's something we don't want to happen
                if (state.tabIds.toPlay === msg.sender.tabId) {
                    state.tabIds.toPlay = state.tabIds.firstPlay = undefined;
                }
            }

            return true;
        }

        case ExtensionMessageType.FocusPopup: {
            if (state.tabIds.panel) {
                await activateTabAsync(state.tabIds.panel, true);
                return true;
            }

            return false;
        }

        case ExtensionMessageType.CaptureRegion: {
            const tab = await activateTabAsync(state.tabIds.toPlay!, true);
            const conn = state.getTabConnection(state.tabIds.toPlay!);

            // Clear previous results and wait a little
            await conn.sendAsync(ExtensionMessageType.ClearRegions);
            await delayAsync(() => {}, 50);

            const rect = (await conn.sendAsync(ExtensionMessageType.SelectRegion)) as Rect;
            if (rect) {
                // Capture visible browser viewport
                const imageDataUrl = await ScreenCapturer.captureVisibleTabAsync(tab);

                // Load image data
                let imageData = await ImageHelper.loadImageDataAsync(imageDataUrl);

                // Since we'll work on pixel level, scale with devicePixelRatio
                rect.left *= window.devicePixelRatio;
                rect.top *= window.devicePixelRatio;
                rect.right *= window.devicePixelRatio;
                rect.bottom *= window.devicePixelRatio;

                const croppedImageData = ImageHelper.getImageDataRegion(imageData, rect);
                return ImageHelper.convertImageDataToDataUrl(croppedImageData);
            }

            return undefined;
        }

        case ExtensionMessageType.CaptureScreen: {
            const tab = await activateTabAsync(state.tabIds.toPlay!, true);
            const conn = state.getTabConnection(state.tabIds.toPlay!);

            // Clear previous results and wait a little
            await conn.sendAsync(ExtensionMessageType.ClearRegions);
            await delayAsync(() => {}, 50);

            const offset = await conn.sendAsync(ExtensionMessageType.GetScrollOffset);
            const imageDataUrl = await ScreenCapturer.captureVisibleTabAsync(tab);
            const result: CaptureData = {
                offset,
                dataUrl: imageDataUrl
            };
            return result;
        }

        case ExtensionMessageType.CaptureFullScreen: {
            const tab = await activateTabAsync(state.tabIds.toPlay!, true);
            const conn = state.getTabConnection(state.tabIds.toPlay!);

            // Clear previous results and wait a little
            await conn.sendAsync(ExtensionMessageType.ClearRegions);
            await delayAsync(() => {}, 50);

            const adapter: CaptureAdapter = {
                startCaptureAsync: () => conn.sendAsync(ExtensionMessageType.StartCaptureFullScreen),
                endCaptureAsync: pageInfo => conn.sendAsync(ExtensionMessageType.EndCaptureFullScreen, { pageInfo }),
                scrollPageAsync: offset => conn.sendAsync(ExtensionMessageType.ScrollPage, { offset })
            };

            const capturer = new ScreenCapturer(adapter);
            const imageDataUrl = await capturer.captureFullScreenAsync(tab);
            const offset: Point = { x: 0, y: 0 };
            const result: CaptureData = {
                offset,
                dataUrl: imageDataUrl
            };
            return result;
        }

        case ExtensionMessageType.HighlightRegions: {
            await activateTabAsync(state.tabIds.toPlay!, true);
            const conn = state.getTabConnection(state.tabIds.toPlay!);
            await conn.sendAsync(ExtensionMessageType.HighlightRegions, {
                regions: msg.data.regions
            });
            return undefined;
        }

        case ExtensionMessageType.ClickRegion: {
            await activateTabAsync(state.tabIds.toPlay!, true);
            const conn = state.getTabConnection(state.tabIds.toPlay!);
            await conn.sendAsync(ExtensionMessageType.ClickRegion, {
                region: msg.data.region,
                delay: msg.data.delay
            });
            return undefined;
        }
    }
}

function bindMessageListener() {
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        const msg = message as ExtensionMessage;

        if (sender.tab) {
            msg.sender.tabId = sender.tab.id;
        }

        handleRequest(msg).then(response => {
            sendResponse(response);
        });

        return true;
    });
}

async function initPlayTab() {
    const win = await browser.windows.getCurrent();
    const tabs = await browser.tabs.query({ active: true, windowId: win.id });
    if (!tabs || !tabs.length) {
        return false;
    }

    state.tabIds.toPlay = tabs[0].id;
    return true;
}

bindEvents();
bindMessageListener();
initPlayTab();
