import React from "react";
import PropTypes from "prop-types";
import styles from "./PageHero.module.css";

/**
 * Reusable page hero/intro section component
 * 
 * Displays a gradient banner with badge, title, and subtitle
 * Based on the Data Ingestion page design with consistent styling
 * 
 * Used in:
 * - Data Ingestion page
 * - Preprocessing page
 * - Feature Engineering page
 * 
 * @param {string} badge - Small uppercase label (e.g., "Workflow · Data Prep")
 * @param {string} title - Main page title (e.g., "Smart Data Preprocessing")
 * @param {string} subtitle - Descriptive subtitle text
 */
const PageHero = ({ badge, title, subtitle }) => {
  return (
    <section className={styles.heroCard}>
      <span className={styles.heroKicker}>{badge}</span>
      <h1 className={styles.heroTitle}>{title}</h1>
      <p className={styles.heroSubtitle}>{subtitle}</p>
    </section>
  );
};

PageHero.propTypes = {
  badge: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};

export default PageHero;
