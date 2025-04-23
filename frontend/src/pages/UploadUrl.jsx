import React, { useState } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component
import UploadedFilesTable from '../components/UploadedFilesTable';
import { toast } from 'react-hot-toast';

export default function UploadUrl() {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!url) {
      toast.error("Please enter a URL.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
          <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 600, margin: '0 auto', padding: 32, background: 'rgba(0,0,0,0.7)', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.8)' }}>
            <h2 style={{ color: 'white', marginBottom: 24 }}>Upload from URL</h2>
            <input type="text" style={inputStyle} placeholder="Enter file URL" value={url} onChange={e => setUrl(e.target.value)} />
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
  );
}
