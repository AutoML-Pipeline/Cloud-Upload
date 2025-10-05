export const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "--";
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(numeric) / Math.log(1024)), units.length - 1);
  const value = numeric / Math.pow(1024, exponent);
  const precision = value >= 100 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

export const formatDateTime = (input) => {
  if (!input) return "--";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export const buildStepsPayload = (preprocessingSteps) => {
  const payload = {};

  if (preprocessingSteps.removeDuplicates) {
    payload.removeDuplicates = true;
    payload.duplicateSubset = preprocessingSteps.removeDuplicatesColumns;
  }

  if (preprocessingSteps.removeNulls) {
    payload.removeNulls = true;
    payload.removeNullsColumns = preprocessingSteps.removeNullsColumns;
  }

  if (preprocessingSteps.fillNulls) {
    payload.fillNulls = true;
    payload.fillStrategies = {};

    for (const col of preprocessingSteps.fillNullsColumns) {
      const strategyInfo = preprocessingSteps.fillColumnStrategies[col];
      if (strategyInfo) {
        payload.fillStrategies[col] = {
          strategy: strategyInfo.strategy,
          value: strategyInfo.strategy === "custom" ? strategyInfo.value : undefined,
        };
      }
    }
  }

  if (preprocessingSteps.dropColumns) {
    payload.dropColumns = preprocessingSteps.dropColumnsColumns;
  }

  if (preprocessingSteps.removeOutliers) {
    payload.removeOutliers = true;
    payload.removeOutliersConfig = {
      method: preprocessingSteps.removeOutliersConfig.method,
      factor: preprocessingSteps.removeOutliersConfig.factor,
      columns: preprocessingSteps.removeOutliersConfig.columns,
    };
  }

  return payload;
};
