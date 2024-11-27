import { getStorageManager } from '@/services/storage'
import { LAST_DESKTOP_SCREENSHOT_FILE_NAME, LAST_SCREENSHOT_FILE_NAME } from './constant'
import { ensureExtName } from './utils'

type ParseAiVisionTargetReturnType = {
  mainImageFileName: string
  searchImageFileName: string | undefined
  prompt: string
}

export const NO_IMAGE_ERROR = `E350: You need at least one (max: 2) image to be included. Use "" for sending a screenshot`
/*
Sample target texts:
1. 'Provide the x,y coordinates of the center of the Anydesk icon. Answer in format x,y|||'
2. 'button.png#I will show you two images....'
3. 'abc.png#button.png#Compare both images. Are they the same?'  
4. 'Find the top left corner and the bottom right corner of the Chrome icon. Make sure the icon is completely inside the bounding box. Answer in format x,y|||x,y'
5. "democv_ocrdone.png#Return the text on the attached image. Answer in format text|||"
*/
export const parseAiVisionTarget = (targetStr: string): ParseAiVisionTargetReturnType => {
  const target = targetStr

  const fileNameStrings = targetStr.match(/([a-zA-Z0-9\._-]+\#)/g);
  console.log(fileNameStrings);
  const fileNamesPart = fileNameStrings?.join("") || "";
  console.log(fileNamesPart);
  const fileNames =
    fileNameStrings?.map((fileNameStr) => fileNameStr.replace(/#/g, "")) || [];
  console.log(fileNames);
  const prompt = targetStr.replace(fileNamesPart, "");

  let mainImageFileName = fileNames?.[0] || ''
  let searchImageFileName = fileNames?.[1] || ''
  console.log("mainImageFileName:>> ", mainImageFileName);
  // mainImageFileName =
  //   mainImageFileName == "s"
  //     ? isDesktop
  //       ? ensureExtName('.png', LAST_DESKTOP_SCREENSHOT_FILE_NAME)
  //       : ensureExtName('.png', LAST_SCREENSHOT_FILE_NAME)
  //     : mainImageFileName;

  console.log("mainImageFileName:>> ", mainImageFileName);
  console.log("searchImageFileName:>> ", searchImageFileName);
  console.log("prompt:>> ", prompt);

  return { mainImageFileName, searchImageFileName, prompt }
}

// TODO: relocate the method to screenshot storage related methods
export const getFileBufferArraysFromScreenshotStorage = async (fileNames: string[]): Promise<Array<ArrayBuffer | null>> => {
  const fileBuffers = await Promise.all(
    fileNames.map(async (fileName) => {
      const buffer = await getStorageManager()
        .getScreenshotStorage()
        .read(fileName, 'ArrayBuffer')
        .then((buffer) => {
          return buffer as ArrayBuffer | null
        })
        .catch(() => null)
      return buffer
    })
  )
  return fileBuffers
}

// TODO: relocate the method to screenshot storage related methods
export const getFileBufferFromScreenshotStorage = async (fileName: string): Promise<ArrayBuffer | null> => {
  const fileBuffer = await getStorageManager()
    .getScreenshotStorage()
    .read(fileName, 'ArrayBuffer')
    .then((buffer) => {
      return buffer as ArrayBuffer | null
    })
    .catch(() => null)

  return fileBuffer
}

// TODO: relocate the method to vision storage related methods
export const getFileBufferFromVisionStorage = async (fileName: string): Promise<ArrayBuffer | null> => {
  const fileBuffer = await getStorageManager()
    .getVisionStorage()
    .read(fileName, 'ArrayBuffer')
    .then((buffer) => {
      return buffer as ArrayBuffer | null
    })
    .catch(() => null)

  return fileBuffer
}

export const aiPromptGetPromptAndImageArrayBuffers = async (
  targetStr: string
): Promise<{ prompt: string; mainImageBuffer: ArrayBuffer | null; searchImageBuffer: ArrayBuffer | null }> => {
  const { mainImageFileName, searchImageFileName, prompt } = parseAiVisionTarget(targetStr)
  // if(!mainImageFileName) {
  //   throw new Error(NO_IMAGE_ERROR)
  // }     
 
  const mainImageBuffer =  await getFileBufferFromScreenshotStorage(mainImageFileName) || await getFileBufferFromVisionStorage(mainImageFileName)
  if(mainImageFileName && !mainImageBuffer) {
    // don't throw error for image #213
    throw new Error(`Image not found in storage: ${mainImageFileName}`)
  }
  const searchImageBuffer = searchImageFileName ? await getFileBufferFromVisionStorage(searchImageFileName) : null
  return { prompt, mainImageBuffer, searchImageBuffer }
}
