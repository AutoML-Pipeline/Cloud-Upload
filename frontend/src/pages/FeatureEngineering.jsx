import React, { useEffect, useState, useRef } from "react"; // Added useRef
import styles from "./FeatureEngineering.module.css";
import DataTable from "../components/DataTable";
import ColumnMultiSelect from "../components/ColumnMultiSelect";
import FormField from "../components/FormField";
import GlobalBackButton from "../components/GlobalBackButton";

const apiBase = "http://127.0.0.1:8000";

export default function FeatureEngineering() {
  const [step, setStep] = useState("select_file");
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState("");
  const [columns, setColumns] = useState([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const pageSectionRef = useRef(null); // Added pageSectionRef

  const setStepsStable = (updater) => {
    const container = pageSectionRef.current;
    const prevScroll = container ? container.scrollTop : window.scrollY;
    if (typeof updater === 'function') {
      // Handle function updaters for individual step states
      updater();
    }
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = prevScroll;
      } else {
        window.scrollTo(0, prevScroll);
      }
    });
  };

  const [scaling, setScaling] = useState({ enabled: false, method: "standard", columns: [] });
  const [encoding, setEncoding] = useState({ enabled: false, method: "onehot", columns: [] });
  const [binning, setBinning] = useState({ enabled: false, method: "equal_width", bins: 5, columns: [] });
  const [polynomial, setPolynomial] = useState({ enabled: false, degree: 2, include_bias: false, columns: [] });
  const [datetimeDecompose, setDatetimeDecompose] = useState({ enabled: false, columns: [], date_part: "year" });
  const [selection, setSelection] = useState({ enabled: false, method: "correlation", threshold: 0.95, n_components: 2, columns: [] });

  useEffect(() => {
    fetch(`${apiBase}/api/feature-engineering/files/cleaned`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setFiles(d);
      })
      .catch(() => {});
  }, []);

  const loadColumns = async (fname) => {
    setBusy(true);
    try {
      const resp = await fetch(`${apiBase}/api/feature-engineering/apply-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: fname, steps: [], current_step_index: -1 })
      });
      const data = await resp.json();
      console.log("Backend Response for Preview:", data);
      setResult(data);
      // Extract columns from the preview data structure
      if (data.preview && typeof data.preview === 'object') {
        const extractedColumns = Object.keys(data.preview);
        setColumns(extractedColumns);
      }
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };

  const onNextFromSelect = async () => {
    if (!filename) return;
    await loadColumns(filename);
    setStep("configure");
  };

  const apply = async () => {
    setBusy(true);
    try {
      const steps = [
        scaling.enabled ? { id: "scaling_step", type: "scaling", method: scaling.method, columns: scaling.columns } : null,
        encoding.enabled ? { id: "encoding_step", type: "encoding", method: encoding.method === "onehot" ? "one-hot" : encoding.method, columns: encoding.columns } : null,
        binning.enabled ? { id: "binning_step", type: "binning", method: binning.method, columns: binning.columns, bins: Number(binning.bins) || 5 } : null,
        polynomial.enabled ? { id: "polynomial_creation_step", type: "feature_creation", method: "polynomial", degree: Number(polynomial.degree) || 2, columns: polynomial.columns } : null,
        datetimeDecompose.enabled ? { id: "datetime_creation_step", type: "feature_creation", method: "datetime_decomposition", columns: datetimeDecompose.columns, date_part: datetimeDecompose.date_part } : null,
        // aggregation.enabled ? { type: "feature_creation", method: "aggregations", group_by: aggregation.group_by, aggregations: aggregation.aggregations } : null,
        selection.enabled ? { id: "selection_step", type: "feature_selection", method: selection.method === "correlation" ? "correlation_filter" : selection.method === "variance" ? "variance_threshold" : selection.method, threshold: Number(selection.threshold), n_components: Number(selection.n_components), columns: selection.columns } : null
      ].filter(Boolean);

      const resp = await fetch(`${apiBase}/api/feature-engineering/apply-preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, steps, current_step_index: steps.length - 1 })
      });
      const data = await resp.json();
      setResult(data);
      // Extract columns from the preview data structure
      if (data.preview && typeof data.preview === 'object') {
        const extractedColumns = Object.keys(data.preview);
        setColumns(extractedColumns);
      }
      setStep("preview");
    } finally {
      setBusy(false);
    }
  };


  function FeatureEngineeringStepCard({
    checked, onToggle, icon, label, children }) {
    return (
      <div className={styles.stepCard}>
        <label className={styles.stepCardLabel}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
          />
          <span className={styles.stepCardIcon}>{icon}</span>
          <span className={styles.stepCardTitle}>{label}</span>
        </label>
        {checked && <div className={styles.stepCardContent}>{children}</div>}
      </div>
    );
  }

  const ColumnMulti = ({ value, onChange, label, placeholder }) => (
            <ColumnMultiSelect
              columns={columns}
      selected={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
    />
  );

        return (
    <div className={`app-shell-with-chrome ${styles.pageShell}`}>
      <div className={styles.globalBackButtonAdjusted}>
        <GlobalBackButton />
      </div>
      <div className={styles.pageSection} ref={pageSectionRef}> {/* Added ref */}
        <div className={styles.centeredContent}> {/* Added centeredContent */}
          <div className={styles.card}>
            {step === "select_file" && (
              <>
                <h2 className={styles.heading}>Feature Engineering</h2> {/* Changed to h2 and applied heading style */}
                <p className={styles.description}>Select a cleaned file to begin feature engineering.</p>
                {/* Removed label per request */}
                <div>
                  <select
                    value={filename || ''}
                    onChange={e => setFilename(e.target.value)}
                    className={styles.fileSelect}
                  >
                    <option value="" disabled>Select a file...</option>
                    {files.map(f => {
                      const display = (f.name || '').split('/').pop();
                      return (
                      <option key={f.name} value={f.name}>
                          {display}
                      </option>
                      );
                    })}
                  </select>
                  </div>
                <div className={styles.buttonRow}>
                  <button className={styles.submitBtn} disabled={!filename || busy} onClick={onNextFromSelect}>
                    {busy ? "Loading..." : "Next"}
                  </button>
                  </div>
              </>
            )}

            {step === "configure" && (
              <>
                <div className={styles.backButtonTop}> {/* Added backButtonTop div */}
                    <button
                      type="button"
                    onClick={() => setStep("select_file")}
                      className={styles.backBtn}
                    >
                      <div className={styles.submitContent}>
                        <span className={styles.submitIcon}>⬅️</span>
                        Back to File Selection
                      </div>
                    </button>
                </div>
                <h2 className={styles.heading}>Configure Feature Engineering</h2>
                <p className={styles.description}>Select and configure feature engineering steps.</p>
                
                {columns.length === 0 ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading columns...</p>
                  </div>
                ) : (
                  <>
                    <div className={styles.preprocessingStepsList}>

                      <FeatureEngineeringStepCard title="Scaling"
                        checked={scaling.enabled} onToggle={(e) => setStepsStable(() => setScaling({ ...scaling, enabled: e.target.checked }))} icon="📈" label="Scaling">
                        <select className={styles.selectSm} value={scaling.method} onChange={(e) => setScaling({ ...scaling, method: e.target.value })}>
                          <option value="standard">Standard</option>
                          <option value="minmax">MinMax</option>
                          <option value="robust">Robust</option>
                          <option value="log">Log</option>
                        </select>
                        <ColumnMulti value={scaling.columns} onChange={(v) => setScaling({ ...scaling, columns: v })} label="Columns to scale" placeholder="Select columns..." />
                      </FeatureEngineeringStepCard>

                      <FeatureEngineeringStepCard title="Encoding"
                        checked={encoding.enabled} onToggle={(e) => setStepsStable(() => setEncoding({ ...encoding, enabled: e.target.checked }))} icon="🏷️" label="Encoding">
                        <select className={styles.selectSm} value={encoding.method} onChange={(e) => setEncoding({ ...encoding, method: e.target.value })}>
                          <option value="one-hot">One-hot</option>
                          <option value="label">Label</option>
                          <option value="target">Target</option>
                        </select>
                        <ColumnMulti value={encoding.columns} onChange={(v) => setEncoding({ ...encoding, columns: v })} label="Columns to encode" placeholder="Select columns..." />
                      </FeatureEngineeringStepCard>

                      <FeatureEngineeringStepCard title="Binning/Discretization"
                        checked={binning.enabled} onToggle={(e) => setStepsStable(() => setBinning({ ...binning, enabled: e.target.checked }))} icon="📦" label="Binning/Discretization">
                        <select className={styles.selectSm} value={binning.method} onChange={(e) => setBinning({ ...binning, method: e.target.value })}>
                          <option value="equal-width">Equal-width</option>
                          <option value="quantile">Quantile</option>
                        </select>
                        <input className={styles.inputSm} type="number" min="2" value={binning.bins} onChange={(e) => setBinning({ ...binning, bins: e.target.value })} />
                        <ColumnMulti value={binning.columns} onChange={(v) => setBinning({ ...binning, columns: v })} label="Columns to bin" placeholder="Select columns..." />
                      </FeatureEngineeringStepCard>

                      <FeatureEngineeringStepCard title="Feature Creation"
                        checked={polynomial.enabled || datetimeDecompose.enabled} onToggle={(e) => setStepsStable(() => {
                          if (e.target.checked) {
                            // Enable both by default when checking the main checkbox
                            setPolynomial(prev => ({ ...prev, enabled: true }));
                            setDatetimeDecompose(prev => ({ ...prev, enabled: true }));
                          } else {
                            // Disable both when unchecking the main checkbox
                            setPolynomial(prev => ({ ...prev, enabled: false }));
                            setDatetimeDecompose(prev => ({ ...prev, enabled: false }));
                          }
                        })} icon="✨" label="Feature Creation">
                        <div>
                          <label className={styles.row}><input type="checkbox" checked={polynomial.enabled} onChange={(e) => setPolynomial({ ...polynomial, enabled: e.target.checked })} /> Polynomial Features</label>
                          {polynomial.enabled && (
                            <>
                              <input className={styles.inputSm} type="number" min="2" value={polynomial.degree} onChange={(e) => setPolynomial({ ...polynomial, degree: e.target.value })} />
                              <ColumnMulti value={polynomial.columns} onChange={(v) => setPolynomial({ ...polynomial, columns: v })} label="Columns for polynomial features" placeholder="Select columns..." />
                            </>
                          )}
                            </div>
                        <div>
                          <label className={styles.row}><input type="checkbox" checked={datetimeDecompose.enabled} onChange={(e) => setDatetimeDecompose({ ...datetimeDecompose, enabled: e.target.checked })} /> Datetime Decomposition</label>
                          {datetimeDecompose.enabled && (
                            <>
                              <select className={styles.selectSm} value={datetimeDecompose.date_part} onChange={(e) => setDatetimeDecompose({ ...datetimeDecompose, date_part: e.target.value })}>
                                <option value="year">Year</option>
                                <option value="month">Month</option>
                                <option value="day">Day</option>
                                <option value="hour">Hour</option>
                                <option value="minute">Minute</option>
                                <option value="second">Second</option>
                              </select>
                              <ColumnMulti value={datetimeDecompose.columns} onChange={(v) => setDatetimeDecompose({ ...datetimeDecompose, columns: v })} label="Datetime columns for decomposition" placeholder="Select columns..." />
                            </>
                          )}
                            </div>
                        {/* Aggregations will be added later if needed */}
                      </FeatureEngineeringStepCard>

                      <FeatureEngineeringStepCard title="Feature Selection"
                        checked={selection.enabled} onToggle={(e) => setStepsStable(() => setSelection({ ...selection, enabled: e.target.checked }))} icon="🔍" label="Feature Selection">
                        <select className={styles.selectSm} value={selection.method} onChange={(e) => setSelection({ ...selection, method: e.target.value })}>
                          <option value="correlation_filter">Correlation Filter</option>
                          <option value="variance_threshold">Variance Threshold</option>
                          <option value="pca">PCA</option>
                        </select>
                        {selection.method !== "pca" && (
                          <input className={styles.inputSm} type="number" step="0.01" value={selection.threshold} onChange={(e) => setSelection({ ...selection, threshold: e.target.value })} />
                        )}
                        {selection.method === "pca" && (
                          <input className={styles.inputSm} type="number" min="1" value={selection.n_components} onChange={(e) => setSelection({ ...selection, n_components: e.target.value })} />
                        )}
                        <ColumnMulti value={selection.columns} onChange={(v) => setSelection({ ...selection, columns: v })} label="Columns for feature selection" placeholder="Select columns..." />
                      </FeatureEngineeringStepCard>

                    </div>
                    <div className={styles.buttonRow}>
                      <button className={styles.backBtn} onClick={() => setStep("select_file")}>Back</button>
                      <button className={styles.submitBtn} disabled={busy} onClick={apply}>Apply Feature Engineering</button>
                      </div>
                  </>
                )}
              </>
            )}

            {step === "preview" && (
              <>
                <h2 className={styles.heading}>Feature Engineering Results</h2> {/* Changed to h2 and applied heading style */}
                <p className={styles.description}>Review the changes and save the engineered data.</p>
                {result?.preview && (
                  <DataTable
                    data={result.preview}
                    filledNullColumns={[]}
                    originalFilename={filename}
                  />
                )}
                {result?.change_metadata && result.change_metadata.length > 0 && (
                  <div className={styles.summaryCard}>
                    <h4 className={styles.summaryHeading}>Feature Engineering Summary:</h4>
                    <div className={styles.summaryDetails}>
                      {result.change_metadata.map((m, i) => (
                        <div key={i} className={styles.summaryItem}>
                          <span className={styles.summaryOperation}>{m.operation}:</span>
                          <span className={styles.summaryInfo}>{JSON.stringify(m.details)}</span>
                        </div>
                      ))}
                    </div>
              </div>
            )}
                <div className={styles.buttonRow}>
                  <button className={styles.backBtn} onClick={() => setStep("configure")}>Back</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


