import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import styles from "../upload-file/UploadFile.module.css";

export default function UploadUrl() {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [renamedFilename, setRenamedFilename] = useState(""); // New state for renamed filename
  const navigate = useNavigate(); // Initialize useNavigate

  // Effect to set initial filename from URL if available
  React.useEffect(() => {
    if (url) {
      try {
        // If it's a Hugging Face dataset URL, pull a nicer default name
        if (/huggingface\.co\/datasets\//.test(url) || url.startsWith('hf://')) {
          const clean = url.replace(/^hf:\/\//, 'https://');
          const urlObj = new URL(clean);
          const segs = urlObj.pathname.split('/').filter(Boolean);
          // segs: [datasets, ns, name, resolve|blob, rev, ...file]
          const name = segs[2];
          const filePart = segs.slice(5).join('/') || `${name}.parquet`;
          const baseName = (filePart.split('/').pop() || `${name}`).split('.').slice(0, -1).join('.') || name;
          setRenamedFilename(`${baseName}.parquet`);
          return;
        }
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
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }
      toast.success(data.message || "Uploaded!");
      if (data.filename) {
        navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
      }
    } catch {
      toast.error("Upload failed");
    }
    setUploading(false);
  };

  // No inline styles needed; all styling handled via Tailwind classes above.

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.layout}>
          <section className={styles.card}>
            <header className={styles.header}>
              <span className={styles.kicker}>Remote file</span>
              <h1 className={styles.title}>Fetch from a URL</h1>
              <p className={styles.subtitle}>
                Paste a direct link to a file or a Hugging Face dataset file URL (e.g. https://huggingface.co/datasets/&lt;org&gt;/&lt;name&gt;/resolve/main/data.parquet).
                We’ll fetch it and store as cloud‑optimized Parquet in MinIO.
              </p>
            </header>

            <div className={styles.inlineForm}>
              <input
                id="file-url"
                type="text"
                placeholder="https://example.com/data.csv"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className={styles.pillInput}
              />
              <button onClick={handleUpload} disabled={uploading} className={styles.pillButton}>
                {uploading ? "Fetching…" : "Fetch & save"}
              </button>
            </div>
            <p className={styles.helperText}>
              Supports CSV, TSV, Excel, JSON, Parquet. For Hugging Face, use a file URL under the dataset’s repository.
            </p>

            {url && (
              <div className={styles.renameBlock}>
                <label className={styles.label} htmlFor="rename-url-file">
                  Save as
                  <span>.parquet with automatic timestamp</span>
                </label>
                <input
                  type="text"
                  id="rename-url-file"
                  value={renamedFilename}
                  onChange={handleRenamedFilenameChange}
                  placeholder="e.g. marketing_spend"
                  className={styles.textInput}
                />
              </div>
            )}

            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Auto filename</div>
                <div className={styles.featureDescription}>
                  We infer a clean dataset name from your URL and keep everything in sync across preprocessing steps.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Integrity checks</div>
                <div className={styles.featureDescription}>
                  Validation catches unreachable links, download errors, or unsupported formats before they waste time.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Immediate pipeline</div>
                <div className={styles.featureDescription}>
                  Successful ingests drop you straight into preprocessing with the dataset preloaded for transformation.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
