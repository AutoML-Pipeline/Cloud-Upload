import React from 'react'
import { Toaster } from 'react-hot-toast'

export default function Toasts() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{
        duration: 3000,
        className:
          'rounded-xl bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 shadow-xl',
        style: { padding: '0.5rem 0.75rem' },
        success: {
          iconTheme: { primary: '#10b981', secondary: 'white' },
        },
        error: {
          iconTheme: { primary: '#ef4444', secondary: 'white' },
        },
      }}
    />
  )
}
