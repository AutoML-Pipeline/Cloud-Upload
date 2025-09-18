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
import FeatureEngineering from "./pages/FeatureEngineering";
import AutoMLTraining from "./pages/AutoMLTraining";
import FilesPage from "./pages/Files";
import DataIngestion from "./pages/DataIngestion";
import { Toaster } from 'react-hot-toast';

function AnimatedRoutes({ user, setUser }) {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname === "/login" || location.pathname === "/register" || location.pathname === "/") {
      gsap.fromTo(
        "#page-content",
        { opacity: 0, y: 40, filter: "blur(7px)", scale: 0.985 },
        { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.72, ease: "expo.out" }
      );
    }
    // No animation for other routes
  }, [location.pathname]);

  return (
    <div id="page-content">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login onGoogleSuccess={setUser} />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard user={user} />} />
        <Route path="/data-ingestion" element={<DataIngestion />} />
        <Route path="/upload-file" element={<UploadFile />} />
        <Route path="/upload-url" element={<UploadUrl />} />
        <Route path="/upload-cloud" element={<UploadCloud />} />
        <Route path="/gdrive-files" element={<GDriveFiles />} />
        <Route path="/upload-sqlworkbench" element={<UploadSQLWorkbench />} />
        <Route path="/preprocessing" element={<Preprocessing />} />
        <Route path="/feature-engineering" element={<FeatureEngineering />} />
        <Route path="/automl-training" element={<AutoMLTraining />} />
        <Route path="/files" element={<FilesPage />} />
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
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <AnimatedRoutes user={user} setUser={setUser} />
    </Router>
  )
}

export default App
