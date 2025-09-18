import React from "react";
import { Link, useLocation } from 'react-router-dom';
import styles from './ShadcnNavbar.module.css';

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Data Ingestion", href: "/data-ingestion" },
    { label: "Preprocessing", href: "/preprocessing" },
    { label: "Feature Engineering", href: "/feature-engineering" },
    { label: "Model Selection", href: "/automl-training" },
  ];

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out-icon lucide-log-out mr-1 -ml-1">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const ShadcnNavbar = ({ onLogout }) => {
  const location = useLocation();

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        {/* Left: Logo + Title */}
        <div className={styles.logoContainer}>
          <span className={styles.logoIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" stroke="#60a5fa" strokeWidth="2" strokeLinejoin="round"/>
              <path d="M12 7L12 17" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 9.5L7 14.5" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 9.5L17 14.5" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="12" r="2" fill="#f3f6fa" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="7" cy="9.5" r="1.5" fill="#f3f6fa" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="17" cy="9.5" r="1.5" fill="#f3f6fa" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="7" cy="14.5" r="1.5" fill="#f3f6fa" stroke="#60a5fa" strokeWidth="1.5"/>
              <circle cx="17" cy="14.5" r="1.5" fill="#f3f6fa" stroke="#60a5fa" strokeWidth="1.5"/>
            </svg>
          </span>
          <span className={styles.title}>
            ML <span className={styles.pipelineText}>Pipeline</span>
          </span>
        </div>
        {/* Center: Nav Links */}
        <div className={styles.navLinks}>
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`${styles.navLink} ${location.pathname === link.href ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
        {/* Right: Logout Button */}
        <div className={styles.logoutContainer}>
          <button
            onClick={onLogout}
            className={styles.logoutButton}
          >
            <LogOutIcon className={styles.logoutIcon} />Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default ShadcnNavbar;
