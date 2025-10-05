import React from "react";

export default function DashboardCarousel({ options, onCardClick }) {
  const hasError = false;
  const errorMsg = "";

  // Defensive: validate options
  const safeOptions = Array.isArray(options) && options.length > 0
    ? options.filter(opt => opt && typeof opt === 'object' && opt.label && opt.icon && opt.description)
    : [];

  // Card style: clean, modern, no blur, high contrast
  const getCardStyle = () => ({
    background: 'rgba(36,54,97,0.98)',
    border: '2.5px solid #60a5fa',
    boxShadow: '0 8px 32px #60a5fa33',
    color: '#f1f5f9',
    filter: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
    borderRadius: 22,
    fontWeight: 700,
    fontSize: 21,
    transition: 'background 0.22s, border 0.22s, box-shadow 0.22s, color 0.22s, font-size 0.22s',
  });

  if (hasError) {
    return (
      <div style={{ color: '#e11d48', background: '#fff0f3', border: '1px solid #e11d48', padding: 24, borderRadius: 16, margin: 20, textAlign: 'center' }}>
        <b>Dashboard Error</b>
        <div style={{ marginTop: 8, fontSize: 14 }}>{errorMsg}</div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: '32px',
          width: '100%',
          maxWidth: 600,
          padding: 24,
        }}
      >
        {safeOptions.length > 0 ? safeOptions.slice(0, 4).map((opt, idx) => (
          <div
            key={opt.label || idx}
            onClick={() => onCardClick(opt)}
            style={{
              minWidth: 180,
              maxWidth: 260,
              padding: '2.2rem 1.2rem 1.5rem 1.2rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontFamily: 'Montserrat, Poppins, Arial, sans-serif',
              userSelect: 'none',
              margin: '0 auto',
              ...getCardStyle(),
            }}
          >
            <span style={{ fontSize: 40, marginBottom: 14 }}>{opt.icon}</span>
            <span style={{ marginBottom: 10, textAlign: 'center' }}>{opt.label}</span>
            <span style={{ fontSize: 14, color: '#a3aed6', fontWeight: 400, textAlign: 'center' }}>{opt.description}</span>
          </div>
        )) : (
          <div style={{ color: '#e11d48', fontWeight: 500, fontSize: 18, padding: 32, textAlign: 'center', width: '100%' }}>
            No dashboard options available
          </div>
        )}
      </div>
    </div>
  );
}
