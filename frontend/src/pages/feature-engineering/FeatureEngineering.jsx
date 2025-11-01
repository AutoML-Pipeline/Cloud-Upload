import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import PageHero from "../../components/PageHero";
import styles from "../preprocessing/Preprocessing.module.css";
import { useLocation } from "react-router-dom";

import { SelectionSection } from "./components/SelectionSection";
import { StepBuilder } from "./components/StepBuilder";
import { PreviewPanel } from "./components/PreviewPanel";
import RecommendationPanel from "./components/RecommendationPanel";
import { useAutoSelectFile } from "./hooks/useAutoSelectFile";
import { useDatasetPreview } from "./hooks/useDatasetPreview";
import { useFeatureEngineeringJob } from "./hooks/useFeatureEngineeringJob";
import { useActiveSteps } from "./hooks/useActiveSteps";
import { INITIAL_STEPS, buildStepsPayload } from "./utils";

export default function FeatureEngineering() {
  const location = useLocation();
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
  const [recommendations, setRecommendations] = useState(null);
  const [dataQualityNotes, setDataQualityNotes] = useState(null);
  const [recLoading, setRecLoading] = useState(false);
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

  // Fetch recommendations when file is selected
  useEffect(() => {
    if (!selectedFile || step !== "configure_feature_engineering") {
      setRecommendations(null);
      setDataQualityNotes(null);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        setRecLoading(true);
        const response = await fetch(
          `http://localhost:8000/api/feature-engineering/analyze/${encodeURIComponent(selectedFile)}`
        );
        if (!response.ok) throw new Error("Failed to fetch recommendations");
        const data = await response.json();
        // Backend returns DatasetAnalysis with keys: step_recommendations, data_quality_notes
        // Map them to frontend state expected by the panel
        setRecommendations(data.step_recommendations || data.recommendations || []);
        setDataQualityNotes(data.data_quality_notes || data.quality_notes || []);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      } finally {
        setRecLoading(false);
      }
    };

    fetchRecommendations();
  }, [selectedFile, step]);

  const notify = useMemo(
    () => ({
      success: (message) => toast.success(message),
      error: (message) => toast.error(message),
    }),
    []
  );

  const { result, setResult, loading, progressInfo, runFeatureEngineering, elapsedMs } = useFeatureEngineeringJob({
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
    step === "configure_feature_engineering" && selectedFile && !dataPreview && !isFetchingFiles;
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

  // Applied map for recommendations (per-card): true if that recommendation is reflected in current steps
  const appliedMap = useMemo(() => {
    if (!Array.isArray(recommendations)) return {};

    const isSubset = (arr, sub) => (sub || []).every((c) => arr.includes(c));
    const isHighCard = (name) => /high[- ]?cardinality/i.test(name || "");

    return recommendations.reduce((acc, rec, idx) => {
      let applied = false;
      const cols = rec.recommended_columns || [];
      const steps = featureEngineeringSteps;

      switch (rec.step_type) {
        case "encoding": {
          applied = steps.encoding.enabled && isSubset(steps.encoding.columns, cols);
          if (applied && isHighCard(rec.step_name)) {
            applied = cols.every((c) => (steps.encoding.columnMethods || {})[c] === "label");
          }
          break;
        }
        case "scaling":
          applied = steps.scaling.enabled && isSubset(steps.scaling.columns, cols);
          break;
        case "binning":
          applied = steps.binning.enabled && isSubset(steps.binning.columns, cols);
          break;
        case "feature_creation": {
          if (/polynomial/i.test(rec.step_name)) {
            applied = steps.featureCreation.polynomial.enabled && isSubset(steps.featureCreation.polynomial.columns, cols);
          } else if (/date|time/i.test(rec.step_name)) {
            applied = steps.featureCreation.datetime.enabled && isSubset(steps.featureCreation.datetime.columns, cols);
          }
          break;
        }
        case "feature_selection":
          applied = steps.selection.enabled; // columns optional
          break;
        default:
          applied = false;
      }
      acc[idx] = applied;
      return acc;
    }, {});
  }, [recommendations, featureEngineeringSteps]);

  const allApplied = useMemo(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return false;
    return recommendations.every((_, idx) => appliedMap[idx]);
  }, [recommendations, appliedMap]);

  const statsCards = useMemo(() => {
    if (!result && !dataPreview) {
      return [
        { label: "Original rows", value: "--", tone: "muted" },
        { label: "Engineered rows", value: "--", tone: "muted" },
        { label: "New features", value: "--", tone: "muted" },
        { label: "Steps applied", value: String(activeSteps.length), tone: "muted" },
      ];
    }

    // Show actual dataset row count from dataPreview (full dataset count)
    const originalRows = result?.original_row_count || dataPreview?.total_rows || 0;
    const engineeredRows = result?.engineered_row_count || dataPreview?.total_rows || 0;
    const newFeatures = (result?.new_features_count || 0);
    
    return [
      {
        label: "Original rows",
        value: originalRows.toLocaleString(),
        tone: "neutral",
      },
      {
        label: "Engineered rows",
        value: engineeredRows.toLocaleString(),
        tone: "success",
      },
      {
        label: "New features",
        value: newFeatures.toLocaleString(),
        tone: newFeatures > 0 ? "success" : "muted",
      },
      {
        label: "Steps applied",
        value: String((result?.change_metadata || []).length),
        tone: "info",
      },
    ];
  }, [result, activeSteps.length, dataPreview]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const stepsPayload = buildStepsPayload(featureEngineeringSteps);

      runFeatureEngineering({
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
    [featureEngineeringSteps, runFeatureEngineering, setActivePreviewTab, setBuilderCollapsed]
  );

  // Handlers to apply/undo recommendations without starting the job
  const handleApplyStep = useCallback((idx, rec) => {
    setStepsStable((prev) => {
      const cols = rec.recommended_columns || [];
      const union = (a, b) => Array.from(new Set([...(a || []), ...b]));
      const next = { ...prev };

      switch (rec.step_type) {
        case "encoding": {
          next.encoding = {
            ...prev.encoding,
            enabled: true,
            columns: union(prev.encoding.columns, cols),
            columnMethods: { ...(prev.encoding.columnMethods || {}) },
          };
          if (/high[- ]?cardinality/i.test(rec.step_name)) {
            cols.forEach((c) => {
              next.encoding.columnMethods[c] = "label";
            });
          }
          break;
        }
        case "scaling":
          next.scaling = { ...prev.scaling, enabled: true, columns: union(prev.scaling.columns, cols) };
          break;
        case "binning":
          next.binning = { ...prev.binning, enabled: true, columns: union(prev.binning.columns, cols) };
          break;
        case "feature_creation":
          if (/polynomial/i.test(rec.step_name)) {
            next.featureCreation = {
              ...prev.featureCreation,
              polynomial: {
                ...prev.featureCreation.polynomial,
                enabled: true,
                columns: union(prev.featureCreation.polynomial.columns, cols),
              },
            };
          } else if (/date|time/i.test(rec.step_name)) {
            next.featureCreation = {
              ...prev.featureCreation,
              datetime: {
                ...prev.featureCreation.datetime,
                enabled: true,
                columns: union(prev.featureCreation.datetime.columns, cols),
              },
            };
          }
          break;
        case "feature_selection":
          next.selection = { ...prev.selection, enabled: true };
          break;
        default:
          return prev;
      }
      return next;
    });
  }, [setStepsStable]);

  const handleUndoStep = useCallback((idx, rec) => {
    setStepsStable((prev) => {
      const cols = rec.recommended_columns || [];
      const minus = (arr, b) => (arr || []).filter((x) => !b.includes(x));
      const next = { ...prev };

      switch (rec.step_type) {
        case "encoding": {
          const nextCols = minus(prev.encoding.columns, cols);
          const nextMethods = { ...(prev.encoding.columnMethods || {}) };
          cols.forEach((c) => {
            if (nextMethods[c] === "label") delete nextMethods[c];
          });
          next.encoding = {
            ...prev.encoding,
            columns: nextCols,
            enabled: nextCols.length > 0 ? prev.encoding.enabled : false,
            columnMethods: nextMethods,
          };
          break;
        }
        case "scaling": {
          const nextCols = minus(prev.scaling.columns, cols);
          next.scaling = { ...prev.scaling, columns: nextCols, enabled: nextCols.length > 0 ? prev.scaling.enabled : false };
          break;
        }
        case "binning": {
          const nextCols = minus(prev.binning.columns, cols);
          next.binning = { ...prev.binning, columns: nextCols, enabled: nextCols.length > 0 ? prev.binning.enabled : false };
          break;
        }
        case "feature_creation": {
          if (/polynomial/i.test(rec.step_name)) {
            const nextCols = minus(prev.featureCreation.polynomial.columns, cols);
            next.featureCreation = {
              ...prev.featureCreation,
              polynomial: {
                ...prev.featureCreation.polynomial,
                columns: nextCols,
                enabled: nextCols.length > 0 ? prev.featureCreation.polynomial.enabled : false,
              },
            };
          } else if (/date|time/i.test(rec.step_name)) {
            const nextCols = minus(prev.featureCreation.datetime.columns, cols);
            next.featureCreation = {
              ...prev.featureCreation,
              datetime: {
                ...prev.featureCreation.datetime,
                columns: nextCols,
                enabled: nextCols.length > 0 ? prev.featureCreation.datetime.enabled : false,
              },
            };
          }
          break;
        }
        case "feature_selection":
          next.selection = { ...prev.selection, enabled: false };
          break;
        default:
          return prev;
      }
      return next;
    });
  }, [setStepsStable]);

  const handleApplyAll = useCallback(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return;
    setStepsStable((prev) => {
      const union = (a, b) => Array.from(new Set([...(a || []), ...b]));
      let next = { ...prev };
      for (const rec of recommendations) {
        const cols = rec.recommended_columns || [];
        switch (rec.step_type) {
          case "encoding": {
            const updated = {
              ...next.encoding,
              enabled: true,
              columns: union(next.encoding.columns, cols),
              columnMethods: { ...(next.encoding.columnMethods || {}) },
            };
            if (/high[- ]?cardinality/i.test(rec.step_name)) {
              cols.forEach((c) => { updated.columnMethods[c] = "label"; });
            }
            next = { ...next, encoding: updated };
            break;
          }
          case "scaling":
            next = { ...next, scaling: { ...next.scaling, enabled: true, columns: union(next.scaling.columns, cols) } };
            break;
          case "binning":
            next = { ...next, binning: { ...next.binning, enabled: true, columns: union(next.binning.columns, cols) } };
            break;
          case "feature_creation":
            if (/polynomial/i.test(rec.step_name)) {
              next = {
                ...next,
                featureCreation: {
                  ...next.featureCreation,
                  polynomial: {
                    ...next.featureCreation.polynomial,
                    enabled: true,
                    columns: union(next.featureCreation.polynomial.columns, cols),
                  },
                },
              };
            } else if (/date|time/i.test(rec.step_name)) {
              next = {
                ...next,
                featureCreation: {
                  ...next.featureCreation,
                  datetime: {
                    ...next.featureCreation.datetime,
                    enabled: true,
                    columns: union(next.featureCreation.datetime.columns, cols),
                  },
                },
              };
            }
            break;
          case "feature_selection":
            next = { ...next, selection: { ...next.selection, enabled: true } };
            break;
          default:
            break;
        }
      }
      return next;
    });
  }, [recommendations, setStepsStable]);

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
    } catch (error) {
      console.error("Failed to save engineered dataset", error);
      notify.error(error.message);
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
                      <>
                        <StepBuilder
                        columns={columns}
                        columnInsights={columnInsights}
                        selectedFile={selectedFile}
                        steps={featureEngineeringSteps}
                        onUpdateSteps={setStepsStable}
                        previewReady={previewReady}
                        onChangeFile={() => setStep("select_file")}
                        onSubmit={handleSubmit}
                        loading={loading}
                        activeSteps={activeSteps}
                        collapseEnabled={collapseEnabled}
                        onCollapse={() => setBuilderCollapsed(true)}
                        dataPreview={dataPreview}
                        topContent={(
                          <RecommendationPanel
                            recommendations={recommendations}
                            dataQualityNotes={dataQualityNotes}
                            loading={recLoading}
                            appliedMap={appliedMap}
                            allApplied={allApplied}
                            onApplyAll={handleApplyAll}
                            onApplyStep={handleApplyStep}
                            onUndoStep={handleUndoStep}
                          />
                        )}
                      />
                      </>
                    )}

                    {(result || loading || progressInfo.status !== "idle") && (
                      <PreviewPanel
                        result={result}
                        progressInfo={progressInfo}
                        activePreviewTab={activePreviewTab}
                        onTabChange={setActivePreviewTab}
                        statsCards={statsCards}
                        selectedFile={selectedFile}
                        steps={featureEngineeringSteps}
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



