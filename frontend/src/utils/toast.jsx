import { toast as hotToast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import React from 'react'

// Simple in-memory queue + de-dupe by key
const queue = []
let showing = false
const activeKeys = new Set()

const DEFAULT_DURATION = 2800 // ms
const BETWEEN_DELAY = 900 // ms gap between toasts to feel sequential

function computeKey(item) {
  if (item.idKey) return item.idKey
  return `${item.type || 'info'}::${item.message}`
}

function showNext() {
  if (queue.length === 0) {
    showing = false
    return
  }
  showing = true
  const item = queue.shift()

  hotToast.custom(
    (t) => (
      <AnimatePresence>
        {t.visible && (
          <motion.div
            initial={{ y: -12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -10, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 520, damping: 32, mass: 0.9 }}
            className="pointer-events-auto w-[340px] max-w-[92vw] rounded-xl border border-slate-200/70 shadow-2xl bg-gradient-to-br from-white/95 to-white/75 backdrop-blur-md px-4 py-3 flex items-start gap-3"
          >
            <div className="shrink-0 mt-0.5">
              <span
                className={
                  `inline-flex h-7 w-7 items-center justify-center rounded-full text-lg shadow-sm ` +
                  (item.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                    : item.type === 'error'
                    ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white')
                }
                aria-hidden
              >
                {item.type === 'success' ? '✓' : item.type === 'error' ? '⚠️' : 'ℹ️'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {item.title && (
                <div className="text-[0.92rem] font-semibold text-slate-800 leading-5 truncate">
                  {item.title}
                </div>
              )}
              <div className="text-[0.9rem] text-slate-700/90 leading-5">
                {item.message}
              </div>
            </div>
            <button
              onClick={() => hotToast.dismiss(t.id)}
              className="ml-1 rounded-md px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100/70 transition"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    ),
    {
      duration: item.duration ?? 2800,
      position: item.position ?? 'top-right',
      id: item.internalId,
    }
  )

  const totalDelay = (item.duration ?? 2800) + (item.afterDelay ?? 900)
  setTimeout(() => {
    activeKeys.delete(item.key)
    showNext()
  }, totalDelay)
}

function enqueue(raw) {
  const item = { ...raw }
  item.key = computeKey(item)
  if (activeKeys.has(item.key)) return
  activeKeys.add(item.key)
  item.internalId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  queue.push(item)
  if (!showing) showNext()
}

function success(message, opts = {}) { enqueue({ type: 'success', message, ...opts }) }
function info(message, opts = {}) { enqueue({ type: 'info', message, ...opts }) }
function error(message, opts = {}) { enqueue({ type: 'error', message, ...opts }) }

// Playful helpers
function welcomeLogin(opts = {}) { success("🟢 Welcome back, genius! You're logged in 🎉", { idKey: 'login-success', ...opts }) }
function dataLaunched(opts = {}) { success('🚀 Your data has launched successfully!', { idKey: 'upload-success', ...opts }) }
function modelBrains(opts = {}) { info('🧠 Model training complete — brains at work!', { idKey: 'train-complete', ...opts }) }

export const saasToast = { enqueue, success, info, error, welcomeLogin, dataLaunched, modelBrains }
export default saasToast
