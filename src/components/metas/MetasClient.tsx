'use client'

import { useState, useMemo } from 'react'
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  PiggyBank,
  Calendar,
  Clock,
  Filter,
  Flame,
} from 'lucide-react'
import { Database, StatusMeta } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import MetaModal from './MetaModal'
import AddValorModal from './AddValorModal'

type Meta = Database['public']['Tables']['metas_financeiras']['Row']

interface MetasClientProps {
  metas: Meta[]
  idUsuario: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

function getDaysRemaining(dataLimite: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const limite = new Date(dataLimite)
  limite.setHours(0, 0, 0, 0)
  return Math.ceil((limite.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function getStatusConfig(status: StatusMeta) {
  switch (status) {
    case 'EmAndamento':
      return {
        label: 'Em Andamento',
        color: 'bg-amber-500/[0.08] text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400',
      }
    case 'Concluida':
      return {
        label: 'Concluída',
        color: 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
      }
    case 'Cancelada':
      return {
        label: 'Cancelada',
        color: 'bg-rose-500/[0.08] text-rose-400 border-rose-500/20',
        dot: 'bg-rose-400',
      }
  }
}

export default function MetasClient({ metas, idUsuario }: MetasClientProps) {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<StatusMeta | 'Todas'>('Todas')
  const [metaModal, setMetaModal] = useState<{ open: boolean; meta?: Meta }>({
    open: false,
  })
  const [addValorModal, setAddValorModal] = useState<{
    open: boolean
    meta?: Meta
  }>({ open: false })
  const [deleting, setDeleting] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (statusFilter === 'Todas') return metas
    return metas.filter((m) => m.status === statusFilter)
  }, [metas, statusFilter])

  const stats = useMemo(() => {
    const total = metas.length
    const emAndamento = metas.filter((m) => m.status === 'EmAndamento').length
    const concluidas = metas.filter((m) => m.status === 'Concluida').length
    const totalInvestido = metas.reduce((sum, m) => sum + m.valor_atual, 0)
    return { total, emAndamento, concluidas, totalInvestido }
  }, [metas])

  const handleDelete = async (idMeta: number) => {
    if (!confirm('Tem certeza que deseja excluir esta meta?')) return
    setDeleting(idMeta)
    const supabase = createClient()
    await supabase.from('metas_financeiras').delete().eq('id_meta', idMeta)
    setDeleting(null)
    router.refresh()
  }

  const statCards = [
    {
      label: 'Total de Metas',
      value: String(stats.total),
      icon: <Target className="h-5 w-5" />,
      accent: 'bg-blue-500/10 text-blue-400',
      glow: 'bg-blue-500',
    },
    {
      label: 'Em Andamento',
      value: String(stats.emAndamento),
      icon: <Flame className="h-5 w-5" />,
      accent: 'bg-amber-500/[0.08] text-amber-400',
      glow: 'bg-amber-500',
    },
    {
      label: 'Concluídas',
      value: String(stats.concluidas),
      icon: <CheckCircle2 className="h-5 w-5" />,
      accent: 'bg-emerald-500/[0.08] text-emerald-400',
      glow: 'bg-emerald-500',
    },
    {
      label: 'Total Investido',
      value: formatCurrency(stats.totalInvestido),
      icon: <TrendingUp className="h-5 w-5" />,
      accent: 'bg-emerald-500/10 text-emerald-400',
      glow: 'bg-emerald-500',
    },
  ]

  const filterOptions: { label: string; value: StatusMeta | 'Todas' }[] = [
    { label: 'Todas', value: 'Todas' },
    { label: 'Em Andamento', value: 'EmAndamento' },
    { label: 'Concluídas', value: 'Concluida' },
    { label: 'Canceladas', value: 'Cancelada' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Metas Financeiras
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Acompanhe e gerencie seus objetivos financeiros.
          </p>
        </div>
        <button
          onClick={() => setMetaModal({ open: true })}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Meta
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="card group relative overflow-hidden rounded-2xl p-5 transition-all duration-200 hover:border-edge-2"
          >
            <div
              className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-20 ${stat.glow}`}
            />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400">
                  {stat.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.accent}`}
                >
                  {stat.icon}
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white font-mono-nums">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-500" />
        <div className="flex gap-1.5 rounded-xl bg-surface-2 border border-edge-1 p-1">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                statusFilter === opt.value
                  ? 'bg-surface-4 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-2 bg-surface-2 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/[0.08] mb-4">
            <PiggyBank className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-white">
            {statusFilter === 'Todas'
              ? 'Nenhuma meta cadastrada'
              : `Nenhuma meta ${filterOptions.find((f) => f.value === statusFilter)?.label.toLowerCase()}`}
          </h3>
          <p className="mt-2 max-w-sm text-center text-sm text-zinc-400">
            Comece definindo suas metas financeiras. Cada pequeno passo te aproxima da sua liberdade financeira.
          </p>
          {statusFilter === 'Todas' && (
            <button
              onClick={() => setMetaModal({ open: true })}
              className="btn-primary mt-6 inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar Primeira Meta
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((meta) => {
            const progress =
              meta.valor_objetivo > 0
                ? Math.min((meta.valor_atual / meta.valor_objetivo) * 100, 100)
                : 0
            const daysRemaining = getDaysRemaining(meta.data_limite)
            const statusCfg = getStatusConfig(meta.status)
            const isOverdue = daysRemaining < 0 && meta.status === 'EmAndamento'

            return (
              <div
                key={meta.id_meta}
                className="card card-hover group relative overflow-hidden rounded-2xl p-5"
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.color}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
                    {statusCfg.label}
                  </span>
                  {isOverdue && (
                    <span className="text-xs font-medium text-rose-400">
                      Atrasada
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-white mb-1 truncate">
                  {meta.titulo}
                </h3>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium font-mono-nums text-zinc-300">
                      {formatCurrency(meta.valor_atual)}
                    </span>
                    <span className="text-sm font-mono-nums text-zinc-500">
                      {formatCurrency(meta.valor_objetivo)}
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface-4">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-1.5 text-right">
                    <span className="text-xs font-semibold text-zinc-400">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(meta.data_inicio)} &rarr; {formatDate(meta.data_limite)}
                  </span>
                </div>

                {/* Days remaining */}
                <div className="mt-2 flex items-center gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5 text-zinc-500" />
                  {meta.status === 'Concluida' ? (
                    <span className="text-emerald-400 font-medium">Meta concluída</span>
                  ) : meta.status === 'Cancelada' ? (
                    <span className="text-rose-400 font-medium">Meta cancelada</span>
                  ) : daysRemaining > 0 ? (
                    <span
                      className={`font-medium ${
                        daysRemaining <= 7
                          ? 'text-rose-400'
                          : daysRemaining <= 30
                            ? 'text-amber-400'
                            : 'text-zinc-400'
                      }`}
                    >
                      {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
                    </span>
                  ) : daysRemaining === 0 ? (
                    <span className="text-amber-400 font-medium">Vence hoje</span>
                  ) : (
                    <span className="text-rose-400 font-medium">
                      Vencida há {Math.abs(daysRemaining)} dias
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 flex items-center gap-2 border-t border-edge-1 pt-4">
                  {meta.status === 'EmAndamento' && (
                    <button
                      onClick={() => setAddValorModal({ open: true, meta })}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/[0.08] px-3 py-2 text-xs font-medium text-emerald-400 transition-all hover:bg-emerald-500/[0.15]"
                    >
                      <PiggyBank className="h-3.5 w-3.5" />
                      Adicionar Valor
                    </button>
                  )}
                  <button
                    onClick={() => setMetaModal({ open: true, meta })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-3 py-2 text-xs font-medium text-zinc-300 transition-all hover:bg-surface-4 hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(meta.id_meta)}
                    disabled={deleting === meta.id_meta}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-3 px-3 py-2 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/[0.08] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleting === meta.id_meta ? 'Excluindo...' : 'Excluir'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {metaModal.open && (
        <MetaModal
          meta={metaModal.meta}
          idUsuario={idUsuario}
          onClose={() => setMetaModal({ open: false })}
          onSaved={() => {
            setMetaModal({ open: false })
            router.refresh()
          }}
        />
      )}

      {addValorModal.open && addValorModal.meta && (
        <AddValorModal
          meta={addValorModal.meta}
          onClose={() => setAddValorModal({ open: false })}
          onSaved={() => {
            setAddValorModal({ open: false })
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
