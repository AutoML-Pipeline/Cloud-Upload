import React from "react";
import { useNavigate } from "react-router-dom";
import GlobalBackButton from "../components/GlobalBackButton";

const ingestionOptions = [
  {
    label: "Upload File",
    icon: "📂",
    route: "/upload-file",
    color: "#60a5fa"
  },
  {
    label: "Upload from URL",
    icon: "🔗",
    route: "/upload-url",
    color: "#f472b6"
  },
  {
    label: "Upload from Cloud",
    icon: "☁️",
    route: "/upload-cloud",
    color: "#34d399"
  },
  {
    label: "Upload from SQL Workbench",
    icon: "🗄️",
    route: "/upload-sqlworkbench",
    color: "#fbbf24"
  }
];

export default function DataIngestion() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div className="absolute left-8 top-[70px] z-[10000] pointer-events-auto">
        <GlobalBackButton />
      </div>
      <div className="min-h-screen w-full flex flex-col items-center justify-center pt-24 pb-16">
        <div className="text-[2rem] font-bold tracking-tight text-text mb-10 text-center">
          Choose Your Data Ingestion Method!
        </div>
        <div className="ingestion-options-game">
          {ingestionOptions.map(opt => (
            <div
              key={opt.label}
              className="ingestion-option-card"
              style={{ borderColor: opt.color, boxShadow: `0 4px 24px ${opt.color}55` }}
              onClick={() => navigate(opt.route)}
              tabIndex={0}
              role="button"
            >
              <span className="ingestion-option-icon" style={{ fontSize: 48 }}>{opt.icon}</span>
              <span className="ingestion-option-label">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
