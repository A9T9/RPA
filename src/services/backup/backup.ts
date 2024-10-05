import FileSaver from '../../common/lib/file_saver'
import JSZip from 'jszip'
import { nameFactory } from '../../common/utils'
import { toJSONString } from '../../common/convert_utils'
import { stringifyTestSuite } from '../../common/convert_suite_utils'
import { getStorageManager } from '../storage'
import { posix as path } from '../../common/lib/path'
import { ZipFolders } from './common'
import { MacroInState } from '@/reducers/state'

export type BackupOptions = {
  backup: {
    testCase?:   boolean;
    testSuite?:  boolean;
    screenshot?: boolean;
    vision?:     boolean;
    csv?:        boolean;
  };
  macroNodes?:   any[];
  testSuites?:  any[];
  screenshots?: any[];
  csvs?:        any[];
  visions?:     any[];
  ignoreMacroTargetOptions?: boolean;
}

export function backup (options: BackupOptions): Promise<void> {
  const { backup, macroNodes, testSuites, screenshots, csvs, visions } = options
  const zip = new JSZip()
  const ps  = [] as Array<Promise<any>>

  const getFolder = (relativePath: string, zipRoot: JSZip): JSZip => {
    if (relativePath === '.') {
      return zipRoot
    }

    const dirs = relativePath.split(path.sep)

    return dirs.reduce((prev, dir) => {
      return prev.folder(dir) as JSZip
    }, zipRoot)
  }

  if (backup.testCase && macroNodes && macroNodes.length) {
    const rootFolder = zip.folder(ZipFolders.Macros)

    macroNodes.forEach(node => {
      const dirPath   = path.dirname(node.relativePath)
      const fileName  = path.basename(node.relativePath)
      const folder    = getFolder(dirPath, rootFolder as JSZip)

      ps.push(
        getStorageManager().getMacroStorage().read(node.fullPath, 'Text')
        .then((data: any) => {
          const macro = data as MacroInState

          folder.file(fileName, toJSONString({
            name:     macro.name,
            commands: macro.data.commands
          }, {
            ignoreTargetOptions: !!options.ignoreMacroTargetOptions
          }))
        })
      )
    })
  }

  if (backup.testSuite && testSuites && testSuites.length) {
    const folder  = zip.folder(ZipFolders.TestSuites) as JSZip
    const genName = nameFactory()

    testSuites.forEach(ts => {
      const name = genName(ts.name)
      folder.file(`${name}.json`, stringifyTestSuite(ts))
    })
  }

  if (backup.screenshot && screenshots && screenshots.length) {
    const folder    = zip.folder(ZipFolders.Screenshots) as JSZip
    const ssStorage = getStorageManager().getScreenshotStorage()

    screenshots.forEach(ss => {
      ps.push(
        ssStorage.read(ss.fullPath, 'ArrayBuffer')
        .then(buffer => {
          folder.file(ss.name, buffer as any, { binary: true })
        })
      )
    })
  }

  if (backup.vision && visions && visions.length) {
    const folder        = zip.folder(ZipFolders.Visions) as JSZip
    const visionStorage = getStorageManager().getVisionStorage()

    visions.forEach(vision => {
      ps.push(
        visionStorage.read(vision.fullPath, 'ArrayBuffer')
        .then(buffer => {
          folder.file(vision.name, buffer as any, { binary: true })
        })
      )
    })
  }

  if (backup.csv && csvs && csvs.length) {
    const folder      = zip.folder(ZipFolders.Csvs) as JSZip
    const csvStorage  = getStorageManager().getCSVStorage()

    csvs.forEach(csv => {
      ps.push(
        csvStorage.read(csv.fullPath, 'Text')
        .then(text => folder.file(csv.name, text as any))
      )
    })
  }

  return Promise.all(ps)
  .then(() => {
    zip.generateAsync({ type: 'blob' })
    .then(function (blob) {
      FileSaver.saveAs(blob, 'uivision_backup.zip');
    })
  })
}
