import React from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
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

  const themeByRoute = (route) => {
    switch (route) {
      case "/upload-file":
        return {
          card: "border-blue-200 hover:border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.15)]",
          icon: "drop-shadow-[0_18px_32px_rgba(59,130,246,0.18)]",
          footer: "text-blue-600",
        };
      case "/import-hf":
        return {
          card: "border-pink-200 hover:border-pink-400 shadow-[0_4px_12px_rgba(236,72,153,0.15)]",
          icon: "drop-shadow-[0_18px_32px_rgba(236,72,153,0.18)]",
          footer: "text-pink-600",
        };
      case "/upload-cloud":
        return {
          card: "border-emerald-200 hover:border-emerald-400 shadow-[0_4px_12px_rgba(16,185,129,0.15)]",
          icon: "drop-shadow-[0_18px_32px_rgba(16,185,129,0.18)]",
          footer: "text-emerald-600",
        };
      case "/upload-sqlworkbench":
        return {
          card: "border-amber-200 hover:border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.15)]",
          icon: "drop-shadow-[0_18px_32px_rgba(245,158,11,0.18)]",
          footer: "text-amber-600",
        };
      default:
        return { card: "", icon: "", footer: "text-primary-600" };
    }
  };

  const handleCardKeyDown = (event, route) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      navigate(route);
    }
  };

  return (
    <div className="ingestion-page">
      <div className="ingestion-page-shell">
        <PageHero
          badge="Workflow · Data Intake"
          title="Smart Data Ingestion"
          subtitle="Orchestrate local uploads, cloud transfers, and SQL pulls without breaking the pipeline flow."
        />

        <section className="ingestion-grid-shell" aria-label="Available data ingestion methods">
          <div className="ingestion-grid" data-animate="stagger">
            {ingestionOptions.map((opt) => (
              <div
                key={opt.label}
                className={`ingestion-option-card ${themeByRoute(opt.route).card}`}
                role="button"
                tabIndex={0}
                aria-label={`${opt.label}. ${opt.description}`}
                onClick={() => navigate(opt.route)}
                onKeyDown={(event) => handleCardKeyDown(event, opt.route)}
              >
                <div className={`ingestion-option-icon ${themeByRoute(opt.route).icon}`} aria-hidden="true">
                  {opt.icon}
                </div>
                <div className="ingestion-option-body">
                  <span className="ingestion-option-label">{opt.label}</span>
                  <span className="ingestion-option-desc">{opt.description}</span>
                </div>
                <div className={`ingestion-option-footer ${themeByRoute(opt.route).footer}`} aria-hidden="true">
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
