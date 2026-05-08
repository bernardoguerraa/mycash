'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
  descricao: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export default function DeleteConfirmModal({ descricao, onConfirm, onCancel }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onCancel()
  }

  const handleConfirm = async () => {
    setDeleting(true)
    await onConfirm()
    setDeleting(false)
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <div className="card animate-scale-in w-full max-w-sm rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge-1 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">Confirmar Exclusao</h3>
          <button
            onClick={onCancel}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-rose-500/[0.08]">
              <AlertTriangle className="h-5 w-5 text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-zinc-300">
                Tem certeza que deseja excluir a transacao{' '}
                <span className="font-medium text-white">&ldquo;{descricao}&rdquo;</span>?
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Esta acao nao pode ser desfeita.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-edge-1 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={deleting}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}
