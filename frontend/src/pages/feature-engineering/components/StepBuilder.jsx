import PropTypes from "prop-types";
import ColumnMultiSelect from "../../../components/ColumnMultiSelect";
import { ValidatedColumnSelect } from "./ValidatedColumnSelect";
import styles from "../../preprocessing/Preprocessing.module.css";
import { FeatureEngineeringStepCard } from "./FeatureEngineeringStepCard";

const DEFAULT_COLUMNS_LABEL = "Select columns...";

export const StepBuilder = ({
  columns,
  selectedFile,
  steps,
  onUpdateSteps,
  onChangeFile,
  onSubmit,
  loading,
  activeSteps,
  result,
  collapseEnabled,
  onCollapse,
  dataPreview,
}) => {
  const showCollapse = Boolean(collapseEnabled);
  const useFullWidth = true; // Always use full width for vertical layout

  const handleSelectColumns = (section, value) => {
    onUpdateSteps((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        columns: value,
      },
    }));
  };

  const handleFeatureCreationColumns = (key, value) => {
    onUpdateSteps((prev) => ({
      ...prev,
      featureCreation: {
        ...prev.featureCreation,
        [key]: {
          ...prev.featureCreation[key],
          columns: value,
        },
      },
    }));
  };

  return (
    <form onSubmit={onSubmit} className={`${styles.builderColumn} ${useFullWidth ? styles.stepBuilder : ''}`}>
      {showCollapse && (
        <div className={styles.builderCollapseRow}>
          <button type="button" className={styles.builderCollapseButton} onClick={onCollapse}>
            Hide steps
          </button>
        </div>
      )}
      <div className={styles.builderIntro}>
        <span className={styles.builderEyebrow}>Step builder</span>
        <h3 className={styles.builderTitle}>Configure your feature recipe</h3>
        <p className={styles.builderSubtitle}>
          Toggle the transformations you need. We&apos;ll run them end-to-end and preview results before you ship.
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

      <div className={`${styles.stepperListModern} ${styles.stepBuilderVertical}`}>
        <FeatureEngineeringStepCard
          checked={steps.scaling.enabled}
          onToggle={(event) =>
            onUpdateSteps((prev) => ({
              ...prev,
              scaling: { ...prev.scaling, enabled: event.target.checked },
            }))
          }
          icon="📈"
          label="Scaling"
          description="Normalize numerical features for more stable models."
        >
          <ValidatedColumnSelect
            allColumns={columns}
            selected={steps.scaling.columns}
            onChange={(value) => handleSelectColumns("scaling", value)}
            stepType="scaling"
            stepMethod={steps.scaling.method}
            dataPreview={dataPreview}
            label="Columns to scale (each can have different method)"
            placeholder={DEFAULT_COLUMNS_LABEL}
            allowColumnMethods={true}
            columnMethods={steps.scaling.columnMethods || {}}
            onColumnMethodChange={(col, method) => {
              onUpdateSteps((prev) => ({
                ...prev,
                scaling: {
                  ...prev.scaling,
                  columnMethods: { ...prev.scaling.columnMethods, [col]: method },
                },
              }));
            }}
          />
        </FeatureEngineeringStepCard>

        <FeatureEngineeringStepCard
          checked={steps.encoding.enabled}
          onToggle={(event) =>
            onUpdateSteps((prev) => ({
              ...prev,
              encoding: { ...prev.encoding, enabled: event.target.checked },
            }))
          }
          icon="🏷️"
          label="Encoding"
          description="Transform categorical variables into model-friendly values."
        >
          <ValidatedColumnSelect
            allColumns={columns}
            selected={steps.encoding.columns}
            onChange={(value) => handleSelectColumns("encoding", value)}
            stepType="encoding"
            stepMethod={steps.encoding.method}
            dataPreview={dataPreview}
            label="Columns to encode (each can have different method: One-Hot / Label / Target)"
            placeholder={DEFAULT_COLUMNS_LABEL}
            allowColumnMethods={true}
            columnMethods={steps.encoding.columnMethods || {}}
            onColumnMethodChange={(col, method) => {
              onUpdateSteps((prev) => ({
                ...prev,
                encoding: {
                  ...prev.encoding,
                  columnMethods: { ...prev.encoding.columnMethods, [col]: method },
                },
              }));
            }}
          />
        </FeatureEngineeringStepCard>

        <FeatureEngineeringStepCard
          checked={steps.binning.enabled}
          onToggle={(event) =>
            onUpdateSteps((prev) => ({
              ...prev,
              binning: { ...prev.binning, enabled: event.target.checked },
            }))
          }
          icon="📦"
          label="Binning & discretization"
          description="Group continuous values into buckets for simpler patterns."
        >
          <div className={styles.inlineControlRow}>
            <label className={styles.inlineControlLabel} htmlFor="binning-bins">
              Number of bins
            </label>
            <input
              id="binning-bins"
              className={styles.inputSm}
              type="number"
              min="2"
              value={steps.binning.bins}
              onChange={(event) =>
                onUpdateSteps((prev) => ({
                  ...prev,
                  binning: { ...prev.binning, bins: event.target.value },
                }))
              }
            />
          </div>
          <ValidatedColumnSelect
            allColumns={columns}
            selected={steps.binning.columns}
            onChange={(value) => handleSelectColumns("binning", value)}
            stepType="binning"
            stepMethod={steps.binning.method}
            dataPreview={dataPreview}
            label="Columns to bin (each can have different method: Equal-Width / Quantile)"
            placeholder={DEFAULT_COLUMNS_LABEL}
            allowColumnMethods={true}
            columnMethods={steps.binning.columnMethods || {}}
            onColumnMethodChange={(col, method) => {
              onUpdateSteps((prev) => ({
                ...prev,
                binning: {
                  ...prev.binning,
                  columnMethods: { ...prev.binning.columnMethods, [col]: method },
                },
              }));
            }}
          />
        </FeatureEngineeringStepCard>

        <FeatureEngineeringStepCard
          checked={steps.featureCreation.polynomial.enabled || steps.featureCreation.datetime.enabled}
          onToggle={(event) => {
            const next = event.target.checked;
            onUpdateSteps((prev) => ({
              ...prev,
              featureCreation: {
                polynomial: { ...prev.featureCreation.polynomial, enabled: next },
                datetime: { ...prev.featureCreation.datetime, enabled: next },
              },
            }));
          }}
          icon="✨"
          label="Feature creation"
          description="Generate richer signals from your existing columns."
        >
          <div className={styles.subStepBlock}>
            <label className={styles.subStepCheckbox}>
              <input
                type="checkbox"
                checked={steps.featureCreation.polynomial.enabled}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    featureCreation: {
                      ...prev.featureCreation,
                      polynomial: {
                        ...prev.featureCreation.polynomial,
                        enabled: event.target.checked,
                      },
                    },
                  }))
                }
              />
              Polynomial features
            </label>
            {steps.featureCreation.polynomial.enabled && (
              <div className={styles.subStepContent}>
                <div className={styles.inlineControlRow}>
                  <label className={styles.inlineControlLabel} htmlFor="polynomial-degree">
                    Degree
                  </label>
                  <input
                    id="polynomial-degree"
                    className={styles.inputSm}
                    type="number"
                    min="2"
                    value={steps.featureCreation.polynomial.degree}
                    onChange={(event) =>
                      onUpdateSteps((prev) => ({
                        ...prev,
                        featureCreation: {
                          ...prev.featureCreation,
                          polynomial: {
                            ...prev.featureCreation.polynomial,
                            degree: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>
                <ValidatedColumnSelect
                  allColumns={columns}
                  selected={steps.featureCreation.polynomial.columns}
                  onChange={(value) => handleFeatureCreationColumns("polynomial", value)}
                  stepType="feature_creation"
                  stepMethod="polynomial"
                  dataPreview={dataPreview}
                  label="Columns for polynomial expansion"
                  placeholder={DEFAULT_COLUMNS_LABEL}
                />
              </div>
            )}
          </div>

          <div className={styles.subStepBlock}>
            <label className={styles.subStepCheckbox}>
              <input
                type="checkbox"
                checked={steps.featureCreation.datetime.enabled}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    featureCreation: {
                      ...prev.featureCreation,
                      datetime: {
                        ...prev.featureCreation.datetime,
                        enabled: event.target.checked,
                      },
                    },
                  }))
                }
              />
              Datetime decomposition
            </label>
            {steps.featureCreation.datetime.enabled && (
              <div className={styles.subStepContent}>
                <div className={styles.inlineControlRow}>
                  <label className={styles.inlineControlLabel} htmlFor="datetime-part">
                    Part
                  </label>
                  <select
                    id="datetime-part"
                    className={styles.selectSm}
                    value={steps.featureCreation.datetime.datePart}
                    onChange={(event) =>
                      onUpdateSteps((prev) => ({
                        ...prev,
                        featureCreation: {
                          ...prev.featureCreation,
                          datetime: {
                            ...prev.featureCreation.datetime,
                            datePart: event.target.value,
                          },
                        },
                      }))
                    }
                  >
                    <option value="year">Year</option>
                    <option value="month">Month</option>
                    <option value="day">Day</option>
                    <option value="hour">Hour</option>
                    <option value="minute">Minute</option>
                    <option value="second">Second</option>
                  </select>
                </div>
                <ValidatedColumnSelect
                  allColumns={columns}
                  selected={steps.featureCreation.datetime.columns}
                  onChange={(value) => handleFeatureCreationColumns("datetime", value)}
                  stepType="feature_creation"
                  stepMethod="datetime_decomposition"
                  dataPreview={dataPreview}
                  label="Datetime columns to decompose"
                  placeholder={DEFAULT_COLUMNS_LABEL}
                />
              </div>
            )}
          </div>
        </FeatureEngineeringStepCard>

        <FeatureEngineeringStepCard
          checked={steps.selection.enabled}
          onToggle={(event) =>
            onUpdateSteps((prev) => ({
              ...prev,
              selection: { ...prev.selection, enabled: event.target.checked },
            }))
          }
          icon="🔍"
          label="Feature selection"
          description="Trim redundant signals and focus on the strongest features."
        >
          <div className={styles.inlineControlRow}>
            <label className={styles.inlineControlLabel} htmlFor="selection-method">
              Method
            </label>
            <select
              id="selection-method"
              className={styles.selectSm}
              value={steps.selection.method}
              onChange={(event) =>
                onUpdateSteps((prev) => ({
                  ...prev,
                  selection: { ...prev.selection, method: event.target.value },
                }))
              }
            >
              <option value="correlation_filter">Correlation filter</option>
              <option value="variance_threshold">Variance threshold</option>
              <option value="pca">PCA</option>
            </select>
          </div>
          {steps.selection.method === "pca" ? (
            <div className={styles.inlineControlRow}>
              <label className={styles.inlineControlLabel} htmlFor="selection-components">
                Components
              </label>
              <input
                id="selection-components"
                className={styles.inputSm}
                type="number"
                min="1"
                value={steps.selection.n_components}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    selection: { ...prev.selection, n_components: event.target.value },
                  }))
                }
              />
            </div>
          ) : (
            <div className={styles.inlineControlRow}>
              <label className={styles.inlineControlLabel} htmlFor="selection-threshold">
                Threshold
              </label>
              <input
                id="selection-threshold"
                className={styles.inputSm}
                type="number"
                step="0.01"
                value={steps.selection.threshold}
                onChange={(event) =>
                  onUpdateSteps((prev) => ({
                    ...prev,
                    selection: { ...prev.selection, threshold: event.target.value },
                  }))
                }
              />
            </div>
          )}
          <ValidatedColumnSelect
            allColumns={columns}
            selected={steps.selection.columns}
            onChange={(value) => handleSelectColumns("selection", value)}
            stepType="feature_selection"
            stepMethod={steps.selection.method}
            dataPreview={dataPreview}
            label="Columns for selection"
            placeholder={DEFAULT_COLUMNS_LABEL}
          />
        </FeatureEngineeringStepCard>
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
              Run feature engineering
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
  steps: PropTypes.shape({
    scaling: PropTypes.shape({
      enabled: PropTypes.bool.isRequired,
      method: PropTypes.string.isRequired,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
    encoding: PropTypes.shape({
      enabled: PropTypes.bool.isRequired,
      method: PropTypes.string.isRequired,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
    binning: PropTypes.shape({
      enabled: PropTypes.bool.isRequired,
      method: PropTypes.string.isRequired,
      bins: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
    featureCreation: PropTypes.shape({
      polynomial: PropTypes.shape({
        enabled: PropTypes.bool.isRequired,
        degree: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        columns: PropTypes.arrayOf(PropTypes.string).isRequired,
      }).isRequired,
      datetime: PropTypes.shape({
        enabled: PropTypes.bool.isRequired,
        datePart: PropTypes.string.isRequired,
        columns: PropTypes.arrayOf(PropTypes.string).isRequired,
      }).isRequired,
    }).isRequired,
    selection: PropTypes.shape({
      enabled: PropTypes.bool.isRequired,
      method: PropTypes.string.isRequired,
      threshold: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      n_components: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      columns: PropTypes.arrayOf(PropTypes.string).isRequired,
    }).isRequired,
  }).isRequired,
  onUpdateSteps: PropTypes.func.isRequired,
  onChangeFile: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  activeSteps: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      details: PropTypes.string.isRequired,
      icon: PropTypes.node.isRequired,
    }),
  ).isRequired,
  result: PropTypes.object,
  collapseEnabled: PropTypes.bool,
  onCollapse: PropTypes.func,
};
