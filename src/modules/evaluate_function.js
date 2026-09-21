// JS-Interpreter's Function#toString is a placeholder. Read only the source
// identifier retained by our compiler, never execute the macro function here.
export function installEvaluateFunctionSource (interp, globalObject, sources = {}) {
  interp.setProperty(globalObject, '__uiv_evaluate_source', interp.createNativeFunction(function (fn) {
    const body = fn && fn.node && fn.node.body && fn.node.body.body
    for (const statement of body || []) {
      if (statement.type !== 'ExpressionStatement' || typeof statement.expression.value !== 'string') break
      const key = statement.expression.value
      if (Object.prototype.hasOwnProperty.call(sources, key)) {
        return interp.nativeToPseudo({ ok: true, source: sources[key] })
      }
    }
    return interp.nativeToPseudo({ ok: false, error: 'uiv.evaluate in this macro runtime needs a function defined in the macro or an included file. Native, bound, dynamically generated and class methods cannot be sent to the page. Use uiv.evaluate(arg => document.querySelector(arg).textContent, selector), or a script string.' })
  }))
}
