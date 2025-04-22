import React, { useEffect, useState } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";

export default function Preprocessing() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [steps, setSteps] = useState({ drop_nulls: false, fill_nulls: false, remove_duplicates: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/list_uploaded_files")
      .then(res => res.json())
      .then(data => setFiles(data.files || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("filename", selectedFile);
      Object.entries(steps).forEach(([key, val]) => {
        if (val) formData.append("steps", key);
      });
      const res = await fetch("http://localhost:8000/data_preprocessing", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (err) {
      setError("Failed to preprocess: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fullscreen">
      {/* Spline animated background */}
      {/* GlobalBackButton always visible and above background */}
      <div style={{ position: 'absolute', top: 24, left: 32, zIndex: 5 }}>
        <GlobalBackButton />
      </div>
      <ShadcnNavbar />
      {/* Spline background with low z-index */}
      <iframe
        src="https://my.spline.design/cubes-11XksX5PbLLeQrFYk69YghaQ/"
        frameBorder="0"
        title="Spline 3D Background"
        allowFullScreen
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0, // ensure background stays behind
          pointerEvents: 'none',
          background: 'transparent',
          maxWidth: '100vw',
          maxHeight: '100vh',
          overflow: 'hidden',
        }}
      />
      {/* Main card above background with higher z-index */}
      <div style={{ width: '100%', minHeight: 'calc(100vh - 54px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 520, width: '100%', background: "rgba(30,41,59,0.93)", borderRadius: 18, boxShadow: "0 4px 24px rgba(99,102,241,0.13)", padding: "2.5rem 2rem", color: "#e0e7ef", minHeight: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', maxHeight: '75vh', scrollBehavior: 'smooth', scrollbarWidth: 'thin', scrollbarColor: '#38bdf8 #22304a', zIndex: 3 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Data Preprocessing</h2>
          <form onSubmit={handleSubmit} style={{ width: '100%', marginBottom: 18 }}>
            <label style={{ color: '#a3aed6', fontWeight: 600, marginBottom: 8, display: 'block' }}>Select File:</label>
            <select value={selectedFile} onChange={e => setSelectedFile(e.target.value)} style={{ width: '100%', padding: '0.6rem 1rem', borderRadius: 10, background: 'rgba(30,41,59,0.85)', color: '#e0e7ef', border: '1px solid #334155', fontSize: 16, marginBottom: 18 }} required>
              <option value="" disabled>Select a file...</option>
              {files.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <div style={{ marginBottom: 18 }}>
              <label style={{ marginRight: 18 }}>
                <input type="checkbox" checked={steps.drop_nulls} onChange={e => setSteps(s => ({ ...s, drop_nulls: e.target.checked }))} /> Drop Nulls
              </label>
              <label style={{ marginRight: 18 }}>
                <input type="checkbox" checked={steps.fill_nulls} onChange={e => setSteps(s => ({ ...s, fill_nulls: e.target.checked }))} /> Fill Nulls (0)
              </label>
              <label>
                <input type="checkbox" checked={steps.remove_duplicates} onChange={e => setSteps(s => ({ ...s, remove_duplicates: e.target.checked }))} /> Remove Duplicates
              </label>
            </div>
            <button type="submit" disabled={loading || !selectedFile} style={{ width: '100%', background: "linear-gradient(90deg, #6366f1 0%, #1e293b 100%)", color: "#e0e7ef", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 4px 24px rgba(99,102,241,0.18)", cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: "0.04em", marginBottom: 10, transition: "all 0.18s" }}>
              {loading ? "Processing..." : "Preprocess"}
            </button>
          </form>
          {error && <div style={{ color: "#f87171", marginTop: 8 }}>{error}</div>}
          {result && (
            <div style={{ width: '100%', marginTop: 16 }}>
              <h3 style={{ color: '#38bdf8', fontWeight: 800, fontSize: 22, marginBottom: 18, marginTop: 14, textAlign: 'center', letterSpacing: '0.02em' }}>
                Preprocessed Data Preview
              </h3>
              {result.preview && Array.isArray(result.preview) && result.preview.length > 0 && (
                <>
                  <h3 style={{ color: '#38bdf8', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>Preview (first 10 rows)</h3>
                  <div style={{ overflowX: 'auto', marginBottom: 12 }}>
                    <table className="data" style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(30,41,59,0.92)', color: '#e0e7ef' }}>
                      <thead>
                        <tr>
                          {Object.keys(result.preview[0] || {}).map(col => <th key={col} style={{ borderBottom: '1.5px solid #334155', padding: '6px 10px', color: '#38bdf8', fontWeight: 600 }}>{col}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {result.preview.map((row, idx) => (
                          <tr key={idx}>
                            {Object.values(row).map((val, i) => <td key={i} style={{ padding: '6px 10px', borderBottom: '1px solid #22304a', color: '#e0e7ef' }}>{val}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {result.dtypes_table && Array.isArray(result.dtypes_table) && result.dtypes_table.length > 0 && (
                <>
                  <h4 style={{ color: '#60a5fa', fontWeight: 700, fontSize: 17, margin: '14px 0 6px 0' }}>Column Types (Dtypes)</h4>
                  <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                    <table className="data" style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(30,41,59,0.92)', color: '#e0e7ef' }}>
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1.5px solid #334155', padding: '6px 10px', color: '#38bdf8', fontWeight: 600 }}>Column Name</th>
                          <th style={{ borderBottom: '1.5px solid #334155', padding: '6px 10px', color: '#38bdf8', fontWeight: 600 }}>Data Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dtypes_table.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #22304a', color: '#e0e7ef' }}>{row.column}</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #22304a', color: '#a3aed6' }}>{row.dtype}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {result.nulls_table && Array.isArray(result.nulls_table) && result.nulls_table.length > 0 && (
                <>
                  <h4 style={{ color: '#60a5fa', fontWeight: 700, fontSize: 17, margin: '14px 0 6px 0' }}>Null Counts (Missing Values)</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data" style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(30,41,59,0.92)', color: '#e0e7ef' }}>
                      <thead>
                        <tr>
                          <th style={{ borderBottom: '1.5px solid #334155', padding: '6px 10px', color: '#38bdf8', fontWeight: 600 }}>Column Name</th>
                          <th style={{ borderBottom: '1.5px solid #334155', padding: '6px 10px', color: '#38bdf8', fontWeight: 600 }}>Null Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.nulls_table.map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #22304a', color: '#e0e7ef' }}>{row.column}</td>
                            <td style={{ padding: '6px 10px', borderBottom: '1px solid #22304a', color: '#fbbf24' }}>{row.null_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
