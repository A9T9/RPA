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
  'SET_COMMAND_BASE_URL',
  'UPDATE_BASE_URL',
  'APPEND_COMMAND',
  'INSERT_COMMAND',
  'UPDATE_COMMAND',
  'REMOVE_COMMAND',
  'SELECT_COMMAND',
  'UPDATE_SELECTED_COMMAND',
  'SAVE_EDITING_AS_EXISTED',
  'SAVE_EDITING_AS_NEW',

  'SET_TEST_CASES',
  'SET_EDITING',
  'EDIT_TEST_CASE',
  'EDIT_NEW_TEST_CASE',
  'ADD_TEST_CASES',
  'RENAME_TEST_CASE',
  'REMOVE_CURRENT_TEST_CASE',
  'SET_PLAYER_STATE',

  'CUT_COMMAND',
  'COPY_COMMAND',
  'PASTE_COMMAND',

  'ADD_LOGS',
  'CLEAR_LOGS',

  'START_PLAYING',
  'STOP_PLAYING'
].reduce((prev, cur) => {
  prev[cur] = cur
  return prev
}, {})

export const types = { ...simpleTypes, ...promiseTypes }
