import { useMemo } from "react";

export const useActiveSteps = (preprocessingSteps) => {
  return useMemo(() => {
    const summary = [];

    if (preprocessingSteps.removeDuplicates) {
      summary.push({
        key: "removeDuplicates",
        title: "Remove duplicates",
        details: preprocessingSteps.removeDuplicatesColumns.length
          ? `Subset: ${preprocessingSteps.removeDuplicatesColumns.join(", ")}`
          : "Across all columns",
        icon: "🧹",
      });
    }

    if (preprocessingSteps.removeNulls) {
      summary.push({
        key: "removeNulls",
        title: "Remove nulls",
        details: preprocessingSteps.removeNullsColumns.length
          ? `Columns: ${preprocessingSteps.removeNullsColumns.join(", ")}`
          : "All columns",
        icon: "🚫",
      });
    }

    if (preprocessingSteps.fillNulls) {
      const strategies = Object.entries(preprocessingSteps.fillColumnStrategies || {})
        .map(([col, info]) => `${col}: ${info.strategy}${info.strategy === "custom" && info.value !== "" ? ` → ${info.value}` : ""}`);

      summary.push({
        key: "fillNulls",
        title: "Fill nulls",
        details: strategies.length ? strategies.join(", ") : "Smart fill across selected columns",
        icon: "🧴",
      });
    }

    if (preprocessingSteps.dropColumns) {
      summary.push({
        key: "dropColumns",
        title: "Drop columns",
        details: preprocessingSteps.dropColumnsColumns.length
          ? preprocessingSteps.dropColumnsColumns.join(", ")
          : "No columns selected yet",
        icon: "🗑️",
      });
    }

    if (preprocessingSteps.removeOutliers) {
      const cfg = preprocessingSteps.removeOutliersConfig || {};
      const scope = cfg.columns && cfg.columns.length ? `Columns: ${cfg.columns.join(", ")}` : "All numeric columns";
      summary.push({
        key: "removeOutliers",
        title: "Remove outliers",
        details: `${cfg.method?.toUpperCase() || "IQR"} (factor ${cfg.factor ?? 1.5}) · ${scope}`,
        icon: "📈",
      });
    }

    return summary;
  }, [preprocessingSteps]);
};
