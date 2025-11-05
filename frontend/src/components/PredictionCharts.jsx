import React, { useMemo } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * PredictionCharts - Beautiful visualization dashboard for prediction results
 * 
 * Features:
 * - Confidence Distribution (Bar Chart)
 * - Class Distribution (Donut Chart)
 * - Summary Statistics (Cards)
 * 
 * @param {Object} predictions - Prediction results from backend
 * @param {string} problemType - "classification" or "regression"
 */
export default function PredictionCharts({ predictions, problemType }) {
  // Calculate confidence distribution
  const confidenceDistribution = useMemo(() => {
    if (problemType !== "classification" || !predictions?.predictions) return null;

    const ranges = {
      "90-100%": 0,
      "80-90%": 0,
      "70-80%": 0,
      "60-70%": 0,
      "Below 60%": 0,
    };

    predictions.predictions.forEach((pred) => {
      if (pred.confidence !== null && pred.confidence !== undefined) {
        const conf = pred.confidence * 100;
        if (conf >= 90) ranges["90-100%"]++;
        else if (conf >= 80) ranges["80-90%"]++;
        else if (conf >= 70) ranges["70-80%"]++;
        else if (conf >= 60) ranges["60-70%"]++;
        else ranges["Below 60%"]++;
      }
    });

    return {
      labels: Object.keys(ranges),
      datasets: [
        {
          label: "Number of Predictions",
          data: Object.values(ranges),
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",   // green-500
            "rgba(59, 130, 246, 0.8)",  // blue-500
            "rgba(168, 85, 247, 0.8)",  // purple-500
            "rgba(249, 115, 22, 0.8)",  // orange-500
            "rgba(239, 68, 68, 0.8)",   // red-500
          ],
          borderColor: [
            "rgba(34, 197, 94, 1)",
            "rgba(59, 130, 246, 1)",
            "rgba(168, 85, 247, 1)",
            "rgba(249, 115, 22, 1)",
            "rgba(239, 68, 68, 1)",
          ],
          borderWidth: 2,
          borderRadius: 8,
        },
      ],
    };
  }, [predictions, problemType]);

  // Calculate class distribution
  const classDistribution = useMemo(() => {
    if (!predictions?.predictions) return null;

    const classCounts = {};
    predictions.predictions.forEach((pred) => {
      const predClass = String(pred.prediction);
      classCounts[predClass] = (classCounts[predClass] || 0) + 1;
    });

    // Sort by count descending and take top 10 for readability
    const sortedClasses = Object.entries(classCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    const colors = [
      "rgba(99, 102, 241, 0.8)",   // indigo-500
      "rgba(59, 130, 246, 0.8)",   // blue-500
      "rgba(16, 185, 129, 0.8)",   // emerald-500
      "rgba(168, 85, 247, 0.8)",   // purple-500
      "rgba(236, 72, 153, 0.8)",   // pink-500
      "rgba(249, 115, 22, 0.8)",   // orange-500
      "rgba(251, 191, 36, 0.8)",   // amber-500
      "rgba(14, 165, 233, 0.8)",   // sky-500
      "rgba(132, 204, 22, 0.8)",   // lime-500
      "rgba(244, 63, 94, 0.8)",    // rose-500
    ];

    return {
      labels: sortedClasses.map(([label]) => label),
      datasets: [
        {
          data: sortedClasses.map(([, count]) => count),
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.8', '1')),
          borderWidth: 2,
        },
      ],
    };
  }, [predictions]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (!predictions?.predictions) return null;

    const totalPreds = predictions.predictions.length;
    
    if (problemType === "classification") {
      const validConfidences = predictions.predictions
        .filter(p => p.confidence !== null && p.confidence !== undefined)
        .map(p => p.confidence);
      
      const avgConfidence = validConfidences.length > 0
        ? validConfidences.reduce((a, b) => a + b, 0) / validConfidences.length
        : 0;
      
      const maxConfidence = validConfidences.length > 0
        ? Math.max(...validConfidences)
        : 0;
      
      const minConfidence = validConfidences.length > 0
        ? Math.min(...validConfidences)
        : 0;

      const uniqueClasses = new Set(predictions.predictions.map(p => p.prediction)).size;

      return {
        avgConfidence: avgConfidence * 100,
        maxConfidence: maxConfidence * 100,
        minConfidence: minConfidence * 100,
        uniqueClasses,
        totalPredictions: totalPreds,
      };
    } else {
      // Regression
      const values = predictions.predictions.map(p => parseFloat(p.prediction)).filter(v => !isNaN(v));
      const avgValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const maxValue = values.length > 0 ? Math.max(...values) : 0;
      const minValue = values.length > 0 ? Math.min(...values) : 0;

      return {
        avgValue,
        maxValue,
        minValue,
        totalPredictions: totalPreds,
      };
    }
  }, [predictions, problemType]);

  // Chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        cornerRadius: 8,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: { size: 11 },
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          padding: 15,
          font: { size: 12 },
          usePointStyle: true,
          generateLabels: (chart) => {
            const data = chart.data;
            if (data.labels.length && data.datasets.length) {
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return {
                  text: `${label}: ${value} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i,
                };
              });
            }
            return [];
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (!predictions) return null;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Summary Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🔢</div>
            <div>
              <div className="text-sm font-medium text-indigo-600">Total Predictions</div>
              <div className="text-2xl font-bold text-indigo-900">{summaryStats?.totalPredictions || 0}</div>
            </div>
          </div>
        </div>

        {problemType === "classification" ? (
          <>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📊</div>
                <div>
                  <div className="text-sm font-medium text-emerald-600">Avg. Confidence</div>
                  <div className="text-2xl font-bold text-emerald-900">
                    {summaryStats?.avgConfidence.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">🎯</div>
                <div>
                  <div className="text-sm font-medium text-blue-600">Unique Classes</div>
                  <div className="text-2xl font-bold text-blue-900">{summaryStats?.uniqueClasses || 0}</div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">⚡</div>
                <div>
                  <div className="text-sm font-medium text-purple-600">Max Confidence</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {summaryStats?.maxConfidence.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📊</div>
                <div>
                  <div className="text-sm font-medium text-emerald-600">Average Value</div>
                  <div className="text-2xl font-bold text-emerald-900">
                    {summaryStats?.avgValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📈</div>
                <div>
                  <div className="text-sm font-medium text-blue-600">Maximum</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {summaryStats?.maxValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="text-3xl">📉</div>
                <div>
                  <div className="text-sm font-medium text-purple-600">Minimum</div>
                  <div className="text-2xl font-bold text-purple-900">
                    {summaryStats?.minValue.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confidence Distribution Chart (Classification Only) */}
        {problemType === "classification" && confidenceDistribution && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>📊</span>
              Confidence Distribution
            </h3>
            <div className="h-64">
              <Bar data={confidenceDistribution} options={barChartOptions} />
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Distribution of model confidence scores across all predictions
            </p>
          </div>
        )}

        {/* Class Distribution Chart */}
        {classDistribution && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span>🎯</span>
              {problemType === "classification" ? "Class Distribution" : "Value Distribution"}
            </h3>
            <div className="h-64">
              <Doughnut data={classDistribution} options={doughnutChartOptions} />
            </div>
            <p className="text-sm text-gray-500 mt-3">
              {problemType === "classification" 
                ? "Proportion of predictions across different classes"
                : "Distribution of predicted values (top 10)"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
