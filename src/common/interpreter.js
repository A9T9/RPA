import { clone } from './ts_utils'

const normalizeLabelName = (label) => label.toUpperCase()
const BREAK_KEY = 'break__';


export default class Interpreter {
  static DefaultState = {
    labels: {},
    tags: [],
    commands: [],
    // Any data specific to any command, for example, `times` and `forEach` uses it to store loop cursor
    extra: {}
  }

  state = clone(Interpreter.DefaultState)

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
        // Commands for if, while, do, times, forEach statements
        case 'if_v2':
        case 'if':
        case 'times':
        case 'forEach':
        case 'while_v2':
        case 'while':
        case 'do': {
          halfTags.push({
            type:   c.cmd,
            start:  { index: i, command: c }
          })

          break
        }

        case 'repeatIf': {
          if (!topHalfTag || !/^do$/.test(topHalfTag.type)) {
            throw errorAtIndex(i, `No matching do for this repeatIf (at command #${i + 1})`)
          }

          nextState.tags.push({
            ...topHalfTag,
            end: { index: i, command: c }
          })

          halfTags.pop()
          break
        }

        case 'elseif':
        case 'else': {
          if (!topHalfTag || !/^if/.test(topHalfTag.type)) {
            throw errorAtIndex(i, `No matching if for this ${c.cmd} (at command #${i + 1})`)
          }

          topHalfTag.children = topHalfTag.children || []

          const existingElseIndex = topHalfTag.children.findIndex(fork => fork.command && fork.command.cmd === 'else')

          if (existingElseIndex !== -1) {
            const existingElse = topHalfTag.children[existingElseIndex]
            throw new Error(`'${c.cmd}' (at command #${i + 1}) could not be used after '${existingElse.command.cmd}' (at command #${existingElse.index + 1})`)
          }

          topHalfTag.children.push({ index: i, command: c })

          break
        }

        case 'break': {
          let targetHalfTag
          for (let j = halfTags.length - 1; j >= 0; j--) {
            if (halfTags[j].start.index < i && /^(do|while|forEach|times)/.test(halfTags[j].type)) {
              targetHalfTag = halfTags[j];
              break;
            }
          }

          if (!targetHalfTag) {
            throw errorAtIndex(i, `No matching loop command for this ${c.cmd} (at command #${i + 1})`)
          }

          targetHalfTag.children = targetHalfTag.children || []
          targetHalfTag.children.push({ index: i, command: c })

          break;
        }
        case 'continue': {
          // console.log('continue:>> i, c: ', i, c);
          // console.log('continue:>> halfTags: ', halfTags);

          // find from bottom last tag having index less than current index
          let lastTag = null;
          for (let j = halfTags.length - 1; j >= 0; j--) {
            if (halfTags[j].start.index < i && /^(do|while|forEach|times)/.test(halfTags[j].type)) {
              lastTag = halfTags[j];
              break;
            }
          }
          
          // console.log('continue:>> lastTag: ', lastTag);
          let targetHalfTag = lastTag;

          if (!targetHalfTag) {
            throw errorAtIndex(i, `No matching loop command for this ${c.cmd} (at command #${i + 1})`)
          }

          targetHalfTag.children = targetHalfTag.children || []
          targetHalfTag.children.push({ index: i, command: c })

          // expected output for continue/break:
          // for (let i = 1; i <= 4; i++) {
          //   console.log('%c [echo] outerLoop: outer_loop' + i, 'color: blue');
          //   for (let j = 1; j <= 3; j++) {
          //     console.log('%c [echo] middleLoop: middle_loop' + j, 'color: green');
          //     for (let k = 1; k <= 2; k++) {
          //       console.log('%c [echo] innerLoop: inner_loop' + k, 'color: red');
          //       continue; // OR: break             
          //     }
          //   }           
          // }

          break;
        }

        case 'end':
        case 'endWhile':
        case 'endif': {
          const [reg, text] = (() => {
            switch (c.cmd) {
              case 'end':
                return [/^(if|while|times|forEach)/, 'if/while/times/forEach']

              case 'endWhile':
                return [/^while/, 'while']

              case 'endif':
                return [/^if/, 'if']
            }
          })()

          if (!topHalfTag || !reg.test(topHalfTag.type)) {
            throw errorAtIndex(i, `No matching ${text} for this end (at command #${i + 1})`)
          }

          nextState.tags.push({
            ...topHalfTag,
            end: { index: i, command: c }
          })

          halfTags.pop()
          break
        }

        case 'label': {
          if (!c.target || !c.target.length) {
            throw new Error('invalid target for label command')
          }

          this.__setState({
            labels: {
              ...this.state.labels,
              [normalizeLabelName(c.target)]: { index: i }
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

    const p = (() => {
      switch (cmd) {
        case 'onError': {
          const value           = command.value && command.value.trim()
          const target          = command.target && command.target.trim()
          const isValidTarget   = target && (/^#restart$/i.test(target) || /^#goto$/i.test(target))

          if (!isValidTarget) {
            throw new Error('invalid target for onError command')
          }

          if (/^#goto$/i.test(target)) {
            const labelName = normalizeLabelName(value)

            if (!this.state.labels[labelName]) {
              throw new Error(`label ${value} doesn't exist`)
            }
          }

          return Promise.resolve({ isFlowLogic: true })
        }

        case 'gotoLabel': {
          if (!target || !target.length) {
            throw new Error('invalid target for gotoLabel command')
          }

          const labelName = normalizeLabelName(target)

          if (!this.state.labels[labelName]) {
            throw new Error(`label ${target} doesn't exist`)
          }

          return Promise.resolve({
            isFlowLogic:  true,
            nextIndex:    this.state.labels[labelName].index
          })
        }

        case 'elseif': {
          const tag = this.state.tags.find(tag => {
            return /^if/.test(tag.type) &&
                    tag.children &&
                    tag.children.find(fork => fork.index === index && fork.command.cmd === cmd)
          })

          if (!tag) {
            throw new Error(`tag not found for this else (at command #${index + 1})`)
          }

          // Note: if the `if` tag has already tried some branch, then this `elseif` should act like `else`
          // otherwise it acts like `if`
          if (tag.alreadyRun) {
            return Promise.resolve({
              isFlowLogic: true,
              nextIndex: tag.end.index + 1
            })
          } else {
            return Promise.resolve({ isFlowLogic: false })
          }
        }

        case 'else': {
          // Note: 'else' and 'elseif' command itself will be skipped if condition is false,
          // But it will be run as the ending command of 'if-else' when condition is true
          const tag = this.state.tags.find(tag => {
            return /^if/.test(tag.type) &&
                    tag.children &&
                    tag.children.find(fork => fork.index === index && fork.command.cmd === cmd)
          })

          if (!tag) {
            throw new Error(`tag not found for this else (at command #${index + 1})`)
          }

          return Promise.resolve({
            isFlowLogic: true,
            nextIndex: tag.end.index + 1
          })
        }

        case 'break': {
          const tag = this.state.tags.find(tag => {
             return /^(do|while|forEach|times)/.test(tag.type) &&
                    tag.children &&
                    tag.children.find(item => item.index === index && item.command.cmd === cmd)
          })

          if (!tag) {
            throw new Error(`No loop found for this break (at command #${index + 1})`)
          }
          
          this.setExtraByKey('times_1', 0);
          this.addBreak({
            command: command, // for debugging purpose
            targetTagStartIndex: tag.start.index,
          });
          
          return Promise.resolve({
            isFlowLogic: true,
            nextIndex: tag.end.index + 1          
          })
        }

        case 'continue': {
          // console.log('continue:>> index, cmd, target: ', index, cmd, target);
          // console.log('continue:>> this.state.tags: ', this.state.tags);
          const tag = this.state.tags.find(tag => {
            return /^(do|while|forEach|times)/.test(tag.type) &&
                    tag.children &&
                    tag.children.find(item => item.index === index && item.command.cmd === cmd)
          })

          // console.log('continue:>> tag: ', tag);

          if (!tag) {
            throw new Error(`No loop found for this break (at command #${index + 1})`)
          }

          return Promise.resolve({
            isFlowLogic: true,
            nextIndex: tag.start.index
          })
        }

        case 'endif': {
          return Promise.resolve({ isFlowLogic: true })
        }

        case 'endWhile': {
          const tag = this.state.tags.find(tag => /^while/.test(tag.type) && tag.end.index === index)

          if (!tag) {
            throw new Error(`tag not found for this endWhile (at command #${index + 1})`)
          }

          return Promise.resolve({
            isFlowLogic: true,
            nextIndex: tag.start.index
          })
        }
        case 'end': {
          const tag = this.state.tags.find(tag => /^(if|while|times|forEach)/.test(tag.type) && tag.end.index === index)

          if (!tag) {
            throw new Error(`tag not found for this end (at command #${index + 1})`)
          }

          if (/^if/.test(tag.type)) {
            return Promise.resolve({ isFlowLogic: true })
          }

          // Then it's a `while`, `forEach`, `times`
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

        case 'do':
          return Promise.resolve({ isFlowLogic: true })

        // Note: gotoIf, if and while need to run eval, which is not allowed in extension scope,
        // so we have to run eval in content script
        //
        // gotoIf_v2/if_v2/while_v2 will be run in extension scope (we've added `unsafe-eval` in `content_security_policy)
        case 'gotoIf':
        case 'if':
        case 'while':
        case 'gotoIf_v2':
        case 'if_v2':
        case 'while_v2':
        case 'repeatIf':
        default:
          return Promise.resolve({ isFlowLogic: false })
      }
    })()

    return p.then(result => {
      if (result.isFlowLogic) {
        return result
      }

      if (this.__customRun) {
        const p = this.__customRun(command, index)
        if (p)  return Promise.resolve(p)
      }

      return result
    })
  }

  postRun (command, index, result) {
    const { cmd, target, value } = command

    if (this.__customPost) {
      const p = this.__customPost(command, index, result)
      if (p)  return Promise.resolve(p)
    }

    switch (cmd) {
      case 'gotoIf_v2':
      case 'gotoIf': {
        // short-circuit the check on value
        if (!result.condition)  return Promise.resolve()

        if (!value || !value.length) {
          throw new Error('invalid value for value command')
        }

        const labelName = normalizeLabelName(value)

        if (!this.state.labels[labelName]) {
          throw new Error(`label ${value} doesn't exist`)
        }

        return Promise.resolve({
          nextIndex: this.state.labels[labelName].index
        })
      }

      case 'elseif':
      case 'if_v2':
      case 'if': {
        const cond = result.condition
        const tag  = (() => {
          if (cmd === 'elseif') {
            return this.state.tags.find(tag => {
              return /^if/.test(tag.type) &&
                      tag.children &&
                      tag.children.find(fork => fork.index === index && fork.command.cmd === 'elseif')
            })
          } else {
            return this.state.tags.find(tag => /^if/.test(tag.type) && tag.start.index === index)
          }
        })()

        if (!tag) {
          throw new Error(`'if' tag not found for this ${cmd} (at command #${index + 1})`)
        }

        // Mark this `if` tag as already run if condition fulfilled,
        // so that any coming `elseif` could know which role itself is
        tag.alreadyRun = !!cond

        const forkIndex = (() => {
          if (cmd !== 'elseif') {
            return 0
          }

          const curIndex = (tag.children || []).findIndex(fork => fork.index === index && fork.command.cmd === 'elseif')
          return curIndex === -1 ? -1 : (curIndex + 1)
        })()

        if (forkIndex === -1) {
          throw new Error(`Can't find fork for this elseif (at command #${index + 1})`)
        }

        const branchIndex = (() => {
          const fork   = tag.children && tag.children[forkIndex]

          if (!fork) {
            return null
          }

          // Note: if next fork is elseif, it should execute that elseif
          // if next fork is else, it should go to the next line of that else
          const offset = fork && fork.command.cmd === 'else' ? 1 : 0
          return fork.index + offset
        })()
        const endIndex = tag.end && (tag.end.index + 1)

        return Promise.resolve({
          nextIndex: cond ? (index + 1) : (branchIndex || endIndex)
        })
      }

      case 'times':
      case 'forEach':
      case 'while_v2':
      case 'while': {
        const cond = result.condition
        const tag  = this.state.tags.find(tag => /^while|times|forEach/.test(tag.type) && tag.start.index === index)

        if (!tag) {
          throw new Error(`tag not found for this ${cmd} (at command #${index + 1})`)
        }

        if (!tag.end || tag.end.index === undefined || tag.end.index === null) {
          throw new Error(`tag doesn't have a valid end index`)
        }

        return Promise.resolve(
          cond ? {} : { nextIndex: tag.end.index + 1 }
        )
      }

      case 'repeatIf': {
        const cond = result.condition
        const tag  = this.state.tags.find(tag => /^do$/.test(tag.type) && tag.end.index === index)

        if (!tag) {
          throw new Error(`tag not found for this repeatIf (at command #${index + 1})`)
        }

        if (!tag.end || tag.start.index === undefined || tag.start.index === null) {
          throw new Error(`tag doesn't have a valid start index`)
        }

        return Promise.resolve(
          cond ? { nextIndex: tag.start.index + 1 } : {}
        )
      }

      default:
        return Promise.resolve()
    }
  }

  commandIndexByLabel (labelName) {
    const label = this.state.labels[normalizeLabelName(labelName)]

    if (!label) {
      throw new Error(`label '${labelName}' doesn't exist`)
    }

    return label.index
  }

  backupState () {
    return clone(this.state)
  }

  restoreState (state) {
    this.__setState(state)
  }

  getKeyForTimes (commandIndex) {
    return `times_${commandIndex}`
  }

  getKeyForSurroundingTimes (timesCommandIndex) {
    const tagIndex = this.state.tags.findIndex(tag => /^(times)/.test(tag.type) && tag.start.index === timesCommandIndex)

    if (tagIndex === -1) {
      return null
    }

    const currentTimesTag = this.state.tags[tagIndex]
    const surroundingTimesTag = (() => {
      for (let i = tagIndex; i < this.state.tags.length; i++) {
        const tag = this.state.tags[i]

        if (tag.type === 'times' &&
              tag.start.index < currentTimesTag.start.index &&
              tag.end.index > currentTimesTag.end.index
        ) {
          return tag
        }
      }

      return null
    })()

    if (!surroundingTimesTag) {
      return null
    }

    return this.getKeyForTimes(surroundingTimesTag.start.index)
  }

  getExtraByKey (key) {
    return this.state.extra[key]
  }

  setExtraByKey (key, value) {
    this.state.extra[key] = value
  }  

  getBreaks() {
    return this.state.extra[BREAK_KEY]
  }

  addBreak(value) {
    let existingBreaks = this.getBreaks(BREAK_KEY);
    this.setExtraByKey(BREAK_KEY, existingBreaks ? [...existingBreaks, value] : [value]);
  }
  
  removeBreak(targetTagStartIndex) {
    let existingBreaks = this.getBreaks(BREAK_KEY) || [];
    let newValue = existingBreaks.filter((item) => {
      return item.targetTagStartIndex !== targetTagStartIndex;
    });
    this.setExtraByKey(BREAK_KEY, newValue);
  }

  hasBreak(targetTagStartIndex) {
    let existingBreaks = this.getBreaks(BREAK_KEY) || [];
    let isExist = existingBreaks.some((item) => {
      return item.targetTagStartIndex === targetTagStartIndex;
    });
    return isExist;
  }

  updateExtraByKey (key, updater) {
    this.setExtraByKey(key, updater(this.getExtraByKey[key]))
  }

  removeExtraByKey (key) {
    delete this.state.extra[key]
  }

  __setState (st) {
    this.state = {
      ...this.state,
      ...st
    }
  }
}
