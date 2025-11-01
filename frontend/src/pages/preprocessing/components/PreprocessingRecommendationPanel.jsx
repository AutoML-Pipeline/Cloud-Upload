import PropTypes from "prop-types";
import styles from "../Preprocessing.module.css";
import PrimaryButton from "../../../components/PrimaryButton";

export function PreprocessingRecommendationPanel({ suggestions, loading = false, onApplyAll, onApplyStep, onUndoStep, appliedSteps = {}, allApplied = false }) {
  if (loading) {
    return (
      <div className={styles.recPanel}>
        <div className={styles.recHeader}>
          <div>
            <h3 className={styles.recTitle}>✨ Smart Preprocessing Recommendations</h3>
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
  if (!suggestions) return null;

  const fill = suggestions.fillNulls;
  const removeNulls = suggestions.removeNulls;
  const dropColumns = suggestions.dropColumns;
  const removeDuplicates = suggestions.removeDuplicates;
  const removeOutliers = suggestions.removeOutliers;

  const icons = {
    removeDuplicates: "🧹",
    fillNulls: "🧴",
    dropColumns: "🗑️",
    removeNulls: "🚫",
    removeOutliers: "📈",
  };

  const Item = ({ title, stepKey, children }) => (
    <div className={styles.recItem}>
      <div className={styles.recItemHeader}>
        <div className={styles.recCardHeaderLeft}>
          <span className={styles.recIcon} aria-hidden="true">{icons[stepKey]}</span>
          <span className={styles.recItemTitle}>{title}</span>
        </div>
        <PrimaryButton
          type="button"
          variant={appliedSteps[stepKey] ? "success" : "primary"}
          onClick={(e) => {
            e.preventDefault();
            if (appliedSteps[stepKey]) onUndoStep?.(stepKey);
            else onApplyStep?.(stepKey);
          }}
        >
          {appliedSteps[stepKey] ? "Applied" : "Apply"}
        </PrimaryButton>
      </div>
      <div className={styles.recItemBody}>{children}</div>
    </div>
  );

  return (
    <div className={styles.recPanel}>
      <div className={styles.recHeader}>
        <div>
          <h3 className={styles.recTitle}>✨ Smart Preprocessing Recommendations</h3>
          <p className={styles.recSubTitle}>Suggestions are generated from a full‑dataset scan to improve stability and speed.</p>
        </div>
        {allApplied ? (
          <span className={styles.appliedPill}>✓ Applied</span>
        ) : (
          <button type="button" className={styles.primaryGhostButton} onClick={(e) => { e.preventDefault(); onApplyAll(); }}>Apply all</button>
        )}
      </div>
      <div className={styles.recGrid}>
        <Item stepKey="removeDuplicates" title="Remove duplicates">
          {removeDuplicates?.reason || "Detect and remove duplicate rows."}
        </Item>

        <Item stepKey="fillNulls" title="Fill nulls">
          {(fill?.columns || []).length ? (
            <ul className={styles.recList}>
              {fill.columns.map((c) => (
                <li key={c}>
                  {c}: <code>{fill.strategies?.[c]?.strategy}</code> — {fill.strategies?.[c]?.reason}
                </li>
              ))}
            </ul>
          ) : (
            <span>No columns</span>
          )}
        </Item>

        <Item stepKey="dropColumns" title="Drop columns">
          {(dropColumns?.columns || []).join(", ") || "No columns"}
        </Item>

        <Item stepKey="removeNulls" title="Remove null rows">
          {removeNulls?.reason}
        </Item>

        <Item stepKey="removeOutliers" title="Handle outliers">
          {(removeOutliers?.columns || []).join(", ") || "No columns"}
          {removeOutliers?.reason ? ` — ${removeOutliers.reason}` : ""}
        </Item>
      </div>
    </div>
  );
}

PreprocessingRecommendationPanel.propTypes = {
  suggestions: PropTypes.object,
  loading: PropTypes.bool,
  onApplyAll: PropTypes.func,
  onApplyStep: PropTypes.func,
  appliedSteps: PropTypes.object,
  allApplied: PropTypes.bool,
};

export default PreprocessingRecommendationPanel;
