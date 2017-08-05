// Note: if a `promise` field and a `types` provied, this middleware will dispatch
// 3 actions REQUEST, SUCCESS, FAILURE based on the status of the promise it returns
export default function promiseMiddleWare () {
  return ({dispatch, getState}) => {
    return (next) => (action) => {
      const { promise, types, ...rest } = action;

      if (!promise) {
        return next(action);
      }

      const [REQUEST, SUCCESS, FAILURE] = types;
      next({...rest, type: REQUEST});
      return promise().then(
        (data) => next({...rest, data, type: SUCCESS}),
        (error) => {
            return next({...rest, err: error, type: FAILURE});
        }
      );
    };
  };
};
