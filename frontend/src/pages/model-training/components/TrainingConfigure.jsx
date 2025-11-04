import React from "react";
import styles from "../ModelTraining.module.css";

export default function TrainingConfigure({
  selectedFile,
  targetColumn,
  setTargetColumn,
  problemType,
  setProblemType,
  columns,
  recommendations,
  loadingRecommendations,
  onStartTraining,
  onBack,
}) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>⚙️ Training Configuration</h2>
        <p className={styles.cardDescription}>Configure training parameters and select models</p>
      </div>
      <div className={styles.cardContent}>
        <div className={`${styles.infoBox} flex items-center justify-between gap-3`}>
          <div>
            <strong>Recommended setup:</strong> Problem type is auto-detected and top models are preselected.
            <span className="ml-2 text-gray-500" title="We auto-detect your problem type from the target column and train the most suitable models for speed and accuracy.">Why recommended?</span>
          </div>
          <div>
            <button className={styles.primaryButton} onClick={onStartTraining} disabled={!targetColumn || loadingRecommendations} title={loadingRecommendations ? 'Analyzing target column…' : 'Train with recommended settings'}>
              Train (Recommended) 🚀
            </button>
          </div>
        </div>

        <div className={styles.infoBox}><strong>Selected Dataset:</strong> {selectedFile}</div>

        {recommendations && targetColumn && (
          <div className={styles.recommendationsBox}>
            <h3 className={styles.recommendationsTitle}>💡 AI Recommendations</h3>
            <div className={styles.recommendationItem}>
              <strong>Detected Problem Type:</strong>
              <span className={styles.badge}>
                {recommendations.problem_type === 'classification' ? '🎯 Classification' : '📈 Regression'}
              </span>
            </div>
            {recommendations.target_analysis && (
              <div className={styles.recommendationItem}>
                <strong>Target Column Analysis:</strong>
                <div className={styles.targetStats}>
                  <span>• {recommendations.target_analysis.unique_values} unique values</span>
                  {recommendations.target_analysis.class_distribution && (
                    <span>• Distribution: {Object.keys(recommendations.target_analysis.class_distribution).length} classes</span>
                  )}
                  {recommendations.target_analysis.null_count > 0 && (
                    <span className={styles.warning}>
                      • ⚠️ {recommendations.target_analysis.null_count} missing values ({(recommendations.target_analysis.null_percentage?.toFixed?.(1)) ?? '0.0'}%)
                    </span>
                  )}
                </div>
              </div>
            )}
            {recommendations.model_recommendations && recommendations.model_recommendations.length > 0 && (
              <div className={styles.recommendationItem}>
                <strong>Recommended Models:</strong>
                <div className={styles.modelRecommendations}>
                  {recommendations.model_recommendations
                    .filter((m) => m.recommended && m.priority === 'high')
                    .map((model) => (
                      <div key={model.model_id} className={styles.recommendedModel}>
                        <span className={styles.modelName}>✓ {model.model_name}</span>
                        <span className={styles.modelReason}>{model.reason}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>🎯 Target Column <span className={styles.required}>*</span></label>
          <p className={styles.formHelp}>Select the column you want to predict</p>
          <select className={styles.formSelect} value={targetColumn} onChange={(e) => setTargetColumn(e.target.value)}>
            <option value="">-- Select Target Column --</option>
            {columns.map((col) => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>📊 Problem Type</label>
          <p className={styles.formHelp}>{loadingRecommendations ? 'Analyzing target column to detect problem type...' : 'Problem type is automatically detected based on your target column'}</p>
          {loadingRecommendations ? (
            <div className={styles.loadingRecommendation}>
              <div className={styles.spinner}></div>
              <span>Detecting problem type...</span>
            </div>
          ) : (
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input type="radio" name="problemType" checked={problemType === 'classification'} onChange={() => setProblemType('classification')} />
                <span>
                  Classification
                  {recommendations?.problem_type === 'classification' && (
                    <span className={styles.suggestedBadge}>✓ Suggested for "{targetColumn}"</span>
                  )}
                </span>
              </label>
              <label className={styles.radioLabel}>
                <input type="radio" name="problemType" checked={problemType === 'regression'} onChange={() => setProblemType('regression')} />
                <span>
                  Regression
                  {recommendations?.problem_type === 'regression' && (
                    <span className={styles.suggestedBadge}>✓ Suggested for "{targetColumn}"</span>
                  )}
                </span>
              </label>
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>🤖 Models to Train</label>
          <p className={styles.formHelp}>
            {loadingRecommendations ? 'Analyzing your data to select optimal models...' : recommendations ? 'Recommended models will be trained automatically' : `All available ${problemType} models will be trained`}
          </p>
        </div>

        <div className={styles.actionBar}>
          <button className={styles.secondaryButton} onClick={onBack}>← Back</button>
          <button className={styles.primaryButton} onClick={onStartTraining} disabled={!targetColumn}>Start Training 🚀</button>
        </div>
      </div>
    </div>
  );
}
