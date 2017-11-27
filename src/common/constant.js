
const mk = (list) => list.reduce((prev, key) => {
  prev[key] = key;
  return prev
}, {})

export const APP_STATUS = mk([
  'NORMAL',
  'INSPECTOR',
  'RECORDER',
  'PLAYER'
])

export const INSPECTOR_STATUS = mk([
  'PENDING',
  'INSPECTING',
  'STOPPED'
])

export const RECORDER_STATUS = mk([
  'PENDING',
  'RECORDING',
  'STOPPED'
])

export const PLAYER_STATUS = mk([
  'PLAYING',
  'PAUSED',
  'STOPPED'
])

export const CONTENT_SCRIPT_STATUS = mk([
  'NORMAL',
  'RECORDING',
  'INSPECTING',
  'PLAYING'
])

export const TEST_CASE_STATUS = mk([
  'NORMAL',
  'SUCCESS',
  'ERROR'
])
