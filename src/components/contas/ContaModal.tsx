'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type ContaBancaria = Database['public']['Tables']['contas_bancarias']['Row']

interface ContaModalProps {
  conta: ContaBancaria | null
  onClose: () => void
  onSaved: (conta: ContaBancaria) => void
}

const TIPOS_CONTA = ['Corrente', 'Poupanca', 'Investimento', 'Carteira Digital']

export default function ContaModal({ conta, onClose, onSaved }: ContaModalProps) {
  const [instituicao, setInstituicao] = useState(conta?.instituicao ?? '')
  const [numeroConta, setNumeroConta] = useState(conta?.numero_conta ?? '')
  const [tipoConta, setTipoConta] = useState(conta?.tipo_conta ?? TIPOS_CONTA[0])
  const [saldoAtual, setSaldoAtual] = useState(
    conta ? formatInputCurrency(conta.saldo_atual) : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = conta !== null

  const supabase = createClient()

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function formatInputCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function parseCurrency(value: string): number {
    // Handle pt-BR format: 1.234,56 -> 1234.56
    const cleaned = value.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(cleaned)
    return isNaN(parsed) ? 0 : parsed
  }

  function handleSaldoChange(raw: string) {
    // Allow digits, comma, dot, minus sign
    const sanitized = raw.replace(/[^0-9.,-]/g, '')
    setSaldoAtual(sanitized)
  }

  function validate(): string | null {
    if (!instituicao.trim()) return 'Informe a instituicao.'
    if (!numeroConta.trim()) return 'Informe o numero da conta.'
    if (!tipoConta) return 'Selecione o tipo da conta.'
    if (!saldoAtual.trim()) return 'Informe o saldo atual.'
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const payload = {
      instituicao: instituicao.trim(),
      numero_conta: numeroConta.trim(),
      tipo_conta: tipoConta,
      saldo_atual: parseCurrency(saldoAtual),
    }

    if (isEditing) {
      const { data, error: updateError } = await supabase
        .from('contas_bancarias')
        .update(payload)
        .eq('id_conta', conta.id_conta)
        .select()
        .single()

      if (updateError) {
        setError(updateError.message)
        setSaving(false)
        return
      }
      if (data) onSaved(data)
    } else {
      // Get user id for insert
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Sessao expirada. Faca login novamente.')
        setSaving(false)
        return
      }

      // We need the id_usuario from the usuarios table
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .eq('email', user.email!)
        .single()

      if (!usuario) {
        setError('Usuario nao encontrado.')
        setSaving(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('contas_bancarias')
        .insert({ ...payload, id_usuario: usuario.id_usuario })
        .select()
        .single()

      if (insertError) {
        setError(insertError.message)
        setSaving(false)
        return
      }
      if (data) onSaved(data)
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
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-zinc-400 transition-colors hover:text-white hover:bg-white/[0.04]"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-white">
          {isEditing ? 'Editar Conta' : 'Nova Conta Bancaria'}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {isEditing
            ? 'Atualize as informacoes da conta.'
            : 'Preencha os dados da nova conta.'}
        </p>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/[0.08] px-3 py-2 text-sm text-rose-400">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Instituicao */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Instituicao
            </label>
            <input
              type="text"
              value={instituicao}
              onChange={(e) => setInstituicao(e.target.value)}
              placeholder="Ex: Nubank, Itau, Bradesco"
              className="input-field mt-1 w-full"
            />
          </div>

          {/* Numero da conta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Numero da Conta
            </label>
            <input
              type="text"
              value={numeroConta}
              onChange={(e) => setNumeroConta(e.target.value)}
              placeholder="Ex: 12345-6"
              className="input-field mt-1 w-full"
            />
          </div>

          {/* Tipo de conta */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Tipo de Conta
            </label>
            <select
              value={tipoConta}
              onChange={(e) => setTipoConta(e.target.value)}
              className="input-field mt-1 w-full"
            >
              {TIPOS_CONTA.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          {/* Saldo atual */}
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Saldo Atual (R$)
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                R$
              </span>
              <input
                type="text"
                value={saldoAtual}
                onChange={(e) => handleSaldoChange(e.target.value)}
                placeholder="0,00"
                className="input-field w-full py-2.5 pl-10 pr-3 font-mono-nums"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditing ? 'Salvar' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
