export function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
}

export function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const abs = Math.abs(value);
    if (abs >= 1000000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (abs >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return value.toFixed(4);
  }
  return String(value);
}
