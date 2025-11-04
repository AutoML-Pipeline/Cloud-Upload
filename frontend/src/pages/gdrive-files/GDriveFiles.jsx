import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GDriveFilesTable from "../../components/GDriveFilesTable";
import saasToast from '@/utils/toast';
import styles from "./GDriveFiles.module.css";

const ROOT_FOLDER_ID = "root";

export default function GDriveFiles() {
  const location = useLocation();
  const navigate = useNavigate();
  const [token, setToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(ROOT_FOLDER_ID);
  const [folderStack, setFolderStack] = useState([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [fileToRename, setFileToRename] = useState(null);
  const [newGDriveFilename, setNewGDriveFilename] = useState("");
  const [currentFolderLabel, setCurrentFolderLabel] = useState("My Drive");

  const fetchFiles = useCallback(
    async (accessToken, folderId = ROOT_FOLDER_ID) => {
      try {
        const res = await fetch(
          `http://localhost:8000/gdrive/list-files?access_token=${accessToken}&folder_id=${folderId}`
        );

        if (!res.ok) {
          const err = await res.text();
          setFiles([]);
          setUploadMessage(`Error: ${res.status} - ${err}`);
          return;
        }

        const data = await res.json();
        const nextFiles = data.files || [];
        setFiles(nextFiles);
        setUploadMessage(nextFiles.length ? "" : "No files found in Google Drive.");
      } catch (error) {
        setFiles([]);
        setUploadMessage(`Failed to fetch files: ${error.message}`);
      }
    },
    []
  );

  useEffect(() => {
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
    setCurrentFolderId(ROOT_FOLDER_ID);
    setCurrentFolderLabel("My Drive");
    setFolderStack([]);
    fetchFiles(accessToken, ROOT_FOLDER_ID);
  }, [fetchFiles, location.search, navigate]);

  useEffect(() => {
    if (token) {
      localStorage.setItem("google_access_token", token);
    }
  }, [token]);

  const handleFolderClick = useCallback(
    (folder) => {
      if (!token) return;
      setFolderStack((prev) => [...prev, { id: currentFolderId, name: currentFolderLabel }]);
      setCurrentFolderId(folder.id);
      setCurrentFolderLabel(folder.name || "Untitled Folder");
      fetchFiles(token, folder.id);
    },
    [currentFolderId, currentFolderLabel, fetchFiles, token]
  );

  const handleFolderBack = useCallback(() => {
    if (!token || folderStack.length === 0) return;

    const nextStack = [...folderStack];
    const parent = nextStack.pop() ?? { id: ROOT_FOLDER_ID, name: "My Drive" };
    setFolderStack(nextStack);
    setCurrentFolderId(parent.id);
    setCurrentFolderLabel(parent.name);
    fetchFiles(token, parent.id);
  }, [folderStack, fetchFiles, token]);

  const handleUpload = (file) => {
    setFileToRename(file);
    const fileNameWithoutExtension = file.name.split(".").slice(0, -1).join(".");
    setNewGDriveFilename(`${fileNameWithoutExtension || "google_drive_file"}.parquet`);
    setShowRenameModal(true);
  };

  const handleConfirmRenameUpload = async () => {
    if (!newGDriveFilename.trim()) {
          saasToast.error("Please enter a valid filename.", { idKey: 'gdrive-filename-invalid' });
      return;
    }
    if (!fileToRename || !token) {
          saasToast.error("Error: No file selected or access token missing.", { idKey: 'gdrive-missing-input' });
      return;
    }

    setShowRenameModal(false);
    setUploadMessage("");

    try {
      const res = await fetch("http://localhost:8000/upload-from-google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_id: fileToRename.id,
          access_token: token,
          filename: newGDriveFilename,
        }),
      });

      const data = await res.json();
      if (res.ok) {
            saasToast.dataLaunched({ idKey: 'gdrive-upload-success' });
        if (data.filename) {
          navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
            } else {
              saasToast.info("File uploaded. Open Preprocessing to continue.", { idKey: 'gdrive-upload-generic' });
        }
      } else {
            saasToast.error(`Failed to upload '${newGDriveFilename}': ${data.detail || res.status}`, { idKey: 'gdrive-upload-error' });
      }
    } catch (error) {
          saasToast.error(`Error uploading '${newGDriveFilename}': ${error.message}`, { idKey: 'gdrive-upload-exception' });
    } finally {
      setFileToRename(null);
      setNewGDriveFilename("");
    }
  };

  const handleCloseRenameModal = () => {
    setShowRenameModal(false);
    setFileToRename(null);
    setNewGDriveFilename("");
  };

  const handleNewGDriveFilenameChange = (event) => {
    const inputName = event.target.value;
    const baseName = inputName.split(".")[0];
    setNewGDriveFilename(`${baseName}.parquet`);
  };

  const atRoot = currentFolderId === ROOT_FOLDER_ID;
  const itemsLabel = files.length === 1 ? "1 item" : `${files.length} items`;

  return (
    <div className={styles.page}>
      <Toaster position="top-right" />
      <div className={styles.container}>
        <section className={styles.card}>
          <header className={styles.header}>
            <div className={styles.titleBlock}>
              <h1 className={styles.title}>Google Drive Explorer</h1>
              <p className={styles.subtitle}>
                Browse your Drive, preview folder contents, and upload files directly into your workflow.
              </p>
              <span className={styles.statusNote}>
                {itemsLabel} · {atRoot ? "My Drive" : "Nested folder"}
              </span>
            </div>
            <div className={styles.toolbar}>
              <span className={styles.breadcrumb}>
                <span className={styles.folderIcon} aria-hidden="true">
                  📂
                </span>
                {atRoot ? "My Drive" : `Folder • ${currentFolderLabel}`}
              </span>
              {folderStack.length > 0 && (
                <button type="button" className={styles.primaryButton} onClick={handleFolderBack}>
                  ← Up one level
                </button>
              )}
            </div>
          </header>

          {uploadMessage && <div className={styles.message}>{uploadMessage}</div>}

          <section className={styles.tableSection}>
            <div className={styles.tableScroller}>
              <GDriveFilesTable
                gdriveFiles={files}
                onUpload={handleUpload}
                onFolderClick={handleFolderClick}
              />
            </div>
          </section>
        </section>
      </div>

      {showRenameModal && fileToRename && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="rename-gdrive-file">
            <h3 id="rename-gdrive-file" className={styles.modalTitle}>
              Rename File for Upload
            </h3>
            <div>
              <span className={styles.modalFieldLabel}>Original filename</span>
              <p>{fileToRename.name}</p>
            </div>
            <div>
              <span className={styles.modalFieldLabel}>Upload as</span>
              <input
                type="text"
                value={newGDriveFilename}
                onChange={handleNewGDriveFilenameChange}
                className={styles.modalInput}
                placeholder="Enter a new file name"
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalSecondary} onClick={handleCloseRenameModal}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.modalPrimary}
                onClick={handleConfirmRenameUpload}
                disabled={!newGDriveFilename.trim()}
              >
                Upload as {newGDriveFilename}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
