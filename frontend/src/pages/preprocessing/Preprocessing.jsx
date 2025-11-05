import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import saasToast from "@/utils/toast";
import PageHero from "../../components/PageHero";
import styles from "./Preprocessing.module.css";
import { useLocation, useNavigate } from "react-router-dom";

import PreFileSelect from "./components/PreFileSelect";
import PreConfigure from "./components/PreConfigure";
import PreProgress from "./components/PreProgress";
import PreResults from "./components/PreResults";
import { useAutoSelectFile } from "./hooks/useAutoSelectFile";
import { useDatasetPreview } from "./hooks/useDatasetPreview";
import { useFillStrategySync } from "./hooks/useFillStrategySync";
import { usePreprocessingRecommendations } from "./hooks/usePreprocessingRecommendations";
import { useActiveSteps } from "./hooks/useActiveSteps";
import usePreprocessJob from "./hooks/usePreprocessJob";
import { buildStepsPayload } from "./utils";
import { useWorkflowSession, useAutoSaveWorkflow } from "../../hooks/useWorkflowSession";

const INITIAL_STEPS = {
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
    method: "iqr",
    factor: 1.5,
    columns: [],
  },
};

export default function Preprocessing() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: filesData, isFetching: isFetchingFiles } = useQuery({
    queryKey: ["files", "list"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/files/list");
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const files = useMemo(() => filesData?.files || [], [filesData]);
  const [selectedFile, setSelectedFile] = useState("");
  const selectedFileInfo = useMemo(
    () => files.find((file) => file?.name === selectedFile),
    [files, selectedFile]
  );

  const [step, setStep] = useState("select_file");
  const [activePreviewTab, setActivePreviewTab] = useState("preview");
  const [preprocessingSteps, setPreprocessingSteps] = useState(INITIAL_STEPS);
  const [dataPreview, setDataPreview] = useState(null);
  const [isBuilderCollapsed, setBuilderCollapsed] = useState(false);
  const pageSectionRef = useRef(null);
  const progressAnchorRef = useRef(null);

  // Workflow session management - Phase 1: sessionStorage
  // Use global workflow key (no file identifier) to store the entire workflow state
  const {
    savedState,
    hasResumableState,
    clearWorkflowState,
    showResumeNotification,
  } = useWorkflowSession("preprocessing", null); // null = global workflow state

  // Auto-save workflow state when steps change
  useAutoSaveWorkflow(
    "preprocessing",
    null, // null = global workflow state (not file-specific)
    {
      selectedFile,
      step,
      preprocessingSteps,
      activePreviewTab,
    },
    { enabled: !!selectedFile } // Save whenever file is selected
  );

  const setStepsStable = useCallback((updater) => {
    setPreprocessingSteps((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  const handleResetPreview = useCallback(() => setDataPreview(null), []);

  // Track if we've restored state to prevent auto-select override
  const hasRestoredRef = useRef(false);

  // Restore workflow state EARLY - before auto-select runs
  useEffect(() => {
    if (hasRestoredRef.current || !files.length) return;
    
    if (hasResumableState && savedState) {
      // Check if the saved file still exists in the current file list
      const fileExists = files.some((f) => f?.name === savedState.selectedFile);
      
      if (fileExists) {
        // Restore file selection FIRST
        if (savedState.selectedFile && savedState.selectedFile !== selectedFile) {
          setSelectedFile(savedState.selectedFile);
        }
        
        // Restore workflow state
        if (savedState.step && savedState.step !== "select_file") {
          setStep(savedState.step);
        }
        if (savedState.preprocessingSteps) {
          setPreprocessingSteps(savedState.preprocessingSteps);
        }
        if (savedState.activePreviewTab) {
          setActivePreviewTab(savedState.activePreviewTab);
        }
        
        showResumeNotification("Resuming your preprocessing workflow...");
        console.log("✅ Restored preprocessing workflow state:", savedState);
        hasRestoredRef.current = true;
      }
    }
  }, [hasResumableState, savedState, files, selectedFile, showResumeNotification]);

  // Auto-select file from URL or default - but SKIP if we just restored state
  useAutoSelectFile({
    files,
    selectedFile,
    step,
    search: location.search,
    onSelectFile: setSelectedFile,
    onStepChange: setStep,
    onResetPreview: handleResetPreview,
    skipAutoSelect: hasRestoredRef.current, // NEW: Skip if we restored
  });

  const resetPrimarySteps = useCallback(() => {
    setPreprocessingSteps((prev) => ({
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
    // Clear workflow state when resetting steps
    clearWorkflowState({ silent: true });
  }, [clearWorkflowState]);

  const handlePreviewError = useCallback((error) => {
    console.error("Error fetching data preview:", error);
    saasToast.error("Failed to load file preview: " + error.message, { idKey: 'preprocess-preview-error' });
    setDataPreview(null);
  }, []);

  useDatasetPreview({
    selectedFile,
    step,
    onLoading: handleResetPreview,
    onLoaded: setDataPreview,
    onError: handlePreviewError,
    onResetSteps: resetPrimarySteps,
  });
  const notify = useMemo(
    () => ({
      success: (message) => saasToast.success(message, { idKey: 'preprocess-success' }),
      error: (message) => saasToast.error(message, { idKey: 'preprocess-error' }),
    }),
    []
  );

  const { result, setResult, status, progress, message, elapsedTime, startPreprocess } = usePreprocessJob({ notify });

  const collapseEnabled = Boolean(result) || status !== "idle";

  useEffect(() => {
    if (!collapseEnabled && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [collapseEnabled, isBuilderCollapsed]);

  useEffect(() => {
    if (status === "failed" && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [status, isBuilderCollapsed]);

  useEffect(() => {
    if (status === "completed") {
      setBuilderCollapsed(true);
    }
  }, [status]);

  const isPreviewLoading =
    step === "configure_preprocessing" && selectedFile && !dataPreview && !isFetchingFiles;
  const columns = useMemo(() => dataPreview?.columns || [], [dataPreview]);
  const columnTypes = useMemo(() => dataPreview?.dtypes || {}, [dataPreview]);
  const sampleValues = useMemo(() => dataPreview?.sample_values || {}, [dataPreview]);
  const nullCounts = useMemo(
    () => dataPreview?.null_counts ?? {},
    [dataPreview]
  );
  const columnInsights = useMemo(() => {
    if (!columns.length) {
      return {};
    }
    return columns.reduce((accumulator, column) => {
      accumulator[column] = {
        dtype: columnTypes[column],
        sampleValue: sampleValues[column],
        nullCount: nullCounts[column] ?? 0,
      };
      return accumulator;
    }, {});
  }, [columns, columnTypes, sampleValues, nullCounts]);

  useFillStrategySync({
    selectedColumns: preprocessingSteps.fillNullsColumns,
    setPreprocessingSteps,
    columnInsights,
  });
  const previewReady = Boolean(dataPreview && !dataPreview.error);

  // totalNulls handled inside PreConfigure

  const activeSteps = useActiveSteps(preprocessingSteps);

  // Recommendations (mirrors Feature Engineering pattern)
  const { data: recData, loading: recLoading } = usePreprocessingRecommendations(
    step === "configure_preprocessing" ? selectedFile : ""
  );
  const preprocessingSuggestions = recData?.suggestions;

  // Determine which suggestions are already applied to give UI feedback
  // Applied map + recommendation actions handled within PreConfigure

  const statsCards = useMemo(() => {
    if (!result) {
      return [
        { label: "Original rows", value: "--", tone: "muted" },
        { label: "Cleaned rows", value: "--", tone: "muted" },
        { label: "Rows removed", value: "--", tone: "muted" },
        { label: "Steps applied", value: String(activeSteps.length), tone: "muted" },
      ];
    }

    const removed = result.original_row_count - result.cleaned_row_count;
    return [
      {
        label: "Original rows",
        value: result.original_row_count.toLocaleString(),
        tone: "neutral",
      },
      {
        label: "Cleaned rows",
        value: result.cleaned_row_count.toLocaleString(),
        tone: "success",
      },
      {
        label: "Rows removed",
        value: removed.toLocaleString(),
        tone: removed > 0 ? "warning" : "muted",
      },
      {
        label: "Steps applied",
        value: String((result.change_metadata || []).length),
        tone: "info",
      },
    ];
  }, [result, activeSteps.length]);

  // Null toggles handled in PreConfigure

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const stepsPayload = buildStepsPayload(preprocessingSteps);

      startPreprocess(selectedFile, stepsPayload, {
        onBeforeStart: () => {
          setBuilderCollapsed(true);
          setActivePreviewTab("preview");
          if (progressAnchorRef.current) {
            requestAnimationFrame(() => {
              progressAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        },
      });
    },
    [preprocessingSteps, startPreprocess, selectedFile, setActivePreviewTab, setBuilderCollapsed]
  );

  const handleSaveToMinio = useCallback(async () => {
    if (!result?.temp_cleaned_path || !result?.cleaned_filename) {
      notify.error("Run preprocessing before saving to MinIO");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/data/save_cleaned_to_minio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_cleaned_path: result.temp_cleaned_path,
          cleaned_filename: result.cleaned_filename,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || "Failed to save cleaned dataset to MinIO");
      }

      notify.success(payload.message || "Cleaned dataset saved to MinIO");
      setResult((prev) => (prev ? { ...prev, temp_cleaned_path: null } : prev));

      // Clear workflow state after successful save
      clearWorkflowState({ silent: true });

      // Seamless flow: jump to Feature Engineering with the new cleaned filename
      if (result?.cleaned_filename) {
        navigate(`/feature-engineering?file=${encodeURIComponent(result.cleaned_filename)}`);
      }
    } catch (error) {
      console.error("Failed to save cleaned dataset", error);
      notify.error(error.message);
    }
  }, [notify, result, setResult, navigate, clearWorkflowState]);

  const handleDownloadCsv = useCallback(async () => {
    if (!result?.temp_cleaned_path && !result?.cleaned_filename) {
      notify.error("Run preprocessing to generate a dataset before downloading");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/data/download_cleaned_csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_cleaned_path: result.temp_cleaned_path,
          cleaned_filename: result.cleaned_filename,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || payload?.error || "Failed to download cleaned dataset");
      }

      const blob = await response.blob();
      const downloadName = (result?.cleaned_filename || "cleaned_dataset.parquet")
        .replace(/\.(parquet|csv)$/i, "")
        .concat(".csv");

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download cleaned dataset", error);
      notify.error(error.message);
    }
  }, [notify, result]);

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <PageHero
            badge="Workflow · Data Prep"
            title="Smart Data Preprocessing"
            subtitle="Configure cleaning recipes, preview live diffs, and push polished datasets straight to MinIO."
          />
          <div className={styles.card}>

            {step === "select_file" && (
              <PreFileSelect
                files={files}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                onContinue={() => setStep("configure_preprocessing")}
                isFetchingFiles={isFetchingFiles}
                selectedFileInfo={selectedFileInfo}
              />
            )}

            {step === "configure_preprocessing" && (
              isPreviewLoading ? (
                <div className={styles.previewLoadingShell}>
                  <div className={styles.previewLoadingSpinner} />
                  <p className={styles.previewLoadingMessage}>Loading dataset preview…</p>
                </div>
              ) : (
                <>
                  {dataPreview && dataPreview.error && (
                    <div className={styles.errorContainer}>
                      <p className={styles.errorMessage}>Error: {dataPreview.error}</p>
                      <p className={styles.errorHint}>
                        Please check the file for corruption or unsupported content and try again.
                      </p>
                    </div>
                  )}

                  <div className={`${styles.layoutGrid} ${isBuilderCollapsed ? styles.layoutGridCollapsed : ""} ${!result ? styles.layoutGridFullWidth : ""}`}>
                    {!isBuilderCollapsed && (
                      <PreConfigure
                        columns={columns}
                        columnInsights={columnInsights}
                        selectedFile={selectedFile}
                        steps={preprocessingSteps}
                        onUpdateSteps={setStepsStable}
                        previewReady={previewReady}
                        nullCounts={nullCounts}
                        onChangeFile={() => setStep("select_file")}
                        onSubmit={handleSubmit}
                        loading={status === "pending" || status === "queued"}
                        activeSteps={activeSteps}
                        collapseEnabled={collapseEnabled}
                        onCollapse={() => setBuilderCollapsed(true)}
                        suggestions={preprocessingSuggestions}
                        suggestionsLoading={recLoading}
                      />
                    )}

                    {(result || status !== "idle") && (
                      status === "completed" ? (
                        <PreResults
                          result={result}
                          progressInfo={{ status, progress, message }}
                          activePreviewTab={activePreviewTab}
                          onTabChange={setActivePreviewTab}
                          statsCards={statsCards}
                          selectedFile={selectedFile}
                          preprocessingSteps={preprocessingSteps}
                          onSaveToMinio={handleSaveToMinio}
                          onDownloadFullCsv={handleDownloadCsv}
                          elapsedMs={elapsedTime}
                          progressAnchorRef={progressAnchorRef}
                          collapseEnabled={collapseEnabled}
                          isStepsCollapsed={isBuilderCollapsed}
                          onExpandSteps={() => setBuilderCollapsed(false)}
                        />
                      ) : (
                        <PreProgress
                          result={result}
                          status={status}
                          progress={progress}
                          message={message}
                          activePreviewTab={activePreviewTab}
                          onTabChange={setActivePreviewTab}
                          statsCards={statsCards}
                          selectedFile={selectedFile}
                          preprocessingSteps={preprocessingSteps}
                          onSaveToMinio={handleSaveToMinio}
                          onDownloadFullCsv={handleDownloadCsv}
                          elapsedMs={elapsedTime}
                          progressAnchorRef={progressAnchorRef}
                          collapseEnabled={collapseEnabled}
                          isStepsCollapsed={isBuilderCollapsed}
                          onExpandSteps={() => setBuilderCollapsed(false)}
                        />
                      )
                    )}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
