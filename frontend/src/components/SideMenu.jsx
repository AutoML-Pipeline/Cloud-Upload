import React, { useRef } from "react";
import { useNavigate } from "react-router-dom";

const steps = [
  {
    step: 1,
    title: "Data Ingestion",
    description: "Upload data from various sources. (Current Step)",
    active: true,
  },
  {
    step: 2,
    title: "Preprocessing",
    description: "Clean and prepare your data.",
    active: false,
  },
  {
    step: 3,
    title: "Model Training",
    description: "Train ML models on your data.",
    active: false,
  },
  {
    step: 4,
    title: "Evaluation",
    description: "Evaluate model performance.",
    active: false,
  },
];

export default function SideMenu() {
  const stepRefs = useRef([]);
  const navigate = useNavigate();

  return (
    <aside style={{
      width: 260,
      height: 'calc(100vh - 62px)', // 62px is the marginTop for navbar
      minHeight: 0,
      maxHeight: 'calc(100vh - 62px)',
      overflowY: 'auto',
      background: 'rgba(30,41,59,0.98)',
      color: '#e0e7ef',
      boxShadow: '2px 0 16px rgba(30,41,59,0.12)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 1.2rem 2rem 2.2rem',
      position: 'fixed',
      left: 0,
      top: 62, // Start below navbar
      zIndex: 2000,
      borderTopRightRadius: 22,
      borderBottomRightRadius: 22,
      boxSizing: 'border-box',
      transition: 'box-shadow 0.28s',
      borderRight: '1.5px solid #22304a',
    }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 36, color: '#38bdf8', letterSpacing: '0.04em', textAlign: 'left', fontFamily: 'Montserrat, Poppins, Arial, sans-serif' }}>
        ML Pipeline Steps
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 38 }}>
        {steps.map((s, idx) => (
          <div
            key={s.step}
            ref={el => stepRefs.current[idx] = el}
            style={{
              padding: '1.25rem 1.2rem 1.25rem 0.7rem',
              borderRadius: 16,
              background: s.active ? 'rgba(56,189,248,0.18)' : 'transparent',
              borderLeft: s.active ? '6px solid #38bdf8' : '6px solid transparent',
              boxShadow: s.active ? '0 2px 12px rgba(56,189,248,0.12)' : undefined,
              transition: 'all 0.22s',
              position: 'relative',
              cursor: 'pointer',
              marginRight: 8,
            }}
            onClick={() => {
              if (s.title === 'Data Ingestion') navigate('/upload-file');
              if (s.title === 'Preprocessing') navigate('/preprocessing');
              // Add navigation for other steps as needed
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: s.active ? '#38bdf8' : '#a3aed6', marginBottom: 6, fontFamily: 'Montserrat, Poppins, Arial, sans-serif', letterSpacing: '-0.01em' }}>
              Step {s.step}: {s.title}
            </div>
            <div style={{ fontSize: 15, color: s.active ? '#e0e7ef' : '#a3aed6', fontWeight: 500, fontFamily: 'Montserrat, Poppins, Arial, sans-serif' }}>
              {s.description}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
