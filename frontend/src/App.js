import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Upload from "./components/Upload";
import Admin from "./components/Admin";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;
