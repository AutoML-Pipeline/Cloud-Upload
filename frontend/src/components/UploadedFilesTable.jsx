import React, { useEffect, useState } from "react";

export default function UploadedFilesTable() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchFiles = () => {
    setRefreshing(true);
    setLoading(true);
    fetch("http://localhost:8000/list_uploaded_files")
      .then(res => res.json())
      .then(data => {
        setFiles(data.files || []);
        setLoading(false);
        setRefreshing(false);
      })
      .catch(err => {
        setError("Failed to fetch files");
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{
      width: "96%",
      maxWidth: 1100,
      margin: "32px auto 0 auto",
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 2px 24px rgba(30,41,59,0.13)",
      padding: 24,
      border: '1px solid #e5e7eb',
    }}>
      {/* Inline style for sticky header */}
      <style>{`
        .uploaded-files-table-wrapper { max-height: 320px; overflow-y: auto; width: 100%; }
        .uploaded-files-table { width: 100%; border-collapse: collapse; table-layout: fixed; background: white; }
        .uploaded-files-table thead th { position: sticky; top: 0; background: #f3f4f6; z-index: 2; }
        .uploaded-files-table th, .uploaded-files-table td { padding: 10px 18px; font-size: 15px; text-align: left; }
        .uploaded-files-table th { color: #334155; font-weight: 700; }
        .uploaded-files-table td { color: #334155; font-weight: 400; background: transparent; }
        .refresh-btn { background: #f3f4f6; border: none; color: #2563eb; font-weight: 600; border-radius: 8px; padding: 6px 16px; margin-left: 10px; cursor: pointer; transition: background 0.15s; }
        .refresh-btn:hover { background: #e0e7ef; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18, justifyContent: 'space-between' }}>
        <h3 style={{ color: '#1e293b', fontSize: 22, fontWeight: 700, margin: 0 }}>Uploaded Files</h3>
        <button className="refresh-btn" onClick={fetchFiles} disabled={refreshing || loading} title="Refresh file list">
          {refreshing ? 'Refreshing...' : '⟳ Refresh'}
        </button>
      </div>
      {loading ? (
        <div style={{ color: '#64748b' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: 'red' }}>{error}</div>
      ) : files.length === 0 ? (
        <div style={{ color: '#64748b' }}>No files uploaded yet.</div>
      ) : (
        <div className="uploaded-files-table-wrapper">
          <table className="uploaded-files-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'Inter, Arial, sans-serif', background: 'white' }}>
            <thead>
              <tr>
                <th style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 700, borderBottom: '2px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 700, borderBottom: '2px solid #e5e7eb' }}>Last Modified</th>
                <th style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 700, borderBottom: '2px solid #e5e7eb' }}>Size</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file, idx) => (
                <tr key={file.name || idx} style={{ borderBottom: '1px solid #e5e7eb', transition: 'background 0.2s', cursor: 'pointer' }}
                  onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 400, background: 'transparent', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ color: '#2563eb', fontWeight: 500, fontFamily: 'monospace', fontSize: 15, wordBreak: 'break-all' }}>
                      {file.name}
                    </span>
                  </td>
                  <td style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 400, background: 'transparent', borderBottom: '1px solid #e5e7eb' }}>{file.lastModified ? formatDate(file.lastModified) : '-'}</td>
                  <td style={{ padding: 10, fontSize: 15, textAlign: 'left', color: '#334155', fontWeight: 400, background: 'transparent', borderBottom: '1px solid #e5e7eb' }}>{file.size ? formatSize(file.size) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(dt) {
  try {
    const d = new Date(dt);
    if (!isNaN(d)) {
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return isToday ? `Today, ${time}` : d.toLocaleString();
    }
    return dt;
  } catch {
    return dt;
  }
}

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}