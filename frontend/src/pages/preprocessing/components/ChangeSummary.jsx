import PropTypes from "prop-types";
import styles from "../Preprocessing.module.css";

const ICON_MAP = {
  "Remove Duplicates": "🧹",
  "Remove Nulls": "🚫",
  "Fill Nulls": "🧴",
  "Drop Columns": "🗑️",
  "Remove Outliers": "📈",
};

export const ChangeSummary = ({ changeMetadata }) => {
  if (!changeMetadata || changeMetadata.length === 0) {
    return null;
  }

  return (
    <div className={styles.timelineCard}>
      <h3 className={styles.timelineHeading}>What changed in this run</h3>
      <div className={styles.timelineList}>
        {changeMetadata.map((item, index) => {
          const icon = ICON_MAP[item.operation] || "⚙️";
          const details = [];

          if (item.rows_removed) {
            details.push(`Removed ${item.rows_removed} row${item.rows_removed === 1 ? "" : "s"}`);
          }

          if (item.columns && item.columns !== "all") {
            details.push(`Columns: ${Array.isArray(item.columns) ? item.columns.join(", ") : item.columns}`);
          }

          if (item.columns === "all") {
            details.push("Across all columns");
          }

          if (item.columns_dropped && item.columns_dropped.length) {
            details.push(`Dropped ${item.columns_dropped.join(", ")}`);
          }

          if (item.strategy) {
            details.push(`Strategy: ${item.strategy}${item.value !== undefined ? ` (${item.value})` : ""}`);
          }

          if (item.method) {
            details.push(`${item.method.toUpperCase()} · factor ${item.factor}`);
          }

          return (
            <div key={index} className={styles.timelineItem}>
              <span className={styles.timelineIcon}>{icon}</span>
              <div>
                <p className={styles.timelineTitle}>{item.operation}</p>
                {details.length > 0 && (
                  <p className={styles.timelineDetails}>{details.join(" • ")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

ChangeSummary.propTypes = {
  changeMetadata: PropTypes.arrayOf(PropTypes.object),
};
