// Generate three action types, used in actions that return promises
export const make3 = (name) => [name + '_REQUEST', name + '_SUCCESS', name + '_FAIL'];

export const type3 = (name) => make3(name).map((key) => types[key]);

const promiseTypes = [
  'START_RECORDING',
  'STOP_RECORDING',
  'START_INSPECTING',
  'STOP_INSPECTING'
].reduce((prev, cur) => {
  make3(cur).forEach((key) => {
    prev[key] = key;
  });

  return prev;
}, {});

const simpleTypes = [
  'SET_ROUTE',
  'DONE_INSPECTING',
  'UPDATE_BASE_URL',
  'APPEND_COMMAND',
  'DUPLICATE_COMMAND',
  'INSERT_COMMAND',
  'UPDATE_COMMAND',
  'REMOVE_COMMAND',
  'SELECT_COMMAND',
  'NORMALIZE_COMMANDS',
  'UPDATE_SELECTED_COMMAND',
  'SAVE_EDITING_AS_EXISTED',
  'SAVE_EDITING_AS_NEW',

  'SET_TEST_CASES',
  'SET_EDITING',
  'EDIT_TEST_CASE',
  'EDIT_NEW_TEST_CASE',
  'ADD_TEST_CASES',
  'RENAME_TEST_CASE',
  'REMOVE_TEST_CASE',
  'UPDATE_TEST_CASE_STATUS',
  'SET_PLAYER_STATE',
  'SET_PLAYER_MODE',
  'PLAYER_ADD_ERROR_COMMAND_INDEX',

  'SET_TEST_SUITES',
  'UPDATE_TEST_SUITE',

  'CUT_COMMAND',
  'COPY_COMMAND',
  'PASTE_COMMAND',

  'ADD_LOGS',
  'CLEAR_LOGS',

  'ADD_SCREENSHOT',
  'CLEAR_SCREENSHOTS',

  'START_PLAYING',
  'STOP_PLAYING',

  'SET_CSV_LIST',
  'SET_SCREENSHOT_LIST',

  'UPDATE_CONFIG'
].reduce((prev, cur) => {
  prev[cur] = cur
  return prev
}, {})

export const types = { ...simpleTypes, ...promiseTypes }
