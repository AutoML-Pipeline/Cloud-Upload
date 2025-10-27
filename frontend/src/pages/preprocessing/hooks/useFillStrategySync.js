import { useEffect } from "react";
import { getRecommendedFillStrategy } from "../../../utils/fillStrategies";

export const useFillStrategySync = ({
  selectedColumns,
  setPreprocessingSteps,
  columnInsights = {},
}) => {
  useEffect(() => {
    setPreprocessingSteps((prev) => {
      const nextStrategies = { ...prev.fillColumnStrategies };
      const currentSelected = selectedColumns || [];

      currentSelected.forEach((col) => {
        if (!nextStrategies[col]) {
          const recommendation = getRecommendedFillStrategy({
            columnName: col,
            dtype: columnInsights[col]?.dtype,
            sampleValue: columnInsights[col]?.sampleValue,
            nullCount: columnInsights[col]?.nullCount,
          });

          nextStrategies[col] = {
            strategy: recommendation.strategy,
            value: "",
          };
        }
      });

      Object.keys(nextStrategies).forEach((col) => {
        if (!currentSelected.includes(col)) {
          delete nextStrategies[col];
        }
      });

      return { ...prev, fillColumnStrategies: nextStrategies };
    });
  }, [selectedColumns, setPreprocessingSteps, columnInsights]);
};
