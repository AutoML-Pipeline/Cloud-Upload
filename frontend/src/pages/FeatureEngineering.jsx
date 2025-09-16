import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import FormField from "../components/FormField";
import { toast } from 'react-hot-toast';
import styles from "./FeatureEngineering.module.css";
import DataTable from "../components/DataTable";
import ColumnMultiSelect from "../components/ColumnMultiSelect";
import CustomSelect from "../components/CustomSelect";
import { useLocation } from 'react-router-dom';

export default function FeatureEngineering() {
  const { data: filesData } = useQuery({
    queryKey: ['files', 'cleaned-data'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/files/list?folder=cleaned-data');
      if (!res.ok) throw new Error('Failed to fetch cleaned files');
      const data = await res.json();
      console.log("Files from cleaned-data bucket:", data.files);
      return data;
    },
    staleTime: 60 * 1000,
  });
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [step, setStep] = useState('select_file');
  const [featureSteps, setFeatureSteps] = useState([]);
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [fullData, setFullData] = useState(null);
  const [dataPreview, setDataPreview] = useState(null);
  const location = useLocation();
  const pageSectionRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fileFromUrl = params.get('file');
    console.log("URL parameter file:", fileFromUrl);
    console.log("Available files:", files.map(f => f.name));
    
    if (fileFromUrl && fileFromUrl !== selectedFile) {
      // Check if the file from URL exists in the cleaned files
      const fileExists = files.some(f => f.name === fileFromUrl);
      if (fileExists) {
        console.log("Setting file from URL:", fileFromUrl);
        setSelectedFile(fileFromUrl);
        setStep('configure_features');
        setDataPreview(null);
      } else {
        console.log("File from URL not found in cleaned files:", fileFromUrl);
        // If file doesn't exist, just select the first available file
        if (files.length > 0) {
          setSelectedFile(files[0].name);
        }
      }
    } else if (!selectedFile && files.length && step === 'select_file') {
      setSelectedFile(files[0].name);
    }
  }, [files, selectedFile, step, location.search]);

  useEffect(() => {
    if (selectedFile && step === 'configure_features') {
      setDataPreview(null);
      console.log("Fetching preview for file:", selectedFile);
      fetch(`http://localhost:8000/feature-engineering/preview/${selectedFile}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch file preview: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Preview data received:", data);
          setDataPreview(data);
          setFeatureSteps([]);
        })
        .catch(error => {
          console.error("Error fetching data preview:", error);
          toast.error("Failed to load file preview: " + error.message);
          setDataPreview(null);
        });
    }
  }, [selectedFile, step]);

  const addFeatureStep = (operation) => {
    const newStep = {
      step_id: `step_${Date.now()}`,
      operation: operation,
      config: getDefaultConfig(operation)
    };
    setFeatureSteps(prev => [...prev, newStep]);
  };

  const getDefaultConfig = (operation) => {
    switch (operation) {
      case 'scaling':
        return { method: 'standard', columns: [] };
      case 'encoding':
        return { method: 'one_hot', columns: [], target_column: null };
      case 'binning':
        return { method: 'equal_width', columns: [], n_bins: 5 };
      case 'feature_creation':
        return { method: 'polynomial', polynomial: { degree: 2, columns: [], include_bias: false } };
      case 'feature_selection':
        return { method: 'variance_threshold', variance_threshold: { threshold: 0.01, columns: [] } };
      default:
        return {};
    }
  };

  const updateStepConfig = (stepId, config) => {
    setFeatureSteps(prev => prev.map(step => 
      step.step_id === stepId ? { ...step, config } : step
    ));
  };

  const removeStep = (stepId) => {
    setFeatureSteps(prev => prev.filter(step => step.step_id !== stepId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload = {
        backend: 'pandas',
        steps: featureSteps
      };

      console.log("Sending feature engineering payload:", payload);
      const res = await fetch(`http://localhost:8000/feature-engineering/apply/${selectedFile}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Received feature engineering response:", data);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Feature engineering completed!");
        setResult(data);
      }
    } catch (err) {
      toast.error("Failed to apply feature engineering: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const columns = dataPreview?.columns || [];
  const nullCounts = dataPreview?.null_counts || {};

  function FeatureStepCard({ step, onUpdate, onRemove }) {
    return (
      <div className={styles.stepCard}>
        <div className={styles.stepCardHeader}>
          <span className={styles.stepCardIcon}>{getStepIcon(step.operation)}</span>
          <span className={styles.stepCardTitle}>{getStepTitle(step.operation)}</span>
          <button 
            type="button" 
            onClick={() => onRemove(step.step_id)}
            className={styles.removeStepBtn}
          >
            ✕
          </button>
        </div>
        <div className={styles.stepCardContent}>
          {renderStepConfig(step, onUpdate)}
        </div>
      </div>
    );
  }

  const getStepIcon = (operation) => {
    const icons = {
      scaling: '📊',
      encoding: '🏷️',
      binning: '📦',
      feature_creation: '✨',
      feature_selection: '🎯'
    };
    return icons[operation] || '⚙️';
  };

  const getStepTitle = (operation) => {
    const titles = {
      scaling: 'Scaling',
      encoding: 'Encoding',
      binning: 'Binning',
      feature_creation: 'Feature Creation',
      feature_selection: 'Feature Selection'
    };
    return titles[operation] || operation;
  };

  const renderStepConfig = (step, onUpdate) => {
    const { operation, config } = step;
    
    switch (operation) {
      case 'scaling':
        return (
          <div>
            <label className={styles.configLabel}>Method:</label>
            <CustomSelect
              value={config.method || 'standard'}
              onChange={(value) => {
                console.log("Scaling method changed to:", value);
                onUpdate(step.step_id, { ...config, method: value });
              }}
              options={[
                { value: 'standard', label: 'Standard Scaling' },
                { value: 'minmax', label: 'Min-Max Scaling' },
                { value: 'robust', label: 'Robust Scaling' },
                { value: 'log', label: 'Log Transformation' }
              ]}
              placeholder="Select scaling method..."
            />
            <ColumnMultiSelect
              columns={columns}
              selected={config.columns || []}
              onChange={cols => onUpdate(step.step_id, { ...config, columns: cols })}
              label="Columns to scale (default: all numeric)"
              placeholder="Select columns..."
            />
          </div>
        );
      
      case 'encoding':
        return (
          <div>
            <label className={styles.configLabel}>Method:</label>
            <CustomSelect
              value={config.method || 'one_hot'}
              onChange={(value) => onUpdate(step.step_id, { ...config, method: value })}
              options={[
                { value: 'one_hot', label: 'One-Hot Encoding' },
                { value: 'label', label: 'Label Encoding' },
                { value: 'target', label: 'Target Encoding' }
              ]}
              placeholder="Select encoding method..."
            />
            <ColumnMultiSelect
              columns={columns}
              selected={config.columns || []}
              onChange={cols => onUpdate(step.step_id, { ...config, columns: cols })}
              label="Columns to encode (default: all categorical)"
              placeholder="Select columns..."
            />
            {config.method === 'target' && (
              <div>
                <label className={styles.configLabel}>Target Column:</label>
                <select
                  value={config.target_column || ''}
                  onChange={e => onUpdate(step.step_id, { ...config, target_column: e.target.value })}
                  className={styles.configSelect}
                >
                  <option value="">Select target column...</option>
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      
      case 'binning':
        return (
          <div>
            <label className={styles.configLabel}>Method:</label>
            <CustomSelect
              value={config.method || 'equal_width'}
              onChange={(value) => onUpdate(step.step_id, { ...config, method: value })}
              options={[
                { value: 'equal_width', label: 'Equal Width' },
                { value: 'quantile', label: 'Quantile' }
              ]}
              placeholder="Select binning method..."
            />
            <label className={styles.configLabel}>Number of Bins:</label>
            <input
              type="number"
              min="2"
              max="20"
              value={config.n_bins || 5}
              onChange={e => onUpdate(step.step_id, { ...config, n_bins: parseInt(e.target.value) })}
              className={styles.configInput}
            />
            <ColumnMultiSelect
              columns={columns}
              selected={config.columns || []}
              onChange={cols => onUpdate(step.step_id, { ...config, columns: cols })}
              label="Columns to bin (default: all numeric)"
              placeholder="Select columns..."
            />
          </div>
        );
      
      case 'feature_creation':
        return (
          <div>
            <label className={styles.configLabel}>Method:</label>
            <CustomSelect
              value={config.method || 'polynomial'}
              onChange={(value) => onUpdate(step.step_id, { ...config, method: value })}
              options={[
                { value: 'polynomial', label: 'Polynomial Features' },
                { value: 'datetime_decomposition', label: 'Datetime Decomposition' },
                { value: 'aggregations', label: 'Aggregations' }
              ]}
              placeholder="Select feature creation method..."
            />
            {config.method === 'polynomial' && (
              <div>
                <label className={styles.configLabel}>Degree:</label>
                <input
                  type="number"
                  min="2"
                  max="5"
                  value={config.polynomial?.degree || 2}
                  onChange={e => onUpdate(step.step_id, { 
                    ...config, 
                    polynomial: { ...config.polynomial, degree: parseInt(e.target.value) }
                  })}
                  className={styles.configInput}
                />
                <ColumnMultiSelect
                  columns={columns}
                  selected={config.polynomial?.columns || []}
                  onChange={cols => onUpdate(step.step_id, { 
                    ...config, 
                    polynomial: { ...config.polynomial, columns: cols }
                  })}
                  label="Columns for polynomial features"
                  placeholder="Select columns..."
                />
              </div>
            )}
          </div>
        );
      
      case 'feature_selection':
        return (
          <div>
            <label className={styles.configLabel}>Method:</label>
            <CustomSelect
              value={config.method || 'variance_threshold'}
              onChange={(value) => onUpdate(step.step_id, { ...config, method: value })}
              options={[
                { value: 'variance_threshold', label: 'Variance Threshold' },
                { value: 'correlation_filter', label: 'Correlation Filter' },
                { value: 'pca', label: 'PCA' }
              ]}
              placeholder="Select feature selection method..."
            />
            {config.method === 'variance_threshold' && (
              <div>
                <label className={styles.configLabel}>Threshold:</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  max="1"
                  value={config.variance_threshold?.threshold || 0.01}
                  onChange={e => onUpdate(step.step_id, { 
                    ...config, 
                    variance_threshold: { ...config.variance_threshold, threshold: parseFloat(e.target.value) }
                  })}
                  className={styles.configInput}
                />
              </div>
            )}
          </div>
        );
      
      default:
        return <div>Unknown operation</div>;
    }
  };

  // Fetch full data when Show All is clicked
  const handleShowAll = async () => {
    setLoading(true);
    try {
      const payload = {
        backend: 'pandas',
        steps: featureSteps
      };

      console.log("Sending Show All feature engineering payload:", payload);
      const res = await fetch(`http://localhost:8000/feature-engineering/apply/${selectedFile}?full=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      console.log("Received Show All feature engineering response:", data);
      if (data.full_data) {
        setFullData(data.full_data);
        setShowAll(true);
      } else {
        toast.error("Full data not available.");
      }
    } catch (err) {
      toast.error("Failed to load full data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderPreviewTable = () => {
    if (!result) return null;
    
    const tableData = showAll && fullData ? fullData : result.preview;
    const originalData = showAll && result.original_preview ? result.original_preview : result.original_preview;
    
    return (
      <div className={styles.card}>
        <div className={styles.previewHeader}>
          <h3 className={styles.heading} style={{ fontSize: '1.5rem', marginBottom: '1.2rem' }}>Feature Engineering Results</h3>
          <div className={styles.previewControls}>
            <button 
              className={`${styles.previewToggle} ${!showAll ? styles.active : ''}`}
              onClick={() => setShowAll(false)}
            >
              Preview 10 rows
            </button>
            <button 
              className={`${styles.previewToggle} ${showAll ? styles.active : ''}`}
              onClick={handleShowAll}
            >
              Preview all rows
            </button>
          </div>
        </div>

        <div className={styles.previewNote}>
          {!showAll ? 'Showing first 10 rows' : 'Showing all rows'}
        </div>
        
        <DataTable 
          data={tableData || []} 
          originalData={originalData || []} 
          compareOriginal={true} 
          highlightChanges={highlightChanges} 
          originalFilename={selectedFile}
        />
        
        {/* Action buttons */}
        <div className={styles.actionButtons}>
          <button 
            className={styles.downloadBtn}
            onClick={() => {
              const csvContent = convertToCSV(tableData || []);
              downloadCSV(csvContent, `feature_engineered_${selectedFile.replace('.parquet', '.csv')}`);
            }}
          >
            Download CSV
          </button>
          <button 
            className={styles.saveMinioBtn}
            onClick={handleSaveToMinIO}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save to MinIO'}
          </button>
        </div>
      </div>
    );
  };

  // Convert data to CSV
  const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
      csvRows.push(headers.map(h => JSON.stringify(row[h] ?? '')).join(','));
    }
    return csvRows.join('\n');
  };

  // Download CSV
  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Save to MinIO
  const handleSaveToMinIO = async () => {
    setLoading(true);
    try {
      const data = showAll && fullData ? fullData : result.preview;
      const csvContent = convertToCSV(data);
      
      // Create filename for feature engineered data
      const baseName = selectedFile.replace(/\.(parquet|csv|xlsx|json)$/i, '');
      const engineeredFilename = `feature_engineered_${baseName}.parquet`;
      
      const response = await fetch('http://localhost:8000/save_cleaned_to_minio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: csvContent,
          filename: engineeredFilename,
          folder: 'feature-engineered'
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        toast.success(`Feature engineered data saved to MinIO as ${engineeredFilename}`);
      } else {
        throw new Error(result.error || 'Failed to save to MinIO');
      }
    } catch (error) {
      toast.error('Failed to save to MinIO: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      <div className={styles.backButtonWrapper}>
        <GlobalBackButton />
      </div>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <div className={styles.card}>
            <h2 className={styles.heading}>Feature Engineering</h2>
            {step === 'select_file' && (
              <>
                <FormField label="Select Cleaned File *">
                  <select
                    value={selectedFile || ''}
                    onChange={e => {
                      console.log("File selected:", e.target.value);
                      setSelectedFile(e.target.value);
                    }}
                    className={styles.fileSelect}
                  >
                    <option value="" disabled>
                      {files.length === 0 ? 'No cleaned files available' : 'Select a cleaned file...'}
                    </option>
                    {files.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </FormField>
                {files.length === 0 && (
                  <div className={styles.noFilesMessage}>
                    <p>No cleaned files found in the cleaned-data bucket.</p>
                    <p>Please run preprocessing first to create cleaned files for feature engineering.</p>
                  </div>
                )}
                {files.length > 0 && (
                  <div className={styles.filesAvailableMessage}>
                    <p>✅ Found {files.length} cleaned file{files.length > 1 ? 's' : ''} ready for feature engineering!</p>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!selectedFile}
                  className={styles.submitBtn}
                  onClick={() => setStep('configure_features')}
                >
                  <div className={styles.submitContent}>
                    <span role="img" aria-label="next">➡️</span> Next
                  </div>
                </button>
              </>
            )}

            {step === 'configure_features' && (
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
                  <div className={styles.selectedFileDisplay}>Selected Cleaned File: <strong>{selectedFile}</strong></div>
                  
                  {dataPreview && (
                    <div className={styles.featureStepsList}>
                      <div className={styles.addStepSection}>
                        <h3>Add Feature Engineering Steps:</h3>
                        <div className={styles.addStepButtons}>
                          <button type="button" onClick={() => addFeatureStep('scaling')} className={styles.addStepBtn}>
                            📊 Scaling
                          </button>
                          <button type="button" onClick={() => addFeatureStep('encoding')} className={styles.addStepBtn}>
                            🏷️ Encoding
                          </button>
                          <button type="button" onClick={() => addFeatureStep('binning')} className={styles.addStepBtn}>
                            📦 Binning
                          </button>
                          <button type="button" onClick={() => addFeatureStep('feature_creation')} className={styles.addStepBtn}>
                            ✨ Feature Creation
                          </button>
                          <button type="button" onClick={() => addFeatureStep('feature_selection')} className={styles.addStepBtn}>
                            🎯 Feature Selection
                          </button>
                        </div>
                      </div>

                      {featureSteps.map(step => (
                        <FeatureStepCard
                          key={step.step_id}
                          step={step}
                          onUpdate={updateStepConfig}
                          onRemove={removeStep}
                        />
                      ))}
                    </div>
                  )}

                  <div className={styles.buttonGroup}>
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
                    <button 
                      type="submit" 
                      disabled={loading || !selectedFile || featureSteps.length === 0} 
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
                          Apply Feature Engineering
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}

            {result && (
              <div className={styles.highlightToggleWrapper}>
                <label>
                  <input type="checkbox" checked={highlightChanges} onChange={e => setHighlightChanges(e.target.checked)} />
                  <span className={styles.highlightToggleLabel}>Highlight Changes</span>
                </label>
              </div>
            )}

            {result && renderPreviewTable()}
          </div>
        </div>
        <div className="mb-6" />
      </div>
    </div>
  );
}
