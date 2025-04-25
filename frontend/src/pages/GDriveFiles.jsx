import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import GDriveFilesTable from "../components/GDriveFilesTable";
import { Toaster, toast } from 'react-hot-toast';

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
    try {
      const res = await fetch("http://localhost:8000/upload-from-google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: file.id,
          access_token: token,
          filename: file.name
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Uploaded '${file.name}' successfully!`);
      } else {
        toast.error(`Failed to upload '${file.name}': ${data.detail || res.status}`);
      }
    } catch (e) {
      toast.error(`Error uploading '${file.name}': ${e.message}`);
    }
    setUploadingFileId(null);
  };

  const handleFolderNavigation = (folder) => {
    setCurrentFolderId(folder.id);
    setFiles([]); // Clear current files for loading effect
    setUploadMessage("");
    // Refetch files from API for the selected folder
    fetchFiles(token, folder.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="page-fullscreen">
      <Toaster position="top-right" />
      <div style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <ShadcnNavbar onLogout={() => {
          localStorage.removeItem("user");
          localStorage.removeItem("google_access_token");
          localStorage.removeItem("access_token");
          sessionStorage.clear();
          window.location.replace("/");
        }} />
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
        <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}>
          <div style={{ marginLeft: 32, marginTop: 24, zIndex: 10001, pointerEvents: 'auto', position: 'relative' }}>
            <GlobalBackButton />
          </div>
        </div>
        <div style={{
          width: '100vw',
          minHeight: 'calc(100vh - 54px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          margin: 0,
          position: 'relative',
          background: 'none',
        }}>
          <div style={{
            width: '100%',
            maxWidth: 1400,
            minWidth: 1100,
            borderRadius: 18,
            boxShadow: '0 4px 24px rgba(99,102,241,0.13)',
            padding: '2.5rem 2rem',
            color: '#1e293b',
            minHeight: 500,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            margin: 0,
            position: 'relative',
            zIndex: 2,
            overflow: 'visible', // remove scrollbars
            scrollbarWidth: 'none', // Firefox
            msOverflowStyle: 'none', // IE/Edge
          }}>
            <style>{`div::-webkit-scrollbar { display: none !important; }`}</style>
            <h2 style={{
              fontSize: 34,
              fontWeight: 900,
              marginBottom: 24,
              textAlign: 'center',
              letterSpacing: '-0.04em',
              color: '#38bdf8', // sky blue accent
              textShadow: '0 2px 24px #0ea5e9cc, 0 1px 0 #181c24',
              fontFamily: 'Montserrat, Poppins, Arial, sans-serif',
              background: 'linear-gradient(90deg,#38bdf8 0%,#2563eb 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 14px #0ea5e9cc)',
            }}>
              Google Drive Files
            </h2>
            <div style={{ width: '100%', height: '60vh', overflow: 'auto', margin: '0 auto', position: 'relative', zIndex: 3 }}>
              <GDriveFilesTable
                gdriveFiles={files}
                onUpload={handleUpload}
                onFolderClick={handleFolderClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
