import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { ViewProcessedDataButton } from "../../../components/ViewProcessedDataButton";
import styles from "../Preprocessing.module.css";
import { ChangeSummary } from "./ChangeSummary";

const STAT_TONE_CLASSES = {
  muted: styles.statCardMuted,
  neutral: styles.statCardNeutral,
  success: styles.statCardSuccess,
  warning: styles.statCardWarning,
  info: styles.statCardInfo,
};

const clampTab = (value) => (value === "diff" || value === "quality" ? value : "preview");
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

const DiffHighlights = ({ result }) => {
  if (!result) {
    return <div className={styles.emptyState}>Run preprocessing to see how the data evolves.</div>;
  }

  const diffMarks = result.diff_marks || {};
  const deletedRows = diffMarks.deleted_row_indices || [];
  const updatedCells = diffMarks.updated_cells || {};
  const hasChanges = deletedRows.length > 0 || Object.keys(updatedCells).length > 0;

  if (!hasChanges) {
    return <div className={styles.emptyState}>No row removals or value edits detected. Try enabling more steps.</div>;
  }

  const updatedEntries = Object.entries(updatedCells).slice(0, 12);

  return (
    <div className={styles.diffGrid}>
      <div className={styles.diffCard}>
        <div className={styles.diffBadge}>🗑️</div>
        <h4>Removed rows</h4>
        <p className={styles.diffMetric}>{deletedRows.length.toLocaleString()}</p>
        <p className={styles.diffHint}>
          {deletedRows.length > 0
            ? `Row indices: ${deletedRows.slice(0, 8).join(", ")}${deletedRows.length > 8 ? "…" : ""}`
            : "No rows removed in this run."}
        </p>
        {result.diff_truncated && (
          <p className={styles.diffNote}>Showing first {result.diff_row_limit} edits for speed.</p>
        )}
      </div>
      <div className={styles.diffCard}>
        <div className={styles.diffBadge}>✨</div>
        <h4>Updated values</h4>
        {updatedEntries.length === 0 ? (
          <p className={styles.diffHint}>No cell updates detected.</p>
        ) : (
          <div className={styles.diffList}>
            {updatedEntries.map(([rowIndex, changes]) => (
              <div key={rowIndex} className={styles.diffListItem}>
                <span className={styles.diffRowLabel}>Row {rowIndex}:</span>
                <span className={styles.diffRowDetails}>{Object.keys(changes).join(", ")}</span>
              </div>
            ))}
          </div>
        )}
        {Object.keys(updatedCells).length > updatedEntries.length && (
          <p className={styles.diffNote}>
            +{Object.keys(updatedCells).length - updatedEntries.length} more rows updated.
          </p>
        )}
      </div>
    </div>
  );
};

DiffHighlights.propTypes = {
  result: PropTypes.object,
};

const QualityInsights = ({ result }) => {
  if (!result?.quality_report || Object.keys(result.quality_report).length === 0) {
    return <div className={styles.emptyState}>Quality insights will appear after you run preprocessing.</div>;
  }

  const report = result.quality_report;
  const missingEntries = Object.entries(report.missing_data || {})
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 6);
  const outlierEntries = Object.entries(report.outliers || {})
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 6);

  return (
    <div className={styles.qualityGrid}>
      <div className={`${styles.qualityCard} ${styles.qualityCardHero}`}>
        <span className={styles.qualityBadge}>Score</span>
        <p className={styles.qualityScore}>{Math.round(report.quality_score || 0)}</p>
        <p className={styles.qualityCopy}>{report.recommendations?.[0] || "Dataset is looking healthy."}</p>
        <div className={styles.qualityMetaRow}>
          <span>{report.total_rows?.toLocaleString() ?? "--"} rows</span>
          <span>•</span>
          <span>{report.total_columns?.toLocaleString() ?? "--"} columns</span>
        </div>
      </div>
      <div className={styles.qualityCard}>
        <h4>Missing data focus</h4>
        {missingEntries.length === 0 ? (
          <p className={styles.qualityHint}>No missing values detected 🎉</p>
        ) : (
          <ul className={styles.qualityList}>
            {missingEntries.map(([column, info]) => (
              <li key={column}>
                <span className={styles.qualityListLabel}>{column}</span>
                <span className={styles.qualityListValue}>{info.percentage.toFixed(1)}%</span>
                <span className={styles.qualityListType}>{info.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.qualityCard}>
        <h4>Outlier hotspots</h4>
        {outlierEntries.length === 0 ? (
          <p className={styles.qualityHint}>No significant outliers spotted.</p>
        ) : (
          <ul className={styles.qualityList}>
            {outlierEntries.map(([column, info]) => (
              <li key={column}>
                <span className={styles.qualityListLabel}>{column}</span>
                <span className={styles.qualityListValue}>{info.percentage.toFixed(1)}%</span>
                <span className={styles.qualityListType}>({info.count} rows)</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

QualityInsights.propTypes = {
  result: PropTypes.object,
};

const PreviewDataTable = ({ result, selectedFile, filledNullColumns, onSaveToMinio, onDownloadFullCsv }) => {
  if (!result) {
    return (
      <div className={styles.emptyState}>
        Launch preprocessing to generate a live preview and diff highlights.
      </div>
    );
  }

  const previewRowCount = result.preview?.length ?? 0;
  const previewLimitReached = Boolean(result.preview_row_limit && result.cleaned_row_count > result.preview_row_limit);
  const hasDiffHighlights = Boolean(
    result.diff_marks &&
      ((result.diff_marks.deleted_row_indices || []).length > 0 ||
        Object.keys(result.diff_marks.updated_cells || {}).length > 0)
  );

  const tableData = {};
  if (Array.isArray(result.preview) && result.preview.length > 0) {
    const columns = Object.keys(result.preview[0]);
    columns.forEach((column) => {
      tableData[column] = result.preview.map((row) => row[column]);
    });
  }

  const originalData = {};
  if (Array.isArray(result.original_preview) && result.original_preview.length > 0) {
    const columns = Object.keys(result.original_preview[0]);
    columns.forEach((column) => {
      originalData[column] = result.original_preview.map((row) => row[column]);
    });
  }

  return (
    <>
      <div className={styles.dataProcessingSummary}>
        <div className={styles.dataProcessingInfo}>
          <div className={styles.dataProcessingStats}>
            <div className={styles.dataProcessingStat}>
              <span className={styles.dataProcessingStatLabel}>Processed</span>
              <span className={styles.dataProcessingStatValue}>{previewRowCount.toLocaleString()} rows</span>
            </div>
            {previewLimitReached && (
              <div className={styles.dataProcessingStat}>
                <span className={styles.dataProcessingStatLabel}>Full Dataset</span>
                <span className={styles.dataProcessingStatValue}>{result.cleaned_row_count.toLocaleString()} rows</span>
              </div>
            )}
            {hasDiffHighlights && (
              <div className={styles.dataProcessingStat}>
                <span className={styles.dataProcessingStatLabel}>Changed</span>
                <span className={styles.dataProcessingStatValue}>
                  {Object.keys(result.diff_marks?.updated_cells || {}).length} cells
                </span>
              </div>
            )}
          </div>
          
          <div className={styles.actionButtons}>
            <ViewProcessedDataButton
              data={tableData}
              originalData={originalData}
              compareOriginal
              highlightChanges
              diffMarks={result.diff_marks}
              originalFilename={selectedFile}
              filledNullColumns={filledNullColumns}
              saveTarget="cleaned"
              saveFilename={result.cleaned_filename}
              tempFilePath={result.temp_cleaned_path}
              title="Preprocessed Data View"
              buttonText="View Processed Data"
              buttonVariant="success"
              pipeline="preprocessing"
            />
          </div>
        </div>
      </div>
    </>
  );
};

PreviewDataTable.propTypes = {
  result: PropTypes.object,
  selectedFile: PropTypes.string.isRequired,
  filledNullColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  onSaveToMinio: PropTypes.func,
  onDownloadFullCsv: PropTypes.func,
};

export const PreviewPanel = ({
  result,
  progressInfo,
  activePreviewTab,
  onTabChange,
  statsCards,
  selectedFile,
  preprocessingSteps,
  onSaveToMinio,
  onDownloadFullCsv,
  elapsedMs,
  progressAnchorRef,
  collapseEnabled,
  isStepsCollapsed,
  onExpandSteps,
}) => {
  const clampedTab = clampTab(activePreviewTab);
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

  const showStatsCards = progressInfo.status === "completed" || result;
  
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
            <div
              className={styles.progressBarFill}
              style={{ width: `${clampedAnimatedProgress}%` }}
            />
          </div>
          <p className={styles.progressMessage}>
            {progressInfo.error ? progressInfo.error : progressInfo.message || "Working through your preprocessing steps..."}
          </p>
          <div className={styles.progressTiming}>
            <span>Elapsed time</span>
            <span>{formattedElapsed}</span>
          </div>
        </div>
      )}

      {showStatsCards && (
        <div className={styles.statsRow}>
          {statsCards.map((card, index) => {
            const toneClass = card.tone ? STAT_TONE_CLASSES[card.tone] : "";
            return (
              <div key={`${card.label}-${index}`} className={`${styles.statCard} ${toneClass || ""}`}>
                <span className={styles.statLabel}>{card.label}</span>
                <span className={styles.statValue}>{card.value}</span>
              </div>
            );
          })}
        </div>
      )}

      {!showStatsCards && !isStepsCollapsed && (
        <div className={styles.stepSelectionGuide}>
          <h3>Configure Your Preprocessing Steps</h3>
          <p>Select the steps you want to apply to your dataset from the options on the left.</p>
          <p>After processing, you'll see the results and statistics here.</p>
        </div>
      )}

      <div className={styles.previewTabs}>
        <button
          type="button"
          className={clampedTab === "preview" ? styles.previewTabActive : styles.previewTab}
          onClick={() => onTabChange("preview")}
        >
          Preview
        </button>
        <button
          type="button"
          className={clampedTab === "diff" ? styles.previewTabActive : styles.previewTab}
          onClick={() => onTabChange("diff")}
        >
          Diff highlights
        </button>
        <button
          type="button"
          className={clampedTab === "quality" ? styles.previewTabActive : styles.previewTab}
          onClick={() => onTabChange("quality")}
        >
          Data quality
        </button>
      </div>

      <div className={styles.previewPanelSurface}>
        {clampedTab === "preview" && (
          <PreviewDataTable
            result={result}
            selectedFile={selectedFile}
            filledNullColumns={preprocessingSteps.fillNullsColumns}
            onSaveToMinio={onSaveToMinio}
            onDownloadFullCsv={onDownloadFullCsv}
          />
        )}
        {clampedTab === "diff" && <DiffHighlights result={result} />}
        {clampedTab === "quality" && <QualityInsights result={result} />}
      </div>

      <ChangeSummary changeMetadata={result?.change_metadata} />
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
  activePreviewTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  statsCards: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
      tone: PropTypes.oneOf(["muted", "neutral", "success", "warning", "info"]),
    })
  ).isRequired,
  selectedFile: PropTypes.string.isRequired,
  preprocessingSteps: PropTypes.shape({
    fillNullsColumns: PropTypes.arrayOf(PropTypes.string).isRequired,
  }).isRequired,
  onSaveToMinio: PropTypes.func,
  onDownloadFullCsv: PropTypes.func,
  elapsedMs: PropTypes.number,
  progressAnchorRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]),
  collapseEnabled: PropTypes.bool,
  isStepsCollapsed: PropTypes.bool,
  onExpandSteps: PropTypes.func,
};
