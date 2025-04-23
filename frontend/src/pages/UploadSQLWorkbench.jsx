import React, { useState, useRef } from "react";
import Button from "../components/Button";
import GlobalBackButton from "../components/GlobalBackButton";
import UploadedFilesTable from '../components/UploadedFilesTable';
import { SPLINE_URL } from "./Login";
import SQLPreviewBox from "../components/SQLPreviewBox";
import { toast } from 'react-hot-toast';

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
      const res = await fetch("http://localhost:8000/upload-from-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, user, password, database, query })
      });
      const data = await res.json();
      if (data.error) {
        toast.error("Upload failed: " + data.error);
        setStatus("Upload failed: " + data.error);
      } else {
        toast.success("Upload successful: " + data.message);
        setStatus("Upload successful: " + data.message);
      }
    } catch (err) {
      toast.error("Upload failed: " + err.message);
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
    <div className="page-fullscreen" style={{ display: 'block', minHeight: 0, height: 'auto', width: '100vw', background: 'black', overflowY: 'auto', position: 'relative' }}>
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
          zIndex: 0,
          top: 0,
          left: 0,
          pointerEvents: splineLoaded ? 'auto' : 'none',
          opacity: splineLoaded ? 1 : 0,
          transition: "opacity 0.5s"
        }}
        onLoad={() => setSplineLoaded(true)}
      />
      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 1200, margin: '0 auto', padding: 32, background: 'rgba(0,0,0,0.7)', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.8)', minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Global Back Button (left-aligned, below navbar, with high z-index and pointerEvents) */}
        <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 10000, pointerEvents: 'auto' }}>
          <div style={{ marginLeft: 32, marginTop: 24, zIndex: 10001, pointerEvents: 'auto' }}>
            <GlobalBackButton />
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <UploadedFilesTable />
        </div>
        <h2 style={{ color: 'white', marginBottom: 24, marginTop: 40 }}>Upload from SQL Workbench</h2>
        {/* Responsive and scrollable wrapper for the SQL Workbench section */}
        <div style={{
          width: '100%',
          maxWidth: 700,
          margin: '0 auto',
          background: 'rgba(30,41,59,0.90)',
          borderRadius: 14,
          boxShadow: '0 2px 16px rgba(30,41,59,0.18)',
          padding: 24,
          overflowY: 'auto',
          maxHeight: '70vh',
          marginBottom: 32,
        }}>
          {/* Responsive CSS for mobile/tablet */}
          <style>{`
            @media (max-width: 900px) {
              .sql-workbench-form-fields { flex-direction: column !important; gap: 0 !important; }
              .sql-workbench-form-fields > div, .sql-workbench-form-fields input, .sql-workbench-form-fields select, .sql-workbench-form-fields textarea { width: 100% !important; min-width: 0 !important; margin-bottom: 14px !important; }
            }
            @media (max-width: 600px) {
              .sql-workbench-form-fields { padding: 0 !important; }
            }
          `}</style>
          <div ref={contentRef} className="sql-workbench-form-fields" style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 260, width: '100%' }}>
              {/* Step 1: Connection */}
              <input style={inputStyle} placeholder="Host" value={host} onChange={e => setHost(e.target.value)} />
              <input style={inputStyle} placeholder="Port" value={port} onChange={e => setPort(e.target.value)} />
              <input style={inputStyle} placeholder="User" value={user} onChange={e => setUser(e.target.value)} />
              <input style={inputStyle} placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              {!connected && <Button onClick={handleConnect} disabled={uploading}>Connect</Button>}
              {/* Step 2: Database & Query */}
              {connected && (
                <>
                  <select style={{ ...inputStyle, color: database ? '#e0e7ef' : '#a3aed6', background: "rgba(30,41,59,0.85)" }} value={database} onChange={e => setDatabase(e.target.value)}>
                    <option value="" style={{ color: '#a3aed6' }}>Select Database</option>
                    {databases.map(db => <option key={db} value={db}>{db}</option>)}
                  </select>
                  <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} rows={4} placeholder="SQL Query" value={query} onChange={e => setQuery(e.target.value)} />
                  <div style={{ display: 'flex', gap: 16, width: '100%', justifyContent: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    <Button onClick={handlePreview} disabled={uploading || !database || !query}>Preview</Button>
                    <Button onClick={handleUpload} disabled={uploading || !database || !query}>Upload to MinIO</Button>
                  </div>
                  {/* Show SQL preview result here, if available */}
                  {preview && (
                    <div style={{ marginTop: 24, marginBottom: 8 }}>
                      <h3 style={{ color: '#e0e7ef', fontSize: 18, marginBottom: 8, fontWeight: 600 }}>Preview Result</h3>
                      <div style={{ background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 6px rgba(30,41,59,0.09)', overflowX: 'auto', maxHeight: 340 }}>
                        <SQLPreviewBox preview={preview} />
                      </div>
                    </div>
                  )}
                </>
              )}
              {status && !status.startsWith('Upload successful:') && (
                <div style={{ marginTop: 18, textAlign: 'center', color: '#60a5fa', fontWeight: 500 }}>{status}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
