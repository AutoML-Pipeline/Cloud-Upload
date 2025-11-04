import React from "react";
import styles from "../ModelTraining.module.css";

export default function TrainingFailed({ error, onBack, onRetry }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>❌ Training Failed</h2>
        <p className={styles.cardDescription}>Something went wrong during training. You can retry with recommended settings or go back and adjust.</p>
      </div>
      <div className={styles.cardContent}>
        {error && (
          <div className={`${styles.infoBox} text-red-700`}>
            <strong>Error:</strong> {error}
          </div>
        )}
        <div className={styles.actionBar}>
          <button className={styles.secondaryButton} onClick={onBack}>← Back to Configuration</button>
          <button className={styles.primaryButton} onClick={onRetry}>Retry with Recommended Settings</button>
        </div>
      </div>
    </div>
  );
}
