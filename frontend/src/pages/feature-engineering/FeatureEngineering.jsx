import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import saasToast from "@/utils/toast";
import PageHero from "../../components/PageHero";
import styles from "../preprocessing/Preprocessing.module.css";
import { useLocation, useNavigate } from "react-router-dom";

import FEFileSelect from "./components/FEFileSelect";
import FEConfigure from "./components/FEConfigure";
import FEProgress from "./components/FEProgress";
import FEResults from "./components/FEResults";
import { useAutoSelectFile } from "./hooks/useAutoSelectFile";
import { useDatasetPreview } from "./hooks/useDatasetPreview";
import { useActiveSteps } from "./hooks/useActiveSteps";
import useFEJob from "./hooks/useFEJob";
import { INITIAL_STEPS, buildStepsPayload } from "./utils";

export default function FeatureEngineering() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: filesData, isFetching: isFetchingFiles } = useQuery({
    queryKey: ["feature-engineering", "files", "cleaned"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/feature-engineering/files/cleaned");
      if (!response.ok) {
        throw new Error("Failed to fetch cleaned files");
      }
      const data = await response.json();
      return { files: Array.isArray(data) ? data : data.files || [] };
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
  const [featureEngineeringSteps, setFeatureEngineeringSteps] = useState(INITIAL_STEPS);
  const [dataPreview, setDataPreview] = useState(null);
  const [isBuilderCollapsed, setBuilderCollapsed] = useState(false);
  const pageSectionRef = useRef(null);
  const progressAnchorRef = useRef(null);

  const setStepsStable = useCallback((updater) => {
    setFeatureEngineeringSteps((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  const handleResetPreview = useCallback(() => setDataPreview(null), []);

  useAutoSelectFile({
    files,
    selectedFile,
    step,
    search: location.search,
    onSelectFile: setSelectedFile,
    onStepChange: setStep,
    onResetPreview: handleResetPreview,
  });

  const resetPrimarySteps = useCallback(() => {
    setFeatureEngineeringSteps(INITIAL_STEPS);
  }, []);

  const handlePreviewError = useCallback((error) => {
    console.error("Error fetching data preview:", error);
    saasToast.error("Failed to load file preview: " + error.message, { idKey: 'fe-preview-error' });
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

  // Recommendations handled inside FEAnalyze (via FEConfigure)

  const notify = useMemo(
    () => ({
      success: (message) => saasToast.success(message, { idKey: 'fe-success' }),
      error: (message) => saasToast.error(message, { idKey: 'fe-error' }),
    }),
    []
  );

  const { result, setResult, status, progress, message, elapsedTime, startAnalyze, startApply } = useFEJob({ notify });

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

  const isPreviewLoading = step === "configure_feature_engineering" && selectedFile && !dataPreview && !isFetchingFiles;
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

  const previewReady = Boolean(dataPreview && !dataPreview.error);
  const activeSteps = useActiveSteps(featureEngineeringSteps);

  const statsCards = useMemo(() => {
    if (!result && !dataPreview) {
      return [
        { label: "Original rows", value: "--", tone: "muted" },
        { label: "Engineered rows", value: "--", tone: "muted" },
        { label: "New features", value: "--", tone: "muted" },
        { label: "Steps applied", value: String(activeSteps.length), tone: "muted" },
      ];
    }
    const originalRows = result?.original_row_count || dataPreview?.total_rows || 0;
    const engineeredRows = result?.engineered_row_count || dataPreview?.total_rows || 0;
    const newFeatures = result?.new_features_count || 0;
    return [
      { label: "Original rows", value: originalRows.toLocaleString(), tone: "neutral" },
      { label: "Engineered rows", value: engineeredRows.toLocaleString(), tone: "success" },
      { label: "New features", value: newFeatures.toLocaleString(), tone: newFeatures > 0 ? "success" : "muted" },
      { label: "Steps applied", value: String((result?.change_metadata || []).length), tone: "info" },
    ];
  }, [result, activeSteps.length, dataPreview]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const stepsPayload = buildStepsPayload(featureEngineeringSteps);

      startApply(selectedFile, stepsPayload, {
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
    [featureEngineeringSteps, startApply, selectedFile, setActivePreviewTab, setBuilderCollapsed]
  );

  // Recommendation apply/undo/all logic moved to FEAnalyze

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
          engineered_filename: result.engineered_filename,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || "Failed to save engineered dataset to MinIO");
      }

      notify.success(payload.message || "Engineered dataset saved to MinIO");
      setResult((prev) => (prev ? { ...prev, temp_engineered_path: null } : prev));

      // Seamless flow: go to training with the engineered dataset selected
      if (result?.engineered_filename) {
        navigate(`/model-training?file=${encodeURIComponent(result.engineered_filename)}`);
      }
    } catch (error) {
      console.error("Failed to save engineered dataset", error);
      notify.error(error.message);
    }
  }, [notify, result, setResult, navigate]);

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
          engineered_filename: result.engineered_filename,
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
    <div className={styles.pageShell}>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <PageHero
            badge="Workflow · Feature Engineering"
            title="Smart Feature Engineering"
            subtitle="Configure advanced feature transformations, preview live diffs, and push engineered datasets straight to MinIO."
          />
          <div className={styles.card}>

            {step === "select_file" && (
              <FEFileSelect
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
                      <FEConfigure
                        columns={columns}
                        columnInsights={columnInsights}
                        selectedFile={selectedFile}
                        steps={featureEngineeringSteps}
                        onUpdateSteps={setStepsStable}
                        previewReady={previewReady}
                        onChangeFile={() => setStep("select_file")}
                        onSubmit={handleSubmit}
                        loading={status === "pending" || status === "queued"}
                        activeSteps={activeSteps}
                        collapseEnabled={collapseEnabled}
                        onCollapse={() => setBuilderCollapsed(true)}
                        dataPreview={dataPreview}
                        startAnalyze={startAnalyze}
                      />
                    )}

                    {(result || status !== "idle") && (
                      (status === "completed" ? (
                        <FEResults
                          result={result}
                          progressInfo={{ status, progress, message }}
                          activePreviewTab={activePreviewTab}
                          onTabChange={setActivePreviewTab}
                          statsCards={statsCards}
                          selectedFile={selectedFile}
                          steps={featureEngineeringSteps}
                          onSaveToMinio={handleSaveToMinio}
                          onDownloadFullCsv={handleDownloadCsv}
                          elapsedMs={elapsedTime}
                          progressAnchorRef={progressAnchorRef}
                          collapseEnabled={collapseEnabled}
                          isStepsCollapsed={isBuilderCollapsed}
                          onExpandSteps={() => setBuilderCollapsed(false)}
                        />
                      ) : (
                        <FEProgress
                          result={result}
                          status={status}
                          progress={progress}
                          message={message}
                          activePreviewTab={activePreviewTab}
                          onTabChange={setActivePreviewTab}
                          statsCards={statsCards}
                          selectedFile={selectedFile}
                          steps={featureEngineeringSteps}
                          onSaveToMinio={handleSaveToMinio}
                          onDownloadFullCsv={handleDownloadCsv}
                          elapsedMs={elapsedTime}
                          progressAnchorRef={progressAnchorRef}
                          collapseEnabled={collapseEnabled}
                          isStepsCollapsed={isBuilderCollapsed}
                          onExpandSteps={() => setBuilderCollapsed(false)}
                        />
                      ))
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



