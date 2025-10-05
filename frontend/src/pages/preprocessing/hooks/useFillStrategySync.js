import { useEffect } from "react";

export const useFillStrategySync = ({
  selectedColumns,
  setPreprocessingSteps,
}) => {
  useEffect(() => {
    setPreprocessingSteps((prev) => {
      const nextStrategies = { ...prev.fillColumnStrategies };
      const currentSelected = selectedColumns || [];

      currentSelected.forEach((col) => {
        if (!nextStrategies[col]) {
          nextStrategies[col] = { strategy: "mean", value: "" };
        }
      });

      Object.keys(nextStrategies).forEach((col) => {
        if (!currentSelected.includes(col)) {
          delete nextStrategies[col];
        }
      });

      return { ...prev, fillColumnStrategies: nextStrategies };
    });
  }, [selectedColumns, setPreprocessingSteps]);
};
