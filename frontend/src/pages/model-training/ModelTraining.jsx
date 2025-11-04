import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import saasToast from "@/utils/toast";
import styles from "./ModelTraining.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import PageBackLink from "../../components/PageBackLink";
import PageHero from "../../components/PageHero";
import TrainingFileSelect from "./components/TrainingFileSelect";
import TrainingLoading from "./components/TrainingLoading";
import TrainingConfigure from "./components/TrainingConfigure";
import TrainingProgress from "./components/TrainingProgress";
import TrainingFailed from "./components/TrainingFailed";
import TrainingResults from "./components/TrainingResults";
import ErrorBoundary from "./components/ErrorBoundary";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useTrainingJob } from "./hooks/useTrainingJob";


function ModelTrainingInner() {
  const location = useLocation();
  const navigate = useNavigate();
  // pipeline run tracking removed
  
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
  
  // Training state via hook
  const {
    jobId,
    status: trainingStatus,
    progress,
    result: trainingResult,
    error: trainingError,
    elapsedTime,
    savedModelId,
    startTraining,
    saveModel,
    reset: resetTrainingState,
  } = useTrainingJob();
  const [quickTrainRequested, setQuickTrainRequested] = useState(false);
  const hasUnsavedModel = useMemo(
    () => trainingStatus === "completed" && !!trainingResult && !savedModelId,
    [trainingStatus, trainingResult, savedModelId]
  );

  // Unsaved confirm modal state and handlers (centered pop-up like logout)
  const [unsavedOpen, setUnsavedOpen] = useState(false);
  const unsavedOnContinueRef = useRef(null);
  const unsavedOnDiscardRef = useRef(null);
  const openUnsavedConfirm = useCallback(({ onContinue, onDiscard }) => {
    unsavedOnContinueRef.current = onContinue;
    unsavedOnDiscardRef.current = onDiscard;
    setUnsavedOpen(true);
  }, []);

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
  saasToast.success("Dataset loaded successfully!", { idKey: 'train-dataset-loaded' });
    } catch (error) {
      console.error("Error loading dataset:", error);
  saasToast.error(error.message || "Failed to load dataset", { idKey: 'train-dataset-error' });
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
  saasToast.error("Failed to load dataset columns", { idKey: 'train-columns-error' });
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
        
  saasToast.success(`✓ Detected ${data.problem_type} problem for "${targetColumn}"`, { idKey: 'train-problem-detected' });
      } catch (error) {
        console.error("Error fetching recommendations:", error);
  saasToast.error("Failed to analyze target column", { idKey: 'train-problem-error' });
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [selectedFile, targetColumn, step, setProblemType, setSelectedModels, setSelectAllModels]);

  // When in 'Train all' mode, backend trains all models; no need to pre-select here.

  // Polling and elapsed time handled by useTrainingJob hook

  const handleStartTraining = useCallback(async () => {
    if (!targetColumn) {
  saasToast.error("Please select a target column", { idKey: 'train-select-target' });
      return;
    }

    try {
      await startTraining({
        filename: selectedFile,
        targetColumn,
        problemType,
        modelsToTrain: selectedModels,
        selectAllModels,
      });
      // Clear any previous error and move to training step
      setStep("training");
  saasToast.success("Training job started!", { idKey: 'train-started' });
    } catch (error) {
      console.error("Error starting training:", error);
  saasToast.error(error.message, { idKey: 'train-start-error' });
    }
  }, [targetColumn, problemType, selectAllModels, selectedModels, selectedFile, startTraining]);

  // If quick-train was requested from selection step, auto-start once recommendations are ready
  useEffect(() => {
    if (
      quickTrainRequested &&
      step === "configure" &&
      !loadingRecommendations &&
      targetColumn &&
      problemType &&
      (selectedModels.length > 0 || selectAllModels)
    ) {
      const t = setTimeout(() => {
        handleStartTraining();
        setQuickTrainRequested(false);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [quickTrainRequested, step, loadingRecommendations, targetColumn, problemType, selectedModels, selectAllModels, handleStartTraining]);

  const handleSaveModel = useCallback(async () => {
    try {
      const id = await saveModel();
  saasToast.success("Model saved successfully", { idKey: 'train-save-success' });
      return id;
    } catch (e) {
      console.error("Save model failed", e);
  saasToast.error(e.message || "Save failed", { idKey: 'train-save-error' });
    }
  }, [saveModel]);

  // Warn on browser/tab close if there's an unsaved model
  useEffect(() => {
    if (!hasUnsavedModel) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "You have an unsaved trained model. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedModel]);

  // Toast-based confirmation helpers for unsaved model
  // Remove toast-based unsaved prompt; we'll use centered ConfirmDialog for parity with logout

  // Reset function must be declared before any callbacks that depend on it (avoid TDZ ReferenceError)
  const handleReset = useCallback(() => {
    resetTrainingState();
    setStep("select_file");
    setSelectedFile("");
    setTargetColumn("");
    setProblemType(null);
    setSelectedModels([]);
    setSelectAllModels(true);
  }, [resetTrainingState]);

  const handleResetWithConfirm = useCallback(() => {
    if (!hasUnsavedModel) {
      handleReset();
      return;
    }
    openUnsavedConfirm({
      onContinue: async () => { await handleSaveModel(); handleReset(); },
      onDiscard: () => { handleReset(); },
    });
  }, [hasUnsavedModel, openUnsavedConfirm, handleSaveModel, handleReset]);

  const handleBackClick = useCallback((e) => {
    if (!hasUnsavedModel) return; // allow default
    e.preventDefault();
    e.stopPropagation();
    openUnsavedConfirm({
      onContinue: async () => { await handleSaveModel(); navigate('/dashboard'); },
      onDiscard: () => navigate('/dashboard'),
    });
  }, [hasUnsavedModel, navigate, openUnsavedConfirm, handleSaveModel]);

  // (moved earlier)

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          <PageHero
            badge="Workflow · Model Training"
            title="Smart Model Training & Selection"
            subtitle="Automatically train and compare multiple ML models to find the best performer for your dataset."
          />
          
          <div className="mt-4">
            <span onClick={handleBackClick}>
              <PageBackLink to="/dashboard" label="Dashboard" />
            </span>
          </div>

          {/* Step 1: File Selection */}
          {step === "select_file" && (
            <TrainingFileSelect
              files={files}
              selectedFile={selectedFile}
              onSelect={setSelectedFile}
              onContinue={handleProceedToConfigure}
              onQuickTrain={() => { setQuickTrainRequested(true); handleProceedToConfigure(); }}
              isFetching={isFetchingFiles}
            />
          )}

          {/* Loading Step */}
          {step === "loading" && (
            <TrainingLoading loadingDataset={loadingDataset} datasetInfo={datasetInfo} />
          )}

          {/* Step 2: Configuration */}
          {step === "configure" && (
            <TrainingConfigure
              selectedFile={selectedFile}
              targetColumn={targetColumn}
              setTargetColumn={setTargetColumn}
              problemType={problemType}
              setProblemType={setProblemType}
              columns={columns}
              recommendations={recommendations}
              loadingRecommendations={loadingRecommendations}
              onStartTraining={handleStartTraining}
              onBack={() => setStep("select_file")}
            />
          )}

          {/* Step 3: Training in Progress */}
          {step === "training" && trainingStatus !== "completed" && trainingStatus !== "failed" && (
            <TrainingProgress
              status={trainingStatus}
              progress={progress}
              selectedFile={selectedFile}
              targetColumn={targetColumn}
              elapsedTime={elapsedTime}
              jobId={jobId}
            />
          )}

          {/* Training Failed */}
          {step === "training" && trainingStatus === "failed" && (
            <TrainingFailed
              error={trainingError}
              onBack={() => setStep("configure")}
              onRetry={handleStartTraining}
            />
          )}

          {/* Step 4: Results */}
          {step === "training" && trainingStatus === "completed" && trainingResult && (
            <TrainingResults
              trainingResult={trainingResult}
              savedModelId={savedModelId}
              onSave={handleSaveModel}
              onPredict={() => navigate(`/predict?model_id=${savedModelId}`)}
              onTrainAnother={handleResetWithConfirm}
            />
          )}
        {/* Unsaved Model Centered Confirm (same style as logout) */}
        <ConfirmDialog
          open={unsavedOpen}
          title="Unsaved trained model"
          message="You have an unsaved trained model. What would you like to do?"
          cancelText="Cancel"
          secondaryText="Discard"
          confirmText="Save & Continue"
          onCancel={() => setUnsavedOpen(false)}
          onSecondary={() => { setUnsavedOpen(false); unsavedOnDiscardRef.current && unsavedOnDiscardRef.current(); }}
          onConfirm={() => { setUnsavedOpen(false); unsavedOnContinueRef.current && unsavedOnContinueRef.current(); }}
        />
      </div>
    </div>
    </div>
  );
}

export default function ModelTraining() {
  return (
    <ErrorBoundary>
      <ModelTrainingInner />
    </ErrorBoundary>
  );
}
