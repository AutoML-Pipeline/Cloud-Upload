import React, { useState, useMemo, useEffect } from "react";
import styles from "./DataTable.module.css";

function downloadCSV(data, filename = "data.csv") {
  const csvRows = [];
  const headers = Object.keys(data[0] || {});
  csvRows.push(headers.join(","));
  for (const row of data) {
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

async function saveToMinIO(data, originalFilename) {
  try {
    // Create filename with cleaned_ prefix
    const baseName = originalFilename ? originalFilename.replace(/\.(parquet|csv|xlsx|json)$/i, '') : 'data';
    const cleanedFilename = `cleaned_${baseName}.parquet`;
    
    // Convert data to CSV first, then let backend convert to parquet
    const csvRows = [];
    const headers = Object.keys(data[0] || {});
    csvRows.push(headers.join(","));
    for (const row of data) {
      csvRows.push(headers.map(h => JSON.stringify(row[h] ?? "")).join(","));
    }
    const csvContent = csvRows.join("\n");
    
    // Send to backend to save as parquet in cleaned-data folder
    const response = await fetch('http://localhost:8000/save_cleaned_to_minio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: csvContent,
        filename: cleanedFilename,
        folder: 'cleaned-data'
      })
    });
    
    const result = await response.json();
    if (response.ok) {
      return { success: true, message: `Data saved to MinIO as ${cleanedFilename}` };
    } else {
      throw new Error(result.error || 'Failed to save to MinIO');
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export default function DataTable({ data, columns, highlightChanges = false, originalData = null, pageSize = 10, compareOriginal = false, diffMarks = null, originalFilename = null }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filters, setFilters] = useState({});
  const [visibleCols, setVisibleCols] = useState(() => columns || Object.keys(data[0] || {}));
  const [savingToMinIO, setSavingToMinIO] = useState(false);
  const allColumns = useMemo(() => columns || Object.keys(data[0] || {}), [columns, data]);

  // Ensure all columns are visible when dataset/columns change (e.g., on Show All)
  useEffect(() => {
    setVisibleCols(allColumns);
  }, [allColumns]);

  const handleResetCols = () => setVisibleCols(allColumns);

  const handleSaveToMinIO = async () => {
    setSavingToMinIO(true);
    try {
      const result = await saveToMinIO(sortedData, originalFilename);
      if (result.success) {
        alert(`✅ ${result.message}`);
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setSavingToMinIO(false);
    }
  };

  // Filtering
  const filteredData = useMemo(() => {
    return data.filter(row =>
      allColumns.every(col => {
        if (!filters[col]) return true;
        return String(row[col] ?? "").toLowerCase().includes(filters[col].toLowerCase());
      })
    );
  }, [data, filters, allColumns]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortCol) return filteredData;
    return [...filteredData].sort((a, b) => {
      if (a[sortCol] === b[sortCol]) return 0;
      if (sortDir === "asc") return a[sortCol] > b[sortCol] ? 1 : -1;
      return a[sortCol] < b[sortCol] ? 1 : -1;
    });
  }, [filteredData, sortCol, sortDir]);

  // Pagination (based on augmented data length after we compute it)
  // Placeholder; will recompute after augmentedData is ready
  let totalPages = 1;
  // Build augmented data with deleted rows (from originalData) prepended
  const deletedIndexSet = useMemo(() => new Set(diffMarks?.deleted_row_indices || []), [diffMarks]);
  const deletedRows = useMemo(() => {
    if (!originalData || deletedIndexSet.size === 0) return [];
    const rows = originalData.filter(r => r?._orig_idx != null && deletedIndexSet.has(r._orig_idx)).map(r => ({ ...r, _deletedRow: true }));
    return rows;
  }, [originalData, deletedIndexSet]);

  const augmentedData = useMemo(() => [...deletedRows, ...sortedData], [deletedRows, sortedData]);
  totalPages = Math.max(1, Math.ceil(augmentedData.length / pageSize));
  const pagedData = augmentedData.slice(page * pageSize, (page + 1) * pageSize);

  // Deleted rows (strikethrough) support via diffMarks.deleted_row_indices based on _orig_idx
  const updatedCells = useMemo(() => diffMarks?.updated_cells || {}, [diffMarks]);

  // Build a lookup of original rows by _orig_idx
  const originalByIdx = useMemo(() => {
    const map = new Map();
    (originalData || []).forEach(r => {
      if (r && r._orig_idx != null) map.set(r._orig_idx, r);
    });
    return map;
  }, [originalData]);

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
  const isChanged = (rowIdx, col) => {
    if (!highlightChanges) return false;
    const row = pagedData[rowIdx];
    if (!row || row._deletedRow) return false; // deleted rows should not show per-cell changes
    const origIdx = row._orig_idx;
    const orig = origIdx != null ? originalByIdx.get(origIdx) : null;
    const changedByValue = orig ? orig[col] !== row[col] : false;
    const changedByDiff = origIdx != null && updatedCells[origIdx]?.[col];
    return Boolean(changedByValue || changedByDiff);
  };

  // Single-table compare: show cleaned value only; rely on highlight and deleted row styling
  const renderCompareCell = (rowIdx, col) => {
    const row = pagedData[rowIdx];
    const cleanedVal = row[col];
    const orig = row && row._orig_idx != null ? originalByIdx.get(row._orig_idx) : null;
    if (!orig) {
      // No original data for this row (e.g., in Show All mode, page > 1)
      return <span>{renderCell(cleanedVal)}</span>;
    }
    return <span>{renderCell(cleanedVal)}</span>;
  };

  return (
    <div className={styles.dataTableShell}>
      <div className={styles.dataTableToolbar}>
        <button className={styles.csvBtn} onClick={() => downloadCSV(sortedData)} aria-label="Download CSV" title="Download table as CSV">Download CSV</button>
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
      {/* Legend for compare mode */}
      {compareOriginal && (
        <div className={styles.compareLegend}>
          <span className={styles.cellChanged}>Highlighted cell</span> = value will change after cleaning. Deleted rows are shown with strikethrough.
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
              <tr key={rowIdx} className={row?._deletedRow ? styles.rowDeleted : undefined}>
                {allColumns.filter(col => visibleCols.includes(col)).map(col => (
                  <td
                    key={col}
                    className={isChanged(rowIdx + page * pageSize, col) ? styles.cellChanged : undefined}
                  >
                    {compareOriginal && originalData && originalData[rowIdx + page * pageSize]
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
        <button onClick={() => setPage(0)} disabled={page === 0} aria-label="First Page">&laquo; First</button>
        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous Page">&lsaquo; Prev</button>
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} aria-label="Next Page">Next &rsaquo;</button>
        <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} aria-label="Last Page">Last &raquo;</button>
      </div>
    </div>
  );
}
