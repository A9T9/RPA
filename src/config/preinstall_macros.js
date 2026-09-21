import { JS_DEMOS } from './preinstall_js_scripts'

const preinstallMacros = {
  "LLM AI Commands/ai.ask_CompareImages": {
    "CreationDate": "2024-11-11",
    "Commands":  [
    {
      "Command": "aiPrompt",
      "Target": "canvas_wyoming_dpi_96.png#canvas_wyoming_dpi_96.png#Are both images the same?\nAnswer only with true or false. Answer in lowercase only.",
      "Value": "result",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Test1: Are the images the same? ${result}",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "verify",
      "Target": "result",
      "Value": "true",
      "Description": "Should be false, as the images are NOT the same"
    },
    {
      "Command": "aiPrompt",
      "Target": "canvas_wyoming_dpi_96.png#canvas_wyoming_verify_dpi_96.png#\nAre both images the same? Answer only with true or false. NO OTHER TEXT.",
      "Value": "result",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Test2: Are the images the same? ${result}",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "verify",
      "Target": "result",
      "Value": "false",
      "Description": "Should be true, as both images are the same"
    }
  ]
  },
   "LLM AI Commands/ai.ask_ParseHTML": {
    "CreationDate": "2024-11-22",
    "Commands":   [
    {
      "Command": "open",
      "Target": "https://forum.ui.vision/",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "executeScript",
      "Target": "var str = document.body.innerHTML; // Get page source\n\n//Next: Clean up HTML source before further processing  \n\n//First remove scripts and style tags with their content\nstr = str.replace(/<script\\b[^<]*(?:(?!<\\/script>)<[^<]*)*<\\/script>/gi, '');\nstr = str.replace(/<style\\b[^<]*(?:(?!<\\/style>)<[^<]*)*<\\/style>/gi, '');\n   \n//Then remove all remaining tags but keep their content\nstr = str.replace(/<[^>]+>/g, '');\n   \n//Clean up whitespace\nstr = str.replace(/\\s+/g, ' ').trim();\n   \nreturn str;",
      "Value": "html",
      "Description": "Extract entire HTML code of website"
    },
    {
      "Command": "echo",
      "Target": "Entire HTML extracted (long): ${html}",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "aiPrompt",
      "Target": "What are the titles of the first 5 forum posts? Return just the titles, no explanation. ${html}",
      "Value": "s",
      "Description": "Send cleaned HTML code to Claude. Let the LLM do the parsing."
    },
    {
      "Command": "echo",
      "Target": "First 5 Forum Titles=${s}",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "executeScript_Sandbox",
      "Target": "var text = ${s};\n\n// Split into lines and create 2D array.\nvar lines = text.split('\\n');\nvar twoDimensionalArray = lines.map(function(line) {\n    var now = new Date();\n    var timestamp = now.getFullYear() + '-' + \n                   (now.getMonth() + 1) + '-' + \n                   now.getDate() + ' ' + \n                   now.getHours() + ':' + \n                   now.getMinutes() + ':' + \n                   now.getSeconds();\n    \n    return [timestamp, line.trim()];\n});\n\nreturn twoDimensionalArray;\n",
      "Value": "array1",
      "Description": "Lets move the result into an array, then we can save it to CSV"
    },
    {
      "Command": "csvSaveArray",
      "Target": "array1",
      "Value": "first5forumposts.csv",
      "Description": ""
    }
  ]
  },
  "LLM AI Commands/ai.find_SearchForum": {
    "CreationDate": "2024-11-22",
    "Commands":  [
    {
      "Command": "open",
      "Target": "https://forum.ocr.space/",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "XDesktopAutomation",
      "Target": "false",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "aiScreenXY",
      "Target": "Find the search icon (magnifying glass).",
      "Value": "s",
      "Description": ""
    },
	{
      "Command": "echo",
      "Target": "Original Result=${s}",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Screen-DPI adjusted X,Y coordinates: ${!ai1},${!ai2}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "XClick",
      "Target": "${!ai1},${!ai2}",
      "Value": "",
      "Description": "Click search icon (real input via the XModule)"
    },
    {
      "Command": "XType",
      "Target": "aiprompt${KEY_ENTER}",
      "Value": "",
      "Description": "Enter text to search for"
    },
    {
      "Command": "aiScreenXY",
      "Target": "Find the first search result (blue text)",
      "Value": "s",
      "Description": ""
    },
	 {
      "Command": "echo",
      "Target": "Original Result=${s}",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Screen-DPI adjusted X,Y coordinates: ${!ai1},${!ai2}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "XClick",
      "Target": "${!ai1},${!ai2}",
      "Value": "",
      "Description": "Click first search result link"
    }
  ]
  },
  "Core/DemoAutofill": {
    "CreationDate": "2020-05-28",
    "Commands":  [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed"
      },
      {
        "Command": "store",
        "Target": "15",
        "Value": "!TIMEOUT_WAIT"
      },
      {
        "Command": "store",
        "Target": "60",
        "Value": "!TIMEOUT_PAGELOAD"
      },
      {
        "Command": "open",
        "Target": "https://docs.google.com/forms/d/1cbI5dMRs0-t_IwNzPm6T3lAG_nPgsnJZEA-FEYVARxg/",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "//span[contains(text(),\".Vision IDE\")]",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "//*[text()[contains(.,'Web Testing')]]",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "//span[contains(text(),\"Form Autofilling\")]",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "//*[text()[contains(.,\"General Web Automation\")]]",
        "Value": ""
      },
      {
        "Command": "pause",
        "Target": "500",
        "Value": ""
      },
      {
        "Command": "captureScreenshot",
        "Target": "AutoFill1stPage${!LOOP}",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//*[@id=\"mG61Hd\"]/div/div/div[3]/div/div/div/span/span",
        "Value": "",
        "Targets": [
          "xpath=//*[@id=\"mG61Hd\"]/div/div/div[3]/div/div/div/span/span",
          "xpath=//*[@id=\"mG61Hd\"]/div[2]/div/div[3]/div/div/div/span/span"
        ]
      },
      {
        "Command": "type",
        "Target": "xpath=//input[@type='text']",
        "Value": "This is a single line test...",
      },
      {
        "Command": "type",
        "Target": "xpath=//textarea",
        "Value": "...and this a multiline test:\nLine2\nLine3",
      },
      {
        "Command": "captureScreenshot",
        "Target": "AutoFill2ndPage${!LOOP}",
        "Value": ""
      },
      {
        "Command": "pause",
        "Target": "1000",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//*[@id=\"mG61Hd\"]/div/div/div[3]/div[1]/div[1]/div[2]/span/span",
        "Value": ""
      },
      {
        "Command": "captureScreenshot",
        "Target": "AutoFill3rdPage${!LOOP}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "DemoAutofill macro completed (shown as notification because of #shownotification in the 3rd column)",
        "Value": "#shownotification"
      },
      {
        "Command": "comment",
        "Target": "Open form filling tutorial page",
        "Value": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/rpa/docs/selenium-ide/form-filling",
        "Value": ""
      },
      {
        "Command": "assertTitle",
        "Target": "*Form Filling*",
        "Value": ""
      }
    ]
  },
  "Core/DemoDownload": {
    "CreationDate": "2018-11-23",
    "Commands": [
      {
        "Command": "store",
        "Target": "60",
        "Value": "!timeout_download"
      },
      {
        "Command": "store",
        "Target": "10",
        "Value": "!timeout_wait"
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var d=new Date(); return d.getFullYear() + '-' +((d.getMonth()+1))+'-' +d.getDate();",
        "Value": "todaydate"
      },
      {
        "Command": "echo",
        "Target": "Today is ${todaydate}",
        "Value": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/filedownload",
        "Value": ""
      },
      {
        "Command": "onDownload",
        "Target": "DownloadTest1_${todaydate}.exe",
        "Value": "true"
      },
      {
        "Command": "store",
        "Target": "${!runtime}",
        "Value": "starttime"
      },
      {
        "Command": "click",
        "Target": "linkText=XModules for Windows",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "File name on disk is ${!LAST_DOWNLOADED_FILE_NAME}",
        "Value": "blue"
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return parseFloat(${!runtime})-parseFloat(${starttime})",
        "Value": "downloadtime"
      },
      {
        "Command": "echo",
        "Target": "Download1 (Windows version) took ${downloadtime} seconds",
        "Value": "blue"
      },
      {
        "Command": "onDownload",
        "Target": "DownloadTest2_${todaydate}.exe",
        "Value": "true"
      },
      {
        "Command": "store",
        "Target": "${!runtime}",
        "Value": "starttime"
      },
      {
        "Command": "click",
        "Target": "partialLinkText=for macOS",
        "Value": ""
      },
    {
        "Command": "echo",
        "Target": "File name on disk is ${!LAST_DOWNLOADED_FILE_NAME}",
        "Value": "green"
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return parseFloat(${!runtime})-parseFloat(${starttime})",
        "Value": "downloadtime"
      },
      {
        "Command": "echo",
        "Target": "Download2 (Mac) took ${downloadtime} seconds",
        "Value": "green"
      },
      {
        "Command": "echo",
        "Target": "All done...",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "linkText=OnDownload command",
        "Value": ""
      }
    ]
  }, 
  "Core/DemoExtract": {
    "CreationDate": "2018-05-28",
    "Commands":[
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed"
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/executescript",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Current page URL = ${!URL}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Current loop value = ${!LOOP}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "This macro shows various methods to extract and save data from a website",
        "Value": ""
      },
      {
        "Command": "storeAttribute",
        "Target": "css=img.responsive-img@src",
        "Value": "mylink"
      },
      {
        "Command": "echo",
        "Target": "href=${mylink}",
        "Value": ""
      },
      {
        "Command": "storeAttribute",
        "Target": "css=img.responsive-img@alt",
        "Value": "myalttext"
      },
      {
        "Command": "echo",
        "Target": "alt text = ${myalttext}",
        "Value": ""
      },
      {
        "Command": "storeAttribute",
        "Target": "//input[@id='sometext']@size",
        "Value": "boxsize"
      },
      {
        "Command": "echo",
        "Target": "input box size =${boxsize}",
        "Value": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "This box is ${boxsize} chars wide"
      },
      {
        "Command": "executeScript",
        "Target": "document.title = ${boxsize};",
        "Value": ""
      },
      {
        "Command": "assertTitle",
        "Target": "70",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "//*[@id=\"content\"]/div[2]/div/h2[3]",
        "Value": ""
      },
      {
        "Command": "storeText",
        "Target": "//*[@id=\"content\"]/div[2]/div/h2[3]",
        "Value": "myheader"
      },
      {
        "Command": "echo",
        "Target": "header = ${myheader}",
        "Value": ""
      },
      {
        "Command": "storeTitle",
        "Target": "",
        "Value": "mytitle"
      },
      {
        "Command": "echo",
        "Target": "page title = ${mytitle}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "page title = ${mytitle}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "page title = ${mytitle}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "page title = ${mytitle}",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Now test some extraction with storeValue",
        "Value": ""
      },
      {
        "Command": "storeValue",
        "Target": "id=sometext",
        "Value": "mytext"
      },
      {
        "Command": "select",
        "Target": "id=tesla",
        "Value": "label=Model Y"
      },
      {
        "Command": "storeValue",
        "Target": "id=tesla",
        "Value": "mytesla"
      },
      {
        "Command": "echo",
        "Target": "The text box contains [${mytext}] and the select box has the value [${mytesla}] selected",
        "Value": ""
      },
      {
        "Command": "assertValue",
        "Target": "id=tesla",
        "Value": "y"
      },
      {
        "Command": "storeChecked",
        "Target": "name=vehicle",
        "Value": "hasbike"
      },
      {
        "Command": "storeChecked",
        "Target": "xpath=(//input[@name='vehicle'])[2]",
        "Value": "hascar"
      },
      {
        "Command": "storeChecked",
        "Target": "xpath=(//input[@name='vehicle'])[3]",
        "Value": "hasboat"
      },
      {
        "Command": "echo",
        "Target": "User has bike:${hasbike}, car:${hascar}, boat:${hasboat}",
        "Value": "green"
      },
      {
        "Command": "comment",
        "Target": "Search and extract directly from the page SOURCE",
        "Value": "y"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=[\\$\\£\\€](\\d+(?:\\.\\d{1,2})?)",
        "Value": "match1"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=[\\$\\£\\€](\\d+(?:\\.\\d{1,2})?)@2",
        "Value": "match2"
      },
      {
        "Command": "comment",
        "Target": "You can also extract without regex with the * symbol",
        "Value": "match2b"
      },
      {
        "Command": "sourceExtract",
        "Target": "$*<",
        "Value": "match2b"
      },
      {
        "Command": "echo",
        "Target": "Coffee costs ${match1} and tea ${match2}",
        "Value": "blue"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=_width: (\\d+)",
        "Value": "match1"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=_width: (\\d+)@1,1",
        "Value": "match1group1"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=_width: (\\d+)@2",
        "Value": "match2"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=_width: (\\d+)@2,1",
        "Value": "match2group1"
      },
      {
        "Command": "echo",
        "Target": "match1 = [${MATCH1}] (group1 = [${match1group1}]) match2 =  [${MATCH2}]  (group1 = [${MATCH2GROUP1}])",
        "Value": "blue"
      },
      {
        "Command": "comment",
        "Target": "Extract Google Analytics ID",
        "Value": ""
      },
      {
        "Command": "sourceExtract",
        "Target": "G-*,",
        "Value": "ga_option1"
      },
      {
        "Command": "sourceExtract",
        "Target": "regex=G-[0-9]+-[0-9]+",
        "Value": "ga_option2"
      },
      {
        "Command": "echo",
        "Target": "Google Analytics ID = ${ga_option2}",
        "Value": "pink"
      },
      {
        "Command": "comment",
        "Target": "Some assertion test for QA",
        "Value": ""
      },
      {
        "Command": "if",
        "Target": "${match2group1} != 22",
        "Value": ""
      },
      {
        "Command": "throwError",
        "Target": "Regex Extraction failed for Match2(1):  ${match2group1}",
        "Value": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Last but not least, taking a screenshot is another way to extract data",
        "Value": ""
      },
      {
        "Command": "captureScreenshot",
        "Target": "myscreenshot_${mytitle}",
        "Value": ""
      },
      {
        "Command": "storeImage",
        "Target": "//*[@id=\"page-header\"]/div/div/h1",
        "Value": "pagetitle.png"
      },
      {
        "Command": "comment",
        "Target": "Export images to download folder",
        "Value": ""
      },
      {
        "Command": "localStorageExport",
        "Target": "myscreenshot_${mytitle}.png",
        "Value": ""
      },
      {
        "Command": "localStorageExport",
        "Target": "pagetitle.png",
        "Value": ""
      }
    ]
  },
  "Core/DemoFrames": {
    "CreationDate": "2022-02-27",
    "Commands": [
         {
        "Command": "open",
        "Target": "https://ui.vision/demo/webtest/frames/",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Reduce replay speed so we can better see what is going on...",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "medium",
        "Value": "!replayspeed",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=0",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "name=mytext1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext1",
        "Value": "Frame1 (index=0)",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "name=mytext2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext2",
        "Value": "Frame2 (index=1)",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "name=mytext3",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext3",
        "Value": "Frame3 (index=2)",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=3",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "name=mytext4",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext4",
        "Value": "Frame4 (index=3)",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=4",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "name=mytext5",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext5",
        "Value": "Frame5 (index=4)",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext3",
        "Value": "now testing iframe inside this frame",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=0",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "//span[contains(text(),\".Vision IDE\")]",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "xpath=//input[@type='text']",
        "Value": "iframe in frame: works!",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//div[3]/div/div/div/span",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=entry.1572386418",
        "Value": "Form Filling Test Done!",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//*[@id=\"mG61Hd\"]/div/div/div[3]/div[1]/div[1]/div[2]/span/span",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=mytext3",
        "Value": "Test completed!",
        "Description": ""
      }
    ]
  },
  
  "Core/DemoTakeScreenshots": {
    "CreationDate": "2024-6-8",
    "Commands": [
    {
      "Command": "open",
      "Target": "https://ui.vision/blog/",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "rpablog",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "click",
      "Target": "linkText=read more@POS=1",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "article1",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "open",
      "Target": "https://ui.vision/blog/",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "click",
      "Target": "linkText=read more@POS=2",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "article2",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "captureScreenshot",
      "Target": "article2_just_viewport",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "comment",
      "Target": "take screenshot of an _element_ with storeImage",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "storeImage",
      "Target": "partialLinkText=Blog",
      "Value": "blogtitle",
      "Description": ""
    },
    {
      "Command": "comment",
      "Target": "Next: Run OCR on the screenshot to verify its content",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "store",
      "Target": "eng",
      "Value": "!ocrlanguage",
      "Description": "English OCR"
    },
    {
      "Command": "store",
      "Target": "98",
      "Value": "!ocrengine",
      "Description": "use Javascript OCR engine"
    },
    {
      "Command": "OCRExtractScreenshot",
      "Target": "blogtitle.png",
      "Value": "ocr_result",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "OCR Result = ${ocr_result}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${ocr_result}.indexOf(\"RPA\") !== -1",
      "Value": "",
      "Description": "Make sure string includes \"RPA\""
    },
    {
      "Command": "echo",
      "Target": "yes, screenshot taking and OCR worked",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "end",
      "Target": "",
      "Value": "",
      "Description": ""
    }
  ]
  },
  "Core/DemoIfElse": {
    "CreationDate": "2018-4-28",
    "Commands": [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed"
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/executeScript",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "How to use gotoIf and label(s) for flow control. For a while/endWhile demo, see the DemoSaveCSV macro.",
        "Value": ""
      },
      {
        "Command": "executeScript",
        "Target": "return (new Date().getHours())",
        "Value": "mytime"
      },
      {
        "Command": "echo",
        "Target": "mytime = ${mytime}",
        "Value": ""
      },
      {
        "Command": "if",
        "Target": "${mytime}  > 16",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Good afternoon!",
        "Value": ""
      },
      {
        "Command": "else",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Good morning!",
        "Value": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
  
   {
        "Command": "storeAttribute",
        "Target": "//input[@id='sometext-WRONG-ID-TEST']@size",
        "Value": "boxsize"
      },
      {
        "Command": "if",
        "Target": "${boxsize} == \"#LNF\"",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "The xpath was not found. In this case the variable gets filled with #LNF (Locator Not Found).",
        "Value": "blue"
      },
      {
        "Command": "storeAttribute",
        "Target": "//input[@id='sometext']@size",
        "Value": "boxsize"
      },
      {
        "Command": "echo",
        "Target": "With correct Xpath ID we get: Boxsize = ${boxsize}",
        "Value": "green"
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "gotoIf",
        "Target": "${boxsize} > 70",
        "Value": "BOX-TOO-BIG"
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "This box is ${boxsize} chars wide"
      },
      {
        "Command": "executeScript",
        "Target": "document.title = ${boxsize};",
        "Value": ""
      },
      {
        "Command": "gotoLabel",
        "Target": "END",
        "Value": ""
      },
      {
        "Command": "label",
        "Target": "BOX-TOO-BIG",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Input box too big. This is just a test of gotoIf",
        "Value": ""
      },
      {
        "Command": "executeScript",
        "Target": "document.title = \"Just a gotoIf test. This line should not be reached unless you edit the macro\"",
        "Value": ""
      },
      {
        "Command": "label",
        "Target": "END",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "test case completed",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "onError",
        "Target": "#goto",
        "Value": "fixerror"
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "this line works"
      },
      {
        "Command": "type",
        "Target": "id=sometextXXXXX",
        "Value": "this line has the wrong ID..."
      },
      {
        "Command": "echo",
        "Target": "this line is never reached, because of the error above",
        "Value": "blue"
      },
      {
        "Command": "gotoLabel",
        "Target": "end-part2",
        "Value": ""
      },
      {
        "Command": "label",
        "Target": "fixerror",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "here we can have code that handles the error..",
        "Value": "green"
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "Fix Error Section: This command works."
      },
      {
        "Command": "label",
        "Target": "end-part2",
        "Value": ""
      }
    ]
  },
  "Core/DemoIframe":{
    "CreationDate": "2022-05-18",
    "Commands":  [
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/iframes",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "//*[@id=\"content\"]/div[2]/div/p[1]",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "First iframe: Embedded Google Doc",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "index=0",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "//span[contains(text(),\".Vision IDE\")]",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "xpath=//input[@type='text']",
        "Value": "Automating a website inside an embedded iframe",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//div[3]/div/div/div/span",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "name=entry.1572386418",
        "Value": "Form Filling Test Done!",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//*[@id=\"mG61Hd\"]/div/div/div[3]/div[1]/div[1]/div[2]/span/span",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectFrame",
        "Target": "relative=top",
        "Value": "",
        "Description": "Back to main page (top frame)"
      }
    ]
  },
  "Core/DemoImplicitWaiting": {
    "CreationDate": "2019-8-5",
    "Commands": [
      {
        "Command": "comment",
        "Target": "waitForElementVisible is not part of implicit waiting",
        "Value": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/waitforelementvisible",
        "Value": ""
      },
      {
        "Command": "waitForElementVisible",
        "Target": "css=#div1 > h1",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "css=#div1 > h1",
        "Value": ""
      },
      {
        "Command": "store",
        "Target": "20",
        "Value": "!timeout_wait"
      },
      {
        "Command": "waitForElementVisible",
        "Target": "css=#div2 > h1",
        "Value": ""
      },
      {
        "Command": "click",
        "Target": "css=#div2 > h1",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Implicit waiting: Wait for elements to be loaded  or <timeout_wait> is reached",
        "Value": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/webtest/implicitwaiting/",
        "Value": ""
      },
      {
        "Command": "store",
        "Target": "15",
        "Value": "!TIMEOUT_WAIT"
      },
      {
        "Command": "assertText",
        "Target": "/html/body/header/center/p[2]",
        "Value": "Use the select box to start the timer..."
      },
      {
        "Command": "select",
        "Target": "id=minutesSelect",
        "Value": "label=5 Seconds"
      },
      {
        "Command": "echo",
        "Target": "The next element (target) is not available yet... Ui.Vision waits for it up to ${!TIMEOUT_WAIT} seconds to appear.",
        "Value": "blue"
      },
      {
        "Command": "click",
        "Target": "/html/body/header/center/img",
        "Value": ""
      }
    ]	
  },
  
  "Core/DemoCsvReadWithWhile": {
    "CreationDate": "2024-1-25",
    "Commands": [
      {
        "Command": "store",
        "Target": "180",
        "Value": "!timeout_macro"
      },
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed"
      },
      {
        "Command": "comment",
        "Target": "The file ReadCSVTestData.csv is pre-installed with Ui.Vision.",
        "Value": ""
      },
      {
        "Command": "csvRead",
        "Target": "ReadCSVTestData.csv",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Status = ${!csvReadStatus}, line = ${!csvReadLineNumber}",
        "Value": ""
      },
      {
        "Command": "while",
        "Target": "${!csvReadStatus} == \"OK\"",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "status = ${!csvReadStatus}, line = ${!csvReadLineNumber}",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Call subroutine for the actual form filling",
        "Value": ""
      },
      {
        "Command": "run",
        "Target": "Sub/Sub_DemoCsvRead_FillForm",
        "Value": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number(${!csvReadLineNumber})+1",
        "Value": "!csvReadLineNumber"
      },
      {
        "Command": "store",
        "Target": "true",
        "Value": "!errorIgnore"
      },
      {
        "Command": "echo",
        "Target": "Reading CSV line No.  ${!csvReadLineNumber} ",
        "Value": "!errorIgnore"
      },
      {
        "Command": "csvRead",
        "Target": "ReadCSVTestData.csv",
        "Value": ""
      },
      {
        "Command": "store",
        "Target": "false",
        "Value": "!errorIgnore"
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      }
    ]
  }, 
  "Core/DemoCsvReadArray": {
    "CreationDate": "2024-04-04",
    "Commands": [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Create an array and save the content to a CSV file",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var arr = []; for(var x = 0; x < 5; x++){arr[x] = []; for(var y = 0; y < 3; y++){arr[x][y] = (x+1)*(y+1);}}; return arr",
        "Value": "array1",
        "Description": "Note that (non-sandbox) executeScript command  would run inside the webpage, so a website must be open in the browser. That is why we prefer the _sandbox version here."
      },
      {
        "Command": "comment",
        "Target": "Manually set two array values ",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var newArr = ${array1}; newArr[0][2] = 'Hello World'; return newArr",
        "Value": "array1",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var newArr = ${array1}; newArr[2][1] = 'This is how you set an array value'; return newArr",
        "Value": "array1",
        "Description": "We must use executeScript here since the \"_Sandbox\" version can not return arrays. "
      },
      {
        "Command": "csvSaveArray",
        "Target": "array1",
        "Value": "data_from_array.csv",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Read the array again from csv file",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "csvReadArray",
        "Target": "data_from_array.csv",
        "Value": "myCSV",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Number of rows = ${!CsvReadMaxRow}",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${mycsv[0]}.length;",
        "Value": "col",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Number of columns = ${col}",
        "Value": "pink",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "loop over all CSV values",
        "Value": "",
        "Description": ""
      },
	  {
        "Command": "store",
        "Target": "nodisplay",
        "Value": "!replayspeed",
        "Description": "Speed up replay by disabling animations/IDE updates. Log file still gets written, it is just not shown."
      },
      {
        "Command": "forEach",
        "Target": "myCSV",
        "Value": "row",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "col1=${row[0]}, col2=${row[1]}, col3=${row[2]}",
        "Value": "brown",
        "Description": ""
      },
      {
        "Command": "forEach",
        "Target": "row",
        "Value": "elem",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Element=${elem}",
        "Value": "blue",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "row",
        "Value": "elem",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      },
	    {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
        "Description": "Show the IDE updates again (such as the current line and log)"
      },
      {
        "Command": "comment",
        "Target": "Another way to loop over the array content",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "times",
        "Target": "${!CsvReadMaxRow}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Substract 1 from !times, as the array index starts with 0",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${!times} - 1;",
        "Value": "i",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Row ${i}, 3rd Element => ${myCSV[${i}][2]}",
        "Value": "blue",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      }
    ]
  }, 
  
  "Core/DemoCsvSave": {
    "CreationDate": "2018-06-01",
    "Commands":  [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed"
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/csvsave",
        "Value": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var d = new Date(); m = d.getFullYear()+\"-\"+(d.getMonth()+1)+\"-\"+ d.getDate()+\" \"+ d.getHours()+\":\" + d.getMinutes() + \":\" + d.getSeconds(); return m",
        "Value": "timestamp"
      },
      {
        "Command": "store",
        "Target": "${timestamp}",
        "Value": "!csvLine"
      },
      {
        "Command": "echo",
        "Target": "First column in the CSV is time (${timestamp})",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Set i = 1 as we start the extraction with the 2nd table cell.",
        "Value": ""
      },
      {
        "Command": "store",
        "Target": "1",
        "Value": "i"
      },
      {
        "Command": "while",
        "Target": "(${i} < 8)",
        "Value": ""
      },
      {
        "Command": "executeScript",
        "Target": "return Number (${i}) + 1",
        "Value": "i"
      },
      {
        "Command": "echo",
        "Target": "Current value of i = ${i}",
        "Value": "i"
      },
      {
        "Command": "storeText",
        "Target": "//*[@id=\"gcw_mainFNGP5XSu6\"]/div[2]/table/tbody/tr[2]/td[${i}]/a",
        "Value": "c2"
      },
      {
        "Command": "store",
        "Target": "${c2}",
        "Value": "!csvLine"
      },
      {
        "Command": "echo",
        "Target": "Extracted Value for i=${i} is exchange rate = ${c2}",
        "Value": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "${!csvLine}",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Append content of !csvLine to CSV file (or create file if none exists)",
        "Value": ""
      },
      {
        "Command": "csvSave",
        "Target": "CurrencyConverterData",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "If needed, you can download (save) the CSV data from the CSV tab to the the download folder",
        "Value": ""
      },
      {
        "Command": "localStorageExport",
        "Target": "currencyconverterdata.csv",
        "Value": ""
      }
    ]
  },
  "XModules/DemoPDFTest_with_OCR": 
  {
    "CreationDate": "2022-05-18",
    "Commands":  [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
        "Description": ""
      },
      {
        "Command": "if",
        "Target": "${!browser} ==\"firefox\"",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "throwError",
        "Target": "This macro works only in Chrome and Edge - Firefox does not support automating PDF documents yet.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "open",
        "Target": "http://download.ui.vision/demo/pdf-test.pdf",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "setWindowSize",
        "Target": "800x700",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Check that PDF is loaded OK",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Option 1: Check with image search",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "pdftest_salesquote.png@0.35",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Option 2: Check with text search  search",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "ENG",
        "Value": "!ocrlanguage",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "1",
        "Value": "!ocrengine",
        "Description": "Online OCR uses the OCR API at https://ocr.space - on this website you can test the different OCR engines directly and use the one that works best."
      },
      {
        "Command": "store",
        "Target": "true",
        "Value": "!ocrscale",
        "Description": "Upscaling can help with smaller fonts"
      },
      {
        "Command": "OCRSearch",
        "Target": "sales quote",
        "Value": "matches",
        "Description": "Search the (visible part of the ) PDF for the word \"sales quote\""
      },
      {
        "Command": "echo",
        "Target": "Number of matches: ${matches}",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "if",
        "Target": "${matches} == \"0\"",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "throwError",
        "Target": "Something wrong, I can not find the text <sales quote>",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Now extract the quote number and check that it is the correct one",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClickRelative",
        "Target": "getquotenumber_dpi_96_relative.png@0.30",
        "Value": "",
        "Description": "Takes a screenshof the area inside the pink box and OCR its. The extracted area can be checked by looking at the \"__lastscreenshot.png\" image in the Screenshots tab"
      },
      {
        "Command": "OCRExtractRelative",
        "Target": "getquotenumber_dpi_96_relative.png@0.30",
        "Value": "q",
        "Description": "Takes a screenshof the area inside the pink box and OCR its. The extracted area can be checked by looking at the \"__lastscreenshot.png\" image in the Screenshots tab"
      },
      {
        "Command": "echo",
        "Target": "Extracted text in pink area: >${q}<",
        "Value": "blue",
        "Description": ""
      },
      {
        "Command": "executeScript",
        "Target": "return ${q}.replace(/( |\\n|\\r)/gm, \"\")",
        "Value": "q",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Remove space(s) and line break(s): Quote Number: >${q}<",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var string = ${q}, substring = \"135\";  b= string.lastIndexOf(substring)>=0; return b;",
        "Value": "textfound",
        "Description": "lastIndexOf>=0 is true if the substring is found inside the q variable, see https://forum.ui.vision/t/string-search-startswith-and-includes/10081/3"
      },
      {
        "Command": "if",
        "Target": "${textfound} == true",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Quote number OK",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "else",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "throwError",
        "Target": "Wrong quote number. Extracted text was >${q}<",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "The X... commands require the RealUser XModule to be installed",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "pause",
        "Target": "500",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Click on the document to give it the focus. For this, we click on the word \"SALES QUOTE\".",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClick",
        "Target": "ocr=sales quote",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Scroll down to next page",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "if",
        "Target": "${!os}==\"mac\"",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Page scroll in macOS is CMD key + Down",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_CMD+KEY_DOWN}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "else",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Page scroll in Windows and Linux is PAGE DOWN key",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_PAGE_DOWN}${KEY_PAGE_DOWN}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Find link image and click it",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Wait 0.5 seconds for the PDF to complete scrolling. Otherwise if the Xclick image is found while the PDF still scrolls, the click goes to the wrong location.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "pause",
        "Target": "500",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClick",
        "Target": "ocr=website",
        "Value": "",
        "Description": "For XClick to work correctly make sure the browser zoom is at 100%. Otherwise the calculated x/y are wrong."
      },
      {
        "Command": "comment",
        "Target": "Check the right page is loaded (here: check logo is there)",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertElementPresent",
        "Target": "//*[@id=\"logo\"]/img",
        "Value": "",
        "Description": "Make sure the previous XClick was successful "
      }
    ]
  },
  "XModules/DemoXType":	
  {
    "CreationDate": "2019-01-28",
    "Commands": [
      {
        "Command": "store",
        "Target": "medium",
        "Value": "!replayspeed"
      },
      {
        "Command": "comment",
        "Target": "Make sure the browser is in the foreground, so it receives the XTYPE keystrokes",
        "Value": ""
      },
      {
        "Command": "bringBrowserToForeground",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/xtype",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "To save the page, open the browser save dialog with a shortcut",
        "Value": ""
      },
      {
        "Command": "if",
        "Target": "${!os}==\"mac\"",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Save web page in macOS is CMD+S",
        "Value": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_CMD+KEY_S}",
        "Value": ""
      },
      {
        "Command": "else",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Save web page in Windows and Linux is CTRL+S",
        "Value": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_CTRL+KEY_S}",
        "Value": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Generate today's date and time ",
        "Value": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var d= new Date(); var m=((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1); m = d.getFullYear()+\"-\"+m+\"-\"+d.getDate(); return m",
        "Value": "mydate"
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return new Date().getHours()+\"-\" + new Date().getMinutes() + \"-\" + new Date().getSeconds()",
        "Value": "mytime"
      },
      {
        "Command": "echo",
        "Target": "Today is ${mydate}, and the time is ${mytime}",
        "Value": "blue"
      },
      {
        "Command": "comment",
        "Target": "Wait for the dialog to appear before sending the next keystrokes",
        "Value": ""
      },
      {
        "Command": "pause",
        "Target": "2000",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "Send the new file name to the dialog and press ENTER",
        "Value": "blue"
      },
      {
        "Command": "XType",
        "Target": "Page_saved_by_UiVision_${mydate}_${mytime}",
        "Value": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_ENTER}",
        "Value": ""
      }
    ]
  },
  
  "XModules/DemoXRun":
  {
    "CreationDate": "2019-09-16",
    "Commands": [
      {
        "Command": "echo",
        "Target": "This demo macro uses hard-coded paths for the default calculator app. But the correct path depends on your operating system version and language. So the default path in this macro might be wrong and needs to be adjusted.",
        "Value": "blue"
      },
      {
        "Command": "if",
        "Target": "${!os}==\"mac\"",
        "Value": ""
      },
      {
        "Command": "XRun",
        "Target": "/Applications/Calculator.app/Contents/MacOS/Calculator",
        "Value": ""
      },
      {
        "Command": "elseif",
        "Target": "${!os}==\"linux\"",
        "Value": ""
      },
      {
        "Command": "XRun",
        "Target": "/snap/bin/gnome-calculator",
        "Value": ""
      },
      {
        "Command": "elseif",
        "Target": "${!os}==\"windows\"",
        "Value": ""
      },
      {
        "Command": "XRun",
        "Target": "C:\\Windows\\System32\\calc.exe",
        "Value": ""
      },
      {
        "Command": "comment",
        "Target": "You find the example PowerShell script for this demo in the Ui.Vision docs for \"XRunAndWait\"",
        "Value": "-executionpolicy bypass -File  c:\\test\\test1.ps1  c:\\test\\test.txt Hello"
      },
      {
        "Command": "comment",
        "Target": "XRunAndWait // Powershell.exe ",
        "Value": "-executionpolicy bypass -File  c:\\test\\test1.ps1  c:\\test\\test.txt Hello"
      },
      {
        "Command": "comment",
        "Target": "echo // Exitcode = ${!xrun_exitcode}  (Note: The exit code is only captured if you use XRunAndWait)",
        "Value": ""
      },
      {
        "Command": "else",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "This should never happen",
        "Value": ""
      },
      {
        "Command": "end",
        "Target": "",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Calculator app launched ",
        "Value": ""
      }
    ]
  },
  
  "XModules/DemoXClick":	  
  {
    "CreationDate": "2022-05-19",
   "Commands": [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
        "Description": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/draw",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "bringBrowserToForeground",
        "Target": "",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "linkText=this link",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "pause",
        "Target": "1000",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "draw_canvas_dpi_96.png",
        "Value": "",
        "Description": "Check we are on the right page"
      },
      {
        "Command": "XClick",
        "Target": "draw_plus_dpi_96.png",
        "Value": "",
        "Description": "Click the plus icon to start a new drawing"
      },
      {
        "Command": "XClick",
        "Target": "draw_redbutton_dpi_96.png",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "We use a relative click, since the pencil icon can change shape",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClickRelative",
        "Target": "draw_pencil_dpi_96.png",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_ESC}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClickRelative",
        "Target": "draw_startingpoint_dpi_96.png",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Starting point: x=${!imagex} y=${!imagey}",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "${!imagex}",
        "Value": "x",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "${!imagey}",
        "Value": "y",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Draw top line --->",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#down",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${x}) +100",
        "Value": "x",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#move",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#up",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Draw right line down",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#down",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${y}) +100",
        "Value": "y",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#move",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#up",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Draw bottom line <---",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#down",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${x}) - 100",
        "Value": "x",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#move",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#up",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Draw left line up",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#down",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${y}) - 100",
        "Value": "y",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#move",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "${x},${y}",
        "Value": "#up",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "visualAssert // draw_compare_dpi_96.png",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Add some text...",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XClick",
        "Target": "draw_text1_dpi_96.png",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XType",
        "Target": "${KEY_ESC}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Now click on the canvas. This is the place where the text starts.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${y}) +180",
        "Value": "y",
        "Description": ""
      },
      {
        "Command": "XClick",
        "Target": "${x},${y}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Send keystrokes",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XType",
        "Target": "Demo completed.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Click once more on the canvas to close text menu",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Number (${y}) - 150",
        "Value": "y",
        "Description": ""
      },
      {
        "Command": "XClick",
        "Target": "${x},${y}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Confirm that the text is shown. @0.5 overwrites the global confidence level.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "draw_checkresult1_dpi_96.png@0.4",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "DemoXClick completed",
        "Value": "#shownotification",
        "Description": ""
      }
    ]
  },

  "XModules/DemoXMove":
  {
    "CreationDate": "2021-05-17",
   "Commands": 
   [
      {
        "Command": "comment",
        "Target": "This demo shows *two* methods to select an image from a list of matches",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/draw",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "linkText=this external website",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Move 2nd range slider using #POS method",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "XMove",
        "Target": "slider_handle_dpi_96.png@0.75#2",
        "Value": "#down",
        "Description": "Press slider handle down"
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var x = ${!imagex}; return x+200",
        "Value": "xnew",
        "Description": "Calcuate new X position. "
      },
      {
        "Command": "XMove",
        "Target": "${xnew}, ${!imagey}",
        "Value": "#up",
        "Description": "Move slider handle and release left mouse button"
      },
      {
        "Command": "comment",
        "Target": "Move 3rd slider with AREALIMIT method",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "xpath=//ion-list[3]/ion-item/div/div/ion-range",
        "Value": "#down",
        "Description": "CLICK is not needed. We used it just to find the XPath for use with visionLimitSearchArea below."
      },
    {
        "Command": "pause",
        "Target": "2000",
        "Value": "",
      "Description": ""
      },
      {
        "Command": "visionLimitSearchArea",
        "Target": "element: xpath=//ion-list[3]/ion-item/div/div/ion-range",
        "Value": "",
        "Description": "Restrict computer vision image search to the HTML tag area"
      },
      {
        "Command": "XMove",
        "Target": "slider_handle_dpi_96.png@0.6",
        "Value": "#down",
        "Description": "We do not need to add \"#1\" because in the new (limited) area there is only one slider handle, so the BEST MATCH option (=without #) is most reliable"
      },
      {
        "Command": "XMoveRelative",
        "Target": "slider_red_dpi_96.png@0.6",
        "Value": "#up",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Confirm slider is in the right position.",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "storeText",
        "Target": "xpath=//ion-list[3]/ion-list-header/div/ion-badge",
        "Value": "warmth",
        "Description": "Extract slider position"
      },
      {
        "Command": "echo",
        "Target": "Slider WARMTH value is: ${warmth}",
        "Value": "red",
        "Description": ""
      },
      {
        "Command": "assert",
        "Target": "warmth",
        "Value": "2000",
        "Description": "Show error if slider has not the expected value"
      }
    ]
   },

  "XModules_Desktop/DemoAutomateChromeDevTools":
  {
    "CreationDate": "2024-04-28",
    "Commands": 
   [
    {
      "Command": "XDesktopAutomation",
      "Target": "true",
      "Value": "",
      "Description": "We need desktop automation, since we are not working inside the browser viewport"
    },
    {
      "Command": "store",
      "Target": "Console",
      "Value": "WordConsole",
      "Description": "In English the tab is called \"Console\". If your browser uses a different language, enter \"your word\" for Console here"
    },
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${!os}==\"mac\" || ${!os}==\"windows\" || ${!os}==\"linux\"",
      "Value": "",
      "Description": "|| means \"or\" in Javascript notation"
    },
    {
      "Command": "store",
      "Target": "99",
      "Value": "!ocrengine",
      "Description": "99 = XModule integrated OCR (Mac and Windows, no Linux yet)"
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": "For Linux we have no local OCR XModule yet, so use online OCR"
    },
    {
      "Command": "store",
      "Target": "2",
      "Value": "!ocrengine",
      "Description": "Engine 1 and 2 are Online OCR. They work on all platforms and offer more languages. For more information please see https://ui.vision/x/desktop-automation#ocr"
    },
    {
      "Command": "end",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "store",
      "Target": "eng",
      "Value": "!OCRlanguage",
      "Description": ""
    },
    {
      "Command": "open",
      "Target": "https://ui.vision/rpa/x/desktop-automation/screen-scraping",
      "Value": "",
      "Description": "Show the relevant Ui.Vision Docs page"
    },
    {
      "Command": "bringBrowserToForeground",
      "Target": "",
      "Value": "",
      "Description": "Make sure the browser is in the foreground, so it receives the XTYPE keystrokes"
    },
    {
      "Command": "OCRSearch",
      "Target": "${WordConsole}",
      "Value": "words_found",
      "Description": "Check if the developer console is already open"
    },
    {
      "Command": "echo",
      "Target": "How often is this word on the screen?: ${words_found} ",
      "Value": "pink",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${words_found} > 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Developer Console already open",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "else",
      "Target": "Dev window already open",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Open Developer Console",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${!os}==\"mac\"",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "XType",
      "Target": "${KEY_OPTION+KEY_CMD+KEY_I}",
      "Value": "",
      "Description": "Mac "
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "XType",
      "Target": "${KEY_CTRL+KEY_SHIFT+KEY_I}",
      "Value": "",
      "Description": "Windows and Linux"
    },
    {
      "Command": "end",
      "Target": "",
      "Value": "",
      "Description": "Mac/Win,Linux"
    },
    {
      "Command": "end",
      "Target": "",
      "Value": "",
      "Description": "Open/NotOpen"
    },
    {
      "Command": "XClickText",
      "Target": "${WordConsole}",
      "Value": "",
      "Description": "Select Tab \"Console\""
    },
    {
      "Command": "XClickTextRelative",
      "Target": "${WordConsole}#R5,-4",
      "Value": "",
      "Description": "Click in FILTER box. We find this box RELATIVE to the word \"Console\""
    },
    {
      "Command": "XType",
      "Target": "${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}${KEY_BACKSPACE}",
      "Value": "",
      "Description": "Clear box from previous macro runs (if any)"
    },
    {
      "Command": "XType",
      "Target": "Demo",
      "Value": "",
      "Description": "Set a filter (just as text entry demo)"
    },
    {
      "Command": "XClickTextRelative",
      "Target": "${WordConsole}#R5,-30",
      "Value": "",
      "Description": "Click in console window, again we find this window by starting at the CONSOLE word"
    },
    {
      "Command": "XType",
      "Target": "* Demo completed, Runtime =${!runtime} *",
      "Value": "",
      "Description": ""
    }
  ]
  },
 
  "Core/Sub/Sub_DemoCsvRead_FillForm":
  {
    "CreationDate": "2020-08-08",
    "Commands": [
      {
        "Command": "comment",
        "Target": "Subroutine used by DemoCsvReadWithLoop and DemoCsvReadWithWhile",
        "Value": ""
      },
      {
        "Command": "echo",
        "Target": "Inside subroutine: Status = ${!csvReadStatus}, Line = ${!csvReadLineNumber}",
        "Value": "green"
      },
      {
        "Command": "open",
        "Target": "https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform",
        "Value": ""
      },
      {
        "Command": "type",
        "Target": "xpath=//input[@type='text']",
        "Value": "${!COL1}_${!csvReadLineNumber}",
      },
      {
        "Command": "type",
        "Target": "xpath=//div[3]/div/div/div[2]/div/div/div/div/input",
        "Value": "${!COL2}"
      },
      {
        "Command": "type",
        "Target": "xpath=//div[4]/div/div/div[2]/div/div/div/div/input",
        "Value": "${!COL3}"
      },
      {
        "Command": "click",
        "Target": "xpath=//span/span",
        "Value": ""
      }
    ]
  }
  }

// One top-level folder per macro type, so the tree opens with the user's own
// macros at the root and the shipped material tucked away in folders whose
// names say what they are. (There used to be ONE root with "JS" and "Classic"
// sub-folders; the extra level was dropped so the demo categories sit directly
// below the root folder.)
// Note: the "AI Generated" folder is NOT preinstalled — the AI chat creates it
// on demand, at the root.
// Keep the folder names in sync with isUntouchedPreinstallDemo in
// services/ai/macro_agent/tools.ts (which recognizes demos by path) and
// getFolded in recomputed/index.ts (which starts these folders collapsed).
export const PREINSTALL_ROOT_FOLDER = 'Demo and QA Test Scripts'
export const PREINSTALL_CLASSIC_ROOT_FOLDER = 'Demo and QA Test Scripts (Classic)'

// All preinstalled table macros (incl. the LLM AI Commands demos). Installed
// only via the Settings restore button, never on install.
export const CLASSIC_PREINSTALL = Object.keys(preinstallMacros).reduce((acc, key) => {
  acc[`${PREINSTALL_CLASSIC_ROOT_FOLDER}/${key}`] = preinstallMacros[key]
  return acc
}, {})

// The JS script macros. Script macros keep the normal macro JSON envelope but
// carry the program in `Script` (Commands stays an empty array) — see
// fromJSONString.
// `path` mirrors the classic folder structure for the ported macros
// (Core/DemoAutofill.js next to the classic Core/DemoAutofill).
// Renamed/moved/retired demos need no bookkeeping here anymore: restore
// deletes the whole demo folder first and rewrites the shipped set, so
// stale copies at old paths cannot survive it (the MOVED_JS_PREINSTALL_PATHS
// list that used to chase every layout change by hand is gone).

export const JS_PREINSTALL = JS_DEMOS.reduce((acc, demo) => {
  acc[`${PREINSTALL_ROOT_FOLDER}/${demo.path || demo.fileName}`] = {
    CreationDate: '2026-07-24',
    Commands: [],
    Script: demo.code
  }
  return acc
}, {})

// A fresh install gets the JS set (plus the three root-level welcome macros)
// automatically — see tryPreinstall in src/index.js; the folder starts
// collapsed (getFolded in recomputed/index.ts). The classic set is NEVER
// auto-installed: it arrives only via the "Restore Demo Macros (Classic)"
// button under Settings > General, which writes it in its shipped state —
// see restoreDemoMacros in actions/index.js.
