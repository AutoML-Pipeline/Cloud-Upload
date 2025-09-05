import React from 'react';
import { useNavigate } from 'react-router-dom';

// Lightweight floating button that routes to the Files page
export default function FloatingFilesPanel({ position = 'top-right', offsetTop = 80, label = 'Show Uploaded Files' }) {
  const navigate = useNavigate();

  const cornerStyle = (() => {
    const base = { position: 'fixed', zIndex: 100000, right: 20, bottom: 20 };
    if (position === 'top-right') return { ...base, top: offsetTop, bottom: 'auto' };
    if (position === 'top-left') return { ...base, left: 20, right: 'auto', top: offsetTop, bottom: 'auto' };
    if (position === 'bottom-left') return { ...base, left: 20, right: 'auto' };
    return base; // bottom-right
  })();

  return (
    <div style={cornerStyle}>
      <button
        aria-label="Show uploaded files"
        onClick={() => navigate('/files')}
        style={{
          border: 'none',
          borderRadius: 999,
          padding: '12px 18px',
          background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)',
          color: '#ffffff',
          fontWeight: 800,
          letterSpacing: '0.02em',
          boxShadow: '0 12px 32px rgba(59,130,246,0.35)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}
      >
        <span style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.4))' }}>📂</span>
        {label}
      </button>
    </div>
  );
}


