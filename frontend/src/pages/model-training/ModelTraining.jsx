import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import styles from "./ModelTraining.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import PageBackLink from "../../components/PageBackLink";
import ModelVisualizations from "../../components/ModelVisualizations";

const AVAILABLE_MODELS = {
  classification: [
    { id: "logistic_regression", name: "Logistic Regression", description: "Fast linear classifier" },
    { id: "random_forest", name: "Random Forest", description: "Ensemble of decision trees" },
    { id: "gradient_boosting", name: "Gradient Boosting", description: "Sequential tree boosting" },
    { id: "xgboost", name: "XGBoost", description: "Optimized gradient boosting" },
    { id: "lightgbm", name: "LightGBM", description: "Fast gradient boosting" },
  ],
  regression: [
    { id: "linear_regression", name: "Linear Regression", description: "Simple linear model" },
    { id: "ridge", name: "Ridge Regression", description: "L2 regularized linear model" },
    { id: "lasso", name: "Lasso Regression", description: "L1 regularized linear model" },
    { id: "random_forest", name: "Random Forest", description: "Ensemble regressor" },
    { id: "gradient_boosting", name: "Gradient Boosting", description: "Sequential boosting" },
    { id: "xgboost", name: "XGBoost", description: "Optimized gradient boosting" },
    { id: "lightgbm", name: "LightGBM", description: "Fast gradient boosting" },
  ],
};

export default function ModelTraining() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Fetch feature-engineered files
  const { data: filesData, isFetching: isFetchingFiles } = useQuery({
    queryKey: ["model-training", "files"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/model-training/training/files");
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const files = useMemo(() => (Array.isArray(filesData) ? filesData : []), [filesData]);
  
  // State management
  const [step, setStep] = useState("select_file"); // select_file, loading, configure, training, results
  const [selectedFile, setSelectedFile] = useState("");
  const [columns, setColumns] = useState([]);
  const [loadingDataset, setLoadingDataset] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [targetColumn, setTargetColumn] = useState("");
  const [problemType, setProblemType] = useState("classification"); // Default to classification
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectAllModels, setSelectAllModels] = useState(true);
  const [recommendations, setRecommendations] = useState(null); // Store recommendations
  const [loadingRecommendations, setLoadingRecommendations] = useState(false); // Loading state for recommendations
  
  // Training state
  const [jobId, setJobId] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [trainingResult, setTrainingResult] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const pollingRef = useRef(null);
  const startTimeRef = useRef(null);

  // Auto-select file from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filenameFromUrl = params.get("file");
    if (filenameFromUrl && files.length > 0) {
      const fileExists = files.some((f) => f.name === filenameFromUrl);
      if (fileExists) {
        setSelectedFile(filenameFromUrl);
        setStep("configure");
      }
    }
  }, [location.search, files]);

  // Load dataset when transitioning to configure step
  const handleProceedToConfigure = async () => {
    if (!selectedFile) return;

    setStep("loading");
    setLoadingDataset(true);

    try {
      // Fetch dataset preview and metadata
      const response = await fetch(
        `http://localhost:8000/api/feature-engineering/preview/${encodeURIComponent(selectedFile)}?bucket=feature-engineered`
      );
      
      if (!response.ok) {
        throw new Error("Failed to load dataset. Please ensure the file exists in the feature-engineered bucket.");
      }
      
      const data = await response.json();
      
      if (!data.columns || data.columns.length === 0) {
        throw new Error("Dataset has no columns");
      }

      // Set columns and dataset info
      setColumns(data.columns);
      setDatasetInfo({
        totalRows: data.preview?.length || 0,
        totalColumns: data.columns.length,
        preview: data.preview || [],
      });

      // Auto-select last column as target (common convention)
      setTargetColumn(data.columns[data.columns.length - 1]);

      // Success - move to configure step
      setStep("configure");
      toast.success("Dataset loaded successfully!");
    } catch (error) {
      console.error("Error loading dataset:", error);
      toast.error(error.message || "Failed to load dataset");
      setStep("select_file"); // Go back to file selection
    } finally {
      setLoadingDataset(false);
    }
  };

  // Fetch columns when file is selected (old logic - now replaced by handleProceedToConfigure)
  useEffect(() => {
    if (!selectedFile || step !== "configure") return;

    const fetchColumns = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/feature-engineering/preview/${encodeURIComponent(selectedFile)}?bucket=feature-engineered`
        );
        if (!response.ok) throw new Error("Failed to fetch columns");
        const data = await response.json();
        
        if (data.columns && data.columns.length > 0) {
          setColumns(data.columns);
          // Auto-select last column as target (common convention)
          if (!targetColumn) {
            setTargetColumn(data.columns[data.columns.length - 1]);
          }
        }
      } catch (error) {
        console.error("Error fetching columns:", error);
        toast.error("Failed to load dataset columns");
      }
    };

    fetchColumns();
  }, [selectedFile, step, targetColumn]);

  // Fetch recommendations when target column is selected
  useEffect(() => {
    if (!selectedFile || !targetColumn || step !== "configure") return;

    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      setRecommendations(null); // Clear previous recommendations
      
      try {
        const response = await fetch(
          `http://localhost:8000/api/model-training/training/recommendations/${encodeURIComponent(selectedFile)}?target_column=${encodeURIComponent(targetColumn)}`
        );
        
        if (!response.ok) {
          console.warn("Failed to fetch recommendations");
          setLoadingRecommendations(false);
          return;
        }
        
        const data = await response.json();
        console.log("📊 Recommendations received:", data);
        setRecommendations(data);
        
        // ALWAYS auto-set problem type from recommendations (no auto-detect option)
        if (data.problem_type) {
          console.log(`🎯 Setting problem type to: ${data.problem_type}`);
          setProblemType(data.problem_type);
        }
        
        // Auto-select ALL recommended models (not just high priority)
        if (data.model_recommendations) {
          const allRecommendations = data.model_recommendations;
          console.log("📋 All model recommendations:", allRecommendations);
          
          const recommendedModelIds = allRecommendations
            .filter(m => {
              console.log(`  - ${m.model_name} (${m.model_id}): recommended=${m.recommended}, priority=${m.priority}`);
              return m.recommended === true;
            })
            .map(m => m.model_id);
          
          console.log(`✅ Filtered recommended model IDs:`, recommendedModelIds);
          
          if (recommendedModelIds.length > 0) {
            setSelectedModels(recommendedModelIds);
            setSelectAllModels(false); // Switch to manual selection with auto-selected recommendations
            console.log(`✓ Auto-selected ${recommendedModelIds.length} recommended models:`, recommendedModelIds);
          } else {
            console.warn("⚠️ No recommended models found!");
          }
        }
        
        toast.success(`✓ Detected ${data.problem_type} problem for "${targetColumn}"`);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
        toast.error("Failed to analyze target column");
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [selectedFile, targetColumn, step, setProblemType, setSelectedModels, setSelectAllModels]);

  // Reset selected models when problem type changes ONLY if "Train all" is checked
  useEffect(() => {
    // Only auto-select all models if the user has "Train all" checkbox enabled
    // Do NOT interfere with recommendation-based auto-selection
    if (problemType && selectAllModels && selectedModels.length === 0) {
      console.log("🔄 Auto-selecting all models for 'Train all' mode");
      const availableForType = AVAILABLE_MODELS[problemType] || [];
      setSelectedModels(availableForType.map(m => m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemType, selectAllModels]);

  // Poll training status
  useEffect(() => {
    if (!jobId || trainingStatus === "completed" || trainingStatus === "failed") {
      return;
    }

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/model-training/training/status/${jobId}`
        );
        if (!response.ok) throw new Error("Failed to fetch status");
        
        const job = await response.json();
        setProgress(job.progress || 0);
        setTrainingStatus(job.status);

        if (job.status === "completed") {
          setTrainingResult(job.result);
          clearInterval(pollingRef.current);
          toast.success("🎉 Training completed successfully!");
        } else if (job.status === "failed") {
          clearInterval(pollingRef.current);
          toast.error(`Training failed: ${job.error || "Unknown error"}`);
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    };

    pollingRef.current = setInterval(pollStatus, 2000);
    return () => clearInterval(pollingRef.current);
  }, [jobId, trainingStatus]);

  // Update elapsed time
  useEffect(() => {
    if (trainingStatus !== "running" && trainingStatus !== "pending") return;

    const timer = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Date.now() - startTimeRef.current);
      }
    }, 100);

    return () => clearInterval(timer);
  }, [trainingStatus]);

  const handleStartTraining = async () => {
    if (!targetColumn) {
      toast.error("Please select a target column");
      return;
    }

    try {
      const config = {
        target_column: targetColumn,
        problem_type: problemType,
        test_size: 0.2, // Fixed at 20%
        random_state: 42,
        models_to_train: selectAllModels ? null : selectedModels,
      };

      const response = await fetch(
        `http://localhost:8000/api/model-training/training/train/${encodeURIComponent(selectedFile)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to start training");
      }

      const result = await response.json();
      setJobId(result.job_id);
      setTrainingStatus("pending");
      setStep("training");
      startTimeRef.current = Date.now();
      toast.success("Training job started!");
    } catch (error) {
      console.error("Error starting training:", error);
      toast.error(error.message);
    }
  };

  const handleReset = () => {
    setStep("select_file");
    setSelectedFile("");
    setTargetColumn("");
    setProblemType(null);
    setSelectedModels([]);
    setSelectAllModels(true);
    setJobId(null);
    setTrainingStatus("idle");
    setProgress(0);
    setTrainingResult(null);
    setElapsedTime(0);
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${remainingSeconds}s`;
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          {/* Header */}
          <div className={styles.pageIntro}>
            <PageBackLink to="/dashboard" label="Dashboard" />
            <h1 className={styles.pageTitle}>🤖 Model Training & Selection</h1>
            <p className={styles.pageDescription}>
              Automatically train and compare multiple ML models to find the best
              performer for your dataset.
            </p>
          </div>

          {/* Step 1: File Selection */}
          {step === "select_file" && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>📂 Select Feature-Engineered Dataset</h2>
                <p className={styles.cardDescription}>
                  Choose a preprocessed and feature-engineered dataset to train models
                </p>
              </div>

              <div className={styles.cardContent}>
                {isFetchingFiles ? (
                  <div className={styles.loadingState}>
                    <div className={styles.spinner}></div>
                    <p>Loading datasets...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No feature-engineered datasets found.</p>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => navigate("/feature-engineering")}
                    >
                      Go to Feature Engineering
                    </button>
                  </div>
                ) : (
                  <div className={styles.fileGrid}>
                    {files.map((file) => (
                      <div
                        key={file.name}
                        className={`${styles.fileCard} ${
                          selectedFile === file.name ? styles.fileCardSelected : ""
                        }`}
                        onClick={() => setSelectedFile(file.name)}
                      >
                        <div className={styles.fileIcon}>📊</div>
                        <div className={styles.fileInfo}>
                          <div className={styles.fileName}>{file.name}</div>
                          <div className={styles.fileSize}>
                            {file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Unknown size"}
                          </div>
                        </div>
                        {selectedFile === file.name && (
                          <div className={styles.selectedBadge}>✓</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedFile && (
                  <div className={styles.actionBar}>
                    <button
                      className={styles.primaryButton}
                      onClick={handleProceedToConfigure}
                    >
                      Continue to Configuration →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Step */}
          {step === "loading" && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>🔄 Loading Dataset</h2>
                <p className={styles.cardDescription}>
                  Validating and preparing your dataset for training
                </p>
              </div>

              <div className={styles.cardContent}>
                <div className={styles.loadingState}>
                  <div className={styles.spinner}></div>
                  <h3 className={styles.loadingTitle}>
                    {loadingDataset ? "Loading dataset..." : "Preparing..."}
                  </h3>
                  <p className={styles.loadingDescription}>
                    Fetching columns, validating data, and checking dataset integrity
                  </p>
                  
                  {datasetInfo && (
                    <div className={styles.infoBox} style={{ marginTop: "20px" }}>
                      <p>✓ Found {datasetInfo.totalColumns} columns</p>
                      <p>✓ Dataset contains {datasetInfo.totalRows} rows</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Configuration */}
          {step === "configure" && (
            <>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>⚙️ Training Configuration</h2>
                  <p className={styles.cardDescription}>
                    Configure training parameters and select models
                  </p>
                </div>

                <div className={styles.cardContent}>
                  {/* Dataset Info */}
                  <div className={styles.infoBox}>
                    <strong>Selected Dataset:</strong> {selectedFile}
                  </div>

                  {/* Recommendations Section */}
                  {recommendations && targetColumn && (
                    <div className={styles.recommendationsBox}>
                      <h3 className={styles.recommendationsTitle}>
                        💡 AI Recommendations
                      </h3>
                      
                      {/* Problem Type Recommendation */}
                      <div className={styles.recommendationItem}>
                        <strong>Detected Problem Type:</strong>
                        <span className={styles.badge}>
                          {recommendations.problem_type === "classification" ? "🎯 Classification" : "📈 Regression"}
                        </span>
                      </div>

                      {/* Target Column Stats */}
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
                                • ⚠️ {recommendations.target_analysis.null_count} missing values ({recommendations.target_analysis.null_percentage.toFixed(1)}%)
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Model Recommendations */}
                      {recommendations.model_recommendations && recommendations.model_recommendations.length > 0 && (
                        <div className={styles.recommendationItem}>
                          <strong>Recommended Models:</strong>
                          <div className={styles.modelRecommendations}>
                            {recommendations.model_recommendations
                              .filter(m => m.recommended && m.priority === "high")
                              .map(model => (
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

                  {/* Target Column Selection */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      🎯 Target Column <span className={styles.required}>*</span>
                    </label>
                    <p className={styles.formHelp}>
                      Select the column you want to predict
                    </p>
                    <select
                      className={styles.formSelect}
                      value={targetColumn}
                      onChange={(e) => setTargetColumn(e.target.value)}
                    >
                      <option value="">-- Select Target Column --</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Problem Type */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>📊 Problem Type</label>
                    <p className={styles.formHelp}>
                      {loadingRecommendations 
                        ? "Analyzing target column to detect problem type..." 
                        : "Problem type is automatically detected based on your target column"}
                    </p>
                    
                    {loadingRecommendations ? (
                      <div className={styles.loadingRecommendation}>
                        <div className={styles.spinner}></div>
                        <span>Detecting problem type...</span>
                      </div>
                    ) : (
                      <div className={styles.radioGroup}>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="problemType"
                            checked={problemType === "classification"}
                            onChange={() => {
                              setProblemType("classification");
                              setSelectAllModels(true); // Reset model selection
                            }}
                          />
                          <span>
                            Classification
                            {recommendations?.problem_type === "classification" && (
                              <span className={styles.suggestedBadge}>
                                ✓ Suggested for "{targetColumn}"
                              </span>
                            )}
                          </span>
                        </label>
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="problemType"
                            checked={problemType === "regression"}
                            onChange={() => {
                              setProblemType("regression");
                              setSelectAllModels(true); // Reset model selection
                            }}
                          />
                          <span>
                            Regression
                            {recommendations?.problem_type === "regression" && (
                              <span className={styles.suggestedBadge}>
                                ✓ Suggested for "{targetColumn}"
                              </span>
                            )}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Model Selection - Simplified */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      🤖 Models to Train
                    </label>
                    <p className={styles.formHelp}>
                      {loadingRecommendations 
                        ? "Analyzing your data to select optimal models..."
                        : recommendations && selectedModels.length > 0
                        ? `${selectedModels.length} recommended ${problemType} models will be trained automatically`
                        : `All available ${problemType} models will be trained`
                      }
                    </p>
                    
                    {!loadingRecommendations && recommendations && selectedModels.length > 0 && (
                      <div className={styles.recommendedModelsList}>
                        {selectedModels.map((modelId) => {
                          const modelInfo = AVAILABLE_MODELS[problemType]?.find(m => m.id === modelId);
                          return modelInfo ? (
                            <div key={modelId} className={styles.recommendedModelBadge}>
                              ✓ {modelInfo.name}
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className={styles.actionBar}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => setStep("select_file")}
                    >
                      ← Back
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={handleStartTraining}
                      disabled={!targetColumn}
                    >
                      Start Training 🚀
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Training in Progress */}
          {step === "training" && trainingStatus !== "completed" && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>🔄 Training in Progress</h2>
                <p className={styles.cardDescription}>
                  Training multiple models and comparing performance...
                </p>
              </div>

              <div className={styles.cardContent}>
                {/* Progress Bar */}
                <div className={styles.progressContainer}>
                  <div className={styles.progressHeader}>
                    <span className={styles.progressLabel}>
                      {trainingStatus === "pending" ? "Initializing..." : "Training models..."}
                    </span>
                    <span className={styles.progressPercentage}>{progress}%</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <div className={styles.progressInfo}>
                    <span>Elapsed: {formatTime(elapsedTime)}</span>
                    <span>Job ID: {jobId?.substring(0, 8)}...</span>
                  </div>
                </div>

                {/* Training Info */}
                <div className={styles.trainingInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Dataset:</span>
                    <span className={styles.infoValue}>{selectedFile}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Target Column:</span>
                    <span className={styles.infoValue}>{targetColumn}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Test Split:</span>
                    <span className={styles.infoValue}>20% (default)</span>
                  </div>
                </div>

                {/* Animated Status */}
                <div className={styles.statusAnimation}>
                  <div className={styles.spinner}></div>
                  <p>Please wait while models are being trained...</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === "training" && trainingStatus === "completed" && trainingResult && (
            <>
              {/* Dataset Summary */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>✅ Training Completed!</h2>
                  <p className={styles.cardDescription}>
                    Successfully trained {trainingResult.models_trained?.length || 0} models
                  </p>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>📊</div>
                      <div className={styles.summaryContent}>
                        <div className={styles.summaryLabel}>Problem Type</div>
                        <div className={styles.summaryValue}>
                          {trainingResult.problem_type === "classification" 
                            ? "Classification" 
                            : trainingResult.problem_type === "regression"
                            ? "Regression"
                            : trainingResult.problem_type}
                        </div>
                      </div>
                    </div>

                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>📏</div>
                      <div className={styles.summaryContent}>
                        <div className={styles.summaryLabel}>Dataset Rows</div>
                        <div className={styles.summaryValue}>
                          {trainingResult.dataset_info?.total_rows?.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>🔢</div>
                      <div className={styles.summaryContent}>
                        <div className={styles.summaryLabel}>Features</div>
                        <div className={styles.summaryValue}>
                          {trainingResult.dataset_info?.features?.length || 0}
                        </div>
                      </div>
                    </div>

                    <div className={styles.summaryCard}>
                      <div className={styles.summaryIcon}>⏱️</div>
                      <div className={styles.summaryContent}>
                        <div className={styles.summaryLabel}>Total Time</div>
                        <div className={styles.summaryValue}>
                          {trainingResult.total_training_time?.toFixed(2)}s
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Model */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>🏆 Best Model</h2>
                  <p className={styles.cardDescription}>
                    Top performing model selected automatically
                  </p>
                </div>

                <div className={styles.cardContent}>
                  <div className={styles.bestModelCard}>
                    <div className={styles.bestModelHeader}>
                      <div>
                        <h3 className={styles.bestModelName}>
                          {trainingResult.best_model?.model_name}
                        </h3>
                        <p className={styles.bestModelType}>
                          {trainingResult.best_model?.model_type}
                        </p>
                      </div>
                      <div className={styles.bestModelBadge}>🥇 Best</div>
                    </div>

                    <div className={styles.metricsGrid}>
                      {Object.entries(trainingResult.best_model?.metrics || {}).map(
                        ([key, value]) => (
                          <div key={key} className={styles.metricCard}>
                            <div className={styles.metricLabel}>
                              {key.replace(/_/g, " ").toUpperCase()}
                            </div>
                            <div className={styles.metricValue}>
                              {typeof value === "number" ? value.toFixed(4) : value}
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <div className={styles.modelMeta}>
                      <span>
                        Training Time: {trainingResult.best_model?.training_time?.toFixed(2)}s
                      </span>
                      <span>Model ID: {trainingResult.best_model_id?.substring(0, 12)}...</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Models Comparison */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>📊 Model Comparison</h2>
                  <p className={styles.cardDescription}>
                    Performance comparison of all trained models
                  </p>
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
                          <tr
                            key={model.model_name}
                            className={model.is_best ? styles.bestRow : ""}
                          >
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

              {/* Visualizations Section */}
              <ModelVisualizations trainingResult={trainingResult} />

              {/* Action Buttons */}
              <div className={styles.actionBar}>
                <button className={styles.secondaryButton} onClick={handleReset}>
                  Train Another Model
                </button>
                <button 
                  className={styles.primaryButton} 
                  onClick={() => navigate(`/predict?model_id=${trainingResult.best_model_id}`)}
                >
                  Make Predictions with Best Model 🔮
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
