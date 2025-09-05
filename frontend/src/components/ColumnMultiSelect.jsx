import React from "react";
import styles from "./ColumnMultiSelect.module.css";

export default function ColumnMultiSelect({ columns, selected, onChange, label, placeholder }) {
  const handleToggle = col => {
    if (selected.includes(col)) {
      onChange(selected.filter(c => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };
  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.dropdown}>
        <div className={styles.placeholder}>{placeholder || "Select columns..."}</div>
        <div className={styles.options}>
          {columns.map(col => (
            <label key={col} className={styles.option}>
              <input
                type="checkbox"
                checked={selected.includes(col)}
                onChange={() => handleToggle(col)}
              />
              {col}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
