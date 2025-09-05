import React, { useCallback, useEffect } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the new component
import FloatingFilesPanel from '../components/FloatingFilesPanel';
import { useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';

export default function UploadCloud() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for google token in localStorage
    const googleToken = localStorage.getItem("google_access_token");
    if (googleToken) {
      // Optionally, fetch user info to show that user is already logged in
    }
  }, []);

  // Open popup for OAuth and redirect to new page with token
  const handleProviderLogin = useCallback((provider) => {
    if (provider === "google") {
      // Only redirect if token exists AND user is already on /gdrive-files
      const googleToken = localStorage.getItem("google_access_token");
      if (googleToken) {
        navigate("/gdrive-files");
        return;
      }
      const popup = window.open("http://localhost:8000/auth/google/login", "_blank", "width=500,height=700");
      const handler = (event) => {
        const allowedOrigins = ["http://localhost:5173", window.location.origin];
        if (!allowedOrigins.includes(event.origin)) return;
        if (event.data && event.data.source === "react-devtools-content-script") return;
        if (event.data && (event.data.google_creds || event.data.access_token)) {
          let accessToken = event.data.access_token;
          if (event.data.google_creds) {
            Object.entries(event.data.google_creds).forEach(([key, value]) => {
              localStorage.setItem(`google_${key}`, typeof value === 'object' ? JSON.stringify(value) : value);
            });
            accessToken = event.data.google_creds.access_token;
          } else if (event.data.access_token) {
            localStorage.setItem("google_access_token", event.data.access_token);
          }
          if (accessToken) {
            navigate("/gdrive-files");
          } else {
            toast.error("Google OAuth message received but no access token found. Check console.");
          }
          popup && popup.close();
          window.removeEventListener("message", handler);
        }
      };
      window.addEventListener("message", handler);
      return;
    }
    if (provider === "onedrive") window.open("http://localhost:8000/auth/onedrive/login", "_blank", "width=500,height=700");
    if (provider === "box") window.open("http://localhost:8000/auth/box/login", "_blank", "width=500,height=700");
    // For S3, show a form for credentials
  }, [navigate]);

  return (
    <div className="page-shell">
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div className="min-h-[calc(100vh-54px)] w-screen overflow-hidden relative flex flex-col items-center justify-center mt-[54px]">
        <div className="page-section min-h-[80vh] justify-start">
          <div className="absolute left-0 top-0 z-[10000] pointer-events-auto">
            <div className="ml-8 mt-6 z-[10001] pointer-events-auto">
              <GlobalBackButton />
            </div>
          </div>
          <div className="w-full flex flex-col items-center z-10 mb-8 mt-14">
            <div className="auth-card w-[420px] max-w-[96vw]">
              <h2 className="heading-xl">Upload from Cloud</h2>
              <div className="muted mb-8">Connect your cloud storage to upload files securely.</div>
              <div className="w-[340px] max-w-[90%] flex flex-col gap-4">
                <button onClick={() => handleProviderLogin("google")} className="w-full bg-[#4285F4] text-white font-semibold rounded-xl text-[18px] px-8 py-3 border-0 shadow [box-shadow:0_2px_12px_rgba(66,133,244,0.15)] cursor-pointer tracking-wider flex items-center justify-center gap-2">
                  <span className="text-[20px]">📁</span> Connect Google Drive
                </button>
                <button onClick={() => handleProviderLogin("onedrive")} className="w-full bg-[#0061FF] text-white font-semibold rounded-xl text-[18px] px-8 py-3 border-0 shadow [box-shadow:0_2px_12px_rgba(0,97,255,0.15)] cursor-pointer tracking-wider flex items-center justify-center gap-2">
                  <span className="text-[20px]">🗂️</span> Connect OneDrive
                </button>
                <button onClick={() => handleProviderLogin("box")} className="w-full bg-[#0061FF] text-white font-semibold rounded-xl text-[18px] px-8 py-3 border-0 shadow [box-shadow:0_2px_12px_rgba(0,97,255,0.15)] cursor-pointer tracking-wider flex items-center justify-center gap-2">
                  <span className="text-[20px]">🗂️</span> Connect Box
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingFilesPanel position="top-right" offsetTop={80} label="Show Uploaded Files" />
    </div>
  );
}
