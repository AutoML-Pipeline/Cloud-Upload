import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

/**
 * UploadProgress - Hugging Face-style upload progress indicator
 * Shows in top-right corner with textual progress bar
 * 
 * @param {Object} props
 * @param {string} props.filename - Name of file being uploaded
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {number} props.loaded - Bytes loaded
 * @param {number} props.total - Total bytes
 * @param {number} props.rate - Upload speed in bytes/sec
 * @param {number} props.elapsed - Elapsed time in seconds
 * @param {boolean} props.show - Show/hide the progress
 * @param {Function} props.onClose - Callback when closed
 */
export default function UploadProgress({
  filename = "file.csv",
  progress = 0,
  loaded = 0,
  total = 0,
  rate = 0,
  elapsed = 0,
  show = false,
  onClose
}) {
  const [portalRoot, setPortalRoot] = useState(null);

  useEffect(() => {
    // Create or find portal container
    let container = document.getElementById("upload-progress-portal");
    if (!container) {
      container = document.createElement("div");
      container.id = "upload-progress-portal";
      container.className = "fixed top-20 right-4 z-[9999] pointer-events-none";
      document.body.appendChild(container);
    }
    setPortalRoot(container);

    return () => {
      // Clean up if no more progress indicators
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    };
  }, []);

  // Format bytes to human-readable
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + sizes[i];
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate ETA
  const eta = rate > 0 ? (total - loaded) / rate : 0;

  // Create textual progress bar (using block characters)
  const createTextBar = (percent) => {
    const barLength = 30;
    const filled = Math.round((percent / 100) * barLength);
    const empty = barLength - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  // Format rate
  const formattedRate = rate > 0 ? `${formatBytes(rate)}/s` : "0B/s";

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: -20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="pointer-events-auto mb-3"
        >
          <div className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 overflow-hidden max-w-lg">
            {/* Header with filename and close button */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-blue-400 text-lg">⬆️</span>
                <span className="font-mono text-sm text-gray-200 truncate">{filename}</span>
              </div>
              {onClose && progress === 100 && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-200 transition-colors ml-2 flex-shrink-0"
                  aria-label="Close"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Progress content */}
            <div className="p-4 space-y-3">
              {/* Hugging Face-style text progress line */}
              <div className="font-mono text-xs text-gray-300 break-all">
                <span className="text-green-400">{filename}</span>
                <span className="text-gray-400">: </span>
                <span className="text-blue-400">{Math.round(progress)}%</span>
                <span className="text-gray-500">|{createTextBar(progress)}| </span>
                <span className="text-cyan-400">{formatBytes(loaded)}</span>
                <span className="text-gray-500">/</span>
                <span className="text-cyan-400">{formatBytes(total)}</span>
                <span className="text-gray-500"> [{formatTime(elapsed)}&lt;{formatTime(eta)}, </span>
                <span className="text-purple-400">{formattedRate}</span>
                <span className="text-gray-500">]</span>
              </div>

              {/* Visual progress bar */}
              <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">
                  {formatBytes(loaded)} of {formatBytes(total)}
                </span>
                <span className="text-purple-400 font-mono">{formattedRate}</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalRoot
  );
}
