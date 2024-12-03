
const mk = (list: string[]): Record<string, string> => list.reduce((prev, key) => {
  prev[key] = key;
  return prev
}, {} as Record<string, string>)

export const APP_STATUS = mk([
  'NORMAL',
  'INSPECTOR',
  'RECORDER',
  'PLAYER'
])

export const INSPECTOR_STATUS = mk([
  'PENDING',
  'INSPECTING',
  'STOPPED'
])

export const RECORDER_STATUS = mk([
  'PENDING',
  'RECORDING',
  'STOPPED'
])

export const PLAYER_STATUS = mk([
  'PLAYING',
  'PAUSED',
  'STOPPED'
])

export const PLAYER_MODE = mk([
  'TEST_CASE',
  'TEST_SUITE'
])

export const CONTENT_SCRIPT_STATUS = mk([
  'NORMAL',
  'RECORDING',
  'INSPECTING',
  'PLAYING'
])

export const TEST_CASE_STATUS = mk([
  'NORMAL',
  'SUCCESS',
  'ERROR',
  'ERROR_IN_SUB'
])

export const LAST_SCREENSHOT_FILE_NAME = '__lastscreenshot'

export const LAST_DESKTOP_SCREENSHOT_FILE_NAME = '__last_desktop_screenshot'

export const UNTITLED_ID = '__untitled__'

// Note: in Ubuntu, you have to take some delay after activating some tab, otherwise there are chances
// Chrome still think the panel is the window you want to take screenshot, and weird enough in Ubuntu,
// You can't take screenshot of tabs with 'chrome-extension://' schema, even if it's your own extension
export const SCREENSHOT_DELAY = /Linux/i.test(self.navigator.userAgent) ? 200 : 0

export const CS_IPC_TIMEOUT = 4000

export const STATE_STORAGE_KEY = 'background_state'

export const ANTHROPIC = {
  COMPUTER_USE_MODEL: 'claude-3-5-sonnet-20241022'
}
