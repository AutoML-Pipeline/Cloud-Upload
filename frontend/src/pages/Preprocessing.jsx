import React, { useEffect, useState, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import ShadcnNavbar from "../components/ShadcnNavbar";
import GlobalBackButton from "../components/GlobalBackButton";
import FloatingFilesPanel from '../components/FloatingFilesPanel';
import FormField from "../components/FormField";
import { toast } from 'react-hot-toast';
import styles from "./Preprocessing.module.css";
import DataTable from "../components/DataTable";
import ColumnMultiSelect from "../components/ColumnMultiSelect";
import ColumnDragReorder from "../components/ColumnDragReorder";

export default function Preprocessing() {
  const { data: filesData } = useQuery({
    queryKey: ['files', 'list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/files/list');
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const [selectedFile, setSelectedFile] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [manualSteps, setManualSteps] = useState({
    removeDuplicates: true,
    removeNulls: false,
    fillNulls: false,
    fillStrategy: 'mean',
    dropColumns: [],
    encodeCategorical: [],
    encodingMethod: 'onehot',
    scaleNumeric: [],
    scalingMethod: 'minmax',
    outlierColumns: [],
    outlierMethod: 'iqr',
    reorderColumns: [],
  });
  const [highlightChanges, setHighlightChanges] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [fullData, setFullData] = useState(null);
  const [dataPreview, setDataPreview] = useState(null);
  // Remove isMobile, previewTab, setPreviewTab (not used in single-table mode)

  useEffect(() => {
    if (!selectedFile && files.length) {
      setSelectedFile(files[0].name);
    }
  }, [files, selectedFile]);

  // Fetch data preview metadata when file is selected
  useEffect(() => {
    if (selectedFile) {
      fetch(`http://localhost:8000/data/preview/${selectedFile}`)
        .then(res => res.json())
        .then(setDataPreview)
        .catch(() => setDataPreview(null));
    }
  }, [selectedFile]);

  // Remove mode, preSteps, and auto mode logic
  // Only use manualSteps for preprocessing
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      let stepsPayload = { ...manualSteps };
      if (manualSteps.fillNulls && manualSteps.fillStrategies) {
        stepsPayload.fillStrategies = manualSteps.fillStrategies;
      }
      if (stepsPayload.duplicateSubset && stepsPayload.duplicateSubset.length === 0) {
        delete stepsPayload.duplicateSubset;
      }
      const res = await fetch(`http://localhost:8000/data/preprocess/${selectedFile}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success("Preprocessing completed!");
        setResult(data);
      }
    } catch (err) {
      toast.error("Failed to preprocess: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderQualityScore = (score) => {
    let color = '#ef4444'; // red
    let status = 'Poor';
    let bgColor = 'bg-red-50';
    let borderColor = 'border-red-200';
    let icon = '⚠️';
    
    if (score >= 80) {
      color = '#22c55e'; // green
      status = 'Excellent';
      bgColor = 'bg-green-50';
      borderColor = 'border-green-200';
      icon = '🏆';
    } else if (score >= 60) {
      color = '#f59e0b'; // yellow
      status = 'Good';
      bgColor = 'bg-yellow-50';
      borderColor = 'border-yellow-200';
      icon = '⭐';
    } else if (score >= 40) {
      color = '#f97316'; // orange
      status = 'Fair';
      bgColor = 'bg-orange-50';
      borderColor = 'border-orange-200';
      icon = '📊';
    }
    
    return (
      <div className={`${bgColor} ${borderColor} border rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-sm`}>
        <div className="text-4xl mb-2">{icon}</div>
        <div className="text-3xl font-bold mb-1" style={{ color }}>{Math.round(score)}%</div>
        <div className="text-sm text-gray-600 font-medium">{status}</div>
        <div className="w-full bg-gray-100 rounded-full h-2 mt-3">
          <div 
            className="h-2 rounded-full transition-all duration-1000 ease-out" 
            style={{ 
              width: `${score}%`, 
              background: `linear-gradient(90deg, ${color} 0%, ${color}88 100%)`,
              boxShadow: `0 0 8px ${color}30`
            }}
          ></div>
        </div>
      </div>
    );
  };

  const renderQualityReport = (report) => {
    if (!report) return null;
    
    return (
      <div className="w-full bg-white rounded-xl p-8 mb-8 border border-gray-200 shadow-sm">
        <div className="text-center mb-8">
          <h3 className="text-3xl font-bold text-gray-800 mb-2">
            🎯 Data Quality Analysis
          </h3>
          <p className="text-gray-600">Comprehensive analysis of your dataset</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {renderQualityScore(report.quality_score)}
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-2xl font-bold text-blue-700 mb-1">{report.total_rows}</div>
            <div className="text-sm text-gray-600 font-medium">Total Rows</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-2xl font-bold text-green-700 mb-1">{report.total_columns}</div>
            <div className="text-sm text-gray-600 font-medium">Total Columns</div>
          </div>
        </div>

        {report.missing_data && Object.keys(report.missing_data).length > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
              <span className="text-2xl">🔍</span>
              Missing Data Analysis
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Missing Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(report.missing_data).map(([col, info]) => (
                    <tr key={col} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">📝</span>
                          <span className="font-medium text-gray-900">{col}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-red-600">{info.count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-yellow-600">{info.percentage.toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          info.type === 'critical' ? 'bg-red-100 text-red-800' :
                          info.type === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {info.type.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report.duplicate_rows > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
              <span className="text-2xl">🔄</span>
              Duplicate Detection
            </h4>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <div className="text-4xl mb-2">🔄</div>
              <div className="text-2xl font-bold text-yellow-700 mb-1">{report.duplicate_rows}</div>
              <div className="text-lg text-gray-700">duplicate rows found and removed</div>
            </div>
          </div>
        )}

        {report.outliers && Object.keys(report.outliers).length > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
              <span className="text-2xl">🎯</span>
              Outlier Analysis
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Column</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outlier Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(report.outliers).map(([col, info]) => (
                    <tr key={col} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-3">📈</span>
                          <span className="font-medium text-gray-900">{col}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-orange-600">{info.count}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-red-600">{info.percentage.toFixed(1)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {report.recommendations && report.recommendations.length > 0 && (
          <div className="mb-6">
            <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
              <span className="text-2xl">💡</span>
              Smart Recommendations
            </h4>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-200">
                {report.recommendations.map((rec, idx) => (
                  <div key={idx} className="px-6 py-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                    <span className="text-2xl">✅</span>
                    <span className="font-medium text-gray-800">{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Only show manual steps UI
  const renderManualSteps = () => {
    const columns = getColumns();
    return (
      <div className={styles.manualStepsWrapper}>
        <div className={styles.manualStepLabel} title="Remove duplicate rows">
          <input
            type="checkbox"
            checked={manualSteps.removeDuplicates}
            onChange={e => setManualSteps(s => ({ ...s, removeDuplicates: e.target.checked }))}
          />
          <span role="img" aria-label="dedup">🧹</span> Remove Duplicates
          {manualSteps.removeDuplicates && (
            columns.length > 0 ? (
              <ColumnMultiSelect
                columns={columns}
                selected={manualSteps.duplicateSubset || []}
                onChange={cols => setManualSteps(s => ({ ...s, duplicateSubset: cols }))}
                label={null}
                placeholder="Columns for duplicate detection (default: all)"
              />
            ) : (
              <span className={styles.loadingColumnsMsg}>Loading columns…</span>
            )
          )}
        </div>
        <label className={styles.manualStepLabel} title="Remove rows with any null/missing values">
          <input
            type="checkbox"
            checked={manualSteps.removeNulls}
            onChange={e => setManualSteps(s => ({ ...s, removeNulls: e.target.checked }))}
          />
          <span role="img" aria-label="null">🚫</span> Remove Nulls
        </label>
        <label className={styles.manualStepLabel} title="Fill missing values with a strategy">
          <input
            type="checkbox"
            checked={manualSteps.fillNulls}
            onChange={e => setManualSteps(s => ({ ...s, fillNulls: e.target.checked }))}
          />
          <span role="img" aria-label="fill">🧴</span> Fill Nulls
        </label>
        {/* Fill Nulls per-column UI */}
        {manualSteps.fillNulls && (
          getNullColumns().length > 0 ? (
            <div className={styles.perColumnFillWrapper}>
              {getNullColumns().map(({ col, nulls }) => (
                <div key={col} className={styles.perColumnFillRow}>
                  <span className={styles.perColumnFillCol}>{col} <span className={styles.perColumnFillNulls}>({nulls} nulls)</span></span>
                  <select
                    value={manualSteps.fillStrategies?.[col]?.strategy || 'skip'}
                    onChange={e => {
                      const strategy = e.target.value;
                      setManualSteps(s => ({
                        ...s,
                        fillStrategies: {
                          ...s.fillStrategies,
                          [col]: { strategy, value: s.fillStrategies?.[col]?.value || '' }
                        }
                      }));
                    }}
                    className={styles.fillStrategySelect}
                  >
                    <option value="skip">Skip</option>
                    <option value="mean">Mean</option>
                    <option value="median">Median</option>
                    <option value="mode">Mode</option>
                    <option value="zero">Zero</option>
                    <option value="custom">Custom</option>
                  </select>
                  {manualSteps.fillStrategies?.[col]?.strategy === 'custom' && (
                    <input
                      type="text"
                      value={manualSteps.fillStrategies?.[col]?.value || ''}
                      onChange={e => {
                        setManualSteps(s => ({
                          ...s,
                          fillStrategies: {
                            ...s.fillStrategies,
                            [col]: { ...s.fillStrategies[col], value: e.target.value }
                          }
                        }));
                      }}
                      className={styles.customFillInput}
                      placeholder="Custom value"
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )
        )}
        {/* Drop Columns */}
        <div className={styles.manualStepLabel} title="Drop selected columns">
          <span role="img" aria-label="drop">🗑️</span> Drop Columns
          {columns.length > 0 ? (
            <ColumnMultiSelect
              columns={columns}
              selected={manualSteps.dropColumns}
              onChange={cols => setManualSteps(s => ({ ...s, dropColumns: cols }))}
              label={null}
              placeholder="Select columns to drop"
            />
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )}
        </div>
        {/* Encode Categorical */}
        <div className={styles.manualStepLabel} title="Encode categorical columns">
          <span role="img" aria-label="encode">🔤</span> Encode Categorical
          {columns.length > 0 ? (
            <>
              <ColumnMultiSelect
                columns={columns}
                selected={manualSteps.encodeCategorical}
                onChange={cols => setManualSteps(s => ({ ...s, encodeCategorical: cols }))}
                label={null}
                placeholder="Select columns to encode"
              />
              <select
                value={manualSteps.encodingMethod}
                onChange={e => setManualSteps(s => ({ ...s, encodingMethod: e.target.value }))}
                className={styles.fillStrategySelect}
              >
                <option value="onehot">One-Hot</option>
                <option value="label">Label</option>
              </select>
            </>
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )}
        </div>
        {/* Scale Numeric */}
        <div className={styles.manualStepLabel} title="Scale numeric columns">
          <span role="img" aria-label="scale">📏</span> Scale Numeric
          {columns.length > 0 ? (
            <>
              <ColumnMultiSelect
                columns={columns}
                selected={manualSteps.scaleNumeric}
                onChange={cols => setManualSteps(s => ({ ...s, scaleNumeric: cols }))}
                label={null}
                placeholder="Select columns to scale"
              />
              <select
                value={manualSteps.scalingMethod}
                onChange={e => setManualSteps(s => ({ ...s, scalingMethod: e.target.value }))}
                className={styles.fillStrategySelect}
              >
                <option value="minmax">Min-Max</option>
                <option value="standard">Standard</option>
                <option value="none">None</option>
              </select>
            </>
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )}
        </div>
        {/* Outlier Removal */}
        <div className={styles.manualStepLabel} title="Remove outliers from selected columns">
          <span role="img" aria-label="outlier">🚨</span> Outlier Removal
          {columns.length > 0 ? (
            <>
              <ColumnMultiSelect
                columns={columns}
                selected={manualSteps.outlierColumns}
                onChange={cols => setManualSteps(s => ({ ...s, outlierColumns: cols }))}
                label={null}
                placeholder="Select columns for outlier removal"
              />
              <select
                value={manualSteps.outlierMethod}
                onChange={e => setManualSteps(s => ({ ...s, outlierMethod: e.target.value }))}
                className={styles.fillStrategySelect}
              >
                <option value="iqr">IQR</option>
                <option value="zscore">Z-Score</option>
              </select>
            </>
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )}
        </div>
        {/* Reorder Columns */}
        <div className={styles.manualStepLabel} title="Reorder columns by dragging">
          <span role="img" aria-label="reorder">🔀</span> Reorder Columns
          {columns.length > 0 ? (
            <ColumnDragReorder
              columns={columns}
              order={manualSteps.reorderColumns.length ? manualSteps.reorderColumns : columns}
              onChange={order => setManualSteps(s => ({ ...s, reorderColumns: order }))}
            />
          ) : (
            <span className={styles.loadingColumnsMsg}>Loading columns…</span>
          )}
        </div>
        {/* Preview changes and undo last step */}
        {/* (Removed Preview Changes and Undo Last Step buttons as requested) */}
          </div>
    );
  };

  // Single-table compare preview
  const renderCompareTable = (original, cleaned) => {
    if (!original && !cleaned) return null;
    const tableData = showAll && fullData ? fullData : cleaned;
    return (
      <div className={styles.card}>
        <h3 className={styles.heading} style={{ fontSize: '1.5rem', marginBottom: '1.2rem' }}>Compare Data (Original vs Cleaned)</h3>
        {!showAll && (
          <div className={styles.previewNote}>Showing preview (first 10 rows). <button className={styles.showAllBtn} onClick={handleShowAll}>Show All</button></div>
        )}
        {showAll && (
          <div className={styles.previewNote}>Showing all rows. <button className={styles.showAllBtn} onClick={() => setShowAll(false)}>Show Preview</button></div>
        )}
        <DataTable data={tableData || []} originalData={original || []} compareOriginal={true} highlightChanges={true} />
      </div>
    );
  };

  // Fetch full data when Show All is clicked
  const handleShowAll = async () => {
    setLoading(true);
    try {
      const stepsPayload = { ...manualSteps };
      if (manualSteps.fillNulls && manualSteps.fillStrategies) {
        stepsPayload.fillStrategies = manualSteps.fillStrategies;
      }
      if (stepsPayload.duplicateSubset && stepsPayload.duplicateSubset.length === 0) {
        delete stepsPayload.duplicateSubset;
      }
      const res = await fetch(`http://localhost:8000/data/preprocess/${selectedFile}?full=true`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });
      const data = await res.json();
      if (data.full_data) {
        setFullData(data.full_data);
        setShowAll(true);
      } else {
        toast.error("Full data not available.");
      }
    } catch (err) {
      toast.error("Failed to load full data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get columns from preview
  const getColumns = () => {
    if (dataPreview && dataPreview.columns) {
      return dataPreview.columns;
    }
    return [];
  };
  // Helper to get columns with nulls and their null counts
  const getNullColumns = () => {
    if (dataPreview && dataPreview.null_counts) {
      return Object.entries(dataPreview.null_counts)
        .filter(([col, count]) => count > 0)
        .map(([col, count]) => ({ col, nulls: count }));
    }
    return [];
  };

  return (
    <div className={styles.pageShell}>
      <ShadcnNavbar onLogout={() => {
        localStorage.removeItem("user");
        localStorage.removeItem("google_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.clear();
        window.location.replace("/");
      }} />
      <div className={styles.backButtonWrapper}>
        <GlobalBackButton />
      </div>
      <div className={styles.pageSection}>
        <div className={styles.centeredContent}>
          <div className={styles.card}>
            <h2 className={styles.heading}>Smart Data Preprocessing</h2>
            {/* Remove mode toggle */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <FormField label="Select File" required hint="Choose a file to preprocess">
                <select
                  id="file-select"
                  value={selectedFile}
                  onChange={e => setSelectedFile(e.target.value)}
                  className={styles.select}
                  size={files.length > 8 ? 8 : undefined}
                  required
                >
                  <option value="" disabled>Select a file...</option>
                  {files.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </FormField>
              {/* Only show manual steps UI */}
              {renderManualSteps()}
              <button 
                type="submit" 
                disabled={loading || !selectedFile} 
                className={styles.submitBtn}
              >
                {loading ? (
                  <div className={styles.loadingWrapper}>
                    <div className={styles.loadingSpinner}></div>
                    Processing...
                  </div>
                ) : (
                  <div className={styles.submitContent}>
                    <span className={styles.submitIcon}>🚀</span>
                    Start Manual Preprocessing
                  </div>
                )}
              </button>
            </form>
            {/* Highlight changes toggle */}
            <div className={styles.highlightToggleWrapper}>
              <label>
                <input type="checkbox" checked={highlightChanges} onChange={e => setHighlightChanges(e.target.checked)} />
                <span className={styles.highlightToggleLabel}>Highlight Changes</span>
              </label>
            </div>
            {/* Single compare table section */}
            {result && result.original_preview && result.preview && renderCompareTable(result.original_preview, result.preview)}
            {/* Change metadata summary */}
            {result && result.change_metadata && result.change_metadata.length > 0 && (
              <div className={styles.changeMetadataSummary}>
                <h4>Summary of Changes:</h4>
                <ul>
                  {result.change_metadata.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {result && result.quality_report && (
              <div className="w-full">
                <h3 className="text-xl font-bold mb-4 text-center text-gray-800">Data Quality Report</h3>
                {renderQualityReport(result.quality_report)}
              </div>
            )}

            {result && result.preprocessing_summary && (
              <div className="w-full bg-white rounded-xl p-8 mb-8 border border-gray-200 shadow-sm">
                <div className="text-center mb-6">
                  <h3 className="text-3xl font-bold text-gray-800 mb-2">
                    🎉 Preprocessing Complete!
                  </h3>
                  <p className="text-gray-600">Your data has been successfully cleaned and optimized</p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
                    <div className="text-2xl mb-2">📊</div>
                    <div className="text-lg font-bold text-blue-700">{result.preprocessing_summary.original_rows}</div>
                    <div className="text-xs text-gray-600">Original Rows</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
                    <div className="text-2xl mb-2">✨</div>
                    <div className="text-lg font-bold text-green-700">{result.preprocessing_summary.cleaned_rows}</div>
                    <div className="text-xs text-gray-600">Cleaned Rows</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
                    <div className="text-2xl mb-2">📋</div>
                    <div className="text-lg font-bold text-purple-700">{result.preprocessing_summary.original_columns}</div>
                    <div className="text-xs text-gray-600">Original Columns</div>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center transform hover:scale-105 transition-all duration-300 shadow-sm">
                    <div className="text-2xl mb-2">🔧</div>
                    <div className="text-lg font-bold text-teal-700">{result.preprocessing_summary.cleaned_columns}</div>
                    <div className="text-xs text-gray-600">Cleaned Columns</div>
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-2">Quality Improvement</div>
                  <div className="text-4xl font-bold text-green-600 mb-4">
                    +{result.preprocessing_summary.quality_improvement.toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 mb-4">
                    <div 
                      className="h-3 rounded-full transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${Math.min(100, result.preprocessing_summary.quality_improvement + 50)}%`, 
                        background: 'linear-gradient(90deg, #22c55e 0%, #10b981 100%)',
                        boxShadow: '0 0 8px #22c55e30'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {result && (
              <div className="w-full mt-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    📥 Export Options
                  </h3>
                  <p className="text-gray-600">Download your cleaned data or save to MinIO</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {result.cleaned_filename && (
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-lg px-8 py-4 border-0 shadow-sm cursor-pointer tracking-wider transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                      onClick={async () => {
                        try {
                          const res = await fetch(`http://localhost:8000/download_cleaned_file/${encodeURIComponent(result.cleaned_filename)}`);
                          if (!res.ok) throw new Error('Failed to download cleaned file');
                          const blob = await res.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = result.cleaned_filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                          toast.success('🎉 Cleaned data downloaded successfully!');
                        } catch {
                          toast.error('❌ Failed to download cleaned file');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">💾</span>
                        <span>Download Cleaned Data</span>
                      </div>
                    </button>
                  )}
                  
                  {result.cleaned_filename && result.temp_cleaned_path && (
                    <button
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-lg px-8 py-4 border-0 shadow-sm cursor-pointer tracking-wider transition-all duration-300 transform hover:scale-105 hover:shadow-md"
                      onClick={async () => {
                        try {
                          const res = await fetch('http://localhost:8000/save_cleaned_to_minio', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              temp_cleaned_path: result.temp_cleaned_path,
                              cleaned_filename: result.cleaned_filename
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            toast.success('🚀 Data saved to MinIO successfully!');
                          } else {
                            toast.error(data.error || '❌ Failed to save to MinIO');
                          }
                        } catch {
                          toast.error('❌ Failed to save to MinIO');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-2xl">☁️</span>
                        <span>Save to MinIO</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mb-6" />
      </div>
      <FloatingFilesPanel position="top-right" offsetTop={80} label="Show Uploaded Files" />
    </div>
  );
}
