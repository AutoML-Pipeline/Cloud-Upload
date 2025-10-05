export const INITIAL_STEPS = {
  scaling: {
    enabled: false,
    method: "standard",
    columns: [],
  },
  encoding: {
    enabled: false,
    method: "one-hot",
    columns: [],
  },
  binning: {
    enabled: false,
    method: "equal-width",
    bins: 5,
    columns: [],
  },
  featureCreation: {
    polynomial: {
      enabled: false,
      degree: 2,
      columns: [],
    },
    datetime: {
      enabled: false,
      datePart: "year",
      columns: [],
    },
  },
  selection: {
    enabled: false,
    method: "correlation_filter",
    threshold: 0.95,
    n_components: 2,
    columns: [],
  },
};

const describeColumns = (columns) => {
  if (!Array.isArray(columns) || columns.length === 0) {
    return "All columns";
  }
  if (columns.length <= 3) {
    return columns.join(", ");
  }
  return `${columns.slice(0, 3).join(", ")} +${columns.length - 3} more`;
};

export const buildStepsPayload = (steps) => {
  const payload = [];

  if (steps.scaling.enabled) {
    payload.push({
      id: "scaling",
      type: "scaling",
      method: steps.scaling.method,
      columns: steps.scaling.columns,
    });
  }

  if (steps.encoding.enabled) {
    payload.push({
      id: "encoding",
      type: "encoding",
      method: steps.encoding.method,
      columns: steps.encoding.columns,
    });
  }

  if (steps.binning.enabled) {
    payload.push({
      id: "binning",
      type: "binning",
      method: steps.binning.method,
      bins: Number(steps.binning.bins) || 5,
      columns: steps.binning.columns,
    });
  }

  if (steps.featureCreation.polynomial.enabled) {
    payload.push({
      id: "feature_creation_polynomial",
      type: "feature_creation",
      method: "polynomial",
      degree: Number(steps.featureCreation.polynomial.degree) || 2,
      columns: steps.featureCreation.polynomial.columns,
    });
  }

  if (steps.featureCreation.datetime.enabled) {
    payload.push({
      id: "feature_creation_datetime",
      type: "feature_creation",
      method: "datetime_decomposition",
      date_part: steps.featureCreation.datetime.datePart,
      columns: steps.featureCreation.datetime.columns,
    });
  }

  if (steps.selection.enabled) {
    const entry = {
      id: "feature_selection",
      type: "feature_selection",
      method: steps.selection.method,
      columns: steps.selection.columns,
    };

    if (steps.selection.method === "pca") {
      entry.n_components = Number(steps.selection.n_components) || 2;
    } else {
      entry.threshold = Number(steps.selection.threshold) || 0.95;
    }

    payload.push(entry);
  }

  return payload;
};

export const deriveStatsCards = (result, activeStepCount) => {
  if (!result) {
    return [
      { label: "Original rows", value: "--", tone: "muted" },
      { label: "Engineered rows", value: "--", tone: "muted" },
      { label: "Columns added", value: "--", tone: "muted" },
      { label: "Steps applied", value: String(activeStepCount), tone: "muted" },
    ];
  }

  const addedColumns = result.column_summary?.added?.length ?? 0;
  const removedColumns = result.column_summary?.removed?.length ?? 0;

  return [
    {
      label: "Original rows",
      value: result.original_row_count?.toLocaleString() ?? "--",
      tone: "neutral",
    },
    {
      label: "Engineered rows",
      value: result.engineered_row_count?.toLocaleString() ?? "--",
      tone: "success",
    },
    {
      label: "Columns added",
      value: String(addedColumns),
      tone: addedColumns > 0 ? "info" : "muted",
    },
    {
      label: "Columns removed",
      value: String(removedColumns),
      tone: removedColumns > 0 ? "warning" : "muted",
    },
  ];
};

export const summarizeStepDetails = (label, columns) => `${label}: ${describeColumns(columns)}`;

export { formatDateTime, formatFileSize } from "../../preprocessing/utils";
