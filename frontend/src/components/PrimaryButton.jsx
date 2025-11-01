import React from "react";
import PropTypes from "prop-types";
import styles from "./PrimaryButton.module.css";

/**
 * Reusable primary action button component
 * 
 * Small, stylish, and bright button without emojis
 * Features:
 * - Compact size with modern gradient
 * - Hover/disabled states
 * - Loading state support
 * 
 * Used across workflow pages for primary actions
 * 
 * @param {string} children - Button text content
 * @param {function} onClick - Click handler
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state (shows spinner)
 * @param {string} type - Button type (button, submit, reset)
 * @param {string} variant - Style variant (primary, secondary, success, danger)
 * @param {string} className - Additional CSS classes
 */
const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = "button",
  variant = "primary",
  className = "",
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`${styles.btn} ${styles[variant]} ${className}`}
    >
      {loading ? (
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

PrimaryButton.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  variant: PropTypes.oneOf(["primary", "secondary", "success", "danger"]),
  className: PropTypes.string,
};

export default PrimaryButton;
