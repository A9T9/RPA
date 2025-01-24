import ee from 'event-emitter'
import { pick, delay } from './utils'
import log from '../common/log'

const MODE = {
  STRAIGHT: 'STRAIGHT',
  SINGLE: 'SINGLE',
  LOOP: 'LOOP'
}

const STATUS = {
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
  ERROR: 'ERROR'
}

const END_REASON = {
  COMPLETE: 'COMPLETE',
  ERROR: 'ERROR',
  MANUAL: 'MANUAL'
}

const NEXT_INDEX_INITIATOR = {
  INIT: 'INIT',
  NORMAL: 'NORMAL',
  LOOP: 'LOOP'
}

const isEmpty = (x) => x === undefined || x === null

const initialState = {
  startUrl: null,

  startIndex: null,
  endIndex: null,
  nextIndex: null,
  nextIndexInitiator: NEXT_INDEX_INITIATOR.INIT,

  errorIndex: null,
  doneIndices: [],

  mode: MODE.STRAIGHT,
  resources: [],

  // preDelay: 0,
  // postDelay: 0,

  status: STATUS.STOPPED
}

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
// 2. PREPARED
// 3. TO_PLAY
// 4. PLAYED_LIST
// 5. PAUSED
// 6. RESUMED
// 7. END
// 8. ERROR

export class Player {
  state = {
    ...initialState
  }

  toResumePromises = {}

  constructor(opts, state) {
    if (!opts) {
      throw new Error('Player - constructor: must provide opts as 1st argument')
    }

    if (typeof opts.run !== 'function') {
      throw new Error('Player - constructor: must provide a run function')
    }

    if (typeof opts.prepare !== 'function') {
      throw new Error('Player - constructor: must provide a prepare function')
    }

    if (typeof opts.handleResult !== 'function') {
      throw new Error('Player - constructor: must provide a handleResult function')
    }

    this.__run = opts.run
    this.__prepare = opts.prepare
    this.__handle = opts.handleResult

    this.__setState(state || {})
  }

  play(config) {
    if (!config) {
      throw new Error('Player - play: config should not be empty')
    }

    if (!config.mode || Object.keys(MODE).indexOf(config.mode) === -1) {
      throw new Error('Player - play: must provide a valid mode, now it is ' + config.mode)
    }

    if (
      config.mode === MODE.LOOP &&
      (!config.loopsStart ||
        config.loopsStart < 0 ||
        Math.floor(config.loopsStart) !== config.loopsStart ||
        !config.loopsEnd ||
        config.loopsEnd < config.loopsStart ||
        Math.floor(config.loopsEnd) !== config.loopsEnd)
    ) {
      throw new Error(
        `Player - play: must provide a valid tuple of "loopsStart" and "loopsEnd" in loop mode, now it is ${config.loopsStart}, ${config.loopsEnd}`
      )
    }

    if (config.resources.length !== 0) {
      if (isEmpty(config.startIndex) || config.startIndex < 0 || config.startIndex >= config.resources.length) {
        throw new Error(`Player - play: startIndex out of range, now it is ${config.startIndex}, len: ${config.resources.length}`)
      }
    }

    // Note: endIndex could be omitted
    if (!isEmpty(config.endIndex) && (config.endIndex < 0 || config.endIndex >= config.resources.length)) {
      throw new Error(`Player - play: endIndex out of range, now it is ${config.endIndex}, len: ${config.resources.length}`)
    }

    const {
      nextIndex,
      startIndex,
      startUrl,
      resources,
      title,
      extra,
      doneIndices,
      noEndEvent,
      token,
      isStep,
      loopsCursor,
      loopsStart,
      loopsEnd,
      isBackFromCalling,
      needDelayAfterLoop
    } = config
    const endIndex = config.endIndex || resources.length - 1
    const basicState = {
      token,
      title,
      extra,
      needDelayAfterLoop,
      isBackFromCalling,
      startUrl,
      startIndex,
      endIndex,
      nextIndex: nextIndex !== undefined ? nextIndex : startIndex,
      errorIndex: null,
      doneIndices: doneIndices || [],
      mode: config.mode,
      loopsCursor: 1,
      loopsStart: 1,
      loopsEnd: 1,
      isStep: isStep || false,
      noEndEvent: noEndEvent || false,
      resources: config.resources,
      breakpoints: config.breakpoints || [],
      status: STATUS.PLAYING,
      public: config.public || {},
      callback: config.callback || function () {},
      lastPlayConfig: config,
      playUID: Math.random()
    }

    ;['preDelay', 'postDelay'].forEach((key) => {
      if (isEmpty(config[key])) return
      basicState[key] = config[key]
    })

    switch (config.mode) {
      case MODE.STRAIGHT:
        this.__setState({
          ...basicState
        })
        break

      case MODE.SINGLE:
        this.__setState({
          ...basicState,
          endIndex: startIndex
        })
        break

      case MODE.LOOP:
        this.__setState({
          ...basicState,
          loopsStart,
          loopsEnd,
          loopsCursor: loopsCursor !== undefined ? loopsCursor : loopsStart
        })
        break

      default:
        break
    }

    this.emit('START', {
      title,
      loopsCursor: this.state.loopsCursor,
      doneIndices: this.state.doneIndices,
      extra: this.state.extra,
      isBackFromCalling: this.state.isBackFromCalling
    })

    return Promise.resolve()
      .then(() => this.__prepare(this.state))
      .then(() => {
        this.emit('PREPARED', {
          title,
          loopsCursor: this.state.loopsCursor,
          doneIndices: this.state.doneIndices,
          extra: this.state.extra,
          isBackFromCalling: this.state.isBackFromCalling
        })
      })
      .then(
        () => this.__go(this.state.token || null),
        (e) => this.__errLog(e, e.errorIndex)
      )
  }

  pause() {
    this.__setState({
      status: STATUS.PAUSED
    })

    setTimeout(() => {
      this.emit('PAUSED', { extra: this.state.extra })
    }, 0)

    return this.__createPromiseWaitForResume(this.state.token)
  }

  resume(isStep) {
    this.__setState({
      status: STATUS.PLAYING,
      isStep: !!isStep
    })

    this.emit('RESUMED', { extra: this.state.extra })
    // this.__go(null)

    const item = this.toResumePromises[this.state.token]

    if (item && item.resolve) {
      item.resolve()
    }
  }

  stop(opts) {
    this.__end(END_REASON.MANUAL, opts)
  }

  stopWithError(error) {
    this.__errLog(error)
  }

  jumpTo(nextIndex) {
    const { resources } = this.state

    // Note: validate nextIndex by resources.length instead of startIndex and endIndex,
    // to make it possible for 'run from here' to jump to commands ahead of the start point
    if (nextIndex < 0 || nextIndex >= resources.length) {
      throw new Error('jumpTo: nextIndex out of range')
    }

    this.__setState({
      nextIndex
    })
  }

  setPostDelay(n) {
    this.__setState({
      postDelay: n
    })
  }

  setSuperFastMode(val) {
    this.__setState({
      superFast: val
    })
  }

  getStatus() {
    return this.state.status
  }

  getState() {
    return { ...this.state }
  }

  setState(state) {
    return this.__setState(state)
  }

  replayLastConfig() {
    const config = this.state.lastPlayConfig
    if (!config) throw new Error('No last play config available')

    return this.play({
      ...config,
      nextIndex: config.startIndex
    })
  }

  // Note: playUID changes on every `play` call
  // it's useful for features with timer to tell if it should continue to run
  getPlayUID() {
    return this.state.playUID
  }

  checkPlayUID(uid) {
    return this.state.playUID === uid
  }

  __go(token) {
    // Note: in case it is returned from previous call

    if (token === undefined || token === null) {
      this.state.token = token = Math.random()
    } else if (token !== this.state.token) {
      return
    }

    const guardToken =
      (fn) =>
      (...args) => {
        if (token !== this.state.token) {
          throw new Error('token expired')
        }
        return fn(...args)
      }

    const { resources, nextIndex, preDelay } = this.state
    const pre = preDelay > 0 ? this.__delay(() => undefined, preDelay) : Promise.resolve()

    // Note: the flow of this process:
    // 1. delay if `preDelay` set
    // 2. check `__shouldContinue`
    // 3. stop if the player is stopped or paused
    // 4. otherwise call `__run` to actually consume the current resource
    // 5. set the state to next by calling `__setNext`
    // 6. delay if `postDelay` set
    return pre
      .then(() => {
        return this.__shouldContinue()
      })
      .then(({ paused, complete }) => {
        if (paused) {
          throw new Error('player: paused or stopped')
        }

        if (complete) {
          return
        }

        const { resources, nextIndex, startIndex, loopsCursor, loopsStart, loopsEnd, nextIndexInitiator, superFast } = this.state

        const obj = {
          loopsCursor,
          index: nextIndex,
          currentLoop: loopsCursor - loopsStart + 1,
          loops: loopsEnd - loopsStart + 1,
          resource: resources[nextIndex],
          extra: this.state.extra
        }

        // Note: when we're running loops
        const isBottomFrame = !this.state.extra || this.state.extra.isBottomFrame

        if (isBottomFrame && nextIndex === startIndex) {
          if (nextIndexInitiator === NEXT_INDEX_INITIATOR.LOOP || nextIndexInitiator === NEXT_INDEX_INITIATOR.INIT) {
            this.emit('LOOP_START', obj)
          }

          if (nextIndexInitiator === NEXT_INDEX_INITIATOR.LOOP && loopsCursor !== loopsStart) {
            this.emit('LOOP_RESTART', obj)
          }
        }

        this.emit('TO_PLAY', {
          index: nextIndex,
          currentLoop: loopsCursor - loopsStart + 1,
          loops: loopsEnd - loopsStart + 1,
          resource: resources[nextIndex],
          extra: this.state.extra
        })

        const hasBreakpoints = this.state.breakpoints?.length > 0

        // **Info: breakpoint promise takes 30ms
        const possibleBreakpointPromise = !hasBreakpoints
          ? Promise.resolve()
          : (() => {
              log('8. possibleBreakpointPromise:>> ')
              // Note: there will never be two breakpoints in straight. Use `lastBreakpoint` to tell whether we just hit a breakpoint
              // Also note that, 'TO_PLAY' events need to be fired before we pause.
              if (this.state.lastBreakpoint === undefined && this.state.breakpoints.indexOf(nextIndex) !== -1) {
                this.__setState({ lastBreakpoint: nextIndex })
                this.emit('BREAKPOINT', {
                  index: nextIndex,
                  currentLoop: loopsCursor - loopsStart + 1,
                  loops: loopsEnd - loopsStart + 1,
                  resource: resources[nextIndex],
                  extra: this.state.extra
                })
                return this.pause()
              } else {
                this.__setState({ lastBreakpoint: undefined })
                return Promise.resolve()
              }
            })()

        // Note: Check whether token expired or not after each async operations
        // Also also in the final catch to prevent unnecessary invoke of __errLog
        return (
          possibleBreakpointPromise
            // ** This is where player run happens
            .then(() => this.__run(resources[nextIndex], this.state))
            .then(
              guardToken((res) => {
                // Note: allow users to handle the result
                return this.__handle(res, resources[nextIndex], this.state)
                  .then(
                    guardToken((nextIndex) => {
                      // Note: __handle has the chance to return a `nextIndex`, mostly when it's
                      // from a flow logic. But still, it could be undefined for normal commands
                      const oldLoopsCursor = this.state.loopsCursor

                      this.__setNext(nextIndex)
                      // TODO: re-consider this. It delays the chain by 20ms for this go to the next then statement
                      // if( !superFast ) {
                      // ** this is important for played command to turn green
                      this.emit('PLAYED_LIST', {
                        indices: this.state.doneIndices,
                        extra: this.state.extra
                      })
                      // }

                      return oldLoopsCursor !== this.state.loopsCursor
                    })
                  )
                  .then((isLoopsCursorChanged) => {
                    // __handle may change postDelay
                    const { postDelay, needDelayAfterLoop } = this.state
                    const delay = Math.max(postDelay, isLoopsCursorChanged && needDelayAfterLoop ? 10 : 0)
                    return delay > 0 ? this.__delay(() => undefined, delay) : Promise.resolve()
                  })
                  .then(() => {
                    if (this.state.isStep) return this.pause().then(() => this.__go(token))
                    return this.__go(token)
                  })
              })
            )
            .catch(guardToken((err) => this.__errLog(err)))
        )
      })
  }

  __shouldContinue() {
    const { status, mode, nextIndex, startIndex, endIndex, token } = this.state
    let ret

    if (status === STATUS.PAUSED || status === STATUS.STOPPED) {
      // Note: when it's paused, use a pending promise to holde the execution
      // so we can continue running after resume and resolve the promise
      const promiseItem = this.toResumePromises[this.state.token]
      return promiseItem ? promiseItem.promise.then(() => ({})) : { paused: true }
    }

    if (status === STATUS.PLAYING && nextIndex >= startIndex && nextIndex <= endIndex) {
      return Promise.resolve({ paused: false, complete: false })
    }

    // Note: make this function return promise, just in case
    // an async check is needed in future

    this.__end(END_REASON.COMPLETE)
    return Promise.resolve({ complete: true })
  }

  __createPromiseWaitForResume(token) {
    const p = new Promise((resolve, reject) => {
      setTimeout(() => {
        this.toResumePromises[token] = {
          resolve,
          reject,
          promise: p
        }
      }, 10)
    })

    return p
  }

  __createPromiseForStop(token, stopReason) {
    const p = new Promise((resolve, reject) => {
      setTimeout(() => {
        this.toResumePromises[token] = {
          resolve,
          reject,
          promise: p
        }

        reject(new Error(`Stop reason: ${stopReason}`))
      }, 10)
    })

    return p
  }

  __end(reason, opts) {
    // Note: CANNOT end the player twice
    if (this.state.status === STATUS.STOPPED) return

    if (Object.keys(END_REASON).indexOf(reason) === -1) {
      throw new Error('Player - __end: invalid reason, ' + reason)
    }

    const silent = opts && opts.silent
    const noEndEvent = this.state.noEndEvent && reason === END_REASON.COMPLETE

    if (!noEndEvent && !silent) {
      this.emit('END', { opts, reason, extra: this.state.extra })

      if (reason !== END_REASON.ERROR) {
        this.state.callback(null, reason)
      }
    }

    if (reason !== END_REASON.COMPLETE) {
      this.__createPromiseForStop(this.state.token, reason)
    }

    this.__setState({
      status: STATUS.STOPPED
    })

    if (this.state.extra && this.state.extra.isBottomFrame) {
      this.__setState({
        nextIndexInitiator: NEXT_INDEX_INITIATOR.INIT
      })
    }
  }

  __errLog(err, errorIndex) {
    // Note: CANNOT log error if player is already stopped
    if (this.state.status === STATUS.STOPPED) {
      throw new Error(err)
    }

    this.emit('ERROR', {
      errorIndex: errorIndex !== undefined ? errorIndex : this.state.nextIndex,
      msg: err && err.message,
      stack: err && err.stack,
      extra: this.state.extra,
      restart: !!err.restart
    })
    this.state.callback(err, null)
    this.__end(END_REASON.ERROR)

    throw new Error(err)
  }

  __setNext(nextIndexPassed) {
    if (nextIndexPassed !== undefined && (nextIndexPassed < 0 || nextIndexPassed > this.state.resources.length)) {
      // Note: nextIndexPassed is allowed to be equal to resources.length
      // That means we run out of commands
      throw new Error(`invalid nextIndexPassed ${nextIndexPassed}`)
    }

    const { mode, doneIndices, nextIndex, endIndex, startIndex, loopsCursor, loopsEnd } = this.state

    const nextIndexToSet = nextIndexPassed !== undefined ? nextIndexPassed : nextIndex + 1

    let done = doneIndices.indexOf(nextIndex) === -1 ? [...doneIndices, nextIndex] : doneIndices
    let lcur = loopsCursor
    let next = null
    let initiator = NEXT_INDEX_INITIATOR.NORMAL

    if (mode === MODE.LOOP) {
      if (nextIndexToSet <= endIndex) {
        next = nextIndexToSet
      } else if (loopsCursor >= loopsEnd) {
        next = nextIndexToSet
      } else {
        lcur += 1
        next = startIndex
        done = []
        initiator = NEXT_INDEX_INITIATOR.LOOP
      }
    } else {
      next = nextIndexToSet
    }

    // __setNext is still called after __end
    // so to protect the INIT value, check whether
    // it's already stopped
    if (this.state.status === STATUS.STOPPED && this.state.nextIndexInitiator === NEXT_INDEX_INITIATOR.INIT) {
      initiator = NEXT_INDEX_INITIATOR.INIT
    }

    this.__setState({
      loopsCursor: lcur,
      nextIndex: next,
      nextIndexInitiator: initiator,
      doneIndices: done
    })
  }

  __setState(obj) {
    this.state = {
      ...this.state,
      ...obj
    }
  }

  __delay(fn, timeout) {
    let past = 0
    const timer = setInterval(() => {
      past += 1000
      this.emit('DELAY', {
        extra: this.state.extra,
        total: timeout,
        past
      })
    }, 1000)

    return delay(fn, timeout).then((res) => {
      if (timer) clearInterval(timer)
      return res
    })
  }
}

ee(Player.prototype)

Player.C = Player.prototype.C = {
  MODE,
  STATUS,
  END_REASON
}

let playerPool = {}

// factory function to return a player singleton
export const getPlayer = (opts = {}, state) => {
  const name = opts.name || 'testCase'
  delete opts.name

  if (Object.keys(opts).length > 0) {
    playerPool[name] = new Player(opts, state)
  }

  if (!playerPool[name]) {
    throw new Error('player not initialized')
  }

  return playerPool[name]
}
