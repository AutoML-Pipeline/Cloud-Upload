import React, { useState, useRef } from "react";
import Button from "../components/Button";
import GlobalBackButton from "../components/GlobalBackButton";
import { SPLINE_URL } from "./Login";
import SQLPreviewBox from "../components/SQLPreviewBox";

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
  const [splineLoaded, setSplineLoaded] = useState(false);
  const contentRef = useRef(null);

  React.useEffect(() => {
    if (splineLoaded && contentRef.current) {
      import('gsap').then(({ gsap }) => {
        gsap.fromTo(
          contentRef.current,
          { opacity: 0, y: 52, filter: "blur(16px)", scale: 0.93 },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            scale: 1,
            duration: 1.15,
            ease: "expo.inOut"
          }
        );
      });
    }
  }, [splineLoaded]);

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
      if (data.error) setStatus("Error: " + data.error);
      else {
        setDatabases(data.databases || []);
        setConnected(true);
        setStatus("Connected! Select a database and enter your query.");
      }
    } catch (err) {
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
      if (data.error) setStatus("Error: " + data.error);
      else setPreview(data.preview);
    } catch (err) {
      setStatus("Error: " + err.message);
    }
    setUploading(false);
  };

  const handleUpload = async () => {
    setStatus("");
    setUploading(true);
    try {
      const res = await fetch("http://localhost:8000/upload-from-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, password, database, query })
      });
      const data = await res.json();
      if (data.error) setStatus("Upload failed: " + data.error);
      else setStatus("Upload successful: " + data.message);
    } catch (err) {
      setStatus("Upload failed: " + err.message);
    }
    setUploading(false);
  };

  const inputStyle = {
    width: "100%",
    maxWidth: 340,
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    border: "1px solid #334155",
    background: "rgba(30,41,59,0.85)",
    color: "#e0e7ef",
    fontSize: 16,
    outline: "none",
    marginTop: 2,
    marginBottom: 10,
    boxSizing: "border-box",
    fontFamily: "'Poppins', 'Segoe UI', 'Montserrat', 'Roboto', Arial, sans-serif",
    fontWeight: 500
  };

  return (
    <div className="page-fullscreen" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'black' }}>
      {/* Spline 3D background */}
      <iframe
        src={SPLINE_URL}
        frameBorder="0"
        title="Cubes 3D Background"
        allowFullScreen
        style={{
          width: "100vw",
          height: "100vh",
          border: "none",
          display: "block",
          position: "fixed",
          top: 0,
          left: 0,
          background: "black",
          zIndex: 0,
          opacity: splineLoaded ? 1 : 0,
          transition: "opacity 0.38s cubic-bezier(.77,0,.18,1)"
        }}
        onLoad={() => setSplineLoaded(true)}
      />
      {/* Global back button */}
      <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 10001, pointerEvents: 'auto' }}>
        <GlobalBackButton />
      </div>
      <div style={{
        position: 'relative',
        zIndex: 10,
        width: '100%',
        maxWidth: 900,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(24, 28, 37, 0.80)',
        borderRadius: 18,
        boxShadow: '0 8px 32px rgba(30,41,59,0.45)',
        padding: '2.5rem 2rem 1.5rem 2rem',
        marginTop: 48,
        marginBottom: 32,
        minHeight: 480,
      }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#e0e7ef', textAlign: 'center', marginBottom: 24 }}>Upload from SQL Workbench</h2>
        {/* Step 1: Connection */}
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 270 }}>
            <input style={inputStyle} placeholder="Host" value={host} onChange={e => setHost(e.target.value)} disabled={connected} />
            <input style={inputStyle} placeholder="Port" value={port} onChange={e => setPort(e.target.value)} disabled={connected} />
            <input style={inputStyle} placeholder="User" value={user} onChange={e => setUser(e.target.value)} disabled={connected} />
            <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={connected} />
            {!connected && <Button onClick={handleConnect} disabled={uploading}>Connect</Button>}
            {/* Step 2: Database & Query */}
            {connected && (
              <>
                <select style={{ ...inputStyle, color: database ? '#e0e7ef' : '#a3aed6', background: "rgba(30,41,59,0.85)" }} value={database} onChange={e => setDatabase(e.target.value)}>
                  <option value="" style={{ color: '#a3aed6' }}>Select Database</option>
                  {databases.map(db => <option key={db} value={db}>{db}</option>)}
                </select>
                <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} rows={4} placeholder="SQL Query" value={query} onChange={e => setQuery(e.target.value)} />
                <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center', marginBottom: 8 }}>
                  <Button onClick={handlePreview} disabled={uploading || !database || !query}>Preview</Button>
                  <Button onClick={handleUpload} disabled={uploading || !database || !query}>Upload to MinIO</Button>
                </div>
              </>
            )}
            {status && <div style={{ marginTop: 18, textAlign: 'center', color: '#60a5fa', fontWeight: 500 }}>{status}</div>}
          </div>
          {/* Preview Section - always visible on the right (or below on mobile) */}
          <div style={{ flex: 1.3, minWidth: 320, maxHeight: 420, overflowY: 'auto', background: 'rgba(255,255,255,0.92)', borderRadius: 14, boxShadow: '0 2px 12px #232b3860', padding: 16, marginTop: connected ? 0 : 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 17, color: '#22223b' }}>Preview</span>
              {preview && (
                <button
                  aria-label="Clear preview"
                  onClick={() => setPreview(null)}
                  style={{
                    background: 'rgba(30,41,59,0.85)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    fontSize: 16,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px #232b3840',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                  title="Clear preview"
                >
                  ×
                </button>
              )}
            </div>
            {preview ? (
              <SQLPreviewBox preview={preview} />
            ) : (
              <div style={{ color: '#64748b', fontSize: 15, textAlign: 'center', marginTop: 30 }}>
                {connected ? 'Click Preview to see results here.' : 'Connect and enter a query to see preview.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
