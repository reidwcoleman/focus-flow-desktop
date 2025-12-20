import React from 'react'
import { createPortal } from 'react-dom'

let confirmListeners = []
let currentConfirm = null

export const confirmDialog = (title, message, confirmText = 'Delete', cancelText = 'Cancel') => {
  return new Promise((resolve) => {
    const confirm = {
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: () => {
        currentConfirm = null
        notifyListeners()
        resolve(true)
      },
      onCancel: () => {
        currentConfirm = null
        notifyListeners()
        resolve(false)
      }
    }
    currentConfirm = confirm
    notifyListeners()
  })
}

function notifyListeners() {
  confirmListeners.forEach(listener => listener(currentConfirm))
}

export function ConfirmDialogContainer() {
  const [confirm, setConfirm] = React.useState(null)

  React.useEffect(() => {
    const listener = (newConfirm) => setConfirm(newConfirm)
    confirmListeners.push(listener)
    return () => {
      confirmListeners = confirmListeners.filter(l => l !== listener)
    }
  }, [])

  if (!confirm) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={confirm.onCancel}
      ></div>

      {/* Dialog */}
      <div className="relative bg-dark-bg-secondary rounded-2xl shadow-2xl border border-dark-border-glow max-w-md w-full p-6 animate-scaleIn">
        <h3 className="text-xl font-bold text-dark-text-primary mb-2">
          {confirm.title}
        </h3>
        <p className="text-dark-text-secondary mb-6">
          {confirm.message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={confirm.onCancel}
            className="px-4 py-2 rounded-xl font-semibold text-dark-text-secondary bg-dark-bg-tertiary hover:bg-dark-bg-surface transition-colors"
          >
            {confirm.cancelText}
          </button>
          <button
            onClick={confirm.onConfirm}
            className="px-4 py-2 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
          >
            {confirm.confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmDialogContainer
