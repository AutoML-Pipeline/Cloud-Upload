import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";

const steps = [
  {
    label: "Data Ingestion",
    description: "Bring data into the workspace from files, SQL, or clouds.",
    icon: "📂",
    route: "/data-ingestion",
    accentKey: "Ingestion",
  },
  {
    label: "Preprocessing",
    description: "Clean, validate, and prepare datasets for modeling.",
    icon: "🧹",
    route: "/preprocessing",
    accentKey: "Preprocessing",
  },
  {
    label: "Feature Engineering",
    description: "Shape and enrich features to unlock signal.",
    icon: "⚙️",
    route: "/feature-engineering",
    accentKey: "Feature",
  },
  {
    label: "Model Training",
    description: "Train and compare multiple ML models automatically.",
    icon: "🤖",
    route: "/model-training",
    accentKey: "Model",
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
        {steps.map((step) => {
          const cardAccentClass = styles[`stepCardAccent${step.accentKey}`];
          const iconAccentClass = styles[`stepIconAccent${step.accentKey}`];

          return (
          <button
            key={step.label}
            type="button"
            className={`${styles.stepCard} ${cardAccentClass ?? ""}`}
            onClick={() => navigate(step.route)}
          >
            <span className={`${styles.stepIcon} ${iconAccentClass ?? ""}`}>
              {step.icon}
            </span>
            <div className={styles.stepBody}>
              <span className={styles.stepTitle}>{step.label}</span>
              <span className={styles.stepDescription}>{step.description}</span>
            </div>
            <div className={styles.stepFooter}>
              <span className={styles.stepCta}>Explore</span>
              <span className={styles.stepArrow}>→</span>
            </div>
          </button>
        );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
