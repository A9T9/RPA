import Ext from '../common/web_extension'
import { activateTab } from '../common/tab_utils'
import { openPageInTab, CreateTabAPI } from '../common/ipc/open_page'
import { DesktopScreenshot } from './types'
import { Size } from '@/common/types'

const DESKTOP_SCREENSHOT_PAGE_URL = Ext.runtime.getURL('desktop_screenshot_editor.html')

export const openDesktopScreenshotWindow: (screenAvailableSize: Size) => Promise<CreateTabAPI> = (() => {
  let lastTabId: number = 0;

  return (screenAvailableSize: Size) => {
    return Ext.tabs.get(lastTabId)
    .catch((e: Error) => null)
    .then((tab: any) =>
      // Anchor the popup on the display the BROWSER WINDOW is on: bare
      // quarter-screen coordinates assume the primary display and land in
      // empty space when the browser sits on a secondary monitor (negative
      // or offset global origins) — Chrome then rejects the window with
      // "Bounds must be at least 50% within visible screen space".
      Ext.windows.getLastFocused()
        .catch(() => null)
        .then((win: any) => ({ tab, baseLeft: (win && win.left) || 0, baseTop: (win && win.top) || 0 }))
    )
    .then(({ tab, baseLeft, baseTop }: any) => {
      const api = openPageInTab({
        url:      DESKTOP_SCREENSHOT_PAGE_URL,
        tabId:    tab && tab.id,
        keep:     true,
        popup:    true,
        domReady: true,
        focus:    true,
        width:    screenAvailableSize.width / 2 + 50,
        height:   screenAvailableSize.height / 2 + 100,
        left:     Math.round(baseLeft + 40),
        top:      Math.round(baseTop + 40),
      })

      api.getTabId()
      .then((tabId: number) => {
        lastTabId = tabId
        return activateTab(tabId)
      })

      return api
    })
  }
})()

export function runInDesktopScreenshotEditor (screenAvailableSize: Size, req: DesktopScreenshot.Request): Promise<any> {
  return openDesktopScreenshotWindow(screenAvailableSize)
  .then(api => api.ask(req.type, req.data))
}
