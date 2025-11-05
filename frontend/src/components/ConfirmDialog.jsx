import React from 'react';
import ReactDOM from 'react-dom';

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

  // Prevent closing when clicking the dialog itself
  const handleDialogClick = (e) => {
    e.stopPropagation();
  };

  return ReactDOM.createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn"
      onClick={handleCancel}
      role="dialog" 
      aria-modal="true" 
      aria-label={title}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-slideIn"
        onClick={handleDialogClick}
      >
        {/* Icon */}
        <div className="flex items-center justify-center pt-8 pb-4">
          <div className={`
            flex items-center justify-center w-16 h-16 rounded-full
            ${tone === 'danger' ? 'bg-red-100' : 'bg-indigo-100'}
          `}>
            {tone === 'danger' ? (
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Header */}
        <div className="px-6 pb-4 text-center">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 text-center">
          <p className="text-base text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 px-6 pb-6">
          <button 
            type="button" 
            className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
            onClick={handleCancel}
          >
            {cancelText}
          </button>
          
          {secondaryText && (
            <button 
              type="button" 
              className="px-6 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
              onClick={handleSecondary}
            >
              {secondaryText}
            </button>
          )}
          
          <button
            type="button"
            className={`
              px-6 py-2.5 text-sm font-semibold text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95
              ${tone === 'danger' 
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' 
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
              }
            `}
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
