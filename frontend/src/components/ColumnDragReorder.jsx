import React, { useRef } from "react";
import styles from "./ColumnDragReorder.module.css";

export default function ColumnDragReorder({ order, onChange }) {
  const dragCol = useRef(null);

  const handleDragStart = (col) => {
    dragCol.current = col;
  };
  const handleDragOver = (e, col) => {
    e.preventDefault();
    if (dragCol.current && dragCol.current !== col) {
      const newOrder = [...order];
      const fromIdx = newOrder.indexOf(dragCol.current);
      const toIdx = newOrder.indexOf(col);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, dragCol.current);
      onChange(newOrder);
      dragCol.current = col;
    }
  };
  return (
    <div className={styles.reorderWrapper}>
      <div className={styles.reorderLabel}>Reorder Columns (drag to reorder):</div>
      <div className={styles.chipList}>
        {order.map(col => (
          <div
            key={col}
            className={styles.chip}
            draggable
            onDragStart={() => handleDragStart(col)}
            onDragOver={e => handleDragOver(e, col)}
          >
            {col}
          </div>
        ))}
      </div>
    </div>
  );
}
