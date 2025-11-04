import React from 'react';
import ReactDOM from 'react-dom';
import styles from './ConfirmDialog.module.css';

export default function ConfirmDialog({
  open,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  tone = 'primary',
  // Optional second confirm-style action (e.g., "Discard")
  secondaryText,
  onSecondary,
}) {
  if (!open) return null;
  const handleConfirm = () => onConfirm && onConfirm();
  const handleCancel = () => onCancel && onCancel();
  const handleSecondary = () => onSecondary && onSecondary();

  return ReactDOM.createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
        </div>
        <div className={styles.body}>
          <p>{message}</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.cancel}`} onClick={handleCancel}>{cancelText}</button>
          {secondaryText && (
            <button type="button" className={`${styles.btn} ${styles.secondary}`} onClick={handleSecondary}>{secondaryText}</button>
          )}
          <button
            type="button"
            className={`${styles.btn} ${tone === 'danger' ? styles.danger : styles.confirm}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
