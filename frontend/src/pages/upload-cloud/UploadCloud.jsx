import React, { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import saasToast from '@/utils/toast';
import styles from "../upload-file/UploadFile.module.css";

export default function UploadCloud() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check for google token in localStorage
    const googleToken = localStorage.getItem("google_access_token");
    if (googleToken) {
      // Optionally, fetch user info to show that user is already logged in
    }
  }, []);

  // Open popup for OAuth and redirect to new page with token
  const handleProviderLogin = useCallback((provider) => {
    if (provider === "google") {
      // Only redirect if token exists AND user is already on /gdrive-files
      const googleToken = localStorage.getItem("google_access_token");
      if (googleToken) {
        navigate("/gdrive-files");
        return;
      }
      const popup = window.open("http://localhost:8000/auth/google/login", "_blank", "width=500,height=700");
      const handler = (event) => {
        const allowedOrigins = ["http://localhost:5173", window.location.origin];
        if (!allowedOrigins.includes(event.origin)) return;
        if (event.data && event.data.source === "react-devtools-content-script") return;
        if (event.data && (event.data.google_creds || event.data.access_token)) {
          let accessToken = event.data.access_token;
          if (event.data.google_creds) {
            Object.entries(event.data.google_creds).forEach(([key, value]) => {
              localStorage.setItem(`google_${key}`, typeof value === 'object' ? JSON.stringify(value) : value);
            });
            accessToken = event.data.google_creds.access_token;
          } else if (event.data.access_token) {
            localStorage.setItem("google_access_token", event.data.access_token);
          }
          if (accessToken) {
            navigate("/gdrive-files");
          } else {
            saasToast.error("Google OAuth message received but no access token found. Check console.", { idKey: 'gdrive-oauth-missing' });
          }
          popup && popup.close();
          window.removeEventListener("message", handler);
        }
      };
      window.addEventListener("message", handler);
      return;
    }
  }, [navigate]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.layout}>
          <section className={styles.card}>
            <header className={styles.header}>
              <span className={styles.kicker}>Cloud sources</span>
              <h1 className={styles.title}>Connect your storage</h1>
              <p className={styles.subtitle}>
                Authorize a provider to browse and ingest files directly from your connected cloud drives. We’ll bring
                back the dataset as an optimized Parquet file ready for analysis.
              </p>
            </header>

            <div className={styles.providerList}>
              <button
                onClick={() => handleProviderLogin("google")}
                className={`${styles.providerButton} ${styles.providerPrimary}`}
              >
                <span className={styles.providerIcon}>📁</span>
                <span>Connect Google Drive</span>
              </button>
            </div>

            <p className={styles.providerNote}>
              Already connected? We’ll detect your active Google session and jump straight to file browsing. You can
              manage or revoke access anytime from your account settings.
            </p>

            <div className={styles.featureGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Secure OAuth</div>
                <div className={styles.featureDescription}>
                  Tokens stay encrypted in your browser storage—only you can trigger data movement from your drives.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Selective ingest</div>
                <div className={styles.featureDescription}>
                  Browse your folders, preview column profiles, and ingest only the tables you need into Cloud Upload.
                </div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureTitle}>Unified workflow</div>
                <div className={styles.featureDescription}>
                  Connected datasets automatically appear in preprocessing with the same safeguards as manual uploads.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
