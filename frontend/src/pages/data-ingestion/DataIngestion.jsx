import React from "react";
import { useNavigate } from "react-router-dom";
import "./DataIngestion.css";

const ingestionOptions = [
  {
    label: "Upload File",
    icon: "📂",
    route: "/upload-file",
    color: "#60a5fa",
    description: "CSV, Excel, or Parquet from your device."
  },
  {
    label: "Import from Hugging Face",
    icon: "❓",
    route: "/import-hf",
    color: "#f472b6",
    description: "Drop in a dataset URL and we’ll store it in MinIO."
  },
  {
    label: "Upload from Cloud",
    icon: "☁️",
    route: "/upload-cloud",
    color: "#34d399",
    description: "Pull files from Drive, S3, or MinIO."
  },
  {
    label: "Upload from SQL Workbench",
    icon: "🗄️",
    route: "/upload-sqlworkbench",
    color: "#fbbf24",
    description: "Run a query and capture the results."
  }
];

export default function DataIngestion() {
  const navigate = useNavigate();

  const handleCardKeyDown = (event, route) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(route);
    }
  };

  return (
    <div className="ingestion-page">
      <div className="ingestion-page-shell">
        <section className="ingestion-hero-card" data-animate="fade-up">
          <span className="ingestion-hero-kicker">Workflow · Data Intake</span>
          <h1 className="ingestion-hero-title">Smart Data Ingestion</h1>
          <p className="ingestion-hero-subtitle">
            Orchestrate local uploads, cloud transfers, and SQL pulls without breaking the pipeline flow.
          </p>
        </section>

        <section className="ingestion-grid-shell" aria-label="Available data ingestion methods">
          <div className="ingestion-grid" data-animate="stagger">
            {ingestionOptions.map((opt) => (
              <div
                key={opt.label}
                className="ingestion-option-card"
                role="button"
                tabIndex={0}
                aria-label={`${opt.label}. ${opt.description}`}
                onClick={() => navigate(opt.route)}
                onKeyDown={(event) => handleCardKeyDown(event, opt.route)}
                style={{
                  "--accent-color": opt.color,
                  borderColor: `${opt.color}35`,
                  boxShadow: `0 28px 48px ${opt.color}26`
                }}
              >
                <div className="ingestion-option-icon" aria-hidden="true" style={{ boxShadow: `0 18px 32px ${opt.color}2d` }}>
                  {opt.icon}
                </div>
                <div className="ingestion-option-body">
                  <span className="ingestion-option-label">{opt.label}</span>
                  <span className="ingestion-option-desc">{opt.description}</span>
                </div>
                <div className="ingestion-option-footer" aria-hidden="true">
                  <span className="ingestion-option-cta">Explore</span>
                  <span className="ingestion-option-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="ingestion-help" data-animate="fade-up">
          <div className="ingestion-help-chip">Schema and types auto-detected on upload.</div>
          <div className="ingestion-help-chip">Raw files stay untouched and versioned.</div>
        </div>
      </div>
    </div>
  );
}
