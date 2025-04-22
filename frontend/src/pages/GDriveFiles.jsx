import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton"; // Import the new component

export default function GDriveFiles() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderStack, setFolderStack] = useState([]);
  const [folderNames, setFolderNames] = useState([{ id: "root", name: "/" }]);
  const [uploadingFileId, setUploadingFileId] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    // Get token from query params or localStorage
    const params = new URLSearchParams(location.search);
    let accessToken = params.get("access_token");
    if (!accessToken) {
      accessToken = localStorage.getItem("google_access_token");
    }
    if (!accessToken) {
      navigate("/upload-cloud");
      return;
    }
    setToken(accessToken);
    fetchFiles(accessToken, "root");
    setCurrentFolderId("root");
    setFolderStack([]);
    setFolderNames([{ id: "root", name: "/" }]);
  }, [location, navigate]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('google_access_token', token);
    } else {
      // Try to recover token from localStorage if missing
      const stored = localStorage.getItem('google_access_token');
      if (stored) setToken(stored);
    }
  }, [token]);

  const fetchFiles = async (accessToken, folderId = "root") => {
    try {
      const res = await fetch(`http://localhost:8000/gdrive/list-files?access_token=${accessToken}&folder_id=${folderId}`);
      if (!res.ok) {
        const err = await res.text();
        setFiles([]);
        setUploadMessage(`Error: ${res.status} - ${err}`);
        return;
      }
      const data = await res.json();
      // DEBUG: log the response to help user debug
      console.log('Google Drive API response:', data);
      setFiles(data.files || []);
      if (!data.files || data.files.length === 0) {
        setUploadMessage('No files found in Google Drive.');
      } else {
        setUploadMessage("");
      }
    } catch (e) {
      setFiles([]);
      setUploadMessage('Failed to fetch files: ' + e.message);
    }
  };

  const handleFolderClick = (folder) => {
    setFolderStack([...folderStack, currentFolderId]);
    setCurrentFolderId(folder.id);
    setFolderNames([...folderNames, { id: folder.id, name: folder.name }]);
    fetchFiles(token, folder.id);
  };

  const handleBack = () => {
    if (folderStack.length === 0) return;
    const prevFolderId = folderStack[folderStack.length - 1];
    setFolderStack(folderStack.slice(0, -1));
    setCurrentFolderId(prevFolderId);
    setFolderNames(folderNames.slice(0, -1));
    fetchFiles(token, prevFolderId);
  };

  const handleUpload = async (file) => {
    setUploadingFileId(file.id);
    setUploadMessage("");
    const res = await fetch("http://localhost:8000/upload-from-google-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_id: file.id,
        access_token: token,
        filename: file.name,
      }),
    });
    const data = await res.json();
    setUploadingFileId(null);
    setUploadMessage(data.message || data.error || "Upload complete");
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
          <div style={{ maxWidth: 520, width: '100%', background: "rgba(30,41,59,0.93)", borderRadius: 18, boxShadow: "0 4px 24px rgba(99,102,241,0.13)", padding: "2.5rem 2rem", color: "#e0e7ef", minHeight: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Google Drive Files</h2>
            {uploadMessage && (
              <div style={{ color: uploadMessage.includes("success") ? "#38bdf8" : "#f87171", margin: "10px 0", textAlign: 'center' }}>{uploadMessage}</div>
            )}
            {currentFolderId !== "root" && (
              <button onClick={handleBack} style={{ marginBottom: 10, background: '#232d3b', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontWeight: 600, cursor: 'pointer' }}>
                ← Back
              </button>
            )}
            <ul style={{ maxHeight: 340, overflowY: 'auto', padding: 0, listStyle: 'none', width: '100%' }}>
              {files.length === 0 && <li>No files found.</li>}
              {files.map(file => (
                file.mimeType === "application/vnd.google-apps.folder" ? (
                  <li key={file.id} style={{ marginBottom: 8, padding: 6, borderRadius: 8, background: '#232d3b', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => handleFolderClick(file)}>
                    <span>📁 {file.name}</span>
                  </li>
                ) : (
                  <li key={file.id} style={{ marginBottom: 8, padding: 6, borderRadius: 8, background: '#232d3b', color: '#fff', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{file.name}</span>
                    <button onClick={() => handleUpload(file)} disabled={uploadingFileId === file.id} style={{ marginLeft: 10, background: '#38bdf8', color: '#10141c', border: 'none', borderRadius: 8, padding: '4px 12px', fontWeight: 600, cursor: uploadingFileId === file.id ? 'not-allowed' : 'pointer' }}>
                      {uploadingFileId === file.id ? 'Uploading...' : 'Upload'}
                    </button>
                  </li>
                )
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
