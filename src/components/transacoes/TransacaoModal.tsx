'use client'

import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { TipoTransacao } from '@/types/database'
import { createClient } from '@/lib/supabase/client'

interface Transacao {
  id_transacao: number
  id_conta: number
  data_transacao: string
  tipo: TipoTransacao
  categoria: string
  descricao: string
  valor: number
}

interface ContaOption {
  id_conta: number
  label: string
}

interface Props {
  contas: ContaOption[]
  transacao: Transacao | null
  onClose: () => void
  onSaved: () => void
}

const CATEGORIAS = [
  'Alimentacao',
  'Transporte',
  'Moradia',
  'Saude',
  'Educacao',
  'Lazer',
  'Salario',
  'Freelance',
  'Investimento',
  'Outros',
]

export default function TransacaoModal({ contas, transacao, onClose, onSaved }: Props) {
  const supabase = createClient()
  const overlayRef = useRef<HTMLDivElement>(null)

  const isEditing = transacao !== null

  const [idConta, setIdConta] = useState<number>(
    transacao?.id_conta ?? contas[0]?.id_conta ?? 0
  )
  const [tipo, setTipo] = useState<TipoTransacao>(transacao?.tipo ?? 'Saida')
  const [categoria, setCategoria] = useState(transacao?.categoria ?? CATEGORIAS[0])
  const [customCategoria, setCustomCategoria] = useState('')
  const [descricao, setDescricao] = useState(transacao?.descricao ?? '')
  const [valorStr, setValorStr] = useState(
    transacao ? String(Math.abs(transacao.valor).toFixed(2)) : ''
  )
  const [dataTransacao, setDataTransacao] = useState(
    transacao?.data_transacao
      ? transacao.data_transacao.substring(0, 10)
      : new Date().toISOString().substring(0, 10)
  )

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Detect if the existing categoria is not in predefined list
  const [useCustomCategoria, setUseCustomCategoria] = useState(false)

  useEffect(() => {
    if (transacao && !CATEGORIAS.includes(transacao.categoria)) {
      setUseCustomCategoria(true)
      setCustomCategoria(transacao.categoria)
      setCategoria('Outros')
    }
  }, [transacao])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Close on overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!idConta) {
      newErrors.conta = 'Selecione uma conta.'
    }

    const finalCategoria = useCustomCategoria ? customCategoria.trim() : categoria
    if (!finalCategoria) {
      newErrors.categoria = 'Informe a categoria.'
    }

    if (!descricao.trim()) {
      newErrors.descricao = 'Informe a descrição.'
    }

    const valor = parseFloat(valorStr.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) {
      newErrors.valor = 'Informe um valor positivo.'
    }

    if (!dataTransacao) {
      newErrors.data = 'Informe a data.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    const finalCategoria = useCustomCategoria ? customCategoria.trim() : categoria
    const valor = parseFloat(valorStr.replace(',', '.'))

    const payload = {
      id_conta: idConta,
      tipo,
      categoria: finalCategoria,
      descricao: descricao.trim(),
      valor,
      data_transacao: dataTransacao,
    }

    let error

    if (isEditing) {
      const result = await supabase
        .from('transacoes')
        .update(payload)
        .eq('id_transacao', transacao.id_transacao)
      error = result.error
    } else {
      const result = await supabase.from('transacoes').insert(payload)
      error = result.error
    }

    setSubmitting(false)

    if (error) {
      setErrors({ form: error.message })
      return
    }

    onSaved()
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <div className="card animate-scale-in w-full max-w-lg rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge-1 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Transação' : 'Nova Transação'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {errors.form && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-4 py-2 text-sm text-rose-400">
              {errors.form}
            </div>
          )}

          {/* Conta */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Conta
            </label>
            <select
              value={idConta}
              onChange={(e) => setIdConta(Number(e.target.value))}
              className="input-field w-full"
            >
              {contas.map((c) => (
                <option key={c.id_conta} value={c.id_conta}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.conta && (
              <p className="mt-1 text-xs text-rose-400">{errors.conta}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Tipo
            </label>
            <div className="flex gap-3">
              {(['Entrada', 'Saida'] as TipoTransacao[]).map((t) => (
                <label
                  key={t}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    tipo === t
                      ? t === 'Entrada'
                        ? 'border-emerald-500 bg-emerald-500/[0.08] text-emerald-400'
                        : 'border-rose-500 bg-rose-500/[0.08] text-rose-400'
                      : 'border-edge-2 bg-surface-3 text-zinc-400 hover:border-edge-3'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={t}
                    checked={tipo === t}
                    onChange={() => setTipo(t)}
                    className="sr-only"
                  />
                  {t === 'Entrada' ? 'Entrada' : 'Saída'}
                </label>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Categoria
            </label>
            <select
              value={useCustomCategoria ? '__custom__' : categoria}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setUseCustomCategoria(true)
                } else {
                  setUseCustomCategoria(false)
                  setCategoria(e.target.value)
                }
              }}
              className="input-field w-full"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
              <option value="__custom__">Outra (personalizada)...</option>
            </select>
            {useCustomCategoria && (
              <input
                type="text"
                value={customCategoria}
                onChange={(e) => setCustomCategoria(e.target.value)}
                placeholder="Nome da categoria"
                className="input-field mt-2 w-full"
              />
            )}
            {errors.categoria && (
              <p className="mt-1 text-xs text-rose-400">{errors.categoria}</p>
            )}
          </div>

          {/* Descricao */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
              Descrição
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Supermercado, Salário mensal..."
              className="input-field w-full"
            />
            {errors.descricao && (
              <p className="mt-1 text-xs text-rose-400">{errors.descricao}</p>
            )}
          </div>

          {/* Valor + Data row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Valor (R$)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={valorStr}
                onChange={(e) => {
                  // Allow digits, comma, dot
                  const v = e.target.value.replace(/[^0-9.,]/g, '')
                  setValorStr(v)
                }}
                placeholder="0,00"
                className="input-field w-full font-mono-nums"
              />
              {errors.valor && (
                <p className="mt-1 text-xs text-rose-400">{errors.valor}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Data
              </label>
              <input
                type="date"
                value={dataTransacao}
                onChange={(e) => setDataTransacao(e.target.value)}
                className="input-field w-full"
              />
              {errors.data && (
                <p className="mt-1 text-xs text-rose-400">{errors.data}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alterações'
                  : 'Criar Transação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
