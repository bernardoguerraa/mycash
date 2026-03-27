'use client'

import { useState, useEffect, FormEvent } from 'react'
import { X, Target } from 'lucide-react'
import { Database, StatusMeta } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

type Meta = Database['public']['Tables']['metas_financeiras']['Row']

interface MetaModalProps {
  meta?: Meta
  idUsuario: number
  onClose: () => void
  onSaved: () => void
}

function parseCurrencyInput(value: string): number {
  // Remove R$, dots (thousands), and replace comma with dot (decimal)
  const cleaned = value
    .replace(/R\$\s?/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function formatCurrencyInput(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function MetaModal({
  meta,
  idUsuario,
  onClose,
  onSaved,
}: MetaModalProps) {
  const isEditing = !!meta

  const [titulo, setTitulo] = useState(meta?.titulo ?? '')
  const [valorObjetivo, setValorObjetivo] = useState(
    meta ? formatCurrencyInput(meta.valor_objetivo) : ''
  )
  const [valorAtual, setValorAtual] = useState(
    meta ? formatCurrencyInput(meta.valor_atual) : '0,00'
  )
  const [dataInicio, setDataInicio] = useState(
    meta?.data_inicio
      ? meta.data_inicio.split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [dataLimite, setDataLimite] = useState(
    meta?.data_limite ? meta.data_limite.split('T')[0] : ''
  )
  const [status, setStatus] = useState<StatusMeta>(meta?.status ?? 'EmAndamento')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!titulo.trim()) {
      newErrors.titulo = 'Titulo e obrigatorio'
    }

    const objetivo = parseCurrencyInput(valorObjetivo)
    if (objetivo <= 0) {
      newErrors.valorObjetivo = 'Valor objetivo deve ser maior que zero'
    }

    if (!dataInicio) {
      newErrors.dataInicio = 'Data de inicio e obrigatoria'
    }

    if (!dataLimite) {
      newErrors.dataLimite = 'Data limite e obrigatoria'
    }

    if (dataInicio && dataLimite && new Date(dataLimite) <= new Date(dataInicio)) {
      newErrors.dataLimite = 'Data limite deve ser posterior a data de inicio'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const supabase = createClient()

    const payload = {
      id_usuario: idUsuario,
      titulo: titulo.trim(),
      valor_objetivo: parseCurrencyInput(valorObjetivo),
      valor_atual: parseCurrencyInput(valorAtual),
      data_inicio: dataInicio,
      data_limite: dataLimite,
      status,
    }

    if (isEditing && meta) {
      await supabase
        .from('metas_financeiras')
        .update(payload)
        .eq('id_meta', meta.id_meta)
    } else {
      await supabase.from('metas_financeiras').insert(payload)
    }

    setSaving(false)
    onSaved()
  }

  const statusOptions: { value: StatusMeta; label: string }[] = [
    { value: 'EmAndamento', label: 'Em Andamento' },
    { value: 'Concluida', label: 'Concluida' },
    { value: 'Cancelada', label: 'Cancelada' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              {isEditing ? 'Editar Meta' : 'Nova Meta'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Titulo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Titulo
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Reserva de emergencia"
              className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-green-500/40 ${
                errors.titulo ? 'border-red-500' : 'border-gray-700 focus:border-green-500'
              }`}
            />
            {errors.titulo && (
              <p className="mt-1 text-xs text-red-400">{errors.titulo}</p>
            )}
          </div>

          {/* Valor Objetivo + Valor Atual */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Valor Objetivo (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valorObjetivo}
                onChange={(e) => setValorObjetivo(e.target.value)}
                placeholder="10.000,00"
                className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:ring-2 focus:ring-green-500/40 ${
                  errors.valorObjetivo
                    ? 'border-red-500'
                    : 'border-gray-700 focus:border-green-500'
                }`}
              />
              {errors.valorObjetivo && (
                <p className="mt-1 text-xs text-red-400">{errors.valorObjetivo}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Valor Atual (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valorAtual}
                onChange={(e) => setValorAtual(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/40"
              />
            </div>
          </div>

          {/* Data Inicio + Data Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Data de Inicio
              </label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:ring-2 focus:ring-green-500/40 [color-scheme:dark] ${
                  errors.dataInicio
                    ? 'border-red-500'
                    : 'border-gray-700 focus:border-green-500'
                }`}
              />
              {errors.dataInicio && (
                <p className="mt-1 text-xs text-red-400">{errors.dataInicio}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Data Limite
              </label>
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className={`w-full rounded-lg border bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:ring-2 focus:ring-green-500/40 [color-scheme:dark] ${
                  errors.dataLimite
                    ? 'border-red-500'
                    : 'border-gray-700 focus:border-green-500'
                }`}
              />
              {errors.dataLimite && (
                <p className="mt-1 text-xs text-red-400">{errors.dataLimite}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusMeta)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500/40 [color-scheme:dark]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

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
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-green-500/20 transition-all hover:bg-green-400 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
