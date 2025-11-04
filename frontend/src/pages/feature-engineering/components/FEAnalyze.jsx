import React, { useEffect, useMemo, useState, useCallback } from "react";
import RecommendationPanel from "./RecommendationPanel";

// Displays recommendations + handles apply/undo actions without starting the job
export default function FEAnalyze({
  selectedFile,
  steps,
  onChangeSteps,
  startAnalyze, // from hook
}) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [dataQualityNotes, setDataQualityNotes] = useState([]);

  useEffect(() => {
    let active = true;
    if (!selectedFile) {
      setRecommendations([]);
      setDataQualityNotes([]);
      return () => {};
    }
    setLoading(true);
    startAnalyze(selectedFile)
      .then((data) => {
        if (!active) return;
        setRecommendations(data.step_recommendations || []);
        setDataQualityNotes(data.data_quality_notes || []);
      })
      .catch(() => {
        if (!active) return;
        setRecommendations([]);
        setDataQualityNotes([]);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [selectedFile, startAnalyze]);

  const appliedMap = useMemo(() => {
    if (!Array.isArray(recommendations)) return {};
    const current = steps;
    const isSubset = (arr, sub) => (sub || []).every((c) => arr.includes(c));
    const isHighCard = (name) => /high[- ]?cardinality/i.test(name || "");
    return recommendations.reduce((acc, rec, idx) => {
      let applied = false;
      const cols = rec.recommended_columns || [];
      switch (rec.step_type) {
        case "encoding": {
          applied = current.encoding.enabled && isSubset(current.encoding.columns, cols);
          if (applied && isHighCard(rec.step_name)) {
            applied = cols.every((c) => (current.encoding.columnMethods || {})[c] === "label");
          }
          break;
        }
        case "scaling":
          applied = current.scaling.enabled && isSubset(current.scaling.columns, cols);
          break;
        case "binning":
          applied = current.binning.enabled && isSubset(current.binning.columns, cols);
          break;
        case "feature_creation": {
          if (/polynomial/i.test(rec.step_name)) {
            applied = current.featureCreation.polynomial.enabled && isSubset(current.featureCreation.polynomial.columns, cols);
          } else if (/date|time/i.test(rec.step_name)) {
            applied = current.featureCreation.datetime.enabled && isSubset(current.featureCreation.datetime.columns, cols);
          }
          break;
        }
        case "feature_selection":
          applied = current.selection.enabled;
          break;
        default:
          applied = false;
      }
      acc[idx] = applied;
      return acc;
    }, {});
  }, [recommendations, steps]);

  const allApplied = useMemo(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return false;
    return recommendations.every((_, idx) => appliedMap[idx]);
  }, [recommendations, appliedMap]);

  const handleApplyStep = useCallback((idx, rec) => {
    onChangeSteps((prev) => {
      const cols = rec.recommended_columns || [];
      const union = (a, b) => Array.from(new Set([...(a || []), ...b]));
      const next = { ...prev };
      switch (rec.step_type) {
        case "encoding": {
          next.encoding = {
            ...prev.encoding,
            enabled: true,
            columns: union(prev.encoding.columns, cols),
            columnMethods: { ...(prev.encoding.columnMethods || {}) },
          };
          if (/high[- ]?cardinality/i.test(rec.step_name)) {
            cols.forEach((c) => {
              next.encoding.columnMethods[c] = "label";
            });
          }
          break;
        }
        case "scaling":
          next.scaling = { ...prev.scaling, enabled: true, columns: union(prev.scaling.columns, cols) };
          break;
        case "binning":
          next.binning = { ...prev.binning, enabled: true, columns: union(prev.binning.columns, cols) };
          break;
        case "feature_creation":
          if (/polynomial/i.test(rec.step_name)) {
            next.featureCreation = {
              ...prev.featureCreation,
              polynomial: { ...prev.featureCreation.polynomial, enabled: true, columns: union(prev.featureCreation.polynomial.columns, cols) },
            };
          } else if (/date|time/i.test(rec.step_name)) {
            next.featureCreation = {
              ...prev.featureCreation,
              datetime: { ...prev.featureCreation.datetime, enabled: true, columns: union(prev.featureCreation.datetime.columns, cols) },
            };
          }
          break;
        case "feature_selection":
          next.selection = { ...prev.selection, enabled: true };
          break;
        default:
          return prev;
      }
      return next;
    });
  }, [onChangeSteps]);

  const handleUndoStep = useCallback((idx, rec) => {
    onChangeSteps((prev) => {
      const cols = rec.recommended_columns || [];
      const minus = (arr, b) => (arr || []).filter((x) => !b.includes(x));
      const next = { ...prev };
      switch (rec.step_type) {
        case "encoding": {
          const nextCols = minus(prev.encoding.columns, cols);
          const nextMethods = { ...(prev.encoding.columnMethods || {}) };
          cols.forEach((c) => {
            if (nextMethods[c] === "label") delete nextMethods[c];
          });
          next.encoding = {
            ...prev.encoding,
            columns: nextCols,
            enabled: nextCols.length > 0 ? prev.encoding.enabled : false,
            columnMethods: nextMethods,
          };
          break;
        }
        case "scaling": {
          const nextCols = minus(prev.scaling.columns, cols);
          next.scaling = { ...prev.scaling, columns: nextCols, enabled: nextCols.length > 0 ? prev.scaling.enabled : false };
          break;
        }
        case "binning": {
          const nextCols = minus(prev.binning.columns, cols);
          next.binning = { ...prev.binning, columns: nextCols, enabled: nextCols.length > 0 ? prev.binning.enabled : false };
          break;
        }
        case "feature_creation": {
          if (/polynomial/i.test(rec.step_name)) {
            const nextCols = minus(prev.featureCreation.polynomial.columns, cols);
            next.featureCreation = {
              ...prev.featureCreation,
              polynomial: { ...prev.featureCreation.polynomial, columns: nextCols, enabled: nextCols.length > 0 ? prev.featureCreation.polynomial.enabled : false },
            };
          } else if (/date|time/i.test(rec.step_name)) {
            const nextCols = minus(prev.featureCreation.datetime.columns, cols);
            next.featureCreation = {
              ...prev.featureCreation,
              datetime: { ...prev.featureCreation.datetime, columns: nextCols, enabled: nextCols.length > 0 ? prev.featureCreation.datetime.enabled : false },
            };
          }
          break;
        }
        case "feature_selection":
          next.selection = { ...prev.selection, enabled: false };
          break;
        default:
          return prev;
      }
      return next;
    });
  }, [onChangeSteps]);

  const handleApplyAll = useCallback(() => {
    if (!Array.isArray(recommendations) || recommendations.length === 0) return;
    onChangeSteps((prev) => {
      const union = (a, b) => Array.from(new Set([...(a || []), ...b]));
      let next = { ...prev };
      for (const rec of recommendations) {
        const cols = rec.recommended_columns || [];
        switch (rec.step_type) {
          case "encoding": {
            const updated = {
              ...next.encoding,
              enabled: true,
              columns: union(next.encoding.columns, cols),
              columnMethods: { ...(next.encoding.columnMethods || {}) },
            };
            if (/high[- ]?cardinality/i.test(rec.step_name)) {
              cols.forEach((c) => { updated.columnMethods[c] = "label"; });
            }
            next = { ...next, encoding: updated };
            break;
          }
          case "scaling":
            next = { ...next, scaling: { ...next.scaling, enabled: true, columns: union(next.scaling.columns, cols) } };
            break;
          case "binning":
            next = { ...next, binning: { ...next.binning, enabled: true, columns: union(next.binning.columns, cols) } };
            break;
          case "feature_creation":
            if (/polynomial/i.test(rec.step_name)) {
              next = {
                ...next,
                featureCreation: {
                  ...next.featureCreation,
                  polynomial: { ...next.featureCreation.polynomial, enabled: true, columns: union(next.featureCreation.polynomial.columns, cols) },
                },
              };
            } else if (/date|time/i.test(rec.step_name)) {
              next = {
                ...next,
                featureCreation: {
                  ...next.featureCreation,
                  datetime: { ...next.featureCreation.datetime, enabled: true, columns: union(next.featureCreation.datetime.columns, cols) },
                },
              };
            }
            break;
          case "feature_selection":
            next = { ...next, selection: { ...next.selection, enabled: true } };
            break;
          default:
            break;
        }
      }
      return next;
    });
  }, [recommendations, onChangeSteps]);

  return (
    <RecommendationPanel
      recommendations={recommendations}
      dataQualityNotes={dataQualityNotes}
      loading={loading}
      appliedMap={appliedMap}
      allApplied={allApplied}
      onApplyAll={handleApplyAll}
      onApplyStep={handleApplyStep}
      onUndoStep={handleUndoStep}
    />
  );
}
