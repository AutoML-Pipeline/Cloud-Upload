import React from "react";
import styles from "../ModelTraining.module.css";

export default function TrainingLoading({ loadingDataset, datasetInfo }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>🔄 Loading Dataset</h2>
        <p className={styles.cardDescription}>Validating and preparing your dataset for training</p>
      </div>
      <div className={styles.cardContent}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <h3 className={styles.loadingTitle}>{loadingDataset ? "Loading dataset..." : "Preparing..."}</h3>
          <p className={styles.loadingDescription}>Fetching columns, validating data, and checking dataset integrity</p>
          {datasetInfo && (
            <div className={`${styles.infoBox} mt-5`}>
              <p>✓ Found {datasetInfo.totalColumns} columns</p>
              <p>✓ Dataset contains {datasetInfo.totalRows} rows</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
