import { useCallback, useEffect, useRef, useState } from "react";

export function useTrainingJob() {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [savedModelId, setSavedModelId] = useState(null);

  const pollingRef = useRef(null);
  const startTimeRef = useRef(null);

  const startTraining = useCallback(async ({ filename, targetColumn, problemType, modelsToTrain, selectAllModels }) => {
    const config = {
      target_column: targetColumn,
      problem_type: problemType,
      test_size: 0.2,
      random_state: 42,
      models_to_train: selectAllModels ? null : modelsToTrain,
    };

    const response = await fetch(
      `http://localhost:8000/api/model-training/training/train/${encodeURIComponent(filename)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to start training");
    }

    const data = await response.json();
    setJobId(data.job_id);
    setStatus("pending");
    setError(null);
    setResult(null);
    setProgress(0);
    startTimeRef.current = Date.now();

    return data.job_id;
  }, []);

  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed") return;

    const pollStatus = async () => {
      try {
        const resp = await fetch(`http://localhost:8000/api/model-training/training/status/${jobId}`);
        if (!resp.ok) throw new Error("Failed to fetch status");
        const job = await resp.json();
        setProgress(job.progress || 0);
        setStatus(job.status);
        if (job.status === "completed") {
          setResult(job.result);
          if (job.result?.best_model_id) setSavedModelId(job.result.best_model_id);
          clearInterval(pollingRef.current);

          if (runId) {
            const best = job.result?.best_model;
            const metrics = best?.metrics || {};
            try {
              await patchPipelineRun(runId, {
                stages: {
                  training: {
                    status: "completed",
                    completed_at: new Date().toISOString(),
                    metrics: { best_model: best?.model_name, ...metrics },
                  },
                },
              });
            } catch { /* noop */ }
          }
        } else if (job.status === "failed") {
          clearInterval(pollingRef.current);
          setError(job.error || "Unknown error");

          if (runId) {
            try {
              await patchPipelineRun(runId, {
                stages: {
                  training: {
                    status: "failed",
                    completed_at: new Date().toISOString(),
                    error: job.error || "Training failed",
                  },
                },
              });
            } catch { /* noop */ }
          }
        }
      } catch {
        // swallow polling errors
      }
    };

    pollingRef.current = setInterval(pollStatus, 2000);
    return () => clearInterval(pollingRef.current);
  }, [jobId, status]);

  useEffect(() => {
    if (status !== "running" && status !== "pending") return;
    const timer = setInterval(() => {
      if (startTimeRef.current) setElapsedTime(Date.now() - startTimeRef.current);
    }, 100);
    return () => clearInterval(timer);
  }, [status]);

  const saveModel = useCallback(async () => {
    if (!jobId) throw new Error("No training job to save");
    const resp = await fetch(`http://localhost:8000/api/model-training/training/save/${jobId}`, { method: "POST" });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to save model");
    }
    const data = await resp.json();
    setSavedModelId(data.model_id);

    // pipeline manifest removed
    return data.model_id;
  }, [jobId]);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setJobId(null);
    setStatus("idle");
    setProgress(0);
    setResult(null);
    setError(null);
    setElapsedTime(0);
    setSavedModelId(null);
    startTimeRef.current = null;
  }, []);

  return {
    jobId,
    status,
    progress,
    result,
    error,
    elapsedTime,
    savedModelId,
    setSavedModelId,
    startTraining,
    saveModel,
    reset,
  };
}
