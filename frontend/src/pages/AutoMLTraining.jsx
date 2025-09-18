import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import ShadcnNavbar from "../components/ShadcnNavbar";
import styles from "./AutoMLTraining.module.css";

const apiBase = "http://localhost:8000";

export default function AutoMLTraining() {
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState("");
  const [columns, setColumns] = useState([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [task, setTask] = useState("classification");
  const [timeLimit, setTimeLimit] = useState(300);
  const [presets, setPresets] = useState("medium_quality");
  const [loading, setLoading] = useState(false);
  const [loadingColumns, setLoadingColumns] = useState(false);
  
  // Training state
  const [currentJob, setCurrentJob] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  

  // Load files on mount
  useEffect(() => {
    fetchFiles();
  }, []);

  // Load columns when filename changes
  useEffect(() => {
    if (filename) {
      loadColumns();
    } else {
      setColumns([]);
      setTargetColumn("");
    }
  }, [filename]);

  // Poll job status when training
  useEffect(() => {
    if (polling && currentJob) {
      const interval = setInterval(() => {
        checkJobStatus();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [polling, currentJob]);

  const fetchFiles = async () => {
    try {
      const response = await fetch(`${apiBase}/api/automl/files`);
      const data = await response.json();
      setFiles(Array.isArray(data) ? data : []);
      if (data.length > 0 && !filename) {
        setFilename(data[0]);
      }
    } catch (error) {
      toast.error("Failed to load files");
      setFiles([]);
    }
  };

  const loadColumns = async () => {
    setLoadingColumns(true);
    try {
      const response = await fetch(`${apiBase}/api/automl/files/${encodeURIComponent(filename)}/columns`);
      const data = await response.json();
      setColumns(Array.isArray(data) ? data : []);
      setTargetColumn("");
    } catch (error) {
      toast.error("Failed to load columns");
      setColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const detectTaskType = async (columnName) => {
    if (!columnName) return;
    
    try {
      const response = await fetch(`${apiBase}/api/automl/files/${encodeURIComponent(filename)}/columns/${encodeURIComponent(columnName)}/task-type`);
      const data = await response.json();
      
      if (data.detected_task && data.detected_task !== task) {
        toast.info(`Auto-detected task type: ${data.detected_task} (${data.unique_values} unique values)`);
        setTask(data.detected_task);
      }
    } catch (error) {
      console.warn("Could not detect task type:", error);
    }
  };

  const startTraining = async () => {
    if (!filename || !targetColumn) {
      toast.error("Please select a file and target column");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/automl/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          task,
          target_column: targetColumn,
          time_limit: timeLimit,
          presets,
          eval_metric: null
        })
      });

      const data = await response.json();
      if (data.job_id) {
        setCurrentJob(data.job_id);
        setPolling(true);
        toast.success("AutoML training started!");
      } else {
        throw new Error(data.detail || "Failed to start training");
      }
    } catch (error) {
      toast.error(error.message || "Failed to start training");
    } finally {
      setLoading(false);
    }
  };

  const checkJobStatus = async () => {
    if (!currentJob) return;

    try {
      const response = await fetch(`${apiBase}/api/automl/status/${currentJob}`);
      const data = await response.json();
      setJobStatus(data);

      if (data.status === "done") {
        setPolling(false);
        toast.success("AutoML training completed!");
      } else if (data.status === "error") {
        setPolling(false);
        toast.error(`Training failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to check job status:", error);
    }
  };


  const cancelTraining = async () => {
    if (!currentJob) return;

    try {
      await fetch(`${apiBase}/api/automl/jobs/${currentJob}`, {
        method: "DELETE"
      });
      setPolling(false);
      setCurrentJob(null);
      setJobStatus(null);
      toast.success("Training cancelled");
    } catch (error) {
      toast.error("Failed to cancel training");
    }
  };

  const resetTraining = () => {
    setCurrentJob(null);
    setJobStatus(null);
    setPolling(false);
  };

  return (
    <div className={styles.pageShell}>
      <ShadcnNavbar />
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          <div className={styles.header}>
            <h1 className={styles.title}>Model Selection</h1>
          </div>

          {!currentJob ? (
            <div className={styles.configCard}>
              <h2 className={styles.cardTitle}>Training Configuration</h2>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Dataset</label>
                  <select 
                    className={styles.select} 
                    value={filename} 
                    onChange={(e) => setFilename(e.target.value)}
                  >
                    <option value="">Select a file...</option>
                    {files.map((file) => (
                      <option key={file} value={file}>{file}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Task Type</label>
                  <select 
                    className={styles.select} 
                    value={task} 
                    onChange={(e) => setTask(e.target.value)}
                  >
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Target Column</label>
                  <select 
                    className={styles.select} 
                    value={targetColumn} 
                    onChange={(e) => {
                      setTargetColumn(e.target.value);
                      detectTaskType(e.target.value);
                    }}
                    disabled={loadingColumns}
                  >
                    <option value="">Select target column...</option>
                    {columns.map((col) => (
                      <option key={col} value={col}>{col}</option>
                    ))}
                  </select>
                  {loadingColumns && <div className={styles.loadingText}>Loading columns...</div>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Time Limit (seconds)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={timeLimit} 
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    min="60"
                    max="3600"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Quality Preset</label>
                  <select 
                    className={styles.select} 
                    value={presets} 
                    onChange={(e) => setPresets(e.target.value)}
                  >
                    <option value="best_quality">Best Quality (slowest)</option>
                    <option value="high_quality">High Quality</option>
                    <option value="good_quality">Good Quality</option>
                    <option value="medium_quality">Medium Quality (recommended)</option>
                    <option value="optimize_for_deployment">Optimize for Deployment</option>
                  </select>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button 
                  className={styles.primaryButton}
                  onClick={startTraining}
                  disabled={loading || !filename || !targetColumn}
                >
                  {loading ? "Starting..." : "Start AutoML Training"}
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.trainingCard}>
              <div className={styles.trainingHeader}>
                <h2 className={styles.cardTitle}>Training Progress</h2>
                <button 
                  className={styles.cancelButton}
                  onClick={cancelTraining}
                  disabled={jobStatus?.status === "done"}
                >
                  Cancel
                </button>
              </div>

              {jobStatus && (
                <div className={styles.progressSection}>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                  <div className={styles.progressInfo}>
                    <span className={styles.progressText}>
                      {jobStatus.current_phase || "Initializing..."}
                    </span>
                    <span className={styles.progressPercent}>
                      {Math.round(jobStatus.progress)}%
                    </span>
                  </div>
                </div>
              )}

              {jobStatus?.status === "done" && (
                <div className={styles.resultsSection}>
                  <h3 className={styles.resultsTitle}>Training Results</h3>
                  <div className={styles.resultsGrid}>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>Best Model:</span>
                      <span className={styles.resultValue}>{jobStatus.best_model}</span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>Best Score:</span>
                      <span className={styles.resultValue}>{jobStatus.best_score?.toFixed(4)}</span>
                    </div>
                    <div className={styles.resultItem}>
                      <span className={styles.resultLabel}>Training Time:</span>
                      <span className={styles.resultValue}>
                        {jobStatus.training_time ? `${jobStatus.training_time.toFixed(1)}s` : "N/A"}
                      </span>
                    </div>
                  </div>

                  {jobStatus.leaderboard && (
                    <div className={styles.leaderboardSection}>
                      <h4 className={styles.leaderboardTitle}>Model Leaderboard</h4>
                      <div className={styles.leaderboard}>
                        <div className={styles.leaderboardHeader}>
                          <div>Rank</div>
                          <div>Model</div>
                          <div>Score</div>
                          <div>Fit Time</div>
                        </div>
                        {jobStatus.leaderboard.slice(0, 10).map((model, index) => (
                          <div key={index} className={styles.leaderboardRow}>
                            <div className={styles.leaderboardRank}>{index + 1}</div>
                            <div className={styles.leaderboardModel}>{model.model}</div>
                            <div className={styles.leaderboardScore}>{model.score_val?.toFixed(4) || "N/A"}</div>
                            <div className={styles.leaderboardTime}>{model.fit_time?.toFixed(2) || "N/A"}s</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}


                  <div className={styles.buttonGroup}>
                    <button 
                      className={styles.secondaryButton}
                      onClick={resetTraining}
                    >
                      Start New Training
                    </button>
                  </div>
                </div>
              )}

              {jobStatus?.status === "error" && (
                <div className={styles.errorSection}>
                  <h3 className={styles.errorTitle}>Training Failed</h3>
                  <div className={styles.errorMessage}>{jobStatus.error}</div>
                  <button 
                    className={styles.secondaryButton}
                    onClick={resetTraining}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
