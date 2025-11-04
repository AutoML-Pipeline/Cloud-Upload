import React from "react";
import { PreviewPanel } from "./PreviewPanel";

export default function FEProgress({
  result,
  progressInfo, // for backward compatibility if caller passes composite
  status,
  progress,
  message,
  activePreviewTab,
  onTabChange,
  statsCards,
  selectedFile,
  steps,
  onSaveToMinio,
  onDownloadFullCsv,
  elapsedMs,
  progressAnchorRef,
  collapseEnabled,
  isStepsCollapsed,
  onExpandSteps,
}) {
  // PreviewPanel expects a single progressInfo object; synthesize if status/progress/message provided
  const synthetic = progressInfo || {
    status: status || "idle",
    progress: typeof progress === "number" ? progress : 0,
    message: message || "",
  };
  return (
    <PreviewPanel
      result={result}
      progressInfo={synthetic}
      activePreviewTab={activePreviewTab}
      onTabChange={onTabChange}
      statsCards={statsCards}
      selectedFile={selectedFile}
      steps={steps}
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
