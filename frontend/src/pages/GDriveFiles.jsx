import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import GDriveFilesTable from "../components/GDriveFilesTable";
import FloatingFilesPanel from "../components/FloatingFilesPanel";
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
    <div className="page-shell">
      <Toaster position="top-right" />
      <div className="min-h-screen w-screen overflow-hidden relative flex flex-col items-center justify-center">
        <ShadcnNavbar onLogout={() => {
          localStorage.removeItem("user");
          localStorage.removeItem("google_access_token");
          localStorage.removeItem("access_token");
          sessionStorage.clear();
          window.location.replace("/");
        }} />
        <div className="w-full flex justify-start items-center relative z-[10000] pointer-events-auto">
          <div className="ml-8 mt-6 z-[10001] pointer-events-auto relative">
            <GlobalBackButton />
          </div>
        </div>
        <div className="w-screen min-h-[calc(100vh-54px)] flex items-center justify-center p-0 m-0 relative">
          <div className="w-full max-w-[1400px] min-w-[1100px] rounded-2xl shadow-soft p-10 text-slate-800 min-h-[500px] flex flex-col items-center justify-start m-0 relative z-2 overflow-visible">
            <h2 className="text-[34px] font-black mb-6 text-center tracking-tighter bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_2px_14px_#0ea5e9cc]">Google Drive Files</h2>
            <div className="w-full h-[60vh] overflow-auto mx-auto relative z-3">
              <GDriveFilesTable
                gdriveFiles={files}
                onUpload={handleUpload}
                onFolderClick={handleFolderClick}
              />
            </div>
          </div>
        </div>
      </div>
      <FloatingFilesPanel position="top-right" offsetTop={80} label="Show Uploaded Files" />
    </div>
  );
}
