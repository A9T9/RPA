
export type SideProject = {
  id:      string;
  version: string;
  name:    string;
  url:     string;
  urls:    string[];
  tests:   SideMacro[];
  suites:  SideSuite[];
  plugins: any[];
}

export type SideSuite = {
  id:             string;
  name:           string;
  persistSession: boolean;
  parallel:       boolean;
  timeout:        number;
  tests:          string[];
}

export type SideMacro = {
  id:       string;
  name:     string;
  commands: SideCommand[];
}

export type SideCommand = {
  id:      string;
  comment: string;
  command: SideCommandText;
  target:  string;
  targets: Array<[string, string]>;
  value:   string;
}

export type SideCommandText = 'addSelection' |
                              'answerOnNextPrompt' |
                              'assert' |
                              'assertAlert' |
                              'assertChecked' |
                              'assertConfirmation' |
                              'assertEditable' |
                              'assertElementPresent' |
                              'assertElementNotPresent' |
                              'assertNotChecked' |
                              'assertNotEditable' |
                              'assertNotSelectedValue' | // Not supported
                              'assertNotText' | // Not supported
                              'assertPrompt' |
                              'assertSelectedValue' | // Not supported
                              'assertSelectedLabel' | // Not supported
                              'assertText' |
                              'assertTitle' |
                              'assertValue' |
                              'check' |
                              'chooseCancelOnNextConfirmation' | // Not supported
                              'chooseCancelOnNextPrompt' | // Not supported
                              'chooseOkOnNextConfirmation' | // Not supported
                              'click' |
                              'saveItem' |
                              'clickAt' |
                              'close' | // Not supported
                              'debugger' | // Not supported
                              'do' |
                              'doubleClick' | // Not supported
                              'doubleClickAt' | // Not supported
                              'dragAndDropToObject' |
                              'echo' |
                              'editContent' |
                              'else' |
                              'elseIf' |
                              'end' |
                              'executeScript' |
                              'executeAsyncScript' |
                              'forEach' |
                              'if' |
                              'mouseDown' | // Not supported
                              'mouseDownAt' | // Not supported
                              'mouseMoveAt' | // Not supported
                              'mouseOut' | // Not supported
                              'mouseOver' |
                              'mouseUp' | // Not supported
                              'mouseUpAt' | // Not supported
                              'open' |
                              'pause' |
                              'removeSelection' |
                              'repeatIf' |
                              'run' |
                              'runScript' | // Not supported
                              'select' |
                              'selectFrame' |
                              'selectWindow' | // Different
                              'sendKeys' |
                              'setSpeed' | // Not supported
                              'setWindowSize' |
                              'store' |
                              'storeAttribute' |
                              'storeJson' | // Not supported
                              'storeText' |
                              'storeTitle' |
                              'storeValue' |
                              'storeWindowHandle' | // Not supported
                              'storeXpathCount' |
                              'submit' | // Not supported
                              'times' |
                              'type' |
                              'uncheck' |
                              'verify' | // Not supported
                              'verifyChecked' |
                              'verifyEditable' |
                              'verifyElementPresent' |
                              'verifyElementNotPresent' |
                              'verifyNotChecked' |
                              'verifyNotEditable' |
                              'verifyNotSelectedValue' | // Not supported
                              'verifyNotText' | // Not supported
                              'verifySelectedLabel' | // Not supported
                              'verifySelectedValue' | // Not supported
                              'verifyText' |
                              'verifyTitle' |
                              'verifyValue' |
                              'waitForElementEditable' | // Not supported
                              'waitForElementNotEditable' | // Not supported
                              'waitForElementNotPresent' | // Not supported
                              'waitForElementNotVisible' | // Not supported
                              'waitForElementPresent' | // Not supported
                              'waitForElementVisible' | // Different
                              'webdriverAnswerOnVisiblePrompt' | // Not supported
                              'webdriverChooseCancelOnVisibleConfirmation' | // Not supported
                              'webdriverChooseCancelOnVisiblePrompt' | // Not supported
                              'webdriverChooseOkOnVisibleConfirmation' | // Not supported
                              'while'
