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
  columnInsights = {},
  label = "Columns to fill nulls"
}) {
  // Filter to show only columns with null values
  const columnsWithNulls = columns.filter(col => {
    const count = typeof nullCounts[col] === 'number' ? nullCounts[col] : 0;
    return count > 0;
  });
  
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
        columnInsights={columnInsights}
      />


      {columnsWithNulls.length === 0 && (
        <div className="p-4 text-center text-gray-500 italic">
          No columns with null values found.
        </div>
      )}
    </div>
  );
}


