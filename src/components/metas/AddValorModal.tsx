'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, PiggyBank, TrendingUp } from 'lucide-react'
import { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type Meta = Database['public']['Tables']['metas_financeiras']['Row']

interface AddValorModalProps {
  meta: Meta
  onClose: () => void
  onSaved: () => void
}

function parseCurrencyInput(value: string): number {
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

export default function AddValorModal({
  meta,
  onClose,
  onSaved,
}: AddValorModalProps) {
  const [valor, setValor] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const additionalValue = parseCurrencyInput(valor)
  const newTotal = meta.valor_atual + additionalValue
  const newProgress =
    meta.valor_objetivo > 0
      ? Math.min((newTotal / meta.valor_objetivo) * 100, 100)
      : 0
  const currentProgress =
    meta.valor_objetivo > 0
      ? Math.min((meta.valor_atual / meta.valor_objetivo) * 100, 100)
      : 0
  const willComplete = newTotal >= meta.valor_objetivo

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (additionalValue <= 0) {
      setError('Informe um valor maior que zero')
      return
    }

    setSaving(true)
    const supabase = createClient()

    const updates: Database['public']['Tables']['metas_financeiras']['Update'] = {
      valor_atual: newTotal,
    }

    // Auto-complete if target reached
    if (willComplete) {
      updates.status = 'Concluida'
    }

    await supabase
      .from('metas_financeiras')
      .update(updates)
      .eq('id_meta', meta.id_meta)

    setSaving(false)
    onSaved()
  }

  const remaining = Math.max(meta.valor_objetivo - meta.valor_atual, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
              <PiggyBank className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Adicionar Valor</h3>
              <p className="text-xs text-gray-400 truncate max-w-[240px]">
                {meta.titulo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Current progress */}
          <div className="rounded-lg border border-gray-800 bg-gray-800/40 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Progresso atual</span>
              <span className="font-semibold text-white">
                {currentProgress.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{formatCurrency(meta.valor_atual)}</span>
              <span>{formatCurrency(meta.valor_objetivo)}</span>
            </div>
            <div className="text-center">
              <span className="text-xs text-gray-400">
                Faltam{' '}
                <span className="font-semibold text-white">
                  {formatCurrency(remaining)}
                </span>{' '}
                para concluir
              </span>
            </div>
          </div>

          {/* Value input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Valor a adicionar (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(e) => {
                setValor(e.target.value)
                setError('')
              }}
              placeholder="500,00"
              autoFocus
              className={`w-full rounded-lg border bg-gray-800 px-3.5 py-3 text-lg font-semibold text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-green-500/40 ${
                error ? 'border-red-500' : 'border-gray-700 focus:border-green-500'
              }`}
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
          </div>

          {/* Preview */}
          {additionalValue > 0 && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-green-400">
                <TrendingUp className="h-4 w-4" />
                Novo progresso: {newProgress.toFixed(1)}%
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-green-500 transition-all duration-500"
                  style={{ width: `${newProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-400">
                  {formatCurrency(newTotal)}
                </span>
                <span className="text-gray-500">
                  {formatCurrency(meta.valor_objetivo)}
                </span>
              </div>
              {willComplete && (
                <div className="mt-1 rounded-md bg-green-500/10 px-3 py-2 text-center text-xs font-semibold text-green-400">
                  Meta sera concluida automaticamente!
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || additionalValue <= 0}
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-400 disabled:opacity-50"
            >
              <PiggyBank className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
