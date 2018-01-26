export default {
DemoAutofill: {
  "CreationDate": "2017-10-18",
  "Commands": [
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
    }
  ]
},
DemoDialogboxes: {
  "CreationDate": "2017-10-15",
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
DemoExtract: {
  "CreationDate": "2017-10-18",
  "Commands": [
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
      "Command": "echo",
      "Target": "Last but not least, taking a screenshot is another way to extract data",
      "Value": ""
    },
    {
      "Command": "captureScreenshot",
      "Target": "myscreenshot-${mytitle}",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "Tip: To save extracted data to CSV files use the csvSave command. See the DemoCsvSave macro for details.",
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
      "Target": "a9t9 blog",
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
      "Target": "article2-just-viewport",
      "Value": ""
    }	
  ]
},
DemoIfElse: {
  "CreationDate": "2018-01-12",
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
    }
  ]
},
DemoIframe:{
  "CreationDate": "2017-10-16",
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
      "Command": "selectFrame",
      "Target": "id=twitter-widget-0",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "/html/body/div/div[2]/div[2]/ol/li[2]/div/div[2]/div/a/span[1]/img",
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
      "Command": "selectWindow",
      "Target": "tab=2",
      "Value": ""
    }
  ]
},
DemoImplicitWaiting: {
  "CreationDate": "2017-10-15",
  "Commands": [
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
      "Target": "The next element (target) is not available yet... Kantu waits for it up to ${!TIMEOUT_STEP} seconds to appear.",
      "Value": ""
    },
    {
      "Command": "click",
      "Target": "/html/body/header/center/img",
      "Value": ""
    }
  ]
},
 DemoPOS: {
  "CreationDate": "2017-10-15",
  "Commands": [
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/storeeval",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "With @POS you click on the (in this case) 3rd link with the same name. Great for use with ${!loop}",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=This link@POS=3",
      "Value": ""
    },
    {
      "Command": "clickAndWait",
      "Target": "link=Selenium IDE commands@POS=2",
      "Value": ""
    }
  ]
},
DemoCsvReadWithLoop: {
  "CreationDate": "2017-11-23",
  "Commands": [
    {
      "Command": "gotoIf",
      "Target": "{${!LOOP} > 1}",
      "Value": "TESTSTART"
    },
    {
      "Command": "echo",
      "Target": "First create some test data CSV file (3 lines)",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Donald",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Knuth",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "team@a9t9.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "Ashu",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Zarathushtra",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Zarathushtra2018@gmail.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "Yasna",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Haptanghaiti",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Happy123456@unknownstartup.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "--- Read CSV Test starts here ---",
      "Value": ""
    },
    {
      "Command": "label",
      "Target": "TESTSTART",
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
      "Command": "echo",
      "Target": "First create some test data CSV file (3 lines)",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Donald",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Knuth",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "team@a9t9.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "Ashu",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Zarathushtra",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Zarathushtra2018@gmail.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "store",
      "Target": "Yasna",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Haptanghaiti",
      "Value": "!csvLine"
    },
    {
      "Command": "store",
      "Target": "Happy123456@unknownstartup.com",
      "Value": "!csvLine"
    },
    {
      "Command": "csvSave",
      "Target": "ReadCSVTestData.csv",
      "Value": ""
    },
    {
      "Command": "echo",
      "Target": "--- Read CSV Test starts here ---",
      "Value": ""
    },
    {
      "Command": "label",
      "Target": "TESTSTART",
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
  "CreationDate": "2017-11-23",
  "Commands": [
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
      "Command": "csvSave",
      "Target": "CurrencyConverterData",
      "Value": ""
    }
  ]
},
DemoStoreEval:  {
  "CreationDate": "2018-1-25",
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
    }
  ]
},
DemoTimeout: {
  "CreationDate": "2017-10-18",
  "Commands": [
    {
      "Command": "store",
      "Target": "35",
      "Value": "!TIMEOUT_PAGELOAD"
    },
    {
      "Command": "open",
      "Target": "https://a9t9.com/kantu/demo/pageloadtimeout",
      "Value": ""
    },
    {
      "Command": "type",
      "Target": "id=mce-EMAIL",
      "Value": "Page loaded completely... test done."
    }
  ]
}
}
