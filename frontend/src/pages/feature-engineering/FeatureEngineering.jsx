import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import styles from "../preprocessing/Preprocessing.module.css";

import { SelectionSection } from "./components/SelectionSection";
import { StepBuilder } from "./components/StepBuilder";
import { PreviewPanel } from "./components/PreviewPanel";
import { useAutoSelectFile } from "./hooks/useAutoSelectFile";
import { useDatasetPreview } from "./hooks/useDatasetPreview";
import { useFeatureEngineeringJob } from "./hooks/useFeatureEngineeringJob";
import { useActiveSteps } from "./hooks/useActiveSteps";
import { INITIAL_STEPS, buildStepsPayload, deriveStatsCards } from "./utils";

const FILES_QUERY_KEY = ["feature-engineering", "files", "cleaned"];

export default function FeatureEngineering() {
  const location = useLocation();
  const pageSectionRef = useRef(null);

  const { data: filesData, isFetching: isFetchingFiles } = useQuery({
    queryKey: FILES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/feature-engineering/files/cleaned");
      if (!response.ok) {
        throw new Error("Failed to fetch cleaned files");
      }
      return response.json();
    },
    staleTime: 60 * 1000,
  });

  const files = useMemo(() => filesData || [], [filesData]);

  const [selectedFile, setSelectedFile] = useState("");
  const selectedFileInfo = useMemo(
    () => files.find((file) => file?.name === selectedFile),
    [files, selectedFile],
  );

  const [step, setStep] = useState("select_file");
  const [stepsState, setStepsState] = useState(INITIAL_STEPS);
  const [datasetPreview, setDatasetPreview] = useState(null);
  const [isBuilderCollapsed, setBuilderCollapsed] = useState(false);
  const progressAnchorRef = useRef(null);

  const notify = useMemo(
    () => ({
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    }),
    [],
  );

  const setStepsStable = useCallback((updater) => {
    const container = pageSectionRef.current;
    const hasWindow = typeof window !== "undefined";
    const previousScroll = container ? container.scrollTop : hasWindow ? window.scrollY : 0;

    setStepsState((prev) => (typeof updater === "function" ? updater(prev) : updater));

    const restoreScroll = () => {
      if (container) {
        container.scrollTop = previousScroll;
      } else if (hasWindow) {
        window.scrollTo(0, previousScroll);
      }
    };

    if (hasWindow && typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(restoreScroll);
    } else {
      restoreScroll();
    }
  }, []);

  const handleResetPreview = useCallback(() => setDatasetPreview(null), []);

  useAutoSelectFile({
    files,
    selectedFile,
    step,
    search: location.search,
    onSelectFile: setSelectedFile,
    onStepChange: setStep,
    onResetPreview: handleResetPreview,
  });

  const resetStepsToInitial = useCallback(() => setStepsState(INITIAL_STEPS), []);

  const handlePreviewError = useCallback(
    (error) => {
      console.error("Error fetching dataset preview", error);
      notify.error(`Failed to load dataset preview: ${error.message}`);
      setDatasetPreview({ error: error.message });
    },
    [notify],
  );

  useDatasetPreview({
    selectedFile,
    step,
    onLoading: handleResetPreview,
    onLoaded: setDatasetPreview,
    onError: handlePreviewError,
    onResetSteps: resetStepsToInitial,
  });

  const { result, setResult, loading, progressInfo, runFeatureEngineering, elapsedMs } = useFeatureEngineeringJob({
    selectedFile,
    notify,
  });
  const collapseEnabled = Boolean(result);

  useEffect(() => {
    if (!collapseEnabled && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [collapseEnabled, isBuilderCollapsed]);

  useEffect(() => {
    if ((loading || progressInfo.status === "queued" || progressInfo.status === "pending") && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [loading, progressInfo.status, isBuilderCollapsed]);

  const isPreviewLoading =
    step === "configure_feature_engineering" && selectedFile && !datasetPreview && !isFetchingFiles;
  const columns = useMemo(() => datasetPreview?.columns || [], [datasetPreview]);
  const activeSteps = useActiveSteps(stepsState);
  const statsCards = useMemo(() => deriveStatsCards(result, activeSteps.length), [result, activeSteps.length]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const stepsPayload = buildStepsPayload(stepsState);

      runFeatureEngineering({
        stepsPayload,
        onBeforeStart: () => {
          if (progressAnchorRef.current) {
            requestAnimationFrame(() => {
              progressAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            });
          }
        },
      });
    },
    [stepsState, runFeatureEngineering],
  );

  const handleSaveToMinio = useCallback(async () => {
    if (!result?.temp_engineered_path || !result?.engineered_filename) {
      notify.error("Run feature engineering before saving to MinIO");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/feature-engineering/save-to-minio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_engineered_path: result.temp_engineered_path,
          filename: result.engineered_filename,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || "Failed to save feature engineered dataset to MinIO");
      }

      notify.success(payload.message || "Engineered dataset saved to MinIO");
      setResult((prev) => (prev ? { ...prev, temp_engineered_path: null } : prev));
    } catch (error) {
      notify.error(error.message);
      console.error("Failed to save engineered dataset", error);
    }
  }, [notify, result, setResult]);

  const handleDownloadCsv = useCallback(async () => {
    if (!result?.temp_engineered_path && !result?.engineered_filename) {
      notify.error("Run feature engineering to generate a dataset before downloading");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/api/feature-engineering/download-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temp_engineered_path: result.temp_engineered_path,
          filename: result.engineered_filename,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.detail || payload?.error || "Failed to download engineered dataset");
      }

      const blob = await response.blob();
      const downloadName = (result?.engineered_filename || "feature_engineered_dataset.parquet")
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
      console.error("Failed to download engineered dataset", error);
      notify.error(error.message);
    }
  }, [notify, result]);

  return (
    <div className={`app-shell-with-chrome ${styles.pageShell}`}>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <section className={styles.pageIntro}>
            <span className={styles.pageIntroBadge}>Workflow · Feature Lab</span>
            <h1 className={styles.pageIntroTitle}>Feature Engineering Studio</h1>
            <p className={styles.pageIntroSubtitle}>
              Start from your cleaned datasets, configure transformations, and generate enriched features ready for modeling in minutes.
            </p>
          </section>
          <div className={styles.card}>

            {step === "select_file" && (
              <SelectionSection
                files={files}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                onContinue={() => setStep("configure_feature_engineering")}
                isFetchingFiles={isFetchingFiles}
                selectedFileInfo={selectedFileInfo}
              />
            )}

            {step === "configure_feature_engineering" && (
              isPreviewLoading ? (
                <div className={styles.previewLoadingShell}>
                  <div className={styles.previewLoadingSpinner} />
                  <p className={styles.previewLoadingMessage}>Loading dataset preview…</p>
                </div>
              ) : (
                <>
                  {datasetPreview && datasetPreview.error && (
                    <div className={styles.errorContainer}>
                      <p className={styles.errorMessage}>Error: {datasetPreview.error}</p>
                      <p className={styles.errorHint}>
                        Please check the file for corruption or unsupported content and try again.
                      </p>
                    </div>
                  )}

                  <div className={`${styles.layoutGrid} ${isBuilderCollapsed ? styles.layoutGridCollapsed : ""}`}>
                    {!isBuilderCollapsed && (
                      <StepBuilder
                        columns={columns}
                        selectedFile={selectedFile}
                        steps={stepsState}
                        onUpdateSteps={setStepsStable}
                        onChangeFile={() => setStep("select_file")}
                        onSubmit={handleSubmit}
                        loading={loading}
                        activeSteps={activeSteps}
                        result={result}
                        collapseEnabled={collapseEnabled}
                        onCollapse={() => setBuilderCollapsed(true)}
                      />
                    )}

                    <PreviewPanel
                      result={result}
                      progressInfo={progressInfo}
                      statsCards={statsCards}
                      onSaveToMinio={handleSaveToMinio}
                      selectedFile={selectedFile}
                      onDownloadCsv={handleDownloadCsv}
                      elapsedMs={elapsedMs}
                      progressAnchorRef={progressAnchorRef}
                      collapseEnabled={collapseEnabled}
                      isStepsCollapsed={isBuilderCollapsed}
                      onExpandSteps={() => setBuilderCollapsed(false)}
                    />
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


