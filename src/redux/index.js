import { Provider } from 'react-redux';
import {createStore as oldCreateStore, applyMiddleware, compose } from 'redux';
import { thunk } from 'redux-thunk'
import createPromiseMiddleware from './promise_middleware';
import createPostLogicMiddleware from './post_logic_middleware';
import reducer, { testRootReducer } from '../reducers';

const adaptOldMethodMiddleware = storeAPI => next => action => {
  let adaptedAction;
  if(!action.type) {
    const { dispatch,  getState } = storeAPI
    adaptedAction = action(dispatch, getState)
  } else {
    adaptedAction = action
  }
   let result = next(adaptedAction)
  return result
}

const middlewareEnhancer = applyMiddleware(thunk, createPromiseMiddleware(), createPostLogicMiddleware(), adaptOldMethodMiddleware)
const store = oldCreateStore(reducer, middlewareEnhancer)
 
// original:
// const createStore = applyMiddleware(
//   thunk,
//   createPromiseMiddleware(),
//   createPostLogicMiddleware()
// )(oldCreateStore)

export {
  Provider,
  reducer,
  // createStore
  store
};
