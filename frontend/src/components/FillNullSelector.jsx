import React from "react";
import styles from "./FillNullSelector.module.css";

export default function FillNullSelector({
  columns = [],
  nullCounts = {},
  selected = [],
  onChangeSelected,
  strategies = {},
  onChangeStrategy,
  label = "Columns to fill nulls"
}) {
  // Filter to show only columns with null values
  const columnsWithNulls = columns.filter(col => {
    const count = typeof nullCounts[col] === 'number' ? nullCounts[col] : 0;
    return count > 0;
  });
  
  const allSelected = columnsWithNulls.length > 0 && selected.length === columnsWithNulls.length;

  const toggleColumn = (col) => {
    if (!onChangeSelected) return;
    if (selected.includes(col)) {
      onChangeSelected(selected.filter(c => c !== col));
    } else {
      onChangeSelected([...selected, col]);
    }
  };

  const toggleAll = (checked) => {
    if (!onChangeSelected) return;
    onChangeSelected(checked ? [...columnsWithNulls] : []);
  };

  const handleStrategyChange = (col, strategy) => {
    if (!onChangeStrategy) return;
    // Auto-select the column when user picks a strategy
    if (!selected.includes(col) && onChangeSelected) {
      onChangeSelected([...selected, col]);
    }
    onChangeStrategy(col, strategy);
  };

  const handleCustomValueChange = (col, value) => {
    if (!onChangeStrategy) return;
    if (!selected.includes(col) && onChangeSelected) {
      onChangeSelected([...selected, col]);
    }
    const current = strategies[col]?.strategy || 'custom';
    onChangeStrategy(col, current, value);
  };

  return (
    <div className={styles.wrapper}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.listBox}>
        <label className={styles.selectAllRow}>
          <input type="checkbox" checked={allSelected} onChange={e => toggleAll(e.target.checked)} />
          <span className={styles.selectAllText}>Select All</span>
        </label>

        {columnsWithNulls.map(col => {
          const count = typeof nullCounts[col] === 'number' ? nullCounts[col] : 0;
          const hasNulls = count > 0;
          const isSelected = selected.includes(col);
          const info = strategies[col] || { strategy: 'mean', value: '' };

          return (
            <div key={col} className={styles.row}>
              <label className={styles.leftGroup}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleColumn(col)} />
                <span className={`${styles.colName} ${hasNulls ? styles.hasNulls : ''}`}>
                  {col} ({count} nulls)
                </span>
                <div className={`${styles.strategySelector} ${!isSelected ? styles.disabled : ''}`}>
                  <select
                    value={info.strategy}
                    onChange={e => handleStrategyChange(col, e.target.value)}
                    className={styles.select}
                  >
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                    <option value="mode">Mode</option>
                    <option value="custom">Custom</option>
                  </select>
                  {info.strategy === 'custom' && (
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Enter value"
                      value={info.value || ''}
                      onChange={e => handleCustomValueChange(col, e.target.value)}
                    />
                  )}
                </div>
              </label>
            </div>
          );
        })}
        
        {columnsWithNulls.length === 0 && (
          <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
            No columns with null values found.
          </div>
        )}
      </div>
    </div>
  );
}


