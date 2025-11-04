import React, { useMemo, useCallback } from "react";
import { StepBuilder } from "./StepBuilder";
import { PreprocessingRecommendationPanel } from "./PreprocessingRecommendationPanel";

export default function PreConfigure({
  columns,
  columnInsights,
  selectedFile,
  steps,
  onUpdateSteps,
  previewReady,
  nullCounts,
  onChangeFile,
  onSubmit,
  loading,
  activeSteps,
  collapseEnabled,
  onCollapse,
  suggestions,
  suggestionsLoading,
}) {
  const totalNulls = useMemo(() => {
    return Object.values(nullCounts || {}).reduce((acc, value) => {
      const numeric = typeof value === "number" ? value : Number(value);
      return Number.isFinite(numeric) ? acc + numeric : acc;
    }, 0);
  }, [nullCounts]);

  const showRemoveNullsStep = totalNulls > 0 && !steps.fillNulls;
  const showFillNullsStep = totalNulls > 0 && !steps.removeNulls;

  const appliedStepsMap = useMemo(() => {
    if (!suggestions) return {};
    return {
      removeDuplicates: !!steps.removeDuplicates,
      dropColumns: !!steps.dropColumns,
      fillNulls: !!steps.fillNulls,
      removeNulls: !!steps.removeNulls,
      removeOutliers: !!steps.removeOutliers,
    };
  }, [steps, suggestions]);

  const allApplied = useMemo(() => {
    if (!suggestions) return false;
    const keys = ["removeDuplicates", "dropColumns", "fillNulls", "removeNulls", "removeOutliers"];
    return keys.every((k) => appliedStepsMap[k] || !suggestions?.[k]?.enabled);
  }, [appliedStepsMap, suggestions]);

  const onUndoStep = useCallback((stepKey) => {
    if (stepKey === "removeDuplicates") {
      onUpdateSteps((prev) => ({ ...prev, removeDuplicates: false, removeDuplicatesColumns: [] }));
    } else if (stepKey === "dropColumns") {
      onUpdateSteps((prev) => ({ ...prev, dropColumns: false, dropColumnsColumns: [] }));
    } else if (stepKey === "fillNulls") {
      onUpdateSteps((prev) => ({ ...prev, fillNulls: false, fillNullsColumns: [], fillColumnStrategies: {} }));
    } else if (stepKey === "removeNulls") {
      onUpdateSteps((prev) => ({ ...prev, removeNulls: false, removeNullsColumns: [] }));
    } else if (stepKey === "removeOutliers") {
      onUpdateSteps((prev) => ({
        ...prev,
        removeOutliers: false,
        removeOutliersConfig: {
          ...prev.removeOutliersConfig,
          columns: [],
          method: prev.removeOutliersConfig.method || "iqr",
          factor: prev.removeOutliersConfig.factor ?? 1.5,
        },
      }));
    }
  }, [onUpdateSteps]);

  const onApplyAll = useCallback(() => {
    const s = suggestions || {};
    onUpdateSteps((prev) => ({
      ...prev,
      removeDuplicates: !!s.removeDuplicates?.enabled,
      removeDuplicatesColumns: s.removeDuplicates?.subset || [],
      dropColumns: !!s.dropColumns?.enabled,
      dropColumnsColumns: s.dropColumns?.columns || [],
      fillNulls: !!s.fillNulls?.enabled,
      fillNullsColumns: s.fillNulls?.columns || [],
      fillColumnStrategies: s.fillNulls?.strategies || {},
      removeNulls: !s.fillNulls?.enabled && !!s.removeNulls?.enabled,
      removeNullsColumns: s.removeNulls?.columns || [],
      removeOutliers: !!s.removeOutliers?.enabled,
      removeOutliersConfig: {
        ...prev.removeOutliersConfig,
        method: s.removeOutliers?.method || prev.removeOutliersConfig.method,
        factor: s.removeOutliers?.factor ?? prev.removeOutliersConfig.factor,
        columns: s.removeOutliers?.columns || [],
      },
    }));
  }, [suggestions, onUpdateSteps]);

  const onApplyStep = useCallback((stepKey) => {
    const s = suggestions || {};
    if (stepKey === "removeDuplicates") {
      onUpdateSteps((prev) => ({
        ...prev,
        removeDuplicates: !!s.removeDuplicates?.enabled,
        removeDuplicatesColumns: s.removeDuplicates?.subset || [],
      }));
    } else if (stepKey === "dropColumns") {
      onUpdateSteps((prev) => ({
        ...prev,
        dropColumns: !!s.dropColumns?.enabled,
        dropColumnsColumns: s.dropColumns?.columns || [],
      }));
    } else if (stepKey === "fillNulls") {
      onUpdateSteps((prev) => ({
        ...prev,
        fillNulls: !!s.fillNulls?.enabled,
        fillNullsColumns: s.fillNulls?.columns || [],
        fillColumnStrategies: s.fillNulls?.strategies || {},
        removeNulls: false,
      }));
    } else if (stepKey === "removeNulls") {
      onUpdateSteps((prev) => ({
        ...prev,
        removeNulls: !!s.removeNulls?.enabled,
        removeNullsColumns: s.removeNulls?.columns || [],
        fillNulls: false,
      }));
    } else if (stepKey === "removeOutliers") {
      onUpdateSteps((prev) => ({
        ...prev,
        removeOutliers: !!s.removeOutliers?.enabled,
        removeOutliersConfig: {
          ...prev.removeOutliersConfig,
          method: s.removeOutliers?.method || prev.removeOutliersConfig.method,
          factor: s.removeOutliers?.factor ?? prev.removeOutliersConfig.factor,
          columns: s.removeOutliers?.columns || [],
        },
      }));
    }
  }, [suggestions, onUpdateSteps]);

  return (
    <StepBuilder
      columns={columns}
      columnInsights={columnInsights}
      selectedFile={selectedFile}
      preprocessingSteps={steps}
      onUpdateSteps={onUpdateSteps}
      showRemoveNullsStep={showRemoveNullsStep}
      showFillNullsStep={showFillNullsStep}
      previewReady={previewReady}
      hasNulls={totalNulls > 0}
      nullCounts={nullCounts}
      onToggleRemoveNulls={(checked) => {
        onUpdateSteps((prev) => ({ ...prev, removeNulls: !!checked, fillNulls: checked ? false : prev.fillNulls }));
      }}
      onToggleFillNulls={(checked) => {
        onUpdateSteps((prev) => ({ ...prev, fillNulls: !!checked, removeNulls: checked ? false : prev.removeNulls }));
      }}
      onChangeFile={onChangeFile}
      onSubmit={onSubmit}
      loading={loading}
      activeSteps={activeSteps}
      collapseEnabled={collapseEnabled}
      onCollapse={onCollapse}
      topContent={(
        <PreprocessingRecommendationPanel
          suggestions={suggestions}
          loading={suggestionsLoading}
          appliedSteps={appliedStepsMap}
          allApplied={allApplied}
          onUndoStep={onUndoStep}
          onApplyAll={onApplyAll}
          onApplyStep={onApplyStep}
        />
      )}
    />
  );
}
