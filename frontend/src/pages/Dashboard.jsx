import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

const steps = [
  {
    label: "Data Ingestion",
    description: "Bring data into the workspace from files, SQL, or clouds.",
    icon: "📂",
    route: "/data-ingestion",
    accent: "#60a5fa",
  },
  {
    label: "Preprocessing",
    description: "Clean, validate, and prepare datasets for modeling.",
    icon: "�",
    route: "/preprocessing",
    accent: "#fbbf24",
  },
  {
    label: "Feature Engineering",
    description: "Shape and enrich features to unlock signal.",
    icon: "⚙️",
    route: "/feature-engineering",
    accent: "#34d399",
  },
  {
    label: "Model Selection",
    description: "Run AutoML and compare experiments to pick a champion.",
    icon: "🚀",
    route: "/automl-training",
    accent: "#38bdf8",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className={`app-shell-with-chrome ${styles.dashboardShell}`}>
      <div className={styles.stepsIntro}>
        <p className={styles.stepsHint}>Jump straight into any stage of your ML pipeline.</p>
      </div>
      <div className={styles.stepsGrid}>
        {steps.map((step) => (
          <button
            key={step.label}
            type="button"
            className={styles.stepCard}
            style={{ boxShadow: `0 16px 36px ${step.accent}33` }}
            onClick={() => navigate(step.route)}
          >
            <span className={styles.stepIcon} style={{ background: step.accent }}>
              {step.icon}
            </span>
            <span>
              <span className={styles.stepTitle}>{step.label}</span>
              <span className={styles.stepDescription}>{step.description}</span>
            </span>
            <span className={styles.stepChevron}>→</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
