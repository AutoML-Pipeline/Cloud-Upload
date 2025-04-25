import React from "react";

export default function GDriveFilesTable({ gdriveFiles, onUpload, onFolderClick }) {
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
              minWidth: 120
            }}>Type</th>
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
            }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {gdriveFiles && gdriveFiles.length > 0 ? gdriveFiles.map((file, idx) => {
            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
            return (
              <tr key={file.id || idx} style={{ background: idx % 2 === 0 ? 'rgba(30,41,59,0.97)' : 'rgba(51,65,85,0.93)' }}>
                <td style={{
                  padding: 14,
                  color: '#f1f5f9',
                  fontWeight: 500,
                  borderBottom: '1.5px solid #334155',
                  borderRight: '1.5px solid #334155',
                  minWidth: 220,
                  maxWidth: 500,
                  overflowWrap: 'anywhere',
                  cursor: isFolder ? 'pointer' : 'default',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}
                  onClick={isFolder ? () => onFolderClick && onFolderClick(file) : undefined}>
                  {isFolder ? <span role="img" aria-label="folder">📁 </span> : null}{file.name}
                </td>
                <td style={{
                  padding: 14,
                  color: '#cbd5e1',
                  borderBottom: '1.5px solid #334155',
                  borderRight: '1.5px solid #334155',
                  minWidth: 120,
                  verticalAlign: 'middle',
                  textAlign: 'center',
                }}>{file.mimeType || '-'}</td>
                <td style={{
                  padding: 14,
                  textAlign: 'center',
                  borderBottom: '1.5px solid #334155',
                  minWidth: 110,
                  verticalAlign: 'middle',
                }}>
                  {isFolder ? (
                    <button
                      style={{ background: '#fde68a', color: '#1e293b', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
                      onClick={() => onFolderClick && onFolderClick(file)}
                    >
                      Open
                    </button>
                  ) : (
                    <button
                      style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 18px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
                      onClick={() => onUpload(file)}
                    >
                      Upload
                    </button>
                  )}
                </td>
              </tr>
            );
          }) : (
            <tr><td colSpan={3} style={{ color: '#64748b', textAlign: 'center', padding: 22, background: 'rgba(30,41,59,0.97)' }}>No Google Drive files found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatSize(size) {
  if (!size || isNaN(size)) return '-';
  if (typeof size === 'string') size = parseInt(size, 10);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
