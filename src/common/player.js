import ee from 'event-emitter'
import { pick, delay } from './utils'

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

const isEmpty = x => x === undefined || x === null

const initialState = {
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
// 2. TO_PLAY
// 3. PLAYED_LIST
// 4. PAUSED
// 5. RESUMED
// 6. END
// 7. ERROR

export class Player {
  state = {
    ...initialState
  }

  constructor (opts, state) {
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

    this.__run      = opts.run
    this.__prepare  = opts.prepare
    this.__handle   = opts.handleResult

    this.__setState(state || {})
  }

  play (config) {
    if (!config) {
      throw new Error('Player - play: config should not be empty')
    }

    if (!config.mode || Object.keys(MODE).indexOf(config.mode) === -1) {
      throw new Error('Player - play: must provide a valid mode, now it is ' + config.mode)
    }

    if (config.mode === MODE.LOOP &&
        (!config.loopsStart || config.loopsStart < 0 || Math.floor(config.loopsStart) !== config.loopsStart ||
         !config.loopsEnd   || config.loopsEnd < config.loopsStart || Math.floor(config.loopsEnd) !== config.loopsEnd)) {
      throw new Error(`Player - play: must provide a valid tuple of "loopsStart" and "loopsEnd" in loop mode, now it is ${config.loopsStart}, ${config.loopsEnd}`)
    }

    if (!config.resources || !config.resources.length) {
      throw new Error('Player - play: resources should not be empty')
    }

    if (isEmpty(config.startIndex) || config.startIndex < 0 ||
        config.startIndex >= config.resources.length) {
      throw new Error(`Player - play: startIndex out of range, now it is ${config.startIndex}, len: ${config.resources.length}`)
    }

    // Note: endIndex could be omitted
    if (!isEmpty(config.endIndex) &&
        (config.endIndex < 0 || config.endIndex >= config.resources.length)) {
      throw new Error(`Player - play: endIndex out of range, now it is ${config.endIndex}, len: ${config.resources.length}`)
    }

    const { startIndex, startUrl, resources, title, extra } = config
    const endIndex = config.endIndex || resources.length - 1
    const basicState = {
      title,
      extra,
      startUrl,
      startIndex,
      endIndex,
      nextIndex: startIndex,
      errorIndex: null,
      doneIndices: [],
      mode: config.mode,
      loopsCursor: 1,
      loopsStart: 1,
      loopsEnd: 1,
      resources: config.resources,
      status: STATUS.PLAYING,
      public: config.public || {}
    }

    ;['preDelay', 'postDelay'].forEach(key => {
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
          loopsCursor: config.loopsStart,
          loopsStart: config.loopsStart,
          loopsEnd: config.loopsEnd
        })
        break

      default:
        break
    }

    this.emit('START', { title })

    return Promise.resolve()
    .then(() => this.__prepare(this.state))
    .then(
      ()  => this.__go(),
      e   => this.__errLog(e, e.errorIndex)
    )
  }

  pause () {
    this.__setState({
      status: STATUS.PAUSED
    })

    this.emit('PAUSED', {})
  }

  resume () {
    this.__setState({
      status: STATUS.PLAYING
    })

    this.emit('RESUMED', {})
    this.__go()
  }

  stop () {
    this.__end(END_REASON.MANUAL)
  }

  jumpTo (nextIndex) {
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

  setPostDelay (n) {
    this.__setState({
      postDelay: n
    })
  }

  __go () {
    const { resources, nextIndex, preDelay } = this.state
    const pre = preDelay > 0 ? this.__delay(() => undefined, preDelay) : Promise.resolve()

    // Note: the flow of this process:
    // 1. delay if `preDelay` set
    // 2. check `__shouldContinue`
    // 3. stop if the player is stopped or paused
    // 4. otherwise call `__run` to actually consume the current resource
    // 5. set the state to next by calling `__setNext`
    // 6. delay if `postDelay` set
    return pre.then(() => {
        return this.__shouldContinue()
      })
      .then(({ paused, stopped }) => {
        if (stopped)      return this.__end(END_REASON.COMPLETE)
        else if (paused)  return

        const {
          resources, nextIndex, startIndex,
          loopsCursor, loopsStart, loopsEnd
        } = this.state

        // Note: when we're running loops
        if (loopsCursor !== loopsStart && nextIndex === startIndex) {
          this.emit('LOOP_RESTART', {
            index: nextIndex,
            currentLoop: loopsCursor - loopsStart + 1,
            loops: loopsEnd - loopsStart + 1,
            resource: resources[nextIndex]
          })
        }

        this.emit('TO_PLAY', {
          index: nextIndex,
          currentLoop: loopsCursor - loopsStart + 1,
          loops: loopsEnd - loopsStart + 1,
          resource: resources[nextIndex]
        })

        return this.__run(resources[nextIndex], this.state)
          .then(res => {
            const { postDelay } = this.state

            // Note: allow users to handle the result
            return this.__handle(res, resources[nextIndex], this.state)
            .then(nextIndex => {
              // Note: __handle has the chance to return a `nextIndex`, mostly when it's
              // from a flow logic. But still, it could be undefined for normal commands
              this.__setNext(nextIndex)
              this.emit('PLAYED_LIST', {
                indices: this.state.doneIndices
              })
            })
            .then(
              () => postDelay > 0 ? this.__delay(() => undefined, postDelay) : Promise.resolve()
            )
            .then(() => this.__go())
          })
          .catch(err => this.__errLog(err))
      })
  }

  __shouldContinue () {
    const { status, mode, nextIndex, startIndex, endIndex } = this.state
    let ret

    if (status === STATUS.PLAYING &&
        nextIndex >= startIndex &&
        nextIndex <= endIndex) {
      ret = { paused: false, stopped: false }
    } else if (status === STATUS.PAUSED) {
      ret = { paused: true }
    } else {
      ret = { stopped: true }
    }

    // Note: make this function return promise, just in case
    // an async check is needed in future
    return Promise.resolve(ret)
  }

  __end (reason) {
    if (Object.keys(END_REASON).indexOf(reason) === -1) {
      throw new Error('Player - __end: invalid reason, ' + reason)
    }

    this.emit('END', { reason, extra: this.state.extra })
    this.__setState(initialState)
  }

  __errLog (err, errorIndex) {
    this.emit('ERROR', {
      errorIndex: errorIndex !== undefined ? errorIndex : this.state.nextIndex,
      msg: err && err.message
    })
    this.__end(END_REASON.ERROR)
  }

  __setNext (nextIndexPassed) {
    if (nextIndexPassed !== undefined &&
        (nextIndexPassed < 0 || nextIndexPassed > this.state.resources.length)) {
      // Note: nextIndexPassed is allowed to be equal to resources.length
      // That means we run out of commands
      throw new Error(`invalid nextIndexPassed ${nextIndexPassed}`)
    }

    const {
      mode, doneIndices, nextIndex,
      endIndex, startIndex, loopsCursor, loopsEnd
    } = this.state

    const nextIndexToSet = nextIndexPassed !== undefined ? nextIndexPassed : (nextIndex + 1)

    let done = [...doneIndices, nextIndex]
    let lcur = loopsCursor
    let next = null

    if (mode === MODE.LOOP) {
      if (nextIndexToSet <= endIndex) {
        next = nextIndexToSet
      } else if (loopsCursor >= loopsEnd) {
        next = nextIndexToSet
      } else {
        lcur += 1
        next = startIndex
        done = []
      }
    } else {
      next = nextIndexToSet
    }

    this.__setState({
      loopsCursor: lcur,
      nextIndex: next,
      doneIndices: done
    })
  }

  __setState (obj) {
    this.state = {
      ...this.state,
      ...obj
    }
  }

  __delay (fn, timeout) {
    let past    = 0
    const timer = setInterval(() => {
      past += 1000
      this.emit('DELAY', {
        total: timeout,
        past
      })
    }, 1000)

    return delay(fn, timeout)
    .then(res => {
      if (timer)  clearInterval(timer)
      return res
    })
  }
}

ee(Player.prototype)

Player.prototype.C = {
  MODE,
  STATUS,
  END_REASON
}

let player

// factory function to return a player singleton
export const getPlayer = (opts, state) => {
  if (opts) {
    player = new Player(opts, state)
  }

  if (!player) {
    throw new Error('player not initialized')
  }

  return player
}
