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
      newErrors.descricao = 'Descricao e obrigatoria'
    }
    if (!dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento e obrigatoria'
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Lembrete' : 'Novo Lembrete'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Descricao */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Descricao
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel, Fatura cartao..."
              className={`mt-1 w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                errors.descricao
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
              }`}
            />
            {errors.descricao && (
              <p className="mt-1 text-xs text-red-400">{errors.descricao}</p>
            )}
          </div>

          {/* Data Vencimento */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Data de Vencimento
            </label>
            <input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className={`mt-1 w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 ${
                errors.dataVencimento
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
              }`}
            />
            {errors.dataVencimento && (
              <p className="mt-1 text-xs text-red-400">{errors.dataVencimento}</p>
            )}
          </div>

          {/* Valor Previsto */}
          <div>
            <label className="block text-sm font-medium text-gray-300">
              Valor Previsto (R$)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={valorPrevisto}
              onChange={(e) => setValorPrevisto(e.target.value)}
              placeholder="0,00"
              className={`mt-1 w-full rounded-lg border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 ${
                errors.valorPrevisto
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-700 focus:border-green-500 focus:ring-green-500'
              }`}
            />
            {errors.valorPrevisto && (
              <p className="mt-1 text-xs text-red-400">{errors.valorPrevisto}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300">Tipo</label>
            <div className="mt-2 flex gap-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="ContaPagar"
                  checked={tipo === 'ContaPagar'}
                  onChange={() => setTipo('ContaPagar')}
                  className="h-4 w-4 border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-red-400">Conta a Pagar</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="tipo"
                  value="ContaReceber"
                  checked={tipo === 'ContaReceber'}
                  onChange={() => setTipo('ContaReceber')}
                  className="h-4 w-4 border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-green-400">Conta a Receber</span>
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
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900"
            />
            <label htmlFor="ativo" className="text-sm text-gray-300">
              Lembrete ativo
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
