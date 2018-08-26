/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
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
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 699);
/******/ })
/************************************************************************/
/******/ ({

/***/ 100:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var Buffer = __webpack_require__(40).Buffer;

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return -1;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// UTF-8 replacement characters ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd'.repeat(p);
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd'.repeat(p + 1);
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd'.repeat(p + 2);
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character for each buffered byte of a (partial)
// character needs to be added to the output.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd'.repeat(this.lastTotal - this.lastNeed);
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}

/***/ }),

/***/ 109:
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),

/***/ 110:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {

module.exports = Readable;

/*<replacement>*/
var processNextTick = __webpack_require__(80);
/*</replacement>*/

/*<replacement>*/
var isArray = __webpack_require__(109);
/*</replacement>*/

/*<replacement>*/
var Buffer = __webpack_require__(36).Buffer;
/*</replacement>*/

Readable.ReadableState = ReadableState;

var EE = __webpack_require__(65);

/*<replacement>*/
var EElistenerCount = function (emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = __webpack_require__(53);
  } catch (_) {} finally {
    if (!Stream) Stream = __webpack_require__(65).EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = __webpack_require__(36).Buffer;

/*<replacement>*/
var util = __webpack_require__(58);
util.inherits = __webpack_require__(28);
/*</replacement>*/

/*<replacement>*/
var debugUtil = __webpack_require__(173);
var debug = undefined;
if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function () {};
}
/*</replacement>*/

var StringDecoder;

util.inherits(Readable, Stream);

var Duplex;
function ReadableState(options, stream) {
  Duplex = Duplex || __webpack_require__(51);

  options = options || {};

  // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

  // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.buffer = [];
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.
  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // when piping, we only care about 'readable' events that happen
  // after read()ing all the bytes and not getting any pushback.
  this.ranOut = false;

  // the number of writers that are awaiting a drain event in .pipe()s
  this.awaitDrain = 0;

  // if true, a maybeReadMore has been scheduled
  this.readingMore = false;

  this.decoder = null;
  this.encoding = null;
  if (options.encoding) {
    if (!StringDecoder) StringDecoder = __webpack_require__(100).StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

var Duplex;
function Readable(options) {
  Duplex = Duplex || __webpack_require__(51);

  if (!(this instanceof Readable)) return new Readable(options);

  this._readableState = new ReadableState(options, this);

  // legacy
  this.readable = true;

  if (options && typeof options.read === 'function') this._read = options.read;

  Stream.call(this);
}

// Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.
Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;

  if (!state.objectMode && typeof chunk === 'string') {
    encoding = encoding || state.defaultEncoding;
    if (encoding !== state.encoding) {
      chunk = new Buffer(chunk, encoding);
      encoding = '';
    }
  }

  return readableAddChunk(this, state, chunk, encoding, false);
};

// Unshift should *always* be something directly out of read()
Readable.prototype.unshift = function (chunk) {
  var state = this._readableState;
  return readableAddChunk(this, state, chunk, '', true);
};

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
};

function readableAddChunk(stream, state, chunk, encoding, addToFront) {
  var er = chunkInvalid(state, chunk);
  if (er) {
    stream.emit('error', er);
  } else if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else if (state.objectMode || chunk && chunk.length > 0) {
    if (state.ended && !addToFront) {
      var e = new Error('stream.push() after EOF');
      stream.emit('error', e);
    } else if (state.endEmitted && addToFront) {
      var e = new Error('stream.unshift() after end event');
      stream.emit('error', e);
    } else {
      var skipAdd;
      if (state.decoder && !addToFront && !encoding) {
        chunk = state.decoder.write(chunk);
        skipAdd = !state.objectMode && chunk.length === 0;
      }

      if (!addToFront) state.reading = false;

      // Don't add to the buffer if we've decoded to an empty string chunk and
      // we're not in object mode
      if (!skipAdd) {
        // if we want the data now, just emit it.
        if (state.flowing && state.length === 0 && !state.sync) {
          stream.emit('data', chunk);
          stream.read(0);
        } else {
          // update the buffer info.
          state.length += state.objectMode ? 1 : chunk.length;
          if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

          if (state.needReadable) emitReadable(stream);
        }
      }

      maybeReadMore(stream, state);
    }
  } else if (!addToFront) {
    state.reading = false;
  }

  return needMoreData(state);
}

// if it's past the high water mark, we can push in some more.
// Also, if we have no data yet, we can stand some
// more bytes.  This is to work around cases where hwm=0,
// such as the repl.  Also, if the push() triggered a
// readable event, and the user called read(largeNumber) such that
// needReadable was set, then we ought to push more, so that another
// 'readable' event will be triggered.
function needMoreData(state) {
  return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
}

// backwards compatibility.
Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = __webpack_require__(100).StringDecoder;
  this._readableState.decoder = new StringDecoder(enc);
  this._readableState.encoding = enc;
  return this;
};

// Don't raise the hwm > 8MB
var MAX_HWM = 0x800000;
function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }
  return n;
}

function howMuchToRead(n, state) {
  if (state.length === 0 && state.ended) return 0;

  if (state.objectMode) return n === 0 ? 0 : 1;

  if (n === null || isNaN(n)) {
    // only flow one buffer at a time
    if (state.flowing && state.buffer.length) return state.buffer[0].length;else return state.length;
  }

  if (n <= 0) return 0;

  // If we're asking for more than the target buffer level,
  // then raise the water mark.  Bump up to the next highest
  // power of 2, to prevent increasing it excessively in tiny
  // amounts.
  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);

  // don't have that much.  return null, unless we've ended.
  if (n > state.length) {
    if (!state.ended) {
      state.needReadable = true;
      return 0;
    } else {
      return state.length;
    }
  }

  return n;
}

// you can override either this method, or the async _read(n) below.
Readable.prototype.read = function (n) {
  debug('read', n);
  var state = this._readableState;
  var nOrig = n;

  if (typeof n !== 'number' || n > 0) state.emittedReadable = false;

  // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.
  if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state);

  // if we've ended, and we're now clear, then finish it up.
  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  }

  // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.

  // if we need a readable event, then we need to do some reading.
  var doRead = state.needReadable;
  debug('need readable', doRead);

  // if we currently have less than the highWaterMark, then also read some
  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  }

  // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.
  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  }

  if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true;
    // if the length is currently zero, then we *need* a readable event.
    if (state.length === 0) state.needReadable = true;
    // call internal read method
    this._read(state.highWaterMark);
    state.sync = false;
  }

  // If _read pushed data synchronously, then `reading` will be false,
  // and we need to re-evaluate how much data we can return to the user.
  if (doRead && !state.reading) n = howMuchToRead(nOrig, state);

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = true;
    n = 0;
  }

  state.length -= n;

  // If we have nothing in the buffer, then we want to know
  // as soon as we *do* get something into the buffer.
  if (state.length === 0 && !state.ended) state.needReadable = true;

  // If we tried to read() past the EOF, then emit end on the next tick.
  if (nOrig !== n && state.ended && state.length === 0) endReadable(this);

  if (ret !== null) this.emit('data', ret);

  return ret;
};

function chunkInvalid(state, chunk) {
  var er = null;
  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    er = new TypeError('Invalid non-string/buffer chunk');
  }
  return er;
}

function onEofChunk(stream, state) {
  if (state.ended) return;
  if (state.decoder) {
    var chunk = state.decoder.end();
    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }
  state.ended = true;

  // emit 'readable' now to make sure it gets picked up.
  emitReadable(stream);
}

// Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.
function emitReadable(stream) {
  var state = stream._readableState;
  state.needReadable = false;
  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    if (state.sync) processNextTick(emitReadable_, stream);else emitReadable_(stream);
  }
}

function emitReadable_(stream) {
  debug('emit readable');
  stream.emit('readable');
  flow(stream);
}

// at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.
function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    processNextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  var len = state.length;
  while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length)
      // didn't get any data, stop spinning.
      break;else len = state.length;
  }
  state.readingMore = false;
}

// abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.
Readable.prototype._read = function (n) {
  this.emit('error', new Error('not implemented'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;
    case 1:
      state.pipes = [state.pipes, dest];
      break;
    default:
      state.pipes.push(dest);
      break;
  }
  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;

  var endFn = doEnd ? onend : cleanup;
  if (state.endEmitted) processNextTick(endFn);else src.once('end', endFn);

  dest.on('unpipe', onunpipe);
  function onunpipe(readable) {
    debug('onunpipe');
    if (readable === src) {
      cleanup();
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  }

  // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.
  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);

  var cleanedUp = false;
  function cleanup() {
    debug('cleanup');
    // cleanup event handlers once the pipe is broken
    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', cleanup);
    src.removeListener('data', ondata);

    cleanedUp = true;

    // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.
    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);
  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    if (false === ret) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      if (state.pipesCount === 1 && state.pipes[0] === dest && src.listenerCount('data') === 1 && !cleanedUp) {
        debug('false write response, pause', src._readableState.awaitDrain);
        src._readableState.awaitDrain++;
      }
      src.pause();
    }
  }

  // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.
  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) dest.emit('error', er);
  }
  // This is a brutally ugly hack to make sure that our error handler
  // is attached before any userland ones.  NEVER DO THIS.
  if (!dest._events || !dest._events.error) dest.on('error', onerror);else if (isArray(dest._events.error)) dest._events.error.unshift(onerror);else dest._events.error = [onerror, dest._events.error];

  // Both close and finish should trigger unpipe, but only once.
  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }
  dest.once('close', onclose);
  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }
  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  }

  // tell the dest that it's being piped to
  dest.emit('pipe', src);

  // start the flow if it hasn't been started already.
  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function () {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;
    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;

  // if we're not piping anywhere, then do nothing.
  if (state.pipesCount === 0) return this;

  // just one destination.  most common case.
  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;

    if (!dest) dest = state.pipes;

    // got a match.
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this);
    return this;
  }

  // slow case. multiple pipe destinations.

  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var _i = 0; _i < len; _i++) {
      dests[_i].emit('unpipe', this);
    }return this;
  }

  // try to find the right one.
  var i = indexOf(state.pipes, dest);
  if (i === -1) return this;

  state.pipes.splice(i, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];

  dest.emit('unpipe', this);

  return this;
};

// set up data events if they are asked for
// Ensure readable listeners eventually get something
Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);

  // If listening to data, and it has not explicitly been paused,
  // then call resume to start the flow of data on the next tick.
  if (ev === 'data' && false !== this._readableState.flowing) {
    this.resume();
  }

  if (ev === 'readable' && !this._readableState.endEmitted) {
    var state = this._readableState;
    if (!state.readableListening) {
      state.readableListening = true;
      state.emittedReadable = false;
      state.needReadable = true;
      if (!state.reading) {
        processNextTick(nReadingNextTick, this);
      } else if (state.length) {
        emitReadable(this, state);
      }
    }
  }

  return res;
};
Readable.prototype.addListener = Readable.prototype.on;

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
}

// pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.
Readable.prototype.resume = function () {
  var state = this._readableState;
  if (!state.flowing) {
    debug('resume');
    state.flowing = true;
    resume(this, state);
  }
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    processNextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  if (!state.reading) {
    debug('resume read 0');
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);
  if (false !== this._readableState.flowing) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);
  if (state.flowing) {
    do {
      var chunk = stream.read();
    } while (null !== chunk && state.flowing);
  }
}

// wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.
Readable.prototype.wrap = function (stream) {
  var state = this._readableState;
  var paused = false;

  var self = this;
  stream.on('end', function () {
    debug('wrapped end');
    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) self.push(chunk);
    }

    self.push(null);
  });

  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk);

    // don't skip over falsy values in objectMode
    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = self.push(chunk);
    if (!ret) {
      paused = true;
      stream.pause();
    }
  });

  // proxy all the other methods.
  // important when wrapping filters and duplexes.
  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function (method) {
        return function () {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  }

  // proxy certain important events.
  var events = ['error', 'close', 'destroy', 'pause', 'resume'];
  forEach(events, function (ev) {
    stream.on(ev, self.emit.bind(self, ev));
  });

  // when we try to consume some more bytes, simply unpause the
  // underlying stream.
  self._read = function (n) {
    debug('wrapped _read', n);
    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return self;
};

// exposed for testing purposes only.
Readable._fromList = fromList;

// Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
function fromList(n, state) {
  var list = state.buffer;
  var length = state.length;
  var stringMode = !!state.decoder;
  var objectMode = !!state.objectMode;
  var ret;

  // nothing in the list, definitely empty.
  if (list.length === 0) return null;

  if (length === 0) ret = null;else if (objectMode) ret = list.shift();else if (!n || n >= length) {
    // read it all, truncate the array.
    if (stringMode) ret = list.join('');else if (list.length === 1) ret = list[0];else ret = Buffer.concat(list, length);
    list.length = 0;
  } else {
    // read just some of it.
    if (n < list[0].length) {
      // just take a part of the first list item.
      // slice is the same for buffers and strings.
      var buf = list[0];
      ret = buf.slice(0, n);
      list[0] = buf.slice(n);
    } else if (n === list[0].length) {
      // first list is a perfect match
      ret = list.shift();
    } else {
      // complex case.
      // we have enough to cover it, but it spans past the first buffer.
      if (stringMode) ret = '';else ret = new Buffer(n);

      var c = 0;
      for (var i = 0, l = list.length; i < l && c < n; i++) {
        var buf = list[0];
        var cpy = Math.min(n - c, buf.length);

        if (stringMode) ret += buf.slice(0, cpy);else buf.copy(ret, c, 0, cpy);

        if (cpy < buf.length) list[0] = buf.slice(cpy);else list.shift();

        c += cpy;
      }
    }
  }

  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;

  // If we get here before consuming all the bytes, then that is a
  // bug in node.  Should never happen.
  if (state.length > 0) throw new Error('endReadable called on non-empty stream');

  if (!state.endEmitted) {
    state.ended = true;
    processNextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  // Check that we didn't get one last unshift.
  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');
  }
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }
  return -1;
}
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(46)))

/***/ }),

/***/ 111:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.



module.exports = PassThrough;

var Transform = __webpack_require__(82);

/*<replacement>*/
var util = __webpack_require__(58);
util.inherits = __webpack_require__(28);
/*</replacement>*/

util.inherits(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);

  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};

/***/ }),

/***/ 114:
/***/ (function(module, exports, __webpack_require__) {

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var eventFactory = __webpack_require__(115),
    DataTransfer = __webpack_require__(87);

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

/***/ 115:
/***/ (function(module, exports, __webpack_require__) {


var DataTransfer = __webpack_require__(87);

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

/***/ 116:
/***/ (function(module, exports) {

var MAX_ALLOC = Math.pow(2, 30) - 1 // default in iojs
module.exports = function (iterations, keylen) {
  if (typeof iterations !== 'number') {
    throw new TypeError('Iterations not a number')
  }

  if (iterations < 0) {
    throw new TypeError('Bad iterations')
  }

  if (typeof keylen !== 'number') {
    throw new TypeError('Key length not a number')
  }

  if (keylen < 0 || keylen > MAX_ALLOC || keylen !== keylen) { /* eslint no-self-compare: 0 */
    throw new TypeError('Bad key length')
  }
}


/***/ }),

/***/ 117:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(process) {var defaultEncoding
/* istanbul ignore next */
if (process.browser) {
  defaultEncoding = 'utf-8'
} else {
  var pVersionMajor = parseInt(process.version.split('.')[0].slice(1), 10)

  defaultEncoding = pVersionMajor >= 6 ? 'utf-8' : 'binary'
}
module.exports = defaultEncoding

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(46)))

/***/ }),

/***/ 118:
/***/ (function(module, exports, __webpack_require__) {

var md5 = __webpack_require__(201)
var rmd160 = __webpack_require__(203)
var sha = __webpack_require__(205)

var checkParameters = __webpack_require__(116)
var defaultEncoding = __webpack_require__(117)
var Buffer = __webpack_require__(40).Buffer
var ZEROS = Buffer.alloc(128)
var sizes = {
  md5: 16,
  sha1: 20,
  sha224: 28,
  sha256: 32,
  sha384: 48,
  sha512: 64,
  rmd160: 20,
  ripemd160: 20
}

function Hmac (alg, key, saltLen) {
  var hash = getDigest(alg)
  var blocksize = (alg === 'sha512' || alg === 'sha384') ? 128 : 64

  if (key.length > blocksize) {
    key = hash(key)
  } else if (key.length < blocksize) {
    key = Buffer.concat([key, ZEROS], blocksize)
  }

  var ipad = Buffer.allocUnsafe(blocksize + sizes[alg])
  var opad = Buffer.allocUnsafe(blocksize + sizes[alg])
  for (var i = 0; i < blocksize; i++) {
    ipad[i] = key[i] ^ 0x36
    opad[i] = key[i] ^ 0x5C
  }

  var ipad1 = Buffer.allocUnsafe(blocksize + saltLen + 4)
  ipad.copy(ipad1, 0, 0, blocksize)
  this.ipad1 = ipad1
  this.ipad2 = ipad
  this.opad = opad
  this.alg = alg
  this.blocksize = blocksize
  this.hash = hash
  this.size = sizes[alg]
}

Hmac.prototype.run = function (data, ipad) {
  data.copy(ipad, this.blocksize)
  var h = this.hash(ipad)
  h.copy(this.opad, this.blocksize)
  return this.hash(this.opad)
}

function getDigest (alg) {
  function shaFunc (data) {
    return sha(alg).update(data).digest()
  }

  if (alg === 'rmd160' || alg === 'ripemd160') return rmd160
  if (alg === 'md5') return md5
  return shaFunc
}

function pbkdf2 (password, salt, iterations, keylen, digest) {
  if (!Buffer.isBuffer(password)) password = Buffer.from(password, defaultEncoding)
  if (!Buffer.isBuffer(salt)) salt = Buffer.from(salt, defaultEncoding)

  checkParameters(iterations, keylen)

  digest = digest || 'sha1'

  var hmac = new Hmac(digest, password, salt.length)

  var DK = Buffer.allocUnsafe(keylen)
  var block1 = Buffer.allocUnsafe(salt.length + 4)
  salt.copy(block1, 0, 0, salt.length)

  var destPos = 0
  var hLen = sizes[digest]
  var l = Math.ceil(keylen / hLen)

  for (var i = 1; i <= l; i++) {
    block1.writeUInt32BE(i, salt.length)

    var T = hmac.run(block1, hmac.ipad1)
    var U = T

    for (var j = 1; j < iterations; j++) {
      U = hmac.run(U, hmac.ipad2)
      for (var k = 0; k < hLen; k++) T[k] ^= U[k]
    }

    T.copy(DK, destPos)
    destPos += hLen
  }

  return DK
}

module.exports = pbkdf2


/***/ }),

/***/ 119:
/***/ (function(module, exports, __webpack_require__) {

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = __webpack_require__(28)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var K = [
  0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
  0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
  0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
  0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
  0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
  0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
  0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
  0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
  0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
  0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
  0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
]

var W = new Array(64)

function Sha256 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha256, Hash)

Sha256.prototype.init = function () {
  this._a = 0x6a09e667
  this._b = 0xbb67ae85
  this._c = 0x3c6ef372
  this._d = 0xa54ff53a
  this._e = 0x510e527f
  this._f = 0x9b05688c
  this._g = 0x1f83d9ab
  this._h = 0x5be0cd19

  return this
}

function ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x) {
  return (x >>> 2 | x << 30) ^ (x >>> 13 | x << 19) ^ (x >>> 22 | x << 10)
}

function sigma1 (x) {
  return (x >>> 6 | x << 26) ^ (x >>> 11 | x << 21) ^ (x >>> 25 | x << 7)
}

function gamma0 (x) {
  return (x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)
}

function gamma1 (x) {
  return (x >>> 17 | x << 15) ^ (x >>> 19 | x << 13) ^ (x >>> 10)
}

Sha256.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0
  var f = this._f | 0
  var g = this._g | 0
  var h = this._h | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 64; ++i) W[i] = (gamma1(W[i - 2]) + W[i - 7] + gamma0(W[i - 15]) + W[i - 16]) | 0

  for (var j = 0; j < 64; ++j) {
    var T1 = (h + sigma1(e) + ch(e, f, g) + K[j] + W[j]) | 0
    var T2 = (sigma0(a) + maj(a, b, c)) | 0

    h = g
    g = f
    f = e
    e = (d + T1) | 0
    d = c
    c = b
    b = a
    a = (T1 + T2) | 0
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
  this._f = (f + this._f) | 0
  this._g = (g + this._g) | 0
  this._h = (h + this._h) | 0
}

Sha256.prototype._hash = function () {
  var H = Buffer.allocUnsafe(32)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)
  H.writeInt32BE(this._h, 28)

  return H
}

module.exports = Sha256


/***/ }),

/***/ 120:
/***/ (function(module, exports, __webpack_require__) {

var inherits = __webpack_require__(28)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
]

var W = new Array(160)

function Sha512 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha512, Hash)

Sha512.prototype.init = function () {
  this._ah = 0x6a09e667
  this._bh = 0xbb67ae85
  this._ch = 0x3c6ef372
  this._dh = 0xa54ff53a
  this._eh = 0x510e527f
  this._fh = 0x9b05688c
  this._gh = 0x1f83d9ab
  this._hh = 0x5be0cd19

  this._al = 0xf3bcc908
  this._bl = 0x84caa73b
  this._cl = 0xfe94f82b
  this._dl = 0x5f1d36f1
  this._el = 0xade682d1
  this._fl = 0x2b3e6c1f
  this._gl = 0xfb41bd6b
  this._hl = 0x137e2179

  return this
}

function Ch (x, y, z) {
  return z ^ (x & (y ^ z))
}

function maj (x, y, z) {
  return (x & y) | (z & (x | y))
}

function sigma0 (x, xl) {
  return (x >>> 28 | xl << 4) ^ (xl >>> 2 | x << 30) ^ (xl >>> 7 | x << 25)
}

function sigma1 (x, xl) {
  return (x >>> 14 | xl << 18) ^ (x >>> 18 | xl << 14) ^ (xl >>> 9 | x << 23)
}

function Gamma0 (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7)
}

function Gamma0l (x, xl) {
  return (x >>> 1 | xl << 31) ^ (x >>> 8 | xl << 24) ^ (x >>> 7 | xl << 25)
}

function Gamma1 (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6)
}

function Gamma1l (x, xl) {
  return (x >>> 19 | xl << 13) ^ (xl >>> 29 | x << 3) ^ (x >>> 6 | xl << 26)
}

function getCarry (a, b) {
  return (a >>> 0) < (b >>> 0) ? 1 : 0
}

Sha512.prototype._update = function (M) {
  var W = this._w

  var ah = this._ah | 0
  var bh = this._bh | 0
  var ch = this._ch | 0
  var dh = this._dh | 0
  var eh = this._eh | 0
  var fh = this._fh | 0
  var gh = this._gh | 0
  var hh = this._hh | 0

  var al = this._al | 0
  var bl = this._bl | 0
  var cl = this._cl | 0
  var dl = this._dl | 0
  var el = this._el | 0
  var fl = this._fl | 0
  var gl = this._gl | 0
  var hl = this._hl | 0

  for (var i = 0; i < 32; i += 2) {
    W[i] = M.readInt32BE(i * 4)
    W[i + 1] = M.readInt32BE(i * 4 + 4)
  }
  for (; i < 160; i += 2) {
    var xh = W[i - 15 * 2]
    var xl = W[i - 15 * 2 + 1]
    var gamma0 = Gamma0(xh, xl)
    var gamma0l = Gamma0l(xl, xh)

    xh = W[i - 2 * 2]
    xl = W[i - 2 * 2 + 1]
    var gamma1 = Gamma1(xh, xl)
    var gamma1l = Gamma1l(xl, xh)

    // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
    var Wi7h = W[i - 7 * 2]
    var Wi7l = W[i - 7 * 2 + 1]

    var Wi16h = W[i - 16 * 2]
    var Wi16l = W[i - 16 * 2 + 1]

    var Wil = (gamma0l + Wi7l) | 0
    var Wih = (gamma0 + Wi7h + getCarry(Wil, gamma0l)) | 0
    Wil = (Wil + gamma1l) | 0
    Wih = (Wih + gamma1 + getCarry(Wil, gamma1l)) | 0
    Wil = (Wil + Wi16l) | 0
    Wih = (Wih + Wi16h + getCarry(Wil, Wi16l)) | 0

    W[i] = Wih
    W[i + 1] = Wil
  }

  for (var j = 0; j < 160; j += 2) {
    Wih = W[j]
    Wil = W[j + 1]

    var majh = maj(ah, bh, ch)
    var majl = maj(al, bl, cl)

    var sigma0h = sigma0(ah, al)
    var sigma0l = sigma0(al, ah)
    var sigma1h = sigma1(eh, el)
    var sigma1l = sigma1(el, eh)

    // t1 = h + sigma1 + ch + K[j] + W[j]
    var Kih = K[j]
    var Kil = K[j + 1]

    var chh = Ch(eh, fh, gh)
    var chl = Ch(el, fl, gl)

    var t1l = (hl + sigma1l) | 0
    var t1h = (hh + sigma1h + getCarry(t1l, hl)) | 0
    t1l = (t1l + chl) | 0
    t1h = (t1h + chh + getCarry(t1l, chl)) | 0
    t1l = (t1l + Kil) | 0
    t1h = (t1h + Kih + getCarry(t1l, Kil)) | 0
    t1l = (t1l + Wil) | 0
    t1h = (t1h + Wih + getCarry(t1l, Wil)) | 0

    // t2 = sigma0 + maj
    var t2l = (sigma0l + majl) | 0
    var t2h = (sigma0h + majh + getCarry(t2l, sigma0l)) | 0

    hh = gh
    hl = gl
    gh = fh
    gl = fl
    fh = eh
    fl = el
    el = (dl + t1l) | 0
    eh = (dh + t1h + getCarry(el, dl)) | 0
    dh = ch
    dl = cl
    ch = bh
    cl = bl
    bh = ah
    bl = al
    al = (t1l + t2l) | 0
    ah = (t1h + t2h + getCarry(al, t1l)) | 0
  }

  this._al = (this._al + al) | 0
  this._bl = (this._bl + bl) | 0
  this._cl = (this._cl + cl) | 0
  this._dl = (this._dl + dl) | 0
  this._el = (this._el + el) | 0
  this._fl = (this._fl + fl) | 0
  this._gl = (this._gl + gl) | 0
  this._hl = (this._hl + hl) | 0

  this._ah = (this._ah + ah + getCarry(this._al, al)) | 0
  this._bh = (this._bh + bh + getCarry(this._bl, bl)) | 0
  this._ch = (this._ch + ch + getCarry(this._cl, cl)) | 0
  this._dh = (this._dh + dh + getCarry(this._dl, dl)) | 0
  this._eh = (this._eh + eh + getCarry(this._el, el)) | 0
  this._fh = (this._fh + fh + getCarry(this._fl, fl)) | 0
  this._gh = (this._gh + gh + getCarry(this._gl, gl)) | 0
  this._hh = (this._hh + hh + getCarry(this._hl, hl)) | 0
}

Sha512.prototype._hash = function () {
  var H = Buffer.allocUnsafe(64)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)
  writeInt64BE(this._gh, this._gl, 48)
  writeInt64BE(this._hh, this._hl, 56)

  return H
}

module.exports = Sha512


/***/ }),

/***/ 121:
/***/ (function(module, exports, __webpack_require__) {


var DragDropAction = __webpack_require__(114);

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
    DataTransfer: __webpack_require__(87),
    DragDropAction: __webpack_require__(114),
    eventFactory: __webpack_require__(115)
};

module.exports = dragMock;

/***/ }),

/***/ 122:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony default export */ __webpack_exports__["a"] = (function (element) {
  if (
    element.ownerDocument.designMode &&
    element.ownerDocument.designMode.toLowerCase() === 'on'
  ) {
    return true
  }

  switch (element.tagName.toLowerCase()) {
    case 'input':
      return isEditableInput(element)
    case 'textarea':
      return true
  }

  if (isContentEditable(element)) {
    return true
  }

  return false
});

function isContentEditable (element) {
  if (
    element.contentEditable &&
    element.contentEditable.toLowerCase() === 'true'
  ) {
    return true
  }
  if (
    element.contentEditable &&
    element.contentEditable.toLowerCase() === 'inherit' &&
    element.parentNode
  ) {
    return isContentEditable(element.parentNode)
  }
  return false
}

function isEditableInput (input) {
  switch (input.type) {
    case 'text':
      return true
    case 'email':
      return true
    case 'password':
      return true
    case 'search':
      return true
    case 'tel':
      return true
    case 'url':
      return true
    default:
      return false
  }
}


/***/ }),

/***/ 128:
/***/ (function(module, exports, __webpack_require__) {

var apply = Function.prototype.apply;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) {
  if (timeout) {
    timeout.close();
  }
};

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// setimmediate attaches itself to the global object
__webpack_require__(167);
exports.setImmediate = setImmediate;
exports.clearImmediate = clearImmediate;


/***/ }),

/***/ 16:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var idb_filesystem_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(169);
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
            fileEntry.moveTo(tgtDirEntry, tgtFileName, resolve, reject);
          }, reject);
        });
      });
    });
  };

  var getMetadata = function getMetadata(filePath) {
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
          directoryEntry.getFile(fileName, { create: true }, function (fileEntry) {
            fileEntry.getMetadata(resolve);
          }, reject);
        });
      });
    });
  };

  var exists = function exists(filePath) {
    var _ref5 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
        type = _ref5.type;

    return getFS().then(function (fs) {
      return fileLocator(filePath, fs).then(function (_ref6) {
        var directoryEntry = _ref6.directoryEntry,
            fileName = _ref6.fileName;

        var isSomeEntry = function isSomeEntry(getMethodName) {
          return new Promise(function (resolve) {
            directoryEntry[getMethodName](fileName, { create: false }, function () {
              return resolve(true);
            }, function () {
              return resolve(false);
            });
          });
        };

        var pIsFile = isSomeEntry('getFile');
        var pIsDir = isSomeEntry('getDirectory');

        return Promise.all([pIsFile, pIsDir]).then(function (_ref7) {
          var _ref8 = _slicedToArray(_ref7, 2),
              isFile = _ref8[0],
              isDir = _ref8[1];

          switch (type) {
            case 'file':
              return isFile;
            case 'directory':
              return isDir;
            default:
              return isFile || isDir;
          }
        });
      });
    });
  };

  return {
    list: list,
    readFile: readFile,
    writeFile: writeFile,
    removeFile: removeFile,
    moveFile: moveFile,
    getDirectory: getDirectory,
    getMetadata: getMetadata,
    exists: exists
  };
}();

// For test only
window.fs = fs;

/* harmony default export */ __webpack_exports__["a"] = (fs);

/***/ }),

/***/ 167:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var registerImmediate;

    function setImmediate(callback) {
      // Callback can either be a function or a string
      if (typeof callback !== "function") {
        callback = new Function("" + callback);
      }
      // Copy function arguments
      var args = new Array(arguments.length - 1);
      for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i + 1];
      }
      // Store and register the task
      var task = { callback: callback, args: args };
      tasksByHandle[nextHandle] = task;
      registerImmediate(nextHandle);
      return nextHandle++;
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function run(task) {
        var callback = task.callback;
        var args = task.args;
        switch (args.length) {
        case 0:
            callback();
            break;
        case 1:
            callback(args[0]);
            break;
        case 2:
            callback(args[0], args[1]);
            break;
        case 3:
            callback(args[0], args[1], args[2]);
            break;
        default:
            callback.apply(undefined, args);
            break;
        }
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(runIfPresent, 0, handle);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    run(task);
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function installNextTickImplementation() {
        registerImmediate = function(handle) {
            process.nextTick(function () { runIfPresent(handle); });
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        registerImmediate = function(handle) {
            global.postMessage(messagePrefix + handle, "*");
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        registerImmediate = function(handle) {
            channel.port2.postMessage(handle);
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        registerImmediate = function(handle) {
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
        };
    }

    function installSetTimeoutImplementation() {
        registerImmediate = function(handle) {
            setTimeout(runIfPresent, 0, handle);
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(typeof self === "undefined" ? typeof global === "undefined" ? this : global : self));

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(43), __webpack_require__(46)))

/***/ }),

/***/ 169:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/**
 * Copyright 2013 - Eric Bidelman
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.

 * @fileoverview
 * A polyfill implementation of the HTML5 Filesystem API which sits on top of
 * IndexedDB as storage layer. Files and folders are stored as FileEntry and
 * FolderEntry objects in a single object store. IDBKeyRanges are used to query
 * into a folder. A single object store is sufficient because we can utilize the
 * properties of ASCII. Namely, ASCII / is followed by ASCII 0. Thus,
 * "/one/two/" comes before "/one/two/ANYTHING" comes before "/one/two/0".
 *
 * @author Eric Bidelman (ebidel@gmail.com)
 */



(function(exports) {

// Bomb out if the Filesystem API is available natively.
if (exports.requestFileSystem || exports.webkitRequestFileSystem) {
  return;
}

// Bomb out if no indexedDB available
const indexedDB = exports.indexedDB || exports.mozIndexedDB ||
                  exports.msIndexedDB;
if (!indexedDB) {
  return;
}

let IDB_SUPPORTS_BLOB = true;

// Check to see if IndexedDB support blobs.
const support = new function() {
  var dbName = "blob-support";
  indexedDB.deleteDatabase(dbName).onsuccess = function() {
    var request = indexedDB.open(dbName, 1);
    request.onerror = function() {
      IDB_SUPPORTS_BLOB = false;
    };
    request.onsuccess = function() {
      var db = request.result;
      try {
        var blob = new Blob(["test"], {type: "text/plain"});
        var transaction = db.transaction("store", "readwrite");
        transaction.objectStore("store").put(blob, "key");
        IDB_SUPPORTS_BLOB = true;
      } catch (err) {
        IDB_SUPPORTS_BLOB = false;
      } finally {
        db.close();
        indexedDB.deleteDatabase(dbName);
      }
    };
    request.onupgradeneeded = function() {
      request.result.createObjectStore("store");
    };
  };
};

const Base64ToBlob = function(dataURL) {
  var BASE64_MARKER = ';base64,';
  if (dataURL.indexOf(BASE64_MARKER) == -1) {
    var parts = dataURL.split(',');
    var contentType = parts[0].split(':')[1];
    var raw = decodeURIComponent(parts[1]);

    return new Blob([raw], {type: contentType});
  }

  var parts = dataURL.split(BASE64_MARKER);
  var contentType = parts[0].split(':')[1];
  var raw = window.atob(parts[1]);
  var rawLength = raw.length;

  var uInt8Array = new Uint8Array(rawLength);

  for (var i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], {type: contentType});
};

const BlobToBase64 = function(blob, onload) {
  var reader = new FileReader();
  reader.readAsDataURL(blob);
  reader.onloadend = function() {
    onload(reader.result);
  };
};

if (!exports.PERSISTENT) {
  exports.TEMPORARY = 0;
  exports.PERSISTENT = 1;
}

// Prevent errors in browsers that don't support FileError.
// TODO: FF 13+ supports DOM4 Events (DOMError). Use them instead?
if (exports.FileError === undefined) {
  window.FileError = function() {};
  FileError.prototype.prototype = Error.prototype;
}

if (!FileError.INVALID_MODIFICATION_ERR) {
  FileError.INVALID_MODIFICATION_ERR = 9;
  FileError.NOT_FOUND_ERR  = 1;
}

function MyFileError(obj) {
  var code_ = obj.code;
  var name_ = obj.name;

    // Required for FF 11.
  Object.defineProperty(this, 'code', {
    set: function(code) {
      code_ = code;
    },
    get: function() {
      return code_;
    }
  });

  Object.defineProperty(this, 'name', {
    set: function(name) {
      name_ = name;
    },
    get: function() {
      return name_;
    }
  });
}

MyFileError.prototype = FileError.prototype;
MyFileError.prototype.toString = Error.prototype.toString;

const INVALID_MODIFICATION_ERR = new MyFileError({
      code: FileError.INVALID_MODIFICATION_ERR,
      name: 'INVALID_MODIFICATION_ERR'});
const NOT_IMPLEMENTED_ERR = new MyFileError({code: 1000,
                                             name: 'Not implemented'});
const NOT_FOUND_ERR = new MyFileError({code: FileError.NOT_FOUND_ERR,
                                       name: 'Not found'});

let fs_ = null;

// Browsers other than Chrome don't implement persistent vs. temporary storage.
// but default to temporary anyway.
let storageType_ = 'temporary';
const idb_ = {db: null};
const FILE_STORE_ = 'entries';

const DIR_SEPARATOR = '/';
const DIR_OPEN_BOUND = String.fromCharCode(DIR_SEPARATOR.charCodeAt(0) + 1);

// When saving an entry, the fullPath should always lead with a slash and never
// end with one (e.g. a directory). Also, resolve '.' and '..' to an absolute
// one. This method ensures path is legit!
function resolveToFullPath_(cwdFullPath, path) {
  var fullPath = path;

  var relativePath = path[0] != DIR_SEPARATOR;
  if (relativePath) {
    fullPath = cwdFullPath + DIR_SEPARATOR + path;
  }

  // Normalize '.'s,  '..'s and '//'s.
  var parts = fullPath.split(DIR_SEPARATOR);
  var finalParts = [];
  for (var i = 0; i < parts.length; ++i) {
    var part = parts[i];
    if (part === '..') {
      // Go up one level.
      if (!finalParts.length) {
        throw Error('Invalid path');
      }
      finalParts.pop();
    } else if (part === '.') {
      // Skip over the current directory.
    } else if (part !== '') {
      // Eliminate sequences of '/'s as well as possible leading/trailing '/'s.
      finalParts.push(part);
    }
  }

  fullPath = DIR_SEPARATOR + finalParts.join(DIR_SEPARATOR);

  // fullPath is guaranteed to be normalized by construction at this point:
  // '.'s, '..'s, '//'s will never appear in it.

  return fullPath;
}

// // Path can be relative or absolute. If relative, it's taken from the cwd_.
// // If a filesystem URL is passed it, it is simple returned
// function pathToFsURL_(path) {
//   path = resolveToFullPath_(cwdFullPath, path);
//   path = fs_.root.toURL() + path.substring(1);
//   return path;
// };

/**
 * Interface to wrap the native File interface.
 *
 * This interface is necessary for creating zero-length (empty) files,
 * something the Filesystem API allows you to do. Unfortunately, File's
 * constructor cannot be called directly, making it impossible to instantiate
 * an empty File in JS.
 *
 * @param {Object} opts Initial values.
 * @constructor
 */
function MyFile(opts) {
  var blob_ = null;

  this.size = opts.size || 0;
  this.name = opts.name || '';
  this.type = opts.type || '';
  this.lastModifiedDate = opts.lastModifiedDate || null;
  //this.slice = Blob.prototype.slice; // Doesn't work with structured clones.

  // Need some black magic to correct the object's size/name/type based on the
  // blob that is saved.
  Object.defineProperty(this, 'blob_', {
    enumerable: true,
    get: function() {
      return blob_;
    },
    set: function (val) {
      blob_ = val;
      this.size = blob_.size;
      this.name = blob_.name;
      this.type = blob_.type;
      this.lastModifiedDate = blob_.lastModifiedDate;
    }.bind(this)
  });
}
MyFile.prototype.constructor = MyFile;
//MyFile.prototype.slice = Blob.prototype.slice;

/**
 * Interface to writing a Blob/File.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-writer.html#the-filewriter-interface
 *
 * @param {FileEntry} fileEntry The FileEntry associated with this writer.
 * @constructor
 */
function FileWriter(fileEntry) {
  if (!fileEntry) {
    throw Error('Expected fileEntry argument to write.');
  }

  var position_ = 0;
  var blob_ = fileEntry.file_ ? fileEntry.file_.blob_ : null;

  Object.defineProperty(this, 'position', {
    get: function() {
      return position_;
    }
  });

  Object.defineProperty(this, 'length', {
    get: function() {
      return blob_ ? blob_.size : 0;
    }
  });

  this.seek = function(offset) {
    position_ = offset;

    if (position_ > this.length) {
      position_ = this.length;
    }
    if (position_ < 0) {
      position_ += this.length;
    }
    if (position_ < 0) {
      position_ = 0;
    }
  };

  this.truncate = function(size) {
    if (blob_) {
      if (size < this.length) {
        blob_ = blob_.slice(0, size);
      } else {
        blob_ = new Blob([blob_, new Uint8Array(size - this.length)],
                         {type: blob_.type});
      }
    } else {
      blob_ = new Blob([]);
    }

    position_ = 0; // truncate from beginning of file.

    this.write(blob_); // calls onwritestart and onwriteend.
  };

  this.write = function(data) {
    if (!data) {
      throw Error('Expected blob argument to write.');
    }

    // Call onwritestart if it was defined.
    if (this.onwritestart) {
      this.onwritestart();
    }

    // TODO: not handling onprogress, onwrite, onabort. Throw an error if
    // they're defined.

    if (blob_) {
      // Calc the head and tail fragments
      var head = blob_.slice(0, position_);
      var tail = blob_.slice(position_ + data.size);

      // Calc the padding
      var padding = position_ - head.size;
      if (padding < 0) {
        padding = 0;
      }

      // Do the "write". In fact, a full overwrite of the Blob.
      // TODO: figure out if data.type should overwrite the exist blob's type.
      blob_ = new Blob([head, new Uint8Array(padding), data, tail],
                       {type: blob_.type});
    } else {
      blob_ = new Blob([data], {type: data.type});
    }

    const writeFile = function(blob) {
      // Blob might be a DataURI depending on browser support.
      fileEntry.file_.blob_ = blob;
      fileEntry.file_.lastModifiedDate = data.lastModifiedDate || new Date();
      idb_.put(fileEntry, function(entry) {
        if (!IDB_SUPPORTS_BLOB) {
          // Set the blob we're writing on this file entry so we can recall it later.
          fileEntry.file_.blob_ = blob_;
          fileEntry.file_.lastModifiedDate = data.lastModifiedDate || null;
        }

        // Add size of data written to writer.position.
        position_ += data.size;

        if (this.onwriteend) {
          this.onwriteend();
        }
      }.bind(this), this.onerror);
    }.bind(this);

    if (IDB_SUPPORTS_BLOB) {
      writeFile(blob_);
    } else {
      BlobToBase64(blob_, writeFile);
    }
  };
}


/**
 * Interface for listing a directory's contents (files and folders).
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-DirectoryReader
 *
 * @constructor
 */
function DirectoryReader(dirEntry) {
  var dirEntry_ = dirEntry;
  var used_ = false;

  this.readEntries = function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }

    // This is necessary to mimic the way DirectoryReader.readEntries() should
    // normally behavior.  According to spec, readEntries() needs to be called
    // until the length of result array is 0. To handle someone implementing
    // a recursive call to readEntries(), get everything from indexedDB on the
    // first shot. Then (DirectoryReader has been used), return an empty
    // result array.
    if (!used_) {
      idb_.getAllEntries(dirEntry_.fullPath, function(entries) {
        used_= true;
        successCallback(entries);
      }, opt_errorCallback);
    } else {
      successCallback([]);
    }
  };
};

/**
 * Interface supplies information about the state of a file or directory.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/file-dir-sys.html#idl-def-Metadata
 *
 * @constructor
 */
function Metadata(modificationTime, size) {
  this.modificationTime_ = modificationTime || null;
  this.size_ = size || 0;
}

Metadata.prototype = {
  get modificationTime() {
    return this.modificationTime_;
  },
  get size() {
    return this.size_;
  }
}

/**
 * Interface representing entries in a filesystem, each of which may be a File
 * or DirectoryEntry.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-Entry
 *
 * @constructor
 */
function Entry() {}

Entry.prototype = {
  name: null,
  fullPath: null,
  filesystem: null,
  copyTo: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  getMetadata: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }

    try {
      if (this.isFile) {
        successCallback(
            new Metadata(this.file_.lastModifiedDate, this.file_.size));
      } else {
        opt_errorCallback(new MyFileError({code: 1001,
            name: 'getMetadata() not implemented for DirectoryEntry'}));
      }
    } catch(e) {
      opt_errorCallback && opt_errorCallback(e);
    }
  },
  getParent: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  moveTo: function() {
    throw NOT_IMPLEMENTED_ERR;
  },
  remove: function(successCallback, opt_errorCallback) {
    if (!successCallback) {
      throw Error('Expected successCallback argument.');
    }
    // TODO: This doesn't protect against directories that have content in it.
    // Should throw an error instead if the dirEntry is not empty.
    idb_['delete'](this.fullPath, function() {
      successCallback();
    }, opt_errorCallback);
  },
  toURL: function() {
    var origin = location.protocol + '//' + location.host;
    return 'filesystem:' + origin + DIR_SEPARATOR + storageType_.toLowerCase() +
           this.fullPath;
  },
};

/**
 * Interface representing a file in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-fileentry-interface
 *
 * @param {FileEntry} opt_fileEntry Optional FileEntry to initialize this
 *     object from.
 * @constructor
 * @extends {Entry}
 */
function FileEntry(opt_fileEntry) {
  this.file_ = null;

  Object.defineProperty(this, 'isFile', {
    enumerable: true,
    get: function() {
      return true;
    }
  });
  Object.defineProperty(this, 'isDirectory', {
    enumerable: true,
    get: function() {
      return false;
    }
  });

  // Create this entry from properties from an existing FileEntry.
  if (opt_fileEntry) {
    this.file_ = opt_fileEntry.file_;
    this.name = opt_fileEntry.name;
    this.fullPath = opt_fileEntry.fullPath;
    this.filesystem = opt_fileEntry.filesystem;
    if (typeof(this.file_.blob_) === "string") {
      this.file_.blob_ = Base64ToBlob(this.file_.blob_);
    }
  }
}
FileEntry.prototype = new Entry();
FileEntry.prototype.constructor = FileEntry;
FileEntry.prototype.createWriter = function(callback) {
  // TODO: figure out if there's a way to dispatch onwrite event as we're writing
  // data to IDB. Right now, we're only calling onwritend/onerror
  // FileEntry.write().
  callback(new FileWriter(this));
};
FileEntry.prototype.file = function(successCallback, opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  if (this.file_ == null) {
    if (opt_errorCallback) {
      opt_errorCallback(NOT_FOUND_ERR);
    } else {
      throw NOT_FOUND_ERR;
    }
    return;
  }

  // If we're returning a zero-length (empty) file, return the fake file obj.
  // Otherwise, return the native File object that we've stashed.
  var file = this.file_.blob_ == null ? this.file_ : this.file_.blob_;
  file.lastModifiedDate = this.file_.lastModifiedDate;

  // Add Blob.slice() to this wrapped object. Currently won't work :(
  /*if (!val.slice) {
    val.slice = Blob.prototype.slice; // Hack to add back in .slice().
  }*/
  successCallback(file);
};

/**
 * Interface representing a directory in the filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#the-directoryentry-interface
 *
 * @param {DirectoryEntry} opt_folderEntry Optional DirectoryEntry to
 *     initialize this object from.
 * @constructor
 * @extends {Entry}
 */
function DirectoryEntry(opt_folderEntry) {
  Object.defineProperty(this, 'isFile', {
    enumerable: true,
    get: function() {
      return false;
    }
  });
  Object.defineProperty(this, 'isDirectory', {
    enumerable: true,
    get: function() {
      return true;
    }
  });

  // Create this entry from properties from an existing DirectoryEntry.
  if (opt_folderEntry) {
    this.name = opt_folderEntry.name;
    this.fullPath = opt_folderEntry.fullPath;
    this.filesystem = opt_folderEntry.filesystem;
  }
}
DirectoryEntry.prototype = new Entry();
DirectoryEntry.prototype.constructor = DirectoryEntry;
DirectoryEntry.prototype.createReader = function() {
  return new DirectoryReader(this);
};
DirectoryEntry.prototype.getDirectory = function(path, options, successCallback,
                                                 opt_errorCallback) {

  // Create an absolute path if we were handed a relative one.
  path = resolveToFullPath_(this.fullPath, path);

  idb_.get(path, function(folderEntry) {
    if (!options) {
      options = {};
    }

    if (options.create === true && options.exclusive === true && folderEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getDirectory must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else if (options.create === true && !folderEntry) {
      // If create is true, the path doesn't exist, and no other error occurs,
      // getDirectory must create it as a zero-length file and return a corresponding
      // DirectoryEntry.
      var dirEntry = new DirectoryEntry();
      dirEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
      dirEntry.fullPath = path;
      dirEntry.filesystem = fs_;

      idb_.put(dirEntry, successCallback, opt_errorCallback);
    } else if (options.create === true && folderEntry) {

      if (folderEntry.isDirectory) {
        // IDB won't save methods, so we need re-create the DirectoryEntry.
        successCallback(new DirectoryEntry(folderEntry));
      } else {
        if (opt_errorCallback) {
          opt_errorCallback(INVALID_MODIFICATION_ERR);
          return;
        }
      }
    } else if ((!options.create || options.create === false) && !folderEntry) {
      // Handle root special. It should always exist.
      if (path == DIR_SEPARATOR) {
        folderEntry = new DirectoryEntry();
        folderEntry.name = '';
        folderEntry.fullPath = DIR_SEPARATOR;
        folderEntry.filesystem = fs_;
        successCallback(folderEntry);
        return;
      }

      // If create is not true and the path doesn't exist, getDirectory must fail.
      if (opt_errorCallback) {
        opt_errorCallback(NOT_FOUND_ERR);
        return;
      }
    } else if ((!options.create || options.create === false) && folderEntry &&
               folderEntry.isFile) {
      // If create is not true and the path exists, but is a file, getDirectory
      // must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else {
      // Otherwise, if no other error occurs, getDirectory must return a
      // DirectoryEntry corresponding to path.

      // IDB won't' save methods, so we need re-create DirectoryEntry.
      successCallback(new DirectoryEntry(folderEntry));
    }
  }, opt_errorCallback);
};

DirectoryEntry.prototype.getFile = function(path, options, successCallback,
                                            opt_errorCallback) {

  // Create an absolute path if we were handed a relative one.
  path = resolveToFullPath_(this.fullPath, path);

  idb_.get(path, function(fileEntry) {
    if (!options) {
      options = {};
    }

    if (options.create === true && options.exclusive === true && fileEntry) {
      // If create and exclusive are both true, and the path already exists,
      // getFile must fail.

      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else if (options.create === true && !fileEntry) {
      // If create is true, the path doesn't exist, and no other error occurs,
      // getFile must create it as a zero-length file and return a corresponding
      // FileEntry.
      var fileEntry = new FileEntry();
      fileEntry.name = path.split(DIR_SEPARATOR).pop(); // Just need filename.
      fileEntry.fullPath = path;
      fileEntry.filesystem = fs_;
      fileEntry.file_ = new MyFile({size: 0, name: fileEntry.name,
                                    lastModifiedDate: new Date()});

      idb_.put(fileEntry, successCallback, opt_errorCallback);

    } else if (options.create === true && fileEntry) {
      if (fileEntry.isFile) {
        // IDB won't save methods, so we need re-create the FileEntry.
        successCallback(new FileEntry(fileEntry));
      } else {
        if (opt_errorCallback) {
          opt_errorCallback(INVALID_MODIFICATION_ERR);
          return;
        }
      }
    } else if ((!options.create || options.create === false) && !fileEntry) {
      // If create is not true and the path doesn't exist, getFile must fail.
      if (opt_errorCallback) {
        opt_errorCallback(NOT_FOUND_ERR);
        return;
      }
    } else if ((!options.create || options.create === false) && fileEntry &&
               fileEntry.isDirectory) {
      // If create is not true and the path exists, but is a directory, getFile
      // must fail.
      if (opt_errorCallback) {
        opt_errorCallback(INVALID_MODIFICATION_ERR);
        return;
      }
    } else {
      // Otherwise, if no other error occurs, getFile must return a FileEntry
      // corresponding to path.

      // IDB won't' save methods, so we need re-create the FileEntry.
      successCallback(new FileEntry(fileEntry));
    }
  }, opt_errorCallback);
};

DirectoryEntry.prototype.removeRecursively = function(successCallback,
                                                      opt_errorCallback) {
  if (!successCallback) {
    throw Error('Expected successCallback argument.');
  }

  this.remove(successCallback, opt_errorCallback);
};

/**
 * Interface representing a filesystem.
 *
 * Modeled from:
 * dev.w3.org/2009/dap/file-system/pub/FileSystem/#idl-def-LocalFileSystem
 *
 * @param {number} type Kind of storage to use, either TEMPORARY or PERSISTENT.
 * @param {number} size Storage space (bytes) the application expects to need.
 * @constructor
 */
function DOMFileSystem(type, size) {
  storageType_ = type == exports.TEMPORARY ? 'Temporary' : 'Persistent';
  this.name = (location.protocol + location.host).replace(/:/g, '_') +
              ':' + storageType_;
  this.root = new DirectoryEntry();
  this.root.fullPath = DIR_SEPARATOR;
  this.root.filesystem = this;
  this.root.name = '';
}

function requestFileSystem(type, size, successCallback, opt_errorCallback) {
  if (type != exports.TEMPORARY && type != exports.PERSISTENT) {
    if (opt_errorCallback) {
      opt_errorCallback(INVALID_MODIFICATION_ERR);
      return;
    }
  }

  fs_ = new DOMFileSystem(type, size);
  idb_.open(fs_.name, function(e) {
    successCallback(fs_);
  }, opt_errorCallback);
}

function resolveLocalFileSystemURL(url, successCallback, opt_errorCallback) {
  var origin = location.protocol + '//' + location.host;
  var base = 'filesystem:' + origin + DIR_SEPARATOR + storageType_.toLowerCase();
  url = url.replace(base, '');
  if (url.substr(-1) === '/') {
    url = url.slice(0, -1);
  }
  if (url) {
    idb_.get(url, function(entry) {
      if (entry) {
        if (entry.isFile) {
          return successCallback(new FileEntry(entry));
        } else if (entry.isDirectory) {
          return successCallback(new DirectoryEntry(entry));
        }
      } else {
        opt_errorCallback && opt_errorCallback(NOT_FOUND_ERR);
      }
    }, opt_errorCallback);
  } else {
    successCallback(fs_.root);
  }
}

// Core logic to handle IDB operations =========================================

idb_.open = function(dbName, successCallback, opt_errorCallback) {
  var self = this;

  // TODO: FF 12.0a1 isn't liking a db name with : in it.
  var request = indexedDB.open(dbName.replace(':', '_')/*, 1 /*version*/);

  request.onerror = opt_errorCallback || onError;

  request.onupgradeneeded = function(e) {
    // First open was called or higher db version was used.

   // console.log('onupgradeneeded: oldVersion:' + e.oldVersion,
   //           'newVersion:' + e.newVersion);

    self.db = e.target.result;
    self.db.onerror = onError;

    if (!self.db.objectStoreNames.contains(FILE_STORE_)) {
      var store = self.db.createObjectStore(FILE_STORE_/*,{keyPath: 'id', autoIncrement: true}*/);
    }
  };

  request.onsuccess = function(e) {
    self.db = e.target.result;
    self.db.onerror = onError;
    successCallback(e);
  };

  request.onblocked = opt_errorCallback || onError;
};

idb_.close = function() {
  this.db.close();
  this.db = null;
};

// TODO: figure out if we should ever call this method. The filesystem API
// doesn't allow you to delete a filesystem once it is 'created'. Users should
// use the public remove/removeRecursively API instead.
idb_.drop = function(successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var dbName = this.db.name;

  var request = indexedDB.deleteDatabase(dbName);
  request.onsuccess = function(e) {
    successCallback(e);
  };
  request.onerror = opt_errorCallback || onError;

  idb_.close();
};

idb_.get = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readonly');

  //var request = tx.objectStore(FILE_STORE_).get(fullPath);
  var range = IDBKeyRange.bound(fullPath, fullPath + DIR_OPEN_BOUND,
                                false, true);
  var request = tx.objectStore(FILE_STORE_).get(range);

  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    successCallback(request.result);
  };
};

idb_.getAllEntries = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var results = [];

  //var range = IDBKeyRange.lowerBound(fullPath, true);
  //var range = IDBKeyRange.upperBound(fullPath, true);

  // Treat the root entry special. Querying it returns all entries because
  // they match '/'.
  var range = null;
  if (fullPath != DIR_SEPARATOR) {
    //console.log(fullPath + '/', fullPath + DIR_OPEN_BOUND)
    range = IDBKeyRange.bound(
        fullPath + DIR_SEPARATOR, fullPath + DIR_OPEN_BOUND, false, true);
  }

  var tx = this.db.transaction([FILE_STORE_], 'readonly');
  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    // TODO: figure out how to do be range queries instead of filtering result
    // in memory :(
    results = results.filter(function(val) {
      var valPartsLen = val.fullPath.split(DIR_SEPARATOR).length;
      var fullPathPartsLen = fullPath.split(DIR_SEPARATOR).length;

      if (fullPath == DIR_SEPARATOR && valPartsLen < fullPathPartsLen + 1) {
        // Hack to filter out entries in the root folder. This is inefficient
        // because reading the entires of fs.root (e.g. '/') returns ALL
        // results in the database, then filters out the entries not in '/'.
        return val;
      } else if (fullPath != DIR_SEPARATOR &&
                 valPartsLen == fullPathPartsLen + 1) {
        // If this a subfolder and entry is a direct child, include it in
        // the results. Otherwise, it's not an entry of this folder.
        return val;
      }
    });

    successCallback(results);
  };

  var request = tx.objectStore(FILE_STORE_).openCursor(range);

  request.onsuccess = function(e) {
    var cursor = e.target.result;
    if (cursor) {
      var val = cursor.value;

      results.push(val.isFile ? new FileEntry(val) : new DirectoryEntry(val));
      cursor['continue']();
    }
  };
};

idb_['delete'] = function(fullPath, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readwrite');
  tx.oncomplete = successCallback;
  tx.onabort = opt_errorCallback || onError;

  //var request = tx.objectStore(FILE_STORE_).delete(fullPath);
  var range = IDBKeyRange.bound(
      fullPath, fullPath + DIR_OPEN_BOUND, false, true);
  var request = tx.objectStore(FILE_STORE_)['delete'](range);
};

idb_.put = function(entry, successCallback, opt_errorCallback) {
  if (!this.db) {
    return;
  }

  var tx = this.db.transaction([FILE_STORE_], 'readwrite');
  tx.onabort = opt_errorCallback || onError;
  tx.oncomplete = function(e) {
    // TODO: Error is thrown if we pass the request event back instead.
    successCallback(entry);
  };

  var request = tx.objectStore(FILE_STORE_).put(entry, entry.fullPath);
};

// Global error handler. Errors bubble from request, to transaction, to db.
function onError(e) {
  switch (e.target.errorCode) {
    case 12:
      console.log('Error - Attempt to open db with a lower version than the ' +
                  'current one.');
      break;
    default:
      console.log('errorCode: ' + e.target.errorCode);
  }

  console.log(e, e.code, e.message);
}

// Clean up.
// TODO: decide if this is the best place for this.
exports.addEventListener('beforeunload', function(e) {
  idb_.db && idb_.db.close();
}, false);

//exports.idb = idb_;
exports.requestFileSystem = requestFileSystem;
exports.resolveLocalFileSystemURL = resolveLocalFileSystemURL;

// Export more stuff (to window) for unit tests to do their thing.
if (exports === window && exports.RUNNING_TESTS) {
  exports['Entry'] = Entry;
  exports['FileEntry'] = FileEntry;
  exports['DirectoryEntry'] = DirectoryEntry;
  exports['resolveToFullPath_'] = resolveToFullPath_;
  exports['Metadata'] = Metadata;
  exports['Base64ToBlob'] = Base64ToBlob;
}

})(self); // Don't use window because we want to run in workers.


/***/ }),

/***/ 170:
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}


/***/ }),

/***/ 171:
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),

/***/ 172:
/***/ (function(module, exports, __webpack_require__) {

var Stream = (function (){
  try {
    return __webpack_require__(53); // hack to fix a circular dependency issue when used with browserify
  } catch(_){}
}());
exports = module.exports = __webpack_require__(110);
exports.Stream = Stream || exports;
exports.Readable = exports;
exports.Writable = __webpack_require__(81);
exports.Duplex = __webpack_require__(51);
exports.Transform = __webpack_require__(82);
exports.PassThrough = __webpack_require__(111);


/***/ }),

/***/ 173:
/***/ (function(module, exports) {

/* (ignored) */

/***/ }),

/***/ 174:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {
/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(43)))

/***/ }),

/***/ 175:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(81)


/***/ }),

/***/ 176:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(51)


/***/ }),

/***/ 177:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(82)


/***/ }),

/***/ 178:
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(111)


/***/ }),

/***/ 18:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _ipc_bg_cs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(72);


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

/***/ 2:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "delay", function() { return delay; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "until", function() { return until; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "range", function() { return range; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "partial", function() { return partial; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "reduceRight", function() { return reduceRight; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "compose", function() { return compose; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "map", function() { return map; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "on", function() { return on; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "updateIn", function() { return updateIn; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "setIn", function() { return setIn; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getIn", function() { return getIn; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "pick", function() { return pick; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "uid", function() { return uid; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "flatten", function() { return flatten; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "splitIntoTwo", function() { return splitIntoTwo; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "cn", function() { return cn; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "objMap", function() { return objMap; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "formatDate", function() { return formatDate; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "splitKeep", function() { return splitKeep; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "nameFactory", function() { return nameFactory; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "composePromiseFn", function() { return composePromiseFn; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parseQuery", function() { return parseQuery; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "toRegExp", function() { return toRegExp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "insertScript", function() { return insertScript; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "withTimeout", function() { return withTimeout; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "retry", function() { return retry; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dataURItoBlob", function() { return dataURItoBlob; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "randomName", function() { return randomName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "withFileExtension", function() { return withFileExtension; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "uniqueName", function() { return uniqueName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "and", function() { return and; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "loadCsv", function() { return loadCsv; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "loadImage", function() { return loadImage; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ensureExtName", function() { return ensureExtName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "validateStandardName", function() { return validateStandardName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "sanitizeFileName", function() { return sanitizeFileName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getScreenDpi", function() { return getScreenDpi; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "dpiFromFileName", function() { return dpiFromFileName; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "mockAPIWith", function() { return mockAPIWith; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "withCountDown", function() { return withCountDown; });
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

// delay the call of a function and return a promise
var delay = function delay(fn, timeout) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, timeout);
  });
};

// Poll on whatever you want to check, and will time out after a specific duration
// `check` should return `{ pass: Boolean, result: Any }`
// `name` is for a meaningful error message
var until = function until(name, check) {
  var interval = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1000;
  var expire = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10000;
  var errorMsg = arguments[4];

  var start = new Date();
  var go = function go() {
    if (expire && new Date() - start >= expire) {
      var msg = errorMsg || 'until: ' + name + ' expired!';
      throw new Error(msg);
    }

    var _check = check(),
        pass = _check.pass,
        result = _check.result;

    if (pass) return Promise.resolve(result);
    return delay(go, interval);
  };

  return new Promise(function (resolve, reject) {
    try {
      resolve(go());
    } catch (e) {
      reject(e);
    }
  });
};

var range = function range(start, end) {
  var step = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

  var ret = [];

  for (var i = start; i < end; i += step) {
    ret.push(i);
  }

  return ret;
};

// create a curry version of the passed in function
var partial = function partial(fn) {
  var len = fn.length;
  var _arbitary = void 0;

  _arbitary = function arbitary(curArgs, leftArgCnt) {
    return function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      if (args.length >= leftArgCnt) {
        return fn.apply(null, curArgs.concat(args));
      }

      return _arbitary(curArgs.concat(args), leftArgCnt - args.length);
    };
  };

  return _arbitary([], len);
};

var reduceRight = function reduceRight(fn, initial, list) {
  var ret = initial;

  for (var i = list.length - 1; i >= 0; i--) {
    ret = fn(list[i], ret);
  }

  return ret;
};

// compose functions into one
var compose = function compose() {
  for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  return reduceRight(function (cur, prev) {
    return function (x) {
      return cur(prev(x));
    };
  }, function (x) {
    return x;
  }, args);
};

var map = partial(function (fn, list) {
  var result = [];

  for (var i = 0, len = list.length; i < len; i++) {
    result.push(fn(list[i]));
  }

  return result;
});

var on = partial(function (key, fn, dict) {
  if (Array.isArray(dict)) {
    return [].concat(_toConsumableArray(dict.slice(0, key)), [fn(dict[key])], _toConsumableArray(dict.slice(key + 1)));
  }

  return _extends({}, dict, _defineProperty({}, key, fn(dict[key])));
});

// immutably update any part in an object
var updateIn = partial(function (keys, fn, obj) {
  var updater = compose.apply(null, keys.map(function (key) {
    return on(key);
  }));
  return updater(fn)(obj);
});

// immutably set any part in an object
// a restricted version of updateIn
var setIn = partial(function (keys, value, obj) {
  var updater = compose.apply(null, keys.map(function (key) {
    return on(key);
  }));
  return updater(function () {
    return value;
  })(obj);
});

// return part of the object with a few keys deep inside
var getIn = partial(function (keys, obj) {
  return keys.reduce(function (prev, key) {
    if (!prev) return prev;
    return prev[key];
  }, obj);
});

// return the passed in object with only certains keys
var pick = function pick(keys, obj) {
  return keys.reduce(function (prev, key) {
    if (obj[key] !== undefined) {
      prev[key] = obj[key];
    }
    return prev;
  }, {});
};

var uid = function uid() {
  return '' + new Date() * 1 + '.' + Math.floor(Math.random() * 10000000).toString(16);
};

var flatten = function flatten(list) {
  return [].concat.apply([], list);
};

var splitIntoTwo = function splitIntoTwo(pattern, str) {
  var index = str.indexOf(pattern);
  if (index === -1) return [str];

  return [str.substr(0, index), str.substr(index + 1)];
};

var cn = function cn() {
  for (var _len3 = arguments.length, args = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  return args.reduce(function (prev, cur) {
    if (typeof cur === 'string') {
      prev.push(cur);
    } else {
      Object.keys(cur).forEach(function (key) {
        if (cur[key]) {
          prev.push(key);
        }
      });
    }

    return prev;
  }, []).join(' ');
};

var objMap = function objMap(fn, obj) {
  return Object.keys(obj).reduce(function (prev, key, i) {
    prev[key] = fn(obj[key], key, i);
    return prev;
  }, {});
};

var formatDate = function formatDate(d) {
  var pad = function pad(n) {
    return n >= 10 ? '' + n : '0' + n;
  };
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()].map(pad).join('-');
};

var splitKeep = function splitKeep(pattern, str) {
  var result = [];
  var startIndex = 0;
  var reg = void 0,
      match = void 0,
      lastMatchIndex = void 0;

  if (pattern instanceof RegExp) {
    reg = new RegExp(pattern, pattern.flags.indexOf('g') !== -1 ? pattern.flags : pattern.flags + 'g');
  } else if (typeof pattern === 'string') {
    reg = new RegExp(pattern, 'g');
  }

  // eslint-disable-next-line no-cond-assign
  while (match = reg.exec(str)) {
    if (lastMatchIndex === match.index) {
      break;
    }

    if (match.index > startIndex) {
      result.push(str.substring(startIndex, match.index));
    }

    result.push(match[0]);
    startIndex = match.index + match[0].length;
    lastMatchIndex = match.index;
  }

  if (startIndex < str.length) {
    result.push(str.substr(startIndex));
  }

  return result;
};

var nameFactory = function nameFactory() {
  var all = {};

  return function (str) {
    if (!all[str]) {
      all[str] = true;
      return str;
    }

    var n = 2;
    while (all[str + '-' + n]) {
      n++;
    }

    all[str + '-' + n] = true;
    return str + '-' + n;
  };
};

var composePromiseFn = function composePromiseFn() {
  for (var _len4 = arguments.length, list = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    list[_key4] = arguments[_key4];
  }

  return reduceRight(function (cur, prev) {
    return function (x) {
      return prev(x).then(cur);
    };
  }, function (x) {
    return Promise.resolve(x);
  }, list);
};

var parseQuery = function parseQuery(query) {
  return query.slice(1).split('&').reduce(function (prev, cur) {
    var index = cur.indexOf('=');
    var key = cur.substring(0, index);
    var val = cur.substring(index + 1);

    prev[key] = decodeURIComponent(val);
    return prev;
  }, {});
};

var toRegExp = function toRegExp(str) {
  var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
      _ref$needEncode = _ref.needEncode,
      needEncode = _ref$needEncode === undefined ? false : _ref$needEncode,
      _ref$flag = _ref.flag,
      flag = _ref$flag === undefined ? '' : _ref$flag;

  return new RegExp(needEncode ? str.replace(/[[\](){}^$.*+?|]/g, '\\$&') : str, flag);
};

var insertScript = function insertScript(file) {
  var s = document.constructor.prototype.createElement.call(document, 'script');

  s.setAttribute('type', 'text/javascript');
  s.setAttribute('src', file);

  document.documentElement.appendChild(s);
  s.parentNode.removeChild(s);
};

var withTimeout = function withTimeout(timeout, fn) {
  return new Promise(function (resolve, reject) {
    var cancel = function cancel() {
      return clearTimeout(timer);
    };
    var timer = setTimeout(function () {
      reject(new Error('withTimeout: timeout'));
    }, timeout);

    fn(cancel).then(function (data) {
      cancel();
      resolve(data);
    }, function (e) {
      cancel();
      reject(e);
    });
  });
};

var retry = function retry(fn, options) {
  return function () {
    for (var _len5 = arguments.length, args = Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
      args[_key5] = arguments[_key5];
    }

    var _timeout$retryInterva = _extends({
      timeout: 5000,
      retryInterval: 1000,
      onFirstFail: function onFirstFail() {},
      onFinal: function onFinal() {},
      shouldRetry: function shouldRetry() {
        return false;
      }
    }, options),
        timeout = _timeout$retryInterva.timeout,
        onFirstFail = _timeout$retryInterva.onFirstFail,
        onFinal = _timeout$retryInterva.onFinal,
        shouldRetry = _timeout$retryInterva.shouldRetry,
        retryInterval = _timeout$retryInterva.retryInterval;

    var retryCount = 0;
    var lastError = null;
    var timerToClear = null;
    var done = false;

    var wrappedOnFinal = function wrappedOnFinal() {
      done = true;

      if (timerToClear) {
        clearTimeout(timerToClear);
      }

      return onFinal.apply(undefined, arguments);
    };

    var intervalMan = function () {
      var lastInterval = null;
      var intervalFactory = function () {
        switch (typeof retryInterval === 'undefined' ? 'undefined' : _typeof(retryInterval)) {
          case 'function':
            return retryInterval;

          case 'number':
            return function () {
              return retryInterval;
            };

          default:
            throw new Error('retryInterval must be either a number or a function');
        }
      }();

      return {
        getLastInterval: function getLastInterval() {
          return lastInterval;
        },
        getInterval: function getInterval() {
          var interval = intervalFactory(retryCount, lastInterval);
          lastInterval = interval;
          return interval;
        }
      };
    }();

    var onError = function onError(e, reject) {
      if (!shouldRetry(e, retryCount)) {
        wrappedOnFinal(e);

        if (reject) return reject(e);else throw e;
      }
      lastError = e;

      return new Promise(function (resolve, reject) {
        if (retryCount++ === 0) {
          onFirstFail(e);
          timerToClear = setTimeout(function () {
            wrappedOnFinal(lastError);
            reject(lastError);
          }, timeout);
        }

        if (done) return;

        delay(run, intervalMan.getInterval()).then(resolve, function (e) {
          return onError(e, reject);
        });
      });
    };

    var run = function run() {
      return fn.apply(undefined, args.concat([{
        retryCount: retryCount,
        retryInterval: intervalMan.getLastInterval()
      }])).catch(onError);
    };

    return run().then(function (result) {
      wrappedOnFinal(null, result);
      return result;
    });
  };
};

// refer to https://stackoverflow.com/questions/12168909/blob-from-dataurl
function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], { type: mimeString });
  return blob;
}

var randomName = function randomName() {
  var length = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 6;

  if (length <= 0 || length > 100) throw new Error('randomName, length must be between 1 and 100');

  var randomChar = function randomChar() {
    var n = Math.floor(62 * Math.random());
    var code = void 0;

    if (n <= 9) {
      code = 48 + n;
    } else if (n <= 35) {
      code = 65 + n - 10;
    } else {
      code = 97 + n - 36;
    }

    return String.fromCharCode(code);
  };

  return range(0, length).map(randomChar).join('');
};

var withFileExtension = function withFileExtension(origName, fn) {
  var reg = /\.\w+$/;
  var m = origName.match(reg);

  var extName = m ? m[0] : '';
  var baseName = m ? origName.replace(reg, '') : origName;
  var result = fn(baseName, function (name) {
    return name + extName;
  });

  if (!result) {
    throw new Error('withFileExtension: should not return null/undefined');
  }

  if (typeof result.then === 'function') {
    return result.then(function (name) {
      return name + extName;
    });
  }

  return result + extName;
};

var uniqueName = function uniqueName(name, options) {
  var opts = _extends({
    generate: function generate(old) {
      var step = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

      var reg = /_\((\d+)\)$/;
      var m = old.match(reg);

      if (!m) return old + '_(' + step + ')';
      return old.replace(reg, function (_, n) {
        return '_(' + (parseInt(n, 10) + step) + ')';
      });
    },
    check: function check() {
      return Promise.resolve(true);
    }
  }, options);
  var generate = opts.generate,
      check = opts.check;


  return withFileExtension(name, function (baseName, getFullName) {
    var go = function go(fileName, step) {
      return check(getFullName(fileName)).then(function (pass) {
        if (pass) return fileName;
        return go(generate(fileName, step), step);
      });
    };

    return go(baseName, 1);
  });
};

var and = function and() {
  for (var _len6 = arguments.length, list = Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    list[_key6] = arguments[_key6];
  }

  return list.reduce(function (prev, cur) {
    return prev && cur;
  }, true);
};

var loadCsv = function loadCsv(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('failed to load csv - ' + url);
    return res.text();
  });
};

var loadImage = function loadImage(url) {
  return fetch(url).then(function (res) {
    if (!res.ok) throw new Error('failed to load image - ' + url);
    return res.blob();
  });
};

var ensureExtName = function ensureExtName(ext, name) {
  var extName = ext.indexOf('.') === 0 ? ext : '.' + ext;
  if (name.lastIndexOf(extName) + extName.length === name.length) return name;
  return name + extName;
};

var validateStandardName = function validateStandardName(name, isFileName) {
  if (!isFileName && !/^_|[a-zA-Z]/.test(name)) {
    throw new Error('must start with a letter or the underscore character.');
  }

  if (isFileName && !/^_|[a-zA-Z0-9]/.test(name)) {
    throw new Error('must start with alpha-numeric or the underscore character.');
  }

  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error('can only contain alpha-numeric characters and underscores (A-z, 0-9, and _ )');
  }
};

var sanitizeFileName = function sanitizeFileName(fileName) {
  return withFileExtension(fileName, function (baseName) {
    return baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  });
};

var getScreenDpi = function getScreenDpi() {
  var DEFAULT_DPI = 96;
  var matchDpi = function matchDpi(dpi) {
    return window.matchMedia('(max-resolution: ' + dpi + 'dpi)').matches === true;
  };

  // We iteratively scan all possible media query matches.
  // We can't use binary search, because there are "many" correct answer in
  // problem space and we need the very first match.
  // To speed up computation we divide problem space into buckets.
  // We test each bucket's first element and if we found a match,
  // we make a full scan for previous bucket with including first match.
  // Still, we could use "divide-and-conquer" for such problems.
  // Due to common DPI values, it's not worth to implement such algorithm.

  var bucketSize = 24; // common divisor for 72, 96, 120, 144 etc.

  for (var i = bucketSize; i < 3000; i += bucketSize) {
    if (matchDpi(i)) {
      var start = i - bucketSize;
      var end = i;

      for (var k = start; k <= end; ++k) {
        if (matchDpi(k)) {
          return k;
        }
      }
    }
  }

  return DEFAULT_DPI; // default fallback
};

var dpiFromFileName = function dpiFromFileName(fileName) {
  var reg = /_dpi_(\d+)/i;
  var m = fileName.match(reg);
  return m ? parseInt(m[1], 10) : 0;
};

var mockAPIWith = function mockAPIWith(factory, mock) {
  var promiseFunctionKeys = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

  var real = mock;
  var exported = objMap(function (val, key) {
    if (typeof val === 'function') {
      if (promiseFunctionKeys.indexOf(key) !== -1) {
        return function () {
          for (var _len7 = arguments.length, args = Array(_len7), _key7 = 0; _key7 < _len7; _key7++) {
            args[_key7] = arguments[_key7];
          }

          return p.then(function () {
            var _real;

            return (_real = real)[key].apply(_real, args);
          });
        };
      } else {
        return function () {
          var _real3;

          for (var _len8 = arguments.length, args = Array(_len8), _key8 = 0; _key8 < _len8; _key8++) {
            args[_key8] = arguments[_key8];
          }

          p.then(function () {
            var _real2;

            return (_real2 = real)[key].apply(_real2, args);
          });
          return (_real3 = real)[key].apply(_real3, args);
        };
      }
    } else {
      return val;
    }
  }, mock);

  var p = Promise.resolve(factory()).then(function (api) {
    real = api;
  });

  return exported;
};

var withCountDown = function withCountDown(options) {
  var interval = options.interval,
      timeout = options.timeout,
      onTick = options.onTick;

  var past = 0;

  return new Promise(function (resolve, reject) {
    var timer = setInterval(function () {
      past += interval;

      try {
        onTick({ past: past, total: timeout });
      } catch (e) {
        console.error(e);
      }

      if (past >= timeout) clearInterval(timer);
    }, interval);

    var p = delay(function () {}, timeout).then(function () {
      return clearInterval(timer);
    });

    resolve(p);
  });
};

/***/ }),

/***/ 200:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global, process) {var checkParameters = __webpack_require__(116)
var defaultEncoding = __webpack_require__(117)
var sync = __webpack_require__(118)
var Buffer = __webpack_require__(40).Buffer

var ZERO_BUF
var subtle = global.crypto && global.crypto.subtle
var toBrowser = {
  'sha': 'SHA-1',
  'sha-1': 'SHA-1',
  'sha1': 'SHA-1',
  'sha256': 'SHA-256',
  'sha-256': 'SHA-256',
  'sha384': 'SHA-384',
  'sha-384': 'SHA-384',
  'sha-512': 'SHA-512',
  'sha512': 'SHA-512'
}
var checks = []
function checkNative (algo) {
  if (global.process && !global.process.browser) {
    return Promise.resolve(false)
  }
  if (!subtle || !subtle.importKey || !subtle.deriveBits) {
    return Promise.resolve(false)
  }
  if (checks[algo] !== undefined) {
    return checks[algo]
  }
  ZERO_BUF = ZERO_BUF || Buffer.alloc(8)
  var prom = browserPbkdf2(ZERO_BUF, ZERO_BUF, 10, 128, algo)
    .then(function () {
      return true
    }).catch(function () {
      return false
    })
  checks[algo] = prom
  return prom
}
function browserPbkdf2 (password, salt, iterations, length, algo) {
  return subtle.importKey(
    'raw', password, {name: 'PBKDF2'}, false, ['deriveBits']
  ).then(function (key) {
    return subtle.deriveBits({
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: {
        name: algo
      }
    }, key, length << 3)
  }).then(function (res) {
    return Buffer.from(res)
  })
}
function resolvePromise (promise, callback) {
  promise.then(function (out) {
    process.nextTick(function () {
      callback(null, out)
    })
  }, function (e) {
    process.nextTick(function () {
      callback(e)
    })
  })
}
module.exports = function (password, salt, iterations, keylen, digest, callback) {
  if (!Buffer.isBuffer(password)) password = Buffer.from(password, defaultEncoding)
  if (!Buffer.isBuffer(salt)) salt = Buffer.from(salt, defaultEncoding)

  checkParameters(iterations, keylen)
  if (typeof digest === 'function') {
    callback = digest
    digest = undefined
  }
  if (typeof callback !== 'function') throw new Error('No callback provided to pbkdf2')

  digest = digest || 'sha1'
  var algo = toBrowser[digest.toLowerCase()]
  if (!algo || typeof global.Promise !== 'function') {
    return process.nextTick(function () {
      var out
      try {
        out = sync(password, salt, iterations, keylen, digest)
      } catch (e) {
        return callback(e)
      }
      callback(null, out)
    })
  }
  resolvePromise(checkNative(algo).then(function (resp) {
    if (resp) {
      return browserPbkdf2(password, salt, iterations, keylen, algo)
    } else {
      return sync(password, salt, iterations, keylen, digest)
    }
  }), callback)
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(43), __webpack_require__(46)))

/***/ }),

/***/ 201:
/***/ (function(module, exports, __webpack_require__) {

"use strict";

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

var makeHash = __webpack_require__(202)

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length
 */
function core_md5 (x, len) {
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32)
  x[(((len + 64) >>> 9) << 4) + 14] = len

  var a = 1732584193
  var b = -271733879
  var c = -1732584194
  var d = 271733878

  for (var i = 0; i < x.length; i += 16) {
    var olda = a
    var oldb = b
    var oldc = c
    var oldd = d

    a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936)
    d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586)
    c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819)
    b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330)
    a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897)
    d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426)
    c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341)
    b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983)
    a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416)
    d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417)
    c = md5_ff(c, d, a, b, x[i + 10], 17, -42063)
    b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162)
    a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682)
    d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101)
    c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290)
    b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329)

    a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510)
    d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632)
    c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713)
    b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302)
    a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691)
    d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083)
    c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335)
    b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848)
    a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438)
    d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690)
    c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961)
    b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501)
    a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467)
    d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784)
    c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473)
    b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734)

    a = md5_hh(a, b, c, d, x[i + 5], 4, -378558)
    d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463)
    c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562)
    b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556)
    a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060)
    d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353)
    c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632)
    b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640)
    a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174)
    d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222)
    c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979)
    b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189)
    a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487)
    d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835)
    c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520)
    b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651)

    a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844)
    d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415)
    c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905)
    b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055)
    a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571)
    d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606)
    c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523)
    b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799)
    a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359)
    d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744)
    c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380)
    b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649)
    a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070)
    d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379)
    c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259)
    b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551)

    a = safe_add(a, olda)
    b = safe_add(b, oldb)
    c = safe_add(c, oldc)
    d = safe_add(d, oldd)
  }

  return [a, b, c, d]
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn (q, a, b, x, s, t) {
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b)
}

function md5_ff (a, b, c, d, x, s, t) {
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t)
}

function md5_gg (a, b, c, d, x, s, t) {
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t)
}

function md5_hh (a, b, c, d, x, s, t) {
  return md5_cmn(b ^ c ^ d, a, b, x, s, t)
}

function md5_ii (a, b, c, d, x, s, t) {
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t)
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add (x, y) {
  var lsw = (x & 0xFFFF) + (y & 0xFFFF)
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
  return (msw << 16) | (lsw & 0xFFFF)
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol (num, cnt) {
  return (num << cnt) | (num >>> (32 - cnt))
}

module.exports = function md5 (buf) {
  return makeHash(buf, core_md5)
}


/***/ }),

/***/ 202:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
var intSize = 4
var zeroBuffer = new Buffer(intSize)
zeroBuffer.fill(0)

var charSize = 8
var hashSize = 16

function toArray (buf) {
  if ((buf.length % intSize) !== 0) {
    var len = buf.length + (intSize - (buf.length % intSize))
    buf = Buffer.concat([buf, zeroBuffer], len)
  }

  var arr = new Array(buf.length >>> 2)
  for (var i = 0, j = 0; i < buf.length; i += intSize, j++) {
    arr[j] = buf.readInt32LE(i)
  }

  return arr
}

module.exports = function hash (buf, fn) {
  var arr = fn(toArray(buf), buf.length * charSize)
  buf = new Buffer(hashSize)
  for (var i = 0; i < arr.length; i++) {
    buf.writeInt32LE(arr[i], i << 2, true)
  }
  return buf
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(36).Buffer))

/***/ }),

/***/ 203:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
var inherits = __webpack_require__(28)
var HashBase = __webpack_require__(204)

function RIPEMD160 () {
  HashBase.call(this, 64)

  // state
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0
}

inherits(RIPEMD160, HashBase)

RIPEMD160.prototype._update = function () {
  var m = new Array(16)
  for (var i = 0; i < 16; ++i) m[i] = this._block.readInt32LE(i * 4)

  var al = this._a
  var bl = this._b
  var cl = this._c
  var dl = this._d
  var el = this._e

  // Mj = 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
  // K = 0x00000000
  // Sj = 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8
  al = fn1(al, bl, cl, dl, el, m[0], 0x00000000, 11); cl = rotl(cl, 10)
  el = fn1(el, al, bl, cl, dl, m[1], 0x00000000, 14); bl = rotl(bl, 10)
  dl = fn1(dl, el, al, bl, cl, m[2], 0x00000000, 15); al = rotl(al, 10)
  cl = fn1(cl, dl, el, al, bl, m[3], 0x00000000, 12); el = rotl(el, 10)
  bl = fn1(bl, cl, dl, el, al, m[4], 0x00000000, 5); dl = rotl(dl, 10)
  al = fn1(al, bl, cl, dl, el, m[5], 0x00000000, 8); cl = rotl(cl, 10)
  el = fn1(el, al, bl, cl, dl, m[6], 0x00000000, 7); bl = rotl(bl, 10)
  dl = fn1(dl, el, al, bl, cl, m[7], 0x00000000, 9); al = rotl(al, 10)
  cl = fn1(cl, dl, el, al, bl, m[8], 0x00000000, 11); el = rotl(el, 10)
  bl = fn1(bl, cl, dl, el, al, m[9], 0x00000000, 13); dl = rotl(dl, 10)
  al = fn1(al, bl, cl, dl, el, m[10], 0x00000000, 14); cl = rotl(cl, 10)
  el = fn1(el, al, bl, cl, dl, m[11], 0x00000000, 15); bl = rotl(bl, 10)
  dl = fn1(dl, el, al, bl, cl, m[12], 0x00000000, 6); al = rotl(al, 10)
  cl = fn1(cl, dl, el, al, bl, m[13], 0x00000000, 7); el = rotl(el, 10)
  bl = fn1(bl, cl, dl, el, al, m[14], 0x00000000, 9); dl = rotl(dl, 10)
  al = fn1(al, bl, cl, dl, el, m[15], 0x00000000, 8); cl = rotl(cl, 10)

  // Mj = 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8
  // K = 0x5a827999
  // Sj = 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12
  el = fn2(el, al, bl, cl, dl, m[7], 0x5a827999, 7); bl = rotl(bl, 10)
  dl = fn2(dl, el, al, bl, cl, m[4], 0x5a827999, 6); al = rotl(al, 10)
  cl = fn2(cl, dl, el, al, bl, m[13], 0x5a827999, 8); el = rotl(el, 10)
  bl = fn2(bl, cl, dl, el, al, m[1], 0x5a827999, 13); dl = rotl(dl, 10)
  al = fn2(al, bl, cl, dl, el, m[10], 0x5a827999, 11); cl = rotl(cl, 10)
  el = fn2(el, al, bl, cl, dl, m[6], 0x5a827999, 9); bl = rotl(bl, 10)
  dl = fn2(dl, el, al, bl, cl, m[15], 0x5a827999, 7); al = rotl(al, 10)
  cl = fn2(cl, dl, el, al, bl, m[3], 0x5a827999, 15); el = rotl(el, 10)
  bl = fn2(bl, cl, dl, el, al, m[12], 0x5a827999, 7); dl = rotl(dl, 10)
  al = fn2(al, bl, cl, dl, el, m[0], 0x5a827999, 12); cl = rotl(cl, 10)
  el = fn2(el, al, bl, cl, dl, m[9], 0x5a827999, 15); bl = rotl(bl, 10)
  dl = fn2(dl, el, al, bl, cl, m[5], 0x5a827999, 9); al = rotl(al, 10)
  cl = fn2(cl, dl, el, al, bl, m[2], 0x5a827999, 11); el = rotl(el, 10)
  bl = fn2(bl, cl, dl, el, al, m[14], 0x5a827999, 7); dl = rotl(dl, 10)
  al = fn2(al, bl, cl, dl, el, m[11], 0x5a827999, 13); cl = rotl(cl, 10)
  el = fn2(el, al, bl, cl, dl, m[8], 0x5a827999, 12); bl = rotl(bl, 10)

  // Mj = 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12
  // K = 0x6ed9eba1
  // Sj = 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5
  dl = fn3(dl, el, al, bl, cl, m[3], 0x6ed9eba1, 11); al = rotl(al, 10)
  cl = fn3(cl, dl, el, al, bl, m[10], 0x6ed9eba1, 13); el = rotl(el, 10)
  bl = fn3(bl, cl, dl, el, al, m[14], 0x6ed9eba1, 6); dl = rotl(dl, 10)
  al = fn3(al, bl, cl, dl, el, m[4], 0x6ed9eba1, 7); cl = rotl(cl, 10)
  el = fn3(el, al, bl, cl, dl, m[9], 0x6ed9eba1, 14); bl = rotl(bl, 10)
  dl = fn3(dl, el, al, bl, cl, m[15], 0x6ed9eba1, 9); al = rotl(al, 10)
  cl = fn3(cl, dl, el, al, bl, m[8], 0x6ed9eba1, 13); el = rotl(el, 10)
  bl = fn3(bl, cl, dl, el, al, m[1], 0x6ed9eba1, 15); dl = rotl(dl, 10)
  al = fn3(al, bl, cl, dl, el, m[2], 0x6ed9eba1, 14); cl = rotl(cl, 10)
  el = fn3(el, al, bl, cl, dl, m[7], 0x6ed9eba1, 8); bl = rotl(bl, 10)
  dl = fn3(dl, el, al, bl, cl, m[0], 0x6ed9eba1, 13); al = rotl(al, 10)
  cl = fn3(cl, dl, el, al, bl, m[6], 0x6ed9eba1, 6); el = rotl(el, 10)
  bl = fn3(bl, cl, dl, el, al, m[13], 0x6ed9eba1, 5); dl = rotl(dl, 10)
  al = fn3(al, bl, cl, dl, el, m[11], 0x6ed9eba1, 12); cl = rotl(cl, 10)
  el = fn3(el, al, bl, cl, dl, m[5], 0x6ed9eba1, 7); bl = rotl(bl, 10)
  dl = fn3(dl, el, al, bl, cl, m[12], 0x6ed9eba1, 5); al = rotl(al, 10)

  // Mj = 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2
  // K = 0x8f1bbcdc
  // Sj = 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12
  cl = fn4(cl, dl, el, al, bl, m[1], 0x8f1bbcdc, 11); el = rotl(el, 10)
  bl = fn4(bl, cl, dl, el, al, m[9], 0x8f1bbcdc, 12); dl = rotl(dl, 10)
  al = fn4(al, bl, cl, dl, el, m[11], 0x8f1bbcdc, 14); cl = rotl(cl, 10)
  el = fn4(el, al, bl, cl, dl, m[10], 0x8f1bbcdc, 15); bl = rotl(bl, 10)
  dl = fn4(dl, el, al, bl, cl, m[0], 0x8f1bbcdc, 14); al = rotl(al, 10)
  cl = fn4(cl, dl, el, al, bl, m[8], 0x8f1bbcdc, 15); el = rotl(el, 10)
  bl = fn4(bl, cl, dl, el, al, m[12], 0x8f1bbcdc, 9); dl = rotl(dl, 10)
  al = fn4(al, bl, cl, dl, el, m[4], 0x8f1bbcdc, 8); cl = rotl(cl, 10)
  el = fn4(el, al, bl, cl, dl, m[13], 0x8f1bbcdc, 9); bl = rotl(bl, 10)
  dl = fn4(dl, el, al, bl, cl, m[3], 0x8f1bbcdc, 14); al = rotl(al, 10)
  cl = fn4(cl, dl, el, al, bl, m[7], 0x8f1bbcdc, 5); el = rotl(el, 10)
  bl = fn4(bl, cl, dl, el, al, m[15], 0x8f1bbcdc, 6); dl = rotl(dl, 10)
  al = fn4(al, bl, cl, dl, el, m[14], 0x8f1bbcdc, 8); cl = rotl(cl, 10)
  el = fn4(el, al, bl, cl, dl, m[5], 0x8f1bbcdc, 6); bl = rotl(bl, 10)
  dl = fn4(dl, el, al, bl, cl, m[6], 0x8f1bbcdc, 5); al = rotl(al, 10)
  cl = fn4(cl, dl, el, al, bl, m[2], 0x8f1bbcdc, 12); el = rotl(el, 10)

  // Mj = 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
  // K = 0xa953fd4e
  // Sj = 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
  bl = fn5(bl, cl, dl, el, al, m[4], 0xa953fd4e, 9); dl = rotl(dl, 10)
  al = fn5(al, bl, cl, dl, el, m[0], 0xa953fd4e, 15); cl = rotl(cl, 10)
  el = fn5(el, al, bl, cl, dl, m[5], 0xa953fd4e, 5); bl = rotl(bl, 10)
  dl = fn5(dl, el, al, bl, cl, m[9], 0xa953fd4e, 11); al = rotl(al, 10)
  cl = fn5(cl, dl, el, al, bl, m[7], 0xa953fd4e, 6); el = rotl(el, 10)
  bl = fn5(bl, cl, dl, el, al, m[12], 0xa953fd4e, 8); dl = rotl(dl, 10)
  al = fn5(al, bl, cl, dl, el, m[2], 0xa953fd4e, 13); cl = rotl(cl, 10)
  el = fn5(el, al, bl, cl, dl, m[10], 0xa953fd4e, 12); bl = rotl(bl, 10)
  dl = fn5(dl, el, al, bl, cl, m[14], 0xa953fd4e, 5); al = rotl(al, 10)
  cl = fn5(cl, dl, el, al, bl, m[1], 0xa953fd4e, 12); el = rotl(el, 10)
  bl = fn5(bl, cl, dl, el, al, m[3], 0xa953fd4e, 13); dl = rotl(dl, 10)
  al = fn5(al, bl, cl, dl, el, m[8], 0xa953fd4e, 14); cl = rotl(cl, 10)
  el = fn5(el, al, bl, cl, dl, m[11], 0xa953fd4e, 11); bl = rotl(bl, 10)
  dl = fn5(dl, el, al, bl, cl, m[6], 0xa953fd4e, 8); al = rotl(al, 10)
  cl = fn5(cl, dl, el, al, bl, m[15], 0xa953fd4e, 5); el = rotl(el, 10)
  bl = fn5(bl, cl, dl, el, al, m[13], 0xa953fd4e, 6); dl = rotl(dl, 10)

  var ar = this._a
  var br = this._b
  var cr = this._c
  var dr = this._d
  var er = this._e

  // M'j = 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12
  // K' = 0x50a28be6
  // S'j = 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6
  ar = fn5(ar, br, cr, dr, er, m[5], 0x50a28be6, 8); cr = rotl(cr, 10)
  er = fn5(er, ar, br, cr, dr, m[14], 0x50a28be6, 9); br = rotl(br, 10)
  dr = fn5(dr, er, ar, br, cr, m[7], 0x50a28be6, 9); ar = rotl(ar, 10)
  cr = fn5(cr, dr, er, ar, br, m[0], 0x50a28be6, 11); er = rotl(er, 10)
  br = fn5(br, cr, dr, er, ar, m[9], 0x50a28be6, 13); dr = rotl(dr, 10)
  ar = fn5(ar, br, cr, dr, er, m[2], 0x50a28be6, 15); cr = rotl(cr, 10)
  er = fn5(er, ar, br, cr, dr, m[11], 0x50a28be6, 15); br = rotl(br, 10)
  dr = fn5(dr, er, ar, br, cr, m[4], 0x50a28be6, 5); ar = rotl(ar, 10)
  cr = fn5(cr, dr, er, ar, br, m[13], 0x50a28be6, 7); er = rotl(er, 10)
  br = fn5(br, cr, dr, er, ar, m[6], 0x50a28be6, 7); dr = rotl(dr, 10)
  ar = fn5(ar, br, cr, dr, er, m[15], 0x50a28be6, 8); cr = rotl(cr, 10)
  er = fn5(er, ar, br, cr, dr, m[8], 0x50a28be6, 11); br = rotl(br, 10)
  dr = fn5(dr, er, ar, br, cr, m[1], 0x50a28be6, 14); ar = rotl(ar, 10)
  cr = fn5(cr, dr, er, ar, br, m[10], 0x50a28be6, 14); er = rotl(er, 10)
  br = fn5(br, cr, dr, er, ar, m[3], 0x50a28be6, 12); dr = rotl(dr, 10)
  ar = fn5(ar, br, cr, dr, er, m[12], 0x50a28be6, 6); cr = rotl(cr, 10)

  // M'j = 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2
  // K' = 0x5c4dd124
  // S'j = 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11
  er = fn4(er, ar, br, cr, dr, m[6], 0x5c4dd124, 9); br = rotl(br, 10)
  dr = fn4(dr, er, ar, br, cr, m[11], 0x5c4dd124, 13); ar = rotl(ar, 10)
  cr = fn4(cr, dr, er, ar, br, m[3], 0x5c4dd124, 15); er = rotl(er, 10)
  br = fn4(br, cr, dr, er, ar, m[7], 0x5c4dd124, 7); dr = rotl(dr, 10)
  ar = fn4(ar, br, cr, dr, er, m[0], 0x5c4dd124, 12); cr = rotl(cr, 10)
  er = fn4(er, ar, br, cr, dr, m[13], 0x5c4dd124, 8); br = rotl(br, 10)
  dr = fn4(dr, er, ar, br, cr, m[5], 0x5c4dd124, 9); ar = rotl(ar, 10)
  cr = fn4(cr, dr, er, ar, br, m[10], 0x5c4dd124, 11); er = rotl(er, 10)
  br = fn4(br, cr, dr, er, ar, m[14], 0x5c4dd124, 7); dr = rotl(dr, 10)
  ar = fn4(ar, br, cr, dr, er, m[15], 0x5c4dd124, 7); cr = rotl(cr, 10)
  er = fn4(er, ar, br, cr, dr, m[8], 0x5c4dd124, 12); br = rotl(br, 10)
  dr = fn4(dr, er, ar, br, cr, m[12], 0x5c4dd124, 7); ar = rotl(ar, 10)
  cr = fn4(cr, dr, er, ar, br, m[4], 0x5c4dd124, 6); er = rotl(er, 10)
  br = fn4(br, cr, dr, er, ar, m[9], 0x5c4dd124, 15); dr = rotl(dr, 10)
  ar = fn4(ar, br, cr, dr, er, m[1], 0x5c4dd124, 13); cr = rotl(cr, 10)
  er = fn4(er, ar, br, cr, dr, m[2], 0x5c4dd124, 11); br = rotl(br, 10)

  // M'j = 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13
  // K' = 0x6d703ef3
  // S'j = 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5
  dr = fn3(dr, er, ar, br, cr, m[15], 0x6d703ef3, 9); ar = rotl(ar, 10)
  cr = fn3(cr, dr, er, ar, br, m[5], 0x6d703ef3, 7); er = rotl(er, 10)
  br = fn3(br, cr, dr, er, ar, m[1], 0x6d703ef3, 15); dr = rotl(dr, 10)
  ar = fn3(ar, br, cr, dr, er, m[3], 0x6d703ef3, 11); cr = rotl(cr, 10)
  er = fn3(er, ar, br, cr, dr, m[7], 0x6d703ef3, 8); br = rotl(br, 10)
  dr = fn3(dr, er, ar, br, cr, m[14], 0x6d703ef3, 6); ar = rotl(ar, 10)
  cr = fn3(cr, dr, er, ar, br, m[6], 0x6d703ef3, 6); er = rotl(er, 10)
  br = fn3(br, cr, dr, er, ar, m[9], 0x6d703ef3, 14); dr = rotl(dr, 10)
  ar = fn3(ar, br, cr, dr, er, m[11], 0x6d703ef3, 12); cr = rotl(cr, 10)
  er = fn3(er, ar, br, cr, dr, m[8], 0x6d703ef3, 13); br = rotl(br, 10)
  dr = fn3(dr, er, ar, br, cr, m[12], 0x6d703ef3, 5); ar = rotl(ar, 10)
  cr = fn3(cr, dr, er, ar, br, m[2], 0x6d703ef3, 14); er = rotl(er, 10)
  br = fn3(br, cr, dr, er, ar, m[10], 0x6d703ef3, 13); dr = rotl(dr, 10)
  ar = fn3(ar, br, cr, dr, er, m[0], 0x6d703ef3, 13); cr = rotl(cr, 10)
  er = fn3(er, ar, br, cr, dr, m[4], 0x6d703ef3, 7); br = rotl(br, 10)
  dr = fn3(dr, er, ar, br, cr, m[13], 0x6d703ef3, 5); ar = rotl(ar, 10)

  // M'j = 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14
  // K' = 0x7a6d76e9
  // S'j = 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8
  cr = fn2(cr, dr, er, ar, br, m[8], 0x7a6d76e9, 15); er = rotl(er, 10)
  br = fn2(br, cr, dr, er, ar, m[6], 0x7a6d76e9, 5); dr = rotl(dr, 10)
  ar = fn2(ar, br, cr, dr, er, m[4], 0x7a6d76e9, 8); cr = rotl(cr, 10)
  er = fn2(er, ar, br, cr, dr, m[1], 0x7a6d76e9, 11); br = rotl(br, 10)
  dr = fn2(dr, er, ar, br, cr, m[3], 0x7a6d76e9, 14); ar = rotl(ar, 10)
  cr = fn2(cr, dr, er, ar, br, m[11], 0x7a6d76e9, 14); er = rotl(er, 10)
  br = fn2(br, cr, dr, er, ar, m[15], 0x7a6d76e9, 6); dr = rotl(dr, 10)
  ar = fn2(ar, br, cr, dr, er, m[0], 0x7a6d76e9, 14); cr = rotl(cr, 10)
  er = fn2(er, ar, br, cr, dr, m[5], 0x7a6d76e9, 6); br = rotl(br, 10)
  dr = fn2(dr, er, ar, br, cr, m[12], 0x7a6d76e9, 9); ar = rotl(ar, 10)
  cr = fn2(cr, dr, er, ar, br, m[2], 0x7a6d76e9, 12); er = rotl(er, 10)
  br = fn2(br, cr, dr, er, ar, m[13], 0x7a6d76e9, 9); dr = rotl(dr, 10)
  ar = fn2(ar, br, cr, dr, er, m[9], 0x7a6d76e9, 12); cr = rotl(cr, 10)
  er = fn2(er, ar, br, cr, dr, m[7], 0x7a6d76e9, 5); br = rotl(br, 10)
  dr = fn2(dr, er, ar, br, cr, m[10], 0x7a6d76e9, 15); ar = rotl(ar, 10)
  cr = fn2(cr, dr, er, ar, br, m[14], 0x7a6d76e9, 8); er = rotl(er, 10)

  // M'j = 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
  // K' = 0x00000000
  // S'j = 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
  br = fn1(br, cr, dr, er, ar, m[12], 0x00000000, 8); dr = rotl(dr, 10)
  ar = fn1(ar, br, cr, dr, er, m[15], 0x00000000, 5); cr = rotl(cr, 10)
  er = fn1(er, ar, br, cr, dr, m[10], 0x00000000, 12); br = rotl(br, 10)
  dr = fn1(dr, er, ar, br, cr, m[4], 0x00000000, 9); ar = rotl(ar, 10)
  cr = fn1(cr, dr, er, ar, br, m[1], 0x00000000, 12); er = rotl(er, 10)
  br = fn1(br, cr, dr, er, ar, m[5], 0x00000000, 5); dr = rotl(dr, 10)
  ar = fn1(ar, br, cr, dr, er, m[8], 0x00000000, 14); cr = rotl(cr, 10)
  er = fn1(er, ar, br, cr, dr, m[7], 0x00000000, 6); br = rotl(br, 10)
  dr = fn1(dr, er, ar, br, cr, m[6], 0x00000000, 8); ar = rotl(ar, 10)
  cr = fn1(cr, dr, er, ar, br, m[2], 0x00000000, 13); er = rotl(er, 10)
  br = fn1(br, cr, dr, er, ar, m[13], 0x00000000, 6); dr = rotl(dr, 10)
  ar = fn1(ar, br, cr, dr, er, m[14], 0x00000000, 5); cr = rotl(cr, 10)
  er = fn1(er, ar, br, cr, dr, m[0], 0x00000000, 15); br = rotl(br, 10)
  dr = fn1(dr, er, ar, br, cr, m[3], 0x00000000, 13); ar = rotl(ar, 10)
  cr = fn1(cr, dr, er, ar, br, m[9], 0x00000000, 11); er = rotl(er, 10)
  br = fn1(br, cr, dr, er, ar, m[11], 0x00000000, 11); dr = rotl(dr, 10)

  // change state
  var t = (this._b + cl + dr) | 0
  this._b = (this._c + dl + er) | 0
  this._c = (this._d + el + ar) | 0
  this._d = (this._e + al + br) | 0
  this._e = (this._a + bl + cr) | 0
  this._a = t
}

RIPEMD160.prototype._digest = function () {
  // create padding and handle blocks
  this._block[this._blockOffset++] = 0x80
  if (this._blockOffset > 56) {
    this._block.fill(0, this._blockOffset, 64)
    this._update()
    this._blockOffset = 0
  }

  this._block.fill(0, this._blockOffset, 56)
  this._block.writeUInt32LE(this._length[0], 56)
  this._block.writeUInt32LE(this._length[1], 60)
  this._update()

  // produce result
  var buffer = new Buffer(20)
  buffer.writeInt32LE(this._a, 0)
  buffer.writeInt32LE(this._b, 4)
  buffer.writeInt32LE(this._c, 8)
  buffer.writeInt32LE(this._d, 12)
  buffer.writeInt32LE(this._e, 16)
  return buffer
}

function rotl (x, n) {
  return (x << n) | (x >>> (32 - n))
}

function fn1 (a, b, c, d, e, m, k, s) {
  return (rotl((a + (b ^ c ^ d) + m + k) | 0, s) + e) | 0
}

function fn2 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b & c) | ((~b) & d)) + m + k) | 0, s) + e) | 0
}

function fn3 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b | (~c)) ^ d) + m + k) | 0, s) + e) | 0
}

function fn4 (a, b, c, d, e, m, k, s) {
  return (rotl((a + ((b & d) | (c & (~d))) + m + k) | 0, s) + e) | 0
}

function fn5 (a, b, c, d, e, m, k, s) {
  return (rotl((a + (b ^ (c | (~d))) + m + k) | 0, s) + e) | 0
}

module.exports = RIPEMD160

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(36).Buffer))

/***/ }),

/***/ 204:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
var Transform = __webpack_require__(53).Transform
var inherits = __webpack_require__(28)

function HashBase (blockSize) {
  Transform.call(this)

  this._block = new Buffer(blockSize)
  this._blockSize = blockSize
  this._blockOffset = 0
  this._length = [0, 0, 0, 0]

  this._finalized = false
}

inherits(HashBase, Transform)

HashBase.prototype._transform = function (chunk, encoding, callback) {
  var error = null
  try {
    if (encoding !== 'buffer') chunk = new Buffer(chunk, encoding)
    this.update(chunk)
  } catch (err) {
    error = err
  }

  callback(error)
}

HashBase.prototype._flush = function (callback) {
  var error = null
  try {
    this.push(this._digest())
  } catch (err) {
    error = err
  }

  callback(error)
}

HashBase.prototype.update = function (data, encoding) {
  if (!Buffer.isBuffer(data) && typeof data !== 'string') throw new TypeError('Data must be a string or a buffer')
  if (this._finalized) throw new Error('Digest already called')
  if (!Buffer.isBuffer(data)) data = new Buffer(data, encoding || 'binary')

  // consume data
  var block = this._block
  var offset = 0
  while (this._blockOffset + data.length - offset >= this._blockSize) {
    for (var i = this._blockOffset; i < this._blockSize;) block[i++] = data[offset++]
    this._update()
    this._blockOffset = 0
  }
  while (offset < data.length) block[this._blockOffset++] = data[offset++]

  // update length
  for (var j = 0, carry = data.length * 8; carry > 0; ++j) {
    this._length[j] += carry
    carry = (this._length[j] / 0x0100000000) | 0
    if (carry > 0) this._length[j] -= 0x0100000000 * carry
  }

  return this
}

HashBase.prototype._update = function (data) {
  throw new Error('_update is not implemented')
}

HashBase.prototype.digest = function (encoding) {
  if (this._finalized) throw new Error('Digest already called')
  this._finalized = true

  var digest = this._digest()
  if (encoding !== undefined) digest = digest.toString(encoding)
  return digest
}

HashBase.prototype._digest = function () {
  throw new Error('_digest is not implemented')
}

module.exports = HashBase

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(36).Buffer))

/***/ }),

/***/ 205:
/***/ (function(module, exports, __webpack_require__) {

var exports = module.exports = function SHA (algorithm) {
  algorithm = algorithm.toLowerCase()

  var Algorithm = exports[algorithm]
  if (!Algorithm) throw new Error(algorithm + ' is not supported (we accept pull requests)')

  return new Algorithm()
}

exports.sha = __webpack_require__(206)
exports.sha1 = __webpack_require__(207)
exports.sha224 = __webpack_require__(208)
exports.sha256 = __webpack_require__(119)
exports.sha384 = __webpack_require__(209)
exports.sha512 = __webpack_require__(120)


/***/ }),

/***/ 206:
/***/ (function(module, exports, __webpack_require__) {

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-0, as defined
 * in FIPS PUB 180-1
 * This source code is derived from sha1.js of the same repository.
 * The difference between SHA-0 and SHA-1 is just a bitwise rotate left
 * operation was added.
 */

var inherits = __webpack_require__(28)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha, Hash)

Sha.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16]

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha


/***/ }),

/***/ 207:
/***/ (function(module, exports, __webpack_require__) {

/*
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
 * in FIPS PUB 180-1
 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for details.
 */

var inherits = __webpack_require__(28)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var K = [
  0x5a827999, 0x6ed9eba1, 0x8f1bbcdc | 0, 0xca62c1d6 | 0
]

var W = new Array(80)

function Sha1 () {
  this.init()
  this._w = W

  Hash.call(this, 64, 56)
}

inherits(Sha1, Hash)

Sha1.prototype.init = function () {
  this._a = 0x67452301
  this._b = 0xefcdab89
  this._c = 0x98badcfe
  this._d = 0x10325476
  this._e = 0xc3d2e1f0

  return this
}

function rotl1 (num) {
  return (num << 1) | (num >>> 31)
}

function rotl5 (num) {
  return (num << 5) | (num >>> 27)
}

function rotl30 (num) {
  return (num << 30) | (num >>> 2)
}

function ft (s, b, c, d) {
  if (s === 0) return (b & c) | ((~b) & d)
  if (s === 2) return (b & c) | (b & d) | (c & d)
  return b ^ c ^ d
}

Sha1.prototype._update = function (M) {
  var W = this._w

  var a = this._a | 0
  var b = this._b | 0
  var c = this._c | 0
  var d = this._d | 0
  var e = this._e | 0

  for (var i = 0; i < 16; ++i) W[i] = M.readInt32BE(i * 4)
  for (; i < 80; ++i) W[i] = rotl1(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16])

  for (var j = 0; j < 80; ++j) {
    var s = ~~(j / 20)
    var t = (rotl5(a) + ft(s, b, c, d) + e + W[j] + K[s]) | 0

    e = d
    d = c
    c = rotl30(b)
    b = a
    a = t
  }

  this._a = (a + this._a) | 0
  this._b = (b + this._b) | 0
  this._c = (c + this._c) | 0
  this._d = (d + this._d) | 0
  this._e = (e + this._e) | 0
}

Sha1.prototype._hash = function () {
  var H = Buffer.allocUnsafe(20)

  H.writeInt32BE(this._a | 0, 0)
  H.writeInt32BE(this._b | 0, 4)
  H.writeInt32BE(this._c | 0, 8)
  H.writeInt32BE(this._d | 0, 12)
  H.writeInt32BE(this._e | 0, 16)

  return H
}

module.exports = Sha1


/***/ }),

/***/ 208:
/***/ (function(module, exports, __webpack_require__) {

/**
 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
 * in FIPS 180-2
 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 *
 */

var inherits = __webpack_require__(28)
var Sha256 = __webpack_require__(119)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var W = new Array(64)

function Sha224 () {
  this.init()

  this._w = W // new Array(64)

  Hash.call(this, 64, 56)
}

inherits(Sha224, Sha256)

Sha224.prototype.init = function () {
  this._a = 0xc1059ed8
  this._b = 0x367cd507
  this._c = 0x3070dd17
  this._d = 0xf70e5939
  this._e = 0xffc00b31
  this._f = 0x68581511
  this._g = 0x64f98fa7
  this._h = 0xbefa4fa4

  return this
}

Sha224.prototype._hash = function () {
  var H = Buffer.allocUnsafe(28)

  H.writeInt32BE(this._a, 0)
  H.writeInt32BE(this._b, 4)
  H.writeInt32BE(this._c, 8)
  H.writeInt32BE(this._d, 12)
  H.writeInt32BE(this._e, 16)
  H.writeInt32BE(this._f, 20)
  H.writeInt32BE(this._g, 24)

  return H
}

module.exports = Sha224


/***/ }),

/***/ 209:
/***/ (function(module, exports, __webpack_require__) {

var inherits = __webpack_require__(28)
var SHA512 = __webpack_require__(120)
var Hash = __webpack_require__(56)
var Buffer = __webpack_require__(40).Buffer

var W = new Array(160)

function Sha384 () {
  this.init()
  this._w = W

  Hash.call(this, 128, 112)
}

inherits(Sha384, SHA512)

Sha384.prototype.init = function () {
  this._ah = 0xcbbb9d5d
  this._bh = 0x629a292a
  this._ch = 0x9159015a
  this._dh = 0x152fecd8
  this._eh = 0x67332667
  this._fh = 0x8eb44a87
  this._gh = 0xdb0c2e0d
  this._hh = 0x47b5481d

  this._al = 0xc1059ed8
  this._bl = 0x367cd507
  this._cl = 0x3070dd17
  this._dl = 0xf70e5939
  this._el = 0xffc00b31
  this._fl = 0x68581511
  this._gl = 0x64f98fa7
  this._hl = 0xbefa4fa4

  return this
}

Sha384.prototype._hash = function () {
  var H = Buffer.allocUnsafe(48)

  function writeInt64BE (h, l, offset) {
    H.writeInt32BE(h, offset)
    H.writeInt32BE(l, offset + 4)
  }

  writeInt64BE(this._ah, this._al, 0)
  writeInt64BE(this._bh, this._bl, 8)
  writeInt64BE(this._ch, this._cl, 16)
  writeInt64BE(this._dh, this._dl, 24)
  writeInt64BE(this._eh, this._el, 32)
  writeInt64BE(this._fh, this._fl, 40)

  return H
}

module.exports = Sha384


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

/***/ 28:
/***/ (function(module, exports) {

if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}


/***/ }),

/***/ 29:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _log__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(4);
/* harmony import */ var _command_runner__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(66);
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

/***/ 3:
/***/ (function(module, exports, __webpack_require__) {

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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
  var adaptChrome = function adaptChrome(obj, chrome) {
    var adapt = function adapt(src, ret, obj, fn) {
      return Object.keys(obj).reduce(function (prev, key) {
        var keyParts = key.split('.');

        var _keyParts$reduce = keyParts.reduce(function (tuple, subkey) {
          var tar = tuple[0];
          var src = tuple[1];

          tar[subkey] = tar[subkey] || {};
          return [tar[subkey], src && src[subkey]];
        }, [prev, src]),
            _keyParts$reduce2 = _slicedToArray(_keyParts$reduce, 2),
            target = _keyParts$reduce2[0],
            source = _keyParts$reduce2[1];

        obj[key].forEach(function (method) {
          fn(method, source, target);
        });

        return prev;
      }, ret);
    };

    var promisify = function promisify(method, source, target) {
      if (!source) return;
      var reg = /The message port closed before a res?ponse was received/;

      target[method] = function () {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return new Promise(function (resolve, reject) {
          var callback = function callback(result) {
            // Note: The message port closed before a reponse was received.
            // Ignore this message
            if (chrome.runtime.lastError && !reg.test(chrome.runtime.lastError.message)) {
              console.error(chrome.runtime.lastError.message + ', ' + method + ', ' + JSON.stringify(args));
              return reject(chrome.runtime.lastError);
            }
            resolve(result);
          };

          source[method].apply(source, args.concat(callback));
        });
      };
    };

    var copy = function copy(method, source, target) {
      if (!source) return;
      target[method] = source[method];
    };

    return [[obj.toPromisify, promisify], [obj.toCopy, copy]].reduce(function (prev, tuple) {
      return adapt(chrome, prev, tuple[0], tuple[1]);
    }, {});
  };

  var UsedAPI = {
    toPromisify: {
      tabs: ['create', 'sendMessage', 'get', 'update', 'query', 'captureVisibleTab', 'remove'],
      windows: ['update', 'getLastFocused', 'getCurrent', 'getAll', 'remove', 'create', 'get'],
      runtime: ['sendMessage', 'setUninstallURL'],
      cookies: ['get', 'getAll', 'set', 'remove'],
      notifications: ['create', 'clear'],
      browserAction: ['getBadgeText'],
      bookmarks: ['create', 'getTree'],
      debugger: ['attach', 'detach', 'sendCommand', 'getTargets'],
      'storage.local': ['get', 'set']
    },
    toCopy: {
      tabs: ['onActivated', 'onUpdated'],
      windows: ['onFocusChanged'],
      runtime: ['onMessage', 'onInstalled', 'getManifest'],
      storage: ['onChanged'],
      browserAction: ['setBadgeText', 'setBadgeBackgroundColor', 'onClicked'],
      extension: ['getURL'],
      debugger: ['onEvent', 'onDetach'],
      downloads: ['onCreated', 'onChanged', 'onDeterminingFilename']
    }
  };

  var Ext = typeof chrome !== 'undefined' ? adaptChrome(UsedAPI, chrome) : browser;

  _extends(Ext, {
    isFirefox: function isFirefox() {
      return (/Firefox/.test(window.navigator.userAgent)
      );
    }
  });

  if (true) {
    module.exports = Ext;
  } else {}
})();

/***/ }),

/***/ 30:
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

/***/ 32:
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

/***/ 34:
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

/***/ 36:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(170)
var ieee754 = __webpack_require__(171)
var isArray = __webpack_require__(109)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(43)))

/***/ }),

/***/ 37:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export ScreenshotMan */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return getScreenshotMan; });
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16);
/* harmony import */ var _file_man__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(49);
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

/***/ 40:
/***/ (function(module, exports, __webpack_require__) {

/* eslint-disable node/no-deprecated-api */
var buffer = __webpack_require__(36)
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}


/***/ }),

/***/ 43:
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1, eval)("this");
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ 46:
/***/ (function(module, exports) {

// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };


/***/ }),

/***/ 49:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(2);
var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }





var readableSize = function readableSize(size) {
  var kb = 1024;
  var mb = kb * kb;

  if (size < kb) {
    return size + ' byte';
  }

  if (size < mb) {
    return (size / kb).toFixed(1) + ' KB';
  }

  return (size / mb).toFixed(1) + ' MB';
};

var FileMan = function () {
  function FileMan() {
    var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, FileMan);

    var _opts$baseDir = opts.baseDir,
        baseDir = _opts$baseDir === undefined ? 'share' : _opts$baseDir;


    if (!baseDir || baseDir === '/') {
      throw new Error('Invalid baseDir, ' + baseDir);
    }

    this.baseDir = baseDir;

    // Note: create the folder in which we will store csv files
    _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].getDirectory(baseDir, true);
  }

  _createClass(FileMan, [{
    key: 'checkFileName',
    value: function checkFileName(fileName) {
      Object(_utils__WEBPACK_IMPORTED_MODULE_2__["withFileExtension"])(fileName, function (baseName) {
        try {
          Object(_utils__WEBPACK_IMPORTED_MODULE_2__["validateStandardName"])(baseName, true);
        } catch (e) {
          throw new Error('Invalid file name \'' + fileName + '\'. File name ' + e.message);
        }
        return baseName;
      });
    }
  }, {
    key: 'getLink',
    value: function getLink(fileName) {
      var tmp = _web_extension__WEBPACK_IMPORTED_MODULE_1___default.a.extension.getURL('temporary');
      return 'filesystem:' + tmp + '/' + this.__filePath(encodeURIComponent(fileName));
    }
  }, {
    key: 'list',
    value: function list() {
      var _this = this;

      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].list(this.baseDir).then(function (fileEntries) {
        var ps = fileEntries.map(function (fileEntry) {
          return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].getMetadata(fileEntry).then(function (meta) {
            return {
              dir: _this.baseDir,
              fileName: fileEntry.name,
              size: readableSize(meta.size),
              lastModified: meta.modificationTime
            };
          });
        });
        return Promise.all(ps);
      });
    }
  }, {
    key: 'exists',
    value: function exists(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].exists(this.__filePath(fileName), { type: 'file' });
    }
  }, {
    key: 'read',
    value: function read(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].readFile(this.__filePath(fileName), 'Text');
    }
  }, {
    key: 'write',
    value: function write(fileName, text) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].writeFile(this.__filePath(fileName, true), new Blob([text]));
    }

    // Note: when you try to write on an existing file with file system api,
    // it won't clear old content, so we have to do it mannually

  }, {
    key: 'overwrite',
    value: function overwrite(fileName, text) {
      var _this2 = this;

      return this.remove(fileName).catch(function () {/* Ignore any error */}).then(function () {
        return _this2.write(fileName, text);
      });
    }
  }, {
    key: 'clear',
    value: function clear() {
      var _this3 = this;

      return this.list().then(function (list) {
        var ps = list.map(function (file) {
          return _this3.remove(file.fileName);
        });

        return Promise.all(ps);
      });
    }
  }, {
    key: 'remove',
    value: function remove(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].removeFile(this.__filePath(fileName));
    }
  }, {
    key: 'rename',
    value: function rename(fileName, newName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].moveFile(this.__filePath(fileName), this.__filePath(newName, true));
    }
  }, {
    key: 'metadata',
    value: function metadata(fileName) {
      return _filesystem__WEBPACK_IMPORTED_MODULE_0__[/* default */ "a"].getMetadata(this.__filePath(fileName));
    }
  }, {
    key: '__filePath',
    value: function __filePath(fileName, forceCheck) {
      if (forceCheck) {
        this.checkFileName(fileName);
      }

      return this.baseDir + '/' + fileName.toLowerCase();
    }
  }]);

  return FileMan;
}();

/* harmony default export */ __webpack_exports__["a"] = (FileMan);

/***/ }),

/***/ 51:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.



/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    keys.push(key);
  }return keys;
};
/*</replacement>*/

module.exports = Duplex;

/*<replacement>*/
var processNextTick = __webpack_require__(80);
/*</replacement>*/

/*<replacement>*/
var util = __webpack_require__(58);
util.inherits = __webpack_require__(28);
/*</replacement>*/

var Readable = __webpack_require__(110);
var Writable = __webpack_require__(81);

util.inherits(Duplex, Readable);

var keys = objectKeys(Writable.prototype);
for (var v = 0; v < keys.length; v++) {
  var method = keys[v];
  if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);

  Readable.call(this, options);
  Writable.call(this, options);

  if (options && options.readable === false) this.readable = false;

  if (options && options.writable === false) this.writable = false;

  this.allowHalfOpen = true;
  if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

  this.once('end', onend);
}

// the no-half-open enforcer
function onend() {
  // if we allow half-open state, or if the writable side ended,
  // then we're ok.
  if (this.allowHalfOpen || this._writableState.ended) return;

  // no more data can be written.
  // But allow more writes to happen in this tick.
  processNextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

function forEach(xs, f) {
  for (var i = 0, l = xs.length; i < l; i++) {
    f(xs[i], i);
  }
}

/***/ }),

/***/ 52:
/***/ (function(module, exports, __webpack_require__) {

(function(root) {
    "use strict";

    function checkInt(value) {
        return (parseInt(value) === value);
    }

    function checkInts(arrayish) {
        if (!checkInt(arrayish.length)) { return false; }

        for (var i = 0; i < arrayish.length; i++) {
            if (!checkInt(arrayish[i]) || arrayish[i] < 0 || arrayish[i] > 255) {
                return false;
            }
        }

        return true;
    }

    function coerceArray(arg, copy) {

        // ArrayBuffer view
        if (arg.buffer && ArrayBuffer.isView(arg) && arg.name === 'Uint8Array') {

            if (copy) {
                if (arg.slice) {
                    arg = arg.slice();
                } else {
                    arg = Array.prototype.slice.call(arg);
                }
            }

            return arg;
        }

        // It's an array; check it is a valid representation of a byte
        if (Array.isArray(arg)) {
            if (!checkInts(arg)) {
                throw new Error('Array contains invalid value: ' + arg);
            }

            return new Uint8Array(arg);
        }

        // Something else, but behaves like an array (maybe a Buffer? Arguments?)
        if (checkInt(arg.length) && checkInts(arg)) {
            return new Uint8Array(arg);
        }

        throw new Error('unsupported array-like object');
    }

    function createArray(length) {
        return new Uint8Array(length);
    }

    function copyArray(sourceArray, targetArray, targetStart, sourceStart, sourceEnd) {
        if (sourceStart != null || sourceEnd != null) {
            if (sourceArray.slice) {
                sourceArray = sourceArray.slice(sourceStart, sourceEnd);
            } else {
                sourceArray = Array.prototype.slice.call(sourceArray, sourceStart, sourceEnd);
            }
        }
        targetArray.set(sourceArray, targetStart);
    }



    var convertUtf8 = (function() {
        function toBytes(text) {
            var result = [], i = 0;
            text = encodeURI(text);
            while (i < text.length) {
                var c = text.charCodeAt(i++);

                // if it is a % sign, encode the following 2 bytes as a hex value
                if (c === 37) {
                    result.push(parseInt(text.substr(i, 2), 16))
                    i += 2;

                // otherwise, just the actual byte
                } else {
                    result.push(c)
                }
            }

            return coerceArray(result);
        }

        function fromBytes(bytes) {
            var result = [], i = 0;

            while (i < bytes.length) {
                var c = bytes[i];

                if (c < 128) {
                    result.push(String.fromCharCode(c));
                    i++;
                } else if (c > 191 && c < 224) {
                    result.push(String.fromCharCode(((c & 0x1f) << 6) | (bytes[i + 1] & 0x3f)));
                    i += 2;
                } else {
                    result.push(String.fromCharCode(((c & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f)));
                    i += 3;
                }
            }

            return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();

    var convertHex = (function() {
        function toBytes(text) {
            var result = [];
            for (var i = 0; i < text.length; i += 2) {
                result.push(parseInt(text.substr(i, 2), 16));
            }

            return result;
        }

        // http://ixti.net/development/javascript/2011/11/11/base64-encodedecode-of-utf8-in-browser-with-js.html
        var Hex = '0123456789abcdef';

        function fromBytes(bytes) {
                var result = [];
                for (var i = 0; i < bytes.length; i++) {
                    var v = bytes[i];
                    result.push(Hex[(v & 0xf0) >> 4] + Hex[v & 0x0f]);
                }
                return result.join('');
        }

        return {
            toBytes: toBytes,
            fromBytes: fromBytes,
        }
    })();


    // Number of rounds by keysize
    var numberOfRounds = {16: 10, 24: 12, 32: 14}

    // Round constant words
    var rcon = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36, 0x6c, 0xd8, 0xab, 0x4d, 0x9a, 0x2f, 0x5e, 0xbc, 0x63, 0xc6, 0x97, 0x35, 0x6a, 0xd4, 0xb3, 0x7d, 0xfa, 0xef, 0xc5, 0x91];

    // S-box and Inverse S-box (S is for Substitution)
    var S = [0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf, 0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08, 0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16];
    var Si =[0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e, 0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87, 0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32, 0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e, 0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49, 0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16, 0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50, 0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84, 0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05, 0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02, 0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41, 0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73, 0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8, 0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89, 0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b, 0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4, 0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59, 0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d, 0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d, 0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61, 0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63, 0x55, 0x21, 0x0c, 0x7d];

    // Transformations for encryption
    var T1 = [0xc66363a5, 0xf87c7c84, 0xee777799, 0xf67b7b8d, 0xfff2f20d, 0xd66b6bbd, 0xde6f6fb1, 0x91c5c554, 0x60303050, 0x02010103, 0xce6767a9, 0x562b2b7d, 0xe7fefe19, 0xb5d7d762, 0x4dababe6, 0xec76769a, 0x8fcaca45, 0x1f82829d, 0x89c9c940, 0xfa7d7d87, 0xeffafa15, 0xb25959eb, 0x8e4747c9, 0xfbf0f00b, 0x41adadec, 0xb3d4d467, 0x5fa2a2fd, 0x45afafea, 0x239c9cbf, 0x53a4a4f7, 0xe4727296, 0x9bc0c05b, 0x75b7b7c2, 0xe1fdfd1c, 0x3d9393ae, 0x4c26266a, 0x6c36365a, 0x7e3f3f41, 0xf5f7f702, 0x83cccc4f, 0x6834345c, 0x51a5a5f4, 0xd1e5e534, 0xf9f1f108, 0xe2717193, 0xabd8d873, 0x62313153, 0x2a15153f, 0x0804040c, 0x95c7c752, 0x46232365, 0x9dc3c35e, 0x30181828, 0x379696a1, 0x0a05050f, 0x2f9a9ab5, 0x0e070709, 0x24121236, 0x1b80809b, 0xdfe2e23d, 0xcdebeb26, 0x4e272769, 0x7fb2b2cd, 0xea75759f, 0x1209091b, 0x1d83839e, 0x582c2c74, 0x341a1a2e, 0x361b1b2d, 0xdc6e6eb2, 0xb45a5aee, 0x5ba0a0fb, 0xa45252f6, 0x763b3b4d, 0xb7d6d661, 0x7db3b3ce, 0x5229297b, 0xdde3e33e, 0x5e2f2f71, 0x13848497, 0xa65353f5, 0xb9d1d168, 0x00000000, 0xc1eded2c, 0x40202060, 0xe3fcfc1f, 0x79b1b1c8, 0xb65b5bed, 0xd46a6abe, 0x8dcbcb46, 0x67bebed9, 0x7239394b, 0x944a4ade, 0x984c4cd4, 0xb05858e8, 0x85cfcf4a, 0xbbd0d06b, 0xc5efef2a, 0x4faaaae5, 0xedfbfb16, 0x864343c5, 0x9a4d4dd7, 0x66333355, 0x11858594, 0x8a4545cf, 0xe9f9f910, 0x04020206, 0xfe7f7f81, 0xa05050f0, 0x783c3c44, 0x259f9fba, 0x4ba8a8e3, 0xa25151f3, 0x5da3a3fe, 0x804040c0, 0x058f8f8a, 0x3f9292ad, 0x219d9dbc, 0x70383848, 0xf1f5f504, 0x63bcbcdf, 0x77b6b6c1, 0xafdada75, 0x42212163, 0x20101030, 0xe5ffff1a, 0xfdf3f30e, 0xbfd2d26d, 0x81cdcd4c, 0x180c0c14, 0x26131335, 0xc3ecec2f, 0xbe5f5fe1, 0x359797a2, 0x884444cc, 0x2e171739, 0x93c4c457, 0x55a7a7f2, 0xfc7e7e82, 0x7a3d3d47, 0xc86464ac, 0xba5d5de7, 0x3219192b, 0xe6737395, 0xc06060a0, 0x19818198, 0x9e4f4fd1, 0xa3dcdc7f, 0x44222266, 0x542a2a7e, 0x3b9090ab, 0x0b888883, 0x8c4646ca, 0xc7eeee29, 0x6bb8b8d3, 0x2814143c, 0xa7dede79, 0xbc5e5ee2, 0x160b0b1d, 0xaddbdb76, 0xdbe0e03b, 0x64323256, 0x743a3a4e, 0x140a0a1e, 0x924949db, 0x0c06060a, 0x4824246c, 0xb85c5ce4, 0x9fc2c25d, 0xbdd3d36e, 0x43acacef, 0xc46262a6, 0x399191a8, 0x319595a4, 0xd3e4e437, 0xf279798b, 0xd5e7e732, 0x8bc8c843, 0x6e373759, 0xda6d6db7, 0x018d8d8c, 0xb1d5d564, 0x9c4e4ed2, 0x49a9a9e0, 0xd86c6cb4, 0xac5656fa, 0xf3f4f407, 0xcfeaea25, 0xca6565af, 0xf47a7a8e, 0x47aeaee9, 0x10080818, 0x6fbabad5, 0xf0787888, 0x4a25256f, 0x5c2e2e72, 0x381c1c24, 0x57a6a6f1, 0x73b4b4c7, 0x97c6c651, 0xcbe8e823, 0xa1dddd7c, 0xe874749c, 0x3e1f1f21, 0x964b4bdd, 0x61bdbddc, 0x0d8b8b86, 0x0f8a8a85, 0xe0707090, 0x7c3e3e42, 0x71b5b5c4, 0xcc6666aa, 0x904848d8, 0x06030305, 0xf7f6f601, 0x1c0e0e12, 0xc26161a3, 0x6a35355f, 0xae5757f9, 0x69b9b9d0, 0x17868691, 0x99c1c158, 0x3a1d1d27, 0x279e9eb9, 0xd9e1e138, 0xebf8f813, 0x2b9898b3, 0x22111133, 0xd26969bb, 0xa9d9d970, 0x078e8e89, 0x339494a7, 0x2d9b9bb6, 0x3c1e1e22, 0x15878792, 0xc9e9e920, 0x87cece49, 0xaa5555ff, 0x50282878, 0xa5dfdf7a, 0x038c8c8f, 0x59a1a1f8, 0x09898980, 0x1a0d0d17, 0x65bfbfda, 0xd7e6e631, 0x844242c6, 0xd06868b8, 0x824141c3, 0x299999b0, 0x5a2d2d77, 0x1e0f0f11, 0x7bb0b0cb, 0xa85454fc, 0x6dbbbbd6, 0x2c16163a];
    var T2 = [0xa5c66363, 0x84f87c7c, 0x99ee7777, 0x8df67b7b, 0x0dfff2f2, 0xbdd66b6b, 0xb1de6f6f, 0x5491c5c5, 0x50603030, 0x03020101, 0xa9ce6767, 0x7d562b2b, 0x19e7fefe, 0x62b5d7d7, 0xe64dabab, 0x9aec7676, 0x458fcaca, 0x9d1f8282, 0x4089c9c9, 0x87fa7d7d, 0x15effafa, 0xebb25959, 0xc98e4747, 0x0bfbf0f0, 0xec41adad, 0x67b3d4d4, 0xfd5fa2a2, 0xea45afaf, 0xbf239c9c, 0xf753a4a4, 0x96e47272, 0x5b9bc0c0, 0xc275b7b7, 0x1ce1fdfd, 0xae3d9393, 0x6a4c2626, 0x5a6c3636, 0x417e3f3f, 0x02f5f7f7, 0x4f83cccc, 0x5c683434, 0xf451a5a5, 0x34d1e5e5, 0x08f9f1f1, 0x93e27171, 0x73abd8d8, 0x53623131, 0x3f2a1515, 0x0c080404, 0x5295c7c7, 0x65462323, 0x5e9dc3c3, 0x28301818, 0xa1379696, 0x0f0a0505, 0xb52f9a9a, 0x090e0707, 0x36241212, 0x9b1b8080, 0x3ddfe2e2, 0x26cdebeb, 0x694e2727, 0xcd7fb2b2, 0x9fea7575, 0x1b120909, 0x9e1d8383, 0x74582c2c, 0x2e341a1a, 0x2d361b1b, 0xb2dc6e6e, 0xeeb45a5a, 0xfb5ba0a0, 0xf6a45252, 0x4d763b3b, 0x61b7d6d6, 0xce7db3b3, 0x7b522929, 0x3edde3e3, 0x715e2f2f, 0x97138484, 0xf5a65353, 0x68b9d1d1, 0x00000000, 0x2cc1eded, 0x60402020, 0x1fe3fcfc, 0xc879b1b1, 0xedb65b5b, 0xbed46a6a, 0x468dcbcb, 0xd967bebe, 0x4b723939, 0xde944a4a, 0xd4984c4c, 0xe8b05858, 0x4a85cfcf, 0x6bbbd0d0, 0x2ac5efef, 0xe54faaaa, 0x16edfbfb, 0xc5864343, 0xd79a4d4d, 0x55663333, 0x94118585, 0xcf8a4545, 0x10e9f9f9, 0x06040202, 0x81fe7f7f, 0xf0a05050, 0x44783c3c, 0xba259f9f, 0xe34ba8a8, 0xf3a25151, 0xfe5da3a3, 0xc0804040, 0x8a058f8f, 0xad3f9292, 0xbc219d9d, 0x48703838, 0x04f1f5f5, 0xdf63bcbc, 0xc177b6b6, 0x75afdada, 0x63422121, 0x30201010, 0x1ae5ffff, 0x0efdf3f3, 0x6dbfd2d2, 0x4c81cdcd, 0x14180c0c, 0x35261313, 0x2fc3ecec, 0xe1be5f5f, 0xa2359797, 0xcc884444, 0x392e1717, 0x5793c4c4, 0xf255a7a7, 0x82fc7e7e, 0x477a3d3d, 0xacc86464, 0xe7ba5d5d, 0x2b321919, 0x95e67373, 0xa0c06060, 0x98198181, 0xd19e4f4f, 0x7fa3dcdc, 0x66442222, 0x7e542a2a, 0xab3b9090, 0x830b8888, 0xca8c4646, 0x29c7eeee, 0xd36bb8b8, 0x3c281414, 0x79a7dede, 0xe2bc5e5e, 0x1d160b0b, 0x76addbdb, 0x3bdbe0e0, 0x56643232, 0x4e743a3a, 0x1e140a0a, 0xdb924949, 0x0a0c0606, 0x6c482424, 0xe4b85c5c, 0x5d9fc2c2, 0x6ebdd3d3, 0xef43acac, 0xa6c46262, 0xa8399191, 0xa4319595, 0x37d3e4e4, 0x8bf27979, 0x32d5e7e7, 0x438bc8c8, 0x596e3737, 0xb7da6d6d, 0x8c018d8d, 0x64b1d5d5, 0xd29c4e4e, 0xe049a9a9, 0xb4d86c6c, 0xfaac5656, 0x07f3f4f4, 0x25cfeaea, 0xafca6565, 0x8ef47a7a, 0xe947aeae, 0x18100808, 0xd56fbaba, 0x88f07878, 0x6f4a2525, 0x725c2e2e, 0x24381c1c, 0xf157a6a6, 0xc773b4b4, 0x5197c6c6, 0x23cbe8e8, 0x7ca1dddd, 0x9ce87474, 0x213e1f1f, 0xdd964b4b, 0xdc61bdbd, 0x860d8b8b, 0x850f8a8a, 0x90e07070, 0x427c3e3e, 0xc471b5b5, 0xaacc6666, 0xd8904848, 0x05060303, 0x01f7f6f6, 0x121c0e0e, 0xa3c26161, 0x5f6a3535, 0xf9ae5757, 0xd069b9b9, 0x91178686, 0x5899c1c1, 0x273a1d1d, 0xb9279e9e, 0x38d9e1e1, 0x13ebf8f8, 0xb32b9898, 0x33221111, 0xbbd26969, 0x70a9d9d9, 0x89078e8e, 0xa7339494, 0xb62d9b9b, 0x223c1e1e, 0x92158787, 0x20c9e9e9, 0x4987cece, 0xffaa5555, 0x78502828, 0x7aa5dfdf, 0x8f038c8c, 0xf859a1a1, 0x80098989, 0x171a0d0d, 0xda65bfbf, 0x31d7e6e6, 0xc6844242, 0xb8d06868, 0xc3824141, 0xb0299999, 0x775a2d2d, 0x111e0f0f, 0xcb7bb0b0, 0xfca85454, 0xd66dbbbb, 0x3a2c1616];
    var T3 = [0x63a5c663, 0x7c84f87c, 0x7799ee77, 0x7b8df67b, 0xf20dfff2, 0x6bbdd66b, 0x6fb1de6f, 0xc55491c5, 0x30506030, 0x01030201, 0x67a9ce67, 0x2b7d562b, 0xfe19e7fe, 0xd762b5d7, 0xabe64dab, 0x769aec76, 0xca458fca, 0x829d1f82, 0xc94089c9, 0x7d87fa7d, 0xfa15effa, 0x59ebb259, 0x47c98e47, 0xf00bfbf0, 0xadec41ad, 0xd467b3d4, 0xa2fd5fa2, 0xafea45af, 0x9cbf239c, 0xa4f753a4, 0x7296e472, 0xc05b9bc0, 0xb7c275b7, 0xfd1ce1fd, 0x93ae3d93, 0x266a4c26, 0x365a6c36, 0x3f417e3f, 0xf702f5f7, 0xcc4f83cc, 0x345c6834, 0xa5f451a5, 0xe534d1e5, 0xf108f9f1, 0x7193e271, 0xd873abd8, 0x31536231, 0x153f2a15, 0x040c0804, 0xc75295c7, 0x23654623, 0xc35e9dc3, 0x18283018, 0x96a13796, 0x050f0a05, 0x9ab52f9a, 0x07090e07, 0x12362412, 0x809b1b80, 0xe23ddfe2, 0xeb26cdeb, 0x27694e27, 0xb2cd7fb2, 0x759fea75, 0x091b1209, 0x839e1d83, 0x2c74582c, 0x1a2e341a, 0x1b2d361b, 0x6eb2dc6e, 0x5aeeb45a, 0xa0fb5ba0, 0x52f6a452, 0x3b4d763b, 0xd661b7d6, 0xb3ce7db3, 0x297b5229, 0xe33edde3, 0x2f715e2f, 0x84971384, 0x53f5a653, 0xd168b9d1, 0x00000000, 0xed2cc1ed, 0x20604020, 0xfc1fe3fc, 0xb1c879b1, 0x5bedb65b, 0x6abed46a, 0xcb468dcb, 0xbed967be, 0x394b7239, 0x4ade944a, 0x4cd4984c, 0x58e8b058, 0xcf4a85cf, 0xd06bbbd0, 0xef2ac5ef, 0xaae54faa, 0xfb16edfb, 0x43c58643, 0x4dd79a4d, 0x33556633, 0x85941185, 0x45cf8a45, 0xf910e9f9, 0x02060402, 0x7f81fe7f, 0x50f0a050, 0x3c44783c, 0x9fba259f, 0xa8e34ba8, 0x51f3a251, 0xa3fe5da3, 0x40c08040, 0x8f8a058f, 0x92ad3f92, 0x9dbc219d, 0x38487038, 0xf504f1f5, 0xbcdf63bc, 0xb6c177b6, 0xda75afda, 0x21634221, 0x10302010, 0xff1ae5ff, 0xf30efdf3, 0xd26dbfd2, 0xcd4c81cd, 0x0c14180c, 0x13352613, 0xec2fc3ec, 0x5fe1be5f, 0x97a23597, 0x44cc8844, 0x17392e17, 0xc45793c4, 0xa7f255a7, 0x7e82fc7e, 0x3d477a3d, 0x64acc864, 0x5de7ba5d, 0x192b3219, 0x7395e673, 0x60a0c060, 0x81981981, 0x4fd19e4f, 0xdc7fa3dc, 0x22664422, 0x2a7e542a, 0x90ab3b90, 0x88830b88, 0x46ca8c46, 0xee29c7ee, 0xb8d36bb8, 0x143c2814, 0xde79a7de, 0x5ee2bc5e, 0x0b1d160b, 0xdb76addb, 0xe03bdbe0, 0x32566432, 0x3a4e743a, 0x0a1e140a, 0x49db9249, 0x060a0c06, 0x246c4824, 0x5ce4b85c, 0xc25d9fc2, 0xd36ebdd3, 0xacef43ac, 0x62a6c462, 0x91a83991, 0x95a43195, 0xe437d3e4, 0x798bf279, 0xe732d5e7, 0xc8438bc8, 0x37596e37, 0x6db7da6d, 0x8d8c018d, 0xd564b1d5, 0x4ed29c4e, 0xa9e049a9, 0x6cb4d86c, 0x56faac56, 0xf407f3f4, 0xea25cfea, 0x65afca65, 0x7a8ef47a, 0xaee947ae, 0x08181008, 0xbad56fba, 0x7888f078, 0x256f4a25, 0x2e725c2e, 0x1c24381c, 0xa6f157a6, 0xb4c773b4, 0xc65197c6, 0xe823cbe8, 0xdd7ca1dd, 0x749ce874, 0x1f213e1f, 0x4bdd964b, 0xbddc61bd, 0x8b860d8b, 0x8a850f8a, 0x7090e070, 0x3e427c3e, 0xb5c471b5, 0x66aacc66, 0x48d89048, 0x03050603, 0xf601f7f6, 0x0e121c0e, 0x61a3c261, 0x355f6a35, 0x57f9ae57, 0xb9d069b9, 0x86911786, 0xc15899c1, 0x1d273a1d, 0x9eb9279e, 0xe138d9e1, 0xf813ebf8, 0x98b32b98, 0x11332211, 0x69bbd269, 0xd970a9d9, 0x8e89078e, 0x94a73394, 0x9bb62d9b, 0x1e223c1e, 0x87921587, 0xe920c9e9, 0xce4987ce, 0x55ffaa55, 0x28785028, 0xdf7aa5df, 0x8c8f038c, 0xa1f859a1, 0x89800989, 0x0d171a0d, 0xbfda65bf, 0xe631d7e6, 0x42c68442, 0x68b8d068, 0x41c38241, 0x99b02999, 0x2d775a2d, 0x0f111e0f, 0xb0cb7bb0, 0x54fca854, 0xbbd66dbb, 0x163a2c16];
    var T4 = [0x6363a5c6, 0x7c7c84f8, 0x777799ee, 0x7b7b8df6, 0xf2f20dff, 0x6b6bbdd6, 0x6f6fb1de, 0xc5c55491, 0x30305060, 0x01010302, 0x6767a9ce, 0x2b2b7d56, 0xfefe19e7, 0xd7d762b5, 0xababe64d, 0x76769aec, 0xcaca458f, 0x82829d1f, 0xc9c94089, 0x7d7d87fa, 0xfafa15ef, 0x5959ebb2, 0x4747c98e, 0xf0f00bfb, 0xadadec41, 0xd4d467b3, 0xa2a2fd5f, 0xafafea45, 0x9c9cbf23, 0xa4a4f753, 0x727296e4, 0xc0c05b9b, 0xb7b7c275, 0xfdfd1ce1, 0x9393ae3d, 0x26266a4c, 0x36365a6c, 0x3f3f417e, 0xf7f702f5, 0xcccc4f83, 0x34345c68, 0xa5a5f451, 0xe5e534d1, 0xf1f108f9, 0x717193e2, 0xd8d873ab, 0x31315362, 0x15153f2a, 0x04040c08, 0xc7c75295, 0x23236546, 0xc3c35e9d, 0x18182830, 0x9696a137, 0x05050f0a, 0x9a9ab52f, 0x0707090e, 0x12123624, 0x80809b1b, 0xe2e23ddf, 0xebeb26cd, 0x2727694e, 0xb2b2cd7f, 0x75759fea, 0x09091b12, 0x83839e1d, 0x2c2c7458, 0x1a1a2e34, 0x1b1b2d36, 0x6e6eb2dc, 0x5a5aeeb4, 0xa0a0fb5b, 0x5252f6a4, 0x3b3b4d76, 0xd6d661b7, 0xb3b3ce7d, 0x29297b52, 0xe3e33edd, 0x2f2f715e, 0x84849713, 0x5353f5a6, 0xd1d168b9, 0x00000000, 0xeded2cc1, 0x20206040, 0xfcfc1fe3, 0xb1b1c879, 0x5b5bedb6, 0x6a6abed4, 0xcbcb468d, 0xbebed967, 0x39394b72, 0x4a4ade94, 0x4c4cd498, 0x5858e8b0, 0xcfcf4a85, 0xd0d06bbb, 0xefef2ac5, 0xaaaae54f, 0xfbfb16ed, 0x4343c586, 0x4d4dd79a, 0x33335566, 0x85859411, 0x4545cf8a, 0xf9f910e9, 0x02020604, 0x7f7f81fe, 0x5050f0a0, 0x3c3c4478, 0x9f9fba25, 0xa8a8e34b, 0x5151f3a2, 0xa3a3fe5d, 0x4040c080, 0x8f8f8a05, 0x9292ad3f, 0x9d9dbc21, 0x38384870, 0xf5f504f1, 0xbcbcdf63, 0xb6b6c177, 0xdada75af, 0x21216342, 0x10103020, 0xffff1ae5, 0xf3f30efd, 0xd2d26dbf, 0xcdcd4c81, 0x0c0c1418, 0x13133526, 0xecec2fc3, 0x5f5fe1be, 0x9797a235, 0x4444cc88, 0x1717392e, 0xc4c45793, 0xa7a7f255, 0x7e7e82fc, 0x3d3d477a, 0x6464acc8, 0x5d5de7ba, 0x19192b32, 0x737395e6, 0x6060a0c0, 0x81819819, 0x4f4fd19e, 0xdcdc7fa3, 0x22226644, 0x2a2a7e54, 0x9090ab3b, 0x8888830b, 0x4646ca8c, 0xeeee29c7, 0xb8b8d36b, 0x14143c28, 0xdede79a7, 0x5e5ee2bc, 0x0b0b1d16, 0xdbdb76ad, 0xe0e03bdb, 0x32325664, 0x3a3a4e74, 0x0a0a1e14, 0x4949db92, 0x06060a0c, 0x24246c48, 0x5c5ce4b8, 0xc2c25d9f, 0xd3d36ebd, 0xacacef43, 0x6262a6c4, 0x9191a839, 0x9595a431, 0xe4e437d3, 0x79798bf2, 0xe7e732d5, 0xc8c8438b, 0x3737596e, 0x6d6db7da, 0x8d8d8c01, 0xd5d564b1, 0x4e4ed29c, 0xa9a9e049, 0x6c6cb4d8, 0x5656faac, 0xf4f407f3, 0xeaea25cf, 0x6565afca, 0x7a7a8ef4, 0xaeaee947, 0x08081810, 0xbabad56f, 0x787888f0, 0x25256f4a, 0x2e2e725c, 0x1c1c2438, 0xa6a6f157, 0xb4b4c773, 0xc6c65197, 0xe8e823cb, 0xdddd7ca1, 0x74749ce8, 0x1f1f213e, 0x4b4bdd96, 0xbdbddc61, 0x8b8b860d, 0x8a8a850f, 0x707090e0, 0x3e3e427c, 0xb5b5c471, 0x6666aacc, 0x4848d890, 0x03030506, 0xf6f601f7, 0x0e0e121c, 0x6161a3c2, 0x35355f6a, 0x5757f9ae, 0xb9b9d069, 0x86869117, 0xc1c15899, 0x1d1d273a, 0x9e9eb927, 0xe1e138d9, 0xf8f813eb, 0x9898b32b, 0x11113322, 0x6969bbd2, 0xd9d970a9, 0x8e8e8907, 0x9494a733, 0x9b9bb62d, 0x1e1e223c, 0x87879215, 0xe9e920c9, 0xcece4987, 0x5555ffaa, 0x28287850, 0xdfdf7aa5, 0x8c8c8f03, 0xa1a1f859, 0x89898009, 0x0d0d171a, 0xbfbfda65, 0xe6e631d7, 0x4242c684, 0x6868b8d0, 0x4141c382, 0x9999b029, 0x2d2d775a, 0x0f0f111e, 0xb0b0cb7b, 0x5454fca8, 0xbbbbd66d, 0x16163a2c];

    // Transformations for decryption
    var T5 = [0x51f4a750, 0x7e416553, 0x1a17a4c3, 0x3a275e96, 0x3bab6bcb, 0x1f9d45f1, 0xacfa58ab, 0x4be30393, 0x2030fa55, 0xad766df6, 0x88cc7691, 0xf5024c25, 0x4fe5d7fc, 0xc52acbd7, 0x26354480, 0xb562a38f, 0xdeb15a49, 0x25ba1b67, 0x45ea0e98, 0x5dfec0e1, 0xc32f7502, 0x814cf012, 0x8d4697a3, 0x6bd3f9c6, 0x038f5fe7, 0x15929c95, 0xbf6d7aeb, 0x955259da, 0xd4be832d, 0x587421d3, 0x49e06929, 0x8ec9c844, 0x75c2896a, 0xf48e7978, 0x99583e6b, 0x27b971dd, 0xbee14fb6, 0xf088ad17, 0xc920ac66, 0x7dce3ab4, 0x63df4a18, 0xe51a3182, 0x97513360, 0x62537f45, 0xb16477e0, 0xbb6bae84, 0xfe81a01c, 0xf9082b94, 0x70486858, 0x8f45fd19, 0x94de6c87, 0x527bf8b7, 0xab73d323, 0x724b02e2, 0xe31f8f57, 0x6655ab2a, 0xb2eb2807, 0x2fb5c203, 0x86c57b9a, 0xd33708a5, 0x302887f2, 0x23bfa5b2, 0x02036aba, 0xed16825c, 0x8acf1c2b, 0xa779b492, 0xf307f2f0, 0x4e69e2a1, 0x65daf4cd, 0x0605bed5, 0xd134621f, 0xc4a6fe8a, 0x342e539d, 0xa2f355a0, 0x058ae132, 0xa4f6eb75, 0x0b83ec39, 0x4060efaa, 0x5e719f06, 0xbd6e1051, 0x3e218af9, 0x96dd063d, 0xdd3e05ae, 0x4de6bd46, 0x91548db5, 0x71c45d05, 0x0406d46f, 0x605015ff, 0x1998fb24, 0xd6bde997, 0x894043cc, 0x67d99e77, 0xb0e842bd, 0x07898b88, 0xe7195b38, 0x79c8eedb, 0xa17c0a47, 0x7c420fe9, 0xf8841ec9, 0x00000000, 0x09808683, 0x322bed48, 0x1e1170ac, 0x6c5a724e, 0xfd0efffb, 0x0f853856, 0x3daed51e, 0x362d3927, 0x0a0fd964, 0x685ca621, 0x9b5b54d1, 0x24362e3a, 0x0c0a67b1, 0x9357e70f, 0xb4ee96d2, 0x1b9b919e, 0x80c0c54f, 0x61dc20a2, 0x5a774b69, 0x1c121a16, 0xe293ba0a, 0xc0a02ae5, 0x3c22e043, 0x121b171d, 0x0e090d0b, 0xf28bc7ad, 0x2db6a8b9, 0x141ea9c8, 0x57f11985, 0xaf75074c, 0xee99ddbb, 0xa37f60fd, 0xf701269f, 0x5c72f5bc, 0x44663bc5, 0x5bfb7e34, 0x8b432976, 0xcb23c6dc, 0xb6edfc68, 0xb8e4f163, 0xd731dcca, 0x42638510, 0x13972240, 0x84c61120, 0x854a247d, 0xd2bb3df8, 0xaef93211, 0xc729a16d, 0x1d9e2f4b, 0xdcb230f3, 0x0d8652ec, 0x77c1e3d0, 0x2bb3166c, 0xa970b999, 0x119448fa, 0x47e96422, 0xa8fc8cc4, 0xa0f03f1a, 0x567d2cd8, 0x223390ef, 0x87494ec7, 0xd938d1c1, 0x8ccaa2fe, 0x98d40b36, 0xa6f581cf, 0xa57ade28, 0xdab78e26, 0x3fadbfa4, 0x2c3a9de4, 0x5078920d, 0x6a5fcc9b, 0x547e4662, 0xf68d13c2, 0x90d8b8e8, 0x2e39f75e, 0x82c3aff5, 0x9f5d80be, 0x69d0937c, 0x6fd52da9, 0xcf2512b3, 0xc8ac993b, 0x10187da7, 0xe89c636e, 0xdb3bbb7b, 0xcd267809, 0x6e5918f4, 0xec9ab701, 0x834f9aa8, 0xe6956e65, 0xaaffe67e, 0x21bccf08, 0xef15e8e6, 0xbae79bd9, 0x4a6f36ce, 0xea9f09d4, 0x29b07cd6, 0x31a4b2af, 0x2a3f2331, 0xc6a59430, 0x35a266c0, 0x744ebc37, 0xfc82caa6, 0xe090d0b0, 0x33a7d815, 0xf104984a, 0x41ecdaf7, 0x7fcd500e, 0x1791f62f, 0x764dd68d, 0x43efb04d, 0xccaa4d54, 0xe49604df, 0x9ed1b5e3, 0x4c6a881b, 0xc12c1fb8, 0x4665517f, 0x9d5eea04, 0x018c355d, 0xfa877473, 0xfb0b412e, 0xb3671d5a, 0x92dbd252, 0xe9105633, 0x6dd64713, 0x9ad7618c, 0x37a10c7a, 0x59f8148e, 0xeb133c89, 0xcea927ee, 0xb761c935, 0xe11ce5ed, 0x7a47b13c, 0x9cd2df59, 0x55f2733f, 0x1814ce79, 0x73c737bf, 0x53f7cdea, 0x5ffdaa5b, 0xdf3d6f14, 0x7844db86, 0xcaaff381, 0xb968c43e, 0x3824342c, 0xc2a3405f, 0x161dc372, 0xbce2250c, 0x283c498b, 0xff0d9541, 0x39a80171, 0x080cb3de, 0xd8b4e49c, 0x6456c190, 0x7bcb8461, 0xd532b670, 0x486c5c74, 0xd0b85742];
    var T6 = [0x5051f4a7, 0x537e4165, 0xc31a17a4, 0x963a275e, 0xcb3bab6b, 0xf11f9d45, 0xabacfa58, 0x934be303, 0x552030fa, 0xf6ad766d, 0x9188cc76, 0x25f5024c, 0xfc4fe5d7, 0xd7c52acb, 0x80263544, 0x8fb562a3, 0x49deb15a, 0x6725ba1b, 0x9845ea0e, 0xe15dfec0, 0x02c32f75, 0x12814cf0, 0xa38d4697, 0xc66bd3f9, 0xe7038f5f, 0x9515929c, 0xebbf6d7a, 0xda955259, 0x2dd4be83, 0xd3587421, 0x2949e069, 0x448ec9c8, 0x6a75c289, 0x78f48e79, 0x6b99583e, 0xdd27b971, 0xb6bee14f, 0x17f088ad, 0x66c920ac, 0xb47dce3a, 0x1863df4a, 0x82e51a31, 0x60975133, 0x4562537f, 0xe0b16477, 0x84bb6bae, 0x1cfe81a0, 0x94f9082b, 0x58704868, 0x198f45fd, 0x8794de6c, 0xb7527bf8, 0x23ab73d3, 0xe2724b02, 0x57e31f8f, 0x2a6655ab, 0x07b2eb28, 0x032fb5c2, 0x9a86c57b, 0xa5d33708, 0xf2302887, 0xb223bfa5, 0xba02036a, 0x5ced1682, 0x2b8acf1c, 0x92a779b4, 0xf0f307f2, 0xa14e69e2, 0xcd65daf4, 0xd50605be, 0x1fd13462, 0x8ac4a6fe, 0x9d342e53, 0xa0a2f355, 0x32058ae1, 0x75a4f6eb, 0x390b83ec, 0xaa4060ef, 0x065e719f, 0x51bd6e10, 0xf93e218a, 0x3d96dd06, 0xaedd3e05, 0x464de6bd, 0xb591548d, 0x0571c45d, 0x6f0406d4, 0xff605015, 0x241998fb, 0x97d6bde9, 0xcc894043, 0x7767d99e, 0xbdb0e842, 0x8807898b, 0x38e7195b, 0xdb79c8ee, 0x47a17c0a, 0xe97c420f, 0xc9f8841e, 0x00000000, 0x83098086, 0x48322bed, 0xac1e1170, 0x4e6c5a72, 0xfbfd0eff, 0x560f8538, 0x1e3daed5, 0x27362d39, 0x640a0fd9, 0x21685ca6, 0xd19b5b54, 0x3a24362e, 0xb10c0a67, 0x0f9357e7, 0xd2b4ee96, 0x9e1b9b91, 0x4f80c0c5, 0xa261dc20, 0x695a774b, 0x161c121a, 0x0ae293ba, 0xe5c0a02a, 0x433c22e0, 0x1d121b17, 0x0b0e090d, 0xadf28bc7, 0xb92db6a8, 0xc8141ea9, 0x8557f119, 0x4caf7507, 0xbbee99dd, 0xfda37f60, 0x9ff70126, 0xbc5c72f5, 0xc544663b, 0x345bfb7e, 0x768b4329, 0xdccb23c6, 0x68b6edfc, 0x63b8e4f1, 0xcad731dc, 0x10426385, 0x40139722, 0x2084c611, 0x7d854a24, 0xf8d2bb3d, 0x11aef932, 0x6dc729a1, 0x4b1d9e2f, 0xf3dcb230, 0xec0d8652, 0xd077c1e3, 0x6c2bb316, 0x99a970b9, 0xfa119448, 0x2247e964, 0xc4a8fc8c, 0x1aa0f03f, 0xd8567d2c, 0xef223390, 0xc787494e, 0xc1d938d1, 0xfe8ccaa2, 0x3698d40b, 0xcfa6f581, 0x28a57ade, 0x26dab78e, 0xa43fadbf, 0xe42c3a9d, 0x0d507892, 0x9b6a5fcc, 0x62547e46, 0xc2f68d13, 0xe890d8b8, 0x5e2e39f7, 0xf582c3af, 0xbe9f5d80, 0x7c69d093, 0xa96fd52d, 0xb3cf2512, 0x3bc8ac99, 0xa710187d, 0x6ee89c63, 0x7bdb3bbb, 0x09cd2678, 0xf46e5918, 0x01ec9ab7, 0xa8834f9a, 0x65e6956e, 0x7eaaffe6, 0x0821bccf, 0xe6ef15e8, 0xd9bae79b, 0xce4a6f36, 0xd4ea9f09, 0xd629b07c, 0xaf31a4b2, 0x312a3f23, 0x30c6a594, 0xc035a266, 0x37744ebc, 0xa6fc82ca, 0xb0e090d0, 0x1533a7d8, 0x4af10498, 0xf741ecda, 0x0e7fcd50, 0x2f1791f6, 0x8d764dd6, 0x4d43efb0, 0x54ccaa4d, 0xdfe49604, 0xe39ed1b5, 0x1b4c6a88, 0xb8c12c1f, 0x7f466551, 0x049d5eea, 0x5d018c35, 0x73fa8774, 0x2efb0b41, 0x5ab3671d, 0x5292dbd2, 0x33e91056, 0x136dd647, 0x8c9ad761, 0x7a37a10c, 0x8e59f814, 0x89eb133c, 0xeecea927, 0x35b761c9, 0xede11ce5, 0x3c7a47b1, 0x599cd2df, 0x3f55f273, 0x791814ce, 0xbf73c737, 0xea53f7cd, 0x5b5ffdaa, 0x14df3d6f, 0x867844db, 0x81caaff3, 0x3eb968c4, 0x2c382434, 0x5fc2a340, 0x72161dc3, 0x0cbce225, 0x8b283c49, 0x41ff0d95, 0x7139a801, 0xde080cb3, 0x9cd8b4e4, 0x906456c1, 0x617bcb84, 0x70d532b6, 0x74486c5c, 0x42d0b857];
    var T7 = [0xa75051f4, 0x65537e41, 0xa4c31a17, 0x5e963a27, 0x6bcb3bab, 0x45f11f9d, 0x58abacfa, 0x03934be3, 0xfa552030, 0x6df6ad76, 0x769188cc, 0x4c25f502, 0xd7fc4fe5, 0xcbd7c52a, 0x44802635, 0xa38fb562, 0x5a49deb1, 0x1b6725ba, 0x0e9845ea, 0xc0e15dfe, 0x7502c32f, 0xf012814c, 0x97a38d46, 0xf9c66bd3, 0x5fe7038f, 0x9c951592, 0x7aebbf6d, 0x59da9552, 0x832dd4be, 0x21d35874, 0x692949e0, 0xc8448ec9, 0x896a75c2, 0x7978f48e, 0x3e6b9958, 0x71dd27b9, 0x4fb6bee1, 0xad17f088, 0xac66c920, 0x3ab47dce, 0x4a1863df, 0x3182e51a, 0x33609751, 0x7f456253, 0x77e0b164, 0xae84bb6b, 0xa01cfe81, 0x2b94f908, 0x68587048, 0xfd198f45, 0x6c8794de, 0xf8b7527b, 0xd323ab73, 0x02e2724b, 0x8f57e31f, 0xab2a6655, 0x2807b2eb, 0xc2032fb5, 0x7b9a86c5, 0x08a5d337, 0x87f23028, 0xa5b223bf, 0x6aba0203, 0x825ced16, 0x1c2b8acf, 0xb492a779, 0xf2f0f307, 0xe2a14e69, 0xf4cd65da, 0xbed50605, 0x621fd134, 0xfe8ac4a6, 0x539d342e, 0x55a0a2f3, 0xe132058a, 0xeb75a4f6, 0xec390b83, 0xefaa4060, 0x9f065e71, 0x1051bd6e, 0x8af93e21, 0x063d96dd, 0x05aedd3e, 0xbd464de6, 0x8db59154, 0x5d0571c4, 0xd46f0406, 0x15ff6050, 0xfb241998, 0xe997d6bd, 0x43cc8940, 0x9e7767d9, 0x42bdb0e8, 0x8b880789, 0x5b38e719, 0xeedb79c8, 0x0a47a17c, 0x0fe97c42, 0x1ec9f884, 0x00000000, 0x86830980, 0xed48322b, 0x70ac1e11, 0x724e6c5a, 0xfffbfd0e, 0x38560f85, 0xd51e3dae, 0x3927362d, 0xd9640a0f, 0xa621685c, 0x54d19b5b, 0x2e3a2436, 0x67b10c0a, 0xe70f9357, 0x96d2b4ee, 0x919e1b9b, 0xc54f80c0, 0x20a261dc, 0x4b695a77, 0x1a161c12, 0xba0ae293, 0x2ae5c0a0, 0xe0433c22, 0x171d121b, 0x0d0b0e09, 0xc7adf28b, 0xa8b92db6, 0xa9c8141e, 0x198557f1, 0x074caf75, 0xddbbee99, 0x60fda37f, 0x269ff701, 0xf5bc5c72, 0x3bc54466, 0x7e345bfb, 0x29768b43, 0xc6dccb23, 0xfc68b6ed, 0xf163b8e4, 0xdccad731, 0x85104263, 0x22401397, 0x112084c6, 0x247d854a, 0x3df8d2bb, 0x3211aef9, 0xa16dc729, 0x2f4b1d9e, 0x30f3dcb2, 0x52ec0d86, 0xe3d077c1, 0x166c2bb3, 0xb999a970, 0x48fa1194, 0x642247e9, 0x8cc4a8fc, 0x3f1aa0f0, 0x2cd8567d, 0x90ef2233, 0x4ec78749, 0xd1c1d938, 0xa2fe8cca, 0x0b3698d4, 0x81cfa6f5, 0xde28a57a, 0x8e26dab7, 0xbfa43fad, 0x9de42c3a, 0x920d5078, 0xcc9b6a5f, 0x4662547e, 0x13c2f68d, 0xb8e890d8, 0xf75e2e39, 0xaff582c3, 0x80be9f5d, 0x937c69d0, 0x2da96fd5, 0x12b3cf25, 0x993bc8ac, 0x7da71018, 0x636ee89c, 0xbb7bdb3b, 0x7809cd26, 0x18f46e59, 0xb701ec9a, 0x9aa8834f, 0x6e65e695, 0xe67eaaff, 0xcf0821bc, 0xe8e6ef15, 0x9bd9bae7, 0x36ce4a6f, 0x09d4ea9f, 0x7cd629b0, 0xb2af31a4, 0x23312a3f, 0x9430c6a5, 0x66c035a2, 0xbc37744e, 0xcaa6fc82, 0xd0b0e090, 0xd81533a7, 0x984af104, 0xdaf741ec, 0x500e7fcd, 0xf62f1791, 0xd68d764d, 0xb04d43ef, 0x4d54ccaa, 0x04dfe496, 0xb5e39ed1, 0x881b4c6a, 0x1fb8c12c, 0x517f4665, 0xea049d5e, 0x355d018c, 0x7473fa87, 0x412efb0b, 0x1d5ab367, 0xd25292db, 0x5633e910, 0x47136dd6, 0x618c9ad7, 0x0c7a37a1, 0x148e59f8, 0x3c89eb13, 0x27eecea9, 0xc935b761, 0xe5ede11c, 0xb13c7a47, 0xdf599cd2, 0x733f55f2, 0xce791814, 0x37bf73c7, 0xcdea53f7, 0xaa5b5ffd, 0x6f14df3d, 0xdb867844, 0xf381caaf, 0xc43eb968, 0x342c3824, 0x405fc2a3, 0xc372161d, 0x250cbce2, 0x498b283c, 0x9541ff0d, 0x017139a8, 0xb3de080c, 0xe49cd8b4, 0xc1906456, 0x84617bcb, 0xb670d532, 0x5c74486c, 0x5742d0b8];
    var T8 = [0xf4a75051, 0x4165537e, 0x17a4c31a, 0x275e963a, 0xab6bcb3b, 0x9d45f11f, 0xfa58abac, 0xe303934b, 0x30fa5520, 0x766df6ad, 0xcc769188, 0x024c25f5, 0xe5d7fc4f, 0x2acbd7c5, 0x35448026, 0x62a38fb5, 0xb15a49de, 0xba1b6725, 0xea0e9845, 0xfec0e15d, 0x2f7502c3, 0x4cf01281, 0x4697a38d, 0xd3f9c66b, 0x8f5fe703, 0x929c9515, 0x6d7aebbf, 0x5259da95, 0xbe832dd4, 0x7421d358, 0xe0692949, 0xc9c8448e, 0xc2896a75, 0x8e7978f4, 0x583e6b99, 0xb971dd27, 0xe14fb6be, 0x88ad17f0, 0x20ac66c9, 0xce3ab47d, 0xdf4a1863, 0x1a3182e5, 0x51336097, 0x537f4562, 0x6477e0b1, 0x6bae84bb, 0x81a01cfe, 0x082b94f9, 0x48685870, 0x45fd198f, 0xde6c8794, 0x7bf8b752, 0x73d323ab, 0x4b02e272, 0x1f8f57e3, 0x55ab2a66, 0xeb2807b2, 0xb5c2032f, 0xc57b9a86, 0x3708a5d3, 0x2887f230, 0xbfa5b223, 0x036aba02, 0x16825ced, 0xcf1c2b8a, 0x79b492a7, 0x07f2f0f3, 0x69e2a14e, 0xdaf4cd65, 0x05bed506, 0x34621fd1, 0xa6fe8ac4, 0x2e539d34, 0xf355a0a2, 0x8ae13205, 0xf6eb75a4, 0x83ec390b, 0x60efaa40, 0x719f065e, 0x6e1051bd, 0x218af93e, 0xdd063d96, 0x3e05aedd, 0xe6bd464d, 0x548db591, 0xc45d0571, 0x06d46f04, 0x5015ff60, 0x98fb2419, 0xbde997d6, 0x4043cc89, 0xd99e7767, 0xe842bdb0, 0x898b8807, 0x195b38e7, 0xc8eedb79, 0x7c0a47a1, 0x420fe97c, 0x841ec9f8, 0x00000000, 0x80868309, 0x2bed4832, 0x1170ac1e, 0x5a724e6c, 0x0efffbfd, 0x8538560f, 0xaed51e3d, 0x2d392736, 0x0fd9640a, 0x5ca62168, 0x5b54d19b, 0x362e3a24, 0x0a67b10c, 0x57e70f93, 0xee96d2b4, 0x9b919e1b, 0xc0c54f80, 0xdc20a261, 0x774b695a, 0x121a161c, 0x93ba0ae2, 0xa02ae5c0, 0x22e0433c, 0x1b171d12, 0x090d0b0e, 0x8bc7adf2, 0xb6a8b92d, 0x1ea9c814, 0xf1198557, 0x75074caf, 0x99ddbbee, 0x7f60fda3, 0x01269ff7, 0x72f5bc5c, 0x663bc544, 0xfb7e345b, 0x4329768b, 0x23c6dccb, 0xedfc68b6, 0xe4f163b8, 0x31dccad7, 0x63851042, 0x97224013, 0xc6112084, 0x4a247d85, 0xbb3df8d2, 0xf93211ae, 0x29a16dc7, 0x9e2f4b1d, 0xb230f3dc, 0x8652ec0d, 0xc1e3d077, 0xb3166c2b, 0x70b999a9, 0x9448fa11, 0xe9642247, 0xfc8cc4a8, 0xf03f1aa0, 0x7d2cd856, 0x3390ef22, 0x494ec787, 0x38d1c1d9, 0xcaa2fe8c, 0xd40b3698, 0xf581cfa6, 0x7ade28a5, 0xb78e26da, 0xadbfa43f, 0x3a9de42c, 0x78920d50, 0x5fcc9b6a, 0x7e466254, 0x8d13c2f6, 0xd8b8e890, 0x39f75e2e, 0xc3aff582, 0x5d80be9f, 0xd0937c69, 0xd52da96f, 0x2512b3cf, 0xac993bc8, 0x187da710, 0x9c636ee8, 0x3bbb7bdb, 0x267809cd, 0x5918f46e, 0x9ab701ec, 0x4f9aa883, 0x956e65e6, 0xffe67eaa, 0xbccf0821, 0x15e8e6ef, 0xe79bd9ba, 0x6f36ce4a, 0x9f09d4ea, 0xb07cd629, 0xa4b2af31, 0x3f23312a, 0xa59430c6, 0xa266c035, 0x4ebc3774, 0x82caa6fc, 0x90d0b0e0, 0xa7d81533, 0x04984af1, 0xecdaf741, 0xcd500e7f, 0x91f62f17, 0x4dd68d76, 0xefb04d43, 0xaa4d54cc, 0x9604dfe4, 0xd1b5e39e, 0x6a881b4c, 0x2c1fb8c1, 0x65517f46, 0x5eea049d, 0x8c355d01, 0x877473fa, 0x0b412efb, 0x671d5ab3, 0xdbd25292, 0x105633e9, 0xd647136d, 0xd7618c9a, 0xa10c7a37, 0xf8148e59, 0x133c89eb, 0xa927eece, 0x61c935b7, 0x1ce5ede1, 0x47b13c7a, 0xd2df599c, 0xf2733f55, 0x14ce7918, 0xc737bf73, 0xf7cdea53, 0xfdaa5b5f, 0x3d6f14df, 0x44db8678, 0xaff381ca, 0x68c43eb9, 0x24342c38, 0xa3405fc2, 0x1dc37216, 0xe2250cbc, 0x3c498b28, 0x0d9541ff, 0xa8017139, 0x0cb3de08, 0xb4e49cd8, 0x56c19064, 0xcb84617b, 0x32b670d5, 0x6c5c7448, 0xb85742d0];

    // Transformations for decryption key expansion
    var U1 = [0x00000000, 0x0e090d0b, 0x1c121a16, 0x121b171d, 0x3824342c, 0x362d3927, 0x24362e3a, 0x2a3f2331, 0x70486858, 0x7e416553, 0x6c5a724e, 0x62537f45, 0x486c5c74, 0x4665517f, 0x547e4662, 0x5a774b69, 0xe090d0b0, 0xee99ddbb, 0xfc82caa6, 0xf28bc7ad, 0xd8b4e49c, 0xd6bde997, 0xc4a6fe8a, 0xcaaff381, 0x90d8b8e8, 0x9ed1b5e3, 0x8ccaa2fe, 0x82c3aff5, 0xa8fc8cc4, 0xa6f581cf, 0xb4ee96d2, 0xbae79bd9, 0xdb3bbb7b, 0xd532b670, 0xc729a16d, 0xc920ac66, 0xe31f8f57, 0xed16825c, 0xff0d9541, 0xf104984a, 0xab73d323, 0xa57ade28, 0xb761c935, 0xb968c43e, 0x9357e70f, 0x9d5eea04, 0x8f45fd19, 0x814cf012, 0x3bab6bcb, 0x35a266c0, 0x27b971dd, 0x29b07cd6, 0x038f5fe7, 0x0d8652ec, 0x1f9d45f1, 0x119448fa, 0x4be30393, 0x45ea0e98, 0x57f11985, 0x59f8148e, 0x73c737bf, 0x7dce3ab4, 0x6fd52da9, 0x61dc20a2, 0xad766df6, 0xa37f60fd, 0xb16477e0, 0xbf6d7aeb, 0x955259da, 0x9b5b54d1, 0x894043cc, 0x87494ec7, 0xdd3e05ae, 0xd33708a5, 0xc12c1fb8, 0xcf2512b3, 0xe51a3182, 0xeb133c89, 0xf9082b94, 0xf701269f, 0x4de6bd46, 0x43efb04d, 0x51f4a750, 0x5ffdaa5b, 0x75c2896a, 0x7bcb8461, 0x69d0937c, 0x67d99e77, 0x3daed51e, 0x33a7d815, 0x21bccf08, 0x2fb5c203, 0x058ae132, 0x0b83ec39, 0x1998fb24, 0x1791f62f, 0x764dd68d, 0x7844db86, 0x6a5fcc9b, 0x6456c190, 0x4e69e2a1, 0x4060efaa, 0x527bf8b7, 0x5c72f5bc, 0x0605bed5, 0x080cb3de, 0x1a17a4c3, 0x141ea9c8, 0x3e218af9, 0x302887f2, 0x223390ef, 0x2c3a9de4, 0x96dd063d, 0x98d40b36, 0x8acf1c2b, 0x84c61120, 0xaef93211, 0xa0f03f1a, 0xb2eb2807, 0xbce2250c, 0xe6956e65, 0xe89c636e, 0xfa877473, 0xf48e7978, 0xdeb15a49, 0xd0b85742, 0xc2a3405f, 0xccaa4d54, 0x41ecdaf7, 0x4fe5d7fc, 0x5dfec0e1, 0x53f7cdea, 0x79c8eedb, 0x77c1e3d0, 0x65daf4cd, 0x6bd3f9c6, 0x31a4b2af, 0x3fadbfa4, 0x2db6a8b9, 0x23bfa5b2, 0x09808683, 0x07898b88, 0x15929c95, 0x1b9b919e, 0xa17c0a47, 0xaf75074c, 0xbd6e1051, 0xb3671d5a, 0x99583e6b, 0x97513360, 0x854a247d, 0x8b432976, 0xd134621f, 0xdf3d6f14, 0xcd267809, 0xc32f7502, 0xe9105633, 0xe7195b38, 0xf5024c25, 0xfb0b412e, 0x9ad7618c, 0x94de6c87, 0x86c57b9a, 0x88cc7691, 0xa2f355a0, 0xacfa58ab, 0xbee14fb6, 0xb0e842bd, 0xea9f09d4, 0xe49604df, 0xf68d13c2, 0xf8841ec9, 0xd2bb3df8, 0xdcb230f3, 0xcea927ee, 0xc0a02ae5, 0x7a47b13c, 0x744ebc37, 0x6655ab2a, 0x685ca621, 0x42638510, 0x4c6a881b, 0x5e719f06, 0x5078920d, 0x0a0fd964, 0x0406d46f, 0x161dc372, 0x1814ce79, 0x322bed48, 0x3c22e043, 0x2e39f75e, 0x2030fa55, 0xec9ab701, 0xe293ba0a, 0xf088ad17, 0xfe81a01c, 0xd4be832d, 0xdab78e26, 0xc8ac993b, 0xc6a59430, 0x9cd2df59, 0x92dbd252, 0x80c0c54f, 0x8ec9c844, 0xa4f6eb75, 0xaaffe67e, 0xb8e4f163, 0xb6edfc68, 0x0c0a67b1, 0x02036aba, 0x10187da7, 0x1e1170ac, 0x342e539d, 0x3a275e96, 0x283c498b, 0x26354480, 0x7c420fe9, 0x724b02e2, 0x605015ff, 0x6e5918f4, 0x44663bc5, 0x4a6f36ce, 0x587421d3, 0x567d2cd8, 0x37a10c7a, 0x39a80171, 0x2bb3166c, 0x25ba1b67, 0x0f853856, 0x018c355d, 0x13972240, 0x1d9e2f4b, 0x47e96422, 0x49e06929, 0x5bfb7e34, 0x55f2733f, 0x7fcd500e, 0x71c45d05, 0x63df4a18, 0x6dd64713, 0xd731dcca, 0xd938d1c1, 0xcb23c6dc, 0xc52acbd7, 0xef15e8e6, 0xe11ce5ed, 0xf307f2f0, 0xfd0efffb, 0xa779b492, 0xa970b999, 0xbb6bae84, 0xb562a38f, 0x9f5d80be, 0x91548db5, 0x834f9aa8, 0x8d4697a3];
    var U2 = [0x00000000, 0x0b0e090d, 0x161c121a, 0x1d121b17, 0x2c382434, 0x27362d39, 0x3a24362e, 0x312a3f23, 0x58704868, 0x537e4165, 0x4e6c5a72, 0x4562537f, 0x74486c5c, 0x7f466551, 0x62547e46, 0x695a774b, 0xb0e090d0, 0xbbee99dd, 0xa6fc82ca, 0xadf28bc7, 0x9cd8b4e4, 0x97d6bde9, 0x8ac4a6fe, 0x81caaff3, 0xe890d8b8, 0xe39ed1b5, 0xfe8ccaa2, 0xf582c3af, 0xc4a8fc8c, 0xcfa6f581, 0xd2b4ee96, 0xd9bae79b, 0x7bdb3bbb, 0x70d532b6, 0x6dc729a1, 0x66c920ac, 0x57e31f8f, 0x5ced1682, 0x41ff0d95, 0x4af10498, 0x23ab73d3, 0x28a57ade, 0x35b761c9, 0x3eb968c4, 0x0f9357e7, 0x049d5eea, 0x198f45fd, 0x12814cf0, 0xcb3bab6b, 0xc035a266, 0xdd27b971, 0xd629b07c, 0xe7038f5f, 0xec0d8652, 0xf11f9d45, 0xfa119448, 0x934be303, 0x9845ea0e, 0x8557f119, 0x8e59f814, 0xbf73c737, 0xb47dce3a, 0xa96fd52d, 0xa261dc20, 0xf6ad766d, 0xfda37f60, 0xe0b16477, 0xebbf6d7a, 0xda955259, 0xd19b5b54, 0xcc894043, 0xc787494e, 0xaedd3e05, 0xa5d33708, 0xb8c12c1f, 0xb3cf2512, 0x82e51a31, 0x89eb133c, 0x94f9082b, 0x9ff70126, 0x464de6bd, 0x4d43efb0, 0x5051f4a7, 0x5b5ffdaa, 0x6a75c289, 0x617bcb84, 0x7c69d093, 0x7767d99e, 0x1e3daed5, 0x1533a7d8, 0x0821bccf, 0x032fb5c2, 0x32058ae1, 0x390b83ec, 0x241998fb, 0x2f1791f6, 0x8d764dd6, 0x867844db, 0x9b6a5fcc, 0x906456c1, 0xa14e69e2, 0xaa4060ef, 0xb7527bf8, 0xbc5c72f5, 0xd50605be, 0xde080cb3, 0xc31a17a4, 0xc8141ea9, 0xf93e218a, 0xf2302887, 0xef223390, 0xe42c3a9d, 0x3d96dd06, 0x3698d40b, 0x2b8acf1c, 0x2084c611, 0x11aef932, 0x1aa0f03f, 0x07b2eb28, 0x0cbce225, 0x65e6956e, 0x6ee89c63, 0x73fa8774, 0x78f48e79, 0x49deb15a, 0x42d0b857, 0x5fc2a340, 0x54ccaa4d, 0xf741ecda, 0xfc4fe5d7, 0xe15dfec0, 0xea53f7cd, 0xdb79c8ee, 0xd077c1e3, 0xcd65daf4, 0xc66bd3f9, 0xaf31a4b2, 0xa43fadbf, 0xb92db6a8, 0xb223bfa5, 0x83098086, 0x8807898b, 0x9515929c, 0x9e1b9b91, 0x47a17c0a, 0x4caf7507, 0x51bd6e10, 0x5ab3671d, 0x6b99583e, 0x60975133, 0x7d854a24, 0x768b4329, 0x1fd13462, 0x14df3d6f, 0x09cd2678, 0x02c32f75, 0x33e91056, 0x38e7195b, 0x25f5024c, 0x2efb0b41, 0x8c9ad761, 0x8794de6c, 0x9a86c57b, 0x9188cc76, 0xa0a2f355, 0xabacfa58, 0xb6bee14f, 0xbdb0e842, 0xd4ea9f09, 0xdfe49604, 0xc2f68d13, 0xc9f8841e, 0xf8d2bb3d, 0xf3dcb230, 0xeecea927, 0xe5c0a02a, 0x3c7a47b1, 0x37744ebc, 0x2a6655ab, 0x21685ca6, 0x10426385, 0x1b4c6a88, 0x065e719f, 0x0d507892, 0x640a0fd9, 0x6f0406d4, 0x72161dc3, 0x791814ce, 0x48322bed, 0x433c22e0, 0x5e2e39f7, 0x552030fa, 0x01ec9ab7, 0x0ae293ba, 0x17f088ad, 0x1cfe81a0, 0x2dd4be83, 0x26dab78e, 0x3bc8ac99, 0x30c6a594, 0x599cd2df, 0x5292dbd2, 0x4f80c0c5, 0x448ec9c8, 0x75a4f6eb, 0x7eaaffe6, 0x63b8e4f1, 0x68b6edfc, 0xb10c0a67, 0xba02036a, 0xa710187d, 0xac1e1170, 0x9d342e53, 0x963a275e, 0x8b283c49, 0x80263544, 0xe97c420f, 0xe2724b02, 0xff605015, 0xf46e5918, 0xc544663b, 0xce4a6f36, 0xd3587421, 0xd8567d2c, 0x7a37a10c, 0x7139a801, 0x6c2bb316, 0x6725ba1b, 0x560f8538, 0x5d018c35, 0x40139722, 0x4b1d9e2f, 0x2247e964, 0x2949e069, 0x345bfb7e, 0x3f55f273, 0x0e7fcd50, 0x0571c45d, 0x1863df4a, 0x136dd647, 0xcad731dc, 0xc1d938d1, 0xdccb23c6, 0xd7c52acb, 0xe6ef15e8, 0xede11ce5, 0xf0f307f2, 0xfbfd0eff, 0x92a779b4, 0x99a970b9, 0x84bb6bae, 0x8fb562a3, 0xbe9f5d80, 0xb591548d, 0xa8834f9a, 0xa38d4697];
    var U3 = [0x00000000, 0x0d0b0e09, 0x1a161c12, 0x171d121b, 0x342c3824, 0x3927362d, 0x2e3a2436, 0x23312a3f, 0x68587048, 0x65537e41, 0x724e6c5a, 0x7f456253, 0x5c74486c, 0x517f4665, 0x4662547e, 0x4b695a77, 0xd0b0e090, 0xddbbee99, 0xcaa6fc82, 0xc7adf28b, 0xe49cd8b4, 0xe997d6bd, 0xfe8ac4a6, 0xf381caaf, 0xb8e890d8, 0xb5e39ed1, 0xa2fe8cca, 0xaff582c3, 0x8cc4a8fc, 0x81cfa6f5, 0x96d2b4ee, 0x9bd9bae7, 0xbb7bdb3b, 0xb670d532, 0xa16dc729, 0xac66c920, 0x8f57e31f, 0x825ced16, 0x9541ff0d, 0x984af104, 0xd323ab73, 0xde28a57a, 0xc935b761, 0xc43eb968, 0xe70f9357, 0xea049d5e, 0xfd198f45, 0xf012814c, 0x6bcb3bab, 0x66c035a2, 0x71dd27b9, 0x7cd629b0, 0x5fe7038f, 0x52ec0d86, 0x45f11f9d, 0x48fa1194, 0x03934be3, 0x0e9845ea, 0x198557f1, 0x148e59f8, 0x37bf73c7, 0x3ab47dce, 0x2da96fd5, 0x20a261dc, 0x6df6ad76, 0x60fda37f, 0x77e0b164, 0x7aebbf6d, 0x59da9552, 0x54d19b5b, 0x43cc8940, 0x4ec78749, 0x05aedd3e, 0x08a5d337, 0x1fb8c12c, 0x12b3cf25, 0x3182e51a, 0x3c89eb13, 0x2b94f908, 0x269ff701, 0xbd464de6, 0xb04d43ef, 0xa75051f4, 0xaa5b5ffd, 0x896a75c2, 0x84617bcb, 0x937c69d0, 0x9e7767d9, 0xd51e3dae, 0xd81533a7, 0xcf0821bc, 0xc2032fb5, 0xe132058a, 0xec390b83, 0xfb241998, 0xf62f1791, 0xd68d764d, 0xdb867844, 0xcc9b6a5f, 0xc1906456, 0xe2a14e69, 0xefaa4060, 0xf8b7527b, 0xf5bc5c72, 0xbed50605, 0xb3de080c, 0xa4c31a17, 0xa9c8141e, 0x8af93e21, 0x87f23028, 0x90ef2233, 0x9de42c3a, 0x063d96dd, 0x0b3698d4, 0x1c2b8acf, 0x112084c6, 0x3211aef9, 0x3f1aa0f0, 0x2807b2eb, 0x250cbce2, 0x6e65e695, 0x636ee89c, 0x7473fa87, 0x7978f48e, 0x5a49deb1, 0x5742d0b8, 0x405fc2a3, 0x4d54ccaa, 0xdaf741ec, 0xd7fc4fe5, 0xc0e15dfe, 0xcdea53f7, 0xeedb79c8, 0xe3d077c1, 0xf4cd65da, 0xf9c66bd3, 0xb2af31a4, 0xbfa43fad, 0xa8b92db6, 0xa5b223bf, 0x86830980, 0x8b880789, 0x9c951592, 0x919e1b9b, 0x0a47a17c, 0x074caf75, 0x1051bd6e, 0x1d5ab367, 0x3e6b9958, 0x33609751, 0x247d854a, 0x29768b43, 0x621fd134, 0x6f14df3d, 0x7809cd26, 0x7502c32f, 0x5633e910, 0x5b38e719, 0x4c25f502, 0x412efb0b, 0x618c9ad7, 0x6c8794de, 0x7b9a86c5, 0x769188cc, 0x55a0a2f3, 0x58abacfa, 0x4fb6bee1, 0x42bdb0e8, 0x09d4ea9f, 0x04dfe496, 0x13c2f68d, 0x1ec9f884, 0x3df8d2bb, 0x30f3dcb2, 0x27eecea9, 0x2ae5c0a0, 0xb13c7a47, 0xbc37744e, 0xab2a6655, 0xa621685c, 0x85104263, 0x881b4c6a, 0x9f065e71, 0x920d5078, 0xd9640a0f, 0xd46f0406, 0xc372161d, 0xce791814, 0xed48322b, 0xe0433c22, 0xf75e2e39, 0xfa552030, 0xb701ec9a, 0xba0ae293, 0xad17f088, 0xa01cfe81, 0x832dd4be, 0x8e26dab7, 0x993bc8ac, 0x9430c6a5, 0xdf599cd2, 0xd25292db, 0xc54f80c0, 0xc8448ec9, 0xeb75a4f6, 0xe67eaaff, 0xf163b8e4, 0xfc68b6ed, 0x67b10c0a, 0x6aba0203, 0x7da71018, 0x70ac1e11, 0x539d342e, 0x5e963a27, 0x498b283c, 0x44802635, 0x0fe97c42, 0x02e2724b, 0x15ff6050, 0x18f46e59, 0x3bc54466, 0x36ce4a6f, 0x21d35874, 0x2cd8567d, 0x0c7a37a1, 0x017139a8, 0x166c2bb3, 0x1b6725ba, 0x38560f85, 0x355d018c, 0x22401397, 0x2f4b1d9e, 0x642247e9, 0x692949e0, 0x7e345bfb, 0x733f55f2, 0x500e7fcd, 0x5d0571c4, 0x4a1863df, 0x47136dd6, 0xdccad731, 0xd1c1d938, 0xc6dccb23, 0xcbd7c52a, 0xe8e6ef15, 0xe5ede11c, 0xf2f0f307, 0xfffbfd0e, 0xb492a779, 0xb999a970, 0xae84bb6b, 0xa38fb562, 0x80be9f5d, 0x8db59154, 0x9aa8834f, 0x97a38d46];
    var U4 = [0x00000000, 0x090d0b0e, 0x121a161c, 0x1b171d12, 0x24342c38, 0x2d392736, 0x362e3a24, 0x3f23312a, 0x48685870, 0x4165537e, 0x5a724e6c, 0x537f4562, 0x6c5c7448, 0x65517f46, 0x7e466254, 0x774b695a, 0x90d0b0e0, 0x99ddbbee, 0x82caa6fc, 0x8bc7adf2, 0xb4e49cd8, 0xbde997d6, 0xa6fe8ac4, 0xaff381ca, 0xd8b8e890, 0xd1b5e39e, 0xcaa2fe8c, 0xc3aff582, 0xfc8cc4a8, 0xf581cfa6, 0xee96d2b4, 0xe79bd9ba, 0x3bbb7bdb, 0x32b670d5, 0x29a16dc7, 0x20ac66c9, 0x1f8f57e3, 0x16825ced, 0x0d9541ff, 0x04984af1, 0x73d323ab, 0x7ade28a5, 0x61c935b7, 0x68c43eb9, 0x57e70f93, 0x5eea049d, 0x45fd198f, 0x4cf01281, 0xab6bcb3b, 0xa266c035, 0xb971dd27, 0xb07cd629, 0x8f5fe703, 0x8652ec0d, 0x9d45f11f, 0x9448fa11, 0xe303934b, 0xea0e9845, 0xf1198557, 0xf8148e59, 0xc737bf73, 0xce3ab47d, 0xd52da96f, 0xdc20a261, 0x766df6ad, 0x7f60fda3, 0x6477e0b1, 0x6d7aebbf, 0x5259da95, 0x5b54d19b, 0x4043cc89, 0x494ec787, 0x3e05aedd, 0x3708a5d3, 0x2c1fb8c1, 0x2512b3cf, 0x1a3182e5, 0x133c89eb, 0x082b94f9, 0x01269ff7, 0xe6bd464d, 0xefb04d43, 0xf4a75051, 0xfdaa5b5f, 0xc2896a75, 0xcb84617b, 0xd0937c69, 0xd99e7767, 0xaed51e3d, 0xa7d81533, 0xbccf0821, 0xb5c2032f, 0x8ae13205, 0x83ec390b, 0x98fb2419, 0x91f62f17, 0x4dd68d76, 0x44db8678, 0x5fcc9b6a, 0x56c19064, 0x69e2a14e, 0x60efaa40, 0x7bf8b752, 0x72f5bc5c, 0x05bed506, 0x0cb3de08, 0x17a4c31a, 0x1ea9c814, 0x218af93e, 0x2887f230, 0x3390ef22, 0x3a9de42c, 0xdd063d96, 0xd40b3698, 0xcf1c2b8a, 0xc6112084, 0xf93211ae, 0xf03f1aa0, 0xeb2807b2, 0xe2250cbc, 0x956e65e6, 0x9c636ee8, 0x877473fa, 0x8e7978f4, 0xb15a49de, 0xb85742d0, 0xa3405fc2, 0xaa4d54cc, 0xecdaf741, 0xe5d7fc4f, 0xfec0e15d, 0xf7cdea53, 0xc8eedb79, 0xc1e3d077, 0xdaf4cd65, 0xd3f9c66b, 0xa4b2af31, 0xadbfa43f, 0xb6a8b92d, 0xbfa5b223, 0x80868309, 0x898b8807, 0x929c9515, 0x9b919e1b, 0x7c0a47a1, 0x75074caf, 0x6e1051bd, 0x671d5ab3, 0x583e6b99, 0x51336097, 0x4a247d85, 0x4329768b, 0x34621fd1, 0x3d6f14df, 0x267809cd, 0x2f7502c3, 0x105633e9, 0x195b38e7, 0x024c25f5, 0x0b412efb, 0xd7618c9a, 0xde6c8794, 0xc57b9a86, 0xcc769188, 0xf355a0a2, 0xfa58abac, 0xe14fb6be, 0xe842bdb0, 0x9f09d4ea, 0x9604dfe4, 0x8d13c2f6, 0x841ec9f8, 0xbb3df8d2, 0xb230f3dc, 0xa927eece, 0xa02ae5c0, 0x47b13c7a, 0x4ebc3774, 0x55ab2a66, 0x5ca62168, 0x63851042, 0x6a881b4c, 0x719f065e, 0x78920d50, 0x0fd9640a, 0x06d46f04, 0x1dc37216, 0x14ce7918, 0x2bed4832, 0x22e0433c, 0x39f75e2e, 0x30fa5520, 0x9ab701ec, 0x93ba0ae2, 0x88ad17f0, 0x81a01cfe, 0xbe832dd4, 0xb78e26da, 0xac993bc8, 0xa59430c6, 0xd2df599c, 0xdbd25292, 0xc0c54f80, 0xc9c8448e, 0xf6eb75a4, 0xffe67eaa, 0xe4f163b8, 0xedfc68b6, 0x0a67b10c, 0x036aba02, 0x187da710, 0x1170ac1e, 0x2e539d34, 0x275e963a, 0x3c498b28, 0x35448026, 0x420fe97c, 0x4b02e272, 0x5015ff60, 0x5918f46e, 0x663bc544, 0x6f36ce4a, 0x7421d358, 0x7d2cd856, 0xa10c7a37, 0xa8017139, 0xb3166c2b, 0xba1b6725, 0x8538560f, 0x8c355d01, 0x97224013, 0x9e2f4b1d, 0xe9642247, 0xe0692949, 0xfb7e345b, 0xf2733f55, 0xcd500e7f, 0xc45d0571, 0xdf4a1863, 0xd647136d, 0x31dccad7, 0x38d1c1d9, 0x23c6dccb, 0x2acbd7c5, 0x15e8e6ef, 0x1ce5ede1, 0x07f2f0f3, 0x0efffbfd, 0x79b492a7, 0x70b999a9, 0x6bae84bb, 0x62a38fb5, 0x5d80be9f, 0x548db591, 0x4f9aa883, 0x4697a38d];

    function convertToInt32(bytes) {
        var result = [];
        for (var i = 0; i < bytes.length; i += 4) {
            result.push(
                (bytes[i    ] << 24) |
                (bytes[i + 1] << 16) |
                (bytes[i + 2] <<  8) |
                 bytes[i + 3]
            );
        }
        return result;
    }

    var AES = function(key) {
        if (!(this instanceof AES)) {
            throw Error('AES must be instanitated with `new`');
        }

        Object.defineProperty(this, 'key', {
            value: coerceArray(key, true)
        });

        this._prepare();
    }


    AES.prototype._prepare = function() {

        var rounds = numberOfRounds[this.key.length];
        if (rounds == null) {
            throw new Error('invalid key size (must be 16, 24 or 32 bytes)');
        }

        // encryption round keys
        this._Ke = [];

        // decryption round keys
        this._Kd = [];

        for (var i = 0; i <= rounds; i++) {
            this._Ke.push([0, 0, 0, 0]);
            this._Kd.push([0, 0, 0, 0]);
        }

        var roundKeyCount = (rounds + 1) * 4;
        var KC = this.key.length / 4;

        // convert the key into ints
        var tk = convertToInt32(this.key);

        // copy values into round key arrays
        var index;
        for (var i = 0; i < KC; i++) {
            index = i >> 2;
            this._Ke[index][i % 4] = tk[i];
            this._Kd[rounds - index][i % 4] = tk[i];
        }

        // key expansion (fips-197 section 5.2)
        var rconpointer = 0;
        var t = KC, tt;
        while (t < roundKeyCount) {
            tt = tk[KC - 1];
            tk[0] ^= ((S[(tt >> 16) & 0xFF] << 24) ^
                      (S[(tt >>  8) & 0xFF] << 16) ^
                      (S[ tt        & 0xFF] <<  8) ^
                       S[(tt >> 24) & 0xFF]        ^
                      (rcon[rconpointer] << 24));
            rconpointer += 1;

            // key expansion (for non-256 bit)
            if (KC != 8) {
                for (var i = 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }

            // key expansion for 256-bit keys is "slightly different" (fips-197)
            } else {
                for (var i = 1; i < (KC / 2); i++) {
                    tk[i] ^= tk[i - 1];
                }
                tt = tk[(KC / 2) - 1];

                tk[KC / 2] ^= (S[ tt        & 0xFF]        ^
                              (S[(tt >>  8) & 0xFF] <<  8) ^
                              (S[(tt >> 16) & 0xFF] << 16) ^
                              (S[(tt >> 24) & 0xFF] << 24));

                for (var i = (KC / 2) + 1; i < KC; i++) {
                    tk[i] ^= tk[i - 1];
                }
            }

            // copy values into round key arrays
            var i = 0, r, c;
            while (i < KC && t < roundKeyCount) {
                r = t >> 2;
                c = t % 4;
                this._Ke[r][c] = tk[i];
                this._Kd[rounds - r][c] = tk[i++];
                t++;
            }
        }

        // inverse-cipher-ify the decryption round key (fips-197 section 5.3)
        for (var r = 1; r < rounds; r++) {
            for (var c = 0; c < 4; c++) {
                tt = this._Kd[r][c];
                this._Kd[r][c] = (U1[(tt >> 24) & 0xFF] ^
                                  U2[(tt >> 16) & 0xFF] ^
                                  U3[(tt >>  8) & 0xFF] ^
                                  U4[ tt        & 0xFF]);
            }
        }
    }

    AES.prototype.encrypt = function(plaintext) {
        if (plaintext.length != 16) {
            throw new Error('invalid plaintext size (must be 16 bytes)');
        }

        var rounds = this._Ke.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(plaintext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Ke[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T1[(t[ i         ] >> 24) & 0xff] ^
                        T2[(t[(i + 1) % 4] >> 16) & 0xff] ^
                        T3[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T4[ t[(i + 3) % 4]        & 0xff] ^
                        this._Ke[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Ke[rounds][i];
            result[4 * i    ] = (S[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (S[(t[(i + 1) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (S[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (S[ t[(i + 3) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    }

    AES.prototype.decrypt = function(ciphertext) {
        if (ciphertext.length != 16) {
            throw new Error('invalid ciphertext size (must be 16 bytes)');
        }

        var rounds = this._Kd.length - 1;
        var a = [0, 0, 0, 0];

        // convert plaintext to (ints ^ key)
        var t = convertToInt32(ciphertext);
        for (var i = 0; i < 4; i++) {
            t[i] ^= this._Kd[0][i];
        }

        // apply round transforms
        for (var r = 1; r < rounds; r++) {
            for (var i = 0; i < 4; i++) {
                a[i] = (T5[(t[ i          ] >> 24) & 0xff] ^
                        T6[(t[(i + 3) % 4] >> 16) & 0xff] ^
                        T7[(t[(i + 2) % 4] >>  8) & 0xff] ^
                        T8[ t[(i + 1) % 4]        & 0xff] ^
                        this._Kd[r][i]);
            }
            t = a.slice();
        }

        // the last round is special
        var result = createArray(16), tt;
        for (var i = 0; i < 4; i++) {
            tt = this._Kd[rounds][i];
            result[4 * i    ] = (Si[(t[ i         ] >> 24) & 0xff] ^ (tt >> 24)) & 0xff;
            result[4 * i + 1] = (Si[(t[(i + 3) % 4] >> 16) & 0xff] ^ (tt >> 16)) & 0xff;
            result[4 * i + 2] = (Si[(t[(i + 2) % 4] >>  8) & 0xff] ^ (tt >>  8)) & 0xff;
            result[4 * i + 3] = (Si[ t[(i + 1) % 4]        & 0xff] ^  tt       ) & 0xff;
        }

        return result;
    }


    /**
     *  Mode Of Operation - Electonic Codebook (ECB)
     */
    var ModeOfOperationECB = function(key) {
        if (!(this instanceof ModeOfOperationECB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Electronic Code Block";
        this.name = "ecb";

        this._aes = new AES(key);
    }

    ModeOfOperationECB.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);
            block = this._aes.encrypt(block);
            copyArray(block, ciphertext, i);
        }

        return ciphertext;
    }

    ModeOfOperationECB.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);
            copyArray(block, plaintext, i);
        }

        return plaintext;
    }


    /**
     *  Mode Of Operation - Cipher Block Chaining (CBC)
     */
    var ModeOfOperationCBC = function(key, iv) {
        if (!(this instanceof ModeOfOperationCBC)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Block Chaining";
        this.name = "cbc";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastCipherblock = coerceArray(iv, true);

        this._aes = new AES(key);
    }

    ModeOfOperationCBC.prototype.encrypt = function(plaintext) {
        plaintext = coerceArray(plaintext);

        if ((plaintext.length % 16) !== 0) {
            throw new Error('invalid plaintext size (must be multiple of 16 bytes)');
        }

        var ciphertext = createArray(plaintext.length);
        var block = createArray(16);

        for (var i = 0; i < plaintext.length; i += 16) {
            copyArray(plaintext, block, 0, i, i + 16);

            for (var j = 0; j < 16; j++) {
                block[j] ^= this._lastCipherblock[j];
            }

            this._lastCipherblock = this._aes.encrypt(block);
            copyArray(this._lastCipherblock, ciphertext, i);
        }

        return ciphertext;
    }

    ModeOfOperationCBC.prototype.decrypt = function(ciphertext) {
        ciphertext = coerceArray(ciphertext);

        if ((ciphertext.length % 16) !== 0) {
            throw new Error('invalid ciphertext size (must be multiple of 16 bytes)');
        }

        var plaintext = createArray(ciphertext.length);
        var block = createArray(16);

        for (var i = 0; i < ciphertext.length; i += 16) {
            copyArray(ciphertext, block, 0, i, i + 16);
            block = this._aes.decrypt(block);

            for (var j = 0; j < 16; j++) {
                plaintext[i + j] = block[j] ^ this._lastCipherblock[j];
            }

            copyArray(ciphertext, this._lastCipherblock, 0, i, i + 16);
        }

        return plaintext;
    }


    /**
     *  Mode Of Operation - Cipher Feedback (CFB)
     */
    var ModeOfOperationCFB = function(key, iv, segmentSize) {
        if (!(this instanceof ModeOfOperationCFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Cipher Feedback";
        this.name = "cfb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 size)');
        }

        if (!segmentSize) { segmentSize = 1; }

        this.segmentSize = segmentSize;

        this._shiftRegister = coerceArray(iv, true);

        this._aes = new AES(key);
    }

    ModeOfOperationCFB.prototype.encrypt = function(plaintext) {
        if ((plaintext.length % this.segmentSize) != 0) {
            throw new Error('invalid plaintext size (must be segmentSize bytes)');
        }

        var encrypted = coerceArray(plaintext, true);

        var xorSegment;
        for (var i = 0; i < encrypted.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);
            for (var j = 0; j < this.segmentSize; j++) {
                encrypted[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(encrypted, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return encrypted;
    }

    ModeOfOperationCFB.prototype.decrypt = function(ciphertext) {
        if ((ciphertext.length % this.segmentSize) != 0) {
            throw new Error('invalid ciphertext size (must be segmentSize bytes)');
        }

        var plaintext = coerceArray(ciphertext, true);

        var xorSegment;
        for (var i = 0; i < plaintext.length; i += this.segmentSize) {
            xorSegment = this._aes.encrypt(this._shiftRegister);

            for (var j = 0; j < this.segmentSize; j++) {
                plaintext[i + j] ^= xorSegment[j];
            }

            // Shift the register
            copyArray(this._shiftRegister, this._shiftRegister, 0, this.segmentSize);
            copyArray(ciphertext, this._shiftRegister, 16 - this.segmentSize, i, i + this.segmentSize);
        }

        return plaintext;
    }

    /**
     *  Mode Of Operation - Output Feedback (OFB)
     */
    var ModeOfOperationOFB = function(key, iv) {
        if (!(this instanceof ModeOfOperationOFB)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Output Feedback";
        this.name = "ofb";

        if (!iv) {
            iv = createArray(16);

        } else if (iv.length != 16) {
            throw new Error('invalid initialation vector size (must be 16 bytes)');
        }

        this._lastPrecipher = coerceArray(iv, true);
        this._lastPrecipherIndex = 16;

        this._aes = new AES(key);
    }

    ModeOfOperationOFB.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._lastPrecipherIndex === 16) {
                this._lastPrecipher = this._aes.encrypt(this._lastPrecipher);
                this._lastPrecipherIndex = 0;
            }
            encrypted[i] ^= this._lastPrecipher[this._lastPrecipherIndex++];
        }

        return encrypted;
    }

    // Decryption is symetric
    ModeOfOperationOFB.prototype.decrypt = ModeOfOperationOFB.prototype.encrypt;


    /**
     *  Counter object for CTR common mode of operation
     */
    var Counter = function(initialValue) {
        if (!(this instanceof Counter)) {
            throw Error('Counter must be instanitated with `new`');
        }

        // We allow 0, but anything false-ish uses the default 1
        if (initialValue !== 0 && !initialValue) { initialValue = 1; }

        if (typeof(initialValue) === 'number') {
            this._counter = createArray(16);
            this.setValue(initialValue);

        } else {
            this.setBytes(initialValue);
        }
    }

    Counter.prototype.setValue = function(value) {
        if (typeof(value) !== 'number' || parseInt(value) != value) {
            throw new Error('invalid counter value (must be an integer)');
        }

        // We cannot safely handle numbers beyond the safe range for integers
        if (value > Number.MAX_SAFE_INTEGER) {
            throw new Error('integer value out of safe range');
        }

        for (var index = 15; index >= 0; --index) {
            this._counter[index] = value % 256;
            value = parseInt(value / 256);
        }
    }

    Counter.prototype.setBytes = function(bytes) {
        bytes = coerceArray(bytes, true);

        if (bytes.length != 16) {
            throw new Error('invalid counter bytes size (must be 16 bytes)');
        }

        this._counter = bytes;
    };

    Counter.prototype.increment = function() {
        for (var i = 15; i >= 0; i--) {
            if (this._counter[i] === 255) {
                this._counter[i] = 0;
            } else {
                this._counter[i]++;
                break;
            }
        }
    }


    /**
     *  Mode Of Operation - Counter (CTR)
     */
    var ModeOfOperationCTR = function(key, counter) {
        if (!(this instanceof ModeOfOperationCTR)) {
            throw Error('AES must be instanitated with `new`');
        }

        this.description = "Counter";
        this.name = "ctr";

        if (!(counter instanceof Counter)) {
            counter = new Counter(counter)
        }

        this._counter = counter;

        this._remainingCounter = null;
        this._remainingCounterIndex = 16;

        this._aes = new AES(key);
    }

    ModeOfOperationCTR.prototype.encrypt = function(plaintext) {
        var encrypted = coerceArray(plaintext, true);

        for (var i = 0; i < encrypted.length; i++) {
            if (this._remainingCounterIndex === 16) {
                this._remainingCounter = this._aes.encrypt(this._counter._counter);
                this._remainingCounterIndex = 0;
                this._counter.increment();
            }
            encrypted[i] ^= this._remainingCounter[this._remainingCounterIndex++];
        }

        return encrypted;
    }

    // Decryption is symetric
    ModeOfOperationCTR.prototype.decrypt = ModeOfOperationCTR.prototype.encrypt;


    ///////////////////////
    // Padding

    // See:https://tools.ietf.org/html/rfc2315
    function pkcs7pad(data) {
        data = coerceArray(data, true);
        var padder = 16 - (data.length % 16);
        var result = createArray(data.length + padder);
        copyArray(data, result);
        for (var i = data.length; i < result.length; i++) {
            result[i] = padder;
        }
        return result;
    }

    function pkcs7strip(data) {
        data = coerceArray(data, true);
        if (data.length < 16) { throw new Error('PKCS#7 invalid length'); }

        var padder = data[data.length - 1];
        if (padder > 16) { throw new Error('PKCS#7 padding byte out of range'); }

        var length = data.length - padder;
        for (var i = 0; i < padder; i++) {
            if (data[length + i] !== padder) {
                throw new Error('PKCS#7 invalid padding byte');
            }
        }

        var result = createArray(length);
        copyArray(data, result, 0, 0, length);
        return result;
    }

    ///////////////////////
    // Exporting


    // The block cipher
    var aesjs = {
        AES: AES,
        Counter: Counter,

        ModeOfOperation: {
            ecb: ModeOfOperationECB,
            cbc: ModeOfOperationCBC,
            cfb: ModeOfOperationCFB,
            ofb: ModeOfOperationOFB,
            ctr: ModeOfOperationCTR
        },

        utils: {
            hex: convertHex,
            utf8: convertUtf8
        },

        padding: {
            pkcs7: {
                pad: pkcs7pad,
                strip: pkcs7strip
            }
        },

        _arrayTest: {
            coerceArray: coerceArray,
            createArray: createArray,
            copyArray: copyArray,
        }
    };


    // node.js
    if (true) {
        module.exports = aesjs

    // RequireJS/AMD
    // http://www.requirejs.org/docs/api.html
    // https://github.com/amdjs/amdjs-api/wiki/AMD
    } else {}


})(this);


/***/ }),

/***/ 53:
/***/ (function(module, exports, __webpack_require__) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

module.exports = Stream;

var EE = __webpack_require__(65).EventEmitter;
var inherits = __webpack_require__(28);

inherits(Stream, EE);
Stream.Readable = __webpack_require__(172);
Stream.Writable = __webpack_require__(175);
Stream.Duplex = __webpack_require__(176);
Stream.Transform = __webpack_require__(177);
Stream.PassThrough = __webpack_require__(178);

// Backwards-compat with node 0.4.x
Stream.Stream = Stream;



// old-style streams.  Note that the pipe method (the only relevant
// part of this class) is overridden in the Readable class.

function Stream() {
  EE.call(this);
}

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once.
  if (!dest._isStdio && (!options || options.end !== false)) {
    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    if (typeof dest.destroy === 'function') dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (EE.listenerCount(this, 'error') === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};


/***/ }),

/***/ 55:
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
/* harmony import */ var _filesystem__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(16);
/* harmony import */ var _common_screenshot_man__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(37);
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

/***/ 56:
/***/ (function(module, exports, __webpack_require__) {

var Buffer = __webpack_require__(40).Buffer

// prototype class for hash functions
function Hash (blockSize, finalSize) {
  this._block = Buffer.alloc(blockSize)
  this._finalSize = finalSize
  this._blockSize = blockSize
  this._len = 0
}

Hash.prototype.update = function (data, enc) {
  if (typeof data === 'string') {
    enc = enc || 'utf8'
    data = Buffer.from(data, enc)
  }

  var block = this._block
  var blockSize = this._blockSize
  var length = data.length
  var accum = this._len

  for (var offset = 0; offset < length;) {
    var assigned = accum % blockSize
    var remainder = Math.min(length - offset, blockSize - assigned)

    for (var i = 0; i < remainder; i++) {
      block[assigned + i] = data[offset + i]
    }

    accum += remainder
    offset += remainder

    if ((accum % blockSize) === 0) {
      this._update(block)
    }
  }

  this._len += length
  return this
}

Hash.prototype.digest = function (enc) {
  var rem = this._len % this._blockSize

  this._block[rem] = 0x80

  // zero (rem + 1) trailing bits, where (rem + 1) is the smallest
  // non-negative solution to the equation (length + 1 + (rem + 1)) === finalSize mod blockSize
  this._block.fill(0, rem + 1)

  if (rem >= this._finalSize) {
    this._update(this._block)
    this._block.fill(0)
  }

  var bits = this._len * 8

  // uint32
  if (bits <= 0xffffffff) {
    this._block.writeUInt32BE(bits, this._blockSize - 4)

  // uint64
  } else {
    var lowBits = bits & 0xffffffff
    var highBits = (bits - lowBits) / 0x100000000

    this._block.writeUInt32BE(highBits, this._blockSize - 8)
    this._block.writeUInt32BE(lowBits, this._blockSize - 4)
  }

  this._update(this._block)
  var hash = this._hash()

  return enc ? hash.toString(enc) : hash
}

Hash.prototype._update = function () {
  throw new Error('_update must be implemented by subclass')
}

module.exports = Hash


/***/ }),

/***/ 58:
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(Buffer) {// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.

function isArray(arg) {
  if (Array.isArray) {
    return Array.isArray(arg);
  }
  return objectToString(arg) === '[object Array]';
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = Buffer.isBuffer;

function objectToString(o) {
  return Object.prototype.toString.call(o);
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(36).Buffer))

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

/***/ 65:
/***/ (function(module, exports) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}


/***/ }),

/***/ 66:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";

// EXTERNAL MODULE: ./node_modules/kd-glob-to-regexp/index.js
var kd_glob_to_regexp = __webpack_require__(91);
var kd_glob_to_regexp_default = /*#__PURE__*/__webpack_require__.n(kd_glob_to_regexp);

// EXTERNAL MODULE: ./src/common/utils.js
var utils = __webpack_require__(2);

// EXTERNAL MODULE: ./src/common/dom_utils.js
var dom_utils = __webpack_require__(22);

// EXTERNAL MODULE: ./src/common/ipc/cs_postmessage.js
var cs_postmessage = __webpack_require__(34);

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(3);
var web_extension_default = /*#__PURE__*/__webpack_require__.n(web_extension);

// EXTERNAL MODULE: ./src/common/log.js
var log = __webpack_require__(4);

// EXTERNAL MODULE: ./src/common/drag_mock/index.js
var drag_mock = __webpack_require__(121);
var drag_mock_default = /*#__PURE__*/__webpack_require__.n(drag_mock);

// EXTERNAL MODULE: ./node_modules/dom-element-is-natively-editable/index.js
var dom_element_is_natively_editable = __webpack_require__(122);

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
var encrypt = __webpack_require__(89);

// EXTERNAL MODULE: ./src/common/constant.js
var constant = __webpack_require__(7);

// CONCATENATED MODULE: ./src/common/command_runner.js
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return command_runner_getElementByLocator; });
/* unused harmony export getFrameByLocator */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return command_runner_run; });
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
  var getElementByLocatorWithLogForEfp = function getElementByLocatorWithLogForEfp(locator) {
    var el = command_runner_getElementByLocator(locator);

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
        var getIframeOffset = function getIframeOffset() {
          if (window === window.top) {
            return Promise.resolve({ x: 0, y: 0 });
          }

          return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
            action: 'SOURCE_PAGE_OFFSET',
            data: {}
          });
        };
        var isEfp = isElementFromPoint(target);
        var pTarget = function () {
          if (!isEfp) return Promise.resolve(target);
          return getIframeOffset().then(function (iframeOffset) {
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

/***/ 699:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);

// EXTERNAL MODULE: ./src/common/web_extension.js
var web_extension = __webpack_require__(3);
var web_extension_default = /*#__PURE__*/__webpack_require__.n(web_extension);

// EXTERNAL MODULE: ./src/common/storage/index.js + 1 modules
var storage = __webpack_require__(32);

// EXTERNAL MODULE: ./src/common/ipc/ipc_cs.js
var ipc_cs = __webpack_require__(18);

// EXTERNAL MODULE: ./src/common/ipc/cs_postmessage.js
var cs_postmessage = __webpack_require__(34);

// EXTERNAL MODULE: ./src/common/inspector.js
var inspector = __webpack_require__(29);

// EXTERNAL MODULE: ./src/common/constant.js
var constant = __webpack_require__(7);

// EXTERNAL MODULE: ./src/common/utils.js
var utils = __webpack_require__(2);

// EXTERNAL MODULE: ./src/common/dom_utils.js
var dom_utils = __webpack_require__(22);

// EXTERNAL MODULE: ./src/common/command_runner.js + 2 modules
var command_runner = __webpack_require__(66);

// EXTERNAL MODULE: ./src/common/capture_screenshot.js
var capture_screenshot = __webpack_require__(55);

// EXTERNAL MODULE: ./src/common/encrypt.js
var encrypt = __webpack_require__(89);

// EXTERNAL MODULE: ./src/common/log.js
var log = __webpack_require__(4);

// CONCATENATED MODULE: ./src/common/box.js
var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BOX_ANCHOR_POS = {
  TOP_LEFT: 1,
  TOP_RIGHT: 2,
  BOTTOM_RIGHT: 3,
  BOTTOM_LEFT: 4
};

var fitSquarePoint = function fitSquarePoint(movingPoint, fixedPoint) {
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

var calcRectAndAnchor = function calcRectAndAnchor(movingPoint, fixedPoint) {
  var mp = movingPoint;
  var fp = fixedPoint;
  var pos = null;
  var tlp = null;

  if (mp.x <= fp.x && mp.y <= fp.y) {
    pos = BOX_ANCHOR_POS.TOP_LEFT;
    tlp = mp;
  } else if (mp.x > fp.x && mp.y > fp.y) {
    pos = BOX_ANCHOR_POS.BOTTOM_RIGHT;
    tlp = fp;
  } else if (mp.x > fp.x) {
    pos = BOX_ANCHOR_POS.TOP_RIGHT;
    tlp = { x: fp.x, y: mp.y };
  } else if (mp.y > fp.y) {
    pos = BOX_ANCHOR_POS.BOTTOM_LEFT;
    tlp = { x: mp.x, y: fp.y };
  }

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

var pointAtPos = function pointAtPos(rect, pos) {
  switch (pos) {
    case BOX_ANCHOR_POS.TOP_LEFT:
      return {
        x: rect.x,
        y: rect.y
      };
    case BOX_ANCHOR_POS.TOP_RIGHT:
      return {
        x: rect.x + rect.width,
        y: rect.y
      };
    case BOX_ANCHOR_POS.BOTTOM_RIGHT:
      return {
        x: rect.x + rect.width,
        y: rect.y + rect.height
      };
    case BOX_ANCHOR_POS.BOTTOM_LEFT:
      return {
        x: rect.x,
        y: rect.y + rect.height
      };
  }
};

var diagonalPos = function diagonalPos(pos) {
  switch (pos) {
    case BOX_ANCHOR_POS.TOP_LEFT:
      return BOX_ANCHOR_POS.BOTTOM_RIGHT;

    case BOX_ANCHOR_POS.TOP_RIGHT:
      return BOX_ANCHOR_POS.BOTTOM_LEFT;

    case BOX_ANCHOR_POS.BOTTOM_RIGHT:
      return BOX_ANCHOR_POS.TOP_LEFT;

    case BOX_ANCHOR_POS.BOTTOM_LEFT:
      return BOX_ANCHOR_POS.TOP_RIGHT;
  }
};

var diagonalPoint = function diagonalPoint(rect, anchorPos) {
  return pointAtPos(rect, diagonalPos(anchorPos));
};

var genGetAnchorRects = function genGetAnchorRects(ANCHOR_POS, pointAtPos) {
  return function (_ref) {
    var rect = _ref.rect,
        _ref$size = _ref.size,
        size = _ref$size === undefined ? 5 : _ref$size;

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

var getAnchorRects = genGetAnchorRects(BOX_ANCHOR_POS, pointAtPos);

var Box = function () {
  function Box(options) {
    _classCallCheck(this, Box);

    this.state = {
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

    var opts = _extends({
      firstSilence: true,
      transform: function transform(x) {
        return x;
      },
      onStateChange: function onStateChange() {}
    }, options);

    this.transform = opts.transform;
    this.onStateChange = opts.onStateChange;
    this.normalizeRect = opts.normalizeRect || function (x) {
      return x;
    };

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
    }, { silent: opts.firstSilence });
  }
  // Note: possible settings


  _createClass(Box, [{
    key: 'getType',
    value: function getType() {
      return 'box';
    }
  }, {
    key: 'getCategory',
    value: function getCategory() {
      return Box.category;
    }
  }, {
    key: 'getDefaultAnchorPos',
    value: function getDefaultAnchorPos() {
      return BOX_ANCHOR_POS.BOTTOM_RIGHT;
    }
  }, {
    key: 'getDefaultStyle',
    value: function getDefaultStyle() {
      return {};
    }
  }, {
    key: 'getId',
    value: function getId() {
      return this.state.id;
    }
  }, {
    key: 'getState',
    value: function getState() {
      return this.transform(this.state);
    }
  }, {
    key: 'processIncomingStyle',
    value: function processIncomingStyle(style) {
      return style;
    }
  }, {
    key: 'setStyle',
    value: function setStyle(obj) {
      this.__setState({
        style: _extends({}, this.state.style, this.processIncomingStyle(obj))
      });
    }
  }, {
    key: 'setData',
    value: function setData(data) {
      this.__setState({ data: data });
    }
  }, {
    key: 'moveAnchorStart',
    value: function moveAnchorStart(_ref2) {
      var anchorPos = _ref2.anchorPos;

      this.__setLocal({
        oldPoint: pointAtPos(this.state.rect, anchorPos),
        oldAnchorPos: anchorPos,
        anchorPos: anchorPos
      });
    }
  }, {
    key: 'moveAnchor',
    value: function moveAnchor(_ref3) {
      var x = _ref3.x,
          y = _ref3.y;

      var _ref4 = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
          fit = _ref4.fit;

      var old = this.state.rect;
      var pos = this.local.anchorPos;
      var fixed = diagonalPoint(old, pos);
      var moving = !fit ? { x: x, y: y } : fitSquarePoint({ x: x, y: y }, fixed);
      var res = calcRectAndAnchor(moving, fixed);

      this.__setLocal({ anchorPos: res.anchorPos });
      this.__setState({ rect: this.normalizeRect(res.rect, 'moveAnchor') });
    }
  }, {
    key: 'moveAnchorEnd',
    value: function moveAnchorEnd() {
      this.__setLocal({
        oldPoint: null,
        oldAnchorPos: null,
        anchorPos: null
      });
    }
  }, {
    key: 'moveBoxStart',
    value: function moveBoxStart() {
      this.__setLocal({
        oldRect: _extends({}, this.state.rect)
      });
    }
  }, {
    key: 'moveBox',
    value: function moveBox(_ref5) {
      var dx = _ref5.dx,
          dy = _ref5.dy;

      var old = this.local.oldRect;
      var upd = _extends({}, old, {
        x: old.x + dx,
        y: old.y + dy
      });

      this.__setState({ rect: this.normalizeRect(upd, 'moveBox') });
    }
  }, {
    key: 'moveBoxEnd',
    value: function moveBoxEnd() {
      this.__setLocal({
        oldRect: null
      });
    }
  }, {
    key: '__setState',
    value: function __setState(obj) {
      var _this = this;

      var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

      var last = this.getState();

      this.state = _extends({}, this.state, obj);

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
    key: '__setLocal',
    value: function __setLocal(obj) {
      this.local = _extends({}, this.local, obj);
    }
  }]);

  return Box;
}();
Box.settings = [];
Box.category = 'rect';
Box.defaultAnchorPos = BOX_ANCHOR_POS.BOTTOM_RIGHT;
// CONCATENATED MODULE: ./src/ext/content_script/select_area.js
var select_area_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }





var commonStyle = {
  boxSizing: 'border-box',
  fontFamily: 'Arial'
};

var select_area_createEl = function createEl(_ref) {
  var _ref$tag = _ref.tag,
      tag = _ref$tag === undefined ? 'div' : _ref$tag,
      _ref$attrs = _ref.attrs,
      attrs = _ref$attrs === undefined ? {} : _ref$attrs,
      _ref$style = _ref.style,
      style = _ref$style === undefined ? {} : _ref$style,
      text = _ref.text;

  var $el = document.createElement(tag);

  Object.keys(attrs).forEach(function (key) {
    $el.setAttribute(key, attrs[key]);
  });

  if (text && text.length) {
    $el.innerText = text;
  }

  Object(dom_utils["i" /* setStyle */])($el, style);
  return $el;
};

var select_area_createRect = function createRect(opts) {
  var containerStyle = select_area_extends({}, commonStyle, {
    position: 'absolute',
    zIndex: 100000,
    top: Object(dom_utils["f" /* pixel */])(opts.top),
    left: Object(dom_utils["f" /* pixel */])(opts.left),
    width: Object(dom_utils["f" /* pixel */])(opts.width),
    height: Object(dom_utils["f" /* pixel */])(opts.height)
  }, opts.containerStyle || {});
  var rectStyle = select_area_extends({}, commonStyle, {
    width: '100%',
    height: '100%',
    border: opts.rectBorderWidth + 'px solid rgb(239, 93, 143)',
    cursor: 'move',
    background: 'transparent'
  }, opts.rectStyle || {});

  var $container = select_area_createEl({ style: containerStyle });
  var $rectangle = select_area_createEl({ style: rectStyle });

  $container.appendChild($rectangle);
  document.body.appendChild($container);

  return {
    $container: $container,
    $rectangle: $rectangle,
    destroy: function destroy() {
      $container.remove();
    },
    hide: function hide() {
      Object(dom_utils["i" /* setStyle */])($container, { display: 'none' });
    },
    show: function show() {
      Object(dom_utils["i" /* setStyle */])($container, { display: 'block' });
    }
  };
};

var createOverlay = function createOverlay() {
  var $overlay = select_area_createEl({
    style: {
      position: 'fixed',
      zIndex: 9000,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: 'transparent',
      cursor: 'crosshair'
    }
  });

  document.body.appendChild($overlay);
  return function () {
    return $overlay.remove();
  };
};

var select_area_selectArea = function selectArea(_ref2) {
  var done = _ref2.done,
      _ref2$promise = _ref2.promise,
      promise = _ref2$promise === undefined ? false : _ref2$promise;

  var go = function go(done) {
    var state = {
      box: null,
      activated: false,
      startPos: null,
      rect: null
    };
    var resetBodyStyle = function () {
      var userSelectKey = web_extension_default.a.isFirefox() ? '-moz-user-select' : 'user-select';
      var style = window.getComputedStyle(document.body);
      var oldCursor = style.cursor;
      var oldUserSelect = style[userSelectKey];

      Object(dom_utils["i" /* setStyle */])(document.body, _defineProperty({
        cursor: 'crosshair'
      }, userSelectKey, 'none'));
      return function () {
        return Object(dom_utils["i" /* setStyle */])(document.body, _defineProperty({ cursor: oldCursor }, userSelectKey, oldUserSelect));
      };
    }();

    var removeOverlay = createOverlay();
    var unbindDrag = Object(dom_utils["b" /* bindDrag */])({
      $el: document,
      onDragStart: function onDragStart(e) {
        e.preventDefault();

        state.activated = true;
        state.startPos = {
          x: e.pageX,
          y: e.pageY
        };
      },
      onDragEnd: function onDragEnd(e) {
        e.preventDefault();

        state.activated = false;

        if (state.box) {
          state.box.moveAnchorEnd();

          var boundingRect = rectObj.$container.getBoundingClientRect();
          API.hide();

          // Note: API.hide() takes some time to have effect
          setTimeout(function () {
            done(state.rect, boundingRect);
            API.destroy();
          }, 100);
        }
      },
      onDrag: function onDrag(e, _ref3) {
        var dx = _ref3.dx,
            dy = _ref3.dy;

        e.preventDefault();

        if (!state.activated) return;

        if (!state.box) {
          var rect = {
            x: state.startPos.x,
            y: state.startPos.y,
            width: dx,
            height: dy
          };
          state.rect = rect;
          state.box = new Box(select_area_extends({}, rect, {
            onStateChange: function onStateChange(_ref4) {
              var rect = _ref4.rect;

              state.rect = rect;
              API.show();
              API.updatePos(rect);
            }
          }));

          state.box.moveAnchorStart({
            anchorPos: BOX_ANCHOR_POS.BOTTOM_RIGHT
          });
        }

        state.box.moveAnchor({
          x: e.pageX,
          y: e.pageY
        });
      }
    });

    var rectObj = select_area_createRect({
      top: -999,
      left: -999,
      width: 0,
      height: 0,
      rectStyle: {
        border: '1px solid #ff00ff',
        background: 'rgba(0, 0, 255, 0.1)'
      }
    });
    var API = {
      updatePos: function updatePos(rect) {
        Object(dom_utils["i" /* setStyle */])(rectObj.$container, {
          top: Object(dom_utils["f" /* pixel */])(rect.y),
          left: Object(dom_utils["f" /* pixel */])(rect.x),
          width: Object(dom_utils["f" /* pixel */])(rect.width),
          height: Object(dom_utils["f" /* pixel */])(rect.height)
        });
      },
      destroy: function destroy() {
        resetBodyStyle();
        unbindDrag();
        removeOverlay();
        rectObj.destroy();

        setTimeout(function () {
          document.removeEventListener('click', onClick, true);
          document.removeEventListener('keydown', onKeyDown, true);
        }, 0);
      },
      hide: function hide() {
        rectObj.hide();
      },
      show: function show() {
        rectObj.show();
      }
    };

    var onClick = function onClick(e) {
      console.log('trigger select_area onclick');
      e.preventDefault();
      e.stopPropagation();
      API.destroy();
    };
    var onKeyDown = function onKeyDown(e) {
      return e.keyCode === 27 && API.destroy();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    API.hide();
    return API;
  };

  if (!promise) return go(done);

  return new Promise(function (resolve, reject) {
    var wrappedDone = function wrappedDone() {
      resolve(done.apply(undefined, arguments));
    };

    go(wrappedDone);
  });
};
// CONCATENATED MODULE: ./src/ext/content_script/index.js
var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var content_script_extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }















var MASK_CLICK_FADE_TIMEOUT = 2000;
var oops =  true ? function () {} : undefined;

var content_script_state = {
  status: constant["b" /* CONTENT_SCRIPT_STATUS */].NORMAL,
  // Note: it decides whether we're running commands
  // in the current window or some iframe/frame
  playingFrame: window,
  // Note: current frame stack when recording, it helps
  // to generate `selectFrame` commands
  recordingFrameStack: [],
  // Note: snapshot of extension config (content script cares about click/clickAt when recording)
  // It is supposed to be updated when user activates that page
  config: {}

  // Note: Whether it's top or inner window, a content script has the need
  // to send IPC message to background. But in our design, only the top window
  // has access to the real csIpc, while inner frames have to bubble up the messages
  // to the top window.
  // So inner windows are provided with a fake csIpc, which post messages to its parent
};var superCsIpc = window.top === window ? ipc_cs["a" /* default */] : {
  ask: function ask(ipcAction, ipcData) {
    return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
      action: 'IPC_CALL',
      data: { ipcAction: ipcAction, ipcData: ipcData }
    });
  }
};

var calcSelectFrameCmds = function calcSelectFrameCmds(frameStack) {
  var xs = content_script_state.recordingFrameStack;
  var ys = frameStack;
  var len = Math.min(xs.length, ys.length);
  var tpl = { cmd: 'selectFrame', url: window.location.href };
  var ret = [];
  var i = 0;

  for (i = 0; i < len; i++) {
    if (xs[i] !== ys[i]) {
      break;
    }
  }

  if (i === 0) {
    // No need for relative=top, if state.recordingFrameStack is empty
    if (xs.length !== 0) {
      ret.push(content_script_extends({}, tpl, { target: 'relative=top' }));
    }
  } else if (i < len) {
    for (var j = i; j < xs.length; j++) {
      ret.push(content_script_extends({}, tpl, { target: 'relative=parent' }));
    }
  }

  for (var _j = i; _j < ys.length; _j++) {
    ret.push(content_script_extends({}, tpl, { target: ys[_j] }));
  }

  return ret;
};

// Two masks to show on page
// 1. mask on click
// 2. mask on hover
var getMask = function () {
  var mask = void 0,
      factory = void 0;

  var addLogoImg = function addLogoImg($dom) {
    var $img = content_script_createLogoImg();

    inspector["a" /* default */].setStyle($img, {
      position: 'absolute',
      top: '-25px',
      left: '0',
      width: '20px',
      height: '20px'
    });

    $dom.appendChild($img);
  };

  return function (remove) {
    if (remove && factory) return factory.clear();
    if (mask) return mask;

    factory = inspector["a" /* default */].maskFactory();

    var maskClick = factory.gen({ background: 'green', border: '2px solid purple' });
    var maskHover = factory.gen({ background: '#ffa800', border: '2px solid purple' });

    addLogoImg(maskClick);
    addLogoImg(maskHover);

    console.log('maskClick', maskClick);

    mask = { maskClick: maskClick, maskHover: maskHover };

    document.body.appendChild(maskClick);
    document.body.appendChild(maskHover);

    return mask;
  };
}();

var content_script_createLogoImg = function createLogoImg() {
  // Note: Ext.extension.getURL is available in content script, but not injected js
  // So there are cases when content_script.js is run as injected js, where `Ext.extension.getURL`
  // is not available
  // Weird enough, `Ext.extension.getURL` always works well in macOS
  var url = web_extension_default.a.extension.getURL ? web_extension_default.a.extension.getURL('logo.png') : '';
  var img = new Image();

  img.src = url;
  return img;
};

var addWaitInCommand = function addWaitInCommand(cmdObj) {
  var cmd = cmdObj.cmd;


  switch (cmd) {
    case 'click':
    case 'clickAt':
      return content_script_extends({}, cmdObj, { cmd: 'clickAndWait', value: '' });

    case 'select':
      return content_script_extends({}, cmdObj, { cmd: 'selectAndWait' });

    default:
      return cmdObj;
  }
};

// report recorded commands to background.
// transform `leave` event to clickAndWait / selectAndWait event based on the last command
var reportCommand = function () {
  var LEAVE_INTERVAL = 500;
  var last = null;
  var lastTime = null;
  var timer = null;

  return function (obj) {
    obj = content_script_extends({}, obj, { url: window.location.href });

    Object(log["a" /* default */])('to report', obj);

    // Change back to top frame if it was recording inside
    if (content_script_state.recordingFrameStack.length > 0) {
      content_script_state.recordingFrameStack = [];

      superCsIpc.ask('CS_RECORD_ADD_COMMAND', {
        cmd: 'selectFrame',
        target: 'relative=top',
        url: window.location.href
      }).catch(oops);
    }

    switch (obj.cmd) {
      case 'leave':
        {
          if (timer) {
            clearTimeout(timer);
          }

          if (new Date() - lastTime < LEAVE_INTERVAL) {
            obj = addWaitInCommand(last);
          } else {
            return;
          }

          break;
        }
      case 'click':
      case 'clickAt':
      case 'select':
        {
          timer = setTimeout(function () {
            superCsIpc.ask('CS_RECORD_ADD_COMMAND', obj).catch(oops);
          }, LEAVE_INTERVAL);

          last = obj;
          lastTime = new Date();

          return;
        }

      default:
        break;
    }

    last = obj;
    lastTime = new Date();

    superCsIpc.ask('CS_RECORD_ADD_COMMAND', obj).catch(oops);
  };
}();

var isValidClick = function isValidClick(el) {
  // Note: all elements are allowed to be recorded when clicked
  return true;

  // if (el === document.body) return false
  //
  // const tag   = el.tagName.toLowerCase()
  // const type  = el.getAttribute('type')
  // const role  = el.getAttribute('role')
  //
  // if (tag === 'a' || tag === 'button')  return true
  // if (tag === 'input' && ['radio', 'checkbox'].indexOf(type) !== -1)  return true
  // if (['link', 'button', 'checkbox', 'radio'].indexOf(role) !== -1)   return true
  //
  // return isValidClick(el.parentNode)
};

var isValidSelect = function isValidSelect(el) {
  var tag = el.tagName.toLowerCase();

  if (['option', 'select'].indexOf(tag) !== -1) return true;
  return false;
};

var isValidType = function isValidType(el) {
  var tag = el.tagName.toLowerCase();
  var type = el.getAttribute('type');

  if (tag === 'textarea') return true;
  if (tag === 'input' && ['radio, checkbox'].indexOf(type) === -1) return true;

  return false;
};

var content_script_highlightDom = function highlightDom($dom, timeout) {
  var mask = getMask();

  inspector["a" /* default */].showMaskOver(mask.maskClick, $dom);

  setTimeout(function () {
    inspector["a" /* default */].setStyle(mask.maskClick, { display: 'none' });
  }, timeout || MASK_CLICK_FADE_TIMEOUT);
};

var content_script_createHighlightRect = function createHighlightRect() {
  var opts = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var $mask = document.createElement('div');
  var $text = document.createElement('div');
  var timer = void 0;

  inspector["a" /* default */].setStyle($mask, {
    position: 'absolute',
    zIndex: 110001,
    border: '1px solid orange',
    color: 'orange',
    display: 'none',
    pointerEvents: 'none'
  });

  inspector["a" /* default */].setStyle($text, {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'translate(-100%, -100%)',
    fontSize: '14px'
  });

  $mask.appendChild($text);

  return function (rect, timeout) {
    clearTimeout(timer);
    $text.innerText = parseFloat(rect.score).toFixed(2);

    inspector["a" /* default */].setStyle($mask, content_script_extends({
      display: 'block',
      top: rect.top + 'px',
      left: rect.left + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px'
    }, opts.rectStyle || {}));

    inspector["a" /* default */].setStyle($text, opts.textStyle || {});

    if (!$mask.parentNode) {
      document.body.appendChild($mask);
    }

    if (opts.scrollIntoView) {
      $mask.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }

    if (timeout && timeout > 0) {
      timer = setTimeout(function () {
        inspector["a" /* default */].setStyle($mask, { display: 'none' });
      }, timeout);
    }

    return function () {
      inspector["a" /* default */].setStyle($mask, { display: 'none' });
      $mask.remove();
    };
  };
};

var highlightRect = content_script_createHighlightRect();

var highlightRects = function () {
  var topMatchedOptions = {
    rectStyle: {
      borderColor: '#ff00ff',
      color: '#ff00ff'
    }
  };
  var destroy = void 0;

  return function (rects, timeout) {
    if (destroy) destroy();
    var destroyFns = rects.map(function (rect, i) {
      return content_script_createHighlightRect(i === 0 ? topMatchedOptions : {})(rect, timeout);
    });
    destroy = function destroy() {
      return destroyFns.forEach(function (destroy) {
        return destroy();
      });
    };
    return destroy;
  };
}();

var content_script_onClick = function onClick(e) {
  if (!isValidClick(e.target)) return;

  var targetInfo = inspector["a" /* default */].getLocator(e.target, true);

  Object(log["a" /* default */])('onClick, switch  case', content_script_state.config.recordClickType);
  switch (content_script_state.config.recordClickType) {
    case 'clickAt':
      reportCommand(content_script_extends({}, targetInfo, {
        cmd: 'clickAt',
        value: function () {
          var clientX = e.clientX,
              clientY = e.clientY;

          var _e$target$getBounding = e.target.getBoundingClientRect(),
              top = _e$target$getBounding.top,
              left = _e$target$getBounding.left;

          var x = Math.round(clientX - left);
          var y = Math.round(clientY - top);

          return x + ',' + y;
        }()
      }));
      break;

    case 'click':
    default:
      reportCommand(content_script_extends({}, targetInfo, {
        cmd: 'click'
      }));
      break;
  }
};

var content_script_onChange = function onChange(e) {
  if (isValidSelect(e.target)) {
    var value = e.target.value;
    var $option = Array.from(e.target.children).find(function ($op) {
      return $op.value === value;
    });

    reportCommand(content_script_extends({
      cmd: 'select',
      value: 'label=' + inspector["a" /* default */].domText($option).trim()
    }, inspector["a" /* default */].getLocator(e.target, true)));
  } else if (isValidType(e.target)) {
    var _value = (e.target.value || '').replace(/\n/g, '\\n');

    Object(encrypt["b" /* encryptIfNeeded */])(_value, e.target).then(function (realValue) {
      reportCommand(content_script_extends({
        cmd: 'type',
        value: realValue
      }, inspector["a" /* default */].getLocator(e.target, true)));
    });
  }
};

var content_script_onContentEditableChange = function onContentEditableChange(e) {
  reportCommand(content_script_extends({
    cmd: 'editContent',
    value: e.target.innerHTML
  }, inspector["a" /* default */].getLocator(e.target, true)));
};

var onDragDrop = function () {
  var dragStart = null;

  return function (e) {
    switch (e.type) {
      case 'dragstart':
        {
          dragStart = inspector["a" /* default */].getLocator(e.target, true);
          break;
        }
      case 'drop':
        {
          if (!dragStart) return;
          var tmp = inspector["a" /* default */].getLocator(e.target, true);
          var drop = {
            value: tmp.target,
            valueOptions: tmp.targetOptions
          };

          reportCommand(content_script_extends({
            cmd: 'dragAndDropToObject'
          }, dragStart, drop));

          dragStart = null;
        }
    }
  };
}();

var onLeave = function onLeave(e) {
  reportCommand({
    cmd: 'leave',
    target: null,
    value: null
  });

  setTimeout(function () {
    reportCommand({
      cmd: 'pullback',
      target: null,
      value: null
    });
  }, 800);
};

var unbindContentEditableEvents = void 0;

var content_script_bindEventsToRecord = function bindEventsToRecord() {
  document.addEventListener('click', content_script_onClick, true);
  document.addEventListener('change', content_script_onChange, true);
  document.addEventListener('dragstart', onDragDrop, true);
  document.addEventListener('drop', onDragDrop, true);
  window.addEventListener('beforeunload', onLeave, true);

  unbindContentEditableEvents = Object(dom_utils["a" /* bindContentEditableChange */])({ onChange: content_script_onContentEditableChange });
};

var unbindEventsToRecord = function unbindEventsToRecord() {
  document.removeEventListener('click', content_script_onClick, true);
  document.removeEventListener('change', content_script_onChange, true);
  document.removeEventListener('dragstart', onDragDrop, true);
  document.removeEventListener('drop', onDragDrop, true);
  window.removeEventListener('beforeunload', onLeave, true);

  if (unbindContentEditableEvents) {
    unbindContentEditableEvents();
  }
};

var content_script_waitForDomReady = function waitForDomReady(accurate) {
  return Object(utils["until"])('dom ready', function () {
    return {
      pass: ['complete', 'interactive'].slice(0, accurate ? 1 : 2).indexOf(document.readyState) !== -1,
      result: true
    };
  }, 1000, 6000 * 10);
};

var content_script_broadcastToAllFrames = function broadcastToAllFrames(action, data) {
  // IMPORTANT: broadcast status change to all frames inside
  var frames = window.frames;

  for (var i = 0, len = frames.length; i < len; i++) {
    Object(cs_postmessage["b" /* postMessage */])(frames[i], window, {
      action: action,
      data: data
    });
  }
};

var content_script_updateStatus = function updateStatus(args) {
  if (!args.status) {
    throw new Error('SET_STATUS: missing args.status');
  }
  if (!constant["b" /* CONTENT_SCRIPT_STATUS */][args.status]) {
    throw new Error('SET_STATUS: invalid args.status - ' + args.status);
  }

  content_script_extends(content_script_state, {
    status: args.status
  });

  if (args.status === constant["b" /* CONTENT_SCRIPT_STATUS */].NORMAL || args.status === constant["b" /* CONTENT_SCRIPT_STATUS */].RECORDING) {
    content_script_bindEventsToRecord();
  } else {
    unbindEventsToRecord();
  }

  // replace alert/confirm/prompt with our version when playing
  if (args.status === constant["b" /* CONTENT_SCRIPT_STATUS */].PLAYING) {
    hackAlertConfirmPrompt();
  } else {
    restoreAlertConfirmPrompt();
  }

  // Note: clear recording frame stack whenever it stops recording
  if (args.status === constant["b" /* CONTENT_SCRIPT_STATUS */].NORMAL) {
    content_script_state.recordingFrameStack = [];
    content_script_state.playingFrame = window;
  }

  // IMPORTANT: broadcast status change to all frames inside
  content_script_broadcastToAllFrames('SET_STATUS', args);
};

var content_script_bindIPCListener = function bindIPCListener() {
  // Note: need to check csIpc in case it's a none-src iframe into which we
  // inject content_script.js. It has no access to chrome api, thus no csIpc available
  if (!ipc_cs["a" /* default */]) return;

  // Note: csIpc instead of superIpc, because only top window is able
  // to listen to ipc events from bg
  ipc_cs["a" /* default */].onAsk(function (cmd, args) {
    Object(log["a" /* default */])(cmd, args);

    switch (cmd) {
      case 'HEART_BEAT':
        return true;

      case 'SET_STATUS':
        {
          content_script_updateStatus(args);
          return true;
        }

      case 'DOM_READY':
        return content_script_waitForDomReady(false);

      case 'RUN_COMMAND':
        return content_script_runCommand(args.command).catch(function (e) {
          // Mark that there is already at least one command run
          window.noCommandsYet = false;

          log["a" /* default */].error(e.stack);
          throw e;
        }).then(function (data) {
          // Mark that there is already at least one command run
          window.noCommandsYet = false;

          if (content_script_state.playingFrame !== window) {
            return { data: data, isIFrame: true };
          }

          return { data: data };
        });

      case 'FIND_DOM':
        {
          try {
            var $el = Object(command_runner["a" /* getElementByLocator */])(args.locator);
            return true;
          } catch (e) {
            return false;
          }
        }

      case 'HIGHLIGHT_DOM':
        {
          var _$el = Object(command_runner["a" /* getElementByLocator */])(args.locator);

          if (_$el) {
            _$el.scrollIntoView({ block: 'center' });
            content_script_highlightDom(_$el);
          }

          return true;
        }

      case 'HIGHLIGHT_RECT':
        {
          highlightRect(args.scoredRect);
          return true;
        }

      case 'HIGHLIGHT_RECTS':
        {
          highlightRects(args.scoredRects);
          return true;
        }

      case 'CLEAR_VISION_RECTS':
        {
          // Note: it will clear previous rects
          highlightRects([]);
          return true;
        }

      case 'HACK_ALERT':
        {
          hackAlertConfirmPrompt();
          return true;
        }

      case 'MARK_NO_COMMANDS_YET':
        {
          window.noCommandsYet = true;
          return true;
        }

      case 'SCREENSHOT_PAGE_INFO':
        {
          return capture_screenshot["a" /* captureClientAPI */].getPageInfo();
        }

      case 'START_CAPTURE_FULL_SCREENSHOT':
        {
          return capture_screenshot["a" /* captureClientAPI */].startCapture(args || {});
        }

      case 'END_CAPTURE_FULL_SCREENSHOT':
        {
          return capture_screenshot["a" /* captureClientAPI */].endCapture(args.pageInfo);
        }

      case 'SCROLL_PAGE':
        {
          return capture_screenshot["a" /* captureClientAPI */].scrollPage(args.offset);
        }

      case 'TAB_ACTIVATED':
        {
          content_script_loadConfig();
          return;
        }

      case 'SELECT_SCREEN_AREA':
        {
          return select_area_selectArea({
            promise: true,
            done: function done(rect, boundingRect) {
              Object(log["a" /* default */])('SELECT_SCREEN_AREA  - selectArea', rect, boundingRect);
              return ipc_cs["a" /* default */].ask('CS_SCREEN_AREA_SELECTED', {
                rect: {
                  x: boundingRect.x,
                  y: boundingRect.y,
                  width: boundingRect.width,
                  height: boundingRect.height
                },
                devicePixelRatio: window.devicePixelRatio
              });
            }
          });
        }

      default:
        throw new Error('cmd not supported: ' + cmd);
    }
  });
};

var content_script_bindEventsToInspect = function bindEventsToInspect() {
  // Bind click events for inspecting
  document.addEventListener('click', function (e) {
    switch (content_script_state.status) {
      case constant["b" /* CONTENT_SCRIPT_STATUS */].INSPECTING:
        {
          e.preventDefault();

          var mask = getMask();

          inspector["a" /* default */].setStyle(mask.maskHover, { display: 'none' });
          inspector["a" /* default */].showMaskOver(mask.maskClick, e.target);

          setTimeout(function () {
            inspector["a" /* default */].setStyle(mask.maskClick, { display: 'none' });
          }, MASK_CLICK_FADE_TIMEOUT);

          content_script_extends(content_script_state, {
            status: constant["b" /* CONTENT_SCRIPT_STATUS */].NORMAL
          });

          return superCsIpc.ask('CS_DONE_INSPECTING', {
            locatorInfo: inspector["a" /* default */].getLocator(e.target, true)
          }).catch(oops);
        }

      default:
        break;
    }
  });

  // bind mouse over event for applying for a inspector role
  document.addEventListener('mouseover', function (e) {
    if (content_script_state.status === constant["b" /* CONTENT_SCRIPT_STATUS */].NORMAL) {
      return superCsIpc.ask('CS_ACTIVATE_ME', {}).catch(oops);
    }
  });

  // bind mouse move event to show hover mask in inspecting
  document.addEventListener('mousemove', function (e) {
    if (content_script_state.status !== constant["b" /* CONTENT_SCRIPT_STATUS */].INSPECTING) return;

    var mask = getMask();
    inspector["a" /* default */].showMaskOver(mask.maskHover, e.target);
  });
};

var content_script_bindOnMessage = function bindOnMessage() {
  Object(cs_postmessage["a" /* onMessage */])(window, function (_ref, _ref2) {
    var action = _ref.action,
        data = _ref.data;
    var source = _ref2.source;

    Object(log["a" /* default */])('onMessage', action, data, source);

    switch (action) {
      case 'SET_STATUS':
        content_script_updateStatus(data);
        return true;

      case 'UPDATE_CONFIG':
        {
          content_script_state.config = data;
          return true;
        }

      // inner frames may receive this message when there are
      // some previous `selectFrame` command
      case 'RUN_COMMAND':
        // runCommand will decide whether to run in this window or pass on
        return content_script_runCommand(data);

      // inner frames send IPC_CALL to background,
      // It will go step by step up to the topmost frame, which has
      // the access to csIpc
      case 'IPC_CALL':
        // When recording, need to calculate `selectFrame` by ourselves
        // * for inner frames, add current frame locator to frame stack
        // * for top frame, send `selectFrame` commands before the original command
        //   and keep track of the latest frame stack
        if (data.ipcAction === 'CS_RECORD_ADD_COMMAND' && data.ipcData.cmd !== 'pullback') {
          // Note: Do not send any RECORD_ADD_COMMAND in playing mode
          if (content_script_state.status === constant["b" /* CONTENT_SCRIPT_STATUS */].PLAYING) {
            return false;
          }

          data = Object(utils["updateIn"])(['ipcData', 'frameStack'], function () {
            var stack = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];
            return [inspector["a" /* default */].getFrameLocator(source, window)].concat(_toConsumableArray(stack));
          }, data);

          if (window.top === window) {
            calcSelectFrameCmds(data.ipcData.frameStack).forEach(function (cmd) {
              ipc_cs["a" /* default */].ask('CS_RECORD_ADD_COMMAND', cmd).catch(oops);
            });

            content_script_state.recordingFrameStack = data.ipcData.frameStack;
          }
        }

        if (window.top === window) {
          return ipc_cs["a" /* default */].ask(data.ipcAction, data.ipcData).catch(oops);
        } else {
          return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, { action: action, data: data });
        }

      case 'RESET_PLAYING_FRAME':
        {
          content_script_state.playingFrame = window;

          // pass on RESET_PLAYING_FRAME to parent, all the way till top window
          if (data === 'TOP' && window.top !== window) {
            Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
              action: 'RESET_PLAYING_FRAME',
              data: 'TOP'
            });
          }

          return true;
        }

      case 'SOURCE_PAGE_OFFSET':
        {
          var $frames = [].concat(_toConsumableArray(Array.from(document.getElementsByTagName('iframe'))), _toConsumableArray(Array.from(document.getElementsByTagName('frame'))));
          var $frameElement = $frames.find(function ($frame) {
            return $frame.contentWindow === source;
          });
          var offset = inspector["a" /* default */].offset($frameElement, true);
          var x = offset.left;
          var y = offset.top;
          Object(log["a" /* default */])('SOURCE_PAGE_OFFSET, iframeDOM', $frameElement);

          if (window.top === window) {
            return { x: x, y: y };
          }

          return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
            action: 'SOURCE_PAGE_OFFSET',
            data: {}
          }).then(function (parentOffset) {
            return {
              x: x + parentOffset.x,
              y: y + parentOffset.y
            };
          });
        }

      case 'SOURCE_BOUNDING_BOX_OFFSET':
        {
          var _$frames = [].concat(_toConsumableArray(Array.from(document.getElementsByTagName('iframe'))), _toConsumableArray(Array.from(document.getElementsByTagName('frame'))));
          var _$frameElement = _$frames.find(function ($frame) {
            return $frame.contentWindow === source;
          });
          var rect = _$frameElement.getBoundingClientRect();

          if (window.top === window) {
            return {
              x: rect.x,
              y: rect.y
            };
          }

          return Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
            action: 'SOURCE_BOUNDING_BOX_OFFSET',
            data: {}
          }).then(function (parentOffset) {
            return {
              x: rect.x + parentOffset.x,
              y: rect.y + parentOffset.y
            };
          });
        }
    }
  });
};

var content_script_bindInvokeEvent = function bindInvokeEvent() {
  // Macros
  window.addEventListener('kantuRunMacro', function (e) {
    Object(log["a" /* default */])('invoke event', e);
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'));

    var queries = Object(utils["parseQuery"])(window.location.search);
    ipc_cs["a" /* default */].ask('CS_INVOKE', { testCase: e.detail, options: queries }).catch(function (e) {
      return alert('[kantu] ' + e.message);
    });
  });

  window.addEventListener('kantuSaveAndRunMacro', function (e) {
    Object(log["a" /* default */])('save and run macro event', e);
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'));

    var queries = Object(utils["parseQuery"])(window.location.search);
    var direct = window.location.protocol === 'file:' && !!queries['direct'];
    var agree = direct || confirm('Kantu: Do you want to import and run this macro?\n\nNote: To run the macro without this confirmation box, add the \'?direct=1\' switch to the URL. Example: file:///xx/xx/macro.html?direct=1');

    if (agree) {
      ipc_cs["a" /* default */].ask('CS_IMPORT_HTML_AND_INVOKE', content_script_extends({}, e.detail, { from: 'html', options: queries })).catch(function (e) {
        return alert('[kantu] ' + e.message);
      });
    }
  });

  // Test Suites
  window.addEventListener('kantuRunTestSuite', function (e) {
    Object(log["a" /* default */])('invoke event', e);
    window.dispatchEvent(new CustomEvent('kantuInvokeSuccess'));

    var queries = Object(utils["parseQuery"])(window.location.search);
    ipc_cs["a" /* default */].ask('CS_INVOKE', { testSuite: e.detail, options: queries }).catch(function (e) {
      return alert('[kantu] ' + e.message);
    });
  });
};

var hackAlertConfirmPrompt = function hackAlertConfirmPrompt() {
  var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

  var script = '\n    if (!window.oldAlert)     window.oldAlert   = window.alert\n    if (!window.oldConfirm)   window.oldConfirm = window.confirm\n    if (!window.oldPrompt)    window.oldPrompt  = window.prompt\n\n    window.alert = function (str) {\n      document.body.setAttribute(\'data-alert\', str)\n    }\n\n    window.confirm = function (str) {\n      document.body.setAttribute(\'data-confirm\', str)\n      return true\n    }\n\n    window.prompt = function (str) {\n      var answer = document.body.getAttribute(\'data-prompt-answer\')\n      document.body.setAttribute(\'data-prompt\', str)\n      document.body.setAttribute(\'data-prompt-answer\', \'\')\n      return answer\n    }\n  ';
  var s = doc.constructor.prototype.createElement.call(doc, 'script');

  s.setAttribute('type', 'text/javascript');
  s.text = script;

  doc.documentElement.appendChild(s);
  s.parentNode.removeChild(s);
};

var restoreAlertConfirmPrompt = function restoreAlertConfirmPrompt() {
  var script = '\n    if (window.oldAlert)    window.alert = window.oldAlert\n    if (window.oldConfirm)  window.confirm = window.oldConfirm\n    if (window.oldPrompt)   window.prompt = window.oldPrompt\n  ';
  var s = document.constructor.prototype.createElement.call(document, 'script');

  s.setAttribute('type', 'text/javascript');
  s.text = script;

  document.documentElement.appendChild(s);
  s.parentNode.removeChild(s);
};

var init = function init() {
  unbindEventsToRecord();
  content_script_bindEventsToRecord();

  content_script_bindEventsToInspect();
  content_script_bindOnMessage();
  content_script_loadConfig();

  // Note: only bind ipc events if it's the top window
  if (window.top === window) {
    content_script_bindIPCListener();
    content_script_bindInvokeEvent();
  } else {
    onUrlChange(init);
  }
};

var content_script_runCommand = function runCommand(command) {
  if (!command.cmd) {
    throw new Error('runCommand: must provide cmd');
  }

  // if it's an 'open' command, it must be executed in the top window
  if (content_script_state.playingFrame === window || command.cmd === 'open') {
    // Note: both top and inner frames could run commands here
    // So must use superCsIpc instead of csIpc
    var ret = Object(command_runner["b" /* run */])(command, superCsIpc, {
      highlightDom: content_script_highlightDom,
      hackAlertConfirmPrompt: hackAlertConfirmPrompt,
      xpath: inspector["a" /* default */].xpath
    });

    // Note: `run` returns the contentWindow of the selected frame
    if (command.cmd === 'selectFrame') {
      return ret.then(function (_ref3) {
        var frame = _ref3.frame;

        // let outside window know that playingFrame has been changed, if it's parent or top
        if (frame !== window && (frame === window.top || frame === window.parent)) {
          Object(cs_postmessage["b" /* postMessage */])(window.parent, window, {
            action: 'RESET_PLAYING_FRAME',
            data: frame === window.top ? 'TOP' : 'PARENT'
          });

          // set playingFrame to own window, get ready for later commands if any
          content_script_state.playingFrame = window;
        } else {
          content_script_state.playingFrame = frame;
        }

        return Promise.resolve({
          pageUrl: window.location.href,
          extra: command.extra
        });
      });
    }

    // Extra info passed on to background, it contains timeout info
    var wrapResult = function wrapResult(ret) {
      return content_script_extends({}, (typeof ret === 'undefined' ? 'undefined' : _typeof(ret)) === 'object' ? ret : {}, {
        pageUrl: window.location.href,
        extra: command.extra,
        // Note: undefined value in an Object will be eliminated during message passing,
        // Have to transform it into an object first, and convert it back in front end
        vars: !ret.vars ? undefined : Object(utils["objMap"])(function (val) {
          return val !== undefined ? val : { __undefined__: true };
        }, ret.vars)
      });
    };

    return Promise.resolve(ret).then(wrapResult);
  } else {
    // log('passing command to frame...', state.playingFrame, '...', window.location.href)
    // Note: pass on the command if our window is not the current playing one
    return Object(cs_postmessage["b" /* postMessage */])(content_script_state.playingFrame, window, {
      action: 'RUN_COMMAND',
      data: command
    });
  }
};

// Note: for cases like https://www.w3schools.com/jsref/tryit.asp?filename=tryjsref_onblur
// There is a kind of strange refresh in the iframe on right hand side,
// while content script is not reloaded in the mean time, it causes that iframe not able to be recorded
// So we have to listen to url change in iframes for this case.
var onUrlChange = function () {
  var callback = function callback() {};
  var lastUrl = window.location.href;
  var check = function check() {
    if (window.location.href !== lastUrl) {
      Object(log["a" /* default */])('url changed', lastUrl, window.location.href);
      lastUrl = window.location.href;
      callback();
    }
  };

  if (window.top === window) {
    return function () {};
  }

  setInterval(check, 2000);

  return function (fn) {
    callback = fn;
  };
}();

var content_script_loadConfig = function loadConfig() {
  storage["a" /* default */].get('config').then(function (config) {
    content_script_state.config = config;

    // IMPORTANT: broadcast status change to all frames inside
    content_script_broadcastToAllFrames('UPDATE_CONFIG', config);
  });
};

init();

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
/* harmony import */ var _ipc_cache__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(30);
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

/***/ 80:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process) {

if (!process.version ||
    process.version.indexOf('v0.') === 0 ||
    process.version.indexOf('v1.') === 0 && process.version.indexOf('v1.8.') !== 0) {
  module.exports = nextTick;
} else {
  module.exports = process.nextTick;
}

function nextTick(fn, arg1, arg2, arg3) {
  if (typeof fn !== 'function') {
    throw new TypeError('"callback" argument must be a function');
  }
  var len = arguments.length;
  var args, i;
  switch (len) {
  case 0:
  case 1:
    return process.nextTick(fn);
  case 2:
    return process.nextTick(function afterTickOne() {
      fn.call(null, arg1);
    });
  case 3:
    return process.nextTick(function afterTickTwo() {
      fn.call(null, arg1, arg2);
    });
  case 4:
    return process.nextTick(function afterTickThree() {
      fn.call(null, arg1, arg2, arg3);
    });
  default:
    args = new Array(len - 1);
    i = 0;
    while (i < args.length) {
      args[i++] = arguments[i];
    }
    return process.nextTick(function afterTick() {
      fn.apply(null, args);
    });
  }
}

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(46)))

/***/ }),

/***/ 81:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(process, setImmediate) {// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.



module.exports = Writable;

/*<replacement>*/
var processNextTick = __webpack_require__(80);
/*</replacement>*/

/*<replacement>*/
var asyncWrite = !process.browser && ['v0.10', 'v0.9.'].indexOf(process.version.slice(0, 5)) > -1 ? setImmediate : processNextTick;
/*</replacement>*/

/*<replacement>*/
var Buffer = __webpack_require__(36).Buffer;
/*</replacement>*/

Writable.WritableState = WritableState;

/*<replacement>*/
var util = __webpack_require__(58);
util.inherits = __webpack_require__(28);
/*</replacement>*/

/*<replacement>*/
var internalUtil = {
  deprecate: __webpack_require__(174)
};
/*</replacement>*/

/*<replacement>*/
var Stream;
(function () {
  try {
    Stream = __webpack_require__(53);
  } catch (_) {} finally {
    if (!Stream) Stream = __webpack_require__(65).EventEmitter;
  }
})();
/*</replacement>*/

var Buffer = __webpack_require__(36).Buffer;

util.inherits(Writable, Stream);

function nop() {}

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
}

var Duplex;
function WritableState(options, stream) {
  Duplex = Duplex || __webpack_require__(51);

  options = options || {};

  // object stream flag to indicate whether or not this stream
  // contains buffers or objects.
  this.objectMode = !!options.objectMode;

  if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

  // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()
  var hwm = options.highWaterMark;
  var defaultHwm = this.objectMode ? 16 : 16 * 1024;
  this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

  // cast to ints.
  this.highWaterMark = ~ ~this.highWaterMark;

  this.needDrain = false;
  // at the start of calling end()
  this.ending = false;
  // when end() has been called, and returned
  this.ended = false;
  // when 'finish' is emitted
  this.finished = false;

  // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.
  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode;

  // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.
  this.defaultEncoding = options.defaultEncoding || 'utf8';

  // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.
  this.length = 0;

  // a flag to see when we're in the middle of a write.
  this.writing = false;

  // when true all writes will be buffered until .uncork() call
  this.corked = 0;

  // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.
  this.sync = true;

  // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.
  this.bufferProcessing = false;

  // the callback that's passed to _write(chunk,cb)
  this.onwrite = function (er) {
    onwrite(stream, er);
  };

  // the callback that the user supplies to write(chunk,encoding,cb)
  this.writecb = null;

  // the amount that is being written when _write is called.
  this.writelen = 0;

  this.bufferedRequest = null;
  this.lastBufferedRequest = null;

  // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted
  this.pendingcb = 0;

  // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams
  this.prefinished = false;

  // True if the error was already emitted and should not be thrown again
  this.errorEmitted = false;

  // count buffered requests
  this.bufferedRequestCount = 0;

  // create the two objects needed to store the corked requests
  // they are not a linked list, as no new elements are inserted in there
  this.corkedRequestsFree = new CorkedRequest(this);
  this.corkedRequestsFree.next = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function writableStateGetBuffer() {
  var current = this.bufferedRequest;
  var out = [];
  while (current) {
    out.push(current);
    current = current.next;
  }
  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function () {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
    });
  } catch (_) {}
})();

var Duplex;
function Writable(options) {
  Duplex = Duplex || __webpack_require__(51);

  // Writable ctor is applied to Duplexes, though they're not
  // instanceof Writable, they're instanceof Readable.
  if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

  this._writableState = new WritableState(options, this);

  // legacy.
  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;

    if (typeof options.writev === 'function') this._writev = options.writev;
  }

  Stream.call(this);
}

// Otherwise people can pipe Writable streams, which is just wrong.
Writable.prototype.pipe = function () {
  this.emit('error', new Error('Cannot pipe. Not readable.'));
};

function writeAfterEnd(stream, cb) {
  var er = new Error('write after end');
  // TODO: defer error events consistently everywhere, not just the cb
  stream.emit('error', er);
  processNextTick(cb, er);
}

// If we get something that is not a buffer, string, null, or undefined,
// and we're not in objectMode, then that's an error.
// Otherwise stream chunks are all considered to be of length=1, and the
// watermarks determine how many objects to keep in the buffer, rather than
// how many bytes or characters.
function validChunk(stream, state, chunk, cb) {
  var valid = true;

  if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
    var er = new TypeError('Invalid non-string/buffer chunk');
    stream.emit('error', er);
    processNextTick(cb, er);
    valid = false;
  }
  return valid;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

  if (typeof cb !== 'function') cb = nop;

  if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, chunk, encoding, cb);
  }

  return ret;
};

Writable.prototype.cork = function () {
  var state = this._writableState;

  state.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;

    if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
  this._writableState.defaultEncoding = encoding;
};

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = new Buffer(chunk, encoding);
  }
  return chunk;
}

// if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.
function writeOrBuffer(stream, state, chunk, encoding, cb) {
  chunk = decodeChunk(state, chunk, encoding);

  if (Buffer.isBuffer(chunk)) encoding = 'buffer';
  var len = state.objectMode ? 1 : chunk.length;

  state.length += len;

  var ret = state.length < state.highWaterMark;
  // we must ensure that previous needDrain will not be reset to false.
  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }
    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;
  if (sync) processNextTick(cb, er);else cb(er);

  stream._writableState.errorEmitted = true;
  stream.emit('error', er);
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;

  onwriteStateUpdate(state);

  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state);

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      /*<replacement>*/
      asyncWrite(afterWrite, stream, state, finished, cb);
      /*</replacement>*/
    } else {
        afterWrite(stream, state, finished, cb);
      }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
}

// Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.
function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
}

// if there's something in the buffer waiting, then process it
function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;

    var count = 0;
    while (entry) {
      buffer[count] = entry;
      entry = entry.next;
      count += 1;
    }

    doWrite(stream, state, true, state.length, buffer, '', holder.finish);

    // doWrite is always async, defer these to save a bit of time
    // as the hot path ends with doWrite
    state.pendingcb++;
    state.lastBufferedRequest = null;
    state.corkedRequestsFree = holder.next;
    holder.next = null;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;

      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.
      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequestCount = 0;
  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new Error('not implemented'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

  // .end() fully uncorks
  if (state.corked) {
    state.corked = 1;
    this.uncork();
  }

  // ignore unnecessary end() calls.
  if (!state.ending && !state.finished) endWritable(this, state, cb);
};

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function prefinish(stream, state) {
  if (!state.prefinished) {
    state.prefinished = true;
    stream.emit('prefinish');
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);
  if (need) {
    if (state.pendingcb === 0) {
      prefinish(stream, state);
      state.finished = true;
      stream.emit('finish');
    } else {
      prefinish(stream, state);
    }
  }
  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);
  if (cb) {
    if (state.finished) processNextTick(cb);else stream.once('finish', cb);
  }
  state.ended = true;
  stream.writable = false;
}

// It seems a linked list but it is not
// there will be only 2 of these for each stream
function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function (err) {
    var entry = _this.entry;
    _this.entry = null;
    while (entry) {
      var cb = entry.callback;
      state.pendingcb--;
      cb(err);
      entry = entry.next;
    }
    if (state.corkedRequestsFree) {
      state.corkedRequestsFree.next = _this;
    } else {
      state.corkedRequestsFree = _this;
    }
  };
}
/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(46), __webpack_require__(128).setImmediate))

/***/ }),

/***/ 82:
/***/ (function(module, exports, __webpack_require__) {

"use strict";
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.



module.exports = Transform;

var Duplex = __webpack_require__(51);

/*<replacement>*/
var util = __webpack_require__(58);
util.inherits = __webpack_require__(28);
/*</replacement>*/

util.inherits(Transform, Duplex);

function TransformState(stream) {
  this.afterTransform = function (er, data) {
    return afterTransform(stream, er, data);
  };

  this.needTransform = false;
  this.transforming = false;
  this.writecb = null;
  this.writechunk = null;
  this.writeencoding = null;
}

function afterTransform(stream, er, data) {
  var ts = stream._transformState;
  ts.transforming = false;

  var cb = ts.writecb;

  if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

  ts.writechunk = null;
  ts.writecb = null;

  if (data !== null && data !== undefined) stream.push(data);

  cb(er);

  var rs = stream._readableState;
  rs.reading = false;
  if (rs.needReadable || rs.length < rs.highWaterMark) {
    stream._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);

  Duplex.call(this, options);

  this._transformState = new TransformState(this);

  // when the writable side finishes, then flush out anything remaining.
  var stream = this;

  // start out asking for a readable event once data is transformed.
  this._readableState.needReadable = true;

  // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.
  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;

    if (typeof options.flush === 'function') this._flush = options.flush;
  }

  this.once('prefinish', function () {
    if (typeof this._flush === 'function') this._flush(function (er) {
      done(stream, er);
    });else done(stream);
  });
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
};

// This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.
Transform.prototype._transform = function (chunk, encoding, cb) {
  throw new Error('not implemented');
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;
  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
};

// Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.
Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
    ts.transforming = true;
    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

function done(stream, er) {
  if (er) return stream.emit('error', er);

  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided
  var ws = stream._writableState;
  var ts = stream._transformState;

  if (ws.length) throw new Error('calling transform done when ws.length != 0');

  if (ts.transforming) throw new Error('calling transform done when still transforming');

  return stream.push(null);
}

/***/ }),

/***/ 87:
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

/***/ 89:
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
/* unused harmony export aesEncrypt */
/* unused harmony export aesDecrypt */
/* unused harmony export encrypt */
/* unused harmony export decrypt */
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "b", function() { return encryptIfNeeded; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "a", function() { return decryptIfNeeded; });
/* harmony import */ var pbkdf2__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(92);
/* harmony import */ var pbkdf2__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(pbkdf2__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var aes_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(52);
/* harmony import */ var aes_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(aes_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(3);
/* harmony import */ var _web_extension__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_web_extension__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _storage__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(32);





var RAW_PREFIX = '@_KANTU_@';
var CIPHER_PREFIX = '__KANTU_ENCRYPTED__';
var RAW_PREFIX_REG = new RegExp('^' + RAW_PREFIX);
var CIPHER_PREFIX_REG = new RegExp('^' + CIPHER_PREFIX);

var getEncryptConfig = function getEncryptConfig() {
  return _storage__WEBPACK_IMPORTED_MODULE_3__[/* default */ "a"].get('config').then(function (config) {
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

/***/ }),

/***/ 91:
/***/ (function(module, exports) {

module.exports = function (glob, opts) {
  if (typeof glob !== 'string') {
    throw new TypeError('Expected a string');
  }

  var str = String(glob);

  // The regexp we are building, as a string.
  var reStr = "";

  // Whether we are matching so called "extended" globs (like bash) and should
  // support single character matching, matching ranges of characters, group
  // matching, etc.
  var extended = opts ? !!opts.extended : false;

  // Whether or not to capture those stars, it means wrapping them with parentheses
  // It's not necessary if globstart is turned on
  var capture = opts ? !!opts.capture : false;

  // When globstar is _false_ (default), '/foo/*' is translated a regexp like
  // '^\/foo\/.*$' which will match any string beginning with '/foo/'
  // When globstar is _true_, '/foo/*' is translated to regexp like
  // '^\/foo\/[^/]*$' which will match any string beginning with '/foo/' BUT
  // which does not have a '/' to the right of it.
  // E.g. with '/foo/*' these will match: '/foo/bar', '/foo/bar.txt' but
  // these will not '/foo/bar/baz', '/foo/bar/baz.txt'
  // Lastely, when globstar is _true_, '/foo/**' is equivelant to '/foo/*' when
  // globstar is _false_
  var globstar = opts ? !!opts.globstar : false;

  // If we are doing extended matching, this boolean is true when we are inside
  // a group (eg {*.html,*.js}), and false otherwise.
  var inGroup = false;

  // RegExp flags (eg "i" ) to pass in to RegExp constructor.
  var flags = opts && typeof( opts.flags ) === "string" ? opts.flags : "";

  var c;
  for (var i = 0, len = str.length; i < len; i++) {
    c = str[i];

    switch (c) {
    case "/":
    case "$":
    case "^":
    case "+":
    case ".":
    case "(":
    case ")":
    case "=":
    case "!":
    case "|":
      reStr += "\\" + c;
      break;

    case "?":
      if (extended) {
        reStr += ".";
	    break;
      }

    case "[":
    case "]":
      if (extended) {
        reStr += c;
	    break;
      }

    case "{":
      if (extended) {
        inGroup = true;
	    reStr += "(";
	    break;
      }

    case "}":
      if (extended) {
        inGroup = false;
	    reStr += ")";
	    break;
      }

    case ",":
      if (inGroup) {
        reStr += "|";
	    break;
      }
      reStr += "\\" + c;
      break;

    case "*":
      // Move over all consecutive "*"'s.
      // Also store the previous and next characters
      var prevChar = str[i - 1];
      var starCount = 1;
      while(str[i + 1] === "*") {
        starCount++;
        i++;
      }
      var nextChar = str[i + 1];

      if (!globstar) {
        // globstar is disabled, so treat any number of "*" as one
        reStr += capture ? "(.*)" : ".*";
      } else {
        // globstar is enabled, so determine if this is a globstar segment
        var isGlobstar = starCount > 1                      // multiple "*"'s
          && (prevChar === "/" || prevChar === undefined)   // from the start of the segment
          && (nextChar === "/" || nextChar === undefined)   // to the end of the segment

        if (isGlobstar) {
          // it's a globstar, so match zero or more path segments
          reStr += "((?:[^/]*(?:\/|$))*)";
          i++; // move over the "/"
        } else {
          // it's not a globstar, so only match one path segment
          reStr += "([^/]*)";
        }
      }
      break;

    default:
      reStr += c;
    }
  }

  // When regexp 'g' flag is specified don't
  // constrain the regular expression with ^ & $
  if (!flags || !~flags.indexOf('g')) {
    reStr = "^" + reStr + "$";
  }

  return new RegExp(reStr, flags);
};


/***/ }),

/***/ 92:
/***/ (function(module, exports, __webpack_require__) {


exports.pbkdf2 = __webpack_require__(200)

exports.pbkdf2Sync = __webpack_require__(118)


/***/ })

/******/ });