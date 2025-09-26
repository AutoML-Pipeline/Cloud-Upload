import React from "react";
import styles from "../pages/GDriveFilesTable.module.css";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

const formatMimeType = (mimeType) => {
  if (!mimeType) return "Unknown";
  if (mimeType === FOLDER_MIME_TYPE) return "Folder";
  if (mimeType.includes("spreadsheet")) return "Spreadsheet";
  if (mimeType.includes("document")) return "Document";
  const [, subtype] = mimeType.split("/");
  return subtype ? subtype.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : mimeType;
};

export default function GDriveFilesTable({ gdriveFiles = [], onUpload, onFolderClick }) {
  const hasFiles = gdriveFiles.length > 0;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.headerCell}>
              Name
            </th>
            <th scope="col" className={styles.headerCell}>
              Type
            </th>
            <th scope="col" className={styles.headerCell}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {hasFiles ? (
            gdriveFiles.map((file, index) => {
              const isFolder = file.mimeType === FOLDER_MIME_TYPE;
              const icon = isFolder ? "📁" : "📄";
              const badgeClass = isFolder ? styles.folderBadge : styles.fileIcon;

              return (
                <tr
                  key={file.id ?? `${file.name}-${index}`}
                  className={`${styles.row} ${isFolder ? styles.folderRow : ""}`.trim()}
                >
                  <td
                    className={`${styles.cell} ${styles.nameCell}`.trim()}
                    data-label="Name"
                  >
                    <div
                      className={`${styles.nameCell} ${isFolder ? styles.clickable : ""}`.trim()}
                      onClick={isFolder ? () => onFolderClick?.(file) : undefined}
                      role={isFolder ? "button" : undefined}
                      tabIndex={isFolder ? 0 : undefined}
                      onKeyDown={
                        isFolder
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                onFolderClick?.(file);
                              }
                            }
                          : undefined
                      }
                    >
                      <span className={badgeClass} aria-hidden="true">
                        {icon}
                      </span>
                      <span>{file.name}</span>
                    </div>
                  </td>
                  <td className={styles.cell} data-label="Type">
                    <span className={styles.chip}>{formatMimeType(file.mimeType)}</span>
                  </td>
                  <td className={styles.cell} data-label="Action">
                    <div className={styles.actions}>
                      {isFolder ? (
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.secondaryAction}`}
                          onClick={() => onFolderClick?.(file)}
                        >
                          Open Folder
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.primaryAction}`}
                          onClick={() => onUpload?.(file)}
                        >
                          Upload File
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className={styles.emptyState}>
                <div className={styles.emptyTitle}>No files to display</div>
                <p className={styles.emptySubtitle}>
                  This folder looks empty. Pick a different folder or upload directly from Google Drive.
                </p>
                <span className={styles.emptyCTA}>
                  Tip: make sure the integration has permission to view shared drives.
                </span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

