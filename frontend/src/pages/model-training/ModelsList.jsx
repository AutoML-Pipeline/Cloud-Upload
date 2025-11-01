import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import styles from "./ModelsList.module.css";
import PageBackLink from "../../components/PageBackLink";

// Helper function to get a user-friendly model display name
const getModelDisplayName = (modelName) => {
  const modelNameMap = {
    "logistic_regression": "Logistic Regression",
    "random_forest_classifier": "Random Forest",
    "svm_classifier": "Support Vector Machine",
    "knn_classifier": "K-Nearest Neighbors",
    "xgboost_classifier": "XGBoost",
    "lightgbm_classifier": "LightGBM",
    "linear_regression": "Linear Regression",
    "random_forest_regressor": "Random Forest",
    "svm_regressor": "Support Vector Machine",
    "knn_regressor": "K-Nearest Neighbors",
    "xgboost_regressor": "XGBoost",
    "lightgbm_regressor": "LightGBM",
  };
  return modelNameMap[modelName] || modelName.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};


// Helper to get model algorithm family
const getModelFamily = (modelName) => {
  if (modelName.includes("logistic") || modelName.includes("linear")) return "Linear Models";
  if (modelName.includes("forest")) return "Ensemble Methods";
  if (modelName.includes("xgboost") || modelName.includes("lightgbm")) return "Gradient Boosting";
  if (modelName.includes("svm")) return "Support Vector";
  if (modelName.includes("knn")) return "Nearest Neighbors";
  return "Other";
};

// Helper to get algorithm icon
const getAlgorithmIcon = (family) => {
  const iconMap = {
    "Linear Models": "📊",
    "Ensemble Methods": "🌲",
    "Gradient Boosting": "⚡",
    "Support Vector": "🎯",
    "Nearest Neighbors": "🔍",
    "Other": "🤖"
  };
  return iconMap[family] || "🤖";
};

export default function ModelsList() {
  const navigate = useNavigate();
  const [selectedModel, setSelectedModel] = useState(null);
  const [filterType, setFilterType] = useState("all"); // all, classification, regression
  const [filterFamily, setFilterFamily] = useState("all");
  const [sortBy, setSortBy] = useState("date"); // date, accuracy, name

  // Fetch all trained models
  const { data: modelsData, isLoading, refetch } = useQuery({
    queryKey: ["trained-models"],
    queryFn: async () => {
      const response = await fetch("http://localhost:8000/api/model-training/training/models");
      if (!response.ok) throw new Error("Failed to fetch models");
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  const models = modelsData || [];

  // Enhanced models with computed properties
  const enhancedModels = useMemo(() => {
    if (!modelsData) return [];
    
    return modelsData.map(model => {
      const bestModelName = model.best_model?.model_name || "Unknown";
      const createdDate = model.created_at ? new Date(model.created_at) : null;
      const timestamp = createdDate && !isNaN(createdDate.getTime()) ? createdDate.getTime() : 0;
      
      return {
        ...model,
        displayName: getModelDisplayName(bestModelName),
        family: getModelFamily(bestModelName),
        icon: getAlgorithmIcon(getModelFamily(bestModelName)),
        mainMetric: model.problem_type === "classification" 
          ? model.best_model?.metrics?.accuracy 
          : model.best_model?.metrics?.r2_score,
        timestamp: timestamp,
        formattedDate: createdDate && !isNaN(createdDate.getTime()) 
          ? createdDate.toLocaleDateString() 
          : "Unknown",
        formattedDateTime: createdDate && !isNaN(createdDate.getTime()) 
          ? createdDate.toLocaleString() 
          : "Unknown"
      };
    });
  }, [modelsData]);

  // Filter and sort models
  const filteredModels = useMemo(() => {
    let filtered = enhancedModels;

    // Filter by problem type
    if (filterType !== "all") {
      filtered = filtered.filter(m => m.problem_type === filterType);
    }

    // Filter by algorithm family
    if (filterFamily !== "all") {
      filtered = filtered.filter(m => m.family === filterFamily);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") return b.timestamp - a.timestamp;
      if (sortBy === "accuracy") return (b.mainMetric || 0) - (a.mainMetric || 0);
      if (sortBy === "name") return a.displayName.localeCompare(b.displayName);
      return 0;
    });

    return filtered;
  }, [enhancedModels, filterType, filterFamily, sortBy]);

  // Get unique algorithm families
  const algorithmFamilies = useMemo(() => {
    const families = new Set(enhancedModels.map(m => m.family));
    return ["all", ...Array.from(families)];
  }, [enhancedModels]);

  // Category statistics
  const stats = useMemo(() => {
    if (!modelsData) return { total: 0, classification: 0, regression: 0 };
    
    return {
      total: modelsData.length,
      classification: modelsData.filter(m => m.problem_type === "classification").length,
      regression: modelsData.filter(m => m.problem_type === "regression").length,
    };
  }, [modelsData]);

  const handleViewDetails = async (modelId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/model-training/training/models/${modelId}`
      );
      if (!response.ok) throw new Error("Failed to fetch model details");
      const details = await response.json();
      
      // Find the enhanced model data from the list to get formatted dates
      const enhancedModel = enhancedModels.find(m => m.model_id === modelId);
      
      // Merge enhanced data with detailed data
      const mergedDetails = {
        ...details,
        formattedDate: enhancedModel?.formattedDate || "Unknown",
        formattedDateTime: enhancedModel?.formattedDateTime || "Unknown",
      };
      
      setSelectedModel(mergedDetails);
    } catch (error) {
      toast.error("Failed to load model details");
      console.error(error);
    }
  };

  const handleDelete = async (modelId) => {
    if (!window.confirm("Are you sure you want to delete this model?")) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/model-training/training/models/${modelId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete model");
      toast.success("Model deleted successfully");
      refetch();
      if (selectedModel?.model_id === modelId) {
        setSelectedModel(null);
      }
    } catch (error) {
      toast.error("Failed to delete model");
      console.error(error);
    }
  };

  const handleMakePrediction = (modelId) => {
    navigate(`/predict?model_id=${modelId}`);
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          {/* Header */}
          <div className={styles.pageIntro}>
            <PageBackLink to="/dashboard" label="Dashboard" />
            <h1 className={styles.pageTitle}>🤖 ML Models Library</h1>
            <p className={styles.pageDescription}>
              Browse, manage, and deploy your trained machine learning models
            </p>
          </div>

          {/* Stats Overview */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📚</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.total}</div>
                <div className={styles.statLabel}>Total Models</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.classification}</div>
                <div className={styles.statLabel}>Classification</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.regression}</div>
                <div className={styles.statLabel}>Regression</div>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className={styles.controlsBar}>
            <div className={styles.filtersGroup}>
              <select 
                className={styles.filterSelect}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="classification">Classification</option>
                <option value="regression">Regression</option>
              </select>

              <select 
                className={styles.filterSelect}
                value={filterFamily}
                onChange={(e) => setFilterFamily(e.target.value)}
              >
                {algorithmFamilies.map(family => (
                  <option key={family} value={family}>
                    {family === "all" ? "All Algorithms" : family}
                  </option>
                ))}
              </select>

              <select 
                className={styles.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="accuracy">Sort by Performance</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>

            <button
              className={styles.trainNewButton}
              onClick={() => navigate("/model-training")}
            >
              <span className={styles.buttonIcon}>✨</span>
              Train New Model
            </button>
          </div>

          {/* Models Grid */}
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Loading your models...</p>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📦</div>
              <h3 className={styles.emptyTitle}>No Models Found</h3>
              <p className={styles.emptyText}>
                {models.length === 0 
                  ? "Get started by training your first machine learning model"
                  : "Try adjusting your filters to see more models"
                }
              </p>
              <button
                className={styles.trainNewButton}
                onClick={() => navigate("/model-training")}
              >
                <span className={styles.buttonIcon}>✨</span>
                Train Your First Model
              </button>
            </div>
          ) : (
            <div className={styles.modelsGrid}>
              {filteredModels.map((model) => {
                const metricName = model.problem_type === "classification" ? "Accuracy" : "R² Score";
                const metricValue = model.mainMetric ? (model.mainMetric * 100).toFixed(2) : "N/A";
                
                return (
                  <div
                    key={model.model_id}
                    className={styles.modelCard}
                    onClick={() => handleViewDetails(model.model_id)}
                  >
                    {/* Card Header */}
                    <div className={styles.modelCardHeader}>
                      <div className={styles.modelIconLarge}>
                        {model.icon}
                      </div>
                      <div className={styles.modelTypeBadge}>
                        {model.problem_type === "classification" ? "🎯 Classification" : "📈 Regression"}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className={styles.modelCardBody}>
                      <h3 className={styles.modelCardTitle}>
                        {model.displayName}
                      </h3>
                      <p className={styles.modelCardFamily}>
                        {model.family}
                      </p>
                      
                      {/* Performance Badge */}
                      <div className={styles.performanceBadge}>
                        <span className={styles.performanceLabel}>{metricName}</span>
                        <span className={styles.performanceValue}>
                          {metricValue !== "N/A" ? `${metricValue}%` : metricValue}
                        </span>
                      </div>

                      {/* Dataset Info */}
                      <div className={styles.datasetInfo}>
                        <div className={styles.infoRow}>
                          <span className={styles.infoIcon}>📊</span>
                          <span className={styles.infoText} title={model.filename}>
                            {model.filename.length > 25 
                              ? model.filename.substring(0, 25) + "..." 
                              : model.filename}
                          </span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoIcon}>🎯</span>
                          <span className={styles.infoText}>
                            Target: {model.target_column}
                          </span>
                        </div>
                        <div className={styles.infoRow}>
                          <span className={styles.infoIcon}>📅</span>
                          <span className={styles.infoText}>
                            {model.formattedDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className={styles.modelCardFooter}>
                      <button
                        className={styles.cardButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMakePrediction(model.model_id);
                        }}
                      >
                        🔮 Predict
                      </button>
                      <button
                        className={styles.cardButtonSecondary}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDetails(model.model_id);
                        }}
                      >
                        📋 Details
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Model Details Modal */}
          {selectedModel && (
            <div className={styles.modalOverlay} onClick={() => setSelectedModel(null)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>
                    {getModelDisplayName(selectedModel.best_model?.model_name || "Model")}
                  </h2>
                  <button 
                    className={styles.modalClose}
                    onClick={() => setSelectedModel(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {/* Quick Actions */}
                  <div className={styles.quickActions}>
                    <button
                      className={styles.actionButton}
                      onClick={() => handleMakePrediction(selectedModel.model_id)}
                    >
                      🔮 Make Predictions
                    </button>
                    <button
                      className={styles.actionButtonDanger}
                      onClick={() => {
                        handleDelete(selectedModel.model_id);
                        setSelectedModel(null);
                      }}
                    >
                      🗑️ Delete Model
                    </button>
                  </div>

                  {/* Model Info */}
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>📊 Model Information</h3>
                    <div className={styles.detailGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Algorithm:</span>
                        <span className={styles.detailValue}>
                          {getModelDisplayName(selectedModel.best_model?.model_name)}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Family:</span>
                        <span className={styles.detailValue}>
                          {getModelFamily(selectedModel.best_model?.model_name || "")}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Problem Type:</span>
                        <span className={styles.detailValue}>
                          {selectedModel.problem_type}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Dataset:</span>
                        <span className={styles.detailValue}>
                          {selectedModel.filename}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Target Column:</span>
                        <span className={styles.detailValue}>
                          {selectedModel.target_column}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Created:</span>
                        <span className={styles.detailValue}>
                          {selectedModel.formattedDateTime || "Unknown"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>📈 Performance Metrics</h3>
                    <div className={styles.metricsGrid}>
                      {Object.entries(selectedModel.best_model?.metrics || {}).map(
                        ([key, value]) => (
                          <div key={key} className={styles.metricCard}>
                            <div className={styles.metricLabel}>
                              {key.replace(/_/g, " ").toUpperCase()}
                            </div>
                            <div className={styles.metricValue}>
                              {typeof value === "number" ? value.toFixed(4) : value}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* All Models Comparison */}
                  <div className={styles.detailSection}>
                    <h3 className={styles.sectionTitle}>🤖 Model Comparison</h3>
                    <div className={styles.comparisonGrid}>
                      {selectedModel.all_models?.map((model) => {
                        const isBest = model.model_name === selectedModel.best_model?.model_name;
                        return (
                          <div
                            key={model.model_name}
                            className={`${styles.comparisonCard} ${isBest ? styles.comparisonCardBest : ""}`}
                          >
                            {isBest && <div className={styles.bestRibbon}>⭐ Best</div>}
                            <div className={styles.comparisonName}>
                              {getModelDisplayName(model.model_name)}
                            </div>
                            <div className={styles.comparisonMetric}>
                              {selectedModel.problem_type === "classification"
                                ? `Accuracy: ${(model.metrics?.accuracy * 100)?.toFixed(2)}%`
                                : `R²: ${model.metrics?.r2_score?.toFixed(4) || "N/A"}`}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
