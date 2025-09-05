import React from "react";
import { useQuery } from '@tanstack/react-query';

export default function UploadedFilesTable() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['files', 'list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/files/list');
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    // Cache and reuse between pages for snappy navigation
    staleTime: 60 * 1000,
  });
  const files = data?.files ?? [];

  return (
    <div className="gdrive-table-responsive" style={{ width: '100%', minWidth: 0, maxWidth: '100vw', margin: '0 auto', background: 'transparent', overflow: 'visible', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {/* Hide scrollbar for Webkit browsers */}
      <style>{`.gdrive-table-responsive::-webkit-scrollbar { display: none !important; }`}</style>
      <table style={{
        width: '100%',
        minWidth: 700,
        borderCollapse: 'separate',
        borderSpacing: 0,
        background: 'rgba(30,41,59,0.97)',
        borderRadius: 18,
        boxShadow: '0 2px 16px #0002',
        fontFamily: 'Inter, Arial, sans-serif',
        overflow: 'hidden',
        color: '#e0e7ef',
        border: '1.5px solid #334155',
      }}>
        <thead>
          <tr style={{ background: 'rgba(51,65,85,0.97)' }}>
            <th style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(51,65,85,0.97)',
              padding: 16,
              textAlign: 'center',
              fontWeight: 700,
              color: '#cbd5e1',
              borderBottom: '2px solid #475569',
              borderRight: '1.5px solid #334155',
              minWidth: 220
            }}>Name</th>
            <th style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(51,65,85,0.97)',
              padding: 16,
              textAlign: 'center',
              fontWeight: 700,
              color: '#cbd5e1',
              borderBottom: '2px solid #475569',
              borderRight: '1.5px solid #334155',
              minWidth: 160
            }}>Last Modified</th>
            <th style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(51,65,85,0.97)',
              padding: 16,
              textAlign: 'center',
              fontWeight: 700,
              color: '#cbd5e1',
              borderBottom: '2px solid #475569',
              minWidth: 110
            }}>Size</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={3} style={{ color: '#64748b', textAlign: 'center', padding: 22, background: 'rgba(30,41,59,0.97)' }}>Loading...</td></tr>
          ) : error ? (
            <tr><td colSpan={3} style={{ color: 'red', textAlign: 'center', padding: 22, background: 'rgba(30,41,59,0.97)' }}>{error.message || 'Failed to fetch files'}</td></tr>
          ) : files.length === 0 ? (
            <tr><td colSpan={3} style={{ color: '#64748b', textAlign: 'center', padding: 22, background: 'rgba(30,41,59,0.97)' }}>No files uploaded yet.</td></tr>
          ) : (
            files.map((file, idx) => (
              <tr key={file.name || idx} style={{ background: idx % 2 === 0 ? 'rgba(30,41,59,0.97)' : 'rgba(51,65,85,0.93)' }}>
                <td style={{
                  padding: 14,
                  color: '#f1f5f9',
                  fontWeight: 500,
                  borderBottom: '1.5px solid #334155',
                  borderRight: '1.5px solid #334155',
                  minWidth: 220,
                  maxWidth: 500,
                  overflowWrap: 'anywhere',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: 15
                }}>{file.name}</td>
                <td style={{
                  padding: 14,
                  color: '#cbd5e1',
                  borderBottom: '1.5px solid #334155',
                  borderRight: '1.5px solid #334155',
                  minWidth: 160,
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}>{file.lastModified ? formatDate(file.lastModified) : '-'}</td>
                <td style={{
                  padding: 14,
                  color: '#cbd5e1',
                  borderBottom: '1.5px solid #334155',
                  minWidth: 110,
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}>{file.size ? formatSize(file.size) : '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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