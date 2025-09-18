import React from "react";
import styles from "./FillNullSelector.module.css";
import ColumnMultiSelect from "./ColumnMultiSelect"; // Import ColumnMultiSelect

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
  
  // Handlers for strategy changes
  const handleStrategyChange = (col, strategy) => {
    if (onChangeStrategy) {
      onChangeStrategy(col, strategy);
    }
  };

  const handleCustomValueChange = (col, value) => {
    if (onChangeStrategy) {
      const current = strategies[col]?.strategy || 'custom';
      onChangeStrategy(col, current, value);
    }
  };

  return (
    <div className={styles.wrapper}>
      <ColumnMultiSelect
        columns={columnsWithNulls}
        selected={selected}
        onChange={onChangeSelected}
        label={label}
        placeholder="Select columns with nulls to fill..."
        nullCounts={nullCounts}
        strategies={strategies}
        onChangeStrategy={onChangeStrategy}
      />


      {columnsWithNulls.length === 0 && (
        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
          No columns with null values found.
        </div>
      )}
    </div>
  );
}


