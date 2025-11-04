// Small helpers and re-exports for Preprocessing
import { buildStepsPayload as buildPayloadBase } from "./index";

export const formatTime = (ms) => {
  if (!ms || ms < 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

export const formatMetric = (value, digits = 2) => {
  if (value === null || value === undefined) return "--";
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toFixed(digits);
};

export const buildStepsPayload = (steps) => buildPayloadBase(steps);
