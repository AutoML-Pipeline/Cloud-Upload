import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DataTable from "../../../components/DataTable";
import styles from "../../preprocessing/Preprocessing.module.css";
import { ChangeSummary } from "./ChangeSummary";

const toColumnar = (records) => {
  if (!Array.isArray(records) || records.length === 0) {
    return {};
  }
  const columns = Object.keys(records[0]);
  return columns.reduce((acc, column) => {
    acc[column] = records.map((row) => row[column]);
    return acc;
  }, {});
};

const clampProgress = (value) => Math.max(0, Math.min(100, value ?? 0));

const formatDuration = (ms) => {
  if (!ms || ms < 0) {
    return "00:00";
  }
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export const PreviewPanel = ({
  result,
  progressInfo,
  statsCards,
  onSaveToMinio,
  selectedFile,
  onDownloadCsv,
  elapsedMs,
  progressAnchorRef,
  collapseEnabled,
  isStepsCollapsed,
  onExpandSteps,
}) => {
  const animationFrameRef = useRef(null);
  const [animatedProgress, setAnimatedProgress] = useState(clampProgress(progressInfo.progress));
  const lastProgressRef = useRef(animatedProgress);

  useEffect(() => {
    lastProgressRef.current = animatedProgress;
  }, [animatedProgress]);

  useEffect(() => {
    const target = clampProgress(progressInfo.progress);
    const start = lastProgressRef.current;

    if (Math.abs(target - start) < 0.1) {
      setAnimatedProgress(target);
      return undefined;
    }

    const duration = Math.max(400, Math.abs(target - start) * 25);
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const next = start + (target - start) * t;
      setAnimatedProgress(next);
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [progressInfo.progress]);

  useEffect(() => {
    if (progressInfo.status === "idle") {
      setAnimatedProgress(0);
    }
  }, [progressInfo.status]);

  const clampedAnimatedProgress = clampProgress(animatedProgress);
  const formattedElapsed = formatDuration(elapsedMs);
  const showCollapsedBanner = collapseEnabled && isStepsCollapsed;

  const tableData = useMemo(() => toColumnar(result?.preview || []), [result?.preview]);
  const originalData = useMemo(() => toColumnar(result?.original_preview || []), [result?.original_preview]);

  const handleSave = useCallback(async () => {
    if (typeof onSaveToMinio !== "function") {
      return;
    }
    await onSaveToMinio();
  }, [onSaveToMinio]);

  return (
    <div className={styles.previewColumn} ref={progressAnchorRef}>
      {showCollapsedBanner && (
        <div className={styles.collapsedStepsBanner}>
          <span className={styles.collapsedStepsMessage}>Step builder hidden to maximize the preview.</span>
          <button type="button" className={styles.collapsedStepsButton} onClick={onExpandSteps}>
            Show steps
          </button>
        </div>
      )}
      {progressInfo.status !== "idle" && (
        <div
          className={`${styles.progressCard} ${progressInfo.status === "completed" ? styles.progressCardSuccess : ""} ${progressInfo.status === "failed" ? styles.progressCardError : ""}`}
        >
          <div className={styles.progressMeta}>
            <span className={styles.progressLabel}>
              {progressInfo.status === "failed"
                ? "Processing failed"
                : progressInfo.status === "completed"
                  ? "Processing complete"
                  : progressInfo.status === "queued"
                    ? "Preparing job"
                    : "Processing dataset"}
            </span>
            <span className={styles.progressPercent}>{Math.round(clampedAnimatedProgress)}%</span>
          </div>
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} style={{ width: `${clampedAnimatedProgress}%` }} />
          </div>
          <p className={styles.progressMessage}>
            {progressInfo.error
              ? progressInfo.error
              : progressInfo.message || "Working through your feature engineering steps..."}
          </p>
          <div className={styles.progressTiming}>
            <span>Elapsed time</span>
            <span>{formattedElapsed}</span>
          </div>
        </div>
      )}

      <div className={styles.statsRow}>
        {statsCards.map((card, index) => (
          <div key={`${card.label}-${index}`} className={`${styles.statCard} ${card.tone ? styles[`statCard${card.tone.charAt(0).toUpperCase() + card.tone.slice(1)}`] || "" : ""}`}>
            <span className={styles.statLabel}>{card.label}</span>
            <span className={styles.statValue}>{card.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.previewPanelSurface}>
        {!result ? (
          <div className={styles.emptyState}>
            Launch feature engineering to generate a live preview of your enriched dataset.
          </div>
        ) : (
          <>
            <div className={styles.previewNote}>
              <span>
                Showing {(result.preview || []).length.toLocaleString()} rows
                {result.engineered_row_count && result.engineered_row_count > (result.preview || []).length
                  ? " (truncated to preview limit)"
                  : ""}
              </span>
              {result.engineered_filename && (
                <span className={styles.diffInfo}>Output file: {result.engineered_filename}</span>
              )}
            </div>
            <DataTable
              data={tableData}
              originalData={originalData}
              compareOriginal={Boolean(result.original_preview?.length)}
              highlightChanges={false}
              diffMarks={null}
              originalFilename={selectedFile}
              saveTarget="engineered"
              saveFilename={result.engineered_filename}
              onSave={handleSave}
              onDownload={onDownloadCsv}
            />
          </>
        )}
      </div>

      <ChangeSummary changeMetadata={result?.change_metadata} columnSummary={result?.column_summary} />
    </div>
  );
};

PreviewPanel.propTypes = {
  result: PropTypes.object,
  progressInfo: PropTypes.shape({
    status: PropTypes.string.isRequired,
    progress: PropTypes.number.isRequired,
    message: PropTypes.string,
    error: PropTypes.string,
  }).isRequired,
  statsCards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      tone: PropTypes.oneOf(["muted", "neutral", "success", "warning", "info"]),
    }),
  ).isRequired,
  onSaveToMinio: PropTypes.func,
  selectedFile: PropTypes.string.isRequired,
  onDownloadCsv: PropTypes.func,
  elapsedMs: PropTypes.number,
  progressAnchorRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  collapseEnabled: PropTypes.bool,
  isStepsCollapsed: PropTypes.bool,
  onExpandSteps: PropTypes.func,
};
