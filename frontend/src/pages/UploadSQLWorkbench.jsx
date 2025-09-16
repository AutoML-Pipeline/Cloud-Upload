import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import Button from "../components/Button";
import GlobalBackButton from "../components/GlobalBackButton";
import ShadcnNavbar from "../components/ShadcnNavbar";
import SQLPreviewBox from "../components/SQLPreviewBox";
import { toast } from 'react-hot-toast';
import '../auth.css';

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
    if (contentRef.current) {
      import('gsap').then(({ gsap }) => {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 52, filter: "blur(16px)", scale: 0.93 },
          { opacity: 1, y: 0, filter: "blur(0px)", scale: 1, duration: 0.6, ease: "power2.out" }
        );
      });
    }
  }, []);

  return (
    <div className="page-shell" style={{ overflowY: 'auto', minHeight: '100vh' }}>
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div className="absolute left-8 top-[70px] z-[10000] pointer-events-auto">
        <GlobalBackButton />
      </div>
      <div style={{ paddingTop: 90, paddingBottom: 48, width: '100%', minHeight: 'calc(100vh - 138px)' }}>
        <div className="page-center" style={{ minHeight: 'auto', padding: '20px 0' }}>
          <div className="auth-card" ref={contentRef} style={{ maxWidth: 600, width: '100%', position: 'relative', zIndex: 2, pointerEvents: 'auto' }}>
            <div className="auth-title">Upload from SQL Workbench</div>
            <form className="auth-form" onSubmit={e => e.preventDefault()}>
              <input
                className="auth-input"
                id="host"
                placeholder="Host (e.g. localhost)"
                value={host}
                onChange={handleHostChange}
                autoComplete="off"
              />
              <input
                className="auth-input"
                id="port"
                placeholder="Port (default: 3306)"
                value={port}
                onChange={handlePortChange}
                autoComplete="off"
              />
              <input
                className="auth-input"
                id="user"
                placeholder="Username"
                value={user}
                onChange={handleUserChange}
                autoComplete="off"
              />
              <input
                className="auth-input"
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={handlePasswordChange}
                autoComplete="off"
              />
              {!connected && (
                <button
                  className="auth-btn"
                  type="button"
                  onClick={handleConnect}
                  disabled={uploading}
                  style={{ marginTop: 10 }}
                >
                  {uploading ? 'Connecting...' : 'Connect to Database'}
                </button>
              )}
              {connected && (
                <>
                  <select
                    className="auth-input"
                    id="database"
                    value={database}
                    onChange={handleDatabaseChange}
                  >
                    <option value="">Select Database</option>
                    {databases.map(db => <option key={db} value={db}>{db}</option>)}
                  </select>
                  <textarea
                    className="auth-input"
                    id="query"
                    rows={4}
                    placeholder="SQL Query (e.g. SELECT * FROM table_name)"
                    value={query}
                    onChange={handleQueryChange}
                  />
                  {preview && (
                    <div className="mt-4 w-full">
                      <label htmlFor="rename-file" className="block text-sm font-medium text-gray-700 mb-1">Rename File (will be saved as .parquet):</label>
                      <input
                        type="text"
                        id="rename-file"
                        value={renamedFilename}
                        onChange={handleRenamedFilenameChange}
                        className="auth-input"
                        placeholder="Enter new file name"
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      className="auth-btn"
                      type="button"
                      onClick={handlePreview}
                      disabled={uploading || !database || !query}
                    >
                      Preview Query
                    </button>
                    <button
                      className="auth-btn"
                      type="button"
                      onClick={handleUpload}
                      disabled={uploading || !database || !query}
                    >
                      Upload to MinIO
                    </button>
                  </div>
                </>
              )}
              {status && (
                <div style={{ marginTop: 12, color: status.startsWith('Error') || status.startsWith('Upload failed') ? '#dc2626' : '#059669', fontWeight: 500, textAlign: 'center', fontSize: 15 }}>
                  {status}
                </div>
              )}
            </form>
            {preview && (
              <div style={{ width: '100%', marginTop: 24 }}>
                <div style={{ fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>Preview Result</div>
                <div style={{ background: '#f3f4f6', borderRadius: 8, padding: 12, overflow: 'auto', maxHeight: 300 }}>
                  <SQLPreviewBox preview={preview} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
