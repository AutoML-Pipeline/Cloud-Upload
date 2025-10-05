import PropTypes from "prop-types";
import styles from "../../preprocessing/Preprocessing.module.css";

export const ChangeSummary = ({ changeMetadata, columnSummary }) => {
  const hasChanges = Array.isArray(changeMetadata) && changeMetadata.length > 0;
  const addedColumns = columnSummary?.added ?? [];
  const removedColumns = columnSummary?.removed ?? [];

  if (!hasChanges && addedColumns.length === 0 && removedColumns.length === 0) {
    return (
      <div className={styles.summaryCard}>
        <h4 className={styles.summaryHeading}>Feature engineering summary</h4>
        <p className={styles.summaryEmpty}>No transformations applied yet. Toggle a step and run the pipeline.</p>
      </div>
    );
  }

  return (
    <div className={styles.summaryCard}>
      <h4 className={styles.summaryHeading}>Feature engineering summary</h4>
      <div className={styles.summaryDetails}>
        {hasChanges &&
          changeMetadata.map((entry, index) => (
            <div key={`${entry.operation}-${index}`} className={styles.summaryItem}>
              <span className={styles.summaryOperation}>{entry.operation}:</span>
              <span className={styles.summaryInfo}>{JSON.stringify(entry.details)}</span>
            </div>
          ))}
        {addedColumns.length > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryOperation}>Columns added:</span>
            <span className={styles.summaryInfo}>{addedColumns.join(", ")}</span>
          </div>
        )}
        {removedColumns.length > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryOperation}>Columns removed:</span>
            <span className={styles.summaryInfo}>{removedColumns.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  );
};

ChangeSummary.propTypes = {
  changeMetadata: PropTypes.arrayOf(
    PropTypes.shape({
      operation: PropTypes.string.isRequired,
      details: PropTypes.object.isRequired,
    }),
  ),
  columnSummary: PropTypes.shape({
    added: PropTypes.arrayOf(PropTypes.string),
    removed: PropTypes.arrayOf(PropTypes.string),
  }),
};
