/**
 * 
 * @description 
 * it is used to intercept log in production environment
 */
export default function interceptLog() {
  var isProduction = process.env.NODE_ENV === 'production'
  if (isProduction) {
    const noop = function () { }
    console.log = noop
    console.info = noop
    console.warn = noop
    console.error = noop
  }
}
