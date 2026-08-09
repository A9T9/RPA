import { onMessage } from '../common/ipc/cs_postmessage'

const clone = (data) => {
  const str = JSON.stringify(data)
  if (str === undefined)  return undefined
  return JSON.parse(str)
}

// Pages enforcing Trusted Types (require-trusted-types-for 'script'; e.g.
// docs.google.com) reject window.eval(string) outright. Wrapping the code in
// a TrustedScript from our own policy satisfies the TT check on pages that
// still allow 'unsafe-eval'. Policy creation can itself be refused (a
// trusted-types allowlist directive) — then fall back to the plain string and
// let eval report the original error.
let ttPolicy = null
const asEvalable = (code) => {
  if (window.trustedTypes && window.trustedTypes.createPolicy) {
    if (!ttPolicy) {
      try {
        ttPolicy = window.trustedTypes.createPolicy('uivision-eval', { createScript: (s) => s })
      } catch (e) { /* policy name not allowed by the page's CSP */ }
    }
    if (ttPolicy) return ttPolicy.createScript(code)
  }
  return code
}

onMessage(window, ({ cmd, args }) => {
  switch (cmd) {
    case 'INJECT_READY': {
      document.body.setAttribute('data-injected', 'done')
      return true
    }

    case 'INJECT_RUN_EVAL': {
      // Note: clone the data in case it contains some Object that can't be passed via postMessage (eg. HTMLDocument)
      // eslint-disable-next-line no-eval
      return Promise.resolve(window.eval(asEvalable(args.code)))
      .then(result => {
        return { result: clone(result) }
      })
    }
  }
})
