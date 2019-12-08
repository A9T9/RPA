export default {
DemoAutofill: {
  "CreationDate": "2018-02-18",
  "Commands": [
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
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScPXRMtYI_KYL8J6fivHUV0hQKB7j1RtqTrBBUtEr8VMmyCqw/viewform",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=span.docssharedWizToggleLabeledLabelText.exportLabel.freebirdFormviewerViewItemsRadioLabel",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePaperradioEl.docssharedWizToggleLabeledControl.freebirdThemedRadio.freebirdThemedRadioDarkerDisabled.freebirdFormviewerViewItemsRadioControl",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePapercheckboxInnerBox.exportInnerBox",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[2]/div/label/div/div[1]/div[2]",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[3]/div/label/div/div[1]/div[2]",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=content.quantumWizMenuPaperselectContent.exportContent",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[3]/div[2]/div[2]/div[4]/content",
      "Value": ""
    },
    {
      "Command": "captureScreenshot",
      "Target": "AutoFill1stPage${!LOOP}",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "css=span.quantumWizButtonPaperbuttonLabel.exportLabel",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=entry.1572386418",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=entry.1572386418",
      "Value": "This is a single line test..."
    },
    {
      "Command": "click",
      "Target": "name=entry.1569542411",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=entry.1569542411",
      "Value": "...and this a multiline test:\nLine2\nLine3"
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
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div[1]/div[2]/div[2]",
      "Value": ""
    },
    {
      "Command": "captureScreenshot",
      "Target": "AutoFill3rdPage${!LOOP}",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "DemoAutofill macro completed (shown as notifcation because of #shownotification in the 3rd column)",
      "Value": "#shownotification"
    }
  ]
},
DemoCanvas:
{
  "CreationDate": "2018-6-26",
  "Commands":  [
     {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, 
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=LiterallyCanvas",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "First a simple clickAt demo (3 dots)",
      "Value": ""
    },
    {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "28,28"
    },
    {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "58,28"
    },
    {
      "Command": "clickAt",
      "Target": "//*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": "88,28"
    },
    {
      "Command": "comment",
      "Target": "Just image search the canvas!",
      "Value": "88,28"
    },
    {
      "Command": "visionLimitSearchArea",
      "Target": "element://*[@id=\"literally-canvas\"]/div[1]/div[1]/canvas[2]",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "canvas_3dots_verify_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=Mapbox",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Test: Embedded map (Mapbox)",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "id=demo",
      "Value": ""
    },
    {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "canvas_wyoming_dpi_96.png@0.60",
      "Value": ""
    },
    {
      "Command": "clickAt",
      "Target": "#efp",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Now verify that the click (= the map) works as expected",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "canvas_wyoming_verify_dpi_96.png@0.5",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Test Google Maps: Find & click Hyde park, and check that its info bubble shows.",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/canvas#maps",
      "Value": ""
    },

    {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "canvas_hydepark_dpi_96.png@0.70",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    },
    {
      "Command": "clickAt",
      "Target": "#efp",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Now verify that the click (= the map) works as expected",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "canvas_hydepark_verify_dpi_96.png@0.70",
      "Value": ""
    }	
  ]
},
DemoComputerVision: 
{
  "CreationDate": "2018-5-31",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://ocr.space/",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "OCR.space is our own OCR API service, this demo is a test that our QA uses internally, too :-)",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Verify the 3rd party \"Share\" banner shows",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "true",
      "Value": "!errorignore"
    },
    {
      "Command": "visualSearch",
      "Target": "democv_share.png@0.50",
      "Value": "matches"
    },
    {
      "Command": "if",
      "Target": "${matches} == 0",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Browser width too small for \"share\" banner to show",
      "Value": "blue"
    },
    {
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "false",
      "Value": "!errorignore"
    },
    {
      "Command": "type",
      "Target": "id=imageUrl",
      "Value": "https://a9t9.com/Content/Images/kantu-chrome-loop.png"
    },
    {
      "Command": "select",
      "Target": "id=ocrLanguage",
      "Value": "label=English"
    },
    {
      "Command": "comment",
      "Target": "viewport is default, but we add it here for test. Try \"full\" to see the differenc",
      "Value": "label=English"
    },
    {
      "Command": "visionLimitSearchArea",
      "Target": "viewport",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "we could use \"click link=Start OCR!\" but we use the image of the button instead",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "democv_startocr.png@0.60",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "#efp is short for \"#ElementFromPoint (${imageX},(${imageY})",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "#efp",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Wait for OCR to be completed",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "30",
      "Value": "!timeout_wait"
    },
    {
      "Command": "visualAssert",
      "Target": "democv_ocrdone.png",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    },
    {
      "Command": "click",
      "Target": "link=Show Overlay",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Visually verify that the overlay is correct",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "democv_checkoverlay.png@0.60",
      "Value": ""
    }
  ]
},
DemoDialogboxes: {
  "CreationDate": "2018-02-15",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "Start..."
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[1]",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Kantu IDE closes dialog boxes automatially. You need assertAlert (etc) only to verify expected texts.",
      "Value": ""
    },
    {
      "Command": "assertAlert",
      "Target": "Hello\\nHow are you?",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[2]",
      "Value": ""
    },
    {
      "Command": "assertConfirmation",
      "Target": "Press a button!",
      "Value": ""
    },
    {
      "Command": "answerOnNextPrompt",
      "Target": "I am Kantu for Chrome...",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[3]/button[3]",
      "Value": ""
    },
    {
      "Command": "assertPrompt",
      "Target": "Please enter your name",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "Done!"
    }
  ]
},
DemoDragDrop: {
  "CreationDate": "2017-10-18",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/demo/webtest/dragdrop/",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Reduce replay speed so we can better see what is going on...",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "medium",
      "Value": "!replayspeed"
    },	
    {
      "Command": "dragAndDropToObject",
      "Target": "id=one",
      "Value": "id=bin"
    },
    {
      "Command": "dragAndDropToObject",
      "Target": "id=two",
      "Value": "id=bin"
    },
    {
      "Command": "dragAndDropToObject",
      "Target": "id=three",
      "Value": "id=bin"
    },
    {
      "Command": "dragAndDropToObject",
      "Target": "id=four",
      "Value": "id=bin"
    },
    {
      "Command": "dragAndDropToObject",
      "Target": "id=five",
      "Value": "id=bin"
    }
  ]
},
DemoDownload: {
  "CreationDate": "2018-2-25",
  "Commands": [
    {
      "Command": "store",
      "Target": "200",
      "Value": "!timeout_download"
    },
    {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    },
    {
      "Command": "storeEval",
      "Target": "var d=new Date(); d.getFullYear() + '-' +((d.getMonth()+1))+'-' +d.getDate();",
      "Value": "todaydate"
    },
    {
      "Command": "echo",
      "Target": "Today is ${todaydate}",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/filedownload",
      "Value": ""
    },
    {
      "Command": "onDownload",
      "Target": "KantuTest1_${todaydate}.exe",
      "Value": "true"
    },
    {
      "Command": "store",
      "Target": "${!runtime}",
      "Value": "starttime"
    },
    {
      "Command": "click",
      "Target": "link=USA (East coast)*",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "parseFloat(\"${!runtime}\")-parseFloat(\"${starttime}\")",
      "Value": "downloadtime"
    },
    {
      "Command": "echo",
      "Target": "Download1 (USA) took ${downloadtime} seconds",
      "Value": "blue"
    },
    {
      "Command": "onDownload",
      "Target": "KantuTest2_${todaydate}.exe",
      "Value": "true"
    },
    {
      "Command": "store",
      "Target": "${!runtime}",
      "Value": "starttime"
    },
    {
      "Command": "click",
      "Target": "link=*Asia*",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "parseFloat(\"${!runtime}\")-parseFloat(\"${starttime}\")",
      "Value": "downloadtime"
    },
    {
      "Command": "echo",
      "Target": "Download2 (Asia) took ${downloadtime} seconds",
      "Value": "green"
    },
    {
      "Command": "echo",
      "Target": "All done...",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=OnDownload command",
      "Value": ""
    }
  ]
 }, 
DemoExtract: {
  "CreationDate": "2018-05-28",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
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
      "Command": "storeEval",
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
      "Command": "verifyValue",
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
      "Target": "UA-*,",
      "Value": "ga_option1"
    },
    {
      "Command": "sourceExtract",
      "Target": "regex=UA-[0-9]+-[0-9]+",
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
      "Command": "endif",
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
DemoFrames: {
  "CreationDate": "2017-10-16",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/demo/webtest/frames/",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Reduce replay speed so we can better see what is going on...",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "medium",
      "Value": "!replayspeed"
    },	
    {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=mytext1",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext1",
      "Value": "Frame1 (index=0)"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=1",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=mytext2",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext2",
      "Value": "Frame2 (index=1)"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=mytext3",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "Frame3 (index=2)"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=3",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=mytext4",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext4",
      "Value": "Frame4 (index=3)"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=4",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "name=mytext5",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext5",
      "Value": "Frame5 (index=4)"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "now testing iframe inside this frame"
    },
    {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[1]/div[2]/div/content/div/div/label/div/div[1]/div[3]/div",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": "iframe in frame: works!"
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=2",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=mytext3",
      "Value": "Test completed!"
    }
  ]
},

DemoTakeScreenshots: {
  "CreationDate": "2018-1-25",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/blog/",
      "Value": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "a9t9blog",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=read more@POS=1",
      "Value": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "article1",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/blog/",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=read more@POS=2",
      "Value": ""
    },
    {
      "Command": "captureEntirePageScreenshot",
      "Target": "article2",
      "Value": ""
    },
    {
      "Command": "captureScreenshot",
      "Target": "article2_just_viewport",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "take screenshot of an _element_ with storeImage",
      "Value": ""
    },
    {
      "Command": "storeImage",
      "Target": "link=The Autonomous Technology (A9T9) Blog",
      "Value": "blogtitle"
    }	
  ]
},
DemoIfElse: {
  "CreationDate": "2018-4-28",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "How to use gotoIf and label(s) for flow control. For a while/endWhile demo, see the DemoSaveCSV macro.",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "(new Date().getHours())",
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
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "true",
      "Value": "!errorignore"
    },
    {
      "Command": "storeAttribute",
      "Target": "//input[@id='sometext-WRONG-ID-TEST']@size",
      "Value": "boxsize"
    },
    {
      "Command": "if",
      "Target": "${!LastCommandOK}",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Boxsize is ${boxsize}",
      "Value": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "storeAttribute",
      "Target": "//input[@id='sometext']@size",
      "Value": "boxsize"
    },
    {
      "Command": "echo",
      "Target": "Old ID not found, with new ID we have: Boxsize = ${boxsize}",
      "Value": ""
    },
    {
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "false",
      "Value": "!errorignore"
    },
    {
      "Command": "echo",
      "Target": "input box size =${boxsize}",
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
      "Command": "storeEval",
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
      "Command": "storeEval",
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
DemoIframe:{
  "CreationDate": "2018-4-28",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/iframes",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/p[1]",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "First iframe: Embedded Google Doc",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=0",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[1]/div[2]/div/content/div/div/label/div/div[1]/div[3]/div",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "css=input.quantumWizTextinputSimpleinputInput.exportInput",
      "Value": "hello iframe"
    },
    {
      "Command": "click",
      "Target": "css=div.quantumWizTogglePapercheckboxInnerBox.exportInnerBox",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[2]/div/label/div/div[1]/div[2]",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[2]/div[2]/div[2]/div[3]/div/label/div/div[1]/div[2]",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Second iframe: Embedded Youtube Video",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "index=1",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "css=button.ytp-large-play-button.ytp-button",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "relative=top",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Third iframe: Embedded Twitter + click links that open new tabs, then switch to them",
      "Value": ""
    },
    {
      "Command": "selectFrame",
      "Target": "id=twitter-widget-0",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "link=@A9T9_com",
      "Value": ""
    },
    {
      "Command": "pause",
      "Target": "2000",
      "Value": ""
    },
    {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "link=a9t9.com",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Wait for tab to open",
      "Value": ""
    },
    {
      "Command": "pause",
      "Target": "2000",
      "Value": ""
    },
    {
      "Command": "selectWindow",
      "Target": "tab=2",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=Kantu Sel. IDE - Docs",
      "Value": ""
    }
  ]
},
DemoImplicitWaiting: {
  "CreationDate": "2018-4-28",
  "Commands": [
    {
      "Command": "comment",
      "Target": "WaitForVisible is not part of implicit waiting",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/waitforvisible",
      "Value": ""
    },
    {
      "Command": "waitForVisible",
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
      "Command": "waitForVisible",
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
      "Target": "https://a9t9.com/demo/webtest/implicitwaiting/",
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
      "Target": "The next element (target) is not available yet... Kantu waits for it up to ${!TIMEOUT_WAIT} seconds to appear.",
      "Value": "blue"
    },
    {
      "Command": "click",
      "Target": "/html/body/header/center/img",
      "Value": ""
    }
  ]	
},
DemoCsvReadWithLoop: {
  "CreationDate": "2017-11-23",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },  
    {
      "Command": "comment",
      "Target": "The file ReadCSVTestData.csv is pre-installed with Kantu.",
      "Value": ""
    },
    {
      "Command": "csvRead",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=entry.933434489",
      "Value": "${!COL1}"
    },
    {
      "Command": "type",
      "Target": "name=entry.2004105717",
      "Value": "${!COL2}"
    },
    {
      "Command": "type",
      "Target": "name=entry.1382578664",
      "Value": "${!COL3}"
    },
    {
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div/div/content/span",
      "Value": ""
    }
  ]
},
DemoCsvReadWithWhile: {
  "CreationDate": "2018-1-25",
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
      "Target": "The file ReadCSVTestData.csv is pre-installed with Kantu.",
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
      "Target": "\"${!csvReadStatus}\" == \"OK\"",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "status = ${!csvReadStatus}, line = ${!csvReadLineNumber}",
      "Value": ""
    },
    {
      "Command": "open",
      "Target": "https://docs.google.com/forms/d/e/1FAIpQLScGWVjexH2FNzJqPACzuzBLlTWMJHgLUHjxehtU-2cJxtu6VQ/viewform",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "name=entry.933434489",
      "Value": "${!COL1}_${!csvReadLineNumber}"
    },
    {
      "Command": "type",
      "Target": "name=entry.2004105717",
      "Value": "${!COL2}"
    },
    {
      "Command": "type",
      "Target": "name=entry.1382578664",
      "Value": "${!COL3}"
    },
    {
      "Command": "clickAndWait",
      "Target": "//*[@id=\"mG61Hd\"]/div/div[2]/div[3]/div[1]/div/div/content/span",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "${!csvReadLineNumber}+1",
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
      "Command": "endWhile",
      "Target": "",
      "Value": ""
    }
  ]
}, 
DemoCsvSave: {
  "CreationDate": "2018-06-01",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },  
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/csvsave",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "new Date().getFullYear()+\"-\"+(new Date().getMonth()+1)+\"-\"+new Date().getDate()+\" \"+ new Date().getHours()+\":\" + new Date().getMinutes() + \":\" + new Date().getSeconds()",
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
      "Command": "storeEval",
      "Target": "${i}+1",
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
      "Command": "endWhile",
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
DemoStoreEval:  {
  "CreationDate": "2018-4-28",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    },
    {
      "Command": "assertText",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": "Input box to display some results"
    },
    {
      "Command": "verifyText",
      "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
      "Value": "Input box to display some results"
    },
    {
      "Command": "verifyTitle",
      "Target": "Selenium IDE store, storeEval, Demo Page",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "Selenium IDE store, storeEval, Demo Page",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "storeEVAL can run Javascript... and store the result in a variable (optional)",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "document.title = \"123\";",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "123",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Use sourceSearch to assert we have the right Google Analytics Code",
      "Value": ""
    },
    {
      "Command": "sourceSearch",
      "Target": "UA-86195842-1",
      "Value": "matches"
    },
    {
      "Command": "if",
      "Target": "${matches} == 0",
      "Value": ""
    },
    {
      "Command": "throwError",
      "Target": "Google Analytics ID is wrong!",
      "Value": ""
    },
    {
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "First some basic calculations with STORE",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "15",
      "Value": "AAA"
    },
    {
      "Command": "store",
      "Target": "10",
      "Value": "BBB"
    },
    {
      "Command": "storeEval",
      "Target": "storedVars['AAA']-storedVars['BBB']",
      "Value": "CCC"
    },
    {
      "Command": "echo",
      "Target": "${CCC}",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "document.title = \"${CCC}\";",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "5",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "storedVars gives access to VARIABLE, ${...} to VALUE",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "SELenium IDe",
      "Value": "AAA"
    },
    {
      "Command": "storeEval",
      "Target": "storedVars['AAA'].toUpperCase()",
      "Value": "CCC"
    },
    {
      "Command": "echo",
      "Target": "${CCC}",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "${CCC}"
    },
    {
      "Command": "echo",
      "Target": "Generate TODAYs date in in YYYY-MM-DD format ",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "var d= new Date(); var m=((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1); d.getFullYear()+\"-\"+m+\"-\"+d.getDate();",
      "Value": "mydate"
    },
    {
      "Command": "echo",
      "Target": "Today is ${mydate}",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Pick a random item from a list, useful for data-driven testing",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "new Array ('cat','dog','fish','dog','??','frog','?','dog','??','horse','??elephant')",
      "Value": "names"
    },
    {
      "Command": "storeEval",
      "Target": "storedVars['names'].length",
      "Value": "length"
    },
    {
      "Command": "echo",
      "Target": "array length = ${length}",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "Math.floor(Math.random()*storedVars['length'])",
      "Value": "num"
    },
    {
      "Command": "echo",
      "Target": "num=${num}",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "The next command picks the random item",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "storedVars['names'][${num}]",
      "Value": "myrandomname"
    },
    {
      "Command": "store",
      "Target": "Today is ${mydate}, and we draw a ${myrandomname}",
      "Value": "output"
    },
    {
      "Command": "echo",
      "Target": "To is ${mydate}, and we draw a ${myrandomname}",
      "Value": "${output}"
    },
    {
      "Command": "type",
      "Target": "id=sometext",
      "Value": "${output}"
    },
    {
      "Command": "if",
      "Target": "parseFloat(\"${!runtime}\") > 15",
      "Value": ""
    },
    {
      "Command": "throwError",
      "Target": "Runtime too slow, test failed",
      "Value": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Runtime Ok, test passed!",
      "Value": "green"
    },
    {
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "With @POS you click on the (in this case) 3rd link with the same name. Great for looping over a list of links with the same name.",
      "Value": "green"
    },
    {
      "Command": "clickAndWait",
      "Target": "link=This link@POS=3",
      "Value": ""
    }
  ]
},
DemoTabs: {
  "CreationDate": "2017-10-15",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/tabs",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "link=Open new web page in new browser tab",
      "Value": ""
    },
    {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "*1* TAB1",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext1",
      "Value": "this is tab 1"
    },
    {
      "Command": "click",
      "Target": "link=Open yet another web page in a new browser tab",
      "Value": ""
    },
    {
      "Command": "selectWindow",
      "Target": "tab=2",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "*2* TAB2",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext2",
      "Value": "And this is tab 2!"
    },
    {
      "Command": "selectWindow",
      "Target": "tab=1",
      "Value": ""
    },
    {
      "Command": "assertTitle",
      "Target": "*1* TAB1",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=sometext1",
      "Value": "Now back in tab 1 - test done!"
    },
    {
      "Command": "comment",
      "Target": "We can also open new tabs",
      "Value": ""
    },
    {
      "Command": "selectWindow",
      "Target": "tab=open",
      "Value": "https://a9t9.com"
    },
    {
      "Command": "selectWindow",
      "Target": "tab=open",
      "Value": "https://ocr.space"
    },
    {
      "Command": "type",
      "Target": "id=imageUrl",
      "Value": "Kantu Tab Test done"
    }
  ]
},
DemoVisualUITest:
{
  "CreationDate": "2018-6-26",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/",
      "Value": ""
    },
    {
      "Command": "resize",
      "Target": "1024@768",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "uitest_logo_wide_dpi_96.png@0.70",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "uitest_download_dpi_96.png@0.70",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "uitest_share_dpi_96.png@0.70",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Resize to iPhone6 screen size",
      "Value": ""
    },
    {
      "Command": "resize",
      "Target": "375@768",
      "Value": ""
    },
    {
      "Command": "visualVerify",
      "Target": "uitest_logo_mobile_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Missing menu is critical, so we use ASSERT (instead of just VERIFY)",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "uitest_hamburger_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Check that Share buttons do not show",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "At this point, page is surely loaded => reduce wait for (normally missing) image",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "2",
      "Value": "!timeout_wait"
    },
    {
      "Command": "visualSearch",
      "Target": "uitest_share_dpi_96.png@0.70",
      "Value": "count"
    },
    {
      "Command": "if",
      "Target": "${count} > 0",
      "Value": ""
    },
    {
      "Command": "throwError",
      "Target": "Share buttons should NOT show on mobile phones",
      "Value": ""
    },
    {
      "Command": "endif",
      "Target": "",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Restore default wait (not really needed here, since macro stops now anyway)",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "10",
      "Value": "!timeout_wait"
    },
    {
      "Command": "comment",
      "Target": "Done, enlarge browser again",
      "Value": ""
    },
    {
      "Command": "resize",
      "Target": "1024@768",
      "Value": ""
    }
  ]
},	
	
	
DemoXType:	
{
  "CreationDate": "2018-10-24",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    }, 
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/xtype",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Send CTRL+S to open the browser save dialog",
      "Value": ""
    },
    {
      "Command": "XType",
      "Target": "${KEY_CTRL+KEY_S}",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Generate today's date and time ",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "var d= new Date(); var m=((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1); d.getFullYear()+\"-\"+m+\"-\"+d.getDate();",
      "Value": "mydate"
    },
    {
      "Command": "storeEval",
      "Target": "new Date().getHours()+\"-\" + new Date().getMinutes() + \"-\" + new Date().getSeconds()",
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
      "Target": "Page_saved_by_Kantu_${mydate}_${mytime}${KEY_ENTER}",
      "Value": ""
    }
  ]
},
DemoXClick:	  
{
  "CreationDate": "2018-10-24",
  "Commands": [
    {
      "Command": "store",
      "Target": "fast",
      "Value": "!replayspeed"
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/draw",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=Kantu will click this link",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Kantu controls the mouse cursor now",
      "Value": "#shownotification"
    },
    {
      "Command": "comment",
      "Target": "Use image search to find the drawing applet",
      "Value": ""
    },
    {
      "Command": "XClick",
      "Target": "draw_box_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "x=${!imagex} y=${!imagey}",
      "Value": "green"
    },
    {
      "Command": "XClick",
      "Target": "${!imagex},${!imagey}",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "${!imagex}",
      "Value": "x"
    },
    {
      "Command": "store",
      "Target": "${!imagey}",
      "Value": "y"
    },
    {
      "Command": "comment",
      "Target": "Draw top line --->",
      "Value": ""
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    },
    {
      "Command": "storeEval",
      "Target": "${x}+50",
      "Value": "x"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    },
    {
      "Command": "comment",
      "Target": "Draw right line down",
      "Value": ""
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    },
    {
      "Command": "storeEval",
      "Target": "${y}+50",
      "Value": "y"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    },
    {
      "Command": "comment",
      "Target": "Draw bottom line <---",
      "Value": ""
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    },
    {
      "Command": "storeEval",
      "Target": "${x}-50",
      "Value": "x"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    },
    {
      "Command": "comment",
      "Target": "Draw left line up",
      "Value": ""
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#down"
    },
    {
      "Command": "storeEval",
      "Target": "${y}-50",
      "Value": "y"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#move"
    },
    {
      "Command": "XMove",
      "Target": "${x},${y}",
      "Value": "#up"
    },
    {
      "Command": "comment",
      "Target": "Check that the square was drawn ok",
      "Value": ""
    },
    {
      "Command": "visualAssert",
      "Target": "draw_square_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Now type some text. First click the TEXT icon",
      "Value": ""
    },
    {
      "Command": "XClick",
      "Target": "draw_texticon_dpi_96.png",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Now click the place where the text should start (80px below the square)",
      "Value": ""
    },
    {
      "Command": "storeEval",
      "Target": "${y}+80",
      "Value": "y"
    },
    {
      "Command": "echo",
      "Target": "x=${x}, y=${y}",
      "Value": "blue"
    },
    {
      "Command": "XClick",
      "Target": "${x},${y}",
      "Value": ""
    },
    {
      "Command": "comment",
      "Target": "Send keystrokes, and demo the use of the BACKSPACE special key.",
      "Value": ""
    },
    {
      "Command": "XType",
      "Target": "Kantuuu${KEY_BACKSPACE}${KEY_BACKSPACE} can draw and write.",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "DemoXClick completed",
      "Value": "#shownotification"
    }
  ]
}   
}	
