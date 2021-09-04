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
/******/ 	deferredModules.push([1079,1,0]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ 105:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(153);
const ts_utils_1 = __webpack_require__(12);
var MacroResultStatus;
(function (MacroResultStatus) {
    MacroResultStatus["Normal"] = "NORMAL";
    MacroResultStatus["Success"] = "SUCCESS";
    MacroResultStatus["Error"] = "ERROR";
    MacroResultStatus["ErrorInSub"] = "ERROR_IN_SUB";
})(MacroResultStatus = exports.MacroResultStatus || (exports.MacroResultStatus = {}));
class MacroExtraKeyValueData extends common_1.KeyValueData {
    getAll() {
        return super.get("");
    }
    getMainKeyAndSubKeys(key) {
        const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key);
        return [
            MacroExtraKeyValueData.STORAGE_KEY,
            [mainKey].concat(subKeys).filter(x => x && x.length)
        ];
    }
}
exports.MacroExtraKeyValueData = MacroExtraKeyValueData;
MacroExtraKeyValueData.STORAGE_KEY = 'macro_extra';
exports.getMacroExtraKeyValueData = ts_utils_1.singletonGetter(() => new MacroExtraKeyValueData());


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

/***/ 1079:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* WEBPACK VAR INJECTION */(function(process) {/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_common_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _common_utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _common_ipc_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(93);
/* harmony import */ var _common_constant__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(17);
/* harmony import */ var _common_constant__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_common_constant__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _common_log__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(11);
/* harmony import */ var _common_log__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_common_log__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _common_clipboard__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(411);
/* harmony import */ var _common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(94);
/* harmony import */ var _common_storage__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(36);
/* harmony import */ var _common_debugger__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(653);
/* harmony import */ var _common_download_man__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(119);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(34);
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_10___default = /*#__PURE__*/__webpack_require__.n(_config__WEBPACK_IMPORTED_MODULE_10__);
/* harmony import */ var _services_vision_adaptor_ts__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(654);
/* harmony import */ var _services_vision_adaptor_ts__WEBPACK_IMPORTED_MODULE_11___default = /*#__PURE__*/__webpack_require__.n(_services_vision_adaptor_ts__WEBPACK_IMPORTED_MODULE_11__);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(13);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_12___default = /*#__PURE__*/__webpack_require__.n(_services_storage__WEBPACK_IMPORTED_MODULE_12__);
/* harmony import */ var _services_xmodules_xfile__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(32);
/* harmony import */ var _services_xmodules_xfile__WEBPACK_IMPORTED_MODULE_13___default = /*#__PURE__*/__webpack_require__.n(_services_xmodules_xfile__WEBPACK_IMPORTED_MODULE_13__);
/* harmony import */ var _common_resize_window__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(393);
/* harmony import */ var _common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(64);
/* harmony import */ var _common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15___default = /*#__PURE__*/__webpack_require__.n(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__);
/* harmony import */ var _services_desktop__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(91);
/* harmony import */ var _services_desktop__WEBPACK_IMPORTED_MODULE_16___default = /*#__PURE__*/__webpack_require__.n(_services_desktop__WEBPACK_IMPORTED_MODULE_16__);
/* harmony import */ var _common_tab_utils__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(65);
/* harmony import */ var _common_tab_utils__WEBPACK_IMPORTED_MODULE_17___default = /*#__PURE__*/__webpack_require__.n(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__);
/* harmony import */ var _desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(412);
/* harmony import */ var _desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18___default = /*#__PURE__*/__webpack_require__.n(_desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18__);
/* harmony import */ var _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(87);
/* harmony import */ var _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19___default = /*#__PURE__*/__webpack_require__.n(_desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__);
/* harmony import */ var _common_dom_utils__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(22);
/* harmony import */ var _common_dom_utils__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(_common_dom_utils__WEBPACK_IMPORTED_MODULE_20__);
/* harmony import */ var _services_xmodules_xdesktop__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(74);
/* harmony import */ var _services_xmodules_xdesktop__WEBPACK_IMPORTED_MODULE_21___default = /*#__PURE__*/__webpack_require__.n(_services_xmodules_xdesktop__WEBPACK_IMPORTED_MODULE_21__);
/* harmony import */ var _services_migration__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(361);
/* harmony import */ var _services_migration__WEBPACK_IMPORTED_MODULE_22___default = /*#__PURE__*/__webpack_require__.n(_services_migration__WEBPACK_IMPORTED_MODULE_22__);
/* harmony import */ var _common_ts_utils__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(12);
/* harmony import */ var _common_ts_utils__WEBPACK_IMPORTED_MODULE_23___default = /*#__PURE__*/__webpack_require__.n(_common_ts_utils__WEBPACK_IMPORTED_MODULE_23__);
/* harmony import */ var _common_cv_utils__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(42);
/* harmony import */ var _common_cv_utils__WEBPACK_IMPORTED_MODULE_24___default = /*#__PURE__*/__webpack_require__.n(_common_cv_utils__WEBPACK_IMPORTED_MODULE_24__);
/* harmony import */ var _services_proxy__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(146);
/* harmony import */ var _services_proxy__WEBPACK_IMPORTED_MODULE_25___default = /*#__PURE__*/__webpack_require__.n(_services_proxy__WEBPACK_IMPORTED_MODULE_25__);
/* harmony import */ var _services_log__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(324);
/* harmony import */ var _services_log__WEBPACK_IMPORTED_MODULE_26___default = /*#__PURE__*/__webpack_require__.n(_services_log__WEBPACK_IMPORTED_MODULE_26__);
/* harmony import */ var _services_contextMenu__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(366);
/* harmony import */ var _services_contextMenu__WEBPACK_IMPORTED_MODULE_27___default = /*#__PURE__*/__webpack_require__.n(_services_contextMenu__WEBPACK_IMPORTED_MODULE_27__);
/* harmony import */ var _services_screen_capture__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(359);
/* harmony import */ var _services_screen_capture__WEBPACK_IMPORTED_MODULE_28___default = /*#__PURE__*/__webpack_require__.n(_services_screen_capture__WEBPACK_IMPORTED_MODULE_28__);
/* harmony import */ var _services_xmodules_x_screen_capture__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(75);
/* harmony import */ var _services_xmodules_x_screen_capture__WEBPACK_IMPORTED_MODULE_29___default = /*#__PURE__*/__webpack_require__.n(_services_xmodules_x_screen_capture__WEBPACK_IMPORTED_MODULE_29__);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/* global browser */
































// Note: in Ubuntu, you have to take some delay after activating some tab, otherwise there are chances
// Chrome still think the panel is the window you want to take screenshot, and weird enough in Ubuntu,
// You can't take screenshot of tabs with 'chrome-extension://' schema, even if it's your own extension
var SCREENSHOT_DELAY = /Linux/i.test(window.navigator.userAgent) ? 200 : 0;
var CS_IPC_TIMEOUT = 3000;

var state = {
  status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL,
  tabIds: {
    lastActivated: [],
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
  pullback: false,
  // Note: heartBeatSecret = -1, means no heart beat available, and panel should not retry on heart beat lost
  heartBeatSecret: 0,
  // Note: disableHeartBeat = true, `checkHeartBeat` will stop working, it's useful for cases like close current tab
  disableHeartBeat: false,
  // Note: pendingPlayingTab = true, tells `getPlayTab` to wait until the current tab is closed and another tab is focused on
  pendingPlayingTab: false,
  xClickNeedCalibrationInfo: null,
  lastCsIpcSecret: null,
  closingAllWindows: false
};

var updateHeartBeatSecret = function updateHeartBeatSecret() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$disabled = _ref.disabled,
      disabled = _ref$disabled === undefined ? false : _ref$disabled;

  if (disabled) {
    state.heartBeatSecret = -1;
  } else {
    state.heartBeatSecret = (Math.max(0, state.heartBeatSecret) + 1) % 10000;
  }
};

// Generate function to get ipc based on tabIdName and some error message
var genGetTabIpc = function genGetTabIpc(tabIdName, purpose) {
  return function () {
    var timeout = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 100;
    var before = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : Infinity;

    return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["retry"])(function () {
      var tabId = state.tabIds[tabIdName];

      if (!tabId) {
        return Promise.reject(new Error('No tab for ' + purpose + ' yet'));
      }

      return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(tabId);
    }, {
      timeout: timeout,
      retryInterval: 100,
      shouldRetry: function shouldRetry() {
        return true;
      }
    })().then(function (tab) {
      if (!tab) {
        throw new Error('The ' + purpose + ' tab seems to be closed');
      }

      return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tab.id, timeout, before).catch(function (e) {
        throw new Error('No ipc available for the ' + purpose + ' tab');
      });
    });
  };
};

var getRecordTabIpc = genGetTabIpc('toRecord', 'recording');

var getPlayTabIpc = genGetTabIpc('toPlay', 'playing commands');

var getInspectTabIpc = genGetTabIpc('toInspect', 'inspect');

var getPanelTabIpc = genGetTabIpc('panel', 'dashboard');

// Get the current tab for play, if url provided, it will be loaded in the tab
var getPlayTab = function getPlayTab(url) {
  // Note: update error message to be more user friendly. But the original message is kept as comment
  // const theError  = new Error('Either a played tab or a url must be provided to start playing')
  var theError = new Error('No connection to browser tab');

  var createOne = function createOne(url) {
    if (!url) throw theError;

    return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["createTab"])(url).then(function (tab) {
      state.tabIds.lastPlay = state.tabIds.toPlay;
      state.tabIds.toPlay = state.tabIds.firstPlay = tab.id;
      return tab;
    });
  };

  var runRealLogic = function runRealLogic() {
    if (!state.tabIds.toPlay && !url) {
      throw theError;
    }

    if (!state.tabIds.toPlay) {
      return createOne(url);
    }

    return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getTab"])(state.tabIds.toPlay).then(function (tab) {
      if (!url) {
        return tab;
      }

      // Note: must disable ipcCache manually here, so that further messages
      // won't be sent the old ipc
      Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().disable(tab.id);

      var finalUrl = function () {
        try {
          var u = new URL(url, tab.url);
          return u.toString();
        } catch (e) {
          return url;
        }
      }();

      return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["updateUrlForTab"])(tab, finalUrl);
    }, function () {
      return createOne(url);
    });
  };

  _common_log__WEBPACK_IMPORTED_MODULE_4___default()('getPlayTab - pendingPlayingTab', state.pendingPlayingTab);

  var p = !state.pendingPlayingTab ? Promise.resolve() : Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["until"])('pendingPlayingTab reset', function () {
    return {
      pass: !state.pendingPlayingTab,
      result: true
    };
  }, 100, 5000);

  return p.then(runRealLogic);
};

var showPanelWindow = function showPanelWindow() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      params = _ref2.params;

  return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.panel, true).catch(function () {
    _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function (config) {
      config = config || {};
      return (config.size || {})[config.showSidebar ? 'with_sidebar' : 'standard'];
    }).then(function (size) {
      size = size || {
        width: 850,
        height: 775
      };

      var urlQuery = Object.keys(params || {}).map(function (key) {
        return key + '=' + params[key];
      }).join('&');
      var base = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.extension.getURL('popup.html');
      var url = urlQuery.length > 0 ? base + '?' + urlQuery : base;

      getLogServiceForBg().updateLogFileName();
      getLogServiceForBg().logWithTime('UI.Vision RPA started');
      state.closingAllWindows = false;

      _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.create({
        url: url,
        type: 'popup',
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

var withPanelIpc = function withPanelIpc(options) {
  return showPanelWindow(options).then(function () {
    return getPanelTabIpc(6 * 1000);
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
      return _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e);
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
  return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function (config) {
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
  Promise.all([_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(activeTabId), getPanelTabIpc().catch(function () {
    return null;
  })]).then(function (tuple) {
    var _tuple = _slicedToArray(tuple, 2),
        tab = _tuple[0],
        panelIpc = _tuple[1];

    if (!panelIpc) return;
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
      case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL:
        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(tab.windowId).then(function (win) {
          return win.focused;
        });

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].PLAYER:
        return tabId === state.tabIds.toPlay;

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER:
        return tabId === state.tabIds.toRecord;

      default:
        throw new Error('isTabActiveAndFocused: unknown app status, \'' + state.status + '\'');
    }
  }).catch(function (e) {
    return false;
  });
};

var getStorageManagerForBg = Object(_common_ts_utils__WEBPACK_IMPORTED_MODULE_23__["singletonGetterByKey"])(function (mode) {
  return mode;
}, function (mode, extraOptions) {
  return new _services_storage__WEBPACK_IMPORTED_MODULE_12__["StorageManager"](mode, extraOptions);
});

var getCurrentStorageManager = function getCurrentStorageManager() {
  var restoreConfig = function restoreConfig() {
    return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config');
  };

  return Promise.all([restoreConfig(), Object(_services_xmodules_xfile__WEBPACK_IMPORTED_MODULE_13__["getXFile"])().getConfig()]).then(function (_ref3) {
    var _ref4 = _slicedToArray(_ref3, 2),
        config = _ref4[0],
        xFileConfig = _ref4[1];

    return getStorageManagerForBg(config.storageMode);
  });
};

var getLogServiceForBg = Object(_common_ts_utils__WEBPACK_IMPORTED_MODULE_23__["singletonGetter"])(function () {
  return new _services_log__WEBPACK_IMPORTED_MODULE_26__["LogService"]({
    waitForStorageManager: getCurrentStorageManager
  });
});

var saveDataUrlToScreenshot = function saveDataUrlToScreenshot(fileName, dataUrl) {
  return getCurrentStorageManager().then(function (storageMan) {
    return storageMan.getScreenshotStorage().overwrite(Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', fileName), Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dataURItoBlob"])(dataUrl)).then(function () {
      getPanelTabIpc().then(function (panelIpc) {
        return panelIpc.ask('RESTORE_SCREENSHOTS');
      });
    });
  });
};

var saveDataUrlToLastScreenshot = function saveDataUrlToLastScreenshot(dataUrl) {
  return saveDataUrlToScreenshot(_common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_SCREENSHOT_FILE_NAME"], dataUrl);
};

var saveDataUrlToLastDesktopScreenshot = function saveDataUrlToLastDesktopScreenshot(dataUrl) {
  return saveDataUrlToScreenshot(_common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_DESKTOP_SCREENSHOT_FILE_NAME"], dataUrl);
};

var getScreenshotInSearchArea = function getScreenshotInSearchArea(_ref5) {
  var searchArea = _ref5.searchArea,
      storedImageRect = _ref5.storedImageRect,
      dpiScale = _ref5.dpiScale;

  // Take png searh area as rect, it should have set `storedImageRect` in advance
  if (/\.png/.test(searchArea)) {
    searchArea = 'rect';
  }

  var capture = function capture(ipc, tabId) {
    switch (searchArea) {
      case 'viewport':
        return Promise.all([ipc.ask('SCREENSHOT_PAGE_INFO', {}, CS_IPC_TIMEOUT), Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreen */ "c"])(tabId)]).then(function (_ref6) {
          var _ref7 = _slicedToArray(_ref6, 2),
              pageInfo = _ref7[0],
              dataUrl = _ref7[1];

          saveDataUrlToLastScreenshot(dataUrl);

          return {
            offset: {
              x: pageInfo.originalX,
              y: pageInfo.originalY
            },
            viewportOffset: {
              x: 0,
              y: 0
            },
            dataUrl: dataUrl

          };
        });

      case 'full':
        {
          return Promise.all([ipc.ask('SCREENSHOT_PAGE_INFO', {}, CS_IPC_TIMEOUT), Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureFullScreen */ "b"])(tabId, {
            startCapture: function startCapture() {
              return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {}, CS_IPC_TIMEOUT);
            },
            endCapture: function endCapture(pageInfo) {
              return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo }, CS_IPC_TIMEOUT);
            },
            scrollPage: function scrollPage(offset) {
              return ipc.ask('SCROLL_PAGE', { offset: offset }, CS_IPC_TIMEOUT);
            }
          })]).then(function (_ref8) {
            var _ref9 = _slicedToArray(_ref8, 2),
                pageInfo = _ref9[0],
                dataUrl = _ref9[1];

            saveDataUrlToLastScreenshot(dataUrl);
            return {
              dataUrl: dataUrl,
              offset: {
                x: 0,
                y: 0
              },
              viewportOffset: {
                x: -1 * pageInfo.originalX,
                y: -1 * pageInfo.originalY
              }
            };
          });
        }

      case 'rect':
        {
          // Note: in this mode, `storedImageRect` is viewport based coordinates
          if (!storedImageRect) {
            throw new Error('rect mode: !storedImageRect should not be empty');
          }

          return ipc.ask('SCREENSHOT_PAGE_INFO').then(function (pageInfo) {
            return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreenInSelectionSimple */ "e"])(tabId, {
              rect: storedImageRect,
              devicePixelRatio: pageInfo.devicePixelRatio
            }).then(function (dataUrl) {
              saveDataUrlToLastScreenshot(dataUrl);

              return {
                dataUrl: dataUrl,
                offset: {
                  x: storedImageRect.x + pageInfo.originalX,
                  y: storedImageRect.y + pageInfo.originalY
                },
                viewportOffset: {
                  x: storedImageRect.x,
                  y: storedImageRect.y
                }
              };
            });
          });
        }

      default:
        {
          if (/^element:/i.test(searchArea)) {
            // Note: in this mode, `storedImageRect` is document based coordinates
            if (!storedImageRect) {
              throw new Error('!storedImageRect should not be empty');
            }

            var fileName = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', _common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_SCREENSHOT_FILE_NAME"]);

            return Promise.all([ipc.ask('SCREENSHOT_PAGE_INFO', {}, CS_IPC_TIMEOUT), getCurrentStorageManager().then(function (storageManager) {
              return storageManager.getScreenshotStorage().read(fileName, 'DataURL');
            })]).then(function (_ref10) {
              var _ref11 = _slicedToArray(_ref10, 2),
                  pageInfo = _ref11[0],
                  dataUrl = _ref11[1];

              return {
                dataUrl: dataUrl,
                offset: {
                  x: storedImageRect.x,
                  y: storedImageRect.y
                },
                viewportOffset: {
                  x: storedImageRect.x - pageInfo.originalX,
                  y: storedImageRect.y - pageInfo.originalY
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

    _common_log__WEBPACK_IMPORTED_MODULE_4___default()('getTargetImage tabIds', state.tabIds, toPlayTabId);

    return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(toPlayTabId, true).then(function () {
      return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
    }).then(function () {
      return capture(ipc, toPlayTabId);
    }).then(function (obj) {
      return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* scaleDataURI */ "h"])(obj.dataUrl, dpiScale).then(function (dataUrl) {
        return {
          dataUrl: dataUrl,
          offset: obj.offset,
          viewportOffset: obj.viewportOffset
        };
      });
    });
  });
};

function logKantuClosing() {
  return getLogServiceForBg().logWithTime('UI.Vision RPA closing');
}

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
          url: _config__WEBPACK_IMPORTED_MODULE_10___default.a.urlAfterUpgrade
        });
      }
    });
  });

  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    // Closing playing tab in player mode
    if (state.status === _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].PLAYER && tabId === state.tabIds.toPlay) {
      // Note: If it's closed by `selectWindow tab=close` command, ignore it
      if (state.pendingPlayingTab) {
        return;
      }

      return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(removeInfo.windowId, { populate: true }).then(function (win) {
        var pActiveTab = !win ? Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getCurrentTab"])().then(function (tab) {
          if (!tab) return null;
          // Do nothing if window is also closed and Kantu window is focused
          if (tab.id === state.tabIds.panel) return null;
          return tab;
        }) : Promise.resolve(win.tabs.find(function (tab) {
          return tab.active;
        }));

        return pActiveTab.then(function (tab) {
          if (tab && tab.id) {
            // This is the main purpose for this callback: Update tabIds.toPlay to new active tab
            state.tabIds.toPlay = tab.id;
          }
        });
      });
    }

    if (tabId === state.tabIds.panel && !state.closingAllWindows) {
      logKantuClosing();
    }
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

      Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tabs[0].id, 100).then(function (ipc) {
        return ipc.ask('TAB_ACTIVATED', {});
      }, function (e) {
        return 'Comment: ingore this error';
      });
    });
  });

  // Note: set the activated tab as the one to play
  _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.onActivated.addListener(function (activeInfo) {
    if (activeInfo.tabId === state.tabIds.panel) return;

    // Just in case we add panel tabId into it before we know it's a panel
    state.tabIds.lastActivated = state.tabIds.lastActivated.concat(activeInfo.tabId).filter(function (tabId) {
      return tabId !== state.tabIds.panel;
    }).slice(-2);

    Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(activeInfo.tabId, 100).then(function (ipc) {
      return ipc.ask('TAB_ACTIVATED', {});
    }, function (e) {
      return 'Comment: ingore this error';
    });

    notifyPanelAboutActiveTab(activeInfo.tabId);

    switch (state.status) {
      case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL:
        // Note: In Firefox, without this delay of 100ms, `tab.url` will still be 'about:config'
        // so have to wait for the url to take effect
        setTimeout(function () {
          _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(activeInfo.tabId).then(function (tab) {
            if (tab.url.indexOf(_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.extension.getURL('')) !== -1) return;

            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('in tab activated, set toPlay to ', activeInfo);
            state.tabIds.lastPlay = state.tabIds.toPlay;
            state.tabIds.toPlay = state.tabIds.firstPlay = activeInfo.tabId;
          });
        }, 100);

        break;

      case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER:
        {
          // Note: three things to do when switch tab in recording
          // 1. set the new tab to RECORDING status,
          // 2. and the original one back to NORMAL status
          // 3. commit a `selectWindow` command
          //
          // Have to wait for the new tab establish connection with background
          Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(activeInfo.tabId, 5000)
          // Note: wait for 2 seconds, expecting commands from original page to be committed
          .then(function (ipc) {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
              return ipc;
            }, 2000);
          }).then(function (ipc) {
            return ipc.ask('SET_STATUS', {
              status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].RECORDING
            });
          }).then(function () {
            // Note: set the original tab to NORMAL status
            // only if the new tab is set to RECORDING status
            return getRecordTabIpc().then(function (ipc) {
              ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].NORMAL
              });
            });
          }).then(function () {
            // Note: get window locator & update recording tab
            var oldTabId = state.tabIds.firstRecord;
            var newTabId = activeInfo.tabId;

            return Promise.all([_common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(oldTabId), _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(newTabId)]).then(function (_ref12) {
              var _ref13 = _slicedToArray(_ref12, 2),
                  oldTab = _ref13[0],
                  newTab = _ref13[1];

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
            }).then(function (shouldNotify) {
              if (shouldNotify) {
                notifyRecordCommand(command);
              }
            });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e.stack);
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

      if (noNotify || !state.tabIds.lastInspect) {
        return Promise.resolve(true);
      }

      return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(state.tabIds.lastInspect).then(function (ipc) {
        return ipc.ask('STOP_INSPECTING');
      }).catch(function (e) {
        return _common_log__WEBPACK_IMPORTED_MODULE_4___default()(e.stack);
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

var pacListener = function pacListener(data) {
  if (data.type === 'PROXY_LOG') {
    _common_log__WEBPACK_IMPORTED_MODULE_4___default()('PROXY_LOG', data);
  }
};

// Processor for all message background could receive
// All messages from panel starts with 'PANEL_'
// All messages from content script starts with 'CS_'
var onRequest = function onRequest(cmd, args) {
  if (cmd !== 'CS_ACTIVATE_ME') {
    _common_log__WEBPACK_IMPORTED_MODULE_4___default()('onAsk', cmd, args);
  }

  switch (cmd) {
    // Mark the tab as panel.
    case 'I_AM_PANEL':
      // When panel window is opened, it's always in normal mode,
      // so make sure contextMenus for record mode are removed

      state.tabIds.panel = args.sender.tab.id;

      Object(_services_contextMenu__WEBPACK_IMPORTED_MODULE_27__["getContextMenuService"])().destroyMenus();

      // Note: when the panel first open first, it could be marked as the tab to play
      // That's something we don't want to happen
      if (state.tabIds.toPlay === args.sender.tab.id) {
        _common_log__WEBPACK_IMPORTED_MODULE_4___default()('I am panel, set toPlay to null');
        state.tabIds.toPlay = state.tabIds.firstPlay = state.tabIds.lastPlay;
      }

      return true;

    case 'PANEL_SET_PROXY':
      {
        return Object(_services_proxy__WEBPACK_IMPORTED_MODULE_25__["setProxy"])(args.proxy).then(function () {
          return true;
        });
      }

    case 'PANEL_GET_PROXY':
      {
        return Object(_services_proxy__WEBPACK_IMPORTED_MODULE_25__["getProxyManager"])().getProxy();
      }

    case 'PANEL_TIME_FOR_BACKUP':
      return isTimeToBackup().then(function (obj) {
        return obj.timeout;
      });

    case 'PANEL_LOG':
      return getLogServiceForBg().log(args.log);

    case 'PANEL_START_RECORDING':
      {
        _common_log__WEBPACK_IMPORTED_MODULE_4___default()('Start to record...');
        state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER;

        setInspectorTabId(null, true);
        toggleRecordingBadge(true);

        var menuInfos = [{
          id: 'verifyText',
          title: 'Verify Text',
          contexts: ['page', 'selection']
        }, {
          id: 'verifyTitle',
          title: 'Verify Title',
          contexts: ['page', 'selection']
        }, {
          id: 'assertText',
          title: 'Assert Text',
          contexts: ['page', 'selection']
        }, {
          id: 'assertTitle',
          title: 'Assert Title',
          contexts: ['page', 'selection']
        }].map(function (item) {
          return _extends({}, item, {
            onclick: function onclick() {
              getRecordTabIpc().then(function (ipc) {
                return ipc.ask('CONTEXT_MENU_IN_RECORDING', { command: item.id });
              });
            }
          });
        });

        Object(_services_contextMenu__WEBPACK_IMPORTED_MODULE_27__["getContextMenuService"])().createMenus(menuInfos);

        var list = state.tabIds.lastActivated.filter(function (id) {
          return id !== state.tabIds.panel;
        });
        var lastActivatedTabId = list[list.length - 1];

        if (lastActivatedTabId) {
          Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(lastActivatedTabId, true).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.warn('Failed to activate current tab: ' + e.message);
          });
        }

        return true;
      }

    case 'PANEL_STOP_RECORDING':
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('Stop recording...');

      Object(_services_contextMenu__WEBPACK_IMPORTED_MODULE_27__["getContextMenuService"])().destroyMenus();
      getRecordTabIpc().then(function (ipc) {
        ipc.ask('SET_STATUS', {
          status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].NORMAL
        });
      });

      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL;
      state.tabIds.lastRecord = state.tabIds.toRecord;
      state.tabIds.toRecord = null;
      state.tabIds.firstRecord = null;

      toggleRecordingBadge(false);
      return true;

    case 'PANEL_TRY_TO_RECORD_OPEN_COMMAND':
      {
        if (state.status !== _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER) {
          throw new Error('Not in recorder mode');
        }

        // Well, `getPlayTab` is actually 'get current active tab'
        return getPlayTab().then(function (tab) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default()('PANEL_TRY_TO_RECORD_OPEN_COMMAND', tab);

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
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('start to inspect...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].INSPECTOR;
      toggleInspectingBadge(true);

      if (state.tabIds.toPlay) {
        Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.toPlay, true);
      }

      return true;

    case 'PANEL_STOP_INSPECTING':
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('start to inspect...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL;

      toggleInspectingBadge(false);
      return setInspectorTabId(null, true);

    case 'PANEL_START_PLAYING':
      {
        _common_log__WEBPACK_IMPORTED_MODULE_4___default()('start to play...');
        state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].PLAYER;
        state.xClickNeedCalibrationInfo = null;

        setInspectorTabId(null, true);
        togglePlayingBadge(true);
        // Note: reset download manager to clear any previous downloads
        Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().reset();
        // Re-check log service to see if xfile is ready to write log
        getLogServiceForBg().check();

        if (state.timer) clearInterval(state.timer);

        return true;
        // .catch(e => {
        //   togglePlayingBadge(false)
        //   throw e
        // })
      }

    case 'PANEL_HEART_BEAT':
      {
        return state.heartBeatSecret;
      }

    case 'PANEL_RUN_COMMAND':
      {
        if (state.timer) clearInterval(state.timer);

        // Note: `disableHeartBeat` is only set to false when current tab will be closed ("reload tab" / "change url" excluded).
        // For exmaple `selectWindow tab=close`
        state.disableHeartBeat = false;

        var isTabOpenForSelectWindow = args.command.cmd === 'selectWindow' && /^\s*tab=open\s*$/i.test(args.command.target);

        var shouldWaitForDownloadAfterRun = function shouldWaitForDownloadAfterRun(command) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default()('shouldWaitForDownloadAfterRun', command);
          if (command.cmd === 'click') return true;
          return false;
        };
        var checkHeartBeat = function checkHeartBeat(timeout, before) {
          if (state.disableHeartBeat) return Promise.resolve(true);
          updateHeartBeatSecret();

          return getPlayTabIpc(timeout, before).then(function (ipc) {
            return ipc.ask('HEART_BEAT', { timeout: timeout, before: before });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error('at least I catched it', e.message);
            throw new Error('heart beat error thrown');
          });
        };
        var shoudWaitForCommand = function shoudWaitForCommand(command) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default()('shoudWaitForCommand', command);
          return (/andWait/i.test(command.cmd) || ['open', 'refresh'].indexOf(command.cmd) !== -1
          );
        };

        // Note: There are several versions of runCommandXXX here. One by one, they have a better tolerence of error
        // 1. runCommand:
        //      Run a command, and wait until we can confirm that command is completed (e.g.  xxxAndWait)
        //
        // 2. runCommandWithRetry:
        //      Enhance runCommand with retry mechanism, only retry when element is not found
        //
        // 3. runCommandWithClosureAndErrorProcess:
        //      Include `args` in closure, and take care of `errorIgnore`
        //
        // 4. runWithHeartBeat:
        //      Run a heart beat check along with `runCommandWithClosureAndErrorProcess`.
        //      Heart beat check requires cs Ipc must be created before heart beat check starts.
        //      With this, we can ensure the page is not closed or refreshed
        //
        // 5. runWithHeartBeatRetry:
        //      Run `runWithHeartBeat` with retry mechanism. only retry when it's a 'lost heart beat' error
        //      When closed/refresh is detected, it will try to send same command to that tab again.
        //

        var commandTimeout = function () {
          var command = args.command;

          var defaultTimeout = command.extra.timeoutElement * 1000;

          switch (command.cmd) {
            case 'waitForElementVisible':
            case 'waitForElementNotVisible':
            case 'waitForElementPresent':
            case 'waitForElementNotPresent':
              {
                var timeout = parseInt(command.value, 10);
                return !isNaN(timeout) ? timeout : defaultTimeout;
              }

            default:
              return defaultTimeout;
          }
        }();

        var runCommand = function runCommand(args, retryInfo) {
          var timeoutPageLoad = (args.command && args.command.extra && args.command.extra.timeoutPageLoad || 60) * 1000;

          if (state.status !== _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].PLAYER) {
            return false;
          }

          return getPlayTabIpc().then(function (ipc) {
            // Note: each command keeps target page's status as PLAYING
            ipc.ask('SET_STATUS', { status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].PLAYING });

            var runWithPageLoadCheck = function runWithPageLoadCheck(promiseFunc) {
              var shouldWait = shoudWaitForCommand(args.command);
              if (!shouldWait) return promiseFunc();

              // Note: send timeout status to dashboard once "xxxWait" and "open" returns
              var clear = startSendingTimeoutStatus(timeoutPageLoad);

              return Promise.race([promiseFunc().then(function (data) {
                clear();return data;
              }, function (e) {
                clear();throw e;
              }), Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
                throw new Error('page load ' + timeoutPageLoad / 1000 + ' seconds time out');
              }, timeoutPageLoad)]);
            };

            // res format: { data, isIFrame }
            var wait = function wait(res) {
              var shouldWait = shoudWaitForCommand(args.command);
              var shouldResetIpc = !res.isIFrame && (/AndWait/i.test(args.command.cmd) || args.command.cmd === 'refresh');
              if (!shouldWait) return Promise.resolve(res.data);

              var timeoutHeartbeat = (res.data && res.data.extra && res.data.extra.timeoutElement || 10) * 1000;

              return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 2000).then(function () {
                // Note: After refresh/redirect, ipc secret in content script changes,
                // use this fact to tell whether a page is loaded or not
                return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["retry"])(function () {
                  return checkHeartBeat().then(function (heartBeatResult) {
                    var lastSecret = state.lastCsIpcSecret;
                    var heartBeatSecret = heartBeatResult.secret;

                    if (lastSecret === heartBeatSecret) {
                      throw new Error('still same ipc secret');
                    }
                    return true;
                  });
                }, {
                  shouldRetry: function shouldRetry() {
                    return true;
                  },
                  timeout: timeoutHeartbeat,
                  retryInterval: 250
                })();
              }).catch(function (e) {
                var cmd = args.command.cmd;

                var isAndWait = /AndWait/.test(cmd);

                console.warn(e);

                if (isAndWait) {
                  var instead = cmd.replace('AndWait', '');
                  throw new Error('\'' + cmd + '\' failed. No page load event detected after ' + timeoutHeartbeat / 1000 + ' seconds. Try \'' + instead + '\' instead. Error detail: ' + e.message);
                } else {
                  throw new Error(cmd + '\' failed. No page load event detected after ' + timeoutHeartbeat / 1000 + ' seconds. Error detail: ' + e.message);
                }
              })
              // Note: must get the new ipc here.
              // The previous ipc is useless after a new page load
              .then(function () {
                return getPlayTabIpc();
              }).then(function (ipc) {
                return ipc.ask('DOM_READY', {}, timeoutPageLoad).then(function () {
                  return ipc.ask('HACK_ALERT', {}, CS_IPC_TIMEOUT);
                });
              }).then(function () {
                return res.data;
              });
            };

            // Note: clear timer whenever we execute a new command, and it's not a retry
            if (state.timer && retryInfo.retryCount === 0) clearInterval(state.timer);

            // Note: -1 will disable ipc timeout for 'pause', and 'onDownload' command
            var ipcTimeout = function () {
              var pageLoadTimeout = (args.command.extra && args.command.extra.timeoutPageLoad || 60) * 1000;

              switch (args.command.cmd) {
                case 'open':
                case 'clickAndWait':
                case 'selectAndWait':
                  return pageLoadTimeout;

                case 'selectWindow':
                  {
                    var target = args.command.target;
                    var isTabOpen = (target && target.toUpperCase()) === 'TAB=OPEN';

                    return isTabOpen ? pageLoadTimeout : commandTimeout;
                  }

                case 'pause':
                case 'onDownload':
                case 'captureEntirePageScreenshot':
                  return -1;

                default:
                  return commandTimeout;
              }
            }();

            return ipc.ask('DOM_READY', {}, ipcTimeout).then(function () {
              return ipc.ask('RUN_COMMAND', {
                command: _extends({}, args.command, {
                  extra: _extends({}, args.command.extra || {}, {
                    retryInfo: retryInfo
                  })
                })
              }, ipcTimeout);
            }).then(function (res) {
              return runWithPageLoadCheck(function () {
                return wait(res);
              });
            }).then(function (res) {
              state.lastCsIpcSecret = res && res.secret;
              return res;
            });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error('all catched by runCommand - ' + e.message);
            throw e;
          });
        };

        var isTimeoutError = function isTimeoutError(msg) {
          return msg && (msg.indexOf('timeout reached when looking for') !== -1 || msg.indexOf('timeout reached when waiting for') !== -1 || msg.indexOf('element is found but not visible yet') !== -1 || msg.indexOf('IPC Promise has been destroyed') !== -1);
        };

        var runCommandWithRetry = function runCommandWithRetry() {
          for (var _len = arguments.length, params = Array(_len), _key = 0; _key < _len; _key++) {
            params[_key] = arguments[_key];
          }

          // Note: add timerSecret to ensure it won't clear timer that is not created by this function call
          var timerSecret = Math.random();
          state.timerSecret = timerSecret;

          var maxRetryOnIpcTimeout = 1;
          var retryCountOnIpcTimeout = 0;

          var fn = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["retry"])(runCommand, {
            timeout: commandTimeout,
            shouldRetry: function shouldRetry(e) {
              _common_log__WEBPACK_IMPORTED_MODULE_4___default()('runCommandWithRetry - shouldRetry', e.message);

              // Note: for rare cases when guest page doesn't respond to RUN_COMMAND, it will timeout for `timeoutElement`
              // And we should retry RUN_COMMAND for only once in that case, and also show this as warning to users
              // related issue: #513
              if (/ipcPromise.*timeout/i.test(e.message)) {
                if (retryCountOnIpcTimeout < maxRetryOnIpcTimeout) {
                  getPanelTabIpc().then(function (ipc) {
                    return ipc.ask('ADD_LOG', {
                      warning: 'Web page connection issue. Retrying last command.'
                    });
                  });

                  retryCountOnIpcTimeout++;
                  return true;
                } else {
                  return false;
                }
              }

              return isTimeoutError(e.message);
            },
            onFirstFail: function onFirstFail(e) {
              var title = e && e.message && e.message.indexOf('element is found but not visible yet') !== -1 ? 'Tag waiting' // All use Tag Waiting for now  // 'Visible waiting'
              : 'Tag waiting';

              startSendingTimeoutStatus(commandTimeout, title);
            },
            onFinal: function onFinal(err, data) {
              _common_log__WEBPACK_IMPORTED_MODULE_4___default()('onFinal', err, data);
              if (state.timer && state.timerSecret === timerSecret) clearInterval(state.timer);
            }
          });

          return fn.apply(undefined, params).catch(function (e) {
            if (!isTimeoutError(e.message)) {
              return Promise.reject(e);
            }

            var args = params[0];
            var command = args.command;


            if (command.targetOptions && command.targetOptions.length) {
              return runCommand.apply(undefined, params.concat([{
                final: true
              }]));
            }

            return Promise.reject(e);
          });
        };

        var runCommandWithClosureAndErrorProcess = function runCommandWithClosureAndErrorProcess() {
          return runCommandWithRetry(args).catch(function (e) {
            // Return default value for storeXXX commands
            if (['storeText', 'storeValue', 'storeChecked', 'storeAttribute'].indexOf(args.command.cmd) !== -1) {
              var value = args.command.value;
              var LOCATOR_NOT_FOUND = '#LNF';

              return {
                vars: _defineProperty({}, value, LOCATOR_NOT_FOUND),
                log: {
                  error: e.message
                }
              };
            }

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
          });
        };

        var runWithHeartBeat = function runWithHeartBeat() {
          var infiniteCheckHeartBeat = function () {
            var startTime = new Date().getTime();
            var stop = false;

            var fn = function fn() {
              _common_log__WEBPACK_IMPORTED_MODULE_4___default()('starting heart beat');
              // Note: do not check heart beat when
              // 1. it's a 'open' command, which is supposed to reconnect ipc
              // 2. it's going to download files, which will kind of reload page and reconnect ipc
              if (shoudWaitForCommand(args.command) || Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().hasPendingDownload()) {
                updateHeartBeatSecret({ disabled: true });
                return new Promise(function () {});
              }

              if (stop) return Promise.resolve();

              return checkHeartBeat(100, startTime).then(function () {
                return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 1000).then(fn);
              }, function (e) {
                _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error('lost heart beart!!', e.stack);
                throw new Error('lost heart beat when running command');
              });
            };
            fn.stop = function () {
              _common_log__WEBPACK_IMPORTED_MODULE_4___default()('stopping heart beat');
              stop = true;
            };

            return fn;
          }();

          return Promise.race([runCommandWithClosureAndErrorProcess().then(function (data) {
            infiniteCheckHeartBeat.stop();
            return data;
          }).catch(function (e) {
            infiniteCheckHeartBeat.stop();
            throw e;
          }), isTabOpenForSelectWindow ? new Promise(function () {}) : infiniteCheckHeartBeat()]);
        };

        var runWithHeartBeatRetry = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["retry"])(runWithHeartBeat, {
          timeout: commandTimeout,
          shouldRetry: function shouldRetry(e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('runWithHeartBeatRetry - shouldRetry', e.message);
            return e && e.message && e.message.indexOf('lost heart beat when running command') !== -1;
          },
          retryInterval: function retryInterval(retryCount, lastRetryInterval) {
            return Math.max(1 * 1000, Math.min(5 * 1000, lastRetryInterval * 1.2));
          }
        });

        var runEternally = function runEternally() {
          return new Promise(function (resolve, reject) {
            var p = runWithHeartBeatRetry().then(function (data) {
              if (shouldWaitForDownloadAfterRun(args.command)) {
                // Note: wait for download to either be create or completed
                return Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().waitForDownloadIfAny().then(function () {
                  return data;
                }, function (e) {
                  Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().reset();
                  return Promise.reject(e);
                });
              }

              return data;
            }).then(function (data) {
              // Note: use bg to set pageUrl, so that we can be sure that this `pageUrl` is 100% correct
              return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.toPlay).then(function (tab) {
                return _extends({}, data, { pageUrl: tab.url });
              }).catch(function (e) {
                _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error('Error in fetching play tab url');
                return data;
              });
            });

            resolve(p);
          });
        };

        var prepare = function prepare() {
          var stopTimeoutStatus = void 0;

          var timeoutPageLoad = (args.command && args.command.extra && args.command.extra.timeoutPageLoad || 60) * 1000;
          var openUrlInTab = function openUrlInTab() {
            var _args$command = args.command,
                cmd = _args$command.cmd,
                target = _args$command.target,
                value = _args$command.value;

            var _ref14 = function () {
              if (cmd === 'open') {
                return [true, false, target];
              }

              if (cmd === 'selectWindow' && target && target.toLowerCase().trim() === 'tab=open') {
                return [true, true, value];
              }

              return [false, false, null];
            }(),
                _ref15 = _slicedToArray(_ref14, 3),
                isOpenCommand = _ref15[0],
                shouldSkipCommandRun = _ref15[1],
                url = _ref15[2];

            if (!isOpenCommand) {
              throw new Error('Error #101: UI.Vision RPA is not connected to a browser tab');
            }

            if (stopTimeoutStatus) {
              stopTimeoutStatus();
            }

            stopTimeoutStatus = startSendingTimeoutStatus(timeoutPageLoad);

            return getPlayTab(url).then(function (tab) {
              return { tab: tab, shouldSkipCommandRun: shouldSkipCommandRun, hasOpenedUrl: true };
            });
          };

          return getPlayTab()
          // Note: catch any error, and make it run 'getPlayTab(args.url)' instead
          .catch(function (e) {
            return { id: -1 };
          }).then(function (tab) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('after first getPlayTab', tab);

            // On Firefox, it does get ipc from "about:blank", but somehow the connection is not good
            // it's always reconnecting. so instead of trying to run command on "about:blank",
            // redirect it to meaningful url
            var unresponsiblePages = ['about:blank', 'about:config'];

            if (unresponsiblePages.indexOf(tab.url) !== -1) {
              return openUrlInTab();
            }

            var ensureTabHasIpc = function ensureTabHasIpc() {
              var run = function run() {
                return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tab.id, 100).then(function (ipc) {
                  return { tab: tab, hasOpenedUrl: false };
                }, function (e) {
                  return openUrlInTab();
                }).then(function (_ref16) {
                  var tab = _ref16.tab,
                      hasOpenedUrl = _ref16.hasOpenedUrl,
                      shouldSkipCommandRun = _ref16.shouldSkipCommandRun;

                  return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tab.id, timeoutPageLoad).then(function (ipc) {
                    return ipc.ask('HEART_BEAT', 1000);
                  }).then(function () {
                    if (stopTimeoutStatus) {
                      stopTimeoutStatus();
                    }

                    return { tab: tab, hasOpenedUrl: hasOpenedUrl, shouldSkipCommandRun: shouldSkipCommandRun };
                  });
                });
              };

              // Note: in case the playing tab exists but not has a broken page, and is not reachable by tabs.sendMessage
              // We should try to run open command again if any
              return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["withTimeout"])(timeoutPageLoad, function () {
                return run().catch(function (e) {
                  if (/Could not establish connection/.test(e.message)) {
                    return openUrlInTab().then(run);
                  }

                  throw e;
                });
              }).catch(function (e) {
                if (/withTimeout/.test(e.message)) {
                  throw new Error('UI.Vision RPA fails to open this url');
                }
                throw e;
              });
            };

            return ensureTabHasIpc().then(function (_ref17) {
              var tab = _ref17.tab,
                  hasOpenedUrl = _ref17.hasOpenedUrl,
                  shouldSkipCommandRun = _ref17.shouldSkipCommandRun;

              // const p = args.shouldNotActivateTab ? Promise.resolve() : activateTab(tab.id, true)
              var p = Promise.resolve();

              // Note: wait for tab to confirm it has loaded
              return p.then(function () {
                return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tab.id, 6000 * 10);
              }).then(function (ipc) {
                var p = !hasOpenedUrl ? Promise.resolve() : ipc.ask('MARK_NO_COMMANDS_YET', {}, CS_IPC_TIMEOUT);
                return p.then(function () {
                  return ipc.ask('SET_STATUS', { status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].PLAYING }, CS_IPC_TIMEOUT);
                });
              }).then(function () {
                return shouldSkipCommandRun;
              });
            });
          });
        };

        return prepare().then(function (shouldSkipCommandRun) {
          if (shouldSkipCommandRun) {
            return true;
          }

          return runEternally().catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error('catched by runEternally', e.stack);

            if (e && e.message && (e.message.indexOf('lost heart beat when running command') !== -1 || e.message.indexOf('Could not establish connection') !== -1)) {
              return runEternally();
            }
            throw e;
          });
        });
      }

    case 'PANEL_STOP_PLAYING':
      {
        togglePlayingBadge(false);
        state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL;

        // Note: reset download manager to clear any previous downloads
        Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().reset();

        // Note: reset firstPlay to current toPlay when stopped playing
        // userful for playing loop (reset firstPlay after each loop)
        state.tabIds.firstPlay = state.tabIds.toPlay;

        // reset lastPlay here is useful for ContinueInLastUsedTab
        state.tabIds.lastPlay = state.tabIds.toPlay;

        if (state.timer) clearInterval(state.timer);

        // Note: let cs know that it should exit playing mode
        return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(state.tabIds.toPlay).then(function (ipc) {
          return ipc.ask('SET_STATUS', { status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].NORMAL }, CS_IPC_TIMEOUT);
        });
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
          return Promise.all(list.map(function (_ref18) {
            var ipc = _ref18.ipc,
                type = _ref18.type;

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

          return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(tabId, true).then(function () {
            return item.ipc.ask('HIGHLIGHT_DOM', { locator: args.locator });
          });
        });
      }

    case 'PANEL_HIGHLIGHT_RECT':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('HIGHLIGHT_RECT', args, CS_IPC_TIMEOUT);
        });
      }

    case 'PANEL_HIGHLIGHT_RECTS':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('HIGHLIGHT_RECTS', args, CS_IPC_TIMEOUT);
        });
      }

    case 'PANEL_HIGHLIGHT_DESKTOP_RECTS':
      {
        return Object(_desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18__["runInDesktopScreenshotEditor"])({
          type: _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].RequestType.DisplayVisualResult,
          data: {
            rects: args.scoredRects,
            image: args.imageInfo
          }
        });
      }

    case 'PANEL_HIGHLIGHT_OCR_MATCHES':
      {
        if (args.isDesktop) {
          return getCurrentStorageManager().then(function (storageManager) {
            var source = storageManager.getCurrentStrategyType() === _services_storage__WEBPACK_IMPORTED_MODULE_12__["StorageStrategyType"].XFile ? _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].ImageSource.HardDrive : _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].ImageSource.Storage;

            return Object(_desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18__["runInDesktopScreenshotEditor"])({
              type: _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].RequestType.DisplayOcrResult,
              data: {
                ocrMatches: args.ocrMatches,
                image: {
                  source: source,
                  path: Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', _common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_DESKTOP_SCREENSHOT_FILE_NAME"])
                }
              }
            });
          });
        } else {
          return getPlayTabIpc().then(function (ipc) {
            return ipc.ask('HIGHLIGHT_OCR_MATCHES', args, CS_IPC_TIMEOUT);
          });
        }
      }

    case 'PANEL_CLEAR_OCR_MATCHES_ON_PLAYING_PAGE':
      {
        return getPlayTabIpc().then(function (ipc) {
          return Promise.all([ipc.ask('CLEAR_VISION_RECTS', {}, CS_IPC_TIMEOUT), ipc.ask('CLEAR_OCR_MATCHES', {}, CS_IPC_TIMEOUT)]);
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
        state.closingAllWindows = true;

        return logKantuClosing().catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.warn('Error in log => RPA closing: ', e.message);
        }).then(function () {
          closeAllWindows();
          return true;
        });
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

    case 'PANEL_MINIMIZE_ALL_WINDOWS_BUT_PANEL':
      {
        var pPanelTab = !state.tabIds.panel ? Promise.resolve() : _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.panel);
        var pAllWindows = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getAll();

        return Promise.all([pPanelTab, pAllWindows]).then(function (_ref19) {
          var _ref20 = _slicedToArray(_ref19, 2),
              tab = _ref20[0],
              wins = _ref20[1];

          var list = !tab ? wins : wins.filter(function (win) {
            return win.id !== tab.windowId;
          });
          return Promise.all(list.map(function (win) {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(win.id, { state: 'minimized' });
          }));
        }).then(function () {
          return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
            return true;
          }, 500);
        });
      }

    case 'PANEL_MINIMIZE_ALL_WINDOWS':
      {
        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.getAll().then(function (wins) {
          return Promise.all(wins.map(function (win) {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(win.id, { state: 'minimized' });
          })).then(function () {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
              return true;
            }, 500);
          });
        });
      }

    case 'PANEL_BRING_PANEL_TO_FOREGROUND':
      {
        return showPanelWindow().then(function () {
          return true;
        });
      }

    case 'PANEL_BRING_PLAYING_WINDOW_TO_FOREGROUND':
      {
        return getPlayTab().then(function (tab) {
          return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(tab.id, true);
        }).catch(function (e) {
          return showPanelWindow();
        }).then(function () {
          return true;
        });
      }

    /*    case 'PANEL_IS_PLAYING_WINDOW_IN_FOREGROUND': {
          return getPlayTab()
          .then(tab => {
            if (!tab) return false
    
            return Ext.windows.get(tab.windowId)
            .then(win => !!win.focused)
          })
        }
    */

    case 'PANEL_RESIZE_PLAY_TAB':
      {
        return getPlayTab().then(function (tab) {
          return Object(_common_resize_window__WEBPACK_IMPORTED_MODULE_14__["resizeViewportOfTab"])(tab.id, args);
        });
      }

    case 'PANEL_SELECT_AREA_ON_CURRENT_PAGE':
      {
        return getPlayTabIpc().then(function (ipc) {
          Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.toPlay, true);
          return ipc.ask('SELECT_SCREEN_AREA');
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e.stack);
          throw new Error('Not able to take screenshot on the current tab');
        });
      }

    case 'PANEL_SELECT_AREA_ON_DESKTOP':
      {
        var captureDesktopViaNativeCVAPI = function captureDesktopViaNativeCVAPI() {
          return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])().captureDesktop({ path: undefined }).then(function (hardDrivePath) {
            return Object(_desktop_screenshot_editor_service__WEBPACK_IMPORTED_MODULE_18__["runInDesktopScreenshotEditor"])({
              type: _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].RequestType.Capture,
              data: {
                image: {
                  source: _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].ImageSource.CV,
                  path: hardDrivePath
                }
              }
            });
          });
        };
        var captureDesktopViaNativeScreenCapture = function captureDesktopViaNativeScreenCapture() {
          return Object(_services_screen_capture__WEBPACK_IMPORTED_MODULE_28__["getNativeScreenCapture"])().captureDesktop().then(function (hardDrivePath) {
            return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])().readFileAsDataURL(hardDrivePath, true);
          });
        };
        var shouldUseNativeScreenCapture = function shouldUseNativeScreenCapture() {
          return Promise.all([_common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function (config) {
            return config.useDesktopScreenCapture;
          }), Object(_services_xmodules_x_screen_capture__WEBPACK_IMPORTED_MODULE_29__["getXScreenCapture"])().sanityCheck().catch(function () {
            return false;
          })]).then(function (_ref21) {
            var _ref22 = _slicedToArray(_ref21, 2),
                optedInNativeScreenCapture = _ref22[0],
                hasInstalledNativeScreenCapture = _ref22[1];

            return optedInNativeScreenCapture && hasInstalledNativeScreenCapture;
          });
        };

        return shouldUseNativeScreenCapture().then(function (should) {
          var captureDesktop = should ? captureDesktopViaNativeScreenCapture : captureDesktopViaNativeCVAPI;

          return captureDesktop().then(function (dataUrl) {
            return withPanelIpc().then(function (panelIpc) {
              return panelIpc.ask('ADD_VISION_IMAGE', { dataUrl: dataUrl });
            });
          });
        });
      }

    case 'PANEL_CLEAR_VISION_RECTS_ON_PLAYING_PAGE':
      {
        return getPlayTabIpc().then(function (ipc) {
          return Promise.all([ipc.ask('CLEAR_VISION_RECTS', {}, CS_IPC_TIMEOUT), ipc.ask('CLEAR_OCR_MATCHES', {}, CS_IPC_TIMEOUT)]);
        });
      }

    case 'PANEL_HIDE_VISION_HIGHLIGHT':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('HIDE_VISION_RECTS', {}, CS_IPC_TIMEOUT);
        });
      }

    case 'PANEL_SHOW_VISION_HIGHLIGHT':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('SHOW_VISION_RECTS', {}, CS_IPC_TIMEOUT);
        });
      }

    case 'PANEL_SEARCH_VISION_ON_PLAYING_PAGE':
      {
        var visionFileName = args.visionFileName,
            minSimilarity = args.minSimilarity,
            _args$searchArea = args.searchArea,
            searchArea = _args$searchArea === undefined ? 'full' : _args$searchArea,
            storedImageRect = args.storedImageRect,
            command = args.command,
            cvScope = args.cvScope;

        var commandExtra = command.extra || {};
        var requireGreenPinkBoxes = !!commandExtra.relativeVisual;
        var enableGreenPinkBoxes = typeof commandExtra.relativeVisual === 'boolean' ? commandExtra.relativeVisual : /_relative\.png$/i.test(visionFileName);
        var patternDpi = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dpiFromFileName"])(visionFileName) || 96;
        var screenDpi = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["getScreenDpi"])();
        var dpiScale = patternDpi / screenDpi;
        var pStorageMan = getCurrentStorageManager();
        var getPatternImage = function getPatternImage(fileName) {
          return pStorageMan.then(function (storageMan) {
            var visionStorage = storageMan.getVisionStorage();

            return visionStorage.exists(fileName).then(function (existed) {
              if (!existed) throw new Error('Error #121: ' + command.cmd + ': No input image found for file name \'' + fileName + '\'');
              return visionStorage.read(fileName, 'DataURL');
            });
          });
        };

        if (minSimilarity < 0.1 || minSimilarity > 1.0) {
          throw new Error('confidence should be between 0.1 and 1.0');
        }

        var pRegions = function () {
          switch (cvScope) {
            case 'desktop':
              {
                var isFullScreenshot = searchArea !== 'rect' && !/\.png/i.test(searchArea) || !storedImageRect;

                return Object(_services_xmodules_xdesktop__WEBPACK_IMPORTED_MODULE_21__["getXDesktop"])().sanityCheck().then(function () {
                  return getPatternImage(visionFileName);
                }).then(function (dataUrl) {
                  return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])().getImageFromDataUrl(dataUrl, patternDpi);
                }).then(function (imageObj) {
                  // Note: storedImageRect is supposed to be also returned by this API call
                  // thus it is scaled down by (1 / window.devicePixelRatio),
                  // we should recover coordiates to screen pixels
                  var searchArea = isFullScreenshot ? undefined : {
                    x: window.devicePixelRatio * storedImageRect.x,
                    y: window.devicePixelRatio * storedImageRect.y,
                    width: window.devicePixelRatio * storedImageRect.width,
                    height: window.devicePixelRatio * storedImageRect.height
                  };

                  return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])().searchDesktopWithGuard({
                    pattern: imageObj,
                    options: {
                      searchArea: searchArea,
                      minSimilarity: minSimilarity,
                      enableGreenPinkBoxes: enableGreenPinkBoxes,
                      requireGreenPinkBoxes: requireGreenPinkBoxes,
                      enableHighDpi: true,
                      allowSizeVariation: true,
                      saveCaptureOnDisk: true,
                      limitSearchArea: !isFullScreenshot
                    }
                  }).then(function (result) {
                    return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])().readFileAsDataURL(result.capturePath, true).then(function (dataUrl) {
                      return saveDataUrlToLastDesktopScreenshot(dataUrl)
                      // Note: convert coordinates to CSS pixels
                      .then(function () {
                        return Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["convertImageSearchResult"])(result, 1 / window.devicePixelRatio, searchArea);
                      });
                    });
                  });
                });
              }

            case 'browser':
            default:
              return Promise.all([getPatternImage(visionFileName), getScreenshotInSearchArea({ searchArea: searchArea, storedImageRect: storedImageRect, dpiScale: dpiScale })]).then(function (_ref23) {
                var _ref24 = _slicedToArray(_ref23, 2),
                    patternImageUrl = _ref24[0],
                    targetImageInfo = _ref24[1];

                var targetImageUrl = targetImageInfo.dataUrl;
                var pageOffset = targetImageInfo.offset;
                var viewportOffset = targetImageInfo.viewportOffset;

                return Object(_services_vision_adaptor_ts__WEBPACK_IMPORTED_MODULE_11__["searchImage"])({
                  patternImageUrl: patternImageUrl,
                  targetImageUrl: targetImageUrl,
                  minSimilarity: minSimilarity,
                  enableGreenPinkBoxes: enableGreenPinkBoxes,
                  requireGreenPinkBoxes: requireGreenPinkBoxes,
                  allowSizeVariation: true,
                  scaleDownRatio: dpiScale * window.devicePixelRatio,
                  pageOffsetX: pageOffset.x || 0,
                  pageOffsetY: pageOffset.y || 0,
                  viewportOffsetX: viewportOffset.x || 0,
                  viewportOffsetY: viewportOffset.y || 0
                }).then(function (regions) {
                  return regions.map(function (matched) {
                    return { matched: matched, reference: null };
                  });
                });
              });
          }
        }();

        return pRegions.then(function (regions) {
          return {
            regions: regions,
            imageInfo: {
              source: _desktop_screenshot_editor_types__WEBPACK_IMPORTED_MODULE_19__["DesktopScreenshot"].ImageSource.Storage,
              path: Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["ensureExtName"])('.png', Object(_common_cv_utils__WEBPACK_IMPORTED_MODULE_24__["isCVTypeForDesktop"])(cvScope) ? _common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_DESKTOP_SCREENSHOT_FILE_NAME"] : _common_constant__WEBPACK_IMPORTED_MODULE_3__["LAST_SCREENSHOT_FILE_NAME"])
            }
          };
        });
      }

    case 'PANEL_GET_PIXEL_COLOR_IN_SCREENSHOT':
      {
        var type = args.type,
            offset = args.offset;

        var pScreenshot = function () {
          switch (type) {
            case 'browser':
              {
                var toPlayTabId = state.tabIds.toPlay;

                return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(toPlayTabId, true).then(function () {
                  return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
                })
                // Set scale factor to 1 / window.devicePixelRatio, so that the screenshot is in css pixel.
                .then(function () {
                  return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreen */ "c"])(toPlayTabId, Object(_common_dom_utils__WEBPACK_IMPORTED_MODULE_20__["isFirefox"])() ? 1 : 1 / window.devicePixelRatio);
                }).then(function (dataUrl) {
                  saveDataUrlToLastScreenshot(dataUrl);
                  return dataUrl;
                });
              }

            case 'desktop':
              {
                var cvApi = Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])();

                // On the other hand, desktop screenshot is in device pixel
                return cvApi.captureDesktop({ path: undefined }).then(function (hardDrivePath) {
                  return cvApi.readFileAsDataURL(hardDrivePath, true);
                }).then(function (dataUrl) {
                  saveDataUrlToLastDesktopScreenshot(dataUrl);
                  return dataUrl;
                });
              }

            default:
              throw new Error('Unsupported type: ' + type);
          }
        }();

        return pScreenshot.then(function (dataUrl) {
          return Object(_common_dom_utils__WEBPACK_IMPORTED_MODULE_20__["getPixel"])({
            dataUrl: dataUrl,
            x: offset.x,
            y: offset.y
          });
        });
      }

    case 'PANEL_CAPTURE_IMAGE':
      {
        var _searchArea = args.searchArea,
            _storedImageRect = args.storedImageRect,
            scaleDpi = args.scaleDpi,
            isDesktop = args.isDesktop;


        if (isDesktop) {
          var cvApi = Object(_services_desktop__WEBPACK_IMPORTED_MODULE_16__["getNativeCVAPI"])();
          var crop = function crop(imgSrc) {
            switch (_searchArea) {
              case 'rect':
                {
                  if (!_storedImageRect) {
                    throw new Error('storedImageRect is required');
                  }
                  // Note: Must scale up rect to screen coordinates
                  return Object(_common_dom_utils__WEBPACK_IMPORTED_MODULE_20__["subImage"])(imgSrc, Object(_common_dom_utils__WEBPACK_IMPORTED_MODULE_20__["scaleRect"])(_storedImageRect, window.devicePixelRatio)).then(function (dataUrl) {
                    return {
                      dataUrl: dataUrl,
                      offset: {
                        x: _storedImageRect.x,
                        y: _storedImageRect.y
                      }
                    };
                  });
                }

              default:
                {
                  return Promise.resolve({
                    dataUrl: imgSrc,
                    offset: { x: 0, y: 0 }
                  });
                }
            }
          };

          return cvApi.captureDesktop({ path: undefined }).then(function (hardDrivePath) {
            return cvApi.readFileAsDataURL(hardDrivePath, true);
          }).then(function (originalDataUrl) {
            return crop(originalDataUrl).then(function (_ref25) {
              var dataUrl = _ref25.dataUrl,
                  offset = _ref25.offset;

              return Promise.all([saveDataUrlToLastScreenshot(dataUrl), saveDataUrlToLastDesktopScreenshot(originalDataUrl)]).then(function () {
                return {
                  dataUrl: dataUrl,
                  offset: offset,
                  viewportOffset: offset,
                  scale: 1 / window.devicePixelRatio
                };
              });
            });
          });
        } else {
          return getScreenshotInSearchArea({
            searchArea: _searchArea,
            storedImageRect: _storedImageRect,
            dpiScale: scaleDpi ? 96 / Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["getScreenDpi"])() : 1
          });
        }
      }

    case 'PANEL_SCREENSHOT_PAGE_INFO':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('SCREENSHOT_PAGE_INFO', {}, CS_IPC_TIMEOUT);
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

    case 'PANEL_TOGGLE_HIGHLIGHT_VIEWPORT':
      {
        return getPlayTabIpc().then(function (ipc) {
          return ipc.ask('TOGGLE_HIGHLIGHT_VIEWPORT', args, CS_IPC_TIMEOUT);
        });
      }

    case 'PANEL_DISABLE_DOWNLOAD_BAR':
      {
        _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.setShelfEnabled(false);
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
          return true;
        }, 1000);
      }

    case 'PANEL_ENABLE_DOWNLOAD_BAR':
      {
        _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.setShelfEnabled(true);
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
          return true;
        }, 1000);
      }

    case 'PANEL_GET_VIEWPORT_RECT_IN_SCREEN':
      {
        return Promise.all([getPlayTabIpc(), getPlayTab().then(function (tab) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.getZoom(tab.id);
        })]).then(function (_ref26) {
          var _ref27 = _slicedToArray(_ref26, 2),
              ipc = _ref27[0],
              zoom = _ref27[1];

          return getPlayTabIpc().then(function (ipc) {
            return ipc.ask('GET_VIEWPORT_RECT_IN_SCREEN', { zoom: zoom });
          });
        });
      }

    case 'PANEL_XCLICK_NEED_CALIBRATION':
      {
        var last = state.xClickNeedCalibrationInfo;
        var getWindowInfo = function getWindowInfo(win, tabId) {
          return {
            id: win.id,
            top: win.top,
            left: win.left,
            width: win.width,
            height: win.height,
            activeTabId: tabId
          };
        };
        var isWindowInfoEqual = function isWindowInfoEqual(a, b) {
          return _common_utils__WEBPACK_IMPORTED_MODULE_1__["and"].apply(undefined, _toConsumableArray('id, top, left, width, height, activeTabId'.split(/,\s*/g).map(function (key) {
            return a[key] === b[key];
          })));
        };
        // Note: we take every request as it will do calibration
        // and next request should get `false` (no need for more calibration, unless there are window change or window resize)
        return getPlayTab().then(function (tab) {
          if (!tab) throw new Error('no play tab found for calibration');

          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(tab.windowId).then(function (win) {
            var winInfo = getWindowInfo(win, tab.id);

            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('CALIBRATION NEED???', last, winInfo);

            // Note: cache last value
            state.xClickNeedCalibrationInfo = winInfo;

            return !isWindowInfoEqual(winInfo, last || {});
          });
        });
      }

    case 'PANEL_CLOSE_CURRENT_TAB_AND_SWITCH_TO_LAST_PLAYED':
      {
        return getPlayTab().then(function (currentTab) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(currentTab.windowId, { populate: true }).then(function (win) {
            if (win.tabs.length < 2) return true;

            var index = win.tabs.findIndex(function (tab) {
              return tab.id === currentTab.id;
            });
            var prevIndex = (index - 1 + win.tabs.length) % win.tabs.length;
            var prevTab = win.tabs[prevIndex];

            var pNextTab = function () {
              if (state.tabIds.lastPlay) {
                return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.lastPlay).catch(function () {
                  return prevTab;
                });
              } else {
                return Promise.resolve(prevTab);
              }
            }();

            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.remove(currentTab.id).then(function () {
              return pNextTab;
            }).then(function (nextTab) {
              return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(nextTab.id);
            })
            // Note: add this delay to avoid Error #101
            // looks like when the pc is quick enough, there are chances
            // that next macro run fails to find the tab for replay
            .then(function () {
              return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 500);
            }).then(function () {
              return true;
            });
          });
        });
      }

    case 'CS_LOAD_URL':
      {
        var tabId = args.sender.tab.id;
        var url = args.url;

        return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getTab"])(tabId).then(function (tab) {
          var finalUrl = function () {
            try {
              var u = new URL(url, tab.url);
              return u.toString();
            } catch (e) {
              return url;
            }
          }();

          return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["updateUrlForTab"])(tabId, finalUrl).then(function () {
            return true;
          });
        });
      }

    case 'CS_STORE_SCREENSHOT_IN_SELECTION':
      {
        var rect = args.rect,
            devicePixelRatio = args.devicePixelRatio,
            fileName = args.fileName;

        var _tabId = args.sender.tab.id;

        return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(_tabId).then(function (ipc) {
          return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.toPlay, true).then(function () {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
          }).then(function () {
            return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreenInSelection */ "d"])(state.tabIds.toPlay, { rect: rect, devicePixelRatio: devicePixelRatio }, {
              startCapture: function startCapture() {
                return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', { hideScrollbar: false });
              },
              endCapture: function endCapture(pageInfo) {
                return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo });
              },
              scrollPage: function scrollPage(offset) {
                return ipc.ask('SCROLL_PAGE', { offset: offset });
              }
            });
          }).then(function (dataUrl) {
            return getCurrentStorageManager().then(function (storageManager) {
              return storageManager.getScreenshotStorage().overwrite(fileName, Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["dataURItoBlob"])(dataUrl)).then(function () {
                getPanelTabIpc().then(function (panelIpc) {
                  return panelIpc.ask('RESTORE_SCREENSHOTS');
                });

                return fileName;
              });
            });
          });
        });
      }

    case 'CS_SCREEN_AREA_SELECTED':
      {
        var _rect = args.rect,
            _devicePixelRatio = args.devicePixelRatio;

        var _tabId2 = args.sender.tab.id;

        _common_log__WEBPACK_IMPORTED_MODULE_4___default()('CS_SCREEN_AREA_SELECTED', _rect, _devicePixelRatio, _tabId2);

        return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* captureScreenInSelectionSimple */ "e"])(args.sender.tab.id, { rect: _rect, devicePixelRatio: _devicePixelRatio }).then(function (dataUrl) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default()('CS_SCREEN_AREA_SELECTED', 'got reuslt', dataUrl.length);
          return withPanelIpc().then(function (panelIpc) {
            return panelIpc.ask('ADD_VISION_IMAGE', { dataUrl: dataUrl });
          });
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e.stack);
          throw e;
        });
      }

    case 'CS_DONE_INSPECTING':
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('done inspecting...');
      state.status = _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].NORMAL;

      toggleInspectingBadge(false);
      setInspectorTabId(null, true, true);
      Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.panel, true);

      return getPanelTabIpc().then(function (panelIpc) {
        return panelIpc.ask('INSPECT_RESULT', args);
      });

    // It's used for inspecting. The first tab which sends a CS_ACTIVATE_ME event
    // on mouse over event will be the one for us to inspect
    case 'CS_ACTIVATE_ME':
      // log('CS_ACTIVATE_ME state.status', state.status)

      switch (state.status) {
        case _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].INSPECTOR:
          if (!state.tabIds.toInspect) {
            state.tabIds.toInspect = args.sender.tab.id;

            setTimeout(function () {
              Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(state.tabIds.toInspect).then(function (ipc) {
                return ipc.ask('SET_STATUS', {
                  status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].INSPECTING
                });
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

        if (state.status !== _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER) {
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
          Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(state.tabIds.toRecord).then(function (ipc) {
            return ipc.ask('SET_STATUS', {
              status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].RECORDING
            });
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
          return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config');
        }).then(function (config) {
          if (config.recordNotification && state.status === _common_constant__WEBPACK_IMPORTED_MODULE_3__["APP_STATUS"].RECORDER) {
            notifyRecordCommand(args);
          }
        }).then(function () {
          return true;
        });
      }

    case 'CS_CLOSE_OTHER_TABS':
      {
        var _tabId3 = args.sender.tab.id;

        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(_tabId3).then(function (tab) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ windowId: tab.windowId }).then(function (tabs) {
            return tabs.filter(function (t) {
              return t.id !== _tabId3;
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

    case 'CS_CLOSE_CURRENT_TAB':
      {
        var _tabId4 = args.sender.tab.id;

        // Note: must disable heart beat check here, since the heart beat of current tab is destined to be lost
        // The following two states are dedicated to this close tab task
        state.disableHeartBeat = true;
        state.pendingPlayingTab = true;

        var closeTabAndGetNextTabOnWindow = function closeTabAndGetNextTabOnWindow(winId) {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.remove(_tabId4).then(function () {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
              return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getCurrentTab"])(winId);
            }, 1000);
          });
        };

        var withKantuWindowMinimized = function withKantuWindowMinimized(fn) {
          var getPanelWinId = function getPanelWinId() {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.panel).then(function (tab) {
              return tab.windowId;
            });
          };
          var minimize = function minimize() {
            return getPanelWinId().then(function (winId) {
              return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(winId, { state: 'minimized' });
            });
          };
          var restore = function restore() {
            return getPanelWinId().then(function (winId) {
              return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.update(winId, { state: 'normal' });
            });
          };

          return minimize().then(function () {
            return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, 1000);
          }).then(fn).then(function (data) {
            restore();
            return data;
          }, function (e) {
            restore();
            throw e;
          });
        };

        var closeAndGetNextTab = function closeAndGetNextTab() {
          return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(_tabId4).then(function (tab) {
            // Note: If the current tab is the only tab in its window, we won't know which one is the next focused window,
            // if Kantu window happens to be on the top. In this case, we need to focus on the tab
            // that is going to be closed first
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.windows.get(tab.windowId, { populate: true }).then(function (win) {
              if (win.tabs.length !== 1) {
                return closeTabAndGetNextTabOnWindow(tab.windowId);
              }

              // If Kantu window is now on top, try to pick the next one (by minimize Kantu window)
              // Otherwise pick the current tab will be fine
              return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getCurrentTab"])().then(function (tab) {
                if (tab && tab.id !== state.tabIds.panel) {
                  return closeTabAndGetNextTabOnWindow().then(function (tab) {
                    if (tab && tab.id === state.tabIds.panel) {
                      return withKantuWindowMinimized(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["getCurrentTab"]);
                    }
                    return tab;
                  });
                }

                return withKantuWindowMinimized(closeTabAndGetNextTabOnWindow);
              });
            });
          }).catch(function (e) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e);
          });
        };

        var runWithTab = function runWithTab(pTab) {
          return pTab.then(function (tab) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('getCurrentTab - ', tab);

            var isValidTab = !!tab && !!tab.id;
            var isPanelTab = isValidTab && tab.id === state.tabIds.panel;

            state.tabIds.toPlay = isValidTab && !isPanelTab ? tab.id : null;
          }).catch(function () {}).then(function () {
            // Note: should always reset pendingPlayingTab, no matter there is an error or not
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('resetting pendingPlayingTab');
            state.pendingPlayingTab = false;
          });
        };

        // Note: Must return `true` first, and delay the close of tab,
        // otherwise "run command" ipc request from background will fail
        Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
          runWithTab(closeAndGetNextTab());
        }, 200);

        return true;
      }

    case 'CS_SELECT_WINDOW':
      {
        var oldTablId = args.sender.tab.id;

        var _splitIntoTwo = Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["splitIntoTwo"])('=', args.target),
            _splitIntoTwo2 = _slicedToArray(_splitIntoTwo, 2),
            _type = _splitIntoTwo2[0],
            locator = _splitIntoTwo2[1];

        if (!locator) {
          throw new Error('invalid window locator, \'' + args.target + '\'');
        }

        var pGetTabs = void 0;

        switch (_type.toLowerCase()) {
          case 'title':
            pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({ title: locator });
            break;

          case 'tab':
            {
              if (/^\s*open\s*$/i.test(locator)) {
                pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.toPlay).then(function (tab) {
                  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({ url: args.value, windowId: tab.windowId });
                }).then(function (tab) {
                  return [tab];
                });
              } else {
                var _offset = parseInt(locator, 10);

                if (isNaN(_offset)) {
                  throw new Error('invalid tab offset, \'' + locator + '\'');
                }

                pGetTabs = _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.get(state.tabIds.firstPlay).then(function (tab) {
                  return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.query({
                    windowId: tab.windowId,
                    index: tab.index + _offset
                  });
                });
              }

              break;
            }

          default:
            throw new Error('window locator type \'' + _type + '\' not supported');
        }

        return pGetTabs.then(function (tabs) {
          if (tabs.length === 0) {
            throw new Error('failed to find the tab with locator \'' + args.target + '\'');
          }
          return tabs[0];
        }).then(function (tab) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default()('selectWindow, got tab', tab);

          return Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(tab.id, 30000).catch(function (e) {
            if (/tab=\s*open\s*/i.test(args.target)) {
              throw new Error('To open a new tab, a valid URL is needed');
            }
            throw e;
          }).then(function (ipc) {
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('selectWindow, got ipc', ipc);

            return ipc.ask('DOM_READY', {}).then(function () {
              ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].PLAYING
              });

              return true;
            });
          }).then(function () {
            // Note: set the original tab to NORMAL status
            // only if the new tab is set to PLAYING status
            _common_log__WEBPACK_IMPORTED_MODULE_4___default()('selectWindow, set orignial to normal');

            Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().get(oldTablId).then(function (ipc) {
              return ipc.ask('SET_STATUS', {
                status: _common_constant__WEBPACK_IMPORTED_MODULE_3__["CONTENT_SCRIPT_STATUS"].NORMAL
              });
            });
          }).then(function () {
            state.tabIds.lastPlay = state.tabIds.toPlay;
            state.tabIds.toPlay = tab.id;
            return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(tab.id);
          });
        }).catch(function (e) {
          _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.error(e.stack);
          throw e;
        });
      }

    case 'CS_CAPTURE_SCREENSHOT':
      return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.toPlay, true).then(function () {
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
      }).then(function () {
        return getCurrentStorageManager().then(function (storageManager) {
          return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* saveScreen */ "g"])(storageManager.getScreenshotStorage(), state.tabIds.toPlay, args.fileName);
        });
      });

    case 'CS_CAPTURE_FULL_SCREENSHOT':
      return Object(_common_tab_utils__WEBPACK_IMPORTED_MODULE_17__["activateTab"])(state.tabIds.toPlay, true).then(function () {
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {}, SCREENSHOT_DELAY);
      }).then(getPlayTabIpc).then(function (ipc) {
        return getCurrentStorageManager().then(function (storageManager) {
          return Object(_common_capture_screenshot__WEBPACK_IMPORTED_MODULE_6__[/* saveFullScreen */ "f"])(storageManager.getScreenshotStorage(), state.tabIds.toPlay, args.fileName, {
            startCapture: function startCapture() {
              return ipc.ask('START_CAPTURE_FULL_SCREENSHOT', {}, CS_IPC_TIMEOUT);
            },
            endCapture: function endCapture(pageInfo) {
              return ipc.ask('END_CAPTURE_FULL_SCREENSHOT', { pageInfo: pageInfo }, CS_IPC_TIMEOUT);
            },
            scrollPage: function scrollPage(offset) {
              return ipc.ask('SCROLL_PAGE', { offset: offset }, CS_IPC_TIMEOUT);
            }
          });
        });
      });

    case 'CS_TIMEOUT_STATUS':
      return getPanelTabIpc().then(function (ipc) {
        return ipc.ask('TIMEOUT_STATUS', args);
      });

    case 'CS_DELETE_ALL_COOKIES':
      {
        var _url = args.url;


        return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.cookies.getAll({ url: _url }).then(function (cookies) {
          var ps = cookies.map(function (c) {
            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.cookies.remove({
              url: '' + _url + c.path,
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
        return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function () {
          var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var isTestCase = !!args.testCase;
          var isTestSuite = !!args.testSuite;
          var from = args.testCase && args.testCase.from || args.testSuite && args.testSuite.from;

          switch (from) {
            case 'bookmark':
              {
                if (!config.allowRunFromBookmark) {
                  throw new Error('[Message from RPA] Error #102: To run a macro or a test suite from bookmarks, you need to allow it in the UI.Vision RPA settings first');
                }
                break;
              }

            case 'html':
              {
                var isFileSchema = /^file:\/\//.test(args.sender.url);
                var isHttpSchema = /^https?:\/\//.test(args.sender.url);

                if (isFileSchema && !config.allowRunFromFileSchema) {
                  throw new Error('Error #103: To run test suite from local file, enable it in UI.Vision RPA settings first');
                }

                if (isHttpSchema && !config.allowRunFromHttpSchema) {
                  throw new Error('Error #104: To run test suite from public website, enable it in UI.Vision RPA settings first');
                }

                break;
              }

            default:
              throw new Error('unknown source not allowed');
          }

          return withPanelIpc({
            params: { from: from }
          }).then(function (panelIpc) {
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

    case 'CS_IMPORT_AND_INVOKE':
      {
        var from = args.from;

        return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function () {
          var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          var isFileSchema = /^file:\/\//.test(args.sender.url);
          var isHttpSchema = /^https?:\/\//.test(args.sender.url);

          if (isFileSchema && !config.allowRunFromFileSchema) {
            throw new Error('Error #105: To run macro from local file, enable it in RPA settings first');
          }

          if (isHttpSchema && !config.allowRunFromHttpSchema) {
            throw new Error('Error #105: To run macro from public website, enable it in the RPA settings first');
          }

          return withPanelIpc({ params: { from: from } }).then(function (panelIpc) {
            return panelIpc.ask('IMPORT_AND_RUN', args);
          });
        });
      }

    case 'CS_ADD_LOG':
      {
        return getPanelTabIpc().then(function (ipc) {
          return ipc.ask('ADD_LOG', args);
        });
      }

    case 'CS_OPEN_PANEL_SETTINGS':
      {
        withPanelIpc({
          params: { settings: true }
        }).then(function (ipc) {
          return ipc.ask('OPEN_SETTINGS');
        }).catch(function (e) {
          console.error(e);
        });
        return true;
      }

    case 'DESKTOP_EDITOR_ADD_VISION_IMAGE':
      {
        return withPanelIpc().then(function (ipc) {
          return ipc.ask('ADD_VISION_IMAGE', {
            dataUrl: args.dataUrl,
            requireRename: true
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

    case 'TIMEOUT':
      {
        _common_log__WEBPACK_IMPORTED_MODULE_4___default()('TIMEOUT', args.timeout, args.id);
        return Object(_common_utils__WEBPACK_IMPORTED_MODULE_1__["delay"])(function () {
          return args.id;
        }, args.timeout);
      }

    default:
      return 'unknown';
  }
};

var initIPC = function initIPC() {
  Object(_common_ipc_ipc_bg_cs__WEBPACK_IMPORTED_MODULE_2__["bgInit"])(function (tabId, cuid, ipc) {
    if (!Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().has(tabId, cuid)) {
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('connect cs ipc', tabId, cuid, ipc);
      Object(_common_ipc_ipc_cache__WEBPACK_IMPORTED_MODULE_15__["getIpcCache"])().set(tabId, ipc, cuid);
      ipc.onAsk(onRequest);
    }
  });
};

var initOnInstalled = function initOnInstalled() {
  if (typeof process !== 'undefined' && "production" === 'production') {
    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.runtime.setUninstallURL(_config__WEBPACK_IMPORTED_MODULE_10___default.a.urlAfterUninstall);

    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.runtime.onInstalled.addListener(function (_ref28) {
      var reason = _ref28.reason,
          previousVersion = _ref28.previousVersion;

      switch (reason) {
        case 'install':
          {
            _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].get('config').then(function (config) {
              return _common_storage__WEBPACK_IMPORTED_MODULE_7__["default"].set('config', _extends({}, config, {
                showTestCaseTab: false
              }));
            });

            return _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.tabs.create({
              url: _config__WEBPACK_IMPORTED_MODULE_10___default.a.urlAfterInstall
            });
          }

        case 'update':
          setTimeout(function () {
            // FIXME: this forced previous version is just for test
            previousVersion = '4.0.1';
            migrate(previousVersion, _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.runtime.getManifest().version);
          }, 0);

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
      _common_log__WEBPACK_IMPORTED_MODULE_4___default()('in initPlayTab, set toPlay to', tabs[0]);
      state.tabIds.lastPlay = state.tabIds.toPlay;
      state.tabIds.toPlay = state.tabIds.firstPlay = tabs[0].id;
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

  Object(_common_download_man__WEBPACK_IMPORTED_MODULE_9__[/* getDownloadMan */ "a"])().onDownloadComplete(function (downloadItem) {
    getPanelTabIpc().then(function (panelIpc) {
      panelIpc.ask('DOWNLOAD_COMPLETE', downloadItem);
    });
  });
};

var initProxyMan = function initProxyMan() {
  var onProxyChange = function onProxyChange(newProxy) {
    var img = newProxy ? _config__WEBPACK_IMPORTED_MODULE_10___default.a.icons.inverted : _config__WEBPACK_IMPORTED_MODULE_10___default.a.icons.normal;
    _common_web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.browserAction.setIcon({ path: img });

    if (state.tabIds.panel) {
      getPanelTabIpc().then(function (ipc) {
        return ipc.ask('PROXY_UPDATE', { proxy: newProxy });
      }).catch(function (e) {
        return _common_log__WEBPACK_IMPORTED_MODULE_4___default.a.warn(e);
      });
    }
  };

  Object(_services_proxy__WEBPACK_IMPORTED_MODULE_25__["getProxyManager"])().getProxy().then(onProxyChange);
  Object(_services_proxy__WEBPACK_IMPORTED_MODULE_25__["getProxyManager"])().onChange(onProxyChange);
};

var migrate = function migrate(previousVersion, currentVersion) {
  Object(_services_migration__WEBPACK_IMPORTED_MODULE_22__["getKantuMigrationService"])().runAll(previousVersion, currentVersion);
};

bindEvents();
initIPC();
initOnInstalled();
initPlayTab();
initDownloadMan();
initProxyMan();
Object(_services_contextMenu__WEBPACK_IMPORTED_MODULE_27__["getContextMenuService"])().destroyMenus();

window.clip = _common_clipboard__WEBPACK_IMPORTED_MODULE_5__[/* default */ "a"];
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(68)))

/***/ }),

/***/ 1080:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const job_1 = __webpack_require__(1081);
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

/***/ 1081:
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
exports.JobFactory = JobFactory;
JobFactory.nextId = 1;


/***/ }),

/***/ 1082:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const math_helper_1 = __webpack_require__(1083);
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

/***/ 1083:
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

/***/ 1084:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ipc_iframe_1 = __webpack_require__(1085);
const web_extension_1 = __importDefault(__webpack_require__(10));
const ipc_cache_1 = __webpack_require__(64);
const tab_utils_1 = __webpack_require__(65);
exports.openPageInIframe = ipc_iframe_1.createIframe;
exports.askPageWithIframe = (options) => {
    const iframeIpc = exports.openPageInIframe({
        url: options.url,
        width: options.width,
        height: options.height,
        ipcTimeout: options.ipcTimeout,
        domReady: options.domReady,
        onLoad: options.onLoad
    });
    return iframeIpc.ask(options.cmd, options.args)
        .then((data) => {
        setTimeout(() => iframeIpc.destroy());
        return data;
    });
};
exports.openPageInTab = (options) => {
    const isValidTab = (tabId) => {
        return web_extension_1.default.tabs.get(tabId)
            .then((tab) => {
            return !!tab;
        })
            .catch((e) => false);
    };
    const updateExistingTabToUrl = (tabId, url) => {
        return isValidTab(tabId)
            .then(isValid => {
            return isValid ? web_extension_1.default.tabs.update(tabId, { url }) : createNewTabWithUrl(url);
        });
    };
    const createNewTabWithUrl = (url) => {
        if (options.popup) {
            return web_extension_1.default.windows.create({
                type: 'popup',
                url: url,
                width: Math.round(options.width || screen.availWidth),
                height: Math.round(options.height || screen.availHeight),
                left: Math.round(options.left || 0),
                top: Math.round(options.top || 0),
            })
                .then((win) => win.tabs[0]);
        }
        return web_extension_1.default.tabs.create({ url });
    };
    const { url, tabId, domReady } = options;
    const pTab = options.tabId ? updateExistingTabToUrl(tabId, url) : createNewTabWithUrl(url);
    const pIpc = pTab.then(tab => {
        const ipcStore = ipc_cache_1.getIpcCache();
        const pGetTab = domReady ? ipcStore.domReadyGet(tab.id, 20 * 1000, domReady) : ipcStore.get(tab.id, 20 * 1000);
        return (options.focus ? tab_utils_1.activateTab(tab.id, true) : Promise.resolve())
            .then(() => pGetTab)
            .then(ipc => (Object.assign(Object.assign({}, ipc), { getTabId: () => tab.id, getTab: () => web_extension_1.default.tabs.get(tab.id), destroy: () => {
                ipc.destroy();
                if (!options.tabId && !options.keep) {
                    web_extension_1.default.tabs.remove(tab.id);
                }
            } })));
    });
    return {
        destroy: () => {
            pIpc.then(ipc => ipc.destroy());
        },
        ask: (...args) => {
            return pIpc.then(ipc => ipc.ask(...args));
        },
        onAsk: (...args) => {
            pIpc.then(ipc => ipc.onAsk(...args));
        },
        getTab: () => {
            return pIpc.then(ipc => ipc.getTab());
        },
        getTabId: () => {
            return pIpc.then(ipc => ipc.getTabId());
        }
    };
};
exports.askPageWithTab = (options) => {
    const tabAPI = exports.openPageInTab({
        url: options.url,
        tabId: options.tabId,
        ipcTimeout: options.ipcTimeout,
        domReady: options.domReady
    });
    return tabAPI.ask(options.cmd, options.args)
        .then((data) => {
        setTimeout(() => tabAPI.destroy(), 0);
        return data;
    });
};
exports.askPageWithFixedTab = (() => {
    let curTabId = undefined;
    return (options) => {
        const tabAPI = exports.openPageInTab({
            url: options.url,
            tabId: options.tabId || curTabId,
            keep: true,
            ipcTimeout: options.ipcTimeout,
            domReady: options.domReady
        });
        return tabAPI.getTabId()
            .then((tabId) => {
            curTabId = tabId;
            return tabAPI.ask(options.cmd, options.args)
                .then((data) => {
                setTimeout(() => tabAPI.destroy(), 0);
                return data;
            });
        });
    };
})();


/***/ }),

/***/ 1085:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const cs_postmessage_1 = __webpack_require__(63);
const registry_1 = __webpack_require__(184);
const consecutive_1 = __webpack_require__(373);
const ts_utils_1 = __webpack_require__(12);
const postMsg = cs_postmessage_1.postMessage;
exports.ipcForIframe = ({ targetWindow = window.top, timeout = 60000 } = {}) => {
    const registry = registry_1.createListenerRegistry();
    const listener = ({ cmd, args }) => registry.fire('call', { cmd, args });
    const removeOnMsg = cs_postmessage_1.onMessage(window, listener);
    return {
        ask: (cmd, args) => {
            return postMsg(targetWindow, window, { cmd, args }, '*', timeout);
        },
        onAsk: (fn) => {
            registry.add('call', ({ cmd, args }) => fn(cmd, args));
        },
        destroy: () => {
            removeOnMsg();
        }
    };
};
exports.createIframe = (options) => {
    const { url, width, height, onLoad, domReady, ipcTimeout = 60000 } = options;
    const $iframe = document.createElement('iframe');
    const pLoad = new Promise((resolve, reject) => {
        if (width)
            $iframe.width = '' + width;
        if (height)
            $iframe.height = '' + height;
        $iframe.addEventListener('load', () => {
            if (typeof onLoad === 'function') {
                try {
                    onLoad();
                }
                catch (e) { }
            }
            resolve();
        });
        $iframe.src = url;
        document.body.appendChild($iframe);
    });
    const waitDomReady = (domReady) => {
        return ts_utils_1.retry(() => {
            return consecutive_1.withConsecutive(domReady, () => {
                return postMsg($iframe.contentWindow, window, { cmd: 'DOM_READY', args: {} }, '*', 1000)
                    .then(() => true, () => false);
            })
                .then(() => undefined);
        }, {
            timeout: ipcTimeout,
            shouldRetry: (e) => true,
            retryInterval: 1000
        })();
    };
    const pReady = domReady ? pLoad.then(() => waitDomReady(domReady)) : pLoad;
    const removeOnMsg = cs_postmessage_1.onMessage(window, ({ cmd, args }) => {
        return wrappedOnAsk(cmd, args);
    });
    const wrappedOnAsk = (cmd, args) => {
        return registry.fire('call', { cmd, args });
    };
    const registry = registry_1.createListenerRegistry();
    return {
        $iframe,
        destroy: () => {
            if ($iframe)
                $iframe.remove();
            removeOnMsg();
        },
        ask: (cmd, args) => {
            return pReady.then(() => {
                return postMsg($iframe.contentWindow, window, { cmd, args }, '*', ipcTimeout);
            });
        },
        onAsk: (fn) => {
            registry.add('call', ({ cmd, args }) => fn(cmd, args));
        }
    };
};


/***/ }),

/***/ 119:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export DownloadMan */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getDownloadMan; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(11);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_log__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);
var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
      _log__WEBPACK_IMPORTED_MODULE_1___default()('download on created', downloadItem);

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
      _log__WEBPACK_IMPORTED_MODULE_1___default()('download on changed', downloadDelta);

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

            if (_this.completeHandler) {
              _web_extension__WEBPACK_IMPORTED_MODULE_0___default.a.downloads.search({ id: item.id }).then(function (_ref) {
                var _ref2 = _slicedToArray(_ref, 1),
                    downloadItem = _ref2[0];

                if (downloadItem) {
                  _this.completeHandler(downloadItem);
                }
              });
            }
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

      _log__WEBPACK_IMPORTED_MODULE_1___default()('download on determine', downloadItem);

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
  }, {
    key: 'onDownloadComplete',
    value: function onDownloadComplete(fn) {
      this.completeHandler = fn;
    }
  }, {
    key: 'hasPendingDownload',
    value: function hasPendingDownload() {
      var downloadToCreate = this.activeDownloads.find(function (item) {
        return !item.id;
      });
      return !!downloadToCreate;
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

/***/ 146:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = __webpack_require__(157);
const listener_api_proxy_1 = __webpack_require__(357);
const settings_api_proxy_1 = __webpack_require__(504);
const pac_api_proxy_1 = __webpack_require__(505);
const http_auth_1 = __webpack_require__(506);
const messages_1 = __importDefault(__webpack_require__(159));
const allAvailableProxyManagers = [
    new listener_api_proxy_1.ProxyManagerViaListenerAPI(),
    new pac_api_proxy_1.ProxyManagerViaPacAPI(),
    new settings_api_proxy_1.ProxyManagerViaSettingsAPI()
];
const proxyHttpAuth = new http_auth_1.ProxyHttpAuth({
    getAuth: (host, port) => {
        return getProxyManager().getAuth(host, port);
    }
});
function getProxyManager() {
    for (let i = 0, len = allAvailableProxyManagers.length; i < len; i++) {
        if (allAvailableProxyManagers[i].isSupported()) {
            return allAvailableProxyManagers[i];
        }
    }
    throw new Error('Unable to use proxy');
}
exports.getProxyManager = getProxyManager;
function setProxy(proxy) {
    return new Promise((resolve, reject) => {
        const proxyManager = getProxyManager();
        // Default to not incognito mode
        proxyManager.isControllable(false)
            .then((controllable) => {
            if (!controllable) {
                throw new Error(messages_1.default.proxy.notControllable);
            }
            proxyHttpAuth.bind();
            if (!proxy) {
                return proxyManager.reset();
            }
            return proxyManager.setProxy(proxy);
        })
            .then(resolve, reject);
    });
}
exports.setProxy = setProxy;
function parseProxyUrl(proxyUrl, usernameAndPassword) {
    const url = new URL(proxyUrl);
    // URL has problem parsing non-standard url like socks4://0.0.0.0
    // hostname will be empty string, so we have to replace protocol with http
    const httpUrl = new URL(proxyUrl.replace(/\s*socks[45]/i, 'http'));
    const host = httpUrl.hostname;
    const type = (() => {
        switch (url.protocol) {
            case 'http:':
                return types_1.ProxyScheme.Http;
            case 'https:':
                return types_1.ProxyScheme.Https;
            case 'socks4:':
                return types_1.ProxyScheme.Socks4;
            case 'socks5:':
                return types_1.ProxyScheme.Socks5;
            default:
                throw new Error('Invalid proxy protocol');
        }
    })();
    const port = (() => {
        if (httpUrl.port) {
            return httpUrl.port;
        }
        switch (type) {
            case types_1.ProxyScheme.Http:
                return '80';
            case types_1.ProxyScheme.Https:
                return '443';
            case types_1.ProxyScheme.Socks4:
            case types_1.ProxyScheme.Socks5:
                return '1080';
        }
    })();
    if (!host || !host.length) {
        throw new Error('No host found in proxy');
    }
    if (!port || isNaN(parseInt(port, 10))) {
        throw new Error('No valid port found in proxy');
    }
    const { username, password } = (() => {
        if (!usernameAndPassword || !usernameAndPassword.length) {
            return {};
        }
        const index = usernameAndPassword.indexOf(',');
        if (index === -1) {
            return { username: usernameAndPassword };
        }
        return {
            username: usernameAndPassword.substr(0, index),
            password: usernameAndPassword.substr(index + 1)
        };
    })();
    return {
        type,
        host,
        port,
        username,
        password
    };
}
exports.parseProxyUrl = parseProxyUrl;


/***/ }),

/***/ 153:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = __importDefault(__webpack_require__(36));
const ts_utils_1 = __webpack_require__(12);
function parseKey(key) {
    return key.split('::').filter(s => s.length > 0);
}
exports.parseKey = parseKey;
class KeyValueData {
    constructor() {
        this.withOneLock = ts_utils_1.concurrent(1)((run) => {
            return new Promise((resolve, reject) => {
                try {
                    Promise.resolve(run()).then(resolve, reject);
                }
                catch (e) {
                    reject(e);
                }
            });
        });
    }
    get(key) {
        const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key);
        return storage_1.default.get(mainKey)
            .then((data = {}) => {
            const result = ts_utils_1.getIn(subKeys, data);
            return result;
        });
    }
    set(key, value) {
        return this.withOneLock(() => {
            const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key);
            return storage_1.default.get(mainKey)
                .then((data = {}) => {
                const updated = ts_utils_1.safeSetIn(subKeys, value, data);
                return storage_1.default.set(mainKey, updated)
                    .then(() => ts_utils_1.getIn(subKeys, updated));
            });
        });
    }
    update(key, updater) {
        return this.withOneLock(() => {
            const [mainKey, subKeys] = this.getMainKeyAndSubKeys(key);
            return storage_1.default.get(mainKey)
                .then((data = {}) => {
                const updated = ts_utils_1.safeUpdateIn(subKeys, updater, data);
                return storage_1.default.set(mainKey, updated)
                    .then(() => ts_utils_1.getIn(subKeys, updated));
            });
        });
    }
    getMainKeyAndSubKeys(key) {
        const keys = parseKey(key);
        const mainKey = keys[0];
        const subKeys = keys.slice(1);
        return [mainKey, subKeys];
    }
}
exports.KeyValueData = KeyValueData;


/***/ }),

/***/ 157:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var ProxyScheme;
(function (ProxyScheme) {
    ProxyScheme["Http"] = "http";
    ProxyScheme["Https"] = "https";
    ProxyScheme["Socks4"] = "socks4";
    ProxyScheme["Socks5"] = "socks5";
})(ProxyScheme = exports.ProxyScheme || (exports.ProxyScheme = {}));
var FirefoxProxyType;
(function (FirefoxProxyType) {
    FirefoxProxyType["Direct"] = "direct";
    FirefoxProxyType["Http"] = "http";
    FirefoxProxyType["Https"] = "https";
    FirefoxProxyType["Socks4"] = "socks4";
    FirefoxProxyType["Socks5"] = "socks";
})(FirefoxProxyType = exports.FirefoxProxyType || (exports.FirefoxProxyType = {}));


/***/ }),

/***/ 159:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    proxy: {
        notControllable: 'The proxy settings are controlled by other app(s) or extension(s). Please disable or uninstall the apps or extensions in conflict'
    },
    contentHidden: 'Content is hidden during replay'
};


/***/ }),

/***/ 17:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const mk = (list) => list.reduce((prev, key) => {
    prev[key] = key;
    return prev;
}, {});
exports.APP_STATUS = mk([
    'NORMAL',
    'INSPECTOR',
    'RECORDER',
    'PLAYER'
]);
exports.INSPECTOR_STATUS = mk([
    'PENDING',
    'INSPECTING',
    'STOPPED'
]);
exports.RECORDER_STATUS = mk([
    'PENDING',
    'RECORDING',
    'STOPPED'
]);
exports.PLAYER_STATUS = mk([
    'PLAYING',
    'PAUSED',
    'STOPPED'
]);
exports.PLAYER_MODE = mk([
    'TEST_CASE',
    'TEST_SUITE'
]);
exports.CONTENT_SCRIPT_STATUS = mk([
    'NORMAL',
    'RECORDING',
    'INSPECTING',
    'PLAYING'
]);
exports.TEST_CASE_STATUS = mk([
    'NORMAL',
    'SUCCESS',
    'ERROR',
    'ERROR_IN_SUB'
]);
exports.LAST_SCREENSHOT_FILE_NAME = '__lastscreenshot';
exports.LAST_DESKTOP_SCREENSHOT_FILE_NAME = '__last_desktop_screenshot';
exports.UNTITLED_ID = '__untitled__';


/***/ }),

/***/ 182:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const registry_1 = __webpack_require__(184);
class BaseProxyManager {
    constructor() {
        this.proxy = null;
        this.registry = registry_1.createListenerRegistry();
    }
    getProxy() {
        return Promise.resolve(this.proxy);
    }
    getAuth(host, port) {
        if (!this.proxy || !this.proxy.username) {
            return null;
        }
        // port could be number, so must convert it to string before compare
        if (this.proxy.host === host && this.proxy.port === '' + port) {
            return {
                username: this.proxy.username,
                password: this.proxy.password
            };
        }
        return null;
    }
    onChange(listener) {
        this.registry.add('change', listener);
        return () => { this.registry.remove('change', listener); };
    }
}
exports.BaseProxyManager = BaseProxyManager;


/***/ }),

/***/ 184:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
class Registry {
    constructor({ process, onZero, onOne }) {
        this.cache = {};
        this.process = process;
        this.onZero = onZero || (() => { });
        this.onOne = onOne || (() => { });
    }
    add(id, obj) {
        this.cache[id] = this.cache[id] || [];
        this.cache[id].push(obj);
        if (this.cache[id].length === 1) {
            try {
                this.onOne(id);
            }
            catch (e) {
                // tslint:disable-next-line
                console.error('in onOne, ' + e.message);
            }
        }
        return true;
    }
    remove(id, obj) {
        if (!this.cache[id]) {
            return false;
        }
        this.cache[id] = this.cache[id].filter((item) => item !== obj);
        if (this.cache[id].length === 0) {
            try {
                this.onZero(id);
            }
            catch (e) {
                // tslint:disable-next-line
                console.error('in onZero, ' + e.message);
            }
        }
        return true;
    }
    removeAllWithData(obj) {
        Object.keys(this.cache).forEach((id) => {
            for (let i = this.cache[id].length - 1; i >= 0; i--) {
                if (this.cache[id][i] === obj) {
                    this.remove(id, this.cache[id][i]);
                }
            }
        });
    }
    fire(id, data) {
        if (!this.cache[id]) {
            return false;
        }
        this.cache[id].forEach((item) => {
            try {
                this.process(item, data, id);
            }
            catch (e) {
                // tslint:disable-next-line
                console.error('in process, ' + e.message);
            }
        });
        return true;
    }
    has(id) {
        return this.cache[id] && this.cache[id].length > 0;
    }
    keys() {
        return Object.keys(this.cache).filter((key) => this.cache[key] && this.cache[key].length > 0);
    }
    destroy() {
        Object.keys(this.cache).forEach((id) => {
            try {
                this.onZero(id);
            }
            catch (e) {
                // tslint:disable-next-line
                console.error('in onZero, ' + e.message);
            }
        });
        this.cache = {};
    }
}
exports.Registry = Registry;
function createListenerRegistry() {
    return new Registry({
        process: (fn, data, id) => {
            fn(data);
        }
    });
}
exports.createListenerRegistry = createListenerRegistry;


/***/ }),

/***/ 185:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var MigrationJobType;
(function (MigrationJobType) {
    MigrationJobType["MigrateMacroTestSuiteToBrowserFileSystem"] = "20190401_macro_test_suite_to_browser_fs";
})(MigrationJobType = exports.MigrationJobType || (exports.MigrationJobType = {}));
var MigrationResult;
(function (MigrationResult) {
    MigrationResult[MigrationResult["AlreadyMigrated"] = 0] = "AlreadyMigrated";
    MigrationResult[MigrationResult["NotQualified"] = 1] = "NotQualified";
    MigrationResult[MigrationResult["Success"] = 2] = "Success";
    MigrationResult[MigrationResult["Error"] = 3] = "Error";
    MigrationResult[MigrationResult["JobUnknown"] = 4] = "JobUnknown";
})(MigrationResult = exports.MigrationResult || (exports.MigrationResult = {}));


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

/***/ 324:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const filesystem_1 = __webpack_require__(60);
const xfile_1 = __webpack_require__(32);
const path_1 = __importDefault(__webpack_require__(27));
const log_1 = __importDefault(__webpack_require__(11));
const ts_utils_1 = __webpack_require__(12);
const storage_1 = __webpack_require__(13);
class LogService {
    constructor(params = {}) {
        this.pDirReady = Promise.resolve(false);
        this.logsDir = '';
        this.fileName = 'log.txt';
        this.waitForStorageManager = () => Promise.resolve(storage_1.getStorageManager());
        this.check();
        this.updateLogFileName();
        if (params.waitForStorageManager) {
            this.waitForStorageManager = params.waitForStorageManager;
        }
    }
    updateLogFileName() {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${ts_utils_1.pad2digits(now.getMonth() + 1)}${ts_utils_1.pad2digits(now.getDate())}`;
        const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => ts_utils_1.pad2digits(n)).join('');
        this.fileName = `log-${dateStr}-${timeStr}.txt`;
    }
    check() {
        this.pDirReady = xfile_1.getXFile().sanityCheck(true).then(isSane => {
            if (!isSane) {
                return false;
            }
            const { rootDir } = xfile_1.getXFile().getCachedConfig();
            if (!rootDir) {
                return false;
            }
            this.logsDir = path_1.default.join(rootDir, 'logs');
            return filesystem_1.getNativeFileSystemAPI().ensureDir({
                path: this.logsDir
            });
        });
        return this.pDirReady;
    }
    log(str) {
        return this.waitForStorageManager()
            .then(storageManager => {
            if (!storageManager.isXFileMode()) {
                return false;
            }
            return xfile_1.getXFile().sanityCheck(true)
                .then(() => this.pDirReady)
                .then((ready) => {
                if (!ready) {
                    return false;
                }
                return filesystem_1.getNativeFileSystemAPI().appendAllText({
                    path: path_1.default.join(this.logsDir, this.fileName),
                    content: ensureLineBreak(str)
                });
            }, (e) => {
                log_1.default.warn('Failed to log: ', e.message);
                return false;
            });
        });
    }
    logWithTime(str) {
        return this.log(`${new Date().toISOString()} - ${str}`);
    }
    logTo(filePath, str) {
        return this.waitForStorageManager()
            .then(storageManager => {
            if (!storageManager.isXFileMode()) {
                return false;
            }
            return xfile_1.getXFile().sanityCheck(true)
                .then((ready) => {
                if (!ready) {
                    return false;
                }
                const dirPath = path_1.default.dirname(filePath);
                return filesystem_1.getNativeFileSystemAPI().ensureDir({ path: dirPath })
                    .then((dirReady) => {
                    if (!dirReady) {
                        return false;
                    }
                    return filesystem_1.getNativeFileSystemAPI().appendAllText({
                        path: filePath,
                        content: ensureLineBreak(str)
                    });
                });
            }, (e) => {
                log_1.default.warn('Failed to log: ', e.message);
                return false;
            });
        });
    }
}
exports.LogService = LogService;
exports.getLogService = ts_utils_1.singletonGetter(() => new LogService());
function ensureLineBreak(str) {
    if (str.length === 0) {
        return str;
    }
    if (str.charAt(str.length - 1) !== '\n') {
        return str + '\n';
    }
    return str;
}


/***/ }),

/***/ 325:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = __webpack_require__(185);
const indexeddb_storage_1 = __webpack_require__(511);
const storage_1 = __webpack_require__(13);
const macro_extra_data_1 = __webpack_require__(105);
const filesystem_1 = __importDefault(__webpack_require__(107));
const backup_1 = __webpack_require__(358);
const ts_utils_1 = __webpack_require__(12);
class MigrateMacroTestSuiteToBrowserFileSystem {
    constructor() {
        this.oldMacros = [];
    }
    getMeta() {
        return {
            createdAt: new Date('2019-04-01').getTime(),
            goal: [
                `Migrate macros and test suites from indexedDB storage to Browser File System storage`,
                `In order to prepare for an easy support for deep folder structure`,
                `Note: the old indexedDB storage WILL NOT be cleared, just in case any user loses his data during migration`,
                `The real clean up could be done in future releases, in the form of another migration job`
            ].join('. ')
        };
    }
    getType() {
        return types_1.MigrationJobType.MigrateMacroTestSuiteToBrowserFileSystem;
    }
    previousVersionRange() {
        return '<=4.0.1';
    }
    shouldMigrate() {
        const oldMacroStorage = this.getOldMacroStorage();
        const oldTestSuiteStorage = this.getOldTestSuiteStorage();
        return Promise.all([
            oldMacroStorage.list().then((list) => list.length),
            oldTestSuiteStorage.list().then((list) => list.length)
        ])
            .then(([macroCount, testSuiteCount]) => {
            return macroCount > 0 || testSuiteCount > 0;
        });
    }
    migrate() {
        const migrateMacros = () => {
            return this.getOldMacroStorage().readAll()
                .then((fileObjs) => {
                console.log('this.getOldMacroStorage().readAll()', fileObjs);
                this.oldMacros = fileObjs.map((obj) => obj.content);
                return filesystem_1.default.ensureDirectory('/macros')
                    .then(() => this.getNewMacroStorage().bulkWrite(fileObjs));
            })
                .then(() => true);
        };
        const migrateTestSuites = () => {
            return this.getOldTestSuiteStorage().readAll()
                .then((fileObjs) => {
                console.log('this.getOldTestSuiteStorage().readAll()', fileObjs);
                return filesystem_1.default.ensureDirectory('/testsuites')
                    .then(() => this.getNewTestSuiteStorage().bulkWrite(fileObjs));
            })
                .then(() => true);
        };
        const migrateMacroExtra = () => {
            return macro_extra_data_1.getMacroExtraKeyValueData().getAll()
                .then((allMacroExtra) => {
                this.oldMacros.forEach(macro => {
                    const newId = this.getNewMacroStorage().filePath(macro.name);
                    const oldId = macro.id;
                    if (allMacroExtra[oldId]) {
                        allMacroExtra[newId] = allMacroExtra[oldId];
                    }
                });
                return macro_extra_data_1.getMacroExtraKeyValueData().set('', allMacroExtra);
            });
        };
        return migrateMacros()
            .then(() => migrateTestSuites())
            .then(() => migrateMacroExtra())
            .then(() => true);
    }
    remedy() {
        // Download the old macros and test suites in zip
        const readOldMacros = () => {
            return this.getOldMacroStorage().readAll()
                .then((fileObjs) => {
                this.oldMacros = fileObjs.map((obj) => obj.content);
                return this.oldMacros;
            });
        };
        const readOldTestSuites = () => {
            return this.getOldTestSuiteStorage().readAll()
                .then((fileObjs) => {
                return fileObjs.map((obj) => obj.content);
            });
        };
        return readOldMacros()
            .then(macros => {
            return readOldTestSuites()
                .then(testSuites => {
                return backup_1.backup({
                    backup: {
                        testCase: true,
                        testSuite: true
                    },
                    macroNodes: macros,
                    testSuites: testSuites
                });
            });
        });
    }
    getOldMacroStorage() {
        return indexeddb_storage_1.getIndexeddbFlatStorage({
            table: 'testCases'
        });
    }
    getOldTestSuiteStorage() {
        return indexeddb_storage_1.getIndexeddbFlatStorage({
            table: 'testSuites'
        });
    }
    getNewMacroStorage() {
        return this.getStorageManager().getStorageForTarget(storage_1.StorageTarget.Macro, storage_1.StorageStrategyType.Browser);
    }
    getNewTestSuiteStorage() {
        return this.getStorageManager().getStorageForTarget(storage_1.StorageTarget.TestSuite, storage_1.StorageStrategyType.Browser);
    }
    getStorageManager() {
        return new storage_1.StorageManager(storage_1.StorageStrategyType.Browser, {
            getMacros: () => this.oldMacros,
            getMaxMacroCount: () => Promise.resolve(Infinity)
        });
    }
}
exports.MigrateMacroTestSuiteToBrowserFileSystem = MigrateMacroTestSuiteToBrowserFileSystem;
exports.getMigrateMacroTestSuiteToBrowserFileSystem = ts_utils_1.singletonGetter(() => {
    return new MigrateMacroTestSuiteToBrowserFileSystem();
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

/***/ 344:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodTypeInvocationNames = [
    'get_version',
    'get_desktop_dpi',
    'get_image_info',
    'capture_desktop',
    'search_image',
    'search_desktop',
    'get_max_file_range',
    'get_file_size',
    'read_file_range'
];


/***/ }),

/***/ 345:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const native_host_1 = __webpack_require__(97);
class KantuCVHost extends native_host_1.NativeMessagingHost {
    constructor() {
        super(KantuCVHost.HOST_NAME);
    }
}
exports.KantuCVHost = KantuCVHost;
KantuCVHost.HOST_NAME = "com.a9t9.kantu.cv";


/***/ }),

/***/ 346:
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
        let result = (length / 3) * 4;
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

/***/ 357:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = __webpack_require__(157);
const base_1 = __webpack_require__(182);
function convertToFirefoxProxyInfo(proxy) {
    return Object.assign(Object.assign({}, proxy), { type: (proxy.type === types_1.ProxyScheme.Socks5 ? types_1.FirefoxProxyType.Socks5 : proxy.type) });
}
exports.convertToFirefoxProxyInfo = convertToFirefoxProxyInfo;
class ProxyManagerViaListenerAPI extends base_1.BaseProxyManager {
    constructor() {
        super();
        this.unbind = () => { };
        this.isBound = false;
    }
    isSupported() {
        return typeof browser !== 'undefined' && browser.proxy && browser.proxy.onRequest;
    }
    isControllable(incognito) {
        return Promise.resolve(true);
    }
    setProxy(proxy) {
        this.bind();
        this.proxy = proxy;
        this.notifyProxyChange();
        return Promise.resolve();
    }
    reset() {
        this.proxy = null;
        this.notifyProxyChange();
        return Promise.resolve();
    }
    notifyProxyChange() {
        setTimeout(() => {
            this.registry.fire('change', this.proxy);
        }, 10);
    }
    bind() {
        if (this.isBound) {
            return;
        }
        this.isBound = true;
        const listener = this.onProxyRequest.bind(this);
        browser.proxy.onRequest.addListener(listener, { urls: ['<all_urls>'] });
        this.unbind = () => browser.proxy.onRequest.removeListener(listener);
    }
    onProxyRequest(requestInfo) {
        return this.proxy ? convertToFirefoxProxyInfo(this.proxy) : { type: types_1.FirefoxProxyType.Direct };
    }
}
exports.ProxyManagerViaListenerAPI = ProxyManagerViaListenerAPI;


/***/ }),

/***/ 358:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const file_saver_1 = __importDefault(__webpack_require__(70));
const jszip_1 = __importDefault(__webpack_require__(142));
const utils_1 = __webpack_require__(4);
const convert_utils_1 = __webpack_require__(50);
const convert_suite_utils_1 = __webpack_require__(69);
const storage_1 = __webpack_require__(13);
const path_1 = __webpack_require__(27);
const common_1 = __webpack_require__(374);
function backup(options) {
    const { backup, macroNodes, testSuites, screenshots, csvs, visions } = options;
    const zip = new jszip_1.default();
    const ps = [];
    const getFolder = (relativePath, zipRoot) => {
        if (relativePath === '.') {
            return zipRoot;
        }
        const dirs = relativePath.split(path_1.posix.sep);
        return dirs.reduce((prev, dir) => {
            return prev.folder(dir);
        }, zipRoot);
    };
    if (backup.testCase && macroNodes && macroNodes.length) {
        const rootFolder = zip.folder(common_1.ZipFolders.Macros);
        macroNodes.forEach(node => {
            const dirPath = path_1.posix.dirname(node.relativePath);
            const fileName = path_1.posix.basename(node.relativePath);
            const folder = getFolder(dirPath, rootFolder);
            ps.push(storage_1.getStorageManager().getMacroStorage().read(node.fullPath, 'Text')
                .then((data) => {
                const macro = data;
                folder.file(fileName, convert_utils_1.toJSONString({
                    name: macro.name,
                    commands: macro.data.commands
                }, {
                    ignoreTargetOptions: !!options.ignoreMacroTargetOptions
                }));
            }));
        });
    }
    if (backup.testSuite && testSuites && testSuites.length) {
        const folder = zip.folder(common_1.ZipFolders.TestSuites);
        const genName = utils_1.nameFactory();
        testSuites.forEach(ts => {
            const name = genName(ts.name);
            folder.file(`${name}.json`, convert_suite_utils_1.stringifyTestSuite(ts));
        });
    }
    if (backup.screenshot && screenshots && screenshots.length) {
        const folder = zip.folder(common_1.ZipFolders.Screenshots);
        const ssStorage = storage_1.getStorageManager().getScreenshotStorage();
        screenshots.forEach(ss => {
            ps.push(ssStorage.read(ss.fullPath, 'ArrayBuffer')
                .then(buffer => {
                folder.file(ss.name, buffer, { binary: true });
            }));
        });
    }
    if (backup.vision && visions && visions.length) {
        const folder = zip.folder(common_1.ZipFolders.Visions);
        const visionStorage = storage_1.getStorageManager().getVisionStorage();
        visions.forEach(vision => {
            ps.push(visionStorage.read(vision.fullPath, 'ArrayBuffer')
                .then(buffer => {
                folder.file(vision.name, buffer, { binary: true });
            }));
        });
    }
    if (backup.csv && csvs && csvs.length) {
        const folder = zip.folder(common_1.ZipFolders.Csvs);
        const csvStorage = storage_1.getStorageManager().getCSVStorage();
        csvs.forEach(csv => {
            ps.push(csvStorage.read(csv.fullPath, 'Text')
                .then(text => folder.file(csv.name, text)));
        });
    }
    return Promise.all(ps)
        .then(() => {
        zip.generateAsync({ type: 'blob' })
            .then(function (blob) {
            file_saver_1.default.saveAs(blob, 'uivision_backup.zip');
        });
    });
}
exports.backup = backup;


/***/ }),

/***/ 359:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/// <reference types="chrome"/>
Object.defineProperty(exports, "__esModule", { value: true });
const ts_utils_1 = __webpack_require__(12);
var CommandName;
(function (CommandName) {
    CommandName["GetVersion"] = "getVersion";
    CommandName["GetDPI"] = "getDPI";
    CommandName["SetDirectory"] = "setDirectory";
    CommandName["SaveScreenshot"] = "saveScreenshot";
})(CommandName || (CommandName = {}));
class NativeScreenCapture {
    reconnect() {
        return Promise.resolve(this);
    }
    getVersion() {
        return this.sendMessage(CommandName.GetVersion);
    }
    getDpi() {
        return this.sendMessage(CommandName.GetDPI);
    }
    captureDesktop() {
        return this.sendMessage(CommandName.SaveScreenshot);
    }
    changeDirectory(dir) {
        return this.sendMessage(CommandName.SaveScreenshot, { current: dir });
    }
    sendMessage(command, extra = {}) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendNativeMessage(NativeScreenCapture.HostName, Object.assign(Object.assign({}, extra), { command }), (response) => {
                if (response && response.result) {
                    resolve(response[NativeScreenCapture.FieldNameMapping[command]]);
                }
                else {
                    let error = response && response.error;
                    error = error || 'Unknown error';
                    reject(new Error(error));
                }
            });
        });
    }
}
exports.NativeScreenCapture = NativeScreenCapture;
NativeScreenCapture.HostName = 'com.github.teamdocs.kcmd';
NativeScreenCapture.FieldNameMapping = {
    [CommandName.GetVersion]: 'version',
    [CommandName.GetDPI]: 'dpi',
    [CommandName.SetDirectory]: 'directory',
    [CommandName.SaveScreenshot]: 'file',
};
exports.getNativeScreenCapture = ts_utils_1.singletonGetter(() => new NativeScreenCapture());


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

/***/ 361:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(512);
const migration_data_1 = __webpack_require__(513);
const _2019_04_01_macro_suite_storage_1 = __webpack_require__(325);
const ts_utils_1 = __webpack_require__(12);
class KantuMigrationService extends common_1.MigrationService {
    constructor() {
        super({
            storage: {
                get(type) {
                    return migration_data_1.getMigrationKeyValueData().get(type);
                },
                set(type, data) {
                    return migration_data_1.getMigrationKeyValueData().set(type, data)
                        .then(() => true);
                },
                getAll() {
                    return migration_data_1.getMigrationKeyValueData().getAll()
                        .then((dict) => {
                        return Object.keys(dict).map((key) => dict[key]);
                    });
                }
            },
            jobs: [
                _2019_04_01_macro_suite_storage_1.getMigrateMacroTestSuiteToBrowserFileSystem()
            ]
        });
    }
}
exports.KantuMigrationService = KantuMigrationService;
exports.getKantuMigrationService = ts_utils_1.singletonGetter(() => {
    return new KantuMigrationService();
});


/***/ }),

/***/ 366:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_utils_1 = __webpack_require__(12);
const web_extension_1 = __importDefault(__webpack_require__(10));
class ContextMenuService {
    createMenus(menuInfos) {
        return ts_utils_1.flow(...menuInfos.map(info => () => {
            return web_extension_1.default.contextMenus.create(info);
        }))
            .then(() => { });
    }
    destroyMenus() {
        return web_extension_1.default.contextMenus.removeAll();
    }
}
exports.ContextMenuService = ContextMenuService;
exports.getContextMenuService = ts_utils_1.singletonGetter(() => new ContextMenuService());


/***/ }),

/***/ 374:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var ZipFolders;
(function (ZipFolders) {
    ZipFolders["Macros"] = "macros";
    ZipFolders["TestSuites"] = "testsuites";
    ZipFolders["Screenshots"] = "screenshots";
    ZipFolders["Csvs"] = "datasources";
    ZipFolders["Visions"] = "images";
})(ZipFolders = exports.ZipFolders || (exports.ZipFolders = {}));


/***/ }),

/***/ 393:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeWindow", function() { return resizeWindow; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeViewport", function() { return resizeViewport; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "resizeViewportOfTab", function() { return resizeViewportOfTab; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getWindowSize", function() { return getWindowSize; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getFocusedWindowSize", function() { return getFocusedWindowSize; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(11);
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_log__WEBPACK_IMPORTED_MODULE_2__);




var calcOffset = function calcOffset(screenTotal, screenOffset, oldOffset, oldSize, newSize) {
  var preferStart = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : false;

  var isCloserToStart = preferStart || oldOffset < screenTotal - oldOffset - oldSize;

  _log__WEBPACK_IMPORTED_MODULE_2___default()('calcOffset', screenTotal, oldOffset, oldSize, newSize, preferStart);

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
  _log__WEBPACK_IMPORTED_MODULE_2___default()('resizeViewport, ROUND', count);

  return getWindowSize(winId).then(function (currentSize) {
    logWindowSize(currentSize);

    var dx = currentSize.window.width - currentSize.viewport.width;
    var dy = currentSize.window.height - currentSize.viewport.height;

    var newWinSize = {
      width: dx + pureViewportSize.width,
      height: dy + pureViewportSize.height
    };

    _log__WEBPACK_IMPORTED_MODULE_2___default()('size set to', newWinSize);
    return resizeWindow(winId, newWinSize).then(function () {
      return getWindowSize(winId);
    }).then(function (newSize) {
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
  _log__WEBPACK_IMPORTED_MODULE_2___default()(winSize.window, winSize.viewport);
  _log__WEBPACK_IMPORTED_MODULE_2___default()('dx = ', winSize.window.width - winSize.viewport.width);
  _log__WEBPACK_IMPORTED_MODULE_2___default()('dy = ', winSize.window.height - winSize.viewport.height);
}

/***/ }),

/***/ 411:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

var setStyle = function setStyle($dom, obj) {
  Object.keys(obj).forEach(function (key) {
    $dom.style[key] = obj[key];
  });
};

var createTextarea = function createTextarea() {
  // [legacy code] Used to use textarea for copy/paste
  //
  // const $input = document.createElement('textarea')
  // // Note: Firefox requires 'contenteditable' attribute, even on textarea element
  // // without it, execCommand('paste') won't work in Firefox
  // // reference: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#Browser-specific_considerations_2
  // $input.setAttribute('contenteditable', true)
  // $input.id = 'clipboard_textarea'

  // Note: 2018-09-01, Firefox 61.0.2: Only able to paste clipboard into textarea for one time.
  // Switching to contenteditable div works fine
  var $input = document.createElement('div');
  $input.setAttribute('contenteditable', true);
  $input.id = 'clipboard_textarea';

  setStyle($input, {
    position: 'aboslute',
    top: '-9999px',
    left: '-9999px'
  });(document.body || document.documentElement).appendChild($input);
  return $input;
};

var getTextArea = function getTextArea() {
  var $el = document.getElementById('clipboard_textarea');
  if ($el) return $el;
  return createTextarea();
};

var withInput = function withInput(fn) {
  var $input = getTextArea();
  var ret = void 0;

  try {
    ret = fn($input);
  } catch (e) {
    console.error(e);
  } finally {
    $input.innerHTML = '';
  }

  return ret;
};

var api = {
  set: function set(text) {
    withInput(function ($input) {
      $input.innerText = text;
      $input.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('copy');
    });
  },
  get: function get() {
    return withInput(function ($input) {
      $input.blur();
      $input.focus();

      var res = document.execCommand('paste');

      if (res) {
        return $input.innerText;
      }

      return 'no luck';
    });
  }
};

/* harmony default export */ __webpack_exports__["a"] = (api);

/***/ }),

/***/ 412:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_extension_1 = __importDefault(__webpack_require__(10));
const tab_utils_1 = __webpack_require__(65);
const open_page_1 = __webpack_require__(1084);
const DESKTOP_SCREENSHOT_PAGE_URL = web_extension_1.default.extension.getURL('desktop_screenshot_editor.html');
exports.openDesktopScreenshotWindow = (() => {
    let lastTabId = 0;
    return () => {
        return web_extension_1.default.tabs.get(lastTabId)
            .catch((e) => null)
            .then((tab) => {
            const api = open_page_1.openPageInTab({
                url: DESKTOP_SCREENSHOT_PAGE_URL,
                tabId: tab && tab.id,
                keep: true,
                popup: true,
                domReady: true,
                focus: true,
                width: screen.availWidth / 2 + 50,
                height: screen.availHeight / 2 + 100,
                left: screen.availWidth / 4 - 25,
                top: screen.availHeight / 4 - 50,
            });
            api.getTabId()
                .then((tabId) => {
                lastTabId = tabId;
                return tab_utils_1.activateTab(tabId);
            });
            return api;
        });
    };
})();
function runInDesktopScreenshotEditor(req) {
    return exports.openDesktopScreenshotWindow()
        .then(api => api.ask(req.type, req.data));
}
exports.runInDesktopScreenshotEditor = runInDesktopScreenshotEditor;


/***/ }),

/***/ 42:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var ComputerVisionType;
(function (ComputerVisionType) {
    ComputerVisionType["Browser"] = "browser";
    ComputerVisionType["Desktop"] = "desktop";
    ComputerVisionType["DesktopScreenCapture"] = "desktop_screen_capture";
})(ComputerVisionType = exports.ComputerVisionType || (exports.ComputerVisionType = {}));
function isCVTypeForDesktop(type) {
    return type === ComputerVisionType.Desktop || type === ComputerVisionType.DesktopScreenCapture;
}
exports.isCVTypeForDesktop = isCVTypeForDesktop;


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

/***/ 504:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __webpack_require__(182);
class ProxyManagerViaSettingsAPI extends base_1.BaseProxyManager {
    constructor() {
        super();
        this.isBound = false;
    }
    isSupported() {
        return typeof chrome !== 'undefined' && chrome.proxy && chrome.proxy.settings && chrome.proxy.settings.onChange;
    }
    isControllable(incognito) {
        return new Promise((resolve, reject) => {
            chrome.proxy.settings.get({ incognito: !!incognito }, (details) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                const { levelOfControl } = details;
                const inControl = ['controllable_by_this_extension', 'controlled_by_this_extension'].indexOf(levelOfControl) !== -1;
                resolve(inControl);
            });
        });
    }
    setProxy(proxy) {
        this.bindProxyChange();
        this.proxy = proxy;
        return new Promise((resolve, reject) => {
            chrome.proxy.settings.set({
                value: {
                    mode: 'fixed_servers',
                    rules: {
                        singleProxy: {
                            scheme: proxy.type,
                            host: proxy.host,
                            port: parseInt(proxy.port, 10)
                        }
                    }
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    }
    reset() {
        return new Promise((resolve, reject) => {
            chrome.proxy.settings.set({
                value: {
                    mode: 'direct'
                }
            }, () => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                resolve();
            });
        });
    }
    bindProxyChange() {
        if (this.isBound) {
            return;
        }
        this.isBound = true;
        chrome.proxy.settings.onChange.addListener((details) => {
            const proxyData = this.fromChromeDetails(details);
            // Proxy data returned by fromChromeDetails doesn't contain username/password
            // so must avoid it overwrites the one with auth info
            this.setLocalProxyIfIsNew(proxyData);
            this.registry.fire('change', proxyData);
        });
    }
    fetchProxyFromSettings() {
        return new Promise((resolve, reject) => {
            chrome.proxy.settings.get({ incognito: false }, (details) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                }
                const proxyData = this.fromChromeDetails(details);
                this.setLocalProxyIfIsNew(proxyData);
                this.registry.fire('change', proxyData);
                resolve();
            });
        });
    }
    fromChromeDetails(details) {
        if (details.value.mode !== 'fixed_servers' || !details.value.rules || !details.value.rules.singleProxy) {
            return null;
        }
        const singleProxy = details.value.rules.singleProxy;
        return {
            host: singleProxy.host,
            port: '' + singleProxy.port,
            type: singleProxy.scheme
        };
    }
    setLocalProxyIfIsNew(proxyData) {
        var _a, _b;
        if ((proxyData === null || proxyData === void 0 ? void 0 : proxyData.host) !== ((_a = this.proxy) === null || _a === void 0 ? void 0 : _a.host) ||
            (proxyData === null || proxyData === void 0 ? void 0 : proxyData.port) !== ((_b = this.proxy) === null || _b === void 0 ? void 0 : _b.port)) {
            this.proxy = proxyData;
        }
    }
}
exports.ProxyManagerViaSettingsAPI = ProxyManagerViaSettingsAPI;


/***/ }),

/***/ 505:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __webpack_require__(182);
const listener_api_proxy_1 = __webpack_require__(357);
const ipc_cs_1 = __importDefault(__webpack_require__(20));
const log_1 = __importDefault(__webpack_require__(11));
const ts_utils_1 = __webpack_require__(12);
class ProxyManagerViaPacAPI extends base_1.BaseProxyManager {
    constructor() {
        super();
        this.unbind = () => { };
        this.isBound = false;
    }
    isSupported() {
        return typeof browser !== 'undefined' && browser.proxy && browser.proxy.register;
    }
    isControllable() {
        return Promise.resolve(true);
    }
    setProxy(proxy) {
        this.bind();
        this.proxy = proxy;
        this.notifyProxyChange();
        // Not sure if 1s delay could be omitted. Just keep it here in case legacy pac api
        // takes time before proxy takes effect
        return browser.runtime.sendMessage({
            cmd: 'SET_PROXY',
            data: proxy ? listener_api_proxy_1.convertToFirefoxProxyInfo(proxy) : null
        }, { toProxyScript: true })
            .then(() => ts_utils_1.delay(() => { }, 1000));
    }
    reset() {
        this.proxy = null;
        this.notifyProxyChange();
        return ipc_cs_1.default.ask('PANEL_SET_PROXY_FOR_PAC', { proxy: null })
            .then(() => ts_utils_1.delay(() => { }, 1000));
    }
    getAuth(host, port) {
        if (!this.proxy || !this.proxy.username) {
            return null;
        }
        if (this.proxy.host === host && this.proxy.port === port) {
            return {
                username: this.proxy.username,
                password: this.proxy.password
            };
        }
        return null;
    }
    notifyProxyChange() {
        setTimeout(() => {
            this.registry.fire('change', this.proxy);
        }, 10);
    }
    bind() {
        if (this.isBound) {
            return;
        }
        this.isBound = true;
        const pacListener = (data) => {
            if (data.type === 'PROXY_LOG') {
                log_1.default('PROXY_LOG', data);
            }
        };
        browser.proxy.register('firefox_pac.js');
        browser.runtime.onMessage.addListener(pacListener);
        this.unbind = () => {
            browser.proxy.unregister();
            browser.runtime.onMessage.removeListener(pacListener);
        };
    }
}
exports.ProxyManagerViaPacAPI = ProxyManagerViaPacAPI;


/***/ }),

/***/ 506:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web_extension_1 = __importDefault(__webpack_require__(10));
class ProxyHttpAuth {
    constructor(params) {
        this.unbindListener = () => { };
        this.bound = false;
        this.getAuth = params.getAuth;
    }
    bind() {
        if (this.bound) {
            return;
        }
        this.bound = true;
        const listener = this.onAuthRequired.bind(this);
        web_extension_1.default.webRequest.onAuthRequired.addListener(listener, { urls: ['<all_urls>'] }, ['blocking']);
        this.unbindListener = () => web_extension_1.default.webRequest.onAuthRequired.removeListener(listener);
    }
    unbind() {
        if (!this.bound) {
            return;
        }
        this.unbindListener();
        this.bound = false;
    }
    onAuthRequired(details) {
        if (!details.isProxy) {
            return {};
        }
        const auth = this.getAuth(details.challenger.host, '' + details.challenger.port);
        return auth ? { authCredentials: auth } : {};
    }
}
exports.ProxyHttpAuth = ProxyHttpAuth;


/***/ }),

/***/ 511:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = __webpack_require__(76);
const db_1 = __importDefault(__webpack_require__(92));
const utils_1 = __webpack_require__(4);
const ts_utils_1 = __webpack_require__(12);
class IndexeddbFlatStorage extends storage_1.FlatStorage {
    constructor(options) {
        super();
        this.displayedCount = 0;
        this.totalCount = 0;
        const tableName = options.table;
        if (!db_1.default.tables.find(t => t.name === tableName)) {
            throw new Error(`Unknown indexeddb table name '${tableName}'`);
        }
        this.table = db_1.default.table(options.table);
    }
    getDisplayCount() {
        return this.displayedCount;
    }
    getTotalCount() {
        return this.totalCount;
    }
    __list() {
        // Note: must wrap dexie's "Promise", as it's dexie's own thenable Promise
        return Promise.resolve(this.table.toArray())
            .then((xs) => {
            const convert = (x) => ({
                dir: '',
                fileName: (x.name),
                lastModified: new Date(),
                size: 'unknown'
            });
            this.totalCount = xs.length;
            this.displayedCount = xs.length;
            return xs.map(convert);
        });
    }
    exists(fileName) {
        return Promise.resolve(this.table
            .where('name')
            .equals(fileName)
            .toArray())
            .then((xs) => {
            return xs.length > 0;
        });
    }
    read(fileName, type) {
        if (type !== 'Text') {
            throw new Error(`ReadFileType '${type}' is not supported in indexeddb storage`);
        }
        return this.findByName(fileName);
    }
    readAll(readFileType = 'Text', onErrorFiles) {
        return Promise.resolve(this.table.toArray())
            .then(items => {
            return items.map(item => ({
                fileName: item.name,
                content: item
            }));
        });
    }
    __write(fileName, content) {
        return this.findByName(fileName)
            .catch(() => null)
            .then((item) => {
            if (item) {
                const data = this.normalize(Object.assign(Object.assign({}, item), content));
                delete data.id;
                return this.table.update(item.id, data);
            }
            else {
                const data = this.normalize(Object.assign({ id: utils_1.uid() }, content));
                return this.table.add(data);
            }
        })
            .then(() => { });
    }
    __overwrite(fileName, content) {
        return this.write(fileName, content);
    }
    __clear() {
        return Promise.resolve(this.table.clear());
    }
    __remove(fileName) {
        return this.findByName(fileName)
            .then(item => {
            return this.table.delete(item.id);
        });
    }
    __rename(fileName, newName) {
        return this.findByName(fileName)
            .then((item) => {
            return this.table.update(item.id, { name: newName });
        })
            .then(() => { });
    }
    __copy(fileName, newName) {
        return this.findByName(fileName)
            .then((item) => {
            delete item.id;
            item.name = newName;
            return this.__write(newName, item);
        });
    }
    ensureDir() {
        return Promise.resolve();
    }
    findByName(name) {
        return Promise.resolve(this.table
            .where('name')
            .equals(name)
            .first())
            .then((item) => {
            if (!item)
                throw new Error(`indexeddb storage: Item with name '${name}' is not found`);
            return item;
        });
    }
    normalize(data) {
        return data;
    }
    dataToString(data) {
        return JSON.stringify(data);
    }
}
exports.IndexeddbFlatStorage = IndexeddbFlatStorage;
exports.getIndexeddbFlatStorage = ts_utils_1.singletonGetterByKey((opts) => {
    return opts.table;
}, (opts) => {
    return new IndexeddbFlatStorage(opts);
});


/***/ }),

/***/ 512:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const semver_1 = __importDefault(__webpack_require__(135));
const types_1 = __webpack_require__(185);
const ts_utils_1 = __webpack_require__(12);
class MigrationService {
    constructor(options) {
        this.storage = options.storage;
        this.jobs = options.jobs;
    }
    isMigrated(type) {
        return this.storage.get(type)
            .then((record) => !!record);
    }
    getRecords() {
        return this.storage.getAll();
    }
    runType(type) {
        return this.isMigrated(type)
            .then((migrated) => {
            if (migrated) {
                return types_1.MigrationResult.AlreadyMigrated;
            }
            const job = this.findJob(type);
            if (!job) {
                return types_1.MigrationResult.JobUnknown;
            }
            return job.shouldMigrate()
                .then((pass) => {
                if (!pass) {
                    return types_1.MigrationResult.NotQualified;
                }
                return job.migrate()
                    .then(() => types_1.MigrationResult.Success);
            });
        })
            .catch((e) => {
            console.error(e);
            return types_1.MigrationResult.Error;
        })
            .then((result) => {
            if (result !== types_1.MigrationResult.Success) {
                return Promise.resolve(result);
            }
            return this.storage.set(type, {
                result,
                id: ts_utils_1.uid(),
                runAt: new Date().getTime(),
                jobType: type
            })
                .then(() => result);
        });
    }
    runAll(previousVersion, currentVersion) {
        const validJobs = this.jobs.filter((job) => {
            return semver_1.default.satisfies(previousVersion, job.previousVersionRange());
        });
        return ts_utils_1.flow(...validJobs.map((job) => {
            const type = job.getType();
            return () => {
                return this.runType(type)
                    .then((result) => ({ type, result }));
            };
        }))
            .then((list) => {
            const result = list.reduce((prev, cur) => {
                prev[cur.type] = cur.result;
                return prev;
            }, {});
            return result;
        });
    }
    findJob(type) {
        return this.jobs.find((item) => item.getType() === type);
    }
}
exports.MigrationService = MigrationService;


/***/ }),

/***/ 513:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(153);
const ts_utils_1 = __webpack_require__(12);
class MigrationKeyValueData extends common_1.KeyValueData {
    getAll() {
        return super.get("");
    }
    getMainKeyAndSubKeys(key) {
        const [mainKey, subKeys] = super.getMainKeyAndSubKeys(key);
        return [
            MigrationKeyValueData.STORAGE_KEY,
            [mainKey].concat(subKeys).filter(x => x && x.length)
        ];
    }
}
exports.MigrationKeyValueData = MigrationKeyValueData;
MigrationKeyValueData.STORAGE_KEY = 'migration_records';
exports.getMigrationKeyValueData = ts_utils_1.singletonGetter(() => new MigrationKeyValueData());


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

/***/ 63:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "postMessage", function() { return postMessage; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "onMessage", function() { return onMessage; });
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var TYPE = 'SELENIUM_IDE_CS_MSG';

var postMessage = function postMessage(targetWin, myWin, payload) {
  var target = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : '*';
  var timeout = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 60000;

  return new Promise(function (resolve, reject) {
    if (!targetWin || !targetWin.postMessage) {
      throw new Error('csPostMessage: targetWin is not a window');
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

/***/ 65:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_utils_1 = __webpack_require__(12);
const web_extension_1 = __importDefault(__webpack_require__(10));
exports.createTab = (url) => {
    return web_extension_1.default.tabs.create({ url, active: true });
};
exports.activateTab = (tabId, focusWindow = false) => {
    return web_extension_1.default.tabs.get(tabId)
        .then((tab) => {
        const p = focusWindow ? web_extension_1.default.windows.update(tab.windowId, { focused: true })
            : Promise.resolve();
        return p.then(() => web_extension_1.default.tabs.update(tab.id, { active: true }))
            .then(() => tab);
    });
};
exports.getTab = (tabId) => {
    return web_extension_1.default.tabs.get(tabId);
};
exports.getCurrentTab = (winId) => {
    const pWin = winId ? web_extension_1.default.windows.get(winId) : web_extension_1.default.windows.getLastFocused();
    return pWin.then((win) => {
        return web_extension_1.default.tabs.query({ active: true, windowId: win.id })
            .then((tabs) => tabs[0]);
    });
};
function updateUrlForTab(tabId, url) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const tab = typeof tabId === "number" ? (yield web_extension_1.default.tabs.get(tabId)) : tabId;
        const tabUrl = new URL(tab.url);
        const newUrl = new URL(url);
        const isSamePath = tabUrl.origin + tabUrl.pathname === newUrl.origin + tabUrl.pathname;
        // Browsers won't reload the page if the new url is only different in hash
        const noReload = isSamePath && !!((_a = newUrl.hash) === null || _a === void 0 ? void 0 : _a.length);
        if (noReload) {
            yield web_extension_1.default.tabs.update(tab.id, { url: "about:blank" });
            yield ts_utils_1.delay(() => { }, 100);
        }
        yield web_extension_1.default.tabs.update(tab.id, { url });
        return yield exports.getTab(tab.id);
    });
}
exports.updateUrlForTab = updateUrlForTab;


/***/ }),

/***/ 653:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export withDebugger */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return setFileInputFiles; });
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(4);
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

/***/ 654:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const worker_connection_1 = __webpack_require__(1080);
const image_helper_1 = __webpack_require__(1082);
const desktop_1 = __webpack_require__(91);
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
function postImageSearchAsync(image, pattern, minSimilarity, allowSizeVariation, enableGreenPinkBoxes) {
    const jobData = {
        image,
        pattern,
        options: {
            minSimilarity,
            allowSizeVariation,
            enableGreenPinkBoxes: enableGreenPinkBoxes,
            requireGreenPinkBoxes: enableGreenPinkBoxes
        }
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
    const { allowSizeVariation, enableGreenPinkBoxes } = req;
    return Promise.all([
        image_helper_1.ImageHelper.loadImageDataAsync(req.targetImageUrl),
        image_helper_1.ImageHelper.loadImageDataAsync(req.patternImageUrl)
    ])
        .then(([screenshotImageData, patternImageData]) => {
        return postImageSearchAsync(screenshotImageData, patternImageData, minSimilarity, allowSizeVariation, enableGreenPinkBoxes)
            .then(result => {
            desktop_1.guardSearchResult(result);
            const { containsGreenPinkBoxes, errorCode, regions } = result;
            return regions.map(r => ({
                // `offsetLeft` and `offsetTop` are relative to the search area, or the whole image if no search area provided
                // so most of the time, should not use these two values directly for click/XClick, because we need "global"
                // coordinates instead of search area based coordinates.
                //
                // In comparison, `pageTop` and `pageLeft` are relative to the page, which is useful to display highlights on page,
                // while `viewportTop` and `viewportLeft` are relative to the viewport, which is useful for XClick
                offsetLeft: r.rect.left / req.scaleDownRatio,
                offsetTop: r.rect.top / req.scaleDownRatio,
                viewportLeft: r.rect.left / req.scaleDownRatio + req.viewportOffsetX,
                viewportTop: r.rect.top / req.scaleDownRatio + req.viewportOffsetY,
                pageLeft: r.rect.left / req.scaleDownRatio + req.pageOffsetX,
                pageTop: r.rect.top / req.scaleDownRatio + req.pageOffsetY,
                width: r.rect.width / req.scaleDownRatio,
                height: r.rect.height / req.scaleDownRatio,
                score: r.score
            }));
        });
    });
}
exports.searchImage = searchImage;


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

/***/ 70:
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

if ( true && module.exports) {
	module.exports.saveAs = saveAs;
} else if ( true && __webpack_require__(551) !== null && __webpack_require__(433) !== null) {
	!(__WEBPACK_AMD_DEFINE_RESULT__ = (function () {
		return saveAs;
	}).call(exports, __webpack_require__, exports, module),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
}

/***/ }),

/***/ 74:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(90);
const desktop_1 = __webpack_require__(91);
const ts_utils_1 = __webpack_require__(12);
class XDesktop extends common_1.XModule {
    getName() {
        return common_1.XModuleTypes.XDesktop;
    }
    getAPI() {
        return desktop_1.getNativeCVAPI();
    }
    initConfig() {
        return this.getConfig();
    }
    sanityCheck() {
        return Promise.all([
            this.getConfig(),
            this.getAPI().getVersion()
                .then(() => this.getAPI(), () => this.getAPI().reconnect())
                .catch(e => {
                throw new Error('Error #301: Visual Desktop Automation XModule is not installed yet');
            })
        ])
            .then(() => true);
    }
    checkUpdate() {
        return Promise.reject(new Error('checkUpdate is not implemented yet'));
    }
    checkUpdateLink(modVersion, extVersion) {
        return `https://ui.vision/x/idehelp?help=xdesktop_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`;
    }
    downloadLink() {
        return 'https://ui.vision/x/idehelp?help=xdesktop_download';
    }
    infoLink() {
        return 'https://ui.vision/x/idehelp?help=xdesktop';
    }
}
exports.XDesktop = XDesktop;
exports.getXDesktop = ts_utils_1.singletonGetter(() => {
    return new XDesktop();
});


/***/ }),

/***/ 75:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = __webpack_require__(90);
const ts_utils_1 = __webpack_require__(12);
const screen_capture_1 = __webpack_require__(359);
class XScreenCapture extends common_1.XModule {
    getName() {
        return common_1.XModuleTypes.XScreenCapture;
    }
    getAPI() {
        return screen_capture_1.getNativeScreenCapture();
    }
    initConfig() {
        return this.getConfig();
    }
    sanityCheck() {
        return Promise.all([
            this.getConfig(),
            this.getAPI().getVersion()
                .catch(e => {
                throw new Error('Error #301: Screen Capture XModule is not installed yet');
            })
        ])
            .then(() => true);
    }
    checkUpdate() {
        return Promise.reject(new Error('checkUpdate is not implemented yet'));
    }
    checkUpdateLink(modVersion, extVersion) {
        return `https://ui.vision/x/idehelp?help=xscreencapture_updatecheck&xversion=${modVersion}&kantuversion=${extVersion}`;
    }
    downloadLink() {
        return 'https://ui.vision/x/idehelp?help=xscreencapture_download';
    }
    infoLink() {
        return 'https://ui.vision/x/idehelp?help=xscreencapture';
    }
}
exports.XScreenCapture = XScreenCapture;
exports.getXScreenCapture = ts_utils_1.singletonGetter(() => {
    return new XScreenCapture();
});


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

/***/ 87:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var DesktopScreenshot;
(function (DesktopScreenshot) {
    let RequestType;
    (function (RequestType) {
        RequestType["DisplayVisualResult"] = "display_visual_result";
        RequestType["DisplayOcrResult"] = "display_ocr_result";
        RequestType["Capture"] = "capture";
    })(RequestType = DesktopScreenshot.RequestType || (DesktopScreenshot.RequestType = {}));
    let ImageSource;
    (function (ImageSource) {
        ImageSource[ImageSource["Storage"] = 0] = "Storage";
        ImageSource[ImageSource["HardDrive"] = 1] = "HardDrive";
        ImageSource[ImageSource["CV"] = 2] = "CV";
        ImageSource[ImageSource["DataUrl"] = 3] = "DataUrl";
    })(ImageSource = DesktopScreenshot.ImageSource || (DesktopScreenshot.ImageSource = {}));
    let RectType;
    (function (RectType) {
        RectType[RectType["Match"] = 0] = "Match";
        RectType[RectType["Reference"] = 1] = "Reference";
        RectType[RectType["BestMatch"] = 2] = "BestMatch";
        RectType[RectType["ReferenceOfBestMatch"] = 3] = "ReferenceOfBestMatch";
    })(RectType = DesktopScreenshot.RectType || (DesktopScreenshot.RectType = {}));
})(DesktopScreenshot = exports.DesktopScreenshot || (exports.DesktopScreenshot = {}));


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

/***/ 91:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = __webpack_require__(344);
const ts_utils_1 = __webpack_require__(12);
const kantu_cv_host_1 = __webpack_require__(345);
const base64_1 = __webpack_require__(346);
const utils_1 = __webpack_require__(4);
const dom_utils_1 = __webpack_require__(22);
const log_1 = __importDefault(__webpack_require__(11));
const path_1 = __importDefault(__webpack_require__(27));
exports.getNativeCVAPI = ts_utils_1.singletonGetter(() => {
    const nativeHost = new kantu_cv_host_1.KantuCVHost();
    let pReady = nativeHost.connectAsync().catch(e => {
        log_1.default.warn('pReady - error', e);
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
                    typeSafeAPI.reconnect().catch(() => { });
                    // Note: For now, native host doesn't provide any useful error message if captureDesktop fails
                    // but for most cases it's due to directory not exist
                    if (camel === 'captureDesktop') {
                        const filePath = params.path;
                        if (filePath && /[\\/]/.test(filePath)) {
                            throw new Error(`Failed to captureDesktop, please confirm directory exists at '${path_1.default.dirname(filePath)}'`);
                        }
                    }
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
        searchDesktopWithGuard: (params) => {
            const typeSafeAPI = api;
            return typeSafeAPI.searchDesktop(params).then(guardSearchResult);
        },
        getImageFromDataUrl: (dataUrl, dpi) => {
            const typeSafeAPI = api;
            const removeBase64Prefix = (str) => {
                const b64 = 'base64,';
                const i = str.indexOf(b64);
                if (i === -1)
                    return str;
                return str.substr(i + b64.length);
            };
            return typeSafeAPI.getImageInfo({ content: removeBase64Prefix(dataUrl) })
                .then(info => {
                const DEFAULT_DPI = 96;
                const dpiX = info.dpiX || dpi || DEFAULT_DPI;
                const dpiY = info.dpiY || dpi || DEFAULT_DPI;
                return serializeDataUrl(dataUrl, dpiX, dpiY);
            });
        },
        readFileAsArrayBuffer: (filePath) => {
            const typeSafeAPI = api;
            const readMore = (filePath, totalSize = Infinity, rangeStart = 0, dataUrls = []) => {
                return typeSafeAPI.readFileRange({
                    rangeStart,
                    path: filePath
                })
                    .then(range => {
                    const result = range.rangeEnd > range.rangeStart ? dataUrls.concat([range.buffer]) : dataUrls;
                    if (range.rangeEnd >= totalSize || range.rangeEnd <= range.rangeStart)
                        return result;
                    return readMore(filePath, totalSize, range.rangeEnd, result);
                });
            };
            return typeSafeAPI.getFileSize({ path: filePath })
                .then(fileSize => readMore(filePath, fileSize, 0, []))
                .then(dataUrls => {
                const arr = ts_utils_1.concatUint8Array(...dataUrls.map(dataUrl => new Uint8Array(utils_1.dataURItoArrayBuffer(dataUrl))));
                return arr.buffer;
            });
        },
        readFileAsBlob: (filePath) => {
            const typeSafeAPI = api;
            return typeSafeAPI.readFileAsArrayBuffer(filePath)
                .then(buffer => new Blob([buffer]));
        },
        readFileAsDataURL: (filePath, withBase64Prefix = true) => {
            const typeSafeAPI = api;
            return typeSafeAPI.readFileAsBlob(filePath)
                .then(blob => utils_1.blobToDataURL(blob, withBase64Prefix));
        },
        readFileAsText: (filePath) => {
            const typeSafeAPI = api;
            return typeSafeAPI.readFileAsBlob(filePath)
                .then(blob => utils_1.blobToText(blob));
        },
        readFileAsBinaryString: (filePath) => {
            const typeSafeAPI = api;
            return typeSafeAPI.readFileAsArrayBuffer(filePath)
                .then(buffer => utils_1.arrayBufferToString(buffer));
        }
    });
    return api;
});
function guardSearchResult(result) {
    switch (result.errorCode) {
        case 0 /* Ok */:
            return result;
        case 2 /* NoGreenPinkBoxes */:
            throw new Error('Cannot find green and/or pink boxes');
        case 3 /* NoPinkBox */:
            throw new Error('Pattern image contains green box but does not contain pink box');
        case 4 /* TooManyGreenBox */:
            throw new Error('Pattern image contains more than one green box');
        case 5 /* TooManyPinkBox */:
            throw new Error('Pattern image contains more than one pink box');
        case 1 /* Fail */:
            throw new Error('Unspecified error has occured');
        default:
            throw new Error(`Unknown error code ${result.errorCode}`);
    }
}
exports.guardSearchResult = guardSearchResult;
function convertImageSearchResult(result, scale = 1, searchArea) {
    const { errorCode, containsGreenPinkBoxes, regions } = result;
    const convert = (region) => {
        var _a, _b;
        const searchAreaX = (_a = searchArea === null || searchArea === void 0 ? void 0 : searchArea.x) !== null && _a !== void 0 ? _a : 0;
        const searchAreaY = (_b = searchArea === null || searchArea === void 0 ? void 0 : searchArea.y) !== null && _b !== void 0 ? _b : 0;
        // All x, y in relativeRect and matchedRect are relatve to the whole screen
        if (!region.relativeRect) {
            return {
                matched: {
                    offsetLeft: scale * region.matchedRect.x - scale * searchAreaX,
                    offsetTop: scale * region.matchedRect.y - scale * searchAreaY,
                    viewportLeft: scale * region.matchedRect.x,
                    viewportTop: scale * region.matchedRect.y,
                    pageLeft: scale * region.matchedRect.x,
                    pageTop: scale * region.matchedRect.y,
                    width: scale * region.matchedRect.width,
                    height: scale * region.matchedRect.height,
                    score: region.score
                },
                reference: null
            };
        }
        else {
            return {
                matched: {
                    offsetLeft: scale * region.relativeRect.x - scale * searchAreaX,
                    offsetTop: scale * region.relativeRect.y - scale * searchAreaY,
                    viewportLeft: scale * region.relativeRect.x,
                    viewportTop: scale * region.relativeRect.y,
                    pageLeft: scale * region.relativeRect.x,
                    pageTop: scale * region.relativeRect.y,
                    width: scale * region.relativeRect.width,
                    height: scale * region.relativeRect.height,
                    score: region.score
                },
                reference: {
                    offsetLeft: scale * region.matchedRect.x - scale * searchAreaX,
                    offsetTop: scale * region.matchedRect.y - scale * searchAreaY,
                    viewportLeft: scale * region.matchedRect.x,
                    viewportTop: scale * region.matchedRect.y,
                    pageLeft: scale * region.matchedRect.x,
                    pageTop: scale * region.matchedRect.y,
                    width: scale * region.matchedRect.width,
                    height: scale * region.matchedRect.height,
                    score: region.score
                }
            };
        }
    };
    return regions.map(r => convert(r));
}
exports.convertImageSearchResult = convertImageSearchResult;
function serializeImageData(imageData, dpiX, dpiY) {
    // Convert RGBA -> RGB -> Base64
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const rgb = new Uint8Array(w * h * 3);
    for (let y = 0; y < h; ++y) {
        for (let x = 0; x < w; ++x) {
            const base = y * w + x;
            const k = 3 * base;
            const j = 4 * base;
            rgb[k + 0] = src[j + 0];
            rgb[k + 1] = src[j + 1];
            rgb[k + 2] = src[j + 2];
        }
    }
    const data = base64_1.base64.encode(rgb);
    return {
        width: w,
        height: h,
        dpiX,
        dpiY,
        data
    };
}
exports.serializeImageData = serializeImageData;
function serializeDataUrl(dataUrl, dpiX, dpiY) {
    return dom_utils_1.imageDataFromUrl(dataUrl)
        .then(imageData => serializeImageData(imageData, dpiX, dpiY));
}
exports.serializeDataUrl = serializeDataUrl;


/***/ }),

/***/ 92:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var dexie__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(395);
/* harmony import */ var dexie__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(dexie__WEBPACK_IMPORTED_MODULE_0__);


var db = new dexie__WEBPACK_IMPORTED_MODULE_0___default.a('selenium-ide');

db.version(1).stores({
  testCases: 'id,name,updateTime'
});

db.version(2).stores({
  testCases: 'id,name,updateTime',
  testSuites: 'id,name,updateTime'
});

db.open();

/* harmony default export */ __webpack_exports__["default"] = (db);

/***/ }),

/***/ 94:
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
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(10);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(13);
/* harmony import */ var _services_storage__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_services_storage__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _common_utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(4);
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
  return captureScreen(tabId).then(_common_utils__WEBPACK_IMPORTED_MODULE_2__["dataURItoBlob"]);
}

function saveScreen(screenshotStorage, tabId, fileName) {
  return captureScreenBlob(tabId).then(function (screenBlob) {
    return screenshotStorage.overwrite(fileName, screenBlob).then(function (url) {
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
    var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_2__["dataURItoBlob"] : function (x) {
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
  var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_2__["dataURItoBlob"] : function (x) {
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
  var convert = opts.blob ? _common_utils__WEBPACK_IMPORTED_MODULE_2__["dataURItoBlob"] : function (x) {
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

    return Object(_common_utils__WEBPACK_IMPORTED_MODULE_2__["delay"])(function () {
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

function saveFullScreen(screenshotStorage, tabId, fileName, clientAPI) {
  return captureFullScreen(tabId, clientAPI, { blob: true }).then(function (screenBlob) {
    return screenshotStorage.overwrite(fileName, screenBlob).then(function (url) {
      return {
        url: url,
        fileName: fileName
      };
    });
  });
}

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