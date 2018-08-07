import FileSaver from './lib/file_saver'
import JSZip from 'jszip'
import { nameFactory } from './utils'
import { toJSONString } from './convert_utils'
import { stringifyTestSuite } from './convert_suite_utils'
import { getScreenshotMan } from './screenshot_man'
import { getCSVMan } from './csv_man'
import { getVisionMan } from './vision_man'

export default function backup ({ backup, testCases, testSuites, screenshots, csvs, visions }) {
  const zip = new JSZip()
  const ps  = []

  if (backup.testCase && testCases && testCases.length) {
    const folder = zip.folder('test_cases')

    testCases.forEach(tc => {
      folder.file(`${tc.name}.json`, toJSONString({
        name: tc.name,
        commands: tc.data.commands
      }))
    })
  }

  if (backup.testSuite && testCases && testSuites && testSuites.length) {
    const folder  = zip.folder('test_suites')
    const genName = nameFactory()

    testSuites.forEach(ts => {
      const name = genName(ts.name)
      folder.file(`${name}.json`, stringifyTestSuite(ts, testCases))
    })
  }

  if (backup.screenshot && screenshots && screenshots.length) {
    const folder  = zip.folder('screenshots')
    const man     = getScreenshotMan()

    screenshots.forEach(ss => {
      ps.push(
        man.read(ss.fileName)
        .then(buffer => {
          folder.file(ss.fileName, buffer, { binary: true })
        })
      )
    })
  }

  if (backup.vision && visions && visions.length) {
    const folder  = zip.folder('visual_ui_test_images')
    const man     = getVisionMan()

    visions.forEach(vision => {
      ps.push(
        man.read(vision.fileName)
        .then(buffer => {
          folder.file(vision.fileName, buffer, { binary: true })
        })
      )
    })
  }

  if (backup.csv && csvs && csvs.length) {
    const folder  = zip.folder('csvs')
    const man     = getCSVMan()

    csvs.forEach(csv => {
      ps.push(
        man.read(csv.fileName)
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
