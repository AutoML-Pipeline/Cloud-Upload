import React from "react";
import { getValidColumnsForStep, getColumnReason, getSuggestedMethod } from "../utils/columnValidators";

const SCALING_METHODS = ["standard", "minmax", "robust", "log"];
const ENCODING_METHODS = ["one-hot", "label", "target"];
const BINNING_METHODS = ["equal-width", "quantile"];

const getMethodsForStep = (stepType) => {
  if (stepType === "scaling") return SCALING_METHODS;
  if (stepType === "encoding") return ENCODING_METHODS;
  if (stepType === "binning") return BINNING_METHODS;
  return [];
};

export const ValidatedColumnSelect = ({
  allColumns,
  selected,
  onChange,
  stepType,
  stepMethod,
  dataPreview,
  label,
  allowColumnMethods = false,
  columnMethods = {},
  onColumnMethodChange,
}) => {
  const validColumns = getValidColumnsForStep(stepType, stepMethod, dataPreview);
  const nullCounts = dataPreview?.null_counts || {};
  const availableMethods = getMethodsForStep(stepType);

  const handleColumnToggle = (col) => {
    if (selected.includes(col)) {
      onChange(selected.filter((c) => c !== col));
    } else {
      onChange([...selected, col]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === validColumns.length) {
      onChange([]);
    } else {
      onChange(validColumns);
    }
  };

  return (
    <div style={{ marginTop: "12px" }}>
      <div style={{ marginBottom: "12px" }}>
        <label style={{ fontSize: "14px", fontWeight: "600", color: "#333", display: "block", marginBottom: "8px" }}>
          {label}
        </label>
        
        <div style={{ marginBottom: "12px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selected.length === validColumns.length && validColumns.length > 0}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: "600", color: "#222" }}>Select All</span>
          </label>
        </div>

        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "1px solid #dee2e6",
            borderRadius: "8px",
            maxHeight: "400px",
            overflowY: "auto",
            padding: "0",
          }}
        >
          {validColumns.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: "#999", fontSize: "13px" }}>
              No compatible columns for this step
            </div>
          ) : (
            validColumns.map((col) => {
              const isSelected = selected.includes(col);
              const nullCount = nullCounts[col] || 0;
              const suggestedMethod = getSuggestedMethod(col, stepType, dataPreview);
              const selectedMethod = columnMethods[col] || suggestedMethod;

              return (
                <div
                  key={col}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #dee2e6",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                    backgroundColor: isSelected ? "#e7f3ff" : "#fff",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                  }}
                  onClick={() => handleColumnToggle(col)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleColumnToggle(col)}
                    style={{ marginTop: "2px", cursor: "pointer" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "600", color: "#222" }}>{col}</span>
                      {nullCount > 0 && (
                        <span style={{ color: "#dc3545", fontSize: "12px", fontWeight: "500" }}>
                          ({nullCount} nulls)
                        </span>
                      )}
                    </div>

                    {allowColumnMethods && isSelected && availableMethods.length > 0 && (
                      <div style={{ marginBottom: "8px", marginTop: "8px" }}>
                        <select
                          value={selectedMethod || suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onColumnMethodChange?.(col, e.target.value);
                          }}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #0d6efd",
                            borderRadius: "6px",
                            backgroundColor: "#fff",
                            color: "#0d6efd",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                        >
                          {availableMethods.map((method) => (
                            <option key={method} value={method}>
                              {method.charAt(0).toUpperCase() + method.slice(1).replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!allowColumnMethods && suggestedMethod && (
                      <div style={{ marginBottom: "6px" }}>
                        <select
                          value={suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: "6px 10px",
                            border: "1px solid #0d6efd",
                            borderRadius: "6px",
                            backgroundColor: "#fff",
                            color: "#0d6efd",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: "13px",
                          }}
                          disabled
                        >
                          <option value={suggestedMethod}>{suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1)}</option>
                        </select>
                      </div>
                    )}

                    <div style={{ fontSize: "12px", color: "#0d6efd", fontWeight: "600", marginBottom: "4px" }}>
                      Suggested: {suggestedMethod ? suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1) : "N/A"}
                    </div>

                    <div style={{ fontSize: "12px", color: "#666", lineHeight: "1.4" }}>
                      {getColumnReason(col, stepType, stepMethod, dataPreview)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {allColumns.length > validColumns.length && (
        <div style={{ marginTop: "12px", padding: "10px", backgroundColor: "#fff3cd", borderRadius: "6px", fontSize: "12px", borderLeft: "3px solid #ffc107" }}>
          <strong style={{ color: "#856404" }}>⚠️ Not compatible:</strong>
          <div style={{ marginTop: "6px", color: "#856404" }}>
            {allColumns
              .filter((col) => !validColumns.includes(col))
              .map((col) => (
                <div key={col} style={{ marginBottom: "3px" }}>
                  <strong>{col}:</strong> {getColumnReason(col, stepType, stepMethod, dataPreview)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
