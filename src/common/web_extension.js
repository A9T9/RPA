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
          fn(method, source, target)
        })

        return prev
      }, ret)
    }

    var promisify = function (method, source, target) {
      if (!source)  return
      var reg = /The message port closed before a res?ponse was received/

      target[method] = (...args) => {
        return new Promise(function (resolve, reject) {
          var callback = function (result) {
            // Note: The message port closed before a reponse was received.
            // Ignore this message
            if (chrome.runtime.lastError &&
                !reg.test(chrome.runtime.lastError.message)) {
              return reject(chrome.runtime.lastError)
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
      tabs: ['create', 'sendMessage', 'get', 'update', 'query', 'captureVisibleTab', 'remove'],
      windows: ['update', 'getLastFocused', 'getCurrent'],
      runtime: ['sendMessage', 'setUninstallURL'],
      cookies: ['get', 'getAll', 'set', 'remove'],
      notifications: ['create'],
      browserAction: ['getBadgeText'],
      'storage.local': ['get', 'set']
    },
    toCopy: {
      tabs: ['onActivated'],
      runtime: ['onMessage', 'onInstalled'],
      storage: ['onChanged'],
      browserAction: ['setBadgeText', 'setBadgeBackgroundColor', 'onClicked'],
      extension: ['getURL']
    }
  }

  var Ext = typeof chrome !== 'undefined' ? adaptChrome(UsedAPI, chrome) : browser

  if (typeof module !== 'undefined') {
    module.exports = Ext
  } else if (typeof window !== 'undefined') {
    window.Ext = Ext
  }
})()
