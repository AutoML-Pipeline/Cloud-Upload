import React from "react";
import styles from "../ModelTraining.module.css";
import { formatMetricValue } from "../utils/trainingUtils";
import ModelVisualizations from "../../../components/ModelVisualizations";

export default function TrainingResults({ trainingResult, savedModelId, onSave, onPredict, onTrainAnother }) {
  if (!trainingResult) return null;
  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>✅ Training Completed!</h2>
          <p className={styles.cardDescription}>Successfully trained {trainingResult.models_trained?.length || 0} models</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.summaryGrid}>
            <div className={styles.summaryCard}><div className={styles.summaryIcon}>📊</div><div className={styles.summaryContent}><div className={styles.summaryLabel}>Problem Type</div><div className={styles.summaryValue}>{trainingResult.problem_type === "classification" ? "Classification" : trainingResult.problem_type === "regression" ? "Regression" : trainingResult.problem_type}</div></div></div>
            <div className={styles.summaryCard}><div className={styles.summaryIcon}>📏</div><div className={styles.summaryContent}><div className={styles.summaryLabel}>Dataset Rows</div><div className={styles.summaryValue}>{trainingResult.dataset_info?.total_rows?.toLocaleString()}</div></div></div>
            <div className={styles.summaryCard}><div className={styles.summaryIcon}>🔢</div><div className={styles.summaryContent}><div className={styles.summaryLabel}>Features</div><div className={styles.summaryValue}>{trainingResult.dataset_info?.features?.length || 0}</div></div></div>
            <div className={styles.summaryCard}><div className={styles.summaryIcon}>⏱️</div><div className={styles.summaryContent}><div className={styles.summaryLabel}>Total Time</div><div className={styles.summaryValue}>{trainingResult.total_training_time?.toFixed(2)}s</div></div></div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>🏆 Best Model</h2>
          <p className={styles.cardDescription}>Top performing model selected automatically</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.bestModelCard}>
            <div className={styles.bestModelHeader}>
              <div>
                <h3 className={styles.bestModelName}>{trainingResult.best_model?.model_name}</h3>
                <p className={styles.bestModelType}>{trainingResult.best_model?.model_type}</p>
              </div>
              <div className={styles.bestModelBadge}>🥇 Best</div>
            </div>
            <div className={styles.metricsGrid}>
              {Object.entries(trainingResult.best_model?.metrics || {})
                .filter(([, value]) => value !== null && value !== undefined && value !== "")
                .map(([key, value]) => {
                  const formatted = formatMetricValue(value);
                  if (formatted === null) return null;
                  return (
                    <div key={key} className={styles.metricCard}>
                      <div className={styles.metricLabel}>{key.replace(/_/g, " ").toUpperCase()}</div>
                      <div className={styles.metricValue} title={String(formatted)}>{formatted}</div>
                    </div>
                  );
                })}
            </div>
            <div className={styles.modelMeta}>
              <span>Training Time: {trainingResult.best_model?.training_time?.toFixed(2)}s</span>
              <span>Model ID: {trainingResult.best_model_id?.substring(0, 12)}...</span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>📊 Model Comparison</h2>
          <p className={styles.cardDescription}>Performance comparison of all trained models</p>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.comparisonTable}>
            <table>
              <thead>
                <tr>
                  <th>Model</th>
                  {trainingResult.problem_type === "classification" ? (
                    <>
                      <th>Accuracy</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>F1 Score</th>
                    </>
                  ) : (
                    <>
                      <th>R² Score</th>
                      <th>MAE</th>
                      <th>RMSE</th>
                    </>
                  )}
                  <th>Time (s)</th>
                </tr>
              </thead>
              <tbody>
                {trainingResult.models_trained?.map((model) => (
                  <tr key={model.model_name} className={model.is_best ? styles.bestRow : ""}>
                    <td>
                      <div className={styles.modelNameCell}>
                        {model.is_best && <span className={styles.trophy}>🏆</span>}
                        <span>{model.model_name}</span>
                      </div>
                    </td>
                    {trainingResult.problem_type === "classification" ? (
                      <>
                        <td>{model.metrics?.accuracy?.toFixed(4) || "N/A"}</td>
                        <td>{model.metrics?.precision?.toFixed(4) || "N/A"}</td>
                        <td>{model.metrics?.recall?.toFixed(4) || "N/A"}</td>
                        <td>{model.metrics?.f1_score?.toFixed(4) || "N/A"}</td>
                      </>
                    ) : (
                      <>
                        <td>{model.metrics?.r2_score?.toFixed(4) || "N/A"}</td>
                        <td>{model.metrics?.mae?.toFixed(2) || "N/A"}</td>
                        <td>{model.metrics?.rmse?.toFixed(2) || "N/A"}</td>
                      </>
                    )}
                    <td>{model.training_time?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ModelVisualizations trainingResult={trainingResult} />

      <div className={styles.actionBar}>
        <button className={styles.secondaryButton} onClick={onTrainAnother}>Train Another Model</button>
        {savedModelId ? (
          <button className={styles.primaryButton} onClick={onPredict}>Make Predictions with Best Model 🔮</button>
        ) : (
          <button className={styles.primaryButton} onClick={onSave} title="Save the trained best model to your Models library">Save Best Model 💾</button>
        )}
      </div>
    </>
  );
}
