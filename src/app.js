import React, { Component } from 'react'
import { HashHistory as Router, Route, Link, Switch, Redirect } from 'react-router-dom'

import routes from './routes'
import Header from './components/header'
import 'antd/dist/antd.css'
import './app.scss'

class App extends Component {
  render () {
    return (
      <div className="app">
        <Header />

        <section className="content">
          <Switch>
            <Route exact path="/" render={() => (
              <Redirect to="/dashboard" />
            )} />

            {routes.map((route) => (
              <Route {...route} key={route.path} />
            ))}
          </Switch>
        </section>
      </div>
    );
  }
}

export default App;
