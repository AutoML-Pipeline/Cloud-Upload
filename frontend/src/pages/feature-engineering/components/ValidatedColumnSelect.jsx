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
    <div style={{ marginTop: "10px" }}>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ fontSize: "13px", fontWeight: "600", color: "#333", display: "block", marginBottom: "6px" }}>
          {label}
        </label>
        
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={selected.length === validColumns.length && validColumns.length > 0}
              onChange={handleSelectAll}
              style={{ cursor: "pointer" }}
            />
            <span style={{ fontWeight: "600", color: "#222", fontSize: "13px" }}>Select All</span>
          </label>
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 50%, #dcfce7 100%)",
            border: "2px solid rgba(34, 197, 94, 0.2)",
            borderRadius: "10px",
            maxHeight: "320px",
            overflowY: "auto",
            padding: "0",
            boxShadow: "0 4px 16px rgba(34, 197, 94, 0.1)",
          }}
        >
          {validColumns.length === 0 ? (
            <div style={{ padding: "12px", textAlign: "center", color: "#64748b", fontSize: "12px", background: "rgba(248, 250, 252, 0.5)", borderRadius: "8px", margin: "8px" }}>
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
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(34, 197, 94, 0.1)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    background: isSelected 
                      ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)" 
                      : "rgba(255, 255, 255, 0.6)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    borderLeft: isSelected ? "3px solid #3b82f6" : "3px solid transparent",
                  }}
                  onClick={() => handleColumnToggle(col)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                      e.currentTarget.style.borderLeft = "3px solid rgba(34, 197, 94, 0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)";
                      e.currentTarget.style.borderLeft = "3px solid transparent";
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleColumnToggle(col)}
                    style={{ marginTop: "2px", cursor: "pointer" }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ 
                        fontWeight: "600", 
                        fontSize: "13px",
                        background: "linear-gradient(135deg, #1e293b, #475569)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text"
                      }}>{col}</span>
                      {nullCount > 0 && (
                        <span style={{ 
                          color: "#ffffff", 
                          fontSize: "10px", 
                          fontWeight: "600",
                          background: "linear-gradient(135deg, #ef4444, #dc2626)",
                          padding: "2px 6px",
                          borderRadius: "12px",
                          boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)"
                        }}>
                          {nullCount} nulls
                        </span>
                      )}
                    </div>

                    {allowColumnMethods && isSelected && availableMethods.length > 0 && (
                      <div style={{ marginBottom: "6px", marginTop: "6px" }}>
                        <select
                          value={selectedMethod || suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onColumnMethodChange?.(col, e.target.value);
                          }}
                          style={{
                            padding: "4px 8px",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                            color: "#ffffff",
                            fontWeight: "600",
                            cursor: "pointer",
                            fontSize: "11px",
                            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.3)"
                          }}
                        >
                          {availableMethods.map((method) => (
                            <option
                              key={method}
                              value={method}
                              style={{ color: "#111827", background: "#ffffff" }}
                            >
                              {method.charAt(0).toUpperCase() + method.slice(1).replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!allowColumnMethods && suggestedMethod && (
                      <div style={{ marginBottom: "5px" }}>
                        <select
                          value={suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: "4px 8px",
                            border: "2px solid transparent",
                            borderRadius: "6px",
                            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                            color: "#ffffff",
                            fontWeight: "600",
                            cursor: "not-allowed",
                            fontSize: "11px",
                            opacity: "0.8",
                            boxShadow: "0 2px 8px rgba(59, 130, 246, 0.2)"
                          }}
                          disabled
                        >
                          <option
                            value={suggestedMethod}
                            style={{ color: "#111827", background: "#ffffff" }}
                          >
                            {suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1)}
                          </option>
                        </select>
                      </div>
                    )}

                    <div style={{ 
                      fontSize: "11px", 
                      fontWeight: "600", 
                      marginBottom: "3px",
                      background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text"
                    }}>
                      ✨ Suggested: {suggestedMethod ? suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1) : "N/A"}
                    </div>

                    <div style={{ 
                      fontSize: "11px", 
                      color: "#64748b", 
                      lineHeight: "1.4",
                      background: "rgba(248, 250, 252, 0.8)",
                      padding: "4px 6px",
                      borderRadius: "6px",
                      border: "1px solid rgba(148, 163, 184, 0.2)"
                    }}>
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
        <div style={{ 
          marginTop: "10px", 
          padding: "8px 10px", 
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)", 
          borderRadius: "8px", 
          fontSize: "11px", 
          borderLeft: "4px solid #f59e0b",
          boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)"
        }}>
          <strong style={{ 
            background: "linear-gradient(135deg, #92400e, #b45309)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>⚠️ Not compatible:</strong>
          <div style={{ marginTop: "5px", color: "#92400e" }}>
            {allColumns
              .filter((col) => !validColumns.includes(col))
              .map((col) => (
                <div key={col} style={{ marginBottom: "2px" }}>
                  <strong>{col}:</strong> {getColumnReason(col, stepType, stepMethod, dataPreview)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
