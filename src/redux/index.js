import {Provider} from 'react-redux';
import {createStore as oldCreateStore, applyMiddleware} from 'redux';
import thunk from 'redux-thunk'
import createPromiseMiddleware from './promise_middleware';
import createPostLogicMiddleware from './post_logic_middleware';
import reducer from '../reducers';

const createStore = applyMiddleware(
  thunk,
  createPromiseMiddleware(),
  createPostLogicMiddleware()
)(oldCreateStore)

export {
  Provider,
  reducer,
  createStore
};
