declare const chrome: any;

function adapt(src: any, ret: any, obj: any, fn: (method: string, source: string, target: string) => void) {
    return Object.keys(obj).reduce(function(prev, key) {
        var keyParts = key.split(".");
        var [target, source] = keyParts.reduce(
            function(tuple, subkey) {
                var tar = tuple[0];
                var src = tuple[1];

                tar[subkey] = tar[subkey] || {};
                return [tar[subkey], src && src[subkey]];
            },
            [prev, src]
        );

        obj[key].forEach((method: string) => {
            fn(method, source, target);
        });

        return prev;
    }, ret);
}

function promisify(method: string, source: any, target: any) {
    if (!source) return;
    const reg = /The message port closed before a res?ponse was received/;

    target[method] = (...args: any[]) => {
        return new Promise(function(resolve, reject) {
            const callback = function(result: any) {
                // Note: The message port closed before a reponse was received.
                // Ignore this message
                if (chrome.runtime.lastError && !reg.test(chrome.runtime.lastError.message)) {
                    return reject(chrome.runtime.lastError);
                }
                resolve(result);
            };

            source[method].apply(source, args.concat(callback));
        });
    };
}

function copy(method: string, source: any, target: any) {
    if (!source) return;
    target[method] = source[method];
}

function adaptChrome(obj: any) {
    return [[obj.toPromisify, promisify], [obj.toCopy, copy]].reduce(function(prev, tuple) {
        return adapt(chrome, prev, tuple[0], tuple[1]);
    }, {});
}

const usedApi = {
    toPromisify: {
        tabs: ["create", "sendMessage", "get", "update", "query", "captureVisibleTab", "remove"],
        windows: ["create", "getCurrent", "getLastFocused", "update"],
        runtime: ["sendMessage", "setUninstallURL"],
        cookies: ["get", "getAll", "set", "remove"],
        notifications: ["create"],
        browserAction: ["getBadgeText"],
        debugger: ["attach", "detach", "sendCommand", "getTargets"],
        "storage.local": ["get", "set"]
    },
    toCopy: {
        tabs: ["onActivated"],
        runtime: ["onMessage", "onInstalled"],
        storage: ["onChanged"],
        browserAction: ["setBadgeText", "setBadgeBackgroundColor", "onClicked"],
        extension: ["getURL"],
        debugger: ["onEvent", "onDetach"]
    }
};

// Since Firefox supports both chrome and browser namespaces, 
// we need to check both namespaces to avoid overriding browser namespace.
if ((typeof browser === "undefined") && (typeof chrome !== "undefined")) {
    (window as any)["browser"] = adaptChrome(usedApi);
}
