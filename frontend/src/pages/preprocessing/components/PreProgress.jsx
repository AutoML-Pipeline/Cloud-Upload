import React from "react";
import { PreviewPanel } from "./PreviewPanel";

export default function PreProgress({
  result,
  progressInfo,
  status,
  progress,
  message,
  activePreviewTab,
  onTabChange,
  statsCards,
  selectedFile,
  preprocessingSteps,
  onSaveToMinio,
  onDownloadFullCsv,
  elapsedMs,
  progressAnchorRef,
  collapseEnabled,
  isStepsCollapsed,
  onExpandSteps,
}) {
  const synthetic = progressInfo || { status: status || "idle", progress: typeof progress === "number" ? progress : 0, message: message || "" };
  return (
    <PreviewPanel
      result={result}
      progressInfo={synthetic}
      activePreviewTab={activePreviewTab}
      onTabChange={onTabChange}
      statsCards={statsCards}
      selectedFile={selectedFile}
      preprocessingSteps={preprocessingSteps}
      onSaveToMinio={onSaveToMinio}
      onDownloadFullCsv={onDownloadFullCsv}
      elapsedMs={elapsedMs}
      progressAnchorRef={progressAnchorRef}
      collapseEnabled={collapseEnabled}
      isStepsCollapsed={isStepsCollapsed}
      onExpandSteps={onExpandSteps}
    />
  );
}
