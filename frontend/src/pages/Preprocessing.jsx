import React, { useEffect, useState } from "react";
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import UploadedFilesTable from '../components/UploadedFilesTable';
import { toast } from 'react-hot-toast';

export default function Preprocessing() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [preSteps, setPreSteps] = useState({
    drop_nulls: { enabled: false },
    fill_nulls: { enabled: false },
    remove_duplicates: { enabled: false },
    impute_missing: { enabled: false, strategy: 'mean', constant: '' },
    one_hot: { enabled: false },
    scaling: { enabled: false, method: 'standard' },
    remove_outliers: { enabled: false, method: 'iqr', preview: false }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:8000/files/list")
      .then(res => res.json())
      .then(data => setFiles(data.files || []));
  }, []);

  const handlePreStepChange = (step, key, value) => {
    setPreSteps(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [key]: value
      }
    }));
  };

  const handlePreStepToggle = (step) => {
    setPreSteps(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        enabled: !prev[step].enabled
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`http://localhost:8000/data/preprocess/${selectedFile}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: preSteps }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
        setError(data.error);
      } else {
        toast.success("Preprocessing completed!");
        setResult(data);
      }
    } catch (err) {
      toast.error("Failed to preprocess: " + err.message);
      setError("Failed to preprocess: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-fullscreen">
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      {/* Spline animated background */}
      {/* GlobalBackButton always visible and above background */}
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
      <div style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: 1600,
        margin: '48px auto 0 auto',
        padding: 48,
        background: 'rgba(0,0,0,0.7)',
        borderRadius: 16,
        boxShadow: '0 4px 32px rgba(0,0,0,0.8)',
        minHeight: '80vh',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
      }}>
        {/* Global Back Button (left-aligned, below navbar, with high z-index and pointerEvents) */}
        <div style={{ position: 'absolute', left: 0, top: 0, zIndex: 10000, pointerEvents: 'auto' }}>
          <div style={{ marginLeft: 32, marginTop: 24, zIndex: 10001, pointerEvents: 'auto' }}>
            <GlobalBackButton />
          </div>
        </div>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, marginBottom: 32, marginTop: 56 }}>
          <div style={{
            maxWidth: 1200,
            width: '100%',
            background: "rgba(30,41,59,0.93)",
            borderRadius: 18,
            boxShadow: "0 4px 24px rgba(99,102,241,0.13)",
            padding: "3rem 3rem",
            color: '#e0e7ef',
            minHeight: 420,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            overflow: 'visible',
            maxHeight: '90vh',
            zIndex: 3,
          }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 18, textAlign: 'center' }}>Data Preprocessing</h2>
            <div style={{ width: '100%', overflowY: 'auto', maxHeight: '70vh', paddingRight: 8 }}>
              <form onSubmit={handleSubmit} style={{ width: '100%', marginBottom: 18 }}>
                <label style={{ color: '#a3aed6', fontWeight: 600, marginBottom: 8, display: 'block' }}>Select File:</label>
                <select
                  value={selectedFile}
                  onChange={e => setSelectedFile(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 1rem',
                    borderRadius: 10,
                    background: 'rgba(30,41,59,0.85)',
                    color: '#e0e7ef',
                    border: '1px solid #334155',
                    fontSize: 16,
                    marginBottom: 18,
                    maxHeight: 180,
                    overflowY: 'auto',
                    display: 'block',
                  }}
                  size={files.length > 8 ? 8 : undefined}
                  required
                >
                  <option value="" disabled>Select a file...</option>
                  {files.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <div style={{ width: '100%', margin: '24px 0 32px 0', background: 'rgba(51,65,85,0.11)', borderRadius: 12, padding: 18 }}>
                  <h3 style={{ color: '#38bdf8', fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Preprocessing Options</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Drop Nulls */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.drop_nulls.enabled} onChange={() => handlePreStepToggle('drop_nulls')} />
                      Drop Nulls
                    </label>
                    {/* Fill Nulls */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.fill_nulls.enabled} onChange={() => handlePreStepToggle('fill_nulls')} />
                      Fill Nulls
                    </label>
                    {/* Remove Duplicates */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.remove_duplicates.enabled} onChange={() => handlePreStepToggle('remove_duplicates')} />
                      Remove Duplicates
                    </label>
                    {/* Impute Missing Values */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.impute_missing.enabled} onChange={() => handlePreStepToggle('impute_missing')} />
                      Impute Missing Values
                      {preSteps.impute_missing.enabled && (
                        <>
                          <select value={preSteps.impute_missing.strategy} onChange={e => handlePreStepChange('impute_missing', 'strategy', e.target.value)} style={{ marginLeft: 8 }}>
                            <option value="mean">Mean</option>
                            <option value="median">Median</option>
                            <option value="mode">Mode</option>
                            <option value="constant">Constant</option>
                          </select>
                          {preSteps.impute_missing.strategy === 'constant' && (
                            <input type="text" placeholder="Constant value" value={preSteps.impute_missing.constant} onChange={e => handlePreStepChange('impute_missing', 'constant', e.target.value)} style={{ marginLeft: 8, width: 100 }} />
                          )}
                        </>
                      )}
                    </label>
                    {/* One-Hot Encoding */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.one_hot.enabled} onChange={() => handlePreStepToggle('one_hot')} />
                      Apply One-Hot Encoding to Categorical Columns
                    </label>
                    {/* Feature Scaling */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.scaling.enabled} onChange={() => handlePreStepToggle('scaling')} />
                      Scale Numeric Features
                      {preSteps.scaling.enabled && (
                        <select value={preSteps.scaling.method} onChange={e => handlePreStepChange('scaling', 'method', e.target.value)} style={{ marginLeft: 8 }}>
                          <option value="standard">Standard</option>
                          <option value="minmax">Min-Max</option>
                        </select>
                      )}
                    </label>
                    {/* Remove Outliers */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={preSteps.remove_outliers.enabled} onChange={() => handlePreStepToggle('remove_outliers')} />
                      Remove Outliers
                      {preSteps.remove_outliers.enabled && (
                        <>
                          <select value={preSteps.remove_outliers.method} onChange={e => handlePreStepChange('remove_outliers', 'method', e.target.value)} style={{ marginLeft: 8 }}>
                            <option value="iqr">IQR</option>
                            <option value="zscore">Z-score</option>
                          </select>
                          <label style={{ marginLeft: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input type="checkbox" checked={preSteps.remove_outliers.preview} onChange={e => handlePreStepChange('remove_outliers', 'preview', e.target.checked)} />
                            Preview Outliers Before Removal
                          </label>
                        </>
                      )}
                    </label>
                  </div>
                </div>
                <button type="submit" disabled={loading || !selectedFile} style={{ width: '100%', background: "linear-gradient(90deg, #6366f1 0%, #1e293b 100%)", color: "#e0e7ef", fontWeight: 600, borderRadius: 12, fontSize: 18, padding: "0.75rem 2rem", border: "none", boxShadow: "0 4px 24px rgba(99,102,241,0.18)", cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: "0.04em", marginBottom: 10, transition: "all 0.18s" }}>
                  {loading ? "Processing..." : "Preprocess"}
                </button>
              </form>
              {result && (
                <div style={{ width: '100vw', maxWidth: '100vw', margin: '0 -48px', marginTop: 16, overflowX: 'auto', overflowY: 'hidden', background: 'rgba(30,41,59,0.97)', borderRadius: 14, border: '2px solid #334155', boxShadow: '0 2px 18px #232b3890', padding: 18, position: 'relative', left: '50%', right: '50%', transform: 'translateX(-50%)' }}>
                  {result.preview && Array.isArray(result.preview) && result.preview.length > 0 && (
                    <>
                      <h4 style={{ color: '#60a5fa', fontWeight: 700, fontSize: 17, margin: '14px 0 6px 0' }}>Preview (First 10 Rows)</h4>
                      <div style={{ overflowX: 'auto', overflowY: 'hidden', marginBottom: 10 }}>
                        <table className="data" style={{ width: 'max-content', minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0, background: 'rgba(30,41,59,0.97)', borderRadius: 12, color: '#e0e7ef', fontFamily: 'Inter, Arial, sans-serif', boxShadow: '0 2px 12px #0002', border: '1.5px solid #334155' }}>
                          <thead>
                            <tr style={{ background: 'rgba(51,65,85,0.97)' }}>
                              {Object.keys(result.preview[0] || {}).map(col => <th key={col} style={{ position: 'sticky', top: 0, background: 'rgba(51,65,85,0.97)', borderBottom: '2px solid #475569', color: '#cbd5e1', fontWeight: 700, padding: '12px 18px', textAlign: 'center', zIndex: 2, fontSize: 15, minWidth: 180, borderRight: '1.5px solid #334155', whiteSpace: 'nowrap' }}>{col}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {result.preview.map((row, idx) => (
                              <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(30,41,59,0.97)' : 'rgba(51,65,85,0.93)' }}>
                                {Object.values(row).map((val, i) => <td key={i} style={{ borderBottom: '1.5px solid #334155', padding: '10px 18px', color: '#f1f5f9', fontWeight: 500, background: 'transparent', fontFamily: 'monospace', fontSize: 15, textAlign: 'center', minWidth: 180, borderRight: '1.5px solid #334155', overflow: 'auto', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</td>)}
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
              {result && (
                <div style={{ width: '100%', marginTop: 16, overflowX: 'auto' }}>
                  {result.cleaned_filename && (
                    <button
                      style={{
                        marginTop: 16,
                        width: '100%',
                        background: 'linear-gradient(90deg, #22d3ee 0%, #6366f1 100%)',
                        color: '#1e293b',
                        fontWeight: 700,
                        borderRadius: 12,
                        fontSize: 18,
                        padding: '0.75rem 2rem',
                        border: 'none',
                        boxShadow: '0 4px 24px rgba(34,211,238,0.15)',
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                        transition: 'all 0.18s',
                      }}
                      onClick={async () => {
                        try {
                          const res = await fetch(`http://localhost:8000/download_cleaned_file/${encodeURIComponent(result.cleaned_filename)}`);
                          if (!res.ok) throw new Error('Failed to download cleaned file');
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = result.cleaned_filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                          toast.success('Cleaned data downloaded as Parquet!');
                        } catch (e) {
                          toast.error('Failed to download cleaned file');
                        }
                      }}
                    >
                      Download Cleaned Data as Parquet
                    </button>
                  )}
                  {result.cleaned_filename && result.temp_cleaned_path && (
                    <button
                      style={{
                        marginTop: 12,
                        width: '100%',
                        background: 'linear-gradient(90deg, #38bdf8 0%, #22d3ee 100%)',
                        color: '#1e293b',
                        fontWeight: 700,
                        borderRadius: 12,
                        fontSize: 18,
                        padding: '0.75rem 2rem',
                        border: 'none',
                        boxShadow: '0 4px 24px rgba(34,211,238,0.15)',
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                        transition: 'all 0.18s',
                      }}
                      onClick={async () => {
                        try {
                          const res = await fetch('http://localhost:8000/save_cleaned_to_minio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              temp_cleaned_path: result.temp_cleaned_path,
                              cleaned_filename: result.cleaned_filename
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success(data.message || 'Saved to MinIO!');
                          } else {
                            toast.error(data.error || 'Failed to save to MinIO');
                          }
                        } catch (e) {
                          toast.error('Failed to save to MinIO');
                        }
                      }}
                    >
                      Save to MinIO
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <UploadedFilesTable />
        </div>
      </div>
    </div>
  );
}
