
/// <reference types="chrome"/>

import { singletonGetter } from "@/common/ts_utils"

type FilePath = string

type DirectoryPath = string

export interface INativeScreenCapture{
  getVersion:      () => Promise<string>;
  getDpi:          () => Promise<string>;
  captureDesktop:  () => Promise<FilePath>;
  changeDirectory: (dir: string) => Promise<DirectoryPath>;
  reconnect:       () => Promise<INativeScreenCapture>;
}

enum CommandName {
  GetVersion = 'getVersion',
  GetDPI = 'getDPI',
  SetDirectory = 'setDirectory',
  SaveScreenshot = 'saveScreenshot'
}

export class NativeScreenCapture implements INativeScreenCapture {
  static HostName = 'com.github.teamdocs.kcmd'
  static FieldNameMapping: Record<CommandName, string> = {
    [CommandName.GetVersion]: 'version',
    [CommandName.GetDPI]: 'dpi',
    [CommandName.SetDirectory]: 'directory',
    [CommandName.SaveScreenshot]: 'file',
  }

  reconnect (): Promise<NativeScreenCapture> {
    return Promise.resolve(this)
  }

  getVersion (): Promise<string> {
    return this.sendMessage<string>(CommandName.GetVersion)
  }

  getDpi (): Promise<string> {
    return this.sendMessage<string>(CommandName.GetDPI)
  }

  captureDesktop (): Promise<FilePath> {
    return this.sendMessage<FilePath>(CommandName.SaveScreenshot)
  }

  changeDirectory (dir: DirectoryPath): Promise<DirectoryPath> {
    return this.sendMessage<DirectoryPath>(CommandName.SaveScreenshot, { current: dir })
  }

  private sendMessage <T> (command: CommandName, extra: Record<string, any> = {}): Promise<T> {
    return new Promise<T>((resolve, reject): void => {
      chrome.runtime.sendNativeMessage(NativeScreenCapture.HostName, { ...extra, command }, (response: any): void => {
        if (response && response.result) {
          resolve(response[NativeScreenCapture.FieldNameMapping[command]])
        } else {
          let error = response && response.error
          error = error || 'Unknown error'

          reject(new Error(error))
        }
      })
    })
  }
}

export const getNativeScreenCapture = singletonGetter(() => new NativeScreenCapture())
