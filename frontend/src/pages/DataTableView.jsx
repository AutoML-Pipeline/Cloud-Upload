import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DataTable from "../components/DataTable";
import styles from "./DataTableView.module.css";

export default function DataTableView() {
  const location = useLocation();
  const navigate = useNavigate();

  console.log('🔍 DataTableView: Mounted, location.state:', !!location.state);
  console.log('🔍 DataTableView: Has data:', !!(location.state?.data));
  
  // Get data directly from location.state
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
    tempFilePath,
    disableSave = false,
    title = "Data Preview",
    pipeline = null // "preprocessing" or "feature-engineering"
  } = location.state || {};

  const handleBack = () => {
    navigate(-1);
  };

  if (!data) {
    console.error('❌ DataTableView: No data, redirecting back');
    navigate(-1);
    return <div className={styles.loading}>No data available...</div>;
  }
  
  console.log('✅ DataTableView: Rendering with data, rows:', Object.values(data)[0]?.length || 0);

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
          tempFilePath={tempFilePath}
          disableSave={disableSave}
          pipeline={pipeline}
        />
      </div>
    </div>
  );
}