import PropTypes from "prop-types";
import PrimaryButton from "../../../components/PrimaryButton";
import styles from "../../preprocessing/Preprocessing.module.css";
import { formatDateTime, formatFileSize } from "../utils";

export const SelectionSection = ({
  files,
  selectedFile,
  onSelectFile,
  onContinue,
  isFetchingFiles,
  selectedFileInfo,
}) => {
  const hasFiles = files.length > 0;
  const fileCountLabel = files.length === 1 ? "1 file" : `${files.length} files`;

  const selectPlaceholder = isFetchingFiles
    ? "Loading datasets…"
    : hasFiles
      ? "Select a cleaned file…"
      : "No cleaned files available";

  return (
    <div className={styles.selectionGrid}>
      <div className={styles.selectionPanel}>
        <div className={styles.selectionPanelHeader}>
          <div>
            <span className={styles.selectionPanelEyebrow}>Cleaned datasets</span>
            <h3 className={styles.selectionPanelTitle}>Choose a base table</h3>
          </div>
          <span className={styles.selectionPanelCount}>{fileCountLabel}</span>
        </div>

        <label className={styles.selectLabel} htmlFor="feature-engineering-file-select">
          Select file <span className={styles.requiredMark}>*</span>
        </label>
        <div className={styles.selectControl}>
          <select
            id="feature-engineering-file-select"
            className={styles.selectDropdown}
            value={selectedFile || ""}
            onChange={(event) => onSelectFile(event.target.value)}
            disabled={!hasFiles || isFetchingFiles}
          >
            <option value="" disabled>
              {selectPlaceholder}
            </option>
            {files.map((file) => {
              const displayName = (file.name || "")
                // Strip cleaned/clean prefixes and common pipeline markers for readability
                .replace(/^(?:feature[_-]?engineered[_-]?|cleaned?[_-]?)+/i, "")
                .replace(/\.(parquet|csv|json)$/i, "");
              return (
                <option key={file.name} value={file.name} title={file.name}>
                  {displayName || file.name}
                </option>
              );
            })}
          </select>
        </div>

        {isFetchingFiles && (
          <div className={styles.fileListLoading}>
            <span className={styles.loadingDot}></span>
            <span>Loading latest cleaned datasets…</span>
          </div>
        )}

        {!hasFiles && !isFetchingFiles && (
          <div className={styles.emptyFiles}>
            <p>No cleaned datasets yet.</p>
            <p>Finish preprocessing or upload new data to create a cleaned base table.</p>
          </div>
        )}

        {!isFetchingFiles && hasFiles && selectedFileInfo && (
          <div className={styles.fileMetaCard}>
            <div className={styles.fileMetaHeader}>
              <span className={styles.fileMetaName} title={selectedFileInfo.name}>
                {(selectedFileInfo.name || "")
                  .replace(/^(?:feature[_-]?engineered[_-]?|cleaned?[_-]?)+/i, "")
                  .replace(/\.(parquet|csv|json)$/i, "") || selectedFileInfo.name}
              </span>
              <span className={styles.fileMetaBadge}>Ready</span>
            </div>
            <div className={styles.fileMetaStats}>
              <div>
                <span className={styles.metaLabel}>Last updated</span>
                <span className={styles.metaValue}>{formatDateTime(selectedFileInfo.last_modified)}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>File size</span>
                <span className={styles.metaValue}>{formatFileSize(selectedFileInfo.size)}</span>
              </div>
            </div>
            <p className={styles.fileMetaFoot}>Pulled from your MinIO cleaned datasets bucket.</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.75rem' }}>
          <PrimaryButton
            disabled={!selectedFile || !hasFiles || isFetchingFiles}
            onClick={onContinue}
            variant="primary"
          >
            Continue to feature engineering
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

SelectionSection.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      last_modified: PropTypes.string,
      size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
  ).isRequired,
  selectedFile: PropTypes.string.isRequired,
  onSelectFile: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  isFetchingFiles: PropTypes.bool.isRequired,
  selectedFileInfo: PropTypes.shape({
    name: PropTypes.string,
    last_modified: PropTypes.string,
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};
