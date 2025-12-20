import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// Toast notification system
let toastQueue = []
let toastListeners = []

export const toast = {
  success: (message) => {
    addToast({ type: 'success', message })
  },
  error: (message) => {
    addToast({ type: 'error', message })
  },
  info: (message) => {
    addToast({ type: 'info', message })
  },
  warning: (message) => {
    addToast({ type: 'warning', message })
  }
}

function addToast(toast) {
  const id = Date.now() + Math.random()
  const newToast = { ...toast, id }
  toastQueue = [...toastQueue, newToast]
  toastListeners.forEach(listener => listener(toastQueue))

  // Auto-remove after 4 seconds
  setTimeout(() => {
    removeToast(id)
  }, 4000)
}

function removeToast(id) {
  toastQueue = toastQueue.filter(t => t.id !== id)
  toastListeners.forEach(listener => listener(toastQueue))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (newToasts) => setToasts(newToasts)
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (toasts.length === 0) return null

  return createPortal(
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-lg border backdrop-blur-sm animate-slideInRight ${
            toast.type === 'success'
              ? 'bg-green-500/90 border-green-400 text-white'
              : toast.type === 'error'
              ? 'bg-red-500/90 border-red-400 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-500/90 border-amber-400 text-white'
              : 'bg-blue-500/90 border-blue-400 text-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1 text-sm font-medium whitespace-pre-line">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  )
}

export default ToastContainer
