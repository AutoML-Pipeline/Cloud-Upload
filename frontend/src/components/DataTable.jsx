import React, { useState, useMemo } from "react";
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

export default function DataTable({ data, columns, highlightChanges = false, originalData = null, pageSize = 10, compareOriginal = false }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filters, setFilters] = useState({});
  const [visibleCols, setVisibleCols] = useState(() => columns || Object.keys(data[0] || {}));
  const allColumns = useMemo(() => columns || Object.keys(data[0] || {}), [columns, data]);

  const handleResetCols = () => setVisibleCols(allColumns);

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

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pagedData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

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
    if (!highlightChanges || !originalData) return false;
    if (!originalData[rowIdx]) return false;
    const orig = originalData[rowIdx];
    return orig && orig[col] !== pagedData[rowIdx][col];
  };

  // Single-table compare: show cleaned value, and if changed, show original below in faded style
  const renderCompareCell = (rowIdx, col) => {
    const cleanedVal = pagedData[rowIdx][col];
    const orig = originalData ? originalData[rowIdx] : null;
    if (!orig) {
      // No original data for this row (e.g., in Show All mode, page > 1)
      return <span>{renderCell(cleanedVal)}</span>;
    }
    const changed = orig[col] !== cleanedVal;
    return (
      <div>
        <span>{renderCell(cleanedVal)}</span>
        {changed && (
          <div className={styles.compareWas} title={`Original: ${orig[col]}`}>
            (was <span className={styles.compareWasVal}>{renderCell(orig[col])}</span>)
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.dataTableShell}>
      <div className={styles.dataTableToolbar}>
        <button className={styles.csvBtn} onClick={() => downloadCSV(sortedData)} aria-label="Download CSV" title="Download table as CSV">Download CSV</button>
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
          <span className={styles.cellChanged}>Cell highlighted</span> = changed by preprocessing. <span className={styles.compareWas}>(was <span className={styles.compareWasVal}>original</span>)</span> shows the original value.
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
