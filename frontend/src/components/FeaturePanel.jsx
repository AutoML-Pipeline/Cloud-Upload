import React from "react";
import styles from "./FeaturePanel.module.css";

const bullets = [
  "Upload from local, URL, or Google Drive",
  "Clean, transform, and feature engineer quickly",
  "Guided model selection and training presets",
];

export default function FeaturePanel({ title = "Why Automated Machine Learning Pipeline?", items = bullets, className = "", floating = false }) {
  const cls = [styles.card, floating ? styles.floating : '', className].filter(Boolean).join(' ');
  return (
    <aside className={cls} aria-labelledby="feature-panel-title">
      {/* Hero illustration */}
      <div className={styles.heroImage}>
        <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Data flow pipeline illustration */}
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          
          {/* Upload icon */}
          <circle cx="40" cy="70" r="22" fill="url(#grad1)" opacity="0.2" />
          <path d="M40 60 L40 80 M32 68 L40 60 L48 68" stroke="url(#grad2)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="32" y="75" width="16" height="8" rx="2" stroke="url(#grad2)" strokeWidth="2" fill="none" />
          
          {/* Arrow connector 1 */}
          <path d="M65 70 L85 70" stroke="url(#grad1)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.6" />
          <path d="M82 65 L90 70 L82 75" fill="url(#grad1)" opacity="0.6" />
          
          {/* Processing gear */}
          <circle cx="110" cy="70" r="22" fill="url(#grad1)" opacity="0.2" />
          <circle cx="110" cy="70" r="12" stroke="url(#grad2)" strokeWidth="2.5" fill="none" />
          <circle cx="110" cy="70" r="5" fill="url(#grad2)" />
          <path d="M110 50 L110 54 M110 86 L110 90 M90 70 L94 70 M126 70 L130 70" stroke="url(#grad2)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M97 57 L99.5 59.5 M120.5 80.5 L123 83 M97 83 L99.5 80.5 M120.5 59.5 L123 57" stroke="url(#grad2)" strokeWidth="2.5" strokeLinecap="round" />
          
          {/* Arrow connector 2 */}
          <path d="M135 70 L155 70" stroke="url(#grad1)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 3" opacity="0.6" />
          <path d="M152 65 L160 70 L152 75" fill="url(#grad1)" opacity="0.6" />
          
          {/* Model/Chart icon */}
          <circle cx="180" cy="70" r="22" fill="url(#grad1)" opacity="0.2" />
          <path d="M170 78 L174 70 L178 74 L182 65 L186 68" stroke="url(#grad2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="174" cy="70" r="2" fill="url(#grad2)" />
          <circle cx="178" cy="74" r="2" fill="url(#grad2)" />
          <circle cx="186" cy="68" r="2" fill="url(#grad2)" />
          
          {/* Sparkles */}
          <path d="M45 35 L45 42 M41.5 38.5 L48.5 38.5" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <path d="M115 25 L115 32 M111.5 28.5 L118.5 28.5" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
          <path d="M165 40 L165 45 M162.5 42.5 L167.5 42.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </svg>
      </div>
      
      <h2 id="feature-panel-title" className={styles.title}>{title}</h2>
      <ul className={styles.list}>
        {items.map((t, i) => (
          <li key={i} className={styles.item}>
            <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
