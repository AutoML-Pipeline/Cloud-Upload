import GlobalBackButton from "../components/GlobalBackButton";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import styles from "./Preprocessing.module.css";
import DataTable from "../components/DataTable";
import ColumnMultiSelect from "../components/ColumnMultiSelect";
import FillNullSelector from "../components/FillNullSelector";
import ColumnDragReorder from "../components/ColumnDragReorder";
// import UploadedFilesTable from "../components/UploadedFilesTable"; // Removed UploadedFilesTable import
import { useLocation } from 'react-router-dom';

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "--";
  const numeric = Number(bytes);
  if (!Number.isFinite(numeric) || numeric <= 0) return "--";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(numeric) / Math.log(1024)), units.length - 1);
  const value = numeric / Math.pow(1024, exponent);
  const precision = value >= 100 || exponent === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[exponent]}`;
};

const formatDateTime = (input) => {
  if (!input) return "--";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export default function Preprocessing() {
  const { data: filesData, isFetching: isFetchingFiles } = useQuery({
    queryKey: ['files', 'list'],
    queryFn: async () => {
      const res = await fetch('http://localhost:8000/files/list');
      if (!res.ok) throw new Error('Failed to fetch files');
      return res.json();
    },
    staleTime: 60 * 1000,
  });
  const [selectedFile, setSelectedFile] = useState("");
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const selectedFileInfo = useMemo(
    () => files.find(file => file?.name === selectedFile),
    [files, selectedFile]
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progressInfo, setProgressInfo] = useState({
    status: 'idle',
    progress: 0,
    message: '',
    error: null,
  });
  const [step, setStep] = useState('select_file');
  const [activePreviewTab, setActivePreviewTab] = useState('preview');
  const [preprocessingSteps, setPreprocessingSteps] = useState({
    removeDuplicates: false,
    removeDuplicatesColumns: [],
    removeNulls: false,
    removeNullsColumns: [],
    fillNulls: false,
    fillNullsColumns: [],
    fillColumnStrategies: {},
    dropColumns: false,
    dropColumnsColumns: [],
    removeOutliers: false,
    removeOutliersConfig: {
      method: 'iqr',
      factor: 1.5,
      columns: []
    },
  });
  const [dataPreview, setDataPreview] = useState(null);
  const location = useLocation();
  const pageSectionRef = useRef(null);
  const pollingRef = useRef(null);

  const setStepsStable = (updater) => {
    const container = pageSectionRef.current;
    const prevScroll = container ? container.scrollTop : window.scrollY;
    setPreprocessingSteps(prev => (typeof updater === 'function' ? updater(prev) : updater));
    requestAnimationFrame(() => {
      if (container) {
        container.scrollTop = prevScroll;
      } else {
        window.scrollTo(0, prevScroll);
      }
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fileFromUrl = params.get('file');
    if (fileFromUrl && fileFromUrl !== selectedFile) {
      setSelectedFile(fileFromUrl);
      setStep('configure_preprocessing');
      setDataPreview(null);
    } else if (!selectedFile && files.length && step === 'select_file') {
      setSelectedFile(files[0].name);
    }
  }, [files, selectedFile, step, location.search]);

  useEffect(() => {
    if (selectedFile && step === 'configure_preprocessing') {
      setDataPreview(null);
      const baseFilename = selectedFile.split('/').pop();
      fetch(`http://localhost:8000/data/preview/${baseFilename}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch file preview: ${res.statusText}`);
          }
          return res.json();
        })
        .then(data => {
          setDataPreview(data);
          setPreprocessingSteps(prev => ({
            ...prev,
            removeDuplicates: false,
            removeDuplicatesColumns: [],
            removeNulls: false,
            removeNullsColumns: [],
            fillNulls: false,
            fillNullsColumns: [],
            fillColumnStrategies: {},
            dropColumns: false,
            dropColumnsColumns: [],
          }));
        })
        .catch(error => {
          console.error("Error fetching data preview:", error);
          toast.error("Failed to load file preview: " + error.message);
          setDataPreview(null);
        });
    }
  }, [selectedFile, step]);

  useEffect(() => {
    setPreprocessingSteps(prev => {
      const newFillColumnStrategies = { ...prev.fillColumnStrategies };
      const currentSelected = prev.fillNullsColumns || [];

      currentSelected.forEach(col => {
        if (!newFillColumnStrategies[col]) {
          newFillColumnStrategies[col] = { strategy: 'mean', value: '' };
        }
      });

      for (const col in newFillColumnStrategies) {
        if (!currentSelected.includes(col)) {
          delete newFillColumnStrategies[col];
        }
      }

      return { ...prev, fillColumnStrategies: newFillColumnStrategies };
    });
  }, [preprocessingSteps.fillNullsColumns]);

  useEffect(() => {
    if (!jobId) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    let cancelled = false;

    const pollStatus = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/data/preprocess/status/${jobId}`);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(payload?.detail || payload?.error || 'Unable to fetch preprocessing status');
        }
        if (cancelled) return;

        setProgressInfo(prev => ({
          status: payload.status || prev.status,
          progress: typeof payload.progress === 'number' ? payload.progress : prev.progress,
          message: payload.message ?? prev.message,
          error: payload.error || null,
        }));

        if (payload.status === 'completed') {
          setResult(payload.result || null);
          setProgressInfo({
            status: 'completed',
            progress: 100,
            message: payload.message || 'Preprocessing complete',
            error: null,
          });
          setLoading(false);
          setJobId(null);
          toast.success('Preprocessing completed!');
        } else if (payload.status === 'failed') {
          setProgressInfo({
            status: 'failed',
            progress: typeof payload.progress === 'number' ? payload.progress : 100,
            message: payload.message || 'Preprocessing failed',
            error: payload.error || 'Preprocessing failed',
          });
          setLoading(false);
          setJobId(null);
          toast.error(payload.error || 'Preprocessing failed');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error polling preprocessing status:', error);
        toast.error('Progress tracking failed: ' + error.message);
        setProgressInfo({
          status: 'failed',
          progress: 100,
          message: 'Progress tracking interrupted',
          error: error.message,
        });
        setLoading(false);
        setJobId(null);
      }
    };

    pollStatus();
    pollingRef.current = setInterval(pollStatus, 1500);

    return () => {
      cancelled = true;
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobId]);

  useEffect(() => {
    if (progressInfo.status === 'completed' || progressInfo.status === 'failed') {
      const timeout = setTimeout(() => {
        setProgressInfo(prev => {
          if (prev.status !== progressInfo.status) {
            return prev;
          }
          return { status: 'idle', progress: 0, message: '', error: null };
        });
      }, 1800);
      return () => clearTimeout(timeout);
    }
  }, [progressInfo.status]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setResult(null);
    setJobId(null);
    setActivePreviewTab('preview');
    setLoading(true);
    setProgressInfo({
      status: 'queued',
      progress: 0,
      message: 'Queued and preparing job...',
      error: null,
    });

    try {
      let stepsPayload = {};
      if (preprocessingSteps.removeDuplicates) {
        stepsPayload.removeDuplicates = true;
        stepsPayload.duplicateSubset = preprocessingSteps.removeDuplicatesColumns;
      }
      if (preprocessingSteps.removeNulls) {
        stepsPayload.removeNulls = true;
        stepsPayload.removeNullsColumns = preprocessingSteps.removeNullsColumns;
      }
      if (preprocessingSteps.fillNulls) {
        stepsPayload.fillNulls = true;
        stepsPayload.fillStrategies = {};
        for (const col of preprocessingSteps.fillNullsColumns) {
          const strategyInfo = preprocessingSteps.fillColumnStrategies[col];
          if (strategyInfo) {
            stepsPayload.fillStrategies[col] = {
              strategy: strategyInfo.strategy,
              value: strategyInfo.strategy === 'custom' ? strategyInfo.value : undefined,
            };
          }
        }
      }
      if (preprocessingSteps.dropColumns) {
        stepsPayload.dropColumns = preprocessingSteps.dropColumnsColumns;
      }
      if (preprocessingSteps.removeOutliers) {
        stepsPayload.removeOutliers = true;
        stepsPayload.removeOutliersConfig = {
          method: preprocessingSteps.removeOutliersConfig.method,
          factor: preprocessingSteps.removeOutliersConfig.factor,
          columns: preprocessingSteps.removeOutliersConfig.columns,
        };
      }

      console.log("Sending preprocessing payload:", { steps: stepsPayload });
      const baseFilename = selectedFile.split('/').pop();
      const res = await fetch(`http://localhost:8000/api/data/preprocess/${baseFilename}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: stepsPayload }),
      });
      const data = await res.json().catch(() => ({}));
      console.log("Received preprocessing response:", data);
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || 'Failed to start preprocessing job');
      }
      if (!data?.job_id) {
        throw new Error('Failed to obtain preprocessing job identifier');
      }

      setJobId(data.job_id);
      setProgressInfo({
        status: 'pending',
        progress: 0,
        message: 'Initializing preprocessing pipeline...',
        error: null,
      });
      toast.success('Preprocessing started. Hang tight while we work through your steps.');
    } catch (err) {
      console.error('Failed to preprocess dataset:', err);
      setProgressInfo({
        status: 'failed',
        progress: 0,
        message: '',
        error: err.message,
      });
      setLoading(false);
      toast.error('Failed to preprocess: ' + err.message);
    }
  };

  const columns = dataPreview?.columns || [];
  const nullCounts = dataPreview?.null_counts || {};
  const activeSteps = useMemo(() => {
    const summary = [];
    if (preprocessingSteps.removeDuplicates) {
      summary.push({
        key: 'removeDuplicates',
        title: 'Remove duplicates',
        details: preprocessingSteps.removeDuplicatesColumns.length
          ? `Subset: ${preprocessingSteps.removeDuplicatesColumns.join(', ')}`
          : 'Across all columns',
        icon: '🧹',
      });
    }
    if (preprocessingSteps.removeNulls) {
      summary.push({
        key: 'removeNulls',
        title: 'Remove nulls',
        details: preprocessingSteps.removeNullsColumns.length
          ? `Columns: ${preprocessingSteps.removeNullsColumns.join(', ')}`
          : 'All columns',
        icon: '🚫',
      });
    }
    if (preprocessingSteps.fillNulls) {
      const strategies = Object.entries(preprocessingSteps.fillColumnStrategies || {})
        .map(([col, info]) => `${col}: ${info.strategy}${info.strategy === 'custom' && info.value !== '' ? ` → ${info.value}` : ''}`);
      summary.push({
        key: 'fillNulls',
        title: 'Fill nulls',
        details: strategies.length ? strategies.join(', ') : 'Smart fill across selected columns',
        icon: '🧴',
      });
    }
    if (preprocessingSteps.dropColumns) {
      summary.push({
        key: 'dropColumns',
        title: 'Drop columns',
        details: preprocessingSteps.dropColumnsColumns.length
          ? preprocessingSteps.dropColumnsColumns.join(', ')
          : 'No columns selected yet',
        icon: '🗑️',
      });
    }
    if (preprocessingSteps.removeOutliers) {
      const cfg = preprocessingSteps.removeOutliersConfig || {};
      const scope = cfg.columns && cfg.columns.length ? `Columns: ${cfg.columns.join(', ')}` : 'All numeric columns';
      summary.push({
        key: 'removeOutliers',
        title: 'Remove outliers',
        details: `${cfg.method?.toUpperCase() || 'IQR'} (factor ${cfg.factor ?? 1.5}) · ${scope}`,
        icon: '📈',
      });
    }
    return summary;
  }, [preprocessingSteps]);
  const statsCards = useMemo(() => {
    if (!result) {
      return [
        { label: 'Original rows', value: '--', tone: 'muted' },
        { label: 'Cleaned rows', value: '--', tone: 'muted' },
        { label: 'Rows removed', value: '--', tone: 'muted' },
        { label: 'Steps applied', value: activeSteps.length, tone: 'muted' },
      ];
    }
    const removed = result.original_row_count - result.cleaned_row_count;
    return [
      { label: 'Original rows', value: result.original_row_count.toLocaleString(), tone: 'neutral' },
      { label: 'Cleaned rows', value: result.cleaned_row_count.toLocaleString(), tone: 'success' },
      { label: 'Rows removed', value: removed.toLocaleString(), tone: removed > 0 ? 'warning' : 'muted' },
      { label: 'Steps applied', value: (result.change_metadata || []).length, tone: 'info' },
    ];
  }, [result, activeSteps.length]);
  const statToneClasses = {
    muted: styles.statCardMuted,
    neutral: styles.statCardNeutral,
    success: styles.statCardSuccess,
    warning: styles.statCardWarning,
    info: styles.statCardInfo,
  };
  const previewRowCount = result?.preview ? result.preview.length : 0;
  const previewLimitReached = !!(result?.preview_row_limit && result?.cleaned_row_count > result.preview_row_limit);
  const hasDiffHighlights = !!(result?.diff_marks && ((result.diff_marks.deleted_row_indices || []).length > 0 || Object.keys(result.diff_marks.updated_cells || {}).length > 0));

  function PreprocessingStepCard({
    checked,
    onToggle,
    icon,
    label,
    description,
    completed,
    children,
  }) {
    const isCompleted = completed ?? checked;
    return (
      <div className={`${styles.stepCard} ${checked ? styles.stepCardActive : ''}`}>
        <label className={styles.stepCardLabel}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
          />
          <span className={styles.stepCardIcon}>{icon}</span>
          <div className={styles.stepCardText}>
            <span className={styles.stepCardTitle}>{label}</span>
            {description && <span className={styles.stepCardDescription}>{description}</span>}
          </div>
          <span className={`${styles.stepCardStatus} ${isCompleted ? styles.stepCardStatusOn : ''}`}>
            {isCompleted ? '✓' : ''}
          </span>
        </label>
        {checked && <div className={styles.stepCardContent}>{children}</div>}
      </div>
    );
  }

  const renderPreviewTable = () => {
    if (!result) return null;

    const rawData = result.preview;
    const originalData = result.original_preview;

    const tableData = {};
    if (Array.isArray(rawData) && rawData.length > 0) {
      const cols = Object.keys(rawData[0]);
      cols.forEach(col => {
        tableData[col] = rawData.map(row => row[col]);
      });
    }

    const transformedOriginalData = {};
    if (Array.isArray(originalData) && originalData.length > 0) {
      const origCols = Object.keys(originalData[0]);
      origCols.forEach(col => {
        transformedOriginalData[col] = originalData.map(row => row[col]);
      });
    }

    return (
      <DataTable
        data={tableData}
        originalData={transformedOriginalData}
        compareOriginal={true}
        highlightChanges={true}
        diffMarks={result?.diff_marks}
        originalFilename={selectedFile}
        filledNullColumns={preprocessingSteps.fillNullsColumns}
        saveTarget={"cleaned"}
        saveFilename={result?.cleaned_filename}
      />
    );
  };

  const renderDiffHighlights = () => {
    if (!result) {
      return <div className={styles.emptyState}>Run preprocessing to see how the data evolves.</div>;
    }
    const diffMarks = result.diff_marks || {};
    const deletedRows = diffMarks.deleted_row_indices || [];
    const updatedCells = diffMarks.updated_cells || {};
    const hasChanges = deletedRows.length > 0 || Object.keys(updatedCells).length > 0;

    if (!hasChanges) {
      return <div className={styles.emptyState}>No row removals or value edits detected. Try enabling more steps.</div>;
    }

    const updatedEntries = Object.entries(updatedCells).slice(0, 12);

    return (
      <div className={styles.diffGrid}>
        <div className={styles.diffCard}>
          <div className={styles.diffBadge}>🗑️</div>
          <h4>Removed rows</h4>
          <p className={styles.diffMetric}>{deletedRows.length.toLocaleString()}</p>
          <p className={styles.diffHint}>
            {deletedRows.length > 0
              ? `Row indices: ${deletedRows.slice(0, 8).join(', ')}${deletedRows.length > 8 ? '…' : ''}`
              : 'No rows removed in this run.'}
          </p>
          {result.diff_truncated && (
            <p className={styles.diffNote}>Showing first {result.diff_row_limit} edits for speed.</p>
          )}
        </div>
        <div className={styles.diffCard}>
          <div className={styles.diffBadge}>✨</div>
          <h4>Updated values</h4>
          {updatedEntries.length === 0 ? (
            <p className={styles.diffHint}>No cell updates detected.</p>
          ) : (
            <div className={styles.diffList}>
              {updatedEntries.map(([rowIndex, changes]) => (
                <div key={rowIndex} className={styles.diffListItem}>
                  <span className={styles.diffRowLabel}>Row {rowIndex}:</span>
                  <span className={styles.diffRowDetails}>
                    {Object.keys(changes).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          )}
          {Object.keys(updatedCells).length > updatedEntries.length && (
            <p className={styles.diffNote}>+{Object.keys(updatedCells).length - updatedEntries.length} more rows updated.</p>
          )}
        </div>
      </div>
    );
  };

  const renderFileSelection = () => {
    const hasFiles = files.length > 0;
    const fileCountLabel = files.length === 1 ? '1 file' : `${files.length} files`;

    const selectPlaceholder = isFetchingFiles
      ? 'Loading datasets…'
      : hasFiles
        ? 'Select a file…'
        : 'No files available';

    return (
      <div className={styles.selectionGrid}>
        <div className={styles.selectionHero}>
          <span className={styles.selectionBadge}>Step 1 · Choose dataset</span>
          <h1 className={styles.selectionTitle}>Smart Data Preprocessing</h1>
          <p className={styles.selectionCopy}>
            Launch your automated cleaning workflow by selecting a dataset from your workspace.
            We&apos;ll profile its structure, track every change, and help you ship a production-ready table in minutes.
          </p>
          <div className={styles.selectionHighlights}>
            <div className={styles.selectionHighlight}>
              <span className={styles.selectionHighlightIcon}>⚡</span>
              <div>
                <p className={styles.selectionHighlightTitle}>Instant profiling</p>
                <p className={styles.selectionHighlightDesc}>Schema, column types, and issues surface automatically.</p>
              </div>
            </div>
            <div className={styles.selectionHighlight}>
              <span className={styles.selectionHighlightIcon}>🎯</span>
              <div>
                <p className={styles.selectionHighlightTitle}>Guided recipes</p>
                <p className={styles.selectionHighlightDesc}>Toggle curated cleaning steps with confident defaults.</p>
              </div>
            </div>
            <div className={styles.selectionHighlight}>
              <span className={styles.selectionHighlightIcon}>🧾</span>
              <div>
                <p className={styles.selectionHighlightTitle}>Traceable outputs</p>
                <p className={styles.selectionHighlightDesc}>Diffs, metrics, and changelog stay in sync for audit trails.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.selectionPanel}>
          <div className={styles.selectionPanelHeader}>
            <div>
              <span className={styles.selectionPanelEyebrow}>Dataset library</span>
              <h3 className={styles.selectionPanelTitle}>Choose a file to prep</h3>
            </div>
            <span className={styles.selectionPanelCount}>{fileCountLabel}</span>
          </div>

          <label className={styles.selectLabel} htmlFor="preprocessing-file-select">
            Select file <span className={styles.requiredMark}>*</span>
          </label>
          <div className={styles.selectControl}>
            <select
              id="preprocessing-file-select"
              className={styles.selectDropdown}
              value={selectedFile || ''}
              onChange={e => setSelectedFile(e.target.value)}
              disabled={!hasFiles || isFetchingFiles}
            >
              <option value="" disabled>{selectPlaceholder}</option>
              {files.map(f => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {isFetchingFiles && (
            <div className={styles.fileListLoading}>
              <span className={styles.loadingDot}></span>
              <span>Loading latest uploads…</span>
            </div>
          )}

          {!hasFiles && (
            <div className={styles.emptyFiles}>
              <p>No uploaded datasets yet.</p>
              <p>Use the Workflow ▸ Data intake hub to bring data into this workspace.</p>
            </div>
          )}

          {!isFetchingFiles && hasFiles && selectedFileInfo && (
            <div className={styles.fileMetaCard}>
              <div className={styles.fileMetaHeader}>
                <span className={styles.fileMetaName}>{selectedFileInfo.name}</span>
                <span className={styles.fileMetaBadge}>Ready</span>
              </div>
              <div className={styles.fileMetaStats}>
                <div>
                  <span className={styles.metaLabel}>Last updated</span>
                  <span className={styles.metaValue}>{formatDateTime(selectedFileInfo.lastModified)}</span>
                </div>
                <div>
                  <span className={styles.metaLabel}>File size</span>
                  <span className={styles.metaValue}>{formatFileSize(selectedFileInfo.size)}</span>
                </div>
              </div>
              <p className={styles.fileMetaFoot}>Securely stored in your MinIO workspace.</p>
            </div>
          )}

          <button
            type="button"
            disabled={!selectedFile || !hasFiles || isFetchingFiles}
            className={`${styles.submitBtn} ${styles.selectionButton}`}
            onClick={() => setStep('configure_preprocessing')}
          >
            <div className={styles.submitContent}>
              <span role="img" aria-label="next">🚀</span>
              Continue to workflow
            </div>
          </button>
          <p className={styles.selectionHint}>
            Need something else? Upload new datasets from the Workflow ▸ Data intake hub.
          </p>
        </div>
      </div>
    );
  };

  const renderQualityInsights = () => {
    if (!result?.quality_report || Object.keys(result.quality_report).length === 0) {
      return <div className={styles.emptyState}>Quality insights will appear after you run preprocessing.</div>;
    }
    const report = result.quality_report;
    const missingEntries = Object.entries(report.missing_data || {})
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .slice(0, 6);
    const outlierEntries = Object.entries(report.outliers || {})
      .sort((a, b) => b[1].percentage - a[1].percentage)
      .slice(0, 6);

    return (
      <div className={styles.qualityGrid}>
        <div className={`${styles.qualityCard} ${styles.qualityCardHero}`}>
          <span className={styles.qualityBadge}>Score</span>
          <p className={styles.qualityScore}>{Math.round(report.quality_score || 0)}</p>
          <p className={styles.qualityCopy}>{report.recommendations?.[0] || 'Dataset is looking healthy.'}</p>
          <div className={styles.qualityMetaRow}>
            <span>{report.total_rows?.toLocaleString() ?? '--'} rows</span>
            <span>•</span>
            <span>{report.total_columns?.toLocaleString() ?? '--'} columns</span>
          </div>
        </div>
        <div className={styles.qualityCard}>
          <h4>Missing data focus</h4>
          {missingEntries.length === 0 ? (
            <p className={styles.qualityHint}>No missing values detected 🎉</p>
          ) : (
            <ul className={styles.qualityList}>
              {missingEntries.map(([col, info]) => (
                <li key={col}>
                  <span className={styles.qualityListLabel}>{col}</span>
                  <span className={styles.qualityListValue}>{info.percentage.toFixed(1)}%</span>
                  <span className={styles.qualityListType}>{info.type}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={styles.qualityCard}>
          <h4>Outlier hotspots</h4>
          {outlierEntries.length === 0 ? (
            <p className={styles.qualityHint}>No significant outliers spotted.</p>
          ) : (
            <ul className={styles.qualityList}>
              {outlierEntries.map(([col, info]) => (
                <li key={col}>
                  <span className={styles.qualityListLabel}>{col}</span>
                  <span className={styles.qualityListValue}>{info.percentage.toFixed(1)}%</span>
                  <span className={styles.qualityListType}>({info.count} rows)</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  };

  const renderChangeSummary = () => {
    if (!result?.change_metadata || result.change_metadata.length === 0) {
      return null;
    }

    const iconMap = {
      'Remove Duplicates': '🧹',
      'Remove Nulls': '🚫',
      'Fill Nulls': '🧴',
      'Drop Columns': '🗑️',
      'Remove Outliers': '📈',
    };

    return (
      <div className={styles.timelineCard}>
        <h3 className={styles.timelineHeading}>What changed in this run</h3>
        <div className={styles.timelineList}>
          {result.change_metadata.map((item, index) => {
            const icon = iconMap[item.operation] || '⚙️';
            const parts = [];
            if (item.rows_removed) {
              parts.push(`Removed ${item.rows_removed} row${item.rows_removed === 1 ? '' : 's'}`);
            }
            if (item.columns && item.columns !== 'all') {
              parts.push(`Columns: ${Array.isArray(item.columns) ? item.columns.join(', ') : item.columns}`);
            }
            if (item.columns === 'all') {
              parts.push('Across all columns');
            }
            if (item.columns_dropped && item.columns_dropped.length) {
              parts.push(`Dropped ${item.columns_dropped.join(', ')}`);
            }
            if (item.strategy) {
              parts.push(`Strategy: ${item.strategy}${item.value !== undefined ? ` (${item.value})` : ''}`);
            }
            if (item.method) {
              parts.push(`${item.method.toUpperCase()} · factor ${item.factor}`);
            }

            return (
              <div key={index} className={styles.timelineItem}>
                <span className={styles.timelineIcon}>{icon}</span>
                <div>
                  <p className={styles.timelineTitle}>{item.operation}</p>
                  {parts.length > 0 && (
                    <p className={styles.timelineDetails}>{parts.join(' • ')}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`app-shell-with-chrome ${styles.pageShell}`}>
      <div className={styles.globalBackButtonAdjusted}>
        <GlobalBackButton />
      </div>
      <div className={styles.pageSection} ref={pageSectionRef}>
        <div className={styles.centeredContent}>
          <div className={styles.card}>
            {step !== 'select_file' && (
              <h2 className={styles.heading}>Smart Data Preprocessing</h2>
            )}
            {step === 'configure_preprocessing' && (
              <div className={styles.backButtonTop}>
                <button
                  type="button"
                  onClick={() => setStep('select_file')}
                  className={styles.backBtn}
                >
                  <div className={styles.submitContent}>
                    <span className={styles.submitIcon}>⬅️</span>
                    Back to File Selection
                  </div>
                </button>
              </div>
            )}
            {step === 'select_file' && renderFileSelection()}

            {step === 'configure_preprocessing' && (
              <>
                {dataPreview === null && selectedFile && !isFetchingFiles && (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Loading file preview...</p>
                  </div>
                )}
                {dataPreview === null && selectedFile && isFetchingFiles && (
                  <p className={styles.loadingColumnsMsg}>Fetching file list...</p>
                )}
                {dataPreview && dataPreview.error && (
                  <div className={styles.errorContainer}>
                    <p className={styles.errorMessage}>Error: {dataPreview.error}</p>
                    <p className={styles.errorHint}>Please check the file for corruption or unsupported content.</p>
                  </div>
                )}

                <div className={styles.layoutGrid}>
                  <form onSubmit={handleSubmit} className={styles.builderColumn}>
                    <div className={styles.builderIntro}>
                      <span className={styles.builderEyebrow}>Step builder</span>
                      <h3 className={styles.builderTitle}>Configure your cleaning recipe</h3>
                      <p className={styles.builderSubtitle}>
                        Toggle the cleanup steps you need. We&apos;ll preview changes instantly before you commit.
                      </p>
                    </div>
                    <div className={styles.builderFileRow}>
                      <div>
                        <span className={styles.builderFileLabel}>Working on</span>
                        <span className={styles.builderFileName}>{selectedFile}</span>
                      </div>
                      <button
                        type="button"
                        className={styles.changeFileButton}
                        onClick={() => setStep('select_file')}
                      >
                        Change file
                      </button>
                    </div>

                    {dataPreview && (
                      <div className={styles.stepperListModern}>
                        <PreprocessingStepCard
                          checked={preprocessingSteps.removeDuplicates}
                          onToggle={e => setStepsStable(s => ({ ...s, removeDuplicates: e.target.checked }))}
                          icon="🧹"
                          label="Remove duplicates"
                          description="Find and drop perfectly matching rows."
                        >
                          <ColumnMultiSelect
                            columns={columns}
                            selected={preprocessingSteps.removeDuplicatesColumns}
                            onChange={cols => setStepsStable(s => ({ ...s, removeDuplicatesColumns: cols }))}
                            label="Columns for duplicate detection (default: all)"
                            placeholder="Select columns..."
                          />
                        </PreprocessingStepCard>
                        <PreprocessingStepCard
                          checked={preprocessingSteps.removeNulls}
                          onToggle={e => setStepsStable(s => ({ ...s, removeNulls: e.target.checked }))}
                          icon="🚫"
                          label="Remove nulls"
                          description="Filter out rows with missing values."
                        >
                          <ColumnMultiSelect
                            columns={columns}
                            selected={preprocessingSteps.removeNullsColumns}
                            onChange={cols => setStepsStable(s => ({ ...s, removeNullsColumns: cols }))}
                            label="Columns for null removal (default: all)"
                            placeholder="Select columns..."
                          />
                        </PreprocessingStepCard>
                        <PreprocessingStepCard
                          checked={preprocessingSteps.fillNulls}
                          onToggle={e => setStepsStable(s => ({ ...s, fillNulls: e.target.checked }))}
                          icon="🧴"
                          label="Fill nulls"
                          description="Impute missing values with smart strategies."
                        >
                          <FillNullSelector
                            columns={columns}
                            nullCounts={nullCounts}
                            selected={preprocessingSteps.fillNullsColumns}
                            onChangeSelected={cols => setStepsStable(s => ({ ...s, fillNullsColumns: cols }))}
                            strategies={preprocessingSteps.fillColumnStrategies}
                            onChangeStrategy={(col, strategy, value) => setStepsStable(s => ({
                              ...s,
                              fillColumnStrategies: {
                                ...s.fillColumnStrategies,
                                [col]: { strategy, value }
                              }
                            }))}
                          />
                        </PreprocessingStepCard>
                        <PreprocessingStepCard
                          checked={preprocessingSteps.dropColumns}
                          onToggle={e => setStepsStable(s => ({ ...s, dropColumns: e.target.checked }))}
                          icon="🗑️"
                          label="Drop columns"
                          description="Remove columns that aren&apos;t needed downstream."
                        >
                          <ColumnMultiSelect
                            columns={columns}
                            selected={preprocessingSteps.dropColumnsColumns}
                            onChange={cols => setStepsStable(s => ({ ...s, dropColumnsColumns: cols }))}
                            label="Columns to drop"
                            placeholder="Select columns..."
                          />
                        </PreprocessingStepCard>
                        <PreprocessingStepCard
                          checked={preprocessingSteps.removeOutliers}
                          onToggle={e => setStepsStable(s => ({ ...s, removeOutliers: e.target.checked }))}
                          icon="📈"
                          label="Remove outliers"
                          description="Trim statistical outliers to stabilize models."
                        >
                          <div className={styles.outlierConfig}>
                            <label className={styles.outlierLabel}>Method:</label>
                            <select
                              className={styles.outlierSelect}
                              value={preprocessingSteps.removeOutliersConfig.method}
                              onChange={e => setStepsStable(s => ({
                                ...s,
                                removeOutliersConfig: { ...s.removeOutliersConfig, method: e.target.value }
                              }))}
                            >
                              <option value="iqr">IQR (Interquartile Range)</option>
                              <option value="zscore">Z-Score</option>
                            </select>
                            <label className={styles.outlierLabel}>Factor:</label>
                            <input
                              type="number"
                              step="0.1"
                              className={styles.outlierInput}
                              value={preprocessingSteps.removeOutliersConfig.factor}
                              onChange={e => setStepsStable(s => ({
                                ...s,
                                removeOutliersConfig: { ...s.removeOutliersConfig, factor: parseFloat(e.target.value) }
                              }))}
                            />
                          </div>
                          <ColumnMultiSelect
                            columns={columns}
                            selected={preprocessingSteps.removeOutliersConfig.columns}
                            onChange={cols => setStepsStable(s => ({
                              ...s,
                              removeOutliersConfig: { ...s.removeOutliersConfig, columns: cols }
                            }))}
                            label="Columns for outlier detection (default: all numeric)"
                            placeholder="Select columns..."
                          />
                        </PreprocessingStepCard>
                      </div>
                    )}

                    <div className={styles.sessionSummaryCard}>
                      <div className={styles.sessionSummaryHeader}>
                        <span className={styles.sessionSummaryLabel}>Active steps</span>
                        <span className={styles.sessionSummaryCount}>{activeSteps.length} selected</span>
                      </div>
                      {activeSteps.length ? (
                        <ul className={styles.sessionSummaryList}>
                          {activeSteps.map(step => (
                            <li key={step.key} className={styles.sessionSummaryItem}>
                              <span className={styles.sessionSummaryIcon}>{step.icon}</span>
                              <div>
                                <p className={styles.sessionSummaryTitle}>{step.title}</p>
                                <p className={styles.sessionSummaryDetails}>{step.details}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.sessionSummaryEmpty}>Pick one or more steps to tailor your dataset.</p>
                      )}
                    </div>

                    <div className={styles.actionFooter}>
                      <button
                        type="submit"
                        disabled={loading || !selectedFile}
                        className={styles.primaryCta}
                      >
                        {loading ? (
                          <div className={styles.loadingWrapper}>
                            <div className={styles.loadingSpinner}></div>
                            Processing…
                          </div>
                        ) : (
                          <div className={styles.submitContent}>
                            <span className={styles.submitIcon}>🚀</span>
                            Run preprocessing
                          </div>
                        )}
                      </button>
                      <p className={styles.actionHint}>
                        We preview up to {result?.preview_row_limit ?? 1000} rows for instant feedback. Full saves happen on demand.
                      </p>
                    </div>
                  </form>

                  <div className={styles.previewColumn}>
                    {progressInfo.status !== 'idle' && (
                      <div
                        className={`${styles.progressCard} ${progressInfo.status === 'completed' ? styles.progressCardSuccess : ''} ${progressInfo.status === 'failed' ? styles.progressCardError : ''}`}
                      >
                        <div className={styles.progressMeta}>
                          <span className={styles.progressLabel}>
                            {progressInfo.status === 'failed'
                              ? 'Processing failed'
                              : progressInfo.status === 'completed'
                                ? 'Processing complete'
                                : progressInfo.status === 'queued'
                                  ? 'Preparing job'
                                  : 'Processing dataset'}
                          </span>
                          <span className={styles.progressPercent}>
                            {Math.round(Math.max(0, Math.min(100, progressInfo.progress || 0)))}%
                          </span>
                        </div>
                        <div className={styles.progressBarTrack}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${Math.max(0, Math.min(100, progressInfo.progress || 0))}%` }}
                          />
                        </div>
                        <p className={styles.progressMessage}>
                          {progressInfo.error ? progressInfo.error : (progressInfo.message || 'Working through your preprocessing steps...')}
                        </p>
                      </div>
                    )}

                    <div className={styles.statsRow}>
                      {statsCards.map((card, index) => {
                        const toneClass = card.tone ? statToneClasses[card.tone] : '';
                        return (
                          <div key={`${card.label}-${index}`} className={`${styles.statCard} ${toneClass || ''}`}>
                            <span className={styles.statLabel}>{card.label}</span>
                            <span className={styles.statValue}>{card.value}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.previewTabs}>
                      <button
                        type="button"
                        className={activePreviewTab === 'preview' ? styles.previewTabActive : styles.previewTab}
                        onClick={() => setActivePreviewTab('preview')}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        className={activePreviewTab === 'diff' ? styles.previewTabActive : styles.previewTab}
                        onClick={() => setActivePreviewTab('diff')}
                      >
                        Diff highlights
                      </button>
                      <button
                        type="button"
                        className={activePreviewTab === 'quality' ? styles.previewTabActive : styles.previewTab}
                        onClick={() => setActivePreviewTab('quality')}
                      >
                        Data quality
                      </button>
                    </div>

                    <div className={styles.previewPanelSurface}>
                      {activePreviewTab === 'preview' ? (
                        result ? (
                          <>
                            <div className={styles.previewNote}>
                              <span>
                                Showing {previewRowCount.toLocaleString()} rows
                                {previewLimitReached && ' (truncated to preview limit)'}
                              </span>
                              {hasDiffHighlights && (
                                <span className={styles.diffInfo}>• Updated cells highlighted</span>
                              )}
                            </div>
                            {renderPreviewTable()}
                          </>
                        ) : (
                          <div className={styles.emptyState}>
                            Launch preprocessing to generate a live preview and diff highlights.
                          </div>
                        )
                      ) : activePreviewTab === 'diff' ? (
                        renderDiffHighlights()
                      ) : (
                        renderQualityInsights()
                      )}
                    </div>

                    {renderChangeSummary()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
