import { useState, useEffect, useCallback } from 'react'
import './App.css'
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import gsap from "gsap";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
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
import ManageAccount from "./pages/ManageAccount";
import { Toaster } from 'react-hot-toast';
import ShadcnNavbar from "./components/ShadcnNavbar";

function AnimatedRoutes({ user, setUser }) {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
  <Route path="/login" element={<Login onGoogleSuccess={setUser} />} />
  <Route path="/register" element={<Register onAuthSuccess={setUser} />} />
      <Route path="/manage-account" element={<ManageAccount onLogout={() => {
        localStorage.removeItem('user');
        localStorage.removeItem('auth_token');
        localStorage.removeItem('access_token');
        setUser(null);
      }} />} />
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
  );
}

function AppFrame({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const showChrome = !(location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register");

  useEffect(() => {
    const target = "#page-content";
    if (!showChrome) {
      const ctx = gsap.context(() => {
        gsap.fromTo(
          target,
          { autoAlpha: 0, y: 28, filter: "blur(8px)", scale: 0.97 },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.45, ease: "power3.out" }
        );
      });
      return () => ctx.revert();
    }
    gsap.set(target, { clearProps: "all" });
  }, [location.pathname, showChrome]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("user");
    localStorage.removeItem("google_access_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_token");
    sessionStorage.clear();
    setUser(null);
    navigate("/", { replace: true });
  }, [navigate, setUser]);

  return (
    <>
  {showChrome && (
    <ShadcnNavbar user={user} onLogout={handleLogout} />
  )}
      <div id="page-content" className={showChrome ? "app-shell-with-chrome" : undefined}>
        <AnimatedRoutes user={user} setUser={setUser} />
      </div>
    </>
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
      <AppFrame user={user} setUser={setUser} />
    </Router>
  )
}

export default App
