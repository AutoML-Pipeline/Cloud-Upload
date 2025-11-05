import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import saasToast from "@/utils/toast";
import { useNavigate } from "react-router-dom";
import styles from "./ModelsList.module.css";
import PageBackLink from "../../components/PageBackLink";
import PageHero from "../../components/PageHero";
import ConfirmDialog from "../../components/ConfirmDialog";
import { ChevronRight, ChevronDown, FileText, Target, Sparkles, Trash2, Eye } from "lucide-react";

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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);
  
  // Expansion state for hierarchical view
  const [expandedFiles, setExpandedFiles] = useState(new Set());
  const [expandedTargets, setExpandedTargets] = useState(new Set());

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

  // Hierarchical grouping: File > Target > Model Type
  const hierarchicalModels = useMemo(() => {
    const grouped = {};
    
    filteredModels.forEach(model => {
      const file = model.filename || "Unknown";
      const target = model.target_column || "Unknown";
      
      if (!grouped[file]) {
        grouped[file] = {};
      }
      if (!grouped[file][target]) {
        grouped[file][target] = [];
      }
      grouped[file][target].push(model);
    });
    
    return grouped;
  }, [filteredModels]);

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
  saasToast.error("Failed to load model details", { idKey: 'models-details-error' });
      console.error(error);
    }
  };

  const handleDelete = (modelId) => {
    setModelToDelete(modelId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!modelToDelete) return;

    try {
      const response = await fetch(
        `http://localhost:8000/api/model-training/training/models/${modelToDelete}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete model");
      saasToast.success("Model deleted successfully", { idKey: 'models-delete-success' });
      refetch();
      if (selectedModel?.model_id === modelToDelete) {
        setSelectedModel(null);
      }
    } catch (error) {
      saasToast.error("Failed to delete model", { idKey: 'models-delete-error' });
      console.error(error);
    } finally {
      setDeleteConfirmOpen(false);
      setModelToDelete(null);
    }
  };

  const handleMakePrediction = (modelId) => {
    navigate(`/predict?model_id=${modelId}`);
  };

  // Toggle expansion for hierarchical levels
  const toggleFileExpansion = (filename) => {
    setExpandedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
        // Also collapse all targets under this file
        setExpandedTargets(prevTargets => {
          const newTargets = new Set(prevTargets);
          Object.keys(hierarchicalModels[filename] || {}).forEach(target => {
            newTargets.delete(`${filename}::${target}`);
          });
          return newTargets;
        });
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const toggleTargetExpansion = (filename, target) => {
    const key = `${filename}::${target}`;
    setExpandedTargets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  return (
    <div className={styles.pageShell}>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          {/* Header */}
          <PageHero
            badge="WORKFLOW - MODEL TRAINING"
            title="Machine Learning Models Library"
            subtitle="Automatically train and compare multiple ML models to find the best performer for your dataset."
          />
          
          <div className="mt-4">
            <PageBackLink to="/dashboard" label="Dashboard" />
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
            <div className="space-y-3">
              {Object.entries(hierarchicalModels).map(([filename, targets]) => {
                const fileIsExpanded = expandedFiles.has(filename);
                const fileModelCount = Object.values(targets).flat().length;
                
                return (
                  <div key={filename} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {/* Level 1: File */}
                    <button
                      onClick={() => toggleFileExpansion(filename)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleFileExpansion(filename);
                        }
                      }}
                      aria-expanded={fileIsExpanded}
                      aria-controls={`file-${filename}`}
                      className="w-full bg-gray-100 hover:bg-gray-150 transition-all duration-300 ease-in-out p-4 flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="transition-transform duration-300 ease-in-out text-gray-600">
                          {fileIsExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </div>
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{filename}</span>
                        <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                          {fileModelCount} {fileModelCount === 1 ? 'model' : 'models'}
                        </span>
                      </div>
                    </button>

                    {/* Level 1 Content */}
                    {fileIsExpanded && (
                      <div id={`file-${filename}`} className="bg-gray-50">
                        {Object.entries(targets).map(([targetColumn, models]) => {
                          const targetKey = `${filename}::${targetColumn}`;
                          const targetIsExpanded = expandedTargets.has(targetKey);
                          
                          return (
                            <div key={targetKey} className="border-t border-gray-200">
                              {/* Level 2: Target Column */}
                              <button
                                onClick={() => toggleTargetExpansion(filename, targetColumn)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleTargetExpansion(filename, targetColumn);
                                  }
                                }}
                                aria-expanded={targetIsExpanded}
                                aria-controls={`target-${targetKey}`}
                                className="w-full bg-gray-50 hover:bg-gray-100 transition-all duration-300 ease-in-out p-4 pl-6 flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="transition-transform duration-300 ease-in-out text-gray-500">
                                    {targetIsExpanded ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </div>
                                  <Target className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-gray-800">Target: {targetColumn}</span>
                                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                                    {models.length} {models.length === 1 ? 'model' : 'models'}
                                  </span>
                                </div>
                              </button>

                              {/* Level 2 Content */}
                              {targetIsExpanded && (
                                <div id={`target-${targetKey}`} className="bg-white">
                                  {models.map((model) => {
                                    const metricName = model.problem_type === "classification" ? "Accuracy" : "R² Score";
                                    const metricValue = model.mainMetric ? (model.mainMetric * 100).toFixed(2) : "N/A";
                                    
                                    return (
                                      <div
                                        key={model.model_id}
                                        className="border-t border-gray-100 p-4 pl-12 hover:bg-gray-50 transition-all duration-200 ease-in-out"
                                      >
                                        {/* Level 3: Model Card */}
                                        <div className="flex items-center justify-between gap-4">
                                          {/* Model Info */}
                                          <div className="flex items-center gap-4 flex-1">
                                            <div className="text-2xl">{model.icon}</div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-gray-900">{model.displayName}</h4>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                  model.problem_type === "classification" 
                                                    ? "bg-purple-100 text-purple-700" 
                                                    : "bg-blue-100 text-blue-700"
                                                }`}>
                                                  {model.problem_type}
                                                </span>
                                              </div>
                                              <p className="text-sm text-gray-600 mt-0.5">{model.family}</p>
                                              <div className="flex items-center gap-4 mt-2">
                                                <div className="flex items-center gap-1 text-sm">
                                                  <span className="text-gray-500">{metricName}:</span>
                                                  <span className="font-semibold text-gray-900">
                                                    {metricValue !== "N/A" ? `${metricValue}%` : metricValue}
                                                  </span>
                                                </div>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-sm text-gray-500">{model.formattedDate}</span>
                                              </div>
                                            </div>
                                          </div>

                                          {/* Actions */}
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => handleMakePrediction(model.model_id)}
                                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                              style={{ color: '#ffffff' }}
                                            >
                                              <Sparkles className="w-4 h-4" />
                                              Predict
                                            </button>
                                            <button
                                              onClick={() => handleViewDetails(model.model_id)}
                                              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                              style={{ color: '#ffffff' }}
                                            >
                                              <Eye className="w-4 h-4" />
                                              Details
                                            </button>
                                            <button
                                              onClick={() => handleDelete(model.model_id)}
                                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:shadow-lg transform hover:scale-105 active:scale-95"
                                              title="Delete model"
                                              style={{ color: '#ffffff' }}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Model?"
        message="Are you sure you want to delete this model? This action cannot be undone and will permanently remove the model and all its data."
        confirmText="Delete"
        cancelText="Cancel"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false);
          setModelToDelete(null);
        }}
      />
    </div>
  );
}
