import React from "react";
import styles from "../ModelTraining.module.css";

export default function TrainingFileSelect({ files, selectedFile, onSelect, onContinue, onQuickTrain, isFetching }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>📂 Select Feature-Engineered Dataset</h2>
        <p className={styles.cardDescription}>Choose a preprocessed and feature-engineered dataset to train models</p>
      </div>
      <div className={styles.cardContent}>
        {isFetching ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading datasets...</p>
          </div>
        ) : files.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No feature-engineered datasets found.</p>
            <button className={styles.secondaryButton} onClick={() => (window.location.href = "/feature-engineering")}>Go to Feature Engineering</button>
          </div>
        ) : (
          <div className={styles.fileGrid}>
            {files.map((file) => {
              const displayName = (file.name || "")
                .replace(/^(?:feature[_-]?engineered[_-]?|cleaned?[_-]?)+/i, "")
                .replace(/\.(parquet|csv|json)$/i, "");
              return (
                <div
                  key={file.name}
                  className={`${styles.fileCard} ${selectedFile === file.name ? styles.fileCardSelected : ""}`}
                  onClick={() => onSelect(file.name)}
                >
                  <div className={styles.fileIcon}>📊</div>
                  <div className={styles.fileInfo}>
                    <div className={styles.fileName} title={file.name}>{displayName || file.name}</div>
                    <div className={styles.fileSize}>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown size"}</div>
                  </div>
                  {selectedFile === file.name && <div className={styles.selectedBadge}>✓</div>}
                </div>
              );
            })}
          </div>
        )}

        {selectedFile && (
          <div className={styles.actionBar}>
            <button className={styles.primaryButton} onClick={onContinue}>Continue to Configuration →</button>
            <button className={styles.secondaryButton} onClick={onQuickTrain} title="Skip straight to training with auto-detected settings">Quick Train (Recommended)</button>
          </div>
        )}
      </div>
    </div>
  );
}
