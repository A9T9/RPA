import React from 'react'
import { connect } from 'react-redux'
import { bindActionCreators, Dispatch } from 'redux'

import * as actions from '@/actions'
import { Actions as simpleActions } from '@/actions/simple_actions'
import { State } from '@/reducers/state'
// import { runComputerUseService } from '@/services/ai/computer_use/computer_use.service'
import './ai-chat.scss'
import { AiConversation, ConversationItem, Sender } from './ai_conversation'

import * as C from '@/common/constant'
import { updateState } from '@/ext/common/global_state'
import { runCsFreeCommands } from '@/modules/run_command'
import { store } from '@/redux'
import { Button } from 'antd'
// import { Player } from '@/common/player'
// import varsFactory from '@/common/variables'
import { getVarsInstance } from '@/common/variables'
import { captureScreenShot } from '@/modules/helper'
import { ComputerUseService } from '@/services/ai/computer_use/service'
import { ComputerUseMessageType, Coordinate } from '@/services/ai/computer_use/model'

interface AiChatState {
  processRunning: boolean
  conversation: ConversationItem[]
  aiPromptText: string
  latestMouseCoordinate: Coordinate | null
}

/*
You:A tick tak toe game is open.
AI: I'll help play the tic ....
Action: Screenshot
AI: I see the ...
*/
const SampleConversation: ConversationItem[] = [
  {
    sender: 'You',
    message: 'A tick tak toe game is open.'
  },
  {
    sender: 'AI',
    message: "I'll help play the tic ...."
  },
  {
    sender: 'Action',
    message: 'Screenshot'
  },
  {
    sender: 'AI',
    message: 'I see the ...'
  },
  {
    sender: 'AI',
    message: "I'll help play the tic ...."
  },
  {
    sender: 'Action',
    message: 'Screenshot'
  },
  {
    sender: 'AI',
    message: 'I see the ...'
  }
]

interface AiChatStateProps {
  config: { [key: string]: any }
  renderStatus: (statusText: string) => void
}

class AiChat extends React.Component<AiChatStateProps, AiChatState> {
  computerUseService: ComputerUseService
  conversationRef: React.RefObject<HTMLDivElement>

  constructor(props: AiChatStateProps) {
    super(props)
    this.conversationRef = React.createRef<HTMLDivElement>()
    this.computerUseService = this.getComputerUseService()
    this.appendMessage = this.appendMessage.bind(this)
  }

  state: AiChatState = {
    processRunning: false,
    conversation: [],
    aiPromptText: ``, //Use the calculator to calculate 5 + 8 and verify the result. Then stop.
    latestMouseCoordinate: null
  }

  appendMessage = (
    message: string,
    type: ComputerUseMessageType | null = null,
    isActionOrResult: 'action' | 'result' | null = null
  ) => {
    if (type === 'ai') {
      if (isActionOrResult === 'action') {
      } else if (isActionOrResult === 'result') {
      } else {
        this.addConversation('AI', message)
      }
    } else if (type === 'user') {
      if (isActionOrResult === 'action') {
      } else if (isActionOrResult === 'result') {
        this.addConversation('Action', message)
      } else {
        this.addConversation('You', message)
      }
    } else if (type === 'status') {
      // TODO: show it in the UI top
      console.log('appendMessage:>> status:>> ', message)
      this.props.renderStatus(message)
    }  else if (type === 'set-coordinate') {
      const action = JSON.parse(message)
      console.log('appendMessage:>> set-coordinate:>> ', action)
      this.setState({
        latestMouseCoordinate: { x: action.x, y: action.y }
      })
     
    }  
  }

  getComputerUseService = (): ComputerUseService => {
    if (!this.computerUseService) {
      const config = this.props.config
      const isDesktop = config.cvScope === 'desktop'

    

      let loopCompletedCount = 0
      const getTerminationRequest = (_loopCompletedCount: number) => {
        const state = store.getState()
        loopCompletedCount = _loopCompletedCount
        const maxLoop = parseInt(state.config.aiComputerUseMaxLoops)
        console.log('#220 getTerminationRequest:>> loopCompletedCount:>> ', loopCompletedCount)
        console.log('#220 getTerminationRequest:>> maxLoop:>> ', maxLoop)
        if (loopCompletedCount >= maxLoop) {
          this.addConversation('Action', `Computer Use sequence ended (${loopCompletedCount} loops)`)
          return 'max_loop_reached'
        }

        if (this.state.processRunning === false) {
          this.addConversation('Action', `Computer Use sequence ended (${loopCompletedCount} loops)`)
          return 'stop_requested'
        }
      }

      const captureScreenShotFunction = async () => {
        const vars = getVarsInstance()
        const isDesktop = config.cvScope === 'desktop'
        return await captureScreenShot({
          vars,
          isDesktop
        })
      }
      this.computerUseService = new ComputerUseService({
        runCsFreeCommands: runCsFreeCommands,
        value: null,
        captureScreenShotFunction,
        isDesktop,
        logMessage: this.appendMessage,
        getTerminationRequest
      })
    }
    return this.computerUseService
  }

  addConversation = (sender: Sender, message: string, isError?: boolean) => {
    this.setState({
      conversation: [
        ...this.state.conversation,
        {
          sender,
          message
          // timestamp: new Date()
        }
      ]
    })

    setTimeout(() => {
      if (this.conversationRef.current) {
        this.conversationRef.current.scrollTop = this.conversationRef.current.scrollHeight
      }
    }, 100)
  }

  componentDidMount() {
    const useInitialPromptInAiChat = this.props.config.useInitialPromptInAiChat
    const aiChatSidebarPrompt = this.props.config.aiChatSidebarPrompt
    if (useInitialPromptInAiChat) {
      this.send(aiChatSidebarPrompt)
    }
    // this.props.renderStatus('AI Chat')
  }

  send = async (prompt_?: string) => {
    // const config = this.props.config
    // const isDesktop = config.cvScope === 'desktop'

    // const anthropicAPIKey = getVarsInstance().anthropicAPIKey
    // console.log('anthropicAPIKey:>> ', anthropicAPIKey)
    // return;

    const prompt = prompt_ || this.state.aiPromptText
    if (this.state.processRunning || prompt === '') {
      return
    }

    this.setState({
      processRunning: true
    })

    await updateState({
      status: C.APP_STATUS.PLAYER,
      pendingPlayingTab: false,
      xClickNeedCalibrationInfo: null
    })

    const vars = getVarsInstance()
    return this.getComputerUseService()
      .run(prompt, 'ai_result', vars)
      .then((result) => {
        this.setState({ processRunning: false })
      })
      .then(() => {
        this.setState({ processRunning: false })
        // this.addConversation('Action', 'Computer Use sequence ended')
      })
      .catch((error) => {
        console.log('error:>> ', error)
        this.setState({ processRunning: false })
        this.addConversation('Error', error.message, true)
      })
  }

  stop = () => {
    this.setState({ processRunning: false })
  }

  find = () => {
    // for XClick and XMove Only
    // let coordinates: Coordinate | null = null

    // this.state.conversation.forEach((item) => {
    //   if (coordinates) {
    //     return
    //   }
    //   // Moved 857,52
    //   // 'Moved' : action.command === 'left_click' ? 'Clicked left' : 'Clicked right'
    //   const match = item.message.match(/XMove (\d+),(\d+)/)
    //   if (match) {
    //     const [_, x, y] = match
    //     coordinates = { x: parseInt(x, 10), y: parseInt(y, 10) }
    //   }
    // })

    // console.log('#238 find:>> coordinates:>> ', coordinates)

    if(!this.state.latestMouseCoordinate) {
      this.props.renderStatus('No coordinates found')
      return;
    }


    // let foundCoordinate = coordinates as Coordinate

    // XMove 857,52
    const isDesktop = this.props.config.cvScope === 'desktop'
    console.log('#238 find:>> isDesktop:>> ', isDesktop)
    return runCsFreeCommands({
      cmd: 'XMove',
      target: `${this.state.latestMouseCoordinate.x},${this.state.latestMouseCoordinate.y}`,
      extra: {
        debugVisual: true
      },
      spExtra: {
        isDesktop,
        useLatestScreenShot: isDesktop ? true : undefined
      }
    })
  }

  newChat = () => {
    if (this.state.processRunning) {
      return
    }

    this.getComputerUseService().createNewChat()
    this.setState({
      conversation: []
    })
  }

  render() {
    return (
      <>
        <div className="ai-chat">
          <div ref={this.conversationRef} className="ai-conversation">
            {this.state.conversation.map((item, i) => {
              return (
                <div className="ai-conversation-item" key={i}>
                  <div
                    className={`${item.sender === 'Error' ? 'sender-error' : item.sender === 'You' ? 'sender-you' : item.sender === 'AI' ? 'sender-ai' : 'sender-action'}`}
                  >
                    <span className="sender">{`${item.sender}: `}</span>
                    {item.message}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="chat-footer">
          <textarea
            className="chat-input"
            value={this.state.aiPromptText}
            onChange={(e) => this.setState({ aiPromptText: e.target.value })}
          />
          <div className="chat-actions">
            <Button
              disabled={this.state.processRunning}
              onClick={() => {
                this.send()
              }}
            >
              Send
            </Button>
            <Button
              className="find-button"
              disabled={this.state.processRunning}
              onClick={() => {
                this.find()
              }}
            >
              Find
            </Button>
            <Button
              className="find-button"
              disabled={this.state.processRunning}
              onClick={() => {
                this.newChat()
              }}
            >
              New Chat
            </Button>
            <Button className="stop-button" onClick={this.stop} disabled={!this.state.processRunning}>
              Stop
            </Button>
          </div>
        </div>
      </>
    )
  }
}

export default connect(
  (state: State) => ({
    status: state.status,
    config: state.config
  }),
  (dispatch: Dispatch) => bindActionCreators({ ...actions, ...simpleActions }, dispatch)
)(AiChat)
