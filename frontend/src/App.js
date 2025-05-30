import React from "react";
import Upload from "./components/Upload";
import Admin from "./components/Admin";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";

const App = () => {
  return (
    <Router>
      <nav className="bg-primary text-white p-3 shadow-sm sm:shadow-md">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <h1 className="text-lg font-semibold sm:text-xl">EmotionFace</h1>
          <div className="flex gap-3 sm:gap-6">
            <Link
              to="/"
              className="font-medium text-sm sm:text-base hover:text-accent transition-colors"
            >
              Home
            </Link>
            <Link
              to="/admin"
              className="font-medium text-sm sm:text-base hover:text-accent transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Upload />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;
