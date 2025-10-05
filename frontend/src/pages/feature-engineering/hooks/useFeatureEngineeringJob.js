import { useCallback, useEffect, useRef, useState } from "react";

const INITIAL_PROGRESS = {
  status: "idle",
  progress: 0,
  message: "",
  error: null,
  startedAt: null,
};

const clampProgress = (value) => Math.max(0, Math.min(100, value ?? 0));

export const useFeatureEngineeringJob = ({ selectedFile, notify }) => {
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressInfo, setProgressInfo] = useState(INITIAL_PROGRESS);
  const [elapsedMs, setElapsedMs] = useState(0);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  const clearPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = null;
  }, []);

  const beginTimer = useCallback(() => {
    clearTimer();
    startTimeRef.current = Date.now();
    setElapsedMs(0);
    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) {
        return;
      }
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 500);
  }, [clearTimer]);

  const resetProgress = useCallback(() => {
    setProgressInfo(INITIAL_PROGRESS);
    setElapsedMs(0);
  }, []);

  const runFeatureEngineering = useCallback(
    async ({ stepsPayload, onBeforeStart } = {}) => {
      if (!selectedFile) {
        notify?.error?.("Please select a dataset before running feature engineering.");
        return;
      }

      clearPolling();
      setResult(null);
      setJobId(null);
      onBeforeStart?.();
      setLoading(true);
      setProgressInfo({
        status: "queued",
        progress: 0,
        message: "Queued and preparing job...",
        error: null,
        startedAt: Date.now(),
      });
      beginTimer();

      try {
        const response = await fetch("http://localhost:8000/api/feature-engineering/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: selectedFile, steps: stepsPayload || [] }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.detail || data?.error || "Failed to start feature engineering job");
        }
        if (!data?.job_id) {
          throw new Error("Failed to obtain feature engineering job identifier");
        }

        setJobId(data.job_id);
        setProgressInfo({
          status: "pending",
          progress: 0,
          message: "Initializing feature engineering pipeline...",
          error: null,
          startedAt: startTimeRef.current,
        });
        notify?.success?.("Feature engineering started. We'll keep you posted on progress.");
      } catch (error) {
        setProgressInfo({
          status: "failed",
          progress: 0,
          message: "",
          error: error.message,
          startedAt: startTimeRef.current,
        });
        setLoading(false);
        const startedAt = startTimeRef.current;
        clearTimer();
        if (startedAt) {
          setElapsedMs(Date.now() - startedAt);
        }
        notify?.error?.(`Failed to start feature engineering: ${error.message}`);
      }
    },
    [selectedFile, clearPolling, notify, beginTimer, clearTimer],
  );

  useEffect(() => {
    if (!jobId) {
      clearPolling();
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/feature-engineering/status/${jobId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.detail || payload?.error || "Unable to fetch feature engineering status");
        }
        if (cancelled) {
          return;
        }

        setProgressInfo((prev) => ({
          status: payload.status || prev.status,
          progress: typeof payload.progress === "number" ? payload.progress : prev.progress,
          message: payload.message ?? prev.message,
          error: payload.error || null,
          startedAt: prev.startedAt ?? startTimeRef.current ?? Date.now(),
        }));

        if (payload.status === "completed") {
          setResult(payload.result || null);
          setProgressInfo((prev) => ({
            ...prev,
            status: "completed",
            progress: 100,
            message: payload.message || "Feature engineering complete",
            error: null,
          }));
          setLoading(false);
          setJobId(null);
          const startedAt = startTimeRef.current;
          clearTimer();
          if (startedAt) {
            setElapsedMs(Date.now() - startedAt);
          }
          notify?.success?.("Feature engineering completed!");
        } else if (payload.status === "failed") {
          setProgressInfo((prev) => ({
            ...prev,
            status: "failed",
            progress: clampProgress(payload.progress),
            message: payload.message || "Feature engineering failed",
            error: payload.error || "Feature engineering failed",
          }));
          setLoading(false);
          setJobId(null);
          const startedAt = startTimeRef.current;
          clearTimer();
          if (startedAt) {
            setElapsedMs(Date.now() - startedAt);
          }
          notify?.error?.(payload.error || "Feature engineering failed");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        notify?.error?.(`Progress tracking failed: ${error.message}`);
        setProgressInfo((prev) => ({
          ...prev,
          status: "failed",
          progress: 100,
          message: "Progress tracking interrupted",
          error: error.message,
        }));
        setLoading(false);
        setJobId(null);
        const startedAt = startTimeRef.current;
        clearTimer();
        if (startedAt) {
          setElapsedMs(Date.now() - startedAt);
        }
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 1500);

    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [jobId, clearPolling, notify, clearTimer]);

  useEffect(() => {
    if (progressInfo.status === "completed" || progressInfo.status === "failed") {
      const timeout = setTimeout(() => {
        setProgressInfo((prev) => (prev.status === progressInfo.status ? INITIAL_PROGRESS : prev));
      }, 1800);
      return () => clearTimeout(timeout);
    }
  }, [progressInfo.status]);

  useEffect(() => clearPolling, [clearPolling]);
  useEffect(() => clearTimer, [clearTimer]);

  return {
    result,
    setResult,
    loading,
    progressInfo,
    runFeatureEngineering,
    resetProgress,
    elapsedMs,
  };
};
