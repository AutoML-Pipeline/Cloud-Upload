import React, { useEffect, useState } from "react";
import styles from "./AutoModelSelection.module.css";
import ShadcnNavbar from "../components/ShadcnNavbar";
import { toast } from "react-hot-toast";

const apiBase = "http://127.0.0.1:8000";

export default function AutoModelSelection() {
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState("");
  const [task, setTask] = useState("classification");
  const [preference, setPreference] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${apiBase}/api/auto-ml/files/engineered`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) {
          setFiles(d);
          if (!filename && d.length > 0) setFilename(d[0]);
        } else {
          setFiles([]);
        }
      })
      .catch(() => setFiles([]));
  }, []);

  const recommend = async () => {
    if (!filename) {
      toast.error("Please select a file");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${apiBase}/api/auto-ml/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, task, preference: preference || null }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.detail || data?.error || "Failed to get recommendations");
      }
      setResult(data);
    } catch (e) {
      toast.error(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageShell}>
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          <div className={styles.card}>
            <h2 className={styles.heading}>Auto Model Selection</h2>
            <p className={styles.description}>Pick an engineered file and task. We will suggest the top 3 models with simple reasons.</p>

            <div className={styles.formRow}>
              <label className={styles.label}>Engineered File (feature-engineered)</label>
              <select className={styles.select} value={filename} onChange={(e) => setFilename(e.target.value)}>
                {files.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Task</label>
              <select className={styles.select} value={task} onChange={(e) => setTask(e.target.value)}>
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
                <option value="clustering">Clustering</option>
                <option value="time_series">Time Series</option>
              </select>
            </div>

            <div className={styles.formRow}>
              <label className={styles.label}>Preference (optional)</label>
              <select className={styles.select} value={preference} onChange={(e) => setPreference(e.target.value)}>
                <option value="">None</option>
                <option value="speed">Speed</option>
                <option value="accuracy">Accuracy</option>
                <option value="interpretability">Interpretability</option>
              </select>
            </div>

            <div className={styles.buttonRow}>
              <button className={styles.primaryBtn} disabled={loading || !filename} onClick={recommend}>
                {loading ? "Analyzing..." : "Recommend Models"}
              </button>
            </div>

            {result && (
              <div className={styles.resultsCard}>
                <h3 className={styles.subHeading}>Top Recommendations</h3>
                <div className={styles.recsColumn}>
                  {result.recommendations?.map((r, idx) => (
                    <div key={idx} className={styles.recItem}>
                      <div className={styles.recHeader}>
                        <div className={styles.modelTitle}>{r.model_family}</div>
                        <div className={styles.libraryTag}>{r.library}</div>
                      </div>
                      <div className={styles.rationale}>{r.rationale_simple}</div>
                      <div className={styles.whenToUse}><strong>Best when:</strong> {r.when_to_use}</div>
                      {r.needs_preprocessing?.length > 0 && (
                        <div className={styles.notes}><strong>Needs:</strong> {r.needs_preprocessing.join(", ")}</div>
                      )}
                      {r.caveats?.length > 0 && (
                        <div className={styles.notes}><strong>Watch out for:</strong> {r.caveats.join(", ")}</div>
                      )}
                      <div className={styles.timeBand}><strong>Estimated training time:</strong> {r.est_training_time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


