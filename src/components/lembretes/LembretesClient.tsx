'use client'

import { useState, useMemo } from 'react'
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  Filter,
  AlertTriangle,
  Clock,
  CalendarCheck,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Database, TipoLembrete } from '@/types/database'
import LembreteModal from './LembreteModal'

type Lembrete = Database['public']['Tables']['lembretes']['Row']

interface LembretesClientProps {
  lembretes: Lembrete[]
  idUsuario: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

type StatusGroup = 'vencidos' | 'proximos' | 'futuros'
type FilterTipo = 'todos' | TipoLembrete
type FilterStatus = 'todos' | 'ativo' | 'inativo'

function getStatusGroup(dataVencimento: string): StatusGroup {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const vencimento = new Date(dataVencimento + 'T00:00:00')
  vencimento.setHours(0, 0, 0, 0)

  const diffMs = vencimento.getTime() - today.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 0) return 'vencidos'
  if (diffDays <= 7) return 'proximos'
  return 'futuros'
}

const groupConfig: Record<StatusGroup, { label: string; color: string; borderColor: string; bgColor: string; icon: React.ReactNode }> = {
  vencidos: {
    label: 'Vencidos',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/30',
    bgColor: 'bg-rose-500/[0.05]',
    icon: <AlertTriangle className="h-5 w-5 text-rose-400" />,
  },
  proximos: {
    label: 'Proximos (7 dias)',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/[0.05]',
    icon: <Clock className="h-5 w-5 text-amber-400" />,
  },
  futuros: {
    label: 'Futuros',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/30',
    bgColor: 'bg-emerald-500/[0.05]',
    icon: <CalendarCheck className="h-5 w-5 text-emerald-400" />,
  },
}

export default function LembretesClient({ lembretes: initialLembretes, idUsuario }: LembretesClientProps) {
  const [lembretes, setLembretes] = useState<Lembrete[]>(initialLembretes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLembrete, setEditingLembrete] = useState<Lembrete | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [toggling, setToggling] = useState<number | null>(null)
  const [filterTipo, setFilterTipo] = useState<FilterTipo>('todos')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos')

  const supabase = createClient()

  const filtered = useMemo(() => {
    return lembretes.filter((l) => {
      if (filterTipo !== 'todos' && l.tipo !== filterTipo) return false
      if (filterStatus === 'ativo' && !l.ativo) return false
      if (filterStatus === 'inativo' && l.ativo) return false
      return true
    })
  }, [lembretes, filterTipo, filterStatus])

  const grouped = useMemo(() => {
    const groups: Record<StatusGroup, Lembrete[]> = {
      vencidos: [],
      proximos: [],
      futuros: [],
    }
    filtered.forEach((l) => {
      const group = getStatusGroup(l.data_vencimento)
      groups[group].push(l)
    })
    return groups
  }, [filtered])

  const summary = useMemo(() => {
    const ativos = lembretes.filter((l) => l.ativo)
    const totalPagar = ativos
      .filter((l) => l.tipo === 'ContaPagar')
      .reduce((sum, l) => sum + l.valor_previsto, 0)
    const totalReceber = ativos
      .filter((l) => l.tipo === 'ContaReceber')
      .reduce((sum, l) => sum + l.valor_previsto, 0)
    const vencidosCount = ativos.filter(
      (l) => getStatusGroup(l.data_vencimento) === 'vencidos'
    ).length
    return { totalPagar, totalReceber, vencidosCount }
  }, [lembretes])

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja excluir este lembrete?')) return
    setDeleting(id)
    const { error } = await supabase
      .from('lembretes')
      .delete()
      .eq('id_lembrete', id)

    if (!error) {
      setLembretes((prev) => prev.filter((l) => l.id_lembrete !== id))
    }
    setDeleting(null)
  }

  async function handleToggleAtivo(lembrete: Lembrete) {
    setToggling(lembrete.id_lembrete)
    const newAtivo = !lembrete.ativo
    const { error } = await supabase
      .from('lembretes')
      .update({ ativo: newAtivo })
      .eq('id_lembrete', lembrete.id_lembrete)

    if (!error) {
      setLembretes((prev) =>
        prev.map((l) =>
          l.id_lembrete === lembrete.id_lembrete
            ? { ...l, ativo: newAtivo }
            : l
        )
      )
    }
    setToggling(null)
  }

  function handleEdit(lembrete: Lembrete) {
    setEditingLembrete(lembrete)
    setModalOpen(true)
  }

  function handleNew() {
    setEditingLembrete(null)
    setModalOpen(true)
  }

  function handleSaved(lembrete: Lembrete) {
    setLembretes((prev) => {
      const idx = prev.findIndex((l) => l.id_lembrete === lembrete.id_lembrete)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = lembrete
        return updated
      }
      return [...prev, lembrete]
    })
    setModalOpen(false)
    setEditingLembrete(null)
  }

  const groupOrder: StatusGroup[] = ['vencidos', 'proximos', 'futuros']

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Lembretes</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Gerencie seus lembretes de contas a pagar e receber.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="btn-primary inline-flex items-center gap-2 focus:ring-2 focus:ring-emerald-500/20 focus:ring-offset-2 focus:ring-offset-surface-0"
        >
          <Plus className="h-4 w-4" />
          Novo Lembrete
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card relative overflow-hidden rounded-2xl p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-500 opacity-10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/[0.08] text-rose-500">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Total a Pagar</p>
              <p className="text-xl font-bold font-mono-nums text-rose-400">
                {formatCurrency(summary.totalPagar)}
              </p>
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden rounded-2xl p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500 opacity-10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/[0.08] text-emerald-500">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Total a Receber</p>
              <p className="text-xl font-bold font-mono-nums text-emerald-400">
                {formatCurrency(summary.totalReceber)}
              </p>
            </div>
          </div>
        </div>
        <div className="card relative overflow-hidden rounded-2xl p-5">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500 opacity-10 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Vencidos</p>
              <p className="text-xl font-bold text-amber-400">
                {summary.vencidosCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Filter className="h-4 w-4" />
          <span>Filtrar:</span>
        </div>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value as FilterTipo)}
          className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-1.5 text-sm text-white focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="todos">Todos os tipos</option>
          <option value="ContaPagar">Conta a Pagar</option>
          <option value="ContaReceber">Conta a Receber</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="rounded-lg border border-edge-2 bg-surface-3 px-3 py-1.5 text-sm text-white focus:border-emerald-500/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="todos">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
      </div>

      {/* Grouped Lembretes */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-2 bg-surface-2 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">
            <Bell className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Nenhum lembrete encontrado
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            Adicione seu primeiro lembrete para acompanhar seus pagamentos.
          </p>
          <button
            onClick={handleNew}
            className="btn-primary mt-6 inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Lembrete
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((groupKey) => {
            const items = grouped[groupKey]
            if (items.length === 0) return null
            const config = groupConfig[groupKey]
            return (
              <div key={groupKey}>
                <div className="mb-3 flex items-center gap-2">
                  {config.icon}
                  <h3 className={`text-sm font-semibold ${config.color}`}>
                    {config.label}
                  </h3>
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 text-xs text-zinc-400">
                    {items.length}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((lembrete) => (
                    <div
                      key={lembrete.id_lembrete}
                      className={`group relative overflow-hidden rounded-xl bg-surface-3 p-5 transition-all duration-200 hover:bg-surface-4 ${
                        !lembrete.ativo ? 'opacity-50' : ''
                      }`}
                    >
                      <div className={`absolute inset-y-0 left-0 w-1 ${
                        groupKey === 'vencidos'
                          ? 'bg-rose-500'
                          : groupKey === 'proximos'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      }`} />

                      <div className="relative pl-2">
                        {/* Top: tipo badge + actions */}
                        <div className="flex items-start justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              lembrete.tipo === 'ContaPagar'
                                ? 'bg-rose-500/[0.08] text-rose-400'
                                : 'bg-emerald-500/[0.08] text-emerald-400'
                            }`}
                          >
                            {lembrete.tipo === 'ContaPagar' ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownLeft className="h-3 w-3" />
                            )}
                            {lembrete.tipo === 'ContaPagar' ? 'Conta a Pagar' : 'Conta a Receber'}
                          </span>
                          <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              onClick={() => handleEdit(lembrete)}
                              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                              title="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(lembrete.id_lembrete)}
                              disabled={deleting === lembrete.id_lembrete}
                              className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-rose-500/[0.08] hover:text-rose-400 disabled:opacity-50"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <h4 className="mt-3 text-sm font-semibold text-white">
                          {lembrete.descricao}
                        </h4>

                        {/* Date + Value */}
                        <div className="mt-3 flex items-end justify-between">
                          <div>
                            <p className="text-xs text-zinc-500">Vencimento</p>
                            <p className={`text-sm font-medium ${
                              groupKey === 'vencidos'
                                ? 'text-rose-400'
                                : groupKey === 'proximos'
                                  ? 'text-amber-400'
                                  : 'text-zinc-300'
                            }`}>
                              {formatDate(lembrete.data_vencimento)}
                            </p>
                          </div>
                          <p className={`text-lg font-bold font-mono-nums ${
                            lembrete.tipo === 'ContaPagar'
                              ? 'text-rose-400'
                              : 'text-emerald-400'
                          }`}>
                            {formatCurrency(lembrete.valor_previsto)}
                          </p>
                        </div>

                        {/* Ativo toggle */}
                        <div className="mt-3 flex items-center justify-between border-t border-edge-1 pt-3">
                          <span className="text-xs text-zinc-500">
                            {lembrete.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                          <button
                            onClick={() => handleToggleAtivo(lembrete)}
                            disabled={toggling === lembrete.id_lembrete}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                              lembrete.ativo ? 'bg-emerald-500' : 'bg-surface-4'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                lembrete.ativo ? 'translate-x-4.5' : 'translate-x-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <LembreteModal
          lembrete={editingLembrete}
          idUsuario={idUsuario}
          onClose={() => {
            setModalOpen(false)
            setEditingLembrete(null)
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
