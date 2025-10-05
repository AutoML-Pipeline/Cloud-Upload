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
    if (!selectedFile || step !== "configure_feature_engineering") {
      return;
    }

    onLoading();
    const controller = new AbortController();

    fetch(
      `http://localhost:8000/api/feature-engineering/preview/${encodeURIComponent(selectedFile)}`,
      {
        signal: controller.signal,
      },
    )
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch dataset preview: ${res.statusText}`);
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
  }, [selectedFile, step, onLoading, onLoaded, onError, onResetSteps]);
};
