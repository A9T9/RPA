import ipc from '@/common/ipc/ipc_cs'

init()

function init () {
  ipc.ask('CS_OPEN_PANEL_SETTINGS')
  .then(() => {
    window.close()
  })
}
