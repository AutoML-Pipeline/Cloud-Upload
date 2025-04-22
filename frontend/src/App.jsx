import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import gsap from "gsap";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import GoogleAuthPopup from "./components/GoogleAuthPopup";
import Landing from "./pages/Landing";
import UploadFile from "./pages/UploadFile";
import UploadUrl from "./pages/UploadUrl";
import UploadCloud from "./pages/UploadCloud";
import GDriveFiles from "./pages/GDriveFiles";
import UploadSQLWorkbench from "./pages/UploadSQLWorkbench";
import Preprocessing from "./pages/Preprocessing";

function AnimatedRoutes({ user, setUser }) {
  const location = useLocation();
  useEffect(() => {
    // Snappier, smooth entry for login/register
    if (location.pathname === "/login" || location.pathname === "/register") {
      gsap.fromTo(
        "#page-content",
        { opacity: 0, y: 40, filter: "blur(7px)", scale: 0.985 },
        { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.72, ease: "expo.out" }
      );
    } else {
      gsap.fromTo(
        "#page-content",
        { opacity: 0, y: 28 },
        { opacity: 1, y: 0, duration: 0.44, ease: "power2.out" }
      );
    }
  }, [location.pathname]);

  return (
    <div id="page-content">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onGoogleSuccess={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/upload-file" element={<UploadFile />} />
        <Route path="/upload-url" element={<UploadUrl />} />
        <Route path="/upload-cloud" element={<UploadCloud />} />
        <Route path="/gdrive-files" element={<GDriveFiles />} />
        <Route path="/upload-sqlworkbench" element={<UploadSQLWorkbench />} />
        <Route path="/preprocessing" element={<Preprocessing />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    // Optionally load user from localStorage or return null
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  return (
    <Router>
      <AnimatedRoutes user={user} setUser={setUser} />
    </Router>
  )
}

export default App
