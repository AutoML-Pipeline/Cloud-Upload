import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import styles from "./Preprocessing.module.css";
import { useLocation } from "react-router-dom";

import { SelectionSection } from "./components/SelectionSection";
import { StepBuilder } from "./components/StepBuilder";
import { PreviewPanel } from "./components/PreviewPanel";
import { useAutoSelectFile } from "./hooks/useAutoSelectFile";
import { useDatasetPreview } from "./hooks/useDatasetPreview";
import { useFillStrategySync } from "./hooks/useFillStrategySync";
import { useActiveSteps } from "./hooks/useActiveSteps";
import { usePreprocessingJob } from "./hooks/usePreprocessingJob";
import { buildStepsPayload } from "./utils";

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

  const setStepsStable = useCallback((updater) => {
    const container = pageSectionRef.current;
    const hasWindow = typeof window !== "undefined";
    const previousScroll = container
      ? container.scrollTop
      : hasWindow
      ? window.scrollY
      : 0;

    setPreprocessingSteps((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );

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
  }, []);

  const handlePreviewError = useCallback((error) => {
    console.error("Error fetching data preview:", error);
    toast.error("Failed to load file preview: " + error.message);
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
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    }),
    []
  );

  const { result, setResult, loading, progressInfo, runPreprocessing, elapsedMs } = usePreprocessingJob({
    selectedFile,
    notify,
  });

  const collapseEnabled = Boolean(result) || loading || progressInfo.status !== "idle";

  useEffect(() => {
    if (!collapseEnabled && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [collapseEnabled, isBuilderCollapsed]);

  useEffect(() => {
    if (progressInfo.status === "failed" && isBuilderCollapsed) {
      setBuilderCollapsed(false);
    }
  }, [progressInfo.status, isBuilderCollapsed]);

  useEffect(() => {
    if (progressInfo.status === "completed") {
      setBuilderCollapsed(true);
    }
  }, [progressInfo.status]);

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

  const totalNulls = useMemo(() => {
    return Object.values(nullCounts).reduce((accumulator, value) => {
      const numeric = typeof value === "number" ? value : Number(value);
      return Number.isFinite(numeric) ? accumulator + numeric : accumulator;
    }, 0);
  }, [nullCounts]);

  const hasNulls = totalNulls > 0;
  const showRemoveNullsStep = hasNulls && !preprocessingSteps.fillNulls;
  const showFillNullsStep = hasNulls && !preprocessingSteps.removeNulls;

  const activeSteps = useActiveSteps(preprocessingSteps);

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

  const handleToggleRemoveNulls = useCallback(
    (checked) => {
      setStepsStable((prev) => {
        if (checked) {
          if (prev.removeNulls && !prev.fillNulls) {
            return prev;
          }
          return {
            ...prev,
            removeNulls: true,
            fillNulls: false,
          };
        }
        if (!prev.removeNulls) {
          return prev;
        }
        return {
          ...prev,
          removeNulls: false,
        };
      });
    },
    [setStepsStable]
  );

  const handleToggleFillNulls = useCallback(
    (checked) => {
      setStepsStable((prev) => {
        if (checked) {
          if (prev.fillNulls && !prev.removeNulls) {
            return prev;
          }
          return {
            ...prev,
            fillNulls: true,
            removeNulls: false,
          };
        }
        if (!prev.fillNulls) {
          return prev;
        }
        return {
          ...prev,
          fillNulls: false,
        };
      });
    },
    [setStepsStable]
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const stepsPayload = buildStepsPayload(preprocessingSteps);

      runPreprocessing({
        stepsPayload,
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
    [preprocessingSteps, runPreprocessing, setActivePreviewTab, setBuilderCollapsed]
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
    } catch (error) {
      console.error("Failed to save cleaned dataset", error);
      notify.error(error.message);
    }
  }, [notify, result, setResult]);

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
    <div className={`app-shell-with-chrome ${styles.pageShell}`}>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <section className={styles.pageIntro}>
            <span className={styles.pageIntroBadge}>Workflow · Data Prep</span>
            <h1 className={styles.pageIntroTitle}>Smart Data Preprocessing</h1>
            <p className={styles.pageIntroSubtitle}>
              Configure cleaning recipes, preview live diffs, and push polished datasets straight to MinIO.
            </p>
          </section>
          <div className={styles.card}>

            {step === "select_file" && (
              <SelectionSection
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
                      <StepBuilder
                        columns={columns}
                        columnInsights={columnInsights}
                        selectedFile={selectedFile}
                        preprocessingSteps={preprocessingSteps}
                        onUpdateSteps={setStepsStable}
                        showRemoveNullsStep={showRemoveNullsStep}
                        showFillNullsStep={showFillNullsStep}
                        previewReady={previewReady}
                        hasNulls={hasNulls}
                        nullCounts={nullCounts}
                        onToggleRemoveNulls={handleToggleRemoveNulls}
                        onToggleFillNulls={handleToggleFillNulls}
                        onChangeFile={() => setStep("select_file")}
                        onSubmit={handleSubmit}
                        loading={loading}
                        result={result}
                        activeSteps={activeSteps}
                        collapseEnabled={collapseEnabled}
                        onCollapse={() => setBuilderCollapsed(true)}
                      />
                    )}

                    {(result || loading || progressInfo.status !== "idle") && (
                      <PreviewPanel
                        result={result}
                        progressInfo={progressInfo}
                        activePreviewTab={activePreviewTab}
                        onTabChange={setActivePreviewTab}
                        statsCards={statsCards}
                        selectedFile={selectedFile}
                        preprocessingSteps={preprocessingSteps}
                        onSaveToMinio={handleSaveToMinio}
                        onDownloadFullCsv={handleDownloadCsv}
                        elapsedMs={elapsedMs}
                        progressAnchorRef={progressAnchorRef}
                        collapseEnabled={collapseEnabled}
                        isStepsCollapsed={isBuilderCollapsed}
                        onExpandSteps={() => setBuilderCollapsed(false)}
                      />
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
