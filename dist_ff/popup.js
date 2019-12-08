/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		2: 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push([713,0,1]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 128:
/***/ (function(module, exports, __webpack_require__) {

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var eventFactory = __webpack_require__(129),
    DataTransfer = __webpack_require__(95);

function _noop() {}

function parseParams(targetElement, eventProperties, configCallback) {
  if (typeof eventProperties === 'function') {
    configCallback = eventProperties;
    eventProperties = null;
  }

  if (!targetElement || (typeof targetElement === 'undefined' ? 'undefined' : _typeof(targetElement)) !== 'object') {
    throw new Error('Expected first parameter to be a targetElement. Instead got: ' + targetElement);
  }

  return {
    targetElement: targetElement,
    eventProperties: eventProperties || {},
    configCallback: configCallback || _noop
  };
}

function customizeEvent(event, configCallback, isPrimaryEvent) {
  if (configCallback) {
    // call configCallback only for the primary event if the callback takes less than two arguments
    if (configCallback.length < 2) {
      if (isPrimaryEvent) {
        configCallback(event);
      }
    }
    // call configCallback for each event if the callback takes two arguments
    else {
        configCallback(event, event.type);
      }
  }
}

function createAndDispatchEvents(targetElement, eventNames, primaryEventName, dataTransfer, eventProperties, configCallback) {
  eventNames.forEach(function (eventName) {
    var event = eventFactory.createEvent(eventName, eventProperties, dataTransfer);
    var isPrimaryEvent = eventName === primaryEventName;

    customizeEvent(event, configCallback, isPrimaryEvent);

    targetElement.dispatchEvent(event);
  });
}

var DragDropAction = function DragDropAction() {
  this.lastDragSource = null;
  this.lastDataTransfer = null;
  this.pendingActionsQueue = [];
};

DragDropAction.prototype._queue = function (fn) {
  this.pendingActionsQueue.push(fn);

  if (this.pendingActionsQueue.length === 1) {
    this._queueExecuteNext();
  }
};

DragDropAction.prototype._queueExecuteNext = function () {
  if (this.pendingActionsQueue.length === 0) {
    return;
  }

  var self = this;
  var firstPendingAction = this.pendingActionsQueue[0];

  var doneCallback = function doneCallback() {
    self.pendingActionsQueue.shift();
    self._queueExecuteNext();
  };

  if (firstPendingAction.length === 0) {
    firstPendingAction.call(this);
    doneCallback();
  } else {
    firstPendingAction.call(this, doneCallback);
  }
};

DragDropAction.prototype.dragStart = function (targetElement, eventProperties, configCallback) {
  var params = parseParams(targetElement, eventProperties, configCallback),
      events = ['mousedown', 'dragstart', 'drag'],
      dataTransfer = new DataTransfer();

  this._queue(function () {
    createAndDispatchEvents(params.targetElement, events, 'drag', dataTransfer, params.eventProperties, params.configCallback);

    this.lastDragSource = targetElement;
    this.lastDataTransfer = dataTransfer;
  });

  return this;
};

DragDropAction.prototype.dragEnter = function (overElement, eventProperties, configCallback) {
  var params = parseParams(overElement, eventProperties, configCallback),
      events = ['mousemove', 'mouseover', 'dragenter'];

  this._queue(function () {
    createAndDispatchEvents(params.targetElement, events, 'dragenter', this.lastDataTransfer, params.eventProperties, params.configCallback);
  });

  return this;
};

DragDropAction.prototype.dragOver = function (overElement, eventProperties, configCallback) {
  var params = parseParams(overElement, eventProperties, configCallback),
      events = ['mousemove', 'mouseover', 'dragover'];

  this._queue(function () {
    createAndDispatchEvents(params.targetElement, events, 'drag', this.lastDataTransfer, params.eventProperties, params.configCallback);
  });

  return this;
};

DragDropAction.prototype.dragLeave = function (overElement, eventProperties, configCallback) {
  var params = parseParams(overElement, eventProperties, configCallback),
      events = ['mousemove', 'mouseover', 'dragleave'];

  this._queue(function () {
    createAndDispatchEvents(params.targetElement, events, 'dragleave', this.lastDataTransfer, params.eventProperties, params.configCallback);
  });

  return this;
};

DragDropAction.prototype.drop = function (targetElement, eventProperties, configCallback) {
  var params = parseParams(targetElement, eventProperties, configCallback);
  var eventsOnDropTarget = ['mousemove', 'mouseup', 'drop'];
  var eventsOnDragSource = ['dragend'];

  this._queue(function () {
    createAndDispatchEvents(params.targetElement, eventsOnDropTarget, 'drop', this.lastDataTransfer, params.eventProperties, params.configCallback);

    if (this.lastDragSource) {
      // trigger dragend event on last drag source element
      createAndDispatchEvents(this.lastDragSource, eventsOnDragSource, 'drop', this.lastDataTransfer, params.eventProperties, params.configCallback);
    }
  });

  return this;
};

DragDropAction.prototype.then = function (callback) {
  this._queue(function () {
    callback.call(this);
  }); // make sure _queue() is given a callback with no arguments

  return this;
};

DragDropAction.prototype.delay = function (waitingTimeMs) {
  this._queue(function (done) {
    window.setTimeout(done, waitingTimeMs);
  });

  return this;
};

module.exports = DragDropAction;

/***/ }),

/***/ 129:
/***/ (function(module, exports, __webpack_require__) {


var DataTransfer = __webpack_require__(95);

var dataTransferEvents = ['drag', 'dragstart', 'dragenter', 'dragover', 'dragend', 'drop', 'dragleave'];

function mergeInto(destObj, srcObj) {
  for (var key in srcObj) {
    if (!srcObj.hasOwnProperty(key)) {
      continue;
    } // ignore inherited properties

    destObj[key] = srcObj[key];
  }

  return destObj;
}

function isFirefox() {
  return (/Firefox/.test(window.navigator.userAgent)
  );
}

function createModernEvent(eventName, eventType, eventProperties) {
  // if (eventType === 'DragEvent') { eventType = 'CustomEvent'; }     // Firefox fix (since FF does not allow us to override dataTransfer)

  var constructor = window[eventType];
  var options = { view: window, bubbles: true, cancelable: true };

  mergeInto(options, eventProperties);

  var event = new constructor(eventName, options);

  mergeInto(event, eventProperties);

  return event;
}

function createLegacyEvent(eventName, eventType, eventProperties) {
  var event;

  switch (eventType) {
    case 'MouseEvent':
      event = document.createEvent('MouseEvent');
      event.initEvent(eventName, true, true);
      break;

    default:
      event = document.createEvent('CustomEvent');
      event.initCustomEvent(eventName, true, true, 0);
  }

  // copy eventProperties into event
  if (eventProperties) {
    mergeInto(event, eventProperties);
  }

  return event;
}

function _createEvent(eventName, eventType, eventProperties) {
  if (isFirefox()) {
    return createLegacyEvent(eventName, eventType, eventProperties);
  }

  try {
    return createModernEvent(eventName, eventType, eventProperties);
  } catch (error) {
    return createLegacyEvent(eventName, eventType, eventProperties);
  }
}

var EventFactory = {
  createEvent: function createEvent(eventName, eventProperties, dataTransfer) {
    var eventType = 'CustomEvent';

    if (eventName.match(/^mouse/)) {
      eventType = 'MouseEvent';
    } else if (eventName.match(/^(drag|drop)/)) {
      eventType = 'DragEvent';
    }

    if (dataTransferEvents.indexOf(eventName) > -1) {
      eventProperties.dataTransfer = dataTransfer || new DataTransfer();
    }

    var event = _createEvent(eventName, eventType, eventProperties);

    return event;
  }
};

module.exports = EventFactory;

/***/ }),

/***/ 136:
/***/ (function(module, exports, __webpack_require__) {


var DragDropAction = __webpack_require__(128);

function call(instance, methodName, args) {
    return instance[methodName].apply(instance, args);
}

function triggerDragEvent(element, target) {
    var getXpathOfElement = function getXpathOfElement(element) {
        if (element == null) {
            return 'null';
        }
        if (element.parentElement == null) {
            return '/' + element.tagName;
        }

        var siblingElement = element.parentElement.children;
        var tagCount = 0;
        var totalTagCount = 0;
        var isFound = false;

        for (var i = 0; i < siblingElement.length; i++) {
            if (siblingElement[i].tagName == element.tagName && !isFound) {
                tagCount++;
                totalTagCount++;
            } else if (siblingElement[i].tagName == element.tagName) {
                totalTagCount++;
            }
            if (siblingElement[i] == element) {
                isFound = true;
            }
        }

        if (totalTagCount > 1) {
            return getXpathOfElement(element.parentElement) + "/" + element.tagName + "[" + tagCount + "]";
        }

        return getXpathOfElement(element.parentElement) + "/" + element.tagName;
    };
    var script = "                                              \
      function simulateDragDrop(sourceNode, destinationNode){\
      function createCustomEvent(type) {                     \
          var event = new CustomEvent('CustomEvent');        \
          event.initCustomEvent(type, true, true, null);     \
          event.dataTransfer = {                             \
              data: {                                        \
              },                                             \
              setData: function(type, val) {                 \
                  this.data[type] = val;                     \
              },                                             \
              getData: function(type) {                      \
                  return this.data[type];                    \
              }                                              \
          };                                                 \
          return event;                                      \
      }                                                      \
      function dispatchEvent(node, type, event) {            \
          if (node.dispatchEvent) {                          \
              return node.dispatchEvent(event);              \
          }                                                  \
          if (node.fireEvent) {                              \
              return node.fireEvent('on' + type, event);     \
          }                                                  \
      }                                                      \
      var event = createCustomEvent('dragstart');            \
      dispatchEvent(sourceNode, 'dragstart', event);         \
                                                             \
      var dropEvent = createCustomEvent('drop');             \
      dropEvent.dataTransfer = event.dataTransfer;           \
      dispatchEvent(destinationNode, 'drop', dropEvent);     \
                                                             \
      var dragEndEvent = createCustomEvent('dragend');       \
      dragEndEvent.dataTransfer = event.dataTransfer;        \
      dispatchEvent(sourceNode, 'dragend', dragEndEvent);    \
  }                                                          \
  simulateDragDrop(document.evaluate('" + getXpathOfElement(element) + "', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue, document.evaluate('" + getXpathOfElement(target) + "', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue);\
  ";
    var win = window;
    var doc = win.document;
    var scriptTag = doc.createElement("script");
    scriptTag.type = "text/javascript";
    scriptTag.text = script;
    doc.body.appendChild(scriptTag);
}

var dragMock = {
    dragStart: function dragStart(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'dragStart', arguments);
    },
    dragEnter: function dragEnter(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'dragEnter', arguments);
    },
    dragOver: function dragOver(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'dragOver', arguments);
    },
    dragLeave: function dragLeave(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'dragLeave', arguments);
    },
    drop: function drop(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'drop', arguments);
    },
    delay: function delay(targetElement, eventProperties, configCallback) {
        return call(new DragDropAction(), 'delay', arguments);
    },

    triggerDragEvent: triggerDragEvent,

    // Just for unit testing:
    DataTransfer: __webpack_require__(95),
    DragDropAction: __webpack_require__(128),
    eventFactory: __webpack_require__(129)
};

module.exports = dragMock;

/***/ }),

/***/ 156:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeWindow", function() { return resizeWindow; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeViewport", function() { return resizeViewport; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeViewportOfTab", function() { return resizeViewportOfTab; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getWindowSize", function() { return getWindowSize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getFocusedWindowSize", function() { return getFocusedWindowSize; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);




var calcOffset = function calcOffset(screenTotal, screenOffset, oldOffset, oldSize, newSize) {
  var preferStart = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

  var isCloserToStart = preferStart || oldOffset < screenTotal - oldOffset - oldSize;

  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('calcOffset', screenTotal, oldOffset, oldSize, newSize, preferStart);

  if (isCloserToStart) {
    return oldOffset;

    // Note: comment out a smarter position for now
    // if (newSize < oldSize) {
    //   return oldOffset
    // }

    // if (newSize < oldSize + oldOffset - screenOffset) {
    //   return oldSize + oldOffset - newSize
    // }

    // return screenOffset
  }

  if (!isCloserToStart) {
    var oldEndOffset = screenOffset + screenTotal - oldOffset - oldSize;

    return oldSize + oldOffset - newSize;

    // Note: comment out a smarter position for now
    // if (newSize < oldSize) {
    //   return oldSize + oldOffset - newSize
    // }

    // if (newSize < oldSize + oldEndOffset) {
    //   return oldOffset
    // }

    // return screenOffset + screenTotal - newSize
  }
};

// winSize.width
// winSize.height
function resizeWindow(winId, winSize) {
  var sw = screen.availWidth;
  var sh = screen.availHeight;
  var sl = screen.availLeft;
  var st = screen.availTop;

  return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(winId).then(function (win) {
    var lastLeft = win.left;
    var lastTop = win.top;
    var lastWidth = win.width;
    var lastHeight = win.height;

    return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(winId, winSize).then(function (win) {
      var left = calcOffset(sw, sl, lastLeft, lastWidth, win.width);
      var top = calcOffset(sh, st, lastTop, lastHeight, win.height, true);

      _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(winId, { left: left, top: top });

      var actual = {
        width: win.width,
        height: win.height
      };

      return {
        actual: actual,
        desired: winSize,
        diff: ['width', 'height'].filter(function (key) {
          return actual[key] !== winSize[key];
        })
      };
    });
  });
}

// pureViewportSize.width
// pureViewportSize.height
// referenceViewportWindowSize.window.width
// referenceViewportWindowSize.window.height
// referenceViewportWindowSize.viewport.width
// referenceViewportWindowSize.viewport.height
function resizeViewport(winId, pureViewportSize) {
  var count = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

  var maxRetry = 2;
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('resizeViewport, ROUND', count);

  return getWindowSize(winId).then(function (currentSize) {
    Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('currentSize!!!!');
    logWindowSize(currentSize);

    var dx = currentSize.window.width - currentSize.viewport.width;
    var dy = currentSize.window.height - currentSize.viewport.height;

    var newWinSize = {
      width: dx + pureViewportSize.width,
      height: dy + pureViewportSize.height
    };

    Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('size set to', newWinSize);
    return resizeWindow(winId, newWinSize).then(function () {
      return getWindowSize(winId);
    }).then(function (newSize) {
      Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('newSize!!!!');
      logWindowSize(newSize);

      var data = {
        actual: newSize.viewport,
        desired: pureViewportSize,
        diff: ['width', 'height'].filter(function (key) {
          return newSize.viewport[key] !== pureViewportSize[key];
        })
      };

      if (data.diff.length === 0 || count >= maxRetry) {
        return data;
      }

      return Object(_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 0).then(function () {
        return resizeViewport(winId, pureViewportSize, count + 1);
      });
    });
  });
}

function resizeViewportOfTab(tabId, pureViewportSize) {
  return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId).then(function (tab) {
    return resizeViewport(tab.windowId, pureViewportSize);
  });
}

// size.window.width
// size.window.height
// size.window.left
// size.window.top
// size.viewport.wdith
// size.viewport.height
function getWindowSize(winId) {
  return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(winId, { populate: true }).then(function (win) {
    var tab = win.tabs.find(function (tab) {
      return tab.active;
    });

    return {
      window: {
        width: win.width,
        height: win.height,
        left: win.left,
        top: win.top
      },
      viewport: {
        width: tab.width,
        height: tab.height
      }
    };
  });
}

function getFocusedWindowSize() {
  return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getLastFocused().then(function (win) {
    return getWindowSize(win.id);
  });
}

function logWindowSize(winSize) {
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])(winSize.window, winSize.viewport);
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('dx = ', winSize.window.width - winSize.viewport.width);
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('dy = ', winSize.window.height - winSize.viewport.height);
}

/***/ }),

/***/ 17:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _ipc_bg_cs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(79);


var throwNotTop = function throwNotTop() {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc');
};

// Note: csIpc is only available to top window
var ipc = window.top === window ? Object(_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_0__[/* csInit */ "b"])() : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop

  // Note: one ipc singleton per content script
};/* harmony default export */ __webpack_exports__["a"] = (ipc);

/***/ }),

/***/ 206:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 22:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export getStyle */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "i", function() { return setStyle; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return pixel; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return bindDrag; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return bindContentEditableChange; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return scrollLeft; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return scrollTop; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return domText; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return isVisible; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return cssSelector; });
/* unused harmony export isPositionFixed */
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }



var getStyle = function getStyle(dom) {
  if (!dom) throw new Error('getStyle: dom does not exist');
  return getComputedStyle(dom);
};

var setStyle = function setStyle(dom, style) {
  if (!dom) throw new Error('setStyle: dom does not exist');

  for (var i = 0, keys = Object.keys(style), len = keys.length; i < len; i++) {
    dom.style[keys[i]] = style[keys[i]];
  }

  return dom;
};

var pixel = function pixel(num) {
  if ((num + '').indexOf('px') !== -1) return num;
  return (num || 0) + 'px';
};

var bindDrag = function bindDrag(_ref) {
  var onDragStart = _ref.onDragStart,
      onDragEnd = _ref.onDragEnd,
      onDrag = _ref.onDrag,
      $el = _ref.$el,
      _ref$doc = _ref.doc,
      doc = _ref$doc === undefined ? document : _ref$doc;

  var isDragging = false;
  var startPos = { x: 0, y: 0 };

  var onMouseDown = function onMouseDown(e) {
    isDragging = true;
    startPos = { x: e.screenX, y: e.screenY };
    onDragStart(e);
  };
  var onMouseUp = function onMouseUp(e) {
    if (!isDragging) return;
    isDragging = false;
    var dx = e.screenX - startPos.x;
    var dy = e.screenY - startPos.y;
    onDragEnd(e, { dx: dx, dy: dy });
  };
  var onMouseMove = function onMouseMove(e) {
    if (!isDragging) return;

    var dx = e.screenX - startPos.x;
    var dy = e.screenY - startPos.y;
    onDrag(e, { dx: dx, dy: dy });

    e.preventDefault();
    e.stopPropagation();
  };
  var onClick = function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
  };

  doc.addEventListener('click', onClick, true);
  doc.addEventListener('mousemove', onMouseMove, true);
  doc.addEventListener('mouseup', onMouseUp, true);
  $el.addEventListener('mousedown', onMouseDown, true);

  return function () {
    doc.removeEventListener('click', onClick, true);
    doc.removeEventListener('mousemove', onMouseMove, true);
    doc.removeEventListener('mouseup', onMouseUp, true);
    $el.removeEventListener('mousedown', onMouseDown, true);
  };
};

var bindContentEditableChange = function bindContentEditableChange(_ref2) {
  var onChange = _ref2.onChange,
      _ref2$doc = _ref2.doc,
      doc = _ref2$doc === undefined ? document : _ref2$doc;

  var currentCE = null;
  var oldContent = null;

  var onFocus = function onFocus(e) {
    if (e.target.contentEditable !== 'true') return;
    currentCE = e.target;
    oldContent = currentCE.innerHTML;
  };
  var onBlur = function onBlur(e) {
    if (e.target !== currentCE) {
      // Do nothing
    } else if (currentCE.innerHTML !== oldContent) {
      onChange(e);
    }

    currentCE = null;
    oldContent = null;
  };

  doc.addEventListener('focus', onFocus, true);
  doc.addEventListener('blur', onBlur, true);

  return function () {
    doc.removeEventListener('focus', onFocus, true);
    doc.removeEventListener('blur', onBlur, true);
  };
};

var scrollLeft = function scrollLeft(document) {
  return document.documentElement.scrollLeft;
};

var scrollTop = function scrollTop(document) {
  return document.documentElement.scrollTop;
};

var domText = function domText($dom) {
  var it = $dom.innerText && $dom.innerText.trim();
  var tc = $dom.textContent;
  var pos = tc.toUpperCase().indexOf(it.toUpperCase());

  return tc.substr(pos, it.length);
};

var isVisible = function isVisible(el) {
  if (el === window.document) return true;
  if (!el) return true;

  var style = window.getComputedStyle(el);
  if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden') return false;

  return isVisible(el.parentNode);
};

var cssSelector = function cssSelector(dom) {
  if (dom.nodeType !== 1) return '';
  if (dom.tagName === 'BODY') return 'body';
  if (dom.id) return '#' + dom.id;

  var classes = dom.className.split(/\s+/g).filter(function (item) {
    return item && item.length;
  });

  var children = Array.from(dom.parentNode.childNodes).filter(function ($el) {
    return $el.nodeType === 1;
  });

  var sameTag = children.filter(function ($el) {
    return $el.tagName === dom.tagName;
  });

  var sameClass = children.filter(function ($el) {
    var cs = $el.className.split(/\s+/g);

    return _utils__WEBPACK_IMPORTED_MODULE_0__["and"].apply(undefined, _toConsumableArray(classes.map(function (c) {
      return cs.indexOf(c) !== -1;
    })));
  });

  var extra = '';

  if (sameTag.length === 1) {
    extra = '';
  } else if (classes.length && sameClass.length === 1) {
    extra = '.' + classes.join('.');
  } else {
    extra = ':nth-child(' + (1 + children.findIndex(function (item) {
      return item === dom;
    })) + ')';
  }

  var me = dom.tagName.toLowerCase() + extra;

  // Note: browser will add an extra 'tbody' when tr directly in table, which will cause an wrong selector,
  // so the hack is to remove all tbody here
  var ret = cssSelector(dom.parentNode) + ' > ' + me;
  return ret;
  // return ret.replace(/\s*>\s*tbody\s*>?/g, ' ')
};

var isPositionFixed = function isPositionFixed($dom) {
  if (!$dom || $dom === document.documentElement || $dom === document.body) return false;
  return getComputedStyle($dom)['position'] === 'fixed' || isPositionFixed($dom.parentNode);
};

/***/ }),

/***/ 31:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _command_runner__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(64);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };




/*
 * Basic tool function
 */

var extend = function extend() {
  var args = Array.from(arguments);
  var len = args.length;

  if (len <= 0) return {};
  if (len === 1) return args[0];

  var head = args[0];
  var rest = args.slice(1);

  return rest.reduce(function (prev, cur) {
    for (var i = 0, keys = Object.keys(cur), len = keys.length; i < len; i++) {
      prev[keys[i]] = cur[keys[i]];
    }

    return prev;
  }, head);
};

var isArray = Array.isArray;

var id = function id(x) {
  return x;
};

var trim = function trim(str) {
  return str.replace(/^\s*|\s*$/g, '');
};

var flatten = function flatten(list) {
  return [].concat.apply([], list);
};

var sum = function sum() {
  var list = Array.from(arguments);
  return list.reduce(function (prev, cur) {
    return prev + cur;
  }, 0);
};

var last = function last(list) {
  return list[list.length - 1];
};

var or = function or(list) {
  return (list || []).reduce(function (prev, cur) {
    return prev || cur;
  }, false);
};

var and = function and(list) {
  return (list || []).reduce(function (prev, cur) {
    return prev && cur;
  }, true);
};

var zipWith = function zipWith(fn) {
  if (arguments.length < 3) return null;

  var list = Array.from(arguments).slice(1);
  var len = list.reduce(function (min, cur) {
    return cur.length < min ? cur.length : min;
  }, Infinity);
  var ret = [];

  for (var i = 0; i < len; i++) {
    ret.push(fn.apply(null, list.map(function (item) {
      return item[i];
    })));
  }

  return ret;
};

var intersect = function intersect() {
  var list = Array.from(arguments);
  var len = Math.max.apply(null, list.map(function (item) {
    return item.length;
  }));
  var result = [];

  for (var i = 0; i < len; i++) {
    var val = list[0][i];
    var no = list.filter(function (item) {
      return item[i] !== val;
    });

    if (no && no.length) break;

    result.push(val);
  }

  return result;
};

var deepEqual = function deepEqual(a, b) {
  if (isArray(a) && isArray(b)) {
    return a.length === b.length && and(zipWith(deepEqual, a, b));
  }

  if ((typeof a === 'undefined' ? 'undefined' : _typeof(a)) === 'object' && (typeof b === 'undefined' ? 'undefined' : _typeof(b)) === 'object') {
    // TODO
    return false;
  }

  return a === b;
};

/*
 * Dom helper function
 */

var pixel = function pixel(num) {
  if ((num + '').indexOf('px') !== -1) return num;
  return (num || 0) + 'px';
};

var getStyle = function getStyle(dom, styleName) {
  if (!dom) throw new Error('getStyle: dom does not exist');
  return getComputedStyle(dom)[styleName];
};

var setStyle = function setStyle(dom, style) {
  if (!dom) throw new Error('setStyle: dom does not exist');

  for (var i = 0, keys = Object.keys(style), len = keys.length; i < len; i++) {
    dom.style[keys[i]] = style[keys[i]];
  }

  return dom;
};

var cssSum = function cssSum(dom, list) {
  var isInline = getStyle(dom, 'display') === 'inline';

  return list.reduce(function (prev, cur) {
    var val = isInline && ['width', 'height'].indexOf(cur) !== -1 ? dom.getClientRects()[0][cur] : getStyle(dom, cur);

    return prev + parseInt(val || '0', 10);
  }, 0);
};

var offset = function offset(dom, noPx) {
  if (!dom) return { left: 0, top: 0 };

  var rect = dom.getBoundingClientRect();
  var fn = noPx ? id : pixel;

  return {
    left: fn(rect.left + window.scrollX),
    top: fn(rect.top + window.scrollY)
  };
};

var rect = function rect(dom, noPx) {
  var pos = offset(dom, noPx);
  var isInline = getStyle(dom, 'display') === 'inline';
  var w = isInline ? dom.getClientRects()[0]['width'] : getStyle(dom, 'width');
  var h = isInline ? dom.getClientRects()[0]['height'] : getStyle(dom, 'height');
  var fn = noPx ? id : pixel;

  return extend({ width: fn(w), height: fn(h) }, pos);
};

// Reference: http://ryanve.com/lab/dimensions/
var clientWidth = function clientWidth(document) {
  return document.documentElement.clientWidth;
};

var clientHeight = function clientHeight(document) {
  return document.documentElement.clientHeight;
};

var removeChildren = function removeChildren(dom, predicate) {
  var pred = predicate || function () {
    return true;
  };
  var children = dom.childNodes;

  for (var i = children.length - 1; i >= 0; i--) {
    if (pred(children[i])) {
      dom.removeChild(children[i]);
    }
  }
};

var inDom = function inDom($outer, $el) {
  if (!$el) return false;
  if ($outer === $el) return true;
  return inDom($outer, $el.parentNode);
};

var inDomList = function inDomList(list, $el) {
  return or(list.map(function ($outer) {
    return inDom($outer, $el);
  }));
};

var parentWithTag = function parentWithTag(tag, $el) {
  var lowerTag = tag.toLowerCase();
  var $dom = $el;

  while ($dom) {
    if ($dom.tagName.toLowerCase() === lowerTag) {
      return $dom;
    }

    $dom = $dom.parentNode;
  }

  return null;
};

var parentWithClass = function parentWithClass(className, $el) {
  var $dom = $el;

  while ($dom) {
    // Note: In Firefox, HTML Document object doesn't have `classList` property
    if ($dom.classList !== undefined && $dom.classList.contains(className)) {
      return $dom;
    }

    $dom = $dom.parentNode;
  }

  return null;
};

var selector = function selector(dom) {
  if (dom.nodeType !== 1) return '';
  if (dom.tagName === 'BODY') return 'body';
  if (dom.id) return '#' + dom.id;

  var classes = (dom.getAttribute('class') || '').split(/\s+/g).filter(function (item) {
    return item && item.length;
  });

  var children = Array.from(dom.parentNode.childNodes).filter(function ($el) {
    return $el.nodeType === 1;
  });

  var sameTag = children.filter(function ($el) {
    return $el.tagName === dom.tagName;
  });

  var sameClass = children.filter(function ($el) {
    var cs = ($el.getAttribute('class') || '').split(/\s+/g);

    return and(classes.map(function (c) {
      return cs.indexOf(c) !== -1;
    }));
  });

  var extra = '';

  if (sameTag.length === 1) {
    extra = '';
  } else if (classes.length && sameClass.length === 1) {
    extra = '.' + classes.join('.');
  } else {
    extra = ':nth-child(' + (1 + children.findIndex(function (item) {
      return item === dom;
    })) + ')';
  }

  var me = dom.tagName.toLowerCase() + extra;

  // Note: browser will add an extra 'tbody' when tr directly in table, which will cause an wrong selector,
  // so the hack is to remove all tbody here
  var ret = selector(dom.parentNode) + ' > ' + me;
  return ret;
  // return ret.replace(/\s*>\s*tbody\s*>?/g, ' ')
};

var xpath = function xpath(dom, cur, list) {
  var getTagIndex = function getTagIndex(dom) {
    return Array.from(dom.parentNode.childNodes).filter(function (item) {
      return item.nodeType === dom.nodeType && item.tagName === dom.tagName;
    }).reduce(function (prev, node, i) {
      if (prev !== null) return prev;
      return node === dom ? i + 1 : prev;
    }, null);
  };

  var name = function name(dom) {
    if (!dom) return null;
    if (dom.nodeType === 3) return '@text';

    var index = getTagIndex(dom);
    var count = Array.from(dom.parentNode.childNodes).filter(function (item) {
      return item.nodeType === dom.nodeType && item.tagName === dom.tagName;
    }).length;
    var tag = dom.tagName.toLowerCase();

    return count > 1 ? tag + '[' + index + ']' : tag;
  };

  var helper = function helper(dom, cur, list) {
    if (!dom) return null;

    if (!cur) {
      if (dom.nodeType === 3) {
        return helper(dom.parentNode);
      } else {
        return helper(dom, dom, []);
      }
    }

    if (!cur.parentNode) {
      return ['html'].concat(list);
    }

    if (cur.tagName === 'BODY') {
      return ['html', 'body'].concat(list);
    }

    if (cur.id) {
      return ['*[@id="' + cur.id + '"]'].concat(list);
    }

    return helper(dom, cur.parentNode, [name(cur)].concat(list));
  };

  var parts = helper(dom, cur, list);
  var prefix = parts[0] === 'html' ? '/' : '//';
  var ret = prefix + parts.join('/');

  return ret;
};

var atXPath = function atXPath(xpath, document) {
  var lower = function lower(str) {
    return str && str.toLowerCase();
  };
  var reg = /^([a-zA-Z0-9]+)(\[(\d+)\])?$/;

  return xpath.reduce(function (prev, cur) {
    if (!prev) return prev;
    if (!prev.childNodes || !prev.childNodes.length) return null;

    var match = cur.match(reg);
    var tag = match[1];
    var index = match[3] ? parseInt(match[3], 10) : 1;
    var list = Array.from(prev.childNodes).filter(function (item) {
      return item.nodeType === 1 && lower(item.tagName) === lower(tag);
    });

    return list[index - 1];
  }, document);
};

var domText = function domText($dom) {
  var it = $dom.innerText && $dom.innerText.trim();
  var tc = $dom.textContent;
  var pos = tc.toUpperCase().indexOf(it.toUpperCase());

  return tc.substr(pos, it.length);
};

var getFirstWorkingLocator = function getFirstWorkingLocator(locators, $el) {
  for (var i = 0, len = locators.length; i < len; i++) {
    if ($el === Object(_command_runner__WEBPACK_IMPORTED_MODULE_1__[/* getElementByLocator */ "a"])(locators[i])) {
      return locators[i];
    }
  }

  return null;
};

// Note: get the locator of a DOM
var getLocator = function getLocator($dom, withAllOptions) {
  var id = $dom.getAttribute('id');
  var name = $dom.getAttribute('name');
  var isLink = $dom.tagName.toLowerCase() === 'a';
  var text = domText($dom);
  var classes = Array.from($dom.classList);
  var candidates = [];

  // link
  if (isLink && text && text.length) {
    var links = [].slice.call(document.getElementsByTagName('a'));
    var matches = links.filter(function ($el) {
      return domText($el) === text;
    });
    var index = matches.findIndex(function ($el) {
      return $el === $dom;
    });

    if (index !== -1) {
      candidates.push(index === 0 ? 'link=' + text : 'link=' + text + '@POS=' + (index + 1));
    }
  }

  // id
  if (id && id.length) {
    candidates.push('id=' + id);
  }

  // name
  if (name && name.length) {
    candidates.push('name=' + name);
  }

  // xpath
  candidates.push(xpath($dom));

  // css
  // Try with simple css selector first. If not unqiue, use full css selector
  /**
   * Below is the old logic with a shorter css selector
   *
    let sel = null
    if (classes.length > 0) {
    sel = $dom.tagName.toLowerCase() + classes.map(c => '.' + c).join('')
      if ($dom !== document.querySelectorAll(sel)[0]) {
      sel = null
    }
  }
    if (!sel) {
    sel = selector($dom)
  }
  */
  candidates.push('css=' + selector($dom));

  // Get the first one working
  var chosen = getFirstWorkingLocator(candidates, $dom);

  if (withAllOptions) {
    return {
      target: chosen,
      targetOptions: candidates
    };
  }

  return chosen;
};

var checkIframe = function checkIframe(iframeWin) {
  var key = new Date() * 1 + '' + Math.random();

  try {
    iframeWin[key] = 'asd';
    return iframeWin[key] === 'asd';
  } catch (e) {
    return false;
  }
};

// Note: get the locator for frame
var getFrameLocator = function getFrameLocator(frameWin, win) {
  if (checkIframe(frameWin)) {
    var frameDom = frameWin.frameElement;
    var locator = getLocator(frameDom);

    if (/^id=/.test(locator) || /^name=/.test(locator)) {
      return locator;
    }
  }

  for (var i = 0, len = win.frames.length; i < len; i++) {
    if (win.frames[i] === frameWin) {
      return 'index=' + i;
    }
  }

  throw new Error('Frame locator not found');
};

/*
 * Mask related
 */

var maskFactory = function maskFactory() {
  var cache = [];
  var prefix = '__mask__' + new Date() * 1 + Math.round(Math.random() * 1000) + '__';
  var uid = 1;
  var defaultStyle = {
    position: 'absolute',
    zIndex: '999',
    display: 'none',
    boxSizing: 'border-box',
    backgroundColor: 'red',
    opacity: 0.5,
    pointerEvents: 'none'
  };

  var genMask = function genMask(style, dom) {
    var mask = document.createElement('div');

    if (dom) {
      style = extend({}, defaultStyle, style || {}, rect(dom));
    } else {
      style = extend({}, defaultStyle, style || {});
    }

    setStyle(mask, style);
    mask.id = prefix + uid++;
    cache.push(mask);

    return mask;
  };

  var clear = function clear() {
    for (var i = 0, len = cache.length; i < len; i++) {
      var mask = cache[i];

      if (mask && mask.parentNode) {
        mask.parentNode.removeChild(mask);
      }
    }
  };

  return {
    gen: genMask,
    clear: clear
  };
};

var showMaskOver = function showMaskOver(mask, el) {
  var pos = offset(el);
  var w = cssSum(el, ['width', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']);
  var h = cssSum(el, ['height', 'paddingTop', 'paddingBottom', 'borderTopWidth', ' borderBottomWidth']);

  setStyle(mask, extend(pos, {
    width: pixel(w),
    height: pixel(h),
    display: 'block'
  }));
};

var isVisible = function isVisible(el) {
  if (el === window.document) return true;
  if (!el) return true;

  var style = window.getComputedStyle(el);
  if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden') return false;

  return isVisible(el.parentNode);
};

/* harmony default export */ __webpack_exports__["a"] = ({
  offset: offset,
  setStyle: setStyle,
  selector: selector,
  xpath: xpath,
  atXPath: atXPath,
  domText: domText,
  getLocator: getLocator,
  getFrameLocator: getFrameLocator,
  maskFactory: maskFactory,
  showMaskOver: showMaskOver,
  inDom: inDom,
  isVisible: isVisible,
  parentWithTag: parentWithTag,
  parentWithClass: parentWithClass
});

/***/ }),

/***/ 32:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export IpcCache */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getIpcCache; });
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(2);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }



var IpcCache = function () {
  function IpcCache() {
    _classCallCheck(this, IpcCache);

    this.cache = {};
  }

  _createClass(IpcCache, [{
    key: 'get',
    value: function get(tabId) {
      var _this = this;

      var timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2000;
      var before = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : Infinity;

      return Object(_utils__WEBPACK_IMPORTED_MODULE_0__["until"])('ipc by tab id', function () {
        var ipcObj = _this.cache[tabId];
        var enabled = ipcObj && ipcObj.status === 1;
        var ipc = ipcObj && ipcObj.ipc;

        return {
          pass: enabled && !!ipc && (before === Infinity || before > ipcObj.timestamp),
          result: ipc
        };
      }, 100, timeout);
    }
  }, {
    key: 'set',
    value: function set(tabId, ipc, cuid) {
      this.cache[tabId] = {
        ipc: ipc,
        cuid: cuid,
        status: 1,
        timestamp: new Date().getTime()
      };
    }
  }, {
    key: 'setStatus',
    value: function setStatus(tabId, status) {
      var updateTimestamp = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

      var found = this.cache[tabId];
      if (!found) return false;

      found.status = status;

      if (updateTimestamp) {
        found.timestamp = new Date().getTime();
      }

      return true;
    }
  }, {
    key: 'enable',
    value: function enable(tabId) {
      return this.setStatus(tabId, 1, true);
    }
  }, {
    key: 'disable',
    value: function disable(tabId) {
      return this.setStatus(tabId, 0);
    }
  }, {
    key: 'getCuid',
    value: function getCuid(tabId) {
      var found = this.cache[tabId];
      if (!found) return null;
      return found.cuid;
    }
  }, {
    key: 'del',
    value: function del(tabId) {
      delete this.cache[tabId];
    }
  }]);

  return IpcCache;
}();

var instance = void 0;

function getIpcCache() {
  if (instance) return instance;
  instance = new IpcCache();
  return instance;
}

/***/ }),

/***/ 35:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return postMessage; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return onMessage; });
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var TYPE = 'SELENIUM_IDE_CS_MSG';

var postMessage = function postMessage(targetWin, myWin, payload) {
  var target = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '*';
  var timeout = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 60000;

  return new Promise(function (resolve, reject) {
    if (!targetWin || !targetWin.postMessage) {
      throw new Error('csPostMessage: targetWin is not a window', targetWin);
    }

    if (!myWin || !myWin.addEventListener || !myWin.removeEventListener) {
      throw new Error('csPostMessage: myWin is not a window', myWin);
    }

    var secret = Math.random();
    var type = TYPE;

    // Note: create a listener with a corresponding secret every time
    var onMsg = function onMsg(e) {
      if (e.data && e.data.type === TYPE && !e.data.isRequest && e.data.secret === secret) {
        myWin.removeEventListener('message', onMsg);
        var _e$data = e.data,
            _payload = _e$data.payload,
            error = _e$data.error;


        if (error) return reject(new Error(error));
        if (_payload !== undefined) return resolve(_payload);

        reject(new Error('csPostMessage: No payload nor error found'));
      }
    };

    myWin.addEventListener('message', onMsg);

    // Note:
    // * `type` to make sure we check our own msg only
    // * `secret` is for 1 to 1 relationship between a msg and a listener
    // * `payload` is the real data you want to send
    // * `isRequest` is to mark that it's not an answer to some previous request
    targetWin.postMessage({
      type: type,
      secret: secret,
      payload: payload,
      isRequest: true
    }, target);

    setTimeout(function () {
      reject(new Error('csPostMessage: timeout ' + timeout + ' ms'));
    }, timeout);
  });
};

var onMessage = function onMessage(win, fn) {
  if (!win || !win.addEventListener || !win.removeEventListener) {
    throw new Error('csOnMessage: not a window', win);
  }

  var onMsg = function onMsg(e) {
    // Note: only respond to msg with `isRequest` as true
    if (e && e.data && e.data.type === TYPE && e.data.isRequest && e.data.secret) {
      var tpl = {
        type: TYPE,
        secret: e.data.secret

        // Note: wrapped with a new Promise to catch any exception during the execution of fn
      };new Promise(function (resolve, reject) {
        var ret = void 0;

        try {
          ret = fn(e.data.payload, {
            source: e.source
          });
        } catch (err) {
          reject(err);
        }

        // Note: only resolve if returned value is not undefined. With this, we can have multiple
        // listeners added to onMessage, and each one takes care of what it really cares
        if (ret !== undefined) {
          resolve(ret);
        }
      }).then(function (res) {
        e.source.postMessage(_extends({}, tpl, {
          payload: res
        }), '*');
      }, function (err) {
        e.source.postMessage(_extends({}, tpl, {
          error: err.message
        }), '*');
      });
    }
  };

  win.addEventListener('message', onMsg);
  return function () {
    return win.removeEventListener('message', onMsg);
  };
};

/***/ }),

/***/ 4:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export logFactory */
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var logFactory = function logFactory(enabled) {
  var isEnabled = !!enabled;

  var obj = ['log', 'info', 'warn', 'error'].reduce(function (prev, method) {
    prev[method] = function () {
      var _console;

      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (!isEnabled) return;
      (_console = console)[method].apply(_console, [new Date().toISOString(), ' - '].concat(args));
    };
    return prev;
  }, {});

  return _extends(obj.log, obj, {
    enable: function enable() {
      isEnabled = true;
    },
    disable: function disable() {
      isEnabled = false;
    }
  });
};

/* harmony default export */ __webpack_exports__["a"] = (logFactory("production" !== 'production'));

/***/ }),

/***/ 46:
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_RESULT__;/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || function (view) {
	"use strict";
	// IE <10 is explicitly unsupported

	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var doc = view.document
	// only get URL when necessary in case Blob.js hasn't overridden it yet
	,
	    get_URL = function get_URL() {
		return view.URL || view.webkitURL || view;
	},
	    is_firefox_extension = window.location.protocol === 'moz-extension:',
	    create_link_for_ff_ext = function create_link_for_ff_ext() {
		// Temporary fix for firefox extension on Mac / Linux
		// reference: https://bugzilla.mozilla.org/show_bug.cgi?format=default&id=1420419
		var iframeId = 'downloadFrame';
		var $iframe = doc.createElementNS("http://www.w3.org/1999/xhtml", "iframe");

		$iframe.id = iframeId;
		$iframe.style.visibility = 'hidden';
		$iframe.style.position = 'absolute';
		$iframe.style.left = '-999px';
		doc.body.appendChild($iframe);

		var link = $iframe.contentDocument.createElement('a');

		// wait for next tick when iframe is already in document,
		// otherwise link won't be add to body of iframe
		setTimeout(function () {
			$iframe.contentDocument.body.appendChild(link);
		});

		return link;
	},
	    save_link = is_firefox_extension ? create_link_for_ff_ext() : doc.createElementNS("http://www.w3.org/1999/xhtml", "a"),
	    can_use_save_link = "download" in save_link,
	    click = function click(node) {
		var event = new MouseEvent("click");
		node.dispatchEvent(event);
	},
	    is_safari = /constructor/i.test(view.HTMLElement) || view.safari,
	    is_chrome_ios = /CriOS\/[\d]+/.test(navigator.userAgent),
	    throw_outside = function throw_outside(ex) {
		(view.setImmediate || view.setTimeout)(function () {
			throw ex;
		}, 0);
	},
	    force_saveable_type = "application/octet-stream"
	// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
	,
	    arbitrary_revoke_timeout = 1000 * 40 // in ms
	,
	    revoke = function revoke(file) {
		var revoker = function revoker() {
			if (typeof file === "string") {
				// file is an object URL
				get_URL().revokeObjectURL(file);
			} else {
				// file is a File
				file.remove();
			}
		};
		setTimeout(revoker, arbitrary_revoke_timeout);
	},
	    dispatch = function dispatch(filesaver, event_types, event) {
		event_types = [].concat(event_types);
		var i = event_types.length;
		while (i--) {
			var listener = filesaver["on" + event_types[i]];
			if (typeof listener === "function") {
				try {
					listener.call(filesaver, event || filesaver);
				} catch (ex) {
					throw_outside(ex);
				}
			}
		}
	},
	    auto_bom = function auto_bom(blob) {
		// prepend BOM for UTF-8 XML and text/* types (including HTML)
		// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
		if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
			return new Blob([String.fromCharCode(0xFEFF), blob], { type: blob.type });
		}
		return blob;
	},
	    FileSaver = function FileSaver(blob, name, no_auto_bom) {
		if (!no_auto_bom) {
			blob = auto_bom(blob);
		}
		// First try a.download, then web filesystem, then object URLs
		var filesaver = this,
		    type = blob.type,
		    force = type === force_saveable_type,
		    object_url,
		    dispatch_all = function dispatch_all() {
			dispatch(filesaver, "writestart progress write writeend".split(" "));
		}
		// on any filesys errors revert to saving with object URLs
		,
		    fs_error = function fs_error() {
			if ((is_chrome_ios || force && is_safari) && view.FileReader) {
				// Safari doesn't allow downloading of blob urls
				var reader = new FileReader();
				reader.onloadend = function () {
					var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
					var popup = view.open(url, '_blank');
					if (!popup) view.location.href = url;
					url = undefined; // release reference before dispatching
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
				};
				reader.readAsDataURL(blob);
				filesaver.readyState = filesaver.INIT;
				return;
			}
			// don't create more object URLs than needed
			if (!object_url) {
				object_url = get_URL().createObjectURL(blob);
			}
			if (force) {
				view.location.href = object_url;
			} else {
				var opened = view.open(object_url, "_blank");
				if (!opened) {
					// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
					view.location.href = object_url;
				}
			}
			filesaver.readyState = filesaver.DONE;
			dispatch_all();
			revoke(object_url);
		};
		filesaver.readyState = filesaver.INIT;

		if (can_use_save_link) {
			object_url = get_URL().createObjectURL(blob);
			setTimeout(function () {
				save_link.href = object_url;
				save_link.download = name;
				click(save_link);
				dispatch_all();
				revoke(object_url);
				filesaver.readyState = filesaver.DONE;
			});
			return;
		}

		fs_error();
	},
	    FS_proto = FileSaver.prototype,
	    saveAs = function saveAs(blob, name, no_auto_bom) {
		return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
	};
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function (blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function () {};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error = FS_proto.onwritestart = FS_proto.onprogress = FS_proto.onwrite = FS_proto.onabort = FS_proto.onerror = FS_proto.onwriteend = null;

	return saveAs;
}(typeof self !== "undefined" && self || typeof window !== "undefined" && window || this.content);
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
	module.exports.saveAs = saveAs;
} else if ("function" !== "undefined" && __webpack_require__(502) !== null && __webpack_require__(503) !== null) {
	!(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
		return saveAs;
	}).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

/***/ }),

/***/ 48:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = __webpack_require__(667);
const ts_utils_1 = __webpack_require__(52);
const kantu_xy_host_1 = __webpack_require__(668);
const resize_window_1 = __webpack_require__(156);
var MouseButton;
(function (MouseButton) {
    MouseButton[MouseButton["Left"] = 0] = "Left";
    MouseButton[MouseButton["Right"] = 1] = "Right";
    MouseButton[MouseButton["Middle"] = 2] = "Middle";
})(MouseButton = exports.MouseButton || (exports.MouseButton = {}));
var MouseEventType;
(function (MouseEventType) {
    MouseEventType[MouseEventType["Move"] = 0] = "Move";
    MouseEventType[MouseEventType["Down"] = 1] = "Down";
    MouseEventType[MouseEventType["Up"] = 2] = "Up";
    MouseEventType[MouseEventType["Click"] = 3] = "Click";
    MouseEventType[MouseEventType["DoubleClick"] = 4] = "DoubleClick";
})(MouseEventType = exports.MouseEventType || (exports.MouseEventType = {}));
exports.getNativeXYAPI = ts_utils_1.singletonGetter(() => {
    const nativeHost = new kantu_xy_host_1.KantuXYHost();
    let pReady = nativeHost.connectAsync().catch(e => {
        console.warn('pReady - error', e);
        throw e;
    });
    const api = constants_1.MethodTypeInvocationNames.reduce((prev, method) => {
        const camel = ts_utils_1.snakeToCamel(method);
        prev[camel] = (() => {
            const fn = (params) => pReady.then(() => {
                return nativeHost.invokeAsync(method, params)
                    .catch(e => {
                    // Note: Looks like for now whenever there is an error, you have to reconnect native host
                    // otherwise, all commands return "Disconnected" afterwards
                    const typeSafeAPI = api;
                    typeSafeAPI.reconnect();
                    throw e;
                });
            });
            return fn;
        })();
        return prev;
    }, {
        reconnect: () => {
            nativeHost.disconnect();
            pReady = nativeHost.connectAsync();
            return pReady.then(() => api);
        },
        sendViewportMouseEvent: (event, options) => {
            const typeSafeAPI = api;
            const hasCache = findRectangleCache !== null;
            const pNeedCalibration = options.needCalibration().then(isNeeded => isNeeded || !hasCache);
            return pNeedCalibration.then((isNeeded) => {
                const { markPage, unmarkPage, findViewportRectInWindow } = isNeeded ? {
                    markPage: options.markPage,
                    unmarkPage: options.unmarkPage,
                    findViewportRectInWindow: (hexColor) => typeSafeAPI.findRectangle(hexColor)
                } : {
                    markPage: () => Promise.resolve(),
                    unmarkPage: () => Promise.resolve(),
                    findViewportRectInWindow: (options) => Promise.resolve(findRectangleCache)
                };
                return markPage()
                    .then(() => Promise.all([
                    findViewportRectInWindow({ color: '#00ff00' }),
                    resize_window_1.getFocusedWindowSize()
                ]))
                    .then(tuple => {
                    const viewportRect = tuple[0];
                    const winSize = tuple[1];
                    // Note: cache this value
                    findRectangleCache = viewportRect;
                    // Note: `winSize.window.width - winSize.viewport.width` shall always be no less than real left padding
                    // while `findRectangle` doesn't always return correct value (larger than actual one)
                    // so we try to take the minimun of those two
                    const offsetX = winSize.window.left + Math.min(viewportRect.x, winSize.window.width - winSize.viewport.width);
                    const offsetY = winSize.window.top + Math.min(viewportRect.y, winSize.window.height - winSize.viewport.height);
                    return unmarkPage()
                        .then(() => typeSafeAPI.sendMouseEvent({
                        type: event.type,
                        button: event.button,
                        x: event.x + offsetX,
                        y: event.y + offsetY
                    }));
                });
            })
                .catch(e => {
                console.error(e);
                return false;
            });
        }
    });
    let findRectangleCache = null;
    return api;
});


/***/ }),

/***/ 498:
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./af": 263,
	"./af.js": 263,
	"./ar": 264,
	"./ar-dz": 265,
	"./ar-dz.js": 265,
	"./ar-kw": 266,
	"./ar-kw.js": 266,
	"./ar-ly": 267,
	"./ar-ly.js": 267,
	"./ar-ma": 268,
	"./ar-ma.js": 268,
	"./ar-sa": 269,
	"./ar-sa.js": 269,
	"./ar-tn": 270,
	"./ar-tn.js": 270,
	"./ar.js": 264,
	"./az": 271,
	"./az.js": 271,
	"./be": 272,
	"./be.js": 272,
	"./bg": 273,
	"./bg.js": 273,
	"./bm": 274,
	"./bm.js": 274,
	"./bn": 275,
	"./bn.js": 275,
	"./bo": 276,
	"./bo.js": 276,
	"./br": 277,
	"./br.js": 277,
	"./bs": 278,
	"./bs.js": 278,
	"./ca": 279,
	"./ca.js": 279,
	"./cs": 280,
	"./cs.js": 280,
	"./cv": 281,
	"./cv.js": 281,
	"./cy": 282,
	"./cy.js": 282,
	"./da": 283,
	"./da.js": 283,
	"./de": 284,
	"./de-at": 285,
	"./de-at.js": 285,
	"./de-ch": 286,
	"./de-ch.js": 286,
	"./de.js": 284,
	"./dv": 287,
	"./dv.js": 287,
	"./el": 288,
	"./el.js": 288,
	"./en-au": 289,
	"./en-au.js": 289,
	"./en-ca": 290,
	"./en-ca.js": 290,
	"./en-gb": 291,
	"./en-gb.js": 291,
	"./en-ie": 292,
	"./en-ie.js": 292,
	"./en-nz": 293,
	"./en-nz.js": 293,
	"./eo": 294,
	"./eo.js": 294,
	"./es": 295,
	"./es-do": 296,
	"./es-do.js": 296,
	"./es-us": 297,
	"./es-us.js": 297,
	"./es.js": 295,
	"./et": 298,
	"./et.js": 298,
	"./eu": 299,
	"./eu.js": 299,
	"./fa": 300,
	"./fa.js": 300,
	"./fi": 301,
	"./fi.js": 301,
	"./fo": 302,
	"./fo.js": 302,
	"./fr": 303,
	"./fr-ca": 304,
	"./fr-ca.js": 304,
	"./fr-ch": 305,
	"./fr-ch.js": 305,
	"./fr.js": 303,
	"./fy": 306,
	"./fy.js": 306,
	"./gd": 307,
	"./gd.js": 307,
	"./gl": 308,
	"./gl.js": 308,
	"./gom-latn": 309,
	"./gom-latn.js": 309,
	"./gu": 310,
	"./gu.js": 310,
	"./he": 311,
	"./he.js": 311,
	"./hi": 312,
	"./hi.js": 312,
	"./hr": 313,
	"./hr.js": 313,
	"./hu": 314,
	"./hu.js": 314,
	"./hy-am": 315,
	"./hy-am.js": 315,
	"./id": 316,
	"./id.js": 316,
	"./is": 317,
	"./is.js": 317,
	"./it": 318,
	"./it.js": 318,
	"./ja": 319,
	"./ja.js": 319,
	"./jv": 320,
	"./jv.js": 320,
	"./ka": 321,
	"./ka.js": 321,
	"./kk": 322,
	"./kk.js": 322,
	"./km": 323,
	"./km.js": 323,
	"./kn": 324,
	"./kn.js": 324,
	"./ko": 325,
	"./ko.js": 325,
	"./ky": 326,
	"./ky.js": 326,
	"./lb": 327,
	"./lb.js": 327,
	"./lo": 328,
	"./lo.js": 328,
	"./lt": 329,
	"./lt.js": 329,
	"./lv": 330,
	"./lv.js": 330,
	"./me": 331,
	"./me.js": 331,
	"./mi": 332,
	"./mi.js": 332,
	"./mk": 333,
	"./mk.js": 333,
	"./ml": 334,
	"./ml.js": 334,
	"./mr": 335,
	"./mr.js": 335,
	"./ms": 336,
	"./ms-my": 337,
	"./ms-my.js": 337,
	"./ms.js": 336,
	"./mt": 338,
	"./mt.js": 338,
	"./my": 339,
	"./my.js": 339,
	"./nb": 340,
	"./nb.js": 340,
	"./ne": 341,
	"./ne.js": 341,
	"./nl": 342,
	"./nl-be": 343,
	"./nl-be.js": 343,
	"./nl.js": 342,
	"./nn": 344,
	"./nn.js": 344,
	"./pa-in": 345,
	"./pa-in.js": 345,
	"./pl": 346,
	"./pl.js": 346,
	"./pt": 347,
	"./pt-br": 348,
	"./pt-br.js": 348,
	"./pt.js": 347,
	"./ro": 349,
	"./ro.js": 349,
	"./ru": 350,
	"./ru.js": 350,
	"./sd": 351,
	"./sd.js": 351,
	"./se": 352,
	"./se.js": 352,
	"./si": 353,
	"./si.js": 353,
	"./sk": 354,
	"./sk.js": 354,
	"./sl": 355,
	"./sl.js": 355,
	"./sq": 356,
	"./sq.js": 356,
	"./sr": 357,
	"./sr-cyrl": 358,
	"./sr-cyrl.js": 358,
	"./sr.js": 357,
	"./ss": 359,
	"./ss.js": 359,
	"./sv": 360,
	"./sv.js": 360,
	"./sw": 361,
	"./sw.js": 361,
	"./ta": 362,
	"./ta.js": 362,
	"./te": 363,
	"./te.js": 363,
	"./tet": 364,
	"./tet.js": 364,
	"./th": 365,
	"./th.js": 365,
	"./tl-ph": 366,
	"./tl-ph.js": 366,
	"./tlh": 367,
	"./tlh.js": 367,
	"./tr": 368,
	"./tr.js": 368,
	"./tzl": 369,
	"./tzl.js": 369,
	"./tzm": 370,
	"./tzm-latn": 371,
	"./tzm-latn.js": 371,
	"./tzm.js": 370,
	"./uk": 372,
	"./uk.js": 372,
	"./ur": 373,
	"./ur.js": 373,
	"./uz": 374,
	"./uz-latn": 375,
	"./uz-latn.js": 375,
	"./uz.js": 374,
	"./vi": 376,
	"./vi.js": 376,
	"./x-pseudo": 377,
	"./x-pseudo.js": 377,
	"./yo": 378,
	"./yo.js": 378,
	"./zh-cn": 379,
	"./zh-cn.js": 379,
	"./zh-hk": 380,
	"./zh-hk.js": 380,
	"./zh-tw": 381,
	"./zh-tw.js": 381
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	var id = map[req];
	if(!(id + 1)) { // check for number or string
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return id;
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 498;

/***/ }),

/***/ 51:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(123);
const xy_1 = __webpack_require__(48);
const ts_utils_1 = __webpack_require__(52);
class XUserIO extends common_1.XModule {
    getName() {
        return common_1.XModuleTypes.XUserIO;
    }
    getAPI() {
        return xy_1.getNativeXYAPI();
    }
    initConfig() {
        return this.getConfig();
    }
    sanityCheck() {
        return Promise.all([
            this.getConfig(),
            this.getAPI()
                .reconnect()
                .catch(e => {
                throw new Error('Real User Simulation XModule is not installed yet');
            })
        ])
            .then(() => true);
    }
    checkUpdate() {
        return Promise.reject(new Error('checkUpdate is not implemented yet'));
    }
    checkUpdateLink(modVersion, extVersion) {
        return `https://a9t9.com/x/idehelp?help=xclick_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`;
    }
    downloadLink() {
        return 'https://a9t9.com/x/idehelp?help=xclick_download';
    }
    infoLink() {
        return 'https://a9t9.com/x/idehelp?help=xclick';
    }
}
exports.XUserIO = XUserIO;
exports.getXUserIO = ts_utils_1.singletonGetter(() => {
    return new XUserIO();
});


/***/ }),

/***/ 62:
/***/ (function(module, exports, __webpack_require__) {

var _require = __webpack_require__(2),
    retry = _require.retry;

var TO_BE_REMOVED = false;

var log = function log(msg) {
  if (console && console.log) console.log(msg);
};

var transformError = function transformError(err) {
  if (err instanceof Error) {
    return {
      isError: true,
      name: err.name,
      message: err.message,
      stack: err.stack
    };
  }

  return err;
};

// Note: The whole idea of ipc promise is about transforming the callback style
// ipc communication API to a Promise style
//
// eg. Orignial:    `chrome.runtime.sendMessage({}, () => {})`
//     ipcPromise:  `ipc.ask({}).then(() => {})`
//
// The benifit is
// 1. You can chain this promise with others
// 2. Create kind of connected channels between two ipc ends
//
// This is a generic interface to define a ipc promise utility
// All you need to declare is 4 functions
//
// e.g.
// ```
// ipcPromise({
//   ask: function (uid, cmd, args) { ... },
//   answer: function (uid, err, data) { ... },
//   onAsk: function (fn) { ... },
//   onAnswer: function (fn) { ... },
// })
// ```
function ipcPromise(options) {
  var ask = options.ask;
  var answer = options.answer;
  var timeout = options.timeout;
  var onAnswer = options.onAnswer;
  var onAsk = options.onAsk;
  var userDestroy = options.destroy;
  var checkReady = options.checkReady || function () {
    return Promise.resolve(true);
  };

  var askCache = {};
  var unhandledAsk = [];
  var markUnhandled = function markUnhandled(uid, cmd, args) {
    unhandledAsk.push({ uid: uid, cmd: cmd, args: args });
  };
  var handler = markUnhandled;

  var runHandlers = function runHandlers(handlers, cmd, args, resolve, reject) {
    for (var i = 0, len = handlers.length; i < len; i++) {
      var res;

      try {
        res = handlers[i](cmd, args);
      } catch (e) {
        return reject(e);
      }

      if (res !== undefined) {
        return resolve(res);
      }
    }
    // Note: DO NOT resolve anything if all handlers return undefined
  };

  // both for ask and unhandledAsk
  timeout = timeout || -1;

  onAnswer(function (uid, err, data) {
    if (uid && askCache[uid] === TO_BE_REMOVED) {
      delete askCache[uid];
      return;
    }

    if (!uid || !askCache[uid]) {
      // log('ipcPromise: response uid invalid: ' + uid);
      return;
    }

    var resolve = askCache[uid][0];
    var reject = askCache[uid][1];

    delete askCache[uid];

    if (err) {
      reject(transformError(err));
    } else {
      resolve(data);
    }
  });

  onAsk(function (uid, cmd, args) {
    if (timeout > 0) {
      setTimeout(function () {
        var found = unhandledAsk && unhandledAsk.find(function (item) {
          return item.uid === uid;
        });

        if (!found) return;

        answer(uid, new Error('ipcPromise: answer timeout ' + timeout + ' for cmd "' + cmd + '", args "' + args + '"'));
      }, timeout);
    }

    if (handler === markUnhandled) {
      markUnhandled(uid, cmd, args);
      return;
    }

    return new Promise(function (resolve, reject) {
      runHandlers(handler, cmd, args, resolve, reject);
    }).then(function (data) {
      // note: handler doens't handle the cmd => return undefined, should wait for timeout
      if (data === undefined) return markUnhandled(uid, cmd, args);
      answer(uid, null, data);
    }, function (err) {
      answer(uid, transformError(err), null);
    });
  });

  var wrapAsk = function wrapAsk(cmd, args, timeoutToOverride) {
    var uid = 'ipcp_' + new Date() * 1 + '_' + Math.round(Math.random() * 1000);
    var finalTimeout = timeoutToOverride || timeout;

    // Note: make it possible to disable timeout
    if (finalTimeout > 0) {
      setTimeout(function () {
        var reject;

        if (askCache && askCache[uid]) {
          reject = askCache[uid][1];
          askCache[uid] = TO_BE_REMOVED;
          reject(new Error('ipcPromise: onAsk timeout ' + finalTimeout + ' for cmd "' + cmd + '", args "' + args + '"'));
        }
      }, finalTimeout);
    }

    ask(uid, cmd, args || []);

    return new Promise(function (resolve, reject) {
      askCache[uid] = [resolve, reject];
    });
  };

  var wrapOnAsk = function wrapOnAsk(fn) {
    if (Array.isArray(handler)) {
      handler.push(fn);
    } else {
      handler = [fn];
    }

    var ps = unhandledAsk.map(function (task) {
      return new Promise(function (resolve, reject) {
        runHandlers(handler, task.cmd, task.args, resolve, reject);
      }).then(function (data) {
        // note: handler doens't handle the cmd => return undefined, should wait for timeout
        if (data === undefined) return;
        answer(task.uid, null, data);
        return task.uid;
      }, function (err) {
        answer(task.uid, err, null);
        return task.uid;
      });
    });

    Promise.all(ps).then(function (uids) {
      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = uids[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var uid = _step.value;

          if (uid === undefined) continue;

          var index = unhandledAsk.findIndex(function (item) {
            return item.uid === uid;
          });

          unhandledAsk.splice(index, 1);
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }
    });
  };

  var destroy = function destroy(noReject) {
    userDestroy && userDestroy();

    ask = null;
    answer = null;
    onAnswer = null;
    onAsk = null;
    unhandledAsk = null;

    if (!noReject) {
      Object.keys(askCache).forEach(function (uid) {
        var tuple = askCache[uid];
        var reject = tuple[1];
        reject && reject(new Error('IPC Promise has been Destroyed.'));
        delete askCache[uid];
      });
    }
  };

  var waitForReady = function waitForReady(checkReady, fn) {
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var makeSureReady = retry(checkReady, {
        shouldRetry: function shouldRetry() {
          return true;
        },
        retryInterval: 100,
        timeout: 5000
      });

      return makeSureReady().then(function () {
        return fn.apply(undefined, args);
      });
    };
  };

  return {
    ask: waitForReady(checkReady, wrapAsk),
    onAsk: wrapOnAsk,
    destroy: destroy
  };
}

ipcPromise.serialize = function (obj) {
  return {
    ask: function ask(cmd, args, timeout) {
      return obj.ask(cmd, JSON.stringify(args), timeout);
    },

    onAsk: function onAsk(fn) {
      return obj.onAsk(function (cmd, args) {
        return fn(cmd, JSON.parse(args));
      });
    },

    destroy: obj.destroy
  };
};

module.exports = ipcPromise;

/***/ }),

/***/ 64:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXTERNAL MODULE: ./node_modules/kd-glob-to-regexp/index.js
var kd_glob_to_regexp = __webpack_require__(101);
var kd_glob_to_regexp_default = /*#__PURE__*/__webpack_require__.n(kd_glob_to_regexp);

// EXTERNAL MODULE: ./src/common/utils.js
var utils = __webpack_require__(2);

// EXTERNAL MODULE: ./src/common/dom_utils.js
var dom_utils = __webpack_require__(22);

// EXTERNAL MODULE: ./src/common/ipc/cs_postmessage.js
var cs_postmessage = __webpack_require__(35);

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(3);
var web_extension_default = /*#__PURE__*/__webpack_require__.n(web_extension);

// EXTERNAL MODULE: ./src/common/log.js
var log = __webpack_require__(4);

// EXTERNAL MODULE: ./src/common/drag_mock/index.js
var drag_mock = __webpack_require__(136);
var drag_mock_default = /*#__PURE__*/__webpack_require__.n(drag_mock);

// EXTERNAL MODULE: ./node_modules/dom-element-is-natively-editable/index.js
var dom_element_is_natively_editable = __webpack_require__(137);

// CONCATENATED MODULE: ./src/common/lib/keysim.js
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }



var CTRL = 1 << 0;
var META = 1 << 1;
var ALT = 1 << 2;
var SHIFT = 1 << 3;

// Key Events
var KeyEvents = {
  DOWN: 1 << 0,
  PRESS: 1 << 1,
  UP: 1 << 2,
  INPUT: 1 << 3
};
KeyEvents.ALL = KeyEvents.DOWN | KeyEvents.PRESS | KeyEvents.UP | KeyEvents.INPUT;

/**
 * Represents a keystroke, or a single key code with a set of active modifiers.
 *
 * @class Keystroke
 */
var Keystroke =
/**
 * @param {number} modifiers A bitmask formed by CTRL, META, ALT, and SHIFT.
 * @param {number} keyCode
 */
function Keystroke(modifiers, keyCode) {
  _classCallCheck(this, Keystroke);

  this.modifiers = modifiers;
  this.ctrlKey = !!(modifiers & CTRL);
  this.metaKey = !!(modifiers & META);
  this.altKey = !!(modifiers & ALT);
  this.shiftKey = !!(modifiers & SHIFT);
  this.keyCode = keyCode;
}

/**
 * Gets the bitmask value for the "control" modifier.
 *
 * @type {number}
 */


/**
 * Gets the bitmask value for the "meta" modifier.
 *
 * @return {number}
 */


/**
 * Gets the bitmask value for the "alt" modifier.
 *
 * @return {number}
 */


/**
 * Gets the bitmask value for the "shift" modifier.
 *
 * @return {number}
 */
;

/**
 * Simulates a keyboard with a particular key-to-character and key-to-action
 * mapping. Use `US_ENGLISH` to get a pre-configured keyboard.
 */
Keystroke.CTRL = CTRL;
Keystroke.META = META;
Keystroke.ALT = ALT;
Keystroke.SHIFT = SHIFT;
var keysim_Keyboard = function () {
  /**
   * @param {Object.<number, Keystroke>} charCodeKeyCodeMap
   * @param {Object.<string, number>} actionKeyCodeMap
   */
  function Keyboard(charCodeKeyCodeMap, actionKeyCodeMap) {
    _classCallCheck(this, Keyboard);

    this._charCodeKeyCodeMap = charCodeKeyCodeMap;
    this._actionKeyCodeMap = actionKeyCodeMap;
  }

  /**
   * Determines the character code generated by pressing the given keystroke.
   *
   * @param {Keystroke} keystroke
   * @return {?number}
   */


  _createClass(Keyboard, [{
    key: 'charCodeForKeystroke',
    value: function charCodeForKeystroke(keystroke) {
      var map = this._charCodeKeyCodeMap;
      for (var charCode in map) {
        if (Object.prototype.hasOwnProperty.call(map, charCode)) {
          var keystrokeForCharCode = map[charCode];
          if (keystroke.keyCode === keystrokeForCharCode.keyCode && keystroke.modifiers === keystrokeForCharCode.modifiers) {
            return parseInt(charCode, 10);
          }
        }
      }
      return null;
    }

    /**
     * Creates an event ready for dispatching onto the given target.
     *
     * @param {string} type One of "keydown", "keypress", "keyup", "textInput" or "input".
     * @param {Keystroke} keystroke
     * @param {HTMLElement} target
     * @return {Event}
     */

  }, {
    key: 'createEventFromKeystroke',
    value: function createEventFromKeystroke(type, keystroke, target) {
      var document = target.ownerDocument;
      var window = document.defaultView;
      var Event = window.Event;

      var event = void 0;

      try {
        event = new Event(type);
      } catch (e) {
        event = document.createEvent('UIEvents');
      }

      event.initEvent(type, true, true);

      switch (type) {
        case 'textInput':
          event.data = String.fromCharCode(this.charCodeForKeystroke(keystroke));
          break;

        case 'keydown':
        case 'keypress':
        case 'keyup':
          event.shiftKey = keystroke.shiftKey;
          event.altKey = keystroke.altKey;
          event.metaKey = keystroke.metaKey;
          event.ctrlKey = keystroke.ctrlKey;
          event.keyCode = type === 'keypress' ? this.charCodeForKeystroke(keystroke) : keystroke.keyCode;
          event.charCode = type === 'keypress' ? event.keyCode : 0;
          event.which = event.keyCode;
          break;
      }

      return event;
    }

    /**
     * Fires the correct sequence of events on the given target as if the given
     * action was undertaken by a human.
     *
     * @param {string} action e.g. "alt+shift+left" or "backspace"
     * @param {HTMLElement} target
     */

  }, {
    key: 'dispatchEventsForAction',
    value: function dispatchEventsForAction(action, target) {
      var keystroke = this.keystrokeForAction(action);
      this.dispatchEventsForKeystroke(keystroke, target);
    }

    /**
     * Fires the correct sequence of events on the given target as if the given
     * input had been typed by a human.
     *
     * @param {string} input
     * @param {HTMLElement} target
     */

  }, {
    key: 'dispatchEventsForInput',
    value: function dispatchEventsForInput(input, target) {
      var currentModifierState = 0;
      for (var i = 0, length = input.length; i < length; i++) {
        var keystroke = this.keystrokeForCharCode(input.charCodeAt(i));
        if (!keystroke) continue;

        this.dispatchModifierStateTransition(target, currentModifierState, keystroke.modifiers);
        this.dispatchEventsForKeystroke(keystroke, target, false);
        currentModifierState = keystroke.modifiers;
      }
      this.dispatchModifierStateTransition(target, currentModifierState, 0);
    }

    /**
     * Fires the correct sequence of events on the given target as if the given
     * keystroke was performed by a human. When simulating, for example, typing
     * the letter "A" (assuming a U.S. English keyboard) then the sequence will
     * look like this:
     *
     *   keydown   keyCode=16 (SHIFT) charCode=0      shiftKey=true
     *   keydown   keyCode=65 (A)     charCode=0      shiftKey=true
     *   keypress  keyCode=65 (A)     charCode=65 (A) shiftKey=true
     *   textInput data=A
     *   input
     *   keyup     keyCode=65 (A)     charCode=0      shiftKey=true
     *   keyup     keyCode=16 (SHIFT) charCode=0      shiftKey=false
     *
     * If the keystroke would not cause a character to be input, such as when
     * pressing alt+shift+left, the sequence looks like this:
     *
     *   keydown   keyCode=16 (SHIFT) charCode=0 altKey=false shiftKey=true
     *   keydown   keyCode=18 (ALT)   charCode=0 altKey=true  shiftKey=true
     *   keydown   keyCode=37 (LEFT)  charCode=0 altKey=true  shiftKey=true
     *   keyup     keyCode=37 (LEFT)  charCode=0 altKey=true  shiftKey=true
     *   keyup     keyCode=18 (ALT)   charCode=0 altKey=false shiftKey=true
     *   keyup     keyCode=16 (SHIFT) charCode=0 altKey=false shiftKey=false
     *
     * To disable handling of modifier keys, call with `transitionModifers` set
     * to false. Doing so will omit the keydown and keyup events associated with
     * shift, ctrl, alt, and meta keys surrounding the actual keystroke.
     *
     * @param {Keystroke} keystroke
     * @param {HTMLElement} target
     * @param {boolean=} transitionModifiers
     * @param {number} events
     */

  }, {
    key: 'dispatchEventsForKeystroke',
    value: function dispatchEventsForKeystroke(keystroke, target) {
      var transitionModifiers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      var events = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : KeyEvents.ALL;

      if (!keystroke) return;

      if (transitionModifiers) {
        this.dispatchModifierStateTransition(target, 0, keystroke.modifiers, events);
      }

      var keydownEvent = void 0;
      if (events & KeyEvents.DOWN) {
        keydownEvent = this.createEventFromKeystroke('keydown', keystroke, target);
      }

      if (keydownEvent && target.dispatchEvent(keydownEvent) && this.targetCanReceiveTextInput(target)) {
        var keypressEvent = void 0;
        if (events & KeyEvents.PRESS) {
          keypressEvent = this.createEventFromKeystroke('keypress', keystroke, target);
        }
        if (keypressEvent && keypressEvent.charCode && target.dispatchEvent(keypressEvent)) {
          if (events & KeyEvents.INPUT) {
            var textinputEvent = this.createEventFromKeystroke('textInput', keystroke, target);
            target.dispatchEvent(textinputEvent);

            var inputEvent = this.createEventFromKeystroke('input', keystroke, target);
            target.dispatchEvent(inputEvent);
          }
        }
      }

      if (events & KeyEvents.UP) {
        var keyupEvent = this.createEventFromKeystroke('keyup', keystroke, target);
        target.dispatchEvent(keyupEvent);
      }

      if (transitionModifiers) {
        this.dispatchModifierStateTransition(target, keystroke.modifiers, 0);
      }
    }

    /**
     * Transitions from one modifier state to another by dispatching key events.
     *
     * @param {EventTarget} target
     * @param {number} fromModifierState
     * @param {number} toModifierState
     * @param {number} events
     * @private
     */

  }, {
    key: 'dispatchModifierStateTransition',
    value: function dispatchModifierStateTransition(target, fromModifierState, toModifierState) {
      var events = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : KeyEvents.ALL;

      var currentModifierState = fromModifierState;
      var didHaveMeta = (fromModifierState & META) === META;
      var willHaveMeta = (toModifierState & META) === META;
      var didHaveCtrl = (fromModifierState & CTRL) === CTRL;
      var willHaveCtrl = (toModifierState & CTRL) === CTRL;
      var didHaveShift = (fromModifierState & SHIFT) === SHIFT;
      var willHaveShift = (toModifierState & SHIFT) === SHIFT;
      var didHaveAlt = (fromModifierState & ALT) === ALT;
      var willHaveAlt = (toModifierState & ALT) === ALT;

      var includeKeyUp = events & KeyEvents.UP;
      var includeKeyDown = events & KeyEvents.DOWN;

      if (includeKeyUp && didHaveMeta === true && willHaveMeta === false) {
        // Release the meta key.
        currentModifierState &= ~META;
        target.dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionKeyCodeMap.META), target));
      }

      if (includeKeyUp && didHaveCtrl === true && willHaveCtrl === false) {
        // Release the ctrl key.
        currentModifierState &= ~CTRL;
        target.dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionKeyCodeMap.CTRL), target));
      }

      if (includeKeyUp && didHaveShift === true && willHaveShift === false) {
        // Release the shift key.
        currentModifierState &= ~SHIFT;
        target.dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionKeyCodeMap.SHIFT), target));
      }

      if (includeKeyUp && didHaveAlt === true && willHaveAlt === false) {
        // Release the alt key.
        currentModifierState &= ~ALT;
        target.dispatchEvent(this.createEventFromKeystroke('keyup', new Keystroke(currentModifierState, this._actionKeyCodeMap.ALT), target));
      }

      if (includeKeyDown && didHaveMeta === false && willHaveMeta === true) {
        // Press the meta key.
        currentModifierState |= META;
        target.dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionKeyCodeMap.META), target));
      }

      if (includeKeyDown && didHaveCtrl === false && willHaveCtrl === true) {
        // Press the ctrl key.
        currentModifierState |= CTRL;
        target.dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionKeyCodeMap.CTRL), target));
      }

      if (includeKeyDown && didHaveShift === false && willHaveShift === true) {
        // Press the shift key.
        currentModifierState |= SHIFT;
        target.dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionKeyCodeMap.SHIFT), target));
      }

      if (includeKeyDown && didHaveAlt === false && willHaveAlt === true) {
        // Press the alt key.
        currentModifierState |= ALT;
        target.dispatchEvent(this.createEventFromKeystroke('keydown', new Keystroke(currentModifierState, this._actionKeyCodeMap.ALT), target));
      }

      if (currentModifierState !== toModifierState) {
        throw new Error('internal error, expected modifier state: ' + toModifierState + (', got: ' + currentModifierState));
      }
    }

    /**
     * Returns the keystroke associated with the given action.
     *
     * @param {string} action
     * @return {?Keystroke}
     */

  }, {
    key: 'keystrokeForAction',
    value: function keystrokeForAction(action) {
      var keyCode = null;
      var modifiers = 0;

      // Note: when it comes to a single character as '+',
      // should not take it as a key combiniation (no action.split)
      var parts = action.length === 1 ? [action] : action.split('+');
      var lastPart = parts.pop();

      parts.forEach(function (part) {
        switch (part.toUpperCase()) {
          case 'CTRL':
            modifiers |= CTRL;
            break;
          case 'META':
            modifiers |= META;
            break;
          case 'ALT':
            modifiers |= ALT;
            break;
          case 'SHIFT':
            modifiers |= SHIFT;
            break;
          default:
            console.error('parts', parts);
            throw new Error('in "' + action + '", invalid modifier: ' + part);
        }
      });

      if (lastPart.toUpperCase() in this._actionKeyCodeMap) {
        keyCode = this._actionKeyCodeMap[lastPart.toUpperCase()];
      } else if (lastPart.length === 1) {
        var lastPartKeystroke = this.keystrokeForCharCode(lastPart.charCodeAt(0));
        if (!lastPartKeystroke) return null;

        modifiers |= lastPartKeystroke.modifiers;
        keyCode = lastPartKeystroke.keyCode;
      } else {
        throw new Error('in "' + action + '", invalid action: ' + lastPart);
      }

      return new Keystroke(modifiers, keyCode);
    }

    /**
     * Gets the keystroke used to generate the given character code.
     *
     * @param {number} charCode
     * @return {?Keystroke}
     */

  }, {
    key: 'keystrokeForCharCode',
    value: function keystrokeForCharCode(charCode) {
      return this._charCodeKeyCodeMap[charCode] || null;
    }

    /**
     * @param {EventTarget} target
     * @private
     */

  }, {
    key: 'targetCanReceiveTextInput',
    value: function targetCanReceiveTextInput(target) {
      if (!target) {
        return false;
      }

      return Object(dom_element_is_natively_editable["a" /* default */])(target);
    }
  }]);

  return Keyboard;
}();

var US_ENGLISH_CHARCODE_KEYCODE_MAP = {
  32: new Keystroke(0, 32), // <space>
  33: new Keystroke(SHIFT, 49), // !
  34: new Keystroke(SHIFT, 222), // "
  35: new Keystroke(SHIFT, 51), // #
  36: new Keystroke(SHIFT, 52), // $
  37: new Keystroke(SHIFT, 53), // %
  38: new Keystroke(SHIFT, 55), // &
  39: new Keystroke(0, 222), // '
  40: new Keystroke(SHIFT, 57), // (
  41: new Keystroke(SHIFT, 48), // )
  42: new Keystroke(SHIFT, 56), // *
  43: new Keystroke(SHIFT, 187), // +
  44: new Keystroke(0, 188), // ,
  45: new Keystroke(0, 189), // -
  46: new Keystroke(0, 190), // .
  47: new Keystroke(0, 191), // /
  48: new Keystroke(0, 48), // 0
  49: new Keystroke(0, 49), // 1
  50: new Keystroke(0, 50), // 2
  51: new Keystroke(0, 51), // 3
  52: new Keystroke(0, 52), // 4
  53: new Keystroke(0, 53), // 5
  54: new Keystroke(0, 54), // 6
  55: new Keystroke(0, 55), // 7
  56: new Keystroke(0, 56), // 8
  57: new Keystroke(0, 57), // 9
  58: new Keystroke(SHIFT, 186), // :
  59: new Keystroke(0, 186), // ;
  60: new Keystroke(SHIFT, 188), // <
  61: new Keystroke(0, 187), // =
  62: new Keystroke(SHIFT, 190), // >
  63: new Keystroke(SHIFT, 191), // ?
  64: new Keystroke(SHIFT, 50), // @
  65: new Keystroke(SHIFT, 65), // A
  66: new Keystroke(SHIFT, 66), // B
  67: new Keystroke(SHIFT, 67), // C
  68: new Keystroke(SHIFT, 68), // D
  69: new Keystroke(SHIFT, 69), // E
  70: new Keystroke(SHIFT, 70), // F
  71: new Keystroke(SHIFT, 71), // G
  72: new Keystroke(SHIFT, 72), // H
  73: new Keystroke(SHIFT, 73), // I
  74: new Keystroke(SHIFT, 74), // J
  75: new Keystroke(SHIFT, 75), // K
  76: new Keystroke(SHIFT, 76), // L
  77: new Keystroke(SHIFT, 77), // M
  78: new Keystroke(SHIFT, 78), // N
  79: new Keystroke(SHIFT, 79), // O
  80: new Keystroke(SHIFT, 80), // P
  81: new Keystroke(SHIFT, 81), // Q
  82: new Keystroke(SHIFT, 82), // R
  83: new Keystroke(SHIFT, 83), // S
  84: new Keystroke(SHIFT, 84), // T
  85: new Keystroke(SHIFT, 85), // U
  86: new Keystroke(SHIFT, 86), // V
  87: new Keystroke(SHIFT, 87), // W
  88: new Keystroke(SHIFT, 88), // X
  89: new Keystroke(SHIFT, 89), // Y
  90: new Keystroke(SHIFT, 90), // Z
  91: new Keystroke(0, 219), // [
  92: new Keystroke(0, 220), // \
  93: new Keystroke(0, 221), // ]
  94: new Keystroke(SHIFT, 54), // ^
  95: new Keystroke(SHIFT, 189), // _
  96: new Keystroke(0, 192), // `
  97: new Keystroke(0, 65), // a
  98: new Keystroke(0, 66), // b
  99: new Keystroke(0, 67), // c
  100: new Keystroke(0, 68), // d
  101: new Keystroke(0, 69), // e
  102: new Keystroke(0, 70), // f
  103: new Keystroke(0, 71), // g
  104: new Keystroke(0, 72), // h
  105: new Keystroke(0, 73), // i
  106: new Keystroke(0, 74), // j
  107: new Keystroke(0, 75), // k
  108: new Keystroke(0, 76), // l
  109: new Keystroke(0, 77), // m
  110: new Keystroke(0, 78), // n
  111: new Keystroke(0, 79), // o
  112: new Keystroke(0, 80), // p
  113: new Keystroke(0, 81), // q
  114: new Keystroke(0, 82), // r
  115: new Keystroke(0, 83), // s
  116: new Keystroke(0, 84), // t
  117: new Keystroke(0, 85), // u
  118: new Keystroke(0, 86), // v
  119: new Keystroke(0, 87), // w
  120: new Keystroke(0, 88), // x
  121: new Keystroke(0, 89), // y
  122: new Keystroke(0, 90), // z
  123: new Keystroke(SHIFT, 219), // {
  124: new Keystroke(SHIFT, 220), // |
  125: new Keystroke(SHIFT, 221), // }
  126: new Keystroke(SHIFT, 192) // ~
};

var US_ENGLISH_ACTION_KEYCODE_MAP = {
  BACKSPACE: 8,
  TAB: 9,
  ENTER: 13,
  SHIFT: 16,
  CTRL: 17,
  ALT: 18,
  PAUSE: 19,
  CAPSLOCK: 20,
  ESCAPE: 27,
  PAGEUP: 33,
  PAGEDOWN: 34,
  END: 35,
  HOME: 36,
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  INSERT: 45,
  DELETE: 46,
  META: 91,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123
};

/**
 * Gets a keyboard instance configured as a U.S. English keyboard would be.
 *
 * @return {Keyboard}
 */
keysim_Keyboard.US_ENGLISH = new keysim_Keyboard(US_ENGLISH_CHARCODE_KEYCODE_MAP, US_ENGLISH_ACTION_KEYCODE_MAP);
// CONCATENATED MODULE: ./src/common/send_keys.js




var keyboard = keysim_Keyboard.US_ENGLISH;

var findParentByTag = function findParentByTag(el, tag) {
  var p = el;

  // eslint-disable-next-line no-cond-assign
  while (p = p.parentNode) {
    if (p.tagName === tag.toUpperCase()) {
      return p;
    }
  }

  return null;
};

var send_keys_splitStringToChars = function splitStringToChars(str) {
  var specialKeys = ['KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN', 'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN', 'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE', 'KEY_ENTER', 'KEY_TAB'];
  var reg = new RegExp('\\$\\{(' + specialKeys.join('|') + ')\\}');
  var parts = Object(utils["splitKeep"])(reg, str);

  return parts.reduce(function (prev, cur) {
    if (reg.test(cur)) {
      prev.push(cur);
    } else {
      prev = prev.concat(cur.split(''));
    }

    return prev;
  }, []);
};

var getKeyStrokeAction = function getKeyStrokeAction(str) {
  var reg = /^\$\{([^}]+)\}$/;
  var match = void 0;

  // eslint-disable-next-line no-cond-assign
  if (match = str.match(reg)) {
    switch (match[1]) {
      case 'KEY_LEFT':
        return 'LEFT';

      case 'KEY_UP':
        return 'UP';

      case 'KEY_RIGHT':
        return 'RIGHT';

      case 'KEY_DOWN':
        return 'DOWN';

      case 'KEY_PGUP':
      case 'KEY_PAGE_UP':
        return 'PAGEUP';

      case 'KEY_PGDN':
      case 'KEY_PAGE_DOWN':
        return 'PAGEDOWN';

      case 'KEY_BKSP':
      case 'KEY_BACKSPACE':
        return 'BACKSPACE';

      case 'KEY_DEL':
      case 'KEY_DELETE':
        return 'DELETE';

      case 'KEY_ENTER':
        return 'ENTER';

      case 'KEY_TAB':
        return 'TAB';
    }
  }

  return str;
};

var isEditable = function isEditable(el) {
  if (el.getAttribute('readonly') !== null) return false;
  var tag = el.tagName.toUpperCase();
  var type = (el.type || '').toLowerCase();
  var editableTypes = ['text', 'search', 'tel', 'url', 'email', 'password', 'number'];

  if (tag === 'TEXTAREA') return true;
  if (tag === 'INPUT' && editableTypes.indexOf(type) !== -1) return true;

  return false;
};

var maybeEditText = function maybeEditText(target, c) {
  if (!isEditable(target)) return;
  if (c.length === 1) {
    if (!isNil(target.selectionStart)) {
      var lastStart = target.selectionStart;
      target.value = target.value.substring(0, target.selectionStart) + c + target.value.substring(target.selectionEnd);

      setSelection(target, lastStart + 1);
    } else {
      target.value = target.value + c;
    }
  } else {
    switch (c) {
      case 'ENTER':
        target.value = target.value + '\n';
        setSelection(target, target.value.length);
        break;
      case 'TAB':
        target.value = target.value + '\t';
        setSelection(target, target.value.length);
        break;
      case 'LEFT':
        setSelection(target, target.selectionStart - 1);
        break;
      case 'RIGHT':
        setSelection(target, target.selectionEnd + 1);
        break;
      case 'BACKSPACE':
        {
          var pos = target.selectionStart;
          target.value = target.value.substring(0, target.selectionStart - 1) + target.value.substring(target.selectionEnd);
          setSelection(target, pos - 1);
          break;
        }
      case 'DELETE':
        {
          var _pos = target.selectionEnd;
          target.value = target.value.substring(0, target.selectionStart) + target.value.substring(target.selectionEnd + 1);
          setSelection(target, _pos);
          break;
        }
    }
  }
};

var maybeSubmitForm = function maybeSubmitForm(target, key) {
  if (key !== 'ENTER') return;
  if (!isEditable(target)) return;

  var form = findParentByTag(target, 'FORM');
  if (!form) return;

  form.submit();
};

var isNil = function isNil(val) {
  return val === null || val === undefined;
};

var setSelection = function setSelection($el, start, end) {
  // Note: Inputs like number and email, doesn't support selectionEnd
  // for safety, make sure those values are not null or undefined (infers that it's available)
  if (!isNil($el.selectionStart)) {
    $el.selectionStart = start;
  }

  if (!isNil($el.selectionEnd)) {
    $el.selectionEnd = end !== undefined ? end : start;
  }
};

var replaceActionKey = function () {
  var mapping = {
    0: null, // the NULL character
    8: 'BACKSPACE',
    9: 'TAB',
    10: 'ENTER', // \n  new line
    11: null, // \v  vertical tab
    12: null, // \f  form feed
    13: null // \r  carriage return
  };

  return function (c) {
    // Note: it means it's already key stroke action
    if (c.length > 1) return c;
    return mapping[c.charCodeAt(0)] || c;
  };
}();

function sendKeys(target, str, noSpecialKeys) {
  var rawChars = noSpecialKeys ? str.split('') : send_keys_splitStringToChars(str);
  var chars = rawChars.map(replaceActionKey).filter(function (x) {
    return x && x.length;
  });

  target.focus();
  if (target.value) {
    setSelection(target, target.value.length);
  }

  chars.forEach(function (c) {
    var action = getKeyStrokeAction(c);

    maybeEditText(target, action);
    // Note: This line will take care of KEYDOWN KEYPRESS KEYUP and TEXTINPUT
    keyboard.dispatchEventsForAction(action, target);

    if (!noSpecialKeys) {
      maybeSubmitForm(target, action);
    }
  });
}
// EXTERNAL MODULE: ./src/common/encrypt.js
var encrypt = __webpack_require__(97);

// EXTERNAL MODULE: ./src/common/constant.js
var constant = __webpack_require__(8);

// CONCATENATED MODULE: ./src/common/command_runner.js
/* unused harmony export assertLocator */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return isLocator; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return command_runner_getElementByLocator; });
/* unused harmony export getFrameByLocator */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return command_runner_run; });
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }












var HIGHLIGHT_TIMEOUT = 500;

var command_runner_globMatch = function globMatch(pattern, text) {
  return kd_glob_to_regexp_default()(pattern).test(text);
};

var getElementByXPath = function getElementByXPath(xpath) {
  var snapshot = document.evaluate(xpath, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

  return snapshot.snapshotItem(0);
};

// reference: https://github.com/timoxley/offset
var viewportOffset = function viewportOffset(el) {
  var box = el.getBoundingClientRect();

  // Note: simply use bouddingClientRect since elementFromPoint uses
  // the same top/left relative to the current viewport/window instead of whole document
  return {
    top: box.top,
    left: box.left
  };
};

var command_runner_getIframeOffset = function getIframeOffset() {
  if (window === window.top) {
    return Promise.resolve({ x: 0, y: 0 });
  }

  return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
    action: 'SOURCE_PAGE_OFFSET',
    data: {}
  });
};

var command_runner_untilInjected = function untilInjected() {
  var api = {
    eval: function _eval(code) {
      Object(log["a" /* default */])('sending INJECT_RUN_EVAL');
      return Object(cs_postmessage["b" /* postMessage */])(window, window, { cmd: 'INJECT_RUN_EVAL', args: { code: code } }, '*', 5000).then(function (data) {
        Object(log["a" /* default */])('eval result', data);
        return data.result;
      });
    }
  };
  var injected = !!document.body.getAttribute('data-injected');
  if (injected) return Promise.resolve(api);

  Object(utils["insertScript"])(web_extension_default.a.extension.getURL('inject.js'));

  return Object(utils["retry"])(function () {
    Object(log["a" /* default */])('sending INJECT_READY');
    return Object(cs_postmessage["b" /* postMessage */])(window, window, { cmd: 'INJECT_READY' }, '*', 500);
  }, {
    shouldRetry: function shouldRetry() {
      return true;
    },
    timeout: 5000,
    retryInterval: 0
  })().then(function () {
    return api;
  }).catch(function (e) {
    Object(log["a" /* default */])(e.stack);
    throw new Error('fail to inject');
  });
};

var isElementFromPoint = function isElementFromPoint(str) {
  return (/^#elementfrompoint/i.test(str.trim())
  );
};

var pageCoordinateByElementFromPoint = function pageCoordinateByElementFromPoint(str) {
  var reg = /^#elementfrompoint\s*\((\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\)/i;
  var m = str.trim().match(reg);

  if (!m) {
    throw new Error('Invalid \'#elementfrompoint\' expression');
  }

  var pageX = parseFloat(m[1]);
  var pageY = parseFloat(m[2]);

  if (pageX <= 0 || pageY <= 0) {
    throw new Error('\'#elementfrompoint\' only accepts positive numbers');
  }

  return [pageX, pageY];
};

var command_runner_viewportCoordinateByElementFromPoint = function viewportCoordinateByElementFromPoint(str) {
  var _pageCoordinateByElem = pageCoordinateByElementFromPoint(str),
      _pageCoordinateByElem2 = _slicedToArray(_pageCoordinateByElem, 2),
      pageX = _pageCoordinateByElem2[0],
      pageY = _pageCoordinateByElem2[1];

  var offset = 0;
  var x = offset + pageX - Object(dom_utils["g" /* scrollLeft */])(document);
  var y = offset + pageY - Object(dom_utils["h" /* scrollTop */])(document);

  return [x, y];
};

var elementByElementFromPoint = function elementByElementFromPoint(str) {
  var _viewportCoordinateBy = command_runner_viewportCoordinateByElementFromPoint(str),
      _viewportCoordinateBy2 = _slicedToArray(_viewportCoordinateBy, 2),
      x = _viewportCoordinateBy2[0],
      y = _viewportCoordinateBy2[1];

  var el = document.elementFromPoint(x, y);

  return el;
};

var assertLocator = function assertLocator(str) {
  var i = str.indexOf('=');

  // xpath
  if (/^\//.test(str)) return true;
  // efp
  if (/^#elementfrompoint/i.test(str)) return true;
  // Above is all locators that doesn't require '='
  if (i === -1) throw new Error('invalid locator, ' + str);

  var method = str.substr(0, i);
  var value = str.substr(i + 1);

  if (!value || !value.length) throw new Error('invalid locator, ' + str);

  switch (method && method.toLowerCase()) {
    case 'id':
    case 'name':
    case 'identifier':
    case 'link':
    case 'css':
    case 'xpath':
      return true;

    default:
      throw new Error('invalid locator, ' + str);
  }
};

var isLocator = function isLocator(str) {
  try {
    assertLocator(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Note: parse the locator and return the element found accordingly
var command_runner_getElementByLocator = function getElementByLocator(str, shouldWaitForVisible) {
  var i = str.indexOf('=');
  var el = void 0;

  if (/^\//.test(str)) {
    el = getElementByXPath(str);
  } else if (/^#elementfrompoint/i.test(str.trim())) {
    el = elementByElementFromPoint(str);
    Object(log["a" /* default */])('elementfrompoint', el);
  } else if (i === -1) {
    throw new Error('getElementByLocator: invalid locator, ' + str);
  } else {
    var method = str.substr(0, i);
    var value = str.substr(i + 1);

    switch (method && method.toLowerCase()) {
      case 'id':
        el = document.getElementById(value);
        break;

      case 'name':
        el = document.getElementsByName(value)[0];
        break;

      case 'identifier':
        el = document.getElementById(value) || document.getElementsByName(value)[0];
        break;

      case 'link':
        {
          var links = [].slice.call(document.getElementsByTagName('a'));
          // Note: there are cases such as 'link=exact:xxx'
          var realVal = value.replace(/^exact:/, '');
          // Note: position support. eg. link=Download@POS=3
          var match = realVal.match(/^(.+)@POS=(\d+)$/i);
          var index = 0;

          if (match) {
            realVal = match[1];
            index = parseInt(match[2]) - 1;
          }

          // Note: use textContent instead of innerText to avoid influence from text-transform
          var candidates = links.filter(function (a) {
            return command_runner_globMatch(realVal, Object(dom_utils["d" /* domText */])(a));
          });
          el = candidates[index];
          break;
        }

      case 'css':
        el = document.querySelector(value);
        break;

      case 'xpath':
        el = getElementByXPath(value);
        break;

      default:
        throw new Error('getElementByLocator: unsupported locator method, ' + method);
    }
  }

  if (!el) {
    throw new Error('getElementByLocator: fail to find element based on the locator, ' + str);
  }

  if (shouldWaitForVisible && !Object(dom_utils["e" /* isVisible */])(el)) {
    throw new Error('getElementByLocator: element is found but not visible yet');
  }

  return el;
};

var command_runner_getFrameByLocator = function getFrameByLocator(str, helpers) {
  var i = str.indexOf('=');

  // Note: try to parse format of 'index=0' and 'relative=top/parent'
  if (i !== -1) {
    var method = str.substr(0, i);
    var value = str.substr(i + 1);

    switch (method) {
      case 'index':
        {
          var index = parseInt(value, 10);
          var frames = window.frames;
          var frame = frames[index];

          if (!frame) {
            throw new Error('Frame index out of range (index ' + value + ' in ' + frames.length + ' frames');
          }

          return { frame: frame };
        }

      case 'relative':
        {
          if (value === 'top') {
            return { frame: window.top };
          }

          if (value === 'parent') {
            return { frame: window.parent };
          }

          throw new Error('Unsupported relative type, ' + value);
        }
    }
  }

  // Note: consider it as name, if no '=' found and it has no xpath pattern
  if (i === -1 && !/^\//.test(str)) {
    str = 'name=' + str;
  }

  var frameDom = command_runner_getElementByLocator(str);

  if (!frameDom || !frameDom.contentWindow) {
    throw new Error('The element found based on ' + str + ' is NOT a frame/iframe');
  }

  // Note: for those iframe/frame that don't have src, they won't load content_script.js
  // so we have to inject the script by ourselves
  if (!frameDom.getAttribute('src')) {
    var file = web_extension_default.a.extension.getURL('content_script.js');
    var doc = frameDom.contentDocument;
    var s = doc.constructor.prototype.createElement.call(doc, 'script');

    s.setAttribute('type', 'text/javascript');
    s.setAttribute('src', file);

    doc.documentElement.appendChild(s);
    s.parentNode.removeChild(s);

    helpers.hackAlertConfirmPrompt(doc);
  }

  // Note: can't return the contentWindow directly, because Promise 'resolve' will
  // try to test its '.then' method, which will cause a cross origin violation
  // so, we wrap it in an object
  return { frame: frameDom.contentWindow };
};

var command_runner_run = function run(command, csIpc, helpers) {
  var cmd = command.cmd,
      target = command.target,
      value = command.value,
      extra = command.extra;

  var wrap = function wrap(fn, genOptions) {
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      var options = genOptions.apply(undefined, args);

      return new Promise(function (resolve, reject) {
        try {
          resolve(fn.apply(undefined, args));
        } catch (e) {
          reject(new Error(options.errorMsg(e.message)));
        }
      });
    };
  };
  var getElementByLocatorWithLogForEfp = function getElementByLocatorWithLogForEfp(locator, shouldWaitForVisible) {
    var el = command_runner_getElementByLocator(locator, shouldWaitForVisible);

    if (isElementFromPoint(locator)) {
      var elXpath = 'unkown';

      try {
        elXpath = helpers.xpath(el);
      } catch (e) {}

      var msg = locator + ' => xpath "' + elXpath + '"';

      console.log(msg, el);
      csIpc.ask('CS_ADD_LOG', { info: msg });
    }

    return el;
  };
  var __getFrameByLocator = wrap(command_runner_getFrameByLocator, function (locator) {
    return {
      errorMsg: function errorMsg(msg) {
        return 'timeout reached when looking for frame \'' + locator + '\'';
      }
    };
  });
  var __getElementByLocator = wrap(getElementByLocatorWithLogForEfp, function (locator) {
    return {
      errorMsg: function errorMsg(msg) {
        if (/element is found but not visible yet/.test(msg)) {
          return 'element is found but not visible yet for \'' + locator + '\' (use !WaitForVisible = false to disable waiting for visible)';
        }

        return 'timeout reached when looking for element \'' + locator + '\'';
      }
    };
  });

  switch (cmd) {
    case 'open':
      if (window.noCommandsYet) {
        return true;
      }

      return Object(utils["until"])('document.body', function () {
        return {
          pass: !!document.body,
          result: document.body
        };
      }).then(function (body) {
        window.location.href = command.target;
        return true;
      });

    case 'refresh':
      setTimeout(function () {
        return window.location.reload();
      }, 0);
      return true;

    case 'mouseOver':
      {
        return __getElementByLocator(target).then(function (el) {
          try {
            if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
            if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);
          } catch (e) {
            log["a" /* default */].error('error in scroll and highlight', e.message);
          }

          el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          return true;
        });
      }

    // Note: 'locate' command is only for internal use
    case 'locate':
      {
        return __getElementByLocator(target).then(function (el) {
          try {
            if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
            if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);
          } catch (e) {
            log["a" /* default */].error('error in scroll and highlight', e.message);
          }

          var vpOffset = viewportOffset(el);

          return command_runner_getIframeOffset().then(function (windowOffset) {
            return {
              rect: {
                x: vpOffset.left + windowOffset.x,
                y: vpOffset.top + windowOffset.y,
                width: el.offsetWidth,
                height: el.offsetHeight
              }
            };
          });
        });
      }

    case 'dragAndDropToObject':
      {
        return Promise.all([__getElementByLocator(target), __getElementByLocator(value)]).then(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              $src = _ref2[0],
              $tgt = _ref2[1];

          drag_mock_default.a.triggerDragEvent($src, $tgt);
          return true;
        });
      }

    case 'waitForVisible':
      {
        return __getElementByLocator(target, true).then(function () {
          return true;
        });
      }

    case 'clickAt':
      {
        var isEfp = isElementFromPoint(target);
        var pTarget = function () {
          if (!isEfp) return Promise.resolve(target);
          return command_runner_getIframeOffset().then(function (iframeOffset) {
            Object(log["a" /* default */])('iframeOffset', iframeOffset);

            var _viewportCoordinateBy3 = command_runner_viewportCoordinateByElementFromPoint(target),
                _viewportCoordinateBy4 = _slicedToArray(_viewportCoordinateBy3, 2),
                x = _viewportCoordinateBy4[0],
                y = _viewportCoordinateBy4[1];

            return '#elementfrompoint (' + (x - iframeOffset.x) + ', ' + (y - iframeOffset.y) + ')';
          });
        }();

        return pTarget.then(function (target) {
          return __getElementByLocator(target, extra.waitForVisible).then(function (el) {
            if (!/^\d+\s*,\s*\d+$/.test(value) && !isElementFromPoint(target)) {
              throw new Error('invalid offset for clickAt: ' + value);
            }

            var scrollAndHighlight = function scrollAndHighlight() {
              try {
                if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
                if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);
              } catch (e) {
                log["a" /* default */].error('error in scroll and highlight');
              }
            };

            var _ref3 = function () {
              if (isEfp) {
                return command_runner_viewportCoordinateByElementFromPoint(target);
              } else {
                var _value$split$map = value.split(',').map(function (str) {
                  return parseInt(str.trim(), 10);
                }),
                    _value$split$map2 = _slicedToArray(_value$split$map, 2),
                    x = _value$split$map2[0],
                    y = _value$split$map2[1];

                var _viewportOffset = viewportOffset(el),
                    top = _viewportOffset.top,
                    left = _viewportOffset.left;

                return [left + x, top + y];
              }
            }(),
                _ref4 = _slicedToArray(_ref3, 2),
                origClientX = _ref4[0],
                origClientY = _ref4[1];

            var lastScrollX = window.scrollX;
            var lastScrollY = window.scrollY;

            if (!isEfp) scrollAndHighlight();

            var clientX = origClientX + (lastScrollX - window.scrollX);
            var clientY = origClientY + (lastScrollY - window.scrollY);

            Object(log["a" /* default */])('clickAt clientX/clientY', clientX, clientY);['mousedown', 'mouseup', 'click'].forEach(function (eventType) {
              el.dispatchEvent(new MouseEvent(eventType, {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: clientX,
                clientY: clientY
              }));
            });

            // Note: delay scroll and highlight for efp,
            // otherwise that scroll could mess up the whole coodirnate calculation
            if (isEfp) scrollAndHighlight();

            return true;
          });
        });
      }

    case 'click':
    case 'clickAndWait':
      {
        return __getElementByLocator(target, extra.waitForVisible).then(function (el) {
          try {
            if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
            if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);
          } catch (e) {
            log["a" /* default */].error('error in scroll and highlight');
          }

          el.click();
          return true;
        });
      }

    case 'select':
    case 'selectAndWait':
      {
        return __getElementByLocator(target, extra.waitForVisible).then(function (el) {
          var options = [].slice.call(el.getElementsByTagName('option'));
          var i = value.indexOf('=');
          var optionType = value.substring(0, i);
          var optionValue = value.substring(i + 1);

          var option = function () {
            switch (optionType) {
              case 'label':
                return options.find(function (op) {
                  return command_runner_globMatch(optionValue, Object(dom_utils["d" /* domText */])(op).trim());
                });

              case 'index':
                return options.find(function (_, index) {
                  return index === parseInt(optionValue);
                });

              case 'id':
                return options.find(function (op, index) {
                  return op.id === optionValue;
                });

              case 'value':
                return options.find(function (op) {
                  return op.value === optionValue;
                });

              default:
                throw new Error('Option type "' + optionType + '" not supported');
            }
          }();

          if (!option) {
            throw new Error('cannot find option with \'' + value + '\'');
          }

          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
          if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);

          el.value = option.value;
          el.dispatchEvent(new Event('change'));

          return true;
        });
      }

    case 'type':
      {
        return __getElementByLocator(target, extra.waitForVisible).then(function (el) {
          var tag = el.tagName.toLowerCase();

          if (tag !== 'input' && tag !== 'textarea') {
            throw new Error('run command: element found is neither input nor textarea');
          }

          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
          if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);

          // Note: need the help of chrome.debugger to set file path to file input
          if (el.type && el.type.toLowerCase() === 'file') {
            if (web_extension_default.a.isFirefox()) {
              throw new Error('Setting file path fo file inputs is not supported by Firefox extension api yet');
            }

            return csIpc.ask('CS_SET_FILE_INPUT_FILES', {
              files: value.split(';'),
              selector: Object(dom_utils["c" /* cssSelector */])(el)
            });
          }

          return Object(encrypt["a" /* decryptIfNeeded */])(value, el).then(function (realValue) {
            el.value = '';
            sendKeys(el, realValue, true);

            el.value = realValue;
            el.dispatchEvent(new Event('change'));
            return true;
          });
        }).catch(function (e) {
          if (/This input element accepts a filename/i.test(e.message)) {
            throw new Error('Sorry, upload can not be automated Chrome (API limitation).');
          }

          throw e;
        });
      }

    case 'editContent':
      {
        return __getElementByLocator(target, extra.waitForVisible).then(function (el) {
          if (el.contentEditable !== 'true') {
            throw new Error('Target is not contenteditable');
          }

          if (extra.playScrollElementsIntoView) el.scrollIntoView({ block: 'center' });
          if (extra.playHighlightElements) helpers.highlightDom(el, HIGHLIGHT_TIMEOUT);

          el.innerHTML = value;
          return true;
        });
      }

    case 'selectFrame':
      {
        return __getFrameByLocator(target, helpers).then(function (frameWindow) {
          if (!frameWindow) {
            throw new Error('Invalid frame/iframe');
          }

          return frameWindow;
        });
      }

    case 'verifyText':
      {
        return __getElementByLocator(target).then(function (el) {
          var text = Object(dom_utils["d" /* domText */])(el);

          if (!command_runner_globMatch(value, text)) {
            return {
              log: {
                error: 'text not matched, \n\texpected: "' + value + '", \n\tactual: "' + text + '"'
              }
            };
          }

          return true;
        });
      }

    case 'verifyTitle':
      {
        if (!command_runner_globMatch(target, document.title)) {
          return {
            log: {
              error: 'title not matched, \n\texpected: "' + target + '", \n\tactual: "' + document.title + '"'
            }
          };
        }

        return true;
      }

    case 'verifyElementPresent':
      {
        var _ref5 = extra || {},
            timeoutElement = _ref5.timeoutElement,
            retryInfo = _ref5.retryInfo;

        return __getElementByLocator(target).then(function () {
          return true;
        }, function (e) {
          var shotsLeft = timeoutElement * 1000 / retryInfo.retryInterval - retryInfo.retryCount;
          var isLastChance = shotsLeft <= 1;

          if (isLastChance) {
            return {
              log: {
                error: '\'' + target + '\' element not present'
              }
            };
          }

          throw e;
        });
      }

    case 'verifyChecked':
      {
        return __getElementByLocator(target).then(function (el) {
          var checked = !!el.checked;

          if (!checked) {
            return {
              log: {
                error: '\'' + target + '\' is not checked'
              }
            };
          }
        });
      }

    case 'verifyAttribute':
      {
        var index = target.lastIndexOf('@');

        if (index === -1) {
          throw new Error('invalid target for verifyAttribute - ' + target);
        }

        var locator = target.substr(0, index);
        var attrName = target.substr(index + 1);

        return __getElementByLocator(locator).then(function (el) {
          var attr = el.getAttribute(attrName);

          if (!command_runner_globMatch(value, attr)) {
            return {
              log: {
                error: 'attribute not matched, \n\texpected: "' + value + '", \n\tactual: "' + attr + '"'
              }
            };
          }
        });
      }

    case 'verifyError':
      {
        if (extra.lastCommandOk) {
          return {
            log: {
              error: target
            }
          };
        }

        return true;
      }

    case 'assertText':
      {
        return __getElementByLocator(target).then(function (el) {
          var text = Object(dom_utils["d" /* domText */])(el);

          if (!command_runner_globMatch(value, text)) {
            throw new Error('text not matched, \n\texpected: "' + value + '", \n\tactual: "' + text + '"');
          }

          return true;
        });
      }

    case 'assertTitle':
      {
        if (!command_runner_globMatch(target, document.title)) {
          throw new Error('title not matched, \n\texpected: "' + target + '", \n\tactual: "' + document.title + '"');
        }

        return true;
      }

    case 'assertElementPresent':
      {
        return __getElementByLocator(target).then(function () {
          return true;
        });
      }

    case 'assertChecked':
      {
        return __getElementByLocator(target).then(function (el) {
          var checked = !!el.checked;

          if (!checked) {
            throw new Error('\'' + target + '\' is not checked');
          }
        });
      }

    case 'assertAttribute':
      {
        var _index = target.lastIndexOf('@');

        if (_index === -1) {
          throw new Error('invalid target for assertAttribute - ' + target);
        }

        var _locator = target.substr(0, _index);
        var _attrName = target.substr(_index + 1);

        return __getElementByLocator(_locator).then(function (el) {
          var attr = el.getAttribute(_attrName);

          if (!command_runner_globMatch(value, attr)) {
            throw new Error('attribute not matched, \n\texpected: "' + value + '", \n\tactual: "' + attr + '"');
          }
        });
      }

    case 'assertError':
      {
        if (extra.lastCommandOk) {
          throw new Error(target);
        }

        return true;
      }

    case 'assertAlert':
      {
        var msg = document.body.getAttribute('data-alert');

        if (!msg) {
          throw new Error('no alert found!');
        }

        if (!command_runner_globMatch(target, msg)) {
          throw new Error('unmatched alert msg, \n\texpected: "' + target + '", \n\tactual: "' + msg + '"');
        }

        document.body.setAttribute('data-alert', '');
        return true;
      }

    case 'assertConfirmation':
      {
        var _msg = document.body.getAttribute('data-confirm');

        if (!_msg) {
          throw new Error('no confirm found!');
        }

        if (!command_runner_globMatch(target, _msg)) {
          throw new Error('unmatched confirm msg, \n\texpected: "' + target + '", \n\tactual: "' + _msg + '"');
        }

        document.body.setAttribute('data-confirm', '');
        return true;
      }

    case 'assertPrompt':
      {
        var _msg2 = document.body.getAttribute('data-prompt');

        if (!_msg2) {
          throw new Error('no prompt found!');
        }

        if (!command_runner_globMatch(target, _msg2)) {
          throw new Error('unmatched prompt msg, \n\texpected: "' + target + '", \n\tactual: "' + _msg2 + '"');
        }

        document.body.setAttribute('data-prompt', '');
        return true;
      }

    case 'answerOnNextPrompt':
      {
        document.body.setAttribute('data-prompt-answer', target);
        return true;
      }

    case 'waitForPageToLoad':
      return true;

    case 'storeTitle':
      {
        return {
          vars: _defineProperty({}, value, document.title)
        };
      }

    case 'storeText':
      {
        return __getElementByLocator(target).then(function (el) {
          return {
            vars: _defineProperty({}, value, Object(dom_utils["d" /* domText */])(el))
          };
        });
      }

    case 'storeAttribute':
      {
        var _index2 = target.lastIndexOf('@');

        if (_index2 === -1) {
          throw new Error('invalid target for storeAttribute - ' + target);
        }

        var _locator2 = target.substr(0, _index2);
        var _attrName2 = target.substr(_index2 + 1);

        return __getElementByLocator(_locator2).then(function (el) {
          var attr = el.getAttribute(_attrName2);

          if (!attr) {
            throw new Error('missing attribute \'' + _attrName2 + '\'');
          }

          return {
            vars: _defineProperty({}, value, attr)
          };
        });
      }

    case 'storeEval':
      {
        return command_runner_untilInjected().then(function (api) {
          return api.eval(target).then(function (result) {
            return {
              vars: _defineProperty({}, value, result)
            };
          }).catch(function (e) {
            throw new Error('Error in runEval code: ' + e.message);
          });
        });
      }

    case 'storeValue':
      {
        return __getElementByLocator(target).then(function (el) {
          var text = el.value || '';

          return {
            vars: _defineProperty({}, value, text)
          };
        });
      }

    case 'storeChecked':
      {
        return __getElementByLocator(target).then(function (el) {
          var checked = !!el.checked;

          return {
            vars: _defineProperty({}, value, checked)
          };
        });
      }

    case 'verifyValue':
      {
        return __getElementByLocator(target).then(function (el) {
          var text = el.value;

          if (!command_runner_globMatch(value, text)) {
            return {
              log: {
                error: 'value not matched, \n\texpected: "' + value + '", \n\tactual: "' + text + '"'
              }
            };
          }

          return true;
        });
      }

    case 'assertValue':
      {
        return __getElementByLocator(target).then(function (el) {
          var text = el.value;

          if (!command_runner_globMatch(value, text)) {
            throw new Error('value not matched, \n\texpected: "' + value + '", \n\tactual: "' + text + '"');
          }

          return true;
        });
      }

    case 'sendKeys':
      {
        return __getElementByLocator(target).then(function (el) {
          sendKeys(el, value);
          return true;
        });
      }

    case 'selectWindow':
      {
        var p = target && target.toUpperCase() === 'TAB=CLOSEALLOTHER' ? csIpc.ask('CS_CLOSE_OTHER_TABS', {}) : csIpc.ask('CS_SELECT_WINDOW', { target: target, value: value });

        // Note: let `selectWindow` pass through cs and back to background,
        // to keep the flow more consistent with the other commands
        return p.then(function () {
          return true;
        });
      }

    case 'sourceSearch':
    case 'sourceExtract':
      {
        if (!target) {
          throw new Error('Must provide text / regular expression to search for');
        }

        if (!value) {
          throw new Error('Must specify a variable to save the result');
        }

        var getMatchAndCaptureIndex = function getMatchAndCaptureIndex(str) {
          var nonZeroIndex = function nonZeroIndex(n) {
            var offset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;

            if (n === undefined) return 0;
            return Math.max(0, parseInt(n, 10) + offset);
          };
          var m = /@\s*(\d+)(?:\s*,\s*(\d+))?\s*$/.exec(str);

          if (!m) {
            return {
              rest: str,
              matchIndex: 0,
              captureIndex: 0
            };
          }

          return {
            rest: str.substring(0, m.index),
            matchIndex: nonZeroIndex(m[1], -1),
            captureIndex: nonZeroIndex(m[2])
          };
        };

        // Note: get matchIndex captureIndex first, no matter it's for regexp or simple text

        var _getMatchAndCaptureIn = getMatchAndCaptureIndex(target),
            rest = _getMatchAndCaptureIn.rest,
            matchIndex = _getMatchAndCaptureIn.matchIndex,
            captureIndex = _getMatchAndCaptureIn.captureIndex;

        if (cmd === 'sourceSearch' && rest !== target) {
          throw new Error('The @ parameter is only supported in sourceExtract');
        }

        var regexp = function () {
          if (!/^regex(=|:)/i.test(rest)) return null;

          var raw = rest.replace(/^regex(=|:)/i, '');
          var regexpText = raw.replace(/^\/|\/g?$/g, '');

          return Object(utils["toRegExp"])(regexpText, { needEncode: false, flag: 'g' });
        }();
        var regexpForText = function () {
          if (regexp) return null;
          var raw = rest.replace(/^text(=|:)/i, '');

          if (cmd === 'sourceExtract' && !/\*/.test(raw)) {
            throw new Error('Missing * or REGEX in sourceExtract. Extracting a plain text doesn\'t make much sense');
          }

          return kd_glob_to_regexp_default()(raw, { capture: true, flags: 'g' });
        }();
        var matches = function () {
          var html = document.documentElement.outerHTML;
          var reg = regexp || regexpForText;
          var result = [];
          var m = void 0;

          // eslint-disable-next-line no-cond-assign
          while (m = reg.exec(html)) {
            result.push(m);

            // Note: save some energy, if it's already enough to get what users want
            if (cmd === 'sourceExtract' && result.length >= matchIndex + 1) {
              break;
            }
          }

          return result;
        }();

        Object(log["a" /* default */])('matches', matches, regexp, regexpForText);

        if (cmd === 'sourceSearch') {
          return {
            vars: _defineProperty({}, value, matches.length)
          };
        }

        if (cmd === 'sourceExtract') {
          var guard = function guard(str) {
            return str !== undefined ? str : '#nomatchfound';
          };

          return {
            vars: _defineProperty({}, value, guard((matches[matchIndex] || [])[captureIndex]))
          };
        }

        throw new Error('Impossible to reach here');
      }

    case 'visionLimitSearchArea':
    case 'storeImage':
      {
        var _run = function _run(locator, fileName) {
          return __getElementByLocator(locator).then(function (el) {
            if (!fileName || !fileName.length) {
              throw new Error('storeImage: \'value\' is required as image name');
            }

            var clientRect = el.getBoundingClientRect();
            var pSourceOffset = function () {
              if (window.top === window) {
                return Promise.resolve({ x: 0, y: 0 });
              }

              // Note: it's too complicated to take screenshot of element deep in iframe stack
              // if you have to scroll each level of iframe to get the full image of it.
              el.scrollIntoView();

              return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
                action: 'SOURCE_PAGE_OFFSET',
                data: {}
              });
            }();

            return pSourceOffset.then(function (sourceOffset) {
              var rect = {
                x: sourceOffset.x + clientRect.x + Object(dom_utils["g" /* scrollLeft */])(document),
                y: sourceOffset.y + clientRect.y + Object(dom_utils["h" /* scrollTop */])(document),
                width: clientRect.width,
                height: clientRect.height
              };

              return csIpc.ask('CS_STORE_SCREENSHOT_IN_SELECTION', {
                rect: rect,
                fileName: Object(utils["ensureExtName"])('.png', fileName),
                devicePixelRatio: window.devicePixelRatio
              }).then(function () {
                return {
                  vars: {
                    '!storedImageRect': rect
                  }
                };
              });
            });
          });
        };

        var _locator3 = void 0,
            fileName = void 0;

        if (cmd === 'storeImage') {
          _locator3 = target;
          fileName = value;
        } else if (cmd === 'visionLimitSearchArea') {
          _locator3 = target.trim().replace(/^element:/i, '').trim();
          fileName = constant["d" /* LAST_SCREENSHOT_FILE_NAME */];
        }

        return _run(_locator3, fileName);
      }

    case 'captureScreenshot':
      {
        if (!target || !target.length) {
          throw new Error('captureScreenshot: \'target\' is required as file name');
        }

        return csIpc.ask('CS_CAPTURE_SCREENSHOT', { fileName: Object(utils["ensureExtName"])('.png', target) }).then(function (_ref6) {
          var fileName = _ref6.fileName,
              url = _ref6.url;
          return {
            screenshot: {
              url: url,
              name: fileName
            }
          };
        });
      }

    case 'captureEntirePageScreenshot':
      {
        if (!target || !target.length) {
          throw new Error('captureEntirePageScreenshot: \'target\' is required as file name');
        }

        return csIpc.ask('CS_CAPTURE_FULL_SCREENSHOT', { fileName: Object(utils["ensureExtName"])('.png', target) }).then(function (_ref7) {
          var fileName = _ref7.fileName,
              url = _ref7.url;
          return {
            screenshot: {
              url: url,
              name: fileName
            }
          };
        });
      }

    case 'onDownload':
      {
        return csIpc.ask('CS_ON_DOWNLOAD', {
          fileName: target,
          wait: (value || '').trim() === 'true',
          timeout: extra.timeoutDownload * 1000,
          timeoutForStart: Math.max(10, extra.timeoutElement) * 1000
        });
      }

    case 'deleteAllCookies':
      {
        return csIpc.ask('CS_DELETE_ALL_COOKIES', {
          url: window.location.origin
        }).then(function () {
          return true;
        });
      }

    case 'if':
    case 'while':
    case 'gotoIf':
      {
        try {
          return {
            // eslint-disable-next-line no-eval
            condition: window.eval(target)
          };
        } catch (e) {
          throw new Error('Error in runEval condition of ' + cmd + ': ' + e.message);
        }
      }

    default:
      throw new Error('Command ' + cmd + ' not supported yet');
  }
};

/***/ }),

/***/ 664:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(665);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(93)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ }),

/***/ 665:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(92)(undefined);
// imports


// module
exports.push([module.i, ".header{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;overflow:hidden;padding:0 20px;width:100%;height:44px;border-bottom:2px solid #ccc;background-color:#f9f9f9}.header .status{float:right;line-height:42px;font-size:14px}.header .status h1{margin:0;font-size:20px;line-height:44px}.header .select-case{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-align:center;-ms-flex-align:center;align-items:center;line-height:44px;font-size:13px}.header .select-case .test-case-name{margin-right:15px;line-height:35px;max-width:120px;overflow:hidden;display:inline-block;white-space:nowrap;text-overflow:ellipsis}.header .select-case .test-case-name.unsaved{color:orange}.header .select-case .test-case-name.unsaved:after{content:\"*\";margin-left:3px}.header .actions{margin-top:6px}.header .actions .ant-btn-group>.ant-btn-group{float:none}.header .actions .play-actions{margin:0 10px}.ant-dropdown-menu{max-height:300px;overflow-y:auto}.ant-dropdown-menu .editing{color:blue!important}.settings-modal .ant-checkbox-wrapper+.ant-checkbox-wrapper{margin-left:0}.settings-modal .tip{margin-left:15px;color:#aaa}.settings-modal .backup-pane{padding:0 20px}.settings-modal .backup-pane h4{font-size:16px;margin-bottom:10px}.settings-modal .backup-pane .row{margin-bottom:10px}.settings-modal .backup-pane p,.settings-modal .backup-pane ul li{margin-bottom:5px}.settings-modal .security-pane{padding:0 20px 20px}.settings-modal .security-pane h4{font-size:16px;margin-bottom:10px}.settings-modal .security-pane p{margin-bottom:10px}.settings-modal .security-pane label{margin-right:10px}.settings-modal .security-pane .ant-radio-wrapper{display:block;height:30px;line-height:30px}.settings-modal .xmodules-pane{padding:0 0 20px}.settings-modal .xmodules-pane .xmodule-item{margin-bottom:25px;padding:15px;border:2px solid #333;font-size:14px;-webkit-box-shadow:rgba(0,0,0,.5) 0 2px 5px 0;box-shadow:0 2px 5px 0 rgba(0,0,0,.5)}.settings-modal .xmodules-pane .xmodule-item label{margin-right:15px;width:100px;font-size:14px}.settings-modal .xmodules-pane .xmodule-item .xmodule-title{margin-bottom:10px;font-size:14px}.settings-modal .xmodules-pane .xmodule-item .xmodule-title>*{margin-right:20px}.settings-modal .xmodules-pane .xmodule-item .xmodule-title>:last-child{margin-right:0}.settings-modal .xmodules-pane .xmodule-item .xmodule-status{display:-webkit-box;display:-ms-flexbox;display:flex;margin-bottom:20px}.settings-modal .xmodules-pane .xmodule-item .xmodule-status .status-box>*{margin-right:15px}.settings-modal .xmodules-pane .xmodule-item .xmodule-status .status-box>:last-child{margin-right:0}.settings-modal .xmodules-pane .xmodule-item .xmodule-settings h3{margin-bottom:10px;font-size:14px;font-weight:700}.settings-modal .xmodules-pane .xmodule-item .xmodule-settings .xmodule-settings-item .settings-detail{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;margin-bottom:10px}.settings-modal .xmodules-pane .xmodule-item .xmodule-settings .xmodule-settings-item .settings-detail .settings-detail-content{-webkit-box-flex:1;-ms-flex:1;flex:1}.settings-modal .xmodules-pane .xmodule-item .xmodule-settings .check-result{margin-top:5px;color:red;font-size:13px}", ""]);

// exports


/***/ }),

/***/ 667:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodTypeFriendlyNames = [
    "GetVersion",
    "SendMouseEvent",
    "SendText",
    "GetActiveBrowserOuterRect",
    "FindRectangle",
    "GetScreenBackingScaleFactor"
];
exports.MethodTypeInvocationNames = [
    "get_version",
    "send_mouse_event",
    "send_text",
    "get_active_browser_outer_rect",
    "find_rectangle",
    "get_screen_backing_scale_factor"
];


/***/ }),

/***/ 668:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const native_host_1 = __webpack_require__(144);
class KantuXYHost extends native_host_1.NativeMessagingHost {
    constructor() {
        super(KantuXYHost.HOST_NAME);
    }
}
KantuXYHost.HOST_NAME = "com.a9t9.kantu.xy";
exports.KantuXYHost = KantuXYHost;


/***/ }),

/***/ 669:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(670);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(93)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ }),

/***/ 670:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(92)(undefined);
// imports


// module
exports.push([module.i, ".sidebar{position:relative;-webkit-box-flex:1;-ms-flex:1;flex:1;min-width:260px;height:100%;border-right:2px solid #ccc}.sidebar .sidebar-inner{position:absolute;top:0;bottom:80px;right:0;left:0;overflow-y:auto}.sidebar .no-data{margin-top:20px;text-align:center;font-size:14px;color:#aaa}.sidebar .sidebar-test-cases{font-size:14px;line-height:18px}.sidebar .sidebar-test-cases li{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-sizing:border-box;box-sizing:border-box;padding:5px 10px;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.sidebar .sidebar-test-cases li.success{background:#cfefdf}.sidebar .sidebar-test-cases li.error{background:#fcdbd9}.sidebar .sidebar-test-cases li.selected{background:#fdffd1}.sidebar .sidebar-test-cases li.selected.error,.sidebar .sidebar-test-cases li.selected.success{padding:1px 10px 1px 6px}.sidebar .sidebar-test-cases li.selected.error{border:4px solid #fcdbd9}.sidebar .sidebar-test-cases li.selected.success{border:4px solid #cfefdf}.sidebar .sidebar-test-cases li.disabled{-webkit-filter:grayscale(60%);filter:grayscale(60%);cursor:not-allowed}.sidebar .sidebar-test-cases li .test-case-name{-webkit-box-flex:1;-ms-flex:1;flex:1}.sidebar .sidebar-test-cases li .more-button{display:none}.sidebar .sidebar-test-cases li:hover .more-button{display:block}.sidebar .test-case-actions,.sidebar .test-suite-actions{padding:0 10px 10px}.sidebar .test-case-actions button,.sidebar .test-suite-actions button{margin-right:10px}.sidebar .test-case-actions{display:-webkit-box;display:-ms-flexbox;display:flex}.sidebar .sidebar-test-suites .test-suite-item{padding:0 0 10px;margin-bottom:5px}.sidebar .sidebar-test-suites .test-suite-item.playing{background:#fdffd1}.sidebar .sidebar-test-suites .test-suite-item.fold{margin-bottom:0;padding-bottom:0}.sidebar .sidebar-test-suites .test-suite-item.fold .test-suite-cases,.sidebar .sidebar-test-suites .test-suite-item.fold .test-suite-more-actions{display:none}.sidebar .sidebar-test-suites .test-suite-item .test-suite-row{padding:5px 10px;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;cursor:pointer}.sidebar .sidebar-test-suites .test-suite-item .test-suite-row .test-suite-title{-webkit-box-flex:1;-ms-flex:1;flex:1;margin-left:10px}.sidebar .sidebar-test-suites .test-suite-item .test-suite-row .more-button{display:none}.sidebar .sidebar-test-suites .test-suite-item .test-suite-row:hover .more-button{display:block}.sidebar .sidebar-test-suites .test-suite-item .test-suite-cases{padding:3px 5px}.sidebar .sidebar-test-suites .test-suite-item .test-suite-cases li{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:3px 5px 3px 20px;margin-bottom:5px}.sidebar .sidebar-test-suites .test-suite-item .test-suite-cases li.done-tc{background:#cfefdf}.sidebar .sidebar-test-suites .test-suite-item .test-suite-cases li.error-tc{background:#fcdbd9}.sidebar .sidebar-test-suites .test-suite-item .test-suite-cases li.current-tc{background:#d5d6f9}.sidebar .sidebar-test-suites .test-suite-item .test-suite-more-actions{padding-left:27px}.sidebar .sidebar-storage-mode{position:absolute;bottom:0;left:0;right:0;height:80px;padding:0 10px;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}.sidebar .sidebar-storage-mode .storage-mode-header{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;margin-bottom:5px;font-size:12px}.sidebar .sidebar-storage-mode .storage-mode-header h3{font-size:14px}.sidebar .ant-tabs{min-height:100%}.sidebar .ant-tabs-bar{border-bottom:2px solid #ccc}.sidebar .ant-tabs-nav-container-scrolling{padding-left:0;padding-right:0}.sidebar .ant-tabs-tab-next.ant-tabs-tab-arrow-show,.sidebar .ant-tabs-tab-prev.ant-tabs-tab-arrow-show{display:none}.sidebar .ant-tabs-nav{height:44px}.sidebar .ant-tabs-nav .ant-tabs-tab{margin-right:0;line-height:27px}.sidebar .ant-tabs-nav-scroll{text-align:center}.sidebar .resize-handler{position:absolute;right:-2px;top:0;bottom:0;width:2px;background:#ccc;cursor:col-resize}.sidebar .resize-handler.focused,.sidebar .resize-handler:hover{right:-4px;width:6px;background:#aaa}.with-sidebar .sidebar{display:block}.context-menu{z-index:10}.context-menu .ant-menu{border:\"1px solid #ccc\";border-radius:4px;-webkit-box-shadow:0 1px 6px rgba(0,0,0,.2);box-shadow:0 1px 6px rgba(0,0,0,.2)}.context-menu .ant-menu .ant-menu-item{height:36px;line-height:36px}.context-menu .ant-menu .ant-menu-item:hover{background:#ecf6fd}.xfile-not-installed-modal.left-bottom{position:absolute;top:auto!important;bottom:100px;left:100px}.xfile-not-installed-modal p{margin-bottom:20px;font-size:16px;font-weight:700}", ""]);

// exports


/***/ }),

/***/ 672:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(673);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(93)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ }),

/***/ 673:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(92)(undefined);
// imports


// module
exports.push([module.i, ".dashboard{-webkit-box-orient:vertical;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:1;-ms-flex:1;flex:1;margin:15px 15px 0}.dashboard,.dashboard .flex-row{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-direction:normal}.dashboard .flex-row{-webkit-box-orient:horizontal;-ms-flex-direction:row;flex-direction:row}.dashboard .form-group{margin-bottom:15px}.dashboard .toolbox{display:-webkit-box;display:-ms-flexbox;display:flex}.dashboard .toolbox .record-ops{-webkit-box-flex:1;-ms-flex:1;flex:1;text-align:right}.dashboard .toolbox .play-ops{margin-left:15px}.dashboard .ant-table-pagination{display:none}.dashboard .ant-table-header{overflow:hidden!important;margin-bottom:0!important;padding-bottom:0!important}.dashboard .ant-table-header .ant-table-thead>tr>th{padding:13px 8px}.dashboard .ant-table-body .ant-table-thead>tr>th{padding:10px 8px}.dashboard .ant-table-tbody>tr>td{padding:8px}.dashboard tr.selected-command>td{background-color:#fdffd1!important}.dashboard tr.error-command>td{background-color:#f7c1c1!important}.dashboard tr.running-command>td{background-color:#d5d6f9!important}.dashboard tr.done-command>td{background-color:#d1ffd8!important}.dashboard .ant-btn-group>.ant-btn-group{float:none}.dashboard .ant-form-item{margin-bottom:15px}.dashboard .commands-view,.dashboard .editor-wrapper{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:2;-ms-flex:2;flex:2}.dashboard .commands-view .ant-tabs-bar{margin-bottom:0}.dashboard .commands-view .ant-tabs-content{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:1;-ms-flex:1;flex:1;padding:10px;border:1px solid #d9d9d9;border-width:0 1px 1px}.dashboard .commands-view .ant-tabs-content .ant-tabs-tabpane{-webkit-box-flex:1;-ms-flex:1;flex:1;-ms-flex-negative:unset!important;flex-shrink:unset!important;position:relative}.dashboard .commands-view .ant-tabs-content .table-wrapper{position:absolute;top:0;bottom:140px;left:0;right:0;overflow-y:auto}.dashboard .commands-view .ant-tabs-content .fields-wrapper{position:absolute;left:0;right:0;bottom:0;height:130px}.dashboard .commands-view .ant-tabs-content .react-codemirror2{position:relative}.dashboard .commands-view .ant-tabs-content .react-codemirror2.has-error{height:calc(100% - 70px)}.dashboard .commands-view .ant-tabs-content .react-codemirror2.no-error{height:calc(100% - 0px)}.dashboard .commands-view .ant-tabs-content .react-codemirror2 .CodeMirror{position:absolute;top:0;bottom:0;left:0;right:0;height:auto;font-size:13px}.dashboard .commands-view .ant-tabs-content .ant-spin-container,.dashboard .commands-view .ant-tabs-content .ant-spin-nested-loading,.dashboard .commands-view .ant-tabs-content .ant-table,.dashboard .commands-view .ant-tabs-content .ant-table-content,.dashboard .commands-view .ant-tabs-content .ant-table-scroll,.dashboard .commands-view .ant-tabs-content .ant-table-wrapper{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:1;-ms-flex:1;flex:1}.dashboard .commands-view .ant-tabs-content .ant-table-scroll{overflow-y:auto}.dashboard .commands-view .command-row{position:relative;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;padding-left:5px;border-bottom:1px solid #e9e9e9;line-height:45px;font-size:13px}.dashboard .commands-view .command-row:hover{background:#ecf6fd}.dashboard .commands-view .command-row.footer-row,.dashboard .commands-view .command-row.header-row{background-color:#f7f7f7;font-weight:700}.dashboard .commands-view .command-row.footer-row{display:block;text-align:center;cursor:pointer}.dashboard .commands-view .command-row.breakpoint-command:before{content:\"\";position:absolute;top:50%;left:0;-webkit-transform:translateY(-50%);transform:translateY(-50%);width:0;height:0;border:8px solid transparent;border-left-color:green}.dashboard .commands-view .command-row.selected-command{background-color:#fdffd1}.dashboard .commands-view .command-row.error-command{background-color:#f7c1c1}.dashboard .commands-view .command-row.running-command{background-color:#d5d6f9}.dashboard .commands-view .command-row.done-command{background-color:#d1ffd8}.dashboard .commands-view .command-row.comment-command{background-color:transparent;color:#ccc;font-style:italic}.dashboard .commands-view .command-row.comment-command.selected-command{background-color:#fdffd1}.dashboard .commands-view .command-row .row-col{padding:0 8px}.dashboard .commands-view .command-row .row-col.command-col{width:130px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dashboard .commands-view .command-row .row-col.target-col{width:30%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dashboard .commands-view .command-row .row-col.value-col{-webkit-box-flex:1;-ms-flex:1;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dashboard .commands-view .command-row .row-col.op-col{width:80px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dashboard .table-footer{position:absolute;left:0;right:0;top:0;bottom:0;line-height:32px;text-align:center;font-weight:700;background:#f7f7f7;cursor:pointer}.dashboard .table-footer:hover{background:#e0e0e0}.dashboard .logs-screenshots{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;position:relative;margin-top:15px}.dashboard .logs-screenshots .resize-handler{position:absolute;top:-10px;left:0;width:100%;height:6px;background:transparent;cursor:row-resize}.dashboard .logs-screenshots .resize-handler.focused,.dashboard .logs-screenshots .resize-handler:hover{height:6px;background:#ccc}.dashboard .logs-screenshots .ant-tabs.ant-tabs-card>.ant-tabs-bar .ant-tabs-tab{padding:5px 12px 4px}.dashboard .logs-screenshots .ant-tabs{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:1;-ms-flex:1;flex:1}.dashboard .logs-screenshots .ant-tabs-bar{margin-bottom:0}.dashboard .logs-screenshots .ant-tabs-content{-webkit-box-flex:1;-ms-flex:1;flex:1;overflow-y:auto;min-height:70px;border:1px solid #d9d9d9;border-width:0 1px 1px}.dashboard .logs-screenshots .ls-toolbox{position:absolute;right:0;top:0}.dashboard .logs-screenshots .log-content,.dashboard .logs-screenshots .screenshot-content{padding:10px 0}.dashboard .logs-screenshots .screenshot-content li{padding:0 20px 20px}.dashboard .logs-screenshots .screenshot-content li .timestamp{display:block;margin-bottom:10px;font-size:14px}.dashboard .logs-screenshots .screenshot-content li .filename{font-weight:700}.dashboard .logs-screenshots .screenshot-content li a{display:inline-block;margin-left:20px}.dashboard .logs-screenshots .screenshot-content li a img{max-width:250px;border:1px solid #ccc}.dashboard .logs-screenshots .log-content{list-style:none;margin:0;padding:0 10px;height:calc(100% - 38px);overflow-y:auto}.dashboard .logs-screenshots .log-content li{padding:5px 0;font-size:12px;border-bottom:1px solid #f3f3f3}.dashboard .logs-screenshots .log-content li:after{content:\"\";display:table;clear:both}.dashboard .logs-screenshots .log-content li.error{color:red;font-weight:700}.dashboard .logs-screenshots .log-content li.warning{color:orange}.dashboard .logs-screenshots .log-content li .log-type{float:left;margin-right:10px}.dashboard .logs-screenshots .log-content li .log-detail{white-space:pre-wrap}.dashboard .logs-screenshots .csv-content{padding:10px}.dashboard .logs-screenshots .csv-content button{margin-right:5px}.dashboard .logs-screenshots .variable-content{padding:10px}.dashboard .logs-screenshots .variable-content .variable-options{margin-bottom:10px}.dashboard .logs-screenshots .variable-content .ant-checkbox-wrapper{margin-left:0!important;margin-right:10px}.dashboard .logs-screenshots .variable-content .read-only{color:#ccc}.dashboard .logs-screenshots .vision-content{padding:10px}.dashboard .logs-screenshots .vision-content .vision-top-actions{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;margin-bottom:15px}.dashboard .logs-screenshots .vision-content .vision-top-actions .main-actions{display:-webkit-box;display:-ms-flexbox;display:flex}.dashboard .logs-screenshots .vision-content .vision-top-actions .main-actions>*{margin-right:15px}.dashboard .logs-screenshots .vision-content .vision-top-actions .main-actions>:last-child{margin-right:0}.dashboard .logs-screenshots .vision-content .vision-top-actions .main-actions .load-image-button{padding:0;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center}.dashboard .logs-screenshots .vision-content .vision-top-actions .main-actions .load-image-button label{padding:0 15px;cursor:pointer}.dashboard .logs-screenshots .vision-content .vision-top-actions .more-info{font-size:14px}.dashboard .logs-screenshots .vision-content .vision-image{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-ms-flex-line-pack:center;align-content:center;overflow:hidden;width:100px;height:100px;border:1px solid #ccc}.dashboard .logs-screenshots .vision-content .vision-image img{max-height:100px}.dashboard .logs-screenshots .vision-content .vision-name{font-size:14px;word-break:break-all}.dashboard .logs-screenshots .vision-content .vision-actions button{margin-right:5px}.dashboard .logs-screenshots .vision-content .vision-actions button:last-child{margin-right:0}.dashboard .online-help{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;margin-top:15px;padding:0 10px;height:25px;line-height:25px;font-size:14px;text-align:right}.dashboard #context_menu{z-index:10}.dashboard #context_menu .ant-menu{border:\"1px solid #ccc\";border-radius:4px;-webkit-box-shadow:0 1px 6px rgba(0,0,0,.2);box-shadow:0 1px 6px rgba(0,0,0,.2)}.dashboard #context_menu .ant-menu .ant-menu-item{height:36px;line-height:36px}.dashboard #context_menu .ant-menu .ant-menu-item:hover{background:#ecf6fd}.source-error{color:red;white-space:pre-wrap;font-size:12px}.ant-dropdown .ant-dropdown-menu{max-height:none}@media (max-width:768px){.duplicate-modal,.play-loop-modal,.rename-modal,.save-modal{width:400px!important;margin:0 auto}}", ""]);

// exports


/***/ }),

/***/ 697:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(698);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(93)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ }),

/***/ 698:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(92)(undefined);
// imports


// module
exports.push([module.i, "body{margin:0;padding:0;font-size:16px}*{-webkit-box-sizing:border-box;box-sizing:border-box}.app{position:absolute;top:0;bottom:0;left:0;right:0;-webkit-box-orient:vertical;-ms-flex-direction:column;flex-direction:column}.app,.app .app-inner{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-direction:normal}.app .app-inner{-webkit-box-flex:1;-ms-flex:1;flex:1;-webkit-box-orient:horizontal;-ms-flex-direction:row;flex-direction:row}.app.with-alert .backup-alert{display:block}.app .backup-alert{display:none;padding:5px 0;text-align:center;font-size:14px;background:#fdfdc2}.app .backup-alert .backup-actions{margin-left:20px}.app .backup-alert .backup-actions button{margin-right:10px}.app .content{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column;-webkit-box-flex:3;-ms-flex:3;flex:3;background:#fff;overflow-y:auto}", ""]);

// exports


/***/ }),

/***/ 713:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
var actions_namespaceObject = {};
__webpack_require__.r(actions_namespaceObject);
__webpack_require__.d(actions_namespaceObject, "setRoute", function() { return setRoute; });
__webpack_require__.d(actions_namespaceObject, "startRecording", function() { return startRecording; });
__webpack_require__.d(actions_namespaceObject, "stopRecording", function() { return stopRecording; });
__webpack_require__.d(actions_namespaceObject, "startInspecting", function() { return startInspecting; });
__webpack_require__.d(actions_namespaceObject, "stopInspecting", function() { return stopInspecting; });
__webpack_require__.d(actions_namespaceObject, "startPlaying", function() { return startPlaying; });
__webpack_require__.d(actions_namespaceObject, "stopPlaying", function() { return stopPlaying; });
__webpack_require__.d(actions_namespaceObject, "doneInspecting", function() { return doneInspecting; });
__webpack_require__.d(actions_namespaceObject, "appendCommand", function() { return appendCommand; });
__webpack_require__.d(actions_namespaceObject, "duplicateCommand", function() { return duplicateCommand; });
__webpack_require__.d(actions_namespaceObject, "insertCommand", function() { return insertCommand; });
__webpack_require__.d(actions_namespaceObject, "updateCommand", function() { return updateCommand; });
__webpack_require__.d(actions_namespaceObject, "removeCommand", function() { return removeCommand; });
__webpack_require__.d(actions_namespaceObject, "selectCommand", function() { return selectCommand; });
__webpack_require__.d(actions_namespaceObject, "cutCommand", function() { return cutCommand; });
__webpack_require__.d(actions_namespaceObject, "copyCommand", function() { return copyCommand; });
__webpack_require__.d(actions_namespaceObject, "pasteCommand", function() { return pasteCommand; });
__webpack_require__.d(actions_namespaceObject, "normalizeCommands", function() { return normalizeCommands; });
__webpack_require__.d(actions_namespaceObject, "updateSelectedCommand", function() { return updateSelectedCommand; });
__webpack_require__.d(actions_namespaceObject, "setSourceError", function() { return setSourceError; });
__webpack_require__.d(actions_namespaceObject, "setSourceCurrent", function() { return setSourceCurrent; });
__webpack_require__.d(actions_namespaceObject, "saveSourceCodeToEditing", function() { return saveSourceCodeToEditing; });
__webpack_require__.d(actions_namespaceObject, "saveEditingAsExisted", function() { return saveEditingAsExisted; });
__webpack_require__.d(actions_namespaceObject, "saveEditingAsNew", function() { return saveEditingAsNew; });
__webpack_require__.d(actions_namespaceObject, "setTestCases", function() { return setTestCases; });
__webpack_require__.d(actions_namespaceObject, "resetEditing", function() { return resetEditing; });
__webpack_require__.d(actions_namespaceObject, "setEditing", function() { return setEditing; });
__webpack_require__.d(actions_namespaceObject, "editTestCase", function() { return editTestCase; });
__webpack_require__.d(actions_namespaceObject, "editNewTestCase", function() { return editNewTestCase; });
__webpack_require__.d(actions_namespaceObject, "upsertTestCase", function() { return upsertTestCase; });
__webpack_require__.d(actions_namespaceObject, "addTestCases", function() { return addTestCases; });
__webpack_require__.d(actions_namespaceObject, "renameTestCase", function() { return renameTestCase; });
__webpack_require__.d(actions_namespaceObject, "removeTestCase", function() { return removeTestCase; });
__webpack_require__.d(actions_namespaceObject, "removeCurrentTestCase", function() { return removeCurrentTestCase; });
__webpack_require__.d(actions_namespaceObject, "duplicateTestCase", function() { return duplicateTestCase; });
__webpack_require__.d(actions_namespaceObject, "setPlayerState", function() { return setPlayerState; });
__webpack_require__.d(actions_namespaceObject, "setTimeoutStatus", function() { return setTimeoutStatus; });
__webpack_require__.d(actions_namespaceObject, "addPlayerErrorCommandIndex", function() { return addPlayerErrorCommandIndex; });
__webpack_require__.d(actions_namespaceObject, "addLog", function() { return addLog; });
__webpack_require__.d(actions_namespaceObject, "clearLogs", function() { return clearLogs; });
__webpack_require__.d(actions_namespaceObject, "addScreenshot", function() { return addScreenshot; });
__webpack_require__.d(actions_namespaceObject, "clearScreenshots", function() { return clearScreenshots; });
__webpack_require__.d(actions_namespaceObject, "addVision", function() { return addVision; });
__webpack_require__.d(actions_namespaceObject, "clearVisions", function() { return clearVisions; });
__webpack_require__.d(actions_namespaceObject, "updateConfig", function() { return updateConfig; });
__webpack_require__.d(actions_namespaceObject, "updateTestCasePlayStatus", function() { return updateTestCasePlayStatus; });
__webpack_require__.d(actions_namespaceObject, "playerPlay", function() { return playerPlay; });
__webpack_require__.d(actions_namespaceObject, "listCSV", function() { return listCSV; });
__webpack_require__.d(actions_namespaceObject, "listScreenshots", function() { return listScreenshots; });
__webpack_require__.d(actions_namespaceObject, "listVisions", function() { return listVisions; });
__webpack_require__.d(actions_namespaceObject, "setTestSuites", function() { return setTestSuites; });
__webpack_require__.d(actions_namespaceObject, "addTestSuite", function() { return addTestSuite; });
__webpack_require__.d(actions_namespaceObject, "addTestSuites", function() { return addTestSuites; });
__webpack_require__.d(actions_namespaceObject, "updateTestSuite", function() { return updateTestSuite; });
__webpack_require__.d(actions_namespaceObject, "removeTestSuite", function() { return removeTestSuite; });
__webpack_require__.d(actions_namespaceObject, "setPlayerMode", function() { return setPlayerMode; });
__webpack_require__.d(actions_namespaceObject, "runBackup", function() { return runBackup; });
__webpack_require__.d(actions_namespaceObject, "setVariables", function() { return setVariables; });
__webpack_require__.d(actions_namespaceObject, "updateUI", function() { return updateUI; });
__webpack_require__.d(actions_namespaceObject, "addBreakpoint", function() { return addBreakpoint; });
__webpack_require__.d(actions_namespaceObject, "removeBreakpoint", function() { return removeBreakpoint; });
__webpack_require__.d(actions_namespaceObject, "setEditorActiveTab", function() { return setEditorActiveTab; });
__webpack_require__.d(actions_namespaceObject, "preinstall", function() { return preinstall; });

// EXTERNAL MODULE: ./node_modules/antd/lib/message/index.js
var message = __webpack_require__(10);
var message_default = /*#__PURE__*/__webpack_require__.n(message);

// EXTERNAL MODULE: ./node_modules/antd/lib/locale-provider/index.js
var locale_provider = __webpack_require__(428);
var locale_provider_default = /*#__PURE__*/__webpack_require__.n(locale_provider);

// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(0);
var react_default = /*#__PURE__*/__webpack_require__.n(react);

// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(18);
var react_dom_default = /*#__PURE__*/__webpack_require__.n(react_dom);

// EXTERNAL MODULE: ./node_modules/react-router-dom/es/index.js + 30 modules
var es = __webpack_require__(138);

// EXTERNAL MODULE: ./node_modules/antd/lib/locale-provider/en_US.js
var en_US = __webpack_require__(434);
var en_US_default = /*#__PURE__*/__webpack_require__.n(en_US);

// EXTERNAL MODULE: ./src/config/index.js
var src_config = __webpack_require__(73);

// EXTERNAL MODULE: ./src/common/lib/file_saver.js
var file_saver = __webpack_require__(46);
var file_saver_default = /*#__PURE__*/__webpack_require__.n(file_saver);

// EXTERNAL MODULE: ./node_modules/antd/lib/button/index.js
var lib_button = __webpack_require__(11);
var button_default = /*#__PURE__*/__webpack_require__.n(lib_button);

// EXTERNAL MODULE: ./node_modules/antd/lib/modal/index.js
var modal = __webpack_require__(33);
var modal_default = /*#__PURE__*/__webpack_require__.n(modal);

// EXTERNAL MODULE: ./node_modules/react-redux/es/index.js + 14 modules
var react_redux_es = __webpack_require__(47);

// EXTERNAL MODULE: ./node_modules/redux/es/index.js + 6 modules
var redux_es = __webpack_require__(43);

// CONCATENATED MODULE: ./src/actions/action_types.js
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

// Generate three action types, used in actions that return promises
var make3 = function make3(name) {
  return [name + '_REQUEST', name + '_SUCCESS', name + '_FAIL'];
};

var type3 = function type3(name) {
  return make3(name).map(function (key) {
    return types[key];
  });
};

var promiseTypes = ['START_RECORDING', 'STOP_RECORDING', 'START_INSPECTING', 'STOP_INSPECTING'].reduce(function (prev, cur) {
  make3(cur).forEach(function (key) {
    prev[key] = key;
  });

  return prev;
}, {});

var simpleTypes = ['SET_ROUTE', 'SET_EDITOR_ACTIVE_TAB', 'DONE_INSPECTING', 'UPDATE_BASE_URL', 'APPEND_COMMAND', 'DUPLICATE_COMMAND', 'INSERT_COMMAND', 'UPDATE_COMMAND', 'REMOVE_COMMAND', 'SELECT_COMMAND', 'CUT_COMMAND', 'COPY_COMMAND', 'PASTE_COMMAND', 'NORMALIZE_COMMANDS', 'UPDATE_SELECTED_COMMAND', 'SAVE_EDITING_AS_EXISTED', 'SAVE_EDITING_AS_NEW', 'SET_TEST_CASES', 'SET_EDITING', 'EDIT_TEST_CASE', 'EDIT_NEW_TEST_CASE', 'ADD_TEST_CASES', 'RENAME_TEST_CASE', 'REMOVE_TEST_CASE', 'UPDATE_TEST_CASE_STATUS', 'SET_PLAYER_STATE', 'SET_PLAYER_MODE', 'PLAYER_ADD_ERROR_COMMAND_INDEX', 'SET_TEST_SUITES', 'UPDATE_TEST_SUITE', 'ADD_BREAKPOINT', 'REMOVE_BREAKPOINT', 'ADD_LOGS', 'CLEAR_LOGS', 'ADD_SCREENSHOT', 'CLEAR_SCREENSHOTS', 'ADD_VISION', 'CLEAR_VISIONS', 'START_PLAYING', 'STOP_PLAYING', 'SET_CSV_LIST', 'SET_SCREENSHOT_LIST', 'SET_VISION_LIST', 'SET_VARIABLE_LIST', 'SET_SOURCE_ERROR', 'SET_SOURCE_CURRENT', 'UPDATE_CONFIG', 'UPDATE_UI'].reduce(function (prev, cur) {
  prev[cur] = cur;
  return prev;
}, {});

var types = _extends({}, simpleTypes, promiseTypes);
// EXTERNAL MODULE: ./src/common/utils.js
var utils = __webpack_require__(2);

// EXTERNAL MODULE: ./src/common/ipc/ipc_cs.js
var ipc_cs = __webpack_require__(17);

// EXTERNAL MODULE: ./src/common/storage/index.js + 1 modules
var storage = __webpack_require__(29);

// EXTERNAL MODULE: ./src/services/storage/index.ts
var services_storage = __webpack_require__(5);

// EXTERNAL MODULE: ./src/models/db.js
var db = __webpack_require__(68);

// CONCATENATED MODULE: ./src/models/test_case_model.js
var test_case_model_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };




var model = {
  table: db["default"].testCases,
  list: function list() {
    return db["default"].testCases.toArray();
  },
  insert: function insert(data) {
    if (!data.name) {
      throw new Error('Model TestCase - insert: missing name');
    }

    if (!data.data) {
      throw new Error('Model TestCase - insert: missing data');
    }

    data.updateTime = new Date() * 1;
    data.id = Object(utils["uid"])();
    return db["default"].testCases.add(test_case_model_normalizeTestCase(data));
  },
  bulkInsert: function bulkInsert(tcs) {
    var list = tcs.map(function (data) {
      if (!data.name) {
        throw new Error('Model TestCase - insert: missing name');
      }

      if (!data.data) {
        throw new Error('Model TestCase - insert: missing data');
      }

      data.updateTime = new Date() * 1;
      data.id = Object(utils["uid"])();

      return test_case_model_normalizeTestCase(data);
    });

    return db["default"].testCases.bulkAdd(list);
  },
  update: function update(id, data) {
    return db["default"].testCases.update(id, test_case_model_normalizeTestCase(data));
  },
  remove: function remove(id) {
    return db["default"].testCases.delete(id);
  }
};

/* harmony default export */ var test_case_model = (model);

var test_case_model_normalizeCommand = function normalizeCommand(command) {
  return Object(utils["pick"])(['cmd', 'target', 'value'], command);
};

var test_case_model_normalizeTestCase = function normalizeTestCase(testCase) {
  return Object(utils["compose"])(Object(utils["on"])('data'), Object(utils["on"])('commands'), utils["map"])(test_case_model_normalizeCommand)(testCase);
};

var commandWithoutBaseUrl = function commandWithoutBaseUrl(baseUrl) {
  return function (command) {
    if (command.cmd !== 'open') return command;

    return test_case_model_extends({}, command, {
      target: (baseUrl + '/' + command.target).replace(/\/+/g, '/')
    });
  };
};

var test_case_model_eliminateBaseUrl = function eliminateBaseUrl(testCase) {
  if (!testCase.baseUrl) return testCase;
  return Object(utils["compose"])(Object(utils["on"])('data'), Object(utils["on"])('commands'), utils["map"])(commandWithoutBaseUrl(testCase.baseUrl))(testCase);
};
// EXTERNAL MODULE: ./node_modules/event-emitter/index.js
var event_emitter = __webpack_require__(438);
var event_emitter_default = /*#__PURE__*/__webpack_require__.n(event_emitter);

// CONCATENATED MODULE: ./src/common/player.js
var player_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }




var MODE = {
  STRAIGHT: 'STRAIGHT',
  SINGLE: 'SINGLE',
  LOOP: 'LOOP'
};

var STATUS = {
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
};

var END_REASON = {
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  MANUAL: 'MANUAL'
};

var isEmpty = function isEmpty(x) {
  return x === undefined || x === null;
};

var initialState = {
  startUrl: null,

  startIndex: null,
  endIndex: null,
  nextIndex: null,
  errorIndex: null,
  doneIndices: [],

  mode: MODE.STRAIGHT,
  resources: [],

  // preDelay: 0,
  // postDelay: 0,

  status: STATUS.STOPPED

  // Note: A generic player for consuming some kind of resources
  // It supports 3 modes: single, straight, loop.
  // Also for straight and loop, it can start or end at any valid index you want
  //
  // The main API of a player is
  // 1. constructor({ run: Function,  prepare: Function })
  // 2. play(config)
  // 3. pause()
  // 4. resume()
  // 5. stop()
  //
  // Events it emits
  // 1. START
  // 2. TO_PLAY
  // 3. PLAYED_LIST
  // 4. PAUSED
  // 5. RESUMED
  // 6. END
  // 7. ERROR

};var player_Player = function () {
  function Player(opts, state) {
    _classCallCheck(this, Player);

    this.state = player_extends({}, initialState);

    if (!opts) {
      throw new Error('Player - constructor: must provide opts as 1st argument');
    }

    if (typeof opts.run !== 'function') {
      throw new Error('Player - constructor: must provide a run function');
    }

    if (typeof opts.prepare !== 'function') {
      throw new Error('Player - constructor: must provide a prepare function');
    }

    if (typeof opts.handleResult !== 'function') {
      throw new Error('Player - constructor: must provide a handleResult function');
    }

    this.__run = opts.run;
    this.__prepare = opts.prepare;
    this.__handle = opts.handleResult;

    this.__setState(state || {});
  }

  _createClass(Player, [{
    key: 'play',
    value: function play(config) {
      var _this = this;

      if (!config) {
        throw new Error('Player - play: config should not be empty');
      }

      if (!config.mode || Object.keys(MODE).indexOf(config.mode) === -1) {
        throw new Error('Player - play: must provide a valid mode, now it is ' + config.mode);
      }

      if (config.mode === MODE.LOOP && (!config.loopsStart || config.loopsStart < 0 || Math.floor(config.loopsStart) !== config.loopsStart || !config.loopsEnd || config.loopsEnd < config.loopsStart || Math.floor(config.loopsEnd) !== config.loopsEnd)) {
        throw new Error('Player - play: must provide a valid tuple of "loopsStart" and "loopsEnd" in loop mode, now it is ' + config.loopsStart + ', ' + config.loopsEnd);
      }

      if (!config.resources || !config.resources.length) {
        throw new Error('Player - play: resources should not be empty');
      }

      if (isEmpty(config.startIndex) || config.startIndex < 0 || config.startIndex >= config.resources.length) {
        throw new Error('Player - play: startIndex out of range, now it is ' + config.startIndex + ', len: ' + config.resources.length);
      }

      // Note: endIndex could be omitted
      if (!isEmpty(config.endIndex) && (config.endIndex < 0 || config.endIndex >= config.resources.length)) {
        throw new Error('Player - play: endIndex out of range, now it is ' + config.endIndex + ', len: ' + config.resources.length);
      }

      var startIndex = config.startIndex,
          startUrl = config.startUrl,
          resources = config.resources,
          title = config.title,
          extra = config.extra;

      var endIndex = config.endIndex || resources.length - 1;
      var basicState = {
        title: title,
        extra: extra,
        startUrl: startUrl,
        startIndex: startIndex,
        endIndex: endIndex,
        nextIndex: startIndex,
        errorIndex: null,
        doneIndices: [],
        mode: config.mode,
        loopsCursor: 1,
        loopsStart: 1,
        loopsEnd: 1,
        resources: config.resources,
        breakpoints: config.breakpoints || [],
        status: STATUS.PLAYING,
        public: config.public || {},
        callback: config.callback || function () {},
        lastPlayConfig: config
      };['preDelay', 'postDelay'].forEach(function (key) {
        if (isEmpty(config[key])) return;
        basicState[key] = config[key];
      });

      switch (config.mode) {
        case MODE.STRAIGHT:
          this.__setState(player_extends({}, basicState));
          break;

        case MODE.SINGLE:
          this.__setState(player_extends({}, basicState, {
            endIndex: startIndex
          }));
          break;

        case MODE.LOOP:
          this.__setState(player_extends({}, basicState, {
            loopsCursor: config.loopsStart,
            loopsStart: config.loopsStart,
            loopsEnd: config.loopsEnd
          }));
          break;

        default:
          break;
      }

      this.emit('START', {
        title: title,
        loopsCursor: this.state.loopsCursor,
        extra: this.state.extra
      });

      return Promise.resolve().then(function () {
        return _this.__prepare(_this.state);
      }).then(function () {
        return _this.__go(null, config.isStep);
      }, function (e) {
        return _this.__errLog(e, e.errorIndex);
      });
    }
  }, {
    key: 'pause',
    value: function pause() {
      this.__setState({
        status: STATUS.PAUSED
      });

      this.emit('PAUSED', { extra: this.state.extra });
    }
  }, {
    key: 'resume',
    value: function resume(isStep) {
      this.__setState({
        status: STATUS.PLAYING
      });

      this.emit('RESUMED', { extra: this.state.extra });
      this.__go(null, isStep);
    }
  }, {
    key: 'stop',
    value: function stop(opts) {
      this.__end(END_REASON.MANUAL, opts);
    }
  }, {
    key: 'stopWithError',
    value: function stopWithError(error) {
      this.__errLog(error);
    }
  }, {
    key: 'jumpTo',
    value: function jumpTo(nextIndex) {
      var resources = this.state.resources;

      // Note: validate nextIndex by resources.length instead of startIndex and endIndex,
      // to make it possible for 'run from here' to jump to commands ahead of the start point

      if (nextIndex < 0 || nextIndex >= resources.length) {
        throw new Error('jumpTo: nextIndex out of range');
      }

      this.__setState({
        nextIndex: nextIndex
      });
    }
  }, {
    key: 'setPostDelay',
    value: function setPostDelay(n) {
      this.__setState({
        postDelay: n
      });
    }
  }, {
    key: 'getStatus',
    value: function getStatus() {
      return this.state.status;
    }
  }, {
    key: 'getState',
    value: function getState() {
      return player_extends({}, this.state);
    }
  }, {
    key: 'replayLastConfig',
    value: function replayLastConfig() {
      var config = this.state.lastPlayConfig;
      if (!config) throw new Error('No last play config available');
      return this.play(config);
    }
  }, {
    key: '__go',
    value: function __go(token, isStep) {
      var _this2 = this;

      // Note: in case it is returned from previous call

      if (token === undefined || token === null) {
        this.token = token = Math.random();
      } else if (token !== this.token) {
        return;
      }

      var guardToken = function guardToken(fn) {
        return function () {
          if (token !== _this2.token) throw new Error('token expired');
          return fn.apply(undefined, arguments);
        };
      };

      var _state = this.state,
          resources = _state.resources,
          nextIndex = _state.nextIndex,
          preDelay = _state.preDelay;

      var pre = preDelay > 0 ? this.__delay(function () {
        return undefined;
      }, preDelay) : Promise.resolve();

      // Note: the flow of this process:
      // 1. delay if `preDelay` set
      // 2. check `__shouldContinue`
      // 3. stop if the player is stopped or paused
      // 4. otherwise call `__run` to actually consume the current resource
      // 5. set the state to next by calling `__setNext`
      // 6. delay if `postDelay` set
      return pre.then(function () {
        return _this2.__shouldContinue();
      }).then(function (_ref) {
        var paused = _ref.paused,
            stopped = _ref.stopped;

        if (stopped) return _this2.__end(END_REASON.COMPLETE);else if (paused) return;

        var _state2 = _this2.state,
            resources = _state2.resources,
            nextIndex = _state2.nextIndex,
            startIndex = _state2.startIndex,
            loopsCursor = _state2.loopsCursor,
            loopsStart = _state2.loopsStart,
            loopsEnd = _state2.loopsEnd;

        // Note: when we're running loops

        if (nextIndex === startIndex) {
          var obj = {
            loopsCursor: loopsCursor,
            index: nextIndex,
            currentLoop: loopsCursor - loopsStart + 1,
            loops: loopsEnd - loopsStart + 1,
            resource: resources[nextIndex],
            extra: _this2.state.extra
          };

          _this2.emit('LOOP_START', obj);

          if (loopsCursor !== loopsStart) {
            _this2.emit('LOOP_RESTART', obj);
          }
        }

        _this2.emit('TO_PLAY', {
          index: nextIndex,
          currentLoop: loopsCursor - loopsStart + 1,
          loops: loopsEnd - loopsStart + 1,
          resource: resources[nextIndex],
          extra: _this2.state.extra
        });

        // Note: there will never be two breakpoints in straight. Use `lastBreakpoint` to tell whether we just hit a breakpoint
        // Also note that, 'TO_PLAY' events need to be fired before we pause.
        if (_this2.state.lastBreakpoint === undefined && _this2.state.breakpoints.indexOf(nextIndex) !== -1) {
          _this2.__setState({ lastBreakpoint: nextIndex });
          _this2.emit('BREAKPOINT', {
            index: nextIndex,
            currentLoop: loopsCursor - loopsStart + 1,
            loops: loopsEnd - loopsStart + 1,
            resource: resources[nextIndex],
            extra: _this2.state.extra
          });
          return _this2.pause();
        } else {
          _this2.__setState({ lastBreakpoint: undefined });
        }

        // Note: Check whether token expired or not after each async operations
        // Also also in the final catch to prevent unnecessary invoke of __errLog
        return _this2.__run(resources[nextIndex], _this2.state).then(guardToken(function (res) {
          // Note: allow users to handle the result
          return _this2.__handle(res, resources[nextIndex], _this2.state).then(guardToken(function (nextIndex) {
            // Note: __handle has the chance to return a `nextIndex`, mostly when it's
            // from a flow logic. But still, it could be undefined for normal commands
            var oldLoopsCursor = _this2.state.loopsCursor;

            _this2.__setNext(nextIndex);
            _this2.emit('PLAYED_LIST', {
              indices: _this2.state.doneIndices,
              extra: _this2.state.extra
            });

            return oldLoopsCursor !== _this2.state.loopsCursor;
          })).then(function (isLoopsCursorChanged) {
            // __handle may change postDelay
            var postDelay = _this2.state.postDelay;

            var delay = Math.max(postDelay, isLoopsCursorChanged ? 10 : 0);
            return delay > 0 ? _this2.__delay(function () {
              return undefined;
            }, delay) : Promise.resolve();
          }).then(function () {
            if (isStep) return _this2.pause();
            return _this2.__go(token);
          });
        })).catch(guardToken(function (err) {
          return _this2.__errLog(err);
        }));
      });
    }
  }, {
    key: '__shouldContinue',
    value: function __shouldContinue() {
      var _state3 = this.state,
          status = _state3.status,
          mode = _state3.mode,
          nextIndex = _state3.nextIndex,
          startIndex = _state3.startIndex,
          endIndex = _state3.endIndex;

      var ret = void 0;

      if (status === STATUS.PLAYING && nextIndex >= startIndex && nextIndex <= endIndex) {
        ret = { paused: false, stopped: false };
      } else if (status === STATUS.PAUSED) {
        ret = { paused: true };
      } else {
        ret = { stopped: true };
      }

      // Note: make this function return promise, just in case
      // an async check is needed in future
      return Promise.resolve(ret);
    }
  }, {
    key: '__end',
    value: function __end(reason, opts) {
      // Note: CANNOT end the player twice
      if (this.state.status === STATUS.STOPPED) return;

      if (Object.keys(END_REASON).indexOf(reason) === -1) {
        throw new Error('Player - __end: invalid reason, ' + reason);
      }

      if (!opts || !opts.silent) {
        this.emit('END', { opts: opts, reason: reason, extra: this.state.extra });

        if (reason !== END_REASON.ERROR) {
          this.state.callback(null, reason);
        }
      }

      this.__setState(initialState);
    }
  }, {
    key: '__errLog',
    value: function __errLog(err, errorIndex) {
      // Note: CANNOT log error if player is already stopped
      if (this.state.status === STATUS.STOPPED) return;

      this.emit('ERROR', {
        errorIndex: errorIndex !== undefined ? errorIndex : this.state.nextIndex,
        msg: err && err.message,
        extra: this.state.extra,
        restart: !!err.restart
      });
      this.state.callback(err, null);
      this.__end(END_REASON.ERROR);
    }
  }, {
    key: '__setNext',
    value: function __setNext(nextIndexPassed) {
      if (nextIndexPassed !== undefined && (nextIndexPassed < 0 || nextIndexPassed > this.state.resources.length)) {
        // Note: nextIndexPassed is allowed to be equal to resources.length
        // That means we run out of commands
        throw new Error('invalid nextIndexPassed ' + nextIndexPassed);
      }

      var _state4 = this.state,
          mode = _state4.mode,
          doneIndices = _state4.doneIndices,
          nextIndex = _state4.nextIndex,
          endIndex = _state4.endIndex,
          startIndex = _state4.startIndex,
          loopsCursor = _state4.loopsCursor,
          loopsEnd = _state4.loopsEnd;


      var nextIndexToSet = nextIndexPassed !== undefined ? nextIndexPassed : nextIndex + 1;

      var done = doneIndices.indexOf(nextIndex) === -1 ? [].concat(_toConsumableArray(doneIndices), [nextIndex]) : doneIndices;
      var lcur = loopsCursor;
      var next = null;

      if (mode === MODE.LOOP) {
        if (nextIndexToSet <= endIndex) {
          next = nextIndexToSet;
        } else if (loopsCursor >= loopsEnd) {
          next = nextIndexToSet;
        } else {
          lcur += 1;
          next = startIndex;
          done = [];
        }
      } else {
        next = nextIndexToSet;
      }

      this.__setState({
        loopsCursor: lcur,
        nextIndex: next,
        doneIndices: done
      });
    }
  }, {
    key: '__setState',
    value: function __setState(obj) {
      this.state = player_extends({}, this.state, obj);
    }
  }, {
    key: '__delay',
    value: function __delay(fn, timeout) {
      var _this3 = this;

      var past = 0;
      var timer = setInterval(function () {
        past += 1000;
        _this3.emit('DELAY', {
          extra: _this3.state.extra,
          total: timeout,
          past: past
        });
      }, 1000);

      return Object(utils["delay"])(fn, timeout).then(function (res) {
        if (timer) clearInterval(timer);
        return res;
      });
    }
  }]);

  return Player;
}();

event_emitter_default()(player_Player.prototype);

player_Player.C = player_Player.prototype.C = {
  MODE: MODE,
  STATUS: STATUS,
  END_REASON: END_REASON
};

var playerPool = {};

// factory function to return a player singleton
var getPlayer = function getPlayer() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  var state = arguments[1];

  var name = opts.name || 'testCase';
  delete opts.name;

  if (Object.keys(opts).length > 0) {
    playerPool[name] = new player_Player(opts, state);
  }

  if (!playerPool[name]) {
    throw new Error('player not initialized');
  }

  return playerPool[name];
};
// EXTERNAL MODULE: ./node_modules/jszip/lib/index.js
var lib = __webpack_require__(81);
var lib_default = /*#__PURE__*/__webpack_require__.n(lib);

// EXTERNAL MODULE: ./src/common/convert_utils.js
var convert_utils = __webpack_require__(40);

// EXTERNAL MODULE: ./src/common/convert_suite_utils.js
var convert_suite_utils = __webpack_require__(49);

// CONCATENATED MODULE: ./src/common/backup.js







function backup_backup(_ref) {
  var backup = _ref.backup,
      testCases = _ref.testCases,
      testSuites = _ref.testSuites,
      screenshots = _ref.screenshots,
      csvs = _ref.csvs,
      visions = _ref.visions;

  var zip = new lib_default.a();
  var ps = [];

  if (backup.testCase && testCases && testCases.length) {
    var folder = zip.folder('macros');

    testCases.forEach(function (tc) {
      folder.file(tc.name + '.json', Object(convert_utils["toJSONString"])({
        name: tc.name,
        commands: tc.data.commands
      }));
    });
  }

  if (backup.testSuite && testCases && testSuites && testSuites.length) {
    var _folder = zip.folder('testsuites');
    var genName = Object(utils["nameFactory"])();

    testSuites.forEach(function (ts) {
      var name = genName(ts.name);
      _folder.file(name + '.json', Object(convert_suite_utils["stringifyTestSuite"])(ts, testCases));
    });
  }

  if (backup.screenshot && screenshots && screenshots.length) {
    var _folder2 = zip.folder('screenshots');
    var ssStorage = Object(services_storage["getStorageManager"])().getScreenshotStorage();

    screenshots.forEach(function (ss) {
      ps.push(ssStorage.read(ss.fileName, 'ArrayBuffer').then(function (buffer) {
        _folder2.file(ss.fileName, buffer, { binary: true });
      }));
    });
  }

  if (backup.vision && visions && visions.length) {
    var _folder3 = zip.folder('images');
    var visionStorage = Object(services_storage["getStorageManager"])().getVisionStorage();

    visions.forEach(function (vision) {
      ps.push(visionStorage.read(vision.fileName, 'ArrayBuffer').then(function (buffer) {
        _folder3.file(vision.fileName, buffer, { binary: true });
      }));
    });
  }

  if (backup.csv && csvs && csvs.length) {
    var _folder4 = zip.folder('datasources');
    var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();

    csvs.forEach(function (csv) {
      ps.push(csvStorage.read(csv.fileName, 'Text').then(function (text) {
        return _folder4.file(csv.fileName, text);
      }));
    });
  }

  return Promise.all(ps).then(function () {
    zip.generateAsync({ type: 'blob' }).then(function (blob) {
      file_saver_default.a.saveAs(blob, 'kantu_backup.zip');
    });
  });
}
// EXTERNAL MODULE: ./src/common/log.js
var common_log = __webpack_require__(4);

// CONCATENATED MODULE: ./src/config/preinstall_macros.js
/* harmony default export */ var preinstall_macros = ({
  DemoAutofill: {
    "CreationDate": "2018-02-18",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "store",
      "Target": "15",
      "Value": "!TIMEOUT_WAIT"
    }, {
      "Command": "store",
      "Target": "60",
      "Value": "!TIMEOUT_PAGELOAD"
    }, {
      "Command": "open",
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScPXRMtYI_KYL8J6fivHUV0hQKB7j1RtqTrBBUtEr8VMmyCqw/viewform",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=span.docssharedWizToggleLabeledLabelText.exportLabel.freebirdFormviewerViewItemsRadioLabel",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePaperradioEl.docssharedWizToggleLabeledControl.freebirdThemedRadio.freebirdThemedRadioDarkerDisabled.freebirdFormviewerViewItemsRadioControl",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePapercheckboxInnerBox.exportInnerBox",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[2]/div/label/div/div[1]/div[2]",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[3]/div/label/div/div[1]/div[2]",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=content.quantumWizMenuPaperselectContent.exportContent",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[3]/div[2]/div[2]/div[4]/content",
      "Value": ""
    }, {
      "Command": "captureScreenshot",
      "Target": "AutoFill1stPage${!LOOP}",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "css=span.quantumWizButtonPaperbuttonLabel.exportLabel",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=entry.1572386418",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=entry.1572386418",
      "Value": "This is a single line test..."
    }, {
      "Command": "click",
      "Target": "name=entry.1569542411",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=entry.1569542411",
      "Value": "...and this a multiline test:\nLine2\nLine3"
    }, {
      "Command": "captureScreenshot",
      "Target": "AutoFill2ndPage${!LOOP}",
      "Value": ""
    }, {
      "Command": "pause",
      "Target": "1000",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div[1]/div[2]/div[2]",
      "Value": ""
    }, {
      "Command": "captureScreenshot",
      "Target": "AutoFill3rdPage${!LOOP}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "DemoAutofill macro completed (shown as notifcation because of #shownotification in the 3rd column)",
      "Value": "#shownotification"
    }]
  },
  DemoCanvas: {
    "CreationDate": "2018-6-26",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=LiterallyCanvas",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "First a simple clickAt demo (3 dots)",
      "Value": ""
    }, {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "28,28"
    }, {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "58,28"
    }, {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "88,28"
    }, {
      "Command": "comment",
      "Target": "Just image search the canvas!",
      "Value": "88,28"
    }, {
      "Command": "visionLimitSearchArea",
      "Target": "element://*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "canvas_3dots_verify_dpi_96.png",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=Mapbox",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Test: Embedded map (Mapbox)",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "id=demo",
      "Value": ""
    }, {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "canvas_wyoming_dpi_96.png@0.60",
      "Value": ""
    }, {
      "Command": "clickAt",
      "Target": "#efp",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Now verify that the click (= the map) works as expected",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "canvas_wyoming_verify_dpi_96.png@0.5",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Test Google Maps: Find & click Hyde park, and check that its info bubble shows.",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas#maps",
      "Value": ""
    }, {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "canvas_hydepark_dpi_96.png@0.70",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    }, {
      "Command": "clickAt",
      "Target": "#efp",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Now verify that the click (= the map) works as expected",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "canvas_hydepark_verify_dpi_96.png@0.70",
      "Value": ""
    }]
  },
  DemoComputerVision: {
    "CreationDate": "2018-5-31",
    "Commands": [{
      "Command": "open",
      "Target": "https://ocr.space/",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "OCR.space is our own OCR API service, this demo is a test that our QA uses internally, too :-)",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Verify the 3rd party \"Share\" banner shows",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "true",
      "Value": "!errorignore"
    }, {
      "Command": "visualSearch",
      "Target": "democv_share.png@0.50",
      "Value": "matches"
    }, {
      "Command": "if",
      "Target": "${matches} == 0",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Browser width too small for \"share\" banner to show",
      "Value": "blue"
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "false",
      "Value": "!errorignore"
    }, {
      "Command": "type",
      "Target": "id=imageUrl",
      "Value": "https://a9t9.com/Content/Images/kantu-chrome-loop.png"
    }, {
      "Command": "select",
      "Target": "id=ocrLanguage",
      "Value": "label=English"
    }, {
      "Command": "comment",
      "Target": "viewport is default, but we add it here for test. Try \"full\" to see the differenc",
      "Value": "label=English"
    }, {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "we could use \"click link=Start OCR!\" but we use the image of the button instead",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "democv_startocr.png@0.60",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "#efp is short for \"#ElementFromPoint (${imageX},(${imageY})",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "#efp",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Wait for OCR to be completed",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "30",
      "Value": "!timeout_wait"
    }, {
      "Command": "visualAssert",
      "Target": "democv_ocrdone.png",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    }, {
      "Command": "click",
      "Target": "link=Show Overlay",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Visually verify that the overlay is correct",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "democv_checkoverlay.png@0.60",
      "Value": ""
    }]
  },
  DemoDialogboxes: {
    "CreationDate": "2018-02-15",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "Start..."
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[1]",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Kantu IDE closes dialog boxes automatially. You need assertAlert (etc) only to verify expected texts.",
      "Value": ""
    }, {
      "Command": "assertAlert",
      "Target": "Hello\\nHow are you?",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[2]",
      "Value": ""
    }, {
      "Command": "assertConfirmation",
      "Target": "Press a button!",
      "Value": ""
    }, {
      "Command": "answerOnNextPrompt",
      "Target": "I am Kantu for Chrome...",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[3]",
      "Value": ""
    }, {
      "Command": "assertPrompt",
      "Target": "Please enter your name",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "Done!"
    }]
  },
  DemoDragDrop: {
    "CreationDate": "2017-10-18",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/demo/webtest/dragdrop/",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Reduce replay speed so we can better see what is going on...",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "medium",
      "Value": "!replayspeed"
    }, {
      "Command": "dragAndDropToObject",
      "Target": "id=one",
      "Value": "id=bin"
    }, {
      "Command": "dragAndDropToObject",
      "Target": "id=two",
      "Value": "id=bin"
    }, {
      "Command": "dragAndDropToObject",
      "Target": "id=three",
      "Value": "id=bin"
    }, {
      "Command": "dragAndDropToObject",
      "Target": "id=four",
      "Value": "id=bin"
    }, {
      "Command": "dragAndDropToObject",
      "Target": "id=five",
      "Value": "id=bin"
    }]
  },
  DemoDownload: {
    "CreationDate": "2018-2-25",
    "Commands": [{
      "Command": "store",
      "Target": "200",
      "Value": "!timeout_download"
    }, {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    }, {
      "Command": "storeEval",
      "Target": "var d=new Date(); d.getFullYear() + '-' +((d.getMonth()+1))+'-' +d.getDate();",
      "Value": "todaydate"
    }, {
      "Command": "echo",
      "Target": "Today is ${todaydate}",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/filedownload",
      "Value": ""
    }, {
      "Command": "onDownload",
      "Target": "KantuTest1_${todaydate}.exe",
      "Value": "true"
    }, {
      "Command": "store",
      "Target": "${!runtime}",
      "Value": "starttime"
    }, {
      "Command": "click",
      "Target": "link=USA (East coast)*",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "parseFloat(\"${!runtime}\")-parseFloat(\"${starttime}\")",
      "Value": "downloadtime"
    }, {
      "Command": "echo",
      "Target": "Download1 (USA) took ${downloadtime} seconds",
      "Value": "blue"
    }, {
      "Command": "onDownload",
      "Target": "KantuTest2_${todaydate}.exe",
      "Value": "true"
    }, {
      "Command": "store",
      "Target": "${!runtime}",
      "Value": "starttime"
    }, {
      "Command": "click",
      "Target": "link=*Asia*",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "parseFloat(\"${!runtime}\")-parseFloat(\"${starttime}\")",
      "Value": "downloadtime"
    }, {
      "Command": "echo",
      "Target": "Download2 (Asia) took ${downloadtime} seconds",
      "Value": "green"
    }, {
      "Command": "echo",
      "Target": "All done...",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=OnDownload command",
      "Value": ""
    }]
  },
  DemoExtract: {
    "CreationDate": "2018-05-28",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Current page URL = ${!URL}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Current loop value = ${!LOOP}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "This macro shows various methods to extract and save data from a website",
      "Value": ""
    }, {
      "Command": "storeAttribute",
      "Target": "css=img.responsive-img@src",
      "Value": "mylink"
    }, {
      "Command": "echo",
      "Target": "href=${mylink}",
      "Value": ""
    }, {
      "Command": "storeAttribute",
      "Target": "css=img.responsive-img@alt",
      "Value": "myalttext"
    }, {
      "Command": "echo",
      "Target": "alt text = ${myalttext}",
      "Value": ""
    }, {
      "Command": "storeAttribute",
      "Target": "//input[@id='sometext']@size",
      "Value": "boxsize"
    }, {
      "Command": "echo",
      "Target": "input box size =${boxsize}",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "This box is ${boxsize} chars wide"
    }, {
      "Command": "storeEval",
      "Target": "document.title = ${boxsize};",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "70",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[3]",
      "Value": ""
    }, {
      "Command": "storeText",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[3]",
      "Value": "myheader"
    }, {
      "Command": "echo",
      "Target": "header = ${myheader}",
      "Value": ""
    }, {
      "Command": "storeTitle",
      "Target": "",
      "Value": "mytitle"
    }, {
      "Command": "echo",
      "Target": "page title = ${mytitle}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "page title = ${mytitle}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "page title = ${mytitle}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "page title = ${mytitle}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Now test some extraction with storeValue",
      "Value": ""
    }, {
      "Command": "storeValue",
      "Target": "id=sometext",
      "Value": "mytext"
    }, {
      "Command": "select",
      "Target": "id=tesla",
      "Value": "label=Model Y"
    }, {
      "Command": "storeValue",
      "Target": "id=tesla",
      "Value": "mytesla"
    }, {
      "Command": "echo",
      "Target": "The text box contains [${mytext}] and the select box has the value [${mytesla}] selected",
      "Value": ""
    }, {
      "Command": "verifyValue",
      "Target": "id=tesla",
      "Value": "y"
    }, {
      "Command": "storeChecked",
      "Target": "name=vehicle",
      "Value": "hasbike"
    }, {
      "Command": "storeChecked",
      "Target": "xpath=(//input[@name='vehicle'])[2]",
      "Value": "hascar"
    }, {
      "Command": "storeChecked",
      "Target": "xpath=(//input[@name='vehicle'])[3]",
      "Value": "hasboat"
    }, {
      "Command": "echo",
      "Target": "User has bike:${hasbike}, car:${hascar}, boat:${hasboat}",
      "Value": "green"
    }, {
      "Command": "comment",
      "Target": "Search and extract directly from the page SOURCE",
      "Value": "y"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=[\\$\\£\\€](\\d+(?:\\.\\d{1,2})?)",
      "Value": "match1"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=[\\$\\£\\€](\\d+(?:\\.\\d{1,2})?)@2",
      "Value": "match2"
    }, {
      "Command": "comment",
      "Target": "You can also extract without regex with the * symbol",
      "Value": "match2b"
    }, {
      "Command": "sourceExtract",
      "Target": "$*<",
      "Value": "match2b"
    }, {
      "Command": "echo",
      "Target": "Coffee costs ${match1} and tea ${match2}",
      "Value": "blue"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=_width: (\\d+)",
      "Value": "match1"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=_width: (\\d+)@1,1",
      "Value": "match1group1"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=_width: (\\d+)@2",
      "Value": "match2"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=_width: (\\d+)@2,1",
      "Value": "match2group1"
    }, {
      "Command": "echo",
      "Target": "match1 = [${MATCH1}] (group1 = [${match1group1}]) match2 =  [${MATCH2}]  (group1 = [${MATCH2GROUP1}])",
      "Value": "blue"
    }, {
      "Command": "comment",
      "Target": "Extract Google Analytics ID",
      "Value": ""
    }, {
      "Command": "sourceExtract",
      "Target": "UA-*,",
      "Value": "ga_option1"
    }, {
      "Command": "sourceExtract",
      "Target": "regex=UA-[0-9]+-[0-9]+",
      "Value": "ga_option2"
    }, {
      "Command": "echo",
      "Target": "Google Analytics ID = ${ga_option2}",
      "Value": "pink"
    }, {
      "Command": "comment",
      "Target": "Some assertion test for QA",
      "Value": ""
    }, {
      "Command": "if",
      "Target": "${match2group1} != 22",
      "Value": ""
    }, {
      "Command": "throwError",
      "Target": "Regex Extraction failed for Match2(1):  ${match2group1}",
      "Value": ""
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Last but not least, taking a screenshot is another way to extract data",
      "Value": ""
    }, {
      "Command": "captureScreenshot",
      "Target": "myscreenshot_${mytitle}",
      "Value": ""
    }, {
      "Command": "storeImage",
      "Target": "//*[@id=\"page-header\"]/div/div/h1",
      "Value": "pagetitle.png"
    }, {
      "Command": "comment",
      "Target": "Export images to download folder",
      "Value": ""
    }, {
      "Command": "localStorageExport",
      "Target": "myscreenshot_${mytitle}.png",
      "Value": ""
    }, {
      "Command": "localStorageExport",
      "Target": "pagetitle.png",
      "Value": ""
    }]
  },
  DemoFrames: {
    "CreationDate": "2017-10-16",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/demo/webtest/frames/",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Reduce replay speed so we can better see what is going on...",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "medium",
      "Value": "!replayspeed"
    }, {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=mytext1",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext1",
      "Value": "Frame1 (index=0)"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=1",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=mytext2",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext2",
      "Value": "Frame2 (index=1)"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=mytext3",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "Frame3 (index=2)"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=3",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=mytext4",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext4",
      "Value": "Frame4 (index=3)"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=4",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "name=mytext5",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext5",
      "Value": "Frame5 (index=4)"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "now testing iframe inside this frame"
    }, {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[1]/div[2]/div/content/div/div/label/div/div[1]/div[3]/div",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": "iframe in frame: works!"
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "Test completed!"
    }]
  },

  DemoTakeScreenshots: {
    "CreationDate": "2018-1-25",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/blog/",
      "Value": ""
    }, {
      "Command": "captureEntirePageScreenshot",
      "Target": "a9t9blog",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=read more@POS=1",
      "Value": ""
    }, {
      "Command": "captureEntirePageScreenshot",
      "Target": "article1",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/blog/",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=read more@POS=2",
      "Value": ""
    }, {
      "Command": "captureEntirePageScreenshot",
      "Target": "article2",
      "Value": ""
    }, {
      "Command": "captureScreenshot",
      "Target": "article2_just_viewport",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "take screenshot of an _element_ with storeImage",
      "Value": ""
    }, {
      "Command": "storeImage",
      "Target": "link=The Autonomous Technology (A9T9) Blog",
      "Value": "blogtitle"
    }]
  },
  DemoIfElse: {
    "CreationDate": "2018-4-28",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "How to use gotoIf and label(s) for flow control. For a while/endWhile demo, see the DemoSaveCSV macro.",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "(new Date().getHours())",
      "Value": "mytime"
    }, {
      "Command": "echo",
      "Target": "mytime = ${mytime}",
      "Value": ""
    }, {
      "Command": "if",
      "Target": "${mytime}  > 16",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Good afternoon!",
      "Value": ""
    }, {
      "Command": "else",
      "Target": "",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Good morning!",
      "Value": ""
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "true",
      "Value": "!errorignore"
    }, {
      "Command": "storeAttribute",
      "Target": "//input[@id='sometext-WRONG-ID-TEST']@size",
      "Value": "boxsize"
    }, {
      "Command": "if",
      "Target": "${!LastCommandOK}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Boxsize is ${boxsize}",
      "Value": ""
    }, {
      "Command": "else",
      "Target": "",
      "Value": ""
    }, {
      "Command": "storeAttribute",
      "Target": "//input[@id='sometext']@size",
      "Value": "boxsize"
    }, {
      "Command": "echo",
      "Target": "Old ID not found, with new ID we have: Boxsize = ${boxsize}",
      "Value": ""
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "false",
      "Value": "!errorignore"
    }, {
      "Command": "echo",
      "Target": "input box size =${boxsize}",
      "Value": ""
    }, {
      "Command": "gotoIf",
      "Target": "${boxsize} > 70",
      "Value": "BOX-TOO-BIG"
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "This box is ${boxsize} chars wide"
    }, {
      "Command": "storeEval",
      "Target": "document.title = ${boxsize};",
      "Value": ""
    }, {
      "Command": "gotoLabel",
      "Target": "END",
      "Value": ""
    }, {
      "Command": "label",
      "Target": "BOX-TOO-BIG",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Input box too big. This is just a test of gotoIf",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "document.title = \"Just a gotoIf test. This line should not be reached unless you edit the macro\"",
      "Value": ""
    }, {
      "Command": "label",
      "Target": "END",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "test case completed",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "",
      "Value": ""
    }, {
      "Command": "onError",
      "Target": "#goto",
      "Value": "fixerror"
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "this line works"
    }, {
      "Command": "type",
      "Target": "id=sometextXXXXX",
      "Value": "this line has the wrong ID..."
    }, {
      "Command": "echo",
      "Target": "this line is never reached, because of the error above",
      "Value": "blue"
    }, {
      "Command": "gotoLabel",
      "Target": "end-part2",
      "Value": ""
    }, {
      "Command": "label",
      "Target": "fixerror",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "here we can have code that handles the error..",
      "Value": "green"
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "Fix Error Section: This command works."
    }, {
      "Command": "label",
      "Target": "end-part2",
      "Value": ""
    }]
  },
  DemoIframe: {
    "CreationDate": "2018-4-28",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/iframes",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[1]",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "First iframe: Embedded Google Doc",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[1]/div[2]/div/content/div/div/label/div/div[1]/div[3]/div",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": "hello iframe"
    }, {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePapercheckboxInnerBox.exportInnerBox",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[2]/div/label/div/div[1]/div[2]",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[3]/div/label/div/div[1]/div[2]",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Second iframe: Embedded Youtube Video",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "index=1",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=button.ytp-large-play-button.ytp-button",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Third iframe: Embedded Twitter + click links that open new tabs, then switch to them",
      "Value": ""
    }, {
      "Command": "selectFrame",
      "Target": "id=twitter-widget-0",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "link=@A9T9_com",
      "Value": ""
    }, {
      "Command": "pause",
      "Target": "2000",
      "Value": ""
    }, {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "link=a9t9.com",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Wait for tab to open",
      "Value": ""
    }, {
      "Command": "pause",
      "Target": "2000",
      "Value": ""
    }, {
      "Command": "selectWindow",
      "Target": "tab=2",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=Kantu Sel. IDE - Docs",
      "Value": ""
    }]
  },
  DemoImplicitWaiting: {
    "CreationDate": "2018-4-28",
    "Commands": [{
      "Command": "comment",
      "Target": "WaitForVisible is not part of implicit waiting",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/waitforvisible",
      "Value": ""
    }, {
      "Command": "waitForVisible",
      "Target": "css=#div1 > h1",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=#div1 > h1",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "20",
      "Value": "!timeout_wait"
    }, {
      "Command": "waitForVisible",
      "Target": "css=#div2 > h1",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "css=#div2 > h1",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Implicit waiting: Wait for elements to be loaded  or <timeout_wait> is reached",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/demo/webtest/implicitwaiting/",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "15",
      "Value": "!TIMEOUT_WAIT"
    }, {
      "Command": "assertText",
      "Target": "/html/body/header/center/p[2]",
      "Value": "Use the select box to start the timer..."
    }, {
      "Command": "select",
      "Target": "id=minutesSelect",
      "Value": "label=5 Seconds"
    }, {
      "Command": "echo",
      "Target": "The next element (target) is not available yet... Kantu waits for it up to ${!TIMEOUT_WAIT} seconds to appear.",
      "Value": "blue"
    }, {
      "Command": "click",
      "Target": "/html/body/header/center/img",
      "Value": ""
    }]
  },
  DemoCsvReadWithLoop: {
    "CreationDate": "2017-11-23",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "comment",
      "Target": "The file ReadCSVTestData.csv is pre-installed with Kantu.",
      "Value": ""
    }, {
      "Command": "csvRead",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=entry.933434489",
      "Value": "${!COL1}"
    }, {
      "Command": "type",
      "Target": "name=entry.2004105717",
      "Value": "${!COL2}"
    }, {
      "Command": "type",
      "Target": "name=entry.1382578664",
      "Value": "${!COL3}"
    }, {
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div/div/content/span",
      "Value": ""
    }]
  },
  DemoCsvReadWithWhile: {
    "CreationDate": "2018-1-25",
    "Commands": [{
      "Command": "store",
      "Target": "180",
      "Value": "!timeout_macro"
    }, {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "comment",
      "Target": "The file ReadCSVTestData.csv is pre-installed with Kantu.",
      "Value": ""
    }, {
      "Command": "csvRead",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Status = ${!csvReadStatus}, line = ${!csvReadLineNumber}",
      "Value": ""
    }, {
      "Command": "while",
      "Target": "\"${!csvReadStatus}\" == \"OK\"",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "status = ${!csvReadStatus}, line = ${!csvReadLineNumber}",
      "Value": ""
    }, {
      "Command": "open",
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "name=entry.933434489",
      "Value": "${!COL1}_${!csvReadLineNumber}"
    }, {
      "Command": "type",
      "Target": "name=entry.2004105717",
      "Value": "${!COL2}"
    }, {
      "Command": "type",
      "Target": "name=entry.1382578664",
      "Value": "${!COL3}"
    }, {
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div/div/content/span",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "${!csvReadLineNumber}+1",
      "Value": "!csvReadLineNumber"
    }, {
      "Command": "store",
      "Target": "true",
      "Value": "!errorIgnore"
    }, {
      "Command": "echo",
      "Target": "Reading CSV line No.  ${!csvReadLineNumber} ",
      "Value": "!errorIgnore"
    }, {
      "Command": "csvRead",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "false",
      "Value": "!errorIgnore"
    }, {
      "Command": "endWhile",
      "Target": "",
      "Value": ""
    }]
  },
  DemoCsvSave: {
    "CreationDate": "2018-06-01",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/csvsave",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "new Date().getFullYear()+\"-\"+(new Date().getMonth()+1)+\"-\"+new Date().getDate()+\" \"+ new Date().getHours()+\":\" + new Date().getMinutes() + \":\" + new Date().getSeconds()",
      "Value": "timestamp"
    }, {
      "Command": "store",
      "Target": "${timestamp}",
      "Value": "!csvLine"
    }, {
      "Command": "echo",
      "Target": "First column in the CSV is time (${timestamp})",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Set i = 1 as we start the extraction with the 2nd table cell.",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "1",
      "Value": "i"
    }, {
      "Command": "while",
      "Target": "(${i} < 8)",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "${i}+1",
      "Value": "i"
    }, {
      "Command": "echo",
      "Target": "Current value of i = ${i}",
      "Value": "i"
    }, {
      "Command": "storeText",
      "Target": "//*[@id=\"gcw_mainFNGP5XSu6\"]/div[2]/table/tbody/tr[2]/td[${i}]/a",
      "Value": "c2"
    }, {
      "Command": "store",
      "Target": "${c2}",
      "Value": "!csvLine"
    }, {
      "Command": "echo",
      "Target": "Extracted Value for i=${i} is exchange rate = ${c2}",
      "Value": ""
    }, {
      "Command": "endWhile",
      "Target": "",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "${!csvLine}",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Append content of !csvLine to CSV file (or create file if none exists)",
      "Value": ""
    }, {
      "Command": "csvSave",
      "Target": "CurrencyConverterData",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "If needed, you can download (save) the CSV data from the CSV tab to the the download folder",
      "Value": ""
    }, {
      "Command": "localStorageExport",
      "Target": "currencyconverterdata.csv",
      "Value": ""
    }]
  },
  DemoStoreEval: {
    "CreationDate": "2018-4-28",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    }, {
      "Command": "assertText",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": "Input box to display some results"
    }, {
      "Command": "verifyText",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": "Input box to display some results"
    }, {
      "Command": "verifyTitle",
      "Target": "Selenium IDE store, storeEval, Demo Page",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "Selenium IDE store, storeEval, Demo Page",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "storeEVAL can run Javascript... and store the result in a variable (optional)",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "document.title = \"123\";",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "123",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Use sourceSearch to assert we have the right Google Analytics Code",
      "Value": ""
    }, {
      "Command": "sourceSearch",
      "Target": "UA-86195842-1",
      "Value": "matches"
    }, {
      "Command": "if",
      "Target": "${matches} == 0",
      "Value": ""
    }, {
      "Command": "throwError",
      "Target": "Google Analytics ID is wrong!",
      "Value": ""
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "First some basic calculations with STORE",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "15",
      "Value": "AAA"
    }, {
      "Command": "store",
      "Target": "10",
      "Value": "BBB"
    }, {
      "Command": "storeEval",
      "Target": "storedVars['AAA']-storedVars['BBB']",
      "Value": "CCC"
    }, {
      "Command": "echo",
      "Target": "${CCC}",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "document.title = \"${CCC}\";",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "5",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "storedVars gives access to VARIABLE, ${...} to VALUE",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "SELenium IDe",
      "Value": "AAA"
    }, {
      "Command": "storeEval",
      "Target": "storedVars['AAA'].toUpperCase()",
      "Value": "CCC"
    }, {
      "Command": "echo",
      "Target": "${CCC}",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "${CCC}"
    }, {
      "Command": "echo",
      "Target": "Generate TODAYs date in in YYYY-MM-DD format ",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "var d= new Date(); var m=((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1); d.getFullYear()+\"-\"+m+\"-\"+d.getDate();",
      "Value": "mydate"
    }, {
      "Command": "echo",
      "Target": "Today is ${mydate}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Pick a random item from a list, useful for data-driven testing",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "new Array ('cat','dog','fish','dog','??','frog','?','dog','??','horse','??elephant')",
      "Value": "names"
    }, {
      "Command": "storeEval",
      "Target": "storedVars['names'].length",
      "Value": "length"
    }, {
      "Command": "echo",
      "Target": "array length = ${length}",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "Math.floor(Math.random()*storedVars['length'])",
      "Value": "num"
    }, {
      "Command": "echo",
      "Target": "num=${num}",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "The next command picks the random item",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "storedVars['names'][${num}]",
      "Value": "myrandomname"
    }, {
      "Command": "store",
      "Target": "Today is ${mydate}, and we draw a ${myrandomname}",
      "Value": "output"
    }, {
      "Command": "echo",
      "Target": "To is ${mydate}, and we draw a ${myrandomname}",
      "Value": "${output}"
    }, {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "${output}"
    }, {
      "Command": "if",
      "Target": "parseFloat(\"${!runtime}\") > 15",
      "Value": ""
    }, {
      "Command": "throwError",
      "Target": "Runtime too slow, test failed",
      "Value": ""
    }, {
      "Command": "else",
      "Target": "",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Runtime Ok, test passed!",
      "Value": "green"
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "With @POS you click on the (in this case) 3rd link with the same name. Great for looping over a list of links with the same name.",
      "Value": "green"
    }, {
      "Command": "clickAndWait",
      "Target": "link=This link@POS=3",
      "Value": ""
    }]
  },
  DemoTabs: {
    "CreationDate": "2017-10-15",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/tabs",
      "Value": ""
    }, {
      "Command": "click",
      "Target": "link=Open new web page in new browser tab",
      "Value": ""
    }, {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "*1* TAB1",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext1",
      "Value": "this is tab 1"
    }, {
      "Command": "click",
      "Target": "link=Open yet another web page in a new browser tab",
      "Value": ""
    }, {
      "Command": "selectWindow",
      "Target": "tab=2",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "*2* TAB2",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext2",
      "Value": "And this is tab 2!"
    }, {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    }, {
      "Command": "assertTitle",
      "Target": "*1* TAB1",
      "Value": ""
    }, {
      "Command": "type",
      "Target": "id=sometext1",
      "Value": "Now back in tab 1 - test done!"
    }, {
      "Command": "comment",
      "Target": "We can also open new tabs",
      "Value": ""
    }, {
      "Command": "selectWindow",
      "Target": "tab=open",
      "Value": "https://a9t9.com"
    }, {
      "Command": "selectWindow",
      "Target": "tab=open",
      "Value": "https://ocr.space"
    }, {
      "Command": "type",
      "Target": "id=imageUrl",
      "Value": "Kantu Tab Test done"
    }]
  },
  DemoVisualUITest: {
    "CreationDate": "2018-6-26",
    "Commands": [{
      "Command": "open",
      "Target": "https://a9t9.com/",
      "Value": ""
    }, {
      "Command": "resize",
      "Target": "1024@768",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "uitest_logo_wide_dpi_96.png@0.70",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "uitest_download_dpi_96.png@0.70",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "uitest_share_dpi_96.png@0.70",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Resize to iPhone6 screen size",
      "Value": ""
    }, {
      "Command": "resize",
      "Target": "375@768",
      "Value": ""
    }, {
      "Command": "visualVerify",
      "Target": "uitest_logo_mobile_dpi_96.png",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Missing menu is critical, so we use ASSERT (instead of just VERIFY)",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "uitest_hamburger_dpi_96.png",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Check that Share buttons do not show",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "At this point, page is surely loaded => reduce wait for (normally missing) image",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "2",
      "Value": "!timeout_wait"
    }, {
      "Command": "visualSearch",
      "Target": "uitest_share_dpi_96.png@0.70",
      "Value": "count"
    }, {
      "Command": "if",
      "Target": "${count} > 0",
      "Value": ""
    }, {
      "Command": "throwError",
      "Target": "Share buttons should NOT show on mobile phones",
      "Value": ""
    }, {
      "Command": "endif",
      "Target": "",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Restore default wait (not really needed here, since macro stops now anyway)",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    }, {
      "Command": "comment",
      "Target": "Done, enlarge browser again",
      "Value": ""
    }, {
      "Command": "resize",
      "Target": "1024@768",
      "Value": ""
    }]
  },

  DemoXType: {
    "CreationDate": "2018-10-24",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/xtype",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Send CTRL+S to open the browser save dialog",
      "Value": ""
    }, {
      "Command": "XType",
      "Target": "${KEY_CTRL+KEY_S}",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Generate today's date and time ",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "var d= new Date(); var m=((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1); d.getFullYear()+\"-\"+m+\"-\"+d.getDate();",
      "Value": "mydate"
    }, {
      "Command": "storeEval",
      "Target": "new Date().getHours()+\"-\" + new Date().getMinutes() + \"-\" + new Date().getSeconds()",
      "Value": "mytime"
    }, {
      "Command": "echo",
      "Target": "Today is ${mydate}, and the time is ${mytime}",
      "Value": "blue"
    }, {
      "Command": "comment",
      "Target": "Wait for the dialog to appear before sending the next keystrokes",
      "Value": ""
    }, {
      "Command": "pause",
      "Target": "2000",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Send the new file name to the dialog and press ENTER",
      "Value": "blue"
    }, {
      "Command": "XType",
      "Target": "Page_saved_by_Kantu_${mydate}_${mytime}${KEY_ENTER}",
      "Value": ""
    }]
  },
  DemoXClick: {
    "CreationDate": "2018-10-24",
    "Commands": [{
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/draw",
      "Value": ""
    }, {
      "Command": "clickAndWait",
      "Target": "link=Kantu will click this link",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "Kantu controls the mouse cursor now",
      "Value": "#shownotification"
    }, {
      "Command": "comment",
      "Target": "Use image search to find the drawing applet",
      "Value": ""
    }, {
      "Command": "XClick",
      "Target": "draw_box_dpi_96.png",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "x=${!imagex} y=${!imagey}",
      "Value": "green"
    }, {
      "Command": "XClick",
      "Target": "${!imagex},${!imagey}",
      "Value": ""
    }, {
      "Command": "store",
      "Target": "${!imagex}",
      "Value": "x"
    }, {
      "Command": "store",
      "Target": "${!imagey}",
      "Value": "y"
    }, {
      "Command": "comment",
      "Target": "Draw top line --->",
      "Value": ""
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    }, {
      "Command": "storeEval",
      "Target": "${x}+50",
      "Value": "x"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    }, {
      "Command": "comment",
      "Target": "Draw right line down",
      "Value": ""
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    }, {
      "Command": "storeEval",
      "Target": "${y}+50",
      "Value": "y"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    }, {
      "Command": "comment",
      "Target": "Draw bottom line <---",
      "Value": ""
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    }, {
      "Command": "storeEval",
      "Target": "${x}-50",
      "Value": "x"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    }, {
      "Command": "comment",
      "Target": "Draw left line up",
      "Value": ""
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    }, {
      "Command": "storeEval",
      "Target": "${y}-50",
      "Value": "y"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    }, {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    }, {
      "Command": "comment",
      "Target": "Check that the square was drawn ok",
      "Value": ""
    }, {
      "Command": "visualAssert",
      "Target": "draw_square_dpi_96.png",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Now type some text. First click the TEXT icon",
      "Value": ""
    }, {
      "Command": "XClick",
      "Target": "draw_texticon_dpi_96.png",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Now click the place where the text should start (80px below the square)",
      "Value": ""
    }, {
      "Command": "storeEval",
      "Target": "${y}+80",
      "Value": "y"
    }, {
      "Command": "echo",
      "Target": "x=${x}, y=${y}",
      "Value": "blue"
    }, {
      "Command": "XClick",
      "Target": "${x},${y}",
      "Value": ""
    }, {
      "Command": "comment",
      "Target": "Send keystrokes, and demo the use of the BACKSPACE special key.",
      "Value": ""
    }, {
      "Command": "XType",
      "Target": "Kantuuu${KEY_BACKSPACE}${KEY_BACKSPACE} can draw and write.",
      "Value": ""
    }, {
      "Command": "echo",
      "Target": "DemoXClick completed",
      "Value": "#shownotification"
    }]
  }
});
// CONCATENATED MODULE: ./src/config/preinstall_suites.js
/* harmony default export */ var preinstall_suites = ([{
  "creationDate": "2018-05-12",
  "name": "DemoLoopsInsideTestSuite",
  "fold": true,
  "macros": [{
    "macro": "DemoDragDrop",
    "loops": 3
  }, {
    "macro": "DemoIfElse",
    "loops": 3
  }, {
    "macro": "DemoStoreEval",
    "loops": 3
  }]
}, {
  "creationDate": "2018-05-31",
  "name": "DemoTestSuite",
  "fold": true,
  "macros": [{
    "macro": "DemoAutofill",
    "loops": 1
  }, {
    "macro": "DemoCanvas",
    "loops": 1
  }, {
    "macro": "DemoComputerVision",
    "loops": 1
  }, {
    "macro": "DemoCsvReadWithLoop",
    "loops": 3
  }, {
    "macro": "DemoCsvReadWithWhile",
    "loops": 1
  }, {
    "macro": "DemoCsvSave",
    "loops": 1
  }, {
    "macro": "DemoDialogboxes",
    "loops": 1
  }, {
    "macro": "DemoDownload",
    "loops": 1
  }, {
    "macro": "DemoDragDrop",
    "loops": 1
  }, {
    "macro": "DemoExtract",
    "loops": 1
  }, {
    "macro": "DemoFrames",
    "loops": 1
  }, {
    "macro": "DemoTakeScreenshots",
    "loops": 1
  }, {
    "macro": "DemoIfElse",
    "loops": 1
  }, {
    "macro": "DemoIframe",
    "loops": 1
  }, {
    "macro": "DemoImplicitWaiting",
    "loops": 1
  }, {
    "macro": "DemoStoreEval",
    "loops": 1
  }, {
    "macro": "DemoTabs",
    "loops": 1
  }, {
    "macro": "DemoVisualUITest",
    "loops": 1
  }]
}]);
// CONCATENATED MODULE: ./src/actions/index.js


var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var actions_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function actions_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

 /* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */















var recordedCount = 0;

var actions_saveEditing = function saveEditing(_ref) {
  var dispatch = _ref.dispatch,
      getState = _ref.getState;

  var _getState = getState(),
      editor = _getState.editor;

  var editing = editor.editing;


  storage["default"].set('editing', editing);
};

var saveConfig = function () {
  var lastSize = {};

  return function (_ref2) {
    var dispatch = _ref2.dispatch,
        getState = _ref2.getState;

    var _getState2 = getState(),
        config = _getState2.config;

    config = config || {};

    var savedSize = config.size ? config.size[config.showSidebar ? 'with_sidebar' : 'standard'] : null;
    var finalSize = savedSize || (config.showSidebar ? {
      width: 850,
      height: 775
    } : {
      width: 520,
      height: 775
    });

    if (finalSize.width !== lastSize.width || finalSize.height !== lastSize.height) {
      storage["default"].get('config').then(function (oldConfig) {
        if (oldConfig.showSidebar === config.showSidebar) return;

        if (finalSize.width !== window.outerWidth || finalSize.height !== window.outerHeight) {
          ipc_cs["a" /* default */].ask('PANEL_RESIZE_WINDOW', { size: finalSize });
        }
      });
    }

    storage["default"].set('config', config);
    lastSize = finalSize;
  };
}();

function setRoute(data) {
  return {
    type: types.SET_ROUTE,
    data: data
  };
}

function startRecording() {
  recordedCount = 0;

  return {
    types: type3('START_RECORDING'),
    promise: function promise() {
      setTimeout(function () {
        ipc_cs["a" /* default */].ask('PANEL_TRY_TO_RECORD_OPEN_COMMAND');
      });

      return ipc_cs["a" /* default */].ask('PANEL_START_RECORDING', {});
    }
  };
}

function stopRecording() {
  return {
    types: type3('STOP_RECORDING'),
    promise: function promise() {
      return ipc_cs["a" /* default */].ask('PANEL_STOP_RECORDING', {});
    }
  };
}

function startInspecting() {
  return {
    types: type3('START_INSPECTING'),
    promise: function promise() {
      return ipc_cs["a" /* default */].ask('PANEL_START_INSPECTING', {});
    }
  };
}

function stopInspecting() {
  return {
    types: type3('STOP_INSPECTING'),
    promise: function promise() {
      return ipc_cs["a" /* default */].ask('PANEL_STOP_INSPECTING', {});
    }
  };
}

function startPlaying() {
  return {
    type: types.START_PLAYING,
    data: null
  };
}

function stopPlaying() {
  return {
    type: types.STOP_PLAYING,
    data: null
  };
}

function doneInspecting() {
  return {
    type: types.DONE_INSPECTING,
    data: {}
  };
}

function appendCommand(cmdObj) {
  var fromRecord = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  if (fromRecord) {
    recordedCount += 1;
    // Note: show in badge the recorded count
    ipc_cs["a" /* default */].ask('PANEL_UPDATE_BADGE', {
      type: 'record',
      text: '' + recordedCount
    });
  }

  return {
    type: types.APPEND_COMMAND,
    data: { command: cmdObj },
    post: actions_saveEditing
  };
}

function duplicateCommand(index) {
  return {
    type: types.DUPLICATE_COMMAND,
    data: { index: index },
    post: actions_saveEditing
  };
}

function insertCommand(cmdObj, index) {
  return {
    type: types.INSERT_COMMAND,
    data: {
      index: index,
      command: cmdObj
    },
    post: actions_saveEditing
  };
}

function updateCommand(cmdObj, index) {
  return {
    type: types.UPDATE_COMMAND,
    data: {
      command: cmdObj,
      index: index
    },
    post: actions_saveEditing
  };
}

function removeCommand(index) {
  return {
    type: types.REMOVE_COMMAND,
    data: { index: index },
    post: actions_saveEditing
  };
}

function selectCommand(index, forceClick) {
  return {
    type: types.SELECT_COMMAND,
    data: { index: index, forceClick: forceClick },
    post: actions_saveEditing
  };
}

function cutCommand(index) {
  return {
    type: types.CUT_COMMAND,
    data: { indices: [index] },
    post: actions_saveEditing
  };
}

function copyCommand(index) {
  return {
    type: types.COPY_COMMAND,
    data: { indices: [index] }
  };
}

function pasteCommand(index) {
  return {
    type: types.PASTE_COMMAND,
    data: { index: index },
    post: actions_saveEditing
  };
}

function normalizeCommands() {
  return {
    type: types.NORMALIZE_COMMANDS,
    data: {},
    post: actions_saveEditing
  };
}

function updateSelectedCommand(obj) {
  return {
    type: types.UPDATE_SELECTED_COMMAND,
    data: obj,
    post: actions_saveEditing
  };
}

function setSourceError(error) {
  return {
    type: types.SET_SOURCE_ERROR,
    data: error
  };
}

function setSourceCurrent(str) {
  return {
    type: types.SET_SOURCE_CURRENT,
    data: str
  };
}

function saveSourceCodeToEditing(str) {
  return function (dispatch, getState) {
    var _getState$editor = getState().editor,
        editing = _getState$editor.editing,
        editingSource = _getState$editor.editingSource;

    if (editingSource.pure === editing.current) return;

    Object(common_log["a" /* default */])('ACTION, saveSourceCodeToEditing', str);

    try {
      var obj = Object(convert_utils["fromJSONString"])(str, 'untitled');

      dispatch(setEditing(actions_extends({}, obj.data, {
        meta: editing.meta
      })));

      dispatch(setSourceError(null));
    } catch (e) {
      message_default.a.error('There are errors in the source');
      dispatch(setSourceError(e.message));
    }
  };
}

// In the form of redux-thunnk, it saves current editing test case to local storage
function saveEditingAsExisted() {
  return function (dispatch, getState) {
    var state = getState();
    var src = state.editor.editing.meta.src;
    var tc = state.editor.testCases.find(function (tc) {
      return tc.id === src.id;
    });
    var data = Object(utils["pick"])(['commands'], state.editor.editing);

    // Make sure, only 'cmd', 'value', 'target' are saved in storage
    data.commands = data.commands.map(test_case_model_normalizeCommand);

    return Object(services_storage["getStorageManager"])().getMacroStorage().write(tc.name, actions_extends({}, tc, { data: data })).then(function () {
      dispatch({
        type: types.SAVE_EDITING_AS_EXISTED,
        data: null,
        post: actions_saveEditing
      });
    });
  };
}

// In the form of redux-thunnk, it saves the current editing test case as a new named test case
function saveEditingAsNew(name) {
  return function (dispatch, getState) {
    var state = getState();
    var data = Object(utils["pick"])(['commands'], state.editor.editing);
    var sameName = state.editor.testCases.find(function (tc) {
      return tc.name === name;
    });

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'));
    }

    var id = Object(utils["uid"])();

    return Object(services_storage["getStorageManager"])().getMacroStorage().write(name, { name: name, data: data, id: id }).then(function () {
      dispatch({
        type: types.SAVE_EDITING_AS_NEW,
        data: {
          id: id,
          name: name
        },
        post: actions_saveEditing
      });
    });
  };
}

function setTestCases(tcs) {
  return {
    type: types.SET_TEST_CASES,
    data: tcs,
    post: function post(_ref3) {
      var dispatch = _ref3.dispatch,
          getState = _ref3.getState;

      var state = getState();
      var shouldSelectDefault = state.editor.testCases.length > 0 && !state.editor.editing.meta.src && state.editor.editing.commands.length === 0;

      if (shouldSelectDefault) {
        dispatch(editTestCase(state.editor.testCases[0].id));
      }
    }
  };
}

function resetEditing() {
  return function (dispatch, getState) {
    var state = getState();
    var _state$editor = state.editor,
        editing = _state$editor.editing,
        testCases = _state$editor.testCases;

    // Leave it if it's a new macro

    if (editing.meta && !editing.meta.src) return;
    if (testCases.length === 0) {
      dispatch(editNewTestCase());
    } else {
      var tcs = testCases.slice();
      tcs.sort(function (a, b) {
        var nameA = a.name.toLowerCase();
        var nameB = b.name.toLowerCase();

        if (nameA < nameB) return -1;
        if (nameA === nameB) return 0;
        return 1;
      });
      dispatch(editTestCase(tcs[0].id));
    }
  };
}

function setEditing(editing) {
  return {
    type: types.SET_EDITING,
    data: editing
  };
}

function editTestCase(id) {
  return {
    type: types.EDIT_TEST_CASE,
    data: id,
    post: actions_saveEditing
  };
}

function editNewTestCase() {
  return {
    type: types.EDIT_NEW_TEST_CASE,
    data: null,
    post: actions_saveEditing
  };
}

function upsertTestCase(tc) {
  return function (dispatch, getState) {
    var state = getState();
    var testCases = state.editor.testCases;

    Object(common_log["a" /* default */])('upsertTestCase', tc);

    return Object(services_storage["getStorageManager"])().getMacroStorage().write(tc.name, actions_extends({
      id: Object(utils["uid"])()
    }, tc));
  };
}

function addTestCases(tcs) {
  var overwrite = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  var storageStrategyType = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

  return function (dispatch, getState) {
    var state = getState();
    var testCases = state.editor.testCases;
    var validTcs = overwrite ? tcs : tcs.filter(function (tc) {
      return !testCases.find(function (tcc) {
        return tcc.name === tc.name;
      });
    });
    var failTcs = overwrite ? [] : tcs.filter(function (tc) {
      return testCases.find(function (tcc) {
        return tcc.name === tc.name;
      });
    });

    var passCount = validTcs.length;
    var failCount = tcs.length - passCount;

    if (passCount === 0) {
      return Promise.resolve({ passCount: passCount, failCount: failCount, failTcs: failTcs });
    }

    return Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].Macro, storageStrategyType || Object(services_storage["getStorageManager"])().getCurrentStrategyType()).bulkWrite(validTcs.map(function (tc) {
      return {
        fileName: tc.name,
        content: actions_extends({}, tc, {
          id: Object(utils["uid"])(),
          udpateTime: new Date() * 1
        })
      };
    })).then(function () {
      return { passCount: passCount, failCount: failCount, failTcs: failTcs };
    });
  };
}

function renameTestCase(name, tcId) {
  return function (dispatch, getState) {
    var state = getState();
    var editingId = state.editor.editing.meta.src.id;
    var tc = state.editor.testCases.find(function (tc) {
      return tc.id === tcId;
    });
    var sameName = state.editor.testCases.find(function (tc) {
      return tc.name === name;
    });

    if (!tc) {
      return Promise.reject(new Error('No macro found with id \'' + tcId + '\'!'));
    }

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'));
    }

    return Object(services_storage["getStorageManager"])().getMacroStorage().rename(tc.name, name).then(function () {
      if (editingId === tcId) {
        dispatch({
          type: types.RENAME_TEST_CASE,
          data: name,
          post: actions_saveEditing
        });
      }
    });
  };
}

function removeTestCase(tcId) {
  return function (dispatch, getState) {
    var state = getState();
    var tc = state.editor.testCases.find(function (tc) {
      return tc.id === tcId;
    });
    var curId = state.editor.editing.meta.src.id;
    var tss = state.editor.testSuites.filter(function (ts) {
      return ts.cases.find(function (m) {
        return m.testCaseId === tcId;
      });
    });

    if (tss.length > 0) {
      return Promise.reject(new Error('Can\'t delete this macro for now, it\'s currently used in following test suites: ' + tss.map(function (item) {
        return item.name;
      })));
    }

    return Object(services_storage["getStorageManager"])().getMacroStorage().remove(tc.name).then(function () {
      dispatch({
        type: types.REMOVE_TEST_CASE,
        data: {
          isCurrent: curId === tcId
        },
        post: actions_saveEditing
      });
    }).catch(function (e) {
      return common_log["a" /* default */].error(e.stack);
    });
  };
}

function removeCurrentTestCase() {
  return function (dispatch, getState) {
    var state = getState();
    var id = state.editor.editing.meta.src.id;

    return removeTestCase(id)(dispatch, getState);
  };
}

// Note: duplicate current editing and save to another
function duplicateTestCase(newTestCaseName, tcId) {
  return function (dispatch, getState) {
    var state = getState();
    var tc = state.editor.testCases.find(function (tc) {
      return tc.id === tcId;
    });
    var sameName = state.editor.testCases.find(function (tc) {
      return tc.name === newTestCaseName;
    });

    if (!tc) {
      return Promise.reject(new Error('No macro found with id \'' + tcId + '\'!'));
    }

    if (sameName) {
      return Promise.reject(new Error('The macro name already exists!'));
    }

    return Object(services_storage["getStorageManager"])().getMacroStorage().write(newTestCaseName, actions_extends({}, tc, {
      id: Object(utils["uid"])(),
      name: newTestCaseName
    }));
  };
}

function setPlayerState(obj) {
  return {
    type: types.SET_PLAYER_STATE,
    data: obj
  };
}

function setTimeoutStatus(args) {
  return function (dispatch) {
    dispatch(setPlayerState({
      timeoutStatus: args
    }));

    // Note: show in badge the timeout left
    ipc_cs["a" /* default */].ask('PANEL_UPDATE_BADGE', {
      type: 'play',
      text: (args.total - args.past) / 1000 + 's'
    });
  };
}

function addPlayerErrorCommandIndex(index) {
  return {
    type: types.PLAYER_ADD_ERROR_COMMAND_INDEX,
    data: index
  };
}

function addLog(type, text) {
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  return {
    type: types.ADD_LOGS,
    data: [{
      type: type,
      text: text,
      options: options,
      id: Object(utils["uid"])(),
      createTime: new Date()
    }]
  };
}

function clearLogs() {
  return {
    type: types.CLEAR_LOGS,
    data: null
  };
}

function addScreenshot(screenshot) {
  return {
    type: types.ADD_SCREENSHOT,
    data: actions_extends({}, screenshot, {
      createTime: new Date()
    })
  };
}

function clearScreenshots() {
  return {
    type: types.CLEAR_SCREENSHOTS,
    data: null,
    post: function post() {
      return Object(services_storage["getStorageManager"])().getScreenshotStorage().clear();
    }
  };
}

function addVision(vision) {
  return {
    type: types.ADD_VISION,
    data: actions_extends({}, vision, {
      createTime: new Date()
    })
  };
}

function clearVisions() {
  return {
    type: types.CLEAR_VISIONS,
    data: null,
    post: function post() {
      return Object(services_storage["getStorageManager"])().getVisionStorage().clear();
    }
  };
}

function updateConfig(data) {
  return {
    type: types.UPDATE_CONFIG,
    data: data,
    post: saveConfig
  };
}

function updateTestCasePlayStatus(id, status) {
  return function (dispatch, getState) {
    var state = getState();
    var tc = state.editor.testCases.find(function (tc) {
      return tc.id === id;
    });

    return Object(services_storage["getStorageManager"])().getMacroStorage().write(tc.name, actions_extends({}, tc, { status: status })).then(function () {
      dispatch({
        type: types.UPDATE_TEST_CASE_STATUS,
        data: { id: id, status: status }
      });
    });
  };
}

function playerPlay(options) {
  return function (dispatch, getState) {
    var state = getState();
    var config = state.config;

    var cfg = Object(utils["pick"])(['playHighlightElements', 'playScrollElementsIntoView'], config);
    var macroName = state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled';
    var scope = actions_extends({
      '!MACRONAME': macroName,
      '!TIMEOUT_PAGELOAD': parseInt(config.timeoutPageLoad, 10),
      '!TIMEOUT_WAIT': parseInt(config.timeoutElement, 10),
      '!TIMEOUT_MACRO': parseInt(config.timeoutMacro, 10),
      '!TIMEOUT_DOWNLOAD': parseInt(config.timeoutDownload, 10),
      '!REPLAYSPEED': {
        '0': 'FAST',
        '0.3': 'MEDIUM',
        '2': 'SLOW'
      }[options.postDelay / 1000] || 'MEDIUM'
    }, options.overrideScope || {});
    var breakpoints = state.player.breakpointIndices || [];

    var opts = Object(utils["compose"])(Object(utils["on"])('resources'), utils["map"], Object(utils["on"])('extra'))(function () {
      var extra = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      return actions_extends({}, extra, cfg, options.commandExtra || {});
    })(options);

    getPlayer().play(actions_extends({
      breakpoints: breakpoints
    }, opts, {
      public: actions_extends({}, opts.public || {}, {
        scope: scope
      })
    }));
  };
}

function listCSV() {
  return function (dispatch, getState) {
    var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();

    csvStorage.list().then(function (list) {
      return Promise.all(list.map(function (item) {
        return csvStorage.getLink(item.fileName).then(function (url) {
          return {
            url: url,
            name: item.fileName,
            size: item.size,
            createTime: new Date(item.lastModified)
          };
        });
      }));
    }).then(function (list) {
      dispatch({
        type: types.SET_CSV_LIST,
        data: list
      });
    });
  };
}

function listScreenshots() {
  return function (dispatch, getState) {
    var man = Object(services_storage["getStorageManager"])().getScreenshotStorage();

    man.list().then(function (list) {
      list.reverse();

      Object(common_log["a" /* default */])('listScreenshots', list);

      return Promise.all(list.map(function (item) {
        return man.getLink(item.fileName).then(function (url) {
          return {
            url: url,
            name: item.fileName,
            createTime: new Date(item.lastModified)
          };
        });
      }));
    }).then(function (list) {
      dispatch({
        type: types.SET_SCREENSHOT_LIST,
        data: list
      });
    });
  };
}

function listVisions() {
  return function (dispatch, getState) {
    var visionStorage = Object(services_storage["getStorageManager"])().getVisionStorage();

    visionStorage.list().then(function (list) {
      list.reverse();
      Object(common_log["a" /* default */])('listVisions', list);

      return Promise.all(list.map(function (item) {
        return visionStorage.getLink(item.fileName).then(function (url) {
          return {
            url: url,
            name: item.fileName,
            createTime: new Date(item.lastModified)
          };
        });
      }));
    }).then(function (list) {
      dispatch({
        type: types.SET_VISION_LIST,
        data: list
      });
    });
  };
}

function setTestSuites(tss) {
  return {
    type: types.SET_TEST_SUITES,
    data: tss
  };
}

function addTestSuite(ts) {
  return function (dispatch, getState) {
    return Object(services_storage["getStorageManager"])().getTestSuiteStorage().write(ts.name, actions_extends({}, ts, {
      id: Object(utils["uid"])(),
      updateTime: new Date() * 1
    }));
  };
}

function addTestSuites(tss) {
  var storageStrategyType = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;

  return function (dispatch, getState) {
    var state = getState();
    // const testCases = state.editor.testCases
    var validTss = tss;
    // const failTcs   = tcs.filter(tc => testCases.find(tcc => tcc.name === tc.name))

    var passCount = validTss.length;
    var failCount = tss.length - passCount;

    if (passCount === 0) {
      return Promise.resolve({ passCount: passCount, failCount: failCount, failTss: [] });
    }

    return Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].TestSuite, storageStrategyType || Object(services_storage["getStorageManager"])().getCurrentStrategyType()).bulkWrite(validTss.map(function (ts) {
      return {
        fileName: ts.name,
        content: actions_extends({}, ts, {
          id: Object(utils["uid"])(),
          updateTime: new Date() * 1
        })
      };
    })).then(function () {
      return { passCount: passCount, failCount: failCount, failTss: [] };
    });
  };
}

function updateTestSuite(id, data) {
  return function (dispatch, getState) {
    var state = getState();
    var ts = state.editor.testSuites.find(function (ts) {
      return ts.id === id;
    });

    var realData = typeof data === 'function' ? data(ts) : data;
    var revised = actions_extends({}, ts, realData);

    dispatch({
      type: types.UPDATE_TEST_SUITE,
      data: {
        id: id,
        updated: revised
      }
    });

    var suiteStorage = Object(services_storage["getStorageManager"])().getTestSuiteStorage();
    var pRename = realData.name && ts.name !== realData.name ? suiteStorage.rename(ts.name, realData.name) : Promise.resolve();
    var suiteName = realData.name && ts.name !== realData.name ? realData.name : ts.name;

    return pRename.then(function () {
      return suiteStorage.write(suiteName, revised);
    });
  };
}

function removeTestSuite(id) {
  return function (dispatch, getState) {
    var state = getState();
    var ts = state.editor.testSuites.find(function (ts) {
      return ts.id === id;
    });

    if (!ts) throw new Error('can\'t find test suite with id \'' + id + '\'');

    return Object(services_storage["getStorageManager"])().getTestSuiteStorage().remove(ts.name);
  };
}

function setPlayerMode(mode) {
  return {
    type: types.SET_PLAYER_STATE,
    data: { mode: mode }
  };
}

function runBackup() {
  return function (dispatch, getState) {
    var _getState3 = getState(),
        config = _getState3.config,
        editor = _getState3.editor;

    var autoBackupTestCases = config.autoBackupTestCases,
        autoBackupTestSuites = config.autoBackupTestSuites,
        autoBackupScreenshots = config.autoBackupScreenshots,
        autoBackupCSVFiles = config.autoBackupCSVFiles,
        autoBackupVisionImages = config.autoBackupVisionImages;


    var sm = Object(services_storage["getStorageManager"])();

    return Promise.all([sm.getCSVStorage().list(), sm.getScreenshotStorage().list(), sm.getVisionStorage().list()]).then(function (_ref4) {
      var _ref5 = _slicedToArray(_ref4, 3),
          csvs = _ref5[0],
          screenshots = _ref5[1],
          visions = _ref5[2];

      return backup_backup({
        csvs: csvs,
        screenshots: screenshots,
        visions: visions,
        testCases: editor.testCases,
        testSuites: editor.testSuites,
        backup: {
          testCase: autoBackupTestCases,
          testSuite: autoBackupTestSuites,
          screenshot: autoBackupScreenshots,
          csv: autoBackupCSVFiles,
          vision: autoBackupVisionImages
        }
      });
    }).catch(function (e) {
      common_log["a" /* default */].error(e.stack);
    });
  };
}

function setVariables(variables) {
  variables.sort(function (a, b) {
    if (a.key < b.key) return -1;
    if (a.key > b.key) return 1;
    return 0;
  });

  return {
    type: types.SET_VARIABLE_LIST,
    data: variables
  };
}

function updateUI(data) {
  return {
    type: types.UPDATE_UI,
    data: data
  };
}

function addBreakpoint(commandIndex) {
  return {
    type: types.ADD_BREAKPOINT,
    data: commandIndex
  };
}

function removeBreakpoint(commandIndex) {
  return {
    type: types.REMOVE_BREAKPOINT,
    data: commandIndex
  };
}

function setEditorActiveTab(tab) {
  return {
    type: types.SET_EDITOR_ACTIVE_TAB,
    data: tab
  };
}

function preinstall() {
  var yesInstall = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

  return function (dispatch, getState) {
    var markThisVersion = function markThisVersion() {
      return storage["default"].get('preinstall_info').then(function () {
        var info = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        var prevVersions = info.askedVersions || [];
        var thisVersion = src_config["a" /* default */].preinstallVersion;
        var hasThisOne = prevVersions.indexOf(thisVersion) !== -1;

        if (hasThisOne) return true;

        return storage["default"].set('preinstall_info', actions_extends({}, info, {
          askedVersions: [].concat(actions_toConsumableArray(prevVersions), [thisVersion])
        }));
      });
    };

    if (!yesInstall) return markThisVersion();

    Object(common_log["a" /* default */])('PREINSTALL_CSV_LIST', ["preinstall/csv/readcsvtestdata.csv"]);
    Object(common_log["a" /* default */])('PREINSTALL_VISION_LIST', ["preinstall/vision/canvas_3dots_verify_dpi_96.png","preinstall/vision/canvas_hydepark_dpi_96.png","preinstall/vision/canvas_hydepark_verify_dpi_96.png","preinstall/vision/canvas_wyoming_dpi_96.png","preinstall/vision/canvas_wyoming_verify_dpi_96.png","preinstall/vision/democv_checkoverlay.png","preinstall/vision/democv_ocrdone.png","preinstall/vision/democv_share.png","preinstall/vision/democv_startocr.png","preinstall/vision/draw_box_dpi_96.png","preinstall/vision/draw_square_dpi_96.png","preinstall/vision/draw_texticon_dpi_96.png","preinstall/vision/uitest_download_dpi_96.png","preinstall/vision/uitest_hamburger_dpi_96.png","preinstall/vision/uitest_logo_mobile_dpi_96.png","preinstall/vision/uitest_logo_wide_dpi_96.png","preinstall/vision/uitest_share_dpi_96.png"]);

    var installMacrosAndSuites = function installMacrosAndSuites() {
      if (!preinstall_macros || !Object.keys(preinstall_macros).length) return Promise.resolve();

      var tcs = Object.keys(preinstall_macros).map(function (key) {
        var str = JSON.stringify(preinstall_macros[key]);
        return Object(convert_utils["fromJSONString"])(str, key);
      });

      dispatch(addTestCases(tcs, true, services_storage["StorageStrategyType"].Browser));

      // Note: test cases need to be save to indexed db before it reflects in store
      // so it may take some time before we can preinstall test suites
      return Object(utils["delay"])(function () {
        var state = getState();

        var tss = preinstall_suites.map(function (ts) {
          return Object(convert_suite_utils["parseTestSuite"])(JSON.stringify(ts), state.editor.testCases);
        });
        dispatch(addTestSuites(tss, services_storage["StorageStrategyType"].Browser));
      }, 1000);
    };

    // Preinstall csv
    var installCsvs = function installCsvs() {
      var list = ["preinstall/csv/readcsvtestdata.csv"];
      if (list.length === 0) return Promise.resolve();

      // Note: preinstalled resources all go into browser mode
      var csvStorage = Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].CSV, services_storage["StorageStrategyType"].Browser);
      var ps = list.map(function (url) {
        var parts = url.split('/');
        var fileName = parts[parts.length - 1];

        return Object(utils["loadCsv"])(url).then(function (text) {
          return csvStorage.write(fileName, new Blob([text]));
        });
      });

      return Promise.resolve(ps)
      // Note: delay needed for Firefox and slow Chrome
      .then(function () {
        return Object(utils["delay"])(function () {}, 3000);
      }).then(function () {
        dispatch(listCSV());
      });
    };

    // Preinstall vision images
    var installVisionImages = function installVisionImages() {
      var list = ["preinstall/vision/canvas_3dots_verify_dpi_96.png","preinstall/vision/canvas_hydepark_dpi_96.png","preinstall/vision/canvas_hydepark_verify_dpi_96.png","preinstall/vision/canvas_wyoming_dpi_96.png","preinstall/vision/canvas_wyoming_verify_dpi_96.png","preinstall/vision/democv_checkoverlay.png","preinstall/vision/democv_ocrdone.png","preinstall/vision/democv_share.png","preinstall/vision/democv_startocr.png","preinstall/vision/draw_box_dpi_96.png","preinstall/vision/draw_square_dpi_96.png","preinstall/vision/draw_texticon_dpi_96.png","preinstall/vision/uitest_download_dpi_96.png","preinstall/vision/uitest_hamburger_dpi_96.png","preinstall/vision/uitest_logo_mobile_dpi_96.png","preinstall/vision/uitest_logo_wide_dpi_96.png","preinstall/vision/uitest_share_dpi_96.png"];
      if (list.length === 0) return Promise.resolve();

      // Note: preinstalled resources all go into browser mode
      var visionStorage = Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].Vision, services_storage["StorageStrategyType"].Browser);
      var ps = list.map(function (url) {
        var parts = url.split('/');
        var fileName = parts[parts.length - 1];

        return Object(utils["loadImage"])(url).then(function (blob) {
          return visionStorage.write(fileName, blob);
        });
      });

      return Promise.resolve(ps)
      // Note: delay needed for Firefox and slow Chrome
      .then(function () {
        return Object(utils["delay"])(function () {}, 3000);
      }).then(function () {
        dispatch(listVisions());
      });
    };

    return Promise.all([installMacrosAndSuites(), installCsvs(), installVisionImages()]).then(markThisVersion);
  };
}
// EXTERNAL MODULE: ./node_modules/antd/lib/icon/index.js
var icon = __webpack_require__(19);
var icon_default = /*#__PURE__*/__webpack_require__.n(icon);

// EXTERNAL MODULE: ./node_modules/antd/lib/dropdown/index.js
var dropdown = __webpack_require__(80);
var dropdown_default = /*#__PURE__*/__webpack_require__.n(dropdown);

// EXTERNAL MODULE: ./node_modules/antd/lib/menu/index.js
var menu = __webpack_require__(13);
var menu_default = /*#__PURE__*/__webpack_require__.n(menu);

// EXTERNAL MODULE: ./node_modules/antd/lib/tabs/index.js
var tabs = __webpack_require__(26);
var tabs_default = /*#__PURE__*/__webpack_require__.n(tabs);

// EXTERNAL MODULE: ./node_modules/antd/lib/input/index.js
var input = __webpack_require__(24);
var input_default = /*#__PURE__*/__webpack_require__.n(input);

// EXTERNAL MODULE: ./node_modules/antd/lib/radio/index.js
var lib_radio = __webpack_require__(44);
var radio_default = /*#__PURE__*/__webpack_require__.n(lib_radio);

// EXTERNAL MODULE: ./node_modules/antd/lib/checkbox/index.js
var lib_checkbox = __webpack_require__(28);
var checkbox_default = /*#__PURE__*/__webpack_require__.n(lib_checkbox);

// EXTERNAL MODULE: ./node_modules/antd/lib/form/index.js
var lib_form = __webpack_require__(25);
var form_default = /*#__PURE__*/__webpack_require__.n(lib_form);

// EXTERNAL MODULE: ./node_modules/antd/lib/select/index.js
var lib_select = __webpack_require__(23);
var select_default = /*#__PURE__*/__webpack_require__.n(lib_select);

// EXTERNAL MODULE: ./node_modules/antd/lib/row/index.js
var row = __webpack_require__(441);
var row_default = /*#__PURE__*/__webpack_require__.n(row);

// EXTERNAL MODULE: ./node_modules/antd/lib/col/index.js
var col = __webpack_require__(158);
var col_default = /*#__PURE__*/__webpack_require__.n(col);

// EXTERNAL MODULE: ./src/components/header.scss
var header = __webpack_require__(664);

// CONCATENATED MODULE: ./src/recomputed/index.js

function hasUnsavedMacro(state) {
  var editor = state.editor;
  var editing = editor.editing,
      editingSource = editor.editingSource,
      activeTab = editor.activeTab;


  if (!editing.meta.src) return true;

  switch (activeTab) {
    case 'table_view':
      {
        var _ref = editing.meta || {},
            hasUnsaved = _ref.hasUnsaved;

        return hasUnsaved;
      }

    case 'source_view':
      {
        return editingSource.original !== editingSource.current;
      }

    default:
      throw new Error('Unknown activeTab');
  }
}

function editorSelectedCommand(state) {
  var _state$editor$editing = state.editor.editing,
      meta = _state$editor$editing.meta,
      commands = _state$editor$editing.commands;


  if (!meta || meta.selectedIndex === -1) return null;
  return commands[meta.selectedIndex] || null;
}
// CONCATENATED MODULE: ./src/components/save_test_case.js






var save_test_case_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function save_test_case_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }







var save_test_case_SaveAsModal = function (_React$Component) {
  _inherits(SaveAsModal, _React$Component);

  function SaveAsModal() {
    var _ref;

    var _temp, _this, _ret;

    save_test_case_classCallCheck(this, SaveAsModal);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = SaveAsModal.__proto__ || Object.getPrototypeOf(SaveAsModal)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      name: null
    }, _temp), _possibleConstructorReturn(_this, _ret);
  }

  save_test_case_createClass(SaveAsModal, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      if (this.props.name) {
        this.setState({ name: this.props.name });
      }

      setTimeout(function () {
        var input = _this2.inputSaveTestCase.refs.input;
        input.focus();
        input.selectionStart = input.selectionEnd = input.value.length;
      }, 100);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'Save macro as..',
          okText: 'Save',
          cancelText: 'Cancel',
          visible: true,
          onOk: function onOk() {
            return _this3.props.onOk(_this3.state.name);
          },
          onCancel: this.props.onCancel,
          className: 'save-modal'
        },
        react_default.a.createElement(input_default.a, {
          style: { width: '100%' },
          onKeyDown: function onKeyDown(e) {
            if (e.keyCode === 13) _this3.props.onOk(_this3.state.name);
          },
          onChange: function onChange(e) {
            return _this3.setState({ name: e.target.value });
          },
          value: this.state.name || '',
          placeholder: 'macro name',
          ref: function ref(el) {
            _this3.inputSaveTestCase = el;
          }
        })
      );
    }
  }]);

  return SaveAsModal;
}(react_default.a.Component);

var getContainer = function getContainer() {
  var id = 'save_test_case_container';
  var $el = document.getElementById(id);

  if ($el) return $el;

  var $new = document.createElement('div');
  $new.id = id;
  document.body.appendChild($new);
  return $new;
};

var save_test_case_getTestCaseName = function getTestCaseName(state) {
  var src = state.editor.editing.meta.src;

  return src && src.name && src.name.length ? src.name : 'Untitled';
};

var save_test_case_tryToSave = function tryToSave(store, testCaseName) {
  var $container = getContainer();
  var state = store.getState();
  var existed = !!state.editor.editing.meta.src;

  if (existed) {
    return store.dispatch(saveEditingAsExisted());
  }

  return new Promise(function (resolve, reject) {
    var onSave = function onSave(name) {
      return store.dispatch(saveEditingAsNew(name)).then(function () {
        return message_default.a.success('successfully saved!', 1.5);
      }, function (e) {
        return message_default.a.error(e.message, 1.5);
      }).then(resolve, reject);
    };

    react_dom_default.a.render(react_default.a.createElement(save_test_case_SaveAsModal, {
      name: testCaseName,
      onOk: onSave,
      onCancel: resolve
    }), $container);
    // TODO
  }).then(function () {
    react_dom_default.a.unmountComponentAtNode($container);
  }).catch(function (e) {
    console.error(e.message);
  });
};

var save_test_case_factory = function factory(store) {
  return {
    saveOrNot: function saveOrNot() {
      var state = store.getState();
      var hasUnsaved = hasUnsavedMacro(state);

      if (!hasUnsaved) return Promise.resolve();

      return new Promise(function (resolve, reject) {
        modal_default.a.confirm({
          title: 'Unsaved changes in macro "' + save_test_case_getTestCaseName(state) + '"',
          content: 'Do you want to discard or save these changes?',
          okText: 'Save',
          cancelText: 'Discard',
          onOk: function onOk() {
            save_test_case_tryToSave(store).then(resolve);
            return Promise.resolve(true);
          },
          onCancel: function onCancel() {
            resolve();
            return Promise.resolve(true);
          }
        });
      });
    },
    save: function save(defaultName) {
      var state = store.getState();
      var hasUnsaved = hasUnsavedMacro(state);

      if (!hasUnsaved) return;
      return save_test_case_tryToSave(store, defaultName);
    }
  };
};

var save_test_case_api = void 0;

function getSaveTestCase(store) {
  if (save_test_case_api) return save_test_case_api;
  if (!store) throw new Error('must provide store');

  save_test_case_api = save_test_case_factory(store);
  return save_test_case_api;
}
// EXTERNAL MODULE: ./src/common/constant.js
var constant = __webpack_require__(8);

// EXTERNAL MODULE: ./src/services/xmodules/xfile.ts
var xfile = __webpack_require__(27);

// EXTERNAL MODULE: ./src/services/xmodules/x_user_io.ts
var x_user_io = __webpack_require__(51);

// EXTERNAL MODULE: ./src/services/xmodules/common.ts
var xmodules_common = __webpack_require__(123);

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(3);
var web_extension_default = /*#__PURE__*/__webpack_require__.n(web_extension);

// CONCATENATED MODULE: ./src/components/header.js

























































































var header_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var header_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function header_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function header_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function header_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function header_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




















var header_Header = function (_React$Component) {
  header_inherits(Header, _React$Component);

  function Header() {
    var _ref;

    var _temp, _this, _ret;

    header_classCallCheck(this, Header);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = header_possibleConstructorReturn(this, (_ref = Header.__proto__ || Object.getPrototypeOf(Header)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      showPlayLoops: false,
      loopsStart: 1,
      loopsEnd: 3,
      xModules: [Object(xfile["getXFile"])(), Object(x_user_io["getXUserIO"])()],
      xModuleData: {},
      xFileRootDirChanged: false
    }, _this.getPlayer = function (name) {
      if (name) return getPlayer({ name: name });

      switch (_this.props.player.mode) {
        case constant["e" /* PLAYER_MODE */].TEST_CASE:
          return getPlayer({ name: 'testCase' });

        case constant["e" /* PLAYER_MODE */].TEST_SUITE:
          return getPlayer({ name: 'testSuite' });
      }
    }, _this.getTestCaseName = function () {
      var src = _this.props.editing.meta.src;

      return src && src.name && src.name.length ? src.name : 'Untitled';
    }, _this.togglePlayLoopsModal = function (toShow) {
      _this.setState({
        showPlayLoops: toShow
      });
    }, _this.onToggleRecord = function () {
      if (_this.props.status === constant["a" /* APP_STATUS */].RECORDER) {
        _this.props.stopRecording();
        // Note: remove targetOptions from all commands
        _this.props.normalizeCommands();
      } else {
        _this.props.startRecording();
      }

      _this.setState({ lastOperation: 'record' });
    }, _this.onClickPlayLoops = function () {
      var _this$state = _this.state,
          loopsStart = _this$state.loopsStart,
          loopsEnd = _this$state.loopsEnd;


      if (loopsStart < 0) {
        return message_default.a.error('Start value must be no less than zero', 1.5);
      }

      if (loopsEnd < loopsStart) {
        return message_default.a.error('Max value must be greater than start value', 1.5);
      }

      var player = _this.getPlayer();
      var commands = _this.props.editing.commands;
      var src = _this.props.editing.meta.src;

      var openTc = commands.find(function (tc) {
        return tc.cmd.toLowerCase() === 'open';
      });

      _this.props.playerPlay({
        loopsEnd: loopsEnd,
        loopsStart: loopsStart,
        title: _this.getTestCaseName(),
        extra: {
          id: src && src.id
        },
        mode: player.C.MODE.LOOP,
        startIndex: 0,
        startUrl: openTc ? openTc.target : null,
        resources: _this.props.editing.commands,
        postDelay: _this.props.config.playCommandInterval * 1000
      });

      _this.setState({ lastOperation: 'play' });
      _this.togglePlayLoopsModal(false);
    }, _this.onCancelPlayLoops = function () {
      _this.togglePlayLoopsModal(false);
      _this.setState({
        loopsToPlay: 2
      });
    }, _this.onChangePlayLoops = function (field, value) {
      _this.setState(_defineProperty({}, field, parseInt(value, 10)));
    }, _this.onClickSave = function () {
      return getSaveTestCase().save();
    }, _this.playCurrentMacro = function (isStep) {
      var commands = _this.props.editing.commands;
      var src = _this.props.editing.meta.src;

      var openTc = commands.find(function (tc) {
        return tc.cmd.toLowerCase() === 'open';
      });

      _this.setState({ lastOperation: 'play' });

      _this.props.playerPlay({
        title: _this.getTestCaseName(),
        extra: {
          id: src && src.id
        },
        mode: getPlayer().C.MODE.STRAIGHT,
        startIndex: 0,
        startUrl: openTc ? openTc.target : null,
        resources: commands,
        postDelay: _this.props.config.playCommandInterval * 1000,
        isStep: isStep
      });
    }, _this.playCurrentLine = function () {
      var commands = _this.props.editing.commands;
      var _this$props$editing$m = _this.props.editing.meta,
          src = _this$props$editing$m.src,
          selectedIndex = _this$props$editing$m.selectedIndex;

      var commandIndex = selectedIndex === -1 ? 0 : selectedIndex || 0;

      return _this.props.playerPlay({
        title: _this.getTestCaseName(),
        extra: {
          id: src && src.id
        },
        mode: player_Player.C.MODE.SINGLE,
        startIndex: commandIndex,
        startUrl: null,
        resources: commands,
        postDelay: _this.props.config.playCommandInterval * 1000,
        callback: function callback(err, res) {
          if (err) return;

          // Note: auto select next command
          if (commandIndex + 1 < commands.length) {
            _this.props.selectCommand(commandIndex + 1, true);
          }
        }
      });
    }, _temp), header_possibleConstructorReturn(_this, _ret);
  }

  // Play loops relative


  header_createClass(Header, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      var history = this.props.history;


      this.props.setRoute(history.location.pathname);
      this.props.history.listen(function (location, action) {
        _this2.props.setRoute(history.location.pathname);
      });
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (nextProps.ui.showSettings && !this.props.ui.showSettings) {
        this.onShowSettings();
      }
    }
  }, {
    key: 'initXModules',
    value: function initXModules() {
      var _this3 = this;

      var xModules = this.state.xModules;

      // versionInfo: {
      //  installed: boolean
      //  version: string
      // },
      // checkResult: {
      //  error: string | null
      // }
      Promise.all(xModules.map(function (mod) {
        return mod.getVersion().then(function (versionInfo) {
          if (versionInfo.installed) {
            return mod.sanityCheck().then(function () {
              return { error: null };
            }, function (e) {
              return { error: e.message };
            }).then(function (checkResult) {
              return {
                versionInfo: versionInfo,
                checkResult: checkResult
              };
            });
          } else {
            return {
              versionInfo: versionInfo,
              checkResult: null
            };
          }
        });
      })).then(function (results) {
        var xModuleData = results.reduce(function (prev, r, i) {
          prev[xModules[i].getName()] = header_extends({}, r.versionInfo, {
            checkResult: r.checkResult,
            config: xModules[i].getCachedConfig()
          });
          return prev;
        }, {});

        _this3.setState({
          xModuleData: xModuleData,
          xFileRootDirChanged: false
        });
      });
    }
  }, {
    key: 'onShowSettings',
    value: function onShowSettings() {
      this.initXModules();
    }
  }, {
    key: 'showSettingsModal',
    value: function showSettingsModal() {
      this.props.updateUI({ showSettings: true });
    }
  }, {
    key: 'renderPlayLoopModal',
    value: function renderPlayLoopModal() {
      var _this4 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'How many loops to play?',
          okText: 'Play',
          cancelText: 'Cancel',
          className: 'play-loop-modal',
          visible: this.state.showPlayLoops,
          onOk: this.onClickPlayLoops,
          onCancel: this.onCancelPlayLoops
        },
        react_default.a.createElement(
          row_default.a,
          null,
          react_default.a.createElement(
            col_default.a,
            { span: 10 },
            react_default.a.createElement(
              form_default.a.Item,
              { label: 'Start value' },
              react_default.a.createElement(input_default.a, {
                type: 'number',
                min: '0',
                value: this.state.loopsStart,
                onKeyDown: function onKeyDown(e) {
                  if (e.keyCode === 13) _this4.onClickPlayLoops();
                },
                onChange: function onChange(e) {
                  return _this4.onChangePlayLoops('loopsStart', e.target.value);
                }
              })
            )
          ),
          react_default.a.createElement(
            col_default.a,
            { span: 10, offset: 2 },
            react_default.a.createElement(
              form_default.a.Item,
              { label: 'Max' },
              react_default.a.createElement(input_default.a, {
                type: 'number',
                min: '0',
                value: this.state.loopsEnd,
                onKeyDown: function onKeyDown(e) {
                  if (e.keyCode === 13) _this4.onClickPlayLoops();
                },
                onChange: function onChange(e) {
                  return _this4.onChangePlayLoops('loopsEnd', e.target.value);
                }
              })
            )
          )
        ),
        react_default.a.createElement(
          'p',
          null,
          'The value of the loop counter is available in $',
          '{',
          '!LOOP',
          '}',
          ' variable'
        )
      );
    }
  }, {
    key: 'renderSettingModal',
    value: function renderSettingModal() {
      var _this5 = this;

      var onConfigChange = function onConfigChange(key, val) {
        _this5.props.updateConfig(_defineProperty({}, key, val));
      };

      var displayConfig = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 }
      };

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'Settings',
          className: 'settings-modal',
          width: 650,
          footer: null,
          visible: this.props.ui.showSettings,
          onCancel: function onCancel() {
            return _this5.props.updateUI({ showSettings: false });
          }
        },
        react_default.a.createElement(
          tabs_default.a,
          {
            activeKey: this.props.ui.settingsTab || 'replay',
            onChange: function onChange(activeKey) {
              return _this5.props.updateUI({ settingsTab: activeKey });
            }
          },
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Replay', key: 'replay' },
            react_default.a.createElement(
              form_default.a,
              null,
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: 'Replay Helper' }, displayConfig),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('playScrollElementsIntoView', e.target.checked);
                    },
                    checked: this.props.config.playScrollElementsIntoView
                  },
                  'Scroll elements into view during replay'
                ),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('playHighlightElements', e.target.checked);
                    },
                    checked: this.props.config.playHighlightElements
                  },
                  'Highlight elements during replay'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({
                  label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=command_interval' },
                    'Command Interval'
                  )
                }, displayConfig),
                react_default.a.createElement(
                  select_default.a,
                  {
                    style: { width: '200px' },
                    placeholder: 'interval',
                    value: '' + this.props.config.playCommandInterval,
                    onChange: function onChange(val) {
                      return onConfigChange('playCommandInterval', val);
                    }
                  },
                  react_default.a.createElement(
                    select_default.a.Option,
                    { value: '0' },
                    'Fast (no delay)'
                  ),
                  react_default.a.createElement(
                    select_default.a.Option,
                    { value: '0.3' },
                    'Medium (0.3s delay)'
                  ),
                  react_default.a.createElement(
                    select_default.a.Option,
                    { value: '2' },
                    'Slow (2s delay)'
                  )
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({
                  label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=timeout_pageload' },
                    '!TIMEOUT_PAGELOAD'
                  )
                }, displayConfig),
                react_default.a.createElement(input_default.a, {
                  type: 'number',
                  min: '0',
                  style: { width: '70px' },
                  value: this.props.config.timeoutPageLoad,
                  onChange: function onChange(e) {
                    return onConfigChange('timeoutPageLoad', e.target.value);
                  },
                  placeholder: 'in seconds'
                }),
                react_default.a.createElement(
                  'span',
                  { className: 'tip' },
                  'Max. time for new page load'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({
                  label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=timeout_wait' },
                    '!TIMEOUT_WAIT'
                  )
                }, displayConfig),
                react_default.a.createElement(input_default.a, {
                  type: 'number',
                  min: '0',
                  style: { width: '70px' },
                  value: this.props.config.timeoutElement,
                  onChange: function onChange(e) {
                    return onConfigChange('timeoutElement', e.target.value);
                  },
                  placeholder: 'in seconds'
                }),
                react_default.a.createElement(
                  'span',
                  { className: 'tip' },
                  'Max. time per step'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({
                  label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=timeout_macro' },
                    '!TIMEOUT_MACRO'
                  )
                }, displayConfig),
                react_default.a.createElement(input_default.a, {
                  type: 'number',
                  min: '0',
                  style: { width: '70px' },
                  value: this.props.config.timeoutMacro,
                  onChange: function onChange(e) {
                    return onConfigChange('timeoutMacro', e.target.value);
                  },
                  placeholder: 'in seconds'
                }),
                react_default.a.createElement(
                  'span',
                  { className: 'tip' },
                  'Max. overall macro runtime'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({
                  label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=timeout_download' },
                    '!TIMEOUT_DOWNLOAD'
                  )
                }, displayConfig),
                react_default.a.createElement(input_default.a, {
                  type: 'number',
                  min: '0',
                  style: { width: '70px' },
                  value: this.props.config.timeoutDownload,
                  onChange: function onChange(e) {
                    return onConfigChange('timeoutDownload', e.target.value);
                  },
                  placeholder: 'in seconds'
                }),
                react_default.a.createElement(
                  'span',
                  { className: 'tip' },
                  'Max. allowed time for file'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: 'If error happens in loop' }, displayConfig),
                react_default.a.createElement(
                  radio_default.a.Group,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('onErrorInLoop', e.target.value);
                    },
                    value: this.props.config.onErrorInLoop
                  },
                  react_default.a.createElement(
                    radio_default.a,
                    { value: 'continue_next_loop' },
                    'Continue next loop'
                  ),
                  react_default.a.createElement(
                    radio_default.a,
                    { value: 'stop' },
                    'Stop'
                  )
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: 'Default Vision Search Confidence' }, displayConfig),
                react_default.a.createElement(
                  select_default.a,
                  {
                    style: { width: '200px' },
                    placeholder: 'interval',
                    value: '' + this.props.config.defaultVisionSearchConfidence,
                    onChange: function onChange(val) {
                      return onConfigChange('defaultVisionSearchConfidence', parseFloat(val));
                    }
                  },
                  Object(utils["range"])(1, 11, 1).map(function (n) {
                    return react_default.a.createElement(
                      select_default.a.Option,
                      { key: n, value: '' + (0.1 * n).toFixed(1) },
                      (0.1 * n).toFixed(1)
                    );
                  })
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: react_default.a.createElement(
                    'a',
                    { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=cmdline' },
                    'Allow Command Line'
                  ) }, displayConfig),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('allowRunFromBookmark', e.target.checked);
                    },
                    checked: this.props.config.allowRunFromBookmark
                  },
                  'Run macro and test suite shortcuts from Javascript Bookmarklets'
                ),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('allowRunFromFileSchema', e.target.checked);
                    },
                    checked: this.props.config.allowRunFromFileSchema
                  },
                  'Run embedded macros from local files'
                ),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('allowRunFromHttpSchema', e.target.checked);
                    },
                    checked: this.props.config.allowRunFromHttpSchema
                  },
                  'Run embedded macros from public websites'
                )
              )
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Record', key: 'record', className: 'record-pane' },
            react_default.a.createElement(
              form_default.a,
              null,
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: 'Notification' }, displayConfig),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('recordNotification', e.target.checked);
                    },
                    checked: this.props.config.recordNotification
                  },
                  'Show notifications when recording'
                )
              ),
              react_default.a.createElement(
                form_default.a.Item,
                header_extends({ label: 'click / clickAt' }, displayConfig),
                react_default.a.createElement(
                  radio_default.a.Group,
                  {
                    onChange: function onChange(e) {
                      return onConfigChange('recordClickType', e.target.value);
                    },
                    value: this.props.config.recordClickType
                  },
                  react_default.a.createElement(
                    radio_default.a,
                    { value: 'click' },
                    'Record click'
                  ),
                  react_default.a.createElement(
                    radio_default.a,
                    { value: 'clickAt' },
                    'Record clickAt'
                  )
                )
              )
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Backup', key: 'backup', className: 'backup-pane' },
            react_default.a.createElement(
              'h4',
              null,
              'Automatic Backup'
            ),
            react_default.a.createElement(
              'p',
              null,
              'The automatic backup reminder helps to you to regularly export macros and other data as ZIP archive - so you don\'t loose your macros when you uninstall Kantu by mistake. The ZIP archive does not include data that is already stored directly on hard drive with the XFileAcess module.'
            ),
            react_default.a.createElement(
              'div',
              { className: 'row' },
              react_default.a.createElement(checkbox_default.a, {
                onChange: function onChange(e) {
                  return onConfigChange('enableAutoBackup', e.target.checked);
                },
                checked: this.props.config.enableAutoBackup
              }),
              react_default.a.createElement(
                'span',
                null,
                'Show backup reminder every'
              ),
              react_default.a.createElement(input_default.a, {
                type: 'number',
                min: 1,
                disabled: !this.props.config.enableAutoBackup,
                value: this.props.config.autoBackupInterval,
                onChange: function onChange(e) {
                  return onConfigChange('autoBackupInterval', e.target.value);
                },
                style: { width: '40px' }
              }),
              react_default.a.createElement(
                'span',
                null,
                ' days'
              )
            ),
            react_default.a.createElement(
              'div',
              { className: 'row' },
              react_default.a.createElement(
                'p',
                null,
                'Backup includes'
              ),
              react_default.a.createElement(
                'ul',
                null,
                react_default.a.createElement(
                  'li',
                  null,
                  react_default.a.createElement(checkbox_default.a, {
                    onChange: function onChange(e) {
                      return onConfigChange('autoBackupTestCases', e.target.checked);
                    },
                    checked: this.props.config.autoBackupTestCases
                  }),
                  react_default.a.createElement(
                    'span',
                    null,
                    'Macros'
                  )
                ),
                react_default.a.createElement(
                  'li',
                  null,
                  react_default.a.createElement(checkbox_default.a, {
                    onChange: function onChange(e) {
                      return onConfigChange('autoBackupTestSuites', e.target.checked);
                    },
                    checked: this.props.config.autoBackupTestSuites
                  }),
                  react_default.a.createElement(
                    'span',
                    null,
                    'Test suites'
                  )
                ),
                react_default.a.createElement(
                  'li',
                  null,
                  react_default.a.createElement(checkbox_default.a, {
                    onChange: function onChange(e) {
                      return onConfigChange('autoBackupScreenshots', e.target.checked);
                    },
                    checked: this.props.config.autoBackupScreenshots
                  }),
                  react_default.a.createElement(
                    'span',
                    null,
                    'Screenshots'
                  )
                ),
                react_default.a.createElement(
                  'li',
                  null,
                  react_default.a.createElement(checkbox_default.a, {
                    onChange: function onChange(e) {
                      return onConfigChange('autoBackupCSVFiles', e.target.checked);
                    },
                    checked: this.props.config.autoBackupCSVFiles
                  }),
                  react_default.a.createElement(
                    'span',
                    null,
                    'CSV files'
                  )
                ),
                react_default.a.createElement(
                  'li',
                  null,
                  react_default.a.createElement(checkbox_default.a, {
                    onChange: function onChange(e) {
                      return onConfigChange('autoBackupVisionImages', e.target.checked);
                    },
                    checked: this.props.config.autoBackupVisionImages
                  }),
                  react_default.a.createElement(
                    'span',
                    null,
                    'Visual UI Test images'
                  )
                )
              )
            ),
            react_default.a.createElement(
              'div',
              { className: 'row' },
              react_default.a.createElement(
                'span',
                null,
                'And you can also '
              ),
              react_default.a.createElement(
                button_default.a,
                {
                  type: 'primary',
                  onClick: function onClick() {
                    return _this5.props.runBackup();
                  }
                },
                'Run backup now'
              )
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Security', key: 'security', className: 'security-pane' },
            react_default.a.createElement(
              'h4',
              null,
              'Master password for Password Encryption'
            ),
            react_default.a.createElement(
              'p',
              null,
              'A master password is used to encrypt and decrypt all stored website passwords. The websites passwords are encrypted using strong encryption.\xA0\xA0',
              react_default.a.createElement(
                'a',
                { target: '_blank', href: 'https://a9t9.com/x/idehelp?help=encryption' },
                'More info >>'
              )
            ),
            react_default.a.createElement(
              'div',
              null,
              react_default.a.createElement(
                radio_default.a.Group,
                {
                  onChange: function onChange(e) {
                    return onConfigChange('shouldEncryptPassword', e.target.value);
                  },
                  value: this.props.config.shouldEncryptPassword
                },
                react_default.a.createElement(
                  radio_default.a,
                  { value: 'no' },
                  'Do not encrypt passwords'
                ),
                react_default.a.createElement(
                  radio_default.a,
                  { value: 'master_password' },
                  'Enter master password here to store it'
                )
              ),
              this.props.config.shouldEncryptPassword === 'master_password' ? react_default.a.createElement(
                'div',
                null,
                react_default.a.createElement(
                  'label',
                  null,
                  'Master password:'
                ),
                react_default.a.createElement(input_default.a, {
                  type: 'password',
                  style: { width: '200px' },
                  value: this.props.config.masterPassword,
                  onChange: function onChange(e) {
                    return onConfigChange('masterPassword', e.target.value);
                  }
                })
              ) : null
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'XModules', key: 'xmodules', className: 'xmodules-pane' },
            react_default.a.createElement(
              'div',
              { className: 'xmodule-item' },
              react_default.a.createElement(
                'div',
                { className: 'xmodule-title' },
                react_default.a.createElement(
                  'span',
                  null,
                  react_default.a.createElement(
                    'b',
                    null,
                    'FileAccess XModule'
                  ),
                  ' - Read and write to your hard drive'
                ),
                react_default.a.createElement(
                  'a',
                  { href: Object(xfile["getXFile"])().infoLink(), target: '_blank' },
                  'More Info'
                ),
                react_default.a.createElement(
                  button_default.a,
                  {
                    type: 'primary',
                    onClick: function onClick() {
                      Object(xfile["getXFile"])().getVersion().then(function (data) {
                        var installed = data.installed,
                            version = data.version;

                        var msg = installed ? 'Installed (v' + version + ')' : 'Not Installed';
                        message_default.a.info('status updated: ' + msg);

                        _this5.setState(Object(utils["updateIn"])(['xModuleData', Object(xfile["getXFile"])().getName()], function (orig) {
                          return header_extends({}, orig, data, { config: Object(xfile["getXFile"])().getCachedConfig() });
                        }, _this5.state));
                      });
                    }
                  },
                  'Test it'
                )
              ),
              react_default.a.createElement(
                'div',
                { className: 'xmodule-status' },
                react_default.a.createElement(
                  'label',
                  null,
                  'Status:'
                ),
                this.state.xModuleData[Object(xfile["getXFile"])().getName()] && this.state.xModuleData[Object(xfile["getXFile"])().getName()].installed ? react_default.a.createElement(
                  'div',
                  { className: 'status-box' },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Installed (v',
                    this.state.xModuleData[Object(xfile["getXFile"])().getName()].version,
                    ')'
                  ),
                  react_default.a.createElement(
                    'a',
                    {
                      target: '_blank',
                      href: Object(xfile["getXFile"])().checkUpdateLink(this.state.xModuleData[Object(xfile["getXFile"])().getName()] && this.state.xModuleData[Object(xfile["getXFile"])().getName()].version, web_extension_default.a.runtime.getManifest().version)
                    },
                    'Check for update'
                  )
                ) : react_default.a.createElement(
                  'div',
                  { className: 'status-box' },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Not Installed'
                  ),
                  react_default.a.createElement(
                    'a',
                    { href: Object(xfile["getXFile"])().downloadLink(), target: '_blank' },
                    'Download it'
                  )
                )
              ),
              react_default.a.createElement(
                'div',
                { className: 'xmodule-settings' },
                react_default.a.createElement(
                  'h3',
                  null,
                  'Settings'
                ),
                react_default.a.createElement(
                  'div',
                  { className: 'xmodule-settings-item' },
                  react_default.a.createElement(
                    'div',
                    { className: 'settings-detail' },
                    react_default.a.createElement(
                      'label',
                      null,
                      'Home Folder'
                    ),
                    react_default.a.createElement(
                      'div',
                      { className: 'settings-detail-content' },
                      react_default.a.createElement(input_default.a, {
                        type: 'text',
                        value: Object(xfile["getXFile"])().getCachedConfig().rootDir,
                        disabled: !(this.state.xModuleData[Object(xfile["getXFile"])().getName()] && this.state.xModuleData[Object(xfile["getXFile"])().getName()].installed),
                        onChange: function onChange(e) {
                          var rootDir = e.target.value;

                          _this5.setState(Object(utils["compose"])(Object(utils["setIn"])(['xModuleData', Object(xfile["getXFile"])().getName(), 'config', 'rootDir'], rootDir), Object(utils["setIn"])(['xFileRootDirChanged'], true))(_this5.state));

                          Object(xfile["getXFile"])().setConfig({ rootDir: rootDir });
                        },
                        onBlur: function onBlur() {
                          if (_this5.state.xFileRootDirChanged) {
                            _this5.setState({ xFileRootDirChanged: false });

                            Object(xfile["getXFile"])().sanityCheck().then(function () {
                              _this5.setState(Object(utils["setIn"])(['xModuleData', Object(xfile["getXFile"])().getName(), 'checkResult'], { error: null }, _this5.state));

                              Object(services_storage["getStorageManager"])().emit(services_storage["StorageManagerEvent"].RootDirChanged);
                            }, function (e) {
                              _this5.setState(Object(utils["setIn"])(['xModuleData', Object(xfile["getXFile"])().getName(), 'checkResult'], { error: e.message }, _this5.state));

                              _this5.props.updateUI({ showSettings: true, settingsTab: 'xmodules' });
                            });
                          }
                        }
                      }),
                      this.state.xModuleData[Object(xfile["getXFile"])().getName()] && this.state.xModuleData[Object(xfile["getXFile"])().getName()].checkResult && this.state.xModuleData[Object(xfile["getXFile"])().getName()].checkResult.error ? react_default.a.createElement(
                        'div',
                        { className: 'check-result' },
                        this.state.xModuleData[Object(xfile["getXFile"])().getName()].checkResult.error
                      ) : null
                    )
                  ),
                  react_default.a.createElement(
                    'div',
                    { className: 'settings-desc' },
                    'In this folder, Kantu creates /macros, /images, /testsuites, /datasources'
                  )
                )
              )
            ),
            react_default.a.createElement(
              'div',
              { className: 'xmodule-item' },
              react_default.a.createElement(
                'div',
                { className: 'xmodule-title' },
                react_default.a.createElement(
                  'span',
                  null,
                  react_default.a.createElement(
                    'b',
                    null,
                    'RealUser XModule'
                  ),
                  ' - Click / Type / Drag with OS native events'
                ),
                react_default.a.createElement(
                  'a',
                  { href: Object(x_user_io["getXUserIO"])().infoLink(), target: '_blank' },
                  'More Info'
                ),
                react_default.a.createElement(
                  button_default.a,
                  {
                    type: 'primary',
                    onClick: function onClick() {
                      Object(x_user_io["getXUserIO"])().getVersion().then(function (data) {
                        var installed = data.installed,
                            version = data.version;

                        var msg = installed ? 'Installed (v' + version + ')' : 'Not Installed';
                        message_default.a.info('status updated: ' + msg);

                        _this5.setState(Object(utils["updateIn"])(['xModuleData', Object(x_user_io["getXUserIO"])().getName()], function (orig) {
                          return header_extends({}, orig, data, { config: Object(x_user_io["getXUserIO"])().getCachedConfig() });
                        }, _this5.state));
                      });
                    }
                  },
                  'Test it'
                )
              ),
              react_default.a.createElement(
                'div',
                { className: 'xmodule-status' },
                react_default.a.createElement(
                  'label',
                  null,
                  'Status:'
                ),
                this.state.xModuleData[Object(x_user_io["getXUserIO"])().getName()] && this.state.xModuleData[Object(x_user_io["getXUserIO"])().getName()].installed ? react_default.a.createElement(
                  'div',
                  { className: 'status-box' },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Installed (v',
                    this.state.xModuleData[Object(x_user_io["getXUserIO"])().getName()].version,
                    ')'
                  ),
                  react_default.a.createElement(
                    'a',
                    {
                      target: '_blank',
                      href: Object(x_user_io["getXUserIO"])().checkUpdateLink(this.state.xModuleData[Object(x_user_io["getXUserIO"])().getName()] && this.state.xModuleData[Object(x_user_io["getXUserIO"])().getName()].version, web_extension_default.a.runtime.getManifest().version)
                    },
                    'Check for update'
                  )
                ) : react_default.a.createElement(
                  'div',
                  { className: 'status-box' },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Not Installed'
                  ),
                  react_default.a.createElement(
                    'a',
                    { href: Object(x_user_io["getXUserIO"])().downloadLink(), target: '_blank' },
                    'Download it'
                  )
                )
              )
            )
          )
        )
      );
    }
  }, {
    key: 'renderMainMenu',
    value: function renderMainMenu() {
      var _this6 = this;

      var _state = this.state,
          htmlUri = _state.htmlUri,
          jsonUri = _state.jsonUri;
      var _props = this.props,
          status = _props.status,
          editing = _props.editing;
      var commands = editing.commands,
          meta = editing.meta;
      var src = meta.src;

      var canPlay = this.props.player.status === constant["f" /* PLAYER_STATUS */].STOPPED;
      var downloadNamePrefix = src ? src.name : 'Untitled';

      var onClickMenuItem = function onClickMenuItem(_ref2) {
        var key = _ref2.key;

        switch (key) {
          case 'play_settings':
            {
              _this6.showSettingsModal();
              break;
            }
        }
      };

      return react_default.a.createElement(
        menu_default.a,
        { onClick: onClickMenuItem, selectable: false },
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'play_settings', disabled: !canPlay },
          'Replay settings..'
        )
      );
    }
  }, {
    key: 'renderStatus',
    value: function renderStatus() {
      var _props2 = this.props,
          status = _props2.status,
          player = _props2.player;

      var renderInner = function renderInner() {
        switch (status) {
          case constant["a" /* APP_STATUS */].RECORDER:
            return 'Recording';

          case constant["a" /* APP_STATUS */].PLAYER:
            {
              switch (player.status) {
                case constant["f" /* PLAYER_STATUS */].PLAYING:
                  {
                    var nextCommandIndex = player.nextCommandIndex,
                        loops = player.loops,
                        currentLoop = player.currentLoop,
                        timeoutStatus = player.timeoutStatus;


                    if (nextCommandIndex === null || loops === null || currentLoop === 0) {
                      return '';
                    }

                    var parts = ['Line ' + (nextCommandIndex + 1), 'Round ' + currentLoop + '/' + loops];

                    if (timeoutStatus && timeoutStatus.type && timeoutStatus.total) {
                      var type = timeoutStatus.type,
                          total = timeoutStatus.total,
                          past = timeoutStatus.past;

                      parts.unshift(type + ' ' + past / 1000 + 's (' + total / 1000 + ')');
                    }

                    return parts.join(' | ');
                  }

                case constant["f" /* PLAYER_STATUS */].PAUSED:
                  return 'Player paused';

                default:
                  return '';
              }
            }

          default:
            return '';
        }
      };

      return react_default.a.createElement(
        'div',
        { className: 'status' },
        renderInner()
      );
    }
  }, {
    key: 'renderActions',
    value: function renderActions() {
      var _this7 = this;

      var _props3 = this.props,
          testCases = _props3.testCases,
          editing = _props3.editing,
          player = _props3.player,
          status = _props3.status;


      var onClickMenuItem = function onClickMenuItem(_ref3) {
        var key = _ref3.key;

        switch (key) {
          case 'play_loop':
            {
              _this7.togglePlayLoopsModal(true);
              break;
            }
        }
      };

      var playMenu = react_default.a.createElement(
        menu_default.a,
        { onClick: onClickMenuItem, selectable: false },
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'play_loop', disabled: false },
          'Play loop..'
        )
      );

      if (status === constant["a" /* APP_STATUS */].RECORDER) {
        return react_default.a.createElement(
          'div',
          { className: 'actions' },
          react_default.a.createElement(
            button_default.a,
            {
              onClick: this.onToggleRecord,
              style: { color: '#ff0000' }
            },
            react_default.a.createElement(
              'span',
              null,
              'Stop Record'
            )
          )
        );
      }

      switch (player.status) {
        case constant["f" /* PLAYER_STATUS */].PLAYING:
          {
            return react_default.a.createElement(
              'div',
              { className: 'actions' },
              react_default.a.createElement(
                button_default.a.Group,
                null,
                react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.getPlayer().stop();
                    } },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Stop'
                  )
                ),
                react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.getPlayer('testCase').pause();
                    } },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Pause'
                  )
                )
              )
            );
          }

        case constant["f" /* PLAYER_STATUS */].PAUSED:
          {
            return react_default.a.createElement(
              'div',
              { className: 'actions' },
              react_default.a.createElement(
                button_default.a.Group,
                null,
                this.props.player.mode === constant["e" /* PLAYER_MODE */].TEST_CASE ? react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.getPlayer('testCase').resume(true);
                    } },
                  'Step'
                ) : null,
                react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.getPlayer().stop();
                    } },
                  'Stop'
                ),
                react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.getPlayer('testCase').resume();
                    } },
                  'Resume'
                )
              )
            );
          }

        case constant["f" /* PLAYER_STATUS */].STOPPED:
          {
            return react_default.a.createElement(
              'div',
              { className: 'actions' },
              react_default.a.createElement(
                button_default.a,
                {
                  onClick: this.onToggleRecord
                },
                react_default.a.createElement(
                  'span',
                  null,
                  'Record'
                )
              ),
              react_default.a.createElement(
                button_default.a.Group,
                { className: 'play-actions' },
                react_default.a.createElement(
                  button_default.a,
                  { onClick: function onClick() {
                      return _this7.playCurrentMacro(true);
                    } },
                  'Step'
                ),
                react_default.a.createElement(
                  dropdown_default.a.Button,
                  { onClick: function onClick() {
                      return _this7.playCurrentMacro(false);
                    }, overlay: playMenu },
                  react_default.a.createElement(
                    'span',
                    null,
                    'Play Macro'
                  )
                )
              ),
              react_default.a.createElement(
                button_default.a,
                { shape: 'circle', onClick: function onClick() {
                    return _this7.showSettingsModal();
                  } },
                react_default.a.createElement(icon_default.a, { type: 'setting' })
              )
            );
          }
      }
    }
  }, {
    key: 'renderMacro',
    value: function renderMacro() {
      var _props4 = this.props,
          testCases = _props4.testCases,
          editing = _props4.editing,
          player = _props4.player,
          hasUnsaved = _props4.hasUnsaved;
      var src = editing.meta.src;

      var isPlayerStopped = player.status === constant["f" /* PLAYER_STATUS */].STOPPED;
      var klass = hasUnsaved ? 'unsaved' : '';

      var saveBtnState = {
        text: src ? 'Save' : 'Save..',
        disabled: !hasUnsaved
      };

      return react_default.a.createElement(
        'div',
        { className: 'select-case' },
        react_default.a.createElement(
          'span',
          { className: 'test-case-name ' + klass },
          src ? src.name : 'Untitled'
        ),
        !isPlayerStopped ? null : react_default.a.createElement(
          button_default.a,
          { disabled: saveBtnState.disabled, onClick: this.onClickSave },
          react_default.a.createElement(
            'span',
            null,
            saveBtnState.text
          )
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _props5 = this.props,
          testCases = _props5.testCases,
          player = _props5.player;

      var isPlayerStopped = player.status === constant["f" /* PLAYER_STATUS */].STOPPED;

      testCases.sort(function (a, b) {
        var nameA = a.name.toLowerCase();
        var nameB = b.name.toLowerCase();

        if (nameA < nameB) return -1;
        if (nameA === nameB) return 0;
        return 1;
      });

      return react_default.a.createElement(
        'div',
        { className: 'header ' + this.props.status.toLowerCase() },
        this.renderMacro(),
        this.renderStatus(),
        this.renderActions(),
        this.renderPlayLoopModal(),
        this.renderSettingModal()
      );
    }
  }]);

  return Header;
}(react_default.a.Component);

/* harmony default export */ var components_header = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    hasUnsaved: hasUnsavedMacro(state),
    route: state.route,
    testCases: [].concat(header_toConsumableArray(state.editor.testCases)),
    editing: state.editor.editing,
    player: state.player,
    status: state.status,
    config: state.config,
    ui: state.ui
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(header_extends({}, actions_namespaceObject), dispatch);
})(Object(es["b" /* withRouter */])(header_Header)));
// EXTERNAL MODULE: ./node_modules/react-click-outside/build/index.js
var build = __webpack_require__(113);
var build_default = /*#__PURE__*/__webpack_require__.n(build);

// EXTERNAL MODULE: ./src/containers/sidebar/sidebar.scss
var sidebar = __webpack_require__(669);

// EXTERNAL MODULE: ./node_modules/antd/lib/alert/index.js
var lib_alert = __webpack_require__(442);
var alert_default = /*#__PURE__*/__webpack_require__.n(lib_alert);

// CONCATENATED MODULE: ./src/common/bookmark.js
var bookmark_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };



// Note: Get ids of bookmarks bar and other bookmarks
var pBookmarksBarId = function getIdsOfOtherBookmarksAndBookmarksBar() {
  var bookmarksBarIndex = web_extension_default.a.isFirefox() ? 1 : 0;

  return web_extension_default.a.bookmarks.getTree().then(function (nodes) {
    var bookmarksBar = nodes[0].children[bookmarksBarIndex];
    return bookmarksBar.id;
  });
}();

var bookmark_createBookmarkOnBar = function createBookmarkOnBar(bookmark) {
  return pBookmarksBarId.then(function (barId) {
    return web_extension_default.a.bookmarks.create(bookmark_extends({}, bookmark, { parentId: barId }));
  });
};
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(1);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);

// EXTERNAL MODULE: ./node_modules/react-codemirror2/index.js
var react_codemirror2 = __webpack_require__(114);

// EXTERNAL MODULE: ./node_modules/codemirror/lib/codemirror.js
var codemirror = __webpack_require__(94);

// EXTERNAL MODULE: ./node_modules/codemirror/mode/javascript/javascript.js
var javascript = __webpack_require__(229);

// EXTERNAL MODULE: ./node_modules/codemirror/addon/edit/matchbrackets.js
var matchbrackets = __webpack_require__(230);

// EXTERNAL MODULE: ./node_modules/codemirror/addon/edit/closebrackets.js
var closebrackets = __webpack_require__(231);

// EXTERNAL MODULE: ./node_modules/codemirror/lib/codemirror.css
var lib_codemirror = __webpack_require__(232);

// CONCATENATED MODULE: ./src/components/edit_test_suite.js


var edit_test_suite_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function edit_test_suite_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function edit_test_suite_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function edit_test_suite_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }











var edit_test_suite_EditTestSuite = function (_React$Component) {
  edit_test_suite_inherits(EditTestSuite, _React$Component);

  function EditTestSuite() {
    var _ref;

    var _temp, _this, _ret;

    edit_test_suite_classCallCheck(this, EditTestSuite);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = edit_test_suite_possibleConstructorReturn(this, (_ref = EditTestSuite.__proto__ || Object.getPrototypeOf(EditTestSuite)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      value: '',
      valueModified: null,
      errMsg: null
    }, _this.onSave = function () {
      var errMsg = null;

      try {
        _this.props.validate(_this.state.valueModified);
        _this.props.onChange(_this.state.valueModified);
      } catch (e) {
        errMsg = e.message;
      } finally {
        _this.setState({ errMsg: errMsg });
      }
    }, _temp), edit_test_suite_possibleConstructorReturn(_this, _ret);
  }

  edit_test_suite_createClass(EditTestSuite, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.setState({
        value: this.props.value,
        valueModified: this.props.value
      });
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (nextProps.value !== this.props.value) {
        this.setState({
          value: nextProps.value,
          valueModified: nextProps.value
        });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          visible: this.props.visible,
          okText: 'Save',
          onOk: this.onSave,
          onCancel: this.props.onClose,
          width: '80%'
        },
        react_default.a.createElement(
          'pre',
          { style: { color: 'red', lineHeight: '18px', marginBottom: '10px' } },
          this.state.errMsg
        ),
        react_default.a.createElement(react_codemirror2["UnControlled"], {
          className: this.state.sourceErrMsg ? 'has-error' : 'no-error',
          value: this.state.value,
          onChange: function onChange(editor, data, text) {
            return _this2.setState({ valueModified: text });
          },
          options: {
            mode: { name: 'javascript', json: true },
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true
          }
        })
      );
    }
  }]);

  return EditTestSuite;
}(react_default.a.Component);

edit_test_suite_EditTestSuite.propTypes = {
  value: prop_types_default.a.string.isRequired,
  onClose: prop_types_default.a.func.isRequired,
  visible: prop_types_default.a.bool,
  validate: prop_types_default.a.func,
  onChange: prop_types_default.a.func
};
edit_test_suite_EditTestSuite.defaultProps = {
  visible: false,
  validate: function validate() {
    return true;
  },
  onChange: function onChange() {}
};
/* harmony default export */ var edit_test_suite = (edit_test_suite_EditTestSuite);
// CONCATENATED MODULE: ./src/components/editable_text.js



var editable_text_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var editable_text_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function editable_text_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function editable_text_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function editable_text_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




var editable_text_EditableText = function (_React$Component) {
  editable_text_inherits(EditableText, _React$Component);

  function EditableText() {
    var _ref;

    var _temp, _this, _ret;

    editable_text_classCallCheck(this, EditableText);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = editable_text_possibleConstructorReturn(this, (_ref = EditableText.__proto__ || Object.getPrototypeOf(EditableText)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      isEditing: false
    }, _this.onChange = function (e) {
      _this.setState({
        value: e.target.value
      });
    }, _this.onKeyDown = function (e) {
      if (e.keyCode === 13) {
        _this.submit();
      } else if (e.keyCode === 27) {
        _this.setState({
          value: _this.props.value
        }, _this.submit);
      }
    }, _this.onBlur = function (e) {
      _this.submit();
    }, _this.onClickText = function () {
      if (_this.props.clickToEdit) {
        _this.setState({ isEditing: true });
      }
    }, _this.submit = function () {
      _this.setState({
        isEditing: false
      });

      if (_this.props.onChange) {
        _this.props.onChange(_this.state.value);
      }
    }, _temp), editable_text_possibleConstructorReturn(_this, _ret);
  }

  editable_text_createClass(EditableText, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.setState({
        isEditing: this.props.isEditing,
        value: this.props.value
      });

      if (this.props.isEditing) {
        this.focusOnInput();
      }
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      var nextState = {};

      if (this.props.isEditing !== nextProps.isEditing) {
        nextState.isEditing = nextProps.isEditing;

        if (nextState.isEditing) {
          this.focusOnInput();
        }
      }

      if (this.props.value !== nextProps.value) {
        nextState.value = nextProps.value;
      }

      this.setState(nextState);
    }
  }, {
    key: 'focusOnInput',
    value: function focusOnInput() {
      var _this2 = this;

      setTimeout(function () {
        var $input = _this2.input.refs.input;

        if ($input) {
          $input.focus();
          $input.selectionStart = 0;
          $input.selectionEnd = $input.value.length;
        }
      }, 200);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _state = this.state,
          isEditing = _state.isEditing,
          value = _state.value;


      return react_default.a.createElement(
        'div',
        { className: this.props.className },
        isEditing ? react_default.a.createElement(input_default.a, editable_text_extends({
          value: value,
          onChange: this.onChange,
          onBlur: this.onBlur,
          onKeyDown: this.onKeyDown,
          ref: function ref(_ref2) {
            _this3.input = _ref2;
          }
        }, this.props.inputProps || {})) : react_default.a.createElement(
          'span',
          { onClick: this.onClickText },
          react_default.a.createElement(
            'span',
            null,
            value
          ),
          this.props.clickToEdit ? react_default.a.createElement(icon_default.a, { type: 'edit', style: { marginLeft: '10px' } }) : null
        )
      );
    }
  }]);

  return EditableText;
}(react_default.a.Component);

editable_text_EditableText.propTypes = {
  value: prop_types_default.a.string,
  isEditing: prop_types_default.a.bool,
  onChange: prop_types_default.a.func,
  inputProps: prop_types_default.a.object,
  textProps: prop_types_default.a.object,
  className: prop_types_default.a.any,
  clickToEdit: prop_types_default.a.bool
};
/* harmony default export */ var editable_text = (editable_text_EditableText);
// CONCATENATED MODULE: ./src/containers/sidebar/test_suites.js

































var test_suites_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var test_suites_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function test_suites_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function test_suites_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function test_suites_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




















var test_suites_downloadTestSuite = function downloadTestSuite(ts, testCases) {
  var str = Object(convert_suite_utils["stringifyTestSuite"])({
    name: ts.name,
    cases: ts.cases
  }, testCases);
  var blob = new Blob([str], { type: 'text/plain;charset=utf-8' });

  // Note: must add third param as true here to remove BOM for UTF8 files
  // reference: https://github.com/eligrey/FileSaver.js/issues/432
  file_saver_default.a.saveAs(blob, 'suite_' + ts.name + '.json', true);
};

var test_suites_downloadTestSuiteAsHTML = function downloadTestSuiteAsHTML(ts) {
  var str = Object(convert_suite_utils["toHtml"])({ name: ts.name });
  var blob = new Blob([str], { type: 'text/plain;charset=utf-8' });

  file_saver_default.a.saveAs(blob, ts.name + '.html', true);
};

var test_suites_SidebarTestSuites = function (_React$Component) {
  test_suites_inherits(SidebarTestSuites, _React$Component);

  function SidebarTestSuites() {
    var _ref;

    var _temp, _this, _ret;

    test_suites_classCallCheck(this, SidebarTestSuites);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = test_suites_possibleConstructorReturn(this, (_ref = SidebarTestSuites.__proto__ || Object.getPrototypeOf(SidebarTestSuites)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      tsContextMenu: {
        x: null,
        y: null,
        isShown: false
      },

      tscContextMenu: {
        x: null,
        y: null,
        isShown: false
      },

      tsEditingNameIndex: -1,

      editTestSuiteSource: {
        ts: null,
        visible: false
      }
    }, _this.addTestSuite = function () {
      _this.props.addTestSuite({
        name: '__Untitled__',
        cases: []
      });
    }, _this.addTestCaseToTestSuite = function (ts) {
      _this.props.updateTestSuite(ts.id, {
        cases: ts.cases.concat({
          testCaseId: _this.props.testCases[0] && _this.props.testCases[0].id,
          loops: 1
        })
      });
    }, _this.removeTestCaseFromTestSuite = function (ts, index) {
      ts.cases.splice(index, 1);

      _this.props.updateTestSuite(ts.id, {
        cases: ts.cases,
        playStatus: function () {
          var _ts$playStatus = ts.playStatus,
              playStatus = _ts$playStatus === undefined ? {} : _ts$playStatus;
          var _playStatus$doneIndic = playStatus.doneIndices,
              doneIndices = _playStatus$doneIndic === undefined ? [] : _playStatus$doneIndic,
              _playStatus$errorIndi = playStatus.errorIndices,
              errorIndices = _playStatus$errorIndi === undefined ? [] : _playStatus$errorIndi;

          var updateIndex = function updateIndex(n) {
            if (n === undefined) return -1;
            if (n === index) return -1;
            if (n > index) return n - 1;
            return n;
          };

          return {
            errorIndices: errorIndices.map(updateIndex).filter(function (i) {
              return i !== -1;
            }),
            doneIndices: doneIndices.map(updateIndex).filter(function (i) {
              return i !== -1;
            })
          };
        }()
      });
    }, _this.toggleTestSuiteFold = function (ts) {
      _this.props.updateTestSuite(ts.id, {
        fold: !ts.fold
      });
    }, _this.foldAllTestSuites = function () {
      _this.props.testSuites.forEach(function (ts) {
        _this.props.updateTestSuite(ts.id, {
          fold: true
        });
      });
    }, _this.onClickTestSuiteMore = function (e, ts, tsIndex) {
      e.stopPropagation();
      e.preventDefault();

      var updated = {
        tsContextMenu: {
          x: e.clientX,
          y: e.clientY,
          isShown: true,
          ts: ts,
          tsIndex: tsIndex
        }

        // Note: to make it work in Firefox, have to delay this new state a little bit
        // Because hideTcContextMenu could be executed at the same time via clickOutside
      };setTimeout(function () {
        return _this.setState(updated);
      }, 20);
    }, _this.onClickTsTestCaseMore = function (e, tc, tcIndex, ts, tsIndex) {
      e.stopPropagation();
      e.preventDefault();

      var updated = {
        tscContextMenu: {
          x: e.clientX,
          y: e.clientY,
          isShown: true,
          tc: tc,
          ts: ts,
          tcIndex: tcIndex,
          tsIndex: tsIndex
        }

        // Note: to make it work in Firefox, have to delay this new state a little bit
        // Because hideTcContextMenu could be executed at the same time via clickOutside
      };setTimeout(function () {
        return _this.setState(updated);
      }, 20);
    }, _this.hideTsContextMenu = function () {
      _this.setState({
        tsContextMenu: test_suites_extends({}, _this.state.tsContextMenu, {
          isShown: false
        })
      });
    }, _this.hideTscContextMenu = function () {
      _this.setState({
        tscContextMenu: test_suites_extends({}, _this.state.tscContextMenu, {
          isShown: false
        })
      });
    }, _this.onTsMenuClick = function (_ref2, ts, tsIndex) {
      var key = _ref2.key;

      _this.hideTsContextMenu();

      switch (key) {
        case 'play':
          getPlayer({ name: 'testSuite' }).play({
            title: ts.name,
            extra: {
              id: ts.id,
              name: ts.name
            },
            mode: getPlayer().C.MODE.STRAIGHT,
            startIndex: 0,
            resources: ts.cases.map(function (item) {
              return {
                id: item.testCaseId,
                loops: item.loops
              };
            })
          });
          break;

        case 'edit_source':
          _this.setState({
            editTestSuiteSource: {
              ts: ts,
              visible: true
            }
          });
          break;

        case 'rename':
          _this.setState({
            tsEditingNameIndex: tsIndex
          });
          break;

        case 'export':
          test_suites_downloadTestSuite(ts, _this.props.testCases);
          break;

        case 'create_bookmark':
          {
            var bookmarkTitle = prompt('Title for this bookmark', '#' + ts.name + '.kantu');
            if (bookmarkTitle === null) return;

            return bookmark_createBookmarkOnBar(Object(convert_suite_utils["toBookmarkData"])({
              bookmarkTitle: bookmarkTitle,
              name: ts.name
            })).then(function () {
              message_default.a.success('successfully created bookmark!', 1.5);
            });
          }

        case 'export_html':
          {
            return test_suites_downloadTestSuiteAsHTML(ts);
          }

        case 'delete':
          modal_default.a.confirm({
            title: 'Are your sure to delete this test suite?',
            okText: 'Confirm',
            onOk: function onOk() {
              return _this.props.removeTestSuite(ts.id);
            }
          });
          break;
      }
    }, _this.onTscMenuClick = function (_ref3, tc, tcIndex, ts, tsIndex) {
      var key = _ref3.key;

      _this.hideTscContextMenu();

      switch (key) {
        case 'play_from_here':
          getPlayer({ name: 'testSuite' }).play({
            title: ts.name,
            extra: {
              id: ts.id,
              name: ts.name
            },
            mode: getPlayer().C.MODE.STRAIGHT,
            startIndex: tcIndex,
            resources: ts.cases.map(function (item) {
              return {
                id: item.testCaseId,
                loops: item.loops
              };
            })
          });
          break;
      }
    }, _this.onChangeTsName = function (val, ts, tsIndex) {
      _this.setState({
        tsEditingNameIndex: -1
      });

      _this.props.updateTestSuite(ts.id, {
        name: val
      });
    }, _this.onChangeTsCase = function (key, val, tcIndex, ts, tsIndex) {
      _this.props.updateTestSuite(ts.id, {
        cases: Object(utils["setIn"])([tcIndex, key], val, ts.cases)
      });
    }, _this.getTsTestCaseClass = function (tcIndex, tsPlayStatus) {
      if (!tsPlayStatus) return '';
      var _tsPlayStatus$doneInd = tsPlayStatus.doneIndices,
          doneIndices = _tsPlayStatus$doneInd === undefined ? [] : _tsPlayStatus$doneInd,
          _tsPlayStatus$errorIn = tsPlayStatus.errorIndices,
          errorIndices = _tsPlayStatus$errorIn === undefined ? [] : _tsPlayStatus$errorIn,
          currentIndex = tsPlayStatus.currentIndex;


      if (tcIndex === currentIndex) {
        return 'current-tc';
      } else if (errorIndices.indexOf(tcIndex) !== -1) {
        return 'error-tc';
      } else if (doneIndices.indexOf(tcIndex) !== -1) {
        return 'done-tc';
      } else {
        return '';
      }
    }, _this.onJSONFileChange = function (e) {
      setTimeout(function () {
        _this.jsonFileInput.value = null;
      }, 500);
      return _this.onReadFile(function (str) {
        return Object(convert_suite_utils["parseTestSuite"])(str, _this.props.testCases);
      })(e);
    }, _this.onReadFile = function (process) {
      return function (e) {
        var files = [].slice.call(e.target.files);
        if (!files || !files.length) return;

        var read = function read(file) {
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function (readerEvent) {
              try {
                var text = readerEvent.target.result;
                var obj = process(text, file.name);
                resolve({ data: obj });
              } catch (e) {
                resolve({ err: e, fileName: file.name });
              }
            };

            reader.readAsText(file);
          });
        };

        Promise.all(files.map(read)).then(function (list) {
          var doneList = list.filter(function (x) {
            return x.data;
          });
          var failList = list.filter(function (x) {
            return x.err;
          });

          _this.props.addTestSuites(doneList.map(function (x) {
            return x.data;
          })).then(function (_ref4) {
            var passCount = _ref4.passCount,
                failCount = _ref4.failCount,
                failTcs = _ref4.failTcs;

            message_default.a.info([passCount + ' test suite' + (passCount > 1 ? 's' : '') + ' imported!', failList.length + failCount + ' test suite' + (failList.length + failCount > 1 ? 's' : '') + ' failed!'].join(', '), 3);

            failList.forEach(function (fail) {
              _this.props.addLog('error', 'in parsing ' + fail.fileName + ': ' + fail.err.message);
            });

            failTcs.forEach(function (fail) {
              _this.props.addLog('error', 'duplicated test suite name: ' + fail.name);
            });
          });
        });
      };
    }, _this.onClosePlayTestSuiteTip = function () {
      _this.props.updateConfig({
        hidePlayTestSuiteTip: true
      });
    }, _temp), test_suites_possibleConstructorReturn(_this, _ret);
  }

  test_suites_createClass(SidebarTestSuites, [{
    key: 'getPortalContainer',
    value: function getPortalContainer() {
      var id = '__context_menu_container__';
      var $el = document.getElementById(id);
      if ($el) return $el;

      var $new = document.createElement('div');
      $new.id = id;
      document.body.appendChild($new);
      return $new;
    }
  }, {
    key: 'renderTestSuiteContextMenu',
    value: function renderTestSuiteContextMenu() {
      var _this2 = this;

      var contextMenu = this.state.tsContextMenu;
      var mw = 230;
      var x = contextMenu.x + window.scrollX;
      var y = contextMenu.y + window.scrollY;

      if (x - mw > 0) x -= mw;

      var style = {
        position: 'absolute',
        top: y,
        left: x,
        display: contextMenu.isShown ? 'block' : 'none'
      };

      var menuStyle = {
        width: mw + 'px'
      };

      var content = react_default.a.createElement(
        'div',
        { style: style, className: 'context-menu' },
        react_default.a.createElement(
          build_default.a,
          { onClickOutside: this.hideTsContextMenu },
          react_default.a.createElement(
            menu_default.a,
            {
              onClick: function onClick(e) {
                return _this2.onTsMenuClick(e, contextMenu.ts, contextMenu.tsIndex);
              },
              style: menuStyle,
              mode: 'vertical',
              selectable: false
            },
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'play' },
              'Play'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'edit_source' },
              'Edit source..'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'rename' },
              'Rename..'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'export' },
              'Export'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'export_html' },
              'Create HTML autorun page'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'create_bookmark' },
              'Add to Bookmarks'
            ),
            react_default.a.createElement(menu_default.a.Divider, null),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'delete' },
              'Delete'
            )
          )
        )
      );

      return react_dom_default.a.createPortal(content, this.getPortalContainer());
    }
  }, {
    key: 'renderTestSuiteCaseContextMenu',
    value: function renderTestSuiteCaseContextMenu() {
      var _this3 = this;

      var contextMenu = this.state.tscContextMenu;
      var mw = 150;
      var x = contextMenu.x + window.scrollX;
      var y = contextMenu.y + window.scrollY;

      if (x - mw > 0) x -= mw;

      var style = {
        position: 'absolute',
        top: y,
        left: x,
        display: contextMenu.isShown ? 'block' : 'none'
      };

      var menuStyle = {
        width: mw + 'px'
      };

      var content = react_default.a.createElement(
        'div',
        { style: style, className: 'context-menu' },
        react_default.a.createElement(
          build_default.a,
          { onClickOutside: this.hideTscContextMenu },
          react_default.a.createElement(
            menu_default.a,
            {
              onClick: function onClick(e) {
                return _this3.onTscMenuClick(e, contextMenu.tc, contextMenu.tcIndex, contextMenu.ts, contextMenu.tsIndex);
              },
              style: menuStyle,
              mode: 'vertical',
              selectable: false
            },
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'play_from_here' },
              'Replay from here'
            )
          )
        )
      );

      return react_dom_default.a.createPortal(content, this.getPortalContainer());
    }
  }, {
    key: 'renderTestSuiteMenu',
    value: function renderTestSuiteMenu() {
      var _this4 = this;

      var onClickMenuItem = function onClickMenuItem(_ref5) {
        var key = _ref5.key;

        switch (key) {
          case 'export_all':
            {
              var zip = new lib_default.a();

              if (_this4.props.testSuites.length === 0) {
                return message_default.a.error('No saved test suites to export', 1.5);
              }

              var genName = Object(utils["nameFactory"])();

              _this4.props.testSuites.forEach(function (ts) {
                var name = genName(ts.name);
                zip.file(name + '.json', Object(convert_suite_utils["stringifyTestSuite"])(ts, _this4.props.testCases));
              });

              zip.generateAsync({ type: 'blob' }).then(function (blob) {
                file_saver_default.a.saveAs(blob, 'all_suites.zip');
              });

              break;
            }

          case 'import':
            {
              break;
            }
        }
      };

      return react_default.a.createElement(
        menu_default.a,
        { onClick: onClickMenuItem, selectable: false },
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'export_all' },
          'Export all (JSON)'
        ),
        react_default.a.createElement(
          menu_default.a.Item,
          { key: '4' },
          react_default.a.createElement(
            'label',
            { htmlFor: 'select_json_files_for_ts' },
            'Import JSON'
          ),
          react_default.a.createElement('input', {
            multiple: true,
            type: 'file',
            accept: '.json',
            id: 'select_json_files_for_ts',
            onChange: this.onJSONFileChange,
            style: { display: 'none' },
            ref: function ref(el) {
              _this4.jsonFileInput = el;
            }
          })
        )
      );
    }
  }, {
    key: 'renderEditTestSuiteSource',
    value: function renderEditTestSuiteSource() {
      var _this5 = this;

      if (!this.state.editTestSuiteSource.visible) return null;
      var ts = this.state.editTestSuiteSource.ts;
      var source = Object(convert_suite_utils["stringifyTestSuite"])(ts, this.props.testCases);
      var testCases = this.props.testCases;

      return react_default.a.createElement(edit_test_suite, {
        visible: true,
        value: source,
        validate: function validate(text) {
          return Object(convert_suite_utils["validateTestSuiteText"])(text, testCases);
        },
        onClose: function onClose() {
          return _this5.setState({ editTestSuiteSource: { visible: false } });
        },
        onChange: function onChange(text) {
          var newTestSuite = Object(convert_suite_utils["parseTestSuite"])(text, testCases);

          _this5.props.updateTestSuite(ts.id, newTestSuite);
          _this5.setState({ editTestSuiteSource: { visible: false } });
        }
      });
    }
  }, {
    key: 'renderTestSuites',
    value: function renderTestSuites() {
      var _this6 = this;

      return react_default.a.createElement(
        'div',
        null,
        react_default.a.createElement(
          'div',
          { className: 'test-suite-actions' },
          react_default.a.createElement(
            button_default.a,
            { type: 'primary', onClick: this.addTestSuite },
            '+ Test Suite'
          ),
          react_default.a.createElement(
            button_default.a,
            { type: 'default', onClick: this.foldAllTestSuites },
            'Fold'
          ),
          react_default.a.createElement(
            dropdown_default.a,
            { overlay: this.renderTestSuiteMenu(), trigger: ['click'] },
            react_default.a.createElement(
              button_default.a,
              { shape: 'circle' },
              react_default.a.createElement(icon_default.a, { type: 'setting' })
            )
          )
        ),
        !this.props.config.hidePlayTestSuiteTip && this.props.testSuites.length > 0 ? react_default.a.createElement(alert_default.a, {
          type: 'info',
          message: 'Right click to play test suite',
          onClose: this.onClosePlayTestSuiteTip,
          closable: true,
          showIcon: true,
          style: { margin: '10px', paddingRight: '30px' }
        }) : null,
        this.props.testSuites.length === 0 ? react_default.a.createElement(
          'div',
          { className: 'no-data' },
          'No test suite'
        ) : null,
        react_default.a.createElement(
          'ul',
          { className: 'sidebar-test-suites' },
          this.props.testSuites.map(function (ts, tsIndex) {
            return react_default.a.createElement(
              'li',
              {
                key: ts.id,
                className: Object(utils["cn"])('test-suite-item ', {
                  fold: ts.fold,
                  playing: ts.playStatus && ts.playStatus.isPlaying
                })
              },
              react_default.a.createElement(
                'div',
                { className: 'test-suite-row',
                  onClick: function onClick() {
                    return _this6.toggleTestSuiteFold(ts);
                  },
                  onContextMenu: function onContextMenu(e) {
                    return _this6.onClickTestSuiteMore(e, ts, tsIndex);
                  }
                },
                react_default.a.createElement(icon_default.a, { type: ts.fold ? 'folder' : 'folder-open' }),
                react_default.a.createElement(editable_text, {
                  className: 'test-suite-title',
                  value: ts.name,
                  onChange: function onChange(val) {
                    return _this6.onChangeTsName(val, ts, tsIndex);
                  },
                  isEditing: tsIndex === _this6.state.tsEditingNameIndex,
                  inputProps: {
                    onClick: function onClick(e) {
                      return e.stopPropagation();
                    },
                    onContextMenu: function onContextMenu(e) {
                      return e.stopPropagation();
                    }
                  }
                }),
                tsIndex === _this6.state.tsEditingNameIndex ? null : react_default.a.createElement(icon_default.a, {
                  type: 'bars',
                  className: 'more-button',
                  onClick: function onClick(e) {
                    return _this6.onClickTestSuiteMore(e, ts, tsIndex);
                  }
                })
              ),
              ts.cases.length > 0 ? react_default.a.createElement(
                'ul',
                { className: 'test-suite-cases' },
                ts.cases.map(function (item, tcIndex) {
                  return react_default.a.createElement(
                    'li',
                    {
                      key: tcIndex,
                      className: _this6.getTsTestCaseClass(tcIndex, ts.playStatus),
                      onContextMenu: function onContextMenu(e) {
                        return _this6.onClickTsTestCaseMore(e, item, tcIndex, ts, tsIndex);
                      }
                    },
                    react_default.a.createElement(icon_default.a, {
                      type: 'file',
                      style: { marginRight: '10px', cursor: 'pointer' },
                      onClick: function onClick() {
                        var src = _this6.props.editing.meta.src;

                        var go = function go() {
                          _this6.props.editTestCase(item.testCaseId);
                          return Promise.resolve();
                        };

                        return getSaveTestCase().saveOrNot().then(go);
                      }
                    }),
                    react_default.a.createElement(
                      select_default.a,
                      {
                        showSearch: true,
                        optionFilterProp: 'children',
                        value: item.testCaseId,
                        onChange: function onChange(val) {
                          return _this6.onChangeTsCase('testCaseId', val, tcIndex, ts, tsIndex);
                        },
                        filterOption: function filterOption(input, data) {
                          return data.props.children.toLowerCase().indexOf(input.toLowerCase()) !== -1;
                        },
                        style: { flex: 1, marginRight: '10px', maxWidth: '50%' }
                      },
                      _this6.props.testCases.map(function (tc) {
                        return react_default.a.createElement(
                          select_default.a.Option,
                          { value: tc.id, key: tc.id },
                          tc.name
                        );
                      })
                    ),
                    react_default.a.createElement(input_default.a, {
                      type: 'number',
                      min: 1,
                      value: item.loops,
                      onChange: function onChange(e) {
                        return _this6.onChangeTsCase('loops', e.target.value.trim().length === 0 ? '1' : e.target.value, tcIndex, ts, tsIndex);
                      },
                      style: { width: '45px', marginRight: '10px' }
                    }),
                    react_default.a.createElement(icon_default.a, {
                      type: 'close',
                      style: { cursor: 'pointer' },
                      onClick: function onClick() {
                        return _this6.removeTestCaseFromTestSuite(ts, tcIndex);
                      }
                    })
                  );
                })
              ) : null,
              react_default.a.createElement(
                'div',
                { className: 'test-suite-more-actions' },
                react_default.a.createElement(
                  button_default.a,
                  {
                    type: 'default',
                    onClick: function onClick() {
                      return _this6.addTestCaseToTestSuite(ts);
                    }
                  },
                  '+ Macro'
                )
              )
            );
          })
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      return react_default.a.createElement(
        'div',
        null,
        this.renderTestSuites(),
        this.renderTestSuiteContextMenu(),
        this.renderTestSuiteCaseContextMenu(),
        this.renderEditTestSuiteSource()
      );
    }
  }]);

  return SidebarTestSuites;
}(react_default.a.Component);

/* harmony default export */ var test_suites = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    status: state.status,
    testCases: state.editor.testCases,
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(test_suites_extends({}, actions_namespaceObject), dispatch);
})(test_suites_SidebarTestSuites));
// CONCATENATED MODULE: ./src/components/search_box.js




var search_box_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var search_box_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function search_box_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function search_box_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function search_box_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }



var search_box_SearchBox = function (_Input) {
  search_box_inherits(SearchBox, _Input);

  function SearchBox() {
    search_box_classCallCheck(this, SearchBox);

    return search_box_possibleConstructorReturn(this, (SearchBox.__proto__ || Object.getPrototypeOf(SearchBox)).apply(this, arguments));
  }

  search_box_createClass(SearchBox, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _ref = this.props.inputProps || {},
          value = _ref.value;

      var canClear = value !== undefined && value.length > 0;

      return react_default.a.createElement(
        'span',
        {
          className: this.props.className,
          style: search_box_extends({}, this.props.style || {}, {
            position: 'relative'
          })
        },
        react_default.a.createElement(input_default.a, this.props.inputProps || {}),
        react_default.a.createElement(icon_default.a, {
          type: canClear ? 'close' : 'search',
          onClick: function onClick(e) {
            if (!canClear) return;
            if (!_this2.props.inputProps || !_this2.props.inputProps.onChange) return;
            _this2.props.inputProps.onChange({ target: { value: '' } });
          },
          style: {
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            cursor: canClear ? 'pointer' : 'auto'
          }
        })
      );
    }
  }]);

  return SearchBox;
}(input_default.a);

/* harmony default export */ var search_box = (search_box_SearchBox);
// CONCATENATED MODULE: ./src/containers/sidebar/test_cases.js





































var test_cases_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var test_cases_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function test_cases_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function test_cases_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function test_cases_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




















var test_cases_downloadTestCaseAsJSON = function downloadTestCaseAsJSON(tc) {
  var str = Object(convert_utils["toJSONString"])({ name: tc.name, commands: tc.data.commands });
  var blob = new Blob([str], { type: 'text/plain;charset=utf-8' });

  file_saver_default.a.saveAs(blob, tc.name + '.json', true);
};

var test_cases_downloadTestCaseAsHTML = function downloadTestCaseAsHTML(tc) {
  var str = Object(convert_utils["toHtml"])({ name: tc.name, commands: tc.data.commands });
  var blob = new Blob([str], { type: 'text/plain;charset=utf-8' });

  file_saver_default.a.saveAs(blob, tc.name + '.html', true);
};

var test_cases_SidebarTestCases = function (_React$Component) {
  test_cases_inherits(SidebarTestCases, _React$Component);

  function SidebarTestCases() {
    var _ref;

    var _temp, _this, _ret;

    test_cases_classCallCheck(this, SidebarTestCases);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = test_cases_possibleConstructorReturn(this, (_ref = SidebarTestCases.__proto__ || Object.getPrototypeOf(SidebarTestCases)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      searchText: '',

      showDuplicate: false,
      duplicateName: '',

      showRename: false,
      rename: '',

      tcContextMenu: {
        x: null,
        y: null,
        isShown: false
      }

      // Rename relative
    }, _this.onClickRename = function () {
      _this.props.renameTestCase(_this.state.rename, _this.state.renameTcId).then(function () {
        message_default.a.success('successfully renamed!', 1.5);
        _this.toggleRenameModal(false);
      }).catch(function (e) {
        message_default.a.error(e.message, 1.5);
      });
    }, _this.onCancelRename = function () {
      _this.toggleRenameModal(false);
      _this.setState({
        rename: null
      });
    }, _this.onChangeRename = function (e) {
      _this.setState({
        rename: e.target.value
      });
    }, _this.onClickDuplicate = function () {
      _this.props.duplicateTestCase(_this.state.duplicateName, _this.state.duplicateTcId).then(function () {
        message_default.a.success('successfully duplicated!', 1.5);
      });
      _this.toggleDuplicateModal(false);
    }, _this.onCancelDuplicate = function () {
      _this.toggleDuplicateModal(false);
    }, _this.onChangeDuplicate = function (e) {
      _this.setState({
        duplicateName: e.target.value
      });
    }, _this.toggleDuplicateModal = function (toShow, tc) {
      var duplicateName = tc ? tc.name + '_new' : '';

      _this.setState({
        showDuplicate: toShow,
        duplicateTcId: tc && tc.id,
        duplicateName: duplicateName
      });

      if (toShow) {
        setTimeout(function () {
          var input = _this.inputDuplicateTestCase.refs.input;
          input.focus();
          input.selectionStart = input.selectionEnd = input.value.length;
        }, 100);
      }
    }, _this.toggleRenameModal = function (toShow, tc) {
      _this.setState({
        showRename: toShow,
        renameTcId: tc && tc.id
      });

      if (toShow) {
        setTimeout(function () {
          var input = _this.inputRenameTestCase.refs.input;
          input.focus();
          input.selectionStart = input.selectionEnd = input.value.length;
        }, 100);
      }
    }, _this.getItemKlass = function (tc) {
      var src = _this.props.editing.meta.src;
      var klasses = [];

      if (src && src.id === tc.id) klasses.push('selected');

      if (tc.status === constant["h" /* TEST_CASE_STATUS */].SUCCESS) klasses.push('success');else if (tc.status === constant["h" /* TEST_CASE_STATUS */].ERROR) klasses.push('error');else klasses.push('normal');

      if (_this.props.status !== constant["a" /* APP_STATUS */].NORMAL) {
        klasses.push('disabled');
      }

      return klasses.join(' ');
    }, _this.changeTestCase = function (id) {
      return new Promise(function (resolve) {
        if (_this.props.status !== constant["a" /* APP_STATUS */].NORMAL) return resolve(false);
        if (_this.props.editing.meta.src && _this.props.editing.meta.src.id === id) return resolve(true);

        var go = function go() {
          _this.props.editTestCase(id);
          resolve(true);
        };

        return getSaveTestCase().saveOrNot().then(go);
      });
    }, _this.playTestCase = function (id) {
      if (_this.props.status !== constant["a" /* APP_STATUS */].NORMAL) return;

      _this.changeTestCase(id).then(function (shouldPlay) {
        if (!shouldPlay) return;

        setTimeout(function () {
          var commands = _this.props.editing.commands;

          var openTc = commands.find(function (tc) {
            return tc.cmd.toLowerCase() === 'open';
          });
          var src = _this.props.editing.meta.src;

          var getTestCaseName = function getTestCaseName() {
            return src && src.name && src.name.length ? src.name : 'Untitled';
          };

          _this.props.playerPlay({
            title: getTestCaseName(),
            extra: {
              id: src && src.id
            },
            mode: getPlayer().C.MODE.STRAIGHT,
            startIndex: 0,
            startUrl: openTc ? openTc.target : null,
            resources: commands,
            postDelay: _this.props.player.playInterval * 1000
          });
        }, 500);
      });
    }, _this.onReadFile = function (process) {
      return function (e) {
        var files = [].slice.call(e.target.files);
        if (!files || !files.length) return;

        var read = function read(file) {
          return new Promise(function (resolve, reject) {
            var reader = new FileReader();

            reader.onload = function (readerEvent) {
              try {
                var text = readerEvent.target.result;
                var obj = process(text, file.name);
                resolve({ data: obj });
              } catch (e) {
                resolve({ err: e, fileName: file.name });
              }
            };

            reader.readAsText(file);
          });
        };

        Promise.all(files.map(read)).then(function (list) {
          var doneList = list.filter(function (x) {
            return x.data;
          });
          var failList = list.filter(function (x) {
            return x.err;
          });

          _this.props.addTestCases(doneList.map(function (x) {
            return x.data;
          })).then(function (_ref2) {
            var passCount = _ref2.passCount,
                failCount = _ref2.failCount,
                failTcs = _ref2.failTcs;

            message_default.a.info([passCount + ' macro' + (passCount > 1 ? 's' : '') + ' imported!', failList.length + failCount + ' macro' + (failList.length + failCount > 1 ? 's' : '') + ' failed!'].join(', '), 3);

            failList.forEach(function (fail) {
              _this.props.addLog('error', 'in parsing ' + fail.fileName + ': ' + fail.err.message);
            });

            failTcs.forEach(function (fail) {
              _this.props.addLog('error', 'duplicated macro name: ' + fail.name);
            });
          });
        });
      };
    }, _this.onHTMLFileChange = function (e) {
      // Note: clear file input, so that we can fire onFileChange when users selects the same file next time
      setTimeout(function () {
        _this.htmlFileInput.value = null;
      }, 500);
      return _this.onReadFile(convert_utils["fromHtml"])(e);
    }, _this.onJSONFileChange = function (e) {
      setTimeout(function () {
        _this.jsonFileInput.value = null;
      }, 500);
      return _this.onReadFile(convert_utils["fromJSONString"])(e);
    }, _this.addTestCase = function () {
      var src = _this.props.editing.meta.src;

      var go = function go() {
        _this.props.editNewTestCase();
        return Promise.resolve();
      };

      return getSaveTestCase().saveOrNot().then(go);
    }, _this.onClickTestCaseMore = function (e, tc, tcIndex) {
      e.stopPropagation();
      e.preventDefault();

      var updated = {
        tcContextMenu: {
          x: e.clientX,
          y: e.clientY,
          isShown: true,
          tc: tc,
          tcIndex: tcIndex
        }

        // Note: to make it work in Firefox, have to delay this new state a little bit
        // Because hideTcContextMenu could be executed at the same time via clickOutside
      };setTimeout(function () {
        return _this.setState(updated);
      }, 20);
    }, _this.hideTcContextMenu = function () {
      _this.setState({
        tcContextMenu: test_cases_extends({}, _this.state.tcContextMenu, {
          isShown: false
        })
      });
    }, _this.onTcMenuClick = function (_ref3, tc, tcIndex) {
      var key = _ref3.key;

      _this.hideTcContextMenu();

      switch (key) {
        case 'play':
          {
            return _this.playTestCase(tc.id);
          }

        case 'rename':
          {
            _this.setState({
              rename: tc.name
            });
            _this.toggleRenameModal(true, tc);
            break;
          }

        case 'delete':
          {
            var go = function go() {
              return _this.props.removeTestCase(tc.id).then(function () {
                message_default.a.success('successfully deleted!', 1.5);
              }).catch(function (e) {
                modal_default.a.warning({
                  title: 'Failed to delete',
                  content: e.message
                });
              });
            };

            return modal_default.a.confirm({
              title: 'Sure to delete?',
              content: 'Do you really want to delete "' + tc.name + '"?',
              okText: 'Delete',
              cancelText: 'Cancel',
              onOk: go,
              onCancel: function onCancel() {}
            });
          }

        case 'duplicate':
          {
            return _this.toggleDuplicateModal(true, tc);
          }

        case 'export_html':
          {
            return test_cases_downloadTestCaseAsHTML(tc);
          }

        case 'export_json':
          {
            return test_cases_downloadTestCaseAsJSON(tc);
          }

        case 'create_bookmark':
          {
            var bookmarkTitle = prompt('Title for this bookmark', '#' + tc.name + '.kantu');
            if (bookmarkTitle === null) return;

            return bookmark_createBookmarkOnBar(Object(convert_utils["toBookmarkData"])({
              bookmarkTitle: bookmarkTitle,
              name: tc.name
            })).then(function () {
              message_default.a.success('successfully created bookmark!', 1.5);
            });
          }

        case 'copy_to_xfile':
          {
            return Object(services_storage["getStorageManager"])().isStrategyTypeAvailable(services_storage["StorageStrategyType"].XFile).then(function () {
              var macroStorage = Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].Macro, services_storage["StorageStrategyType"].XFile);
              var tcCopy = test_cases_extends({}, tc, { id: Object(utils["uid"])() });

              delete tcCopy.status;
              return macroStorage.write(tcCopy.name, tcCopy).then(function () {
                return message_default.a.success('copied');
              });
            }).catch(function (e) {
              _this.props.updateUI({ showFileNotInstalledDialog: 1 });
            });
          }

        case 'copy_to_browser':
          {
            return Object(services_storage["getStorageManager"])().isStrategyTypeAvailable(services_storage["StorageStrategyType"].Browser).then(function () {
              var macroStorage = Object(services_storage["getStorageManager"])().getStorageForTarget(services_storage["StorageTarget"].Macro, services_storage["StorageStrategyType"].Browser);
              var tcCopy = test_cases_extends({}, tc, { id: Object(utils["uid"])() });

              delete tcCopy.status;
              return macroStorage.write(tcCopy.name, tcCopy).then(function () {
                return message_default.a.success('copied');
              });
            }).catch(function (e) {
              message_default.a.warn(e.message);
            });
          }
      }
    }, _temp), test_cases_possibleConstructorReturn(_this, _ret);
  }

  // Duplicate relative


  test_cases_createClass(SidebarTestCases, [{
    key: 'renderTestCases',
    value: function renderTestCases() {
      var _this2 = this;

      var isEditingUntitled = !this.props.editing.meta.src;
      var testCases = this.props.testCases;
      var searchText = this.state.searchText;

      var trimSearchText = searchText.trim().toLowerCase();
      var matchText = trimSearchText.length === 0 ? function (x) {
        return x;
      } : function (x) {
        return x.name.toLowerCase().indexOf(trimSearchText) !== -1;
      };
      var candidates = testCases.filter(matchText);

      candidates.sort(function (a, b) {
        var nameA = a.name.toLowerCase();
        var nameB = b.name.toLowerCase();

        if (nameA < nameB) return -1;
        if (nameA === nameB) return 0;
        return 1;
      });

      return react_default.a.createElement(
        'ul',
        { className: 'sidebar-test-cases' },
        candidates.length === 0 && !isEditingUntitled ? react_default.a.createElement(
          'div',
          { className: 'no-data' },
          'No macros yet'
        ) : null,
        isEditingUntitled ? react_default.a.createElement(
          'li',
          { className: 'selected' },
          'Untitled'
        ) : null,
        candidates.map(function (tc, tcIndex) {
          return react_default.a.createElement(
            'li',
            {
              key: tc.id,
              className: _this2.getItemKlass(tc),
              onClick: function onClick() {
                return _this2.changeTestCase(tc.id);
              },
              onDoubleClick: function onDoubleClick() {
                return _this2.playTestCase(tc.id);
              },
              onContextMenu: function onContextMenu(e) {
                return _this2.onClickTestCaseMore(e, tc, tcIndex);
              }
            },
            react_default.a.createElement(
              'span',
              { className: 'test-case-name' },
              tc.name
            ),
            react_default.a.createElement(icon_default.a, {
              type: 'bars',
              className: 'more-button',
              onClick: function onClick(e) {
                return _this2.onClickTestCaseMore(e, tc, tcIndex);
              }
            })
          );
        })
      );
    }
  }, {
    key: 'getPortalContainer',
    value: function getPortalContainer() {
      var id = '__context_menu_container__';
      var $el = document.getElementById(id);
      if ($el) return $el;

      var $new = document.createElement('div');
      $new.id = id;
      document.body.appendChild($new);
      return $new;
    }
  }, {
    key: 'renderTestCaseContextMenu',
    value: function renderTestCaseContextMenu() {
      var _this3 = this;

      var contextMenu = this.state.tcContextMenu;
      var mw = 230;
      var x = contextMenu.x + window.scrollX;
      var y = contextMenu.y + window.scrollY;
      var $box = document.querySelector('.sidebar-inner');

      if ($box && y + 220 > $box.clientHeight) y -= 220;

      if (x - mw > 0) x -= mw;

      var style = {
        position: 'absolute',
        top: y,
        left: x,
        display: contextMenu.isShown ? 'block' : 'none'
      };

      var menuStyle = {
        width: mw + 'px'
      };

      var content = react_default.a.createElement(
        'div',
        { style: style, className: 'context-menu' },
        react_default.a.createElement(
          build_default.a,
          { onClickOutside: this.hideTcContextMenu },
          react_default.a.createElement(
            menu_default.a,
            {
              onClick: function onClick(e) {
                return _this3.onTcMenuClick(e, contextMenu.tc, contextMenu.tcIndex);
              },
              style: menuStyle,
              mode: 'vertical',
              selectable: false
            },
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'play' },
              'Play'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'rename' },
              'Rename..'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'duplicate' },
              'Duplicate..'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'export_json' },
              'Export as JSON'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'export_html' },
              'Export as HTML (plus autorun)'
            ),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'create_bookmark' },
              'Add shortcut to bookmarks bar'
            ),
            Object(services_storage["getStorageManager"])().isXFileMode() ? react_default.a.createElement(
              menu_default.a.Item,
              { key: 'copy_to_browser' },
              'Copy to Local Storage'
            ) : null,
            Object(services_storage["getStorageManager"])().isBrowserMode() ? react_default.a.createElement(
              menu_default.a.Item,
              { key: 'copy_to_xfile' },
              'Copy to Macro Folder'
            ) : null,
            react_default.a.createElement(menu_default.a.Divider, null),
            react_default.a.createElement(
              menu_default.a.Item,
              { key: 'delete' },
              'Delete'
            )
          )
        )
      );

      return react_dom_default.a.createPortal(content, this.getPortalContainer());
    }
  }, {
    key: 'renderTestCaseMenu',
    value: function renderTestCaseMenu() {
      var _this4 = this;

      var onClickMenuItem = function onClickMenuItem(_ref4) {
        var key = _ref4.key;

        switch (key) {
          case 'export_all_json':
            {
              var zip = new lib_default.a();

              if (_this4.props.testCases.length === 0) {
                return message_default.a.error('No saved macros to export', 1.5);
              }

              _this4.props.testCases.forEach(function (tc) {
                zip.file(tc.name + '.json', Object(convert_utils["toJSONString"])({
                  name: tc.name,
                  commands: tc.data.commands
                }));
              });

              zip.generateAsync({ type: 'blob' }).then(function (blob) {
                file_saver_default.a.saveAs(blob, 'all_test_cases.zip');
              });

              break;
            }

          case 'import':
            {
              break;
            }
        }
      };

      return react_default.a.createElement(
        menu_default.a,
        { onClick: onClickMenuItem, selectable: false },
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'export_all_json' },
          'Export All (JSON)'
        ),
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'import_json' },
          react_default.a.createElement(
            'label',
            { htmlFor: 'select_json_files_for_macros' },
            'Import JSON'
          ),
          react_default.a.createElement('input', {
            multiple: true,
            type: 'file',
            accept: '.json',
            id: 'select_json_files_for_macros',
            onChange: this.onJSONFileChange,
            ref: function ref(_ref5) {
              _this4.jsonFileInput = _ref5;
            },
            style: { display: 'none' }
          })
        ),
        react_default.a.createElement(
          menu_default.a.Item,
          { key: 'import_html' },
          react_default.a.createElement(
            'label',
            { htmlFor: 'select_html_files' },
            'Import HTML'
          ),
          react_default.a.createElement('input', {
            multiple: true,
            type: 'file',
            accept: '.html,.htm',
            id: 'select_html_files',
            onChange: this.onHTMLFileChange,
            ref: function ref(_ref6) {
              _this4.htmlFileInput = _ref6;
            },
            style: { display: 'none' }
          })
        )
      );
    }
  }, {
    key: 'renderDuplicateModal',
    value: function renderDuplicateModal() {
      var _this5 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'Duplicate Macro..',
          okText: 'Save',
          cancelText: 'Cancel',
          visible: this.state.showDuplicate,
          onOk: this.onClickDuplicate,
          onCancel: this.onCancelDuplicate,
          className: 'duplicate-modal'
        },
        react_default.a.createElement(input_default.a, {
          style: { width: '100%' },
          value: this.state.duplicateName,
          onKeyDown: function onKeyDown(e) {
            if (e.keyCode === 13) _this5.onClickDuplicate();
          },
          onChange: this.onChangeDuplicate,
          placeholder: 'macro name',
          ref: function ref(el) {
            _this5.inputDuplicateTestCase = el;
          }
        })
      );
    }
  }, {
    key: 'renderRenameModal',
    value: function renderRenameModal() {
      var _this6 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'Rename the macro as..',
          okText: 'Save',
          cancelText: 'Cancel',
          visible: this.state.showRename,
          onOk: this.onClickRename,
          onCancel: this.onCancelRename,
          className: 'rename-modal'
        },
        react_default.a.createElement(input_default.a, {
          style: { width: '100%' },
          value: this.state.rename,
          onKeyDown: function onKeyDown(e) {
            if (e.keyCode === 13) _this6.onClickRename();
          },
          onChange: this.onChangeRename,
          placeholder: 'macro name',
          ref: function ref(el) {
            _this6.inputRenameTestCase = el;
          }
        })
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this7 = this;

      return react_default.a.createElement(
        'div',
        null,
        react_default.a.createElement(
          'div',
          { className: 'test-case-actions' },
          react_default.a.createElement(
            button_default.a,
            { type: 'primary', onClick: this.addTestCase },
            '+ Macro'
          ),
          react_default.a.createElement(
            dropdown_default.a,
            { overlay: this.renderTestCaseMenu(), trigger: ['click'] },
            react_default.a.createElement(
              button_default.a,
              { shape: 'circle' },
              react_default.a.createElement(icon_default.a, { type: 'setting' })
            )
          ),
          react_default.a.createElement(search_box, {
            style: { flex: 1 },
            inputProps: {
              placeholder: 'search macro',
              value: this.state.searchText,
              onChange: function onChange(e) {
                return _this7.setState({ searchText: e.target.value });
              }
            }
          })
        ),
        this.renderTestCases(),
        this.renderTestCaseContextMenu(),
        this.renderDuplicateModal(),
        this.renderRenameModal()
      );
    }
  }]);

  return SidebarTestCases;
}(react_default.a.Component);

/* harmony default export */ var test_cases = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    status: state.status,
    testCases: state.editor.testCases,
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(test_cases_extends({}, actions_namespaceObject), dispatch);
})(test_cases_SidebarTestCases));
// CONCATENATED MODULE: ./src/containers/sidebar/index.js











var sidebar_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var sidebar_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function sidebar_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function sidebar_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function sidebar_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }














var sidebar_Sidebar = function (_React$Component) {
  sidebar_inherits(Sidebar, _React$Component);

  function Sidebar() {
    var _ref;

    var _temp, _this, _ret;

    sidebar_classCallCheck(this, Sidebar);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = sidebar_possibleConstructorReturn(this, (_ref = Sidebar.__proto__ || Object.getPrototypeOf(Sidebar)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      drag: {
        isDragging: false,
        startX: 0,
        movingX: 0,
        lastWidth: 260,
        currentMinWidth: 260
      }
    }, _this.getSideBarMinWidth = function () {
      var _this$state$drag = _this.state.drag,
          isDragging = _this$state$drag.isDragging,
          lastWidth = _this$state$drag.lastWidth,
          currentMinWidth = _this$state$drag.currentMinWidth;

      return (isDragging ? currentMinWidth : lastWidth) + 'px';
    }, _this.onResizeDragStart = function (e) {
      // Note: Firefox requires us to set something to DataTransfer, otherwise drag and dragEnd won't be triggered
      // refer to https://stackoverflow.com/questions/33434275/firefox-on-drag-end-is-not-called-in-a-react-component
      e.dataTransfer.setData('text', '');

      var style = window.getComputedStyle(_this.$dom);
      var width = parseInt(style.width);

      _this.setState(Object(utils["setIn"])(['drag'], {
        isDragging: true,
        // Check out the note on `screenX` in `onResizeDragEnd` event
        startX: e.screenX,
        lastWidth: width,
        currentWidth: width
      }, _this.state));
    }, _this.onResizeDragEnd = function (e) {
      // Note: use `screenX` instead of `clientX`, because `clientX` of dragEnd events in Firefox
      // is always set to 0, while `screenX` is luckily still available. And since we only make use of
      // difference of X coordinate. `screenX` and `clientX` both work for us.
      //
      // reference:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
      // https://developer.mozilla.org/en-US/docs/Web/Events/dragend
      var diff = e.screenX - _this.state.drag.startX;
      var width = diff + _this.state.drag.lastWidth;

      _this.setState(Object(utils["setIn"])(['drag'], {
        isDragging: false,
        startX: 0,
        lastWidth: width,
        currentMinWidth: width
      }));
    }, _this.onTryToChangeStorageMode = function (storageMode) {
      // Steps:
      // 1. [pseudo code] StorageManager.changeMode()
      // 2. Try to refresh / reload all resources (macros, test suites, csvs, vision images)
      // 3. Be aware of any pending changes in current storage
      //
      // There should be no exception when switching back to browser mode
      // But `[pseudo code] StorageManager.changeMode(xFileMode)` should throw error when xFile is not ready.
      //
      // Once catched that error, should do following:
      // 1. Reset mode back to browser mode
      // 2. Show info dialog to encourage users to download xFile host

      var man = Object(services_storage["getStorageManager"])();

      man.isStrategyTypeAvailable(storageMode).then(function (isOk) {
        if (isOk) {
          // Note: it will emit events, so that `index.js` could handle the rest (refresh / reload resources)
          _this.props.updateConfig({ storageMode: storageMode });
          return man.setCurrentStrategyType(storageMode);
        }

        throw new Error('It should be impossible to get isOk as false');
      }).catch(function (e) {
        message_default.a.warn(e.message);

        if (e.message && /xFile is not installed yet/.test(e.message)) {
          _this.props.updateUI({ showFileNotInstalledDialog: true });
        } else {
          _this.props.updateUI({ showSettings: true, settingsTab: 'xmodules' });
        }
      });
    }, _temp), sidebar_possibleConstructorReturn(_this, _ret);
  }

  sidebar_createClass(Sidebar, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var type = Object(services_storage["getStorageManager"])().getCurrentStrategyType();
      this.setState({ storageMode: type });
    }
  }, {
    key: 'prefixHardDisk',
    value: function prefixHardDisk(str) {
      var isXFileMode = Object(services_storage["getStorageManager"])().isXFileMode();
      if (!isXFileMode) return str;

      return react_default.a.createElement(
        'div',
        {
          style: {
            display: 'inline-block'
          }
        },
        react_default.a.createElement('img', {
          src: './img/hard-drive.svg',
          style: {
            position: 'relative',
            top: '3px',
            marginRight: '5px',
            height: '15px'
          }
        }),
        react_default.a.createElement(
          'span',
          null,
          str
        )
      );
    }
  }, {
    key: 'renderXFileNotInstalledModal',
    value: function renderXFileNotInstalledModal() {
      var _this2 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: '',
          className: Object(utils["cn"])('xfile-not-installed-modal', { 'left-bottom': this.props.ui.showFileNotInstalledDialog === true }),
          width: 350,
          footer: null,
          visible: this.props.ui.showFileNotInstalledDialog,
          onCancel: function onCancel() {
            _this2.props.updateUI({ showFileNotInstalledDialog: false });
          }
        },
        react_default.a.createElement(
          'p',
          null,
          'XFileAccess Module not installed.'
        ),
        react_default.a.createElement(
          'div',
          null,
          react_default.a.createElement(
            button_default.a,
            {
              type: 'primary',
              onClick: function onClick() {
                _this2.props.updateUI({
                  showFileNotInstalledDialog: false,
                  showSettings: true,
                  settingsTab: 'xmodules'
                });
              }
            },
            'Open Settings'
          )
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      return react_default.a.createElement(
        'div',
        {
          className: 'sidebar',
          ref: function ref(el) {
            _this3.$dom = el;
          },
          style: { minWidth: this.getSideBarMinWidth() }
        },
        react_default.a.createElement(
          'div',
          { className: 'sidebar-inner' },
          react_default.a.createElement(
            tabs_default.a,
            {
              defaultActiveKey: 'macros',
              activeKey: this.props.ui.sidebarTab || 'macros',
              onChange: function onChange(activeKey) {
                return _this3.props.updateUI({ sidebarTab: activeKey });
              }
            },
            react_default.a.createElement(
              tabs_default.a.TabPane,
              { tab: this.prefixHardDisk('Macros'), key: 'macros' },
              react_default.a.createElement(test_cases, null)
            ),
            react_default.a.createElement(
              tabs_default.a.TabPane,
              { tab: this.prefixHardDisk('Test Suites'), key: 'test_suites' },
              react_default.a.createElement(test_suites, null)
            )
          )
        ),
        react_default.a.createElement(
          'div',
          { className: 'sidebar-storage-mode' },
          react_default.a.createElement(
            'div',
            { className: 'storage-mode-header' },
            react_default.a.createElement(
              'h3',
              null,
              'Storage Mode'
            ),
            Object(services_storage["getStorageManager"])().isXFileMode() ? react_default.a.createElement('img', {
              src: './img/reload.svg',
              title: 'Reload all resources on hard drive',
              style: {
                height: '15px',
                cursor: 'pointer'
              },
              onClick: function onClick() {
                Object(services_storage["getStorageManager"])().emit(services_storage["StorageManagerEvent"].ForceReload);
                message_default.a.info('reloaded from hard drive');
              }
            }) : null,
            react_default.a.createElement(
              'a',
              { href: 'https://a9t9.com/x/idehelp?help=storage_mode', target: '_blank' },
              'More Info'
            )
          ),
          react_default.a.createElement(
            select_default.a,
            {
              style: { width: '100%' },
              placeholder: 'Storage Mode',
              value: this.props.config.storageMode,
              onChange: this.onTryToChangeStorageMode
            },
            react_default.a.createElement(
              select_default.a.Option,
              { value: services_storage["StorageStrategyType"].Browser },
              'Local Storage (in browser)'
            ),
            react_default.a.createElement(
              select_default.a.Option,
              { value: services_storage["StorageStrategyType"].XFile },
              'File system (on hard drive)'
            )
          )
        ),
        react_default.a.createElement('div', {
          className: Object(utils["cn"])('resize-handler', { focused: this.state.drag.isDragging }),
          draggable: 'true',
          onDragStart: this.onResizeDragStart,
          onDragEnd: this.onResizeDragEnd,
          onMouseDown: function onMouseDown() {
            return _this3.setState(Object(utils["setIn"])(['drag', 'isDragging'], true, _this3.state));
          }
        }),
        this.renderXFileNotInstalledModal()
      );
    }
  }]);

  return Sidebar;
}(react_default.a.Component);

/* harmony default export */ var containers_sidebar = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    status: state.status,
    testCases: state.editor.testCases,
    testSuites: state.editor.testSuites,
    editing: state.editor.editing,
    player: state.player,
    config: state.config,
    ui: state.ui
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(sidebar_extends({}, actions_namespaceObject), dispatch);
})(sidebar_Sidebar));
// EXTERNAL MODULE: ./src/containers/dashboard/dashboard.scss
var dashboard = __webpack_require__(672);

// EXTERNAL MODULE: ./node_modules/antd/lib/table/index.js
var table = __webpack_require__(82);
var table_default = /*#__PURE__*/__webpack_require__.n(table);

// EXTERNAL MODULE: ./node_modules/react-virtual-list/lib/VirtualList.js
var VirtualList = __webpack_require__(443);
var VirtualList_default = /*#__PURE__*/__webpack_require__.n(VirtualList);

// EXTERNAL MODULE: ./src/common/inspector.js
var inspector = __webpack_require__(31);

// CONCATENATED MODULE: ./src/containers/dashboard/editor.js








































var editor_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var editor_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function editor_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function editor_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function editor_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function editor_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function editor_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }
























var availableCommands = ['open', 'click', 'clickAndWait', 'select', 'selectAndWait', 'type', 'pause', 'waitForPageToLoad', 'selectFrame', 'assertAlert', 'assertConfirmation', 'assertPrompt', 'answerOnNextPrompt', 'store', 'storeText', 'storeTitle', 'storeAttribute', 'assertText', 'assertTitle', 'clickAt', 'echo', 'mouseOver', 'storeEval', 'verifyText', 'verifyTitle', 'sendKeys', 'dragAndDropToObject', 'selectWindow', 'captureScreenshot', 'refresh', 'verifyElementPresent', 'assertElementPresent', 'deleteAllCookies', 'label', 'gotoLabel', 'gotoIf', 'while', 'endWhile', 'csvRead', 'csvSave', 'if', 'else', 'endif', 'storeValue', 'assertValue', 'verifyValue', 'storeChecked', 'assertChecked', 'verifyChecked', 'captureEntirePageScreenshot', 'onDownload',
// 'assertError',
// 'verifyError',
'throwError', 'comment', 'waitForVisible', 'onError', 'sourceSearch', 'sourceExtract', 'storeImage', 'localStorageExport',
// 'visionFind',
'visionLimitSearchArea', 'visualSearch', 'visualVerify', 'visualAssert', 'editContent', 'bringBrowserToForeground', 'resize', 'XClick', 'XType', 'XMove'];

availableCommands.sort(function (a, b) {
  return a.toLowerCase() < b.toLowerCase() ? -1 : 1;
});

var newCommand = {
  cmd: '',
  target: '',
  value: ''
};

var defaultDataSource = [newCommand];

var editor_DashboardEditor = function (_React$Component) {
  editor_inherits(DashboardEditor, _React$Component);

  function DashboardEditor() {
    var _ref;

    var _temp, _this, _ret;

    editor_classCallCheck(this, DashboardEditor);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = editor_possibleConstructorReturn(this, (_ref = DashboardEditor.__proto__ || Object.getPrototypeOf(DashboardEditor)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      cursor: null,

      contextMenu: {
        x: null,
        y: null,
        isShown: false
      },

      visionFindPreview: {
        visible: false,
        url: null,
        timer: null,
        left: -9999,
        top: -9999
      }
    }, _this.resetSourceCodeCursor = function (resetCursor) {
      return editor_extends({}, resetCursor ? { cursor: { line: 0, ch: 0 } } : {});
    }, _this.onDetailChange = function (key, value) {
      _this.props.updateSelectedCommand(editor_defineProperty({}, key, value));
    }, _this.onChangeCommandsView = function (type) {
      switch (type) {
        case 'table_view':
        case 'source_view':
          {
            var forceType = _this.props.sourceErrMsg ? 'source_view' : type;

            _this.props.setEditorActiveTab(forceType);

            if (type === 'source_view' && _this.codeMirror && _this.state.cursor) {
              // Note: must delay a while so that focus will take effect
              setTimeout(function () {
                _this.codeMirror.setCursor(_this.state.cursor, true, true);
              }, 200);
            }

            break;
          }
      }
    }, _this.onSourceBlur = function () {
      var _this$props = _this.props,
          sourceTextModified = _this$props.sourceTextModified,
          sourceText = _this$props.sourceText;

      _this.props.saveSourceCodeToEditing(sourceTextModified);
    }, _this.onChangeEditSource = function (editor, data, text) {
      _this.props.setSourceCurrent(text);
    }, _this.onClickFind = function () {
      var lastOperation = _this.state.lastOperation;
      var selectedCommand = _this.props.selectedCommand;


      var p = ['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) !== -1 ? function () {
        var selectedIndex = _this.props.editing.meta.selectedIndex;
        // Note: run visionFind/visualSearch as single line command, but without timeout waiting
        _this.playLine(selectedIndex, {
          overrideScope: { '!TIMEOUT_WAIT': 0 },
          commandExtra: { throwError: true }
        });
        return Promise.resolve(true);
      }() : ipc_cs["a" /* default */].ask('PANEL_HIGHLIGHT_DOM', {
        lastOperation: lastOperation,
        locator: selectedCommand.target
      });

      p.catch(function (e) {
        message_default.a.error(e.message, 1.5);
      });
    }, _this.onToggleInspect = function () {
      var selectedCommand = _this.props.selectedCommand;


      if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) !== -1) {
        return ipc_cs["a" /* default */].ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE').then(function (res) {
          _this.props.updateSelectedCommand({ target: res.fileName });
          message_default.a.success('Saved vision as ' + res.fileName);
        }).catch(function (e) {
          message_default.a.error(e.message);
        });
      }

      if (_this.props.status === constant["a" /* APP_STATUS */].INSPECTOR) {
        _this.props.stopInspecting();
      } else {
        _this.props.startInspecting();
      }
    }, _this.onDoubleClick = function () {
      var lastScreenX = void 0;
      var lastScreenY = void 0;
      var lastTime = void 0;

      return function (e) {
        var go = function go() {
          var $row = inspector["a" /* default */].parentWithClass('real-command', e.target);
          if (!$row) return;

          var index = parseInt($row.getAttribute('data-index'));
          if (isNaN(index)) return;

          _this.playLine(index);
        };

        var now = new Date() * 1;

        if (lastScreenX === e.screenX && lastScreenY === e.screenY && now - lastTime < 300) {
          go();
        }

        lastScreenX = e.screenX;
        lastScreenY = e.screenY;
        lastTime = now;
      };
    }(), _this.scheduleHideVisionFindPreview = function () {
      Object(common_log["a" /* default */])('scheduleHideVisionFindPreview');
      var timer = _this.state.visionFindPreview.timer;


      clearTimeout(timer);

      return setTimeout(function () {
        var visible = _this.state.visionFindPreview.visible;


        if (visible) {
          Object(common_log["a" /* default */])('to hide preview');

          _this.setState({
            visionFindPreview: {
              visible: false
            }
          });
        }
      }, 3000);
    }, _this.onMouseEnterTarget = function (e, command) {
      Object(common_log["a" /* default */])('onMouseOverTarget');
      if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(command.cmd) === -1) return;
      if (['XClick', 'XMove'].indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target)) return;
      if (_this.state.visionFindPreview.visible) return;

      clearTimeout(_this.state.visionFindPreview.timer);

      var visionStorage = Object(services_storage["getStorageManager"])().getVisionStorage();
      var rect = e.target.getBoundingClientRect();
      var file = command.target.trim().split('@')[0];
      var common = {
        visible: true,
        left: rect.left,
        top: rect.top + rect.height
      };

      visionStorage.exists(file).then(function (existed) {
        if (!existed) {
          return _this.setState({
            visionFindPreview: editor_extends({}, common, {
              url: './img/not_found.png',
              timer: _this.scheduleHideVisionFindPreview()
            })
          });
        }

        return visionStorage.getLink(file).then(function (link) {
          return _this.setState({
            visionFindPreview: editor_extends({}, common, {
              url: link,
              timer: _this.scheduleHideVisionFindPreview()
            })
          });
        });
      });
    }, _this.onMouseLeaveTarget = function (e, command) {
      Object(common_log["a" /* default */])('onMouseOutTarget');
      if (['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(command.cmd) === -1) return;
      if (['XClick', 'XMove'].indexOf(command.cmd) !== -1 && !/\.png/i.test(command.target)) return;
      if (!_this.state.visionFindPreview.visible) return;

      clearTimeout(_this.state.visionFindPreview.timer);

      _this.setState({
        visionFindPreview: {
          visible: false
        }
      });
    }, _this.jumpToSourceCode = function (commandIndex) {
      _this.props.setEditorActiveTab('source_view');
      setTimeout(function () {
        var instance = _this.state.cmEdtiorInstance;
        var line = 3 + commandIndex * 5;
        var endLine = line + 5;
        var ch = 0;

        var $tab = document.querySelector('.source-view');
        var tabHeight = parseInt(window.getComputedStyle($tab).height, 10);
        var margin = (tabHeight - 60) / 2;

        Object(common_log["a" /* default */])('margin', margin, tabHeight);
        instance.scrollIntoView({ line: line, ch: ch }, margin);
        instance.setSelection({ ch: ch, line: line }, { ch: ch, line: endLine }, { scroll: false });
      }, 100);
    }, _this.commandClassName = function (record, index) {
      var _this$props2 = _this.props,
          editing = _this$props2.editing,
          player = _this$props2.player;
      var nextCommandIndex = player.nextCommandIndex,
          errorCommandIndices = player.errorCommandIndices,
          doneCommandIndices = player.doneCommandIndices,
          breakpointIndices = player.breakpointIndices;
      var commands = editing.commands;

      var classNames = [];

      if (breakpointIndices.indexOf(index) !== -1) {
        classNames.push('breakpoint-command');
      }

      if (record.cmd === 'comment') {
        classNames.push('comment-command');
      }

      if (index === editing.meta.selectedIndex) {
        classNames.push('selected-command');
      } else if (index === nextCommandIndex) {
        classNames.push('running-command');
      } else if (errorCommandIndices.indexOf(index) !== -1) {
        classNames.push('error-command');
      } else if (doneCommandIndices.indexOf(index) !== -1) {
        classNames.push('done-command');
      }

      return classNames.join(' ');
    }, _this.needVirtualList = function () {
      var _this$props$editing$c = _this.props.editing.commands,
          commands = _this$props$editing$c === undefined ? [] : _this$props$editing$c;

      var threshold = 0;

      return commands.length >= threshold;
    }, _this.virtualCommmandList = function (_ref2) {
      var virtual = _ref2.virtual,
          itemHeight = _ref2.itemHeight;
      var commands = _this.props.editing.commands;

      var editable = _this.isPlayerStopped();
      var renderItem = function renderItem(item) {
        if (item.header) {
          return react_default.a.createElement(
            'div',
            { className: 'command-row header-row', key: 'header' },
            react_default.a.createElement(
              'div',
              { className: 'row-col command-col' },
              'Command'
            ),
            react_default.a.createElement(
              'div',
              { className: 'row-col target-col' },
              'Target'
            ),
            react_default.a.createElement(
              'div',
              { className: 'row-col value-col' },
              'Value'
            ),
            react_default.a.createElement(
              'div',
              { className: 'row-col op-col' },
              'Ops'
            )
          );
        }

        if (item.footer) {
          return react_default.a.createElement(
            'div',
            { className: 'command-row footer-row', key: 'footer', onClick: function onClick() {
                return _this.props.insertCommand(newCommand, commands.length);
              } },
            'Add'
          );
        }

        return react_default.a.createElement(
          'div',
          {
            key: item.key,
            style: { height: itemHeight + 'px' },
            className: 'command-row real-command ' + _this.commandClassName(item, item.realIndex),
            'data-index': '' + item.realIndex,
            onClick: function onClick() {
              return _this.props.selectCommand(item.realIndex);
            },
            onContextMenu: function onContextMenu(e) {
              return _this.onContextMenu(e, item.realIndex);
            }
          },
          react_default.a.createElement(
            'div',
            { className: 'row-col command-col', title: item.cmd },
            item.cmd
          ),
          react_default.a.createElement(
            'div',
            {
              className: 'row-col target-col',
              title: item.target,
              onMouseEnter: function onMouseEnter(e) {
                return _this.onMouseEnterTarget(e, item);
              },
              onMouseLeave: function onMouseLeave(e) {
                return _this.onMouseLeaveTarget(e, item);
              }
            },
            item.target
          ),
          react_default.a.createElement(
            'div',
            { className: 'row-col value-col', title: item.value },
            item.value
          ),
          react_default.a.createElement(
            'div',
            { className: 'row-col op-col' },
            react_default.a.createElement(
              button_default.a,
              {
                disabled: !editable,
                shape: 'circle',
                onClick: function onClick(e) {
                  _this.props.removeCommand(item.realIndex);e.stopPropagation();
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'minus' })
            ),
            react_default.a.createElement(
              button_default.a,
              {
                disabled: !editable,
                shape: 'circle',
                onClick: function onClick(e) {
                  _this.props.duplicateCommand(item.realIndex);e.stopPropagation();
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'plus' })
            )
          )
        );
      };

      return react_default.a.createElement(
        'div',
        { style: virtual.style },
        virtual.items.map(renderItem)
      );
    }, _this.onContextMenu = function (e, index) {
      Object(common_log["a" /* default */])('onContextMenu');

      _this.setState({
        contextMenu: {
          x: e.clientX,
          y: e.clientY,
          isShown: true,
          commandIndex: index
        }
      });

      _this.props.selectCommand(index, true);
      e.preventDefault();
      e.stopPropagation();
    }, _this.onHideMenu = function (e) {
      if (e.button !== 0) return;

      _this.setState({
        contextMenu: editor_extends({}, _this.state.contextMenu, {
          isShown: false
        })
      });
    }, _this.getTestCaseName = function () {
      var src = _this.props.editing.meta.src;

      return src && src.name && src.name.length ? src.name : 'Untitled';
    }, _this.playLine = function (commandIndex) {
      var extraOptions = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var commands = _this.props.editing.commands;
      var src = _this.props.editing.meta.src;


      _this.setState({ lastOperation: 'play' });

      return _this.props.playerPlay(editor_extends({
        title: _this.getTestCaseName(),
        extra: {
          id: src && src.id
        },
        mode: player_Player.C.MODE.SINGLE,
        startIndex: commandIndex,
        startUrl: null,
        resources: commands,
        postDelay: _this.props.config.playCommandInterval * 1000
      }, extraOptions));
    }, _temp), editor_possibleConstructorReturn(_this, _ret);
  }

  // Note: virtual-list eats up double click events. so have to manually track click event instead


  editor_createClass(DashboardEditor, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      document.addEventListener('click', this.onHideMenu);
      document.addEventListener('click', this.onDoubleClick);
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      // Note: update sourceText whenever editing changed
      if (nextProps.editing.meta.src !== this.props.editing.meta.src || nextProps.editing.commands !== this.props.editing.commands) {
        var resetCursor = nextProps.editing.meta.src !== this.props.editing.meta.src;

        this.setState(this.resetSourceCodeCursor(resetCursor));
      }

      if (nextProps.status === constant["a" /* APP_STATUS */].PLAYER && nextProps.player.nextCommandIndex !== this.props.player.nextCommandIndex) {
        var $tableBody = document.querySelector('.table-wrapper');
        var itemHeight = 45;

        if (!$tableBody) return;

        $tableBody.scrollTop = itemHeight * nextProps.player.nextCommandIndex;
      }

      if (nextProps.status === constant["a" /* APP_STATUS */].RECORDER && nextProps.editing.commands.length > this.props.editing.commands.length) {
        var _$tableBody = document.querySelector('.table-wrapper');
        var _itemHeight = 45;

        if (!_$tableBody) return;

        setTimeout(function () {
          _$tableBody.scrollTop = _itemHeight * nextProps.editing.commands.length * 2;
        }, 100);
      }
    }
  }, {
    key: 'isPlayerStopped',
    value: function isPlayerStopped() {
      return this.props.player.status === constant["f" /* PLAYER_STATUS */].STOPPED;
    }
  }, {
    key: 'renderVisionFindPreview',
    value: function renderVisionFindPreview() {
      var _state$visionFindPrev = this.state.visionFindPreview,
          visible = _state$visionFindPrev.visible,
          url = _state$visionFindPrev.url,
          left = _state$visionFindPrev.left,
          top = _state$visionFindPrev.top;

      if (!visible) return null;

      return react_default.a.createElement('div', { style: {
          position: 'absolute',
          width: '100px',
          height: '100px',
          border: '1px solid #ccc',
          left: left + 'px',
          top: top + 'px',
          backgroundColor: '#eee',
          backgroundImage: 'url(' + url + ')',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        } });
    }
  }, {
    key: 'renderContextMenu',
    value: function renderContextMenu() {
      var _this2 = this;

      var clipboard = this.props.clipboard;
      var contextMenu = this.state.contextMenu;

      var dw = document.documentElement.clientWidth;
      var dh = document.documentElement.clientHeight;
      var mw = 240;
      var x = contextMenu.x + window.scrollX;
      var y = contextMenu.y + window.scrollY;

      if (x + mw > dw) x -= mw;

      var style = {
        position: 'absolute',
        top: y,
        left: x,
        display: contextMenu.isShown ? 'block' : 'none'
      };

      var menuStyle = {
        width: mw + 'px'
      };

      var commandIndex = contextMenu.commandIndex;
      var breakpointIndices = this.props.player.breakpointIndices;

      var isBreakpoint = breakpointIndices.indexOf(commandIndex);

      var handleClick = function handleClick(e) {
        switch (e.key) {
          case 'cut':
            return _this2.props.cutCommand(commandIndex);
          case 'copy':
            return _this2.props.copyCommand(commandIndex);
          case 'paste':
            return _this2.props.pasteCommand(commandIndex);
          case 'insert':
            return _this2.props.insertCommand(newCommand, commandIndex + 1);
          case 'run_line':
            {
              return _this2.playLine(commandIndex);
            }
          case 'run_from_here':
            {
              var commands = _this2.props.editing.commands;
              var src = _this2.props.editing.meta.src;


              _this2.setState({ lastOperation: 'play' });

              return _this2.props.playerPlay({
                title: _this2.getTestCaseName(),
                extra: {
                  id: src && src.id
                },
                mode: player_Player.C.MODE.STRAIGHT,
                startIndex: commandIndex,
                startUrl: null,
                resources: commands,
                postDelay: _this2.props.config.playCommandInterval * 1000
              });
            }
          case 'add_breakpoint':
            {
              return _this2.props.addBreakpoint(commandIndex);
            }
          case 'remove_breakpoint':
            {
              return _this2.props.removeBreakpoint(commandIndex);
            }
          case 'jump_to_source_code':
            {
              return _this2.jumpToSourceCode(commandIndex);
            }
        }
      };

      return react_default.a.createElement(
        'div',
        { style: style, id: 'context_menu' },
        react_default.a.createElement(
          menu_default.a,
          { onClick: handleClick, style: menuStyle, mode: 'vertical', selectable: false },
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'cut' },
            'Cut'
          ),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'copy' },
            'Copy'
          ),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'paste', disabled: clipboard.commands.length === 0 },
            'Paste'
          ),
          react_default.a.createElement(menu_default.a.Divider, null),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'insert' },
            'Insert new line'
          ),
          react_default.a.createElement(menu_default.a.Divider, null),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'jump_to_source_code' },
            'Jump to source code'
          ),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: isBreakpoint ? 'add_breakpoint' : 'remove_breakpoint' },
            isBreakpoint ? 'Add breakpoint' : 'Remove breakpoint'
          ),
          react_default.a.createElement(menu_default.a.Divider, null),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'run_line' },
            'Execute this command'
          ),
          react_default.a.createElement(
            menu_default.a.Item,
            { key: 'run_from_here' },
            'Run from here'
          )
        )
      );
    }
  }, {
    key: 'renderTable',
    value: function renderTable() {
      var _props = this.props,
          editing = _props.editing,
          player = _props.player;
      var commands = editing.commands;

      var dataSource = (commands && commands.length ? commands : defaultDataSource).map(function (command, i) {
        return editor_extends({}, command, {
          key: Math.random(),
          realIndex: i
        });
      });

      return this.needVirtualList() ? this.renderVirtualTable(dataSource) : this.renderNormalTable(dataSource);
    }
  }, {
    key: 'renderVirtualTable',
    value: function renderVirtualTable(dataSource) {
      var CommandVirtualList = VirtualList_default()({ container: this.listContainer })(this.virtualCommmandList);
      var paddedDataSource = [{ header: true }].concat(editor_toConsumableArray(dataSource), [{ footer: true }]);

      return react_default.a.createElement(
        'div',
        { className: 't-body' },
        !this.listContainer ? null : react_default.a.createElement(CommandVirtualList, { itemHeight: 45, items: paddedDataSource })
      );
    }
  }, {
    key: 'renderNormalTable',
    value: function renderNormalTable(dataSource) {
      var _this3 = this;

      var _props2 = this.props,
          editing = _props2.editing,
          player = _props2.player;
      var nextCommandIndex = player.nextCommandIndex,
          errorCommandIndices = player.errorCommandIndices,
          doneCommandIndices = player.doneCommandIndices;
      var commands = editing.commands;

      var editable = this.isPlayerStopped();

      var columns = [{ title: 'Command', dataIndex: 'cmd', key: 'cmd', width: 130 }, { title: 'Target', dataIndex: 'target', key: 'target', width: 190 }, { title: 'Value', dataIndex: 'value', key: 'value' }, {
        title: 'Ops',
        key: 'ops',
        width: 80,
        render: function render(text, record, index) {
          return react_default.a.createElement(
            'div',
            null,
            react_default.a.createElement(
              button_default.a,
              {
                disabled: !editable,
                shape: 'circle',
                onClick: function onClick(e) {
                  _this3.props.removeCommand(index);e.stopPropagation();
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'minus' })
            ),
            react_default.a.createElement(
              button_default.a,
              {
                disabled: !editable,
                shape: 'circle',
                onClick: function onClick(e) {
                  _this3.props.duplicateCommand(index);e.stopPropagation();
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'plus' })
            )
          );
        }
      }];

      var tableConfig = {
        dataSource: dataSource,
        columns: columns,
        pagination: false,
        footer: function footer() {
          return react_default.a.createElement(
            'div',
            { className: 'table-footer', onClick: function onClick(e) {
                _this3.props.insertCommand(newCommand, commands.length);
              } },
            'Add'
          );
        },
        onRowClick: function onRowClick(record, index, e) {
          _this3.props.selectCommand(index);
        },
        rowClassName: this.commandClassName
      };

      return react_default.a.createElement(table_default.a, tableConfig);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      var _props3 = this.props,
          status = _props3.status,
          editing = _props3.editing;
      var commands = editing.commands,
          meta = editing.meta;
      var selectedIndex = meta.selectedIndex;


      var isPlayerStopped = this.isPlayerStopped();
      var dataSource = commands && commands.length ? commands : defaultDataSource;
      var selectedCmd = dataSource[selectedIndex];
      var isCmdEditable = isPlayerStopped && !!selectedCmd;
      var isInspecting = status === constant["a" /* APP_STATUS */].INSPECTOR;

      var selectedCmdIsVisualSearch = selectedCmd && ['visionFind', 'visualSearch', 'visualAssert', 'visualVerify', 'XClick', 'XMove'].indexOf(selectedCmd.cmd) !== -1;

      return react_default.a.createElement(
        'div',
        { className: 'editor-wrapper' },
        react_default.a.createElement(
          tabs_default.a,
          {
            type: 'card',
            className: 'commands-view',
            activeKey: this.props.editor.activeTab,
            onChange: this.onChangeCommandsView
          },
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Table View', key: 'table_view' },
            react_default.a.createElement(
              'div',
              { className: 'form-group table-wrapper', style: { marginBottom: 0 }, ref: function ref(_ref3) {
                  _this4.listContainer = _ref3;
                } },
              this.renderTable()
            ),
            react_default.a.createElement(
              'div',
              { className: 'form-group fields-wrapper', style: { marginBottom: 0 } },
              react_default.a.createElement(
                form_default.a,
                null,
                react_default.a.createElement(
                  form_default.a.Item,
                  { label: 'Command', labelCol: { span: 4 }, wrapperCol: { span: 20 } },
                  react_default.a.createElement(
                    'div',
                    { className: 'flex-row' },
                    react_default.a.createElement(
                      select_default.a,
                      {
                        showSearch: true,
                        optionFilterProp: 'children',
                        placeholder: 'command',
                        disabled: !isCmdEditable,
                        value: selectedCmd && selectedCmd.cmd,
                        onChange: function onChange(value) {
                          return _this4.onDetailChange('cmd', value);
                        },
                        filterOption: function filterOption(input, _ref4) {
                          var key = _ref4.key;
                          return key.toLowerCase().indexOf(input.toLowerCase()) === 0;
                        },
                        style: { flex: 1, maxWidth: '60%', marginRight: '10px' },
                        size: 'default'
                      },
                      availableCommands.map(function (cmd) {
                        return react_default.a.createElement(
                          select_default.a.Option,
                          { value: cmd, key: cmd },
                          cmd
                        );
                      })
                    ),
                    selectedCmd && selectedCmd.cmd ? react_default.a.createElement(
                      'a',
                      { href: 'https://a9t9.com/x/idehelp?cmd=' + selectedCmd.cmd.toLowerCase(), target: '_blank' },
                      'Info for this command'
                    ) : null
                  )
                ),
                react_default.a.createElement(
                  form_default.a.Item,
                  { label: 'Target', labelCol: { span: 4 }, wrapperCol: { span: 20 } },
                  react_default.a.createElement(
                    'div',
                    { className: 'flex-row' },
                    !selectedCmd || !selectedCmd.targetOptions || !selectedCmd.targetOptions.length ? react_default.a.createElement(input_default.a, {
                      style: { flex: 1, maxWidth: '60%', marginRight: '10px' },
                      placeholder: 'target',
                      disabled: !isCmdEditable,
                      value: selectedCmd && selectedCmd.target,
                      onChange: function onChange(e) {
                        return _this4.onDetailChange('target', e.target.value);
                      },
                      size: 'default'
                    }) : react_default.a.createElement(
                      select_default.a,
                      {
                        style: { flex: 1, maxWidth: '60%', marginRight: '10px' },
                        placeholder: 'target',
                        disabled: !isCmdEditable,
                        value: selectedCmd.target,
                        onChange: function onChange(val) {
                          return _this4.onDetailChange('target', val);
                        },
                        size: 'default'
                      },
                      selectedCmd.targetOptions.map(function (option) {
                        return react_default.a.createElement(
                          select_default.a.Option,
                          {
                            key: option,
                            value: option
                          },
                          option
                        );
                      })
                    ),
                    react_default.a.createElement(
                      button_default.a,
                      {
                        style: { marginRight: '10px' },
                        disabled: !isCmdEditable,
                        onClick: this.onToggleInspect
                      },
                      isInspecting ? react_default.a.createElement(
                        'span',
                        null,
                        (selectedCmdIsVisualSearch ? '👁' : '') + 'Cancel'
                      ) : react_default.a.createElement(
                        'span',
                        null,
                        (selectedCmdIsVisualSearch ? '👁' : '') + 'Select'
                      )
                    ),
                    react_default.a.createElement(
                      button_default.a,
                      {
                        disabled: !isCmdEditable,
                        onClick: this.onClickFind
                      },
                      (selectedCmdIsVisualSearch ? '👁' : '') + 'Find'
                    )
                  )
                ),
                react_default.a.createElement(
                  form_default.a.Item,
                  { label: 'Value', labelCol: { span: 4 }, wrapperCol: { span: 20 }, style: { marginBottom: 0 } },
                  react_default.a.createElement(input_default.a, {
                    disabled: !isCmdEditable,
                    value: selectedCmd && selectedCmd.value,
                    onChange: function onChange(e) {
                      return _this4.onDetailChange('value', e.target.value);
                    },
                    style: { width: '100%' },
                    placeholder: 'value',
                    size: 'default'
                  })
                )
              )
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Source View (JSON)', key: 'source_view', className: 'source-view' },
            react_default.a.createElement(
              'pre',
              { className: 'source-error' },
              this.props.sourceErrMsg
            ),
            react_default.a.createElement(react_codemirror2["UnControlled"], {
              ref: function ref(el) {
                _this4.codeMirror = el;
              },
              className: this.props.sourceErrMsg ? 'has-error' : 'no-error',
              value: this.props.sourceText,
              onChange: this.onChangeEditSource,
              onBlur: this.onSourceBlur,
              onCursor: function onCursor(editor, data) {
                _this4.setState({ cmEdtiorInstance: editor });
                // Note: when value updated, code mirror will automatically emit onCursor with cursor at bottom
                // It can be tell with `sticky` as null
                if (data.sticky) {
                  _this4.setState({ cursor: { line: data.line, ch: data.ch } });
                }
              },
              options: {
                mode: { name: 'javascript', json: true },
                lineNumbers: true,
                matchBrackets: true,
                autoCloseBrackets: true
              }
            })
          )
        ),
        this.renderContextMenu(),
        this.renderVisionFindPreview()
      );
    }
  }]);

  return DashboardEditor;
}(react_default.a.Component);

/* harmony default export */ var dashboard_editor = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    status: state.status,
    editor: state.editor,
    editing: state.editor.editing,
    clipboard: state.editor.clipboard,
    player: state.player,
    config: state.config,
    sourceErrMsg: state.editor.editingSource.error,
    sourceText: state.editor.editingSource.pure,
    sourceTextModified: state.editor.editingSource.current,
    selectedCommand: editorSelectedCommand(state)
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(editor_extends({}, actions_namespaceObject), dispatch);
})(editor_DashboardEditor));
// EXTERNAL MODULE: ./node_modules/antd/lib/popconfirm/index.js
var popconfirm = __webpack_require__(160);
var popconfirm_default = /*#__PURE__*/__webpack_require__.n(popconfirm);

// CONCATENATED MODULE: ./src/common/registry.js
var registry_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function registry_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Registry = function () {
  function Registry(_ref) {
    var process = _ref.process,
        onZero = _ref.onZero,
        onOne = _ref.onOne;

    registry_classCallCheck(this, Registry);

    this.cache = {};
    this.__process = process;
    this.__onZero = onZero || function () {};
    this.__onOne = onOne || function () {};
  }

  registry_createClass(Registry, [{
    key: 'add',
    value: function add(id, obj) {
      this.cache[id] = this.cache[id] || [];
      this.cache[id].push(obj);

      if (this.cache[id].length === 1) {
        try {
          this.__onOne(id);
        } catch (e) {
          console.error('in onOne, ' + e.message);
        }
      }

      return true;
    }
  }, {
    key: 'remove',
    value: function remove(id, obj) {
      if (!this.cache[id]) return false;
      this.cache[id] = this.cache[id].filter(function (item) {
        return item !== obj;
      });

      if (this.cache[id].length === 0) {
        try {
          this.__onZero(id);
        } catch (e) {
          console.error('in onZero, ' + e.message);
        }
      }

      return true;
    }
  }, {
    key: 'fire',
    value: function fire(id, data) {
      var _this = this;

      if (!this.cache[id]) return false;
      this.cache[id].forEach(function (item) {
        try {
          _this.__process(item, data, id);
        } catch (e) {
          console.error('in process, ' + e.message);
        }
      });
      return true;
    }
  }, {
    key: 'has',
    value: function has(id) {
      return this.cache[id] && this.cache[id].length > 0;
    }
  }, {
    key: 'keys',
    value: function keys() {
      var _this2 = this;

      return Object.keys(this.cache).filter(function (key) {
        return _this2.cache[key] && _this2.cache[key].length > 0;
      });
    }
  }, {
    key: 'destory',
    value: function destory() {
      this.cache = {};
    }
  }]);

  return Registry;
}();

/* harmony default export */ var registry = (Registry);
// CONCATENATED MODULE: ./src/common/variables.js
var variables_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function variables_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }




var standardKeyConstants = ['KEY_LEFT', 'KEY_UP', 'KEY_RIGHT', 'KEY_DOWN', 'KEY_PGUP', 'KEY_PAGE_UP', 'KEY_PGDN', 'KEY_PAGE_DOWN', 'KEY_BKSP', 'KEY_BACKSPACE', 'KEY_DEL', 'KEY_DELETE', 'KEY_ENTER', 'KEY_TAB'];

var metaKeyConstants = ['KEY_CTRL', 'KEY_ALT', 'KEY_SHIFT'];

var fnKeyConstants = ['KEY_F1', 'KEY_F2', 'KEY_F3', 'KEY_F4', 'KEY_F5', 'KEY_F6', 'KEY_F7', 'KEY_F8', 'KEY_F9', 'KEY_F10', 'KEY_F11', 'KEY_F12', 'KEY_F13', 'KEY_F14', 'KEY_F15'];

var numericKeyConstants = ['KEY_Num0', 'KEY_Num1', 'KEY_Num2', 'KEY_Num3', 'KEY_Num4', 'KEY_Num5', 'KEY_Num6', 'KEY_Num7', 'KEY_Num8', 'KEY_Num9'];

var letterKeyConstants = ['KEY_A', 'KEY_B', 'KEY_C', 'KEY_D', 'KEY_E', 'KEY_F', 'KEY_G', 'KEY_H', 'KEY_I', 'KEY_J', 'KEY_K', 'KEY_L', 'KEY_M', 'KEY_N', 'KEY_O', 'KEY_P', 'KEY_Q', 'KEY_R', 'KEY_S', 'KEY_T', 'KEY_U', 'KEY_V', 'KEY_W', 'KEY_X', 'KEY_Y', 'KEY_Z'];

var keyConstants = [].concat(standardKeyConstants, metaKeyConstants, fnKeyConstants, numericKeyConstants, letterKeyConstants);

var variables_isValidKeyConstant = function isValidKeyConstant(str) {
  if (keyConstants.indexOf(str) !== -1) return true;
  if (/^KEY_\w+(\+KEY_\w+)*$/.test(str)) {
    var keys = str.split('+');
    return utils["and"].apply(undefined, variables_toConsumableArray(keys.map(function (s) {
      return keyConstants.indexOf(s) !== -1;
    })));
  }
  return false;
};

var DEFAULT_KEY = 'main';
var cache = {};

var variables_validateVariableName = function validateVariableName(name) {
  if (name.charAt(0) === '!') {
    name = name.substr(1);
  }

  try {
    Object(utils["validateStandardName"])(name);
  } catch (e) {
    throw new Error('Invalid variable name \'' + name + '\'. A variable name ' + e.message);
  }

  return true;
};

function varsFactory() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_KEY;
  var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var initial = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var opts = variables_extends({
    isInvalidInternalVar: function isInvalidInternalVar(key) {
      return key.indexOf('!') === 0 && key !== '!TIMEOUT_PAGELOAD' && key !== '!TIMEOUT_WAIT' && key !== '!TIMEOUT_MACRO' && key !== '!TIMEOUT_DOWNLOAD' && key !== '!REPLAYSPEED' && key !== '!LOOP' && key !== '!URL' && key !== '!MACRONAME' && key !== '!RUNTIME' && key !== '!CSVLINE' && key !== '!CSVLINE' && key !== '!LASTCOMMANDOK' && key !== '!ERRORIGNORE' && key !== '!CSVREADLINENUMBER' && key !== '!CSVREADSTATUS' && key !== '!CSVREADMAXROW' && key !== '!CLIPBOARD' && key !== '!STATUSOK' && key !== '!WAITFORVISIBLE' && key !== '!IMAGEX' && key !== '!IMAGEY' && key !== '!VISUALSEARCHAREA' && key !== '!STOREDIMAGERECT' && !/^!COL\d+$/i.test(key);
    },
    readonly: ['!LOOP', '!URL', '!MACRONAME', '!RUNTIME', '!LASTCOMMANDOK', '!CSVREADSTATUS', '!CSVREADMAXROW', '!VISUALSEARCHAREA'].concat(variables_toConsumableArray(keyConstants)),
    typeCheck: {
      '!REPLAYSPEED': function REPLAYSPEED(val) {
        return ['SLOW', 'MEDIUM', 'FAST'].indexOf((val || '').toUpperCase()) !== -1;
      },
      '!TIMEOUT_PAGELOAD': function TIMEOUT_PAGELOAD(val) {
        return parseInt(val, 10) >= 0;
      },
      '!TIMEOUT_WAIT': function TIMEOUT_WAIT(val) {
        return parseInt(val, 10) >= 0;
      },
      '!TIMEOUT_MACRO': function TIMEOUT_MACRO(val) {
        return parseInt(val, 10) >= 0;
      },
      '!TIMEOUT_DOWNLOAD': function TIMEOUT_DOWNLOAD(val) {
        return parseInt(val, 10) >= 0;
      },
      '!CSVREADLINENUMBER': function CSVREADLINENUMBER(val) {
        return parseInt(val, 10) >= 0;
      }
    },
    normalize: function normalize(key, val) {
      var upperKey = key.toUpperCase();
      var acceptStringTrueFalse = function acceptStringTrueFalse(val) {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return val;
      };
      var num = function num(s) {
        return parseFloat(s);
      };

      switch (upperKey) {
        case '!ERRORIGNORE':
        case '!WAITFORVISIBLE':
          return acceptStringTrueFalse(val);

        case '!TIMEOUT_PAGELOAD':
        case '!TIMEOUT_WAIT':
        case '!TIMEOUT_MACRO':
        case '!TIMEOUT_DOWNLOAD':
          return num(val);

        default:
          return val;
      }
    }
  }, options);
  var vars = initial;

  var listeners = new registry({ process: function process(fn, data, eventName) {
      return fn(data);
    } });
  var fireOnChange = function fireOnChange() {
    return listeners.fire('change', { vars: variables_extends({}, vars) });
  };
  var self = {
    reset: function reset() {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (options.keepGlobal) {
        var globals = Object.keys(vars).reduce(function (prev, key) {
          if (/^global/i.test(key)) prev[key] = vars[key];
          return prev;
        }, {});

        vars = globals;
      } else {
        vars = {};
      }

      fireOnChange();
    },
    render: function render(str, options) {
      var getVar = function getVar(key) {
        var upperKey = (key || '').toUpperCase();

        if (upperKey in vars) {
          return vars[upperKey];
        } else {
          if (/^!/.test(upperKey)) throw new Error('Internal variable "' + upperKey + '" not supported');else throw new Error('variable "' + upperKey + '" is not defined');
        }
      };
      var replaceAllVars = function replaceAllVars(str, reg) {
        var getKey = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (args) {
          return args[1];
        };
        var decorate = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : function (x) {
          return x;
        };

        return str.replace(reg, function () {
          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          var variable = (getKey(args) || '').toUpperCase();
          // Note: keep as it is if it's a KEY_XXX variable, which should be handled by command runner
          if (variables_isValidKeyConstant(variable)) return args[0];
          return decorate(getVar(variable));
        });
      };
      var regDollar = new RegExp('\\$\\{(!?\\w+)\\}', 'gi');
      var regStoredVars = new RegExp('storedVars\\[(\'|")(!?\\w+)\\1\\]', 'gi');

      var result = replaceAllVars(str, regDollar);

      if (options && options.withHashNotation) {
        result = replaceAllVars(result, regStoredVars, function (args) {
          return args[2];
        }, function (x) {
          return JSON.stringify(x);
        });
      }

      return result;
    },
    get: function get(field) {
      return vars[field.toUpperCase()];
    },
    set: function set(obj, isAdmin) {
      Object.keys(obj).forEach(function (key) {
        var trimmedKey = key.trim();
        if (trimmedKey.length === 0) return;

        variables_validateVariableName(trimmedKey);

        var targetKey = trimmedKey.toUpperCase();

        // Note: prevent variable with empty name
        if (targetKey.length === 0) return;

        // Note: special treatment for !CSVLINE
        if (/^!CSVLINE$/i.test(targetKey)) {
          var csvLine = self.get('!CSVLINE');

          if (csvLine === undefined) {
            csvLine = [];
          } else if (!Array.isArray(csvLine)) {
            csvLine = [csvLine];
          }

          csvLine.push(obj[key]);
          vars['!CSVLINE'] = csvLine;

          return;
        }

        if (!isAdmin && opts.readonly.indexOf(targetKey) !== -1) {
          throw new Error('Cannot write to readony variable \'' + key + '\'');
        }

        if (opts.isInvalidInternalVar(targetKey)) {
          throw new Error('Not allowed to write to \'' + key + '\'');
        }

        if (opts.typeCheck[targetKey] && !opts.typeCheck[targetKey](obj[key])) {
          throw new Error('Value \'' + obj[key] + '\' not supported for variable "' + targetKey + '"');
        }

        vars[targetKey] = opts.normalize(key, obj[key]);
      });

      fireOnChange();
    },
    clear: function clear(reg) {
      Object.keys(vars).forEach(function (key) {
        if (reg.test(key)) {
          delete vars[key];
        }
      });

      fireOnChange();
    },
    isReadOnly: function isReadOnly(variable) {
      var str = variable && variable.toUpperCase ? variable.toUpperCase() : '';
      return opts.readonly.indexOf(str) !== -1;
    },
    dump: function dump() {
      return variables_extends({}, vars);
    },
    onChange: function onChange(fn) {
      listeners.add('change', fn);
      return function () {
        return listeners.remove('change', fn);
      };
    }
  };

  cache[name] = self;
  return self;
}

var getVarsInstance = function getVarsInstance() {
  var name = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_KEY;

  return cache[name];
};

var createVarsFilter = function createVarsFilter(_ref) {
  var _ref$withUserDefined = _ref.withUserDefined,
      withUserDefined = _ref$withUserDefined === undefined ? true : _ref$withUserDefined,
      withCommonInternal = _ref.withCommonInternal,
      withAdvancedInternal = _ref.withAdvancedInternal;

  var checkUserDefined = function checkUserDefined(name) {
    return !/^!/.test(name);
  };
  var checkCommonInternal = function checkCommonInternal(name) {
    var list = ['!url', '!clipboard', '!runtime', '!statusok', '!errorignore'].map(function (x) {
      return x.toUpperCase();
    });
    return list.indexOf(name.toUpperCase()) !== -1;
  };
  var checkAdvancedInternal = function checkAdvancedInternal(name) {
    return (/^!/.test(name) && !checkCommonInternal(name)
    );
  };
  var orCheck = function orCheck(fns) {
    return function () {
      for (var i = 0, len = fns.length; i < len; i++) {
        if (fns[i].apply(fns, arguments)) return true;
      }
      return false;
    };
  };
  var list = [withUserDefined ? checkUserDefined : null, withCommonInternal ? checkCommonInternal : null, withAdvancedInternal ? checkAdvancedInternal : null].filter(function (x) {
    return !!x;
  });

  return orCheck(list);
};
// CONCATENATED MODULE: ./src/common/macro_log.js

var renderLogType = function renderLogType(log) {
  switch (log.type) {
    case 'reflect':
      return '[info]';

    case 'error':
      return log.options && log.options.ignored ? '[error][ignored]' : '[error]';

    default:
      return '[' + log.type + ']';
  }
};

var renderLog = function renderLog(log) {
  return renderLogType(log) + ' ' + log.text;
};
// CONCATENATED MODULE: ./src/components/edit_in_place.js



var edit_in_place_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function edit_in_place_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function edit_in_place_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function edit_in_place_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }





var edit_in_place_EditInPlace = function (_React$Component) {
  edit_in_place_inherits(EditInPlace, _React$Component);

  function EditInPlace() {
    var _ref;

    var _temp, _this, _ret;

    edit_in_place_classCallCheck(this, EditInPlace);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = edit_in_place_possibleConstructorReturn(this, (_ref = EditInPlace.__proto__ || Object.getPrototypeOf(EditInPlace)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      isEditing: false,
      value: ''
    }, _this.edit = function () {
      _this.setState({ isEditing: true });
      setTimeout(function () {
        var $input = _this.$input && _this.$input.refs && _this.$input.refs.input;

        if ($input) {
          $input.focus();

          var selection = _this.props.getSelection(_this.state.value, $input);
          $input.selectionStart = selection ? selection.start : 0;
          $input.selectionEnd = selection ? selection.end : $input.value.length;
        }
      }, 100);
    }, _this.submit = function () {
      _this.props.checkValue(_this.state.value).then(function (pass) {
        if (pass) {
          _this.setState({ isEditing: false });
          _this.props.onChange(_this.state.value);
        }
      });
    }, _this.reset = function () {
      _this.setState({
        isEditing: false,
        value: _this.props.value
      });
    }, _temp), edit_in_place_possibleConstructorReturn(_this, _ret);
  }

  edit_in_place_createClass(EditInPlace, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.setState({
        value: this.props.value
      });
    }
  }, {
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      if (nextProps.value !== this.props.value) {
        this.setState({ value: nextProps.value });
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      if (!this.state.isEditing) {
        return react_default.a.createElement(
          'span',
          null,
          this.props.value,
          react_default.a.createElement(icon_default.a, {
            type: 'edit',
            style: { marginLeft: '10px', cursor: 'pointer' },
            onClick: this.edit
          })
        );
      } else {
        return react_default.a.createElement(input_default.a, {
          ref: function ref(_ref2) {
            _this2.$input = _ref2;
          },
          value: this.state.value,
          onChange: function onChange(e) {
            return _this2.setState({ value: e.target.value });
          },
          onBlur: this.reset,
          onKeyDown: function onKeyDown(e) {
            if (e.keyCode === 13) return _this2.submit();
            if (e.keyCode === 27) return _this2.reset();
          }
        });
      }
    }
  }]);

  return EditInPlace;
}(react_default.a.Component);

edit_in_place_EditInPlace.propTypes = {
  value: prop_types_default.a.string.isRequired,
  onChange: prop_types_default.a.func.isRequired,
  checkValue: prop_types_default.a.func.isRequired,
  getSelection: prop_types_default.a.func
};
edit_in_place_EditInPlace.defaultProps = {
  getSelection: function getSelection() {
    return null;
  }
};
/* harmony default export */ var edit_in_place = (edit_in_place_EditInPlace);
// CONCATENATED MODULE: ./src/containers/dashboard/bottom.js















































var bottom_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var bottom_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function bottom_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function bottom_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function bottom_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function bottom_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }




















var bottom_DashboardBottom = function (_React$Component) {
  bottom_inherits(DashboardBottom, _React$Component);

  function DashboardBottom() {
    var _ref;

    var _temp, _this, _ret;

    bottom_classCallCheck(this, DashboardBottom);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = bottom_possibleConstructorReturn(this, (_ref = DashboardBottom.__proto__ || Object.getPrototypeOf(DashboardBottom)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      activeTabForLogScreenshot: 'Logs',

      showCSVModal: false,
      csvText: '',
      csvFile: '',

      drag: {
        isDragging: false,
        // Check out the note on `screenX` in `onResizeDragEnd` event
        startY: 0,
        lastHeight: 220,
        currentMinHeight: 220
      }
    }, _this.getBottomMinHeight = function () {
      var _this$state$drag = _this.state.drag,
          isDragging = _this$state$drag.isDragging,
          lastHeight = _this$state$drag.lastHeight,
          currentMinHeight = _this$state$drag.currentMinHeight;

      return (isDragging ? currentMinHeight : lastHeight) + 'px';
    }, _this.onResizeDragStart = function (e) {
      // Note: Firefox requires us to set something to DataTransfer, otherwise drag and dragEnd won't be triggered
      // refer to https://stackoverflow.com/questions/33434275/firefox-on-drag-end-is-not-called-in-a-react-component
      e.dataTransfer.setData('text', '');

      var style = window.getComputedStyle(_this.$dom);
      var height = parseInt(style.height);

      _this.setState(Object(utils["setIn"])(['drag'], {
        isDragging: true,
        startY: e.screenY,
        lastHeight: height,
        currentHeight: height
      }, _this.state));
    }, _this.onResizeDragEnd = function (e) {
      // Note: use `screenY` instead of `clientY`, because `clientY` of dragEnd events in Firefox
      // is always set to 0, while `screenY` is luckily still available. And since we only make use of
      // difference of X coordinate. `screenY` and `clientY` both work for us.
      //
      // reference:
      // https://bugzilla.mozilla.org/show_bug.cgi?id=505521
      // https://developer.mozilla.org/en-US/docs/Web/Events/dragend
      var diff = e.screenY - _this.state.drag.startY;
      var height = _this.state.drag.lastHeight - diff;

      _this.setState(Object(utils["setIn"])(['drag'], {
        isDragging: false,
        startY: 0,
        lastHeight: height,
        currentMinHeight: height
      }));
    }, _this.onFileChange = function (e) {
      var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();
      var files = [].slice.call(e.target.files);
      if (!files || !files.length) return;

      var read = function read(file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();

          reader.onload = function (readerEvent) {
            var text = readerEvent.target.result;
            resolve({
              text: text,
              fileName: file.name
            });
          };

          reader.readAsText(file);
        });
      };

      Promise.all(files.map(read)).then(function (list) {
        var names = list.map(function (item) {
          return item.fileName;
        });
        var ps = list.map(function (fileItem) {
          return csvStorage.write(Object(utils["sanitizeFileName"])(fileItem.fileName), new Blob([fileItem.text]));
        });

        return Promise.all(ps).then(function () {
          return _this.props.listCSV();
        }).then(function () {
          message_default.a.info(list.length + ' csv files imported');
          _this.props.addLog('info', list.length + ' csv files imported: ' + names.join(', '));
        });
      }).catch(function (e) {
        _this.props.addLog('error', e.message);
      });
    }, _this.removeCSV = function (csv) {
      var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();

      csvStorage.remove(csv.name).then(function () {
        return _this.props.listCSV();
      }).then(function () {
        message_default.a.success('successfully deleted');
        _this.props.addLog('info', csv.name + ' deleted');
      });
    }, _this.viewCSV = function (csv) {
      window.open('./csv_editor.html?csv=' + csv.name, '', 'width=600,height=500,scrollbars=true');
    }, _this.onImageFileChange = function (e) {
      var files = [].slice.call(e.target.files);
      if (!files || !files.length) return;

      var read = function read(file) {
        return new Promise(function (resolve, reject) {
          var reader = new FileReader();

          reader.onload = function (readerEvent) {
            try {
              var dataUrl = readerEvent.target.result;
              var obj = storeImage({ dataUrl: dataUrl, name: file.name });
              resolve(obj);
            } catch (e) {
              resolve({ err: e, fileName: file.name });
            }
          };

          reader.readAsDataURL(file);
        });
      };

      var storeImage = function storeImage(_ref2) {
        var dataUrl = _ref2.dataUrl,
            name = _ref2.name;

        return Object(utils["uniqueName"])(name, {
          check: function check(name) {
            return Object(services_storage["getStorageManager"])().getVisionStorage().exists(name).then(function (result) {
              return !result;
            });
          }
        }).then(function (fileName) {
          return Object(services_storage["getStorageManager"])().getVisionStorage().write(Object(utils["sanitizeFileName"])(fileName), Object(utils["dataURItoBlob"])(dataUrl)).then(function () {
            return fileName;
          });
        }).catch(function (e) {
          common_log["a" /* default */].error(e.stack);
        });
      };

      Promise.all(files.map(read)).then(function (fileNames) {
        message_default.a.success(fileNames.length + ' image files imported into Vision tab');
        _this.props.addLog('info', fileNames.length + ' image files imported: ' + fileNames.join(', '));
        _this.props.listVisions();
      }).catch(function (e) {
        common_log["a" /* default */].error(e.stack);
        _this.props.addLog('error', e.message);
      });
    }, _this.takeScreenshot = function () {
      ipc_cs["a" /* default */].ask('PANEL_SELECT_AREA_ON_CURRENT_PAGE').catch(function (e) {
        message_default.a.error(e.message);
      });
    }, _this.viewVision = function (fileName) {
      window.open('./vision_editor.html?vision=' + fileName, '', 'width=600,height=500,scrollbars=true');
    }, _this.addVisionNameToTargetBox = function (fileName) {
      var selectedCommand = _this.props.selectedCommand;


      if (!selectedCommand || ['visionFind', 'visualSearch', 'XClick', 'XMove'].indexOf(selectedCommand.cmd) === -1) {
        return message_default.a.error('Image names can only be added to the target box if a \'visualSearch\' command is selected');
      }

      _this.props.updateSelectedCommand({ target: fileName });
    }, _this.exportAllVisions = function () {
      var zip = new lib_default.a();
      var visionStorage = Object(services_storage["getStorageManager"])().getVisionStorage();

      visionStorage.list().then(function (visions) {
        if (visions.length === 0) {
          return message_default.a.error('No vision to export');
        }

        var ps = visions.map(function (ss) {
          return visionStorage.read(ss.fileName, 'ArrayBuffer').then(function (buffer) {
            zip.file(ss.fileName, buffer, { binary: true });
          });
        });

        return Promise.all(ps).then(function () {
          zip.generateAsync({ type: 'blob' }).then(function (blob) {
            file_saver_default.a.saveAs(blob, 'vision-images-export.zip');
          });
        });
      });
    }, _temp), bottom_possibleConstructorReturn(_this, _ret);
  }

  bottom_createClass(DashboardBottom, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      var _this2 = this;

      if (nextProps.logs.length !== this.props.logs.length) {
        var $logContent = document.querySelector('.logs-screenshots .ant-tabs-content');
        var itemHeight = 50;

        if (!$logContent) return;

        // Note: set scroll top to a number large enough so that it will scroll to bottom
        // setTimeout 100ms to ensure content has been rendered before scroll
        setTimeout(function () {
          $logContent.scrollTop = itemHeight * nextProps.logs.length * 2;
        }, 100);
      }

      if (nextProps.visions.length > this.props.visions.length) {
        var diff = nextProps.visions.filter(function (item) {
          return !_this2.props.visions.find(function (v) {
            return v.name === item.name;
          });
        });

        if (diff.length > 1) {
          diff.sort(function (a, b) {
            return a.createTime > b.createTime;
          });
        }

        var toFocus = diff[0];

        setTimeout(function () {
          var $dom = document.getElementById(toFocus.name);
          if (!$dom) return;
          $dom.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 100);
      }
    }
  }, {
    key: 'logStyle',
    value: function logStyle(log) {
      if (log.options && log.options.color) {
        return { color: log.options.color };
      }

      if (log.options && log.options.ignored) {
        return { color: 'orange' };
      }
    }
  }, {
    key: 'prefixHardDisk',
    value: function prefixHardDisk(str) {
      var isXFileMode = Object(services_storage["getStorageManager"])().isXFileMode();
      if (!isXFileMode) return str;

      return react_default.a.createElement(
        'div',
        {
          style: {
            display: 'inline-block'
          }
        },
        react_default.a.createElement('img', {
          src: './img/hard-drive.svg',
          style: {
            position: 'relative',
            top: '3px',
            marginRight: '5px',
            height: '15px'
          }
        }),
        react_default.a.createElement(
          'span',
          null,
          str
        )
      );
    }
  }, {
    key: 'renderCSVModal',
    value: function renderCSVModal() {
      var _this3 = this;

      return react_default.a.createElement(
        modal_default.a,
        {
          title: 'Preview - ' + this.state.csvFile,
          visible: this.state.showCSVModal,
          onCancel: function onCancel() {
            return _this3.setState({ showCSVModal: false, csvText: '', csvFile: '' });
          },
          className: 'csv-preview-modal',
          footer: null
        },
        react_default.a.createElement(input_default.a.TextArea, {
          style: { width: '100%' },
          value: this.state.csvText,
          readOnly: true,
          rows: 10
        })
      );
    }
  }, {
    key: 'renderCSVTable',
    value: function renderCSVTable() {
      var _this4 = this;

      var columns = [{ title: 'Name', dataIndex: 'name', key: 'name' }, { title: 'Size', dataIndex: 'size', key: 'size' }, {
        title: 'Last Modified',
        dataIndex: 'createTime',
        key: 'createTime',
        render: function render(d) {
          var pad = function pad(n) {
            return n >= 10 ? '' + n : '0' + n;
          };
          return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
        }
      }, {
        title: 'Action',
        key: 'ops',
        width: 100,
        render: function render(text, csv, index) {
          return react_default.a.createElement(
            'div',
            null,
            react_default.a.createElement(
              button_default.a,
              {
                size: 'small',
                type: 'default',
                shape: 'circle',
                onClick: function onClick(e) {
                  _this4.viewCSV(csv);
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'eye-o' })
            ),
            react_default.a.createElement(
              'a',
              { href: csv.url, download: csv.name },
              react_default.a.createElement(
                button_default.a,
                {
                  size: 'small',
                  type: 'primary',
                  shape: 'circle',
                  onClick: function onClick(e) {
                    e.stopPropagation();
                  }
                },
                react_default.a.createElement(icon_default.a, { type: 'download' })
              )
            ),
            react_default.a.createElement(
              popconfirm_default.a,
              {
                title: 'Sure to delete?',
                okText: 'Delete',
                onConfirm: function onConfirm() {
                  _this4.removeCSV(csv);
                }
              },
              react_default.a.createElement(
                button_default.a,
                {
                  size: 'small',
                  type: 'danger',
                  shape: 'circle'
                },
                react_default.a.createElement(icon_default.a, { type: 'close' })
              )
            )
          );
        }
      }];

      var tableConfig = {
        columns: columns,
        dataSource: this.props.csvs,
        pagination: false,
        bordered: true,
        size: 'middle',
        rowKey: 'fileName',
        onRowClick: function onRowClick(record, index, e) {
          // Do nothing
        },
        rowClassName: function rowClassName(record, index) {
          return '';
        }
      };

      return react_default.a.createElement(table_default.a, tableConfig);
    }
  }, {
    key: 'renderVisionTable',
    value: function renderVisionTable() {
      var _this5 = this;

      var columns = [{
        title: 'Image',
        dataIndex: 'url',
        key: 'url',
        width: 116,
        render: function render(url) {
          return react_default.a.createElement('div', {
            className: 'vision-image',
            style: {
              backgroundImage: 'url(' + url + ')',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center'
            }
          });
        }
      }, {
        title: 'Name',
        dataIndex: 'name',
        key: 'name',
        render: function render(name, vision) {
          return react_default.a.createElement(
            'div',
            { className: 'vision-name-1', id: name },
            react_default.a.createElement(edit_in_place, {
              value: vision.name,
              onChange: function onChange(name) {
                Object(services_storage["getStorageManager"])().getVisionStorage().rename(vision.name, Object(utils["ensureExtName"])('.png', name)).then(function () {
                  message_default.a.success('Successfully renamed');
                  _this5.props.listVisions();
                }).catch(function (e) {
                  common_log["a" /* default */].error(e.stack);
                });
              },
              checkValue: function checkValue(name) {
                return Object(services_storage["getStorageManager"])().getVisionStorage().exists(name).then(function (result) {
                  if (result) {
                    message_default.a.error('\'' + name + '\' alreadsy exists');
                  }
                  return !result;
                });
              },
              getSelection: function getSelection(name, $input) {
                var reg = /(?:_dpi_\d+)?\.png$/i;
                var result = reg.exec(name);
                var endIndex = result.index;

                return {
                  start: 0,
                  end: endIndex
                };
              }
            })
          );
        }
      }, {
        title: 'Action',
        key: 'ops',
        width: 100,
        render: function render(text, vision, index) {
          var _React$createElement;

          return react_default.a.createElement(
            'div',
            { className: 'vision-actions' },
            react_default.a.createElement(
              button_default.a,
              {
                size: 'small',
                type: 'default',
                shape: 'circle',
                title: 'Add name to target box',
                onClick: function onClick() {
                  return _this5.addVisionNameToTargetBox(vision.name);
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'plus' })
            ),
            react_default.a.createElement(
              button_default.a,
              {
                size: 'small',
                type: 'default',
                shape: 'circle',
                title: 'View image',
                onClick: function onClick() {
                  return _this5.viewVision(vision.name);
                }
              },
              react_default.a.createElement(icon_default.a, { type: 'eye-o' })
            ),
            react_default.a.createElement(
              popconfirm_default.a,
              (_React$createElement = {
                title: 'Sure to delete?',
                okText: 'Delete'
              }, bottom_defineProperty(_React$createElement, 'title', 'Delete image'), bottom_defineProperty(_React$createElement, 'onConfirm', function onConfirm() {
                Object(services_storage["getStorageManager"])().getVisionStorage().remove(vision.name).then(function () {
                  message_default.a.success('Successfully deleted');
                  _this5.props.listVisions();
                }).catch(function (e) {
                  common_log["a" /* default */].error(e.stack);
                });
              }), _React$createElement),
              react_default.a.createElement(
                button_default.a,
                {
                  size: 'small',
                  type: 'danger',
                  shape: 'circle'
                },
                react_default.a.createElement(icon_default.a, { type: 'close' })
              )
            )
          );
        }
      }];

      var tableConfig = {
        columns: columns,
        dataSource: this.props.visions,
        pagination: false,
        bordered: true,
        size: 'middle',
        rowKey: 'fileName',
        onRowClick: function onRowClick(record, index, e) {
          // Do nothing
        },
        rowClassName: function rowClassName(record, index) {
          return '';
        }
      };

      return react_default.a.createElement(table_default.a, tableConfig);
    }
  }, {
    key: 'renderVariableTable',
    value: function renderVariableTable() {
      var columns = [{ title: 'Name', dataIndex: 'key', key: 'key', width: '40%' }, { title: 'Value', dataIndex: 'value', key: 'value', render: function render(val) {
          return JSON.stringify(val) || 'undefined';
        } }];
      var _props$config = this.props.config,
          showCommonInternalVariables = _props$config.showCommonInternalVariables,
          showAdvancedInternalVariables = _props$config.showAdvancedInternalVariables;

      var filter = createVarsFilter({
        withCommonInternal: showCommonInternalVariables,
        withAdvancedInternal: showAdvancedInternalVariables
      });
      var variables = this.props.variables.filter(function (variable) {
        return filter(variable.key);
      });

      var tableConfig = {
        columns: columns,
        dataSource: variables,
        pagination: false,
        bordered: true,
        size: 'middle',
        rowKey: 'key',
        onRowClick: function onRowClick(record, index, e) {
          // Do nothing
        },
        rowClassName: function rowClassName(record, index) {
          var vars = getVarsInstance();
          if (!vars) return '';
          return vars.isReadOnly(record.key) ? 'read-only' : '';
        }
      };

      return react_default.a.createElement(table_default.a, tableConfig);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this6 = this;

      var activeTabForLogScreenshot = this.state.activeTabForLogScreenshot;

      var filters = {
        'All': function All() {
          return true;
        },
        'Echo': function Echo(item) {
          return item.type === 'echo' || item.type === 'error' || item.type === 'warning' || item.type === 'status';
        },
        // 'Info':   (item) => item.type === 'info' || item.type === 'echo' || item.type === 'reflect' || item.type === 'status',
        'Error': function Error(item) {
          return item.type === 'error';
        },
        'None': function None() {
          return false;
        }
      };
      var logFilter = this.props.config.logFilter || 'All';
      var logs = this.props.logs.filter(filters[logFilter]);

      return react_default.a.createElement(
        'div',
        {
          className: 'logs-screenshots',
          ref: function ref(el) {
            _this6.$dom = el;
          },
          style: { height: this.getBottomMinHeight() }
        },
        this.renderCSVModal(),
        react_default.a.createElement('div', {
          className: Object(utils["cn"])('resize-handler', { focused: this.state.drag.isDragging }),
          draggable: 'true',
          onDragStart: this.onResizeDragStart,
          onDragEnd: this.onResizeDragEnd,
          onMouseDown: function onMouseDown() {
            return _this6.setState(Object(utils["setIn"])(['drag', 'isDragging'], true, _this6.state));
          }
        }),
        react_default.a.createElement(
          tabs_default.a,
          {
            type: 'card',
            onChange: function onChange(key) {
              _this6.setState({ activeTabForLogScreenshot: key });

              if (key === 'Screenshots') {
                _this6.props.listScreenshots();
              }
            }
          },
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Logs', key: 'Logs' },
            react_default.a.createElement(
              'ul',
              { className: 'log-content' },
              logs.map(function (log, i) {
                return react_default.a.createElement(
                  'li',
                  { className: log.type, key: log.id, style: _this6.logStyle(log) },
                  react_default.a.createElement(
                    'span',
                    { className: 'log-type' },
                    renderLogType(log)
                  ),
                  react_default.a.createElement(
                    'pre',
                    { className: 'log-detail' },
                    log.text
                  )
                );
              })
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Variables', key: 'Variables' },
            react_default.a.createElement(
              'div',
              { className: 'variable-content' },
              react_default.a.createElement(
                'div',
                { className: 'variable-options' },
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return _this6.props.updateConfig({ showCommonInternalVariables: e.target.checked });
                    },
                    checked: this.props.config.showCommonInternalVariables
                  },
                  'Show most common ',
                  react_default.a.createElement(
                    'a',
                    { href: 'https://a9t9.com/x/idehelp?help=internalvars', target: '_blank' },
                    'internal variables'
                  )
                ),
                react_default.a.createElement(
                  checkbox_default.a,
                  {
                    onChange: function onChange(e) {
                      return _this6.props.updateConfig({ showAdvancedInternalVariables: e.target.checked });
                    },
                    checked: this.props.config.showAdvancedInternalVariables
                  },
                  'Show advanced ',
                  react_default.a.createElement(
                    'a',
                    { href: 'https://a9t9.com/x/idehelp?help=internalvars', target: '_blank' },
                    'internal variables'
                  )
                )
              ),
              this.renderVariableTable()
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: 'Screenshots', key: 'Screenshots' },
            react_default.a.createElement(
              'ul',
              { className: 'screenshot-content' },
              this.props.screenshots.map(function (ss, i) {
                return react_default.a.createElement(
                  'li',
                  { key: i },
                  react_default.a.createElement(
                    'span',
                    { className: 'timestamp' },
                    ss.createTime && ss.createTime.toLocaleString(),
                    ' - ',
                    react_default.a.createElement(
                      'span',
                      { className: 'filename' },
                      decodeURIComponent(ss.name)
                    )
                  ),
                  react_default.a.createElement(
                    'a',
                    {
                      download: decodeURIComponent(ss.name),
                      href: web_extension_default.a.isFirefox() ? '#' : ss.url,
                      onClick: function onClick(e) {
                        if (!web_extension_default.a.isFirefox()) return;
                        e.preventDefault();

                        // Note: for Firefox, `ss.url` is a data url instead of a `filesystem:` url (as in Chrome)
                        file_saver_default.a.saveAs(Object(utils["dataURItoBlob"])(ss.url), ss.name);
                      }
                    },
                    react_default.a.createElement('img', { src: ss.url })
                  )
                );
              })
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: this.prefixHardDisk('CSV'), key: 'CSV' },
            react_default.a.createElement(
              'div',
              { className: 'csv-content' },
              this.renderCSVTable()
            )
          ),
          react_default.a.createElement(
            tabs_default.a.TabPane,
            { tab: this.prefixHardDisk('👁Visual'), key: 'Vision' },
            react_default.a.createElement(
              'div',
              { className: 'vision-content' },
              react_default.a.createElement(
                'div',
                { className: 'vision-top-actions' },
                react_default.a.createElement(
                  'div',
                  { className: 'main-actions' },
                  react_default.a.createElement(
                    button_default.a,
                    {
                      type: 'primary',
                      onClick: this.takeScreenshot
                    },
                    'Take Screenshot'
                  ),
                  react_default.a.createElement(
                    'span',
                    {
                      className: 'load-image-button ant-btn ant-btn-primary'
                    },
                    react_default.a.createElement(
                      'label',
                      { htmlFor: 'select_image_files' },
                      'Load Image'
                    ),
                    react_default.a.createElement('input', {
                      multiple: true,
                      type: 'file',
                      accept: 'image/*',
                      id: 'select_image_files',
                      onChange: this.onImageFileChange,
                      ref: function ref(_ref3) {
                        _this6.imageFileInput = _ref3;
                      },
                      style: { display: 'none' }
                    })
                  ),
                  react_default.a.createElement(
                    button_default.a,
                    {
                      onClick: this.exportAllVisions
                    },
                    'Export All'
                  )
                ),
                react_default.a.createElement(
                  'a',
                  { className: 'more-info', target: '_blank', href: 'https://a9t9.com/x/idehelp?help=visual' },
                  'More Info'
                )
              ),
              this.renderVisionTable()
            )
          )
        ),
        react_default.a.createElement(
          'div',
          { className: 'ls-toolbox' },
          activeTabForLogScreenshot === 'Logs' ? react_default.a.createElement(
            'div',
            null,
            react_default.a.createElement(
              select_default.a,
              {
                value: this.props.config.logFilter,
                onChange: function onChange(value) {
                  _this6.props.updateConfig({ logFilter: value });
                },
                style: { width: '70px', marginRight: '10px' },
                size: 'small'
              },
              react_default.a.createElement(
                select_default.a.Option,
                { value: 'All' },
                'All'
              ),
              react_default.a.createElement(
                select_default.a.Option,
                { value: 'Echo' },
                'Echo'
              ),
              react_default.a.createElement(
                select_default.a.Option,
                { value: 'Error' },
                'Error'
              ),
              react_default.a.createElement(
                select_default.a.Option,
                { value: 'None' },
                'No log'
              )
            ),
            react_default.a.createElement(
              button_default.a,
              {
                size: 'small',
                onClick: this.props.clearLogs
              },
              'Clear'
            )
          ) : null,
          activeTabForLogScreenshot === 'Screenshots' ? react_default.a.createElement(
            button_default.a,
            {
              size: 'small',
              onClick: this.props.clearScreenshots
            },
            'Clear'
          ) : null,
          activeTabForLogScreenshot === 'CSV' ? react_default.a.createElement(
            button_default.a,
            {
              size: 'small',
              onClick: function onClick() {
                return _this6.fileInput.click();
              }
            },
            'Import CSV',
            react_default.a.createElement('input', {
              multiple: true,
              type: 'file',
              accept: '.csv',
              onChange: this.onFileChange,
              style: { display: 'none' },
              ref: function ref(_ref4) {
                _this6.fileInput = _ref4;
              }
            })
          ) : null
        )
      );
    }
  }]);

  return DashboardBottom;
}(react_default.a.Component);

/* harmony default export */ var bottom = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    hasSelectedCommand: state.editor.editing && state.editor.editing.meta && state.editor.editing.meta.selectedIndex !== -1,
    selectedCommand: editorSelectedCommand(state),
    status: state.status,
    logs: state.logs,
    screenshots: state.screenshots,
    variables: state.variables,
    csvs: state.csvs,
    visions: state.visions,
    config: state.config
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(bottom_extends({}, actions_namespaceObject), dispatch);
})(bottom_DashboardBottom));
// CONCATENATED MODULE: ./src/containers/dashboard/index.js
var dashboard_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var dashboard_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function dashboard_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function dashboard_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function dashboard_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }











var dashboard_Dashboard = function (_React$Component) {
  dashboard_inherits(Dashboard, _React$Component);

  function Dashboard() {
    dashboard_classCallCheck(this, Dashboard);

    return dashboard_possibleConstructorReturn(this, (Dashboard.__proto__ || Object.getPrototypeOf(Dashboard)).apply(this, arguments));
  }

  dashboard_createClass(Dashboard, [{
    key: 'render',
    value: function render() {
      var isWindows = /windows/i.test(window.navigator.userAgent);

      return react_default.a.createElement(
        'div',
        { className: 'dashboard' },
        react_default.a.createElement(dashboard_editor, null),
        react_default.a.createElement(bottom, null),
        react_default.a.createElement(
          'div',
          { className: 'online-help' },
          react_default.a.createElement(
            'div',
            { style: { visibility: isWindows ? 'visible' : 'hidden' } },
            react_default.a.createElement('a', { href: 'https://a9t9.com/x/idehelp?help=visual', target: '_blank' })
          ),
          react_default.a.createElement(
            'div',
            null,
            'Kantu for Chrome/Firefox:',
            react_default.a.createElement(
              'a',
              { href: 'https://a9t9.com/x/idehelp?help=forum', target: '_blank' },
              ' User Forum'
            ),
            ' -',
            react_default.a.createElement(
              'a',
              { href: 'https://a9t9.com/x/idehelp?help=docs', target: '_blank' },
              ' Online Help'
            )
          )
        )
      );
    }
  }]);

  return Dashboard;
}(react_default.a.Component);

/* harmony default export */ var containers_dashboard = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {};
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(dashboard_extends({}, actions_namespaceObject), dispatch);
})(dashboard_Dashboard));
// EXTERNAL MODULE: ./node_modules/antd/dist/antd.css
var antd = __webpack_require__(426);

// EXTERNAL MODULE: ./src/app.scss
var app = __webpack_require__(697);

// CONCATENATED MODULE: ./src/app.js






var app_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var app_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function app_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function app_possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function app_inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }















var app_App = function (_Component) {
  app_inherits(App, _Component);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    app_classCallCheck(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = app_possibleConstructorReturn(this, (_ref = App.__proto__ || Object.getPrototypeOf(App)).call.apply(_ref, [this].concat(args))), _this), _this.hideBackupAlert = function () {
      _this.props.updateConfig({
        lastBackupActionTime: new Date() * 1
      });
      _this.$app.classList.remove('with-alert');
    }, _this.onClickBackup = function () {
      _this.props.runBackup();
      _this.hideBackupAlert();
    }, _this.onClickNoBackup = function () {
      _this.hideBackupAlert();
    }, _temp), app_possibleConstructorReturn(_this, _ret);
  }

  app_createClass(App, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      var run = function run() {
        ipc_cs["a" /* default */].ask('PANEL_TIME_FOR_BACKUP', {}).then(function (isTime) {
          if (!isTime) return;
          _this2.$app.classList.add('with-alert');
        });
      };

      // Note: check whether it's time for backup every 5 minutes
      this.timer = setInterval(run, 5 * 60000);
      run();
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      clearInterval(this.timer);
    }
  }, {
    key: 'renderPreinstallModal',
    value: function renderPreinstallModal() {
      var _this3 = this;

      if (!this.props.ui.newPreinstallVersion) return null;

      return react_default.a.createElement(
        modal_default.a,
        {
          className: 'preinstall-modal',
          visible: true,
          title: 'New demo macros avaiable',
          okText: 'Yes, overwrite',
          cancelText: 'Skip',
          onOk: function onOk() {
            _this3.props.updateUI({ newPreinstallVersion: false });

            return _this3.props.preinstall(true).then(function () {
              message_default.a.success('demo macros updated');
            }).catch(function (e) {
              message_default.a.error(e.message);
            });
          },
          onCancel: function onCancel() {
            _this3.props.updateUI({ newPreinstallVersion: false });
            _this3.props.preinstall(false);
          }
        },
        react_default.a.createElement(
          'p',
          { style: { fontSize: '14px' } },
          'Do you want to overwrite the demo macros with their latest versions?'
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      return react_default.a.createElement(
        'div',
        { className: 'app with-sidebar', ref: function ref(el) {
            _this4.$app = el;
          } },
        react_default.a.createElement(
          'div',
          { className: 'backup-alert' },
          react_default.a.createElement(
            'span',
            null,
            'Do you want to run the automated backup?'
          ),
          react_default.a.createElement(
            'span',
            { className: 'backup-actions' },
            react_default.a.createElement(
              button_default.a,
              { type: 'primary', onClick: this.onClickBackup },
              'Yes'
            ),
            react_default.a.createElement(
              button_default.a,
              { onClick: this.onClickNoBackup },
              'No'
            )
          )
        ),
        react_default.a.createElement(
          'div',
          { className: 'app-inner' },
          react_default.a.createElement(containers_sidebar, null),
          react_default.a.createElement(
            'section',
            { className: 'content' },
            react_default.a.createElement(components_header, null),
            react_default.a.createElement(containers_dashboard, null)
          )
        ),
        this.renderPreinstallModal()
      );
    }
  }]);

  return App;
}(react["Component"]);

/* harmony default export */ var src_app = (Object(react_redux_es["b" /* connect */])(function (state) {
  return {
    ui: state.ui
  };
}, function (dispatch) {
  return Object(redux_es["b" /* bindActionCreators */])(app_extends({}, actions_namespaceObject), dispatch);
})(app_App));
// EXTERNAL MODULE: ./node_modules/redux-thunk/lib/index.js
var redux_thunk_lib = __webpack_require__(444);
var redux_thunk_lib_default = /*#__PURE__*/__webpack_require__.n(redux_thunk_lib);

// CONCATENATED MODULE: ./src/redux/promise_middleware.js
var promise_middleware_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var promise_middleware_slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

// Note: if a `promise` field and a `types` provied, this middleware will dispatch
// 3 actions REQUEST, SUCCESS, FAILURE based on the status of the promise it returns
function promiseMiddleWare() {
  return function (_ref) {
    var dispatch = _ref.dispatch,
        getState = _ref.getState;

    return function (next) {
      return function (action) {
        var promise = action.promise,
            types = action.types,
            rest = _objectWithoutProperties(action, ["promise", "types"]);

        if (!promise) {
          return next(action);
        }

        var _types = promise_middleware_slicedToArray(types, 3),
            REQUEST = _types[0],
            SUCCESS = _types[1],
            FAILURE = _types[2];

        next(promise_middleware_extends({}, rest, { type: REQUEST }));
        return promise().then(function (data) {
          return next(promise_middleware_extends({}, rest, { data: data, type: SUCCESS }));
        }, function (error) {
          return next(promise_middleware_extends({}, rest, { err: error, type: FAILURE }));
        });
      };
    };
  };
};
// CONCATENATED MODULE: ./src/redux/post_logic_middleware.js
function post_logic_middleware_objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

// Note: if `post` field provided, it will call `post`
// after the action dispatched and state updated
function postLogicMiddleWare(extra) {
  return function (_ref) {
    var dispatch = _ref.dispatch,
        getState = _ref.getState;
    return function (next) {
      return function (action) {
        var post = action.post,
            rest = post_logic_middleware_objectWithoutProperties(action, ['post']);

        if (post && typeof post === 'function') {
          setTimeout(function () {
            post({ dispatch: dispatch, getState: getState }, action, extra);
          }, 0);
        }

        return next(action);
      };
    };
  };
}
// EXTERNAL MODULE: ./node_modules/url-parse/index.js
var url_parse = __webpack_require__(112);

// EXTERNAL MODULE: ./node_modules/lodash.isequal/index.js
var lodash_isequal = __webpack_require__(445);
var lodash_isequal_default = /*#__PURE__*/__webpack_require__.n(lodash_isequal);

// CONCATENATED MODULE: ./src/reducers/index.js
var reducers_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function reducers_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function reducers_objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }










var newTestCaseEditing = {
  commands: [],
  meta: {
    src: null,
    hasUnsaved: true,
    selectedIndex: -1
  }

  // * editor
  //    * testCases:          all test cases stored in indexedDB
  //    * editing:            the current test cases being edited
  //    * clipbard            for copy / cut / paste
  //
  // * player                 the state for player
  //    * nextCommandIndex    the current command beging executed
  //    * errorCommandIndices commands that encounters some error
  //    * doneCommandIndices  commands that have been executed
  //    * currentLoop         the current round
  //    * loops               how many rounds to run totally

};var reducers_initialState = {
  status: constant["a" /* APP_STATUS */].NORMAL,
  recorderStatus: constant["g" /* RECORDER_STATUS */].STOPPED,
  inspectorStatus: constant["c" /* INSPECTOR_STATUS */].STOPPED,
  editor: {
    testSuites: [],
    testCases: [],
    editing: reducers_extends({}, newTestCaseEditing),
    editingSource: {
      // Saved version
      original: null,
      // Version before editing
      pure: null,
      // Version keeping track of any editing
      current: null,
      error: null
    },
    clipboard: {
      commands: []
    },
    activeTab: 'table_view'
  },
  player: {
    mode: constant["e" /* PLAYER_MODE */].TEST_CASE,
    status: constant["f" /* PLAYER_STATUS */].STOPPED,
    stopReason: null,
    currentLoop: 0,
    loops: 0,
    nextCommandIndex: null,
    errorCommandIndices: [],
    doneCommandIndices: [],
    breakpointIndices: [],
    playInterval: 0,
    timeoutStatus: {
      type: null,
      total: null,
      past: null
    }
  },
  variables: [],
  logs: [],
  screenshots: [],
  csvs: [],
  visions: [],
  config: {},
  ui: {}

  // Note: for update the `hasUnsaved` status in editing.meta
};var reducers_updateHasUnSaved = function updateHasUnSaved(state) {
  var _state$editor$editing = state.editor.editing,
      meta = _state$editor$editing.meta,
      data = reducers_objectWithoutProperties(_state$editor$editing, ['meta']);

  var id = meta.src && meta.src.id;
  if (!id) return state;

  var tc = state.editor.testCases.find(function (tc) {
    return tc.id === id;
  });
  if (!tc) return state;

  var normalizedEditing = test_case_model_normalizeTestCase({ data: data });
  var hasUnsaved = !lodash_isequal_default()(tc.data, normalizedEditing.data);
  return Object(utils["setIn"])(['editor', 'editing', 'meta', 'hasUnsaved'], hasUnsaved, state);
};

var updateBreakpointIndices = function updateBreakpointIndices(indices, action, actionIndex) {
  var handleSingleAction = function handleSingleAction(indices, action, actionIndex) {
    switch (action) {
      case 'add':
        {
          var result = indices.slice();

          for (var i = 0, len = indices.length; i < len; i++) {
            if (result[i] >= actionIndex) {
              result[i] += 1;
            }
          }

          return result;
        }

      case 'delete':
        {
          var _result = indices.slice();

          for (var _i = indices.length - 1; _i >= 0; _i--) {
            if (_result[_i] > actionIndex) {
              _result[_i] -= 1;
            } else if (_result[_i] === actionIndex) {
              _result.splice(_i, 1);
            }
          }

          return _result;
        }

      default:
        throw new Error('updateBreakpointIndices: unknown action, \'' + action + '\'');
    }
  };

  if (typeof actionIndex === 'number') {
    return handleSingleAction(indices, action, actionIndex);
  }

  if (Array.isArray(actionIndex)) {
    // Note: sort action indices as desc.  Bigger indice will be handled earlier, so that it won't affect others
    var actionIndices = actionIndex.slice();
    actionIndices.sort(function (a, b) {
      return b - a;
    });

    return actionIndices.reduce(function (indices, actionIndex) {
      return handleSingleAction(indices, action, actionIndex);
    }, indices);
  }

  throw new Error('updateBreakpointIndices: actionIndex should be either number or an array of number');
};

var resetEditingSource = Object(utils["partial"])(function (macro, state) {
  Object(common_log["a" /* default */])('resetEditingSource', macro);
  var str = Object(convert_utils["toJSONString"])(macro);
  return Object(utils["setIn"])(['editor', 'editingSource'], {
    original: str,
    pure: str,
    current: str,
    error: null
  }, state);
});

var reducers_setEditingSourceCurrent = function setEditingSourceCurrent(state) {
  var macro = {
    name: state.editor.editing.meta.src ? state.editor.editing.meta.src.name : 'Untitled',
    commands: state.editor.editing.commands
  };
  Object(common_log["a" /* default */])('setEditingSourceCurrent', macro);

  var str = Object(convert_utils["toJSONString"])(macro);
  return Object(utils["updateIn"])(['editor', 'editingSource'], function (editingSource) {
    return reducers_extends({}, editingSource, { pure: str, current: str });
  }, state);
};

var reducers_saveEditingSourceCurrent = function saveEditingSourceCurrent(state) {
  var current = state.editor.editingSource.current;

  return Object(utils["updateIn"])(['editor', 'editingSource'], function (editingSource) {
    return reducers_extends({}, editingSource, { pure: current, original: current });
  }, state);
};

var reducers_setEditingSourceOriginalAndPure = function setEditingSourceOriginalAndPure(macro, state) {
  var str = Object(convert_utils["toJSONString"])(macro);
  return Object(utils["updateIn"])(['editor', 'editingSource'], function (editingSource) {
    return reducers_extends({}, editingSource, { pure: str, original: str });
  }, state);
};

function reducer() {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : reducers_initialState;
  var action = arguments[1];

  switch (action.type) {
    case types.START_RECORDING_SUCCESS:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].RECORDER,
        recorderStatus: constant["a" /* APP_STATUS */].PENDING,
        player: reducers_extends({}, state.player, {
          nextCommandIndex: null,
          errorCommandIndices: [],
          doneCommandIndices: []
        })
      });
    case types.STOP_RECORDING_SUCCESS:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].NORMAL,
        recorderStatus: constant["g" /* RECORDER_STATUS */].STOPPED
      });
    case types.START_INSPECTING_SUCCESS:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].INSPECTOR,
        inspectorStatus: constant["c" /* INSPECTOR_STATUS */].PENDING
      });
    case types.STOP_INSPECTING_SUCCESS:
    case types.DONE_INSPECTING:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].NORMAL,
        recorderStatus: constant["c" /* INSPECTOR_STATUS */].STOPPED
      });

    case types.START_PLAYING:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].PLAYER
      });

    case types.STOP_PLAYING:
      return reducers_extends({}, state, {
        status: constant["a" /* APP_STATUS */].NORMAL
      });

    case types.APPEND_COMMAND:
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (commands) {
        return [].concat(reducers_toConsumableArray(commands), [action.data.command]);
      }))(state);

    case types.DUPLICATE_COMMAND:
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["setIn"])(['editor', 'editing', 'meta', 'selectedIndex'], action.data.index + 1), Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (commands) {
        var index = action.data.index;

        var newCommands = commands.slice();
        newCommands.splice(index + 1, 0, commands[index]);
        return newCommands;
      }), Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
        return updateBreakpointIndices(indices, 'add', action.data.index + 1);
      }))(state);

    case types.INSERT_COMMAND:
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["setIn"])(['editor', 'editing', 'meta', 'selectedIndex'], action.data.index), Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (commands) {
        var _action$data = action.data,
            index = _action$data.index,
            command = _action$data.command;

        var newCommands = commands.slice();
        newCommands.splice(index, 0, command);
        return newCommands;
      }), Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
        return updateBreakpointIndices(indices, 'add', action.data.index);
      }))(state);

    case types.UPDATE_COMMAND:
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["setIn"])(['editor', 'editing', 'commands', action.data.index], action.data.command))(state);

    case types.REMOVE_COMMAND:
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (commands) {
        var index = action.data.index;

        var newCommands = commands.slice();
        newCommands.splice(index, 1);
        return newCommands;
      }), Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
        return updateBreakpointIndices(indices, 'delete', action.data.index);
      }))(state);

    case types.SELECT_COMMAND:
      return Object(utils["compose"])(Object(utils["setIn"])(['editor', 'editing', 'meta', 'selectedIndex'], action.data.forceClick || state.editor.editing.meta.selectedIndex !== action.data.index ? action.data.index : -1),
      // Note: normalize commands whenever switching between commands in normal mode
      state.status === constant["a" /* APP_STATUS */].NORMAL ? Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (cmds) {
        return cmds.map(test_case_model_normalizeCommand);
      }) : function (x) {
        return x;
      })(state);

    case types.CUT_COMMAND:
      {
        var commands = action.data.indices.map(function (i) {
          return state.editor.editing.commands[i];
        });

        return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["setIn"])(['editor', 'clipboard', 'commands'], commands), Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (commands) {
          var newCommands = commands.slice();
          return newCommands.filter(function (c, i) {
            return action.data.indices.indexOf(i) === -1;
          });
        }), Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
          return updateBreakpointIndices(indices, 'delete', action.data.indices);
        }))(state);
      }

    case types.COPY_COMMAND:
      {
        var _commands = action.data.indices.map(function (i) {
          return state.editor.editing.commands[i];
        });
        return Object(utils["setIn"])(['editor', 'clipboard', 'commands'], _commands, state);
      }

    case types.PASTE_COMMAND:
      {
        var _commands2 = state.editor.clipboard.commands;


        return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (cmds) {
          var newCmds = cmds.slice();
          newCmds.splice.apply(newCmds, [action.data.index + 1, 0].concat(reducers_toConsumableArray(_commands2)));
          return newCmds;
        }), Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
          return updateBreakpointIndices(indices, 'add', _commands2.map(function (_) {
            return action.data.index + 1;
          }));
        }))(state);
      }

    case types.NORMALIZE_COMMANDS:
      return Object(utils["updateIn"])(['editor', 'editing', 'commands'], function (cmds) {
        return cmds.map(test_case_model_normalizeCommand);
      }, state);

    case types.UPDATE_SELECTED_COMMAND:
      if (state.editor.editing.meta.selectedIndex === -1) {
        return state;
      }

      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["updateIn"])(['editor', 'editing', 'commands', state.editor.editing.meta.selectedIndex], function (cmdObj) {
        return reducers_extends({}, cmdObj, action.data);
      }))(state);

    case types.SAVE_EDITING_AS_EXISTED:
      return Object(utils["compose"])(Object(utils["setIn"])(['editor', 'editing', 'meta', 'hasUnsaved'], false), reducers_saveEditingSourceCurrent)(state);

    case types.SAVE_EDITING_AS_NEW:
      return Object(utils["compose"])(Object(utils["updateIn"])(['editor', 'editing', 'meta'], function (meta) {
        return reducers_extends({}, meta, {
          hasUnsaved: false,
          src: Object(utils["pick"])(['id', 'name'], action.data)
        });
      }), reducers_saveEditingSourceCurrent)(state);

    case types.SET_TEST_CASES:
      {
        return Object(utils["compose"])(function (state) {
          var src = state.editor.editing.meta.src;

          if (!src) return state;

          var tc = state.editor.testCases.find(function (tc) {
            return tc.id === src.id;
          });
          if (!tc) return state;

          return reducers_setEditingSourceOriginalAndPure({
            name: tc.name,
            commands: tc.data.commands
          }, state);
        }, Object(utils["setIn"])(['editor', 'testCases'], action.data))(state);
      }

    case types.SET_TEST_SUITES:
      return Object(utils["setIn"])(['editor', 'testSuites'], action.data, state);

    case types.UPDATE_TEST_SUITE:
      {
        var _action$data2 = action.data,
            id = _action$data2.id,
            updated = _action$data2.updated;

        var index = state.editor.testSuites.findIndex(function (ts) {
          return ts.id === id;
        });

        if (index === -1) return state;
        return Object(utils["setIn"])(['editor', 'testSuites', index], updated, state);
      }

    case types.SET_EDITING:
      Object(common_log["a" /* default */])('REDUCER SET_EDITING', action.data);

      if (!action.data) return state;
      return Object(utils["compose"])(reducers_setEditingSourceCurrent, reducers_updateHasUnSaved, Object(utils["setIn"])(['editor', 'editing'], action.data))(state);

    case types.EDIT_TEST_CASE:
      {
        var testCases = state.editor.testCases;

        var tc = testCases.find(function (tc) {
          return tc.id === action.data;
        });

        if (!tc) return state;

        return Object(utils["compose"])(Object(utils["setIn"])(['editor', 'editing'], reducers_extends({}, tc.data, {
          meta: {
            selectedIndex: -1,
            hasUnsaved: false,
            src: Object(utils["pick"])(['id', 'name'], tc)
          }
        })), Object(utils["updateIn"])(['player'], function (player) {
          return reducers_extends({}, player, {
            status: constant["f" /* PLAYER_STATUS */].STOPPED,
            stopReason: null,
            nextCommandIndex: null,
            errorCommandIndices: [],
            doneCommandIndices: [],
            breakpointIndices: []
          });
        }), resetEditingSource({
          name: tc.name,
          commands: tc.data.commands
        }))(state);
      }

    case types.UPDATE_TEST_CASE_STATUS:
      {
        var _action$data3 = action.data,
            _id = _action$data3.id,
            status = _action$data3.status;

        if (!_id) return state;

        var _testCases = state.editor.testCases;

        var _index = _testCases.findIndex(function (tc) {
          return tc.id === _id;
        });
        if (_index === -1) return state;

        return Object(utils["setIn"])(['editor', 'testCases', _index, 'status'], status, state);
      }

    case types.RENAME_TEST_CASE:
      return Object(utils["setIn"])(['editor', 'editing', 'meta', 'src', 'name'], action.data, state);

    case types.REMOVE_TEST_CASE:
      {
        if (!action.data.isCurrent) return state;

        var _id2 = state.editor.editing.meta.src.id;
        var selectedIndex = state.editor.editing.meta.selectedIndex;

        var candidates = state.editor.testCases.filter(function (tc) {
          return tc.id !== _id2;
        });
        var lastIndex = state.editor.testCases.findIndex(function (tc) {
          return tc.id === _id2;
        });
        var editing = void 0;

        if (candidates.length === 0) {
          editing = reducers_extends({}, newTestCaseEditing);
        } else {
          var _index2 = lastIndex === -1 ? 0 : lastIndex < candidates.length ? lastIndex : lastIndex - 1;
          var _tc = candidates[_index2];

          editing = reducers_extends({}, _tc.data, {
            meta: {
              src: Object(utils["pick"])(['id', 'name'], _tc),
              hasUnsaved: false,
              selectedIndex: _index2
            }
          });
        }

        return Object(utils["setIn"])(['editor', 'editing'], editing, state);
      }

    case types.EDIT_NEW_TEST_CASE:
      {
        return Object(utils["compose"])(Object(utils["setIn"])(['editor', 'editing'], reducers_extends({}, newTestCaseEditing)), Object(utils["updateIn"])(['player'], function (player) {
          return reducers_extends({}, player, {
            nextCommandIndex: null,
            errorCommandIndices: [],
            doneCommandIndices: [],
            breakpointIndices: []
          });
        }), resetEditingSource({
          name: 'Untitled',
          commands: []
        }))(state);
      }

    case types.SET_PLAYER_STATE:
      return Object(utils["updateIn"])(['player'], function (playerState) {
        return reducers_extends({}, playerState, action.data);
      }, state);

    case types.PLAYER_ADD_ERROR_COMMAND_INDEX:
      return Object(utils["updateIn"])(['player', 'errorCommandIndices'], function (indices) {
        return [].concat(reducers_toConsumableArray(indices), [action.data]);
      }, state);

    case types.ADD_BREAKPOINT:
      return Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
        return indices.indexOf(action.data) === -1 ? [].concat(reducers_toConsumableArray(indices), [action.data]) : indices;
      }, state);

    case types.REMOVE_BREAKPOINT:
      return Object(utils["updateIn"])(['player', 'breakpointIndices'], function (indices) {
        return indices.filter(function (index) {
          return index !== action.data;
        });
      }, state);

    case types.ADD_LOGS:
      return reducers_extends({}, state, {
        logs: [].concat(reducers_toConsumableArray(state.logs), reducers_toConsumableArray(action.data)).slice(-500)
      });

    case types.CLEAR_LOGS:
      return reducers_extends({}, state, {
        logs: []
      });

    case types.ADD_SCREENSHOT:
      return reducers_extends({}, state, {
        screenshots: [].concat(reducers_toConsumableArray(state.screenshots), [action.data])
      });

    case types.CLEAR_SCREENSHOTS:
      return reducers_extends({}, state, {
        screenshots: []
      });

    case types.UPDATE_CONFIG:
      return Object(utils["updateIn"])(['config'], function (cfg) {
        return reducers_extends({}, cfg, action.data);
      }, state);

    case types.SET_CSV_LIST:
      return reducers_extends({}, state, {
        csvs: action.data
      });

    case types.SET_SCREENSHOT_LIST:
      return reducers_extends({}, state, {
        screenshots: action.data
      });

    case types.SET_VISION_LIST:
      return reducers_extends({}, state, {
        visions: action.data
      });

    case types.SET_VARIABLE_LIST:
      return reducers_extends({}, state, {
        variables: action.data
      });

    case types.UPDATE_UI:
      {
        return Object(utils["updateIn"])(['ui'], function (ui) {
          return reducers_extends({}, ui, action.data);
        }, state);
      }

    case types.SET_EDITOR_ACTIVE_TAB:
      {
        return Object(utils["setIn"])(['editor', 'activeTab'], action.data, state);
      }

    case types.SET_SOURCE_ERROR:
      {
        return Object(utils["setIn"])(['editor', 'editingSource', 'error'], action.data, state);
      }

    case types.SET_SOURCE_CURRENT:
      {
        return Object(utils["setIn"])(['editor', 'editingSource', 'current'], action.data, state);
      }

    default:
      return state;
  }
}
// CONCATENATED MODULE: ./src/redux/index.js







var createStore = Object(redux_es["a" /* applyMiddleware */])(redux_thunk_lib_default.a, promiseMiddleWare(), postLogicMiddleWare())(redux_es["c" /* createStore */]);


// CONCATENATED MODULE: ./src/common/interpreter.js
var interpreter_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var interpreter_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function interpreter_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function interpreter_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Interpreter = function () {
  function Interpreter() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    interpreter_classCallCheck(this, Interpreter);

    this.state = {
      labels: {},
      tags: [],
      commands: []
    };

    if (opts.pre) {
      this.__customPre = opts.pre;
    }

    if (opts.run) {
      this.__customRun = opts.run;
    }

    if (opts.post) {
      this.__customPost = opts.post;
    }
  }

  interpreter_createClass(Interpreter, [{
    key: 'reset',
    value: function reset() {
      this.__setState({
        labels: {},
        tags: [],
        commands: []
      });
    }
  }, {
    key: 'preprocess',
    value: function preprocess(commands) {
      var _this = this;

      var nextState = { commands: commands, tags: [] };
      var halfTags = [];
      var errorAtIndex = function errorAtIndex(i, msg) {
        var e = new Error(msg);
        e.errorIndex = i;
        return e;
      };

      commands.forEach(function (c, i) {
        if (_this.__customPre && _this.__customPre(c, i)) return;

        var topHalfTag = halfTags[halfTags.length - 1];

        switch (c.cmd) {
          // Commands for WHILE statements
          case 'while':
            {
              if (halfTags.find(function (tag) {
                return tag.type === 'while';
              })) {
                throw errorAtIndex(i, 'No nested while allowed (at command #' + (i + 1) + ')');
              }

              halfTags.push({
                type: 'while',
                start: { index: i, command: c }
              });

              break;
            }

          case 'endWhile':
            {
              if (!topHalfTag || topHalfTag.type !== 'while') {
                throw errorAtIndex(i, 'No matching while for this endWhile (at command #' + (i + 1) + ')');
              }

              nextState.tags.push(interpreter_extends({}, topHalfTag, {
                end: { index: i, command: c }
              }));

              halfTags.pop();
              break;
            }
          // -----------------------------

          // Commands for IF statements
          case 'if':
            {
              if (halfTags.find(function (tag) {
                return tag.type === 'if';
              })) {
                throw errorAtIndex(i, 'No nested if allowed (at command #' + (i + 1) + ')');
              }

              halfTags.push({
                type: 'if',
                start: { index: i, command: c }
              });

              break;
            }

          case 'else':
            {
              if (!topHalfTag || topHalfTag.type !== 'if') {
                throw errorAtIndex(i, 'No matching if for this else (at command #' + (i + 1) + ')');
              }

              interpreter_extends(topHalfTag, {
                fork: { index: i, command: c }
              });

              break;
            }

          case 'endif':
            {
              if (!topHalfTag || topHalfTag.type !== 'if') {
                throw errorAtIndex(i, 'No matching if for this endif (at command #' + (i + 1) + ')');
              }

              nextState.tags.push(interpreter_extends({}, topHalfTag, {
                end: { index: i, command: c }
              }));

              halfTags.pop();
              break;
            }
          // -----------------------------

          case 'label':
            {
              if (!c.target || !c.target.length) {
                throw new Error('invalid target for label commmand');
              }

              _this.__setState({
                labels: interpreter_extends({}, _this.state.labels, interpreter_defineProperty({}, c.target, { index: i }))
              });

              break;
            }
        }
      });

      if (halfTags.length > 0) {
        var topHalfTag = halfTags[halfTags.length - 1];
        throw errorAtIndex(topHalfTag.start.index, 'Unclosed \'' + topHalfTag.type + '\' (at command #' + (topHalfTag.start.index + 1) + ')');
      }

      this.__setState(nextState);
    }
  }, {
    key: 'run',
    value: function run(command, index) {
      var cmd = command.cmd,
          target = command.target,
          value = command.value;


      if (this.__customRun) {
        var p = this.__customRun(command, index);
        if (p) return Promise.resolve(p);
      }

      // label
      switch (cmd) {
        case 'onError':
          {
            var _value = command.value && command.value.trim();
            var _target = command.target && command.target.trim();
            var isValidTarget = _target && (/^#restart$/i.test(_target) || /^#goto$/i.test(_target));

            if (!isValidTarget) {
              throw new Error('invalid target for onError command');
            }

            if (/^#goto$/i.test(_target)) {
              if (!this.state.labels[_value]) {
                throw new Error('label ' + _value + ' doesn\'t exist');
              }
            }

            return Promise.resolve({ isFlowLogic: true });
          }

        case 'gotoLabel':
          {
            if (!target || !target.length) {
              throw new Error('invalid target for gotoLabel commmand');
            }

            if (!this.state.labels[target]) {
              throw new Error('label ' + target + ' doesn\'t exist');
            }

            return Promise.resolve({
              isFlowLogic: true,
              nextIndex: this.state.labels[target].index
            });
          }

        case 'else':
          {
            // Note: 'else' command itself will be skipped if condition is false,
            // But it will be run as the ending command of 'if-else' when condition is true
            var tag = this.state.tags.find(function (tag) {
              return tag.type === 'if' && tag.fork.index === index;
            });

            if (!tag) {
              throw new Error('tag not found for this else (at command #' + (index + 1) + ')');
            }

            return Promise.resolve({
              isFlowLogic: true,
              nextIndex: tag.end.index + 1
            });
          }

        case 'endif':
          {
            return Promise.resolve({ isFlowLogic: true });
          }

        case 'endWhile':
          {
            var _tag = this.state.tags.find(function (tag) {
              return tag.type === 'while' && tag.end.index === index;
            });

            if (!_tag) {
              throw new Error('tag not found for this endWhile (at command #' + (index + 1) + ')');
            }

            return Promise.resolve({
              isFlowLogic: true,
              nextIndex: _tag.start.index
            });
          }

        case 'comment':
          return Promise.resolve({ isFlowLogic: true });

        // As of 'label', it doesn't do anything, so we just kind of skip it
        case 'label':
          return Promise.resolve({ isFlowLogic: true });

        // Note: gotoIf, if and while need to run eval, which is not allowed in extension scope,
        // so we have to run eval in content script
        case 'gotoIf':
        case 'if':
        case 'while':
        default:
          return Promise.resolve({ isFlowLogic: false });
      }
    }
  }, {
    key: 'postRun',
    value: function postRun(command, index, result) {
      var cmd = command.cmd,
          target = command.target,
          value = command.value;


      if (this.__customPost) {
        var p = this.__customPost(command, index, result);
        if (p) return Promise.resolve(p);
      }

      switch (cmd) {
        case 'gotoIf':
          {
            // short-circuit the check on value
            if (!result.condition) return Promise.resolve();

            if (!value || !value.length) {
              throw new Error('invalid value for value commmand');
            }

            if (!this.state.labels[value]) {
              throw new Error('label ' + value + ' doesn\'t exist');
            }

            return Promise.resolve({
              nextIndex: this.state.labels[value].index
            });
          }

        case 'if':
          {
            var cond = result.condition;
            var tag = this.state.tags.find(function (tag) {
              return tag.type === 'if' && tag.start.index === index;
            });

            if (!tag) {
              throw new Error('tag not found for this if (at command #' + (index + 1) + ')');
            }

            var forkIndex = tag.fork && tag.fork.index + 1;
            var endIndex = tag.end && tag.end.index + 1;

            return Promise.resolve({
              nextIndex: cond ? index + 1 : forkIndex || endIndex
            });
          }

        case 'while':
          {
            var _cond = result.condition;
            var _tag2 = this.state.tags.find(function (tag) {
              return tag.type === 'while' && tag.start.index === index;
            });

            if (!_tag2) {
              throw new Error('tag not found for this while (at command #' + (index + 1) + ')');
            }

            if (!_tag2.end || _tag2.end.index === undefined || _tag2.end.index === null) {
              throw new Error('tag doesn\'t have a valid end index');
            }

            return Promise.resolve(_cond ? {} : { nextIndex: _tag2.end.index + 1 });
          }

        default:
          return Promise.resolve();
      }
    }
  }, {
    key: 'commandIndexByLabel',
    value: function commandIndexByLabel(labelName) {
      var label = this.state.labels[labelName];

      if (!label) {
        throw new Error('label \'' + labelName + '\' doesn\'t exist');
      }

      return label.index;
    }
  }, {
    key: '__setState',
    value: function __setState(st) {
      this.state = interpreter_extends({}, this.state, st);
    }
  }]);

  return Interpreter;
}();

/* harmony default export */ var common_interpreter = (Interpreter);
// EXTERNAL MODULE: ./node_modules/csv/lib/index.js
var csv_lib = __webpack_require__(247);
var csv_lib_default = /*#__PURE__*/__webpack_require__.n(csv_lib);

// CONCATENATED MODULE: ./src/common/csv.js


var csvDataURI = function csvDataURI(csvStr) {
  return 'data:text/csv;base64,' + window.btoa(unescape(encodeURIComponent(csvStr)));
};

function parseFromCSV(text) {
  return new Promise(function (resolve, reject) {
    csv_lib_default.a.parse(text, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

function stringifyToCSV(list) {
  return new Promise(function (resolve, reject) {
    csv_lib_default.a.stringify(list, function (err, data) {
      if (err) return reject(err);
      return resolve(data);
    });
  });
}

function toCsvDataURI(list) {
  return stringifyToCSV(list).then(csvDataURI);
}
// EXTERNAL MODULE: ./src/common/command_runner.js + 2 modules
var command_runner = __webpack_require__(64);

// EXTERNAL MODULE: ./src/services/xy/index.ts
var xy = __webpack_require__(48);

// CONCATENATED MODULE: ./src/init_player.js



var init_player_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var init_player_slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var init_player_createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function init_player_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function init_player_classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }


















var TimeTracker = function () {
  function TimeTracker() {
    init_player_classCallCheck(this, TimeTracker);

    this.reset();
  }

  init_player_createClass(TimeTracker, [{
    key: 'reset',
    value: function reset() {
      this.startTime = new Date();
    }
  }, {
    key: 'elapsed',
    value: function elapsed() {
      return new Date() - this.startTime;
    }
  }, {
    key: 'elapsedInSeconds',
    value: function elapsedInSeconds() {
      var diff = this.elapsed();
      return (diff / 1000).toFixed(2) + 's';
    }
  }]);

  return TimeTracker;
}();

var Timeout = function () {
  function Timeout(callback) {
    init_player_classCallCheck(this, Timeout);

    this.callback = callback;
  }

  init_player_createClass(Timeout, [{
    key: 'reset',
    value: function reset(callback) {
      this.cancel();

      if (callback) {
        this.callback = callback;
      }

      this.timer = null;
      this.timeout = null;
      this.startTime = null;
    }
  }, {
    key: 'restart',
    value: function restart(newTimeout) {
      if (!this.timeout) {
        this.timeout = newTimeout;
        this.startTime = new Date();
        this.timer = setTimeout(this.callback, this.timeout);
      } else {
        var past = new Date() * 1 - this.startTime * 1;
        var rest = newTimeout - past;

        clearTimeout(this.timer);

        if (rest < 0) return this.callback();

        this.timeout = newTimeout;
        this.timer = setTimeout(this.callback, rest);
      }
    }
  }, {
    key: 'cancel',
    value: function cancel() {
      clearTimeout(this.timer);
    }
  }]);

  return Timeout;
}();

var replaceEscapedChar = function replaceEscapedChar(str, command, field) {
  if (['storeEval', 'gotoIf', 'if', 'while'].indexOf(command.cmd) !== -1 && field === 'target') {
    return str;
  }

  return [[/\\n/g, '\n'], [/\\t/g, '\t']].reduce(function (prev, _ref) {
    var _ref2 = init_player_slicedToArray(_ref, 2),
        reg = _ref2[0],
        c = _ref2[1];

    return prev.replace(reg, c);
  }, str);
};

var init_player_retryIfHeartBeatExpired = function retryIfHeartBeatExpired(mainFunc) {
  var runWithHeartBeat = function runWithHeartBeat() {
    var stop = false;

    var infiniteCheckHeartBeat = function () {
      var startTime = new Date().getTime();
      var stop = false;
      var lastSecret = null;

      var fn = function fn() {
        Object(common_log["a" /* default */])('start to send heart beat to background');
        if (stop) return Promise.resolve();

        return ipc_cs["a" /* default */].ask('PANEL_HEART_BEAT', {}, 300).then(function (secret) {
          // Note: secret === -1 means no heart beat available
          if (secret === -1) return new Promise(function () {});

          if (secret === lastSecret) {
            throw new Error('lost background heart beat when running command');
          } else {
            lastSecret = secret;
          }

          return Object(utils["delay"])(function () {}, 3000).then(fn);
        }, function (e) {
          common_log["a" /* default */].error('lost background heart beart!!', e.stack);
          throw new Error('lost background heart beat when running command');
        });
      };
      fn.stop = function () {
        Object(common_log["a" /* default */])('stopping background heart beat');
        stop = true;
      };

      return fn;
    }();

    return Promise.race([mainFunc().then(function (data) {
      infiniteCheckHeartBeat.stop();
      return data;
    }).catch(function (e) {
      infiniteCheckHeartBeat.stop();
      throw e;
    }), infiniteCheckHeartBeat()]);
  };

  var retryFn = Object(utils["retry"])(runWithHeartBeat, {
    timeout: 999999,
    shouldRetry: function shouldRetry(e, retryCount) {
      return e && e.message && e.message.indexOf('lost background heart beat when running command') !== -1 && retryCount < 10;
    }
  });

  return retryFn();
};

var interpretSpecialCommands = function interpretSpecialCommands(_ref3) {
  var store = _ref3.store,
      vars = _ref3.vars,
      getTcPlayer = _ref3.getTcPlayer;

  var commandRunners = [init_player_interpretCSVCommands({ store: store, vars: vars, getTcPlayer: getTcPlayer }), init_player_interpretCsFreeCommands({ store: store, vars: vars, getTcPlayer: getTcPlayer })];

  return function (command, index) {
    return commandRunners.reduce(function (prev, cur) {
      if (prev !== undefined) return prev;
      return cur(command, index);
    }, undefined);
  };
};

var init_player_interpretCsFreeCommands = function interpretCsFreeCommands(_ref4) {
  var store = _ref4.store,
      vars = _ref4.vars,
      getTcPlayer = _ref4.getTcPlayer;

  var runCsFreeCommands = function runCsFreeCommands(command, index) {
    var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();
    var ssStorage = Object(services_storage["getStorageManager"])().getScreenshotStorage();
    var cmd = command.cmd,
        target = command.target,
        value = command.value,
        extra = command.extra;

    var result = {
      isFlowLogic: true
    };
    var runCommand = function runCommand(command) {
      return init_player_askBackgroundToRunCommand({
        vars: vars,
        store: store,
        command: command,
        loopTracker: null,
        state: getTcPlayer().getState(),
        preRun: function preRun(command, state, askBgToRun) {
          return askBgToRun(command);
        }
      });
    };

    Object(common_log["a" /* default */])('interpretCsFreeCommands', command);

    switch (cmd) {
      case 'store':
        {
          return {
            byPass: true,
            vars: init_player_defineProperty({}, value, target)
          };
        }

      case 'echo':
        {
          var _extra = function () {
            if (value === '#shownotification') return { options: { notification: true } };
            if (value) return { options: { color: value } };
            return {};
          }();

          return {
            byPass: true,
            log: init_player_extends({
              info: target
            }, _extra)
          };
        }

      case 'throwError':
        {
          throw new Error(target);
        }

      case 'pause':
        {
          var n = parseInt(target);

          if (!target || !target.length || n === 0) {
            return {
              byPass: true,
              control: {
                type: 'pause'
              }
            };
          }

          if (isNaN(n) || n < 0) {
            throw new Error('target of pause command must be a positive integer');
          }

          return Object(utils["withCountDown"])({
            timeout: n,
            interval: 1000,
            onTick: function onTick(_ref5) {
              var total = _ref5.total,
                  past = _ref5.past;

              store.dispatch(setTimeoutStatus({
                past: past,
                total: total,
                type: 'pause'
              }));
            }
          }).then(function () {
            return { byPass: true };
          });
        }

      case 'localStorageExport':
        {
          var deleteAfterExport = /\s*#DeleteAfterExport\s*/i.test(value);

          if (/^\s*log\s*$/i.test(target)) {
            var text = store.getState().logs.map(renderLog).join('\n');
            file_saver_default.a.saveAs(new Blob([text]), 'kantu_log.txt');

            if (deleteAfterExport) {
              store.dispatch(clearLogs());
            }

            return result;
          }

          if (/\.csv$/i.test(target)) {
            return csvStorage.exists(target).then(function (existed) {
              if (!existed) throw new Error(target + ' doesn\'t exist');

              return csvStorage.read(target, 'Text').then(function (text) {
                file_saver_default.a.saveAs(new Blob([text]), target);

                if (deleteAfterExport) {
                  csvStorage.remove(target).then(function () {
                    return store.dispatch(listCSV());
                  });
                }

                return result;
              });
            });
          }

          if (/\.png$/i.test(target)) {
            return ssStorage.exists(target).then(function (existed) {
              if (!existed) throw new Error(target + ' doesn\'t exist');

              return ssStorage.read(target, 'ArrayBuffer').then(function (buffer) {
                file_saver_default.a.saveAs(new Blob([new Uint8Array(buffer)]), target);

                if (deleteAfterExport) {
                  ssStorage.remove(target).then(function () {
                    return store.dispatch(listScreenshots());
                  });
                }

                return result;
              });
            });
          }

          throw new Error(target + ' doesn\'t exist');
        }

      case 'visualVerify':
      case 'visualAssert':
      case 'visualSearch':
      case 'visionFind':
        {
          if (cmd === 'visualSearch') {
            if (!value || !value.length) {
              throw new Error(cmd + ': Must specify a variable to save the result');
            }
          }

          var verifyPatternImage = function verifyPatternImage(fileName, command) {
            return Object(services_storage["getStorageManager"])().getVisionStorage().exists(fileName).then(function (existed) {
              if (!existed) throw new Error(command + ': No input image found for file name \'' + fileName + '\'');
            });
          };

          var isNotVerifyOrAssert = ['visualVerify', 'visualAssert'].indexOf(cmd) === -1;

          var _target$split = target.split('@'),
              _target$split2 = init_player_slicedToArray(_target$split, 2),
              visionFileName = _target$split2[0],
              confidence = _target$split2[1];

          var minSimilarity = confidence ? parseFloat(confidence) : store.getState().config.defaultVisionSearchConfidence;
          var searchArea = vars.get('!visualSearchArea');
          var timeout = vars.get('!TIMEOUT_WAIT') * 1000;

          var run = function run() {
            return ipc_cs["a" /* default */].ask('PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE')
            // #324 .then(() => delay(() => {}, 500))
            .then(function () {
              return ipc_cs["a" /* default */].ask('PANEL_SEARCH_VISION_ON_PLAYING_PAGE', {
                visionFileName: visionFileName,
                minSimilarity: minSimilarity,
                searchArea: searchArea,
                storedImageRect: vars.get('!storedImageRect'),
                command: cmd
              });
            }).then(function (regions) {
              Object(common_log["a" /* default */])('regions', regions);

              if (regions.length === 0) {
                throw new Error('Image \'' + visionFileName + '\' (conf. = ' + minSimilarity + ') not found');
              }

              var best = regions[0];
              ipc_cs["a" /* default */].ask('PANEL_HIGHLIGHT_RECTS', { scoredRects: regions });

              return Object(utils["delay"])(function () {
                return {
                  best: best,
                  byPass: true,
                  vars: init_player_extends({
                    '!imageX': best.left + best.width / 2,
                    '!imageY': best.top + best.height / 2
                  }, isNotVerifyOrAssert && value && value.length ? init_player_defineProperty({}, value, regions.length) : {})
                };
              }, 100);
            });
          };
          var runWithRetry = Object(utils["retry"])(run, {
            timeout: timeout,
            shouldRetry: function shouldRetry(e) {
              return store.getState().status === constant["a" /* APP_STATUS */].PLAYER && /Image.*\(conf\. =.*\) not found/.test(e.message);
            },
            retryInterval: function retryInterval(retryCount, lastRetryInterval) {
              return 0.5 + 0.25 * retryCount;
            },
            onFirstFail: function onFirstFail() {
              ipc_cs["a" /* default */].ask('PANEL_TIMEOUT_STATUS', { timeout: timeout, type: 'Vision waiting' });
            },
            onFinal: function onFinal() {
              ipc_cs["a" /* default */].ask('PANEL_CLEAR_TIMEOUT_STATUS');
            }
          });

          return verifyPatternImage(visionFileName, cmd).then(function () {
            return runWithRetry().catch(function (e) {
              // Note: extra.throwError === true, when "Find" button is used
              if (cmd === 'visualAssert' || extra && extra.throwError) {
                throw e;
              }

              return init_player_extends({
                byPass: true
              }, isNotVerifyOrAssert && value && value.length ? {
                vars: init_player_defineProperty({}, value, 0)
              } : {}, cmd === 'visualVerify' ? {
                log: {
                  error: e.message
                }
              } : {});
            });
          });
        }

      case 'visionLimitSearchArea':
        {
          var area = target.trim();
          var p = Promise.resolve({ byPass: true });

          if (/^viewport$/.test(area)) {
            area = 'viewport';
          } else if (/^full$/.test(area)) {
            area = 'full';
          } else if (/^element:/.test(area)) {
            // Note: let cs page to process this case, it acts almost the same as a `storeImage` command
            p = Promise.resolve({ byPass: false });
          } else {
            throw new Error('Target of visionLimitSearchArea could only be either \'viewport\', \'full\' or \'element:...\'');
          }

          vars.set({ '!visualSearchArea': area }, true);
          return p;
        }

      case 'bringBrowserToForeground':
        {
          return ipc_cs["a" /* default */].ask('PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND').then(function () {
            return { byPass: true };
          });
        }

      case 'resize':
        {
          if (!/\s*\d+@\d+\s*/.test(target)) {
            throw new Error('Syntax for target of resize command is x@y, e.g. 800@600');
          }

          var _target$split3 = target.split('@'),
              _target$split4 = init_player_slicedToArray(_target$split3, 2),
              strWidth = _target$split4[0],
              strHeight = _target$split4[1];

          var width = parseInt(strWidth, 10);
          var height = parseInt(strHeight, 10);

          Object(common_log["a" /* default */])('resize', width, height);
          return ipc_cs["a" /* default */].ask('PANEL_RESIZE_PLAY_TAB', { width: width, height: height }).then(function (_ref7) {
            var actual = _ref7.actual,
                desired = _ref7.desired,
                diff = _ref7.diff;

            if (diff.length === 0) return { byPass: true };

            return {
              byPass: true,
              log: {
                warning: 'Only able to resize it to ' + actual.width + '@' + actual.height + ', given ' + desired.width + '@' + desired.height
              }
            };
          });
        }

      case 'XType':
        {
          return Object(x_user_io["getXUserIO"])().sanityCheck().then(function () {
            return Object(xy["getNativeXYAPI"])().sendText({ text: target }).then(function (success) {
              if (!success) throw new Error('Failed to XType \'' + target + '\'');
              return { byPass: true };
            });
          });
        }

      case 'XMove':
      case 'XClick':
        {
          var parseTarget = function parseTarget() {
            var target = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            var trimmedTarget = target.trim();

            if (Object(command_runner["b" /* isLocator */])(trimmedTarget)) {
              return {
                type: 'locator',
                value: { locator: trimmedTarget }
              };
            }

            if (/^[dD](\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)$/.test(trimmedTarget)) {
              return {
                type: 'desktop_coordinates',
                value: { coordinates: trimmedTarget.substr(1).split(/\s*,\s*/) }
              };
            }

            if (/^(\d+(\.\d+)?)\s*,\s*(\d+(\.\d+)?)$/.test(trimmedTarget)) {
              return {
                type: 'viewport_coordinates',
                value: { coordinates: trimmedTarget.split(/\s*,\s*/) }
              };
            }

            if (/^.*\.png(@\d\.\d+)?$/.test(trimmedTarget)) {
              return {
                type: 'visual_search',
                value: { query: trimmedTarget }
              };
            }

            throw new Error('XClick: invalid target, \'' + target + '\'');
          };
          var parseValueForXClick = function parseValueForXClick() {
            var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            var normalValue = value.trim().toLowerCase();

            switch (normalValue) {
              case '':
                return '#left';

              case '#left':
              case '#middle':
              case '#right':
              case '#doubleclick':
                return normalValue;

              default:
                throw new Error('XClick: invalid value, \'' + value + '\'');
            }
          };
          var parseValueForXMove = function parseValueForXMove() {
            var value = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            var normalValue = value.trim().toLowerCase();

            switch (normalValue) {
              case '':
                return '#move';

              case '#move':
              case '#up':
              case '#down':
                return normalValue;

              default:
                throw new Error('XMove: invalid value, \'' + value + '\'');
            }
          };
          var parseValue = {
            XClick: parseValueForXClick,
            XMove: parseValueForXMove
          }[cmd];

          return Object(x_user_io["getXUserIO"])().sanityCheck().then(function () {
            var realTarget = parseTarget(target);
            var realValue = parseValue(value);

            var pNativeXYParams = function () {
              switch (realTarget.type) {
                case 'locator':
                  {
                    return runCommand(init_player_extends({}, command, {
                      cmd: 'locate',
                      target: realTarget.value.locator,
                      value: ''
                    })).then(function (result) {
                      var rect = result.rect;

                      if (!rect) throw new Error('no rect data returned');

                      var x = rect.x + rect.width / 2;
                      var y = rect.y + rect.height / 2;

                      if (isNaN(x)) throw new Error('empty x');
                      if (isNaN(y)) throw new Error('empty y');

                      return {
                        type: 'viewport',
                        offset: { x: x, y: y }
                      };
                    });
                  }

                case 'visual_search':
                  {
                    return runCsFreeCommands(init_player_extends({}, command, {
                      cmd: 'visualAssert',
                      target: realTarget.value.query,
                      value: ''
                    })).then(function (result) {
                      var best = result.best;

                      if (!best) throw new Error('no best found from result of verifyAssert triggered by XClick');

                      var x = best.offsetLeft + best.width / 2;
                      var y = best.offsetTop + best.height / 2;

                      if (isNaN(x)) throw new Error('empty x');
                      if (isNaN(y)) throw new Error('empty y');

                      return {
                        type: 'viewport',
                        offset: { x: x, y: y },
                        originalResult: result
                      };
                    });
                  }

                case 'desktop_coordinates':
                  {
                    var coordinates = realTarget.value.coordinates;


                    return Promise.resolve({
                      type: 'desktop',
                      offset: {
                        x: parseFloat(coordinates[0]),
                        y: parseFloat(coordinates[1])
                      }
                    });
                  }

                case 'viewport_coordinates':
                  {
                    var _coordinates = realTarget.value.coordinates;


                    return Promise.resolve({
                      type: 'viewport',
                      offset: {
                        x: parseFloat(_coordinates[0]),
                        y: parseFloat(_coordinates[1])
                      }
                    });
                  }
              }
            }();

            return pNativeXYParams.then(function (_ref8) {
              var type = _ref8.type,
                  offset = _ref8.offset,
                  _ref8$originalResult = _ref8.originalResult,
                  originalResult = _ref8$originalResult === undefined ? {} : _ref8$originalResult;

              return runCsFreeCommands({ cmd: 'bringBrowserToForeground' }).then(function () {
                return Object(utils["delay"])(function () {}, 300);
              }).then(function () {
                var api = Object(xy["getNativeXYAPI"])();

                var _ref9 = function () {
                  switch (realValue) {
                    case '#left':
                      return [xy["MouseButton"].Left, xy["MouseEventType"].Click];
                    case '#middle':
                      return [xy["MouseButton"].Middle, xy["MouseEventType"].Click];
                    case '#right':
                      return [xy["MouseButton"].Right, xy["MouseEventType"].Click];
                    case '#doubleclick':
                      return [xy["MouseButton"].Left, xy["MouseEventType"].DoubleClick];
                    case '#move':
                      return [xy["MouseButton"].Left, xy["MouseEventType"].Move];
                    case '#up':
                      return [xy["MouseButton"].Left, xy["MouseEventType"].Up];
                    case '#down':
                      return [xy["MouseButton"].Left, xy["MouseEventType"].Down];
                    default:
                      throw new Error('Unsupported realValue: ' + realValue);
                  }
                }(),
                    _ref10 = init_player_slicedToArray(_ref9, 2),
                    button = _ref10[0],
                    eventType = _ref10[1];

                var event = {
                  button: button,
                  x: offset.x,
                  y: offset.y,
                  type: eventType
                };
                var pSendMouseEvent = type === 'desktop' ? api.sendMouseEvent(event) : api.sendViewportMouseEvent(event, {
                  markPage: function markPage() {
                    return ipc_cs["a" /* default */].ask('PANEL_TOGGLE_HIGHLIGHT_VIEWPORT', { on: true }).then(function () {
                      return Object(utils["delay"])(function () {}, 200);
                    });
                  },
                  unmarkPage: function unmarkPage() {
                    return ipc_cs["a" /* default */].ask('PANEL_TOGGLE_HIGHLIGHT_VIEWPORT', { on: false }).then(function () {
                      return Object(utils["delay"])(function () {}, 200);
                    });
                  },
                  needCalibration: function needCalibration() {
                    return ipc_cs["a" /* default */].ask('PANEL_XCLICK_NEED_CALIBRATION', {}).catch(function (e) {
                      return true;
                    });
                  }
                });

                return pSendMouseEvent.then(function (success) {
                  if (!success) throw new Error('Failed to ' + cmd + ' ' + type + ' coordiates at [' + offset.x + ', ' + offset.y + ']');

                  // Note: `originalResult` is used by visualAssert to update !imageX and !imageY
                  return init_player_extends({}, originalResult, {
                    byPass: true
                  });
                });
              });
            });
          });
        }

      default:
        return undefined;
    }
  };

  return runCsFreeCommands;
};

var init_player_interpretCSVCommands = function interpretCSVCommands(_ref11) {
  var store = _ref11.store,
      vars = _ref11.vars;
  return function (command, index) {
    var csvStorage = Object(services_storage["getStorageManager"])().getCSVStorage();
    var cmd = command.cmd,
        target = command.target,
        value = command.value;


    switch (cmd) {
      case 'csvRead':
        {
          return csvStorage.exists(target).then(function (isExisted) {
            if (!isExisted) {
              vars.set({ '!CsvReadStatus': 'FILE_NOT_FOUND' }, true);
              throw new Error('csv file \'' + target + '\' does not exist');
            }

            return csvStorage.read(target, 'Text').then(parseFromCSV).then(function (rows) {
              // Note: !CsvReadLineNumber starts from 1
              var index = vars.get('!CsvReadLineNumber') - 1;
              var row = rows[index];

              if (index >= rows.length) {
                vars.set({ '!CsvReadStatus': 'END_OF_FILE' }, true);
                throw new Error('end of csv file reached');
              } else {
                vars.set({
                  '!CsvReadStatus': 'OK',
                  '!CsvReadMaxRow': rows.length
                }, true);
              }

              vars.clear(/^!COL\d+$/i);

              row.forEach(function (data, i) {
                vars.set(init_player_defineProperty({}, '!COL' + (i + 1), data));
              });
            });
          }).then(function () {
            return {
              isFlowLogic: true
            };
          });
        }

      case 'csvSave':
        {
          var csvLine = vars.get('!CSVLINE');

          if (!csvLine || !csvLine.length) {
            throw new Error('No data to save to csv');
          }

          return stringifyToCSV([csvLine]).then(function (newLineText) {
            var fileName = /\.csv$/i.test(target) ? target : target + '.csv';

            return csvStorage.exists(fileName).then(function (isExisted) {
              if (!isExisted) {
                return csvStorage.write(fileName, new Blob([newLineText]));
              }

              return csvStorage.read(fileName, 'Text').then(function (originalText) {
                var text = (originalText + '\n' + newLineText).replace(/\n+/g, '\n');
                return csvStorage.overwrite(fileName, new Blob([text]));
              });
            });
          }).then(function () {
            vars.clear(/^!CSVLINE$/);
            store.dispatch(listCSV());
          }).then(function () {
            return {
              isFlowLogic: true
            };
          });
        }

      default:
        return undefined;
    }
  };
};

// Note: initialize the player, and listen to all events it emits
var init_player_initPlayer = function initPlayer(store) {
  var vars = varsFactory();
  var interpreter = new common_interpreter({
    run: interpretSpecialCommands({
      vars: vars,
      store: store,
      getTcPlayer: function getTcPlayer() {
        return tcPlayer;
      }
    })
  });
  var tcPlayer = init_player_initTestCasePlayer({ store: store, vars: vars, interpreter: interpreter });
  var tsPlayer = init_player_initTestSuitPlayer({ store: store, tcPlayer: tcPlayer });

  // Note: No need to return anything in this method.
  // Because both test case player and test suite player are cached in player.js
  // All later usage of player utilize `getPlayer` method
};

// Note: Standalone function to ask background to run a command
var init_player_askBackgroundToRunCommand = function askBackgroundToRunCommand(_ref12) {
  var command = _ref12.command,
      state = _ref12.state,
      store = _ref12.store,
      vars = _ref12.vars,
      loopTracker = _ref12.loopTracker,
      preRun = _ref12.preRun;

  var useClipboard = /!clipboard/i.test(command.target + ';' + command.value);
  var prepare = !useClipboard ? Promise.resolve({ useClipboard: false }) : ipc_cs["a" /* default */].ask('GET_CLIPBOARD').then(function (clipboard) {
    return { useClipboard: true, clipboard: clipboard };
  });

  if (web_extension_default.a.isFirefox()) {
    switch (command.cmd) {
      case 'onDownload':
        store.dispatch(addLog('warning', 'onDownload - changing file names not supported by Firefox extension api yet'));
        break;
    }
  }

  return prepare.then(function (_ref13) {
    var useClipboard = _ref13.useClipboard,
        _ref13$clipboard = _ref13.clipboard,
        clipboard = _ref13$clipboard === undefined ? '' : _ref13$clipboard;

    // Set clipboard variable if it is used
    if (useClipboard) {
      vars.set({ '!CLIPBOARD': clipboard });
    }

    // Set loop in every run
    vars.set({
      '!LOOP': state.loopsCursor,
      '!RUNTIME': loopTracker ? loopTracker.elapsedInSeconds() : 0
    }, true);

    if (command.cmd === 'open') {
      command = init_player_extends({}, command, { href: state.startUrl });
    }

    // Note: translate shorthand '#efp'
    if (command.target && /^#efp$/i.test(command.target.trim())) {
      // eslint-disable-next-line no-template-curly-in-string
      command.target = '#elementfrompoint (${!imageX}, ${!imageY})';
    }

    if (command.cmd !== 'comment') {
      // Replace variables in 'target' and 'value' of commands
      ;['target', 'value'].forEach(function (field) {
        if (command[field] === undefined) return;

        var opts = command.cmd === 'storeEval' && field === 'target' || command.cmd === 'gotoIf' && field === 'target' || command.cmd === 'if' && field === 'target' || command.cmd === 'while' && field === 'target' ? { withHashNotation: true } : {};

        command = init_player_extends({}, command, init_player_defineProperty({}, field, vars.render(replaceEscapedChar(command.cmd === 'type' ? command[field] : command[field].trim(), command, field), opts)));
      });
    }

    // add timeout info to each command's extra
    // Please note that we must set the timeout info at runtime for each command,
    // so that timeout could be modified by some 'store' commands and affect
    // the rest of commands
    command = Object(utils["updateIn"])(['extra'], function (extra) {
      return init_player_extends({}, extra || {}, {
        timeoutPageLoad: vars.get('!TIMEOUT_PAGELOAD'),
        timeoutElement: vars.get('!TIMEOUT_WAIT'),
        timeoutDownload: vars.get('!TIMEOUT_DOWNLOAD'),
        lastCommandOk: vars.get('!LASTCOMMANDOK'),
        errorIgnore: !!vars.get('!ERRORIGNORE'),
        waitForVisible: !!vars.get('!WAITFORVISIBLE')
      });
    }, command);

    return preRun(command, state, function (command) {
      // Note: -1 will disable ipc timeout for 'pause' command
      var timeout = command.cmd === 'pause' ? -1 : null;

      return init_player_retryIfHeartBeatExpired(function () {
        return ipc_cs["a" /* default */].ask('PANEL_RUN_COMMAND', { command: command }, timeout);
      });
    });
  });
};

var init_player_initTestCasePlayer = function initTestCasePlayer(_ref14) {
  var store = _ref14.store,
      vars = _ref14.vars,
      interpreter = _ref14.interpreter;

  var mainTracker = new TimeTracker();
  var loopTracker = new TimeTracker();
  var macroTimer = new Timeout(function () {
    return player.stopWithError(new Error('macro timeout ' + vars.get('!TIMEOUT_MACRO') + 's (change the value in the settings if needed)'));
  });
  var nextCommand = function nextCommand(playerState) {
    var resources = playerState.resources,
        nextIndex = playerState.nextIndex;

    return resources[nextIndex + 1];
  };
  // Note: use this to track `onError` command
  // `onError` works like a global try catch, it takes effects on any commands coming after `onError`
  // Multilple `onError` are allowed, latter one overwrites previous one.
  // The scope of `onError` is current loop
  var onErrorCommand = null;
  var player = getPlayer({
    prepare: function prepare(state) {
      // Each 'replay' has an independent variable scope,
      // with global variables as initial scope
      vars.reset({ keepGlobal: true });
      vars.set(state.public.scope || {}, true);
      vars.set({
        '!StatusOK': true,
        '!WaitForVisible': false,
        '!IMAGEX': 0,
        '!IMAGEY': 0
      });

      mainTracker.reset();
      loopTracker.reset();

      interpreter.reset();
      interpreter.preprocess(state.resources);

      return ipc_cs["a" /* default */].ask('PANEL_START_PLAYING', {
        url: state.startUrl,
        shouldNotActivateTab: true
      });
    },
    run: function run(command, state) {
      return init_player_askBackgroundToRunCommand({
        command: command,
        state: state,
        store: store,
        vars: vars,
        loopTracker: loopTracker,
        preRun: function preRun(command, state, askBgToRun) {
          // Note: all commands need to be run by interpreter before it is sent to bg
          // so that interpreter could pick those flow logic commands and do its job
          return interpreter.run(command, state.nextIndex).then(function (result) {
            var byPass = result.byPass,
                isFlowLogic = result.isFlowLogic,
                nextIndex = result.nextIndex,
                resetVars = result.resetVars;

            // Record onError command

            if (command.cmd === 'onError') {
              onErrorCommand = command;
            }

            if (byPass) return Promise.resolve(result);
            if (isFlowLogic) return Promise.resolve({ nextIndex: nextIndex });

            return askBgToRun(command);
          });
        }
      });
    },
    handleResult: function handleResult(result, command, state) {
      var prepares = [];
      var getCurrentPlayer = function getCurrentPlayer() {
        var state = store.getState();

        switch (state.player.mode) {
          case constant["e" /* PLAYER_MODE */].TEST_CASE:
            return getPlayer({ name: 'testCase' });

          case constant["e" /* PLAYER_MODE */].TEST_SUITE:
            return getPlayer({ name: 'testSuite' });
        }
      };

      // Every command should return its window.url
      if (result && result.pageUrl) {
        vars.set({ '!URL': result.pageUrl }, true);
      }

      if (result && result.vars) {
        var newVars = Object(utils["objMap"])(function (val) {
          if (val.__undefined__) return undefined;
          return val;
        }, result.vars);

        Object(common_log["a" /* default */])('set vars', newVars);

        try {
          vars.set(newVars);

          // Note: if set value to !Clipboard, there is an async job we must get done before handleResult could return
          var clipBoardKey = Object.keys(result.vars).find(function (key) {
            return (/!clipboard/i.test(key)
            );
          });
          if (clipBoardKey) {
            prepares.push(ipc_cs["a" /* default */].ask('SET_CLIPBOARD', { value: result.vars[clipBoardKey] }));
          }

          // Note: if user sets !timeout_macro to some other value, re-calculate the time left
          var timeoutMacroKey = Object.keys(result.vars).find(function (key) {
            return (/!timeout_macro/i.test(key)
            );
          });
          if (timeoutMacroKey) {
            macroTimer.restart(result.vars[timeoutMacroKey] * 1000);
          }
        } catch (e) {
          return Promise.reject(e);
        }
      }

      var hasError = false;

      if (result && result.log) {
        if (result.log.info) {
          store.dispatch(addLog('echo', result.log.info, result.log.options));

          if (result.log.options && result.log.options.notification) {
            ipc_cs["a" /* default */].ask('PANEL_NOTIFY_ECHO', { text: result.log.info });
          }
        }

        if (result.log.warning) {
          store.dispatch(addLog('warning', result.log.warning, result.log.options));
        }

        if (result.log.error) {
          store.dispatch(addPlayerErrorCommandIndex(state.nextIndex));
          store.dispatch(addLog('error', result.log.error, { ignored: true }));
          hasError = true;
        }
      }

      // From spec: !StatusOK, very similar to !LastCommandOK but it does not get reset by a “good” command.
      // If set to error, it remains like this. But a user can use store | true | !StatusOK to manually reset it.
      if (command.cmd !== 'echo') {
        vars.set({ '!LastCommandOK': !hasError }, true);
      }

      if (hasError) {
        vars.set({ '!StatusOK': false }, true);
      }

      if (result && result.screenshot) {
        store.dispatch(addLog('info', 'a new screenshot captured'));

        Object(services_storage["getStorageManager"])().getScreenshotStorage().getLink(result.screenshot.name).then(function (link) {
          return init_player_extends({}, result.screenshot, {
            url: link
          });
        }).then(function (ss) {
          store.dispatch(listScreenshots());
        }).catch(function (e) {
          common_log["a" /* default */].error('screenshot obj error 1', e);
          common_log["a" /* default */].error('screenshot obj error stack', e.stack);
        });
      }

      if (result && result.control) {
        switch (result.control.type) {
          case 'pause':
            // Important: should only pause test case player, not test suite player
            // Because once test suite player is paused, it is supposed to run the test case from start again
            getPlayer({ name: 'testCase' }).pause();
            ipc_cs["a" /* default */].ask('PANEL_NOTIFY_AUTO_PAUSE', {});
            break;

          default:
            throw new Error('Control type \'' + result.control.type + '\' not supported yet');
        }
      }

      if (/^(fast|medium|slow)$/i.test(vars.get('!REPLAYSPEED'))) {
        var val = vars.get('!REPLAYSPEED').toUpperCase();
        player.setPostDelay({
          FAST: 0,
          MEDIUM: 300,
          SLOW: 2000
        }[val]);
      }

      // For those flow logic that set nextIndex directly in Interpreter.run method
      if (result && result.nextIndex !== undefined) {
        return Promise.all(prepares).then(function () {
          return result.nextIndex;
        });
      }

      // For those flow logic that has to get result from bg
      // and return nextIndex in Interpreter.postRun
      return Promise.all(prepares).then(function () {
        return interpreter.postRun(command, state.nextIndex, result);
      }).then(function () {
        var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        return data.nextIndex;
      });
    }
  }, {
    preDelay: 0
  });

  player.on('BREAKPOINT', function () {
    ipc_cs["a" /* default */].ask('PANEL_NOTIFY_BREAKPOINT', {});
  });

  player.on('LOOP_START', function (_ref15) {
    var loopsCursor = _ref15.loopsCursor;

    // Note: set 'csv read line number' to loops whenever a new loop starts
    vars.set({
      '!CsvReadLineNumber': loopsCursor,
      '!visualSearchArea': 'viewport'
    }, true);

    loopTracker.reset();

    // Note: reset macro timeout on each loop
    macroTimer.reset();
    macroTimer.restart(vars.get('!TIMEOUT_MACRO') * 1000);

    // Note: reset onErrorCommand on each loop
    onErrorCommand = null;
  });

  player.on('LOOP_RESTART', function (_ref16) {
    var currentLoop = _ref16.currentLoop,
        loopsCursor = _ref16.loopsCursor;

    ipc_cs["a" /* default */].ask('PANEL_STOP_PLAYING', {});
    ipc_cs["a" /* default */].ask('PANEL_START_PLAYING', { shouldNotActivateTab: true });
    store.dispatch(addLog('status', 'Current loop: ' + currentLoop));
  });

  player.on('START', function (_ref17) {
    var title = _ref17.title,
        loopsCursor = _ref17.loopsCursor;

    Object(common_log["a" /* default */])('START');

    store.dispatch(startPlaying());

    store.dispatch(setPlayerState({
      status: constant["f" /* PLAYER_STATUS */].PLAYING,
      nextCommandIndex: null,
      errorCommandIndices: [],
      doneCommandIndices: []
    }));

    store.dispatch(addLog('status', 'Playing macro ' + title));
  });

  player.on('PAUSED', function () {
    Object(common_log["a" /* default */])('PAUSED');
    store.dispatch(setPlayerState({
      status: constant["f" /* PLAYER_STATUS */].PAUSED
    }));

    store.dispatch(addLog('status', 'Macro paused'));
  });

  player.on('RESUMED', function () {
    Object(common_log["a" /* default */])('RESUMED');
    store.dispatch(setPlayerState({
      status: constant["f" /* PLAYER_STATUS */].PLAYING
    }));

    store.dispatch(addLog('status', 'Macro resumed'));
  });

  player.on('END', function (obj) {
    var _logMsg;

    Object(common_log["a" /* default */])('END', obj);

    macroTimer.cancel();

    ipc_cs["a" /* default */].ask('PANEL_STOP_PLAYING', {});

    store.dispatch(stopPlaying());

    store.dispatch(setPlayerState({
      status: constant["f" /* PLAYER_STATUS */].STOPPED,
      stopReason: obj.reason,
      nextCommandIndex: null,
      timeoutStatus: null
    }));

    var tcId = obj.extra && obj.extra.id;

    switch (obj.reason) {
      case player.C.END_REASON.COMPLETE:
        if (tcId) store.dispatch(updateTestCasePlayStatus(tcId, constant["h" /* TEST_CASE_STATUS */].SUCCESS));
        message_default.a.success('Macro completed running', 1.5);
        break;

      case player.C.END_REASON.ERROR:
        if (tcId) store.dispatch(updateTestCasePlayStatus(tcId, constant["h" /* TEST_CASE_STATUS */].ERROR));
        message_default.a.error('Macro encountered some error', 1.5);
        break;
    }

    var logMsg = (_logMsg = {}, init_player_defineProperty(_logMsg, player.C.END_REASON.COMPLETE, 'Macro completed'), init_player_defineProperty(_logMsg, player.C.END_REASON.ERROR, 'Macro failed'), init_player_defineProperty(_logMsg, player.C.END_REASON.MANUAL, 'Macro was stopped manually'), _logMsg);

    store.dispatch(addLog('info', logMsg[obj.reason] + (' (Runtime ' + mainTracker.elapsedInSeconds() + ')')));

    // Note: show in badage the play result
    if (obj.reason === player.C.END_REASON.COMPLETE || obj.reason === player.C.END_REASON.ERROR) {
      ipc_cs["a" /* default */].ask('PANEL_UPDATE_BADGE', init_player_extends({
        type: 'play',
        blink: 5000,
        text: obj.reason === player.C.END_REASON.COMPLETE ? 'done' : 'err'
      }, obj.reason === player.C.END_REASON.COMPLETE ? {} : { color: 'orange' }));
    }
  });

  player.on('TO_PLAY', function (_ref18) {
    var index = _ref18.index,
        currentLoop = _ref18.currentLoop,
        loops = _ref18.loops,
        resource = _ref18.resource;

    Object(common_log["a" /* default */])('TO_PLAY', index, resource);
    store.dispatch(setPlayerState({
      timeoutStatus: null,
      nextCommandIndex: index,
      currentLoop: currentLoop,
      loops: loops
    }));

    var triple = [resource.cmd, resource.target, resource.value];
    var str = [''].concat(triple, ['']).join(' | ');
    store.dispatch(addLog('reflect', 'Executing: ' + str));

    // Note: show in badage the current command index (start from 1)
    ipc_cs["a" /* default */].ask('PANEL_UPDATE_BADGE', {
      type: 'play',
      text: '' + (index + 1)
    });
  });

  player.on('PLAYED_LIST', function (_ref19) {
    var indices = _ref19.indices;

    Object(common_log["a" /* default */])('PLAYED_LIST', indices);
    store.dispatch(setPlayerState({
      doneCommandIndices: indices
    }));
  });

  player.on('ERROR', function (_ref20) {
    var errorIndex = _ref20.errorIndex,
        msg = _ref20.msg,
        restart = _ref20.restart;

    common_log["a" /* default */].error('command index: ' + errorIndex + ', Error: ' + msg);
    store.dispatch(addPlayerErrorCommandIndex(errorIndex));
    store.dispatch(addLog('error', msg));

    // Note: restart this player if restart is set to true in error, and it's not in test suite mode
    // Delay the execution so that 'END' event is emitted, and player is in stopped state
    if (restart && store.getState().player.mode === constant["e" /* PLAYER_MODE */].TEST_CASE) {
      setTimeout(function () {
        return player.replayLastConfig();
      }, 50);
    }
  });

  player.on('DELAY', function (_ref21) {
    var total = _ref21.total,
        past = _ref21.past;

    store.dispatch(setPlayerState({
      timeoutStatus: {
        type: 'delay',
        total: total,
        past: past
      }
    }));
  });

  return player;
};

var init_player_initTestSuitPlayer = function initTestSuitPlayer(_ref22) {
  var store = _ref22.store,
      tcPlayer = _ref22.tcPlayer;

  var tsTracker = new TimeTracker();
  var tcTracker = new TimeTracker();
  var state = {
    isPlaying: false,
    tsId: null,
    lastErrMsg: '',
    testCasePromiseHandlers: null,
    reports: [],
    stopReason: null

  };
  var setState = function setState(st) {
    state = init_player_extends({}, state, st);
  };
  var addReport = function addReport(report) {
    setState({
      reports: state.reports.concat(report)
    });
  };
  var tsPlayer = getPlayer({
    name: 'testSuite',
    prepare: function prepare() {
      setState({
        isPlaying: true,
        reports: []
      });
    },
    run: function run(testCase, playerState) {
      var tcId = testCase.id;
      var tcLoops = testCase.loops > 1 ? parseInt(testCase.loops, 10) : 1;
      var state = store.getState();
      var tcs = state.editor.testCases;
      var tc = tcs.find(function (tc) {
        return tc.id === tcId;
      });
      var openTc = tc && tc.data.commands.find(function (c) {
        return c.cmd.toLowerCase() === 'open';
      });

      if (!tc) {
        throw new Error('macro does not exist');
      }

      // update editing && start to play tcPlayer
      store.dispatch(editTestCase(tc.id));
      store.dispatch(playerPlay({
        title: tc.name,
        extra: {
          id: tc.id,
          name: tc.name,
          shouldNotActivateTab: true
        },
        mode: tcLoops === 1 ? player_Player.C.MODE.STRAIGHT : player_Player.C.MODE.LOOP,
        loopsStart: 1,
        loopsEnd: tcLoops,
        startIndex: 0,
        startUrl: openTc ? openTc.target : null,
        resources: tc.data.commands,
        postDelay: state.config.playCommandInterval * 1000
      }));

      return new Promise(function (resolve, reject) {
        setState({
          testCasePromiseHandlers: { resolve: resolve, reject: reject }
        });
      });
    },
    handleResult: function handleResult(result, testCase, state) {
      // return undefined, so that player will play the next one
      return Promise.resolve(undefined);
    }
  }, { preDelay: 0 });

  tsPlayer.on('START', function (_ref23) {
    var title = _ref23.title,
        extra = _ref23.extra;

    Object(common_log["a" /* default */])('START SUITE');
    tsTracker.reset();

    setState({
      tsId: extra.id,
      isPlaying: true,
      stopReason: null
    });

    store.dispatch(addLog('status', 'Playing test suite ' + title));
    store.dispatch(setPlayerMode(constant["e" /* PLAYER_MODE */].TEST_SUITE));
    store.dispatch(updateTestSuite(extra.id, function (ts) {
      return init_player_extends({}, ts, {
        playStatus: {
          isPlaying: true,
          currentIndex: -1,
          errorIndices: [],
          doneIndices: []
        }
      });
    }));
  });

  tsPlayer.on('PAUSED', function (_ref24) {
    var extra = _ref24.extra;

    Object(common_log["a" /* default */])('PAUSED SUITE');
    store.dispatch(addLog('status', 'Test suite paused'));
    tcPlayer.pause();
  });

  tsPlayer.on('RESUMED', function (_ref25) {
    var extra = _ref25.extra;

    Object(common_log["a" /* default */])('RESUMED SUIITE');
    store.dispatch(addLog('status', 'Test suite resumed'));
    tcPlayer.resume();
  });

  tsPlayer.on('TO_PLAY', function (_ref26) {
    var index = _ref26.index,
        extra = _ref26.extra;

    tcTracker.reset();

    setState({
      lastErrMsg: '',
      tcIndex: index
    });

    store.dispatch(updateTestSuite(extra.id, function (ts) {
      return init_player_extends({}, ts, {
        playStatus: init_player_extends({}, ts.playStatus, {
          currentIndex: index
        })
      });
    }));
  });

  tsPlayer.on('PLAYED_LIST', function (_ref27) {
    var indices = _ref27.indices,
        extra = _ref27.extra;

    store.dispatch(updateTestSuite(extra.id, function (ts) {
      return init_player_extends({}, ts, {
        playStatus: init_player_extends({}, ts.playStatus, {
          doneIndices: indices
        })
      });
    }));
  });

  tsPlayer.on('END', function (_ref28) {
    var reason = _ref28.reason,
        extra = _ref28.extra,
        opts = _ref28.opts;

    if (!state.isPlaying) return;

    setState({
      isPlaying: false
    });

    // Note: reset player mode to 'test case', it will only be 'test suite'
    // during replays of test suites
    store.dispatch(setPlayerMode(constant["e" /* PLAYER_MODE */].TEST_CASE));
    store.dispatch(updateTestSuite(extra.id, function (ts) {
      return init_player_extends({}, ts, {
        playStatus: init_player_extends({}, ts.playStatus, {
          isPlaying: false,
          currentIndex: -1
        })
      });
    }));

    if (reason === player_Player.C.END_REASON.MANUAL && (!opts || !opts.tcPlayerStopped)) {
      tcPlayer.stop();
    }

    // Note: give it some time, in case we're stopping tc player above
    setTimeout(function () {
      var _statusMap;

      var totalCount = state.reports.length;
      var failureCount = state.reports.filter(function (r) {
        return r.stopReason === player_Player.C.END_REASON.ERROR;
      }).length;
      var successCount = totalCount - failureCount;

      var statusMap = (_statusMap = {}, init_player_defineProperty(_statusMap, player_Player.C.END_REASON.MANUAL, 'Manually stopped'), init_player_defineProperty(_statusMap, player_Player.C.END_REASON.COMPLETE, 'OK'), init_player_defineProperty(_statusMap, player_Player.C.END_REASON.ERROR, 'Error'), _statusMap);
      var tsStatus = statusMap[state.stopReason || reason];
      var lines = ['Test Suite name: ' + extra.name, 'Start Time: ' + tsTracker.startTime.toString(), 'Overall status: ' + tsStatus + ', Runtime: ' + tsTracker.elapsedInSeconds(), 'Macro run: ' + totalCount, 'Success: ' + successCount, 'Failure: ' + failureCount, 'Macro executed:'];

      state.reports.forEach(function (r) {
        var tcStatus = statusMap[r.stopReason] + (r.stopReason === player_Player.C.END_REASON.ERROR ? ': ' + r.errMsg : '');
        lines.push(r.name + ' (' + tcStatus + ', Runtime: ' + r.usedTime + ')');
      });

      store.dispatch(addLog('info', lines.join('\n')));
    }, 200);
  });

  // Test Case Player: we should handle cases when test case player stops automatically
  tcPlayer.on('END', function (_ref29) {
    var reason = _ref29.reason,
        extra = _ref29.extra;

    if (store.getState().player.mode !== constant["e" /* PLAYER_MODE */].TEST_SUITE) return;

    addReport({
      id: extra.id,
      name: extra.name,
      errMsg: state.lastErrMsg,
      stopReason: reason,
      usedTime: tcTracker.elapsedInSeconds()
    });

    // Avoid a 'stop' loop between tsPlayer and tcPlayer
    switch (reason) {
      case player_Player.C.END_REASON.MANUAL:
        break;

      case player_Player.C.END_REASON.COMPLETE:
        state.testCasePromiseHandlers.resolve(true);
        break;

      case player_Player.C.END_REASON.ERROR:
        store.dispatch(updateTestSuite(state.tsId, function (ts) {
          return init_player_extends({}, ts, {
            playStatus: init_player_extends({}, ts.playStatus, {
              errorIndices: ts.playStatus.errorIndices.concat([tsPlayer.state.nextIndex])
            })
          });
        }));

        setState({
          stopReason: player_Player.C.END_REASON.ERROR
        });

        // Updated on 2017-12-15, Even if there is error, test suite should move on to next macro
        // Note: tell tsPlayer not to trigger tcPlayer stop again
        // tsPlayer.stop({ tcPlayerStopped: true })
        state.testCasePromiseHandlers.resolve(true);
        break;
    }
  });

  tcPlayer.on('ERROR', function (_ref30) {
    var msg = _ref30.msg,
        restart = _ref30.restart;

    setState({
      lastErrMsg: msg
    });

    // Note: restart this player if restart is set to true in error, and it's not in test suite mode
    // Delay the execution so that 'END' event is emitted, and player is in stopped state
    //
    // Note that a couple moments after tcPlayer encounters an error and enter stopped state, it tries to set player mode
    // back to test case mode  (in tsPlayer 'END' event)
    if (restart && store.getState().player.mode === constant["e" /* PLAYER_MODE */].TEST_SUITE) {
      setTimeout(function () {
        return tsPlayer.replayLastConfig();
      }, 50);
    }
  });

  return tsPlayer;
};
// EXTERNAL MODULE: ./src/services/storage/storage.ts
var storage_storage = __webpack_require__(60);

// CONCATENATED MODULE: ./src/index.js










var src_slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var src_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function src_defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function src_toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/* global PREINSTALL_CSV_LIST PREINSTALL_VISION_LIST */
































var src_store = createStore(reducer, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

var rootEl = document.getElementById('root');
var src_render = function render(Component) {
  return react_dom_default.a.render(react_default.a.createElement(
    locale_provider_default.a,
    { locale: en_US_default.a },
    react_default.a.createElement(
      react_redux_es["a" /* Provider */],
      { store: src_store },
      react_default.a.createElement(
        es["a" /* HashRouter */],
        null,
        react_default.a.createElement(src_app, null)
      )
    )
  ), rootEl);
};

var timestampCache = {};
var DURATION = 2000;

// Note: listen to any db changes and restore all data from db to redux store
// All test cases are stored in indexeddb (dexie)
var src_bindMacroAndTestSuites = function bindMacroAndTestSuites() {
  var curStorageMode = Object(services_storage["getStorageManager"])().getCurrentStrategyType();
  var macroStorage = Object(services_storage["getStorageManager"])().getMacroStorage();
  var suiteStorage = Object(services_storage["getStorageManager"])().getTestSuiteStorage();
  var onError = function onError(errorList) {
    errorList.filter(function (item) {
      return item.fileName !== '__Untitled__';
    }).forEach(function (errorItem) {
      var key = errorItem.fullFilePath;

      if (!timestampCache[key] || new Date() * 1 - timestampCache[key] > DURATION) {
        timestampCache[key] = new Date() * 1;
        src_store.dispatch(addLog('warning', errorItem.error.message));
      }
    });
  };

  var restoreTestCases = function restoreTestCases() {
    return macroStorage.readAll('Text', onError).then(function (items) {
      return items.map(function (item) {
        return item.content;
      });
    }).then(function (tcs) {
      Object(common_log["a" /* default */])('restoreTestCases - macroStorage - tcs', tcs);

      src_store.dispatch(setTestCases(tcs.map(test_case_model_eliminateBaseUrl)));
    });
  };

  var restoreTestSuites = function restoreTestSuites() {
    return suiteStorage.readAll('Text', onError).then(function (items) {
      return items.map(function (item) {
        return item.content;
      });
    }).then(function (tss) {
      tss.sort(function (a, b) {
        var aname = a.name.toLowerCase();
        var bname = b.name.toLowerCase();

        if (aname < bname) return -1;
        if (aname > bname) return 1;
        if (aname === bname) {
          return b.updateTime - a.updateTime;
        }
      });

      Object(common_log["a" /* default */])('restoreTestSuites - suiteStorage - tss', tss);

      src_store.dispatch(setTestSuites(tss));
    });
  }

  // FIXME: need to unbind previous listeners when bindMacroAndTestSuites is called for more than once
  ;[storage_storage["FlatStorageEvent"].ListChanged, storage_storage["FlatStorageEvent"].FilesChanged].forEach(function (eventName) {
    macroStorage.off(eventName);
    macroStorage.on(eventName, function () {
      if (curStorageMode !== Object(services_storage["getStorageManager"])().getCurrentStrategyType()) return;
      Object(common_log["a" /* default */])('macroStorage - eventName', eventName);
      setTimeout(restoreTestCases, 50);
    });
  });[storage_storage["FlatStorageEvent"].ListChanged, storage_storage["FlatStorageEvent"].FilesChanged].forEach(function (eventName) {
    suiteStorage.off(eventName);
    suiteStorage.on(eventName, function () {
      if (curStorageMode !== Object(services_storage["getStorageManager"])().getCurrentStrategyType()) return;
      Object(common_log["a" /* default */])('suiteStorage - eventName', eventName);
      setTimeout(restoreTestSuites, 50);
    });
  });

  restoreTestCases();
  restoreTestSuites();
};

// Note: editing is stored in localstorage
var src_restoreEditing = function restoreEditing() {
  return storage["default"].get('editing').then(function (editing) {
    var finalEditing = editing;

    if (editing.baseUrl) {
      finalEditing = src_extends({}, editing);
      finalEditing.commands = finalEditing.commands.map(commandWithoutBaseUrl(editing.baseUrl));
      delete finalEditing.baseUrl;
    }

    src_store.dispatch(setEditing(finalEditing));
  });
};

var src_restoreConfig = function restoreConfig() {
  return storage["default"].get('config').then(function (config) {
    var cfg = src_extends({
      showSidebar: true,
      playScrollElementsIntoView: true,
      playHighlightElements: true,
      playCommandInterval: 0.3,
      recordNotification: true,
      recordClickType: 'click',
      logFilter: 'All',
      onErrorInLoop: 'continue_next_loop',
      defaultVisionSearchConfidence: 0.8,
      // Run macros from outside
      allowRunFromBookmark: true,
      allowRunFromFileSchema: true,
      allowRunFromHttpSchema: false,
      // timeout in seconds
      timeoutPageLoad: 60,
      timeoutElement: 10,
      timeoutMacro: 900,
      timeoutDownload: 60,
      // backup relative
      lastBackupActionTime: new Date() * 1,
      enableAutoBackup: true,
      autoBackupInterval: 7,
      autoBackupTestCases: true,
      autoBackupTestSuites: true,
      autoBackupScreenshots: true,
      autoBackupCSVFiles: true,
      autoBackupVisionImages: true,
      // security relative
      shouldEncryptPassword: 'no',
      masterPassword: '',
      // variable relative
      showCommonInternalVariables: true,
      showAdvancedInternalVariables: false,
      // xmodules related
      storageMode: services_storage["StorageStrategyType"].Browser
    }, config);
    src_store.dispatch(updateConfig(cfg));
    return cfg;
  });
};

var src_restoreCSV = function restoreCSV() {
  // Note: just try to init storage. Eg. For browser fs, it will try to create root folder
  Object(services_storage["getStorageManager"])().getCSVStorage();
  src_store.dispatch(listCSV());
};

var src_restoreScreenshots = function restoreScreenshots() {
  Object(services_storage["getStorageManager"])().getScreenshotStorage();
  src_store.dispatch(listScreenshots());
};

var src_restoreVisions = function restoreVisions() {
  Object(services_storage["getStorageManager"])().getVisionStorage();
  src_store.dispatch(listVisions());
};

var src_downloadTextFile = function downloadTextFile(text, fileName) {
  var blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  file_saver_default.a.saveAs(blob, fileName);
};

var src_genPlayerPlayCallback = function genPlayerPlayCallback(_ref) {
  var options = _ref.options;
  return function (err, reason) {
    if (options.savelog) {
      var logs = src_store.getState().logs;
      var errorLog = logs.find(function (log) {
        return log.type === 'error' && !(log.options && log.options.ignored);
      });
      var error = err || errorLog && { message: errorLog.text };
      var logTitle = error ? 'Status=Error: ' + error.message : 'Status=OK';
      var logContent = logs.map(renderLog);
      var text = [logTitle, '###'].concat(src_toConsumableArray(logContent)).join('\n');
      src_downloadTextFile(text, decodeURIComponent(options.savelog));
    }

    if (options.close) {
      // Close all tabs If close option is set
      setTimeout(function () {
        ipc_cs["a" /* default */].ask('PANEL_CLOSE_ALL_WINDOWS', {});
      }, 1000);
    }

    if (!err && reason === player_Player.C.END_REASON.COMPLETE) {
      // Close kantu panel
      setTimeout(function () {
        window.close();
      }, 1000);
    }
  };
};

var src_bindIpcEvent = function bindIpcEvent() {
  ipc_cs["a" /* default */].onAsk(function (cmd, args) {
    Object(common_log["a" /* default */])(cmd, args);

    switch (cmd) {
      case 'INSPECT_RESULT':
        src_store.dispatch(doneInspecting());
        src_store.dispatch(updateSelectedCommand({
          target: args.locatorInfo.target,
          targetOptions: args.locatorInfo.targetOptions
        }));
        return true;

      case 'RECORD_ADD_COMMAND':
        Object(common_log["a" /* default */])('got add command', cmd, args);
        src_store.dispatch(appendCommand(args, true));
        return true;

      case 'TIMEOUT_STATUS':
        if (src_store.getState().status !== constant["a" /* APP_STATUS */].PLAYER) return false;

        src_store.dispatch(setTimeoutStatus(args));
        return true;

      case 'RUN_TEST_CASE':
        {
          if (src_store.getState().status !== constant["a" /* APP_STATUS */].NORMAL) {
            message_default.a.error('can only run macros when it is not recording or playing');
            return false;
          }

          var testCase = args.testCase,
              options = args.options;

          var storageMode = testCase.storageMode || services_storage["StorageStrategyType"].Browser;
          var storageMan = Object(services_storage["getStorageManager"])();

          storageMan.isStrategyTypeAvailable(storageMode).catch(function (e) {
            message_default.a.error(e.message);
            throw e;
          }).then(function () {
            storageMan.setCurrentStrategyType(storageMode);
            return Object(utils["delay"])(function () {}, 1000);
          }).then(function () {
            var state = src_store.getState();
            var tc = state.editor.testCases.find(function (tc) {
              return tc.name === testCase.name;
            });

            if (!tc) {
              message_default.a.error('no macro found with name \'' + testCase.name + '\'');
              return false;
            }

            var openTc = tc.data.commands.find(function (item) {
              return item.cmd.toLowerCase() === 'open';
            });

            src_store.dispatch(editTestCase(tc.id));
            src_store.dispatch(playerPlay({
              title: testCase.name,
              extra: {
                id: tc && tc.id
              },
              mode: player_Player.C.MODE.STRAIGHT,
              startIndex: 0,
              startUrl: openTc ? openTc.target : null,
              resources: tc.data.commands,
              postDelay: state.player.playInterval * 1000,
              callback: src_genPlayerPlayCallback({ options: options })
            }));

            src_store.dispatch(updateUI({ sidebarTab: 'macros' }));
          });

          return true;
        }

      case 'RUN_TEST_SUITE':
        {
          if (src_store.getState().status !== constant["a" /* APP_STATUS */].NORMAL) {
            message_default.a.error('can only run test suites when it is not recording or playing');
            return false;
          }

          var testSuite = args.testSuite,
              _options = args.options;

          var _storageMode = testSuite.storageMode || services_storage["StorageStrategyType"].Browser;
          var _storageMan = Object(services_storage["getStorageManager"])();

          _storageMan.isStrategyTypeAvailable(_storageMode).catch(function (e) {
            message_default.a.error(e.message);
            throw e;
          }).then(function () {
            _storageMan.setCurrentStrategyType(_storageMode);
            return Object(utils["delay"])(function () {}, 1000);
          }).then(function () {
            var state = src_store.getState();

            var ts = state.editor.testSuites.find(function (ts) {
              return ts.name === testSuite.name;
            });
            if (!ts) {
              message_default.a.error('no macro found with name \'' + testSuite.name + '\'');
              return false;
            }

            getPlayer({ name: 'testSuite' }).play({
              title: ts.name,
              extra: {
                id: ts.id,
                name: ts.name
              },
              mode: getPlayer().C.MODE.STRAIGHT,
              startIndex: 0,
              resources: ts.cases.map(function (item) {
                return {
                  id: item.testCaseId,
                  loops: item.loops
                };
              }),
              callback: src_genPlayerPlayCallback({ options: _options })
            });

            src_store.dispatch(updateUI({ sidebarTab: 'test_suites' }));
          });

          return true;
        }

      case 'IMPORT_HTML_AND_RUN':
        {
          var _options2 = args.options;

          var _testCase = void 0;

          try {
            _testCase = Object(convert_utils["fromHtml"])(args.html);
          } catch (e) {
            message_default.a.error('Failed to parse html', 1.5);
            return false;
          }

          var _storageMode2 = args.storageMode || services_storage["StorageStrategyType"].Browser;
          var _storageMan2 = Object(services_storage["getStorageManager"])();

          return _storageMan2.isStrategyTypeAvailable(_storageMode2).catch(function (e) {
            message_default.a.error(e.message);
            throw e;
          }).then(function () {
            _storageMan2.setCurrentStrategyType(_storageMode2);
            return Object(utils["delay"])(function () {}, 1000);
          }).then(function () {
            src_store.dispatch(upsertTestCase(_testCase));

            return Object(utils["delay"])(function () {
              var state = src_store.getState();
              var tc = state.editor.testCases.find(function (tc) {
                return tc.name === _testCase.name;
              });
              var openTc = tc.data.commands.find(function (item) {
                return item.cmd.toLowerCase() === 'open';
              });

              src_store.dispatch(editTestCase(tc.id));
              src_store.dispatch(playerPlay({
                title: tc.name,
                extra: {
                  id: tc && tc.id
                },
                mode: player_Player.C.MODE.STRAIGHT,
                startIndex: 0,
                startUrl: openTc ? openTc.target : null,
                resources: tc.data.commands,
                postDelay: state.player.playInterval * 1000,
                callback: src_genPlayerPlayCallback({ options: _options2 })
              }));
              return true;
            }, 1000).catch(function (e) {
              common_log["a" /* default */].error(e.stack);
              throw e;
            });
          });
        }

      case 'ADD_VISION_IMAGE':
        {
          var dataUrl = args.dataUrl;

          var fileName = Object(utils["randomName"])() + '_dpi_' + Object(utils["getScreenDpi"])() + '.png';

          Object(services_storage["getStorageManager"])().getVisionStorage().write(fileName, Object(utils["dataURItoBlob"])(dataUrl)).then(src_restoreVisions).catch(function (e) {
            return common_log["a" /* default */].error(e.stack);
          });

          return { fileName: fileName };
        }

      case 'RESTORE_SCREENSHOTS':
        {
          src_restoreScreenshots();
          return true;
        }

      case 'UPDATE_ACTIVE_TAB':
        {
          src_updatePageTitle(args);
          return true;
        }

      case 'ADD_LOG':
        {
          if (!args) return false;
          if (args.info) src_store.dispatch(addLog('info', args.info, args.options));
          if (args.warning) src_store.dispatch(addLog('warning', args.warning));
          if (args.error) src_store.dispatch(addLog('error', args.error));

          return true;
        }
    }
  });
};

var src_bindWindowEvents = function bindWindowEvents() {
  // reset status to normal when panel closed
  window.addEventListener('beforeunload', function () {
    ipc_cs["a" /* default */].ask('PANEL_STOP_RECORDING', {});
    ipc_cs["a" /* default */].ask('PANEL_STOP_PLAYING', {});
  });

  window.addEventListener('resize', function () {
    var size = {
      width: window.outerWidth,
      height: window.outerHeight
    };
    var state = src_store.getState();
    src_store.dispatch(updateConfig({
      size: src_extends({}, state.config.size, src_defineProperty({}, state.config.showSidebar ? 'with_sidebar' : 'standard', size))
    }));
  });
};

var src_bindVariableChange = function bindVariableChange() {
  // Note: bind to onChange in next tick, to make sure vars instance is already initialized
  // so that `bindVariableChange` could be executed before `initPlayer`
  setTimeout(function () {
    getVarsInstance().onChange(function (_ref2) {
      var vars = _ref2.vars;

      var variables = Object.keys(vars).map(function (key) {
        return { key: key, value: vars[key] };
      });
      src_store.dispatch(setVariables(variables));
    });
  }, 0);
};

var src_initSaveTestCase = function initSaveTestCase() {
  getSaveTestCase(src_store);
};

var src_updatePageTitle = function updatePageTitle(args) {
  // Note: Firefox includes page url in title, there could be not enough space for tab title
  if (web_extension_default.a.isFirefox()) return true;
  var origTitle = document.title.replace(/ - .*$/, '');
  document.title = origTitle + ' - (Tab: ' + args.title + ')';
};

function tryPreinstall() {
  storage["default"].get('preinstall_info').then(function (info) {
    var status = function () {
      if (!info) return 'fresh';

      var _info$askedVersions = info.askedVersions,
          askedVersions = _info$askedVersions === undefined ? [] : _info$askedVersions;

      if (askedVersions.indexOf(src_config["a" /* default */].preinstallVersion) === -1) return 'new_version_available';

      return 'up_to_date';
    }();

    switch (status) {
      case 'fresh':
        return src_store.dispatch(preinstall());

      case 'new_version_available':
        return src_store.dispatch(updateUI({ newPreinstallVersion: true }));

      case 'up_to_date':
      default:
        return false;
    }
  });
}

function reloadResources() {
  src_bindMacroAndTestSuites();
  src_restoreCSV();
  src_restoreScreenshots();
  src_restoreVisions();

  setTimeout(function () {
    src_store.dispatch(resetEditing());
  }, 200);
}

function bindStorageModeChanged() {
  Object(services_storage["getStorageManager"])().on(services_storage["StorageManagerEvent"].StrategyTypeChanged, function (type) {
    reloadResources();
  });

  Object(services_storage["getStorageManager"])().on(services_storage["StorageManagerEvent"].RootDirChanged, function (type) {
    reloadResources();
  });

  Object(services_storage["getStorageManager"])().on(services_storage["StorageManagerEvent"].ForceReload, function (type) {
    reloadResources();
  });
}

function init() {
  src_bindMacroAndTestSuites();
  src_bindIpcEvent();
  src_bindWindowEvents();
  src_bindVariableChange();
  bindStorageModeChanged();
  init_player_initPlayer(src_store);
  src_restoreEditing();
  src_restoreConfig();
  src_restoreCSV();
  src_restoreScreenshots();
  src_restoreVisions();
  src_initSaveTestCase();
  tryPreinstall();

  ipc_cs["a" /* default */].ask('I_AM_PANEL', {});

  document.title = document.title + ' ' + web_extension_default.a.runtime.getManifest().version;

  ipc_cs["a" /* default */].ask('PANEL_CURRENT_PLAY_TAB_INFO').then(src_updatePageTitle);

  src_render(src_app);
}

Promise.all([src_restoreConfig(), Object(xfile["getXFile"])().getConfig()]).then(function (_ref3) {
  var _ref4 = src_slicedToArray(_ref3, 2),
      config = _ref4[0],
      xFileConfig = _ref4[1];

  // Note: This is the first call of getStorageManager
  // and it must passed in `getMacros` to make test suite work
  Object(services_storage["getStorageManager"])(config.storageMode, {
    getMacros: function getMacros() {
      return src_store.getState().editor.testCases;
    }
  });

  init();
}, init);

/***/ }),

/***/ 73:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_common_web_extension__WEBPACK_IMPORTED_MODULE_0__);


var platform = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.isFirefox() ? 'firefox' : 'chrome';

/* harmony default export */ __webpack_exports__["a"] = ({
  preinstallVersion: '3.3.1',
  urlAfterUpgrade: 'https://a9t9.com/kantu/web-automation/' + platform + '/whatsnew',
  urlAfterInstall: 'https://a9t9.com/kantu/web-automation/' + platform + '/welcome',
  urlAfterUninstall: 'https://a9t9.com/kantu/web-automation/' + platform + '/why'
});

/***/ }),

/***/ 79:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export openBgWithCs */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return csInit; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return bgInit; });
/* harmony import */ var _ipc_promise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(62);
/* harmony import */ var _ipc_promise__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_ipc_promise__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _ipc_cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(32);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(4);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(2);
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };







var TIMEOUT = -1;

// Note: `cuid` is a kind of unique id so that you can create multiple
// ipc promise instances between the same two end points
var openBgWithCs = function openBgWithCs(cuid) {
  var wrap = function wrap(str) {
    return str + '_' + cuid;
  };

  // factory function to generate ipc promise instance for background
  // `tabId` is needed to identify which tab to send messages to
  var ipcBg = function ipcBg(tabId) {
    var bgListeners = [];

    // `sender` contains tab info. Background may need this to store the corresponding
    // relationship between tabId and ipc instance
    var addSender = function addSender(obj, sender) {
      if (!obj || (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object') return obj;

      obj.sender = sender;
      return obj;
    };

    _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      bgListeners.forEach(function (listener) {
        return listener(req, sender, sendResponse);
      });
      return true;
    });

    return _ipc_promise__WEBPACK_IMPORTED_MODULE_0___default()({
      timeout: TIMEOUT,
      ask: function ask(uid, cmd, args) {
        _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.tabs.sendMessage(tabId, {
          type: wrap('BG_ASK_CS'),
          uid: uid,
          cmd: cmd,
          args: args
        });
      },
      onAnswer: function onAnswer(fn) {
        bgListeners.push(function (req, sender, response) {
          if (req.type !== wrap('CS_ANSWER_BG')) return;
          fn(req.uid, req.err, addSender(req.data, sender));
        });
      },
      onAsk: function onAsk(fn) {
        bgListeners.push(function (req, sender, response) {
          if (req.type !== wrap('CS_ASK_BG')) return;
          fn(req.uid, req.cmd, addSender(req.args, sender));
        });
      },
      answer: function answer(uid, err, data) {
        _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.tabs.sendMessage(tabId, {
          type: wrap('BG_ANSWER_CS'),
          uid: uid,
          err: err,
          data: data
        });
      },
      destroy: function destroy() {
        bgListeners = [];
      }
    });
  };

  // factory function to generate ipc promise for content scripts
  var ipcCs = function ipcCs(checkReady) {
    var csListeners = [];

    _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      csListeners.forEach(function (listener) {
        return listener(req, sender, sendResponse);
      });
      return true;
    });

    return _ipc_promise__WEBPACK_IMPORTED_MODULE_0___default()({
      timeout: TIMEOUT,
      checkReady: checkReady,
      ask: function ask(uid, cmd, args) {
        // log('cs ask', uid, cmd, args)
        _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.sendMessage({
          type: wrap('CS_ASK_BG'),
          uid: uid,
          cmd: cmd,
          args: args
        });
      },
      onAnswer: function onAnswer(fn) {
        csListeners.push(function (req, sender, response) {
          if (req.type !== wrap('BG_ANSWER_CS')) return;
          fn(req.uid, req.err, req.data);
        });
      },
      onAsk: function onAsk(fn) {
        csListeners.push(function (req, sender, response) {
          if (req.type !== wrap('BG_ASK_CS')) return;
          fn(req.uid, req.cmd, req.args);
        });
      },
      answer: function answer(uid, err, data) {
        _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.sendMessage({
          type: wrap('CS_ANSWER_BG'),
          uid: uid,
          err: err,
          data: data
        });
      },
      destroy: function destroy() {
        csListeners = [];
      }
    });
  };

  return {
    ipcCs: ipcCs,
    ipcBg: ipcBg
  };
};

// Helper function to init ipc promise instance for content scripts
// The idea here is to send CONNECT message to background when initializing
var csInit = function csInit() {
  var cuid = '' + Math.floor(Math.random() * 10000);

  Object(_log__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"])('sending Connect...');

  // Note: Ext.extension.getURL is available in content script, but not injected js
  // We use it here to detect whether it is loaded by content script or injected
  // Calling runtime.sendMessage in injected js will cause an uncatchable exception
  if (!_web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.extension.getURL) return;

  // try this process in case we're in none-src frame
  try {
    // let connected     = false
    // const checkReady  = () => {
    //   if (connected)  return Promise.resolve(true)
    //   return Promise.reject(new Error('cs not connected with bg yet'))
    // }
    var reconnect = function reconnect() {
      return Object(_utils__WEBPACK_IMPORTED_MODULE_4__["withTimeout"])(500, function () {
        return _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.sendMessage({
          type: 'RECONNECT'
        }).then(function (cuid) {
          Object(_log__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"])('got existing cuid', cuid);
          if (cuid) return openBgWithCs(cuid).ipcCs();
          throw new Error('failed to reconnect');
        });
      });
    };
    var connectBg = function connectBg() {
      return Object(_utils__WEBPACK_IMPORTED_MODULE_4__["withTimeout"])(1000, function () {
        return _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.sendMessage({
          type: 'CONNECT',
          cuid: cuid
        }).then(function (done) {
          if (done) return openBgWithCs(cuid).ipcCs();
          throw new Error('not done');
        });
      });
    };
    var tryConnect = Object(_utils__WEBPACK_IMPORTED_MODULE_4__["retry"])(connectBg, {
      shouldRetry: function shouldRetry() {
        return true;
      },
      retryInterval: 0,
      timeout: 5000
    });

    // Note: Strategy here
    // 1. Try to recover connection with background (get the existing cuid)
    // 2. If cuid not found, try to create new connection (cuid) with background
    // 3. Both of these two steps above are async, but this api itself is synchronous,
    //    so we have to create a mock API and return it first
    return Object(_utils__WEBPACK_IMPORTED_MODULE_4__["mockAPIWith"])(function () {
      return reconnect().catch(function () {
        return tryConnect();
      }).catch(function (e) {
        _log__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"].error('Failed to create cs ipc');
        throw e;
      });
    }, {
      ask: function ask() {
        return Promise.reject(new Error('mock ask'));
      },
      onAsk: function onAsk() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        _log__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"].apply(undefined, ['mock onAsk'].concat(args));
      },
      destroy: function destroy() {}
    }, ['ask']);
  } catch (e) {
    _log__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"].error(e.stack);
  }
};

// Helper function to init ipc promise instance for background
// it accepts a `fn` function to handle CONNECT message from content scripts
var bgInit = function bgInit(fn) {
  _web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    switch (req.type) {
      case 'CONNECT':
        {
          if (req.cuid) {
            fn(sender.tab.id, req.cuid, openBgWithCs(req.cuid).ipcBg(sender.tab.id));
            sendResponse(true);
          }
          break;
        }

      case 'RECONNECT':
        {
          var cuid = Object(_ipc_cache__WEBPACK_IMPORTED_MODULE_1__[/* getIpcCache */ "a"])().getCuid(sender.tab.id);

          if (cuid) {
            Object(_ipc_cache__WEBPACK_IMPORTED_MODULE_1__[/* getIpcCache */ "a"])().enable(sender.tab.id);
          }

          sendResponse(cuid || null);
          break;
        }
    }

    return true;
  });
};

/***/ }),

/***/ 8:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return APP_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return INSPECTOR_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return RECORDER_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return PLAYER_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return PLAYER_MODE; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return CONTENT_SCRIPT_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return TEST_CASE_STATUS; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return LAST_SCREENSHOT_FILE_NAME; });

var mk = function mk(list) {
  return list.reduce(function (prev, key) {
    prev[key] = key;
    return prev;
  }, {});
};

var APP_STATUS = mk(['NORMAL', 'INSPECTOR', 'RECORDER', 'PLAYER']);

var INSPECTOR_STATUS = mk(['PENDING', 'INSPECTING', 'STOPPED']);

var RECORDER_STATUS = mk(['PENDING', 'RECORDING', 'STOPPED']);

var PLAYER_STATUS = mk(['PLAYING', 'PAUSED', 'STOPPED']);

var PLAYER_MODE = mk(['TEST_CASE', 'TEST_SUITE']);

var CONTENT_SCRIPT_STATUS = mk(['NORMAL', 'RECORDING', 'INSPECTING', 'PLAYING']);

var TEST_CASE_STATUS = mk(['NORMAL', 'SUCCESS', 'ERROR']);

var LAST_SCREENSHOT_FILE_NAME = '__lastscreenshot';

/***/ }),

/***/ 95:
/***/ (function(module, exports) {


function removeFromArray(array, item) {
  var index = array.indexOf(item);

  if (index >= 0) {
    array.splice(index, 1);
  }
}

var DataTransfer = function DataTransfer() {
  this.dataByFormat = {};

  this.dropEffect = 'none';
  this.effectAllowed = 'all';
  this.files = [];
  this.types = [];
};

DataTransfer.prototype.clearData = function (dataFormat) {
  if (dataFormat) {
    delete this.dataByFormat[dataFormat];
    removeFromArray(this.types, dataFormat);
  } else {
    this.dataByFormat = {};
    this.types = [];
  }
};

DataTransfer.prototype.getData = function (dataFormat) {
  return this.dataByFormat[dataFormat];
};

DataTransfer.prototype.setData = function (dataFormat, data) {
  this.dataByFormat[dataFormat] = data;

  if (this.types.indexOf(dataFormat) < 0) {
    this.types.push(dataFormat);
  }

  return true;
};

DataTransfer.prototype.setDragImage = function () {
  // don't do anything (the stub just makes sure there is no error thrown if someone tries to call the method)
};

module.exports = function () {
  // Note: in Firefox, window.DataTransfer exists, but it can't be used as constructor
  // In Firefox, `new window.DataTransfer()` throws errors like 'TypeError: Illegal constructor'
  if (window.DataTransfer) {
    try {
      var tmp = new window.DataTransfer();
      return window.DataTransfer;
    } catch (e) {}
  }

  return DataTransfer;
}();

/***/ }),

/***/ 97:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export aesEncrypt */
/* unused harmony export aesDecrypt */
/* unused harmony export encrypt */
/* unused harmony export decrypt */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return encryptIfNeeded; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return decryptIfNeeded; });
/* harmony import */ var pbkdf2__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(102);
/* harmony import */ var pbkdf2__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(pbkdf2__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var aes_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(54);
/* harmony import */ var aes_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(aes_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(29);





var RAW_PREFIX = '@_KANTU_@';
var CIPHER_PREFIX = '__KANTU_ENCRYPTED__';
var RAW_PREFIX_REG = new RegExp('^' + RAW_PREFIX);
var CIPHER_PREFIX_REG = new RegExp('^' + CIPHER_PREFIX);

var getEncryptConfig = function getEncryptConfig() {
  return _storage__WEBPACK_IMPORTED_MODULE_3__["default"].get('config').then(function (config) {
    return {
      shouldEncrypt: config.shouldEncryptPassword === 'master_password',
      masterPassword: config.masterPassword
    };
  });
};

var aesEncrypt = function aesEncrypt(text, password) {
  var key = pbkdf2__WEBPACK_IMPORTED_MODULE_0___default.a.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512');
  var engine = new aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.ModeOfOperation.ctr(key);

  return aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.utils.hex.fromBytes(engine.encrypt(aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.utils.utf8.toBytes(text)));
};

var aesDecrypt = function aesDecrypt(text, password) {
  var key = pbkdf2__WEBPACK_IMPORTED_MODULE_0___default.a.pbkdf2Sync(password, 'salt', 1, 256 / 8, 'sha512');
  var engine = new aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.ModeOfOperation.ctr(key);

  return aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.utils.utf8.fromBytes(engine.decrypt(aes_js__WEBPACK_IMPORTED_MODULE_1___default.a.utils.hex.toBytes(text)));
};

var encrypt = function encrypt(text) {
  return getEncryptConfig().then(function (_ref) {
    var shouldEncrypt = _ref.shouldEncrypt,
        masterPassword = _ref.masterPassword;

    if (!shouldEncrypt) return text;
    return '' + CIPHER_PREFIX + aesEncrypt(RAW_PREFIX + text, masterPassword);
  });
};

var decrypt = function decrypt(text) {
  return getEncryptConfig().then(function (_ref2) {
    var shouldEncrypt = _ref2.shouldEncrypt,
        masterPassword = _ref2.masterPassword;

    if (!shouldEncrypt) return text;
    var raw = aesDecrypt(text.replace(CIPHER_PREFIX_REG, ''), masterPassword);
    if (raw.indexOf(RAW_PREFIX) !== 0) throw new Error('Wrong master password');
    return raw.replace(RAW_PREFIX_REG, '');
  }).catch(function (e) {
    throw new Error('password string invalid');
  });
};

var encryptIfNeeded = function encryptIfNeeded(text, dom) {
  if (dom && dom.tagName.toUpperCase() === 'INPUT' && dom.type === 'password') {
    return encrypt(text);
  }

  return Promise.resolve(text);
};

var decryptIfNeeded = function decryptIfNeeded(text, dom) {
  if (CIPHER_PREFIX_REG.test(text) && dom && dom.tagName.toUpperCase() === 'INPUT' && dom.type === 'password') {
    return decrypt(text);
  }

  return Promise.resolve(text);
};

/***/ })

/******/ });