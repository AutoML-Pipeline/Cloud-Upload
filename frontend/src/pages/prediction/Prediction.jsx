import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import Papa from "papaparse";
import styles from "./Prediction.module.css";
import PageBackLink from "../../components/PageBackLink";

export default function Prediction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedModelId = searchParams.get("model_id");

  // State
  const [selectedModelId, setSelectedModelId] = useState(preselectedModelId || "");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);

  // Fetch trained models
  const { data: modelsData, isLoading: loadingModels } = useQuery({
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

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    if (!["csv", "xlsx", "xls"].includes(fileExtension)) {
      toast.error("Please upload a CSV or Excel file");
      return;
    }

    setUploadedFile(file);
    setPredictions(null); // Clear previous predictions

    if (fileExtension === "csv") {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.errors.length > 0) {
            toast.error("Error parsing CSV file");
            console.error(result.errors);
            return;
          }
          setUploadedData(result.data);
          toast.success(`Loaded ${result.data.length} rows`);
        },
        error: (error) => {
          toast.error("Failed to parse CSV");
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
            toast.success(`Loaded ${jsonData.length} rows`);
          } catch (error) {
            toast.error("Failed to parse Excel file");
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
      toast.error("Please select a model");
      return;
    }

    if (!uploadedData || uploadedData.length === 0) {
      toast.error("Please upload data");
      return;
    }

    setPredicting(true);

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
      toast.success(`✓ Generated ${result.total_predictions} predictions`);
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error(error.message || "Failed to make predictions");
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
    toast.success("✓ Downloaded predictions");
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          {/* Header */}
          <div className={styles.pageIntro}>
            <PageBackLink to="/dashboard" label="Dashboard" />
            <h1 className={styles.pageTitle}>🔮 Make Predictions</h1>
            <p className={styles.pageDescription}>
              Use a trained model to predict outcomes on new data
            </p>
          </div>

          {/* Model Selection */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>1️⃣ Select Model</h2>
              <p className={styles.cardDescription}>Choose a trained model to use for predictions</p>
            </div>

            <div className={styles.cardContent}>
              {loadingModels ? (
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <p>Loading models...</p>
                </div>
              ) : models.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No trained models found.</p>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => navigate("/model-training")}
                  >
                    Train a Model →
                  </button>
                </div>
              ) : (
                <div className={styles.modelGrid}>
                  {models.map((model) => (
                    <div
                      key={model.model_id}
                      className={`${styles.modelCard} ${
                        selectedModelId === model.model_id ? styles.modelCardSelected : ""
                      }`}
                      onClick={() => setSelectedModelId(model.model_id)}
                    >
                      <div className={styles.modelCardHeader}>
                        <h3 className={styles.modelName}>{model.best_model?.model_name}</h3>
                        {selectedModelId === model.model_id && (
                          <span className={styles.selectedBadge}>✓</span>
                        )}
                      </div>
                      <div className={styles.modelMeta}>
                        <span className={styles.problemType}>
                          {model.problem_type === "classification" ? "🎯 Classification" : "📈 Regression"}
                        </span>
                        <span className={styles.modelDate}>
                          {model.created_at
                            ? new Date(model.created_at).toLocaleDateString()
                            : "Unknown date"}
                        </span>
                      </div>
                      {model.best_model?.metrics && (
                        <div className={styles.modelMetrics}>
                          {model.problem_type === "classification" ? (
                            <span>Accuracy: {(model.best_model.metrics.accuracy * 100).toFixed(1)}%</span>
                          ) : (
                            <span>R²: {model.best_model.metrics.r2_score?.toFixed(4)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File Upload */}
          {selectedModelId && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>2️⃣ Upload Data</h2>
                <p className={styles.cardDescription}>
                  Upload a CSV or Excel file with the same features used during training
                </p>
              </div>

              <div className={styles.cardContent}>
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
                    <strong>✓ Data loaded:</strong> {uploadedData.length} rows with {Object.keys(uploadedData[0]).length} columns
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

                  {/* Predictions Table */}
                  <div className={styles.tableContainer}>
                    <table className={styles.predictionsTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Prediction</th>
                          {predictions.problem_type === "classification" && <th>Confidence</th>}
                          {predictions.predictions[0]?.probabilities && (
                            <th>Class Probabilities</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.predictions.slice(0, 100).map((pred, idx) => (
                          <tr key={idx}>
                            <td>{idx + 1}</td>
                            <td className={styles.predictionValue}>{pred.prediction}</td>
                            {predictions.problem_type === "classification" && (
                              <td>
                                {pred.confidence !== null
                                  ? `${(pred.confidence * 100).toFixed(1)}%`
                                  : "N/A"}
                              </td>
                            )}
                            {pred.probabilities && (
                              <td className={styles.probabilities}>
                                {Object.entries(pred.probabilities)
                                  .map(([cls, prob]) => `${cls}: ${(prob * 100).toFixed(1)}%`)
                                  .join(", ")}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {predictions.total_predictions > 100 && (
                      <div className={styles.tableNote}>
                        Showing first 100 of {predictions.total_predictions} predictions
                      </div>
                    )}
                  </div>

                  <div className={styles.actionBar}>
                    <button className={styles.primaryButton} onClick={handleDownloadCSV}>
                      📥 Download All Predictions (CSV)
                    </button>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadedData(null);
                        setPredictions(null);
                      }}
                    >
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
