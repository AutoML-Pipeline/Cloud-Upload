import React from "react";
import styles from "./ColumnMultiSelect.module.css";
import { getRecommendedFillStrategy, getStrategyLabel } from "../utils/fillStrategies";

export default function ColumnMultiSelect({
  columns,
  selected,
  onChange,
  label,
  placeholder,
  nullCounts = {},
  strategies = {},
  onChangeStrategy,
  columnInsights = {}
}) {
  const allSelected = columns.length > 0 && selected.length === columns.length;

  const handleToggle = (col) => {
    if (selected.includes(col)) {
      onChange(selected.filter((c) => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  const handleSelectAll = (e) => {
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
        {selected.length === 0 && (
          <div className={styles.placeholder}>
            {placeholder || "Select columns..."}
          </div>
        )}

        <label className={styles.selectAllOption}>
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
          />
          <b>Select All</b>
        </label>

        <div className={styles.options}>
          {columns.map((col) => {
            const isSelected = selected.includes(col);
            const hasNulls = nullCounts[col] > 0;
            const recommendation = getRecommendedFillStrategy({
              columnName: col,
              dtype: columnInsights[col]?.dtype,
              sampleValue: columnInsights[col]?.sampleValue,
              nullCount: nullCounts[col],
            });
            const recommendedStrategy = recommendation.strategy;
            const currentStrategy = strategies[col]?.strategy || recommendedStrategy;
            const isFollowingRecommendation = currentStrategy === recommendedStrategy;

            return (
              <div key={col} className={styles.option}>
                <div className={styles.optionMain}>
                  <div className={styles.columnSection}>
                    <input
                      type="checkbox"
                      id={`col-${col}`}
                      checked={isSelected}
                      onChange={() => handleToggle(col)}
                      style={{ scrollMargin: 0 }}
                    />
                    <label htmlFor={`col-${col}`} className={styles.columnNameText}>
                      {col}
                      {hasNulls && (
                        <span className={styles.nullCount}> ({nullCounts[col]} nulls)</span>
                      )}
                    </label>
                  </div>

                  {hasNulls && onChangeStrategy && (
                    <div className={styles.inlineStrategy}>
                      <select
                        value={currentStrategy}
                        onChange={(e) => onChangeStrategy(col, e.target.value)}
                        className={`${styles.strategySelect} ${
                          isFollowingRecommendation ? "" : styles.strategySelectOverride
                        }`}
                        title="Select strategy for filling nulls"
                      >
                        <option value="mean">Mean</option>
                        <option value="median">Median</option>
                        <option value="mode">Mode</option>
                        <option value="custom">Custom</option>
                      </select>
                      {currentStrategy === "custom" && (
                        <input
                          type="text"
                          className={styles.customInput}
                          placeholder="Value"
                          value={strategies[col]?.value || ""}
                          onChange={(e) => onChangeStrategy(col, "custom", e.target.value)}
                        />
                      )}
                    </div>
                  )}
                </div>

                {hasNulls && (
                  <div className={styles.recommendationRow}>
                    <span className={styles.recommendationTag}>
                      Suggested: {getStrategyLabel(recommendedStrategy)}
                    </span>
                    <span className={styles.recommendationDetail}>{recommendation.reason}</span>
                    {!isFollowingRecommendation && (
                      <span className={styles.recommendationOverride}>
                        Currently using {getStrategyLabel(currentStrategy)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}