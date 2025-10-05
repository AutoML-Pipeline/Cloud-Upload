import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import styles from "../upload-file/UploadFile.module.css";

const HF_URL_RE = /^(hf:\/\/datasets\/|https?:\/\/huggingface\.co\/datasets\/)/i;

export default function ImportHuggingFace() {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!url) return;
    try {
      const normalized = url.startsWith('hf://') ? url.replace(/^hf:\/\//, 'https://') : url;
      const u = new URL(normalized);
      const segs = u.pathname.split('/').filter(Boolean);
      // [datasets, ns, name, resolve|blob, rev, ...path]
      const dataset = segs[2] || "dataset";
      const filePart = segs.slice(5).join('/') || `${dataset}.parquet`;
      const base = (filePart.split('/').pop() || dataset).split('.').slice(0, -1).join('.') || dataset;
      setFilename(`${base}.parquet`);
    } catch {
      setFilename("downloaded_file.parquet");
    }
  }, [url]);

  const handleSubmit = async () => {
    if (!url || !HF_URL_RE.test(url)) {
      toast.error("Please enter a valid Hugging Face datasets URL.");
      return;
    }
    if (!filename.trim().endsWith('.parquet')) {
      toast.error("Filename must end with .parquet");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/api/data/files/upload-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      toast.success(data.message || 'Imported');
      if (data.filename) navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
    } catch (e) {
      toast.error(e.message || "Import failed");
    }
    setUploading(false);
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.layout}>
          <section className={styles.card}>
            <header className={styles.header}>
              <span className={styles.kicker}>Hugging Face</span>
              <h1 className={styles.title}>Import from datasets</h1>
              <p className={styles.subtitle}>
                Paste a dataset file URL like
                {" "}
                <code>https://huggingface.co/datasets/&lt;org&gt;/&lt;name&gt;/resolve/main/data/train.parquet</code>
                {" "}or use the <code>hf://datasets/&lt;org&gt;/&lt;name&gt;/path/to/file</code> shorthand.
              </p>
            </header>

            <div className={styles.inlineForm}>
              <input
                id="hf-url"
                type="text"
                placeholder="https://huggingface.co/datasets/.../resolve/main/data.parquet"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className={styles.pillInput}
              />
              <button onClick={handleSubmit} disabled={uploading} className={styles.pillButton}>
                {uploading ? "Importing…" : "Import"}
              </button>
            </div>
            <p className={styles.helperText}>
              Only Hugging Face dataset file links are accepted here. For generic URLs, consider other ingestion methods.
            </p>

            {url && (
              <div className={styles.renameBlock}>
                <label className={styles.label} htmlFor="hf-filename">
                  Save as <span>.parquet</span>
                </label>
                <input
                  type="text"
                  id="hf-filename"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value.replace(/\.(?!parquet$).*/i, '') + '.parquet')}
                  placeholder="dataset_split"
                  className={styles.textInput}
                />
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
