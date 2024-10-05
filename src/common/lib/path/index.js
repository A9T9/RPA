import { posix, win32 } from '../../../../node_modules/path'

const isWindows = /windows/i.test(self.navigator.userAgent)
const path = isWindows ? win32 : posix

export default path

export { win32, posix }
