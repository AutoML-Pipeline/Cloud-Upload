import { useState, useCallback, useRef } from "react";
import axios from "axios";

/**
 * useUploadProgress - Hook to manage file uploads with progress tracking
 * 
 * @returns {Object} Upload utilities and state
 */
export function useUploadProgress() {
  const [uploads, setUploads] = useState([]);
  const uploadIdCounter = useRef(0);

  /**
   * Start a new upload with progress tracking
   * @param {Object} config
   * @param {string} config.url - API endpoint
   * @param {FormData|Object} config.data - Data to upload
   * @param {string} config.filename - Filename for display
   * @param {Function} config.onSuccess - Success callback
   * @param {Function} config.onError - Error callback
   */
  const startUpload = useCallback(
    async ({ url, data, filename, onSuccess, onError }) => {
      const uploadId = ++uploadIdCounter.current;
      const startTime = Date.now();

      // Add to uploads list
      setUploads((prev) => [
        ...prev,
        {
          id: uploadId,
          filename,
          progress: 0,
          loaded: 0,
          total: 0,
          rate: 0,
          elapsed: 0,
          show: true,
        },
      ]);

      try {
        const response = await axios({
          method: "POST",
          url,
          data,
          headers:
            data instanceof FormData
              ? { "Content-Type": "multipart/form-data" }
              : { "Content-Type": "application/json" },
          onUploadProgress: (progressEvent) => {
            const { loaded, total } = progressEvent;
            const progress = total ? Math.round((loaded / total) * 100) : 0;
            const elapsed = (Date.now() - startTime) / 1000; // seconds
            const rate = elapsed > 0 ? loaded / elapsed : 0; // bytes/sec

            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, progress, loaded, total, rate, elapsed }
                  : upload
              )
            );
          },
        });

        // Keep showing for 2 seconds after completion
        setTimeout(() => {
          removeUpload(uploadId);
        }, 2000);

        if (onSuccess) onSuccess(response.data);
      } catch (error) {
        // Remove upload on error
        removeUpload(uploadId);
        if (onError) onError(error);
      }
    },
    []
  );

  /**
   * Remove an upload from the list
   */
  const removeUpload = useCallback((uploadId) => {
    setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
  }, []);

  return {
    uploads,
    startUpload,
    removeUpload,
  };
}
