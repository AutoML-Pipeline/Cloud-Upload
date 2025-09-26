import React from "react";
import styles from "./ShadcnNavbar.module.css";
import brandLogo from "../assets/logo.png";

// Reuse existing navbar visuals without user profile/menu
export default function AuthNavbar() {
  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.logoContainer}>
          <img src={brandLogo} alt="Automated Machine Learning Pipeline logo" className={styles.logo} />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Automated Machine Learning</span>
            <span className={styles.brandSubtitle}>
              Pipeline
              <span className={styles.brandSubtitleAccent}> Authentication</span>
            </span>
          </div>
        </div>
        <div />
      </div>
    </nav>
  );
}
