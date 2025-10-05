import PropTypes from "prop-types";
import ColumnMultiSelect from "../../../components/ColumnMultiSelect";
import FillNullSelector from "../../../components/FillNullSelector";
import { PreprocessingStepCard } from "./PreprocessingStepCard";
import styles from "../Preprocessing.module.css";

export const StepBuilder = ({
  columns,
  selectedFile,
  preprocessingSteps,
  onUpdateSteps,
  showRemoveNullsStep,
  showFillNullsStep,
  previewReady,
  hasNulls,
  nullCounts,
  onToggleRemoveNulls,
  onToggleFillNulls,
  onChangeFile,
  onSubmit,
  loading,
  result,
  activeSteps,
  collapseEnabled,
  onCollapse,
}) => {
  return (
    <form onSubmit={onSubmit} className={styles.builderColumn}>
      {collapseEnabled && (
        <div className={styles.builderCollapseRow}>
          <button type="button" className={styles.builderCollapseButton} onClick={onCollapse}>
            Hide steps
          </button>
        </div>
      )}
      <div className={styles.builderIntro}>
        <span className={styles.builderEyebrow}>Step builder</span>
        <h3 className={styles.builderTitle}>Configure your cleaning recipe</h3>
        <p className={styles.builderSubtitle}>
          Toggle the cleanup steps you need. We&apos;ll preview changes instantly before you commit.
        </p>
      </div>
      <div className={styles.builderFileRow}>
        <div className={styles.builderFileMeta}>
          <span className={styles.builderFileLabel}>Working on</span>
          <span className={styles.builderFileName}>{selectedFile}</span>
        </div>
        <button type="button" className={styles.changeFileButton} onClick={onChangeFile}>
          <span className={styles.changeFileIcon} aria-hidden="true">⟲</span>
          Change file
        </button>
      </div>

      <div className={styles.stepperListModern}>
        <PreprocessingStepCard
          checked={preprocessingSteps.removeDuplicates}
          onToggle={(event) => onUpdateSteps((prev) => ({ ...prev, removeDuplicates: event.target.checked }))}
          icon="🧹"
          label="Remove duplicates"
          description="Find and drop perfectly matching rows."
        >
          <ColumnMultiSelect
            columns={columns}
            selected={preprocessingSteps.removeDuplicatesColumns}
            onChange={(cols) => onUpdateSteps((prev) => ({ ...prev, removeDuplicatesColumns: cols }))}
            label="Columns for duplicate detection (default: all)"
            placeholder="Select columns..."
          />
        </PreprocessingStepCard>

        {showRemoveNullsStep && (
          <PreprocessingStepCard
            checked={preprocessingSteps.removeNulls}
            onToggle={(event) => onToggleRemoveNulls(event.target.checked)}
            icon="🚫"
            label="Remove nulls"
            description="Filter out rows with missing values."
          >
            <ColumnMultiSelect
              columns={columns}
              selected={preprocessingSteps.removeNullsColumns}
              onChange={(cols) => onUpdateSteps((prev) => ({ ...prev, removeNullsColumns: cols }))}
              label="Columns for null removal (default: all)"
              placeholder="Select columns..."
            />
          </PreprocessingStepCard>
        )}

        {showFillNullsStep && (
          <PreprocessingStepCard
            checked={preprocessingSteps.fillNulls}
            onToggle={(event) => onToggleFillNulls(event.target.checked)}
            icon="🧴"
            label="Fill nulls"
            description="Impute missing values with smart strategies."
          >
            <FillNullSelector
              columns={columns}
              nullCounts={nullCounts}
              selected={preprocessingSteps.fillNullsColumns}
              onChangeSelected={(cols) => onUpdateSteps((prev) => ({ ...prev, fillNullsColumns: cols }))}
              strategies={preprocessingSteps.fillColumnStrategies}
              onChangeStrategy={(column, strategy, value) =>
                onUpdateSteps((prev) => ({
                  ...prev,
                  fillColumnStrategies: {
                    ...prev.fillColumnStrategies,
                    [column]: { strategy, value },
                  },
                }))
              }
            />
          </PreprocessingStepCard>
        )}

        {previewReady && !hasNulls && (
          <div className={styles.noNullsNotice}>
            No missing values detected in the preview — null-handling steps are hidden.
          </div>
        )}

        <PreprocessingStepCard
          checked={preprocessingSteps.dropColumns}
          onToggle={(event) => onUpdateSteps((prev) => ({ ...prev, dropColumns: event.target.checked }))}
          icon="🗑️"
          label="Drop columns"
          description="Remove columns that aren&apos;t needed downstream."
        >
          <ColumnMultiSelect
            columns={columns}
            selected={preprocessingSteps.dropColumnsColumns}
            onChange={(cols) => onUpdateSteps((prev) => ({ ...prev, dropColumnsColumns: cols }))}
            label="Columns to drop"
            placeholder="Select columns..."
          />
        </PreprocessingStepCard>

        <PreprocessingStepCard
          checked={preprocessingSteps.removeOutliers}
          onToggle={(event) => onUpdateSteps((prev) => ({ ...prev, removeOutliers: event.target.checked }))}
          icon="📈"
          label="Remove outliers"
          description="Trim statistical outliers to stabilize models."
        >
          <div className={styles.outlierConfig}>
            <div className={styles.outlierField}>
              <label className={styles.outlierLabel} htmlFor="outlier-method">
                Method
              </label>
              <select
                id="outlier-method"
                className={styles.outlierSelect}
                value={preprocessingSteps.removeOutliersConfig.method}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    removeOutliersConfig: { ...prev.removeOutliersConfig, method: event.target.value },
                  }))
                }
              >
                <option value="iqr">IQR (Interquartile Range)</option>
                <option value="zscore">Z-Score</option>
              </select>
            </div>
            <div className={styles.outlierField}>
              <label className={styles.outlierLabel} htmlFor="outlier-factor">
                Factor
              </label>
              <input
                id="outlier-factor"
                type="number"
                step="0.1"
                className={styles.outlierInput}
                value={preprocessingSteps.removeOutliersConfig.factor}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    removeOutliersConfig: {
                      ...prev.removeOutliersConfig,
                      factor: parseFloat(event.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>
          <ColumnMultiSelect
            columns={columns}
            selected={preprocessingSteps.removeOutliersConfig.columns}
            onChange={(cols) =>
              onUpdateSteps((prev) => ({
                ...prev,
                removeOutliersConfig: { ...prev.removeOutliersConfig, columns: cols },
              }))
            }
            label="Columns for outlier detection (default: all numeric)"
            placeholder="Select columns..."
          />
        </PreprocessingStepCard>
      </div>

      <div className={styles.sessionSummaryCard}>
        <div className={styles.sessionSummaryHeader}>
          <span className={styles.sessionSummaryLabel}>Active steps</span>
          <span className={styles.sessionSummaryCount}>{activeSteps.length} selected</span>
        </div>
        {activeSteps.length ? (
          <ul className={styles.sessionSummaryList}>
            {activeSteps.map((step) => (
              <li key={step.key} className={styles.sessionSummaryItem}>
                <span className={styles.sessionSummaryIcon}>{step.icon}</span>
                <div>
                  <p className={styles.sessionSummaryTitle}>{step.title}</p>
                  <p className={styles.sessionSummaryDetails}>{step.details}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.sessionSummaryEmpty}>Pick one or more steps to tailor your dataset.</p>
        )}
      </div>

      <div className={styles.actionFooter}>
        <button type="submit" disabled={loading || !selectedFile} className={styles.primaryCta}>
          {loading ? (
            <div className={styles.loadingWrapper}>
              <div className={styles.loadingSpinner}></div>
              Processing…
            </div>
          ) : (
            <div className={styles.submitContent}>
              <span className={styles.submitIcon}>🚀</span>
              Run preprocessing
            </div>
          )}
        </button>
        <p className={styles.actionHint}>
          We preview up to {result?.preview_row_limit ?? 1000} rows for instant feedback. Full saves happen on demand.
        </p>
      </div>
    </form>
  );
};

StepBuilder.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
  selectedFile: PropTypes.string.isRequired,
  preprocessingSteps: PropTypes.shape({
    removeDuplicates: PropTypes.bool.isRequired,
    removeDuplicatesColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    removeNulls: PropTypes.bool.isRequired,
    removeNullsColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    fillNulls: PropTypes.bool.isRequired,
    fillNullsColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    fillColumnStrategies: PropTypes.object.isRequired,
    dropColumns: PropTypes.bool.isRequired,
    dropColumnsColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
    removeOutliers: PropTypes.bool.isRequired,
    removeOutliersConfig: PropTypes.shape({
      method: PropTypes.string.isRequired,
      factor: PropTypes.number.isRequired,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
  }).isRequired,
  onUpdateSteps: PropTypes.func.isRequired,
  showRemoveNullsStep: PropTypes.bool.isRequired,
  showFillNullsStep: PropTypes.bool.isRequired,
  previewReady: PropTypes.bool.isRequired,
  hasNulls: PropTypes.bool.isRequired,
  nullCounts: PropTypes.object.isRequired,
  onToggleRemoveNulls: PropTypes.func.isRequired,
  onToggleFillNulls: PropTypes.func.isRequired,
  onChangeFile: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  result: PropTypes.object,
  activeSteps: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      details: PropTypes.string.isRequired,
      icon: PropTypes.string.isRequired,
    })
  ).isRequired,
  collapseEnabled: PropTypes.bool,
  onCollapse: PropTypes.func,
};
