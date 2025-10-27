export const getColumnValidators = (dataPreview) => {
  if (!dataPreview) return {};

  const dtypes = dataPreview.dtypes || {};
  const nullCounts = dataPreview.null_counts || {};  // Now from FULL dataset

  const validators = {
    scaling: {
      isValid: (col) => {
        const dtype = dtypes[col];
        return dtype && (dtype.includes("int") || dtype.includes("float"));
      },
      reason: (col) => {
        const dtype = dtypes[col];
        const nulls = nullCounts[col] || 0;
        if (!dtype || (!dtype.includes("int") && !dtype.includes("float"))) {
          return "Cannot scale non-numeric columns";
        }
        if (nulls > 0) {
          return `Numeric column (${nulls} nulls) - good for scaling`;
        }
        return "Numeric column - good for scaling";
      },
      suggestion: () => "standard",
    },

    encoding: {
      isValid: (col) => {
        const dtype = dtypes[col];
        if (!dtype) return false;
        const isNumeric = dtype.includes("int") || dtype.includes("float");
        const isDatetime = dtype.includes("datetime");
        return !isNumeric && !isDatetime;
      },
      reason: (col) => {
        const dtype = dtypes[col];
        const nulls = nullCounts[col] || 0;
        if (dtype && (dtype.includes("int") || dtype.includes("float"))) {
          return "Already numeric - no encoding needed";
        }
        if (dtype && dtype.includes("datetime")) {
          return "Use DateTime Decomposition instead";
        }
        if (nulls > 0) {
          return `Categorical/Text column (${nulls} nulls) - good for encoding`;
        }
        return "Categorical/Text column - good for encoding";
      },
      suggestion: (col) => {
        // Use full dataset cardinality (unique values) to recommend appropriate encoding
        // This prevents memory crashes with high-cardinality columns
        const cardinality = dataPreview?.cardinality?.[col] || 0;
        
        // Low cardinality (≤100 unique): One-hot is safe
        if (cardinality <= 100) {
          return "one-hot";
        }
        // High cardinality (>100 unique): Label encoding to prevent memory crash
        else {
          return "label";
        }
      },
    },

    binning: {
      isValid: (col) => {
        const dtype = dtypes[col];
        return dtype && (dtype.includes("int") || dtype.includes("float"));
      },
      reason: (col) => {
        const dtype = dtypes[col];
        if (!dtype || (!dtype.includes("int") && !dtype.includes("float"))) {
          return "Cannot bin non-numeric columns";
        }
        return "Numeric column - good for binning";
      },
      suggestion: () => "equal-width",
    },

    feature_creation: {
      polynomial: {
        isValid: (col) => {
          const dtype = dtypes[col];
          return dtype && (dtype.includes("int") || dtype.includes("float"));
        },
        reason: (col) => {
          const dtype = dtypes[col];
          if (!dtype || (!dtype.includes("int") && !dtype.includes("float"))) {
            return "Cannot create polynomial features from non-numeric columns";
          }
          return "Numeric column - good for polynomial expansion";
        },
      },
      datetime_decomposition: {
        isValid: (col) => {
          const dtype = dtypes[col];
          return dtype && dtype.includes("datetime");
        },
        reason: (col) => {
          const dtype = dtypes[col];
          if (!dtype || !dtype.includes("datetime")) {
            return "Only datetime columns can be decomposed";
          }
          return "DateTime column - good for decomposition";
        },
      },
    },

    feature_selection: {
      isValid: (col) => {
        const dtype = dtypes[col];
        return dtype && (dtype.includes("int") || dtype.includes("float"));
      },
      reason: (col) => {
        const dtype = dtypes[col];
        if (!dtype || (!dtype.includes("int") && !dtype.includes("float"))) {
          return "Feature selection works best on numeric features";
        }
        return "Numeric feature - good for selection";
      },
    },
  };

  return validators;
};

export const getValidColumnsForStep = (stepType, stepMethod, dataPreview) => {
  if (!dataPreview) return [];

  const dtypes = dataPreview.dtypes || {};
  const columns = Object.keys(dtypes);
  const validators = getColumnValidators(dataPreview);

  let validator = null;

  if (stepType === "scaling") {
    validator = validators.scaling;
  } else if (stepType === "encoding") {
    validator = validators.encoding;
  } else if (stepType === "binning") {
    validator = validators.binning;
  } else if (stepType === "feature_creation") {
    validator = validators.feature_creation[stepMethod];
  } else if (stepType === "feature_selection") {
    validator = validators.feature_selection;
  }

  if (!validator) return columns;

  return columns.filter((col) => validator.isValid(col));
};

export const getColumnReason = (col, stepType, stepMethod, dataPreview) => {
  if (!dataPreview) return "";

  const validators = getColumnValidators(dataPreview);
  let validator = null;

  if (stepType === "scaling") {
    validator = validators.scaling;
  } else if (stepType === "encoding") {
    validator = validators.encoding;
  } else if (stepType === "binning") {
    validator = validators.binning;
  } else if (stepType === "feature_creation") {
    validator = validators.feature_creation[stepMethod];
  } else if (stepType === "feature_selection") {
    validator = validators.feature_selection;
  }

  if (!validator || !validator.reason) return "";
  return validator.reason(col);
};

export const getSuggestedMethod = (col, stepType, dataPreview) => {
  if (!dataPreview) return null;

  const validators = getColumnValidators(dataPreview);

  if (stepType === "scaling" && validators.scaling.suggestion) {
    return validators.scaling.suggestion(col);
  } else if (stepType === "encoding" && validators.encoding.suggestion) {
    return validators.encoding.suggestion(col);
  } else if (stepType === "binning" && validators.binning.suggestion) {
    return validators.binning.suggestion(col);
  }

  return null;
};
