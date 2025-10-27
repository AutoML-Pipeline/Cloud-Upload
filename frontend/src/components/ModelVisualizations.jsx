import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Radar, Line } from "react-chartjs-2";
import styles from "./ModelVisualizations.module.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function ModelVisualizations({ trainingResult }) {
  const { problem_type, models_trained, best_model } = trainingResult;

  // Performance Comparison Bar Chart Data
  const performanceChartData = useMemo(() => {
    if (!models_trained) return null;

    const labels = models_trained.map((m) => m.model_name);
    const primaryMetric =
      problem_type === "classification" ? "accuracy" : "r2_score";

    const data = models_trained.map((m) => {
      const value = m.metrics?.[primaryMetric];
      return value !== undefined ? value : 0;
    });

    // Color best model differently
    const backgroundColors = models_trained.map((m) =>
      m.is_best ? "rgba(34, 197, 94, 0.8)" : "rgba(59, 130, 246, 0.6)"
    );
    const borderColors = models_trained.map((m) =>
      m.is_best ? "rgba(34, 197, 94, 1)" : "rgba(59, 130, 246, 1)"
    );

    return {
      labels,
      datasets: [
        {
          label:
            problem_type === "classification"
              ? "Accuracy"
              : "R² Score",
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2,
        },
      ],
    };
  }, [models_trained, problem_type]);

  // Radar Chart Data (Multi-metric comparison)
  const radarChartData = useMemo(() => {
    if (!models_trained) return null;

    const metricKeys =
      problem_type === "classification"
        ? ["accuracy", "precision", "recall", "f1_score"]
        : ["r2_score"];

    const labels = metricKeys.map((key) =>
      key.replace(/_/g, " ").toUpperCase()
    );

    // Only show top 3 models + best model
    const topModels = [...models_trained]
      .sort((a, b) => {
        const primaryMetric =
          problem_type === "classification" ? "accuracy" : "r2_score";
        return (b.metrics?.[primaryMetric] || 0) - (a.metrics?.[primaryMetric] || 0);
      })
      .slice(0, 3);

    const datasets = topModels.map((model, idx) => {
      const colors = [
        "rgba(34, 197, 94, 0.6)",
        "rgba(59, 130, 246, 0.6)",
        "rgba(249, 115, 22, 0.6)",
      ];
      const borderColors = [
        "rgba(34, 197, 94, 1)",
        "rgba(59, 130, 246, 1)",
        "rgba(249, 115, 22, 1)",
      ];

      return {
        label: model.model_name,
        data: metricKeys.map((key) => model.metrics?.[key] || 0),
        backgroundColor: colors[idx],
        borderColor: borderColors[idx],
        borderWidth: 2,
        pointBackgroundColor: borderColors[idx],
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: borderColors[idx],
      };
    });

    return { labels, datasets };
  }, [models_trained, problem_type]);

  // Confusion Matrix Component
  const ConfusionMatrix = ({ matrix }) => {
    if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
      return <div className={styles.noData}>Confusion matrix not available</div>;
    }

    const size = matrix.length;
    const maxValue = Math.max(...matrix.flat());

    return (
      <div className={styles.confusionMatrixContainer}>
        <div className={styles.confusionMatrix} style={{ gridTemplateColumns: `repeat(${size + 1}, 1fr)` }}>
          {/* Top-left corner */}
          <div className={styles.matrixCorner}></div>
          
          {/* Predicted labels (top) */}
          {Array.from({ length: size }, (_, i) => (
            <div key={`pred-${i}`} className={styles.matrixLabel}>
              Pred {i}
            </div>
          ))}

          {/* Each row */}
          {matrix.map((row, i) => (
            <React.Fragment key={`row-${i}`}>
              {/* Actual label (left) */}
              <div className={styles.matrixLabel}>Actual {i}</div>
              
              {/* Values */}
              {row.map((value, j) => {
                const intensity = maxValue > 0 ? value / maxValue : 0;
                const isCorrect = i === j;
                return (
                  <div
                    key={`cell-${i}-${j}`}
                    className={`${styles.matrixCell} ${isCorrect ? styles.matrixCellCorrect : ""}`}
                    style={{
                      backgroundColor: isCorrect
                        ? `rgba(34, 197, 94, ${0.2 + intensity * 0.6})`
                        : `rgba(239, 68, 68, ${0.1 + intensity * 0.4})`,
                    }}
                  >
                    {value}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <div className={styles.matrixLegend}>
          <span>✓ Diagonal = Correct Predictions</span>
          <span>✗ Off-diagonal = Errors</span>
        </div>
      </div>
    );
  };

  // Feature Importance Component
  const FeatureImportance = ({ features }) => {
    if (!features || features.length === 0) {
      return <div className={styles.noData}>Feature importance not available for this model type</div>;
    }

    // Take top 10 features
    const topFeatures = features.slice(0, 10);

    const chartData = {
      labels: topFeatures.map((f) => f.feature),
      datasets: [
        {
          label: "Importance",
          data: topFeatures.map((f) => f.importance),
          backgroundColor: "rgba(139, 92, 246, 0.6)",
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 2,
        },
      ],
    };

    return (
      <Bar
        data={chartData}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
          scales: {
            x: {
              beginAtZero: true,
              title: { display: true, text: "Importance Score" },
            },
          },
        }}
      />
    );
  };

  // Residual Plot for Regression
  const ResidualPlot = ({ residuals }) => {
    if (!residuals || residuals.length === 0) {
      return <div className={styles.noData}>Residual data not available</div>;
    }

    const chartData = {
      datasets: [
        {
          label: "Residuals",
          data: residuals.map((r, idx) => ({ x: idx, y: r })),
          backgroundColor: "rgba(59, 130, 246, 0.5)",
          borderColor: "rgba(59, 130, 246, 1)",
          pointRadius: 3,
        },
      ],
    };

    return (
      <Line
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: false },
          },
          scales: {
            x: { title: { display: true, text: "Sample Index" } },
            y: { title: { display: true, text: "Residual" } },
          },
        }}
      />
    );
  };

  return (
    <div className={styles.visualizationsContainer}>
      {/* Performance Comparison Chart */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>
            📊 Model Performance Comparison
          </h3>
          <p className={styles.chartDescription}>
            {problem_type === "classification"
              ? "Accuracy scores across all models"
              : "R² scores across all models"}
          </p>
        </div>
        <div className={styles.chartBody}>
          {performanceChartData && (
            <Bar
              data={performanceChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(4)}`,
                    },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 1,
                    title: {
                      display: true,
                      text: problem_type === "classification" ? "Accuracy" : "R² Score",
                    },
                  },
                },
              }}
            />
          )}
        </div>
      </div>

      {/* Radar Chart - Multi-metric comparison (Classification only) */}
      {problem_type === "classification" && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>🎯 Multi-Metric Radar (Top 3 Models)</h3>
            <p className={styles.chartDescription}>
              Comprehensive comparison of accuracy, precision, recall, and F1 score
            </p>
          </div>
          <div className={styles.chartBody}>
            {radarChartData && (
              <Radar
                data={radarChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    r: {
                      beginAtZero: true,
                      max: 1,
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Confusion Matrix (Classification) */}
      {problem_type === "classification" && best_model?.confusion_matrix && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>🔢 Confusion Matrix (Best Model)</h3>
            <p className={styles.chartDescription}>
              Prediction accuracy breakdown for {best_model.model_name}
            </p>
          </div>
          <div className={styles.chartBody}>
            <ConfusionMatrix matrix={best_model.confusion_matrix} />
          </div>
        </div>
      )}

      {/* Residual Plot (Regression) */}
      {problem_type === "regression" && best_model?.residuals && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>📈 Residual Plot (Best Model)</h3>
            <p className={styles.chartDescription}>
              Prediction errors for {best_model.model_name}
            </p>
          </div>
          <div className={styles.chartBody} style={{ height: "300px" }}>
            <ResidualPlot residuals={best_model.residuals} />
          </div>
        </div>
      )}

      {/* Feature Importance */}
      {best_model?.feature_importance && (
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>⭐ Feature Importance (Top 10)</h3>
            <p className={styles.chartDescription}>
              Most influential features for {best_model.model_name}
            </p>
          </div>
          <div className={styles.chartBody} style={{ height: "400px" }}>
            <FeatureImportance features={best_model.feature_importance} />
          </div>
        </div>
      )}
    </div>
  );
}
