import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import styles from "./ViewProcessedDataButton.module.css";

export const ViewProcessedDataButton = ({
  data,
  originalData,
  compareOriginal,
  highlightChanges,
  diffMarks,
  originalFilename,
  filledNullColumns,
  saveTarget,
  saveFilename,
  title,
  buttonText = "Open Data in New Page",
  buttonVariant = "primary", // primary, success, warning
  pipeline = null, // "preprocessing" or "feature-engineering"
  tempFilePath = null, // Path to temp file for full dataset operations
}) => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigateToTableView = () => {
    setIsNavigating(true);
    
    console.log('🚀 ViewProcessedDataButton: Starting navigation, data rows:', Object.keys(data || {}).length > 0 ? Object.values(data)[0]?.length : 0);
    
    // Prepare view data - DON'T pass functions (they can't be serialized in location.state)
    const viewData = {
      data,
      originalData,
      compareOriginal,
      highlightChanges,
      diffMarks,
      originalFilename,
      filledNullColumns,
      title,
      saveTarget,
      saveFilename,
      tempFilePath, // Pass temp file path for full dataset operations
      disableSave: false, // Enable save in DataTable (it will handle API calls directly)
      pipeline // Pass pipeline stage for Save & Continue button
    };
    
    // Use direct navigation with state - simpler and more reliable
    console.log('🔄 ViewProcessedDataButton: Navigating to /data-table-view with location.state');
    navigate('/data-table-view', { 
      state: viewData,
      replace: false 
    });
  };

  return (
    <button
      type="button"
      className={`${styles.viewDataButton} ${styles[`variant${buttonVariant.charAt(0).toUpperCase() + buttonVariant.slice(1)}`]}`}
      onClick={handleNavigateToTableView}
      disabled={isNavigating}
      aria-label={buttonText}
    >
      {isNavigating ? (
        <>
          <span className={styles.buttonSpinner}>⏳</span>
          <span className={styles.buttonText}>Loading...</span>
        </>
      ) : (
        <>
          <span className={styles.buttonIcon}>📊</span>
          <span className={styles.buttonText}>{buttonText}</span>
        </>
      )}
    </button>
  );
};

ViewProcessedDataButton.propTypes = {
  data: PropTypes.object.isRequired,
  originalData: PropTypes.object,
  compareOriginal: PropTypes.bool,
  highlightChanges: PropTypes.bool,
  diffMarks: PropTypes.object,
  originalFilename: PropTypes.string,
  filledNullColumns: PropTypes.arrayOf(PropTypes.string),
  saveTarget: PropTypes.string,
  saveFilename: PropTypes.string,
  onSave: PropTypes.func,
  onDownload: PropTypes.func,
  title: PropTypes.string.isRequired,
  buttonText: PropTypes.string,
  buttonVariant: PropTypes.oneOf(["primary", "success", "warning"]),
};