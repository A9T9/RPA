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

/***/ 24898:
/***/ ((module, exports, __webpack_require__) => {

exports = module.exports = __webpack_require__(9252)(false);
// imports


// module
exports.push([module.id, "body{padding:0;margin:0}.vision-editor{position:absolute;top:0;bottom:0;left:0;right:0}.vision-editor .editor-main{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;height:calc(100% - 40px)}.vision-editor .editor-main .editor-toolbox{-webkit-box-sizing:border-box;box-sizing:border-box;padding:5px 10px;width:160px}.vision-editor .editor-main .editor-toolbox h3{margin:0 0 10px}.vision-editor .editor-main .editor-toolbox .tool-item{margin-bottom:10px}.vision-editor .editor-main .editor-toolbox .tool-item button,.vision-editor .editor-main .editor-toolbox .tool-item label{display:block}.vision-editor .editor-main .editor-toolbox .tool-item label{margin-bottom:5px}.vision-editor .editor-main .editor-toolbox .tool-item button{-webkit-box-sizing:border-box;box-sizing:border-box;width:100%;height:30px;border-radius:4px;font-weight:700;outline:none}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button{background:lime}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button.active{border:2px solid #090}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button{color:#fff;background:#fe1492}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button.active{border:2px solid #ab015d}.vision-editor .editor-main .editor-toolbox .relative-checkbox{margin-top:20px}.vision-editor .editor-main .editor-canvas-scroller{overflow:auto;width:calc(100% - 160px);height:100%}.vision-editor .editor-main .editor-canvas-scroller .editor-canvas{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-sizing:border-box;box-sizing:border-box;padding:5px;width:-webkit-fit-content;width:-moz-fit-content;width:fit-content;min-width:100%;min-height:100%;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAADFBMVEUAAABaWlrMzMz////nPAkwAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB+IDGRUHMxeV5KYAAAAXSURBVAjXY1i16v9/BiKI//9XrSKCAABNyDUhZP4pqwAAAABJRU5ErkJggg==);background-repeat:repeat}.vision-editor .editor-main svg.with-tool{cursor:crosshair}.vision-editor .editor-main svg image{pointer-events:none}.vision-editor .editor-main svg .piece{cursor:move;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.vision-editor .editor-main svg .anchor{fill:#fff;stroke:#000;stroke-width:2px}.vision-editor .editor-main svg .anchor.anchor-1,.vision-editor .editor-main svg .anchor.anchor-3{cursor:nwse-resize}.vision-editor .editor-main svg .anchor.anchor-2,.vision-editor .editor-main svg .anchor.anchor-4{cursor:nesw-resize}.vision-editor .editor-bottom{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:0 15px;height:40px}.vision-editor .editor-bottom .editor-actions button{margin-left:15px}", ""]);

// exports


/***/ }),

/***/ 34468:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(24898);
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

/***/ }),

/***/ 41551:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Box = exports.getAnchorRects = exports.genGetAnchorRects = exports.diagonalPoint = exports.diagonalPos = exports.pointAtPos = exports.calcRectAndAnchor = exports.fitSquarePoint = exports.BoxAnchorPosition = void 0;
const ts_utils_1 = __webpack_require__(55452);
var BoxAnchorPosition;
(function (BoxAnchorPosition) {
    BoxAnchorPosition[BoxAnchorPosition["TopLeft"] = 1] = "TopLeft";
    BoxAnchorPosition[BoxAnchorPosition["TopRight"] = 2] = "TopRight";
    BoxAnchorPosition[BoxAnchorPosition["BottomRight"] = 3] = "BottomRight";
    BoxAnchorPosition[BoxAnchorPosition["BottomLeft"] = 4] = "BottomLeft";
})(BoxAnchorPosition = exports.BoxAnchorPosition || (exports.BoxAnchorPosition = {}));
exports.fitSquarePoint = (movingPoint, fixedPoint) => {
    const mp = movingPoint;
    const fp = fixedPoint;
    const xlen = Math.abs(mp.x - fp.x);
    const ylen = Math.abs(mp.y - fp.y);
    const len = Math.min(xlen, ylen);
    return {
        x: fp.x + Math.sign(mp.x - fp.x) * len,
        y: fp.y + Math.sign(mp.y - fp.y) * len
    };
};
exports.calcRectAndAnchor = (movingPoint, fixedPoint) => {
    const mp = movingPoint;
    const fp = fixedPoint;
    let pos = null;
    let tlp = null;
    if (mp.x <= fp.x && mp.y <= fp.y) {
        pos = BoxAnchorPosition.TopLeft;
        tlp = mp;
    }
    else if (mp.x > fp.x && mp.y > fp.y) {
        pos = BoxAnchorPosition.BottomRight;
        tlp = fp;
    }
    else if (mp.x > fp.x) {
        pos = BoxAnchorPosition.TopRight;
        tlp = { x: fp.x, y: mp.y };
    }
    else if (mp.y > fp.y) {
        pos = BoxAnchorPosition.BottomLeft;
        tlp = { x: mp.x, y: fp.y };
    }
    if (!tlp)
        throw new Error('Impossible tlp');
    if (!pos)
        throw new Error('Impossible pos');
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
exports.pointAtPos = (rect, pos) => {
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
exports.diagonalPos = (pos) => {
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
exports.diagonalPoint = (rect, anchorPos) => {
    return exports.pointAtPos(rect, exports.diagonalPos(anchorPos));
};
exports.genGetAnchorRects = (ANCHOR_POS, pointAtPos) => {
    return (options) => {
        const { rect, size = 5 } = options;
        const values = (obj) => Object.keys(obj).map(key => obj[key]);
        const createRect = (point, size) => ({
            x: point.x - size,
            y: point.y - size,
            width: size * 2,
            height: size * 2
        });
        return values(ANCHOR_POS).map(pos => {
            return {
                anchorPos: pos,
                rect: createRect(pointAtPos(rect, pos), size)
            };
        });
    };
};
exports.getAnchorRects = exports.genGetAnchorRects(ts_utils_1.objFilter((val) => typeof val === 'number', BoxAnchorPosition), exports.pointAtPos);
class Box {
    constructor(options) {
        this.state = {
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
        };
        this.local = {};
        const opts = Object.assign({
            transform: (x) => x,
            onStateChange: () => { }
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
        }, { silent: true });
    }
    getType() {
        return 'box';
    }
    getCategory() {
        return Box.category;
    }
    getDefaultAnchorPos() {
        return BoxAnchorPosition.BottomRight;
    }
    getDefaultStyle() {
        return {};
    }
    getId() {
        return this.state.id;
    }
    getState() {
        return this.transform(this.state);
    }
    getStyle() {
        return this.state.style;
    }
    processIncomingStyle(style) {
        return style;
    }
    setStyle(obj) {
        this.__setState({
            style: Object.assign(Object.assign({}, this.state.style), this.processIncomingStyle(obj))
        });
    }
    setData(data) {
        this.__setState({ data });
    }
    moveAnchorStart({ anchorPos }) {
        this.__setLocal({
            oldPoint: exports.pointAtPos(this.state.rect, anchorPos),
            oldAnchorPos: anchorPos,
            anchorPos: anchorPos
        });
    }
    moveAnchor(point, options = {}) {
        const old = this.state.rect;
        const pos = this.local.anchorPos;
        const fixed = exports.diagonalPoint(old, pos);
        const moving = !options.fit ? point : exports.fitSquarePoint(point, fixed);
        const res = exports.calcRectAndAnchor(moving, fixed);
        this.__setLocal({ anchorPos: res.anchorPos });
        this.__setState({ rect: res.rect });
    }
    moveAnchorEnd() {
        this.__setLocal({
            oldPoint: null,
            oldAnchorPos: null,
            anchorPos: null
        });
    }
    moveBoxStart() {
        this.__setLocal({
            oldRect: Object.assign({}, this.state.rect)
        });
    }
    moveBox({ dx, dy }) {
        const old = this.local.oldRect;
        this.__setState({
            rect: Object.assign(Object.assign({}, old), { x: old.x + dx, y: old.y + dy })
        });
    }
    moveBoxEnd() {
        this.__setLocal({
            oldRect: null
        });
    }
    __setState(obj, opts = {}) {
        const last = this.getState();
        this.state = Object.assign(Object.assign({}, this.state), obj);
        if (opts.silent)
            return;
        const fn = () => this.onStateChange(this.getState(), last);
        const invoke = opts.nextTick ? (fn) => setTimeout(fn, 0) : (fn) => fn();
        invoke(fn);
    }
    __setLocal(obj) {
        this.local = Object.assign(Object.assign({}, this.local), obj);
    }
}
exports.Box = Box;
// Note: possible settings
Box.settings = [];
Box.category = 'rect';
Box.key = 'box';
Box.defaultAnchorPos = BoxAnchorPosition.BottomRight;


/***/ }),

/***/ 96168:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.Editor = exports.CannotCreateError = void 0;
const green_box_1 = __webpack_require__(79322);
const pink_box_1 = __webpack_require__(29130);
const ts_utils_1 = __webpack_require__(55452);
class CannotCreateError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CannotCreateError';
        // Note: better to keep stack trace
        // reference: https://stackoverflow.com/a/32749533/1755633
        let captured = true;
        if (typeof Error.captureStackTrace === 'function') {
            try {
                Error.captureStackTrace(this, this.constructor);
            }
            catch (e) {
                captured = false;
            }
        }
        if (!captured) {
            this.stack = (new Error(message)).stack;
        }
    }
}
exports.CannotCreateError = CannotCreateError;
class Editor {
    constructor(options) {
        this.state = {
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
        };
        this.local = {
            pieces: [],
            availableTools: [],
            move: {},
            moveAnchor: {}
        };
        const opts = Object.assign({
            availableTools: [green_box_1.GreenBox, pink_box_1.PinkBox],
            onStateChange: () => { },
            canCreatePiece: () => true
        }, options);
        this.onStateChange = opts.onStateChange;
        this.canCreatePiece = opts.canCreatePiece;
        this.__setLocal({ availableTools: opts.availableTools });
        this.__setState(Object.assign(Object.assign({}, (opts.viewport ? { viewport: opts.viewport } : {})), { tool: {
                list: opts.availableTools,
                active: null
            } }));
    }
    setViewport(viewport) {
        this.__setState({ viewport });
    }
    toggleSelectTool(key) {
        const Klass = this.local.availableTools.find(Klass => Klass.key === key);
        if (!Klass)
            throw new Error(`Invalid ToolClass key '${key}'`);
        const active = key === this.state.tool.active ? null : key;
        this.__setState(ts_utils_1.setIn(['tool', 'active'], active, this.state));
    }
    createPiece(point, extra = {}) {
        if (!this.state.tool.active)
            return null;
        const { x, y } = point;
        const key = this.state.tool.active;
        const Klass = this.local.availableTools.find(item => item.key === key);
        if (!Klass)
            throw new Error(`ToolClass with key '${key}' not found`);
        if (!this.canCreatePiece(key, this.state))
            throw new CannotCreateError(`cannot create this kind of piece any more`);
        const id = ts_utils_1.uid();
        const piece = new Klass(Object.assign(Object.assign({}, extra), { id,
            x,
            y, onStateChange: (state, old) => {
                const foundIndex = this.state.piece.list.findIndex(item => item.id === id);
                const index = foundIndex !== -1 ? foundIndex : this.state.piece.list.length;
                this.__setState(ts_utils_1.setIn(['piece', 'list', index], state, this.state));
            } }));
        this.__setLocal({
            pieces: [...this.local.pieces, piece]
        });
        this.__setState(ts_utils_1.compose(ts_utils_1.setIn(['piece', 'list', this.state.piece.list.length], piece.getState()), ts_utils_1.setIn(['piece', 'active'], id), ts_utils_1.setIn(['piece', 'creating'], true))(this.state));
        return {
            id,
            defaultAnchorPos: piece.getDefaultAnchorPos()
        };
    }
    selectPiece(id) {
        this.__setState(ts_utils_1.setIn(['piece', 'active'], id, this.state));
    }
    cancelSelectPiece() {
        if (!this.state.piece.active)
            return;
        this.__setState(ts_utils_1.setIn(['piece', 'active'], null, this.state));
    }
    removePiece(id) {
        const index = this.state.piece.list.findIndex(item => item.id === id);
        if (index === -1)
            return;
        this.__setState(ts_utils_1.compose(ts_utils_1.updateIn(['piece', 'list'], (list) => list.filter(item => item.id !== id)), ts_utils_1.updateIn(['piece', 'active'], (activeId) => activeId === id ? null : activeId))(this.state));
    }
    setPieceStyle(id, style) {
        const piece = this.__findPiece(id);
        piece.setStyle(style);
    }
    setPieceData(id, data) {
        const piece = this.__findPiece(id);
        piece.setData(data);
    }
    movePieceStart(id, point) {
        const piece = this.__findPiece(id);
        this.__setLocal(ts_utils_1.setIn(['move', id], { id, point }, this.local));
        piece.moveBoxStart();
    }
    movePiece(id, point) {
        const piece = this.__findPiece(id);
        const data = this.local.move[id];
        if (!data || !data.point)
            throw new Error('No initial cursor point saved');
        const dx = point.x - data.point.x;
        const dy = point.y - data.point.y;
        piece.moveBox({ dx, dy });
    }
    movePieceEnd(id) {
        const piece = this.__findPiece(id);
        this.__setLocal(ts_utils_1.setIn(['move', id], null, this.local));
        piece.moveBoxEnd();
    }
    movePieceDirectly(id, { dx, dy }) {
        const piece = this.__findPiece(id);
        piece.moveBoxStart();
        piece.moveBox({ dx, dy });
        piece.moveBoxEnd();
    }
    movePieceAnchorStart(id, anchorPos) {
        const piece = this.__findPiece(id);
        this.__setLocal(ts_utils_1.setIn(['moveAnchor', id], { id, anchorPos }, this.local));
        piece.moveAnchorStart({ anchorPos });
    }
    movePieceAnchor(id, point, options = {}) {
        const piece = this.__findPiece(id);
        piece.moveAnchor(point, options);
    }
    movePieceAnchorEnd(id) {
        const piece = this.__findPiece(id);
        this.__setLocal(ts_utils_1.setIn(['moveAnchor', id], null, this.local));
        piece.moveAnchorEnd();
    }
    __findPiece(id) {
        const piece = this.local.pieces.find(item => item.getId() === id);
        if (!piece)
            throw new Error(`Piece with id '${id}' not found`);
        return piece;
    }
    __setState(obj) {
        const last = this.state;
        this.state = Object.assign(Object.assign({}, this.state), obj);
        this.onStateChange(this.state, last);
    }
    __setLocal(obj) {
        this.local = Object.assign(Object.assign({}, this.local), obj);
    }
}
exports.Editor = Editor;


/***/ }),

/***/ 79322:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.GreenBox = void 0;
const box_1 = __webpack_require__(41551);
class GreenBox extends box_1.Box {
    getType() {
        return GreenBox.key;
    }
    getDefaultStyle() {
        return {
            fill: 'none',
            stroke: '#00ff00',
            strokeWidth: '2px'
        };
    }
}
exports.GreenBox = GreenBox;
GreenBox.key = 'greenBox';


/***/ }),

/***/ 29130:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.PinkBox = void 0;
const box_1 = __webpack_require__(41551);
class PinkBox extends box_1.Box {
    getType() {
        return PinkBox.key;
    }
    getDefaultStyle() {
        return {
            fill: 'none',
            stroke: '#fe1492',
            strokeWidth: '2px'
        };
    }
}
exports.PinkBox = PinkBox;
PinkBox.key = 'pinkBox';


/***/ }),

/***/ 84449:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const react_1 = __importDefault(__webpack_require__(67294));
const react_dom_1 = __importDefault(__webpack_require__(73935));
const antd_1 = __webpack_require__(56318);
const en_US_1 = __importDefault(__webpack_require__(64868));
const storage_1 = __importDefault(__webpack_require__(67585));
const storage_2 = __webpack_require__(16058);
const xfile_1 = __webpack_require__(1577);
const utils_1 = __webpack_require__(63370);
const ts_utils_1 = __webpack_require__(55452);
const dom_utils_1 = __webpack_require__(24874);
const editor_1 = __webpack_require__(96168);
const box_1 = __webpack_require__(41551);
const cs_timeout_1 = __webpack_require__(28411);
const ipc_cs_1 = __importDefault(__webpack_require__(41471));
__webpack_require__(11067);
__webpack_require__(34468);
cs_timeout_1.polyfillTimeoutFunctions(ipc_cs_1.default);
const rootEl = document.getElementById('root');
const render = () => react_dom_1.default.render(react_1.default.createElement(antd_1.LocaleProvider, { locale: en_US_1.default },
    react_1.default.createElement(App, null)), rootEl);
var Mode;
(function (Mode) {
    Mode[Mode["Normal"] = 0] = "Normal";
    Mode[Mode["Creating"] = 1] = "Creating";
    Mode[Mode["Moving"] = 2] = "Moving";
    Mode[Mode["Resizing"] = 3] = "Resizing";
})(Mode || (Mode = {}));
class App extends react_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = {
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
        };
        this.throttledWarn = ts_utils_1.throttle(antd_1.message.warn, 3000);
        this.onClickCancel = () => {
            if (!this.hasAnyChanges())
                return window.close();
            return antd_1.Modal.confirm({
                title: `Unsaved changes in image "${this.getVisionFileName()}"`,
                content: 'Do you want to discard your changes?',
                okText: 'Yes. Close window',
                cancelText: 'No. Go back',
                onOk: () => {
                    return window.close();
                },
                onCancel: () => {
                    return Promise.resolve(true);
                }
            });
        };
        this.onClickSaveAndClose = () => {
            if (!this.hasAnyChanges())
                return;
            const hideAnchors = () => {
                if (this.controller) {
                    this.controller.cancelSelectPiece();
                }
                return ts_utils_1.delay(() => { }, 20);
            };
            const getFileName = () => {
                return ts_utils_1.withFileExtension(this.getVisionFileName(), (baseName) => {
                    if (!this.state.shouldAddRelativeInFileName)
                        return baseName;
                    if (/_relative$/i.test(baseName))
                        return baseName;
                    return baseName + '_relative';
                });
            };
            const finalFileName = getFileName();
            return hideAnchors()
                .then(() => dom_utils_1.imageBlobFromSVG(dom_utils_1.svgNodetoString(this.svg), 'image/png', 1.0))
                .then(blob => {
                return storage_2.getStorageManager()
                    .getVisionStorage()
                    .overwrite(finalFileName, blob);
            })
                .then(() => {
                const kantuWindow = window.opener;
                kantuWindow.postMessage({ type: 'RELOAD_VISIONS' }, '*');
                antd_1.message.success('Successfully saved');
                return ts_utils_1.delay(() => { }, 1000);
            })
                .then(() => {
                window.close();
            });
        };
        this.onKeyDown = (e) => {
            if (!e.target || e.target.tagName.toUpperCase() === 'TEXTAREA')
                return;
            if (!this.state.editor)
                return;
            if (!this.controller)
                return;
            if (this.state.editor.piece.active) {
                let hit = true;
                switch (e.key) {
                    case 'Delete':
                    case 'Backspace': {
                        this.controller.removePiece(this.state.editor.piece.active);
                        break;
                    }
                    case 'ArrowUp': {
                        this.controller.movePieceDirectly(this.state.editor.piece.active, { dx: 0, dy: e.shiftKey ? -10 : -1 });
                        break;
                    }
                    case 'ArrowDown': {
                        this.controller.movePieceDirectly(this.state.editor.piece.active, { dx: 0, dy: e.shiftKey ? 10 : 1 });
                        break;
                    }
                    case 'ArrowLeft': {
                        this.controller.movePieceDirectly(this.state.editor.piece.active, { dy: 0, dx: e.shiftKey ? -10 : -1 });
                        break;
                    }
                    case 'ArrowRight': {
                        this.controller.movePieceDirectly(this.state.editor.piece.active, { dy: 0, dx: e.shiftKey ? 10 : 1 });
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
        };
        this.svgOffsetPoint = (pageX, pageY) => {
            const svg = this.svg;
            const svgOffset = dom_utils_1.offset(svg);
            const { viewport } = this.state.editor;
            return {
                x: viewport.x + pageX - svgOffset.left,
                y: viewport.y + pageY - svgOffset.top
            };
        };
        this.xSvg2DOM = (x) => {
            const svg = this.svg;
            const svgOffset = dom_utils_1.offset(svg);
            const { viewport } = this.state.editor;
            return x - viewport.x + svgOffset.left;
        };
        this.ySvg2DOM = (y) => {
            const svg = this.svg;
            const svgOffset = dom_utils_1.offset(svg);
            const { viewport } = this.state.editor;
            return y - viewport.y + svgOffset.top;
        };
        this.onEditorClick = () => {
            if (!this.state.creating && !this.state.moving && this.controller) {
                this.controller.cancelSelectPiece();
            }
        };
        this.onEdtiorMouseDown = (e) => {
            if (e.button !== 0)
                return;
            if (!this.controller)
                return;
            if (this.state.disableMouseDown)
                return;
            if (!this.state.editor || !this.state.editor.tool.active)
                return;
            const point = this.svgOffsetPoint(e.pageX, e.pageY);
            switch (this.state.editor.tool.active) {
                case 'text': {
                    const activePiece = this.getActivePiece();
                    if (activePiece && activePiece.type === 'text') {
                        // Do nothing
                    }
                    else {
                        try {
                            this.controller.createPiece(point, {
                                data: {
                                    text: '',
                                    editing: true
                                }
                            });
                        }
                        catch (e) {
                            if (e instanceof editor_1.CannotCreateError) {
                                this.throttledWarn(e.message);
                            }
                        }
                    }
                    break;
                }
                default: {
                    this.setState({
                        mode: Mode.Creating,
                        isMouseDown: true,
                        mouseDownPoint: this.svgOffsetPoint(e.pageX, e.pageY)
                    });
                }
            }
        };
        this.onEdtiorMouseUp = (e) => {
            if (!this.controller)
                return;
            const nextState = {
                isMouseDown: false,
                creating: false,
                moving: false,
                mode: Mode.Normal
            };
            switch (this.state.mode) {
                case Mode.Resizing: {
                    const { pieceId } = this.state;
                    if (!pieceId)
                        throw new Error('no pieceId found');
                    this.controller.movePieceAnchorEnd(pieceId);
                    break;
                }
                case Mode.Moving: {
                    const { pieceId } = this.state;
                    if (!pieceId)
                        throw new Error('no pieceId found');
                    this.controller.movePieceEnd(pieceId);
                    break;
                }
            }
            // Note: wait for onEditorClick to be triggered first, then set creating to false
            setTimeout(() => {
                this.setState(nextState);
            }, 0);
        };
        this.onEditorMouseMove = (e) => {
            if (!this.controller)
                return;
            if (!this.state.isMouseDown)
                return;
            switch (this.state.mode) {
                case Mode.Creating: {
                    const { mouseDownPoint } = this.state;
                    if (!mouseDownPoint)
                        throw new Error('no mouse down point found');
                    const pieceInfo = (() => {
                        try {
                            return this.controller.createPiece(mouseDownPoint);
                        }
                        catch (e) {
                            if (e instanceof editor_1.CannotCreateError) {
                                this.throttledWarn(e.message);
                            }
                        }
                    })();
                    if (!pieceInfo)
                        return;
                    this.setState({
                        creating: true
                    });
                    this.movePieceAnchorStart(pieceInfo.id, pieceInfo.defaultAnchorPos);
                    break;
                }
                case Mode.Resizing: {
                    const { pieceId } = this.state;
                    if (!pieceId)
                        throw new Error('no pieceId found');
                    this.controller.movePieceAnchor(pieceId, this.svgOffsetPoint(e.pageX, e.pageY), { fit: e.shiftKey });
                    break;
                }
                case Mode.Moving: {
                    const { pieceId } = this.state;
                    if (!pieceId)
                        throw new Error('no pieceId found');
                    this.controller.movePiece(pieceId, this.svgOffsetPoint(e.pageX, e.pageY));
                    this.setState({ moving: true });
                    break;
                }
            }
        };
    }
    getActivePiece() {
        const { piece } = this.state.editor;
        if (!piece.active || !piece.list)
            return;
        return piece.list.find(item => item.id === piece.active);
    }
    movePieceAnchorStart(pieceId, anchorPos) {
        if (!this.controller)
            return;
        this.controller.movePieceAnchorStart(pieceId, anchorPos);
        this.setState({
            pieceId,
            mode: Mode.Resizing,
            isMouseDown: true
        });
    }
    movePieceStart(pieceId, point) {
        if (!this.controller)
            return;
        this.controller.movePieceStart(pieceId, point);
        this.setState({
            pieceId,
            mode: Mode.Moving,
            isMouseDown: true
        });
    }
    bindKeyEvents() {
        document.addEventListener('keydown', this.onKeyDown, true);
    }
    unbindKeyEvents() {
        document.removeEventListener('keydown', this.onKeyDown, true);
    }
    hasAnyChanges() {
        const editor = this.state.editor;
        return editor.piece.list.length > 0;
    }
    getVisionFileName() {
        const queryObj = utils_1.parseQuery(window.location.search);
        return queryObj.vision;
    }
    componentDidMount() {
        const visionFile = this.getVisionFileName();
        if (!visionFile)
            return;
        document.title = visionFile + ' - Image Editor (RPA Computer Vision)';
        storage_2.getStorageManager()
            .getVisionStorage()
            .read(visionFile, 'DataURL')
            .then(dataUrl => {
            if (!dataUrl)
                throw new Error('File is empty');
            let url = dataUrl;
            return dom_utils_1.preloadImage(url);
        })
            .then(data => {
            this.controller = new editor_1.Editor({
                viewport: {
                    x: 0,
                    y: 0,
                    width: data.width,
                    height: data.height
                },
                onStateChange: (editorState) => {
                    this.setState({
                        editor: editorState
                    });
                },
                canCreatePiece: (key, state) => {
                    switch (key) {
                        case 'pinkBox':
                        case 'greenBox':
                            const found = state.piece.list.find(item => item.type === key);
                            return !found;
                    }
                    return true;
                }
            });
            this.setState({
                imageUrl: data.$img.src,
                imageWidth: data.width,
                imageHeight: data.height,
                ready: true
            });
            this.bindKeyEvents();
        })
            .catch(e => {
            antd_1.message.error(e.message);
        });
    }
    componentWillUnmount() {
        this.unbindKeyEvents();
    }
    renderAnchors(options) {
        const { id, rect, category } = options;
        const getAnchorRects = box_1.getAnchorRects;
        const anchors = getAnchorRects({ rect });
        return (react_1.default.createElement("g", null, anchors.map(item => (react_1.default.createElement("rect", Object.assign({}, item.rect, { key: item.anchorPos, className: `anchor anchor-${item.anchorPos}`, onClick: (e) => e.stopPropagation(), onMouseDown: (e) => {
                e.stopPropagation();
                this.movePieceAnchorStart(id, item.anchorPos);
            } }))))));
    }
    renderRect(data, isActive, commonProps) {
        const { rect } = data;
        return (react_1.default.createElement("g", { key: data.id },
            react_1.default.createElement("rect", Object.assign({}, rect, commonProps)),
            isActive ? this.renderAnchors(data) : null));
    }
    renderPieces() {
        const { piece } = this.state.editor;
        const renderSinglePiece = (item) => {
            const commonProps = {
                className: 'piece',
                style: item.style || {},
                onClick: (e) => {
                    if (!this.controller)
                        return;
                    if (this.state.moving)
                        return;
                    e.stopPropagation();
                    this.controller.selectPiece(item.id);
                },
                onMouseDown: (e) => {
                    e.stopPropagation();
                    this.movePieceStart(item.id, this.svgOffsetPoint(e.pageX, e.pageY));
                }
            };
            const isActive = item.id === piece.active;
            switch (item.type) {
                case 'box':
                case 'greenBox':
                case 'pinkBox':
                    return this.renderRect(item, isActive, commonProps);
            }
        };
        return (react_1.default.createElement("g", null, (piece.list || []).map(renderSinglePiece)));
    }
    render() {
        const ready = this.state.ready;
        const editor = this.state.editor;
        if (!ready || !editor || !this.controller)
            return react_1.default.createElement("div", null);
        return (react_1.default.createElement("div", { className: "vision-editor" },
            react_1.default.createElement("div", { className: "editor-main" },
                react_1.default.createElement("div", { className: "editor-toolbox" },
                    react_1.default.createElement("h3", null, "Relative Clicks"),
                    react_1.default.createElement("div", { className: "tool-item" },
                        react_1.default.createElement("label", null, "Anchor Image:"),
                        react_1.default.createElement("button", { className: utils_1.cn("tool-button green-button", { active: editor.tool.active === 'greenBox' }), onClick: () => {
                                if (!this.controller)
                                    return;
                                this.controller.toggleSelectTool('greenBox');
                            } }, "Green Box")),
                    react_1.default.createElement("div", { className: "tool-item" },
                        react_1.default.createElement("label", null, "Click Area:"),
                        react_1.default.createElement("button", { className: utils_1.cn("tool-button pink-button", { active: editor.tool.active === 'pinkBox' }), onClick: () => {
                                if (!this.controller)
                                    return;
                                this.controller.toggleSelectTool('pinkBox');
                            } }, "Pink Box"))),
                react_1.default.createElement("div", { className: "editor-canvas-scroller" },
                    react_1.default.createElement("div", { className: "editor-canvas" },
                        react_1.default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", xmlnsXlink: "http://www.w3.org/1999/xlink", width: editor.viewport.width, height: editor.viewport.height, viewBox: `${editor.viewport.x} ${editor.viewport.y} ${editor.viewport.width} ${editor.viewport.height}`, ref: ref => { this.svg = ref; }, onClick: this.onEditorClick, onMouseDown: this.onEdtiorMouseDown, onMouseUp: this.onEdtiorMouseUp, onMouseMove: this.onEditorMouseMove, className: utils_1.cn({
                                'with-tool': !editor.tool.active
                            }, editor.tool.active || {}) },
                            react_1.default.createElement("defs", null,
                                react_1.default.createElement("filter", { id: "shadow" },
                                    react_1.default.createElement("feDropShadow", { dx: "4", dy: "8", stdDeviation: "4" }))),
                            react_1.default.createElement("image", { xlinkHref: this.state.imageUrl, x: 0, y: 0, width: this.state.imageWidth, height: this.state.imageHeight }),
                            this.renderPieces())))),
            react_1.default.createElement("div", { className: "editor-bottom" },
                react_1.default.createElement("a", { className: "editor-tips", target: "_blank", href: "https://ui.vision/x/idehelp?help=relative_clicks" }, "Info: What are relative clicks?"),
                react_1.default.createElement("div", { className: "editor-actions" },
                    react_1.default.createElement(antd_1.Button, { onClick: this.onClickCancel }, "Cancel"),
                    react_1.default.createElement(antd_1.Button, { type: "primary", disabled: !this.hasAnyChanges(), onClick: this.onClickSaveAndClose }, "Save + Close")))));
    }
}
function restoreConfig() {
    return storage_1.default.get('config')
        .then((config = {}) => {
        return Object.assign({ storageMode: storage_2.StorageStrategyType.Browser }, config);
    });
}
function init() {
    return Promise.all([
        restoreConfig(),
        xfile_1.getXFile().getConfig()
    ])
        .then(([config, xFileConfig]) => {
        storage_2.getStorageManager(config.storageMode);
        render();
    }, render);
}
init();


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
/******/ 		__webpack_require__.j = 223;
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
/******/ 			223: 0
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
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [736,105,263], () => (__webpack_require__(84449)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;