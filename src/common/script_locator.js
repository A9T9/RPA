// JavaScript finders accept bare CSS. Keep page input actions consistent
// when they cross into the classic player, which requires an explicit prefix.
export function scriptLocator (locator) {
  const text = String(locator).trim()
  return /^(?:[a-z][a-z0-9_-]*=|\/|\(\/)/i.test(text) ? text : 'css=' + text
}
