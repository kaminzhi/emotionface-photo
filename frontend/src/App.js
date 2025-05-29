import logo from "./logo.svg";

import React from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import Upload from "./components/Upload";
import Admin from "./components/Admin";

const App = () => {
  return (
    <Router>
      <Switch>
        <Route exact path="/" component={Upload} />
        <Route path="/admin" component={Admin} />
      </Switch>
    </Router>
  );
};

export default App;
