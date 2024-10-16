/* global chrome browser */

// Note: it's an adapter for both chrome and web extension API
// chrome and web extension API have almost the same API signatures
// except that chrome accepts callback while web extension returns promises
//
// The whole idea here is to make sure all callback style API of chrome
// also return promises
//
// Important: You need to specify whatever API you need to use in `UsedAPI` below

(function () {
  var isDevelopment = process.env.NODE_ENV !== 'production'
  var adaptChrome = function (obj, chrome) {
    var adapt = function (src, ret, obj, fn) {
      return Object.keys(obj).reduce(function (prev, key) {
        var keyParts = key.split('.')
        var [
          target,
          source
        ] = keyParts.reduce(function (tuple, subkey) {
          var tar = tuple[0]
          var src = tuple[1]

          tar[subkey] = tar[subkey] || {}
          return [tar[subkey], src && src[subkey]]
        }, [
          prev,
          src
        ])

        obj[key].forEach(function (method) {
          fn(method, source, target, isDevelopment)
        })

        return prev
      }, ret)
    }

    var promisify = function (method, source, target, isDevelopment) {      
      if (!source)  return
      // array of error messages that should not be shown
      const ignoredErrors = [
        /The message port closed before a res?ponse was received/,
        /Extension context invalidated/,
        /Could not establish connection. Receiving end does not exist/
      ]

      target[method] = (...args) => {
        return new Promise(function (resolve, reject) {
          var callback = function (result) {
            if (chrome.runtime.lastError) {
              if (ignoredErrors.some((error) => error.test(chrome.runtime.lastError.message))) {
                // don't show the error
                // console.error(`#31 never-show ${chrome.runtime.lastError.message}, ${method}, ${JSON.stringify(args)}`)
              } else {
                if (isDevelopment) {
                  // #31 show in development only
                  console.error(`${chrome.runtime.lastError.message}, ${method}, ${JSON.stringify(args)}`)
                }
                return reject(chrome.runtime.lastError)
              }
            }
            resolve(result)
          }
          source[method].apply(source, args.concat(callback))
        })
      }
    }

    var copy = function (method, source, target) {
      if (!source)  return
      target[method] = source[method]
    }

    return [
      [obj.toPromisify, promisify],
      [obj.toCopy, copy]
    ]
    .reduce(function (prev, tuple) {
      return adapt(chrome, prev, tuple[0], tuple[1])
    }, {})
  }

  var UsedAPI = {
    toPromisify: {
      tabs: ['create', 'sendMessage', 'get', 'update', 'query', 'captureVisibleTab', 'remove', 'getZoom'],
      windows: ['update', 'getLastFocused', 'getCurrent', 'getAll', 'remove', 'create', 'get'],
      runtime: ['sendMessage', 'setUninstallURL'],
      cookies: ['get', 'getAll', 'set', 'remove'],
      notifications: ['create', 'clear'],
      action: ['getBadgeText', 'setIcon'],
      bookmarks: ['create', 'getTree'],
      debugger: ['attach', 'detach', 'sendCommand', 'getTargets'],
      downloads: ['search', 'setUiOptions'],
      extension: ['isAllowedFileSchemeAccess'],
      contextMenus: ['create', 'update', 'remove', 'removeAll'],
      'storage.local': ['get', 'set'],
      scripting: ['executeScript'],
      permissions: ['request', 'contains'],
    },
    toCopy: {
      tabs: ['onActivated', 'onUpdated', 'onRemoved'],
      windows: ['onFocusChanged'],
      runtime: ['onMessage', 'onInstalled', 'getManifest', 'getURL', 'onStartup', 'getPlatformInfo', 'onConnect', 'id'],
      storage: ['onChanged'],
      action: ['setBadgeText', 'setBadgeBackgroundColor', 'onClicked'],
      contextMenus: ['onClicked'],
      extension: ['getURL'],
      debugger: ['onEvent', 'onDetach'],
      downloads: ['onCreated', 'onChanged', 'onDeterminingFilename'],
      webRequest: ['onAuthRequired'],
      sidePanel: ['setOptions', 'open'],
      sidebarAction: ['open', 'close', 'toggle'],
    }
  }

  var Ext = typeof chrome !== 'undefined' ? adaptChrome(UsedAPI, chrome) : browser

  Object.assign(Ext, {
    isFirefox: () => {
      return /Firefox/.test(self.navigator.userAgent)
    }
  })

  if (typeof module !== 'undefined') {
    module.exports = Ext
  } else if (typeof window !== 'undefined') {
    window.Ext = Ext
  }
})()
