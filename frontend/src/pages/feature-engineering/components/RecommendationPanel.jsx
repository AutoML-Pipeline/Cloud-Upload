import React, { useState } from "react";
import PropTypes from "prop-types";
import PrimaryButton from "../../../components/PrimaryButton";
import styles from "../../preprocessing/Preprocessing.module.css";

// Icons per step type for quick visual scan
const STEP_ICONS = {
  encoding: "🏷️",
  scaling: "📈",
  binning: "📦",
  feature_creation: "✨",
  feature_selection: "🔍",
};

export const RecommendationPanel = ({
  recommendations,
  dataQualityNotes,
  loading = false,
  appliedMap = {},
  allApplied = false,
  onApplyAll,
  onApplyStep,
  onUndoStep,
}) => {
  if (loading) {
    return (
      <div className={styles.recPanel}>
        <div className={styles.recHeader}>
          <div>
            <h3 className={styles.recTitle}>✨ Smart Feature Engineering Recommendations</h3>
            <p className={styles.recSubTitle}><span className={styles.inlineSpinner} /> Analyzing dataset…</p>
          </div>
        </div>
        <div className={styles.recGrid}>
          {[1,2,3,4].map((k) => (
            <div key={k} className={`${styles.recItem} ${styles.skeletonCard}`}>
              <div className={styles.skeletonTitle} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonChips}>
                <span className={styles.skeletonChip} />
                <span className={styles.skeletonChip} />
                <span className={styles.skeletonChip} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  const hasRecs = Array.isArray(recommendations) && recommendations.length > 0;
  const hasNotes = Array.isArray(dataQualityNotes) && dataQualityNotes.length > 0;

  const Item = ({ rec, idx }) => {
    const applied = !!appliedMap[idx];
    const icon = STEP_ICONS[rec.step_type] || "✨";
    const cols = rec.recommended_columns || [];
    const [expanded, setExpanded] = useState(false);
    const maxChips = 6;
    const visibleCols = expanded ? cols : cols.slice(0, maxChips);
    return (
      <div className={styles.recItem}>
        <div className={styles.recItemHeader}>
          <div className={styles.recCardHeaderLeft}>
            <span className={styles.recIcon} aria-hidden="true">{icon}</span>
            <span className={styles.recItemTitle}>{rec.step_name}</span>
          </div>
          <PrimaryButton
            type="button"
            variant={applied ? "success" : "primary"}
            onClick={(e) => {
              e.preventDefault();
              if (applied) onUndoStep?.(idx, rec);
              else onApplyStep?.(idx, rec);
            }}
          >
            {applied ? "Applied" : "Apply"}
          </PrimaryButton>
        </div>
        <div className={styles.recItemBody}>
          <div className={`${styles.recDesc} ${styles.lineClamp2}`}>{rec.reason}</div>
          {cols.length > 0 && (
            <div className={styles.chipRow}>
              {visibleCols.map((c) => (
                <span key={c} className={styles.chip}>{c}</span>
              ))}
              {cols.length > maxChips && (
                <button
                  type="button"
                  className={styles.chipMore}
                  onClick={(e) => { e.preventDefault(); setExpanded((v) => !v); }}
                >
                  {expanded ? "Show less" : `+${cols.length - maxChips} more`}
                </button>
              )}
            </div>
          )}
          {rec.step_type === "encoding" && /high[- ]?cardinality/i.test(rec.step_name) && (
            <div className={styles.recTip}>💡 Use Label encoding for high‑cardinality columns</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.recPanel}>
      <div className={styles.recHeader}>
        <div>
          <h3 className={styles.recTitle}>✨ Smart Feature Engineering Recommendations</h3>
          <p className={styles.recSubTitle}>
            {hasRecs || hasNotes
              ? "Suggestions are derived from full‑dataset analysis to improve performance and modelability."
              : "No automatic recommendations detected. You can still configure steps below."}
          </p>
        </div>
        {hasRecs ? (
          allApplied ? (
            <span className={styles.appliedPill}>✓ Applied</span>
          ) : (
            <button type="button" className={styles.primaryGhostButton} onClick={(e) => { e.preventDefault(); onApplyAll?.(); }}>Apply all</button>
          )
        ) : null}
      </div>

      {hasNotes && (
        <div className={styles.recQualityNotes}>
          <ul className={styles.notesGrid}>
            {dataQualityNotes.map((note, idx) => (
              <li key={idx} className={styles.noteItem}>
                <span className={styles.noteBullet} aria-hidden>•</span>
                <span className={styles.noteText}>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasRecs ? (
        <div className={styles.recGrid}>
          {recommendations.map((rec, idx) => (
            <Item key={idx} rec={rec} idx={idx} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

RecommendationPanel.propTypes = {
  recommendations: PropTypes.arrayOf(
    PropTypes.shape({
      step_type: PropTypes.string.isRequired,
      step_name: PropTypes.string.isRequired,
      reason: PropTypes.string.isRequired,
      recommended_columns: PropTypes.arrayOf(PropTypes.string),
    })
  ),
  dataQualityNotes: PropTypes.arrayOf(PropTypes.string),
  loading: PropTypes.bool,
  appliedMap: PropTypes.object,
  allApplied: PropTypes.bool,
  onApplyAll: PropTypes.func,
  onApplyStep: PropTypes.func,
  onUndoStep: PropTypes.func,
};

export default RecommendationPanel;
