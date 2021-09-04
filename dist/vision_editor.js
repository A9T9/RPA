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
/******/ 			if(Object.prototype.hasOwnProperty.call(installedChunks, chunkId) && installedChunks[chunkId]) {
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
/******/
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
/******/ 		9: 0
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
/******/ 	deferredModules.push([1067,1,0]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 1067:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(__webpack_require__(0));
const react_dom_1 = __importDefault(__webpack_require__(18));
const antd_1 = __webpack_require__(117);
const en_US_1 = __importDefault(__webpack_require__(387));
const storage_1 = __importDefault(__webpack_require__(36));
const storage_2 = __webpack_require__(13);
const xfile_1 = __webpack_require__(32);
const utils_1 = __webpack_require__(4);
const ts_utils_1 = __webpack_require__(12);
const dom_utils_1 = __webpack_require__(22);
const editor_1 = __webpack_require__(1068);
const box_1 = __webpack_require__(514);
const cs_timeout_1 = __webpack_require__(118);
const ipc_cs_1 = __importDefault(__webpack_require__(20));
__webpack_require__(386);
__webpack_require__(1071);
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


/***/ }),

/***/ 1068:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const green_box_1 = __webpack_require__(1069);
const pink_box_1 = __webpack_require__(1070);
const ts_utils_1 = __webpack_require__(12);
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

/***/ 1069:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const box_1 = __webpack_require__(514);
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

/***/ 107:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var idb_filesystem_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(170);
/* harmony import */ var idb_filesystem_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(idb_filesystem_js__WEBPACK_IMPORTED_MODULE_0__);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();



var fs = function () {
  var requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

  if (!requestFileSystem) {
    throw new Error('requestFileSystem not supported');
  }

  var dumbSize = 1024 * 1024;
  var maxSize = 5 * 1024 * 1024;
  var getFS = function getFS(size) {
    size = size || maxSize;

    return new Promise(function (resolve, reject) {
      requestFileSystem(window.TEMPORARY, size, resolve, reject);
    });
  };

  var getDirectory = function getDirectory(dir, shouldCreate, fs) {
    var parts = (Array.isArray(dir) ? dir : dir.split('/')).filter(function (p) {
      return p && p.length;
    });
    var getDir = function getDir(parts, directoryEntry) {
      if (!parts || !parts.length) return Promise.resolve(directoryEntry);

      return new Promise(function (resolve, reject) {
        directoryEntry.getDirectory(parts[0], { create: !!shouldCreate }, function (dirEntry) {
          return resolve(dirEntry);
        }, function (e) {
          return reject(e);
        });
      }).then(function (entry) {
        return getDir(parts.slice(1), entry);
      });
    };

    var pFS = fs ? Promise.resolve(fs) : getFS(dumbSize);
    return pFS.then(function (fs) {
      return getDir(parts, fs.root);
    });
  };

  var ensureDirectory = function ensureDirectory(dir, fs) {
    return getDirectory(dir, true, fs);
  };

  var rmdir = function rmdir(dir, fs) {
    return getDirectory(dir, false, fs).then(function (directoryEntry) {
      return new Promise(function (resolve, reject) {
        directoryEntry.remove(resolve, reject);
      });
    });
  };

  var rmdirR = function rmdirR(dir, fs) {
    return getDirectory(dir, false, fs).then(function (directoryEntry) {
      return new Promise(function (resolve, reject) {
        return directoryEntry.removeRecursively(resolve, reject);
      });
    });
  };

  // @return a Promise of [FileSystemEntries]
  var list = function list() {
    var dir = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '/';

    return getFS(dumbSize).then(function (fs) {
      return new Promise(function (resolve, reject) {
        getDirectory(dir).then(function (dirEntry) {
          var result = [];
          var dirReader = dirEntry.createReader();
          var read = function read() {
            dirReader.readEntries(function (entries) {
              if (entries.length === 0) {
                resolve(result.sort());
              } else {
                result = result.concat(Array.from(entries));
                read();
              }
            }, reject);
          };

          read();
        }).catch(reject);
      });
    }).catch(function (e) {
      console.warn('list', e.code, e.name, e.message);
      throw e;
    });
  };

  var fileLocator = function fileLocator(filePath, fs) {
    var parts = filePath.split('/');
    return getDirectory(parts.slice(0, -1), false, fs).then(function (directoryEntry) {
      return {
        directoryEntry: directoryEntry,
        fileName: parts.slice(-1)[0]
      };
    });
  };

  var readFile = function readFile(filePath, type) {
    if (['ArrayBuffer', 'BinaryString', 'DataURL', 'Text'].indexOf(type) === -1) {
      throw new Error('invalid readFile type, \'' + type + '\'');
    }

    return getFS().then(function (fs) {
      return fileLocator(filePath, fs).then(function (_ref) {
        var directoryEntry = _ref.directoryEntry,
            fileName = _ref.fileName;

        return new Promise(function (resolve, reject) {
          directoryEntry.getFile(fileName, {}, function (fileEntry) {
            fileEntry.file(function (file) {
              var reader = new FileReader();

              reader.onerror = reject;
              reader.onloadend = function () {
                resolve(this.result);
              };

              switch (type) {
                case 'ArrayBuffer':
                  return reader.readAsArrayBuffer(file);
                case 'BinaryString':
                  return reader.readAsBinaryString(file);
                case 'DataURL':
                  return reader.readAsDataURL(file);
                case 'Text':
                  return reader.readAsText(file);
                default:
                  throw new Error('unsupported data type, \'' + type);
              }
            }, reject);
          }, reject);
        });
      });
    }).catch(function (e) {
      console.warn('readFile', e.code, e.name, e.message);
      throw e;
    });
  };

  var writeFile = function writeFile(filePath, blob, size) {
    return getFS(size).then(function (fs) {
      return fileLocator(filePath, fs).then(function (_ref2) {
        var directoryEntry = _ref2.directoryEntry,
            fileName = _ref2.fileName;

        return new Promise(function (resolve, reject) {
          directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.createWriter(function (fileWriter) {
              fileWriter.onwriteend = function () {
                return resolve(fileEntry.toURL());
              };
              fileWriter.onerror = reject;

              fileWriter.write(blob);
            });
          }, reject);
        });
      });
    }).catch(function (e) {
      console.warn(e.code, e.name, e.message);
      throw e;
    });
  };

  var removeFile = function removeFile(filePath) {
    return getFS().then(function (fs) {
      return fileLocator(filePath, fs).then(function (_ref3) {
        var directoryEntry = _ref3.directoryEntry,
            fileName = _ref3.fileName;

        return new Promise(function (resolve, reject) {
          directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.remove(resolve, reject);
          }, reject);
        });
      });
    }).catch(function (e) {
      console.warn('removeFile', e.code, e.name, e.message);
      throw e;
    });
  };

  var moveFile = function moveFile(srcPath, targetPath) {
    return getFS().then(function (fs) {
      return Promise.all([fileLocator(srcPath, fs), fileLocator(targetPath, fs)]).then(function (tuple) {
        var srcDirEntry = tuple[0].directoryEntry;
        var srcFileName = tuple[0].fileName;
        var tgtDirEntry = tuple[1].directoryEntry;
        var tgtFileName = tuple[1].fileName;

        return new Promise(function (resolve, reject) {
          srcDirEntry.getFile(srcFileName, {}, function (fileEntry) {
            try {
              fileEntry.moveTo(tgtDirEntry, tgtFileName, resolve, reject);
            } catch (e) {
              // Note: For firefox, we use `idb.filesystem.js`, but it hasn't implemented `moveTo` method
              // so we have to mock it with read / write / remove
              readFile(srcPath, 'ArrayBuffer').then(function (arrayBuffer) {
                return writeFile(targetPath, new Blob([new Uint8Array(arrayBuffer)]));
              }).then(function () {
                return removeFile(srcPath);
              }).then(resolve, reject);
            }
          }, reject);
        });
      });
    });
  };

  var copyFile = function copyFile(srcPath, targetPath) {
    return getFS().then(function (fs) {
      return Promise.all([fileLocator(srcPath, fs), fileLocator(targetPath, fs)]).then(function (tuple) {
        var srcDirEntry = tuple[0].directoryEntry;
        var srcFileName = tuple[0].fileName;
        var tgtDirEntry = tuple[1].directoryEntry;
        var tgtFileName = tuple[1].fileName;

        return new Promise(function (resolve, reject) {
          srcDirEntry.getFile(srcFileName, {}, function (fileEntry) {
            try {
              fileEntry.copyTo(tgtDirEntry, tgtFileName, resolve, reject);
            } catch (e) {
              // Note: For firefox, we use `idb.filesystem.js`, but it hasn't implemented `copyTo` method
              // so we have to mock it with read / write
              readFile(srcPath, 'ArrayBuffer').then(function (arrayBuffer) {
                return writeFile(targetPath, new Blob([new Uint8Array(arrayBuffer)]));
              }).then(resolve, reject);
            }
          }, reject);
        });
      });
    }).catch(function (e) {
      console.warn('copyFile', e.code, e.name, e.message);
      throw e;
    });
  };

  var getMetadata = function getMetadata(filePath) {
    var isDirectory = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

    return getFS().then(function (fs) {
      if (filePath.getMetadata) {
        return new Promise(function (resolve, reject) {
          return filePath.getMetadata(resolve);
        });
      }

      return fileLocator(filePath, fs).then(function (_ref4) {
        var directoryEntry = _ref4.directoryEntry,
            fileName = _ref4.fileName;

        return new Promise(function (resolve, reject) {
          var args = [fileName, { create: false }, function (entry) {
            entry.getMetadata(resolve);
          }, reject];

          if (isDirectory) {
            directoryEntry.getDirectory.apply(directoryEntry, args);
          } else {
            directoryEntry.getFile.apply(directoryEntry, args);
          }
        });
      });
    }).catch(function (e) {
      console.warn('getMetadata', e.code, e.name, e.message);
      throw e;
    });
  };

  var existsStat = function existsStat(entryPath) {
    return getFS().then(function (fs) {
      return fileLocator(entryPath, fs).then(function (_ref5) {
        var directoryEntry = _ref5.directoryEntry,
            fileName = _ref5.fileName;

        var isSomeEntry = function isSomeEntry(getMethodName) {
          return new Promise(function (resolve) {
            directoryEntry[getMethodName](fileName, { create: false }, function (data) {
              resolve(true);
            }, function () {
              return resolve(false);
            });
          });
        };

        var pIsFile = isSomeEntry('getFile');
        var pIsDir = isSomeEntry('getDirectory');

        return Promise.all([pIsFile, pIsDir]).then(function (_ref6) {
          var _ref7 = _slicedToArray(_ref6, 2),
              isFile = _ref7[0],
              isDirectory = _ref7[1];

          return {
            isFile: isFile,
            isDirectory: isDirectory
          };
        });
      });
    }).catch(function (e) {
      // DOMException.NOT_FOUND_ERR === 8
      if (e && e.code === 8) {
        return {
          isFile: false,
          isDirectory: false
        };
      }

      console.warn('fs.exists', e.code, e.name, e.message);
      throw e;
    });
  };

  var exists = function exists(entryPath) {
    var _ref8 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        type = _ref8.type;

    return existsStat(entryPath).then(function (stat) {
      switch (type) {
        case 'file':
          return stat.isFile;

        case 'directory':
          return stat.isDirectory;

        default:
          return stat.isFile || stat.isDirectory;
      }
    });
  };

  return {
    list: list,
    readFile: readFile,
    writeFile: writeFile,
    removeFile: removeFile,
    moveFile: moveFile,
    copyFile: copyFile,
    getDirectory: getDirectory,
    getMetadata: getMetadata,
    ensureDirectory: ensureDirectory,
    exists: exists,
    existsStat: existsStat,
    rmdir: rmdir,
    rmdirR: rmdirR
  };
}();

// For test only
window.fs = fs;

/* harmony default export */ __webpack_exports__["default"] = (fs);

/***/ }),

/***/ 1070:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const box_1 = __webpack_require__(514);
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

/***/ 1071:
/***/ (function(module, exports, __webpack_require__) {

// style-loader: Adds some css to the DOM by adding a <style> tag

// load the styles
var content = __webpack_require__(1072);
if(typeof content === 'string') content = [[module.i, content, '']];
// Prepare cssTransformation
var transform;

var options = {}
options.transform = transform
// add the styles to the DOM
var update = __webpack_require__(133)(content, options);
if(content.locals) module.exports = content.locals;
// Hot Module Replacement
if(false) {}

/***/ }),

/***/ 1072:
/***/ (function(module, exports, __webpack_require__) {

exports = module.exports = __webpack_require__(132)(undefined);
// imports


// module
exports.push([module.i, "body{padding:0;margin:0}.vision-editor{position:absolute;top:0;bottom:0;left:0;right:0}.vision-editor .editor-main{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;height:calc(100% - 40px)}.vision-editor .editor-main .editor-toolbox{-webkit-box-sizing:border-box;box-sizing:border-box;padding:5px 10px;width:160px}.vision-editor .editor-main .editor-toolbox h3{margin:0 0 10px}.vision-editor .editor-main .editor-toolbox .tool-item{margin-bottom:10px}.vision-editor .editor-main .editor-toolbox .tool-item button,.vision-editor .editor-main .editor-toolbox .tool-item label{display:block}.vision-editor .editor-main .editor-toolbox .tool-item label{margin-bottom:5px}.vision-editor .editor-main .editor-toolbox .tool-item button{-webkit-box-sizing:border-box;box-sizing:border-box;width:100%;height:30px;border-radius:4px;font-weight:700;outline:none}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button{background:lime}.vision-editor .editor-main .editor-toolbox .tool-item button.green-button.active{border:2px solid #090}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button{color:#fff;background:#fe1492}.vision-editor .editor-main .editor-toolbox .tool-item button.pink-button.active{border:2px solid #ab015d}.vision-editor .editor-main .editor-toolbox .relative-checkbox{margin-top:20px}.vision-editor .editor-main .editor-canvas-scroller{overflow:auto;width:calc(100% - 160px);height:100%}.vision-editor .editor-main .editor-canvas-scroller .editor-canvas{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;justify-content:center;-webkit-box-sizing:border-box;box-sizing:border-box;padding:5px;width:-webkit-fit-content;width:-moz-fit-content;width:fit-content;min-width:100%;min-height:100%;background:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAADFBMVEUAAABaWlrMzMz////nPAkwAAAAAWJLR0QAiAUdSAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAAAd0SU1FB+IDGRUHMxeV5KYAAAAXSURBVAjXY1i16v9/BiKI//9XrSKCAABNyDUhZP4pqwAAAABJRU5ErkJggg==);background-repeat:repeat}.vision-editor .editor-main svg.with-tool{cursor:crosshair}.vision-editor .editor-main svg image{pointer-events:none}.vision-editor .editor-main svg .piece{cursor:move;-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.vision-editor .editor-main svg .anchor{fill:#fff;stroke:#000;stroke-width:2px}.vision-editor .editor-main svg .anchor.anchor-1,.vision-editor .editor-main svg .anchor.anchor-3{cursor:nwse-resize}.vision-editor .editor-main svg .anchor.anchor-2,.vision-editor .editor-main svg .anchor.anchor-4{cursor:nesw-resize}.vision-editor .editor-bottom{display:-webkit-box;display:-ms-flexbox;display:flex;-webkit-box-orient:horizontal;-webkit-box-direction:normal;-ms-flex-direction:row;flex-direction:row;-webkit-box-pack:justify;-ms-flex-pack:justify;justify-content:space-between;-webkit-box-align:center;-ms-flex-align:center;align-items:center;padding:0 15px;height:40px}.vision-editor .editor-bottom .editor-actions button{margin-left:15px}", ""]);

// exports


/***/ }),

/***/ 118:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log_1 = __importDefault(__webpack_require__(11));
const oldSetTimeout = window.setTimeout;
const oldClearTimeout = window.clearTimeout;
const oldSetInterval = window.setInterval;
const oldClearInterval = window.clearInterval;
function uid() {
    return Math.floor(Math.random() * 1e8);
}
function polyfillTimeoutFunctions(csIpc) {
    const timeoutRecords = {};
    function createSetTimeoutViaBackground(identity) {
        const id = identity !== null && identity !== void 0 ? identity : uid();
        return function setTimeoutViaBackground(fn, timeout = 0, ...args) {
            timeoutRecords[id] = true;
            csIpc.ask('TIMEOUT', { id, timeout }).then((identity) => {
                if (!timeoutRecords[identity]) {
                    return;
                }
                fn(...args);
            })
                .catch((e) => {
                log_1.default.error('Error in setTimeout', e.stack);
            });
            return id;
        };
    }
    function clearTimeoutViaBackground(id) {
        delete timeoutRecords[id];
    }
    // Call both native setTimeout and setTimeoutViaBackground
    // and take the first one resolved
    function smartSetTimeout(fn, timeout = 0, ...args) {
        let done = false;
        const wrappedFn = (...args) => {
            if (done) {
                return null;
            }
            done = true;
            return fn(...args);
        };
        const id = oldSetTimeout(wrappedFn, timeout, ...args);
        createSetTimeoutViaBackground(id)(wrappedFn, timeout, ...args);
        return id;
    }
    const intervalRecords = {};
    function smartSetInterval(fn, timeout = 0, ...args) {
        const id = uid();
        const wrappedFn = () => {
            if (!intervalRecords[id]) {
                return;
            }
            smartSetTimeout(wrappedFn, timeout);
            fn(...args);
        };
        intervalRecords[id] = true;
        smartSetTimeout(wrappedFn, timeout);
        return id;
    }
    function clearIntervalViaBackground(id) {
        delete intervalRecords[id];
    }
    const runBoth = (f1, f2) => {
        return (...args) => {
            f1(...args);
            f2(...args);
        };
    };
    window.setTimeout = smartSetTimeout;
    window.clearTimeout = runBoth(clearTimeoutViaBackground, oldClearTimeout);
    window.setInterval = smartSetInterval;
    window.clearInterval = clearIntervalViaBackground;
}
exports.polyfillTimeoutFunctions = polyfillTimeoutFunctions;


/***/ }),

/***/ 121:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const standard_storage_1 = __webpack_require__(89);
const filesystem_1 = __importDefault(__webpack_require__(107));
const path_1 = __webpack_require__(27);
const utils_1 = __webpack_require__(4);
const dom_utils_1 = __webpack_require__(22);
const web_extension_1 = __importDefault(__webpack_require__(10));
const ts_utils_1 = __webpack_require__(12);
class BrowserFileSystemStandardStorage extends standard_storage_1.StandardStorage {
    constructor(opts) {
        super({
            encode: opts.encode,
            decode: opts.decode
        });
        this.transformFileName = (path) => path;
        const { extensions, shouldKeepExt, transformFileName, baseDir = 'share' } = opts;
        if (!baseDir || baseDir === '/') {
            throw new Error(`Invalid baseDir, ${baseDir}`);
        }
        if (transformFileName) {
            this.transformFileName = transformFileName;
        }
        this.baseDir = baseDir;
        this.extensions = extensions;
        this.shouldKeepExt = shouldKeepExt;
        // Note: create the folder in which we will store files
        filesystem_1.default.getDirectory(baseDir, true);
    }
    getLink(filePath) {
        if (!dom_utils_1.isFirefox()) {
            const tmp = web_extension_1.default.extension.getURL('temporary');
            const link = `filesystem:${tmp}/${this.filePath(filePath)}`;
            return Promise.resolve(link + '?' + new Date().getTime());
        }
        else {
            // Note: Except for Chrome, the filesystem API we use is a polyfill from idb.filesystem.js
            // idb.filesystem.js works great but the only problem is that you can't use 'filesystem:' schema to retrieve that file
            // so here, we have to convert the file to data url
            return this.read(filePath, 'DataURL');
        }
    }
    read(filePath, type) {
        const fullPath = this.filePath(filePath);
        const relativePath = path_1.posix.relative(this.dirPath('/'), fullPath);
        return filesystem_1.default.readFile(fullPath, type)
            .then(intermediate => this.decode(intermediate, relativePath, type), error => {
            if (error.message.indexOf("A requested file or directory could not be found") !== -1) {
                throw new Error(`File not found: ${filePath}`);
            }
            return Promise.reject(error);
        });
    }
    stat(entryPath, isDir) {
        const name = path_1.posix.basename(entryPath);
        const dir = path_1.posix.dirname(entryPath);
        const fullPath = isDir ? this.dirPath(entryPath) : this.filePath(entryPath);
        const relativePath = path_1.posix.relative(this.dirPath('/'), fullPath);
        return filesystem_1.default.existsStat(fullPath)
            .then(({ isFile, isDirectory }) => {
            // Note: idb.filesystem.js (we use it as polyfill for firefox) doesn't support getMetadata on folder yet
            // so we simply set size/lastModified to empty value for now.
            if (!isFile) {
                return {
                    dir,
                    name,
                    fullPath,
                    relativePath,
                    isFile,
                    isDirectory,
                    size: 0,
                    lastModified: new Date(0)
                };
            }
            return filesystem_1.default.getMetadata(fullPath, isDirectory)
                .then((meta) => {
                return {
                    dir,
                    name,
                    fullPath,
                    relativePath,
                    isFile,
                    isDirectory,
                    size: meta.size,
                    lastModified: meta.modificationTime
                };
            });
        });
    }
    __list(directoryPath = '/', brief = false) {
        // TODO: Ignore brief param for browser fs for now
        const convertName = (entryName, isDirectory) => {
            return this.shouldKeepExt || isDirectory ? entryName : this.removeExt(entryName);
        };
        return this.ensureBaseDir()
            .then(() => filesystem_1.default.list(this.dirPath(directoryPath)))
            .then(fileEntries => {
            const ps = fileEntries.map(fileEntry => {
                return this.stat(fileEntry.fullPath, fileEntry.isDirectory)
                    .then((stat) => (Object.assign(Object.assign({}, stat), { name: this.transformFileName(convertName(stat.name, fileEntry.isDirectory)) })));
            });
            return Promise.all(ps)
                .then(list => {
                list.sort((a, b) => {
                    if (a.name < b.name)
                        return -1;
                    if (a.name > b.name)
                        return 1;
                    return 0;
                });
                this.totalCount = list.length;
                this.displayedCount = list.length;
                return list;
            });
        });
    }
    __write(filePath, content) {
        return this.ensureBaseDir()
            .then(() => this.remove(filePath))
            .catch(() => { })
            .then(() => this.encode(content, filePath))
            .then((encodedContent) => filesystem_1.default.writeFile(this.filePath(filePath, true), encodedContent))
            .then(() => { });
    }
    __overwrite(filePath, content) {
        return this.__write(filePath, content);
    }
    __removeFile(filePath) {
        return filesystem_1.default.removeFile(this.filePath(filePath));
    }
    __removeEmptyDirectory(directoryPath) {
        return filesystem_1.default.rmdir(this.dirPath(directoryPath));
    }
    __moveFile(filePath, newPath) {
        return filesystem_1.default.moveFile(this.filePath(filePath), this.filePath(newPath, true))
            .then(() => { });
    }
    __copyFile(filePath, newPath) {
        return filesystem_1.default.copyFile(this.filePath(filePath), this.filePath(newPath, true))
            .then(() => { });
    }
    __createDirectory(directoryPath) {
        return filesystem_1.default.getDirectory(this.dirPath(directoryPath, true), true)
            .then(() => { });
    }
    dirPath(dir, shouldSanitize = false) {
        const path = this.getPathLib();
        const absPath = (() => {
            if (this.isStartWithBaseDir(dir)) {
                return dir;
            }
            else {
                return path.join('/', this.baseDir, dir);
            }
        })();
        const dirName = path.dirname(absPath);
        const baseName = path.basename(absPath);
        const sanitized = shouldSanitize ? utils_1.sanitizeFileName(baseName) : baseName;
        return path.join(dirName, sanitized);
    }
    isWin32Path() {
        return false;
    }
    filePath(filePath, shouldSanitize = false) {
        const dirName = path_1.posix.dirname(filePath);
        const baseName = path_1.posix.basename(filePath);
        const sanitized = shouldSanitize ? utils_1.sanitizeFileName(baseName) : baseName;
        const existingExt = path_1.posix.extname(baseName);
        const ext = this.extensions[0];
        const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized : (sanitized + '.' + ext);
        if (this.isStartWithBaseDir(dirName)) {
            return path_1.posix.join(dirName, this.transformFileName(finalFileName));
        }
        else {
            return path_1.posix.join('/', this.baseDir, dirName, this.transformFileName(finalFileName));
        }
    }
    isStartWithBaseDir(str) {
        return str.indexOf('/' + this.baseDir) === 0;
    }
    ensureBaseDir() {
        return filesystem_1.default.ensureDirectory(this.baseDir)
            .then(() => { });
    }
    removeExt(fileNameWithExt) {
        const name = path_1.posix.basename(fileNameWithExt);
        const ext = path_1.posix.extname(fileNameWithExt);
        const i = name.lastIndexOf(ext);
        return name.substring(0, i);
    }
}
exports.BrowserFileSystemStandardStorage = BrowserFileSystemStandardStorage;
exports.getBrowserFileSystemStandardStorage = ts_utils_1.singletonGetterByKey((opts) => {
    return (opts && opts.baseDir) || 'share';
}, (opts) => {
    return new BrowserFileSystemStandardStorage(opts);
});


/***/ }),

/***/ 122:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ts_utils_1 = __webpack_require__(12);
// reference: https://nodejs.org/api/errors.html#errors_common_system_errors
exports.EACCES = ts_utils_1.errorClassFactory('EACCES');
exports.EEXIST = ts_utils_1.errorClassFactory('EEXIST');
exports.EISDIR = ts_utils_1.errorClassFactory('EISDIR');
exports.EMFILE = ts_utils_1.errorClassFactory('EMFILE');
exports.ENOENT = ts_utils_1.errorClassFactory('ENOENT');
exports.ENOTDIR = ts_utils_1.errorClassFactory('ENOTDIR');
exports.ENOTEMPTY = ts_utils_1.errorClassFactory('ENOTEMPTY');


/***/ }),

/***/ 123:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(__webpack_require__(27));
const standard_storage_1 = __webpack_require__(89);
const utils_1 = __webpack_require__(4);
const filesystem_1 = __webpack_require__(60);
const native_filesystem_storage_1 = __webpack_require__(128);
const ts_utils_1 = __webpack_require__(12);
class NativeFileSystemStandardStorage extends standard_storage_1.StandardStorage {
    constructor(opts) {
        super({
            encode: opts.encode,
            decode: opts.decode,
            listFilter: opts.listFilter
        });
        const { baseDir, rootDir, extensions, shouldKeepExt = false, allowAbsoluteFilePath = false } = opts;
        if (!baseDir || baseDir === '/') {
            throw new Error(`Invalid baseDir, ${baseDir}`);
        }
        this.rootDir = rootDir;
        this.baseDir = baseDir;
        this.extensions = extensions;
        this.shouldKeepExt = shouldKeepExt;
        this.allowAbsoluteFilePath = allowAbsoluteFilePath;
        this.fs = filesystem_1.getNativeFileSystemAPI();
    }
    getLink(fileName) {
        return this.read(fileName, 'DataURL');
    }
    read(filePath, type) {
        const fullPath = this.filePath(filePath);
        const relativePath = path_1.default.relative(this.dirPath('/'), fullPath);
        const onResolve = (res) => {
            if (res.errorCode !== 0 /* Succeeded */) {
                throw new native_filesystem_storage_1.ErrorWithCode(`${filePath}: ` + native_filesystem_storage_1.getErrorMessageForCode(res.errorCode), res.errorCode);
            }
            const rawContent = res.content;
            const intermediate = (() => {
                switch (type) {
                    case 'Text':
                    case 'DataURL':
                        return rawContent;
                    case 'ArrayBuffer':
                        return utils_1.dataURItoArrayBuffer(rawContent);
                    case 'BinaryString':
                        return utils_1.arrayBufferToString(utils_1.dataURItoArrayBuffer(rawContent));
                }
            })();
            return this.decode(intermediate, relativePath, type);
        };
        switch (type) {
            case 'Text':
                return this.fs.readAllTextCompat({
                    path: fullPath
                })
                    .then(onResolve);
            default:
                return this.fs.readAllBytesCompat({
                    path: fullPath
                })
                    .then(onResolve);
        }
    }
    stat(entryPath, isDirectory) {
        const dir = path_1.default.dirname(entryPath);
        const name = path_1.default.basename(entryPath);
        const fullPath = isDirectory ? this.dirPath(entryPath) : this.filePath(entryPath);
        const relativePath = path_1.default.relative(this.dirPath('/'), fullPath);
        const noEntry = {
            dir,
            name,
            fullPath,
            relativePath,
            isFile: false,
            isDirectory: false,
            lastModified: new Date(0),
            size: 0
        };
        const pExists = isDirectory ? this.fs.directoryExists({ path: fullPath })
            : this.fs.fileExists({ path: fullPath });
        return pExists.then(exists => {
            if (!exists) {
                return noEntry;
            }
            return this.fs.getFileSystemEntryInfo({ path: fullPath })
                .then((info) => {
                return {
                    dir,
                    name,
                    fullPath,
                    relativePath,
                    isFile: !info.isDirectory,
                    isDirectory: info.isDirectory,
                    lastModified: new Date(info.lastWriteTime),
                    size: info.length
                };
            }, (e) => {
                return noEntry;
            });
        });
    }
    __list(directoryPath = '/', brief = false) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.getEntries({
                brief,
                path: this.dirPath(directoryPath),
                extensions: this.extensions,
            })
                .then(data => {
                const entries = data.entries;
                const errorCode = data.errorCode;
                if (errorCode !== 0 /* Succeeded */) {
                    throw new native_filesystem_storage_1.ErrorWithCode(native_filesystem_storage_1.getErrorMessageForCode(errorCode) + `: ${directoryPath}`, errorCode);
                }
                const convertName = (entryName, isDirectory) => {
                    return this.shouldKeepExt || isDirectory ? entryName : this.removeExt(entryName);
                };
                const convert = (entry) => {
                    const dir = this.dirPath(directoryPath);
                    const name = convertName(entry.name, entry.isDirectory);
                    const fullPath = path_1.default.join(dir, entry.name);
                    const relativePath = path_1.default.relative(this.dirPath('/'), fullPath);
                    return {
                        dir,
                        name,
                        fullPath,
                        relativePath,
                        isFile: !entry.isDirectory,
                        isDirectory: entry.isDirectory,
                        lastModified: new Date(entry.lastWriteTime),
                        size: entry.length
                    };
                };
                return entries.map(convert);
            });
        });
    }
    __write(filePath, content) {
        return this.ensureBaseDir()
            .then(() => this.encode(content, filePath))
            .then(encodedContent => {
            return this.fs.writeAllBytes({
                content: encodedContent,
                path: this.filePath(filePath, true),
            })
                .then(result => {
                if (!result) {
                    throw new Error(`Failed to write to '${filePath}'`);
                }
            });
        });
    }
    __overwrite(filePath, content) {
        return this.write(filePath, content);
    }
    __removeFile(filePath) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.deleteFile({
                path: this.filePath(filePath)
            })
                .then(() => { });
        });
    }
    __removeEmptyDirectory(directoryPath) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.removeDirectory({ path: this.dirPath(directoryPath) })
                .then(() => { });
        });
    }
    __moveFile(filePath, newPath) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.moveFile({
                sourcePath: this.filePath(filePath),
                targetPath: this.filePath(newPath, true)
            })
                .then(() => { });
        });
    }
    __copyFile(filePath, newPath) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.copyFile({
                sourcePath: this.filePath(filePath),
                targetPath: this.filePath(newPath, true)
            })
                .then(() => { });
        });
    }
    __createDirectory(directoryPath) {
        return this.ensureBaseDir()
            .then(() => {
            return this.fs.createDirectory({
                path: this.dirPath(directoryPath, true)
            })
                .then(() => { });
        });
    }
    dirPath(dir, shouldSanitize = false) {
        const path = this.getPathLib();
        const absPath = (() => {
            if (this.isStartWithBaseDir(dir)) {
                return path.normalize(dir);
            }
            else {
                return path.normalize(path.join(this.rootDir, this.baseDir, dir));
            }
        })();
        const dirName = path.dirname(absPath);
        const baseName = path.basename(absPath);
        const sanitized = shouldSanitize ? utils_1.sanitizeFileName(baseName) : baseName;
        return path.join(dirName, sanitized);
    }
    filePath(filePath, shouldSanitize = false) {
        const dirName = path_1.default.dirname(filePath);
        const baseName = path_1.default.basename(filePath);
        const sanitized = shouldSanitize ? utils_1.sanitizeFileName(baseName) : baseName;
        const existingExt = path_1.default.extname(baseName);
        const ext = this.extensions[0];
        const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized : (sanitized + '.' + ext);
        if (this.isStartWithBaseDir(dirName)) {
            return path_1.default.normalize(path_1.default.join(dirName, finalFileName));
        }
        else if (this.allowAbsoluteFilePath && this.isAbsoluteUrl(filePath)) {
            return path_1.default.normalize(path_1.default.join(dirName, finalFileName));
        }
        else {
            return path_1.default.normalize(path_1.default.join(this.rootDir, this.baseDir, dirName, finalFileName));
        }
    }
    isWin32Path() {
        return /^([A-Z]:\\|\/\/|\\\\)/i.test(this.rootDir);
    }
    isAbsoluteUrl(str) {
        const path = this.getPathLib();
        return path.isAbsolute(str);
    }
    isStartWithBaseDir(str) {
        return str.indexOf(this.rootDir) === 0;
    }
    removeExt(fileNameWithExt) {
        const name = path_1.default.basename(fileNameWithExt);
        const ext = path_1.default.extname(fileNameWithExt);
        const i = name.lastIndexOf(ext);
        return name.substring(0, i);
    }
    ensureBaseDir() {
        const fs = this.fs;
        const dir = path_1.default.normalize(path_1.default.join(this.rootDir, this.baseDir));
        return fs.directoryExists({
            path: dir
        })
            .then(existed => {
            if (existed)
                return existed;
            return fs.createDirectory({
                path: dir
            });
        })
            .then(() => { });
    }
}
exports.NativeFileSystemStandardStorage = NativeFileSystemStandardStorage;
exports.getNativeFileSystemStandardStorage = ts_utils_1.singletonGetterByKey((opts) => {
    return path_1.default.join(opts.rootDir, opts.baseDir);
}, (opts) => {
    return new NativeFileSystemStandardStorage(opts);
});


/***/ }),

/***/ 124:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Non-external method types which the user can use via UI.
 */
exports.PublicMethodTypes = [
    1 /* GetFileSystemEntries */,
    2 /* GetDirectories */,
    3 /* GetFiles */,
    4 /* DirectoryExists */,
    5 /* FileExists */,
    8 /* CreateDirectory */,
    9 /* RemoveDirectory */,
    10 /* CopyFile */,
    11 /* MoveFile */,
    12 /* DeleteFile */,
    13 /* ReadAllText */,
    14 /* WriteAllText */,
    15 /* AppendAllText */,
    16 /* ReadAllBytes */,
    17 /* WriteAllBytes */,
    18 /* AppendAllBytes */
];
exports.MethodTypeFriendlyNames = [
    "GetVersion",
    "GetFileSystemEntries",
    "GetDirectories",
    "GetFiles",
    "GetFileSystemEntryInfo",
    "GetSpecialFolderPath",
    "DirectoryExists",
    "FileExists",
    "CreateDirectory",
    "RemoveDirectory",
    "CopyFile",
    "MoveFile",
    "DeleteFile",
    "ReadAllText",
    "WriteAllText",
    "AppendAllText",
    "ReadAllBytes",
    "WriteAllBytes",
    "AppendAllBytes",
    "GetMaxFileRange",
    "GetFileSize",
    "ReadFileRange",
    "RunProcess"
];
exports.MethodTypeInvocationNames = [
    "get_version",
    "get_file_system_entries",
    "get_directories",
    "get_files",
    "get_file_system_entry_info",
    "get_special_folder_path",
    "directory_exists",
    "file_exists",
    "create_directory",
    "remove_directory",
    "copy_file",
    "move_file",
    "delete_file",
    "read_all_text",
    "write_all_text",
    "append_all_text",
    "read_all_bytes",
    "write_all_bytes",
    "append_all_bytes",
    "get_max_file_range",
    "get_file_size",
    "read_file_range",
    "run_process"
];


/***/ }),

/***/ 125:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const native_host_1 = __webpack_require__(97);
class KantuFileAccessHost extends native_host_1.NativeMessagingHost {
    constructor() {
        super(KantuFileAccessHost.HOST_NAME);
    }
}
exports.KantuFileAccessHost = KantuFileAccessHost;
KantuFileAccessHost.HOST_NAME = "com.a9t9.kantu.file_access";


/***/ }),

/***/ 126:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

// Adapted from: http://www.json.org/JSON_checker/utf8_decode.c
Object.defineProperty(exports, "__esModule", { value: true });
class Utf8Decoder {
    constructor(input) {
        this.input = input;
        this.position = 0;
    }
    /**
     * Gets the next byte.
     * @returns UTF8_END if there are no more bytes, next byte otherwise.
     */
    getNextByte() {
        if (this.position >= this.input.length) {
            return Utf8Decoder.END;
        }
        const c = this.input[this.position] & 0xff;
        ++this.position;
        return c;
    }
    /**
     *  Gets the 6-bit payload of the next continuation byte.
     * @returns Contination byte if it's valid, UTF8_ERROR otherwise.
     */
    getNextContinuationByte() {
        const c = this.getNextByte();
        return (c & 0xc0) == 0x80 ? c & 0x3f : Utf8Decoder.ERROR;
    }
    /**
     * Decodes next codepoint.
     * @returns `Utf8Decoder.END` for end of stream, next codepoint if it's valid, `Utf8Decoder.ERROR` otherwise.
     */
    decodeNext() {
        if (this.position >= this.input.length) {
            return this.position === this.input.length
                ? Utf8Decoder.END
                : Utf8Decoder.ERROR;
        }
        const c = this.getNextByte();
        // Zero continuation (0 to 127)
        if ((c & 0x80) == 0) {
            return c;
        }
        // One continuation (128 to 2047)
        if ((c & 0xe0) == 0xc0) {
            const c1 = this.getNextContinuationByte();
            if (c1 >= 0) {
                const r = ((c & 0x1f) << 6) | c1;
                if (r >= 128) {
                    return r;
                }
            }
            // Two continuations (2048 to 55295 and 57344 to 65535)
        }
        else if ((c & 0xf0) == 0xe0) {
            const c1 = this.getNextContinuationByte();
            const c2 = this.getNextContinuationByte();
            if ((c1 | c2) >= 0) {
                const r = ((c & 0x0f) << 12) | (c1 << 6) | c2;
                if (r >= 2048 && (r < 55296 || r > 57343)) {
                    return r;
                }
            }
            // Three continuations (65536 to 1114111)
        }
        else if ((c & 0xf8) == 0xf0) {
            const c1 = this.getNextContinuationByte();
            const c2 = this.getNextContinuationByte();
            const c3 = this.getNextContinuationByte();
            if ((c1 | c2 | c3) >= 0) {
                const r = ((c & 0x07) << 18) | (c1 << 12) | (c2 << 6) | c3;
                if (r >= 65536 && r <= 1114111) {
                    return r;
                }
            }
        }
        return Utf8Decoder.ERROR;
    }
}
Utf8Decoder.REPLACEMENT_CHARACTER = "\uFFFD";
Utf8Decoder.END = -1;
Utf8Decoder.ERROR = -2;
var utf8;
(function (utf8) {
    function isValid(input) {
        const decoder = new Utf8Decoder(input);
        while (true) {
            const cp = decoder.decodeNext();
            switch (cp) {
                case Utf8Decoder.END:
                    return true;
                case Utf8Decoder.ERROR:
                    return false;
                default:
                // ignore
            }
        }
    }
    utf8.isValid = isValid;
    function decode(input) {
        const decoder = new Utf8Decoder(input);
        let output = "";
        while (true) {
            const cp = decoder.decodeNext();
            if (cp === Utf8Decoder.END) {
                break;
            }
            output +=
                cp !== Utf8Decoder.ERROR
                    ? String.fromCodePoint(cp)
                    : Utf8Decoder.REPLACEMENT_CHARACTER;
        }
        return output;
    }
    utf8.decode = decode;
})(utf8 = exports.utf8 || (exports.utf8 = {}));


/***/ }),

/***/ 127:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var base64;
(function (base64) {
    // prettier-ignore
    const encodingTable = new Uint8Array([
        65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
        97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
        48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
    ]);
    // prettier-ignore
    const decodingTable = new Uint8Array([
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
        52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
        -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
        15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
        -1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
        41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
        -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
    ]);
    const paddingChar = 61;
    function calculateEncodedLength(length) {
        let result = Math.trunc(length / 3) * 4;
        result += length % 3 != 0 ? 4 : 0;
        return result;
    }
    function readWord(input, i, maxLength) {
        if (maxLength > 4) {
            throw new Error("maxLength should be in range [0, 4].");
        }
        const t = new Uint8Array(4);
        for (let k = 0; k < maxLength; ++k) {
            const c = input.charCodeAt(i + k);
            const b = decodingTable[c];
            if (b === 0xff) {
                return undefined;
            }
            t[k] = b;
        }
        return ((t[0] << (3 * 6)) +
            (t[1] << (2 * 6)) +
            (t[2] << (1 * 6)) +
            (t[3] << (0 * 6)));
    }
    function writeWord(output, i, triple) {
        output[i + 0] = (triple >> 16) & 0xff;
        output[i + 1] = (triple >> 8) & 0xff;
        output[i + 2] = triple & 0xff;
    }
    function encode(input) {
        const inLen = input.length;
        const outLen = calculateEncodedLength(inLen);
        const lengthMod3 = inLen % 3;
        const calcLength = inLen - lengthMod3;
        const output = new Uint8Array(outLen);
        let i;
        let j = 0;
        for (i = 0; i < calcLength; i += 3) {
            output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
            output[j + 1] =
                encodingTable[((input[i] & 0x03) << 4) | ((input[i + 1] & 0xf0) >> 4)];
            output[j + 2] =
                encodingTable[((input[i + 1] & 0x0f) << 2) | ((input[i + 2] & 0xc0) >> 6)];
            output[j + 3] = encodingTable[input[i + 2] & 0x3f];
            j += 4;
        }
        i = calcLength;
        switch (lengthMod3) {
            case 2: // One character padding needed
                output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
                output[j + 1] =
                    encodingTable[((input[i] & 0x03) << 4) | ((input[i + 1] & 0xf0) >> 4)];
                output[j + 2] = encodingTable[(input[i + 1] & 0x0f) << 2];
                output[j + 3] = paddingChar;
                j += 4;
                break;
            case 1: // Two character padding needed
                output[j + 0] = encodingTable[(input[i] & 0xfc) >> 2];
                output[j + 1] = encodingTable[(input[i] & 0x03) << 4];
                output[j + 2] = paddingChar;
                output[j + 3] = paddingChar;
                j += 4;
                break;
        }
        const decoder = new TextDecoder("ascii");
        return decoder.decode(output);
    }
    base64.encode = encode;
    function decode(input) {
        const inLen = input.length;
        if (inLen % 4 != 0) {
            return undefined;
        }
        let padding = 0;
        if (inLen > 0 && input.charCodeAt(inLen - 1) == paddingChar) {
            ++padding;
            if (inLen > 1 && input.charCodeAt(inLen - 2) == paddingChar) {
                ++padding;
            }
        }
        const encodedLen = inLen - padding;
        const completeLen = encodedLen & ~3;
        const outLen = (6 * inLen) / 8 - padding;
        const output = new Uint8Array(outLen);
        let triple;
        let i = 0;
        let j = 0;
        while (i < completeLen) {
            triple = readWord(input, i, 4);
            if (typeof triple === "undefined") {
                return undefined;
            }
            writeWord(output, j, triple);
            i += 4;
            j += 3;
        }
        if (padding > 0) {
            triple = readWord(input, i, 4 - padding);
            if (typeof triple === "undefined") {
                return undefined;
            }
            switch (padding) {
                case 1:
                    output[j + 0] = (triple >> 16) & 0xff;
                    output[j + 1] = (triple >> 8) & 0xff;
                    break;
                case 2:
                    output[j + 0] = (triple >> 16) & 0xff;
                    break;
            }
        }
        return output;
    }
    base64.decode = decode;
})(base64 = exports.base64 || (exports.base64 = {}));


/***/ }),

/***/ 128:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = __webpack_require__(76);
const filesystem_1 = __webpack_require__(60);
const path_1 = __importDefault(__webpack_require__(27));
const utils_1 = __webpack_require__(4);
const ts_utils_1 = __webpack_require__(12);
class NativeFileSystemFlatStorage extends storage_1.FlatStorage {
    constructor(opts) {
        super({
            encode: opts.encode,
            decode: opts.decode
        });
        this.listFilter = (list) => list;
        this.displayedCount = 0;
        this.totalCount = 0;
        const { baseDir, rootDir, extensions, shouldKeepExt = false, listFilter } = opts;
        if (!baseDir || baseDir === '/') {
            throw new Error(`Invalid baseDir, ${baseDir}`);
        }
        this.rootDir = rootDir;
        this.baseDir = baseDir;
        this.extensions = extensions;
        this.shouldKeepExt = shouldKeepExt;
        if (listFilter) {
            this.listFilter = listFilter;
        }
        this.fs = filesystem_1.getNativeFileSystemAPI();
    }
    getDisplayCount() {
        return this.displayedCount;
    }
    getTotalCount() {
        return this.totalCount;
    }
    readAll(readFileType = 'Text', onErrorFiles) {
        return this.list()
            .then(items => {
            return Promise.all(items.map(item => {
                return this.read(item.fileName, readFileType)
                    .then(content => ({
                    content,
                    fileName: item.fileName
                }))
                    // Note: Whenever there is error in reading file,
                    // return null
                    .catch(e => ({
                    fileName: item.fileName,
                    fullFilePath: this.filePath(item.fileName),
                    error: new Error(`Error in parsing ${this.filePath(item.fileName)}:\n${e.message}`)
                }));
            }))
                .then(list => {
                const errorFiles = list.filter(item => item.error);
                if (onErrorFiles)
                    onErrorFiles(errorFiles);
                return list.filter((item) => item.content);
            });
        });
    }
    getLink(fileName) {
        return this.read(fileName, 'DataURL');
    }
    __list() {
        return this.ensureDir()
            .then(() => {
            return this.fs.getEntries({
                path: path_1.default.join(this.rootDir, this.baseDir),
                extensions: this.extensions
            })
                .then(data => {
                const entries = data.entries;
                const errorCode = data.errorCode;
                if (errorCode !== 0 /* Succeeded */) {
                    throw new ErrorWithCode(getErrorMessageForCode(errorCode), errorCode);
                }
                const convertName = (entryName) => this.shouldKeepExt ? entryName : this.removeExt(entryName);
                const convert = (entry) => {
                    return {
                        dir: this.baseDir,
                        fileName: convertName(entry.name),
                        lastModified: new Date(entry.lastWriteTime),
                        size: storage_1.readableSize(entry.length)
                    };
                };
                const allList = entries.map(convert);
                return Promise.resolve(this.listFilter(allList))
                    .then(displayList => {
                    this.totalCount = allList.length;
                    this.displayedCount = displayList.length;
                    return displayList;
                });
            });
        });
    }
    exists(fileName) {
        return this.fs.fileExists({
            path: this.filePath(fileName)
        });
    }
    read(fileName, type) {
        const onResolve = (res) => {
            if (res.errorCode !== 0 /* Succeeded */) {
                throw new ErrorWithCode(`${fileName}: ` + getErrorMessageForCode(res.errorCode), res.errorCode);
            }
            const rawContent = res.content;
            const intermediate = (() => {
                switch (type) {
                    case 'Text':
                    case 'DataURL':
                        return rawContent;
                    case 'ArrayBuffer':
                        return utils_1.dataURItoArrayBuffer(rawContent);
                    case 'BinaryString':
                        return utils_1.arrayBufferToString(utils_1.dataURItoArrayBuffer(rawContent));
                }
            })();
            return this.decode(intermediate, fileName);
        };
        switch (type) {
            case 'Text':
                return this.fs.readAllTextCompat({
                    path: this.filePath(fileName)
                })
                    .then(onResolve);
            default:
                return this.fs.readAllBytesCompat({
                    path: this.filePath(fileName)
                })
                    .then(onResolve);
        }
    }
    __write(fileName, content) {
        return this.ensureDir()
            .then(() => this.encode(content, fileName))
            .then(encodedContent => {
            return this.fs.writeAllBytes({
                content: encodedContent,
                path: this.filePath(fileName, true),
            })
                .then(result => {
                if (!result) {
                    throw new Error(`Failed to write to '${fileName}'`);
                }
            });
        });
    }
    __overwrite(fileName, content) {
        return this.remove(fileName)
            .catch(() => { })
            .then(() => this.write(fileName, content));
    }
    __clear() {
        return this.list()
            .then(list => {
            const ps = list.map(file => {
                return this.remove(file.fileName);
            });
            return Promise.all(ps);
        })
            .then(() => { });
    }
    __remove(fileName) {
        return this.ensureDir()
            .then(() => {
            return this.fs.deleteFile({
                path: this.filePath(fileName)
            })
                .then(() => { });
        });
    }
    __rename(fileName, newName) {
        return this.ensureDir()
            .then(() => {
            return this.fs.moveFile({
                sourcePath: this.filePath(fileName),
                targetPath: this.filePath(newName, true)
            })
                .then(() => { });
        });
    }
    __copy(fileName, newName) {
        return this.ensureDir()
            .then(() => {
            return this.fs.copyFile({
                sourcePath: this.filePath(fileName),
                targetPath: this.filePath(newName, true)
            })
                .then(() => { });
        });
    }
    filePath(fileName, shouldSanitize = false) {
        const sanitized = shouldSanitize ? utils_1.sanitizeFileName(fileName) : fileName;
        const existingExt = path_1.default.extname(fileName);
        const ext = this.extensions[0];
        const finalFileName = existingExt && existingExt.substr(1).toLowerCase() === ext.toLowerCase() ? sanitized : (sanitized + '.' + ext);
        return path_1.default.join(this.rootDir, this.baseDir, finalFileName);
    }
    removeExt(fileNameWithExt) {
        const name = path_1.default.basename(fileNameWithExt);
        const ext = path_1.default.extname(fileNameWithExt);
        const i = name.lastIndexOf(ext);
        return name.substring(0, i);
    }
    ensureDir() {
        const fs = this.fs;
        const dir = path_1.default.join(this.rootDir, this.baseDir);
        return fs.directoryExists({
            path: dir
        })
            .then(existed => {
            if (existed)
                return existed;
            return fs.createDirectory({
                path: dir
            });
        })
            .then(() => { });
    }
}
exports.NativeFileSystemFlatStorage = NativeFileSystemFlatStorage;
exports.getNativeFileSystemFlatStorage = ts_utils_1.singletonGetterByKey((opts) => {
    return path_1.default.join(opts.rootDir, opts.baseDir);
}, (opts) => {
    return new NativeFileSystemFlatStorage(opts);
});
class ErrorWithCode extends Error {
    constructor(message, code) {
        super(message);
        this.name = 'ErrorWithCode';
        this.code = code;
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
exports.ErrorWithCode = ErrorWithCode;
function getErrorMessageForCode(code) {
    switch (code) {
        case 0 /* Succeeded */:
            return 'Success';
        case 1 /* Failed */:
            return 'Failed to load';
        case 2 /* Truncated */:
            return 'File too large to load';
        default:
            return `Unknown error code: ${code}`;
    }
}
exports.getErrorMessageForCode = getErrorMessageForCode;


/***/ }),

/***/ 13:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(__webpack_require__(81));
const browser_filesystem_storage_1 = __webpack_require__(121);
const native_filesystem_storage_1 = __webpack_require__(123);
const ts_utils_1 = __webpack_require__(12);
const xfile_1 = __webpack_require__(32);
const convert_utils_1 = __webpack_require__(50);
const convert_suite_utils_1 = __webpack_require__(69);
const utils_1 = __webpack_require__(4);
const path_1 = __importDefault(__webpack_require__(27));
var StorageStrategyType;
(function (StorageStrategyType) {
    StorageStrategyType["Browser"] = "browser";
    StorageStrategyType["XFile"] = "xfile";
    StorageStrategyType["Nil"] = "nil";
})(StorageStrategyType = exports.StorageStrategyType || (exports.StorageStrategyType = {}));
var StorageTarget;
(function (StorageTarget) {
    StorageTarget[StorageTarget["Macro"] = 0] = "Macro";
    StorageTarget[StorageTarget["TestSuite"] = 1] = "TestSuite";
    StorageTarget[StorageTarget["CSV"] = 2] = "CSV";
    StorageTarget[StorageTarget["Screenshot"] = 3] = "Screenshot";
    StorageTarget[StorageTarget["Vision"] = 4] = "Vision";
})(StorageTarget = exports.StorageTarget || (exports.StorageTarget = {}));
var StorageManagerEvent;
(function (StorageManagerEvent) {
    StorageManagerEvent["StrategyTypeChanged"] = "StrategyTypeChanged";
    StorageManagerEvent["RootDirChanged"] = "RootDirChanged";
    StorageManagerEvent["ForceReload"] = "ForceReload";
})(StorageManagerEvent = exports.StorageManagerEvent || (exports.StorageManagerEvent = {}));
class StorageManager extends eventemitter3_1.default {
    constructor(strategyType, extraOptions) {
        super();
        this.strategyType = StorageStrategyType.Nil;
        this.getMacros = () => [];
        this.getMaxMacroCount = (s) => Promise.resolve(Infinity);
        this.setCurrentStrategyType(strategyType);
        if (extraOptions && extraOptions.getMacros) {
            this.getMacros = extraOptions.getMacros;
        }
        if (extraOptions && extraOptions.getMaxMacroCount) {
            this.getMaxMacroCount = extraOptions.getMaxMacroCount;
        }
        this.getConfig = extraOptions === null || extraOptions === void 0 ? void 0 : extraOptions.getConfig;
    }
    isXFileMode() {
        return this.strategyType === StorageStrategyType.XFile;
    }
    isBrowserMode() {
        return this.strategyType === StorageStrategyType.Browser;
    }
    getCurrentStrategyType() {
        return this.strategyType;
    }
    setCurrentStrategyType(type) {
        const needChange = type !== this.strategyType;
        if (needChange) {
            setTimeout(() => {
                this.emit(StorageManagerEvent.StrategyTypeChanged, type);
            }, 0);
            this.strategyType = type;
        }
        return needChange;
    }
    isStrategyTypeAvailable(type) {
        switch (type) {
            case StorageStrategyType.Browser:
                return Promise.resolve(true);
            case StorageStrategyType.XFile:
                return xfile_1.getXFile().sanityCheck();
            default:
                throw new Error(`type '${type}' is not supported`);
        }
    }
    getStorageForTarget(target, forceStrategytype) {
        switch (forceStrategytype || this.strategyType) {
            case StorageStrategyType.Browser: {
                switch (target) {
                    case StorageTarget.Macro: {
                        const storage = browser_filesystem_storage_1.getBrowserFileSystemStandardStorage({
                            baseDir: 'macros',
                            extensions: ['json'],
                            shouldKeepExt: false,
                            decode: (text, filePath) => {
                                const obj = convert_utils_1.fromJSONString(text, path_1.default.basename(filePath), { withStatus: true });
                                // Note: use filePath as id
                                return Object.assign(Object.assign({}, obj), { id: storage.filePath(filePath), path: storage.relativePath(filePath) });
                            },
                            encode: (data, fileName) => {
                                var _a, _b;
                                const str = convert_utils_1.toJSONString(Object.assign(Object.assign({}, data), { commands: data.data.commands }), {
                                    withStatus: true,
                                    ignoreTargetOptions: !!((_b = (_a = this.getConfig) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.saveAlternativeLocators)
                                });
                                // Note: BrowserFileSystemStorage only supports writing file with Blob
                                // so have to convert it here in `encode`
                                return new Blob([str]);
                            }
                        });
                        window.newMacroStorage = storage;
                        return storage;
                    }
                    case StorageTarget.TestSuite: {
                        const storage = browser_filesystem_storage_1.getBrowserFileSystemStandardStorage({
                            baseDir: 'testsuites',
                            extensions: ['json'],
                            shouldKeepExt: false,
                            decode: (text, filePath) => {
                                console.log('test suite raw content', filePath, text, this.getMacros());
                                const obj = convert_suite_utils_1.parseTestSuite(text, { fileName: path_1.default.basename(filePath) });
                                // Note: use filePath as id
                                return Object.assign(Object.assign({}, obj), { id: storage.filePath(filePath), path: storage.relativePath(filePath) });
                            },
                            encode: (suite, fileName) => {
                                const str = convert_suite_utils_1.stringifyTestSuite(suite);
                                return new Blob([str]);
                            }
                        });
                        window.newTestSuiteStorage = storage;
                        return storage;
                    }
                    case StorageTarget.CSV:
                        return browser_filesystem_storage_1.getBrowserFileSystemStandardStorage({
                            baseDir: 'spreadsheets',
                            extensions: ['csv'],
                            shouldKeepExt: true,
                            transformFileName: (path) => {
                                return path.toLowerCase();
                            }
                        });
                    case StorageTarget.Screenshot:
                        return browser_filesystem_storage_1.getBrowserFileSystemStandardStorage({
                            baseDir: 'screenshots',
                            extensions: ['png'],
                            shouldKeepExt: true,
                            transformFileName: (path) => {
                                return path.toLowerCase();
                            }
                        });
                    case StorageTarget.Vision:
                        return browser_filesystem_storage_1.getBrowserFileSystemStandardStorage({
                            baseDir: 'visions',
                            extensions: ['png'],
                            shouldKeepExt: true,
                            transformFileName: (path) => {
                                return path.toLowerCase();
                            }
                        });
                }
            }
            case StorageStrategyType.XFile: {
                const { rootDir } = xfile_1.getXFile().getCachedConfig();
                switch (target) {
                    case StorageTarget.Macro: {
                        const storage = native_filesystem_storage_1.getNativeFileSystemStandardStorage({
                            rootDir,
                            baseDir: 'macros',
                            extensions: ['json'],
                            shouldKeepExt: false,
                            listFilter: (entryNodes) => {
                                return this.getMaxMacroCount(this.strategyType)
                                    .then(maxCount => {
                                    return ts_utils_1.forestSlice(maxCount, entryNodes);
                                });
                            },
                            decode: (text, filePath) => {
                                const obj = convert_utils_1.fromJSONString(text, path_1.default.basename(filePath), { withStatus: true });
                                // Note: use filePath as id
                                return Object.assign(Object.assign({}, obj), { id: storage.filePath(filePath), path: storage.relativePath(filePath) });
                            },
                            encode: (data, fileName) => {
                                const str = convert_utils_1.toJSONString(Object.assign(Object.assign({}, data), { commands: data.data.commands }), { withStatus: true });
                                // Note: NativeFileSystemStorage only supports writing file with DataURL
                                // so have to convert it here in `encode`
                                return utils_1.blobToDataURL(new Blob([str]));
                            }
                        });
                        return storage;
                    }
                    case StorageTarget.TestSuite: {
                        const storage = native_filesystem_storage_1.getNativeFileSystemStandardStorage({
                            rootDir,
                            baseDir: 'testsuites',
                            extensions: ['json'],
                            shouldKeepExt: false,
                            decode: (text, filePath) => {
                                const obj = convert_suite_utils_1.parseTestSuite(text, { fileName: path_1.default.basename(filePath) });
                                // Note: use filePath as id
                                return Object.assign(Object.assign({}, obj), { id: storage.filePath(filePath), path: storage.relativePath(filePath) });
                            },
                            encode: (suite, fileName) => {
                                const str = convert_suite_utils_1.stringifyTestSuite(suite);
                                return utils_1.blobToDataURL(new Blob([str]));
                            }
                        });
                        return storage;
                    }
                    case StorageTarget.CSV:
                        return native_filesystem_storage_1.getNativeFileSystemStandardStorage({
                            rootDir,
                            baseDir: 'datasources',
                            extensions: ['csv'],
                            shouldKeepExt: true,
                            allowAbsoluteFilePath: true,
                            encode: ((text, fileName) => {
                                return utils_1.blobToDataURL(new Blob([text]));
                            })
                        });
                    case StorageTarget.Vision:
                        return native_filesystem_storage_1.getNativeFileSystemStandardStorage({
                            rootDir,
                            baseDir: 'images',
                            extensions: ['png'],
                            shouldKeepExt: true,
                            decode: xFileDecodeImage,
                            encode: ((imageBlob, fileName) => {
                                return utils_1.blobToDataURL(imageBlob);
                            })
                        });
                    case StorageTarget.Screenshot:
                        return native_filesystem_storage_1.getNativeFileSystemStandardStorage({
                            rootDir,
                            baseDir: 'screenshots',
                            extensions: ['png'],
                            shouldKeepExt: true,
                            decode: xFileDecodeImage,
                            encode: ((imageBlob, fileName) => {
                                return utils_1.blobToDataURL(imageBlob);
                            })
                        });
                }
            }
            default:
                throw new Error(`Unsupported strategy type: '${this.strategyType}'`);
        }
    }
    getMacroStorage() {
        return this.getStorageForTarget(StorageTarget.Macro);
    }
    getTestSuiteStorage() {
        return this.getStorageForTarget(StorageTarget.TestSuite);
    }
    getCSVStorage() {
        return this.getStorageForTarget(StorageTarget.CSV);
    }
    getVisionStorage() {
        return this.getStorageForTarget(StorageTarget.Vision);
    }
    getScreenshotStorage() {
        return this.getStorageForTarget(StorageTarget.Screenshot);
    }
}
exports.StorageManager = StorageManager;
function xFileDecodeImage(data, fileName, readFileType) {
    if (readFileType !== 'DataURL') {
        return data;
    }
    if (data.substr(0, 11) === 'data:image') {
        return data;
    }
    return 'data:image/png;base64,' + data;
}
// Note: in panel window (`src/index.js`), `getStorageManager` is provided with `getMacros` in `extraOptions`
// While in `bg.js` or `csv_edtior.js`, `vision_editor.js`, `extraOptions` is omitted with no harm,
// because they don't read/write test suites
exports.getStorageManager = ts_utils_1.singletonGetter((strategyType, extraOptions) => {
    return new StorageManager(strategyType || StorageStrategyType.XFile, extraOptions);
});


/***/ }),

/***/ 20:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _ipc_bg_cs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(93);


var throwNotTop = function throwNotTop() {
  throw new Error('You are not a top window, not allowed to initialize/use csIpc');
};

// Note: csIpc is only available to top window
var ipc = window.top === window ? Object(_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_0__["csInit"])() : {
  ask: throwNotTop,
  send: throwNotTop,
  onAsk: throwNotTop,
  destroy: throwNotTop

  // Note: one ipc singleton per content script
};/* harmony default export */ __webpack_exports__["default"] = (ipc);

/***/ }),

/***/ 22:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = __webpack_require__(4);
exports.getStyle = function (dom) {
    if (!dom)
        throw new Error('getStyle: dom does not exist');
    return getComputedStyle(dom);
};
exports.setStyle = function (dom, style) {
    if (!dom)
        throw new Error('setStyle: dom does not exist');
    for (var i = 0, keys = Object.keys(style), len = keys.length; i < len; i++) {
        dom.style[keys[i]] = style[keys[i]];
    }
    return dom;
};
exports.pixel = function (num) {
    if ((num + '').indexOf('px') !== -1)
        return num;
    return (num || 0) + 'px';
};
exports.bindDrag = (options) => {
    const { onDragStart, onDragEnd, onDrag, $el, preventGlobalClick = true, doc = document } = options;
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    const onMouseDown = (e) => {
        isDragging = true;
        startPos = { x: e.screenX, y: e.screenY };
        onDragStart(e);
    };
    const onMouseUp = (e) => {
        if (!isDragging)
            return;
        isDragging = false;
        const dx = e.screenX - startPos.x;
        const dy = e.screenY - startPos.y;
        onDragEnd(e, { dx, dy });
    };
    const onMouseMove = (e) => {
        if (!isDragging)
            return;
        const dx = e.screenX - startPos.x;
        const dy = e.screenY - startPos.y;
        onDrag(e, { dx, dy });
        e.preventDefault();
        e.stopPropagation();
    };
    const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };
    if (preventGlobalClick) {
        doc.addEventListener('click', onClick, true);
    }
    doc.addEventListener('mousemove', onMouseMove, true);
    doc.addEventListener('mouseup', onMouseUp, true);
    $el.addEventListener('mousedown', onMouseDown, true);
    return () => {
        doc.removeEventListener('click', onClick, true);
        doc.removeEventListener('mousemove', onMouseMove, true);
        doc.removeEventListener('mouseup', onMouseUp, true);
        $el.removeEventListener('mousedown', onMouseDown, true);
    };
};
exports.bindContentEditableChange = (options) => {
    const { onChange, doc = document } = options;
    let currentCE = null;
    let oldContent = null;
    const onFocus = (e) => {
        if (!e.target || e.target.contentEditable !== 'true')
            return;
        currentCE = e.target;
        oldContent = currentCE.innerHTML;
    };
    const onBlur = (e) => {
        if (e.target !== currentCE) {
            // Do nothing
        }
        else if (currentCE && currentCE.innerHTML !== oldContent) {
            onChange(e);
        }
        currentCE = null;
        oldContent = null;
    };
    doc.addEventListener('focus', onFocus, true);
    doc.addEventListener('blur', onBlur, true);
    return () => {
        doc.removeEventListener('focus', onFocus, true);
        doc.removeEventListener('blur', onBlur, true);
    };
};
exports.scrollLeft = function (document) {
    return document.documentElement.scrollLeft;
};
exports.scrollTop = function (document) {
    return document.documentElement.scrollTop;
};
exports.domText = ($dom) => {
    const it = $dom.innerText ? $dom.innerText.trim() : '';
    const tc = $dom.textContent;
    const pos = tc.toUpperCase().indexOf(it.toUpperCase());
    return pos === -1 ? it : tc.substr(pos, it.length);
};
exports.isVisible = function (el) {
    if (el === window.document)
        return true;
    if (!el)
        return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.opacity === '0' || style.visibility === 'hidden')
        return false;
    return exports.isVisible(el.parentNode);
};
exports.cssSelector = function (dom) {
    if (!dom)
        return '';
    if (dom.nodeType !== 1)
        return '';
    if (dom.tagName === 'BODY')
        return 'body';
    if (dom.id)
        return '#' + dom.id;
    var classes = dom.className.split(/\s+/g)
        .filter(function (item) {
        return item && item.length;
    });
    var children = Array.from(dom.parentNode ? dom.parentNode.childNodes : [])
        .filter(function ($el) {
        return $el.nodeType === 1;
    });
    var sameTag = children.filter(function ($el) {
        return $el.tagName === dom.tagName;
    });
    var sameClass = children.filter(function ($el) {
        var cs = $el.className.split(/\s+/g);
        return utils_1.and(...classes.map(function (c) {
            return cs.indexOf(c) !== -1;
        }));
    });
    var extra = '';
    if (sameTag.length === 1) {
        extra = '';
    }
    else if (classes.length && sameClass.length === 1) {
        extra = '.' + classes.join('.');
    }
    else {
        extra = ':nth-child(' + (1 + children.findIndex(function (item) { return item === dom; })) + ')';
    }
    var me = dom.tagName.toLowerCase() + extra;
    // Note: browser will add an extra 'tbody' when tr directly in table, which will cause an wrong selector,
    // so the hack is to remove all tbody here
    var ret = exports.cssSelector(dom.parentNode) + ' > ' + me;
    return ret;
    // return ret.replace(/\s*>\s*tbody\s*>?/g, ' ')
};
exports.isPositionFixed = ($dom) => {
    if (!$dom || $dom === document.documentElement || $dom === document.body)
        return false;
    return getComputedStyle($dom)['position'] === 'fixed' || exports.isPositionFixed($dom.parentNode);
};
exports.offset = function (dom) {
    if (!dom)
        return { left: 0, top: 0 };
    var rect = dom.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY
    };
};
function accurateOffset(dom) {
    if (!dom)
        return { left: 0, top: 0 };
    const doc = dom.ownerDocument;
    if (!doc || dom === doc.documentElement)
        return { left: 0, top: 0 };
    const parentOffset = accurateOffset(dom.offsetParent);
    return {
        left: parentOffset.left + dom.offsetLeft,
        top: parentOffset.top + dom.offsetTop
    };
}
exports.accurateOffset = accurateOffset;
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const $img = new Image();
        $img.onload = () => {
            resolve({
                $img,
                width: $img.width,
                height: $img.height
            });
        };
        $img.onerror = (e) => {
            reject(e);
        };
        $img.src = url;
    });
}
exports.preloadImage = preloadImage;
function isFirefox() {
    return /Firefox/.test(window.navigator.userAgent);
}
exports.isFirefox = isFirefox;
function svgNodetoString(svgNode) {
    return svgNode.outerHTML;
}
exports.svgNodetoString = svgNodetoString;
function svgToBase64(str) {
    return 'data:image/svg+xml;base64,' + window.btoa(str);
}
exports.svgToBase64 = svgToBase64;
function canvasFromSVG(str) {
    return new Promise((resolve, reject) => {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        const img = document.createElement('img');
        const b64 = svgToBase64(str);
        const mw = str.match(/<svg[\s\S]*?width="(.*?)"/m);
        const mh = str.match(/<svg[\s\S]*?height="(.*?)"/m);
        const w = parseInt(mw[1], 10);
        const h = parseInt(mh[1], 10);
        img.src = b64;
        img.onload = function () {
            c.width = w;
            c.height = h;
            ctx.drawImage(img, 0, 0, w, h);
            resolve(c);
        };
        img.onerror = function (e) {
            reject(e);
        };
    });
}
exports.canvasFromSVG = canvasFromSVG;
function imageBlobFromSVG(str, mimeType = 'image/png', quality) {
    return canvasFromSVG(str)
        .then(canvas => {
        const p = new Promise((resolve, reject) => {
            try {
                canvas.toBlob(resolve, mimeType, quality);
            }
            catch (e) {
                reject(e);
            }
        });
        return p;
    });
}
exports.imageBlobFromSVG = imageBlobFromSVG;
function imageDataFromUrl(url) {
    return preloadImage(url)
        .then(({ $img, width, height }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage($img, 0, 0, width, height);
        return context.getImageData(0, 0, width, height);
    });
}
exports.imageDataFromUrl = imageDataFromUrl;
function subImage(imageUrl, rect) {
    return new Promise((resolve, reject) => {
        const $img = new Image();
        $img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = rect.width;
            canvas.height = rect.height;
            const context = canvas.getContext('2d');
            context.drawImage($img, 0, 0, $img.width, $img.height, -1 * rect.x, -1 * rect.y, $img.width, $img.height);
            resolve(canvas.toDataURL());
        };
        $img.src = imageUrl;
    });
}
exports.subImage = subImage;
function rgbToHex(r, g, b) {
    if (r > 255 || g > 255 || b > 255) {
        throw 'Invalid color component';
    }
    return ((r << 16) | (g << 8) | b).toString(16);
}
exports.rgbToHex = rgbToHex;
function getPixel(params) {
    const { x, y, dataUrl } = params;
    return new Promise((resolve, reject) => {
        const $img = new Image();
        $img.onload = () => {
            const imgWidth = $img.width;
            const imgHeight = $img.height;
            if (x < 0 || y < 0 || x > imgWidth || y > imgHeight) {
                return reject(new Error(`${x}, ${y} is out of screenshot bound 0, 0 ~ ${imgWidth}, ${imgHeight}`));
            }
            const canvas = document.createElement('canvas');
            canvas.width = x + 5;
            canvas.height = y + 5;
            const context = canvas.getContext('2d');
            context.drawImage($img, 0, 0, x + 5, y + 5, 0, 0, x + 5, y + 5);
            let hex;
            try {
                const p = context.getImageData(x, y, 1, 1).data;
                hex = '#' + ('000000' + rgbToHex(p[0], p[1], p[2])).slice(-6);
                resolve(hex);
            }
            catch (e) {
                reject(new Error(`Failed to get pixel color` + ((e === null || e === void 0 ? void 0 : e.message) ? `: ${e.message}.` : '.')));
            }
        };
        $img.src = dataUrl;
    });
}
exports.getPixel = getPixel;
function scaleRect(rect, scale) {
    return {
        x: scale * rect.x,
        y: scale * rect.y,
        width: scale * rect.width,
        height: scale * rect.height,
    };
}
exports.scaleRect = scaleRect;
function isEditable(el) {
    if (el.contentEditable === 'true') {
        return true;
    }
    const tag = (el.tagName || '').toLowerCase();
    if (['input', 'textarea'].indexOf(tag) === -1) {
        return false;
    }
    const disabled = el.disabled;
    const readOnly = el.readOnly;
    return !disabled && !readOnly;
}
exports.isEditable = isEditable;
function hasAncestor(el, checkAncestor) {
    let node = el;
    while (node) {
        if (checkAncestor(node)) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}
exports.hasAncestor = hasAncestor;
function getAncestor(el, checkAncestor) {
    let node = el;
    while (node) {
        if (checkAncestor(node)) {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}
exports.getAncestor = getAncestor;


/***/ }),

/***/ 27:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _node_modules_path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(55);
/* harmony import */ var _node_modules_path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_path__WEBPACK_IMPORTED_MODULE_0__);
/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "win32", function() { return _node_modules_path__WEBPACK_IMPORTED_MODULE_0__["win32"]; });

/* harmony reexport (safe) */ __webpack_require__.d(__webpack_exports__, "posix", function() { return _node_modules_path__WEBPACK_IMPORTED_MODULE_0__["posix"]; });



var isWindows = /windows/i.test(window.navigator.userAgent);
var path = isWindows ? _node_modules_path__WEBPACK_IMPORTED_MODULE_0__["win32"] : _node_modules_path__WEBPACK_IMPORTED_MODULE_0__["posix"];

/* harmony default export */ __webpack_exports__["default"] = (path);



/***/ }),

/***/ 32:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(90);
const filesystem_1 = __webpack_require__(60);
const ts_utils_1 = __webpack_require__(12);
const path_1 = __importDefault(__webpack_require__(27));
class XFile extends common_1.XModule {
    getName() {
        return common_1.XModuleTypes.XFile;
    }
    getAPI() {
        return filesystem_1.getNativeFileSystemAPI();
    }
    initConfig() {
        return this.getConfig()
            .then(config => {
            if (!config.rootDir) {
                const fsAPI = filesystem_1.getNativeFileSystemAPI();
                return fsAPI.getSpecialFolderPath({ folder: filesystem_1.SpecialFolder.UserDesktop })
                    .then(profilePath => {
                    const kantuDir = path_1.default.join(profilePath, 'uivision');
                    return fsAPI.ensureDir({ path: kantuDir })
                        .then(done => {
                        this.setConfig({
                            rootDir: done ? kantuDir : profilePath
                        });
                    });
                })
                    .catch(e => {
                    // Ignore host not found error, `initConfig` is supposed to be called on start
                    // But we can't guarantee that native fs module is already installed
                    if (!/Specified native messaging host not found/.test(e)) {
                        throw e;
                    }
                });
            }
        });
    }
    sanityCheck(simple) {
        return Promise.all([
            this.getConfig(),
            this.getAPI().getVersion()
                .then(() => this.getAPI(), () => this.getAPI().reconnect())
                .catch(e => {
                throw new Error('xFile is not installed yet');
            })
        ])
            .then(([config, api]) => {
            if (simple) {
                return true;
            }
            if (!config.rootDir) {
                throw new Error('rootDir is not set');
            }
            const checkDirectoryExists = () => {
                return api.directoryExists({ path: config.rootDir })
                    .then((existed) => {
                    if (!existed)
                        throw new Error(`Directory '${config.rootDir}' doesn't exist`);
                    return true;
                });
            };
            const checkDirectoryWritable = () => {
                const testDir = path_1.default.join(config.rootDir, '__kantu__' + Math.round(Math.random() * 100));
                return api.createDirectory({ path: testDir })
                    .then((created) => {
                    if (!created)
                        throw new Error();
                    return api.removeDirectory({ path: testDir });
                })
                    .then((deleted) => {
                    if (!deleted)
                        throw new Error();
                    return true;
                })
                    .catch((e) => {
                    throw new Error(`Directory '${config.rootDir}' is not writable`);
                });
            };
            return checkDirectoryExists()
                .then(checkDirectoryWritable);
        });
    }
    checkUpdate() {
        return Promise.reject(new Error('checkUpdate is not implemented yet'));
    }
    checkUpdateLink(modVersion, extVersion) {
        return `https://ui.vision/x/idehelp?help=xfileaccess_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`;
    }
    downloadLink() {
        return 'https://ui.vision/x/idehelp?help=xfileaccess_download';
    }
    infoLink() {
        return 'https://ui.vision/x/idehelp?help=xfileaccess';
    }
}
exports.XFile = XFile;
exports.getXFile = ts_utils_1.singletonGetter(() => {
    return new XFile();
});


/***/ }),

/***/ 34:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_extension_1 = __importDefault(__webpack_require__(10));
const platform = web_extension_1.default.isFirefox() ? 'firefox' : 'chrome';
exports.default = {
    preinstall: {
        version: '5.8.8',
        macroFolder: '/Demo'
    },
    urlAfterUpgrade: 'https://ui.vision/x/idehelp?help=k_update',
    urlAfterInstall: 'https://ui.vision/x/idehelp?help=k_welcome',
    urlAfterUninstall: 'https://ui.vision/x/idehelp?help=k_why',
    performanceLimit: {
        fileCount: Infinity
    },
    xmodulesLimit: {
        unregistered: {
            ocrCommandCount: 100,
            xCommandCount: 25,
            xFileMacroCount: 10,
            proxyExecCount: 5,
            upgradeUrl: 'https://ui.vision/x/idehelp?help=k_xupgrade'
        },
        free: {
            ocrCommandCount: 250,
            xCommandCount: Infinity,
            xFileMacroCount: 20,
            proxyExecCount: 10,
            upgradeUrl: 'https://ui.vision/x/idehelp?help=k_xupgradepro'
        },
        pro: {
            ocrCommandCount: 500,
            xCommandCount: Infinity,
            xFileMacroCount: Infinity,
            proxyExecCount: Infinity,
            upgradeUrl: 'https://ui.vision/x/idehelp?help=k_xupgrade_contactsupport'
        }
    },
    xfile: {
        minVersionToReadBigFile: '1.0.10'
    },
    ocr: {
        apiList: [
            {
                "id": "1",
                "key": "kantu_only_53b8",
                "url": "https://apipro1.ocr.space/parse/image"
            },
            {
                "id": "2",
                "key": "kantu_only_53b8",
                "url": "https://apipro2.ocr.space/parse/image"
            },
            {
                "id": "3",
                "key": "kantu_only_53b8",
                "url": "https://apipro3.ocr.space/parse/image"
            }
        ],
        apiTimeout: 60 * 1000,
        singleApiTimeout: 30 * 1000,
        apiHealthyResponseTime: 20 * 1000,
        resetTime: 24 * 3600 * 1000
    },
    license: {
        api: {
            url: 'https://license1.ocr.space/api/status'
        }
    },
    icons: {
        normal: 'logo38.png',
        inverted: 'inverted_logo_38.png'
    },
    forceMigrationRemedy: false,
    iframePostMessageTimeout: 500,
    ui: {
        commandItemHeight: 35
    },
    commandRunner: {
        sendKeysMaxCharCount: 1000
    }
};


/***/ }),

/***/ 36:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(10);
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



/* harmony default export */ var storage = __webpack_exports__["default"] = (ext_storage);

/***/ }),

/***/ 43:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.availableCommands = (() => {
    const list = [
        'open',
        'click',
        'clickAndWait',
        'select',
        'selectAndWait',
        'addSelection',
        'removeSelection',
        'type',
        'pause',
        'waitForPageToLoad',
        'selectFrame',
        'assertAlert',
        'assertConfirmation',
        'assertPrompt',
        'answerOnNextPrompt',
        'store',
        'storeText',
        'storeTitle',
        'storeAttribute',
        'storeXpathCount',
        'assertText',
        'assertTitle',
        'clickAt',
        'echo',
        'mouseOver',
        // 'storeEval',
        'verifyText',
        'verifyTitle',
        'sendKeys',
        'dragAndDropToObject',
        'selectWindow',
        'captureScreenshot',
        'captureDesktopScreenshot',
        'refresh',
        'assert',
        'assertElementPresent',
        'assertElementNotPresent',
        'assertEditable',
        'assertNotEditable',
        'verify',
        'verifyElementPresent',
        'verifyElementNotPresent',
        'verifyEditable',
        'verifyNotEditable',
        'deleteAllCookies',
        'label',
        'gotoLabel',
        //'gotoIf',
        'csvRead',
        'csvReadArray',
        'csvSave',
        'csvSaveArray',
        'storeValue',
        'assertValue',
        'verifyValue',
        'storeChecked',
        'captureEntirePageScreenshot',
        'onDownload',
        // 'assertError',
        // 'verifyError',
        'throwError',
        'comment',
        // 'waitForVisible',
        'waitForElementVisible',
        'waitForElementNotVisible',
        'waitForElementPresent',
        'waitForElementNotPresent',
        'onError',
        'sourceSearch',
        'sourceExtract',
        'storeImage',
        'localStorageExport',
        // 'visionFind',
        'visionLimitSearchArea',
        'visionLimitSearchAreaRelative',
        'visualSearch',
        'visualVerify',
        'visualAssert',
        'visualGetPixelColor',
        'editContent',
        'bringBrowserToForeground',
        'bringIDEandBrowserToBackground',
        //'resize',
        'setWindowSize',
        'prompt',
        'XRun',
        'XRunAndWait',
        'XClick',
        'XClickRelative',
        'XType',
        'XMove',
        'XMoveRelative',
        'XMouseWheel',
        'XDesktopAutomation',
        'OCRSearch',
        'OCRExtract',
        'OCRExtractRelative',
        'setProxy',
        'run',
        'executeScript',
        'executeScript_Sandbox',
        //  'executeAsyncScript',
        //  'executeAsyncScript_Sandbox',
        'check',
        'uncheck',
        'assertChecked',
        'assertNotChecked',
        'verifyChecked',
        'verifyNotChecked',
        //'while',
        // 'endWhile',
        'do',
        'repeatIf',
        //'if',
        'else',
        'elseif',
        // 'endif',
        'end',
        'if_v2',
        'while_v2',
        'gotoIf_v2',
        'times',
        'forEach',
        'break',
        'continue'
    ];
    list.sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1);
    return list;
})();
function normalizeCommandName(str) {
    if (!str) {
        return '';
    }
    const lower = str.toLowerCase();
    const lowerCommands = exports.availableCommands.map(str => str.toLowerCase());
    const index = lowerCommands.findIndex(cmd => cmd === lower);
    return index === -1 ? str : exports.availableCommands[index];
}
exports.normalizeCommandName = normalizeCommandName;
function commandText(cmd) {
    switch (cmd) {
        case 'if':
        case 'while':
        case 'gotoIf':
            return cmd + '_v1_deprecated';
        case 'storeEval':
        case 'endif':
        case 'endwhile':
        case 'resize':
            return cmd + '_deprecated';
        default:
            return cmd;
    }
}
exports.commandText = commandText;
function isValidCmd(str) {
    return exports.availableCommands.indexOf(str) !== -1;
}
exports.isValidCmd = isValidCmd;
function isExtensionResourceOnlyCommand(str) {
    switch (str) {
        case 'if':
        case 'while':
        case 'gotoIf':
        case 'if_v2':
        case 'while_v2':
        case 'gotoIf_v2':
        case 'executeScript_Sandbox':
        case 'run':
        case 'store':
        case 'echo':
        case 'prompt':
        case 'throwError':
        case 'pause':
        case 'localStorageExport':
            return true;
        default:
            return false;
    }
}
exports.isExtensionResourceOnlyCommand = isExtensionResourceOnlyCommand;
function canCommandReadImage(str) {
    switch (str) {
        case 'visualSearch':
        case 'visualVerify':
        case 'visualAssert':
        case 'XClick':
        case 'XClickRelative':
        case 'XMove':
        case 'XMoveRelative':
        case 'OCRExtract':
        case 'OCRExtractRelative':
            return true;
        default:
            return false;
    }
}
exports.canCommandReadImage = canCommandReadImage;
function canCommandReadCsv(str) {
    switch (str) {
        case 'csvRead':
        case 'csvReadArray':
            return true;
        default:
            return false;
    }
}
exports.canCommandReadCsv = canCommandReadCsv;
function canCommandRunMacro(str) {
    switch (str) {
        case 'run':
            return true;
        default:
            return false;
    }
}
exports.canCommandRunMacro = canCommandRunMacro;
function doesCommandSupportTargetOptions(str) {
    switch (str) {
        case 'click':
        case 'clickAndWait':
        case 'select':
        case 'selectAndWait':
        case 'type':
        case 'mouseOver':
        case 'verifyText':
        case 'sendKeys':
        case 'dragAndDropToObject':
        case 'assertElementPresent':
        case 'assertEditable':
        case 'assertNotEditable':
        case 'verifyElementPresent':
        case 'verifyEditable':
        case 'verifyNotEditable':
        case 'storeValue':
        case 'assertValue':
        case 'verifyValue':
        case 'storeChecked':
        case 'waitForElementVisible':
        case 'waitForElementPresent':
        case 'XClick':
        case 'XClickRelative':
        case 'XMove':
        case 'XMoveRelative':
        case 'check':
        case 'uncheck':
        case 'assertChecked':
        case 'assertNotChecked':
        case 'verifyChecked':
        case 'verifyNotChecked':
            return true;
        default:
            return false;
    }
}
exports.doesCommandSupportTargetOptions = doesCommandSupportTargetOptions;
function canCommandFind(str) {
    switch (str) {
        case 'echo':
        case 'open':
        case 'pause':
        case 'waitForPageToLoad':
        case 'assertAlert':
        case 'assertConfirmation':
        case 'assertPrompt':
        case 'answerOnNextPrompt':
        case 'store':
        case 'storeTitle':
        case 'assertTitle':
        case 'verifyTitle':
        case 'selectWindow':
        case 'captureScreenshot':
        case 'captureDesktopScreenshot':
        case 'refresh':
        case 'deleteAllCookies':
        case 'label':
        case 'gotoLabel':
        case 'csvRead':
        case 'csvReadArray':
        case 'csvSave':
        case 'csvSaveArray':
        case 'captureEntirePageScreenshot':
        case 'onDownload':
        case 'throwError':
        case 'comment':
        case 'onError':
        case 'sourceSearch':
        case 'sourceExtract':
        case 'localStorageExport':
        case 'visionLimitSearchArea':
        case 'visionLimitSearchAreaRelative':
        case 'visualGetPixelColor':
        case 'bringBrowserToForeground':
        case 'bringIDEandBrowserToBackground':
        case 'setWindowSize':
        case 'prompt':
        case 'XRun':
        case 'XRunAndWait':
        case 'XDesktopAutomation':
        case 'setProxy':
        case 'run':
        case 'executeScript':
        case 'executeScript_Sandbox':
        case 'do':
        case 'repeatIf':
        case 'else':
        case 'elseif':
        case 'end':
        case 'if_v2':
        case 'while_v2':
        case 'gotoIf_v2':
        case 'times':
        case 'forEach':
            return false;
        default:
            return true;
    }
}
exports.canCommandFind = canCommandFind;
function canCommandSelect(str) {
    const canFind = canCommandFind(str);
    if (canFind) {
        return canFind;
    }
    switch (str) {
        case 'visualGetPixelColor':
            return true;
        default:
            return false;
    }
}
exports.canCommandSelect = canCommandSelect;
function indentCreatedByCommand(str) {
    switch (str) {
        case 'if':
        case 'if_v2':
        case 'while':
        case 'while_v2':
        case 'do':
        case 'times':
        case 'forEach':
            return {
                selfIndent: 0,
                nextIndent: 1
            };
        case 'else':
        case 'elseif':
            return {
                selfIndent: -1,
                nextIndent: 1
            };
        case 'end':
        case 'endif':
        case 'endwhile':
        case 'repeatIf':
            return {
                selfIndent: -1,
                nextIndent: 0
            };
        default:
            return {
                selfIndent: 0,
                nextIndent: 0
            };
    }
}
exports.indentCreatedByCommand = indentCreatedByCommand;
function parseImageTarget(target) {
    if (!target || !target.length) {
        return null;
    }
    const reg = /^([^@#]+?\.png)(?:@([\d.]+))?(?:#(\d+))?(?:\[([^\]]+)\])?$/;
    const m = target.match(reg);
    if (!m) {
        return null;
    }
    // throw new Error(`Target should be like 'abc.png@0.8#1'`)
    const fileName = m[1];
    const confidence = m[2] ? parseFloat(m[2]) : undefined;
    const index = m[3] ? (parseInt(m[3]) - 1) : undefined;
    const imageUrl = m[4];
    return { fileName, confidence, index, imageUrl };
}
exports.parseImageTarget = parseImageTarget;


/***/ }),

/***/ 431:
/***/ (function(module, exports, __webpack_require__) {

var map = {
	"./af": 202,
	"./af.js": 202,
	"./ar": 203,
	"./ar-dz": 204,
	"./ar-dz.js": 204,
	"./ar-kw": 205,
	"./ar-kw.js": 205,
	"./ar-ly": 206,
	"./ar-ly.js": 206,
	"./ar-ma": 207,
	"./ar-ma.js": 207,
	"./ar-sa": 208,
	"./ar-sa.js": 208,
	"./ar-tn": 209,
	"./ar-tn.js": 209,
	"./ar.js": 203,
	"./az": 210,
	"./az.js": 210,
	"./be": 211,
	"./be.js": 211,
	"./bg": 212,
	"./bg.js": 212,
	"./bm": 213,
	"./bm.js": 213,
	"./bn": 214,
	"./bn.js": 214,
	"./bo": 215,
	"./bo.js": 215,
	"./br": 216,
	"./br.js": 216,
	"./bs": 217,
	"./bs.js": 217,
	"./ca": 218,
	"./ca.js": 218,
	"./cs": 219,
	"./cs.js": 219,
	"./cv": 220,
	"./cv.js": 220,
	"./cy": 221,
	"./cy.js": 221,
	"./da": 222,
	"./da.js": 222,
	"./de": 223,
	"./de-at": 224,
	"./de-at.js": 224,
	"./de-ch": 225,
	"./de-ch.js": 225,
	"./de.js": 223,
	"./dv": 226,
	"./dv.js": 226,
	"./el": 227,
	"./el.js": 227,
	"./en-au": 228,
	"./en-au.js": 228,
	"./en-ca": 229,
	"./en-ca.js": 229,
	"./en-gb": 230,
	"./en-gb.js": 230,
	"./en-ie": 231,
	"./en-ie.js": 231,
	"./en-nz": 232,
	"./en-nz.js": 232,
	"./eo": 233,
	"./eo.js": 233,
	"./es": 234,
	"./es-do": 235,
	"./es-do.js": 235,
	"./es-us": 236,
	"./es-us.js": 236,
	"./es.js": 234,
	"./et": 237,
	"./et.js": 237,
	"./eu": 238,
	"./eu.js": 238,
	"./fa": 239,
	"./fa.js": 239,
	"./fi": 240,
	"./fi.js": 240,
	"./fo": 241,
	"./fo.js": 241,
	"./fr": 242,
	"./fr-ca": 243,
	"./fr-ca.js": 243,
	"./fr-ch": 244,
	"./fr-ch.js": 244,
	"./fr.js": 242,
	"./fy": 245,
	"./fy.js": 245,
	"./gd": 246,
	"./gd.js": 246,
	"./gl": 247,
	"./gl.js": 247,
	"./gom-latn": 248,
	"./gom-latn.js": 248,
	"./gu": 249,
	"./gu.js": 249,
	"./he": 250,
	"./he.js": 250,
	"./hi": 251,
	"./hi.js": 251,
	"./hr": 252,
	"./hr.js": 252,
	"./hu": 253,
	"./hu.js": 253,
	"./hy-am": 254,
	"./hy-am.js": 254,
	"./id": 255,
	"./id.js": 255,
	"./is": 256,
	"./is.js": 256,
	"./it": 257,
	"./it.js": 257,
	"./ja": 258,
	"./ja.js": 258,
	"./jv": 259,
	"./jv.js": 259,
	"./ka": 260,
	"./ka.js": 260,
	"./kk": 261,
	"./kk.js": 261,
	"./km": 262,
	"./km.js": 262,
	"./kn": 263,
	"./kn.js": 263,
	"./ko": 264,
	"./ko.js": 264,
	"./ky": 265,
	"./ky.js": 265,
	"./lb": 266,
	"./lb.js": 266,
	"./lo": 267,
	"./lo.js": 267,
	"./lt": 268,
	"./lt.js": 268,
	"./lv": 269,
	"./lv.js": 269,
	"./me": 270,
	"./me.js": 270,
	"./mi": 271,
	"./mi.js": 271,
	"./mk": 272,
	"./mk.js": 272,
	"./ml": 273,
	"./ml.js": 273,
	"./mr": 274,
	"./mr.js": 274,
	"./ms": 275,
	"./ms-my": 276,
	"./ms-my.js": 276,
	"./ms.js": 275,
	"./mt": 277,
	"./mt.js": 277,
	"./my": 278,
	"./my.js": 278,
	"./nb": 279,
	"./nb.js": 279,
	"./ne": 280,
	"./ne.js": 280,
	"./nl": 281,
	"./nl-be": 282,
	"./nl-be.js": 282,
	"./nl.js": 281,
	"./nn": 283,
	"./nn.js": 283,
	"./pa-in": 284,
	"./pa-in.js": 284,
	"./pl": 285,
	"./pl.js": 285,
	"./pt": 286,
	"./pt-br": 287,
	"./pt-br.js": 287,
	"./pt.js": 286,
	"./ro": 288,
	"./ro.js": 288,
	"./ru": 289,
	"./ru.js": 289,
	"./sd": 290,
	"./sd.js": 290,
	"./se": 291,
	"./se.js": 291,
	"./si": 292,
	"./si.js": 292,
	"./sk": 293,
	"./sk.js": 293,
	"./sl": 294,
	"./sl.js": 294,
	"./sq": 295,
	"./sq.js": 295,
	"./sr": 296,
	"./sr-cyrl": 297,
	"./sr-cyrl.js": 297,
	"./sr.js": 296,
	"./ss": 298,
	"./ss.js": 298,
	"./sv": 299,
	"./sv.js": 299,
	"./sw": 300,
	"./sw.js": 300,
	"./ta": 301,
	"./ta.js": 301,
	"./te": 302,
	"./te.js": 302,
	"./tet": 303,
	"./tet.js": 303,
	"./th": 304,
	"./th.js": 304,
	"./tl-ph": 305,
	"./tl-ph.js": 305,
	"./tlh": 306,
	"./tlh.js": 306,
	"./tr": 307,
	"./tr.js": 307,
	"./tzl": 308,
	"./tzl.js": 308,
	"./tzm": 309,
	"./tzm-latn": 310,
	"./tzm-latn.js": 310,
	"./tzm.js": 309,
	"./uk": 311,
	"./uk.js": 311,
	"./ur": 312,
	"./ur.js": 312,
	"./uz": 313,
	"./uz-latn": 314,
	"./uz-latn.js": 314,
	"./uz.js": 313,
	"./vi": 315,
	"./vi.js": 315,
	"./x-pseudo": 316,
	"./x-pseudo.js": 316,
	"./yo": 317,
	"./yo.js": 317,
	"./zh-cn": 169,
	"./zh-cn.js": 169,
	"./zh-hk": 318,
	"./zh-hk.js": 318,
	"./zh-tw": 319,
	"./zh-tw.js": 319
};


function webpackContext(req) {
	var id = webpackContextResolve(req);
	return __webpack_require__(id);
}
function webpackContextResolve(req) {
	if(!__webpack_require__.o(map, req)) {
		var e = new Error("Cannot find module '" + req + "'");
		e.code = 'MODULE_NOT_FOUND';
		throw e;
	}
	return map[req];
}
webpackContext.keys = function webpackContextKeys() {
	return Object.keys(map);
};
webpackContext.resolve = webpackContextResolve;
module.exports = webpackContext;
webpackContext.id = 431;

/***/ }),

/***/ 50:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toHtml", function() { return toHtml; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "generateEmptyHtml", function() { return generateEmptyHtml; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toHtmlDataUri", function() { return toHtmlDataUri; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromHtml", function() { return fromHtml; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "fromJSONString", function() { return fromJSONString; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toJSONString", function() { return toJSONString; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toJSONDataUri", function() { return toJSONDataUri; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toBookmarkData", function() { return toBookmarkData; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "generateMacroEntryHtml", function() { return generateMacroEntryHtml; });
/* harmony import */ var error_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(108);
/* harmony import */ var error_polyfill__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(error_polyfill__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var parse_json__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(66);
/* harmony import */ var parse_json__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(parse_json__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var jquery__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(83);
/* harmony import */ var jquery__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(jquery__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var url_parse__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(104);
/* harmony import */ var url_parse__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(url_parse__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _command__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(43);
/* harmony import */ var _command__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_command__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(13);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_services_storage__WEBPACK_IMPORTED_MODULE_5__);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };








var joinUrl = function joinUrl(base, url) {
  var urlObj = new url_parse__WEBPACK_IMPORTED_MODULE_3___default.a(url, base);
  return urlObj.toString();
};

// HTML template from test case
function genHtml(_ref) {
  var name = _ref.name,
      baseUrl = _ref.baseUrl,
      commandTrs = _ref.commandTrs,
      noImport = _ref.noImport;

  var tableHtml = noImport ? '<h3>Starting Browser and UI.Vision...</h3>' : '\n    <table cellpadding="1" cellspacing="1" border="1">\n    <thead>\n    <tr><td rowspan="1" colspan="3">' + name + '</td></tr>\n    </thead><tbody>\n    ' + commandTrs.join('\n') + '\n    </tbody></table>\n  ';
  var baseLink = noImport ? '' : '<link rel="selenium.base" href="' + baseUrl + '" />';

  return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\n<head profile="http://selenium-ide.openqa.org/profiles/test-case">\n<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />\n' + baseLink + '\n<title>' + name + '</title>\n</head>\n<body>\n' + tableHtml + '\n<script>\n(function() {\n  var isExtensionLoaded = function () {\n    const $root = document.documentElement\n    return !!$root && !!$root.getAttribute(\'data-kantu\')\n  }\n  var increaseCountInUrl = function (max) {\n    var url   = new URL(window.location.href)\n    var count = 1 + (parseInt(url.searchParams.get(\'reload\') || 0))\n\n    url.searchParams.set(\'reload\', count)\n    var nextUrl = url.toString()\n\n    var shouldStop = count > max\n    return [shouldStop, !shouldStop ? nextUrl : null]\n  }\n  var run = function () {\n    try {\n      var evt = new CustomEvent(\'kantuSaveAndRunMacro\', {\n        detail: {\n          html: document.documentElement.outerHTML,\n          noImport: ' + (noImport || 'false') + ',\n          storageMode: \'' + Object(_services_storage__WEBPACK_IMPORTED_MODULE_5__["getStorageManager"])().getCurrentStrategyType() + '\'\n        }\n      })\n\n      window.dispatchEvent(evt)\n      var intervalTimer = setInterval(() => window.dispatchEvent(evt), 1000);\n\n      if (window.location.protocol === \'file:\') {\n        var onInvokeSuccess = function () {\n          clearTimeout(timer)\n          clearTimeout(reloadTimer)\n          clearInterval(intervalTimer)\n          window.removeEventListener(\'kantuInvokeSuccess\', onInvokeSuccess)\n        }\n        var timer = setTimeout(function () {\n          alert(\'Error #203: It seems you need to turn on *Allow access to file URLs* for Kantu in your browser extension settings.\')\n        }, 8000)\n\n        window.addEventListener(\'kantuInvokeSuccess\', onInvokeSuccess)\n      }\n    } catch (e) {\n      alert(\'Kantu Bookmarklet error: \' + e.toString());\n    }\n  }\n  var reloadTimer = null\n  var main = function () {\n    if (isExtensionLoaded())  return run()\n\n    var MAX_TRY   = 3\n    var INTERVAL  = 1000\n    var tuple     = increaseCountInUrl(MAX_TRY)\n\n    if (tuple[0]) {\n      return alert(\'Error #204: It seems UI.Vision RPA is not installed yet - or you need to turn on *Allow access to file URLs* for UI.Vision RPA in your browser extension settings.\')\n    } else {\n      reloadTimer = setTimeout(function () {\n        window.location.href = tuple[1]\n      }, INTERVAL)\n    }\n  }\n\n  setTimeout(main, 500)\n})();\n</script>\n</body>\n</html>\n  ';
}

// generate data uri from html
function htmlDataUri(html) {
  return 'data:text/html;base64,' + window.btoa(unescape(encodeURIComponent(html)));
}

// generate data uri from json
function jsonDataUri(str) {
  return 'data:text/json;base64,' + window.btoa(unescape(encodeURIComponent(str)));
}

// generate html from a test case
function toHtml(_ref2) {
  var name = _ref2.name,
      commands = _ref2.commands;

  var copyCommands = commands.map(function (c) {
    return _extends({}, c);
  });
  var openTc = copyCommands.find(function (tc) {
    return tc.cmd === 'open';
  });

  // Note: Aug 10, 2018, no baseUrl when exported to html
  // so that `${variable}` could be used in open command, and won't be prefixed with baseUrl
  var origin = null;
  var replacePath = function replacePath(path) {
    return path;
  };
  // const url         = openTc && new URL(openTc.target)
  // const origin      = url && url.origin
  // const replacePath = (path) => {
  //   if (path.indexOf(origin) !== 0) return path
  //   const result = path.replace(origin, '')
  //   return result.length === 0 ? '/' : result
  // }

  if (openTc) {
    openTc.target = replacePath(openTc.target);
  }

  var commandTrs = copyCommands.map(function (c) {
    if (c.cmd === 'open') {
      // Note: remove origin if it's the same as the first open command
      c.target = replacePath(c.target);
    }

    return '\n      <tr>\n        <td>' + (c.cmd || '') + '</td>\n        <td>' + (c.target || '') + '</td>\n        <td>' + (c.value || '') + '</td>\n      </tr>\n    ';
  });

  return genHtml({
    name: name,
    commandTrs: commandTrs,
    baseUrl: origin || ''
  });
}

function generateEmptyHtml() {
  return genHtml({
    name: 'UI.Vision Autostart Page',
    commandTrs: [],
    baseUrl: '',
    noImport: true
  });
}

// generate data uri of html from a test case
function toHtmlDataUri(obj) {
  return htmlDataUri(toHtml(obj));
}

// parse html to test case
function fromHtml(html) {
  var $root = jquery__WEBPACK_IMPORTED_MODULE_2___default()('<div>' + html + '</div>');
  var $base = $root.find('link');
  var $title = $root.find('title');
  var $trs = $root.find('tbody > tr');

  var baseUrl = $base && $base.attr('href');
  var name = $title.text();

  if (!name || !name.length) {
    throw new Error('fromHtml: missing title');
  }

  var commands = [].slice.call($trs).map(function (tr) {
    var $el = jquery__WEBPACK_IMPORTED_MODULE_2___default()(tr);
    var trHtml = $el[0].outerHtml;

    // Note: remove any datalist option in katalon-like html file
    $el.find('datalist').remove();

    var $children = $el.children();
    var $cmd = $children.eq(0);
    var $tgt = $children.eq(1);
    var $val = $children.eq(2);
    var cmd = Object(_command__WEBPACK_IMPORTED_MODULE_4__["normalizeCommandName"])($cmd && $cmd.text());
    var value = $val && $val.text();
    var target = $tgt && $tgt.text();

    if (!cmd || !cmd.length) {
      throw new Error('missing cmd in ' + trHtml);
    }

    if (cmd === 'open') {
      // Note: with or without baseUrl
      target = baseUrl && baseUrl.length && !/:\/\//.test(target) ? joinUrl(baseUrl, target) : target;
    }

    return { cmd: cmd, target: target, value: value };
  });

  return { name: name, data: { commands: commands } };
}

// parse json to test case
// the current json structure doesn't provide fileName,
// so must provide a file name as the second parameter
function fromJSONString(str, fileName) {
  var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

  // Note: Exported JSON from older version Kantu (via 'export to json')
  // has an invisible charactor (char code65279, known as BOM). It breaks JSON parser.
  // So it's safer to filter it out here
  var obj = parse_json__WEBPACK_IMPORTED_MODULE_1___default()(str.replace(/^\s*/, ''));
  var name = fileName ? fileName.replace(/\.json$/i, '') : obj.Name || '__imported__';

  if (obj.macros) {
    throw new Error('This is a test suite, not a macro');
  }

  if (!Array.isArray(obj.Commands)) {
    throw new Error('\'Commands\' field must be an array');
  }

  var commands = obj.Commands.map(function (c) {
    var obj = {
      cmd: Object(_command__WEBPACK_IMPORTED_MODULE_4__["normalizeCommandName"])(c.Command),
      target: c.Target,
      value: c.Value,
      description: c.Description || ''
    };

    if (Array.isArray(c.Targets)) {
      obj.targetOptions = c.Targets;
    }

    return obj;
  });

  return _extends({
    name: name,
    data: { commands: commands }
  }, opts.withStatus && obj.status ? { status: obj.status } : {}, opts.withId && obj.id ? { id: obj.id } : {});
}

// generate json from a test case
function toJSONString(obj) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var getToday = function getToday() {
    var d = new Date();
    return [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('-');
  };
  var data = _extends({
    Name: obj.name,
    CreationDate: getToday(),
    Commands: obj.commands.map(function (c) {
      return {
        Command: c.cmd,
        Target: c.target || '',
        Value: c.value || '',
        Targets: opts.ignoreTargetOptions ? c.targetOptions : undefined,
        Description: c.description || ''
      };
    })
  }, opts.withStatus && obj.status ? { status: obj.status } : {}, opts.withId && obj.id ? { id: obj.id } : {});

  return JSON.stringify(data, null, 2);
}

// generate data uri of json from a test case
function toJSONDataUri(obj) {
  return jsonDataUri(toJSONString(obj));
}

function toBookmarkData(obj) {
  var path = obj.path,
      bookmarkTitle = obj.bookmarkTitle;


  if (!path) throw new Error('path is required to generate bookmark for macro');
  if (!bookmarkTitle) throw new Error('bookmarkTitle is required to generate bookmark for macro');

  // Note: for backward compatibility, still use `name` field (which makes sense in flat fs mode) to store `path`
  // after we migrate to standard folder mode
  //
  // Use `JSON.stringify(path)` so that it could escape "\" in win32 paths
  return {
    title: bookmarkTitle,
    url: ('javascript:\n      (function() {\n        try {\n          var evt = new CustomEvent(\'kantuRunMacro\', {\n            detail: {\n              name: ' + JSON.stringify(path.replace(/\.json$/i, '')) + ',\n              from: \'bookmark\',\n              storageMode: \'' + Object(_services_storage__WEBPACK_IMPORTED_MODULE_5__["getStorageManager"])().getCurrentStrategyType() + '\',\n              closeRPA: 1\n            }\n          });\n          window.dispatchEvent(evt);\n        } catch (e) {\n          alert(\'UI.Vision RPA Bookmarklet error: \' + e.toString());\n        }\n      })();\n    ').replace(/\n\s*/g, '')
  };
}

// It's a macro.html file that tries to open ui.vision.html which will be exported together
// with this entry html
function generateMacroEntryHtml(macroRelativePath) {
  return '<!doctype html>\n<html lang="en">\n  <head>\n    <title>UI.Vision Shortcut Page</title>\n  </head>\n  <body>\n    <h3>Command line:</h3>\n    <a id="run" href="ui.vision.html?direct=1&savelog=log.txt&macro=' + macroRelativePath + '">Click here</a>\n    <br>\n    <br>\n\t<!-- To start another macro just edit this HTML file and change the macro name in the command line above^. -->\n\t<!-- For more command line parameters see https://ui.vision/rpa/docs#cmd -->\n    <script>\n      window.location.href = document.getElementById("run").getAttribute("href");\n    </script>\n  </body>\n</html>\n';
}

/***/ }),

/***/ 514:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const ts_utils_1 = __webpack_require__(12);
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

/***/ 60:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = __webpack_require__(124);
const kantu_file_access_host_1 = __webpack_require__(125);
const ts_utils_1 = __webpack_require__(12);
const log_1 = __importDefault(__webpack_require__(11));
const path_1 = __importDefault(__webpack_require__(27));
const utf8_1 = __webpack_require__(126);
const base64_1 = __webpack_require__(127);
const utils_1 = __webpack_require__(4);
const semver_1 = __importDefault(__webpack_require__(135));
const config_1 = __importDefault(__webpack_require__(34));
var SpecialFolder;
(function (SpecialFolder) {
    SpecialFolder[SpecialFolder["UserProfile"] = 0] = "UserProfile";
    SpecialFolder[SpecialFolder["UserDesktop"] = 1] = "UserDesktop";
})(SpecialFolder = exports.SpecialFolder || (exports.SpecialFolder = {}));
exports.getNativeFileSystemAPI = ts_utils_1.singletonGetter(() => {
    const nativeHost = new kantu_file_access_host_1.KantuFileAccessHost();
    let pReady = nativeHost.connectAsync().catch(e => {
        log_1.default.warn('pReady - error', e);
        throw e;
    });
    let pendingRequestCount = 0;
    const api = constants_1.MethodTypeInvocationNames.reduce((prev, method) => {
        const camel = ts_utils_1.snakeToCamel(method);
        if (prev[camel]) {
            return prev;
        }
        prev[camel] = (() => {
            const fn = (params) => pReady.then(() => {
                pendingRequestCount += 1;
                return nativeHost.invokeAsync(method, params);
            })
                .then((data) => {
                pendingRequestCount -= 1;
                return data;
            }, e => {
                pendingRequestCount -= 1;
                // Note: Looks like for now whenever there is an error, you have to reconnect native host
                // otherwise, all commands return "Disconnected" afterwards
                const typeSafeAPI = api;
                typeSafeAPI.reconnect().catch(() => { });
                throw e;
            });
            return fn;
        })();
        return prev;
    }, {
        reconnect: () => {
            return ts_utils_1.until('pendingRequestCount === 0', () => {
                return {
                    pass: pendingRequestCount === 0,
                    result: true
                };
            })
                .then(() => {
                log_1.default(`FileSystem - reconnect`, new Error().stack);
                nativeHost.disconnect();
                pReady = nativeHost.connectAsync();
                return pReady.then(() => api);
            });
        },
        getEntries: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.getFileSystemEntries(params)
                .then(res => {
                const { errorCode, entries } = res;
                if (params.brief) {
                    return Promise.resolve({
                        errorCode,
                        entries: entries.map((name) => ({
                            name,
                            length: 0,
                            isDirectory: false,
                            lastWriteTime: 0
                        }))
                    });
                }
                return Promise.all(entries.map((name) => {
                    const entryPath = path_1.default.join(params.path, name);
                    return typeSafeAPI.getFileSystemEntryInfo({ path: entryPath })
                        .then(info => ({
                        name,
                        length: info.length,
                        isDirectory: info.isDirectory,
                        lastWriteTime: info.lastWriteTime
                    }));
                }))
                    .then(entryInfos => ({
                    errorCode,
                    entries: entryInfos
                }));
            });
        },
        ensureDir: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.directoryExists({
                path: params.path
            })
                .then(exists => {
                if (exists)
                    return true;
                return typeSafeAPI.ensureDir({ path: path_1.default.dirname(params.path) })
                    .then(done => {
                    if (!done)
                        return false;
                    return typeSafeAPI.createDirectory({ path: params.path });
                });
            })
                .catch(e => false);
        },
        readBigFile: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.getFileSize(params)
                .then((fileSize) => {
                if (fileSize === 0) {
                    return new Uint8Array(0);
                }
                const content = [];
                const go = (pos) => {
                    return typeSafeAPI.readFileRange({
                        path: params.path,
                        rangeStart: pos
                    })
                        .then(result => {
                        const data = base64_1.base64.decode(result.buffer);
                        if (data) {
                            for (let i = 0; i < data.length; i++) {
                                content.push(data[i]);
                            }
                        }
                        if (result.rangeEnd <= pos || result.rangeEnd >= fileSize) {
                            return new Uint8Array(content);
                        }
                        return go(result.rangeEnd);
                    });
                };
                return go(0);
            });
        },
        isReadBigFileSupported: () => {
            const typeSafeAPI = api;
            return typeSafeAPI.getVersion()
                .then(version => {
                return !semver_1.default.lt(version, config_1.default.xfile.minVersionToReadBigFile);
            });
        },
        readAllTextCompat: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.isReadBigFileSupported()
                .then(supported => {
                if (!supported) {
                    return typeSafeAPI.readAllText(params);
                }
                return typeSafeAPI.readBigFile(params)
                    .then(content => {
                    const text = utf8_1.utf8.decode(content);
                    return {
                        errorCode: 0,
                        content: text
                    };
                });
            });
        },
        readAllBytesCompat: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.isReadBigFileSupported()
                .then(supported => {
                if (!supported) {
                    return typeSafeAPI.readAllBytes(params);
                }
                return typeSafeAPI.readBigFile(params)
                    .then(content => {
                    return utils_1.blobToDataURL(new Blob([content]))
                        .then(dataUrl => ({
                        errorCode: 0,
                        content: dataUrl
                    }));
                });
            });
        },
    });
    return api;
});


/***/ }),

/***/ 69:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "stringifyTestSuite", function() { return stringifyTestSuite; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parseTestSuite", function() { return parseTestSuite; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "validateTestSuiteText", function() { return validateTestSuiteText; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toBookmarkData", function() { return toBookmarkData; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toHtml", function() { return toHtml; });
/* harmony import */ var error_polyfill__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(108);
/* harmony import */ var error_polyfill__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(error_polyfill__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var parse_json__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(66);
/* harmony import */ var parse_json__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(parse_json__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(13);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_services_storage__WEBPACK_IMPORTED_MODULE_3__);
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };






var stringifyTestSuite = function stringifyTestSuite(testSuite) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  var obj = _extends({
    creationDate: Object(_utils__WEBPACK_IMPORTED_MODULE_2__["formatDate"])(new Date()),
    name: testSuite.name,
    macros: testSuite.cases.map(function (item) {
      var loops = parseInt(item.loops, 10);

      return {
        macro: item.testCaseId,
        loops: loops
      };
    })
  }, opts.withFold ? { fold: !!testSuite.fold } : {}, opts.withId && testSuite.id ? { id: testSuite.id } : {}, opts.withPlayStatus && testSuite.playStatus ? { playStatus: testSuite.playStatus } : {});

  return JSON.stringify(obj, null, 2);
};

var parseTestSuite = function parseTestSuite(text) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  // Note: Exported JSON from older version Kantu (via 'export to json')
  // has an invisible charactor (char code65279, known as BOM). It breaks JSON parser.
  // So it's safer to filter it out here
  var obj = parse_json__WEBPACK_IMPORTED_MODULE_1___default()(text.replace(/^\s*/, ''));

  if (typeof obj.name !== 'string' || obj.name.length === 0) {
    throw new Error('name must be a string');
  }

  if (!Array.isArray(obj.macros)) {
    throw new Error('macros must be an array');
  }

  var cases = obj.macros.map(function (item) {
    if (typeof item.loops !== 'number' || item.loops < 1) {
      item.loops = 1;
    }

    return {
      testCaseId: item.macro,
      loops: item.loops
    };
  });

  var ts = _extends({
    cases: cases,
    name: opts.fileName ? opts.fileName.replace(/\.json$/i, '') : obj.name
  }, opts.withFold ? { fold: obj.fold === undefined ? true : obj.fold } : {}, opts.withId && obj.id ? { id: obj.id } : {}, opts.withPlayStatus && obj.playStatus ? { playStatus: obj.playStatus } : {});

  return ts;
};

var validateTestSuiteText = parseTestSuite;

var toBookmarkData = function toBookmarkData(obj) {
  var name = obj.name,
      bookmarkTitle = obj.bookmarkTitle;


  if (!name) throw new Error('name is required to generate bookmark for test suite');
  if (!bookmarkTitle) throw new Error('bookmarkTitle is required to generate bookmark for test suite');

  return {
    title: bookmarkTitle,
    url: ('javascript:\n      (function() {\n        try {\n          var evt = new CustomEvent(\'kantuRunTestSuite\', {\n            detail: {\n              name: \'' + name + '\',\n              from: \'bookmark\',\n              storageMode: \'' + Object(_services_storage__WEBPACK_IMPORTED_MODULE_3__["getStorageManager"])().getCurrentStrategyType() + '\',\n              closeRPA: 1\n            }\n          });\n          window.dispatchEvent(evt);\n        } catch (e) {\n          alert(\'UI.Vision RPA Bookmarklet error: \' + e.toString());\n        }\n      })();\n    ').replace(/\n\s*/g, '')
  };
};

var toHtml = function toHtml(_ref) {
  var name = _ref.name;

  return '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\n<head>\n<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />\n<title>' + name + '</title>\n</head>\n<body>\n<h1>' + name + '</h1>\n<script>\n(function() {\n  var isExtensionLoaded = function () {\n    const $root = document.documentElement\n    return !!$root && !!$root.getAttribute(\'data-kantu\')\n  }\n  var increaseCountInUrl = function (max) {\n    var url   = new URL(window.location.href)\n    var count = 1 + (url.searchParams.get(\'reload\') || 0)\n\n    url.searchParams.set(\'reload\', count)\n    var nextUrl = url.toString()\n\n    var shouldStop = count > max\n    return [shouldStop, !shouldStop ? nextUrl : null]\n  }\n  var run = function () {\n    try {\n      var evt = new CustomEvent(\'kantuRunTestSuite\', { detail: { name: \'' + name + '\', from: \'html\', storageMode: \'' + Object(_services_storage__WEBPACK_IMPORTED_MODULE_3__["getStorageManager"])().getCurrentStrategyType() + '\' } })\n\n      window.dispatchEvent(evt)\n      var intervalTimer = setInterval(() => window.dispatchEvent(evt), 1000);\n\n      if (window.location.protocol === \'file:\') {\n        var onInvokeSuccess = function () {\n          clearTimeout(timer)\n          clearTimeout(reloadTimer)\n          clearInterval(intervalTimer)\n          window.removeEventListener(\'kantuInvokeSuccess\', onInvokeSuccess)\n        }\n        var timer = setTimeout(function () {\n          alert(\'Error #201: It seems you need to turn on *Allow access to file URLs* for Kantu in your browser extension settings.\')\n        }, 8000)\n\n        window.addEventListener(\'kantuInvokeSuccess\', onInvokeSuccess)\n      }\n    } catch (e) {\n      alert(\'UI.Vision RPA Bookmarklet error: \' + e.toString());\n    }\n  }\n  var main = function () {\n    if (isExtensionLoaded())  return run()\n\n    var MAX_TRY   = 3\n    var INTERVAL  = 1000\n    var tuple     = increaseCountInUrl(MAX_TRY)\n\n    if (tuple[0]) {\n      return alert(\'Error #202: It seems UI.Vision RPA is not installed yet, *or* you need to turn on *Allow access to file URLs* for UI.Vision RPA.\')\n    } else {\n      setTimeout(function () {\n        window.location.href = tuple[1]\n      }, INTERVAL)\n    }\n  }\n\n  main()\n})();\n</script>\n</body>\n</html>\n  ';
};

/***/ }),

/***/ 76:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(__webpack_require__(81));
const debounce = __webpack_require__(79);
const utils_1 = __webpack_require__(4);
const ts_utils_1 = __webpack_require__(12);
var FlatStorageEvent;
(function (FlatStorageEvent) {
    FlatStorageEvent["ListChanged"] = "list_changed";
    FlatStorageEvent["FilesChanged"] = "files_changed";
})(FlatStorageEvent = exports.FlatStorageEvent || (exports.FlatStorageEvent = {}));
class FlatStorage extends eventemitter3_1.default {
    constructor(options = {}) {
        super();
        this.encode = (x, fileName) => x;
        this.decode = (x, fileName) => x;
        // Q: Why do we need debounce for followingemitXXX?
        // A: So that there could be more than 1 invocation of emitXXX in one operation
        //    And it will just emit once. For downstream like React / Vue, it won't trigger
        //    unnecessary render
        // Note: list changed event is for move (rename) / remove / clear / write a new file
        this.emitListChanged = debounce(() => {
            this.list()
                .then(fileInfos => {
                this.emit(FlatStorageEvent.ListChanged, fileInfos);
            });
        }, 100);
        this.changedFileNames = [];
        this.__emitFilesChanged = debounce(() => {
            const fileNames = this.changedFileNames;
            // Note: clear changedFileNames right after this method is called,
            // instead of waiting till promise resolved
            // so that new file changes won't be blocked or affect current emit
            this.changedFileNames = [];
            return Promise.all(fileNames.map(fileName => {
                return this.read(fileName, 'Text')
                    .catch(() => null);
            }))
                .then(contents => {
                if (contents.length === 0)
                    return;
                // Note: in case some files don't exist any more, filter by content
                const changedFiles = contents.map((content, i) => ({
                    content,
                    fileName: fileNames[i]
                }))
                    .filter(item => !!item.content);
                this.emit(FlatStorageEvent.FilesChanged, changedFiles);
            });
        }, 100);
        if (options.decode) {
            this.decode = options.decode;
        }
        if (options.encode) {
            this.encode = options.encode;
        }
    }
    list() {
        return this.__list()
            .then(items => {
            items.sort((a, b) => {
                const aFileName = a.fileName.toLowerCase();
                const bFileName = b.fileName.toLowerCase();
                if (aFileName < bFileName)
                    return -1;
                if (aFileName > bFileName)
                    return 1;
                return 0;
            });
            return items;
        });
    }
    readAll(readFileType = 'Text', onErrorFiles) {
        return this.list()
            .then(items => {
            return Promise.all(items.map(item => {
                return this.read(item.fileName, readFileType)
                    .then(content => ({
                    content,
                    fileName: item.fileName
                }));
            }));
        });
    }
    bulkWrite(list) {
        return Promise.all(list.map(item => this.write(item.fileName, item.content)))
            .then(() => { });
    }
    write(fileName, content) {
        return this.exists(fileName)
            .then(isExist => {
            const next = () => {
                if (!isExist)
                    this.emitListChanged();
                this.emitFilesChanged([fileName]);
            };
            return this.__write(fileName, content)
                .then(next);
        });
    }
    overwrite(fileName, content) {
        return this.__overwrite(fileName, content)
            .then(() => {
            this.emitFilesChanged([fileName]);
        });
    }
    clear() {
        return this.__clear()
            .then(() => {
            this.emitListChanged();
        });
    }
    remove(fileName) {
        return this.__remove(fileName)
            .then(() => {
            this.emitListChanged();
        });
    }
    rename(fileName, newName) {
        return this.__rename(fileName, newName)
            .then(() => {
            this.emitListChanged();
            this.emitFilesChanged([newName]);
        });
    }
    copy(fileName, newName) {
        const pName = newName && newName.length
            ? Promise.resolve(newName)
            : ts_utils_1.uniqueName(fileName, {
                generate: (old, step = 1) => {
                    const reg = /-(\d+)$/;
                    const m = old.match(reg);
                    if (!m)
                        return `${old}-${step}`;
                    return old.replace(reg, (_, n) => `-${parseInt(n, 10) + step}`);
                },
                check: (fileName) => {
                    return this.exists(fileName).then(exists => !exists);
                },
                postfixReg: /(_relative)?\.\w+$/
            });
        return pName.then(name => {
            return this.__copy(fileName, name)
                .then(() => {
                this.emitListChanged();
                this.emitFilesChanged([name]);
            });
        });
    }
    // Note: files changed event is for write file only  (rename excluded)
    emitFilesChanged(fileNames) {
        this.changedFileNames = fileNames.reduce((prev, fileName) => {
            if (prev.indexOf(fileName) === -1)
                prev.push(fileName);
            return prev;
        }, this.changedFileNames);
        this.__emitFilesChanged();
    }
}
exports.FlatStorage = FlatStorage;
exports.readableSize = (byteSize) => {
    const kb = 1024;
    const mb = kb * kb;
    if (byteSize < kb) {
        return byteSize + ' byte';
    }
    if (byteSize < mb) {
        return (byteSize / kb).toFixed(1) + ' KB';
    }
    return (byteSize / mb).toFixed(1) + ' MB';
};
function checkFileName(fileName) {
    utils_1.withFileExtension(fileName, (baseName) => {
        try {
            utils_1.validateStandardName(baseName, true);
        }
        catch (e) {
            throw new Error(`Invalid file name '${fileName}'. File name ` + e.message);
        }
        return baseName;
    });
}
exports.checkFileName = checkFileName;


/***/ }),

/***/ 89:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const eventemitter3_1 = __importDefault(__webpack_require__(81));
const debounce = __webpack_require__(79);
const ts_utils_1 = __webpack_require__(12);
const path_1 = __webpack_require__(27);
const error_1 = __webpack_require__(122);
var StorageEvent;
(function (StorageEvent) {
    StorageEvent["ListChanged"] = "list_changed";
    StorageEvent["FilesChanged"] = "files_changed";
})(StorageEvent = exports.StorageEvent || (exports.StorageEvent = {}));
var EntryStatus;
(function (EntryStatus) {
    EntryStatus[EntryStatus["Unknown"] = 0] = "Unknown";
    EntryStatus[EntryStatus["NonExistent"] = 1] = "NonExistent";
    EntryStatus[EntryStatus["File"] = 2] = "File";
    EntryStatus[EntryStatus["Directory"] = 3] = "Directory";
})(EntryStatus = exports.EntryStatus || (exports.EntryStatus = {}));
class StandardStorage extends eventemitter3_1.default {
    constructor(options = {}) {
        super();
        this.encode = (x, fileName) => x;
        this.decode = (x, fileName) => x;
        this.displayedCount = 0;
        this.totalCount = 0;
        this.listFilter = (list) => list;
        // Q: Why do we need debounce for followingemitXXX?
        // A: So that there could be more than 1 invocation of emitXXX in one operation
        //    And it will just emit once. For downstream like React / Vue, it won't trigger
        //    unnecessary render
        // Note: list changed event is for move (rename) / remove / clear / write a new file
        this.emitListChanged = debounce(() => {
            // FIXME:
            this.list('/')
                .then(fileInfos => {
                this.emit(StorageEvent.ListChanged, fileInfos);
            });
        }, 100);
        this.changedFileNames = [];
        this.__emitFilesChanged = debounce(() => {
            const fileNames = this.changedFileNames;
            // Note: clear changedFileNames right after this method is called,
            // instead of waiting till promise resolved
            // so that new file changes won't be blocked or affect current emit
            this.changedFileNames = [];
            return Promise.all(fileNames.map(fileName => {
                return this.read(fileName, 'Text')
                    .catch(() => null);
            }))
                .then(contents => {
                if (contents.length === 0)
                    return;
                // Note: in case some files don't exist any more, filter by content
                const changedFiles = contents.map((content, i) => ({
                    content,
                    fileName: fileNames[i]
                }))
                    .filter(item => !!item.content);
                this.emit(StorageEvent.FilesChanged, changedFiles);
            });
        }, 100);
        if (options.decode) {
            this.decode = options.decode;
        }
        if (options.encode) {
            this.encode = options.encode;
        }
        if (options.listFilter) {
            this.listFilter = options.listFilter;
        }
    }
    getPathLib() {
        // Note: only subclass knows whether it should use win32/posix style path
        return this.isWin32Path() ? path_1.win32 : path_1.posix;
    }
    relativePath(entryPath, isDirectory) {
        const absPath = isDirectory ? this.dirPath(entryPath) : this.filePath(entryPath);
        const rootPath = this.dirPath('/');
        return this.getPathLib().relative(rootPath, absPath);
    }
    entryPath(entryPath, isDirectory) {
        return isDirectory ? this.dirPath(entryPath) : this.filePath(entryPath);
    }
    list(directoryPath = '/', brief = false) {
        return this.__list(directoryPath, brief)
            .then((items) => {
            return this.sortEntries(items);
        });
    }
    listR(directoryPath = '/') {
        const listDir = (dir) => {
            return this.list(dir, false)
                .then((entries) => {
                return Promise.all(entries.map((entry) => {
                    if (entry.isDirectory) {
                        return listDir(entry.fullPath);
                    }
                    return Promise.resolve(null);
                }))
                    .then((listOfEntries) => {
                    return this.sortEntries(entries.map((entry, i) => (Object.assign(Object.assign({}, entry), { children: listOfEntries[i] || [] }))));
                });
            });
        };
        return listDir(directoryPath)
            .then((entryNodes) => {
            if (directoryPath !== '/') {
                return entryNodes;
            }
            return Promise.resolve(this.listFilter(entryNodes))
                .then(displayEntryNodes => {
                this.totalCount = ts_utils_1.sum(...entryNodes.map(ts_utils_1.nodeCount));
                this.displayedCount = ts_utils_1.sum(...displayEntryNodes.map(ts_utils_1.nodeCount));
                return displayEntryNodes;
            });
        });
    }
    getDisplayCount() {
        return this.displayedCount;
    }
    getTotalCount() {
        return this.totalCount;
    }
    exists(path) {
        return this.stat(path)
            .then(({ isFile, isDirectory }) => isFile || isDirectory, () => false);
    }
    fileExists(path) {
        return this.stat(path)
            .then((entry) => entry.isFile, () => false);
    }
    directoryExists(path) {
        return this.stat(path, true)
            .then((entry) => {
            return entry.isDirectory;
        }, () => false);
    }
    readR(directoryPath, readFileType = 'Text', onErrorFiles) {
        return this.listR(directoryPath)
            .then((entryNodes) => {
            return Promise.all(entryNodes.map((node) => {
                if (node.isFile) {
                    return this.read(node.fullPath, readFileType)
                        .then((content) => [{
                            content: content,
                            filePath: node.fullPath
                        }]);
                }
                if (node.isDirectory) {
                    return this.readR(node.fullPath, readFileType);
                }
                throw new Error('Not file or directory');
            }))
                .then((result) => {
                return ts_utils_1.flatten(result);
            });
        });
    }
    write(fileName, content) {
        return this.exists(fileName)
            .then(isExist => {
            const next = () => {
                if (!isExist)
                    this.emitListChanged();
                this.emitFilesChanged([fileName]);
            };
            return this.__write(fileName, content)
                .then(next);
        });
    }
    overwrite(fileName, content) {
        return this.__overwrite(fileName, content)
            .then(() => {
            this.emitFilesChanged([fileName]);
        });
    }
    bulkWrite(list) {
        return Promise.all(list.map(item => this.write(item.filePath, item.content)))
            .then(() => { });
    }
    removeFile(filePath) {
        return this.__removeFile(filePath)
            .then(() => {
            this.emitListChanged();
        });
    }
    removeEmptyDirectory(directoryPath) {
        return this.__removeEmptyDirectory(directoryPath)
            .then(() => {
            this.emitListChanged();
        });
    }
    removeDirectory(directoryPath) {
        return this.remove(directoryPath, true);
    }
    remove(path, isDirectory) {
        return this.stat(path, isDirectory)
            .then((entry) => {
            if (entry.isFile) {
                return this.removeFile(entry.fullPath);
            }
            if (entry.isDirectory) {
                return this.list(entry.fullPath)
                    .then((entries) => {
                    return Promise.all(entries.map((item) => this.remove(item.fullPath, item.isDirectory)))
                        .then(() => this.removeEmptyDirectory(entry.fullPath));
                });
            }
            throw new Error('Not file or directory');
        });
    }
    clear() {
        return this.list('/')
            .then((entries) => {
            return Promise.all(entries.map((entry) => this.remove(entry.fullPath)))
                .then(() => { });
        });
    }
    moveFile(filePath, newPath) {
        return this.__moveFile(filePath, newPath)
            .then(() => {
            this.emitListChanged();
        });
    }
    copyFile(filePath, newPath) {
        return this.__copyFile(filePath, newPath)
            .then(() => {
            this.emitListChanged();
        });
    }
    moveDirectory(directoryPath, newPath) {
        return this.move(directoryPath, newPath, true, true);
    }
    copyDirectory(directoryPath, newPath) {
        return this.copy(directoryPath, newPath, true, true);
    }
    move(src, dst, isSourceDirectory, isTargetDirectory) {
        const absSrc = this.entryPath(src, isSourceDirectory);
        const absDst = this.entryPath(dst, isTargetDirectory);
        if (absSrc === absDst) {
            throw new Error('move: src should not be the same as dst');
        }
        if (this.getPathLib().dirname(absSrc) === absDst) {
            throw new Error('move: cannot move to original dir');
        }
        if (isSourceDirectory && isTargetDirectory && this.isTargetInSourceDirectory(dst, src)) {
            throw new Error('Cannot move a directory into its sub directory');
        }
        // It's slow to copy then remove. Subclass should definitely
        // override this method if it has native support for move operation
        return this.copy(src, dst, isSourceDirectory, isTargetDirectory)
            .then(() => this.remove(src, isSourceDirectory));
    }
    copy(src, dst, isSourceDirectory, isTargetDirectory) {
        const srcDir = this.getPathLib().dirname(src);
        const dstDir = this.getPathLib().dirname(dst);
        const isSameDir = srcDir === dstDir;
        if (src === dst) {
            throw new Error('copy: dst should not be the same as src');
        }
        return Promise.all([
            this.getEntryStatus(src, isSourceDirectory),
            this.getEntryStatus(dst, isTargetDirectory),
            isSameDir ? Promise.resolve(EntryStatus.Directory) : this.getEntryStatus(this.getPathLib().dirname(dst), true)
        ])
            .then((triple) => {
            const [srcStatus, dstStatus, dstDirStatus] = triple;
            if (dstDirStatus !== EntryStatus.Directory) {
                throw new error_1.ENOTDIR(this.getPathLib().dirname(dst));
            }
            switch (srcStatus) {
                case EntryStatus.NonExistent:
                    throw new error_1.ENOENT(src);
                case EntryStatus.Unknown:
                    throw new Error(`source (${src}) exists but is neither a file nor a directory`);
                case EntryStatus.File: {
                    switch (dstStatus) {
                        case EntryStatus.File:
                            throw new error_1.EEXIST(dst);
                        case EntryStatus.Unknown:
                            throw new Error(`dst '${dst}' is neither a file nor directory`);
                        case EntryStatus.Directory: {
                            const dstFilePath = this.getPathLib().resolve(dst, this.getPathLib().basename(src));
                            return this.copyFile(src, dstFilePath);
                        }
                        case EntryStatus.NonExistent: {
                            return this.copyFile(src, dst);
                        }
                    }
                }
                case EntryStatus.Directory: {
                    switch (dstStatus) {
                        case EntryStatus.File:
                            throw new Error(`dst '${dst}' is an existing file, but src '${src}' is a directory`);
                        case EntryStatus.Unknown:
                            throw new Error(`dst '${dst}' is neither a file nor directory`);
                        case EntryStatus.Directory: {
                            if (this.isTargetInSourceDirectory(dst, src)) {
                                throw new Error('Cannot copy a directory into its sub directory');
                            }
                            const dstDir = this.getPathLib().resolve(dst, this.getPathLib().basename(src));
                            return this.ensureDirectory(dstDir)
                                .then(() => this.copyAllInDirectory(src, dstDir));
                        }
                        case EntryStatus.NonExistent: {
                            return this.ensureDirectory(dst)
                                .then(() => this.copyAllInDirectory(src, dst));
                        }
                    }
                }
            }
        });
    }
    createDirectory(directoryPath) {
        return this.mkdir(directoryPath, false);
    }
    ensureDirectory(directoryPath) {
        return this.getEntryStatus(directoryPath, true)
            .then((status) => {
            switch (status) {
                case EntryStatus.File:
                case EntryStatus.Unknown:
                    throw new error_1.EEXIST();
                case EntryStatus.Directory:
                    return;
                case EntryStatus.NonExistent:
                    return this.mkdir(directoryPath, true);
            }
        });
    }
    ensureDir() {
        return this.ensureDirectory('/');
    }
    rename(filePath, newPath) {
        return this.move(filePath, newPath);
    }
    readAll(readFileType = 'Text', onErrorFiles) {
        return this.list('/')
            .then((items) => {
            return Promise.all(items
                .filter(item => item.isFile)
                .map(item => {
                return this.read(item.fullPath, readFileType)
                    .then(content => ({
                    content,
                    fileName: item.name
                }))
                    // Note: Whenever there is error in reading file,
                    // return null
                    .catch(e => {
                    return {
                        fileName: item.name,
                        fullFilePath: item.fullPath,
                        error: new Error(`Error in parsing ${item.fullPath}:\n${e.message}`)
                    };
                });
            }))
                .then(list => {
                const errorFiles = list.filter(item => item.error);
                if (onErrorFiles)
                    onErrorFiles(errorFiles);
                return list.filter((item) => item.content);
            });
        });
    }
    isTargetInSourceDirectory(targetPath, sourcePath) {
        const dstPath = this.dirPath(targetPath);
        const srcPath = this.dirPath(sourcePath);
        const sep = this.getPathLib().sep;
        const relativePath = this.getPathLib().relative(srcPath, dstPath);
        const parts = relativePath.split(sep);
        return parts.indexOf('..') === -1;
    }
    sortEntries(entries) {
        // Sort entries in this order
        // 1. Directories come before files
        // 2. Inside directories or files, sort it alphabetically a-z (ignore case)
        const items = [...entries];
        items.sort((a, b) => {
            if (a.isDirectory && b.isFile) {
                return -1;
            }
            if (a.isFile && b.isDirectory) {
                return 1;
            }
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            if (aName < bName)
                return -1;
            if (aName > bName)
                return 1;
            return 0;
        });
        return items;
    }
    copyAllInDirectory(srcDir, dstDir) {
        return this.list(srcDir)
            .then((entries) => {
            return Promise.all(entries.map((entry) => {
                if (entry.isFile) {
                    return this.copyFile(entry.fullPath, this.getPathLib().resolve(dstDir, entry.name));
                }
                if (entry.isDirectory) {
                    const dstSubDir = this.getPathLib().resolve(dstDir, entry.name);
                    return this.ensureDirectory(dstSubDir)
                        .then(() => this.copyAllInDirectory(entry.fullPath, dstSubDir));
                }
                return Promise.resolve();
            }))
                .then(() => { });
        });
    }
    mkdir(dir, sureAboutNonExistent = false) {
        const makeSureNonExistent = () => {
            if (sureAboutNonExistent) {
                return Promise.resolve();
            }
            return this.getEntryStatus(dir, true)
                .then((status) => {
                if (status !== EntryStatus.NonExistent) {
                    throw new error_1.EEXIST(dir);
                }
            });
        };
        return makeSureNonExistent()
            .then(() => {
            const parentDir = this.getPathLib().dirname(dir);
            if (parentDir === '/') {
                return this.__createDirectory(dir);
            }
            return this.getEntryStatus(parentDir, true)
                .then((status) => {
                switch (status) {
                    case EntryStatus.File:
                    case EntryStatus.Unknown:
                        throw new error_1.EEXIST(parentDir);
                    case EntryStatus.Directory:
                        return this.__createDirectory(dir);
                    case EntryStatus.NonExistent:
                        return this.mkdir(parentDir, true)
                            .then(() => this.__createDirectory(dir));
                }
            });
        })
            .then(() => {
            this.emitListChanged();
        });
    }
    getEntryStatus(path, isDirectory) {
        return this.stat(path, isDirectory)
            .then((entry) => {
            if (entry.isFile)
                return EntryStatus.File;
            if (entry.isDirectory)
                return EntryStatus.Directory;
            return EntryStatus.NonExistent;
        }, (e) => {
            return EntryStatus.NonExistent;
        });
    }
    // Note: files changed event is for write file only  (rename excluded)
    emitFilesChanged(fileNames) {
        this.changedFileNames = fileNames.reduce((prev, fileName) => {
            if (prev.indexOf(fileName) === -1)
                prev.push(fileName);
            return prev;
        }, this.changedFileNames);
        this.__emitFilesChanged();
    }
}
exports.StandardStorage = StandardStorage;


/***/ }),

/***/ 90:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = __importDefault(__webpack_require__(36));
var XModuleTypes;
(function (XModuleTypes) {
    XModuleTypes["XFile"] = "xFile";
    XModuleTypes["XUserIO"] = "xClick";
    XModuleTypes["XDesktop"] = "xDesktop";
    XModuleTypes["XScreenCapture"] = "xScreenCapture";
})(XModuleTypes = exports.XModuleTypes || (exports.XModuleTypes = {}));
class XModule {
    constructor() {
        this.cachedConfig = {};
        this.initConfig();
    }
    getVersion() {
        return this.getAPI()
            .reconnect()
            .catch(e => {
            throw new Error(`${this.getName()} is not installed yet`);
        })
            .then(api => {
            return api.getVersion()
                .then(version => ({
                version,
                installed: true
            }));
        })
            .catch(e => ({
            installed: false
        }));
    }
    setConfig(config) {
        this.cachedConfig = Object.assign(Object.assign({}, this.cachedConfig), config);
        return this.getConfig()
            .then(oldConfig => {
            const nextConfig = Object.assign(Object.assign({}, oldConfig), config);
            return storage_1.default.set(this.getStoreKey(), nextConfig)
                .then(success => {
                if (success) {
                    this.cachedConfig = nextConfig;
                }
                return success;
            });
        });
    }
    getConfig() {
        return storage_1.default.get(this.getStoreKey())
            .then(data => {
            this.cachedConfig = data || {};
            return this.cachedConfig;
        });
    }
    getCachedConfig() {
        return this.cachedConfig;
    }
    getStoreKey() {
        return this.getName().toLowerCase();
    }
}
exports.XModule = XModule;


/***/ }),

/***/ 97:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/// <reference types="chrome"/>
Object.defineProperty(exports, "__esModule", { value: true });
class InvocationQueueItem {
    constructor(id, method, params, callback) {
        this.requestObject = {
            id,
            method,
            params
        };
        this.callback = callback;
    }
    get request() {
        return this.requestObject;
    }
}
class NativeMessagingHost {
    constructor(hostName) {
        this.internalHostName = hostName;
        this.nextInvocationId = 1;
        this.queue = new Array();
        this.handleMessage = this.handleMessage.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
    }
    processResponse(id, result, error) {
        let callback = undefined;
        for (let i = 0; i < this.queue.length; ++i) {
            const entry = this.queue[i];
            if (entry.request.id === id) {
                callback = entry.callback;
                this.queue.splice(i, 1);
                break;
            }
        }
        if (callback) {
            callback(result, error);
        }
    }
    handleMessage(message) {
        const response = message;
        if (typeof response.id !== "number") {
            return;
        }
        this.processResponse(response.id, response.result, response.error);
    }
    handleDisconnect() {
        this.disconnect();
    }
    get hostName() {
        return this.internalHostName;
    }
    connectAsync() {
        if (this.port) {
            return this.invokeAsync("get_version", undefined);
        }
        this.port = chrome.runtime.connectNative(this.hostName);
        this.port.onMessage.addListener(this.handleMessage);
        this.port.onDisconnect.addListener(this.handleDisconnect);
        return this.invokeAsync("get_version", undefined);
    }
    disconnect() {
        const message = chrome.runtime.lastError && chrome.runtime.lastError.message || "Disconnected";
        if (this.port) {
            this.port.disconnect();
            this.port = undefined;
        }
        // Discard all queued invocations
        const invocationIdArray = this.queue.map(x => x.request.id);
        for (const id of invocationIdArray) {
            this.processResponse(id, undefined, { message });
        }
        this.queue = new Array();
    }
    invoke(method, params, callback) {
        if (!this.port) {
            callback(undefined, {
                message: "Disconnected"
            });
            return;
        }
        const id = this.nextInvocationId++;
        const item = new InvocationQueueItem(id, method, params, callback);
        this.queue.push(item);
        this.port.postMessage(item.request);
    }
    invokeAsync(method, params) {
        return new Promise((resolve, reject) => {
            this.invoke(method, params, (result, error) => {
                if (chrome.runtime.lastError) {
                    error = new Error(chrome.runtime.lastError.message);
                }
                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }
            });
        });
    }
}
exports.NativeMessagingHost = NativeMessagingHost;


/***/ })

/******/ });