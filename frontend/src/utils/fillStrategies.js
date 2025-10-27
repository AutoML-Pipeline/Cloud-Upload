const NUMERIC_PATTERNS = /(int|float|double|decimal|number)/i;
const BOOLEAN_PATTERNS = /(bool)/i;
const DATE_PATTERNS = /(date|time|year|month)/i;
const CATEGORICAL_NAME_HINTS = /(id$|code$|type$|category|status|segment|group|class|flag|label)/i;
const MEAN_NAME_HINTS = /(avg|average|mean|ratio|rate|score|percent|percentage)/i;
const MEDIAN_NAME_HINTS = /(amount|price|cost|age|income|duration|time|value|size|weight|distance)/i;

const STRATEGY_LABELS = {
  mean: "Mean",
  median: "Median",
  mode: "Mode",
  custom: "Custom value",
};

const buildReason = (strategy, nuggets) => {
  const base = {
    mean: "Stable numeric series where average preserves scale.",
    median: "Resilient to spikes and skew in numeric data.",
    mode: "Keeps the most common category for consistency.",
    custom: "Best filled with a domain-specific default value.",
  }[strategy];

  return nuggets?.length ? `${base} ${nuggets.join(" ")}`.trim() : base;
};

export const getStrategyLabel = (strategy) => STRATEGY_LABELS[strategy] || strategy;

export const getRecommendedFillStrategy = ({
  columnName = "",
  dtype = "",
  sampleValue,
  nullCount,
}) => {
  const lowerName = columnName.toLowerCase();
  const type = (dtype || "").toLowerCase();
  const hints = [];

  const sampleType = sampleValue === null || sampleValue === undefined
    ? "unknown"
    : Array.isArray(sampleValue)
      ? "array"
      : typeof sampleValue;

  const isNumericType = NUMERIC_PATTERNS.test(type) || sampleType === "number";
  const isBoolean = BOOLEAN_PATTERNS.test(type) || sampleType === "boolean";
  const looksLikeDate = DATE_PATTERNS.test(type) || DATE_PATTERNS.test(lowerName) || sampleValue instanceof Date;
  const looksCategoricalByName = CATEGORICAL_NAME_HINTS.test(lowerName);

  const significantNulls = typeof nullCount === "number" && nullCount > 10;
  if (significantNulls) {
    hints.push("Higher missing count – choose a robust technique.");
  }

  if (looksLikeDate) {
    return {
      strategy: "mode",
      reason: buildReason("mode", ["Temporal columns typically repeat calendar values; mode keeps the most common date/time."] ),
    };
  }

  if (isBoolean) {
    return {
      strategy: "mode",
      reason: buildReason("mode", ["Boolean fields resolve cleanly to the majority class."] ),
    };
  }

  if (isNumericType) {
    if (MEAN_NAME_HINTS.test(lowerName)) {
      return {
        strategy: "mean",
        reason: buildReason("mean", ["Column name suggests calculated rates where averages stay meaningful.", ...hints]),
      };
    }

    if (MEDIAN_NAME_HINTS.test(lowerName)) {
      return {
        strategy: "median",
        reason: buildReason("median", ["Column tracks magnitudes that can spike; median resists outliers.", ...hints]),
      };
    }

    const isDiscreteInteger = type.includes("int") && !type.includes("float");
    if (isDiscreteInteger && looksCategoricalByName) {
      return {
        strategy: "mode",
        reason: buildReason("mode", ["Identifier-like integers are better filled with the most common label.", ...hints]),
      };
    }

    return {
      strategy: "median",
      reason: buildReason("median", ["Defaulting to median gives a sturdy central value for numeric columns.", ...hints]),
    };
  }

  if (looksCategoricalByName) {
    return {
      strategy: "mode",
      reason: buildReason("mode", ["Column behaves like a category; mode reinforces the prevailing class."] ),
    };
  }

  if (sampleType === "string" || sampleType === "array" || !type) {
    return {
      strategy: "mode",
      reason: buildReason("mode", ["Text categorical data is safest imputed with the most frequent entry."] ),
    };
  }

  return {
    strategy: "custom",
    reason: buildReason("custom", ["Review this feature to decide on a domain-appropriate default."] ),
  };
};