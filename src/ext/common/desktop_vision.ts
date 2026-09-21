import { runInDesktopScreenshotEditor } from "@/desktop_screenshot_editor/service"
import { DesktopScreenshot } from "@/desktop_screenshot_editor/types"
import { getNativeCVAPI } from "@/services/desktop"
import { getXModule2API } from "@/services/xmodules2/native"
import { isWindows, isMac } from "@/common/ts_utils"
import { message } from "antd"
import { getDesktopCaptureHint } from "@/services/desktop_dip"
import storage from '@/common/storage'
import { withPanelIpc } from "./tab"
import { Size } from "@/common/types"

export function selectAreaOnDesktop(screenAvailableSize: Size) {
    // Built-in selector: capture the full desktop via the xmodule2 host,
    // then let the user pick the area in the in-extension screenshot editor.
    // The display hint pins the capture to the play window's display even
    // when this panel/popup has the focus (the host's foreground heuristic
    // would otherwise follow whatever window is active right now).
    const captureDesktopViaNativeCVAPI = () => {
      return getDesktopCaptureHint()
      .then(displayHint => getNativeCVAPI().captureDesktop({ path: undefined, displayHint }))
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
    // Windows native screenshot selector: the SYSTEM snipping overlay (the
    // Win+Shift+S UI) via ms-screenclip, spawned through the xmodule2 host.
    // The snipped region lands on the clipboard, so poll the host's cheap
    // clipboard sequence counter and read the image once it moves. Esc gives
    // no clipboard change -> timeout = cancelled. This retired the last
    // classic XModule (kcmd) — host 2.0.13+ carries the clipboard methods.
    const captureDesktopViaWindowsSnip = () => {
      const api = getXModule2API()
      return api.invoke('get_clipboard_sequence').then((seqBefore: number) => {
        return api.runProcess({ fileName: 'explorer.exe', arguments: 'ms-screenclip:', waitForExit: false })
        .then(() => new Promise<string>((resolve, reject) => {
          const POLL_MS = 800
          const TIMEOUT_MS = 60000
          let waited = 0
          let done = false
          const finish = (fn: () => void) => {
            if (done) return
            done = true
            clearInterval(iv)
            fn()
          }
          const iv = setInterval(() => {
            waited += POLL_MS
            api.invoke('get_clipboard_sequence').then((seq: number) => {
              if (seq !== seqBefore) {
                // any copy bumps the counter — only an actual image ends the
                // wait; a text copy mid-snip just moves the baseline
                return api.invoke('read_clipboard_image').then(
                  (path: string) => finish(() => resolve(path)),
                  () => { seqBefore = seq }
                )
              }
            })
            .catch(() => { /* transient host hiccup — keep polling */ })
            .then(() => {
              if (waited >= TIMEOUT_MS) {
                finish(() => reject(new Error('desktop selection cancelled')))
              }
            })
          }, POLL_MS)
        }))
      })
      .then(path => {
        return getNativeCVAPI().readFileAsDataURL(path, true)
        .then(dataUrl => {
          getXModule2API().invoke('delete_file', { path }).catch(() => {})
          return dataUrl
        })
      })
    }
    // Windows, host 2.1.27+: the host's OWN area picker. select_region dims
    // the screen, the user drags a rectangle over the live desktop (Esc
    // cancels) and capture_desktop crops to the answered rect — no OS tool
    // involved. Replaced ms-screenclip because Windows 11's modern Snipping
    // Tool auto-saves every snip to Pictures\Screenshots (field report
    // 2026-09). An older host answers "Unknown method: select_region" and
    // captureDesktopViaWindowsSelector falls back to the snip flow above.
    // captureVisible: the picker must stay a normal, capturable window - a
    // remote-desktop viewer (AnyDesk, RDP, TeamViewer) only ever shows a
    // screen capture, and a capture-excluded picker is invisible there (field
    // report 2026-09-16). Hosts before 2.1.34 exclude it unless asked.
    const captureDesktopViaHostSelector = () => {
      const cv = getNativeCVAPI()
      return cv.selectRegion({ captureVisible: true })
      .then(sel => {
        if (!sel || sel.cancelled) throw new Error('desktop selection cancelled')
        return cv.captureDesktop({
          path: undefined,
          rect: { x: sel.x as number, y: sel.y as number, width: sel.width as number, height: sel.height as number }
        })
      })
      .then(path => {
        return cv.readFileAsDataURL(path, true)
        .then(dataUrl => {
          getXModule2API().invoke('delete_file', { path }).catch(() => {})
          return dataUrl
        })
      })
    }
    const captureDesktopViaWindowsSelector = () => {
      return captureDesktopViaHostSelector().catch((e: Error) => {
        if (/selection cancelled/.test(String((e && e.message) || e))) throw e
        return captureDesktopViaWindowsSnip()
      })
    }
    // macOS native region selector: the Cmd+Shift+4 UI via the built-in
    // screencapture CLI, spawned through the xmodule2 host — it runs under
    // the host's existing Screen Recording grant, so no extra permission.
    // Esc leaves no file behind -> abort silently (same as closing the
    // Windows selector); a failed spawn (host missing) falls back to the
    // built-in selector.
    const captureDesktopViaMacSelector = () => {
      const path = `/tmp/uivision_capture_${Date.now()}.png`
      const api = getXModule2API()
      return api.runProcess({ fileName: '/usr/sbin/screencapture', arguments: `-i -x ${path}`, waitForExit: true })
      .then(
        () => api.invoke('file_exists', { path }),
        () => null // host unreachable / spawn failed
      )
      .then((exists: boolean | null) => {
        if (exists === null) return captureDesktopViaNativeCVAPI()
        if (!exists) throw new Error('desktop selection cancelled')
        return getNativeCVAPI().readFileAsDataURL(path, true)
      })
    }
    const pickCaptureFn = () => {
      if (isWindows()) {
        let sanityError: any = null
        return Promise.all([
          storage.get('config').then(config => config.useDesktopScreenCapture),
          // the picker (2.1.27+) falls back to the snip flow, which needs a
          // host with the clipboard methods (2.0.13+) — an older host answers
          // "Unknown method", no host rejects outright
          getXModule2API().invoke('get_clipboard_sequence')
            .then(() => true)
            .catch((e: Error) => { sanityError = e; return false })
        ])
        .then(([optedInNativeScreenCapture, snipFlowAvailable]) => {
          // NEVER fall back silently: the user opted into the native selector
          // and would otherwise just see their setting being ignored (field
          // report 2026-08-27 — the toggle "did not work"). Name the reason.
          if (optedInNativeScreenCapture && !snipFlowAvailable) {
            const reason = String((sanityError && sanityError.message) || sanityError || 'no answer')
            message.warning(`The screen area selector needs the Desktop Automation XModule v2.1.27 or newer (${reason}) — using the built-in selector instead. See Settings > Vision.`, 6)
          }
          return (optedInNativeScreenCapture && snipFlowAvailable)
            ? captureDesktopViaWindowsSelector
            : captureDesktopViaNativeCVAPI
        })
      }
      if (isMac()) {
        return storage.get('config').then(config =>
          config.useDesktopScreenCapture ? captureDesktopViaMacSelector : captureDesktopViaNativeCVAPI)
      }
      return Promise.resolve(captureDesktopViaNativeCVAPI)
    }

    return pickCaptureFn().then(captureDesktop => {
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
