import React from "react";
import styles from "./ColumnMultiSelect.module.css";

export default function ColumnMultiSelect({
  columns, selected, onChange, label, placeholder, nullCounts, onStrategyChange, columnStrategies }) {
  
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

  const handleColumnStrategyChange = (col, newStrategy) => {
    if (!selected.includes(col)) {
      onChange([...selected, col]);
    }
    if (onStrategyChange) {
      onStrategyChange(col, newStrategy);
    }
  };

  const handleCustomValueChange = (col, newValue) => {
    if (!selected.includes(col)) {
      onChange([...selected, col]);
    }
    if (onStrategyChange) {
      onStrategyChange(col, columnStrategies[col]?.strategy || 'custom', newValue);
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
            const hasNulls = nullCounts && typeof nullCounts[col] === 'number' && nullCounts[col] > 0;
            const strategyInfo = columnStrategies?.[col];
            const currentStrategy = strategyInfo?.strategy || 'mean';
            const customValue = strategyInfo?.value || '';
            const isSelected = selected.includes(col);

            return (
              <label key={col} className={`${styles.option} ${hasNulls ? styles.hasNulls : ''}`}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(col)}
                />
                <span className={`${styles.columnNameText} ${hasNulls ? styles.hasNulls : ''}`}>
                  {col}
                  {nullCounts && typeof nullCounts[col] === 'number' ? ` (${nullCounts[col]} nulls)` : ''}
                </span>

                <div className={`${styles.fillStrategyControls} ${!isSelected ? styles.disabledControls : ''}`}>
                  <select
                    value={currentStrategy}
                    onChange={e => handleColumnStrategyChange(col, e.target.value)}
                    className={styles.fillStrategySelect}
                  >
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                    <option value="mode">Mode</option>
                    <option value="custom">Custom</option>
                  </select>
                  {currentStrategy === 'custom' && (
                    <input
                      type="text"
                      value={customValue}
                      onChange={e => handleCustomValueChange(col, e.target.value)}
                      placeholder="Enter value"
                      className={styles.customFillInput}
                    />
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
