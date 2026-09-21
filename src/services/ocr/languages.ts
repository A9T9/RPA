
export type LanguageObject = {
  lang:  string;
  name:  string;
  short: string;
}

export type OCRLanguage = keyof typeof ocr_languages
export type TesseractLanguage = keyof typeof tesseract_languages

const ocr_languages = {
  ara: {
    "lang": "ara",
    "name": "Arabic",
    "short": "AR"
  },
  chs: {
    "lang": "chs",
    "name": "ChineseSimplified",
    "short": "简"
  },
  cht: {
    "lang": "cht",
    "name": "ChineseTraditional",
    "short": "繁"
  },
  ce: {
    "lang": "ce",
    "name": "Czech",
    "short": "CS"
  },
  dan: {
    "lang": "dan",
    "name": "Danish",
    "short": "DA"
  },
  dut: {
    "lang": "dut",
    "name": "Dutch",
    "short": "NL"
  },
  eng: {
    "lang": "eng",
    "name": "English",
    "short": "EN"
  },
  fin: {
    "lang": "fin",
    "name": "Finnish",
    "short": "FI"
  },
  fre: {
    "lang": "fre",
    "name": "French",
    "short": "FR"
  },
  ger: {
    "lang": "ger",
    "name": "German",
    "short": "DE"
  },
  gre: {
    "lang": "gre",
    "name": "Greek",
    "short": "EL"
  },
  hun: {
    "lang": "hun",
    "name": "Hungarian",
    "short": "HU"
  },
  ita: {
    "lang": "ita",
    "name": "Italian",
    "short": "IT"
  },
  jpn: {
    "lang": "jpn",
    "name": "Japanese",
    "short": "JP"
  },
  kor: {
    "lang": "kor",
    "name": "Korean",
    "short": "KO"
  },
  nor: {
    "lang": "nor",
    "name": "Norwegian",
    "short": "NN"
  },
  pol: {
    "lang": "pol",
    "name": "Polish",
    "short": "PL"
  },
  por: {
    "lang": "por",
    "name": "Portuguese",
    "short": "PT"
  },
  rus: {
    "lang": "rus",
    "name": "Russian",
    "short": "RU"
  },
  spa: {
    "lang": "spa",
    "name": "Spanish",
    "short": "ES"
  },
  swe: {
    "lang": "swe",
    "name": "Swedish",
    "short": "SV"
  },
  tur: {
    "lang": "tur",
    "name": "Turkish",
    "short": "TR"
  }
}

// tesseract languages reflecting ocr_languages
const tesseract_languages = {
  ara: {
    "lang": "ara",
    "name": "Arabic",
    "short": "AR"
  },
  chi_sim: {
    "lang": "chi_sim",
    "name": "ChineseSimplified",
    "short": "简"
  },
  chi_tra: {
    "lang": "chi_tra",
    "name": "ChineseTraditional",
    "short": "繁"
  },
  ces: {
    "lang": "ces",
    "name": "Czech",
    "short": "CS"
  },
  dan: {
    "lang": "dan",
    "name": "Danish",
    "short": "DA"
  },
  nld: {
    "lang": "nld",
    "name": "Dutch",
    "short": "NL"
  },
  eng: {
    "lang": "eng",
    "name": "English",
    "short": "EN"
  },
  fin: {
    "lang": "fin",
    "name": "Finnish",
    "short": "FI"
  },
  fra: {
    "lang": "fra",
    "name": "French",
    "short": "FR"
  },
  deu: {
    "lang": "deu",
    "name": "German",
    "short": "DE"
  },
  ell: {
    "lang": "ell",
    "name": "Greek",
    "short": "EL"
  },
  hun: {
    "lang": "hun",
    "name": "Hungarian",
    "short": "HU"
  },
  ita: {
    "lang": "ita",
    "name": "Italian",
    "short": "IT"
  },
  jpn: {
    "lang": "jpn",
    "name": "Japanese",
    "short": "JP"
  },
  kor: {
    "lang": "kor",
    "name": "Korean",
    "short": "KO"
  },
  nor: {
    "lang": "nor",
    "name": "Norwegian",
    "short": "NN"
  },
  pol: {
    "lang": "pol",
    "name": "Polish",
    "short": "PL"
  },
  por: {
    "lang": "por",
    "name": "Portuguese",
    "short": "PT"
  },
  rus: {
    "lang": "rus",
    "name": "Russian",
    "short": "RU"
  },
  spa: {
    "lang": "spa",
    "name": "Spanish",
    "short": "ES"
  },
  swe: {
    "lang": "swe",
    "name": "Swedish",
    "short": "SV"
  },
  tur: {
    "lang": "tur",
    "name": "Turkish",
    "short": "TR"
  }  
}

export const ocrLanguages: Record<OCRLanguage, LanguageObject> = ocr_languages 
export const ocrLanguageOptions = (() => {
  const list = Object.keys(ocrLanguages).map(key => {
    return {
      text: ocrLanguages[key as OCRLanguage].name,
      value:  ocrLanguages[key as OCRLanguage].lang
    }
  })
  list.sort((a, b) => {
    if (a.text < b.text) return -1
    if (a.text > b.text) return 1
    return 0
  })
  return list
})()

export const tesseractLanguages: Record<TesseractLanguage, LanguageObject> = tesseract_languages
export const tesseractLanguageOptions = (() => {
  const list = Object.keys(tesseractLanguages).map(key => {
    return {
      text: tesseractLanguages[key as TesseractLanguage].name,
      value:  tesseractLanguages[key as TesseractLanguage].lang
    }
  })
  list.sort((a, b) => {
    if (a.text < b.text) return -1
    if (a.text > b.text) return 1
    return 0
  })
  return list
})()

/**
 * 
 * @param ocrLang 
 * @returns 
 * @throws Error if the language is not found
 * @example 
 * convertOcrLanguageToTesseractLanguage('ger') // 'deu'
 * convertOcrLanguageToTesseractLanguage('chs') // 'chi_sim'
 * convertOcrLanguageToTesseractLanguage('cht') // 'chi_tra'
 * convertOcrLanguageToTesseractLanguage('eng') // 'eng'
 */
export function convertOcrLanguageToTesseractLanguage(ocrLang: OCRLanguage): TesseractLanguage {
  // if there's an entry in tesseract_languages with the key, just return it
  let tesseractLangObj = (tesseract_languages as any)[ocrLang as string];
  if (tesseractLangObj) {
    return tesseractLangObj.lang;
  }
  
  let ocrLangObj = ocr_languages[ocrLang];
  if (!ocrLangObj) {
    throw new Error(`E502: JavaScript OCR encountered a problem`);
  } else { 
    // find language by name 
    let languageName = ocrLangObj.name;
    let found  = Object.keys(tesseract_languages).filter(function(res:string) {
      return (tesseract_languages as any)[res as string]?.name?.toLowerCase() === languageName.toLowerCase();
     });
    if (found.length > 0) {
      let tesseractLang = (tesseract_languages as any)[found[0] as string].lang;
      return tesseractLang as TesseractLanguage;
    } else {
      throw new Error(`Tesseract language not found for ${ocrLang}`);  
    } 
  }
}

// Accepts a code from ANY reader's list, not only the engine selected right
// now. Settings keeps the OCR.Space code ('chs', 'ger') when the user switches
// to a local reader, and a run's pre-flight validates every config variable —
// so the old engine-strict check blocked EVERY JS run for those users with
// "Cannot prepare the macro for the script run: Value 'chs' is not supported
// for variable !OCRLANGUAGE" (8 chats in the 2026-09-06 drop, OPEN-ISSUES
// 35.10). The local readers translate OCR.Space codes themselves
// (OCR_LANGUAGE_TAGS: chs -> zh-Hans) and ignore what they cannot map.
export function isValidOCRLanguage (lang: string, store: any): boolean {
  if (typeof lang !== 'string' || !lang) return false
  const l = lang.toLowerCase()
  if ((ocr_languages as any)[l]) return true
  if (tesseractLanguageOptions.some((o) => String(o.value).toLowerCase() === l)) return true
  let osList: any[] = []
  try { osList = (store && store.getState().config.ocrLanguageOption) || [] } catch (e) { osList = [] }
  return osList.some((o: any) => String(o && o.value).toLowerCase() === l)
}
