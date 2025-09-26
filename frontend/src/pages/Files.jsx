import React from 'react';
// import UploadedFilesTable from "../components/UploadedFilesTable"; // Removed UploadedFilesTable import
import GlobalBackButton from "../components/GlobalBackButton";

export default function FilesPage() {
  return (
    <div className="page-fullscreen" style={{ background: 'black', minHeight: '100vh' }}>
      <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ position: 'absolute', left: 24, top: 24, zIndex: 10 }}>
          <GlobalBackButton />
        </div>
        <div style={{ width: 'min(1200px, 92vw)', background: 'rgba(17,24,39,0.9)', border: '1px solid #334155', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', padding: 24 }}>
          <h2 style={{ color: '#e0e7ef', marginBottom: 16, fontWeight: 800, letterSpacing: '0.02em' }}>Uploaded Files</h2>
          {/* <UploadedFilesTable /> */}
          <p style={{ color: '#cbd5e1', textAlign: 'center', marginTop: '20px' }}>This page is no longer in use.</p>
        </div>
      </div>
    </div>
  );
}


