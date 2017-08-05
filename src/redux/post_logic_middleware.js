// Note: if `post` field provided, it will call `post`
// after the action dispatched and state updated
export default function postLogicMiddleWare (extra) {
  return ({dispatch, getState}) => (next) => (action) => {
    const { post, ...rest } = action

    if (post && typeof post === 'function') {
      setTimeout(() => {
        post({dispatch, getState}, action, extra)
      }, 0)
    }

    return next(action)
  }
}
