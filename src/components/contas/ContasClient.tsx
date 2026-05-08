'use client'

import { useState } from 'react'
import {
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  Building2,
  CreditCard,
  PiggyBank,
  Smartphone,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import ContaModal from './ContaModal'
import PluggyConnectButton from './PluggyConnectButton'

type ContaBancaria = Database['public']['Tables']['contas_bancarias']['Row']

interface ContasClientProps {
  contas: ContaBancaria[]
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const tipoIcons: Record<string, React.ReactNode> = {
  Corrente: <Building2 className="h-6 w-6" />,
  Poupanca: <PiggyBank className="h-6 w-6" />,
  Investimento: <Landmark className="h-6 w-6" />,
  'Carteira Digital': <Smartphone className="h-6 w-6" />,
}

function getContaIcon(tipo: string) {
  return tipoIcons[tipo] ?? <CreditCard className="h-6 w-6" />
}

export default function ContasClient({ contas: initialContas }: ContasClientProps) {
  const [contas, setContas] = useState<ContaBancaria[]>(initialContas)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaBancaria | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)

  const supabase = createClient()

  const totalBalance = contas.reduce((sum, c) => sum + (c.saldo_atual || 0), 0)

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return
    setDeleting(id)
    const { error } = await supabase
      .from('contas_bancarias')
      .delete()
      .eq('id_conta', id)

    if (!error) {
      setContas((prev) => prev.filter((c) => c.id_conta !== id))
    }
    setDeleting(null)
  }

  function handleEdit(conta: ContaBancaria) {
    setEditingConta(conta)
    setModalOpen(true)
  }

  function handleNew() {
    setEditingConta(null)
    setModalOpen(true)
  }

  function handleSaved(conta: ContaBancaria) {
    setContas((prev) => {
      const idx = prev.findIndex((c) => c.id_conta === conta.id_conta)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = conta
        return updated
      }
      return [...prev, conta]
    })
    setModalOpen(false)
    setEditingConta(null)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Contas Bancarias
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Gerencie suas contas e acompanhe seus saldos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PluggyConnectButton onConnected={() => window.location.reload()} />
          <button
            onClick={handleNew}
            className="btn-secondary inline-flex items-center gap-2 focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 focus:ring-offset-surface-0"
          >
            <Plus className="h-4 w-4" />
            Manual
          </button>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="card relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-teal-500/[0.04] p-6">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500 opacity-10 blur-3xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-500">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">Saldo Total</p>
            <p className={`text-3xl font-bold font-mono-nums ${totalBalance >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-zinc-500">
              {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
            </p>
          </div>
        </div>
      </div>

      {/* Contas Grid */}
      {contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-2 bg-surface-2 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">
            <Landmark className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Nenhuma conta cadastrada
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Adicione sua primeira conta bancaria para comecar.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Conta
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {contas.map((conta) => (
            <div
              key={conta.id_conta}
              className="card card-hover group relative overflow-hidden rounded-2xl p-5"
            >
              {/* Glow */}
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500 opacity-0 blur-3xl transition-opacity group-hover:opacity-10" />

              <div className="relative">
                {/* Top row: icon + actions */}
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/[0.08] text-emerald-500">
                    {getContaIcon(conta.tipo_conta)}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => handleEdit(conta)}
                      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(conta.id_conta)}
                      disabled={deleting === conta.id_conta}
                      className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-500/[0.08] hover:text-rose-400 disabled:opacity-50"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="mt-4">
                  <h3 className="text-base font-semibold text-white">
                    {conta.instituicao}
                  </h3>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {conta.tipo_conta} &middot; {conta.numero_conta}
                  </p>
                </div>

                {/* Balance */}
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Saldo</p>
                    <p
                      className={`text-xl font-bold font-mono-nums ${
                        conta.saldo_atual >= 0 ? 'text-white' : 'text-rose-400'
                      }`}
                    >
                      {formatCurrency(conta.saldo_atual)}
                    </p>
                  </div>
                  {conta.ultima_sync && (
                    <p className="text-[10px] text-zinc-600">
                      Sync:{' '}
                      {new Date(conta.ultima_sync).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <ContaModal
          conta={editingConta}
          onClose={() => {
            setModalOpen(false)
            setEditingConta(null)
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
