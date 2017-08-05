import React from 'react'
import ReactDOM from 'react-dom'
import {HashRouter} from 'react-router-dom'
import { message } from 'antd'

import App from './app'
import { Provider, createStore, reducer } from './redux'
import csIpc from './common/ipc/ipc_cs'
import testCaseModel from './models/test_case_model'
import storage from './common/storage'
import { getPlayer } from './common/player'
import { delay } from './common/utils'
import * as C from './common/constant'
import {
  setTestCases,
  setEditing,
  setPlayerState,
  addLog,
  startPlaying,
  stopPlaying
} from './actions'

const store = createStore(
  reducer,
  window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__()
)

const rootEl = document.getElementById('root');
const render = Component =>
  ReactDOM.render(
    <Provider store={store}>
      <HashRouter>
        <App />
      </HashRouter>
    </Provider>,
    rootEl
  );

// Note: listen to any db changes and restore all data from db to redux store
// All test cases are stored in indexeddb (dexie)
const bindDB = () => {
  const restoreTestCases = () => {
    return testCaseModel.list()
      .then(tcs => {
        store.dispatch(setTestCases(tcs))
      })
  }

  ['updating', 'creating', 'deleting'].forEach(eventName => {
    testCaseModel.table.hook(eventName, () => {
      console.log('eventName', eventName)
      setTimeout(restoreTestCases, 50)
    })
  })

  restoreTestCases()
}

// Note: editing is stored in localstorage
const restoreEditing = () => {
  return storage.get('editing')
    .then(editing => {
      store.dispatch(setEditing(editing))
    })
}

// Note: initialize the player, and listen to all events it emits
const bindPlayer = () => {
  const player = getPlayer({
    prepare: (state) => {
      return csIpc.ask('PANEL_START_PLAYING', { url: state.startUrl })
    },
    run: (command, state) => {
      if (command.cmd === 'open') {
        command = {...command, href: state.startUrl}
      }
      return csIpc.ask('PANEL_RUN_COMMAND', { command })
    }
  }, {
    preDelay: 0
  })

  player.on('START', ({ title }) => {
    console.log('START')

    store.dispatch(startPlaying())

    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PLAYING,
      nextCommandIndex: null,
      errorCommandIndex: null,
      doneCommandIndices: []
    }))

    store.dispatch(addLog('info', `Playing test case ${title}`))
  })

  player.on('PAUSED', () => {
    console.log('PAUSED')
    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PAUSED
    }))

    store.dispatch(addLog('info', `Test case paused`))
  })

  player.on('RESUMED', () => {
    console.log('RESUMED')
    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.PLAYING
    }))

    store.dispatch(addLog('info', `Test case resumed`))
  })

  player.on('END', (obj) => {
    console.log('END', obj)
    csIpc.ask('PANEL_STOP_PLAYING', {})

    store.dispatch(stopPlaying())

    store.dispatch(setPlayerState({
      status: C.PLAYER_STATUS.STOPPED,
      stopReason: obj.reason,
      nextCommandIndex: null,
      timeoutStatus: null
    }))

    switch (obj.reason) {
      case player.C.END_REASON.COMPLETE:
        message.success('Test case completed running', 1.5)
        break

      case player.C.END_REASON.ERROR:
        message.error('Test case encountered some error', 1.5)
        break
    }

    const logMsg = {
      [player.C.END_REASON.COMPLETE]: 'Test case completed',
      [player.C.END_REASON.ERROR]: 'Test case failed',
      [player.C.END_REASON.MANUAL]: 'Test case was stopped manually'
    }

    store.dispatch(addLog('info', logMsg[obj.reason]))
  })

  player.on('TO_PLAY', ({ index, currentLoop, loops, resource }) => {
    console.log('TO_PLAYER', index)
    store.dispatch(setPlayerState({
      timeoutStatus: null,
      nextCommandIndex: index,
      currentLoop,
      loops
    }))

    const triple  = [resource.cmd, resource.target, resource.value]
    const str     = ['', ...triple, ''].join(' | ')
    store.dispatch(addLog('info', `Executing: ${str}`))
  })

  player.on('PLAYED_LIST', ({ indices }) => {
    console.log('PLAYED_LIST', indices)
    store.dispatch(setPlayerState({
      doneCommandIndices: indices
    }))
  })

  player.on('ERROR', ({ errorIndex, msg }) => {
    console.error(`command index: ${errorIndex}, Error: ${msg}`)
    store.dispatch(setPlayerState({
      errorCommandIndex: errorIndex
    }))

    store.dispatch(addLog('error', msg))
  })

  player.on('DELAY', ({ total, past }) => {
    store.dispatch(setPlayerState({
      timeoutStatus: {
        type: 'delay',
        total,
        past
      }
    }))
  })
}

bindPlayer()
bindDB()
restoreEditing()
csIpc.ask('I_AM_PANEL', {})

render(App)

if (module.hot) module.hot.accept('./app', () => render(App));
