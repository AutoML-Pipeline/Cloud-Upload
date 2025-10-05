import React, { useState, useMemo, useEffect } from "react";
import styles from "./DataTable.module.css";

function downloadCSV(tableData, filename = "data.csv") {
  const csvRows = [];
  const headers = Object.keys(tableData[0] || {}); // Ensure headers are taken from the first row of transformed data
  csvRows.push(headers.join(","));
  for (const row of tableData) {
    csvRows.push(headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
  }
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default function DataTable({ data, columns, highlightChanges = false, originalData = null, compareOriginal = false, diffMarks = null, originalFilename = null, filledNullColumns = [], pageSize = 10, saveTarget = "engineered", saveFilename = null, onSave = null, onDownload = null }) {
    const [page, setPage] = useState(0);
    const [sortCol, setSortCol] = useState(null);
    const [sortDir, setSortDir] = useState("asc");
    const [filters, setFilters] = useState({});
    const [tableData, setTableData] = useState([]);
    const [allColumns, setAllColumns] = useState([]);
    const [visibleCols, setVisibleCols] = useState([]);
    const [savingToMinIO, setSavingToMinIO] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

    // Ensure all columns are visible when dataset/columns change (e.g., on Show All)
    useEffect(() => {
      if (Object.keys(data).length > 0) {
        const newColumns = Array.isArray(columns) && columns.length > 0 ? columns : Object.keys(data);
        setAllColumns(newColumns);
        setVisibleCols(newColumns);

        const numRows = data[newColumns[0]]?.length || 0;
        const transformed = [];
        for (let i = 0; i < numRows; i++) {
          const row = {};
          for (const col of newColumns) {
            row[col] = data[col][i];
          }
          transformed.push(row);
        }
        setTableData(transformed);
      } else {
        setAllColumns([]);
        setVisibleCols([]);
        setTableData([]);
      }
      setPage(0);
  }, [data, columns]); // Depend on data and columns prop

    const handleResetCols = () => setVisibleCols(allColumns);

    const handleSaveToMinIO = async () => {
      const useCustomHandler = typeof onSave === "function";
      setSavingToMinIO(true);
      try {
        if (useCustomHandler) {
          await onSave();
          return;
        }

        const isCleaned = saveTarget === "cleaned";

        let targetFilename = null;
        if (isCleaned) {
          if (saveFilename && typeof saveFilename === "string") {
            targetFilename = saveFilename;
          } else {
            let baseName = "data";
            if (originalFilename) {
              const filenameOnly = originalFilename.split("/").pop();
              baseName = filenameOnly.replace(/\.(parquet|csv|xlsx|json)$/i, "");
            }
            targetFilename = `cleaned_${baseName}.parquet`;
          }
        }

        const csvRows = [];
        const headers = Object.keys(tableData[0] || {});
        csvRows.push(headers.join(","));
        for (const row of tableData) {
          csvRows.push(headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
        }
        const csvContent = csvRows.join("\n");

        let response;
        if (isCleaned) {
          response = await fetch("http://localhost:8000/api/data/save_cleaned_to_minio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: csvContent, filename: targetFilename }),
          });
        } else {
          let baseName = "data";
          if (originalFilename) {
            const filenameOnly = originalFilename.split("/").pop();
            baseName = filenameOnly.replace(/\.(parquet|csv|xlsx|json)$/i, "");
          }
          const featureEngineeredFilename = `feature_engineered_${baseName}.parquet`;
          response = await fetch("http://localhost:8000/api/feature-engineering/save-to-minio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: csvContent, filename: featureEngineeredFilename }),
          });
        }

        const result = await response.json();
        if (result.message && !result.error) {
          alert(`✅ ${result.message}`);
        } else {
          alert(`❌ ${result.error || result.message || "Failed to save to MinIO"}`);
        }
      } catch (error) {
        if (!useCustomHandler) {
          alert(`❌ Error: ${error.message}`);
        } else {
          console.error("Custom save handler failed", error);
        }
      } finally {
        setSavingToMinIO(false);
      }
    };

    const handleDownloadCsv = async () => {
      const useCustomHandler = typeof onDownload === "function";
      if (useCustomHandler) {
        setDownloadingCsv(true);
      }
      try {
        if (useCustomHandler) {
          await onDownload();
          return;
        }

        const downloadName = (saveFilename || originalFilename || "data")
          .split("/")
          .pop()
          .replace(/\.(parquet|csv|xlsx|json)$/i, "")
          .concat(".csv");
        downloadCSV(sortedData, downloadName);
      } catch (error) {
        if (!useCustomHandler) {
          alert(`❌ Error: ${error.message}`);
        } else {
          console.error("Custom download handler failed", error);
        }
      } finally {
        if (useCustomHandler) {
          setDownloadingCsv(false);
        }
      }
    };

    // Filtering
    const filteredData = useMemo(() => {
      return tableData.filter(row =>
        allColumns.every(col => {
          if (!filters[col]) return true;
          return String(row[col] ?? "").toLowerCase().includes(filters[col].toLowerCase());
        })
      );
    }, [tableData, filters, allColumns]);

    // Sorting
    const sortedData = useMemo(() => {
      if (!sortCol) return filteredData;
      return [...filteredData].sort((a, b) => {
        if (a[sortCol] === b[sortCol]) return 0;
        if (sortDir === "asc") return a[sortCol] > b[sortCol] ? 1 : -1;
        return a[sortCol] < b[sortCol] ? 1 : -1;
      });
    }, [filteredData, sortCol, sortDir]);

    // Build augmented data (no deleted-row strikethrough)
    const augmentedData = useMemo(() => [...sortedData], [sortedData]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(augmentedData.length / pageSize));
    const pagedData = useMemo(() => augmentedData.slice(page * pageSize, (page + 1) * pageSize), [augmentedData, page, pageSize]);

    // Updated cells map from backend diff
    const updatedCells = useMemo(() => diffMarks?.updated_cells || {}, [diffMarks]);

    // Build a lookup of original rows by _orig_idx
    // Column toggling
    const toggleCol = col => {
      setVisibleCols(cols =>
        cols.includes(col) ? cols.filter(c => c !== col) : [...cols, col]
      );
    };

    // Sorting handler
    const handleSort = col => {
      if (sortCol === col) {
        setSortDir(d => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortCol(col);
        setSortDir("asc");
      }
    };

    // Filtering handler
    const handleFilter = (col, value) => {
      setFilters(f => ({ ...f, [col]: value }));
      setPage(0);
    };

    // Tooltip for long values
    const renderCell = (val, maxLen = 24) => {
      if (val == null) return "";
      const str = String(val);
      if (str.length > maxLen) {
        return <span title={str}>{str.slice(0, maxLen)}…</span>;
      }
      return str;
    };

    // Highlight changed cells
    const isChanged = (pagedRowIdx, col) => {
      if (!highlightChanges) return false;
      if (filledNullColumns && !filledNullColumns.includes(col)) return false;

      const globalIdx = pagedRowIdx + page * pageSize;
      const row = augmentedData[globalIdx];
      if (!row) return false;

      const origIdx = row._orig_idx;
      const changedByDiff = origIdx != null && updatedCells[origIdx]?.[col];
      return Boolean(changedByDiff);
    };

    // Single-table compare: show cleaned value only
    const renderCompareCell = (pagedRowIdx, col) => {
      const globalIdx = pagedRowIdx + page * pageSize;
      const row = augmentedData[globalIdx];
      const cleanedVal = row[col];
      return <span>{renderCell(cleanedVal)}</span>;
    };

    return (
      <div className={styles.dataTableShell}>
        <div className={styles.dataTableToolbar}>
          <button
            className={styles.csvBtn}
            onClick={handleDownloadCsv}
            disabled={downloadingCsv}
            aria-label="Download CSV"
            title="Download full dataset as CSV"
          >
            {downloadingCsv ? "Downloading..." : "Download CSV"}
          </button>
          <button 
            className={styles.minioBtn} 
            onClick={handleSaveToMinIO} 
            disabled={savingToMinIO}
            aria-label="Save to MinIO" 
            title="Save cleaned data to MinIO as parquet"
          >
            {savingToMinIO ? 'Saving...' : 'Save to MinIO'}
          </button>
          <button className={styles.resetColsBtn} onClick={handleResetCols} aria-label="Reset Columns" title="Show all columns">Reset Columns</button>
          <div className={styles.colToggleMenu}>
            Columns:
            {allColumns.map(col => (
              <label key={col} className={styles.colToggleLabel}>
                <input
                  type="checkbox"
                  checked={visibleCols.includes(col)}
                  onChange={() => toggleCol(col)}
                  aria-label={`Toggle column ${col}`}
                />
                {col}
              </label>
            ))}
          </div>
        </div>
        {compareOriginal && (
          <div className={styles.compareLegend}>
            <span className={styles.cellChanged}>Highlighted cell</span> = value will change after cleaning.
          </div>
        )}
        <div className={styles.dataTableWrapper}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                {allColumns.filter(col => visibleCols.includes(col)).map(col => (
                  <th key={col} onClick={() => handleSort(col)} className={styles.thClickable} tabIndex={0} aria-label={`Sort by ${col}`}>{col}{sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                    <div>
                      <input
                        className={styles.filterInput}
                        type="text"
                        placeholder="Filter"
                        value={filters[col] || ""}
                        onChange={e => handleFilter(col, e.target.value)}
                        onClick={e => e.stopPropagation()}
                        aria-label={`Filter column ${col}`}
                      />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {allColumns.filter(col => visibleCols.includes(col)).map(col => (
                    <td
                      key={col}
                      className={isChanged(rowIdx, col) ? styles.cellChanged : undefined}
                    >
                      {compareOriginal && originalData
                        ? renderCompareCell(rowIdx, col)
                        : renderCell(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.paginationBar}>
          <button onClick={() => setPage(0)} disabled={page === 0} aria-label="First Page">« First</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous Page">‹ Prev</button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next Page">Next ›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} aria-label="Last Page">Last »</button>
        </div>
      </div>
    );
  }
