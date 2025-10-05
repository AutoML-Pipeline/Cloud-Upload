import { useEffect } from "react";

export const useAutoSelectFile = ({
  files,
  selectedFile,
  step,
  search,
  onSelectFile,
  onStepChange,
  onResetPreview,
}) => {
  useEffect(() => {
    const params = new URLSearchParams(search);
    const fileFromUrl = params.get("file");

    if (fileFromUrl && fileFromUrl !== selectedFile) {
      onSelectFile(fileFromUrl);
      onStepChange("configure_preprocessing");
      onResetPreview();
      return;
    }

    if (!selectedFile && files.length && step === "select_file") {
      onSelectFile(files[0].name);
    }
  }, [files, selectedFile, step, search, onSelectFile, onStepChange, onResetPreview]);
};
