import React, { useState } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import GlobalBackButton from "../components/GlobalBackButton"; // Import the GlobalBackButton component
import { toast } from 'react-hot-toast';
import styles from "./UploadFile.module.css";

export default function UploadFile() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [renamedFilename, setRenamedFilename] = useState(""); // New state for renamed filename
  const navigate = useNavigate(); // Initialize useNavigate

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const fileNameWithoutExtension = selectedFile.name.split('.').slice(0, -1).join('.');
      setRenamedFilename(`${fileNameWithoutExtension}.parquet`); // Initialize with original filename, force .parquet
    }
  };

  const handleRenamedFilenameChange = (e) => {
    const inputName = e.target.value;
    const baseName = inputName.split('.')[0];
    setRenamedFilename(`${baseName}.parquet`);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    if (!renamedFilename.trim()) {
      toast.error("Please enter a valid filename.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("new_filename", renamedFilename); // Append the renamed filename
      const res = await fetch("http://localhost:8000/files/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unknown upload error");
      }
      toast.success(data.message || "Uploaded!");
      if (data.filename) {
        navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Upload failed: " + error.message);
    }
    setUploading(false);
  };

  const fileInputId = "dataset-upload-input";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.layout}>
          <GlobalBackButton />
          <section className={styles.card}>
            <header className={styles.header}>
              <span className={styles.kicker}>Dataset intake</span>
              <h1 className={styles.title}>Upload your dataset</h1>
              <p className={styles.subtitle}>
                Bring your CSV, Excel, JSON, or Parquet file. We’ll store it as an optimized Parquet file
                so downstream preprocessing stays lightning fast.
              </p>
            </header>

            <label className={styles.dropZone} htmlFor={fileInputId}>
              <input
                id={fileInputId}
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls,.json,.parquet"
                onChange={handleFileChange}
                className={styles.nativeInput}
              />
              <span className={styles.fileStatus}>{file ? "File ready" : "Step 1"}</span>
              <span className={styles.fileName}>
                {file ? file.name : "Drag in or click to browse your dataset"}
              </span>
              <span className={styles.fileHint}>Automatic validation & schema detection</span>
            </label>

            {file && (
              <div className={styles.renameBlock}>
                <label className={styles.label} htmlFor="rename-file">
                  Save as
                  <span>.parquet for cloud-ready performance</span>
                </label>
                <input
                  type="text"
                  id="rename-file"
                  value={renamedFilename}
                  onChange={handleRenamedFilenameChange}
                  className={styles.textInput}
                  placeholder="e.g. churn_customers"
                />
              </div>
            )}

            <div className={styles.actions}>
              <button onClick={handleUpload} disabled={uploading} className={styles.primaryButton}>
                {uploading ? "Uploading…" : "Upload dataset"}
              </button>
              <p className={styles.note}>
                Your file remains private and is processed securely inside your workspace.
              </p>
            </div>

            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Quality checks</div>
                <div className={styles.featureDescription}>
                  Instant validation flags missing headers, incompatible types, and duplicate rows before they spread.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Smart conversion</div>
                <div className={styles.featureDescription}>
                  Automatic Parquet conversion keeps your data lightweight and analytics-ready without extra steps.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Seamless hand-off</div>
                <div className={styles.featureDescription}>
                  Jump directly into preprocessing with preserved column metadata and profile insights.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
