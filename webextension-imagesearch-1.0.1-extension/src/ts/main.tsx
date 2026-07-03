import * as React from "react";
import * as ReactDOM from "react-dom";
import { createStore } from "redux";
import { Provider } from "react-redux";

import "./web-extensions";
import { App, AppProps } from "./components";
import { StoreState } from "./models";
import { rootReducer } from "./reducers";
import { Actions } from "./actions";

import "bootstrap";
import "./main.scss";

// Create store with initial values
const store = createStore<StoreState, Actions, any, any>(rootReducer, {
    logs: new Array<string>(),
    patternImage: {
        dataUrl: "",
        info: {}
    }
} as AppProps);

/**
 * Called when DOM is ready.
 */
function notifyDomLoaded(): void {   
    ReactDOM.render(
        <Provider store={store}>
            <App />
        </Provider>
    , document.getElementById("root"));
}

// Wait until DOM fully ready.
document.addEventListener("DOMContentLoaded", (domEvent: any) => {
    notifyDomLoaded();
});
