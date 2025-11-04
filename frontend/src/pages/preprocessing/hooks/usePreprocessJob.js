import { useCallback, useEffect, useRef, useState } from "react";

// Contract:
// - startPreprocess(filename, steps)
// - status, progress, jobId, result, error, elapsedTime, reset()

const INITIAL_PROGRESS = {
  status: "idle",
  progress: 0,
  message: "",
  error: null,
  startedAt: null,
};

const clampProgress = (value) => Math.max(0, Math.min(100, value ?? 0));

export default function usePreprocessJob({ notify } = {}) {
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

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
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      setElapsedTime(Date.now() - startTimeRef.current);
    }, 500);
  }, [clearTimer]);

  const reset = useCallback(() => {
    clearPolling();
    clearTimer();
    setResult(null);
    setJobId(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
    setError(null);
    setElapsedTime(0);
  }, [clearPolling, clearTimer]);

  const startPreprocess = useCallback(async (filename, stepsPayload, { onBeforeStart } = {}) => {
    if (!filename) {
      notify?.error?.("Please select a dataset before running preprocessing.");
      return;
    }

    clearPolling();
    setResult(null);
    setJobId(null);
    onBeforeStart?.();
    setStatus("queued");
    setProgress(0);
    setMessage("Queued and preparing job...");
    setError(null);
    beginTimer();

    try {
      const baseFilename = filename.split("/").pop();
      const response = await fetch(`http://localhost:8000/api/data/preprocess/${baseFilename}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.detail || data?.error || "Failed to start preprocessing job");
      if (!data?.job_id) throw new Error("Failed to obtain preprocessing job identifier");

      setJobId(data.job_id);
      setStatus("pending");
      setProgress(0);
      setMessage("Initializing preprocessing pipeline...");
      notify?.success?.("Preprocessing started. Hang tight while we work through your steps.");

      // pipeline manifest removed
    } catch (e) {
      setStatus("failed");
      setProgress(0);
      setMessage("");
      setError(e.message);
      const startedAt = startTimeRef.current;
      clearTimer();
      if (startedAt) setElapsedTime(Date.now() - startedAt);
      notify?.error?.(`Failed to preprocess: ${e.message}`);
    }
  }, [notify, clearPolling, beginTimer, clearTimer]);

  useEffect(() => {
    if (!jobId) {
      clearPolling();
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/data/preprocess/status/${jobId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.detail || payload?.error || "Unable to fetch preprocessing status");
        if (cancelled) return;

        setStatus((prev) => payload.status || prev);
        if (typeof payload.progress === "number") setProgress(payload.progress);
        setMessage((prev) => (payload.message ?? prev));
        setError(payload.error || null);

        if (payload.status === "completed") {
          setResult(payload.result || null);
          setStatus("completed");
          setProgress(100);
          setMessage(payload.message || "Preprocessing complete");
          setJobId(null);
          const startedAt = startTimeRef.current;
          clearTimer();
          if (startedAt) setElapsedTime(Date.now() - startedAt);
          notify?.success?.("Preprocessing completed!");

          // no pipeline patching
        } else if (payload.status === "failed") {
          setStatus("failed");
          setProgress(clampProgress(payload.progress));
          setMessage(payload.message || "Preprocessing failed");
          setError(payload.error || "Preprocessing failed");
          setJobId(null);
          const startedAt = startTimeRef.current;
          clearTimer();
          if (startedAt) setElapsedTime(Date.now() - startedAt);
          notify?.error?.(payload.error || "Preprocessing failed");

          // no pipeline patching
        }
      } catch (e) {
        if (cancelled) return;
        notify?.error?.(`Progress tracking failed: ${e.message}`);
        setStatus("failed");
        setProgress(100);
        setMessage("Progress tracking interrupted");
        setError(e.message);
        setJobId(null);
        const startedAt = startTimeRef.current;
        clearTimer();
        if (startedAt) setElapsedTime(Date.now() - startedAt);

        // no pipeline patching
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 1500);
    return () => {
      cancelled = true;
      clearPolling();
    };
  }, [jobId, clearPolling, notify, clearTimer]);

  useEffect(() => {
    if (status === "completed" || status === "failed") {
      const t = setTimeout(() => {
        setStatus((prev) => (prev === status ? INITIAL_PROGRESS.status : prev));
        setProgress((prev) => (status !== "idle" ? INITIAL_PROGRESS.progress : prev));
        setMessage((prev) => (status !== "idle" ? INITIAL_PROGRESS.message : prev));
        setError((prev) => (status !== "idle" ? INITIAL_PROGRESS.error : prev));
      }, 1800);
      return () => clearTimeout(t);
    }
  }, [status]);

  useEffect(() => clearPolling, [clearPolling]);
  useEffect(() => clearTimer, [clearTimer]);

  return {
    status,
    progress,
    jobId,
    result,
    error,
    elapsedTime,
    startPreprocess,
    reset,
    setResult,
    message,
  };
}
