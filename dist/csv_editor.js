/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 41471:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));

var _ipc_bg_cs = __webpack_require__(31745);

var throwNotTop = function throwNotTop() {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc');
};

// Note: csIpc is only available to top window
var ipc = typeof window !== 'undefined' && window.top === window ? (0, _ipc_bg_cs.csInit)() : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop

  // Note: one ipc singleton per content script
};exports["default"] = ipc;

/***/ }),

/***/ 3146:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var _slicedToArray2 = __webpack_require__(12424);

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _promise = __webpack_require__(46593);

var _promise2 = _interopRequireDefault(_promise);

var _extends2 = __webpack_require__(88239);

var _extends3 = _interopRequireDefault(_extends2);

var _button = __webpack_require__(65400);

var _button2 = _interopRequireDefault(_button);

var _message2 = __webpack_require__(11187);

var _message3 = _interopRequireDefault(_message2);

var _getPrototypeOf = __webpack_require__(85105);

var _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);

var _classCallCheck2 = __webpack_require__(99663);

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = __webpack_require__(22600);

var _createClass3 = _interopRequireDefault(_createClass2);

var _possibleConstructorReturn2 = __webpack_require__(49135);

var _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);

var _inherits2 = __webpack_require__(93196);

var _inherits3 = _interopRequireDefault(_inherits2);

var _react = __webpack_require__(67294);

var _react2 = _interopRequireDefault(_react);

var _reactDom = __webpack_require__(73935);

var _reactDom2 = _interopRequireDefault(_reactDom);

var _antd = __webpack_require__(56318);

var _reactCodemirror = __webpack_require__(29656);

__webpack_require__(4631);

__webpack_require__(96876);

__webpack_require__(4328);

__webpack_require__(82801);

__webpack_require__(47462);

__webpack_require__(11067);

__webpack_require__(54956);

var _storage = __webpack_require__(67585);

var _storage2 = _interopRequireDefault(_storage);

var _storage3 = __webpack_require__(16058);

var _xfile = __webpack_require__(1577);

var _utils = __webpack_require__(63370);

var _ipc_cs = __webpack_require__(41471);

var _ipc_cs2 = _interopRequireDefault(_ipc_cs);

var _cs_timeout = __webpack_require__(28411);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

(0, _cs_timeout.polyfillTimeoutFunctions)(_ipc_cs2.default);

var rootEl = document.getElementById('root');
var render = function render() {
  return _reactDom2.default.render(_react2.default.createElement(App, null), rootEl);
};

var App = function (_React$Component) {
  (0, _inherits3.default)(App, _React$Component);

  function App() {
    var _ref;

    var _temp, _this, _ret;

    (0, _classCallCheck3.default)(this, App);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = (0, _possibleConstructorReturn3.default)(this, (_ref = App.__proto__ || (0, _getPrototypeOf2.default)(App)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      csvFile: null,
      ready: false,
      sourceText: '',
      sourceTextModified: ''
    }, _this.onChangeEditSource = function (editor, data, text) {
      _this.setState({
        sourceTextModified: text
      });
    }, _this.saveCSV = function () {
      return (0, _storage3.getStorageManager)().getCSVStorage().overwrite(_this.state.csvFile, new Blob([_this.state.sourceTextModified])).then(function () {
        return _message3.default.success('Successfully saved');
      }, function (e) {
        _message3.default.error('Error: ' + e.message);
        throw e;
      });
    }, _this.onClickSave = function () {
      return _this.saveCSV();
    }, _this.onClickSaveClose = function () {
      return _this.saveCSV().then(function () {
        return setTimeout(function () {
          return window.close();
        }, 300);
      });
    }, _this.onClickCancel = function () {
      window.close();
    }, _temp), (0, _possibleConstructorReturn3.default)(_this, _ret);
  }

  (0, _createClass3.default)(App, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var _this2 = this;

      var queryObj = (0, _utils.parseQuery)(window.location.search);
      var csvFile = queryObj.csv;

      if (!csvFile) return;

      document.title = csvFile + ' - RPA CSV Editor';

      (0, _storage3.getStorageManager)().getCSVStorage().read(csvFile, 'Text').then(function (text) {
        _this2.setState({
          csvFile: csvFile,
          ready: true,
          sourceText: text,
          sourceTextModified: text
        });
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      if (!this.state.ready) return _react2.default.createElement('div', null);

      return _react2.default.createElement(
        'div',
        { className: 'csv-editor' },
        _react2.default.createElement(_reactCodemirror.UnControlled, {
          ref: function ref(el) {
            _this3.codeMirror = el;
          },
          value: this.state.sourceText,
          onChange: this.onChangeEditSource,
          options: {
            lineNumbers: true,
            matchBrackets: true,
            autoCloseBrackets: true
          }
        }),
        _react2.default.createElement(
          'div',
          { className: 'csv-actions' },
          _react2.default.createElement(
            _button2.default,
            { type: 'primary', onClick: this.onClickSaveClose },
            'Save & Close'
          ),
          _react2.default.createElement(
            _button2.default,
            { onClick: this.onClickSave },
            'Save'
          ),
          _react2.default.createElement(
            _button2.default,
            { onClick: this.onClickCancel },
            'Cancel'
          )
        )
      );
    }
  }]);
  return App;
}(_react2.default.Component);

function restoreConfig() {
  return _storage2.default.get('config').then(function () {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    return (0, _extends3.default)({
      storageMode: _storage3.StorageStrategyType.Browser
    }, config);
  });
}

function init() {
  return _promise2.default.all([restoreConfig(), (0, _xfile.getXFile)().getConfig()]).then(function (_ref2) {
    var _ref3 = (0, _slicedToArray3.default)(_ref2, 2),
        config = _ref3[0],
        xFileConfig = _ref3[1];

    (0, _storage3.getStorageManager)(config.storageMode);
    render();
  }, render);
}

init();

/***/ }),

/***/ 52395:
/***/ ((module, exports, __webpack_require__) => {

exports = module.exports = __webpack_require__(9252)(false);
// imports


// module
exports.push([module.id, ".csv-editor{position:absolute;top:0;bottom:0;left:0;right:0;display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:vertical;-webkit-box-direction:normal;-ms-flex-direction:column;flex-direction:column}.csv-editor .react-codemirror2{-webkit-box-flex:1;-ms-flex:1;flex:1;position:relative;border-bottom:1px solid #ccc}.csv-editor .react-codemirror2 .CodeMirror{position:absolute;top:0;bottom:0;left:0;right:0;height:auto;font-size:13px}.csv-editor .csv-actions{height:60px;line-height:60px;text-align:center;background:#f0f0f0}.csv-editor .csv-actions button{margin-right:10px}", ""]);

// exports


/***/ }),

/***/ 54956:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(52395);
if(typeof content === 'string') content = [[module.id, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(76723)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/amd options */
/******/ 	(() => {
/******/ 		__webpack_require__.amdO = {};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/node module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.nmd = (module) => {
/******/ 			module.paths = [];
/******/ 			if (!module.children) module.children = [];
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/runtimeId */
/******/ 	(() => {
/******/ 		__webpack_require__.j = 385;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			385: 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkui_vision_web_extension"] = self["webpackChunkui_vision_web_extension"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [736,105,263], () => (__webpack_require__(3146)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;