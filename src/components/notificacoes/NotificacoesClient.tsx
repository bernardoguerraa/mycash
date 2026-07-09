'use client'

import { useState, useMemo } from 'react'
import {
  Bell,
  Settings,
  Target,
  AlertTriangle,
  CheckCheck,
  Inbox,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import { api } from '@/lib/api/client'
import { Database, TipoNotificacao } from '@/types/database'

type Notificacao = Database['public']['Tables']['notificacoes']['Row']

interface NotificacoesClientProps {
  notificacoes: Notificacao[]
}

type FilterLida = 'todas' | 'nao_lidas'

const tipoIcons: Record<TipoNotificacao, React.ReactNode> = {
  Sistema: <Settings className="h-5 w-5" />,
  Meta: <Target className="h-5 w-5" />,
  Lembrete: <Bell className="h-5 w-5" />,
  Alerta: <AlertTriangle className="h-5 w-5" />,
}

const tipoColors: Record<TipoNotificacao, string> = {
  Sistema: 'bg-blue-500/10 text-blue-400',
  Meta: 'bg-purple-500/10 text-purple-400',
  Lembrete: 'bg-amber-500/[0.08] text-amber-400',
  Alerta: 'bg-rose-500/[0.08] text-rose-400',
}

function formatTimeAgo(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), {
    addSuffix: true,
    locale: ptBR,
  })
}

export default function NotificacoesClient({
  notificacoes: initialNotificacoes,
}: NotificacoesClientProps) {
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>(initialNotificacoes)
  const [filter, setFilter] = useState<FilterLida>('todas')
  const [markingAll, setMarkingAll] = useState(false)
  const [markingId, setMarkingId] = useState<number | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'nao_lidas') {
      return notificacoes.filter((n) => !n.lida)
    }
    return notificacoes
  }, [notificacoes, filter])

  const unreadCount = useMemo(
    () => notificacoes.filter((n) => !n.lida).length,
    [notificacoes]
  )

  async function handleMarkAsRead(id: number) {
    setMarkingId(id)
    try {
      await api.notificacoes.update(id, { lida: true })
      setNotificacoes((prev) =>
        prev.map((n) => (n.id_notificacao === id ? { ...n, lida: true } : n))
      )
    } catch (err) {
      console.error('Falha ao marcar como lida:', err)
    }
    setMarkingId(null)
  }

  async function handleMarkAllAsRead() {
    const unreadIds = notificacoes
      .filter((n) => !n.lida)
      .map((n) => n.id_notificacao)

    if (unreadIds.length === 0) return

    setMarkingAll(true)
    try {
      // Marca em paralelo — cada uma via API
      await Promise.all(
        unreadIds.map((id) => api.notificacoes.update(id, { lida: true }))
      )
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
    } catch (err) {
      console.error('Falha ao marcar todas como lidas:', err)
    }
    setMarkingAll(false)
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Notificações
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Acompanhe seus alertas e atualizações.
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-500/[0.08] px-2 py-0.5 text-xs font-medium text-emerald-400">
                {unreadCount} não {unreadCount === 1 ? 'lida' : 'lidas'}
              </span>
            )}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
            className="btn-ghost inline-flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Marcando...' : 'Marcar todas como lidas'}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-surface-2 p-1 border border-edge-1 w-fit">
        <button
          onClick={() => setFilter('todas')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === 'todas'
              ? 'bg-surface-4 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('nao_lidas')}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            filter === 'nao_lidas'
              ? 'bg-surface-4 text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Não lidas
          {unreadCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-edge-2 bg-surface-2 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-3">
            <Inbox className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            Nenhuma notificação
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {filter === 'nao_lidas'
              ? 'Todas as notificações foram lidas.'
              : 'Você ainda não recebeu notificações.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notificacao) => (
            <div
              key={notificacao.id_notificacao}
              className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-200 ${
                !notificacao.lida
                  ? 'bg-emerald-500/[0.03] border-l-2 border-l-emerald-500 border-t border-r border-b border-edge-1'
                  : 'bg-surface-2 border border-edge-1 hover:bg-surface-3'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                    tipoColors[notificacao.tipo]
                  }`}
                >
                  {tipoIcons[notificacao.tipo]}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-sm ${
                          !notificacao.lida
                            ? 'font-semibold text-white'
                            : 'font-normal text-zinc-300'
                        }`}
                      >
                        {notificacao.mensagem}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-zinc-500">
                          {formatTimeAgo(notificacao.data_notificacao)}
                        </span>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          tipoColors[notificacao.tipo]
                        }`}>
                          {notificacao.tipo}
                        </span>
                      </div>
                    </div>

                    {/* Mark as read button */}
                    {!notificacao.lida && (
                      <button
                        onClick={() => handleMarkAsRead(notificacao.id_notificacao)}
                        disabled={markingId === notificacao.id_notificacao}
                        className="flex-shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/[0.08] disabled:opacity-50"
                      >
                        {markingId === notificacao.id_notificacao
                          ? 'Marcando...'
                          : 'Marcar como lida'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Unread indicator dot */}
                {!notificacao.lida && (
                  <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-emerald-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
