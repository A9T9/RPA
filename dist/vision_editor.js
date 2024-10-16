/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 31896:
/***/ ((module) => {

"use strict";
module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAADFBMVEUAAABaWlrMzMz////nPAkwAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB+IDGRUHMxeV5KYAAAAXSURBVAjXY1i16v9/BiKI//9XrSKCAABNyDUhZP4pqwAAAABJRU5ErkJggg==";

/***/ }),

/***/ 42860:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   $e: () => (/* binding */ warning),
/* harmony export */   Em: () => (/* binding */ getSecondaryColor),
/* harmony export */   P3: () => (/* binding */ isIconDefinition),
/* harmony export */   al: () => (/* binding */ normalizeTwoToneColors),
/* harmony export */   cM: () => (/* binding */ generate),
/* harmony export */   lf: () => (/* binding */ useInsertStyles)
/* harmony export */ });
/* unused harmony exports normalizeAttrs, svgBaseProps, iconStyles */
/* harmony import */ var _babel_runtime_helpers_esm_objectSpread2__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(89379);
/* harmony import */ var _babel_runtime_helpers_esm_typeof__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(82284);
/* harmony import */ var _ant_design_colors__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(20439);
/* harmony import */ var rc_util_es_Dom_dynamicCSS__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(85089);
/* harmony import */ var rc_util_es_Dom_shadow__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(72633);
/* harmony import */ var rc_util_es_warning__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(68210);
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(96540);
/* harmony import */ var _components_Context__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(61053);








function camelCase(input) {
  return input.replace(/-(.)/g, function (match, g) {
    return g.toUpperCase();
  });
}
function warning(valid, message) {
  (0,rc_util_es_warning__WEBPACK_IMPORTED_MODULE_2__/* ["default"] */ .Ay)(valid, "[@ant-design/icons] ".concat(message));
}
function isIconDefinition(target) {
  return (0,_babel_runtime_helpers_esm_typeof__WEBPACK_IMPORTED_MODULE_4__/* ["default"] */ .A)(target) === 'object' && typeof target.name === 'string' && typeof target.theme === 'string' && ((0,_babel_runtime_helpers_esm_typeof__WEBPACK_IMPORTED_MODULE_4__/* ["default"] */ .A)(target.icon) === 'object' || typeof target.icon === 'function');
}
function normalizeAttrs() {
  var attrs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
  return Object.keys(attrs).reduce(function (acc, key) {
    var val = attrs[key];
    switch (key) {
      case 'class':
        acc.className = val;
        delete acc.class;
        break;
      default:
        delete acc[key];
        acc[camelCase(key)] = val;
    }
    return acc;
  }, {});
}
function generate(node, key, rootProps) {
  if (!rootProps) {
    return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3__.createElement(node.tag, (0,_babel_runtime_helpers_esm_objectSpread2__WEBPACK_IMPORTED_MODULE_5__/* ["default"] */ .A)({
      key: key
    }, normalizeAttrs(node.attrs)), (node.children || []).map(function (child, index) {
      return generate(child, "".concat(key, "-").concat(node.tag, "-").concat(index));
    }));
  }
  return /*#__PURE__*/react__WEBPACK_IMPORTED_MODULE_3__.createElement(node.tag, (0,_babel_runtime_helpers_esm_objectSpread2__WEBPACK_IMPORTED_MODULE_5__/* ["default"] */ .A)((0,_babel_runtime_helpers_esm_objectSpread2__WEBPACK_IMPORTED_MODULE_5__/* ["default"] */ .A)({
    key: key
  }, normalizeAttrs(node.attrs)), rootProps), (node.children || []).map(function (child, index) {
    return generate(child, "".concat(key, "-").concat(node.tag, "-").concat(index));
  }));
}
function getSecondaryColor(primaryColor) {
  // choose the second color
  return (0,_ant_design_colors__WEBPACK_IMPORTED_MODULE_0__/* .generate */ .cM)(primaryColor)[0];
}
function normalizeTwoToneColors(twoToneColor) {
  if (!twoToneColor) {
    return [];
  }
  return Array.isArray(twoToneColor) ? twoToneColor : [twoToneColor];
}

// These props make sure that the SVG behaviours like general text.
// Reference: https://blog.prototypr.io/align-svg-icons-to-text-and-say-goodbye-to-font-icons-d44b3d7b26b4
var svgBaseProps = {
  width: '1em',
  height: '1em',
  fill: 'currentColor',
  'aria-hidden': 'true',
  focusable: 'false'
};
var iconStyles = "\n.anticon {\n  display: inline-flex;\n  align-items: center;\n  color: inherit;\n  font-style: normal;\n  line-height: 0;\n  text-align: center;\n  text-transform: none;\n  vertical-align: -0.125em;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\n.anticon > * {\n  line-height: 1;\n}\n\n.anticon svg {\n  display: inline-block;\n}\n\n.anticon::before {\n  display: none;\n}\n\n.anticon .anticon-icon {\n  display: block;\n}\n\n.anticon[tabindex] {\n  cursor: pointer;\n}\n\n.anticon-spin::before,\n.anticon-spin {\n  display: inline-block;\n  -webkit-animation: loadingCircle 1s infinite linear;\n  animation: loadingCircle 1s infinite linear;\n}\n\n@-webkit-keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n\n@keyframes loadingCircle {\n  100% {\n    -webkit-transform: rotate(360deg);\n    transform: rotate(360deg);\n  }\n}\n";
var useInsertStyles = function useInsertStyles(eleRef) {
  var _useContext = (0,react__WEBPACK_IMPORTED_MODULE_3__.useContext)(_components_Context__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A),
    csp = _useContext.csp,
    prefixCls = _useContext.prefixCls;
  var mergedStyleStr = iconStyles;
  if (prefixCls) {
    mergedStyleStr = mergedStyleStr.replace(/anticon/g, prefixCls);
  }
  (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)(function () {
    var ele = eleRef.current;
    var shadowRoot = (0,rc_util_es_Dom_shadow__WEBPACK_IMPORTED_MODULE_7__/* .getShadowRoot */ .j)(ele);
    (0,rc_util_es_Dom_dynamicCSS__WEBPACK_IMPORTED_MODULE_1__/* .updateCSS */ .BD)(mergedStyleStr, '@ant-design-icons', {
      prepend: true,
      csp: csp,
      attachTo: shadowRoot
    });
  }, []);
};

/***/ }),

/***/ 24292:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = (__webpack_require__(24994)["default"]);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _en_US = _interopRequireDefault(__webpack_require__(33087));
var _default = exports["default"] = _en_US.default;

/***/ }),

/***/ 33087:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = (__webpack_require__(24994)["default"]);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _en_US = _interopRequireDefault(__webpack_require__(24938));
var _en_US2 = _interopRequireDefault(__webpack_require__(62566));
// Merge into a locale object
const locale = {
  lang: Object.assign({
    placeholder: 'Select date',
    yearPlaceholder: 'Select year',
    quarterPlaceholder: 'Select quarter',
    monthPlaceholder: 'Select month',
    weekPlaceholder: 'Select week',
    rangePlaceholder: ['Start date', 'End date'],
    rangeYearPlaceholder: ['Start year', 'End year'],
    rangeQuarterPlaceholder: ['Start quarter', 'End quarter'],
    rangeMonthPlaceholder: ['Start month', 'End month'],
    rangeWeekPlaceholder: ['Start week', 'End week']
  }, _en_US.default),
  timePickerLocale: Object.assign({}, _en_US2.default)
};
// All settings at:
// https://github.com/ant-design/ant-design/blob/master/components/date-picker/locale/example.json
var _default = exports["default"] = locale;

/***/ }),

/***/ 13173:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


var _interopRequireDefault = (__webpack_require__(24994)["default"]);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _en_US = _interopRequireDefault(__webpack_require__(56216));
var _en_US2 = _interopRequireDefault(__webpack_require__(24292));
var _en_US3 = _interopRequireDefault(__webpack_require__(33087));
var _en_US4 = _interopRequireDefault(__webpack_require__(62566));
/* eslint-disable no-template-curly-in-string */

const typeTemplate = '${label} is not a valid ${type}';
const localeValues = {
  locale: 'en',
  Pagination: _en_US.default,
  DatePicker: _en_US3.default,
  TimePicker: _en_US4.default,
  Calendar: _en_US2.default,
  global: {
    placeholder: 'Please select'
  },
  Table: {
    filterTitle: 'Filter menu',
    filterConfirm: 'OK',
    filterReset: 'Reset',
    filterEmptyText: 'No filters',
    filterCheckall: 'Select all items',
    filterSearchPlaceholder: 'Search in filters',
    emptyText: 'No data',
    selectAll: 'Select current page',
    selectInvert: 'Invert current page',
    selectNone: 'Clear all data',
    selectionAll: 'Select all data',
    sortTitle: 'Sort',
    expand: 'Expand row',
    collapse: 'Collapse row',
    triggerDesc: 'Click to sort descending',
    triggerAsc: 'Click to sort ascending',
    cancelSort: 'Click to cancel sorting'
  },
  Tour: {
    Next: 'Next',
    Previous: 'Previous',
    Finish: 'Finish'
  },
  Modal: {
    okText: 'OK',
    cancelText: 'Cancel',
    justOkText: 'OK'
  },
  Popconfirm: {
    okText: 'OK',
    cancelText: 'Cancel'
  },
  Transfer: {
    titles: ['', ''],
    searchPlaceholder: 'Search here',
    itemUnit: 'item',
    itemsUnit: 'items',
    remove: 'Remove',
    selectCurrent: 'Select current page',
    removeCurrent: 'Remove current page',
    selectAll: 'Select all data',
    deselectAll: 'Deselect all data',
    removeAll: 'Remove all data',
    selectInvert: 'Invert current page'
  },
  Upload: {
    uploading: 'Uploading...',
    removeFile: 'Remove file',
    uploadError: 'Upload error',
    previewFile: 'Preview file',
    downloadFile: 'Download file'
  },
  Empty: {
    description: 'No data'
  },
  Icon: {
    icon: 'icon'
  },
  Text: {
    edit: 'Edit',
    copy: 'Copy',
    copied: 'Copied',
    expand: 'Expand',
    collapse: 'Collapse'
  },
  Form: {
    optional: '(optional)',
    defaultValidateMessages: {
      default: 'Field validation error for ${label}',
      required: 'Please enter ${label}',
      enum: '${label} must be one of [${enum}]',
      whitespace: '${label} cannot be a blank character',
      date: {
        format: '${label} date format is invalid',
        parse: '${label} cannot be converted to a date',
        invalid: '${label} is an invalid date'
      },
      types: {
        string: typeTemplate,
        method: typeTemplate,
        array: typeTemplate,
        object: typeTemplate,
        number: typeTemplate,
        date: typeTemplate,
        boolean: typeTemplate,
        integer: typeTemplate,
        float: typeTemplate,
        regexp: typeTemplate,
        email: typeTemplate,
        url: typeTemplate,
        hex: typeTemplate
      },
      string: {
        len: '${label} must be ${len} characters',
        min: '${label} must be at least ${min} characters',
        max: '${label} must be up to ${max} characters',
        range: '${label} must be between ${min}-${max} characters'
      },
      number: {
        len: '${label} must be equal to ${len}',
        min: '${label} must be minimum ${min}',
        max: '${label} must be maximum ${max}',
        range: '${label} must be between ${min}-${max}'
      },
      array: {
        len: 'Must be ${len} ${label}',
        min: 'At least ${min} ${label}',
        max: 'At most ${max} ${label}',
        range: 'The amount of ${label} must be between ${min}-${max}'
      },
      pattern: {
        mismatch: '${label} does not match the pattern ${pattern}'
      }
    }
  },
  Image: {
    preview: 'Preview'
  },
  QRCode: {
    expired: 'QR code expired',
    refresh: 'Refresh',
    scanned: 'Scanned'
  },
  ColorPicker: {
    presetEmpty: 'Empty'
  }
};
var _default = exports["default"] = localeValues;

/***/ }),

/***/ 62566:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
const locale = {
  placeholder: 'Select time',
  rangePlaceholder: ['Start time', 'End time']
};
var _default = exports["default"] = locale;

/***/ }),

/***/ 19072:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.pointAtPos = exports.getAnchorRects = exports.genGetAnchorRects = exports.fitSquarePoint = exports.diagonalPos = exports.diagonalPoint = exports.calcRectAndAnchor = exports.BoxAnchorPosition = exports.Box = void 0;
var _ts_utils = __webpack_require__(1601);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var BoxAnchorPosition = exports.BoxAnchorPosition = /*#__PURE__*/function (BoxAnchorPosition) {
  BoxAnchorPosition[BoxAnchorPosition["TopLeft"] = 1] = "TopLeft";
  BoxAnchorPosition[BoxAnchorPosition["TopRight"] = 2] = "TopRight";
  BoxAnchorPosition[BoxAnchorPosition["BottomRight"] = 3] = "BottomRight";
  BoxAnchorPosition[BoxAnchorPosition["BottomLeft"] = 4] = "BottomLeft";
  return BoxAnchorPosition;
}({});
var fitSquarePoint = exports.fitSquarePoint = function fitSquarePoint(movingPoint, fixedPoint) {
  var mp = movingPoint;
  var fp = fixedPoint;
  var xlen = Math.abs(mp.x - fp.x);
  var ylen = Math.abs(mp.y - fp.y);
  var len = Math.min(xlen, ylen);
  return {
    x: fp.x + Math.sign(mp.x - fp.x) * len,
    y: fp.y + Math.sign(mp.y - fp.y) * len
  };
};
var calcRectAndAnchor = exports.calcRectAndAnchor = function calcRectAndAnchor(movingPoint, fixedPoint) {
  var mp = movingPoint;
  var fp = fixedPoint;
  var pos = null;
  var tlp = null;
  if (mp.x <= fp.x && mp.y <= fp.y) {
    pos = BoxAnchorPosition.TopLeft;
    tlp = mp;
  } else if (mp.x > fp.x && mp.y > fp.y) {
    pos = BoxAnchorPosition.BottomRight;
    tlp = fp;
  } else if (mp.x > fp.x) {
    pos = BoxAnchorPosition.TopRight;
    tlp = {
      x: fp.x,
      y: mp.y
    };
  } else if (mp.y > fp.y) {
    pos = BoxAnchorPosition.BottomLeft;
    tlp = {
      x: mp.x,
      y: fp.y
    };
  }
  if (!tlp) throw new Error('Impossible tlp');
  if (!pos) throw new Error('Impossible pos');
  return {
    rect: {
      x: tlp.x,
      y: tlp.y,
      width: Math.abs(mp.x - fp.x),
      height: Math.abs(mp.y - fp.y)
    },
    anchorPos: pos
  };
};
var pointAtPos = exports.pointAtPos = function pointAtPos(rect, pos) {
  switch (pos) {
    case BoxAnchorPosition.TopLeft:
      return {
        x: rect.x,
        y: rect.y
      };
    case BoxAnchorPosition.TopRight:
      return {
        x: rect.x + rect.width,
        y: rect.y
      };
    case BoxAnchorPosition.BottomRight:
      return {
        x: rect.x + rect.width,
        y: rect.y + rect.height
      };
    case BoxAnchorPosition.BottomLeft:
      return {
        x: rect.x,
        y: rect.y + rect.height
      };
  }
};
var diagonalPos = exports.diagonalPos = function diagonalPos(pos) {
  switch (pos) {
    case BoxAnchorPosition.TopLeft:
      return BoxAnchorPosition.BottomRight;
    case BoxAnchorPosition.TopRight:
      return BoxAnchorPosition.BottomLeft;
    case BoxAnchorPosition.BottomRight:
      return BoxAnchorPosition.TopLeft;
    case BoxAnchorPosition.BottomLeft:
      return BoxAnchorPosition.TopRight;
  }
};
var diagonalPoint = exports.diagonalPoint = function diagonalPoint(rect, anchorPos) {
  return pointAtPos(rect, diagonalPos(anchorPos));
};
var genGetAnchorRects = exports.genGetAnchorRects = function genGetAnchorRects(ANCHOR_POS, pointAtPos) {
  return function (options) {
    var rect = options.rect,
      _options$size = options.size,
      size = _options$size === void 0 ? 5 : _options$size;
    var values = function values(obj) {
      return Object.keys(obj).map(function (key) {
        return obj[key];
      });
    };
    var createRect = function createRect(point, size) {
      return {
        x: point.x - size,
        y: point.y - size,
        width: size * 2,
        height: size * 2
      };
    };
    return values(ANCHOR_POS).map(function (pos) {
      return {
        anchorPos: pos,
        rect: createRect(pointAtPos(rect, pos), size)
      };
    });
  };
};
var getAnchorRects = exports.getAnchorRects = genGetAnchorRects((0, _ts_utils.objFilter)(function (val) {
  return typeof val === 'number';
}, BoxAnchorPosition), pointAtPos);
var Box = exports.Box = /*#__PURE__*/function () {
  function Box(options) {
    _classCallCheck(this, Box);
    _defineProperty(this, "state", {
      id: '' + Math.random(),
      type: 'box',
      data: null,
      style: {},
      rect: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
    });
    _defineProperty(this, "local", {});
    var opts = Object.assign({
      transform: function transform(x) {
        return x;
      },
      onStateChange: function onStateChange() {}
    }, options);
    this.transform = opts.transform;
    this.onStateChange = opts.onStateChange;
    this.__setState({
      id: opts.id,
      data: opts.data,
      type: this.getType(),
      style: this.getDefaultStyle(),
      category: this.getCategory(),
      rect: {
        x: opts.x,
        y: opts.y,
        width: opts.width || 0,
        height: opts.height || 0
      }
    }, {
      silent: true
    });
  }
  _createClass(Box, [{
    key: "getType",
    value: function getType() {
      return 'box';
    }
  }, {
    key: "getCategory",
    value: function getCategory() {
      return Box.category;
    }
  }, {
    key: "getDefaultAnchorPos",
    value: function getDefaultAnchorPos() {
      return BoxAnchorPosition.BottomRight;
    }
  }, {
    key: "getDefaultStyle",
    value: function getDefaultStyle() {
      return {};
    }
  }, {
    key: "getId",
    value: function getId() {
      return this.state.id;
    }
  }, {
    key: "getState",
    value: function getState() {
      return this.transform(this.state);
    }
  }, {
    key: "getStyle",
    value: function getStyle() {
      return this.state.style;
    }
  }, {
    key: "processIncomingStyle",
    value: function processIncomingStyle(style) {
      return style;
    }
  }, {
    key: "setStyle",
    value: function setStyle(obj) {
      this.__setState({
        style: _objectSpread(_objectSpread({}, this.state.style), this.processIncomingStyle(obj))
      });
    }
  }, {
    key: "setData",
    value: function setData(data) {
      this.__setState({
        data: data
      });
    }
  }, {
    key: "moveAnchorStart",
    value: function moveAnchorStart(_ref) {
      var anchorPos = _ref.anchorPos;
      this.__setLocal({
        oldPoint: pointAtPos(this.state.rect, anchorPos),
        oldAnchorPos: anchorPos,
        anchorPos: anchorPos
      });
    }
  }, {
    key: "moveAnchor",
    value: function moveAnchor(point) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var old = this.state.rect;
      var pos = this.local.anchorPos;
      var fixed = diagonalPoint(old, pos);
      var moving = !options.fit ? point : fitSquarePoint(point, fixed);
      var res = calcRectAndAnchor(moving, fixed);
      this.__setLocal({
        anchorPos: res.anchorPos
      });
      this.__setState({
        rect: res.rect
      });
    }
  }, {
    key: "moveAnchorEnd",
    value: function moveAnchorEnd() {
      this.__setLocal({
        oldPoint: null,
        oldAnchorPos: null,
        anchorPos: null
      });
    }
  }, {
    key: "moveBoxStart",
    value: function moveBoxStart() {
      this.__setLocal({
        oldRect: _objectSpread({}, this.state.rect)
      });
    }
  }, {
    key: "moveBox",
    value: function moveBox(_ref2) {
      var dx = _ref2.dx,
        dy = _ref2.dy;
      var old = this.local.oldRect;
      this.__setState({
        rect: _objectSpread(_objectSpread({}, old), {}, {
          x: old.x + dx,
          y: old.y + dy
        })
      });
    }
  }, {
    key: "moveBoxEnd",
    value: function moveBoxEnd() {
      this.__setLocal({
        oldRect: null
      });
    }
  }, {
    key: "__setState",
    value: function __setState(obj) {
      var _this = this;
      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var last = this.getState();
      this.state = _objectSpread(_objectSpread({}, this.state), obj);
      if (opts.silent) return;
      var fn = function fn() {
        return _this.onStateChange(_this.getState(), last);
      };
      var invoke = opts.nextTick ? function (fn) {
        return setTimeout(fn, 0);
      } : function (fn) {
        return fn();
      };
      invoke(fn);
    }
  }, {
    key: "__setLocal",
    value: function __setLocal(obj) {
      this.local = _objectSpread(_objectSpread({}, this.local), obj);
    }
  }]);
  return Box;
}();
// Note: possible settings
_defineProperty(Box, "settings", []);
_defineProperty(Box, "category", 'rect');
_defineProperty(Box, "key", 'box');
_defineProperty(Box, "defaultAnchorPos", BoxAnchorPosition.BottomRight);

/***/ }),

/***/ 4528:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.Editor = exports.CannotCreateError = void 0;
var _green_box = __webpack_require__(71028);
var _pink_box = __webpack_require__(32959);
var _ts_utils = __webpack_require__(1601);
function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }
function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }
function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }
function _construct(t, e, r) { if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments); var o = [null]; o.push.apply(o, e); var p = new (t.bind.apply(t, o))(); return r && _setPrototypeOf(p, r.prototype), p; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _isNativeFunction(fn) { try { return Function.toString.call(fn).indexOf("[native code]") !== -1; } catch (e) { return typeof fn === "function"; } }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
// Note: There could be more types for Tool in the future
var CannotCreateError = exports.CannotCreateError = /*#__PURE__*/function (_Error) {
  _inherits(CannotCreateError, _Error);
  function CannotCreateError(message) {
    var _this;
    _classCallCheck(this, CannotCreateError);
    _this = _callSuper(this, CannotCreateError, [message]);
    _this.name = 'CannotCreateError';

    // Note: better to keep stack trace
    // reference: https://stackoverflow.com/a/32749533/1755633
    var captured = true;
    if (typeof Error.captureStackTrace === 'function') {
      try {
        Error.captureStackTrace(_assertThisInitialized(_this), _this.constructor);
      } catch (e) {
        captured = false;
      }
    }
    if (!captured) {
      _this.stack = new Error(message).stack;
    }
    return _this;
  }
  return _createClass(CannotCreateError);
}( /*#__PURE__*/_wrapNativeSuper(Error));
var Editor = exports.Editor = /*#__PURE__*/function () {
  function Editor(options) {
    _classCallCheck(this, Editor);
    _defineProperty(this, "state", {
      viewport: {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      tool: {
        list: [],
        active: null
      },
      settings: [],
      piece: {
        list: [],
        active: null
      }
    });
    _defineProperty(this, "local", {
      pieces: [],
      availableTools: [],
      move: {},
      moveAnchor: {}
    });
    var opts = Object.assign({
      availableTools: [_green_box.GreenBox, _pink_box.PinkBox],
      onStateChange: function onStateChange() {},
      canCreatePiece: function canCreatePiece() {
        return true;
      }
    }, options);
    this.onStateChange = opts.onStateChange;
    this.canCreatePiece = opts.canCreatePiece;
    this.__setLocal({
      availableTools: opts.availableTools
    });
    this.__setState(_objectSpread(_objectSpread({}, opts.viewport ? {
      viewport: opts.viewport
    } : {}), {}, {
      tool: {
        list: opts.availableTools,
        active: null
      }
    }));
  }
  _createClass(Editor, [{
    key: "setViewport",
    value: function setViewport(viewport) {
      this.__setState({
        viewport: viewport
      });
    }
  }, {
    key: "toggleSelectTool",
    value: function toggleSelectTool(key) {
      var Klass = this.local.availableTools.find(function (Klass) {
        return Klass.key === key;
      });
      if (!Klass) throw new Error("Invalid ToolClass key '".concat(key, "'"));
      var active = key === this.state.tool.active ? null : key;
      this.__setState((0, _ts_utils.setIn)(['tool', 'active'], active, this.state));
    }
  }, {
    key: "createPiece",
    value: function createPiece(point) {
      var _this2 = this;
      var extra = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      if (!this.state.tool.active) return null;
      var x = point.x,
        y = point.y;
      var key = this.state.tool.active;
      var Klass = this.local.availableTools.find(function (item) {
        return item.key === key;
      });
      if (!Klass) throw new Error("ToolClass with key '".concat(key, "' not found"));
      if (!this.canCreatePiece(key, this.state)) throw new CannotCreateError("cannot create this kind of piece any more");
      var id = (0, _ts_utils.uid)();
      var piece = new Klass(_objectSpread(_objectSpread({}, extra), {}, {
        id: id,
        x: x,
        y: y,
        onStateChange: function onStateChange(state, old) {
          var foundIndex = _this2.state.piece.list.findIndex(function (item) {
            return item.id === id;
          });
          var index = foundIndex !== -1 ? foundIndex : _this2.state.piece.list.length;
          _this2.__setState((0, _ts_utils.setIn)(['piece', 'list', index], state, _this2.state));
        }
      }));
      this.__setLocal({
        pieces: [].concat(_toConsumableArray(this.local.pieces), [piece])
      });
      this.__setState((0, _ts_utils.compose)((0, _ts_utils.setIn)(['piece', 'list', this.state.piece.list.length], piece.getState()), (0, _ts_utils.setIn)(['piece', 'active'], id), (0, _ts_utils.setIn)(['piece', 'creating'], true))(this.state));
      return {
        id: id,
        defaultAnchorPos: piece.getDefaultAnchorPos()
      };
    }
  }, {
    key: "selectPiece",
    value: function selectPiece(id) {
      this.__setState((0, _ts_utils.setIn)(['piece', 'active'], id, this.state));
    }
  }, {
    key: "cancelSelectPiece",
    value: function cancelSelectPiece() {
      if (!this.state.piece.active) return;
      this.__setState((0, _ts_utils.setIn)(['piece', 'active'], null, this.state));
    }
  }, {
    key: "removePiece",
    value: function removePiece(id) {
      var index = this.state.piece.list.findIndex(function (item) {
        return item.id === id;
      });
      if (index === -1) return;
      this.__setState((0, _ts_utils.compose)((0, _ts_utils.updateIn)(['piece', 'list'], function (list) {
        return list.filter(function (item) {
          return item.id !== id;
        });
      }), (0, _ts_utils.updateIn)(['piece', 'active'], function (activeId) {
        return activeId === id ? null : activeId;
      }))(this.state));
    }
  }, {
    key: "setPieceStyle",
    value: function setPieceStyle(id, style) {
      var piece = this.__findPiece(id);
      piece.setStyle(style);
    }
  }, {
    key: "setPieceData",
    value: function setPieceData(id, data) {
      var piece = this.__findPiece(id);
      piece.setData(data);
    }
  }, {
    key: "movePieceStart",
    value: function movePieceStart(id, point) {
      var piece = this.__findPiece(id);
      this.__setLocal((0, _ts_utils.setIn)(['move', id], {
        id: id,
        point: point
      }, this.local));
      piece.moveBoxStart();
    }
  }, {
    key: "movePiece",
    value: function movePiece(id, point) {
      var piece = this.__findPiece(id);
      var data = this.local.move[id];
      if (!data || !data.point) throw new Error('No initial cursor point saved');
      var dx = point.x - data.point.x;
      var dy = point.y - data.point.y;
      piece.moveBox({
        dx: dx,
        dy: dy
      });
    }
  }, {
    key: "movePieceEnd",
    value: function movePieceEnd(id) {
      var piece = this.__findPiece(id);
      this.__setLocal((0, _ts_utils.setIn)(['move', id], null, this.local));
      piece.moveBoxEnd();
    }
  }, {
    key: "movePieceDirectly",
    value: function movePieceDirectly(id, _ref) {
      var dx = _ref.dx,
        dy = _ref.dy;
      var piece = this.__findPiece(id);
      piece.moveBoxStart();
      piece.moveBox({
        dx: dx,
        dy: dy
      });
      piece.moveBoxEnd();
    }
  }, {
    key: "movePieceAnchorStart",
    value: function movePieceAnchorStart(id, anchorPos) {
      var piece = this.__findPiece(id);
      this.__setLocal((0, _ts_utils.setIn)(['moveAnchor', id], {
        id: id,
        anchorPos: anchorPos
      }, this.local));
      piece.moveAnchorStart({
        anchorPos: anchorPos
      });
    }
  }, {
    key: "movePieceAnchor",
    value: function movePieceAnchor(id, point) {
      var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
      var piece = this.__findPiece(id);
      piece.moveAnchor(point, options);
    }
  }, {
    key: "movePieceAnchorEnd",
    value: function movePieceAnchorEnd(id) {
      var piece = this.__findPiece(id);
      this.__setLocal((0, _ts_utils.setIn)(['moveAnchor', id], null, this.local));
      piece.moveAnchorEnd();
    }
  }, {
    key: "__findPiece",
    value: function __findPiece(id) {
      var piece = this.local.pieces.find(function (item) {
        return item.getId() === id;
      });
      if (!piece) throw new Error("Piece with id '".concat(id, "' not found"));
      return piece;
    }
  }, {
    key: "__setState",
    value: function __setState(obj) {
      var last = this.state;
      this.state = _objectSpread(_objectSpread({}, this.state), obj);
      this.onStateChange(this.state, last);
    }
  }, {
    key: "__setLocal",
    value: function __setLocal(obj) {
      this.local = _objectSpread(_objectSpread({}, this.local), obj);
    }
  }]);
  return Editor;
}();

/***/ }),

/***/ 71028:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.GreenBox = void 0;
var _box = __webpack_require__(19072);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var GreenBox = exports.GreenBox = /*#__PURE__*/function (_Box) {
  _inherits(GreenBox, _Box);
  function GreenBox() {
    _classCallCheck(this, GreenBox);
    return _callSuper(this, GreenBox, arguments);
  }
  _createClass(GreenBox, [{
    key: "getType",
    value: function getType() {
      return GreenBox.key;
    }
  }, {
    key: "getDefaultStyle",
    value: function getDefaultStyle() {
      return {
        fill: 'none',
        stroke: '#00ff00',
        strokeWidth: '2px'
      };
    }
  }]);
  return GreenBox;
}(_box.Box);
_defineProperty(GreenBox, "key", 'greenBox');

/***/ }),

/***/ 32959:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports.PinkBox = void 0;
var _box = __webpack_require__(19072);
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
var PinkBox = exports.PinkBox = /*#__PURE__*/function (_Box) {
  _inherits(PinkBox, _Box);
  function PinkBox() {
    _classCallCheck(this, PinkBox);
    return _callSuper(this, PinkBox, arguments);
  }
  _createClass(PinkBox, [{
    key: "getType",
    value: function getType() {
      return PinkBox.key;
    }
  }, {
    key: "getDefaultStyle",
    value: function getDefaultStyle() {
      return {
        fill: 'none',
        stroke: '#fe1492',
        strokeWidth: '2px'
      };
    }
  }]);
  return PinkBox;
}(_box.Box);
_defineProperty(PinkBox, "key", 'pinkBox');

/***/ }),

/***/ 83745:
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


var _react = _interopRequireDefault(__webpack_require__(96540));
var _reactDom = _interopRequireDefault(__webpack_require__(40961));
var _antd = __webpack_require__(33061);
var _en_US = _interopRequireDefault(__webpack_require__(13173));
var _storage = _interopRequireDefault(__webpack_require__(88555));
var _storage2 = __webpack_require__(97467);
var _xfile = __webpack_require__(63109);
var _utils = __webpack_require__(46580);
var _ts_utils = __webpack_require__(1601);
var _dom_utils = __webpack_require__(92950);
var _editor = __webpack_require__(4528);
var _box = __webpack_require__(19072);
var _cs_timeout = __webpack_require__(41279);
var _ipc_cs = _interopRequireDefault(__webpack_require__(96571));
__webpack_require__(89721);
__webpack_require__(31609);
__webpack_require__(58087);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }
function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i]; return arr2; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t["return"] && (u = t["return"](), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }
function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor); } }
function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
function _callSuper(t, o, e) { return o = _getPrototypeOf(o), _possibleConstructorReturn(t, _isNativeReflectConstruct() ? Reflect.construct(o, e || [], _getPrototypeOf(t).constructor) : o.apply(t, e)); }
function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }
function _isNativeReflectConstruct() { try { var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); } catch (t) {} return (_isNativeReflectConstruct = function _isNativeReflectConstruct() { return !!t; })(); }
function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }
function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }
function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }
function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : String(i); }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); } // import enUS from 'antd/lib/locale-provider/en_US'
// import 'antd/dist/antd.css'
(0, _cs_timeout.polyfillTimeoutFunctions)(_ipc_cs["default"]);
var rootEl = document.getElementById('root');
var render = function render() {
  return _reactDom["default"].render( /*#__PURE__*/_react["default"].createElement(_antd.ConfigProvider, {
    locale: _en_US["default"]
  }, /*#__PURE__*/_react["default"].createElement(App, null)), rootEl);
};
var Mode = /*#__PURE__*/function (Mode) {
  Mode[Mode["Normal"] = 0] = "Normal";
  Mode[Mode["Creating"] = 1] = "Creating";
  Mode[Mode["Moving"] = 2] = "Moving";
  Mode[Mode["Resizing"] = 3] = "Resizing";
  return Mode;
}(Mode || {});
var App = /*#__PURE__*/function (_React$Component) {
  _inherits(App, _React$Component);
  function App() {
    var _this;
    _classCallCheck(this, App);
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }
    _this = _callSuper(this, App, [].concat(args));
    _defineProperty(_assertThisInitialized(_this), "state", {
      mode: Mode.Normal,
      ready: false,
      imageUrl: undefined,
      imageWidth: 0,
      imageHeight: 0,
      editor: undefined,
      creating: false,
      moving: false,
      isMouseDown: false,
      disableMouseDown: false,
      mouseDownPoint: undefined,
      pieceId: undefined,
      shouldAddRelativeInFileName: false
    });
    _defineProperty(_assertThisInitialized(_this), "throttledWarn", (0, _ts_utils.throttle)(_antd.message.warn, 3000));
    _defineProperty(_assertThisInitialized(_this), "onClickCancel", function () {
      if (!_this.hasAnyChanges()) return window.close();
      return _antd.Modal.confirm({
        title: "Unsaved changes in image \"".concat(_this.getVisionFileName(), "\""),
        content: 'Do you want to discard your changes?',
        okText: 'Yes. Close window',
        cancelText: 'No. Go back',
        onOk: function onOk() {
          return window.close();
        },
        onCancel: function onCancel() {
          return Promise.resolve(true);
        }
      });
    });
    _defineProperty(_assertThisInitialized(_this), "onClickSaveAndClose", function () {
      if (!_this.hasAnyChanges()) return;
      var hideAnchors = function hideAnchors() {
        if (_this.controller) {
          _this.controller.cancelSelectPiece();
        }
        return (0, _ts_utils.delay)(function () {}, 20);
      };
      var getFileName = function getFileName() {
        return (0, _ts_utils.withFileExtension)(_this.getVisionFileName(), function (baseName) {
          if (!_this.state.shouldAddRelativeInFileName) return baseName;
          if (/_relative$/i.test(baseName)) return baseName;
          return baseName + '_relative';
        });
      };
      var finalFileName = getFileName();
      return hideAnchors().then(function () {
        return (0, _dom_utils.imageBlobFromSVG)((0, _dom_utils.svgNodetoString)(_this.svg), 'image/png', 1.0);
      }).then(function (blob) {
        return (0, _storage2.getStorageManager)().getVisionStorage().overwrite(finalFileName, blob);
      }).then(function () {
        var kantuWindow = window.opener;
        kantuWindow.postMessage({
          type: 'RELOAD_VISIONS'
        }, '*');
        _antd.message.success('Successfully saved');
        return (0, _ts_utils.delay)(function () {}, 1000);
      }).then(function () {
        window.close();
      });
    });
    _defineProperty(_assertThisInitialized(_this), "onKeyDown", function (e) {
      if (!e.target || e.target.tagName.toUpperCase() === 'TEXTAREA') return;
      if (!_this.state.editor) return;
      if (!_this.controller) return;
      if (_this.state.editor.piece.active) {
        var hit = true;
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            {
              _this.controller.removePiece(_this.state.editor.piece.active);
              break;
            }
          case 'ArrowUp':
            {
              _this.controller.movePieceDirectly(_this.state.editor.piece.active, {
                dx: 0,
                dy: e.shiftKey ? -10 : -1
              });
              break;
            }
          case 'ArrowDown':
            {
              _this.controller.movePieceDirectly(_this.state.editor.piece.active, {
                dx: 0,
                dy: e.shiftKey ? 10 : 1
              });
              break;
            }
          case 'ArrowLeft':
            {
              _this.controller.movePieceDirectly(_this.state.editor.piece.active, {
                dy: 0,
                dx: e.shiftKey ? -10 : -1
              });
              break;
            }
          case 'ArrowRight':
            {
              _this.controller.movePieceDirectly(_this.state.editor.piece.active, {
                dy: 0,
                dx: e.shiftKey ? 10 : 1
              });
              break;
            }
          default:
            hit = false;
            break;
        }
        if (hit) {
          e.preventDefault();
        }
      }
    });
    _defineProperty(_assertThisInitialized(_this), "svgOffsetPoint", function (pageX, pageY) {
      var svg = _this.svg;
      var svgOffset = (0, _dom_utils.offset)(svg);
      var _ref = _this.state.editor,
        viewport = _ref.viewport;
      return {
        x: viewport.x + pageX - svgOffset.left,
        y: viewport.y + pageY - svgOffset.top
      };
    });
    _defineProperty(_assertThisInitialized(_this), "xSvg2DOM", function (x) {
      var svg = _this.svg;
      var svgOffset = (0, _dom_utils.offset)(svg);
      var _ref2 = _this.state.editor,
        viewport = _ref2.viewport;
      return x - viewport.x + svgOffset.left;
    });
    _defineProperty(_assertThisInitialized(_this), "ySvg2DOM", function (y) {
      var svg = _this.svg;
      var svgOffset = (0, _dom_utils.offset)(svg);
      var _ref3 = _this.state.editor,
        viewport = _ref3.viewport;
      return y - viewport.y + svgOffset.top;
    });
    _defineProperty(_assertThisInitialized(_this), "onEditorClick", function () {
      if (!_this.state.creating && !_this.state.moving && _this.controller) {
        _this.controller.cancelSelectPiece();
      }
    });
    _defineProperty(_assertThisInitialized(_this), "onEdtiorMouseDown", function (e) {
      if (e.button !== 0) return;
      if (!_this.controller) return;
      if (_this.state.disableMouseDown) return;
      if (!_this.state.editor || !_this.state.editor.tool.active) return;
      var point = _this.svgOffsetPoint(e.pageX, e.pageY);
      switch (_this.state.editor.tool.active) {
        case 'text':
          {
            var activePiece = _this.getActivePiece();
            if (activePiece && activePiece.type === 'text') {
              // Do nothing
            } else {
              try {
                _this.controller.createPiece(point, {
                  data: {
                    text: '',
                    editing: true
                  }
                });
              } catch (e) {
                if (e instanceof _editor.CannotCreateError) {
                  _this.throttledWarn(e.message);
                }
              }
            }
            break;
          }
        default:
          {
            _this.setState({
              mode: Mode.Creating,
              isMouseDown: true,
              mouseDownPoint: _this.svgOffsetPoint(e.pageX, e.pageY)
            });
          }
      }
    });
    _defineProperty(_assertThisInitialized(_this), "onEdtiorMouseUp", function (e) {
      if (!_this.controller) return;
      var nextState = {
        isMouseDown: false,
        creating: false,
        moving: false,
        mode: Mode.Normal
      };
      switch (_this.state.mode) {
        case Mode.Resizing:
          {
            var pieceId = _this.state.pieceId;
            if (!pieceId) throw new Error('no pieceId found');
            _this.controller.movePieceAnchorEnd(pieceId);
            break;
          }
        case Mode.Moving:
          {
            var _pieceId = _this.state.pieceId;
            if (!_pieceId) throw new Error('no pieceId found');
            _this.controller.movePieceEnd(_pieceId);
            break;
          }
      }

      // Note: wait for onEditorClick to be triggered first, then set creating to false
      setTimeout(function () {
        _this.setState(nextState);
      }, 0);
    });
    _defineProperty(_assertThisInitialized(_this), "onEditorMouseMove", function (e) {
      if (!_this.controller) return;
      if (!_this.state.isMouseDown) return;
      switch (_this.state.mode) {
        case Mode.Creating:
          {
            var mouseDownPoint = _this.state.mouseDownPoint;
            if (!mouseDownPoint) throw new Error('no mouse down point found');
            var pieceInfo = function () {
              try {
                return _this.controller.createPiece(mouseDownPoint);
              } catch (e) {
                if (e instanceof _editor.CannotCreateError) {
                  _this.throttledWarn(e.message);
                }
              }
            }();
            if (!pieceInfo) return;
            _this.setState({
              creating: true
            });
            _this.movePieceAnchorStart(pieceInfo.id, pieceInfo.defaultAnchorPos);
            break;
          }
        case Mode.Resizing:
          {
            var pieceId = _this.state.pieceId;
            if (!pieceId) throw new Error('no pieceId found');
            _this.controller.movePieceAnchor(pieceId, _this.svgOffsetPoint(e.pageX, e.pageY), {
              fit: e.shiftKey
            });
            break;
          }
        case Mode.Moving:
          {
            var _pieceId2 = _this.state.pieceId;
            if (!_pieceId2) throw new Error('no pieceId found');
            _this.controller.movePiece(_pieceId2, _this.svgOffsetPoint(e.pageX, e.pageY));
            _this.setState({
              moving: true
            });
            break;
          }
      }
    });
    return _this;
  }
  _createClass(App, [{
    key: "getActivePiece",
    value: function getActivePiece() {
      var _ref4 = this.state.editor,
        piece = _ref4.piece;
      if (!piece.active || !piece.list) return;
      return piece.list.find(function (item) {
        return item.id === piece.active;
      });
    }
  }, {
    key: "movePieceAnchorStart",
    value: function movePieceAnchorStart(pieceId, anchorPos) {
      if (!this.controller) return;
      this.controller.movePieceAnchorStart(pieceId, anchorPos);
      this.setState({
        pieceId: pieceId,
        mode: Mode.Resizing,
        isMouseDown: true
      });
    }
  }, {
    key: "movePieceStart",
    value: function movePieceStart(pieceId, point) {
      if (!this.controller) return;
      this.controller.movePieceStart(pieceId, point);
      this.setState({
        pieceId: pieceId,
        mode: Mode.Moving,
        isMouseDown: true
      });
    }
  }, {
    key: "bindKeyEvents",
    value: function bindKeyEvents() {
      document.addEventListener('keydown', this.onKeyDown, true);
    }
  }, {
    key: "unbindKeyEvents",
    value: function unbindKeyEvents() {
      document.removeEventListener('keydown', this.onKeyDown, true);
    }
  }, {
    key: "hasAnyChanges",
    value: function hasAnyChanges() {
      var editor = this.state.editor;
      return editor.piece.list.length > 0;
    }
  }, {
    key: "getVisionFileName",
    value: function getVisionFileName() {
      var queryObj = (0, _utils.parseQuery)(window.location.search);
      return queryObj.vision;
    }
  }, {
    key: "componentDidMount",
    value: function componentDidMount() {
      var _this2 = this;
      var visionFile = this.getVisionFileName();
      if (!visionFile) return;
      document.title = visionFile + ' - Image Editor (RPA Computer Vision)';
      (0, _storage2.getStorageManager)().getVisionStorage().read(visionFile, 'DataURL').then(function (dataUrl) {
        if (!dataUrl) throw new Error('File is empty');
        var url = dataUrl;
        return (0, _dom_utils.preloadImage)(url);
      }).then(function (data) {
        _this2.controller = new _editor.Editor({
          viewport: {
            x: 0,
            y: 0,
            width: data.width,
            height: data.height
          },
          onStateChange: function onStateChange(editorState) {
            _this2.setState({
              editor: editorState
            });
          },
          canCreatePiece: function canCreatePiece(key, state) {
            switch (key) {
              case 'pinkBox':
              case 'greenBox':
                var found = state.piece.list.find(function (item) {
                  return item.type === key;
                });
                return !found;
            }
            return true;
          }
        });
        _this2.setState({
          imageUrl: data.$img.src,
          imageWidth: data.width,
          imageHeight: data.height,
          ready: true
        });
        _this2.bindKeyEvents();
      })["catch"](function (e) {
        _antd.message.error(e.message);
      });
    }
  }, {
    key: "componentWillUnmount",
    value: function componentWillUnmount() {
      this.unbindKeyEvents();
    }
  }, {
    key: "renderAnchors",
    value: function renderAnchors(options) {
      var _this3 = this;
      var id = options.id,
        rect = options.rect,
        category = options.category;
      var getAnchorRects = _box.getAnchorRects;
      var anchors = getAnchorRects({
        rect: rect
      });
      return /*#__PURE__*/_react["default"].createElement("g", null, anchors.map(function (item) {
        return /*#__PURE__*/_react["default"].createElement("rect", _extends({}, item.rect, {
          key: item.anchorPos,
          className: "anchor anchor-".concat(item.anchorPos),
          onClick: function onClick(e) {
            return e.stopPropagation();
          },
          onMouseDown: function onMouseDown(e) {
            e.stopPropagation();
            _this3.movePieceAnchorStart(id, item.anchorPos);
          }
        }));
      }));
    }
  }, {
    key: "renderRect",
    value: function renderRect(data, isActive, commonProps) {
      var rect = data.rect;
      return /*#__PURE__*/_react["default"].createElement("g", {
        key: data.id
      }, /*#__PURE__*/_react["default"].createElement("rect", _extends({}, rect, commonProps)), isActive ? this.renderAnchors(data) : null);
    }
  }, {
    key: "renderPieces",
    value: function renderPieces() {
      var _this4 = this;
      var _ref5 = this.state.editor,
        piece = _ref5.piece;
      var renderSinglePiece = function renderSinglePiece(item) {
        var commonProps = {
          className: 'piece',
          style: item.style || {},
          onClick: function onClick(e) {
            if (!_this4.controller) return;
            if (_this4.state.moving) return;
            e.stopPropagation();
            _this4.controller.selectPiece(item.id);
          },
          onMouseDown: function onMouseDown(e) {
            e.stopPropagation();
            _this4.movePieceStart(item.id, _this4.svgOffsetPoint(e.pageX, e.pageY));
          }
        };
        var isActive = item.id === piece.active;
        switch (item.type) {
          case 'box':
          case 'greenBox':
          case 'pinkBox':
            return _this4.renderRect(item, isActive, commonProps);
        }
      };
      return /*#__PURE__*/_react["default"].createElement("g", null, (piece.list || []).map(renderSinglePiece));
    }
  }, {
    key: "render",
    value: function render() {
      var _this5 = this;
      var ready = this.state.ready;
      var editor = this.state.editor;
      if (!ready || !editor || !this.controller) return /*#__PURE__*/_react["default"].createElement("div", null);
      return /*#__PURE__*/_react["default"].createElement("div", {
        className: "vision-editor"
      }, /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-main"
      }, /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-toolbox"
      }, /*#__PURE__*/_react["default"].createElement("h3", null, "Relative Clicks"), /*#__PURE__*/_react["default"].createElement("div", {
        className: "tool-item"
      }, /*#__PURE__*/_react["default"].createElement("label", null, "Anchor Image:"), /*#__PURE__*/_react["default"].createElement("button", {
        className: (0, _utils.cn)("tool-button green-button", {
          active: editor.tool.active === 'greenBox'
        }),
        onClick: function onClick() {
          if (!_this5.controller) return;
          _this5.controller.toggleSelectTool('greenBox');
        }
      }, "Green Box")), /*#__PURE__*/_react["default"].createElement("div", {
        className: "tool-item"
      }, /*#__PURE__*/_react["default"].createElement("label", null, "Click Area:"), /*#__PURE__*/_react["default"].createElement("button", {
        className: (0, _utils.cn)("tool-button pink-button", {
          active: editor.tool.active === 'pinkBox'
        }),
        onClick: function onClick() {
          if (!_this5.controller) return;
          _this5.controller.toggleSelectTool('pinkBox');
        }
      }, "Pink Box"))), /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-canvas-scroller"
      }, /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-canvas"
      }, /*#__PURE__*/_react["default"].createElement("svg", {
        xmlns: "http://www.w3.org/2000/svg",
        xmlnsXlink: "http://www.w3.org/1999/xlink",
        width: editor.viewport.width,
        height: editor.viewport.height,
        viewBox: "".concat(editor.viewport.x, " ").concat(editor.viewport.y, " ").concat(editor.viewport.width, " ").concat(editor.viewport.height),
        ref: function ref(_ref6) {
          _this5.svg = _ref6;
        },
        onClick: this.onEditorClick,
        onMouseDown: this.onEdtiorMouseDown,
        onMouseUp: this.onEdtiorMouseUp,
        onMouseMove: this.onEditorMouseMove,
        className: (0, _utils.cn)({
          'with-tool': !editor.tool.active
        }, editor.tool.active || {})
      }, /*#__PURE__*/_react["default"].createElement("defs", null, /*#__PURE__*/_react["default"].createElement("filter", {
        id: "shadow"
      }, /*#__PURE__*/_react["default"].createElement("feDropShadow", {
        dx: "4",
        dy: "8",
        stdDeviation: "4"
      }))), /*#__PURE__*/_react["default"].createElement("image", {
        xlinkHref: this.state.imageUrl,
        x: 0,
        y: 0,
        width: this.state.imageWidth,
        height: this.state.imageHeight
      }), this.renderPieces())))), /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-bottom"
      }, /*#__PURE__*/_react["default"].createElement("a", {
        className: "editor-tips",
        target: "_blank",
        href: "https://goto.ui.vision/x/idehelp?help=relative_clicks"
      }, "Info: What are relative clicks?"), /*#__PURE__*/_react["default"].createElement("div", {
        className: "editor-actions"
      }, /*#__PURE__*/_react["default"].createElement(_antd.Button, {
        onClick: this.onClickCancel
      }, "Cancel"), /*#__PURE__*/_react["default"].createElement(_antd.Button, {
        type: "primary",
        disabled: !this.hasAnyChanges(),
        onClick: this.onClickSaveAndClose
      }, "Save + Close"))));
    }
  }]);
  return App;
}(_react["default"].Component);
function restoreConfig() {
  return _storage["default"].get('config').then(function () {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    if (config && config.useDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    return _objectSpread({
      storageMode: _storage2.StorageStrategyType.Browser
    }, config);
  });
}
function init() {
  return Promise.all([restoreConfig(), (0, _xfile.getXFile)().getConfig()]).then(function (_ref7) {
    var _ref8 = _slicedToArray(_ref7, 2),
      config = _ref8[0],
      xFileConfig = _ref8[1];
    (0, _storage2.getStorageManager)(config.storageMode);
    render();
  }, render);
}
init();

/***/ }),

/***/ 96571:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _ipc_bg_cs = __webpack_require__(59711);
var throwNotTop = function throwNotTop() {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc');
};

// browser.runtime.id in firefox extension isn't necessarily found in window.location.href 
// window.location.href  eg. "moz-extension://add2840d-0b3e-41f0-8da1-55d780cc5dd8/sidepanel.html"
var isSidepanelInFirefox = typeof window !== 'undefined' && window.location.href.match(/moz-extension:\/\/[a-z0-9-]+\/sidepanel.html/);
var isSidepanel = false;
if (typeof window !== 'undefined' && (window.location.href.startsWith("chrome-extension://".concat(chrome.runtime.id, "/sidepanel.html")) || isSidepanelInFirefox)) {
  isSidepanel = true;
}

// Note: csIpc is only available to top window
var ipc = typeof window !== 'undefined' && window.top === window ? isSidepanel ? (0, _ipc_bg_cs.spInit)() : (0, _ipc_bg_cs.csInit)() : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop
};

// Note: one ipc singleton per content script
var _default = exports["default"] = ipc;

/***/ }),

/***/ 10448:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(31601);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `html[data-theme=dark] .ant-btn{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-btn[disabled]:not(.ant-btn-primary){background-color:#23272f;border-color:#7b7b7b;color:#666}html[data-theme=dark] .ant-btn:not(:disabled):not(.ant-btn-disabled):not(.ant-btn-primary):hover{background-color:gray;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-btn.ant-btn-primary{background-color:#1677ff;border-color:#1677ff}html[data-theme=dark] .ant-btn.ant-btn-primary:hover{background-color:#69b1ff;border-color:#69b1ff}html[data-theme=dark] .ant-btn.ant-btn-circle:not(:disabled):not(.ant-btn-disabled):not(.ant-btn-primary){background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-btn.ant-btn-circle:not(:disabled):not(.ant-btn-disabled):not(.ant-btn-primary):hover{background-color:gray;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-menu-light .ant-menu-item-disabled,html[data-theme=dark] .ant-menu-light>.ant-menu .ant-menu-item-disabled,html[data-theme=dark] .ant-menu-light .ant-menu-submenu-disabled,html[data-theme=dark] .ant-menu-light>.ant-menu .ant-menu-submenu-disabled{color:#ababab !important}html[data-theme=dark] .ant-input-search>.ant-input-group>.ant-input-group-addon:last-child .ant-input-search-button:not(.ant-btn-primary){color:#fff}html[data-theme=dark] .ant-menu-light .ant-menu-item:not(.ant-menu-item-selected):not(.ant-menu-submenu-selected):hover,html[data-theme=dark] .ant-menu-light>.ant-menu .ant-menu-item:not(.ant-menu-item-selected):not(.ant-menu-submenu-selected):hover,html[data-theme=dark] .ant-menu-light .ant-menu-item:not(.ant-menu-item-selected):not(.ant-menu-submenu-selected)>.ant-menu-submenu-title:hover,html[data-theme=dark] .ant-menu-light>.ant-menu .ant-menu-item:not(.ant-menu-item-selected):not(.ant-menu-submenu-selected)>.ant-menu-submenu-title:hover{background-color:gray;color:#fff}html[data-theme=dark] .ant-dropdown .ant-dropdown-menu,html[data-theme=dark] .ant-dropdown-menu-submenu .ant-dropdown-menu{background-color:#565656;color:#fff}html[data-theme=dark] .ant-dropdown .ant-dropdown-menu li,html[data-theme=dark] .ant-dropdown-menu-submenu .ant-dropdown-menu li{color:#fff}html[data-theme=dark] .ant-dropdown .ant-dropdown-menu li:hover,html[data-theme=dark] .ant-dropdown-menu-submenu .ant-dropdown-menu li:hover{background-color:gray;color:#fff}html[data-theme=dark] .ant-table-wrapper .ant-table-tbody>tr.ant-table-placeholder:hover>th,html[data-theme=dark] .ant-table-wrapper .ant-table-tbody>tr.ant-table-placeholder:hover>td,html[data-theme=dark] .ant-table-wrapper .ant-table-tbody>tr.ant-table-placeholder{background:gray}html[data-theme=dark] .ant-table-wrapper .ant-table-tbody>tr.ant-table-placeholder{background:gray}html[data-theme=dark] .ant-empty .ant-empty-description{color:#fff}html[data-theme=dark] .ant-modal-confirm-title{color:#fff}html[data-theme=dark] .ant-modal-confirm-content{color:#fff}html[data-theme=dark] .ant-select-outlined:not(.ant-select-disabled):not(.ant-select-customize-input):not(.ant-pagination-size-changer):hover .ant-select-selector{border-color:#0a4983}html[data-theme=dark] .ant-input{background-color:#23272f;border-color:#7b7b7b;color:#fff}html[data-theme=dark] .ant-input.ant-input-disabled,html[data-theme=dark] .ant-input[disabled]{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-input:not(:disabled):not(.ant-input-disabled):hover,html[data-theme=dark] .ant-input:not(:disabled):not(.ant-input-disabled):focus{border-color:#0a4983}html[data-theme=dark] .ant-input::-moz-placeholder{color:#666}html[data-theme=dark] .ant-input::placeholder{color:#666}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox:hover .ant-checkbox-inner{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked .ant-checkbox-inner{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked::after{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked .ant-checkbox-inner{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled+span{color:#fff}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light,html[data-theme=dark] .ant-menu{background-color:#565656;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-item,html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-submenu-title,html[data-theme=dark] .ant-menu .ant-menu-item,html[data-theme=dark] .ant-menu .ant-menu-submenu-title{color:#fff}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-item:hover,html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-submenu-title:hover,html[data-theme=dark] .ant-menu .ant-menu-item:hover,html[data-theme=dark] .ant-menu .ant-menu-submenu-title:hover{background-color:gray}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-item-selected,html[data-theme=dark] .ant-menu .ant-menu-item-selected{background-color:#0a4983;color:#fff}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-item-disabled,html[data-theme=dark] .ant-menu .ant-menu-item-disabled{color:#fff}html[data-theme=dark] .macro-table-container #context_menu .ant-menu.ant-menu-light .ant-menu-divider,html[data-theme=dark] .ant-menu .ant-menu-divider{background-color:#444}html[data-theme=dark] .ant-modal{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-modal .ant-modal-header{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-modal .ant-modal-title{color:#fff}html[data-theme=dark] .ant-modal .ant-modal-body{background-color:#23272f;color:#fff}html[data-theme=dark] .ant-modal .ant-modal-footer{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-modal .ant-btn{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-modal .ant-btn:hover{background-color:gray;border-color:#0a4983;color:#0a4983}html[data-theme=dark] .ant-modal .ant-btn-primary{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-modal .ant-btn-primary:hover{border-color:#0e63b2}html[data-theme=dark] .ant-modal .ant-modal-close .ant-modal-close-x{color:#fff;background-color:#23272f}html[data-theme=dark] .ant-modal .ant-modal-close .ant-modal-close-x:hover{color:#0a4983}html[data-theme=dark] .ant-tooltip .ant-tooltip-inner{background-color:#23272f;color:#fff}html[data-theme=dark] .ant-tooltip .ant-tooltip-arrow{border-top-color:#23272f}html[data-theme=dark] .ant-tabs-nav{background-color:#23272f}html[data-theme=dark] .ant-tabs-nav .ant-tabs-nav-wrap{background-color:#23272f}html[data-theme=dark] .ant-tabs-tab{color:#fff}html[data-theme=dark] .ant-tabs-tab:hover{color:#0a4983}html[data-theme=dark] .ant-tabs-tab-active .ant-tabs-tab-btn{color:#0a4983}html[data-theme=dark] .ant-tabs-ink-bar{background-color:#0a4983}html[data-theme=dark] .ant-tabs-content{background-color:#23272f;color:#fff}html[data-theme=dark] .ant-tabs-nav,html[data-theme=dark] .ant-tabs-content{border-color:#7b7b7b}html[data-theme=dark] .ant-tabs-tabpane{background-color:#23272f;color:#fff}html[data-theme=dark] .ant-table{background-color:#23272f}html[data-theme=dark] .ant-table-thead .ant-table-cell{background-color:#2a2a2a;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-table-tbody .ant-table-cell{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-table-row:hover .ant-table-cell{background-color:gray}html[data-theme=dark] .ant-table-pagination .ant-pagination-item{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-table-pagination .ant-pagination-item a{color:#fff}html[data-theme=dark] .ant-table-pagination .ant-pagination-item-active{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-table-pagination .ant-pagination-item-active a{color:#fff}html[data-theme=dark] .ant-table-pagination .ant-pagination-prev a,html[data-theme=dark] .ant-table-pagination .ant-pagination-next a{color:#fff}html[data-theme=dark] .ant-table-pagination .ant-pagination-options .ant-select .ant-select-selector{background-color:#23272f;color:#fff}html[data-theme=dark] .ant-table-pagination .ant-pagination-options .ant-select .ant-select-arrow{color:#fff}html[data-theme=dark] .ant-table-filter-dropdown{background-color:#23272f}html[data-theme=dark] .ant-table-filter-dropdown .ant-dropdown-menu-item{color:#fff}html[data-theme=dark] .ant-table-filter-dropdown .ant-dropdown-menu-item:hover{background-color:gray}html[data-theme=dark] .ant-table-body::-webkit-scrollbar{width:8px;height:8px}html[data-theme=dark] .ant-table-body::-webkit-scrollbar-thumb{background-color:#7b7b7b;border-radius:4px}html[data-theme=dark] .ant-table-body::-webkit-scrollbar-track{background-color:#23272f}html[data-theme=dark] .ant-table-column-sorter .anticon{color:#fff}html[data-theme=dark] .ant-table-filter-dropdown{background-color:#23272f}html[data-theme=dark] .ant-table-filter-dropdown .ant-dropdown-menu-item{color:#fff}html[data-theme=dark] .ant-table-filter-dropdown .ant-dropdown-menu-item:hover{background-color:gray}html[data-theme=dark] .ant-table-summary .ant-table-cell{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-table-sticky .ant-table-header{background-color:#2a2a2a}html[data-theme=dark] .ant-table-sticky .ant-table-header .ant-table-cell{background-color:#2a2a2a;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-select-selector{background-color:#23272f;border-color:#7b7b7b;color:#fff}html[data-theme=dark] .ant-select-selector:hover{border-color:#0a4983}html[data-theme=dark] .ant-select-dropdown{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-select-dropdown .ant-select-item{color:#fff;background-color:#23272f}html[data-theme=dark] .ant-select-dropdown .ant-select-item:hover{background-color:gray}html[data-theme=dark] .ant-select-dropdown .ant-select-item-option-selected{background-color:#0a4983;color:#fff}html[data-theme=dark] .ant-select-dropdown .ant-select-item-option-disabled{color:#fff;cursor:not-allowed;background-color:#23272f}html[data-theme=dark] .ant-select-dropdown .ant-select-item-option-disabled:hover{background-color:#23272f}html[data-theme=dark] .ant-select-arrow{color:#fff}html[data-theme=dark] .ant-select-clear{color:#fff}html[data-theme=dark] .ant-select-dropdown::-webkit-scrollbar{width:8px;height:8px}html[data-theme=dark] .ant-select-dropdown::-webkit-scrollbar-thumb{background-color:#7b7b7b;border-radius:4px}html[data-theme=dark] .ant-select-dropdown::-webkit-scrollbar-track{background-color:#23272f}html[data-theme=dark] .ant-radio-wrapper{color:#fff}html[data-theme=dark] .ant-radio-wrapper .ant-radio .ant-radio-inner{background-color:#23272f;border-color:#bcbaba}html[data-theme=dark] .ant-radio-wrapper .ant-radio:hover .ant-radio-inner{border-color:#0a4983}html[data-theme=dark] .ant-radio-wrapper .ant-radio-checked .ant-radio-inner{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-radio-wrapper .ant-radio-checked::after{background-color:#0a4983}html[data-theme=dark] .ant-radio-wrapper .ant-radio-disabled .ant-radio-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-radio-wrapper .ant-radio-disabled+span{color:#fff}html[data-theme=dark] .ant-radio-button-wrapper{background-color:#23272f;color:#fff;border-color:#7b7b7b}html[data-theme=dark] .ant-radio-button-wrapper:hover{color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-radio-button-wrapper-checked{background-color:#0a4983;border-color:#0a4983;color:#fff}html[data-theme=dark] .ant-radio-button-wrapper-checked:hover{border-color:#0e63b2}html[data-theme=dark] .ant-radio-button-wrapper-disabled{color:#fff;background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-radio-button-wrapper-disabled:hover{color:#fff;background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-radio-group .ant-radio-button-wrapper:first-child{border-radius:4px 0 0 4px}html[data-theme=dark] .ant-radio-group .ant-radio-button-wrapper:last-child{border-radius:0 4px 4px 0}html[data-theme=dark] .ant-checkbox-wrapper{color:#fff}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox:hover .ant-checkbox-inner{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked .ant-checkbox-inner{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked::after{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled+span{color:#fff}html[data-theme=dark] .ant-form-item-label label{color:#fff;background-color:#23272f}html[data-theme=dark] .ant-checkbox-wrapper{color:#fff}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox:hover .ant-checkbox-inner{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked .ant-checkbox-inner{background-color:#0a4983;border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-checked::after{border-color:#0a4983}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled .ant-checkbox-inner{background-color:#23272f;border-color:#7b7b7b}html[data-theme=dark] .ant-checkbox-wrapper .ant-checkbox-disabled+span{color:#fff}html[data-theme=dark] .ant-form-item-label label{color:#fff;background-color:#23272f}html[data-theme=dark] .drop-down .option-list{background:#23272f;box-shadow:0 1px 6px rgba(255,255,255,.2);color:#fff}html[data-theme=dark] .drop-down .option-list .plain-text-option.selected{background-color:#404755}html[data-theme=dark] .drop-down .option-list .plain-text-option:hover{background-color:gray}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 28426:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(31601);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, `html[data-theme=dark]{color:#dfdfdf;background-color:#23272f}html[data-theme=dark] a{color:#1677ff}html[data-theme=dark] a:hover{color:#69b1ff}html[data-theme=dark] .vision-editor .editor-main .editor-toolbox .tool-item button.green-button{color:#dfdfdf;background:#003100}html[data-theme=dark] .vision-editor .editor-main .editor-toolbox .tool-item button.green-button.active{border:2px solid #009700}html[data-theme=dark] .vision-editor .editor-main .editor-toolbox .tool-item button.pink-button{color:#dfdfdf;background:#33051d}html[data-theme=dark] .vision-editor .editor-main .editor-toolbox .tool-item button.pink-button.active{border:2px solid #900e52}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 186:
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   A: () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(31601);
/* harmony import */ var _node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(76314);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4417);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__);
// Imports



var ___CSS_LOADER_URL_IMPORT_0___ = new URL(/* asset import */ __webpack_require__(31896), __webpack_require__.b);
var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_noSourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
var ___CSS_LOADER_URL_REPLACEMENT_0___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default()(___CSS_LOADER_URL_IMPORT_0___);
// Module
___CSS_LOADER_EXPORT___.push([module.id, `body{padding:0;margin:0}.vision-editor{position:absolute;top:0;bottom:0;left:0;right:0}.vision-editor .editor-main{display:flex;flex-direction:row;height:calc(100% - 40px)}.vision-editor .editor-main .editor-toolbox{box-sizing:border-box;padding:5px 10px;width:160px}.vision-editor .editor-main .editor-toolbox h3{margin:0 0 10px}.vision-editor .editor-main .editor-toolbox .tool-item{margin-bottom:10px}.vision-editor .editor-main .editor-toolbox .tool-item label,.vision-editor .editor-main .editor-toolbox .tool-item button{display:block}.vision-editor .editor-main .editor-toolbox .tool-item label{margin-bottom:5px}.vision-editor .editor-main .editor-toolbox .tool-item button{box-sizing:border-box;width:100%;height:30px;border-radius:4px;font-weight:bold;outline:none}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button{background:lime}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button.active{border:2px solid #090}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button{color:#fff;background:#fe1492}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button.active{border:2px solid #ab015d}.vision-editor .editor-main .editor-toolbox .relative-checkbox{margin-top:20px}.vision-editor .editor-main .editor-canvas-scroller{overflow:auto;width:calc(100% - 160px);height:100%}.vision-editor .editor-main .editor-canvas-scroller .editor-canvas{display:flex;flex-direction:row;align-items:center;justify-content:center;box-sizing:border-box;padding:5px;width:-moz-fit-content;width:fit-content;min-width:100%;min-height:100%;background:url(${___CSS_LOADER_URL_REPLACEMENT_0___});background-repeat:repeat}.vision-editor .editor-main svg.with-tool{cursor:crosshair}.vision-editor .editor-main svg image{pointer-events:none}.vision-editor .editor-main svg .piece{cursor:move;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;user-select:none}.vision-editor .editor-main svg .anchor{fill:#fff;stroke:#000;stroke-width:2px}.vision-editor .editor-main svg .anchor.anchor-1,.vision-editor .editor-main svg .anchor.anchor-3{cursor:nwse-resize}.vision-editor .editor-main svg .anchor.anchor-2,.vision-editor .editor-main svg .anchor.anchor-4{cursor:nesw-resize}.vision-editor .editor-bottom{display:flex;flex-direction:row;justify-content:space-between;align-items:center;padding:0 15px;height:40px}.vision-editor .editor-bottom .editor-actions button{margin-left:15px}`, ""]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ 4417:
/***/ ((module) => {

"use strict";


module.exports = function (url, options) {
  if (!options) {
    options = {};
  }
  if (!url) {
    return url;
  }
  url = String(url.__esModule ? url.default : url);

  // If url is already wrapped in quotes, remove them
  if (/^['"].*['"]$/.test(url)) {
    url = url.slice(1, -1);
  }
  if (options.hash) {
    url += options.hash;
  }

  // Should url be wrapped?
  // See https://drafts.csswg.org/css-values-3/#urls
  if (/["'() \t\n]|(%20)/.test(url) || options.needQuotes) {
    return "\"".concat(url.replace(/"/g, '\\"').replace(/\n/g, "\\n"), "\"");
  }
  return url;
};

/***/ }),

/***/ 56216:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var locale = {
  // Options
  items_per_page: '/ page',
  jump_to: 'Go to',
  jump_to_confirm: 'confirm',
  page: 'Page',
  // Pagination
  prev_page: 'Previous Page',
  next_page: 'Next Page',
  prev_5: 'Previous 5 Pages',
  next_5: 'Next 5 Pages',
  prev_3: 'Previous 3 Pages',
  next_3: 'Next 3 Pages',
  page_size: 'Page Size'
};
var _default = exports["default"] = locale;

/***/ }),

/***/ 24938:
/***/ ((__unused_webpack_module, exports) => {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var locale = {
  locale: 'en_US',
  today: 'Today',
  now: 'Now',
  backToToday: 'Back to today',
  ok: 'OK',
  clear: 'Clear',
  month: 'Month',
  year: 'Year',
  timeSelect: 'select time',
  dateSelect: 'select date',
  weekSelect: 'Choose a week',
  monthSelect: 'Choose a month',
  yearSelect: 'Choose a year',
  decadeSelect: 'Choose a decade',
  yearFormat: 'YYYY',
  dateFormat: 'M/D/YYYY',
  dayFormat: 'D',
  dateTimeFormat: 'M/D/YYYY HH:mm:ss',
  monthBeforeYear: true,
  previousMonth: 'Previous month (PageUp)',
  nextMonth: 'Next month (PageDown)',
  previousYear: 'Last year (Control + left)',
  nextYear: 'Next year (Control + right)',
  previousDecade: 'Last decade',
  nextDecade: 'Next decade',
  previousCentury: 'Last century',
  nextCentury: 'Next century'
};
var _default = exports["default"] = locale;

/***/ }),

/***/ 40961:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


function checkDCE() {
  /* global __REACT_DEVTOOLS_GLOBAL_HOOK__ */
  if (
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined' ||
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== 'function'
  ) {
    return;
  }
  if (false) {}
  try {
    // Verify that the code above has been dead code eliminated (DCE'd).
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    // DevTools shouldn't crash React, no matter what.
    // We should still report in case we break this code.
    console.error(err);
  }
}

if (true) {
  // DCE check should happen before ReactDOM bundle executes so that
  // DevTools can report bad minification during injection.
  checkDCE();
  module.exports = __webpack_require__(22551);
} else {}


/***/ }),

/***/ 96540:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


if (true) {
  module.exports = __webpack_require__(15287);
} else {}


/***/ }),

/***/ 31609:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(85072);
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(97825);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(77659);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(55056);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(10540);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(41113);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_antd_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(10448);

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_antd_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A, options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_antd_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A && _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_antd_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals ? _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_antd_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals : undefined);


/***/ }),

/***/ 58087:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(85072);
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(97825);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(77659);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(55056);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(10540);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(41113);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(28426);

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A, options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A && _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals ? _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_dark_theme_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals : undefined);


/***/ }),

/***/ 89721:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(85072);
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(97825);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(77659);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(55056);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(10540);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(41113);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_index_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(186);

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_index_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A, options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_index_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A && _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_index_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals ? _node_modules_css_loader_dist_cjs_js_node_modules_postcss_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_ruleSet_1_rules_2_use_3_index_scss__WEBPACK_IMPORTED_MODULE_6__/* ["default"] */ .A.locals : undefined);


/***/ }),

/***/ 24994:
/***/ ((module) => {

function _interopRequireDefault(e) {
  return e && e.__esModule ? e : {
    "default": e
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;

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
/******/ 	/* webpack/runtime/create fake namespace object */
/******/ 	(() => {
/******/ 		var getProto = Object.getPrototypeOf ? (obj) => (Object.getPrototypeOf(obj)) : (obj) => (obj.__proto__);
/******/ 		var leafPrototypes;
/******/ 		// create a fake namespace object
/******/ 		// mode & 1: value is a module id, require it
/******/ 		// mode & 2: merge all properties of value into the ns
/******/ 		// mode & 4: return value when already ns object
/******/ 		// mode & 16: return value when it's Promise-like
/******/ 		// mode & 8|1: behave like require
/******/ 		__webpack_require__.t = function(value, mode) {
/******/ 			if(mode & 1) value = this(value);
/******/ 			if(mode & 8) return value;
/******/ 			if(typeof value === 'object' && value) {
/******/ 				if((mode & 4) && value.__esModule) return value;
/******/ 				if((mode & 16) && typeof value.then === 'function') return value;
/******/ 			}
/******/ 			var ns = Object.create(null);
/******/ 			__webpack_require__.r(ns);
/******/ 			var def = {};
/******/ 			leafPrototypes = leafPrototypes || [null, getProto({}), getProto([]), getProto(getProto)];
/******/ 			for(var current = mode & 2 && value; typeof current == 'object' && !~leafPrototypes.indexOf(current); current = getProto(current)) {
/******/ 				Object.getOwnPropertyNames(current).forEach((key) => (def[key] = () => (value[key])));
/******/ 			}
/******/ 			def['default'] = () => (value);
/******/ 			__webpack_require__.d(ns, def);
/******/ 			return ns;
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
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			201: 0
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
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [787,624,397], () => (__webpack_require__(83745)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;