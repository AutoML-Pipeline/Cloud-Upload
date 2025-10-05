import { useEffect } from "react";

export const useDatasetPreview = ({
  selectedFile,
  step,
  onLoading,
  onLoaded,
  onError,
  onResetSteps,
}) => {
  useEffect(() => {
    if (!selectedFile || step !== "configure_preprocessing") {
      return;
    }

    onLoading();
    const controller = new AbortController();
    const baseFilename = selectedFile.split("/").pop();

    fetch(`http://localhost:8000/data/preview/${baseFilename}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch file preview: ${res.statusText}`);
        }
        return res.json();
      })
      .then((data) => {
        onLoaded(data);
        onResetSteps();
      })
      .catch((error) => {
        if (error.name === "AbortError") {
          return;
        }
        onError(error);
      });

    return () => controller.abort();
  }, [selectedFile, step, onLoaded, onError, onResetSteps, onLoading]);
};
