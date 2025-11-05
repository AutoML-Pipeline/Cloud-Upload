import React, { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import saasToast from "@/utils/toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import styles from "./Prediction.module.css";
import PageBackLink from "../../components/PageBackLink";
import PredictionCharts from "../../components/PredictionCharts";
import PredictionTable from "../../components/PredictionTable";

export default function Prediction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedModelId = searchParams.get("model_id");
  const selectedModelId = preselectedModelId || "";

  // State
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [schemaValid, setSchemaValid] = useState(true);
  const [expectedFeatures, setExpectedFeatures] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [extraColumns, setExtraColumns] = useState([]);

  // Fetch trained models
  const { data: modelsData } = useQuery({
    queryKey: ["trained-models"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/model-training/training/models");
      if (!response.ok) throw new Error("Failed to fetch models");
      return response.json();
    },
  });

  const models = useMemo(() => (Array.isArray(modelsData) ? modelsData : []), [modelsData]);

  // Get selected model details
  const selectedModel = useMemo(
    () => models.find((m) => m.model_id === selectedModelId),
    [models, selectedModelId]
  );

  // Fetch selected model details to know expected feature columns
  const { data: modelDetails } = useQuery({
    queryKey: ["model-details", selectedModelId],
    enabled: !!selectedModelId,
    queryFn: async () => {
      const res = await fetch(
        `http://localhost:8000/api/model-training/training/models/${selectedModelId}`
      );
      if (!res.ok) throw new Error("Failed to fetch model details");
      return res.json();
    },
  });

  useEffect(() => {
    const features = modelDetails?.dataset_info?.features || [];
    setExpectedFeatures(features);
    // reset schema flags when model changes
    setSchemaValid(true);
    setMissingColumns([]);
    setExtraColumns([]);
  }, [modelDetails]);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(fileExtension)) {
      saasToast.error("Please upload a CSV or Excel file", { idKey: 'pred-upload-type' });
      return;
    }

    setUploadedFile(file);
    setPredictions(null); // Clear previous predictions
  setSchemaValid(true);
  setMissingColumns([]);
  setExtraColumns([]);

    if (fileExtension === "csv") {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            saasToast.error("Error parsing CSV file", { idKey: 'pred-parse-csv' });
            console.error(result.errors);
            return;
          }
          setUploadedData(result.data);
          // Validate schema if we have expected features (but don't show error toast - auto-transform will handle it)
          if (expectedFeatures && expectedFeatures.length > 0) {
            const cols = Object.keys(result.data[0] || {});
            const missing = expectedFeatures.filter((c) => !cols.includes(c));
            const extra = cols.filter((c) => !expectedFeatures.includes(c));
            setMissingColumns(missing);
            setExtraColumns(extra);
            const ok = missing.length === 0;
            setSchemaValid(ok);
            // Only show success toast, no error toast (auto-transform will handle mismatches)
            if (ok && extra.length > 0) {
              saasToast.success(
                `Loaded ${result.data.length} rows • ${extra.length} extra column${extra.length !== 1 ? "s" : ""} will be ignored`,
                { idKey: 'pred-loaded-csv-extra' }
              );
            } else if (ok) {
              saasToast.success(`Loaded ${result.data.length} rows`, { idKey: 'pred-loaded-csv' });
            } else {
              // Schema mismatch - just show rows loaded, auto-transform will handle it
              saasToast.success(`Loaded ${result.data.length} rows`, { idKey: 'pred-loaded-csv-mismatch' });
            }
          } else {
            saasToast.success(`Loaded ${result.data.length} rows`, { idKey: 'pred-loaded-csv-no-schema' });
          }
        },
        error: (error) => {
          saasToast.error("Failed to parse CSV", { idKey: 'pred-parse-csv-failed' });
          console.error(error);
        },
      });
    } else {
      // Parse Excel
      import("xlsx").then((XLSX) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);
            setUploadedData(jsonData);
            if (expectedFeatures && expectedFeatures.length > 0) {
              const cols = Object.keys(jsonData[0] || {});
              const missing = expectedFeatures.filter((c) => !cols.includes(c));
              const extra = cols.filter((c) => !expectedFeatures.includes(c));
              setMissingColumns(missing);
              setExtraColumns(extra);
              const ok = missing.length === 0;
              setSchemaValid(ok);
              // Only show success toast, no error toast (auto-transform will handle mismatches)
              if (ok && extra.length > 0) {
                saasToast.success(
                  `Loaded ${jsonData.length} rows • ${extra.length} extra column${extra.length !== 1 ? "s" : ""} will be ignored`,
                  { idKey: 'pred-loaded-excel-extra' }
                );
              } else if (ok) {
                saasToast.success(`Loaded ${jsonData.length} rows`, { idKey: 'pred-loaded-excel' });
              } else {
                // Schema mismatch - just show rows loaded, auto-transform will handle it
                saasToast.success(`Loaded ${jsonData.length} rows`, { idKey: 'pred-loaded-excel-mismatch' });
              }
            } else {
              saasToast.success(`Loaded ${jsonData.length} rows`, { idKey: 'pred-loaded-excel-no-schema' });
            }
          } catch (error) {
            saasToast.error("Failed to parse Excel file", { idKey: 'pred-parse-excel-failed' });
            console.error(error);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    }
  };

  // Make predictions
  const handlePredict = async () => {
    if (!selectedModelId) {
      saasToast.error("Please select a model", { idKey: 'pred-select-model' });
      return;
    }

    if (!uploadedData || uploadedData.length === 0) {
      saasToast.error("Please upload data", { idKey: 'pred-upload-data' });
      return;
    }

    // Note: We no longer block on schema mismatch - backend will auto-transform!
    if (!schemaValid && missingColumns.length > 0) {
      saasToast.success("🔄 Don't worry! The system will auto-transform your data to match the model.", { 
        idKey: 'pred-auto-transform',
        duration: 3000
      });
    }

    setPredicting(true);

    // pipeline patching removed

    try {
      const response = await fetch(
        `http://localhost:8000/api/model-training/training/predict/${selectedModelId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: uploadedData }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Prediction failed");
      }

      const result = await response.json();
      setPredictions(result);
  saasToast.success(`🚀 Generated ${result.total_predictions} predictions`, { idKey: 'pred-generated' });

      // pipeline patching removed
    } catch (error) {
      console.error("Prediction error:", error);
  saasToast.error(error.message || "Failed to make predictions", { idKey: 'pred-error' });

      // pipeline patching removed
    } finally {
      setPredicting(false);
    }
  };

  // Download predictions as CSV
  const handleDownloadCSV = () => {
    if (!predictions || !uploadedData) return;

    // Combine original data with predictions
    const combinedData = uploadedData.map((row, idx) => {
      const pred = predictions.predictions[idx];
      return {
        ...row,
        prediction: pred.prediction,
        ...(pred.confidence && { confidence: pred.confidence.toFixed(4) }),
      };
    });

    const csv = Papa.unparse(combinedData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `predictions_${selectedModel?.best_model?.model_name || "model"}_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  saasToast.success("✓ Downloaded predictions", { idKey: 'pred-downloaded' });
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          {/* Header */}
          <div className={styles.pageIntro}>
            <PageBackLink to={preselectedModelId ? "/models" : "/dashboard"} label={preselectedModelId ? "Models" : "Dashboard"} />
            <h1 className={styles.pageTitle}>🔮 Make Predictions</h1>
            <p className={styles.pageDescription}>
              Use a trained model to predict outcomes on new data
            </p>
          </div>

          {/* Selected Model Info */}
          {selectedModel && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Selected Model</h2>
                <p className={styles.cardDescription}>Using this model for predictions</p>
              </div>
              <div className={styles.cardContent}>
                <div className={styles.selectedModelInfo}>
                  <div className={styles.modelInfoGrid}>
                    <div className={styles.modelInfoItem}>
                      <span className={styles.modelInfoLabel}>Model:</span>
                      <span className={styles.modelInfoValue}>{selectedModel.best_model?.model_name}</span>
                    </div>
                    <div className={styles.modelInfoItem}>
                      <span className={styles.modelInfoLabel}>Type:</span>
                      <span className={styles.modelInfoValue}>
                        {selectedModel.problem_type === "classification" ? "🎯 Classification" : "📈 Regression"}
                      </span>
                    </div>
                    <div className={styles.modelInfoItem}>
                      <span className={styles.modelInfoLabel}>Dataset:</span>
                      <span className={styles.modelInfoValue}>{selectedModel.filename}</span>
                    </div>
                    <div className={styles.modelInfoItem}>
                      <span className={styles.modelInfoLabel}>Target:</span>
                      <span className={styles.modelInfoValue}>{selectedModel.target_column}</span>
                    </div>
                    {selectedModel.best_model?.metrics && (
                      <div className={styles.modelInfoItem}>
                        <span className={styles.modelInfoLabel}>Performance:</span>
                        <span className={styles.modelInfoValue}>
                          {selectedModel.problem_type === "classification" 
                            ? `Accuracy: ${(selectedModel.best_model.metrics.accuracy * 100).toFixed(1)}%`
                            : `R²: ${selectedModel.best_model.metrics.r2_score?.toFixed(4)}`
                          }
                        </span>
                      </div>
                    )}
                    <div className={styles.modelInfoItem}>
                      <span className={styles.modelInfoLabel}>Trained:</span>
                      <span className={styles.modelInfoValue}>
                        {selectedModel.created_at
                          ? new Date(selectedModel.created_at).toLocaleDateString()
                          : "Unknown"}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.changeModelButton}
                    onClick={() => navigate("/models")}
                  >
                    Change Model
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* No Model Selected - Redirect to Models Page */}
          {!selectedModelId && (
            <div className={styles.card}>
              <div className={styles.cardContent}>
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>🎯</div>
                  <h3 className={styles.emptyTitle}>No Model Selected</h3>
                  <p className={styles.emptyText}>
                    Please select a trained model from the Models page to make predictions
                  </p>
                  <button
                    className={styles.primaryButton}
                    onClick={() => navigate("/models")}
                  >
                    Go to Models →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* File Upload */}
          {selectedModelId && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>📤 Upload Data</h2>
                <p className={styles.cardDescription}>
                  Upload a CSV or Excel file with the same features used during training
                </p>
              </div>

              <div className={styles.cardContent}>
                {/* Expected schema helper */}
                {expectedFeatures.length > 0 && (
                  <div className={`${styles.infoBox} mb-3`}>
                    <strong>💡 Upload your data with original columns</strong>
                    <div className="mt-1.5 text-[13px]">
                      Use the <strong>same format as your training data</strong> (before feature engineering).
                      The system will automatically apply one-hot encoding and transformations to match the model.
                    </div>
                    <div className="mt-2 text-[12px]" style={{opacity: 0.7}}>
                      <strong>Example:</strong> If you trained on columns like <code>department</code>, <code>job_role</code>, etc., 
                      upload data with those <em>original</em> column names (not the encoded versions like <code>department_Sales</code>).
                    </div>
                  </div>
                )}

                <div className={styles.uploadArea}>
                  <input
                    type="file"
                    id="fileInput"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className={styles.fileInput}
                  />
                  <label htmlFor="fileInput" className={styles.uploadLabel}>
                    <div className={styles.uploadIcon}>📁</div>
                    <div className={styles.uploadText}>
                      {uploadedFile ? (
                        <>
                          <strong>{uploadedFile.name}</strong>
                          <span>
                            {uploadedData?.length} rows loaded • Click to change
                          </span>
                        </>
                      ) : (
                        <>
                          <strong>Click to upload or drag and drop</strong>
                          <span>CSV or Excel files accepted</span>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                {uploadedData && uploadedData.length > 0 && (
                  <div className={styles.infoBox}>
                    <strong>✓ Data loaded:</strong>{" "}
                    {uploadedData.length} rows with {Object.keys(uploadedData[0]).length} columns
                    {!schemaValid && missingColumns.length > 0 && (
                      <div className="mt-1.5" style={{color: '#0369a1'}}>
                        <strong>🔄 Auto-Transform Enabled:</strong> Your data will be automatically converted to match the model's requirements.
                        <br/>
                        <small style={{opacity: 0.8}}>
                          (One-hot encoding will be applied to categorical columns like department, job_role, etc.)
                        </small>
                      </div>
                    )}
                    {schemaValid && extraColumns.length > 0 && (
                      <div className="mt-1.5">
                        Note: Extra columns will be ignored: {extraColumns.slice(0, 10).join(", ")}
                        {extraColumns.length > 10 ? " …" : ""}
                      </div>
                    )}
                  </div>
                )}

                {uploadedData && (
                  <div className={styles.actionBar}>
                    <button
                      className={styles.primaryButton}
                      onClick={handlePredict}
                      disabled={predicting}
                    >
                      {predicting ? (
                        <>
                          <div className={styles.smallSpinner}></div>
                          Predicting...
                        </>
                      ) : (
                        "Generate Predictions 🚀"
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Overlay */}
          {predicting && (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingCard}>
                <div className={styles.largeSpinner}></div>
                <h3 className={styles.loadingTitle}>Generating Predictions</h3>
                <p className={styles.loadingText}>
                  Processing {uploadedData?.length || 0} rows with {selectedModel?.best_model?.model_name || "model"}...
                </p>
              </div>
            </div>
          )}

          {/* Predictions Results */}
          {predictions && (
            <>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>✅ Prediction Results</h2>
                  <p className={styles.cardDescription}>
                    {predictions.total_predictions} predictions generated using {predictions.model_name}
                  </p>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.resultsStats}>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🎯</div>
                      <div className={styles.statContent}>
                        <div className={styles.statLabel}>Model</div>
                        <div className={styles.statValue}>{predictions.model_name}</div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>📊</div>
                      <div className={styles.statContent}>
                        <div className={styles.statLabel}>Problem Type</div>
                        <div className={styles.statValue}>
                          {predictions.problem_type === "classification" ? "Classification" : "Regression"}
                        </div>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>🔢</div>
                      <div className={styles.statContent}>
                        <div className={styles.statLabel}>Predictions</div>
                        <div className={styles.statValue}>{predictions.total_predictions}</div>
                      </div>
                    </div>
                  </div>

                  {/* Prediction Visualizations */}
                  <div className="mt-6">
                    <PredictionCharts 
                      predictions={predictions} 
                      problemType={predictions.problem_type} 
                    />
                  </div>

                  {/* Predictions Table */}
                  <div className="mt-6">
                    <PredictionTable 
                      predictions={predictions.predictions}
                      problemType={predictions.problem_type}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-wrap gap-3 justify-center">
                    <button 
                      onClick={handleDownloadCSV}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      <span className="mr-2">📥</span>
                      Download All Predictions (CSV)
                    </button>
                    <button
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedData(null);
                        setPredictions(null);
                      }}
                      className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                    >
                      <span className="mr-2">🔄</span>
                      Make Another Prediction
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
