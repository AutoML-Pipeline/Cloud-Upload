import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import SQLPreviewBox from "../../components/SQLPreviewBox";
import { toast } from 'react-hot-toast';
import styles from "../upload-file/UploadFile.module.css";

export default function UploadSQLWorkbench() {
  const [host, setHost] = useState("");
  const [port, setPort] = useState("3306");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [connected, setConnected] = useState(false);
  const [databases, setDatabases] = useState([]);
  const [database, setDatabase] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [renamedFilename, setRenamedFilename] = useState(""); // New state for renamed filename
  const contentRef = useRef(null);
  const navigate = useNavigate(); // Initialize useNavigate

  const showScrollableDatabaseList = connected && databases.length > 6;

  // Load saved inputs from localStorage on component mount
  useEffect(() => {
    const savedInputs = localStorage.getItem('sqlWorkbenchInputs');
    if (savedInputs) {
      try {
        const parsed = JSON.parse(savedInputs);
        setHost(parsed.host || "");
        setPort(parsed.port || "3306");
        setUser(parsed.user || "");
        setPassword(parsed.password || "");
        setDatabase(parsed.database || "");
        setQuery(parsed.query || "");
      } catch (error) {
        console.error('Error loading saved inputs:', error);
      }
    }
  }, []);

  // Save inputs to localStorage whenever they change
  const saveInputs = (newInputs) => {
    try {
      localStorage.setItem('sqlWorkbenchInputs', JSON.stringify(newInputs));
    } catch (error) {
      console.error('Error saving inputs:', error);
    }
  };

  // Update host and save
  const handleHostChange = (e) => {
    const value = e.target.value;
    setHost(value);
    saveInputs({ host: value, port, user, password, database, query });
  };

  // Update port and save
  const handlePortChange = (e) => {
    const value = e.target.value;
    setPort(value);
    saveInputs({ host, port: value, user, password, database, query });
  };

  // Update user and save
  const handleUserChange = (e) => {
    const value = e.target.value;
    setUser(value);
    saveInputs({ host, port, user: value, password, database, query });
  };

  // Update password and save
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    saveInputs({ host, port, user, password: value, database, query });
  };

  // Update database and save
  const handleDatabaseChange = (e) => {
    const value = e.target.value;
    setDatabase(value);
    saveInputs({ host, port, user, password, database: value, query });
  };

  // Update query and save
  const handleQueryChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    saveInputs({ host, port, user, password, database, query: value });
  };

  const handleRenamedFilenameChange = (e) => {
    const inputName = e.target.value;
    const baseName = inputName.split('.')[0];
    setRenamedFilename(`${baseName}.parquet`);
  };

  const handleConnect = async () => {
    setStatus("");
    setUploading(true);
    setPreview(null);
    setDatabases([]);
    setConnected(false);
    try {
      const res = await fetch("http://localhost:8000/sql-list-databases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, password })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Error: " + data.error);
        setStatus("Error: " + data.error);
      } else {
        setDatabases(data.databases || []);
        setConnected(true);
        toast.success("Connected! Select a database and enter your query.");
        setStatus("Connected! Select a database and enter your query.");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
      setStatus("Error: " + err.message);
    }
    setUploading(false);
  };

  const handlePreview = async () => {
    setStatus("");
    setUploading(true);
    setPreview(null);
    try {
      const res = await fetch("http://localhost:8000/sql-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, password, database, query })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Error: " + data.error);
        setStatus("Error: " + data.error);
      } else {
        setPreview(data.preview);
        toast.success("Preview fetched successfully!");
      }
    } catch (err) {
      toast.error("Error: " + err.message);
      setStatus("Error: " + err.message);
    }
    setUploading(false);
  };

  const handleUpload = async () => {
    setStatus("");
    setUploading(true);
    try {
      const payload = { host, port, user, password, database, query };
      if (renamedFilename) {
        payload.filename = renamedFilename; // Add renamed filename to payload
      }
      const res = await fetch("http://localhost:8000/upload-from-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Upload failed: " + data.error);
        setStatus("Upload failed: " + data.error);
      } else {
        toast.success("Upload successful: " + data.message);
        setStatus("Upload successful: " + data.message);
        if (data.filename) {
            navigate(`/preprocessing?file=${encodeURIComponent(data.filename)}`);
        }
      }
    } catch (err) {
      toast.error("Upload failed: " + err.message);
      setStatus("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  React.useEffect(() => {
    let ctx;
    let mounted = true;
    if (contentRef.current) {
      import('gsap').then(({ gsap }) => {
        if (!mounted) return;
        ctx = gsap.context(() => {
          gsap.fromTo(
            contentRef.current,
            { autoAlpha: 0, y: 26, filter: "blur(8px)", scale: 0.97 },
            { autoAlpha: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.45, ease: "power3.out" }
          );
        }, contentRef);
      });
    }
    return () => {
      mounted = false;
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.layout}>
          <section className={styles.card} ref={contentRef}>
            <header className={styles.header}>
              <span className={styles.kicker}>Database intake</span>
              <h1 className={styles.title}>Query your SQL workbench</h1>
              <p className={styles.subtitle}>
                Connect to MySQL-compatible databases, preview your query output, and land the results as an optimized
                Parquet file for downstream steps.
              </p>
            </header>

            <form onSubmit={e => e.preventDefault()} className={styles.formStack}>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="host">Host</label>
                  <input
                    className={styles.inputControl}
                    id="host"
                    placeholder="e.g. localhost"
                    value={host}
                    onChange={handleHostChange}
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="port">Port</label>
                  <input
                    className={styles.inputControl}
                    id="port"
                    placeholder="3306"
                    value={port}
                    onChange={handlePortChange}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="user">Username</label>
                  <input
                    className={styles.inputControl}
                    id="user"
                    placeholder="Database user"
                    value={user}
                    onChange={handleUserChange}
                    autoComplete="off"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="password">Password</label>
                  <input
                    className={styles.inputControl}
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className={styles.buttonRow}>
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={handleConnect}
                  disabled={uploading}
                >
                  {uploading ? "Connecting…" : connected ? "Reconnect" : "Connect to database"}
                </button>
                {connected && <span className={styles.inlineBadge}>Connected</span>}
              </div>
              <p className={styles.supportingNote}>
                Connection details stay in your browser and auto-fill next time you return to this workbench.
              </p>

              {connected && (
                <>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="database">Database</label>
                    <select
                      className={`${styles.inputControl} ${showScrollableDatabaseList ? styles.databaseSelectScrollable : ""}`.trim()}
                      id="database"
                      value={database}
                      onChange={handleDatabaseChange}
                      size={showScrollableDatabaseList ? Math.min(databases.length, 8) : undefined}
                    >
                      <option value="">Select database…</option>
                      {databases.map(db => (
                        <option key={db} value={db}>
                          {db}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.fieldLabel} htmlFor="query">SQL query</label>
                    <textarea
                      className={`${styles.inputControl} ${styles.textareaControl}`}
                      id="query"
                      rows={6}
                      placeholder="SELECT * FROM table_name LIMIT 100"
                      value={query}
                      onChange={handleQueryChange}
                    />
                    <p className={styles.supportingNote}>
                      Limit large result sets for faster previews. Full results will be exported during upload.
                    </p>
                  </div>

                  {preview && (
                    <div className={styles.field}>
                      <label className={styles.fieldLabel} htmlFor="rename-file">
                        Save as
                        <span>.parquet with query timestamp</span>
                      </label>
                      <input
                        type="text"
                        id="rename-file"
                        value={renamedFilename}
                        onChange={handleRenamedFilenameChange}
                        className={styles.inputControl}
                        placeholder="e.g. customer_orders"
                      />
                    </div>
                  )}

                  <div className={styles.buttonRow}>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      onClick={handlePreview}
                      disabled={uploading || !database || !query}
                    >
                      Preview query
                    </button>
                    <button
                      className={styles.primaryButton}
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading || !database || !query}
                    >
                      Upload result
                    </button>
                  </div>
                </>
              )}
            </form>

            {status && (
              <div
                className={`${styles.status} ${status.startsWith("Error") || status.startsWith("Upload failed") ? styles.statusError : styles.statusSuccess}`}
              >
                {status}
              </div>
            )}

            {preview && (
              <div className={styles.previewSection}>
                <div className={styles.previewHeader}>Preview result</div>
                <div className={styles.previewBody}>
                  <SQLPreviewBox preview={preview} />
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
