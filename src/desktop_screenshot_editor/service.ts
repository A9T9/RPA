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
    .then((tab: any) => {
      const api = openPageInTab({
        url:      DESKTOP_SCREENSHOT_PAGE_URL,
        tabId:    tab && tab.id,
        keep:     true,
        popup:    true,
        domReady: true,
        focus:    true,
        width:    screenAvailableSize.width / 2 + 50,
        height:   screenAvailableSize.height / 2 + 100,
        left:     screenAvailableSize.width / 4 - 25,
        top:      screenAvailableSize.height / 4 - 50,
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
