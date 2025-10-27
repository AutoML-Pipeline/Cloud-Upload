import React, { useEffect } from "react";
import PropTypes from "prop-types";
import DataTable from "./DataTable";
import styles from "./TableFullscreenModal.module.css";

export const TableFullscreenModal = ({
  isOpen,
  onClose,
  data,
  originalData,
  compareOriginal,
  highlightChanges,
  diffMarks,
  originalFilename,
  filledNullColumns,
  saveTarget,
  saveFilename,
  onSave,
  onDownload,
  title = "Data Preview",
}) => {
  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);
  
  // Adjust modal position for different screen sizes
  useEffect(() => {
    const adjustModalPosition = () => {
      if (!isOpen) return;
      
      const modalContent = document.querySelector(`.${styles.modalContent}`);
      const navbar = document.querySelector('nav') || document.querySelector('header');
      const isMobile = window.innerWidth < 768;
      
      if (modalContent) {
        if (navbar && !isMobile) {
          // For desktop: position below navbar
          const navbarHeight = navbar.offsetHeight || 60; // Default height if calculation fails
          
          // Safety check to ensure we have a reasonable height value
          const safeNavbarHeight = Math.min(Math.max(navbarHeight, 40), 120); 
          
          modalContent.style.height = `calc(95vh - ${safeNavbarHeight}px)`;
          modalContent.style.marginTop = `${safeNavbarHeight}px`;
          
          // Add some extra padding to the body for better content display
          const modalBody = modalContent.querySelector(`.${styles.modalBody}`);
          if (modalBody) {
            modalBody.style.paddingTop = '1rem';
          }
          
          // Apply the sticky header styles with !important to force them
          const applyStrongStickyStyles = () => {
            const tableHeaders = document.querySelectorAll('th');
            if (tableHeaders?.length) {
              tableHeaders.forEach(header => {
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
          };
          
          // Apply immediately and after a delay
          applyStrongStickyStyles();
          setTimeout(applyStrongStickyStyles, 300);
          setTimeout(applyStrongStickyStyles, 800);
        } else if (isMobile) {
          // For mobile: adjust for mobile UI and safe areas
          modalContent.style.height = '100vh';
          modalContent.style.marginTop = '0';
          
          // Add padding to account for mobile status bars
          const modalBody = modalContent.querySelector(`.${styles.modalBody}`);
          if (modalBody) {
            modalBody.style.paddingTop = '0.5rem';
            
            // Apply the sticky header styles with !important for mobile
            const applyStrongStickyStyles = () => {
              const tableHeaders = document.querySelectorAll('th');
              if (tableHeaders?.length) {
                tableHeaders.forEach(header => {
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
            };
            
            // Apply immediately and after delays for mobile
            applyStrongStickyStyles();
            setTimeout(applyStrongStickyStyles, 300);
            setTimeout(applyStrongStickyStyles, 800);
          }
        }
      }
    };
    
    // Initial adjustment
    adjustModalPosition();
    
    // Re-adjust on resize
    window.addEventListener('resize', adjustModalPosition);
    
    // Delayed adjustment to handle any dynamic layout changes
    const delayedAdjustment = setTimeout(adjustModalPosition, 300);
    
    return () => {
      window.removeEventListener('resize', adjustModalPosition);
      clearTimeout(delayedAdjustment);
    };
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      
      // Ensure the modal is positioned below any navbar
      // Add a slight delay to ensure DOM is ready
      setTimeout(() => {
        const navbar = document.querySelector('nav') || document.querySelector('header');
        const modalContent = document.querySelector(`.${styles.modalContent}`);
        
        if (navbar && modalContent) {
          const navbarHeight = navbar.offsetHeight;
          modalContent.style.height = `calc(95vh - ${navbarHeight}px)`;
          modalContent.style.marginTop = `${navbarHeight + 10}px`;
        }
      }, 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);
  
  // Add dedicated effect just for sticky headers
  useEffect(() => {
    if (!isOpen) return;
    
    // Function to force sticky headers
    const forceStickyHeaders = () => {
      const headers = document.querySelectorAll('th');
      if (headers?.length) {
        headers.forEach(header => {
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
    };
    
    // Run the function several times to ensure it takes effect
    forceStickyHeaders();
    
    // Set up multiple timers to ensure the styles are applied
    const timers = [];
    [100, 300, 600, 1000, 2000].forEach(delay => {
      timers.push(setTimeout(forceStickyHeaders, delay));
    });
    
    // Also handle scrolling to reapply styles
    const modalBody = document.querySelector(`.${styles.modalBody}`);
    if (modalBody) {
      modalBody.addEventListener('scroll', forceStickyHeaders);
    }
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
      if (modalBody) {
        modalBody.removeEventListener('scroll', forceStickyHeaders);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <span className={styles.modalIcon}>📊</span>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close fullscreen view"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div 
          className={styles.modalBody}
          style={{ 
            position: 'relative', 
            overflow: 'auto', 
            flex: '1', 
            display: 'flex', 
            flexDirection: 'column'
          }}
        >
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
            onSave={onSave}
            onDownload={onDownload}
            pageSize={20}
          />
        </div>
      </div>
    </div>
  );
};

TableFullscreenModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
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
  title: PropTypes.string,
};
