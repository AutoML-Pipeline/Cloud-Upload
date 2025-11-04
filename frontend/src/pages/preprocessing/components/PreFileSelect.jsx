import React from "react";
import { SelectionSection } from "./SelectionSection";

export default function PreFileSelect({ files, selectedFile, onSelectFile, onContinue, isFetchingFiles, selectedFileInfo }) {
  return (
    <SelectionSection
      files={files}
      selectedFile={selectedFile}
      onSelectFile={onSelectFile}
      onContinue={onContinue}
      isFetchingFiles={isFetchingFiles}
      selectedFileInfo={selectedFileInfo}
    />
  );
}
