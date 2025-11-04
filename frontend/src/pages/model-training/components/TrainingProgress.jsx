import React from "react";
import styles from "../ModelTraining.module.css";
import { formatTime } from "../utils/trainingUtils";

export default function TrainingProgress({ status, progress, selectedFile, targetColumn, elapsedTime, jobId }) {
  if (status === "completed" || status === "failed") return null;
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>🔄 Training in Progress</h2>
        <p className={styles.cardDescription}>Training multiple models and comparing performance...</p>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.progressContainer}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>{status === "pending" ? "Initializing..." : "Training models..."}</span>
            <span className={styles.progressPercentage}>{progress}%</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
          </div>
          <div className={styles.progressInfo}>
            <span>Elapsed: {formatTime(elapsedTime)}</span>
            <span>Job ID: {jobId?.substring(0, 8)}...</span>
          </div>
        </div>
        <div className={styles.trainingInfo}>
          <div className={styles.infoRow}><span className={styles.infoLabel}>Dataset:</span><span className={styles.infoValue}>{selectedFile}</span></div>
          <div className={styles.infoRow}><span className={styles.infoLabel}>Target Column:</span><span className={styles.infoValue}>{targetColumn}</span></div>
          <div className={styles.infoRow}><span className={styles.infoLabel}>Test Split:</span><span className={styles.infoValue}>20% (default)</span></div>
        </div>
        <div className={styles.statusAnimation}>
          <div className={styles.spinner}></div>
          <p>Please wait while models are being trained...</p>
        </div>
      </div>
    </div>
  );
}
