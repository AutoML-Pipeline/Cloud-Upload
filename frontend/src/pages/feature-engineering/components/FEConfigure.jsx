import React from "react";
import { StepBuilder } from "./StepBuilder";
import FEAnalyze from "./FEAnalyze";

export default function FEConfigure({
  columns,
  columnInsights,
  selectedFile,
  steps,
  onUpdateSteps,
  previewReady,
  onChangeFile,
  onSubmit,
  loading,
  activeSteps,
  collapseEnabled,
  onCollapse,
  dataPreview,
  startAnalyze,
}) {
  return (
    <StepBuilder
      columns={columns}
      columnInsights={columnInsights}
      selectedFile={selectedFile}
      steps={steps}
      onUpdateSteps={onUpdateSteps}
      previewReady={previewReady}
      onChangeFile={onChangeFile}
      onSubmit={onSubmit}
      loading={loading}
      activeSteps={activeSteps}
      collapseEnabled={collapseEnabled}
      onCollapse={onCollapse}
      dataPreview={dataPreview}
      topContent={(
        <FEAnalyze selectedFile={selectedFile} steps={steps} onChangeSteps={onUpdateSteps} startAnalyze={startAnalyze} />
      )}
    />
  );
}
