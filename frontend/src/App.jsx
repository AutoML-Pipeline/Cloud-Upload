import React, { useState, useEffect, useCallback, Suspense, lazy } from "react";
import "./App.css";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ShadcnNavbar from "./components/ShadcnNavbar";

const Landing = lazy(() => import("./pages/landing/Landing"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ManageAccount = lazy(() => import("./pages/auth/ManageAccount"));
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const DataIngestion = lazy(() => import("./pages/data-ingestion/DataIngestion"));
const UploadFile = lazy(() => import("./pages/upload-file/UploadFile"));
const ImportHuggingFace = lazy(() => import("./pages/import-hf/ImportHuggingFace"));
const UploadCloud = lazy(() => import("./pages/upload-cloud/UploadCloud"));
const GDriveFiles = lazy(() => import("./pages/gdrive-files/GDriveFiles"));
const UploadSQLWorkbench = lazy(() => import("./pages/upload-sql/UploadSQLWorkbench"));
const Preprocessing = lazy(() => import("./pages/preprocessing/Preprocessing"));
const FeatureEngineering = lazy(() => import("./pages/feature-engineering/FeatureEngineering"));
const AutoMLTraining = lazy(() => import("./pages/automl-training/AutoMLTraining"));
const FilesPage = lazy(() => import("./pages/files/Files"));

const PageLoader = () => (
  <div className="page-loading">
    Loading...
  </div>
);

function AnimatedRoutes({ user, setUser }) {
  return (
    <Suspense fallback={<PageLoader />}>
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
        <Route path="/import-hf" element={<ImportHuggingFace />} />
        <Route path="/upload-cloud" element={<UploadCloud />} />
        <Route path="/gdrive-files" element={<GDriveFiles />} />
        <Route path="/upload-sqlworkbench" element={<UploadSQLWorkbench />} />
        <Route path="/preprocessing" element={<Preprocessing />} />
        <Route path="/feature-engineering" element={<FeatureEngineering />} />
        <Route path="/automl-training" element={<AutoMLTraining />} />
        <Route path="/files" element={<FilesPage />} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Suspense>
  );
}

function AppFrame({ user, setUser }) {
  const location = useLocation();
  const navigate = useNavigate();
  const showChrome = !(location.pathname === "/" || location.pathname === "/login" || location.pathname === "/register");

  useEffect(() => {
    let isCancelled = false;
    let ctx;

    const animate = async () => {
      const gsapModule = await import("gsap");
      if (isCancelled) return;
      const gsapInstance = gsapModule.default ?? gsapModule;
      const target = "#page-content";

      if (!showChrome) {
        ctx = gsapInstance.context(() => {
          gsapInstance.fromTo(
            target,
            { autoAlpha: 0, y: 28, filter: "blur(8px)", scale: 0.97 },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.45, ease: "power3.out" }
          );
        });
      } else {
        gsapInstance.set(target, { clearProps: "all" });
      }
    };

    animate();

    return () => {
      isCancelled = true;
      ctx?.revert();
    };
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
