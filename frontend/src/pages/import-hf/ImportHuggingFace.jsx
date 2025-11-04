import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import saasToast from '@/utils/toast';
import styles from "../upload-file/UploadFile.module.css";
import UploadProgress from "../../components/UploadProgress";
import { useUploadProgress } from "../../hooks/useUploadProgress";

const HF_URL_RE = /^(hf:\/\/datasets\/|https?:\/\/huggingface\.co\/datasets\/)/i;

export default function ImportHuggingFace() {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filename, setFilename] = useState("");
  const navigate = useNavigate();
  const { uploads, startUpload, removeUpload } = useUploadProgress();

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
      saasToast.error("Please enter a valid Hugging Face datasets URL.", { idKey: 'hf-url-invalid' });
      return;
    }
    if (!filename.trim().endsWith('.parquet')) {
      saasToast.error("Filename must end with .parquet", { idKey: 'hf-filename-invalid' });
      return;
    }
    setUploading(true);

    // Use the upload progress hook with axios
    await startUpload({
      url: "http://localhost:8000/api/data/files/upload-from-url",
      data: { url, filename },
      filename: filename,
      onSuccess: (data) => {
        saasToast.dataLaunched({ idKey: 'hf-import-success' });
        if (data.filename) navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
        setUploading(false);
      },
      onError: (error) => {
        const message = error.response?.data?.error || error.message || "Import failed";
        saasToast.error(message, { idKey: 'hf-import-error' });
        setUploading(false);
      }
    });
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

      {/* Upload Progress Indicators */}
      {uploads.map((upload) => (
        <UploadProgress
          key={upload.id}
          filename={upload.filename}
          progress={upload.progress}
          loaded={upload.loaded}
          total={upload.total}
          rate={upload.rate}
          elapsed={upload.elapsed}
          show={upload.show}
          onClose={() => removeUpload(upload.id)}
        />
      ))}
    </div>
  );
}
