import PropTypes from "prop-types";
import styles from "../Preprocessing.module.css";
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
      ? "Select a file…"
      : "No files available";

  return (
    <div className={styles.selectionGrid}>
      <div className={styles.selectionPanel}>
        <div className={styles.selectionPanelHeader}>
          <div>
            <span className={styles.selectionPanelEyebrow}>Dataset library</span>
            <h3 className={styles.selectionPanelTitle}>Choose a file to prep</h3>
          </div>
          <span className={styles.selectionPanelCount}>{fileCountLabel}</span>
        </div>

        <label className={styles.selectLabel} htmlFor="preprocessing-file-select">
          Select file <span className={styles.requiredMark}>*</span>
        </label>
        <div className={styles.selectControl}>
          <select
            id="preprocessing-file-select"
            className={styles.selectDropdown}
            value={selectedFile || ""}
            onChange={(event) => onSelectFile(event.target.value)}
            disabled={!hasFiles || isFetchingFiles}
          >
            <option value="" disabled>
              {selectPlaceholder}
            </option>
            {files.map((file) => (
              <option key={file.name} value={file.name}>
                {file.name}
              </option>
            ))}
          </select>
        </div>

        {isFetchingFiles && (
          <div className={styles.fileListLoading}>
            <span className={styles.loadingDot}></span>
            <span>Loading latest uploads…</span>
          </div>
        )}

        {!hasFiles && !isFetchingFiles && (
          <div className={styles.emptyFiles}>
            <p>No uploaded datasets yet.</p>
            <p>Use the Workflow ▸ Data intake hub to bring data into this workspace.</p>
          </div>
        )}

        {!isFetchingFiles && hasFiles && selectedFileInfo && (
          <div className={styles.fileMetaCard}>
            <div className={styles.fileMetaHeader}>
              <span className={styles.fileMetaName}>{selectedFileInfo.name}</span>
              <span className={styles.fileMetaBadge}>Ready</span>
            </div>
            <div className={styles.fileMetaStats}>
              <div>
                <span className={styles.metaLabel}>Last updated</span>
                <span className={styles.metaValue}>{formatDateTime(selectedFileInfo.lastModified)}</span>
              </div>
              <div>
                <span className={styles.metaLabel}>File size</span>
                <span className={styles.metaValue}>{formatFileSize(selectedFileInfo.size)}</span>
              </div>
            </div>
            <p className={styles.fileMetaFoot}>Securely stored in your MinIO workspace.</p>
          </div>
        )}

        <button
          type="button"
          disabled={!selectedFile || !hasFiles || isFetchingFiles}
          className={`${styles.submitBtn} ${styles.selectionButton}`}
          onClick={onContinue}
        >
          <div className={styles.submitContent}>
            <span role="img" aria-label="next">
              🚀
            </span>
            Continue to workflow
          </div>
        </button>
        <p className={styles.selectionHint}>
          Need something else? Upload new datasets from the Workflow ▸ Data intake hub.
        </p>
      </div>
    </div>
  );
};

SelectionSection.propTypes = {
  files: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      lastModified: PropTypes.string,
      size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })
  ).isRequired,
  selectedFile: PropTypes.string.isRequired,
  onSelectFile: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
  isFetchingFiles: PropTypes.bool.isRequired,
  selectedFileInfo: PropTypes.shape({
    name: PropTypes.string,
    lastModified: PropTypes.string,
    size: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
};
