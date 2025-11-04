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
    <div className="mt-2.5">
      <div className="mb-2.5">
        <label className="text-[13px] font-semibold text-gray-800 block mb-1.5">
          {label}
        </label>
        
        <div className="mb-2.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.length === validColumns.length && validColumns.length > 0}
              onChange={handleSelectAll}
              className="cursor-pointer"
            />
            <span className="font-semibold text-gray-900 text-[13px]">Select All</span>
          </label>
        </div>

        <div className="bg-gradient-to-br from-white via-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-lg max-h-80 overflow-y-auto p-0 shadow-md">
          {validColumns.length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-xs bg-slate-50 rounded-md m-2">
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
                  className={`group p-2.5 border-b border-emerald-100 flex items-start gap-2.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-l-4 border-l-blue-500' : 'bg-white/60 hover:bg-white/90 hover:border-l-4 hover:border-l-emerald-300'
                  }`}
                  onClick={() => handleColumnToggle(col)}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleColumnToggle(col)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-semibold text-[13px] bg-gradient-to-br from-slate-800 to-slate-500 bg-clip-text text-transparent">{col}</span>
                      {nullCount > 0 && (
                        <span className="text-white text-[10px] font-semibold bg-gradient-to-br from-red-500 to-red-600 px-1.5 py-0.5 rounded-2xl shadow">
                          {nullCount} nulls
                        </span>
                      )}
                    </div>

                    {allowColumnMethods && isSelected && availableMethods.length > 0 && (
                      <div className="my-1.5">
                        <select
                          value={selectedMethod || suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            e.stopPropagation();
                            onColumnMethodChange?.(col, e.target.value);
                          }}
                          className="px-2 py-1 border-2 border-transparent rounded bg-gradient-to-br from-blue-500 to-violet-500 text-white font-semibold cursor-pointer text-[11px] shadow"
                        >
                          {availableMethods.map((method) => (
                            <option key={method} value={method} className="text-gray-900 bg-white">
                              {method.charAt(0).toUpperCase() + method.slice(1).replace("-", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!allowColumnMethods && suggestedMethod && (
                      <div className="mb-1.5">
                        <select
                          value={suggestedMethod}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 border-2 border-transparent rounded bg-gradient-to-br from-blue-500 to-violet-500 text-white font-semibold cursor-not-allowed text-[11px] opacity-80 shadow"
                          disabled
                        >
                          <option value={suggestedMethod} className="text-gray-900 bg-white">
                            {suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1)}
                          </option>
                        </select>
                      </div>
                    )}

                    <div className="text-[11px] font-semibold mb-0.5 bg-gradient-to-br from-blue-500 to-violet-500 bg-clip-text text-transparent">
                      ✨ Suggested: {suggestedMethod ? suggestedMethod.charAt(0).toUpperCase() + suggestedMethod.slice(1) : "N/A"}
                    </div>

                    <div className="text-[11px] text-slate-500 leading-tight bg-slate-50/80 px-1.5 py-1 rounded border border-slate-300/20">
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
        <div className="mt-2.5 px-2.5 py-2 bg-gradient-to-br from-amber-100 to-amber-200 rounded text-[11px] border-l-4 border-amber-500 shadow">
          <strong className="bg-gradient-to-br from-amber-800 to-amber-600 bg-clip-text text-transparent">⚠️ Not compatible:</strong>
          <div className="mt-1.5 text-amber-800">
            {allColumns
              .filter((col) => !validColumns.includes(col))
              .map((col) => (
                <div key={col} className="mb-0.5">
                  <strong>{col}:</strong> {getColumnReason(col, stepType, stepMethod, dataPreview)}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
