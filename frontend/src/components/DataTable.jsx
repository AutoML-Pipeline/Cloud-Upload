import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
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
    const [savingToMinIO, setSavingToMinIO] = useState(false);
    const [downloadingCsv, setDownloadingCsv] = useState(false);
    const [activeFilter, setActiveFilter] = useState(null); // Track which column filter is currently active
  const tableRef = useRef(null);
    
    // Enhance sticky headers functionality with a more aggressive approach
    useEffect(() => {
      const enhanceStickyHeaders = () => {
        if (tableRef.current) {
          const headers = tableRef.current.querySelectorAll('th');
          if (headers && headers.length) {
            headers.forEach(header => {
              // Use !important to override any other styles
              header.setAttribute('style', `
                position: sticky !important;
                top: 0 !important;
                z-index: 100 !important;
                background-color: #ffffff !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                border-bottom: 2px solid #e5e7eb !important;
                padding: 1.2rem 1.3rem !important;
                font-weight: 800 !important;
              `);
            });
          }
        }
      };
      
      // Run multiple times to ensure it takes effect
      enhanceStickyHeaders();
      
      // Schedule multiple checks to ensure styles are applied even after DOM updates
      const timer1 = setTimeout(enhanceStickyHeaders, 100);
      const timer2 = setTimeout(enhanceStickyHeaders, 300);
      const timer3 = setTimeout(enhanceStickyHeaders, 1000);
      
      // Add a scroll listener to ensure headers stay sticky during scrolling
      const tableWrapper = tableRef.current?.closest('.dataTableWrapper');
      const handleScroll = () => {
        enhanceStickyHeaders();
      };
      
      if (tableWrapper) {
        tableWrapper.addEventListener('scroll', handleScroll);
      }
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        if (tableWrapper) {
          tableWrapper.removeEventListener('scroll', handleScroll);
        }
      };
  }, [tableData, page, filters]);

    // Ensure all columns are visible when dataset/columns change (e.g., on Show All)
    useEffect(() => {
      if (Object.keys(data).length > 0) {
        const newColumns = Array.isArray(columns) && columns.length > 0 ? columns : Object.keys(data);
        setAllColumns(newColumns);

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
        setTableData([]);
      }
      setPage(0);
  }, [data, columns]); // Depend on data and columns prop

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
          let targetFilename = saveFilename;
          if (!targetFilename || typeof targetFilename !== "string") {
            let baseName = "data";
            if (originalFilename) {
              const filenameOnly = originalFilename.split("/").pop();
              baseName = filenameOnly.replace(/\.(parquet|csv|xlsx|json)$/i, "");
            }
            targetFilename = `feature_engineered_${baseName}.parquet`;
          }
          response = await fetch("http://localhost:8000/api/feature-engineering/save-to-minio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: csvContent, filename: targetFilename }),
          });
        }

        const result = await response.json();
        if (result.message && !result.error) {
          toast.success(result.message);
        } else {
          toast.error(result.error || result.message || "Failed to save to MinIO");
        }
      } catch (error) {
        if (!useCustomHandler) {
          toast.error(error.message);
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
          toast.error(error.message);
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
    
    // Toggle filter dropdown visibility
    const toggleFilter = (column, e) => {
      e.stopPropagation(); // Prevent triggering the sort when clicking the filter icon
      setActiveFilter(prev => prev === column ? null : column);
    };
    
    // Effect to close filter dropdown when clicking outside or pressing escape
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (activeFilter && !event.target.closest(`.${styles.filterDropdown}`) && !event.target.classList.contains(styles.filterIcon)) {
          setActiveFilter(null);
        }
      };
      
      const handleEscapeKey = (event) => {
        if (activeFilter && event.key === 'Escape') {
          setActiveFilter(null);
        }
      };

      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      
      return () => {
        document.removeEventListener('click', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }, [activeFilter]);

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
        </div>
        <div className={styles.dataTableWrapper}>
          <table ref={tableRef} className={styles.dataTable}>
            <thead>
              <tr>
                {allColumns.map(col => (
                  <th key={col} onClick={() => handleSort(col)} className={styles.thClickable} tabIndex={0} aria-label={`Sort by ${col}`}>
                    <div className={styles.thContent}>
                      <span className={styles.columnName}>
                        {col}{sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </span>
                      <span 
                        className={`${styles.filterIcon} ${filters[col] ? styles.filterActive : ''}`}
                        onClick={(e) => toggleFilter(col, e)}
                        aria-label={`Filter column ${col}`}
                      >
                        🔍
                      </span>
                      {activeFilter === col && (
                        <div className={styles.filterDropdown} onClick={(e) => e.stopPropagation()}>
                          <input
                            className={styles.filterInput}
                            type="text"
                            placeholder="Filter"
                            value={filters[col] || ""}
                            onChange={e => handleFilter(col, e.target.value)}
                            autoFocus
                            aria-label={`Filter column ${col}`}
                          />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedData.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {allColumns.map(col => (
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
