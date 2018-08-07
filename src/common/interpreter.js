
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
    let halfTags      = []
    let errorAtIndex  = (i, msg) => {
      const e = new Error(msg)
      e.errorIndex = i
      return e
    }

    commands.forEach((c, i) => {
      if (this.__customPre && this.__customPre(c, i)) return

      const topHalfTag = halfTags[halfTags.length - 1]

      switch (c.cmd) {
        // Commands for WHILE statements
        case 'while': {
          if (halfTags.find(tag => tag.type === 'while')) {
            throw errorAtIndex(i, `No nested while allowed (at command #${i + 1})`)
          }

          halfTags.push({
            type: 'while',
            start: { index: i, command: c }
          })

          break
        }

        case 'endWhile': {
          if (!topHalfTag || topHalfTag.type !== 'while') {
            throw errorAtIndex(i, `No matching while for this endWhile (at command #${i + 1})`)
          }

          nextState.tags.push({
            ...topHalfTag,
            end: { index: i, command: c }
          })

          halfTags.pop()
          break
        }
        // -----------------------------

        // Commands for IF statements
        case 'if': {
          if (halfTags.find(tag => tag.type === 'if')) {
            throw errorAtIndex(i, `No nested if allowed (at command #${i + 1})`)
          }

          halfTags.push({
            type: 'if',
            start: { index: i, command: c }
          })

          break
        }

        case 'else': {
          if (!topHalfTag || topHalfTag.type !== 'if') {
            throw errorAtIndex(i, `No matching if for this else (at command #${i + 1})`)
          }

          Object.assign(topHalfTag, {
            fork: { index: i, command: c }
          })

          break
        }

        case 'endif': {
          if (!topHalfTag || topHalfTag.type !== 'if') {
            throw errorAtIndex(i, `No matching if for this endif (at command #${i + 1})`)
          }

          nextState.tags.push({
            ...topHalfTag,
            end: { index: i, command: c }
          })

          halfTags.pop()
          break
        }
        // -----------------------------

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

    if (halfTags.length > 0) {
      const topHalfTag = halfTags[halfTags.length - 1]
      throw errorAtIndex(topHalfTag.start.index, `Unclosed '${topHalfTag.type}' (at command #${topHalfTag.start.index + 1})`)
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
      case 'onError': {
        const value           = command.value && command.value.trim()
        const target          = command.target && command.target.trim()
        const isValidTarget   = target && (/^#restart$/i.test(target) || /^#goto$/i.test(target))

        if (!isValidTarget) {
          throw new Error('invalid target for onError command')
        }

        if (/^#goto$/i.test(target)) {
          if (!this.state.labels[value]) {
            throw new Error(`label ${value} doesn't exist`)
          }
        }

        return Promise.resolve({ isFlowLogic: true })
      }

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

      case 'else': {
        // Note: 'else' command itself will be skipped if condition is false,
        // But it will be run as the ending command of 'if-else' when condition is true
        const tag = this.state.tags.find(tag => tag.type === 'if' && tag.fork.index === index)

        if (!tag) {
          throw new Error(`tag not found for this else (at command #${index + 1})`)
        }

        return Promise.resolve({
          isFlowLogic: true,
          nextIndex: tag.end.index + 1
        })
      }

      case 'endif': {
        return Promise.resolve({ isFlowLogic: true })
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

      case 'comment':
        return Promise.resolve({ isFlowLogic: true })

      // As of 'label', it doesn't do anything, so we just kind of skip it
      case 'label':
        return Promise.resolve({ isFlowLogic: true })

      // Note: gotoIf, if and while need to run eval, which is not allowed in extension scope,
      // so we have to run eval in content script
      case 'gotoIf':
      case 'if':
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

      case 'if': {
        const cond = result.condition
        const tag  = this.state.tags.find(tag => tag.type === 'if' && tag.start.index === index)

        if (!tag) {
          throw new Error(`tag not found for this if (at command #${index + 1})`)
        }

        const forkIndex = tag.fork && (tag.fork.index + 1)
        const endIndex  = tag.end && (tag.end.index + 1)

        return Promise.resolve({
          nextIndex: cond ? (index + 1) : (forkIndex || endIndex)
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

  commandIndexByLabel (labelName) {
    const label = this.state.labels[labelName]

    if (!label) {
      throw new Error(`label '${labelName}' doesn't exist`)
    }

    return label.index
  }

  __setState (st) {
    this.state = {
      ...this.state,
      ...st
    }
  }
}
