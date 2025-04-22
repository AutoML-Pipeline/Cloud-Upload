import React, { useState } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return setMessage("Please select a file.");
    setUploading(true);
    setMessage("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setMessage(data.message || "Uploaded!");
    } catch (e) {
      setMessage("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="page-fullscreen">
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
        <ShadcnNavbar />
        {/* Global Back Button (left-aligned, below navbar, with high z-index and pointerEvents) */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}>
          <div style={{ marginLeft: 32, marginTop: 24, zIndex: 10001, pointerEvents: 'auto' }}>
            <GlobalBackButton />
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 'calc(100vh - 54px)', zIndex: 10 }}>
          <div style={{ maxWidth: 420, width: '100%', background: "rgba(30,41,59,0.93)", borderRadius: 18, boxShadow: "0 4px 24px rgba(99,102,241,0.13)", padding: "2.5rem 2rem", color: "#e0e7ef", minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Upload File</h2>
            <input type="file" onChange={handleFileChange} style={{ marginBottom: 18, color: "#e0e7ef", width: '100%' }} />
            <button onClick={handleUpload} disabled={uploading} style={{ width: "100%", background: "linear-gradient(90deg, #6366f1 0%, #1e293b 100%)", color: "#e0e7ef", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 4px 24px rgba(99,102,241,0.18)", cursor: "pointer", letterSpacing: "0.04em", marginBottom: 10, transition: "all 0.18s" }}>
              {uploading ? "Uploading..." : "Upload"}
            </button>
            {message && <div style={{ color: "#38bdf8", marginTop: 10 }}>{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
