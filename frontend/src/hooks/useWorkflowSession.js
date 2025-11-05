/**
 * useWorkflowSession Hook
 * 
 * Manages workflow state persistence using sessionStorage with future backend sync support.
 * Automatically saves and restores workflow progress across page refreshes.
 * 
 * Phase 1: sessionStorage (current implementation)
 * Phase 2: Backend API sync (ready for integration)
 * 
 * @example
 * const {
 *   savedState,
 *   saveWorkflowState,
 *   clearWorkflowState,
 *   hasResumableState
 * } = useWorkflowSession('preprocessing', selectedFile);
 */

import { useEffect, useRef, useCallback, useState } from "react";
import saasToast from "@/utils/toast";

const STORAGE_PREFIX = "workflow_session_";
const STORAGE_VERSION = "v1"; // For future migrations

/**
 * Generate storage key for workflow
 */
function getStorageKey(workflowType, fileIdentifier = null) {
  if (fileIdentifier) {
    // File-specific workflow state
    return `${STORAGE_PREFIX}${workflowType}_${fileIdentifier}_${STORAGE_VERSION}`;
  }
  // Global workflow state (current file, step, etc.)
  return `${STORAGE_PREFIX}${workflowType}_${STORAGE_VERSION}`;
}

/**
 * Save workflow state to sessionStorage
 */
function saveToSession(key, data) {
  try {
    const payload = {
      data,
      timestamp: new Date().toISOString(),
      version: STORAGE_VERSION,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.error("Failed to save workflow state:", error);
    return false;
  }
}

/**
 * Load workflow state from sessionStorage
 */
function loadFromSession(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    
    const payload = JSON.parse(raw);
    
    // Version check for future migrations
    if (payload.version !== STORAGE_VERSION) {
      console.warn(`Workflow state version mismatch. Expected ${STORAGE_VERSION}, got ${payload.version}`);
      return null;
    }
    
    return payload.data;
  } catch (error) {
    console.error("Failed to load workflow state:", error);
    return null;
  }
}

/**
 * Clear workflow state from sessionStorage
 */
function clearFromSession(key) {
  try {
    sessionStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Failed to clear workflow state:", error);
    return false;
  }
}

/**
 * Clear all workflow states for a specific workflow type
 */
function clearAllForWorkflow(workflowType) {
  try {
    const prefix = `${STORAGE_PREFIX}${workflowType}_`;
    const keys = Object.keys(sessionStorage).filter(key => key.startsWith(prefix));
    keys.forEach(key => sessionStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error("Failed to clear all workflow states:", error);
    return false;
  }
}

/**
 * Main hook for workflow session management
 */
export function useWorkflowSession(workflowType, fileIdentifier = null) {
  const [savedState, setSavedState] = useState(null);
  const [hasResumableState, setHasResumableState] = useState(false);
  const storageKey = getStorageKey(workflowType, fileIdentifier);
  const isInitialMount = useRef(true);
  const lastSavedState = useRef(null);

  // Load saved state on mount
  useEffect(() => {
    if (isInitialMount.current) {
      const loaded = loadFromSession(storageKey);
      if (loaded) {
        setSavedState(loaded);
        setHasResumableState(true);
        console.log(`📂 Loaded workflow state for ${workflowType}:`, loaded);
      }
      isInitialMount.current = false;
    }
  }, [storageKey, workflowType]);

  /**
   * Save workflow state (debounced to avoid excessive writes)
   */
  const saveWorkflowState = useCallback((state, options = {}) => {
    const {
      silent = false,        // Don't show toast notification
      merge = true,          // Merge with existing state or replace
      showToast = false,     // Explicitly show save confirmation
    } = options;

    if (!state) {
      console.warn("Attempted to save null/undefined workflow state");
      return false;
    }

    // Avoid saving identical state
    if (JSON.stringify(state) === JSON.stringify(lastSavedState.current)) {
      return false;
    }

    const stateToSave = merge && savedState 
      ? { ...savedState, ...state }
      : state;

    const success = saveToSession(storageKey, stateToSave);
    
    if (success) {
      setSavedState(stateToSave);
      setHasResumableState(true);
      lastSavedState.current = stateToSave;
      
      if (showToast) {
        saasToast.success("Progress saved", { 
          idKey: `workflow-save-${workflowType}`,
          duration: 2000 
        });
      }
      
      if (!silent) {
        console.log(`💾 Saved workflow state for ${workflowType}`);
      }
    }

    return success;
  }, [storageKey, workflowType, savedState]);

  /**
   * Clear workflow state
   */
  const clearWorkflowState = useCallback((options = {}) => {
    const {
      silent = false,
      clearAll = false,  // Clear all files for this workflow type
    } = options;

    let success;
    if (clearAll) {
      success = clearAllForWorkflow(workflowType);
    } else {
      success = clearFromSession(storageKey);
    }

    if (success) {
      setSavedState(null);
      setHasResumableState(false);
      lastSavedState.current = null;
      
      if (!silent) {
        console.log(`🗑️ Cleared workflow state for ${workflowType}`);
      }
    }

    return success;
  }, [storageKey, workflowType]);

  /**
   * Show resume notification (call after restoring state)
   */
  const showResumeNotification = useCallback((message = null) => {
    const defaultMessage = `Resuming your ${workflowType} workflow...`;
    saasToast.success(message || defaultMessage, {
      idKey: `workflow-resume-${workflowType}`,
      duration: 3000,
    });
  }, [workflowType]);

  /**
   * Get specific field from saved state
   */
  const getStateField = useCallback((fieldPath) => {
    if (!savedState) return null;
    
    // Support nested paths like "steps.removeDuplicates"
    const keys = fieldPath.split(".");
    let value = savedState;
    
    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  }, [savedState]);

  /**
   * Check if state is stale (older than X minutes)
   */
  const isStateStale = useCallback((maxAgeMinutes = 60) => {
    if (!savedState) return false;
    
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return false;
      
      const payload = JSON.parse(raw);
      const savedTime = new Date(payload.timestamp);
      const now = new Date();
      const ageMinutes = (now - savedTime) / (1000 * 60);
      
      return ageMinutes > maxAgeMinutes;
    } catch {
      return false;
    }
  }, [savedState, storageKey]);

  // 🔮 Future: Backend sync placeholder
  // const syncToBackend = useCallback(async (state) => {
  //   try {
  //     const response = await fetch('/api/workflow/save', {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         workflowType,
  //         fileIdentifier,
  //         state,
  //       }),
  //     });
  //     const result = await response.json();
  //     return result.workflow_id;
  //   } catch (error) {
  //     console.error('Backend sync failed:', error);
  //     return null;
  //   }
  // }, [workflowType, fileIdentifier]);

  return {
    // State
    savedState,
    hasResumableState,
    
    // Actions
    saveWorkflowState,
    clearWorkflowState,
    showResumeNotification,
    
    // Utilities
    getStateField,
    isStateStale,
    
    // Metadata
    storageKey,
  };
}

/**
 * Hook for auto-saving workflow state on changes
 */
export function useAutoSaveWorkflow(workflowType, fileIdentifier, watchedState, options = {}) {
  const { saveWorkflowState } = useWorkflowSession(workflowType, fileIdentifier);
  const {
    debounceMs = 500,      // Debounce saves to avoid excessive writes
    enabled = true,        // Can disable auto-save
    saveOnUnmount = true,  // Save when component unmounts
  } = options;

  const timeoutRef = useRef(null);
  const previousState = useRef(null);

  // Auto-save on state changes (debounced)
  useEffect(() => {
    if (!enabled || !watchedState) return;

    // Skip if state hasn't changed
    if (JSON.stringify(watchedState) === JSON.stringify(previousState.current)) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce save
    timeoutRef.current = setTimeout(() => {
      saveWorkflowState(watchedState, { silent: true });
      previousState.current = watchedState;
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watchedState, enabled, debounceMs, saveWorkflowState]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveOnUnmount && watchedState) {
        saveWorkflowState(watchedState, { silent: true });
      }
    };
  }, [saveOnUnmount, watchedState, saveWorkflowState]);
}

export default useWorkflowSession;
