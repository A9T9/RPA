import { getNativeFileSystemAPI } from "../filesystem";
import { getXFile } from "../xmodules/xfile";
import path from '@/common/lib/path';
import log from '@/common/log';
import { pad2digits, singletonGetter } from "@/common/ts_utils";
import { getStorageManager, StorageManager } from "../storage";

export type LogServiceParams = {
  waitForStorageManager?: () => Promise<StorageManager>
}

export class LogService {
  private pDirReady: Promise<boolean> = Promise.resolve(false)
  private logsDir: string = '';
  private fileName: string = 'log.txt'
  private waitForStorageManager: (() => Promise<StorageManager>) = () => Promise.resolve(getStorageManager())

  constructor (params: LogServiceParams = {}) {
    this.check()
    this.updateLogFileName()

    if (params.waitForStorageManager) {
      this.waitForStorageManager = params.waitForStorageManager
    }
  }

  updateLogFileName (): void {
    const now = new Date()
    const dateStr = `${now.getFullYear()}${pad2digits(now.getMonth() + 1)}${pad2digits(now.getDate())}`
    const timeStr = [now.getHours(), now.getMinutes(), now.getSeconds()].map(n => pad2digits(n)).join('')

    this.fileName = `log-${dateStr}-${timeStr}.txt`
  }

  check (): Promise<boolean> {
    this.pDirReady = getXFile().sanityCheck(true).then(isSane => {
        if (!isSane) {
          return false
        }

        const { rootDir } = getXFile().getCachedConfig();

        if (!rootDir) {
          return false
        }

        this.logsDir = path.join(rootDir, 'logs')

        return getNativeFileSystemAPI().ensureDir({
          path: this.logsDir
        })
      })

    return this.pDirReady
  }

  log (str: string): Promise<boolean> {
    return this.waitForStorageManager()
    .then(storageManager => {
      if (!storageManager.isXFileMode()) {
        return false
      }

      return getXFile().sanityCheck(true)
      .then(() => this.pDirReady)
      .then(
        (ready: boolean) => {
          if (!ready) {
            return false
          }

          return getNativeFileSystemAPI().appendAllText({
            path:    path.join(this.logsDir, this.fileName),
            content: ensureLineBreak(str)
          })
        },
        (e: Error) => {
          log.warn('Failed to log: ', e.message)
          return false
        }
      )
    })
  }

  logWithTime (str: string): Promise<boolean> {
    return this.log(`${new Date().toISOString()} - ${str}`)
  }

  logTo (filePath: string, str: string): Promise<boolean> {
    return this.waitForStorageManager()
    .then(storageManager => {
      if (!storageManager.isXFileMode()) {
        return false
      }

      return getXFile().sanityCheck(true)
      .then(
        (ready: boolean) => {
          if (!ready) {
            return false
          }

          const dirPath = path.dirname(filePath)

          return getNativeFileSystemAPI().ensureDir({ path: dirPath })
          .then((dirReady: boolean) => {
            if (!dirReady) {
              return false
            }

            return getNativeFileSystemAPI().appendAllText({
              path:    filePath,
              content: ensureLineBreak(str)
            })
          })
        },
        (e: Error) => {
          log.warn('Failed to log: ', e.message)
          return false
        }
      )
    })
  }
}

export const getLogService = singletonGetter((): LogService => new LogService())

function ensureLineBreak (str: string): string {
  if (str.length === 0) {
    return str
  }

  if (str.charAt(str.length - 1) !== '\n') {
    return str + '\n'
  }

  return str
}
