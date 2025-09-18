import React from "react";
import styles from "./ColumnMultiSelect.module.css";

export default function ColumnMultiSelect({
  columns, selected, onChange, label, placeholder, nullCounts = {}, strategies = {}, onChangeStrategy }) {
  
  const allSelected = columns.length > 0 && selected.length === columns.length;

  const handleToggle = col => {
    if (selected.includes(col)) {
      onChange(selected.filter(c => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  const handleSelectAll = e => {
    if (e.target.checked) {
      onChange([...columns]);
    } else {
      onChange([]);
    }
  };

  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.dropdown}>
        {selected.length === 0 && <div className={styles.placeholder}>{placeholder || "Select columns..."}</div>}
        
        <label className={styles.selectAllOption}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
          />
          <b>Select All</b>
        </label>

        <div className={styles.options}>
          {columns.map(col => {
            const isSelected = selected.includes(col);

            return (
              <label key={col} className={styles.option}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(col)}
                />
                <span className={styles.columnNameText}>
                  {col}
                  {nullCounts[col] > 0 && (
                    <span className={styles.nullCount}> ({nullCounts[col]} nulls)</span>
                  )}
                </span>
                {nullCounts[col] > 0 && onChangeStrategy && (
                  <div className={styles.inlineStrategy}>
                    <select
                      value={strategies[col]?.strategy || 'mean'}
                      onChange={e => onChangeStrategy(col, e.target.value)}
                      className={styles.strategySelect}
                    >
                      <option value="mean">Mean</option>
                      <option value="median">Median</option>
                      <option value="mode">Mode</option>
                      <option value="custom">Custom</option>
                    </select>
                    {strategies[col]?.strategy === 'custom' && (
                      <input
                        type="text"
                        className={styles.customInput}
                        placeholder="Value"
                        value={strategies[col]?.value || ''}
                        onChange={e => onChangeStrategy(col, 'custom', e.target.value)}
                      />
                    )}
                  </div>
                )}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
