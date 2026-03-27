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
      newErrors.descricao = 'Informe a descricao.'
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-gray-800 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Transacao' : 'Nova Transacao'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {errors.form && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {errors.form}
            </div>
          )}

          {/* Conta */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Conta
            </label>
            <select
              value={idConta}
              onChange={(e) => setIdConta(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {contas.map((c) => (
                <option key={c.id_conta} value={c.id_conta}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.conta && (
              <p className="mt-1 text-xs text-red-400">{errors.conta}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Tipo
            </label>
            <div className="flex gap-3">
              {(['Entrada', 'Saida'] as TipoTransacao[]).map((t) => (
                <label
                  key={t}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    tipo === t
                      ? t === 'Entrada'
                        ? 'border-green-500 bg-green-500/10 text-green-400'
                        : 'border-red-500 bg-red-500/10 text-red-400'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
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
                  {t === 'Entrada' ? 'Entrada' : 'Saida'}
                </label>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
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
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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
                className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            )}
            {errors.categoria && (
              <p className="mt-1 text-xs text-red-400">{errors.categoria}</p>
            )}
          </div>

          {/* Descricao */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Descricao
            </label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Supermercado, Salario mensal..."
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            />
            {errors.descricao && (
              <p className="mt-1 text-xs text-red-400">{errors.descricao}</p>
            )}
          </div>

          {/* Valor + Data row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
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
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {errors.valor && (
                <p className="mt-1 text-xs text-red-400">{errors.valor}</p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Data
              </label>
              <input
                type="date"
                value={dataTransacao}
                onChange={(e) => setDataTransacao(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
              />
              {errors.data && (
                <p className="mt-1 text-xs text-red-400">{errors.data}</p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:border-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar Alteracoes'
                  : 'Criar Transacao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
