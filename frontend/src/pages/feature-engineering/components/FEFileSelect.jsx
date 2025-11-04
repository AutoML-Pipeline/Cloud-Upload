import React from "react";
import { SelectionSection } from "./SelectionSection";

export default function FEFileSelect({ files, selectedFile, onSelectFile, onContinue, isFetchingFiles, selectedFileInfo }) {
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
