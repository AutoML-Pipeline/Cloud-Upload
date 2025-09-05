import React, { useState } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component
import FloatingFilesPanel from '../components/FloatingFilesPanel';
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
      const res = await fetch("http://localhost:8000/files/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      toast.success(data.message || "Uploaded!");
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  return (
    <div className="page-shell">
      <div className="min-h-[calc(100vh-54px)] w-screen overflow-hidden relative flex flex-col items-center justify-start mt-[54px]">
        <ShadcnNavbar onLogout={() => {
          // Remove all possible auth tokens and user info
          localStorage.removeItem("user");
          localStorage.removeItem("google_access_token");
          localStorage.removeItem("access_token");
          sessionStorage.clear();
          window.location.replace("/");
        }} />
        <div className="page-section">
          <div className="absolute left-0 top-0 z-[10000] pointer-events-auto">
            <div className="ml-8 mt-6 z-[10001] pointer-events-auto">
              <GlobalBackButton />
            </div>
          </div>
          <div className="w-full flex flex-col items-center z-10 mb-8 mt-14">
            <div className="auth-card">
              <h2 className="heading-xl">Upload File</h2>
              <input type="file" onChange={handleFileChange} className="input" />
              <button onClick={handleUpload} disabled={uploading} className="btn-primary max-w-[340px]" style={{ background: uploading ? '#444' : undefined }}>
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      </div>
      <FloatingFilesPanel position="top-right" offsetTop={80} label="Show Uploaded Files" />
    </div>
  );
}
