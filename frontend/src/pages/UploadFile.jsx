import React, { useState, useEffect } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component
import UploadedFilesTable from '../components/UploadedFilesTable';
import { toast } from 'react-hot-toast';

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      toast.success(data.message || "Uploaded!");
    } catch (e) {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  const inputStyle = {
    width: "100%",
    maxWidth: 340,
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    border: "1px solid #334155",
    background: "rgba(30,41,59,0.85)",
    color: "#e0e7ef",
    fontSize: 16,
    outline: "none",
    marginTop: 2,
    marginBottom: 10,
    boxSizing: "border-box",
    fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif",
    fontWeight: 500
  };

  return (
    <div className="page-fullscreen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'black' }}>
      <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
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
            <div style={{ maxWidth: 420, width: '100%', background: "rgba(30,41,59,0.93)", borderRadius: 18, boxShadow: "0 4px 24px rgba(99,102,241,0.13)", padding: "2.5rem 2rem", color: "#e0e7ef", minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 0 }}>
              <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Upload File</h2>
              <input type="file" onChange={handleFileChange} style={inputStyle} />
              <button onClick={handleUpload} disabled={uploading} style={{ ...inputStyle, background: uploading ? '#444' : '#2563eb', color: 'white', cursor: uploading ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
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
