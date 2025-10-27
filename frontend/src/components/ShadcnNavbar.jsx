import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from 'react-router-dom';
import styles from './ShadcnNavbar.module.css';
import brandLogo from '../assets/logo.png';
import ConfirmDialog from './ConfirmDialog';

const primaryLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Models", href: "/models" },
];

const workflowLinks = [
  { label: "Data Ingestion", href: "/data-ingestion" },
  { label: "Preprocessing", href: "/preprocessing" },
  { label: "Feature Engineering", href: "/feature-engineering" },
  { label: "Model Training", href: "/model-training" },
];

const getInitial = (value) => {
  if (!value || typeof value !== "string") return "U";
  return value.trim().charAt(0).toUpperCase() || "U";
};

const ShadcnNavbar = ({ user, onLogout }) => {
  const location = useLocation();
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.picture]);

  useEffect(() => {
    setWorkflowOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!workflowOpen && !userMenuOpen) return;
    const handler = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setWorkflowOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [workflowOpen, userMenuOpen]);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContent}>
        <div className={styles.logoContainer}>
          <img src={brandLogo} alt="Automated Machine Learning Pipeline logo" className={styles.logo} />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>
              Automated Machine Learning
            </span>
            <span className={styles.brandSubtitle}>
              Pipeline for
              <span className={styles.brandSubtitleAccent}> Big Data Analysis</span>
            </span>
          </div>
        </div>
        {/* Center: Nav Links */}
        <div className={styles.navLinks}>
          {primaryLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className={`${styles.navLink} ${location.pathname === link.href ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}

          <div
            ref={dropdownRef}
            className={`${styles.dropdown} ${workflowOpen ? styles.dropdownOpen : ''}`}
          >
            <button
              type="button"
              className={styles.dropdownTrigger}
              onClick={() => setWorkflowOpen((prev) => !prev)}
            >
              <span>Workflow</span>
              <svg
                className={styles.dropdownIcon}
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div className={styles.dropdownPanel}>
              {workflowLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`${styles.dropdownItem} ${location.pathname === link.href ? styles.dropdownItemActive : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
        {/* Right: Logout Button */}
        <div className={styles.profileSlot} ref={profileRef}>
          {user ? (
            <>
              <button
                type="button"
                className={`${styles.avatarButton} ${userMenuOpen ? styles.avatarButtonActive : ''}`}
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                {user.picture && !avatarError ? (
                  <img
                    src={user.picture}
                    alt={user.name || user.email || "User"}
                    className={styles.avatarImage}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <span className={styles.avatarFallback}>
                    {getInitial(user.name || user.email)}
                  </span>
                )}
              </button>
              <div className={`${styles.userDropdown} ${userMenuOpen ? styles.userDropdownOpen : ''}`} role="menu">
                <div className={styles.userMeta}>
                  <span className={styles.userName}>{user.name || user.given_name || user.email || "User"}</span>
                  {user.email && <span className={styles.userEmail}>{user.email}</span>}
                </div>
                <Link to="/manage-account" className={styles.loginLink} role="menuitem" onClick={()=>setUserMenuOpen(false)}>
                  Manage account
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className={styles.userAction}
                  role="menuitem"
                >
                  Log out
                </button>
              </div>
              <ConfirmDialog
                open={showLogoutConfirm}
                title="Log out"
                message="Are you sure you want to log out?"
                confirmText="Log out"
                cancelText="Cancel"
                onCancel={() => setShowLogoutConfirm(false)}
                onConfirm={() => { setShowLogoutConfirm(false); onLogout && onLogout(); }}
              />
            </>
          ) : (
            <Link to="/login" className={styles.loginLink}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default ShadcnNavbar;
