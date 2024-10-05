import { runInDesktopScreenshotEditor } from "@/desktop_screenshot_editor/service"
import { DesktopScreenshot } from "@/desktop_screenshot_editor/types"
import { getNativeCVAPI } from "@/services/desktop"
import { getNativeScreenCapture } from "@/services/screen_capture"
import { getXScreenCapture } from "@/services/xmodules/x_screen_capture"
import storage from '@/common/storage'
import { withPanelIpc } from "./tab"
import { Size } from "@/common/types"

export function selectAreaOnDesktop(screenAvailableSize: Size) {
    const captureDesktopViaNativeCVAPI = () => {
      return getNativeCVAPI().captureDesktop({ path: undefined })
      .then(hardDrivePath => {
        return runInDesktopScreenshotEditor(screenAvailableSize, {
          type: DesktopScreenshot.RequestType.Capture,
          data: {
            image: {
              source: DesktopScreenshot.ImageSource.CV,
              path:   hardDrivePath,
              // width/height is not used for this event, so set it to 0
              width: 0,
              height: 0,
            }
          }
        })
      })
    }
    const captureDesktopViaNativeScreenCapture = () => {
      return getNativeScreenCapture().captureDesktop().then(hardDrivePath => {
        return getNativeCVAPI().readFileAsDataURL(hardDrivePath, true)
      })
    }
    const shouldUseNativeScreenCapture = () => {
      return Promise.all([
        storage.get('config').then(config => config.useDesktopScreenCapture),
        getXScreenCapture().sanityCheck().catch(() => false)
      ])
      .then(([optedInNativeScreenCapture, hasInstalledNativeScreenCapture]) => {
        return optedInNativeScreenCapture && hasInstalledNativeScreenCapture
      })
    }

    return shouldUseNativeScreenCapture().then(should => {
      const captureDesktop = should
        ? captureDesktopViaNativeScreenCapture
        : captureDesktopViaNativeCVAPI

      return captureDesktop().then(dataUrl => {
        // If it's called on popup page, just use the function on window
        const handleCommand = (window as any).handleCommand

        if (typeof handleCommand === 'function') {
          return handleCommand('ADD_VISION_IMAGE', { dataUrl })
        }

        return withPanelIpc()
        .then(panelIpc => {
          return panelIpc.ask('ADD_VISION_IMAGE', { dataUrl })
        })
      })
    })
}
