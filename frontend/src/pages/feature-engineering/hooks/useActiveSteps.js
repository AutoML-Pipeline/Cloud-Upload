import { useMemo } from "react";
const formatColumns = (columns) => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return "All columns";
  }
  if (columns.length <= 3) {
    return columns.join(", ");
  }
  return `${columns.slice(0, 3).join(", ")} +${columns.length - 3} more`;
};

export const useActiveSteps = (steps) =>
  useMemo(() => {
    if (!steps) {
      return [];
    }

    const active = [];

    if (steps.scaling.enabled) {
      active.push({
        key: "scaling",
        title: "Scaling",
        details: `${steps.scaling.method} · ${formatColumns(steps.scaling.columns)}`,
        icon: "📈",
      });
    }

    if (steps.encoding.enabled) {
      active.push({
        key: "encoding",
        title: "Encoding",
        details: `${steps.encoding.method} · ${formatColumns(steps.encoding.columns)}`,
        icon: "🏷️",
      });
    }

    if (steps.binning.enabled) {
      active.push({
        key: "binning",
        title: "Binning",
        details: `${steps.binning.method} · ${formatColumns(steps.binning.columns)}`,
        icon: "📦",
      });
    }

    if (steps.featureCreation.polynomial.enabled) {
      active.push({
        key: "feature_creation_polynomial",
        title: "Polynomial features",
        details: `Degree ${steps.featureCreation.polynomial.degree} · ${formatColumns(
          steps.featureCreation.polynomial.columns,
        )}`,
        icon: "✨",
      });
    }

    if (steps.featureCreation.datetime.enabled) {
      active.push({
        key: "feature_creation_datetime",
        title: "Datetime decomposition",
        details: `${steps.featureCreation.datetime.datePart} · ${formatColumns(
          steps.featureCreation.datetime.columns,
        )}`,
        icon: "🕒",
      });
    }

    if (steps.selection.enabled) {
      active.push({
        key: "selection",
        title: "Feature selection",
        details: `${steps.selection.method} · ${formatColumns(steps.selection.columns)}`,
        icon: "🔍",
      });
    }

    return active;
  }, [steps]);
