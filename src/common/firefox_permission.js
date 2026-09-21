import { Modal } from 'antd'
import Ext from '@/common/web_extension'
import { goUivUrl } from '@/common/uiv_link'

// Firefox MV3 treats host_permissions as OPT-IN: the manifest's <all_urls>
// grants nothing by itself, and an ungranted profile injects content scripts
// nowhere — every page command then dies with Error #170 after a 5s IPC wait,
// with the real cause never surfacing. Field history of closing that gap one
// entry point at a time: the IDE header asked, then Record (dev_toolbar,
// "same logic as IDE header"), then the AI-chat/bridge run path
// (tools.ts ensureFirefoxHostPermission, 10.0.157) — and the panel's own
// Play button STILL didn't ask (field-verified 2026-08-19: DemoXMove.js via
// panel Play → #170, no dialog). One shared ask, used by every entry point,
// ends the whack-a-mole.
//
// Resolves true when running is allowed (not Firefox, already granted, or
// granted just now). On decline it opens the help page and resolves false —
// same behavior the Record path always had.
const HELP_URL = 'https://go.ui.vision/?help=firefox_access_data_permission'

export function ensureAllUrlsPermission () {
  return new Promise((resolve) => {
    if (!Ext.isFirefox()) return resolve(true)
    Ext.permissions.contains({ origins: ['<all_urls>'] }).then(
      (granted) => {
        if (granted) return resolve(true)
        Modal.confirm({
          title: 'Grant Permission To Replay Macros',
          content: `Ui.Vision is an open-source tool for automating tasks. To replay macros, it requires permission from Firefox to 'access data in all tabs'. If you click 'OK', Ui.Vision will open the Firefox permission dialog, allowing you to provide this permission. Continue?`,
          okText: 'Continue',
          cancelText: 'Cancel',
          onOk: () => {
            // the OK click is the user gesture Firefox requires here
            Ext.permissions.request({ origins: ['<all_urls>'] }).then((result) => {
              if (result) return resolve(true)
              Ext.tabs.create({ url: goUivUrl(HELP_URL), active: true })
              resolve(false)
            })
          },
          onCancel: () => {
            Ext.tabs.create({ url: goUivUrl(HELP_URL), active: true })
            resolve(false)
          }
        })
      },
      // permission API unavailable/failed — never block a run on the checker
      () => resolve(true)
    )
  })
}
