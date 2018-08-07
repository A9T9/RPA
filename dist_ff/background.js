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
/******/ 	deferredModules.push([432,1,0]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 104:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export DownloadMan */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getDownloadMan; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }





var DownloadMan = function () {
  function DownloadMan() {
    var _this = this;

    _classCallCheck(this, DownloadMan);

    this.activeDownloads = [];
    this.eventsBound = false;

    this.filterActiveDownloads = function (predicate) {
      _this.activeDownloads = _this.activeDownloads.filter(predicate);

      if (_this.activeDownloads.length === 0) {
        _this.unbindEvents();
      }
    };

    this.createdListener = function (downloadItem) {
      if (!_this.isActive()) return;
      Object(_log__WEBPACK_IMPORTED_MODULE_1__[/* default */ "a"])('download on created', downloadItem);

      var item = _this.activeDownloads.find(function (item) {
        return !item.id;
      });
      if (!item) return;

      // Note: 3 things to do on download created
      // 1. record download id
      // 2. Start timer for timeout
      // 3. Start interval timer for count down message
      _extends(item, _extends({
        id: downloadItem.id
      }, !item.wait && item.timeout > 0 ? {} : {
        timeoutTimer: setTimeout(function () {
          item.reject(new Error('download timeout ' + item.timeout / 1000 + 's'));
          _this.filterActiveDownloads(function (d) {
            return item.uid !== d.uid;
          });
        }, item.timeout),

        countDownTimer: setInterval(function () {
          if (!_this.countDownHandler) return;

          var _item$past = item.past,
              past = _item$past === undefined ? 0 : _item$past;

          var newPast = past + 1000;

          _this.countDownHandler({
            total: item.timeout,
            past: newPast
          });
          _extends(item, { past: newPast });
        }, 1000)
      }));
    };

    this.changedListener = function (downloadDelta) {
      if (!_this.isActive()) return;
      Object(_log__WEBPACK_IMPORTED_MODULE_1__[/* default */ "a"])('download on changed', downloadDelta);

      var item = _this.findById(downloadDelta.id);
      if (!item) return;

      if (downloadDelta.state) {
        var fn = function fn() {};
        var done = false;

        switch (downloadDelta.state.current) {
          case 'complete':
            fn = function fn() {
              return item.resolve(true);
            };
            done = true;
            break;

          case 'interrupted':
            fn = function fn() {
              return item.reject(new Error('download interrupted'));
            };
            done = true;
            break;
        }

        // Remove this download item from our todo list if it's done
        if (done) {
          clearTimeout(item.timeoutTimer);
          clearInterval(item.countDownTimer);
          _this.filterActiveDownloads(function (item) {
            return item.id !== downloadDelta.id;
          });
        }

        // resolve or reject that promise object
        fn();
      }
    };

    this.determineFileNameListener = function (downloadItem, suggest) {
      if (!_this.isActive()) return;

      Object(_log__WEBPACK_IMPORTED_MODULE_1__[/* default */ "a"])('download on determine', downloadItem);

      var item = _this.findById(downloadItem.id);
      if (!item) return;

      var tmpName = item.fileName.trim();
      var fileName = tmpName === '' || tmpName === '*' ? null : tmpName;

      if (fileName) {
        return suggest({
          filename: fileName,
          conflictAction: 'uniquify'
        });
      }
    };
  }

  _createClass(DownloadMan, [{
    key: 'isActive',


    /*
     * Private methods
     */

    value: function isActive() {
      return this.activeDownloads.length > 0;
    }
  }, {
    key: 'findById',
    value: function findById(id) {
      return this.activeDownloads.find(function (item) {
        return item.id === id;
      });
    }
  }, {
    key: 'bindEvents',
    value: function bindEvents() {
      if (this.eventsBound) return;

      _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onCreated.addListener(this.createdListener);
      _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onChanged.addListener(this.changedListener);

      // Note: only chrome supports api `chrome.downloads.onDeterminingFilename`
      if (_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onDeterminingFilename) {
        _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onDeterminingFilename.addListener(this.determineFileNameListener);
      }

      this.eventsBound = true;
    }
  }, {
    key: 'unbindEvents',
    value: function unbindEvents() {
      if (!this.eventsBound) return;

      if (_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onCreated.removeListener) {
        _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onCreated.removeListener(this.createdListener);
      }

      if (_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onChanged.removeListener) {
        _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onChanged.removeListener(this.changedListener);
      }

      if (_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onDeterminingFilename && _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onDeterminingFilename.removeListener) {
        _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.onDeterminingFilename.removeListener(this.determineFileNameListener);
      }

      this.eventsBound = false;
    }

    /*
     * Public methods
     */

  }, {
    key: 'reset',
    value: function reset() {
      this.activeDownloads.forEach(function (item) {
        if (item.timeoutTimer) clearTimeout(item.timeoutTimer);
        if (item.countDownTimer) clearInterval(item.countDownTimer);
      });
      this.activeDownloads = [];
      this.unbindEvents();
    }
  }, {
    key: 'prepareDownload',
    value: function prepareDownload(fileName) {
      var _this2 = this;

      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var downloadToCreate = this.activeDownloads.find(function (item) {
        return !item.id;
      });
      if (downloadToCreate) throw new Error('only one not-created download allowed at a time');

      this.bindEvents();

      var opts = _extends({
        timeoutForStart: 10000,
        timeout: 60000,
        wait: false
      }, options);

      var promise = new Promise(function (resolve, reject) {
        var uid = Math.floor(Math.random() * 1000) + new Date() * 1;

        // Note: we need to cache promise object, so have to wait for next tick
        setTimeout(function () {
          _this2.activeDownloads.push({
            uid: uid,
            resolve: resolve,
            reject: reject,
            fileName: fileName,
            promise: promise,
            timeoutForStart: opts.timeoutForStart,
            timeout: opts.timeout,
            wait: opts.wait
          });
        }, 0);
      });

      return promise;
    }
  }, {
    key: 'waitForDownloadIfAny',
    value: function waitForDownloadIfAny() {
      var _this3 = this;

      var downloadToCreate = this.activeDownloads.find(function (item) {
        return !item.id;
      });
      if (downloadToCreate) {
        return Object(_utils__WEBPACK_IMPORTED_MODULE_2__["until"])('download start', function () {
          return {
            pass: !!downloadToCreate.id,
            result: true
          };
        }, 50, downloadToCreate.timeoutForStart).then(function () {
          return _this3.waitForDownloadIfAny();
        });
      }

      // Note: check if id exists, because it means this download item is created
      var downloadToComplete = this.activeDownloads.find(function (item) {
        return item.wait && item.id;
      });
      if (!downloadToComplete) return Promise.resolve(true);
      return downloadToComplete.promise.then(function () {
        return _this3.waitForDownloadIfAny();
      });
    }
  }, {
    key: 'onCountDown',
    value: function onCountDown(fn) {
      this.countDownHandler = fn;
    }
  }]);

  return DownloadMan;
}();

var getDownloadMan = function () {
  var instance = void 0;

  return function () {
    if (!instance) {
      instance = new DownloadMan();
    }

    return instance;
  };
}();

/***/ }),

/***/ 146:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_common_web_extension__WEBPACK_IMPORTED_MODULE_0__);


var platform = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.isFirefox() ? 'firefox' : 'chrome';

/* harmony default export */ __webpack_exports__["a"] = ({
  urlAfterUpgrade: 'https://a9t9.com/kantu/web-automation/' + platform + '/whatsnew',
  urlAfterInstall: 'https://a9t9.com/kantu/web-automation/' + platform + '/welcome',
  urlAfterUninstall: 'https://a9t9.com/kantu/web-automation/' + platform + '/why'
});

/***/ }),

/***/ 147:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

var setStyle = function setStyle($dom, obj) {
  Object.keys(obj).forEach(function (key) {
    $dom.style[key] = obj[key];
  });
};

var withInput = function withInput(fn) {
  var $input = document.createElement('textarea');

  setStyle($input, {
    position: 'aboslute',
    top: '-9999px',
    left: '-9999px'
  });

  document.body.appendChild($input);

  var ret = void 0;

  try {
    ret = fn($input);
  } finally {
    document.body.removeChild($input);
  }

  return ret;
};

var api = {
  set: function set(text) {
    withInput(function ($input) {
      $input.value = text;
      $input.select();
      document.execCommand('copy');
    });
  },
  get: function get() {
    return withInput(function ($input) {
      $input.select();

      if (document.execCommand('Paste')) {
        return $input.value;
      }

      return 'no luck';
    });
  }
};

/* harmony default export */ __webpack_exports__["a"] = (api);

/***/ }),

/***/ 30:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export VisionMan */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getVisionMan; });
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(19);
/* harmony import */ var _file_man__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_2__);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }





var VisionMan = function (_FileMan) {
  _inherits(VisionMan, _FileMan);

  function VisionMan() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, VisionMan);

    return _possibleConstructorReturn(this, (VisionMan.__proto__ || Object.getPrototypeOf(VisionMan)).call(this, _extends({}, opts, { baseDir: 'visions' })));
  }

  _createClass(VisionMan, [{
    key: 'write',
    value: function write(fileName, blob) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].writeFile(this.__filePath(fileName, true), blob);
    }
  }, {
    key: 'read',
    value: function read(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'ArrayBuffer');
    }
  }, {
    key: 'readAsDataURL',
    value: function readAsDataURL(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'DataURL');
    }
  }, {
    key: 'getLink',
    value: function getLink(fileName) {
      if (!_web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.isFirefox()) return Promise.resolve(_get(VisionMan.prototype.__proto__ || Object.getPrototypeOf(VisionMan.prototype), 'getLink', this).call(this, fileName));

      // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
      // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
      // so here, we have to convert the file to data url
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'DataURL');
    }
  }]);

  return VisionMan;
}(_file_man__WEBPACK_IMPORTED_MODULE_1__[/* default */ "a"]);

var man = void 0;

function getVisionMan() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (opts) {
    man = new VisionMan(opts);
  }

  if (!man) {
    throw new Error('vision manager not initialized');
  }

  return man;
}

/***/ }),

/***/ 31:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(3);
var web_extension_default = /*#__PURE__*/__webpack_require__.n(web_extension);

// CONCATENATED MODULE: ./src/common/storage/ext_storage.js
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }



var local = web_extension_default.a.storage.local;

/* harmony default export */ var ext_storage = ({
  get: function get(key) {
    return local.get(key).then(function (obj) {
      return obj[key];
    });
  },

  set: function set(key, value) {
    return local.set(_defineProperty({}, key, value)).then(function () {
      return true;
    });
  },

  remove: function remove(key) {
    return local.remove(key).then(function () {
      return true;
    });
  },

  clear: function clear() {
    return local.clear().then(function () {
      return true;
    });
  },

  addListener: function addListener(fn) {
    web_extension_default.a.storage.onChanged.addListener(function (changes, areaName) {
      var list = Object.keys(changes).map(function (key) {
        return _extends({}, changes[key], { key: key });
      });
      fn(list);
    });
  }
});
// CONCATENATED MODULE: ./src/common/storage/index.js



/* harmony default export */ var storage = __webpack_exports__["a"] = (ext_storage);

/***/ }),

/***/ 36:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export ScreenshotMan */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getScreenshotMan; });
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(19);
/* harmony import */ var _file_man__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(48);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_2__);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }





var ScreenshotMan = function (_FileMan) {
  _inherits(ScreenshotMan, _FileMan);

  function ScreenshotMan() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, ScreenshotMan);

    return _possibleConstructorReturn(this, (ScreenshotMan.__proto__ || Object.getPrototypeOf(ScreenshotMan)).call(this, _extends({}, opts, { baseDir: 'screenshots' })));
  }

  _createClass(ScreenshotMan, [{
    key: 'write',
    value: function write(fileName, blob) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].writeFile(this.__filePath(fileName, true), blob);
    }
  }, {
    key: 'read',
    value: function read(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'ArrayBuffer');
    }
  }, {
    key: 'readAsDataURL',
    value: function readAsDataURL(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'DataURL');
    }
  }, {
    key: 'getLink',
    value: function getLink(fileName) {
      if (!_web_extension__WEBPACK_IMPORTED_MODULE_2___default.a.isFirefox()) return Promise.resolve(_get(ScreenshotMan.prototype.__proto__ || Object.getPrototypeOf(ScreenshotMan.prototype), 'getLink', this).call(this, fileName) + '?' + new Date().getTime());

      // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
      // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
      // so here, we have to convert the file to data url
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'DataURL');
    }
  }]);

  return ScreenshotMan;
}(_file_man__WEBPACK_IMPORTED_MODULE_1__[/* default */ "a"]);

var man = void 0;

function getScreenshotMan() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (opts) {
    man = new ScreenshotMan(opts);
  }

  if (!man) {
    throw new Error('screenshot manager not initialized');
  }

  return man;
}

/***/ }),

/***/ 396:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export resizeWindow */
/* unused harmony export resizeViewport */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return resizeViewportOfTab; });
/* unused harmony export getWindowSize */
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

function logWindowSize(winSize) {
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])(winSize.window, winSize.viewport);
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('dx = ', winSize.window.width - winSize.viewport.width);
  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('dy = ', winSize.window.height - winSize.viewport.height);
}

/***/ }),

/***/ 397:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const worker_connection_1 = __webpack_require__(431);
const image_helper_1 = __webpack_require__(429);
let isModuleReady = false;
let worker = new worker_connection_1.WorkerConnection("/worker.js", workerMessageHandler);
/**
 * Listens regular messages from the worker.
 * @param msg Received worker message.
 */
function workerMessageHandler(msg) {
    switch (msg.type) {
        case 0 /* Init */:
            isModuleReady = true;
            break;
        default:
            console.error("Unsupported worker message: ", msg);
            break;
    }
}
/**
 * Schedules a template matching task for the web worker.
 * @param image Image where the search will be running.
 * @param pattern Image which will searched.
 * @param minSimilarity Minimum similarity score to accept a match.
 * @param allowSizeVariation Allows size variation during image search.
 * @returns Promise object with matches regions.
 */
function postImageSearchAsync(image, pattern, minSimilarity, allowSizeVariation) {
    const jobData = {
        image,
        pattern,
        minSimilarity,
        allowSizeVariation
    };
    return worker.postJobAsync(2 /* ImageSearch */, jobData);
}
function searchImageBestOne(req) {
    return searchImage(req)
        .then(results => results[0]);
}
exports.searchImageBestOne = searchImageBestOne;
function searchImage(req) {
    if (!isModuleReady) {
        throw new Error('Module is not ready yet.');
    }
    const minSimilarity = Math.max(0.1, Math.min(1.0, req.minSimilarity));
    const { allowSizeVariation } = req;
    return Promise.all([
        image_helper_1.ImageHelper.loadImageDataAsync(req.targetImageUrl),
        image_helper_1.ImageHelper.loadImageDataAsync(req.patternImageUrl)
    ])
        .then(([screenshotImageData, patternImageData]) => {
        return postImageSearchAsync(screenshotImageData, patternImageData, minSimilarity, allowSizeVariation)
            .then(regions => {
            return regions.map(r => ({
                left: r.left / req.scaleDownRatio + req.offsetX,
                top: r.top / req.scaleDownRatio + req.offsetY,
                width: r.width / req.scaleDownRatio,
                height: r.height / req.scaleDownRatio,
                score: r.score
            }));
        });
    });
}
exports.searchImage = searchImage;


/***/ }),

/***/ 398:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export withDebugger */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return setFileInputFiles; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };




var PROTOCOL_VERSION = '1.2';
var ClEANUP_TIMEOUT = 0;

var withDebugger = function () {
  var state = {
    connected: null,
    cleanupTimer: null
  };

  var setState = function setState(obj) {
    _extends(state, obj);
  };

  var cancelCleanup = function cancelCleanup() {
    if (state.cleanupTimer) clearTimeout(state.cleanupTimer);
    setState({ cleanupTimer: null });
  };

  var isSameDebuggee = function isSameDebuggee(a, b) {
    return a && b && a.tabId && b.tabId && a.tabId === b.tabId;
  };

  return function (debuggee, fn) {
    var attach = function attach(debuggee) {
      if (isSameDebuggee(state.connected, debuggee)) {
        cancelCleanup();
        return Promise.resolve();
      }

      return detach(state.connected).then(function () {
        return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.debugger.attach(debuggee, PROTOCOL_VERSION);
      }).then(function () {
        return setState({ connected: debuggee });
      });
    };
    var detach = function detach(debuggee) {
      if (!debuggee) return Promise.resolve();

      return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.debugger.detach(debuggee).then(function () {
        if (state.cleanupTimer) clearTimeout(state.cleanupTimer);

        setState({
          connected: null,
          cleanupTimer: null
        });
      }, function (e) {
        return console.error('error in detach', e.stack);
      });
    };
    var scheduleDetach = function scheduleDetach() {
      var timer = setTimeout(function () {
        return detach(debuggee);
      }, ClEANUP_TIMEOUT);
      setState({ cleanupTimer: timer });
    };
    var sendCommand = function sendCommand(cmd, params) {
      return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.debugger.sendCommand(debuggee, cmd, params);
    };
    var onEvent = function onEvent(callback) {
      _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.debugger.onEvent.addListener(callback);
    };
    var onDetach = function onDetach(callback) {
      _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.debugger.onDetach.addListener(callback);
    };

    return new Promise(function (resolve, reject) {
      var done = function done(error, result) {
        scheduleDetach();

        if (error) return reject(error);else return resolve(result);
      };

      return attach(debuggee).then(function () {
        fn({ sendCommand: sendCommand, onEvent: onEvent, onDetach: onDetach, done: done });
      }, function (e) {
        return reject(e);
      });
    });
  };
}();

var __getDocument = function __getDocument(_ref) {
  var sendCommand = _ref.sendCommand,
      done = _ref.done;
  return function () {
    return sendCommand('DOM.getDocument').then(function (obj) {
      return obj.root;
    });
  };
};

var __querySelector = function __querySelector(_ref2) {
  var sendCommand = _ref2.sendCommand,
      done = _ref2.done;
  return Object(_utils__WEBPACK_IMPORTED_MODULE_1__["partial"])(function (selector, nodeId) {
    return sendCommand('DOM.querySelector', { nodeId: nodeId, selector: selector }).then(function (res) {
      return res && res.nodeId;
    });
  });
};

var __setFileInputFiles = function __setFileInputFiles(_ref3) {
  var sendCommand = _ref3.sendCommand,
      done = _ref3.done;
  return Object(_utils__WEBPACK_IMPORTED_MODULE_1__["partial"])(function (files, nodeId) {
    return sendCommand('DOM.setFileInputFiles', { nodeId: nodeId, files: files }).then(function () {
      return true;
    });
  });
};

var setFileInputFiles = function setFileInputFiles(_ref4) {
  var tabId = _ref4.tabId,
      selector = _ref4.selector,
      files = _ref4.files;

  return withDebugger({ tabId: tabId }, function (api) {
    var go = Object(_utils__WEBPACK_IMPORTED_MODULE_1__["composePromiseFn"])(__setFileInputFiles(api)(files), __querySelector(api)(selector), function (node) {
      return node.nodeId;
    }, __getDocument(api));

    return go().then(function (res) {
      return api.done(null, res);
    });
  });
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

/***/ 428:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Implements common mathematics operations.
 */
class MathHelper {
    /**
     * Generates a random number within given range.
     * @param minValue Minimum value (including).
     * @param maxValue Maximum value (excluding).
     * @returns Generated random number.
     */
    static randomRange(minValue, maxValue) {
        return Math.floor(minValue + Math.random() * (maxValue - minValue));
    }
    /**
     * Generates random CSS color with alpha.
     * @returns Generated random color.
     */
    static randomColor() {
        const r = MathHelper.randomRange(0, 256);
        const g = MathHelper.randomRange(0, 256);
        const b = MathHelper.randomRange(0, 256);
        const a = MathHelper.randomRange(1, 256) / 256;
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
}
exports.MathHelper = MathHelper;


/***/ }),

/***/ 429:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const math_helper_1 = __webpack_require__(428);
/**
 * Implements common image operations
 */
class ImageHelper {
    /**
     * Loads an image asynchronously from given URL.
     * @param url Image URL
     * @returns Promise object
     */
    static loadImageAsync(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => {
                reject();
            };
            img.src = url;
        });
    }
    /**
     * Loads an image data asynchronously from given URL.
     * @param url Image URL
     * @returns Promise object with ImageData
     */
    static loadImageDataAsync(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const img = yield this.loadImageAsync(url);
            return this.convertImageToImageData(img);
        });
    }
    /**
     * Converts image data to data URL.
     * @param imageData Input image data.
     * @returns Data URL.
     */
    static convertImageDataToDataUrl(imageData) {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }
        context.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    }
    /**
     * Converts image element to image data.
     * @param img Input image element.
     * @returns Image data.
     */
    static convertImageToImageData(img) {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }
        context.drawImage(img, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }
    /**
     * Adds some noise to input image.
     * @param imageData Input image data.
     * @returns Noise applied image data.
     */
    static distortImage(imageData) {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }
        context.putImageData(imageData, 0, 0);
        const size = canvas.width * canvas.height;
        const iterations = Math.max(10, Math.floor(size * 0.01 * Math.random()));
        for (let i = 0; i < iterations; ++i) {
            const x = math_helper_1.MathHelper.randomRange(0, canvas.width);
            const y = math_helper_1.MathHelper.randomRange(0, canvas.height);
            const w = math_helper_1.MathHelper.randomRange(1, 20) / 10;
            const h = math_helper_1.MathHelper.randomRange(1, 20) / 10;
            context.fillStyle = math_helper_1.MathHelper.randomColor();
            context.fillRect(x, y, w, h);
        }
        return context.getImageData(0, 0, canvas.width, canvas.height);
    }
    /**
     * Gets a part of given image data.
     * @param imageData Input image data.
     * @param region Region in input image data.
     * @returns Image data in given region.
     */
    static getImageDataRegion(imageData, region) {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Cannot acquire 2D context.");
        }
        context.putImageData(imageData, 0, 0);
        return context.getImageData(region.left, region.top, region.right - region.left, region.bottom - region.top);
    }
}
exports.ImageHelper = ImageHelper;


/***/ }),

/***/ 430:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Manages Job lifecycle.
 */
class JobFactory {
    /**
     * Creates a new job with a unique identifier.
     * @param type Job type.
     * @param args Job argument.
     * @returns Created job.
     */
    static create(type, args) {
        const id = JobFactory.nextId++;
        const job = {
            id,
            type,
            startTime: performance.now(),
            finishTime: 0,
            args,
            result: undefined
        };
        return job;
    }
    /**
     * Completes a job with given result.
     * @param request Previously started job.
     * @param result Job result.
     * @returns Job with result data.
     */
    static complete(request, result) {
        const job = {
            id: request.id,
            type: request.type,
            startTime: request.startTime,
            finishTime: performance.now(),
            args: request.args,
            result: result
        };
        return job;
    }
}
JobFactory.nextId = 1;
exports.JobFactory = JobFactory;


/***/ }),

/***/ 431:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const job_1 = __webpack_require__(430);
/**
 * Wrapper for enqueued jobs.
 */
class JobQueueItem {
    /**
     * Constructs a new instance.
     * @param type Job type.
     * @param data Job data.
     * @param callback Job completion callback.
     */
    constructor(type, data, callback) {
        this.jobObject = job_1.JobFactory.create(type, data);
        this.callback = callback;
    }
    /**
     * Underlying job object.
     */
    get job() {
        return this.jobObject;
    }
}
/**
 * Provides a connection between the worker and window.
 */
class WorkerConnection {
    /**
     * Constructs a new connection instance.
     * @param workerUrl Worker script URL
     * @param messageHandler Event handler delegate for generic messages.
     */
    constructor(workerUrl, messageHandler) {
        this.queue = new Array();
        this.messageHandler = messageHandler;
        this.worker = new Worker(workerUrl);
        this.worker.onmessage = this.handleWorkerCallback.bind(this);
    }
    /**
     * Worker event message handler
     * @param e Message event.
     */
    handleWorkerCallback(e) {
        const msg = e.data;
        if (msg.type === 1 /* Job */) {
            const job = msg.data;
            let callback = undefined;
            for (let i = 0; i < this.queue.length; ++i) {
                const entry = this.queue[i];
                if (entry.job.id === job.id) {
                    callback = entry.callback;
                    this.queue.splice(i, 1);
                    break;
                }
            }
            const elapsedTime = Math.max(0, job.finishTime - job.startTime);
            console.log(`Job #${job.id} completed in ${elapsedTime.toFixed(0)} ms (excluding callback overhead).`);
            if (callback) {
                callback(job.result);
            }
        }
        else {
            this.messageHandler(msg);
        }
    }
    /**
     * Sends a message to the worker.
     * @param msg Message to be sent.
     */
    postMessage(msg) {
        this.worker.postMessage(msg);
    }
    /**
     * Enqueues a job with a callback for sending the worker.
     * @param type Job type.
     * @param data Job data.
     * @param callback Job completion callback.
     */
    postJob(type, data, callback) {
        const item = new JobQueueItem(type, data, callback);
        this.queue.push(item);
        this.postMessage({
            type: 1 /* Job */,
            data: item.job
        });
    }
    /**
     * Enqueues a job with a Promise object for sending the worker.
     * @param type Job type.
     * @param data Job data.
     * @returns Promise object for job completion in worker.
     */
    postJobAsync(type, data) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.postJob(type, data, (result) => {
                resolve(result);
            });
        });
    }
}
exports.WorkerConnection = WorkerConnection;


/***/ }),

/***/ 432:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(process) {/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_common_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _common_ipc_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(72);
/* harmony import */ var _common_constant__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(7);
/* harmony import */ var _common_log__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(4);
/* harmony import */ var _common_clipboard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(147);
/* harmony import */ var _common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(54);
/* harmony import */ var _common_storage__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(31);
/* harmony import */ var _common_debugger__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(398);
/* harmony import */ var _common_download_man__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(104);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(146);
/* harmony import */ var _common_screenshot_man__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(36);
/* harmony import */ var _common_imagesearch_adaptor_ts__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(397);
/* harmony import */ var _common_imagesearch_adaptor_ts__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(_common_imagesearch_adaptor_ts__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var _common_vision_man__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(30);
/* harmony import */ var _common_resize_window__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(396);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

















// Note: in Ubuntu, you have to take some delay after activating some tab, otherwise there are chances
// Chrome still think the panel is the window you want to take screenshot, and weird enough in Ubuntu,
// You can't take screenshot of tabs with 'chrome-extension://' schema, even if it's your own extension
var SCREENSHOT_DELAY = /Linux/i.test(window.navigator.userAgent) ? 200 : 0;

var state = {
  status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL,
  tabIds: {
    lastInspect: null,
    lastRecord: null,
    toInspect: null,
    firstRecord: null,
    toRecord: null,
    lastPlay: null,
    firstPlay: null,
    toPlay: null,
    panel: null
  },
  ipcCache: {},
  pullback: false
};

var createTab = function createTab(url) {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({ url: url, active: true });
};

var activateTab = function activateTab(tabId, focusWindow) {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId).then(function (tab) {
    var p = focusWindow ? _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(tab.windowId, { focused: true }) : Promise.resolve();

    return p.then(function () {
      return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.update(tab.id, { active: true });
    }).then(function () {
      return tab;
    });
  });
};

var getTab = function getTab(tabId) {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId);
};

// Generate function to get ipc based on tabIdName and some error message
var genGetTabIpc = function genGetTabIpc(tabIdName, purpose) {
  return function () {
    var tabId = state.tabIds[tabIdName];

    if (!tabId) {
      return Promise.reject(new Error('No tab for ' + purpose + ' yet'));
    }

    return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId).then(function (tab) {
      if (!tab) {
        throw new Error('The ' + purpose + ' tab seems to be closed');
      }

      var ipc = state.ipcCache[tab.id];

      if (!ipc) {
        throw new Error('No ipc available for the ' + purpose + ' tab');
      }

      return ipc;
    });
  };
};

var getRecordTabIpc = genGetTabIpc('toRecord', 'recording');

var getPlayTabIpc = genGetTabIpc('toPlay', 'playing commands');

var getPanelTabIpc = genGetTabIpc('panel', 'dashboard');

// Get the current tab for play, if url provided, it will be loaded in the tab
var getPlayTab = function getPlayTab(url) {
  // Note: update error message to be more user friendly. But the original message is kept as comment
  // const theError  = new Error('Either a played tab or a url must be provided to start playing')
  var theError = new Error('No connection to browser tab');

  Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('getPlayTab', url, state.tabIds.toPlay);

  var createOne = function createOne(url) {
    if (!url) throw theError;

    return createTab(url).then(function (tab) {
      state.tabIds.lastPlay = state.tabIds.toPlay;
      state.tabIds.toPlay = state.tabIds.firstPlay = tab.id;
      return tab;
    });
  };

  if (!state.tabIds.toPlay && !url) {
    throw theError;
  }

  if (!state.tabIds.toPlay) {
    return createOne(url);
  }

  return getTab(state.tabIds.toPlay).then(function (tab) {
    if (!url) {
      return tab;
    }

    // Note: must clear ipcCache manually here, so that further messages
    // won't be sent the old ipc
    state.ipcCache[tab.id] = null;
    return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.update(tab.id, { url: url });
  }, function () {
    return createOne(url);
  });
};

var showPanelWindow = function showPanelWindow() {
  return activateTab(state.tabIds.panel, true).catch(function () {
    _common_storage__WEBPACK_IMPORTED_MODULE_7__[/* default */ "a"].get('config').then(function (config) {
      config = config || {};
      return (config.size || {})[config.showSidebar ? 'with_sidebar' : 'standard'];
    }).then(function (size) {
      size = size || {
        width: 850,
        height: 775
      };

      _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.create({
        type: 'popup',
        url: _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.extension.getURL('popup.html'),
        width: size.width,
        height: size.height
      }).then(function (win) {
        if (!_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.isFirefox()) return;

        // Refer to https://bugzilla.mozilla.org/show_bug.cgi?id=1425829
        // Firefox New popup window appears blank until right-click
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(win.id, {
            width: size.width + 1,
            height: size.height + 1
          });
        }, 1000);
      });

      return true;
    });
  });
};

var withPanelIpc = function withPanelIpc() {
  return showPanelWindow().then(function () {
    return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('panel ipc', function () {
      return {
        pass: state.tabIds.panel && state.ipcCache[state.tabIds.panel]
      };
    });
  }).then(function () {
    return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(getPanelTabIpc, 2000);
  });
};

var showBadge = function showBadge(options) {
  var _clear$text$color$bli = _extends({
    clear: false,
    text: '',
    color: '#ff0000',
    blink: 0
  }, options || {}),
      clear = _clear$text$color$bli.clear,
      text = _clear$text$color$bli.text,
      color = _clear$text$color$bli.color,
      blink = _clear$text$color$bli.blink;

  if (clear) {
    return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeText({ text: '' });
  }

  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeBackgroundColor({ color: color });
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeText({ text: text });

  if (blink) {
    setTimeout(function () {
      _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.getBadgeText({}).then(function (curText) {
        if (curText !== text) return false;
        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeText({ text: '' });
      });
    }, blink);
  }

  return true;
};

var toggleRecordingBadge = function toggleRecordingBadge(isRecording, options) {
  return showBadge(_extends({
    color: '#ff0000',
    text: 'R'
  }, options || {}, {
    clear: !isRecording
  }));
};

var toggleInspectingBadge = function toggleInspectingBadge(isInspecting, options) {
  return showBadge(_extends({
    color: '#ffa800',
    text: 'S'
  }, options || {}, {
    clear: !isInspecting
  }));
};

var togglePlayingBadge = function togglePlayingBadge(isPlaying, options) {
  return showBadge(_extends({
    color: '#14c756',
    text: 'P'
  }, options || {}, {
    clear: !isPlaying
  }));
};

var isUpgradeViewed = function isUpgradeViewed() {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.storage.local.get('upgrade_not_viewed').then(function (obj) {
    return obj['upgrade_not_viewed'] !== 'not_viewed';
  });
};

var notifyRecordCommand = function notifyRecordCommand(command) {
  var notifId = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["uid"])();

  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.notifications.create(notifId, {
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Record command!',
    message: function () {
      var list = [];

      list.push('command: ' + command.cmd);
      if (command.target) list.push('target: ' + command.target);
      if (command.value) list.push('value: ' + command.value);

      return list.join('\n');
    }()
  });

  // Note: close record notifications right away, so that notifications won't be stacked
  setTimeout(function () {
    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.notifications.clear(notifId).catch(function (e) {
      return _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error(e);
    });
  }, 2000);
};

var notifyAutoPause = function notifyAutoPause() {
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Replay paused!',
    message: 'Auto paused by command'
  });
};

var notifyBreakpoint = function notifyBreakpoint() {
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Replay paused!',
    message: 'Auto paused by breakpoint'
  });
};

var notifyEcho = function notifyEcho(text) {
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.notifications.create({
    type: 'basic',
    iconUrl: './logo.png',
    title: 'Echo',
    message: text
  });
};

var closeAllWindows = function closeAllWindows() {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getAll().then(function (wins) {
    return Promise.all(wins.map(function (win) {
      return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.remove(win.id);
    }));
  });
};

var isTimeToBackup = function isTimeToBackup() {
  return _common_storage__WEBPACK_IMPORTED_MODULE_7__[/* default */ "a"].get('config').then(function (config) {
    var enableAutoBackup = config.enableAutoBackup,
        lastBackupActionTime = config.lastBackupActionTime,
        autoBackupInterval = config.autoBackupInterval;


    if (!enableAutoBackup) {
      return {
        timeout: false,
        remain: -1
      };
    }

    var diff = new Date() * 1 - (lastBackupActionTime || 0);
    return {
      timeout: diff > autoBackupInterval * 24 * 3600000,
      remain: diff
    };
  });
};

var notifyPanelAboutActiveTab = function notifyPanelAboutActiveTab(activeTabId) {
  Promise.all([_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(activeTabId), getPanelTabIpc()]).then(function (tuple) {
    var _tuple = _slicedToArray(tuple, 2),
        tab = _tuple[0],
        panelIpc = _tuple[1];

    if (tab.url.indexOf(_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.extension.getURL('')) !== -1) return;

    if (!tab.title || tab.title.trim().length === 0) {
      return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
        return notifyPanelAboutActiveTab(activeTabId);
      }, 200);
    }

    return panelIpc.ask('UPDATE_ACTIVE_TAB', {
      url: tab.url,
      title: tab.title
    });
  });
};

var isTabActiveAndFocused = function isTabActiveAndFocused(tabId) {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId).then(function (tab) {
    if (!tab.active) return false;

    switch (state.status) {
      case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL:
        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(tab.windowId).then(function (win) {
          return win.focused;
        });

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].PLAYER:
        return tabId === state.tabIds.toPlay;

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER:
        return tabId === state.tabIds.toRecord;

      default:
        throw new Error('isTabActiveAndFocused: unknown app status, \'' + state.status + '\'');
    }
  }).catch(function (e) {
    return false;
  });
};

var bindEvents = function bindEvents() {
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.onClicked.addListener(function () {
    isUpgradeViewed().then(function (isViewed) {
      if (isViewed) {
        return showPanelWindow();
      } else {
        _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeText({ text: '' });
        _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.storage.local.set({
          upgrade_not_viewed: ''
        });
        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({
          url: _config__WEBPACK_IMPORTED_MODULE_10__[/* default */ "a"].urlAfterUpgrade
        });
      }
    });
  });

  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (!tab.active) return;

    isTabActiveAndFocused(tabId).then(function (isFocused) {
      if (!isFocused) return;
      return notifyPanelAboutActiveTab(tabId);
    });
  });

  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.onFocusChanged.addListener(function (windowId) {
    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ windowId: windowId, active: true }).then(function (tabs) {
      if (tabs.length === 0) return;

      var ipc = state.ipcCache[tabs[0].id];
      if (ipc) {
        ipc.ask('TAB_ACTIVATED', {});
      }
    });
  });

  // Note: set the activated tab as the one to play
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.onActivated.addListener(function (activeInfo) {
    if (activeInfo.tabId === state.tabIds.panel) return;

    var ipc = state.ipcCache[activeInfo.tabId];
    if (ipc) {
      ipc.ask('TAB_ACTIVATED', {});
    }

    notifyPanelAboutActiveTab(activeInfo.tabId);

    switch (state.status) {
      case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL:
        // Note: In Firefox, without this delay of 100ms, `tab.url` will still be 'about:config'
        // so have to wait for the url to take effect
        setTimeout(function () {
          _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(activeInfo.tabId).then(function (tab) {
            if (tab.url.indexOf(_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.extension.getURL('')) !== -1) return;

            Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('in tab activated, set toPlay to ', activeInfo);
            state.tabIds.lastPlay = state.tabIds.toPlay;
            state.tabIds.toPlay = state.tabIds.firstPlay = activeInfo.tabId;
          });
        }, 100);

        break;

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER:
        {
          // Note: three things to do when switch tab in recording
          // 1. set the new tab to RECORDING status,
          // 2. and the original one back to NORMAL status
          // 3. commit a `selectWindow` command
          //
          // Have to wait for the new tab establish connection with background
          Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('new tab creates ipc', function () {
            return {
              pass: state.ipcCache[activeInfo.tabId],
              result: state.ipcCache[activeInfo.tabId]
            };
          })
          // Note: wait for 1 second, expecting commands from original page to be committed
          .then(function (ipc) {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
              return ipc;
            }, 1000);
          }).then(function (ipc) {
            return ipc.ask('SET_STATUS', {
              status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].RECORDING
            });
          }).then(function () {
            // Note: set the original tab to NORMAL status
            // only if the new tab is set to RECORDING status
            return getRecordTabIpc().then(function (ipc) {
              ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].NORMAL
              });
            });
          }).then(function () {
            // Note: get window locator & update recording tab
            var oldTabId = state.tabIds.firstRecord;
            var newTabId = activeInfo.tabId;

            return Promise.all([_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(oldTabId), _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(newTabId)]).then(function (_ref) {
              var _ref2 = _slicedToArray(_ref, 2),
                  oldTab = _ref2[0],
                  newTab = _ref2[1];

              var result = [];

              // update recording tab
              state.tabIds.toRecord = activeInfo.tabId;

              if (oldTab.windowId === newTab.windowId) {
                result.push('tab=' + (newTab.index - oldTab.index));
              }

              result.push('title=' + newTab.title);

              return {
                target: result[0],
                targetOptions: result
              };
            });
          }).then(function (data) {
            // Note: commit the `selectWindow` command
            var command = _extends({
              cmd: 'selectWindow'
            }, data);

            return getPanelTabIpc().then(function (panelIpc) {
              return panelIpc.ask('RECORD_ADD_COMMAND', command);
            }).then(function () {
              return notifyRecordCommand(command);
            });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error(e.stack);
          });
          break;
        }
    }
  });
};

// usage:
// 1. set tabId for inspector:  `setInspectorTabId(someTabId)`
// 2. clear tabId for inspector: `setInspectorTabId(null, true)`
var setInspectorTabId = function setInspectorTabId(tabId, shouldRemove, noNotify) {
  state.tabIds.lastInspect = state.tabIds.toInspect;

  if (tabId) {
    state.tabIds.toInspect = tabId;
    return Promise.resolve(true);
  } else if (shouldRemove) {
    if (state.tabIds.toInspect) {
      state.tabIds.toInspect = null;

      if (noNotify) return Promise.resolve(true);

      return state.ipcCache[state.tabIds.toInspect].ask('STOP_INSPECTING').catch(function (e) {
        return Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])(e.stack);
      });
    }
    return Promise.resolve(true);
  }
};

var startSendingTimeoutStatus = function startSendingTimeoutStatus(timeout) {
  var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'wait';

  var past = 0;

  if (state.timer) clearInterval(state.timer);
  state.timer = setInterval(function () {
    past += 1000;

    getPanelTabIpc().then(function (panelIpc) {
      panelIpc.ask('TIMEOUT_STATUS', {
        type: type,
        past: past,
        total: timeout
      });
    });

    if (past >= timeout) {
      clearInterval(state.timer);
    }
  }, 1000);

  return function () {
    return clearInterval(state.timer);
  };
};

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
var onRequest = function onRequest(cmd, args) {
  if (cmd !== 'CS_ACTIVATE_ME') {
    Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('onAsk', cmd, args);
  }

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      state.tabIds.panel = args.sender.tab.id;

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (state.tabIds.toPlay === args.sender.tab.id) {
        Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('I am panel, set toPlay to null');
        state.tabIds.toPlay = state.tabIds.firstPlay = state.tabIds.lastPlay;
      }

      return true;

    case 'PANEL_TIME_FOR_BACKUP':
      return isTimeToBackup().then(function (obj) {
        return obj.timeout;
      });

    case 'PANEL_START_RECORDING':
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('Start to record...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER;
      toggleRecordingBadge(true);
      return true;

    case 'PANEL_STOP_RECORDING':
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('Stop recording...');

      getRecordTabIpc().then(function (ipc) {
        ipc.ask('SET_STATUS', {
          status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].NORMAL
        });
      });

      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL;
      state.tabIds.lastRecord = state.tabIds.toRecord;
      state.tabIds.toRecord = null;
      state.tabIds.firstRecord = null;

      toggleRecordingBadge(false);
      return true;

    case 'PANEL_TRY_TO_RECORD_OPEN_COMMAND':
      {
        if (state.status !== _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER) {
          throw new Error('Not in recorder mode');
        }

        // Well, `getPlayTab` is actually 'get current active tab'
        return getPlayTab().then(function (tab) {
          Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('PANEL_TRY_TO_RECORD_OPEN_COMMAND', tab);

          if (!/^(https?:|file:)/.test(tab.url)) {
            throw new Error('Not a valid url to record as open command');
          }

          state.tabIds.toRecord = state.tabIds.firstRecord = tab.id;

          getPanelTabIpc().then(function (panelIpc) {
            var command = {
              cmd: 'open',
              target: tab.url
            };

            panelIpc.ask('RECORD_ADD_COMMAND', command);
            notifyRecordCommand(command);
          });

          return true;
        });
      }

    case 'PANEL_START_INSPECTING':
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('start to inspect...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].INSPECTOR;
      toggleInspectingBadge(true);
      return true;

    case 'PANEL_STOP_INSPECTING':
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('start to inspect...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL;

      toggleInspectingBadge(false);
      return setInspectorTabId(null, true);

    case 'PANEL_START_PLAYING':
      {
        Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('start to play...');
        state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].PLAYER;

        togglePlayingBadge(true);
        // Note: reset download manager to clear any previous downloads
        Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().reset();

        if (state.timer) clearInterval(state.timer);

        return getPlayTab()
        // Note: catch any error, and make it run 'getPlayTab(args.url)' instead
        .catch(function (e) {
          return { id: -1 };
        }).then(function (tab) {
          Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('after first getPlayTab', tab);
          var openUrlInTab = function openUrlInTab() {
            return getPlayTab(args.url).then(function (tab) {
              return { tab: tab, hasOpenedUrl: true };
            });
          };

          if (!state.ipcCache[tab.id]) {
            return openUrlInTab();
          } else {
            // Note: test if the ipc is still active,
            // if it's not, try to open url as if that ipc doesn't exist at all
            return state.ipcCache[tab.id].ask('HEART_BEAT', {}, 500).then(function () {
              return { tab: tab, hasOpenedUrl: false };
            }).catch(openUrlInTab);
          }
        }).then(function (_ref3) {
          var tab = _ref3.tab,
              hasOpenedUrl = _ref3.hasOpenedUrl;

          var p = args.shouldNotActivateTab ? Promise.resolve() : activateTab(tab.id, true);

          // Note: wait for tab to confirm it has loaded
          return p.then(function () {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('ipc of tab to play', function () {
              return {
                pass: !!state.ipcCache[tab.id],
                result: state.ipcCache[tab.id]
              };
            }, 1000, 6000 * 10);
          }).then(function (ipc) {
            var p = !hasOpenedUrl ? Promise.resolve() : ipc.ask('MARK_NO_COMMANDS_YET', {});
            return p.then(function () {
              return ipc.ask('SET_STATUS', { status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].PLAYING });
            });
          });
        }).catch(function (e) {
          togglePlayingBadge(false);
          throw e;
        });
      }

    case 'PANEL_RUN_COMMAND':
      {
        if (state.timer) clearInterval(state.timer);

        var shouldWaitForDownloadAfterRun = function shouldWaitForDownloadAfterRun(command) {
          Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('shouldWaitForDownloadAfterRun', command);
          if (command.cmd === 'click') return true;
          return false;
        };
        var runCommand = function runCommand(args, retryInfo) {
          return getPlayTabIpc().then(function (ipc) {
            var gotHeartBeat = false;

            var checkHeartBeat = function checkHeartBeat() {
              // Note: ignore any exception when checking heart beat
              // possible exception: no tab for play, no ipc
              return getPlayTabIpc().then(function (ipc) {
                return ipc.ask('HEART_BEAT', {});
              }).then(function () {
                gotHeartBeat = true;
              }, function () {
                return null;
              });
            };

            // res format: { data, isIFrame }
            var wait = function wait(res) {
              var shouldWait = /wait/i.test(args.command.cmd) || args.command.cmd === 'open';
              var shouldResetIpc = !res.isIFrame && (/AndWait/i.test(args.command.cmd) || args.command.cmd === 'refresh');
              if (!shouldWait) return Promise.resolve(res.data);

              Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('wait!!!!', res);
              var timeoutPageLoad = (res.data && res.data.extra && res.data.extra.timeoutPageLoad || 60) * 1000;
              var timeoutHeartbeat = (res.data && res.data.extra && res.data.extra.timeoutElement || 10) * 1000;

              // Note: for clickAndWait etc.,  must reset ipc to avoid
              // any further message (like heart beat) to be sent to the original ipc
              if (shouldResetIpc) ipc.destroy();

              // Note: put some delay here because there are cases when next command's
              // heart beat request is answered by previous page
              return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 2000)
              // A standlone `checkHeartBeat to make sure we don't have to wait until's
              // first interval to pass the check
              .then(function () {
                return checkHeartBeat();
              }).then(function () {
                return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('player tab heart beat check', function () {
                  checkHeartBeat();

                  return {
                    pass: gotHeartBeat,
                    result: true
                  };
                }, 100, timeoutHeartbeat).catch(function (e) {
                  var cmd = args.command.cmd;

                  var isAndWait = /AndWait/.test(cmd);

                  if (isAndWait) {
                    var instead = cmd.replace('AndWait', '');
                    throw new Error('\'' + cmd + '\' failed. No page load event detected after ' + timeoutHeartbeat / 1000 + ' seconds. Try \'' + instead + '\' instead.');
                  } else {
                    throw new Error(cmd + '\' failed. No page load event detected after ' + timeoutHeartbeat / 1000 + ' seconds.');
                  }
                });
              })
              // Note: must get the new ipc here.
              // The previous ipc is useless after a new page load
              .then(function () {
                return getPlayTabIpc();
              }).then(function (ipc) {
                // Note: send timeout status to dashboard once we get the heart beat
                // and start to wait for dom ready
                var clear = startSendingTimeoutStatus(timeoutPageLoad);
                return ipc.ask('DOM_READY', {}, timeoutPageLoad).then(function () {
                  clear();
                  ipc.ask('HACK_ALERT', {});
                }, function () {
                  clear();
                  throw new Error('page load ' + timeoutPageLoad / 1000 + ' seconds time out');
                });
              }).then(function () {
                return res.data;
              });
            };

            // Note: clear timer whenever we execute a new command, and it's not a retry
            if (state.timer && retryInfo.retryCount === 0) clearInterval(state.timer);

            // Note: -1 will disable ipc timeout for 'pause' command
            var ipcTimeout = args.command.cmd === 'pause' ? -1 : null;

            return ipc.ask('DOM_READY', {}).then(function () {
              return ipc.ask('RUN_COMMAND', {
                command: _extends({}, args.command, {
                  extra: _extends({}, args.command.extra || {}, {
                    retryInfo: retryInfo
                  })
                })
              }, ipcTimeout);
            }).then(wait);
          });
        };

        var timer = null;
        var timeout = args.command.extra.timeoutElement * 1000;

        var runCommandWithRetry = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["retry"])(runCommand, {
          timeout: timeout,
          shouldRetry: function shouldRetry(e) {
            return e.message && (e.message.indexOf('timeout reached when looking for') !== -1 || e.message.indexOf('element is found but not visible yet') !== -1 || e.message.indexOf('IPC Promise has been destroyed') !== -1);
          },
          onFirstFail: function onFirstFail(e) {
            var title = e.message.indexOf('element is found but not visible yet') !== -1 ? 'Tag waiting' // All use Tag Waiting for now  // 'Visible waiting'
            : 'Tag waiting';

            startSendingTimeoutStatus(timeout, title);
          },
          onFinal: function onFinal(err, data) {
            Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('onFinal', err, data);
            if (state.timer) clearInterval(state.timer);
          }
        });

        return runCommandWithRetry(args).catch(function (e) {
          // Note: if variable !ERRORIGNORE is set to true,
          // it will just log errors instead of a stop of whole macro
          if (args.command.extra && args.command.extra.errorIgnore) {
            return {
              log: {
                error: e.message
              }
            };
          }

          throw e;
        }).then(function (data) {
          if (shouldWaitForDownloadAfterRun(args.command)) {
            // Note: wait for download to either be create or completed
            return Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().waitForDownloadIfAny().then(function () {
              return data;
            });
          }

          return data;
        }).then(function (data) {
          // Note: use bg to set pageUrl, so that we can be sure that this `pageUrl` is 100% correct
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.toPlay).then(function (tab) {
            return _extends({}, data, { pageUrl: tab.url });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error('Error in fetching play tab url');
            return data;
          });
        });
      }

    case 'PANEL_STOP_PLAYING':
      {
        togglePlayingBadge(false);
        state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL;

        // Note: reset download manager to clear any previous downloads
        Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().reset();

        // Note: reset firstPlay to current toPlay when stopped playing
        // userful for playing loop (reset firstPlay after each loop)
        state.tabIds.firstPlay = state.tabIds.toPlay;

        if (state.timer) clearInterval(state.timer);

        // Note: let cs know that it should exit playing mode
        var ipc = state.ipcCache[state.tabIds.toPlay];
        return ipc.ask('SET_STATUS', { status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].NORMAL });
      }

    // corresponding to the 'find' functionality on dashboard panel
    // It will find either the last play tab or record tab to look for the passed in locator
    case 'PANEL_HIGHLIGHT_DOM':
      {
        return Promise.all([getRecordTabIpc().then(function (ipc) {
          return { ipc: ipc, type: 'record' };
        }).catch(function () {
          return null;
        }), getPlayTabIpc().then(function (ipc) {
          return { ipc: ipc, type: 'play' };
        }).catch(function () {
          return null;
        })]).then(function (tuple) {
          if (!tuple[0] && !tuple[1]) {
            throw new Error('No where to look for the dom');
          }

          return tuple.filter(function (x) {
            return !!x;
          });
        }).then(function (list) {
          return Promise.all(list.map(function (_ref4) {
            var ipc = _ref4.ipc,
                type = _ref4.type;

            return ipc.ask('FIND_DOM', { locator: args.locator }).then(function (result) {
              return { result: result, type: type, ipc: ipc };
            });
          }));
        }).then(function (list) {
          var foundedList = list.filter(function (x) {
            return x.result;
          });

          if (foundedList.length === 0) {
            throw new Error('DOM not found');
          }

          var item = foundedList.length === 2 ? foundedList.find(function (item) {
            return item.type === args.lastOperation;
          }) : foundedList[0];

          var tabId = state.tabIds[item.type === 'record' ? 'lastRecord' : 'toPlay'];

          return activateTab(tabId, true).then(function () {
            return item.ipc.ask('HIGHLIGHT_DOM', { locator: args.locator });
          });
        });
      }

    case 'PANEL_HIGHLIGHT_RECT':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('HIGHLIGHT_RECT', args);
        });
      }

    case 'PANEL_HIGHLIGHT_RECTS':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('HIGHLIGHT_RECTS', args);
        });
      }

    case 'PANEL_RESIZE_WINDOW':
      {
        if (!state.tabIds.panel) {
          throw new Error('Panel not available');
        }

        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.panel).then(function (tab) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(tab.windowId, Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["pick"])(['width', 'height'], _extends({}, args.size, {
            width: args.size.width,
            height: args.size.height
          })));
        });
      }

    case 'PANEL_UPDATE_BADGE':
      {
        var dict = {
          play: togglePlayingBadge,
          record: toggleRecordingBadge,
          inspect: toggleInspectingBadge
        };
        var fn = dict[args.type];

        if (!fn) {
          throw new Error('unknown type for updating badge, \'' + args.type + '\'');
        }

        return fn(!args.clear, args);
      }

    case 'PANEL_NOTIFY_AUTO_PAUSE':
      {
        notifyAutoPause();
        return true;
      }

    case 'PANEL_NOTIFY_BREAKPOINT':
      {
        notifyBreakpoint();
        return true;
      }

    case 'PANEL_NOTIFY_ECHO':
      {
        notifyEcho(args.text);
        return true;
      }

    case 'PANEL_CLOSE_ALL_WINDOWS':
      {
        closeAllWindows();
        return true;
      }

    case 'PANEL_CURRENT_PLAY_TAB_INFO':
      {
        return getPlayTab().then(function (tab) {
          return {
            url: tab.url,
            title: tab.title
          };
        });
      }

    case 'PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND':
      {
        return getPlayTab().then(function (tab) {
          return activateTab(tab.id, true);
        }).catch(function (e) {
          return showPanelWindow();
        }).then(function () {
          return true;
        });
      }

    case 'PANEL_RESIZE_PLAY_TAB':
      {
        return getPlayTab().then(function (tab) {
          return Object(_common_resize_window__WEBPACK_IMPORTED_MODULE_14__[/* resizeViewportOfTab */ "a"])(tab.id, args);
        });
      }

    case 'PANEL_SELECT_AREA_ON_CURRENT_PAGE':
      {
        return getPlayTabIpc().then(function (ipc) {
          activateTab(state.tabIds.toPlay, true);
          return ipc.ask('SELECT_SCREEN_AREA');
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error(e.stack);
          throw new Error('Not able to take screenshot on the current tab');
        });
      }

    case 'PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('CLEAR_VISION_RECTS');
        });
      }

    case 'PANEL_SEARCH_VISION_ON_PLAYING_PAGE':
      {
        var visionFileName = args.visionFileName,
            minSimilarity = args.minSimilarity,
            _args$searchArea = args.searchArea,
            searchArea = _args$searchArea === undefined ? 'full' : _args$searchArea,
            storedImageRect = args.storedImageRect,
            command = args.command;

        var patternDpi = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dpiFromFileName"])(visionFileName) || 96;
        var screenDpi = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["getScreenDpi"])();
        var dpiScale = patternDpi / screenDpi;
        var man = Object(_common_vision_man__WEBPACK_IMPORTED_MODULE_13__[/* getVisionMan */ "a"])();
        var getPatternImage = function getPatternImage(fileName) {
          return man.exists(fileName).then(function (existed) {
            if (!existed) throw new Error(command + ': No input image found for file name \'' + fileName + '\'');
            return man.readAsDataURL(fileName);
          });
        };
        var saveDataUrlToLastScreenshot = function saveDataUrlToLastScreenshot(dataUrl) {
          return Object(_common_screenshot_man__WEBPACK_IMPORTED_MODULE_11__[/* getScreenshotMan */ "a"])().overwrite(Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* LAST_SCREENSHOT_FILE_NAME */ "d"]), Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dataURItoBlob"])(dataUrl)).then(function () {
            getPanelTabIpc().then(function (panelIpc) {
              return panelIpc.ask('RESTORE_SCREENSHOTS');
            });
          });
        };
        var getTargetImage = function getTargetImage() {
          var capture = function capture(ipc, tabId) {
            switch (searchArea) {
              case 'viewport':
                return Promise.all([ipc.ask('SCREENSHOT_PAGE_INFO'), Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreen */ "c"])(tabId)]).then(function (_ref5) {
                  var _ref6 = _slicedToArray(_ref5, 2),
                      pageInfo = _ref6[0],
                      dataUrl = _ref6[1];

                  saveDataUrlToLastScreenshot(dataUrl);

                  return {
                    offset: {
                      x: pageInfo.originalX,
                      y: pageInfo.originalY
                    },
                    dataUrl: dataUrl
                  };
                });

              case 'full':
                {
                  return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureFullScreen */ "b"])(tabId, {
                    startCapture: function startCapture() {
                      return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {});
                    },
                    endCapture: function endCapture(pageInfo) {
                      return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo });
                    },
                    scrollPage: function scrollPage(offset) {
                      return ipc.ask('SCROLL_PAGE', { offset: offset });
                    }
                  }).then(function (dataUrl) {
                    saveDataUrlToLastScreenshot(dataUrl);
                    return { dataUrl: dataUrl, offset: { x: 0, y: 0 } };
                  });
                }

              default:
                {
                  if (/^element:/i.test(searchArea)) {
                    if (!storedImageRect) {
                      throw new Error('!storedImageRect should not be empty');
                    }

                    var _man = Object(_common_screenshot_man__WEBPACK_IMPORTED_MODULE_11__[/* getScreenshotMan */ "a"])();
                    var fileName = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* LAST_SCREENSHOT_FILE_NAME */ "d"]);

                    return _man.readAsDataURL(fileName).then(function (dataUrl) {
                      return {
                        dataUrl: dataUrl,
                        offset: {
                          x: storedImageRect.x,
                          y: storedImageRect.y
                        }
                      };
                    });
                  }

                  throw new Error('Unsupported searchArea \'' + searchArea + '\'');
                }
            }
          };

          return getPlayTabIpc().then(function (ipc) {
            var toPlayTabId = state.tabIds.toPlay;

            Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('getTargetImage tabIds', state.tabIds, toPlayTabId);

            return activateTab(toPlayTabId, true).then(function () {
              return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
            }).then(function () {
              return capture(ipc, toPlayTabId);
            }).then(function (obj) {
              return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* scaleDataURI */ "h"])(obj.dataUrl, dpiScale).then(function (dataUrl) {
                return {
                  dataUrl: dataUrl,
                  offset: obj.offset
                };
              });
            });
          });
        };

        if (minSimilarity < 0.1 || minSimilarity > 1.0) {
          throw new Error('confidence should be between 0.1 and 1.0');
        }

        return Promise.all([getPatternImage(visionFileName), getTargetImage()]).then(function (_ref7) {
          var _ref8 = _slicedToArray(_ref7, 2),
              patternImageUrl = _ref8[0],
              targetImageInfo = _ref8[1];

          var targetImageUrl = targetImageInfo.dataUrl;
          var offset = targetImageInfo.offset;

          return Object(_common_imagesearch_adaptor_ts__WEBPACK_IMPORTED_MODULE_12__["searchImage"])({
            patternImageUrl: patternImageUrl,
            targetImageUrl: targetImageUrl,
            minSimilarity: minSimilarity,
            allowSizeVariation: true,
            scaleDownRatio: dpiScale * window.devicePixelRatio,
            offsetX: offset.x || 0,
            offsetY: offset.y || 0
          });
        });
      }

    case 'PANEL_TIMEOUT_STATUS':
      {
        startSendingTimeoutStatus(args.timeout, args.type);
        return true;
      }

    case 'PANEL_CLEAR_TIMEOUT_STATUS':
      {
        clearInterval(state.timer);
        return true;
      }

    case 'CS_STORE_SCREENSHOT_IN_SELECTION':
      {
        var rect = args.rect,
            devicePixelRatio = args.devicePixelRatio,
            fileName = args.fileName;

        var tabId = args.sender.tab.id;
        var _ipc = state.ipcCache[tabId];

        return activateTab(state.tabIds.toPlay, true).then(function () {
          return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
        }).then(function () {
          return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreenInSelection */ "d"])(state.tabIds.toPlay, { rect: rect, devicePixelRatio: devicePixelRatio }, {
            startCapture: function startCapture() {
              return _ipc.ask('START_CAPTURE_FULL_SCREENSHOT', { hideScrollbar: false });
            },
            endCapture: function endCapture(pageInfo) {
              return _ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo });
            },
            scrollPage: function scrollPage(offset) {
              return _ipc.ask('SCROLL_PAGE', { offset: offset });
            }
          });
        }).then(function (dataUrl) {
          var man = Object(_common_screenshot_man__WEBPACK_IMPORTED_MODULE_11__[/* getScreenshotMan */ "a"])();

          return man.overwrite(fileName, Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dataURItoBlob"])(dataUrl)).then(function () {
            getPanelTabIpc().then(function (panelIpc) {
              return panelIpc.ask('RESTORE_SCREENSHOTS');
            });

            return fileName;
          });
        });
      }

    case 'CS_SCREEN_AREA_SELECTED':
      {
        var _rect = args.rect,
            _devicePixelRatio = args.devicePixelRatio;

        var _tabId = args.sender.tab.id;
        var _ipc2 = state.ipcCache[_tabId];

        Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('CS_SCREEN_AREA_SELECTED', _rect, _devicePixelRatio, _tabId);

        return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreenInSelectionSimple */ "e"])(args.sender.tab.id, { rect: _rect, devicePixelRatio: _devicePixelRatio }).then(function (dataUrl) {
          Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('CS_SCREEN_AREA_SELECTED', 'got reuslt', dataUrl.length);
          return withPanelIpc().then(function (panelIpc) {
            return panelIpc.ask('ADD_VISION_IMAGE', { dataUrl: dataUrl });
          });
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error(e.stack);
          throw e;
        });
      }

    case 'CS_DONE_INSPECTING':
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('done inspecting...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].NORMAL;

      toggleInspectingBadge(false);
      setInspectorTabId(null, true, true);
      activateTab(state.tabIds.panel, true);

      return getPanelTabIpc().then(function (panelIpc) {
        return panelIpc.ask('INSPECT_RESULT', args);
      });

    // It's used for inspecting. The first tab which sends a CS_ACTIVATE_ME event
    // on mouse over event will be the one for us to inspect
    case 'CS_ACTIVATE_ME':
      // log('CS_ACTIVATE_ME state.status', state.status)

      switch (state.status) {
        case _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].INSPECTOR:
          if (!state.tabIds.toInspect) {
            state.tabIds.toInspect = args.sender.tab.id;

            setTimeout(function () {
              var ipc = state.ipcCache[state.tabIds.toInspect];
              ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].INSPECTING
              });
            }, 0);

            return true;
          }
          break;
      }
      return false;

    case 'CS_RECORD_ADD_COMMAND':
      {
        var pullbackTimeout = 1000;
        var isFirst = false;

        if (state.status !== _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER) {
          return false;
        }

        if (!state.tabIds.toRecord) {
          isFirst = true;
          state.tabIds.toRecord = state.tabIds.firstRecord = args.sender.tab.id;
        }

        if (state.tabIds.toRecord !== args.sender.tab.id) {
          return false;
        }

        // Note: if receive a pullback cmd, we need to set the flag,
        // and strip Wait from any xxxAndWait command
        if (args.cmd === 'pullback') {
          state.pullback = true;
          setTimeout(function () {
            state.pullback = false;
          }, pullbackTimeout * 2);
          return false;
        }

        setTimeout(function () {
          var ipc = state.ipcCache[state.tabIds.toRecord];
          ipc.ask('SET_STATUS', {
            status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].RECORDING
          });
        }, 0);

        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, pullbackTimeout).then(function () {
          return getPanelTabIpc();
        }).then(function (panelIpc) {
          if (isFirst) {
            panelIpc.ask('RECORD_ADD_COMMAND', {
              cmd: 'open',
              target: args.url
            });
          }

          // Note: remove AndWait from commands if we got a pullback
          if (state.pullback) {
            args.cmd = args.cmd.replace('AndWait', '');
            state.pullback = false;
          }

          return panelIpc.ask('RECORD_ADD_COMMAND', args);
        }).then(function () {
          return _common_storage__WEBPACK_IMPORTED_MODULE_7__[/* default */ "a"].get('config');
        }).then(function (config) {
          if (config.recordNotification && state.status === _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* APP_STATUS */ "a"].RECORDER) {
            notifyRecordCommand(args);
          }
        }).then(function () {
          return true;
        });
      }

    case 'CS_CLOSE_OTHER_TABS':
      {
        var _tabId2 = args.sender.tab.id;

        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(_tabId2).then(function (tab) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ windowId: tab.windowId }).then(function (tabs) {
            return tabs.filter(function (t) {
              return t.id !== _tabId2;
            });
          }).then(function (tabs) {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.remove(tabs.map(function (t) {
              return t.id;
            }));
          });
        }).then(function () {
          return true;
        });
      }

    case 'CS_SELECT_WINDOW':
      {
        var oldTablId = args.sender.tab.id;

        var _splitIntoTwo = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["splitIntoTwo"])('=', args.target),
            _splitIntoTwo2 = _slicedToArray(_splitIntoTwo, 2),
            type = _splitIntoTwo2[0],
            locator = _splitIntoTwo2[1];

        if (!locator) {
          throw new Error('invalid window locator, \'' + args.target + '\'');
        }

        var pGetTabs = void 0;

        switch (type.toLowerCase()) {
          case 'title':
            pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ title: locator });
            break;

          case 'tab':
            {
              if (/^\s*open\s*$/i.test(locator)) {
                pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({ url: args.value }).then(function (tab) {
                  return [tab];
                });
              } else {
                var offset = parseInt(locator, 10);

                if (isNaN(offset)) {
                  throw new Error('invalid tab offset, \'' + locator + '\'');
                }

                pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.firstPlay).then(function (tab) {
                  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({
                    windowId: tab.windowId,
                    index: tab.index + offset
                  });
                });
              }

              break;
            }

          default:
            throw new Error('window locator type \'' + type + '\' not supported');
        }

        return pGetTabs.then(function (tabs) {
          if (tabs.length === 0) {
            throw new Error('failed to find the tab with locator \'' + args.target + '\'');
          }
          return tabs[0];
        }).then(function (tab) {
          Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('selectWindow, got tab', tab);

          return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('new tab creates ipc', function () {
            return {
              pass: state.ipcCache[tab.id],
              result: state.ipcCache[tab.id]
            };
          }).catch(function (e) {
            if (/tab=\s*open\s*/i.test(args.target)) {
              throw new Error('To open a new tab, a valid URL is needed');
            }
            throw e;
          }).then(function (ipc) {
            Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('selectWindow, got ipc', ipc);

            return ipc.ask('DOM_READY', {}).then(function () {
              ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].PLAYING
              });

              return true;
            });
          }).then(function () {
            // Note: set the original tab to NORMAL status
            // only if the new tab is set to PLAYING status
            Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('selectWindow, set orignial to normal');

            state.ipcCache[oldTablId].ask('SET_STATUS', {
              status: _common_constant__WEBPACK_IMPORTED_MODULE_3__[/* CONTENT_SCRIPT_STATUS */ "b"].NORMAL
            });
          }).then(function () {
            state.tabIds.lastPlay = state.tabIds.toPlay;
            state.tabIds.toPlay = tab.id;
            return activateTab(tab.id);
          });
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"].error(e.stack);
          throw e;
        });
      }

    case 'CS_CAPTURE_SCREENSHOT':
      return activateTab(state.tabIds.toPlay, true).then(function () {
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
      }).then(function () {
        return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* saveScreen */ "g"])(state.tabIds.toPlay, args.fileName);
      });

    case 'CS_CAPTURE_FULL_SCREENSHOT':
      return activateTab(state.tabIds.toPlay, true).then(function () {
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
      }).then(getPlayTabIpc).then(function (ipc) {
        return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* saveFullScreen */ "f"])(state.tabIds.toPlay, args.fileName, {
          startCapture: function startCapture() {
            return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {});
          },
          endCapture: function endCapture(pageInfo) {
            return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo });
          },
          scrollPage: function scrollPage(offset) {
            return ipc.ask('SCROLL_PAGE', { offset: offset });
          }
        });
      });

    case 'CS_TIMEOUT_STATUS':
      return getPanelTabIpc().then(function (ipc) {
        return ipc.ask('TIMEOUT_STATUS', args);
      });

    case 'CS_DELETE_ALL_COOKIES':
      {
        var url = args.url;


        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.cookies.getAll({ url: url }).then(function (cookies) {
          var ps = cookies.map(function (c) {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.cookies.remove({
              url: '' + url + c.path,
              name: c.name
            });
          });

          return Promise.all(ps);
        });
      }

    case 'CS_SET_FILE_INPUT_FILES':
      {
        return Object(_common_debugger__WEBPACK_IMPORTED_MODULE_8__[/* setFileInputFiles */ "a"])({
          tabId: args.sender.tab.id,
          selector: args.selector,
          files: args.files
        });
      }

    case 'CS_ON_DOWNLOAD':
      {
        var p = Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().prepareDownload(args.fileName, {
          wait: !!args.wait,
          timeout: args.timeout,
          timeoutForStart: args.timeoutForStart
        });
        return true;
      }

    case 'CS_INVOKE':
      {
        return _common_storage__WEBPACK_IMPORTED_MODULE_7__[/* default */ "a"].get('config').then(function (config) {
          var isTestCase = !!args.testCase;
          var isTestSuite = !!args.testSuite;
          var from = args.testCase && args.testCase.from || args.testSuite && args.testSuite.from;

          switch (from) {
            case 'bookmark':
              {
                if (!config.allowRunFromBookmark) {
                  throw new Error('To run macro / test suite from bookmarks, enable it in kantu settings first');
                }
                break;
              }

            case 'html':
              {
                if (!isTestSuite) {
                  throw new Error('not allowed to run from local file');
                }

                var isFileSchema = /^file:\/\//.test(args.sender.url);
                var isHttpSchema = /^https?:\/\//.test(args.sender.url);

                if (isFileSchema && !config.allowRunFromFileSchema) {
                  throw new Error('To run test suite from local file, enable it in kantu settings first');
                }

                if (isHttpSchema && !config.allowRunFromHttpSchema) {
                  throw new Error('To run test suite from public website, enable it in kantu settings first');
                }

                break;
              }

            default:
              throw new Error('unknown source not allowed');
          }

          return withPanelIpc().then(function (panelIpc) {
            if (args.testCase) {
              return panelIpc.ask('RUN_TEST_CASE', {
                testCase: args.testCase,
                options: args.options
              });
            }

            if (args.testSuite) {
              return panelIpc.ask('RUN_TEST_SUITE', {
                testSuite: args.testSuite,
                options: args.options
              });
            }

            return true;
          });
        });
      }

    case 'CS_IMPORT_HTML_AND_INVOKE':
      {
        return _common_storage__WEBPACK_IMPORTED_MODULE_7__[/* default */ "a"].get('config').then(function (config) {
          var isFileSchema = /^file:\/\//.test(args.sender.url);
          var isHttpSchema = /^https?:\/\//.test(args.sender.url);

          if (isFileSchema && !config.allowRunFromFileSchema) {
            throw new Error('To run macro from local file, enable it in kantu settings first');
          }

          if (isHttpSchema && !config.allowRunFromHttpSchema) {
            throw new Error('To run macro from public website, enable it in kantu settings first');
          }

          return withPanelIpc().then(function (panelIpc) {
            return panelIpc.ask('IMPORT_HTML_AND_RUN', args);
          });
        });
      }

    case 'SET_CLIPBOARD':
      {
        _common_clipboard__WEBPACK_IMPORTED_MODULE_5__[/* default */ "a"].set(args.value);
        return true;
      }

    case 'GET_CLIPBOARD':
      {
        return _common_clipboard__WEBPACK_IMPORTED_MODULE_5__[/* default */ "a"].get();
      }

    default:
      return 'unknown';
  }
};

var initIPC = function initIPC() {
  Object(_common_ipc_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_2__[/* bgInit */ "a"])(function (tabId, ipc) {
    state.ipcCache[tabId] = ipc;
    ipc.onAsk(onRequest);
  });
};

var initOnInstalled = function initOnInstalled() {
  if (typeof process !== 'undefined' && "production" === 'production') {
    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.runtime.setUninstallURL(_config__WEBPACK_IMPORTED_MODULE_10__[/* default */ "a"].urlAfterUninstall);

    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.runtime.onInstalled.addListener(function (_ref9) {
      var reason = _ref9.reason;

      switch (reason) {
        case 'install':
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({
            url: _config__WEBPACK_IMPORTED_MODULE_10__[/* default */ "a"].urlAfterInstall
          });

        case 'update':
          _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeText({ text: 'NEW' });
          _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setBadgeBackgroundColor({ color: '#4444FF' });
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.storage.local.set({
            upgrade_not_viewed: 'not_viewed'
          });
      }
    });
  }
};

var initPlayTab = function initPlayTab() {
  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getCurrent().then(function (window) {
    return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ active: true, windowId: window.id }).then(function (tabs) {
      if (!tabs || !tabs.length) return false;
      Object(_common_log__WEBPACK_IMPORTED_MODULE_4__[/* default */ "a"])('in initPlayTab, set toPlay to', tabs[0]);
      state.tabIds.lastPlay = state.tabIds.toPlay;
      state.tabIds.toPlay = tabs[0].id;
      return true;
    });
  });
};

var initDownloadMan = function initDownloadMan() {
  Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().onCountDown(function (data) {
    getPanelTabIpc().then(function (panelIpc) {
      panelIpc.ask('TIMEOUT_STATUS', _extends({}, data, {
        type: 'download'
      }));
    });
  });
};

bindEvents();
initIPC();
initOnInstalled();
initPlayTab();
initDownloadMan();

window.clip = _common_clipboard__WEBPACK_IMPORTED_MODULE_5__[/* default */ "a"];
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(44)))

/***/ }),

/***/ 54:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export imageSizeFromDataURI */
/* unused harmony export getScreenshotRatio */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "h", function() { return scaleDataURI; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "c", function() { return captureScreen; });
/* unused harmony export createCaptureScreenWithCachedScreenshotRatio */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "g", function() { return saveScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return captureFullScreen; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "e", function() { return captureScreenInSelectionSimple; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "d", function() { return captureScreenInSelection; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return captureClientAPI; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "f", function() { return saveFullScreen; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(19);
/* harmony import */ var _common_screenshot_man__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(36);
/* harmony import */ var _common_utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();






function getActiveTabInfo() {
  return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getLastFocused().then(function (win) {
    return _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ active: true, windowId: win.id }).then(function (tabs) {
      return tabs[0];
    });
  });
}

function imageSizeFromDataURI(dataURI) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = dataURI;
  });
}

function getScreenshotRatio(dataURI, tabId, devicePixelRatio) {
  return Promise.all([imageSizeFromDataURI(dataURI), _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId)]).then(function (tuple) {
    var _tuple = _slicedToArray(tuple, 2),
        size = _tuple[0],
        tab = _tuple[1];

    return tab.width * devicePixelRatio / size.width;
  });
}

function scaleDataURI(dataURI, scale) {
  if (scale === 1) return Promise.resolve(dataURI);

  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.src = dataURI;
  }).then(function (img) {
    var canvas = createCanvas(img.naturalWidth, img.naturalHeight, scale);
    return drawOnCanvas({
      canvas: canvas,
      dataURI: dataURI,
      x: 0,
      y: 0,
      width: img.naturalWidth * scale,
      height: img.naturalHeight * scale
    }).then(function () {
      return canvas.toDataURL();
    });
  });
}

function captureScreen(tabId, presetScreenshotRatio) {
  var is2ndArgFunction = typeof presetScreenshotRatio === 'function';
  var hasScreenshotRatio = presetScreenshotRatio && !is2ndArgFunction;
  var pDataURI = _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.captureVisibleTab(null, { format: 'png' });
  var pRatio = hasScreenshotRatio ? Promise.resolve(presetScreenshotRatio) : pDataURI.then(function (dataURI) {
    return getScreenshotRatio(dataURI, tabId, window.devicePixelRatio);
  });

  return Promise.all([pDataURI, pRatio]).then(function (tuple) {
    var _tuple2 = _slicedToArray(tuple, 2),
        dataURI = _tuple2[0],
        screenshotRatio = _tuple2[1];
    // Note: leak the info about screenshotRatio on purpose


    if (!hasScreenshotRatio && is2ndArgFunction) presetScreenshotRatio(screenshotRatio);
    if (screenshotRatio === 1) return dataURI;
    return scaleDataURI(dataURI, screenshotRatio);
  });
}

function createCaptureScreenWithCachedScreenshotRatio() {
  var screenshotRatio = void 0;

  return function (tabId) {
    return captureScreen(tabId, screenshotRatio || function (ratio) {
      screenshotRatio = ratio;
    });
  };
}

function captureScreenBlob(tabId) {
  return captureScreen(tabId).then(_common_utils__WEBPACK_IMPORTED_MODULE_3__["dataURItoBlob"]);
}

function saveScreen(tabId, fileName) {
  return captureScreenBlob(tabId).then(function (screenBlob) {
    return Object(_common_screenshot_man__WEBPACK_IMPORTED_MODULE_2__[/* getScreenshotMan */ "a"])().overwrite(fileName, screenBlob).then(function (url) {
      return {
        url: url,
        fileName: fileName
      };
    });
  });
}

function pCompose(list) {
  return list.reduce(function (prev, fn) {
    return prev.then(fn);
  }, Promise.resolve());
}

function getAllScrollOffsets(_ref) {
  var pageWidth = _ref.pageWidth,
      pageHeight = _ref.pageHeight,
      windowWidth = _ref.windowWidth,
      windowHeight = _ref.windowHeight,
      _ref$topPadding = _ref.topPadding,
      topPadding = _ref$topPadding === undefined ? 150 : _ref$topPadding;

  var topPad = windowHeight > topPadding ? topPadding : 0;
  var xStep = windowWidth;
  var yStep = windowHeight - topPad;
  var result = [];

  // Note: bottom comes first so that when we render those screenshots one by one to the final canvas,
  // those at top will overwrite top padding part of those at bottom, it is useful if that page has some fixed header
  for (var y = pageHeight - windowHeight; y > -1 * yStep; y -= yStep) {
    for (var x = 0; x < pageWidth; x += xStep) {
      result.push({ x: x, y: y });
    }
  }

  return result;
}

function getAllScrollOffsetsForRect(_ref2, _ref3) {
  var x = _ref2.x,
      y = _ref2.y,
      width = _ref2.width,
      height = _ref2.height;
  var pageWidth = _ref3.pageWidth,
      pageHeight = _ref3.pageHeight,
      windowWidth = _ref3.windowWidth,
      windowHeight = _ref3.windowHeight,
      originalX = _ref3.originalX,
      originalY = _ref3.originalY,
      _ref3$topPadding = _ref3.topPadding,
      topPadding = _ref3$topPadding === undefined ? 150 : _ref3$topPadding;

  var topPad = windowHeight > topPadding ? topPadding : 0;
  var xStep = windowWidth;
  var yStep = windowHeight - topPad;
  var result = [];

  for (var sy = y + height - windowHeight; sy > y - yStep; sy -= yStep) {
    for (var sx = x; sx < x + width; sx += xStep) {
      result.push({ x: sx, y: sy });
    }
  }

  if (result.length === 0) {
    result.push({ x: x, y: y + height - windowHeight });
  }

  return result;
}

function createCanvas(width, height) {
  var pixelRatio = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

  var canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  return canvas;
}

function drawOnCanvas(_ref4) {
  var canvas = _ref4.canvas,
      dataURI = _ref4.dataURI,
      x = _ref4.x,
      y = _ref4.y,
      width = _ref4.width,
      height = _ref4.height;

  return new Promise(function (resolve, reject) {
    var image = new Image();

    image.onload = function () {
      canvas.getContext('2d').drawImage(image, 0, 0, image.width, image.height, x, y, width || image.width, height || image.height);
      resolve({
        x: x,
        y: y,
        width: width,
        height: height
      });
    };

    image.src = dataURI;
  });
}

function withPageInfo(startCapture, endCapture, callback) {
  return startCapture().then(function (pageInfo) {
    // Note: in case sender contains any non-serializable data
    delete pageInfo.sender;

    return callback(pageInfo).then(function (result) {
      endCapture(pageInfo);
      return result;
    });
  });
}

function captureFullScreen(tabId) {
  var _ref5 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : captureClientAPI,
      startCapture = _ref5.startCapture,
      scrollPage = _ref5.scrollPage,
      endCapture = _ref5.endCapture;

  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var opts = _extends({
    blob: false
  }, options);

  return withPageInfo(startCapture, endCapture, function (pageInfo) {
    var devicePixelRatio = pageInfo.devicePixelRatio;

    // Note: cut down page width and height
    // reference: https://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element/11585939#11585939
    var maxSide = Math.floor(32767 / devicePixelRatio);
    pageInfo.pageWidth = Math.min(maxSide, pageInfo.pageWidth);
    pageInfo.pageHeight = Math.min(maxSide, pageInfo.pageHeight);

    var captureScreen = createCaptureScreenWithCachedScreenshotRatio();
    var canvas = createCanvas(pageInfo.pageWidth, pageInfo.pageHeight, devicePixelRatio);
    var scrollOffsets = getAllScrollOffsets(pageInfo);
    var todos = scrollOffsets.map(function (offset, i) {
      return function () {
        return scrollPage(offset, { index: i, total: scrollOffsets.length }).then(function (realOffset) {
          return captureScreen(tabId).then(function (dataURI) {
            return drawOnCanvas({
              canvas: canvas,
              dataURI: dataURI,
              x: realOffset.x * devicePixelRatio,
              y: realOffset.y * devicePixelRatio,
              width: pageInfo.windowWidth * devicePixelRatio,
              height: pageInfo.windowHeight * devicePixelRatio
            });
          });
        });
      };
    });
    var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_3__["dataURItoBlob"] : function (x) {
      return x;
    };

    return pCompose(todos).then(function () {
      return convert(canvas.toDataURL());
    });
  });
}

function captureScreenInSelectionSimple(tabId, _ref6) {
  var rect = _ref6.rect,
      devicePixelRatio = _ref6.devicePixelRatio;
  var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  var opts = _extends({
    blob: false
  }, options);
  var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_3__["dataURItoBlob"] : function (x) {
    return x;
  };
  var ratio = devicePixelRatio;
  var canvas = createCanvas(rect.width, rect.height, ratio);

  return captureScreen(tabId).then(function (dataURI) {
    return drawOnCanvas({
      canvas: canvas,
      dataURI: dataURI,
      x: -1 * rect.x * devicePixelRatio,
      y: -1 * rect.y * devicePixelRatio
    });
  }).then(function () {
    return convert(canvas.toDataURL());
  });
}

function captureScreenInSelection(tabId, _ref7, _ref8) {
  var rect = _ref7.rect,
      devicePixelRatio = _ref7.devicePixelRatio;
  var startCapture = _ref8.startCapture,
      scrollPage = _ref8.scrollPage,
      endCapture = _ref8.endCapture;
  var options = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var opts = _extends({
    blob: false
  }, options);
  var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_3__["dataURItoBlob"] : function (x) {
    return x;
  };
  var ratio = devicePixelRatio;

  return withPageInfo(startCapture, endCapture, function (pageInfo) {
    var maxSide = Math.floor(32767 / ratio);
    pageInfo.pageWidth = Math.min(maxSide, pageInfo.pageWidth);
    pageInfo.pageHeight = Math.min(maxSide, pageInfo.pageHeight);

    var captureScreen = createCaptureScreenWithCachedScreenshotRatio();
    var canvas = createCanvas(rect.width, rect.height, ratio);
    var scrollOffsets = getAllScrollOffsetsForRect(rect, pageInfo);
    var todos = scrollOffsets.map(function (offset, i) {
      return function () {
        return scrollPage(offset, { index: i, total: scrollOffsets.length }).then(function (realOffset) {
          return captureScreen(tabId).then(function (dataURI) {
            return drawOnCanvas({
              canvas: canvas,
              dataURI: dataURI,
              x: (realOffset.x - rect.x) * devicePixelRatio,
              y: (realOffset.y - rect.y) * devicePixelRatio,
              width: pageInfo.windowWidth * devicePixelRatio,
              height: pageInfo.windowHeight * devicePixelRatio
            });
          });
        });
      };
    });

    return pCompose(todos).then(function () {
      return convert(canvas.toDataURL());
    });
  });
}

var captureClientAPI = {
  getPageInfo: function getPageInfo() {
    var body = document.body;
    var widths = [document.documentElement.clientWidth, document.documentElement.scrollWidth, document.documentElement.offsetWidth, body ? body.scrollWidth : 0, body ? body.offsetWidth : 0];
    var heights = [document.documentElement.clientHeight, document.documentElement.scrollHeight, document.documentElement.offsetHeight, body ? body.scrollHeight : 0, body ? body.offsetHeight : 0];

    var data = {
      pageWidth: Math.max.apply(Math, widths),
      pageHeight: Math.max.apply(Math, heights),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      hasBody: !!body,
      originalX: window.scrollX,
      originalY: window.scrollY,
      originalOverflowStyle: document.documentElement.style.overflow,
      originalBodyOverflowYStyle: body && body.style.overflowY,
      devicePixelRatio: window.devicePixelRatio
    };

    return data;
  },
  startCapture: function startCapture() {
    var _ref9 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
        _ref9$hideScrollbar = _ref9.hideScrollbar,
        hideScrollbar = _ref9$hideScrollbar === undefined ? true : _ref9$hideScrollbar;

    var body = document.body;
    var pageInfo = captureClientAPI.getPageInfo();

    // Note: try to make pages with bad scrolling work, e.g., ones with
    // `body { overflow-y: scroll; }` can break `window.scrollTo`
    if (body) {
      body.style.overflowY = 'visible';
    }

    if (hideScrollbar) {
      // Disable all scrollbars. We'll restore the scrollbar state when we're done
      // taking the screenshots.
      document.documentElement.style.overflow = 'hidden';
    }

    return Promise.resolve(pageInfo);
  },
  scrollPage: function scrollPage(_ref10) {
    var x = _ref10.x,
        y = _ref10.y;

    window.scrollTo(x, y);

    return Object(_common_utils__WEBPACK_IMPORTED_MODULE_3__["delay"])(function () {
      return {
        x: window.scrollX,
        y: window.scrollY
      };
    }, 100);
  },
  endCapture: function endCapture(pageInfo) {
    var originalX = pageInfo.originalX,
        originalY = pageInfo.originalY,
        hasBody = pageInfo.hasBody,
        originalOverflowStyle = pageInfo.originalOverflowStyle,
        originalBodyOverflowYStyle = pageInfo.originalBodyOverflowYStyle;


    if (hasBody) {
      document.body.style.overflowY = originalBodyOverflowYStyle;
    }

    document.documentElement.style.overflow = originalOverflowStyle;
    window.scrollTo(originalX, originalY);

    return Promise.resolve(true);
  }
};

function saveFullScreen(tabId, fileName, clientAPI) {
  return captureFullScreen(tabId, clientAPI, { blob: true }).then(function (screenBlob) {
    return Object(_common_screenshot_man__WEBPACK_IMPORTED_MODULE_2__[/* getScreenshotMan */ "a"])().overwrite(fileName, screenBlob).then(function (url) {
      return {
        url: url,
        fileName: fileName
      };
    });
  });
}

/***/ }),

/***/ 59:
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

/***/ 7:
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

/***/ 72:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export openBgWithCs */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return csInit; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return bgInit; });
/* harmony import */ var _ipc_promise__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(59);
/* harmony import */ var _ipc_promise__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_ipc_promise__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(2);
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

    _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
      bgListeners.forEach(function (listener) {
        return listener(req, sender, sendResponse);
      });
      return true;
    });

    return _ipc_promise__WEBPACK_IMPORTED_MODULE_0___default()({
      timeout: TIMEOUT,
      ask: function ask(uid, cmd, args) {
        _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.tabs.sendMessage(tabId, {
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
        _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.tabs.sendMessage(tabId, {
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

    _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
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
        _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.sendMessage({
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
        _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.sendMessage({
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

  Object(_log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"])('sending Connect...');

  // Note: Ext.extension.getURL is available in content script, but not injected js
  // We use it here to detect whether it is loaded by content script or injected
  // Calling runtime.sendMessage in injected js will cause an uncatchable exception
  if (!_web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.extension.getURL) return;

  // try this process in case we're in none-src frame
  try {
    var connected = false;
    var checkReady = function checkReady() {
      if (connected) return Promise.resolve(true);
      return Promise.reject(new Error('cs not connected with bg yet'));
    };
    var connectBg = function connectBg() {
      return Object(_utils__WEBPACK_IMPORTED_MODULE_3__["withTimeout"])(1000, function (cancelTimeout) {
        return _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.sendMessage({
          type: 'CONNECT',
          cuid: cuid
        }).then(function (done) {
          if (done) {
            connected = true;
            cancelTimeout();
            return true;
          }
          throw new Error('not done');
        });
      });
    };
    var tryConnect = Object(_utils__WEBPACK_IMPORTED_MODULE_3__["retry"])(connectBg, {
      shouldRetry: function shouldRetry() {
        return true;
      },
      retryInterval: 0,
      timeout: 5000
    });

    tryConnect().catch(function (e) {
      _log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"].error(e);
    });

    return openBgWithCs(cuid).ipcCs(checkReady);
  } catch (e) {
    _log__WEBPACK_IMPORTED_MODULE_2__[/* default */ "a"].error(e.stack);
  }
};

// Helper function to init ipc promise instance for background
// it accepts a `fn` function to handle CONNECT message from content scripts
var bgInit = function bgInit(fn) {
  _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.type === 'CONNECT' && req.cuid) {
      fn(sender.tab.id, openBgWithCs(req.cuid).ipcBg(sender.tab.id));
      sendResponse(true);
    }
    return true;
  });
};

/***/ })

/******/ });