import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import FormField from "../components/FormField";
import { toast } from 'react-hot-toast';
import styles from "./Preprocessing.module.css";
import DataTable from "../components/DataTable";
import ColumnMultiSelect from "../components/ColumnMultiSelect";
import FillNullSelector from "../components/FillNullSelector";
import ColumnDragReorder from "../components/ColumnDragReorder";
// import UploadedFilesTable from "../components/UploadedFilesTable"; // Removed UploadedFilesTable import
import { useLocation } from 'react-router-dom';

export default function Preprocessing() {
  const { data: filesData } = useQuery({
    queryKey: ['files', 'list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/files/list');
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('select_file');
  const [preprocessingSteps, setPreprocessingSteps] = useState({
    removeDuplicates: false,
    removeDuplicatesColumns: [],
    removeNulls: false,
    removeNullsColumns: [],
    fillNulls: false,
    fillNullsColumns: [],
    fillColumnStrategies: {},
    dropColumns: false,
    dropColumnsColumns: [],
    removeOutliers: false,
    removeOutliersConfig: {
      method: 'iqr',
      factor: 1.5,
      columns: []
    },
  });
  const [fullData, setFullData] = useState(null);
  const [dataPreview, setDataPreview] = useState(null);
  const location = useLocation();
  const pageSectionRef = useRef(null);

  const setStepsStable = (updater) => {
    const container = pageSectionRef.current;
    const prevScroll = container ? container.scrollTop : window.scrollY;
    setPreprocessingSteps(prev => (typeof updater === 'function' ? updater(prev) : updater));
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = prevScroll;
      } else {
        window.scrollTo(0, prevScroll);
      }
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fileFromUrl = params.get('file');
    if (fileFromUrl && fileFromUrl !== selectedFile) {
      setSelectedFile(fileFromUrl);
      setStep('configure_preprocessing');
      setDataPreview(null);
    } else if (!selectedFile && files.length && step === 'select_file') {
      setSelectedFile(files[0].name);
    }
  }, [files, selectedFile, step, location.search]);

  useEffect(() => {
    if (selectedFile && step === 'configure_preprocessing') {
      setDataPreview(null);
      const baseFilename = selectedFile.split('/').pop();
      fetch(`http://localhost:8000/data/preview/${baseFilename}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch file preview: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          setDataPreview(data);
          setPreprocessingSteps(prev => ({
            ...prev,
            removeDuplicates: false,
            removeDuplicatesColumns: [],
            removeNulls: false,
            removeNullsColumns: [],
            fillNulls: false,
            fillNullsColumns: [],
            fillColumnStrategies: {},
            dropColumns: false,
            dropColumnsColumns: [],
          }));
        })
        .catch(error => {
          console.error("Error fetching data preview:", error);
          toast.error("Failed to load file preview: " + error.message);
          setDataPreview(null);
        });
    }
  }, [selectedFile, step]);

  useEffect(() => {
    setPreprocessingSteps(prev => {
      const newFillColumnStrategies = { ...prev.fillColumnStrategies };
      const currentSelected = prev.fillNullsColumns || [];

      currentSelected.forEach(col => {
        if (!newFillColumnStrategies[col]) {
          newFillColumnStrategies[col] = { strategy: 'mean', value: '' };
        }
      });

      for (const col in newFillColumnStrategies) {
        if (!currentSelected.includes(col)) {
          delete newFillColumnStrategies[col];
        }
      }

      return { ...prev, fillColumnStrategies: newFillColumnStrategies };
    });
  }, [preprocessingSteps.fillNullsColumns]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let stepsPayload = {};
      if (preprocessingSteps.removeDuplicates) {
        stepsPayload.removeDuplicates = true;
        stepsPayload.duplicateSubset = preprocessingSteps.removeDuplicatesColumns;
      }
      if (preprocessingSteps.removeNulls) {
        stepsPayload.removeNulls = true;
        stepsPayload.removeNullsColumns = preprocessingSteps.removeNullsColumns; 
      }
      if (preprocessingSteps.fillNulls) {
        stepsPayload.fillNulls = true;
        stepsPayload.fillStrategies = {};
        for (const col of preprocessingSteps.fillNullsColumns) {
          const strategyInfo = preprocessingSteps.fillColumnStrategies[col];
          if (strategyInfo) {
            stepsPayload.fillStrategies[col] = { 
              strategy: strategyInfo.strategy,
              value: strategyInfo.strategy === 'custom' ? strategyInfo.value : undefined
            };
          }
        }
      }
      if (preprocessingSteps.dropColumns) {
        stepsPayload.dropColumns = preprocessingSteps.dropColumnsColumns;
      }
      if (preprocessingSteps.removeOutliers) {
        stepsPayload.removeOutliers = true;
        stepsPayload.removeOutliersConfig = {
          method: preprocessingSteps.removeOutliersConfig.method,
          factor: preprocessingSteps.removeOutliersConfig.factor,
          columns: preprocessingSteps.removeOutliersConfig.columns,
        };
      }

      console.log("Sending preprocessing payload:", { steps: stepsPayload });
      const baseFilename = selectedFile.split('/').pop();
      const res = await fetch(`http://localhost:8000/api/data/preprocess/${baseFilename}?full=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });
      const data = await res.json();
      console.log("Received preprocessing response:", data);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Preprocessing completed!");
        setResult(data);
        setFullData(data.full_data || data.preview);
      }
    } catch (err) {
      toast.error("Failed to preprocess: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = dataPreview?.columns || [];
  const nullCounts = dataPreview?.null_counts || {};

  function PreprocessingStepCard({
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

  const renderPreviewTable = () => {
    if (!result) return null;
    
    const rawData = result.full_data || result.preview;
    const originalData = result.original_preview;
    
    // Transform array of objects to object with column arrays for DataTable
    const tableData = {};
    if (rawData && rawData.length > 0) {
      const columns = Object.keys(rawData[0]);
      columns.forEach(col => {
        tableData[col] = rawData.map(row => row[col]);
      });
    }
    
    // Transform original data in the same way
    const transformedOriginalData = {};
    if (originalData && originalData.length > 0) {
      const origColumns = Object.keys(originalData[0]);
      origColumns.forEach(col => {
        transformedOriginalData[col] = originalData.map(row => row[col]);
      });
    }
    
    return (
      <div className={styles.card}>
        <div className={styles.previewHeader}>
          <h3 className={styles.heading} style={{ fontSize: '1.5rem', marginBottom: '1.2rem' }}>Data Preview</h3>
        </div>

        <div className={styles.previewNote}>
          <span>Showing all rows</span>
          {result.diff_marks && (Object.keys(result.diff_marks.updated_cells || {}).length > 0) && (
            <span className={styles.diffInfo}>
              • Updated cells highlighted
            </span>
          )}
        </div>
        
        <DataTable 
          data={tableData} 
          originalData={transformedOriginalData} 
          compareOriginal={true} 
          highlightChanges={true} 
          diffMarks={result?.diff_marks}
          originalFilename={selectedFile}
          filledNullColumns={preprocessingSteps.fillNullsColumns}
        />
        
        {result?.change_metadata && result.change_metadata.length > 0 && (
          <div className={styles.summaryCard}>
            <h4 className={styles.summaryHeading}>Preprocessing Summary:</h4>
            <div className={styles.summaryDetails}>
              {result.change_metadata.map((item, index) => {
                if (item.operation === "Fill Nulls") {
                  return (
                    <div key={index} className={styles.summaryItem}>
                      <span className={styles.summaryOperation}>Fill Nulls:</span>
                      <span className={styles.summaryInfo}>Column: {item.column}, Strategy: {item.strategy} {item.value !== undefined ? `(Value: ${item.value})` : ''}</span>
                    </div>
                  );
                } else if (item.operation === "Drop Columns") {
                  return (
                    <div key={index} className={styles.summaryItem}>
                      <span className={styles.summaryOperation}>Drop Columns:</span>
                      {item.columns_dropped && item.columns_dropped.length > 0 ? (
                        <span className={styles.summaryInfo}>Dropped columns: {item.columns_dropped.join(', ')}</span>
                      ) : (
                        <span className={styles.summaryInfo}>No columns dropped.</span>
                      )}
                    </div>
                  );
                } else if (item.operation === "Remove Outliers") {
                  return (
                    <div key={index} className={styles.summaryItem}>
                      <span className={styles.summaryOperation}>Remove Outliers:</span>
                      <span className={styles.summaryInfo}>Method: {item.method}, Factor: {item.factor}, Removed {item.rows_removed} rows</span>
                      {item.columns && item.columns !== 'all' && item.columns.length > 0 && (
                        <span className={styles.summaryInfo}>on columns: {item.columns.join(', ')}</span>
                      )}
                      {item.columns === 'all' && (
                        <span className={styles.summaryInfo}>on all numeric columns</span>
                      )}
                    </div>
                  );
                } 
                else {
                  return (
                    <div key={index} className={styles.summaryItem}>
                      <span className={styles.summaryOperation}>{item.operation}:</span>
                      {item.rows_removed > 0 && (
                        <span className={styles.summaryInfo}>Removed {item.rows_removed} rows</span>
                      )}
                      {item.columns && item.columns !== 'all' && item.columns.length > 0 && (
                        <span className={styles.summaryInfo}>on columns: {item.columns.join(', ')}</span>
                      )}
                      {item.columns === 'all' && (
                        <span className={styles.summaryInfo}>on all columns</span>
                      )}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.pageShell}>
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <GlobalBackButton className={styles.globalBackButtonAdjusted} />
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <div className={styles.card}>
            <h2 className={styles.heading}>Smart Data Preprocessing</h2>
            {step === 'configure_preprocessing' && (
              <div className={styles.backButtonTop}>
                <button
                  type="button"
                  onClick={() => setStep('select_file')}
                  className={styles.backBtn}
                >
                  <div className={styles.submitContent}>
                    <span className={styles.submitIcon}>⬅️</span>
                    Back to File Selection
                  </div>
                </button>
              </div>
            )}
            {step === 'select_file' && (
              <>
                <FormField label="Select File *">
                  <select
                      value={selectedFile || ''}
                    onChange={e => setSelectedFile(e.target.value)}
                      className={styles.fileSelect}
                  >
                    <option value="" disabled>Select a file...</option>
                    {files.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button
                  type="button"
                  disabled={!selectedFile}
                  className={styles.submitBtn}
                  onClick={() => setStep('configure_preprocessing')}
                >
                  <div className={styles.submitContent}>
                    <span role="img" aria-label="next">➡️</span> Next
                  </div>
                </button>
              </>
            )}

            {step === 'configure_preprocessing' && (
              <>
                {dataPreview === null && selectedFile && !filesData?.isFetching && (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading file preview...</p>
                  </div>
                )}
                {dataPreview === null && selectedFile && filesData?.isFetching && (
                  <p className={styles.loadingColumnsMsg}>Fetching file list...</p>
                )}
                {dataPreview && dataPreview.error && (
                  <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>Error: {dataPreview.error}</p>
                    <p className={styles.errorHint}>Please check the file for corruption or unsupported content.</p>
                  </div>
                )}
                <form onSubmit={handleSubmit} className={styles.form}>
                  <div className={styles.selectedFileDisplay}>Selected File: <strong>{selectedFile}</strong></div>
                  
                  {dataPreview && (
                    <div className={styles.preprocessingStepsList}>
                      <PreprocessingStepCard
                        checked={preprocessingSteps.removeDuplicates}
                        onToggle={e => setStepsStable(s => ({ ...s, removeDuplicates: e.target.checked }))}
                        icon="🧹"
                        label="Remove Duplicates"
                      >
                        <ColumnMultiSelect
                          columns={columns}
                          selected={preprocessingSteps.removeDuplicatesColumns}
                          onChange={cols => setStepsStable(s => ({ ...s, removeDuplicatesColumns: cols }))}
                          label="Columns for duplicate detection (default: all)"
                          placeholder="Select columns..."
                        />
                      </PreprocessingStepCard>
                      <PreprocessingStepCard
                        checked={preprocessingSteps.removeNulls}
                        onToggle={e => setStepsStable(s => ({ ...s, removeNulls: e.target.checked }))}
                        icon="🚫"
                        label="Remove Nulls"
                      >
                        <ColumnMultiSelect
                          columns={columns}
                          selected={preprocessingSteps.removeNullsColumns}
                          onChange={cols => setStepsStable(s => ({ ...s, removeNullsColumns: cols }))}
                          label="Columns for null removal (default: all)"
                          placeholder="Select columns..."
                        />
                      </PreprocessingStepCard>
                      <PreprocessingStepCard
                        checked={preprocessingSteps.fillNulls}
                        onToggle={e => setStepsStable(s => ({ ...s, fillNulls: e.target.checked }))}
                        icon="🧴"
                        label="Fill Nulls"
                      >
                        <FillNullSelector
                          columns={columns}
                          nullCounts={nullCounts}
                          selected={preprocessingSteps.fillNullsColumns}
                          onChangeSelected={cols => setStepsStable(s => ({ ...s, fillNullsColumns: cols }))}
                          strategies={preprocessingSteps.fillColumnStrategies}
                          onChangeStrategy={(col, strategy, value) => setStepsStable(s => ({
                            ...s,
                            fillColumnStrategies: {
                              ...s.fillColumnStrategies,
                              [col]: { strategy, value }
                            }
                          }))}
                        />
                      </PreprocessingStepCard>
                      <PreprocessingStepCard
                        checked={preprocessingSteps.dropColumns}
                        onToggle={e => setStepsStable(s => ({ ...s, dropColumns: e.target.checked }))}
                        icon="🗑️"
                        label="Drop Columns"
                      >
                        <ColumnMultiSelect
                          columns={columns}
                          selected={preprocessingSteps.dropColumnsColumns}
                          onChange={cols => setStepsStable(s => ({ ...s, dropColumnsColumns: cols }))}
                          label="Columns to drop"
                          placeholder="Select columns..."
                        />
                      </PreprocessingStepCard>
                      <PreprocessingStepCard
                        checked={preprocessingSteps.removeOutliers}
                        onToggle={e => setStepsStable(s => ({ ...s, removeOutliers: e.target.checked }))}
                        icon="📈"
                        label="Remove Outliers"
                      >
                        <div className={styles.outlierConfig}>
                          <label className={styles.outlierLabel}>Method:</label>
                          <select
                            className={styles.outlierSelect}
                            value={preprocessingSteps.removeOutliersConfig.method}
                            onChange={e => setStepsStable(s => ({
                              ...s,
                              removeOutliersConfig: { ...s.removeOutliersConfig, method: e.target.value }
                            }))}
                          >
                            <option value="iqr">IQR (Interquartile Range)</option>
                            <option value="zscore">Z-Score</option>
                          </select>
                          <label className={styles.outlierLabel}>Factor:</label>
                          <input
                            type="number"
                            step="0.1"
                            className={styles.outlierInput}
                            value={preprocessingSteps.removeOutliersConfig.factor}
                            onChange={e => setStepsStable(s => ({
                              ...s,
                              removeOutliersConfig: { ...s.removeOutliersConfig, factor: parseFloat(e.target.value) }
                            }))}
                          />
                        </div>
                        <ColumnMultiSelect
                          columns={columns}
                          selected={preprocessingSteps.removeOutliersConfig.columns}
                          onChange={cols => setStepsStable(s => ({
                            ...s,
                            removeOutliersConfig: { ...s.removeOutliersConfig, columns: cols }
                          }))}
                          label="Columns for outlier detection (default: all numeric)"
                          placeholder="Select columns..."
                        />
                      </PreprocessingStepCard>
                    </div>
                  )}

                  <div className={styles.buttonGroup}>
              <button 
                type="submit" 
                disabled={loading || !selectedFile} 
                className={styles.submitBtn}
              >
                {loading ? (
                  <div className={styles.loadingWrapper}>
                    <div className={styles.loadingSpinner}></div>
                    Processing...
                  </div>
                ) : (
                  <div className={styles.submitContent}>
                    <span className={styles.submitIcon}>🚀</span>
                    Start Manual Preprocessing
                  </div>
                )}
              </button>
                  </div>
            </form>
              </>
            )}

            {result && renderPreviewTable()}
          </div>
        </div>
      </div>
    </div>
  );
}
