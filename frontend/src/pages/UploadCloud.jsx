import React, { useCallback, useEffect } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the new component
import UploadedFilesTable from '../components/UploadedFilesTable';
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
    <div className="page-fullscreen">
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {/* Spline animated background */}
        <iframe
          src="https://my.spline.design/cubes-11XksX5PbLLeQrFYk69YghaQ/"
          frameBorder="0"
          title="Spline 3D Background"
          allowFullScreen
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 0,
            pointerEvents: 'none',
            background: 'transparent',
            maxWidth: '100vw',
            maxHeight: '100vh',
            overflow: 'hidden'
          }}
        />
        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: 1100,
          margin: '0 auto',
          padding: 32,
          background: 'rgba(0,0,0,0.7)',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
          minHeight: '80vh',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
        }}>
          {/* Global Back Button (left-aligned, below navbar, with high z-index and pointerEvents) */}
          <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 10000, pointerEvents: 'auto' }}>
            <div style={{ marginLeft: 32, marginTop: 24, zIndex: 10001, pointerEvents: 'auto' }}>
              <GlobalBackButton />
            </div>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, marginBottom: 32, marginTop: 56 }}>
            <div style={{ width: 420, maxWidth: '96vw', background: "rgba(30,41,59,0.93)", borderRadius: 18, boxShadow: "0 4px 24px rgba(99,102,241,0.13)", padding: "2.5rem 2rem", color: "#e0e7ef", minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Upload from Cloud</h2>
              <div style={{ color: "#a3aed6", fontSize: 16, marginBottom: 32, textAlign: 'center' }}>Connect your cloud storage to upload files securely.</div>
              <div style={{ width: 340, maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: 18 }}>
                <button onClick={() => handleProviderLogin("google")}
                  style={{ width: "100%", background: "#4285F4", color: "#fff", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 2px 12px rgba(66,133,244,0.15)", cursor: "pointer", letterSpacing: "0.04em", marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                  onError={err => toast.error("Google login failed: " + err)}
                >
                  <span style={{fontSize: 20}}>📁</span> Connect Google Drive
                </button>
                <button onClick={() => handleProviderLogin("onedrive")}
                  style={{ width: "100%", background: "#0061FF", color: "#fff", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 2px 12px rgba(0,97,255,0.15)", cursor: "pointer", letterSpacing: "0.04em", marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  <span style={{fontSize: 20}}>🗂️</span> Connect OneDrive
                </button>
                <button onClick={() => handleProviderLogin("box")}
                  style={{ width: "100%", background: "#0061FF", color: "#fff", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 2px 12px rgba(0,97,255,0.15)", cursor: "pointer", letterSpacing: "0.04em", marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                >
                  <span style={{fontSize: 20}}>🗂️</span> Connect Box
                </button>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <UploadedFilesTable />
          </div>
        </div>
      </div>
    </div>
  );
}
