import Ext from './web_extension'
import fs from './filesystem'

// refer to https://stackoverflow.com/questions/12168909/blob-from-dataurl
function dataURItoBlob (dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0]

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);

  // create a view into the buffer
  var ia = new Uint8Array(ab);

  // set the bytes of the buffer to the correct values
  for (var i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
  }

  // write the ArrayBuffer to a blob, and you're done
  var blob = new Blob([ab], {type: mimeString});
  return blob;
}

function getActiveTabInfo () {
  return Ext.windows.getLastFocused()
  .then(win => {
    return Ext.tabs.query({ active: true, windowId: win.id })
    .then(tabs => tabs[0])
  })
}

function captureScreenBlob () {
  return Ext.tabs.captureVisibleTab(null, { format: 'png' })
  .then(dataURItoBlob)
}

export default function saveScreen () {
  return Promise.all([
    getActiveTabInfo(),
    captureScreenBlob()
  ])
  .then(([tabInfo, screenBlob]) => {
    const fileName = `${Date.now()}_${tabInfo.title.replace(/\s/g, '_')}.png`

    return fs.writeFile(fileName, screenBlob)
    .then(url => url)
  })
}
