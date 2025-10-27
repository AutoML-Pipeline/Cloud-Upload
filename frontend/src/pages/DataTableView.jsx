import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DataTable from "../components/DataTable";
import styles from "./DataTableView.module.css";

export default function DataTableView() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    data,
    originalData,
    compareOriginal,
    highlightChanges,
    diffMarks,
    originalFilename,
    filledNullColumns,
    saveTarget,
    saveFilename,
    title = "Data Preview"
  } = location.state || {};

  // If no data was passed, redirect back to previous page
  useEffect(() => {
    if (!data) {
      navigate(-1);
    }
  }, [data, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  if (!data) {
    return <div className={styles.loading}>Loading data...</div>;
  }

  return (
    <div className={styles.dataTableViewPage}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>
        <h1 className={styles.title}>{title}</h1>
      </div>

      <div className={styles.tableContainer}>
        <DataTable
          data={data}
          originalData={originalData}
          compareOriginal={compareOriginal}
          highlightChanges={highlightChanges}
          diffMarks={diffMarks}
          originalFilename={originalFilename}
          filledNullColumns={filledNullColumns}
          saveTarget={saveTarget}
          saveFilename={saveFilename}
        />
      </div>
    </div>
  );
}