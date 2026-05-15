'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database, TipoLembrete } from '@/types/database'

type Lembrete = Database['public']['Tables']['lembretes']['Row']

interface LembreteModalProps {
  lembrete: Lembrete | null
  idUsuario: number
  onClose: () => void
  onSaved: (lembrete: Lembrete) => void
}

export default function LembreteModal({
  lembrete,
  idUsuario,
  onClose,
  onSaved,
}: LembreteModalProps) {
  const isEditing = lembrete !== null

  const [descricao, setDescricao] = useState(lembrete?.descricao ?? '')
  const [dataVencimento, setDataVencimento] = useState(lembrete?.data_vencimento ?? '')
  const [valorPrevisto, setValorPrevisto] = useState(
    lembrete ? String(lembrete.valor_previsto) : ''
  )
  const [tipo, setTipo] = useState<TipoLembrete>(lembrete?.tipo ?? 'ContaPagar')
  const [ativo, setAtivo] = useState(lembrete?.ativo ?? true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!descricao.trim()) {
      newErrors.descricao = 'Descrição é obrigatória'
    }
    if (!dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória'
    }
    const parsedValor = parseFloat(valorPrevisto)
    if (!valorPrevisto || isNaN(parsedValor) || parsedValor <= 0) {
      newErrors.valorPrevisto = 'Valor deve ser maior que zero'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSaving(true)
    const parsedValor = parseFloat(valorPrevisto)

    if (isEditing) {
      const { data, error } = await supabase
        .from('lembretes')
        .update({
          descricao: descricao.trim(),
          data_vencimento: dataVencimento,
          valor_previsto: parsedValor,
          tipo,
          ativo,
        })
        .eq('id_lembrete', lembrete.id_lembrete)
        .select()
        .single()

      if (!error && data) {
        onSaved(data)
      }
    } else {
      const { data, error } = await supabase
        .from('lembretes')
        .insert({
          id_usuario: idUsuario,
          descricao: descricao.trim(),
          data_vencimento: dataVencimento,
          valor_previsto: parsedValor,
          tipo,
          ativo,
        })
        .select()
        .single()

      if (!error && data) {
        onSaved(data)
      }
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="card animate-scale-in relative w-full max-w-md rounded-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Lembrete' : 'Novo Lembrete'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Descricao */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Descrição
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel, Fatura cartão..."
              className={`mt-1 w-full rounded-lg border bg-surface-3 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 ${
                errors.descricao
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-edge-2 focus:border-emerald-500/20 focus:ring-emerald-500/20'
              }`}
            />
            {errors.descricao && (
              <p className="mt-1 text-xs text-rose-400">{errors.descricao}</p>
            )}
          </div>

          {/* Data Vencimento */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className={`mt-1 w-full rounded-lg border bg-surface-3 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 [color-scheme:dark] ${
                errors.dataVencimento
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-edge-2 focus:border-emerald-500/20 focus:ring-emerald-500/20'
              }`}
            />
            {errors.dataVencimento && (
              <p className="mt-1 text-xs text-rose-400">{errors.dataVencimento}</p>
            )}
          </div>

          {/* Valor Previsto */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Valor Previsto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPrevisto}
              onChange={(e) => setValorPrevisto(e.target.value)}
              placeholder="0,00"
              className={`mt-1 w-full rounded-lg border bg-surface-3 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 font-mono-nums ${
                errors.valorPrevisto
                  ? 'border-rose-500 focus:ring-rose-500/20'
                  : 'border-edge-2 focus:border-emerald-500/20 focus:ring-emerald-500/20'
              }`}
            />
            {errors.valorPrevisto && (
              <p className="mt-1 text-xs text-rose-400">{errors.valorPrevisto}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">Tipo</label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="ContaPagar"
                  checked={tipo === 'ContaPagar'}
                  onChange={() => setTipo('ContaPagar')}
                  className="h-4 w-4 border-edge-2 bg-surface-3 text-rose-500 focus:ring-rose-500/20 focus:ring-offset-surface-2"
                />
                <span className="text-sm text-rose-400">Conta a Pagar</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="ContaReceber"
                  checked={tipo === 'ContaReceber'}
                  onChange={() => setTipo('ContaReceber')}
                  className="h-4 w-4 border-edge-2 bg-surface-3 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-surface-2"
                />
                <span className="text-sm text-emerald-400">Conta a Receber</span>
              </label>
            </div>
          </div>

          {/* Ativo */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="ativo"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-edge-2 bg-surface-3 text-emerald-500 focus:ring-emerald-500/20 focus:ring-offset-surface-2"
            />
            <label htmlFor="ativo" className="text-sm text-zinc-300">
              Lembrete ativo
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
