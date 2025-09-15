import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component
import UploadedFilesTable from '../components/UploadedFilesTable';
import { toast } from 'react-hot-toast';

export default function UploadUrl() {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [renamedFilename, setRenamedFilename] = useState(""); // New state for renamed filename
  const navigate = useNavigate(); // Initialize useNavigate

  // Effect to set initial filename from URL if available
  React.useEffect(() => {
    if (url) {
      try {
        const urlObj = new URL(url);
        const path = urlObj.pathname;
        const baseNameWithExt = path.split('/').pop();
        if (baseNameWithExt) {
          const fileNameWithoutExtension = baseNameWithExt.split('.').slice(0, -1).join('.');
          setRenamedFilename(`${fileNameWithoutExtension || 'downloaded_file'}.parquet`);
        } else {
          setRenamedFilename('downloaded_file.parquet');
        }
      } catch {
        setRenamedFilename('downloaded_file.parquet');
      }
    }
  }, [url]);

  const handleRenamedFilenameChange = (e) => {
    const inputName = e.target.value;
    const baseName = inputName.split('.')[0];
    setRenamedFilename(`${baseName}.parquet`);
  };

  const handleUpload = async () => {
    if (!url) {
      toast.error("Please enter a URL.");
      return;
    }
    if (!renamedFilename.trim()) {
        toast.error("Please enter a valid filename.");
        return;
    }
    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/files/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, filename: renamedFilename }),
      });
      const data = await res.json();
      toast.success(data.message || "Uploaded!");
      if (data.filename) {
        navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
      }
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
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div style={{
        position: 'relative',
        zIndex: 1,
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
            {url && (
              <div style={{ width: "100%", maxWidth: 340, marginBottom: 10, marginTop: 5 }}>
                <label htmlFor="rename-url-file" style={{ color: '#e0e7ef', fontSize: 13, display: 'block', marginBottom: 5, fontWeight: 500 }}>Rename File (will be saved as .parquet):</label>
                <input
                  type="text"
                  id="rename-url-file"
                  style={inputStyle}
                  value={renamedFilename}
                  onChange={handleRenamedFilenameChange}
                  placeholder="Enter new file name"
                />
              </div>
            )}
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
