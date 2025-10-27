import React from "react";
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
}) => {
  const navigate = useNavigate();

  const handleNavigateToTableView = () => {
    navigate('/data-table-view', {
      state: {
        data,
        originalData,
        compareOriginal,
        highlightChanges,
        diffMarks,
        originalFilename,
        filledNullColumns,
        title,
        saveTarget,
        saveFilename
      }
    });
  };

  return (
    <button
      type="button"
      className={`${styles.viewDataButton} ${styles[`variant${buttonVariant.charAt(0).toUpperCase() + buttonVariant.slice(1)}`]}`}
      onClick={handleNavigateToTableView}
      aria-label={buttonText}
    >
      <span className={styles.buttonIcon}>📊</span>
      <span className={styles.buttonText}>{buttonText}</span>
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
  title: PropTypes.string.isRequired,
  buttonText: PropTypes.string,
  buttonVariant: PropTypes.oneOf(["primary", "success", "warning"]),
};