import FileSaver from './lib/file_saver'
import JSZip from 'jszip'
import { nameFactory } from './utils'
import { toJSONString } from './convert_utils'
import { stringifyTestSuite } from './convert_suite_utils'
import { getStorageManager } from '../services/storage'

export default function backup ({ backup, testCases, testSuites, screenshots, csvs, visions }) {
  const zip = new JSZip()
  const ps  = []

  if (backup.testCase && testCases && testCases.length) {
    const folder = zip.folder('macros')

    testCases.forEach(tc => {
      folder.file(`${tc.name}.json`, toJSONString({
        name: tc.name,
        commands: tc.data.commands
      }))
    })
  }

  if (backup.testSuite && testCases && testSuites && testSuites.length) {
    const folder  = zip.folder('testsuites')
    const genName = nameFactory()

    testSuites.forEach(ts => {
      const name = genName(ts.name)
      folder.file(`${name}.json`, stringifyTestSuite(ts, testCases))
    })
  }

  if (backup.screenshot && screenshots && screenshots.length) {
    const folder    = zip.folder('screenshots')
    const ssStorage = getStorageManager().getScreenshotStorage()

    screenshots.forEach(ss => {
      ps.push(
        ssStorage.read(ss.fileName, 'ArrayBuffer')
        .then(buffer => {
          folder.file(ss.fileName, buffer, { binary: true })
        })
      )
    })
  }

  if (backup.vision && visions && visions.length) {
    const folder        = zip.folder('images')
    const visionStorage = getStorageManager().getVisionStorage()

    visions.forEach(vision => {
      ps.push(
        visionStorage.read(vision.fileName, 'ArrayBuffer')
        .then(buffer => {
          folder.file(vision.fileName, buffer, { binary: true })
        })
      )
    })
  }

  if (backup.csv && csvs && csvs.length) {
    const folder      = zip.folder('datasources')
    const csvStorage  = getStorageManager().getCSVStorage()

    csvs.forEach(csv => {
      ps.push(
        csvStorage.read(csv.fileName, 'Text')
        .then(text => folder.file(csv.fileName, text))
      )
    })
  }

  return Promise.all(ps)
  .then(() => {
    zip.generateAsync({ type: 'blob' })
    .then(function (blob) {
      FileSaver.saveAs(blob, 'kantu_backup.zip');
    })
  })
}
