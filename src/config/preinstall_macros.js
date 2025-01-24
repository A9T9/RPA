export default {
  "AI(Beta)/CU_PlayTicTacToe": {
    "CreationDate": "2024-12-02",
    "Commands":  [
    {
      "Command": "XDesktopAutomation",
      "Target": "false",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This demo macro uses an external website which is not affiliated with Ui.Vision.",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "bringBrowserToForeground",
      "Target": "true",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "open",
      "Target": "https://www.gamepix.com/play/tic-tac-toe-html5",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "aiComputerUse",
      "Target": "You are playing a game of tic tac toe against the computer.\n\nYou are Player 1. \n\nIf you win, end with message 'GAMEWIN'. \n\nIf you lose, end with 'GAMELOST'. \n\nIf the game draws, end with 'GAMEDRAW'. \n\nIf you encounter invalid game state or cannot make a move, end with 'ERROR'. \n\nTool use instructions:  Do not use mouse move commands, only click commands.",
      "Value": "s",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Computer Use Result = ${s}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${s}.lastIndexOf(\"GAMEWIN\") >= 0",
      "Value": "",
      "Description": "Search for substring in string: The return value of .lastIndexOf() is -1 if the substring is not found in the string at all."
    },
    {
      "Command": "echo",
      "Target": "We won !!! :)",
      "Value": "#shownotification",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"GAMELOST\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "We lost",
      "Value": "cyan",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"GAMEDRAW\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "A draw",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"ERROR\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "An error happened",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This state should never happen. String should contain one of the keywords.",
      "Value": "orange",
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
    "AI(Beta)/CU_UseWebCalculator": {
    "CreationDate": "2024-12-02",
    "Commands":  [
    {
      "Command": "XDesktopAutomation",
      "Target": "false",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This demo macro uses an external website which is not affiliated with Ui.Vision.",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "bringBrowserToForeground",
      "Target": "true",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "open",
      "Target": "https://www.theonlinecalculator.com/",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "aiComputerUse",
      "Target": "Use the calculator to compute 8 + 9 by clicking the buttons.\nVerify the result. \n\nEnd with SUCCESS, or ERROR if problems occur. \n\n",
      "Value": "s",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Computer Use Result = ${s}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${s}.lastIndexOf(\"SUCCESS\") >= 0",
      "Value": "",
      "Description": "Search for substring in string: The return value of .lastIndexOf() is -1 if the substring is not found in the string at all."
    },
    {
      "Command": "echo",
      "Target": "All worked fine",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"ERROR\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "An error happened",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This state should never happen. String should contain one of the key words.",
      "Value": "orange",
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
    "AI(Beta)/CU_FillForm": {
    "CreationDate": "2024-12-02",
    "Commands":  [
    {
      "Command": "XDesktopAutomation",
      "Target": "false",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "open",
      "Target": "https://ui.vision/contact",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "bringBrowserToForeground",
      "Target": "true",
      "Value": "s",
      "Description": ""
    },
    {
      "Command": "aiComputerUse",
      "Target": "Fill out this web form with artificial data and submit it. \n\nTwo fields have specific content: \n\nFor Topic, select 'General Inquiry' from the dropdown (press 'G' when dropdown is open and then ENTER). \n\nFor the Subject use 'Test. Ignore this message. Filter me out'. \n\nFill the Message input box before the Subjext box.\n\nIf successful, end with 'SUCCESS'. \nIf you encounter any errors, end with 'ERROR'. \n\nTool use instructions:  \n\nSaves time: Skip the mouse_move before doing left_click\n\nAfter scrolling, take a fresh screenshot\n",
      "Value": "s",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Computer Use Result = ${s}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${s}.lastIndexOf(\"SUCCESS\") >= 0",
      "Value": "",
      "Description": "Search for substring in string: The return value of .lastIndexOf() is -1 if the substring is not found in the string at all."
    },
    {
      "Command": "echo",
      "Target": "All worked fine",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"ERROR\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "An error happened",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This state should never happen. The final LLM output should contain one of the keywords.",
      "Value": "orange",
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
    "AI(Beta)/CU_PressClear_Desktop": {
    "CreationDate": "2024-12-03",
    "Commands":  [
    {
      "Command": "XDesktopAutomation",
      "Target": "true",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "aiComputerUse",
      "Target": "Automate the Ui.Vision IDE. \n\nFind and press the Clear button. \n\nTo save time, do not use mouse move. Only do CLICK.\n\nTry only once. It is successful, if log tab is less than half full by the time you take a screenshot.\n\nEnd with SUCCESS, or ERROR if problems occur.",
      "Value": "s",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "Computer Use Result = ${s}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "if",
      "Target": "${s}.lastIndexOf(\"SUCCESS\") >= 0",
      "Value": "",
      "Description": "Parse the LLM output for SUCCESS substring"
    },
    {
      "Command": "echo",
      "Target": "All worked fine",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "elseif",
      "Target": "${s}.lastIndexOf(\"ERROR\") >= 0",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "An error happened",
      "Value": "brown",
      "Description": ""
    },
    {
      "Command": "else",
      "Target": "",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "echo",
      "Target": "This state should not happen. String should contain one of the keywords.",
      "Value": "orange",
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
  
  "AI(Beta)/Prompt_CompareImages": {
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
   "AI(Beta)/Prompt_ParseHTML": {
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
  "AI(Beta)/ScreenXY_SearchForum": {
    "CreationDate": "2024-11-22",
    "Commands":  [
    {
      "Command": "open",
      "Target": "https://forum.ui.vision/",
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
      "Description": "Click search icon"
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
  "AI(Beta)/ScreenXY_PressClear_Desktop": {
    "CreationDate": "2024-11-22",
    "Commands":  [
    {
      "Command": "XDesktopAutomation",
      "Target": "true",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "aiScreenXY",
      "Target": "Look for the Ui.Vision IDE. In it, find the Logs tab.",
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
      "Target": "Screen-scaling adjusted X,Y coordinates: ${!ai1},${!ai2}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "XClick",
      "Target": "${!ai1},${!ai2}",
      "Value": "",
      "Description": "Click on Logs tab. Goal is to select it if it is not selected. Then the Clear button appears. We need this button for the next step."
    },
    {
      "Command": "echo",
      "Target": "Logs tab selected",
      "Value": "green",
      "Description": ""
    },
    {
      "Command": "aiScreenXY",
      "Target": "Look for the Ui.Vision IDE. In it, find the Clear button",
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
      "Target": "Screen-scaling adjusted X,Y coordinates: ${!ai1},${!ai2}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "XClick",
      "Target": "${!ai1},${!ai2}",
      "Value": "",
      "Description": "Click the Clear button."
    },
    {
      "Command": "echo",
      "Target": "Clear button pressed at X,Y: ${!ai1},${!ai2}",
      "Value": "green",
      "Description": ""
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
        "Target": "//span[contains(text(),\"UI.Vision IDE\")]",
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
        "Command": "clickAndWait",
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
        "Command": "clickAndWait",
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
  "Core/DemoDragDrop": {
    "CreationDate": "2017-10-18",
    "Commands": [
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/webtest/dragdrop/",
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
        "Command": "clickAndWait",
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
        "Target": "//span[contains(text(),\"UI.Vision IDE\")]",
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
        "Command": "clickAndWait",
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
      "Command": "clickAndWait",
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
      "Command": "clickAndWait",
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
        "Target": "//span[contains(text(),\"UI.Vision IDE\")]",
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
        "Command": "clickAndWait",
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
   "XModules/DemoXClickTextRelative": 
  {
    "CreationDate": "2024-06-08",
    "Commands":  [
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
      "Command": "clickAndWait",
      "Target": "linkText=calculator",
      "Value": "",
      "Description": "The calculator website is NOT affiliated with Ui.Vision."
    },
    {
      "Command": "pause",
      "Target": "1000",
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
      "Command": "XClickTextRelative",
      "Target": "mc#R8,-14",
      "Value": "",
      "Description": "Click 8. Anchor button has the text \"mc\""
    },
    {
      "Command": "XClickTextRelative",
      "Target": "mc#R30,-14",
      "Value": "",
      "Description": "times"
    },
    {
      "Command": "XClickTextRelative",
      "Target": "mc#R8,-14",
      "Value": "",
      "Description": "Click 8"
    },
    {
      "Command": "XClick",
      "Target": "${!ocrX},${!ocrY}",
      "Value": "",
      "Description": "Repeat click on last found xclick position (here: press 8 again)"
    },
    {
      "Command": "XClick",
      "Target": "${!ocrX},${!ocrY}",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "XClick",
      "Target": "${!ocrX},${!ocrY}",
      "Value": "",
      "Description": ""
    },
    {
      "Command": "XClickTextRelative",
      "Target": "mc#R30,-41",
      "Value": "",
      "Description": "= sign "
    },
    {
      "Command": "store",
      "Target": "99",
      "Value": "!ocrengine",
      "Description": "Switch to XModule OCR. It is better with numbers."
    },
    {
      "Command": "OCRExtractbyTextRelative",
      "Target": "mc#R22,16H12W21",
      "Value": "s",
      "Description": "Get text (numbers) from calculator display"
    },
    {
      "Command": "echo",
      "Target": "Extracted string (Calculator result) is \"${s}\"",
      "Value": "blue",
      "Description": "String maybe still contains line breaks like /r/n from the OCR"
    },
    {
      "Command": "executeScript_Sandbox",
      "Target": "var inputString=${s};\nvar numericString = '';\nfor (var i = 0; i < inputString.length; i++) {\n    var char = inputString.charAt(i);\n    if (char >= '0' && char <= '9') {\n        numericString += char;\n    }\n}\nreturn numericString;",
      "Value": "i",
      "Description": "Remove all non numeric chars. Use method without regular expressions for string replacement, so it works in Firefox, too."
    },
    {
      "Command": "if",
      "Target": "${i} == 71104",
      "Value": "",
      "Description": "8 x 888 = 7104"
    },
    {
      "Command": "echo",
      "Target": "8 x 8888 is ${i}, Calculator works!",
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
      "Command": "echo",
      "Target": "Wrong result: i = ${i}",
      "Value": "blue",
      "Description": ""
    },
    {
      "Command": "throwError",
      "Target": "Calculator result is wrong",
      "Value": "",
      "Description": "Trigger an error if the value is not correct. (Useful for automated testing)"
    },
    {
      "Command": "end",
      "Target": "",
      "Value": "",
      "Description": ""
    }
  ]
  },
  "Core/DemoExecuteScript":  {
    "CreationDate": "2024-2-1",
    "Commands": [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
        "Description": ""
      },
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/executescript",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertText",
        "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
        "Value": "Input box to display some results",
        "Description": ""
      },
      {
        "Command": "verifyText",
        "Target": "//*[@id=\"content\"]/div[2]/div/h2[1]",
        "Value": "Input box to display some results",
        "Description": ""
      },
      {
        "Command": "verifyTitle",
        "Target": "Selenium IDE executeScript Demo Page",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertTitle",
        "Target": "Selenium IDE executeScript Demo Page",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript",
        "Target": "function randomString(length, chars) {\n    var result = '';\n    for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];\n    return result;\n}\n\n//The executeScript script(s) can have multiple lines!\n\n//Demo: Here we generate a random key \nvar s = randomString(8, '0123456789ABCDE') + \"<= Random String\";\n\n//Set the page title to the random key \ndocument.title = s;\n\nreturn s;\n",
        "Value": "s",
        "Description": "executeScript can run Javascript... and store the result in a variable (optional)"
      },
      {
        "Command": "assertTitle",
        "Target": "${s}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Use sourceSearch to assert we have the right Google Analytics Code",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "sourceSearch",
        "Target": "G-VJNCDYRXBP",
        "Value": "matches",
        "Description": ""
      },
      {
        "Command": "if",
        "Target": "${matches} == 0",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "throwError",
        "Target": "Google Analytics ID is wrong!",
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
        "Command": "echo",
        "Target": "First some basic calculations with STORE",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "15",
        "Value": "AAA",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "10",
        "Value": "BBB",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return (Number (${AAA}) - Number (${BBB}) )",
        "Value": "CCC",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "${CCC}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript",
        "Target": "document.title = ${CCC};",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertTitle",
        "Target": "5",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "SELenium IDe",
        "Value": "AAA",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${AAA}.toUpperCase()",
        "Value": "CCC",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "${CCC}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "${CCC}",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Generate TODAYs date in in YYYY-MM-DD format ",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Create today's date in the YYYY-MM-DD format",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "var d = new Date(); \nvar m = ((d.getMonth()+1)<10)?'0'+(d.getMonth()+1):(d.getMonth()+1);\nvar d2 = (d.getDate() <10)?'0'+d.getDate():d.getDate(); \nvar date_today = d.getFullYear()+\"-\"+m+\"-\"+d2; \nreturn date_today",
        "Value": "mydate",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Today is ${mydate}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "Pick a random item from a list, useful for data-driven testing",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return new Array ('cat','dog','fish','dog','deer','frog','whale','dog','seal','horse','elephant')",
        "Value": "names",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${names}.length",
        "Value": "len",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "array length = ${len}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return Math.floor(Math.random()*${len})",
        "Value": "num",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "num=${num}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "The next command picks the random item",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${names}[${num}]",
        "Value": "myrandomname",
        "Description": ""
      },
      {
        "Command": "store",
        "Target": "Today is ${mydate}, and we draw a ${myrandomname}",
        "Value": "output",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "To is ${mydate}, and we draw a ${myrandomname}",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext",
        "Value": "${output}",
        "Description": ""
      },
      {
        "Command": "if",
        "Target": "parseFloat(${!runtime}) > 20",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "throwError",
        "Target": "Runtime too slow (${!runtime} seconds), test failed",
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
        "Command": "echo",
        "Target": "Runtime Ok, test passed!",
        "Value": "green",
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
        "Target": "With @POS you click on the (in this case) 3rd link with the same name. Great for looping over a list of links with the same name.",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "clickAndWait",
        "Target": "linkText=This link@POS=3",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "Demo: Create array and then loop over it with forEach",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "executeScript",
        "Target": "var arr = [\"Hello\",\"World\", \"2020\"]; \nreturn arr;",
        "Value": "myarray",
        "Description": "We must use executeScript here, since executeScript _Sandbox does not support returning arrays."
      },
      {
        "Command": "forEach",
        "Target": "myarray",
        "Value": "elem",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "${elem}",
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
  "Core/DemoTabs": {
     "CreationDate": "2022-11-11",
    "Commands": [
      {
        "Command": "open",
        "Target": "https://ui.vision/demo/tabs",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "linkText=Open new web page in new browser tab",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertTitle",
        "Target": "*1* TAB1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "TabIndexAbsolute=${!current_tab_number} TabIndexRELATIVE=${!current_tab_number_relative}",
        "Value": "blue",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext1",
        "Value": "this is tab 1",
        "Description": ""
      },
      {
        "Command": "click",
        "Target": "linkText=Open yet another web page in a new browser tab",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertTitle",
        "Target": "*2* TAB2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext2",
        "Value": "And this is tab 2!",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "assertTitle",
        "Target": "*1* TAB1",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=sometext1",
        "Value": "Now back in tab 1 - test done!",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=close",
        "Value": "",
        "Description": "Close the current tab (tab1)"
      },
      {
        "Command": "assertTitle",
        "Target": "*2* TAB2",
        "Value": "",
        "Description": "What was tab2 is now the tab with the relative ID=1 (since the old tab1 is closed)"
      },
      {
        "Command": "selectWindow",
        "Target": "tab=1",
        "Value": "",
        "Description": "Now switching to the NEW tab1 means being on what was formerly tab2. It is the tab we are already on."
      },
      {
        "Command": "assertTitle",
        "Target": "*2* TAB2",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "We can also open new tabs",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "TabIndexAbsolute=${!current_tab_number} TabIndexRELATIVE=${!current_tab_number_relative}",
        "Value": "green",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=open",
        "Value": "https://ui.vision",
        "Description": ""
      },
      {
        "Command": "selectWindow",
        "Target": "tab=open",
        "Value": "https://ocr.space",
        "Description": ""
      },
      {
        "Command": "type",
        "Target": "id=imageUrl",
        "Value": "Ui.Vision Tab Test done",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "TabIndexAbsolute=${!current_tab_number} TabIndexRELATIVE=${!current_tab_number_relative}",
        "Value": "brown",
        "Description": ""
      },
      {
        "Command": "assert",
        "Target": "!current_tab_number_relative",
        "Value": "3",
        "Description": ""
      }
    ]
  },
  "XModules/DemoVisualUITest":
  {
    "CreationDate": "2022-2-21",
    "Commands":  [
      {
        "Command": "open",
        "Target": "https://ui.vision/",
        "Value": ""
      },
      {
        "Command": "setWindowSize",
        "Target": "1024x768",
        "Value": ""
      },
      {
        "Command": "visualVerify",
        "Target": "uitest_logo_wide_dpi_96.png@0.70",
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
        "Command": "setWindowSize",
        "Target": "375x768",
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
        "Command": "end",
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
        "Command": "setWindowSize",
        "Target": "1024x768",
        "Value": ""
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
        "Target": "You find the example PowerShell script for this demo in the UI.Vision docs for \"XRunAndWait\"",
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
        "Target": "visualVerify // draw_compare_dpi_96.png",
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
        "Command": "clickAndWait",
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
   
  "XModules_Desktop/DemoXDesktopAutomation":
  {
    "CreationDate": "2024-02-13",
    "Commands": [
      {
        "Command": "store",
        "Target": "fast",
        "Value": "!replayspeed",
		"Description": ""
      },
      {
        "Command": "echo",
        "Target": "Running DESKTOP image search now",
        "Value": "#shownotification",
		"Description": ""
      },
      {
        "Command": "XDesktopAutomation",
        "Target": "true",
        "Value": "",
		"Description": "Look at the desktop, not only the browser"
      },
      {
        "Command": "run",
        "Target": "Sub/Sub_XDesktopAutomation_Area",
        "Value": "",
		"Description": "In the sub, we limit the search area for better performance"
      },
      {
        "Command": "store",
        "Target": "true",
        "Value": "!errorignore",
		"Description": "Log button can be greyed out - try both options. "
      },
      {
        "Command": "XClick",
        "Target": "desktop_logstab_white_dpi_96.png@0.5",
        "Value": "",
		"Description": "Log button can have white or grey background"
      },
      {
        "Command": "store",
        "Target": "false",
        "Value": "!errorignore",
		"Description": ""
      },
      {
        "Command": "if",
        "Target": "${!statusOK} == false",
        "Value": "",
		"Description": ""
      },
      {
        "Command": "XClick",
        "Target": "desktop_logstab_grey_dpi_96.png@0.5",
        "Value": "",
		"Description": "Now try the GREY button image"
      },
    {
        "Command": "store",
        "Target": "true",
        "Value": "!statusOK",
		"Description": "Reset !statusOK value. It does NOT reset by itself during macro run."
      },
      {
        "Command": "end",
        "Target": "",
        "Value": "",
		"Description": ""
      },
      {
        "Command": "XClick",
        "Target": "desktop_clearbutton_dpi_96.png@0.5",
        "Value": "",
		"Description": "Press Clear button"
      },
      {
        "Command": "echo",
        "Target": "Log cleared by macro (clear button pressed)",
        "Value": "blue",
		"Description": ""
      },
      {
        "Command": "comment",
        "Target": "Now search and open other tabs",
        "Value": ""
      },
      {
        "Command": "XClick",
        "Target": "desktop_vartab_dpi_96.png@0.5",
        "Value": "",
		"Description": "Open Variable tab"
      },
      {
        "Command": "XClick",
        "Target": "desktop_scrtab_dpi_96.png@0.4",
        "Value": "",
		"Description": ""
      },
      {
        "Command": "XClick",
        "Target": "desktop_vitab_dpi_96.png@0.4",
        "Value": "",
		"Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "desktop_check_v_tab_dpi_96.png@0.5",
        "Value": "",
		"Description": "Make sure that we are on the correct tab. For that, we search for the icons." 
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
      "Target": "${!os}==\"mac\" || ${!os}==\"windows\"",
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
  "XModules_Desktop/Sub/Sub_XDesktopAutomation_Area":
  {
    "CreationDate": "2021-04-29",
    "Commands": [
      {
        "Command": "comment",
        "Target": "SUBROUTINE used by DemoXDesktopAutomation",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "comment",
        "Target": "It uses two anchor images to define the new search area",
        "Value": "",
        "Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "desktop_area_topleft3_dpi_96.png@0.4",
        "Value": "",
        "Description": "Find image to calculate the top left x/y for visionLimitSearchArea "
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${!imagex}-${!imagewidth}/1.5",
        "Value": "x1",
        "Description": "New limited area top left corner = bottom left corner of the anchor image. We use image x/y and image width/height to calculate this value. For X we use /1.5 instead of /2 in the formular below to make the area a bit wider."
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${!imagey}+${!imageheight}/2",
        "Value": "y1",
        "Description": ""
      },
      {
        "Command": "visualAssert",
        "Target": "desktop_area_bottomright_dpi_96.png@0.4",
        "Value": "",
        "Description": "Find image to calculate the bottom right x/y for visionLimitSearchArea."
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${!imagex}+${!imagewidth}/2",
        "Value": "x2",
        "Description": "New Search Area bottom right corner = top right corner of the anchor image."
      },
      {
        "Command": "executeScript_Sandbox",
        "Target": "return ${!imagey}-${!imageheight}/2",
        "Value": "y2",
        "Description": ""
      },
      {
        "Command": "echo",
        "Target": "x1=${x1}, y1=${y1}, x2=${x2}, y2=${y2}",
        "Value": "blue",
        "Description": ""
      },
      {
        "Command": "visionLimitSearchArea",
        "Target": "area=${x1},${y1},${x2},${y2}",
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
        "Command": "clickAndWait",
        "Target": "xpath=//span/span",
        "Value": ""
      }
    ]
  }     
  }	
