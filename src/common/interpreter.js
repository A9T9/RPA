
export default class Interpreter {
  state = {
    labels: {},
    tags: [],
    commands: []
  }

  constructor (opts = {}) {
    if (opts.pre) {
      this.__customPre = opts.pre
    }

    if (opts.run) {
      this.__customRun = opts.run
    }

    if (opts.post) {
      this.__customPost = opts.post
    }
  }

  reset () {
    this.__setState({
      labels: {},
      tags: [],
      commands: []
    })
  }

  preprocess (commands) {
    let nextState     = { commands, tags: [] }
    let halfTag       = null
    let errorAtIndex  = (i, msg) => {
      const e = new Error(msg)
      e.errorIndex = i
      return e
    }

    commands.forEach((c, i) => {
      if (this.__customPre && this.__customPre(c, i)) return

      switch (c.cmd) {
        case 'while': {
          if (halfTag && halfTag.type === 'while') {
            throw errorAtIndex(i, `No nested while allowed (at command #${i + 1})`)
          }

          halfTag = {
            type: 'while',
            start: { index: i, command: c }
          }

          break
        }

        case 'endWhile': {
          if (!halfTag || halfTag.type !== 'while') {
            throw errorAtIndex(i, `No matching while for this endWhile (at command #${i + 1})`)
          }

          nextState.tags.push({
            ...halfTag,
            end: { index: i, command: c }
          })

          halfTag = null
          break
        }

        case 'label': {
          if (!c.target || !c.target.length) {
            throw new Error('invalid target for label commmand')
          }

          this.__setState({
            labels: {
              ...this.state.labels,
              [c.target]: { index: i }
            }
          })

          break
        }
      }
    })

    if (halfTag) {
      throw errorAtIndex(halfTag.start.index, `Unclosed '${halfTag.type}' (at command #${halfTag.start.index + 1})`)
    }

    this.__setState(nextState)
  }

  run (command, index) {
    const { cmd, target, value } = command

    if (this.__customRun) {
      const p = this.__customRun(command, index)
      if (p)  return Promise.resolve(p)
    }

    // label
    switch (cmd) {
      case 'gotoLabel': {
        if (!target || !target.length) {
          throw new Error('invalid target for gotoLabel commmand')
        }

        if (!this.state.labels[target]) {
          throw new Error(`label ${target} doesn't exist`)
        }

        return Promise.resolve({
          isFlowLogic:  true,
          nextIndex:    this.state.labels[target].index
        })
      }

      case 'endWhile': {
        const tag = this.state.tags.find(tag => tag.type === 'while' && tag.end.index === index)

        if (!tag) {
          throw new Error(`tag not found for this endWhile (at command #${index + 1})`)
        }

        return Promise.resolve({
          isFlowLogic: true,
          nextIndex: tag.start.index
        })
      }

      // As of 'label', it doesn't do anything, so we just kind of skip it
      case 'label':
        return Promise.resolve({ isFlowLogic: true })

      // Note: both gotoIf and while needs to run eval, which is not allowed in extension scope,
      // so we have to run eval in content script
      case 'gotoIf':
      case 'while':
      default:
        return Promise.resolve({ isFlowLogic: false })
    }
  }

  postRun (command, index, result) {
    const { cmd, target, value } = command

    if (this.__customPost) {
      const p = this.__customPost(command, index, result)
      if (p)  return Promise.resolve(p)
    }

    switch (cmd) {
      case 'gotoIf': {
        // short-circuit the check on value 
        if (!result.condition)  return Promise.resolve()

        if (!value || !value.length) {
          throw new Error('invalid value for value commmand')
        }

        if (!this.state.labels[value]) {
          throw new Error(`label ${value} doesn't exist`)
        }

        return Promise.resolve({
          nextIndex: this.state.labels[value].index
        })
      }

      case 'while': {
        const cond = result.condition
        const tag  = this.state.tags.find(tag => tag.type === 'while' && tag.start.index === index)

        if (!tag) {
          throw new Error(`tag not found for this while (at command #${index + 1})`)
        }

        if (!tag.end || tag.end.index === undefined || tag.end.index === null) {
          throw new Error(`tag doesn't have a valid end index`)
        }

        return Promise.resolve(
          cond ? {} : { nextIndex: tag.end.index + 1 }
        )
      }

      default:
        return Promise.resolve()
    }
  }

  __setState (st) {
    this.state = {
      ...this.state,
      ...st
    }
  }
}
