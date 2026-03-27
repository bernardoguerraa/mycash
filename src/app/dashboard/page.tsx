import { createClient } from '@/lib/supabase/server'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CalendarClock,
} from 'lucide-react'

interface StatCard {
  label: string
  value: string
  change?: string
  trend: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Usuario'

  // Fetch account balances from contas_bancarias
  const { data: accounts } = await supabase
    .from('contas_bancarias')
    .select('saldo_atual')

  const totalBalance =
    accounts?.reduce((sum, a) => sum + (a.saldo_atual || 0), 0) ?? 0

  // Fetch current month transactions from transacoes
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastDay = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).toISOString()

  const { data: monthTransactions } = await supabase
    .from('transacoes')
    .select('valor, tipo')
    .gte('data_transacao', firstDay)
    .lte('data_transacao', lastDay)

  const monthIncome =
    monthTransactions
      ?.filter((t) => t.tipo === 'Entrada')
      .reduce((sum, t) => sum + (t.valor || 0), 0) ?? 0

  const monthExpenses =
    monthTransactions
      ?.filter((t) => t.tipo === 'Saida')
      .reduce((sum, t) => sum + Math.abs(t.valor || 0), 0) ?? 0

  // Fetch active goals count from metas_financeiras
  const { count: activeGoals } = await supabase
    .from('metas_financeiras')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'EmAndamento')

  // Fetch recent transactions
  const { data: recentTransactions } = await supabase
    .from('transacoes')
    .select('id_transacao, descricao, valor, tipo, data_transacao, categoria')
    .order('data_transacao', { ascending: false })
    .limit(5)

  // Fetch upcoming reminders from lembretes
  const { data: upcomingReminders } = await supabase
    .from('lembretes')
    .select('id_lembrete, descricao, data_vencimento, valor_previsto')
    .eq('ativo', true)
    .gte('data_vencimento', new Date().toISOString())
    .order('data_vencimento', { ascending: true })
    .limit(5)

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    })
  }

  const stats: StatCard[] = [
    {
      label: 'Saldo Total',
      value: formatCurrency(totalBalance),
      trend: totalBalance >= 0 ? 'up' : 'down',
      icon: <Wallet className="h-5 w-5" />,
    },
    {
      label: 'Receitas do Mes',
      value: formatCurrency(monthIncome),
      change: '+12%',
      trend: 'up',
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      label: 'Despesas do Mes',
      value: formatCurrency(monthExpenses),
      change: '-8%',
      trend: 'down',
      icon: <TrendingDown className="h-5 w-5" />,
    },
    {
      label: 'Metas Ativas',
      value: String(activeGoals ?? 0),
      trend: 'neutral',
      icon: <Target className="h-5 w-5" />,
    },
  ]

  const transactions = recentTransactions ?? []
  const reminders = upcomingReminders ?? []

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Ola, {displayName}
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Aqui esta o resumo das suas financas.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900 p-5 transition-all duration-200 hover:border-gray-700 hover:shadow-lg hover:shadow-black/20"
          >
            {/* Glow accent */}
            <div
              className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-20 ${
                stat.trend === 'up'
                  ? 'bg-green-500'
                  : stat.trend === 'down'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
              }`}
            />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">
                  {stat.label}
                </span>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    stat.trend === 'up'
                      ? 'bg-green-500/10 text-green-500'
                      : stat.trend === 'down'
                        ? 'bg-red-500/10 text-red-500'
                        : 'bg-blue-500/10 text-blue-500'
                  }`}
                >
                  {stat.icon}
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-white">{stat.value}</p>
              {stat.change && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {stat.change} em relacao ao mes anterior
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Chart placeholder + Reminders */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart area */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">
              Visao Geral Mensal
            </h3>
            <div className="flex gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                Receitas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Despesas
              </span>
            </div>
          </div>
          <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-gray-700 text-sm text-gray-500">
            <div className="text-center">
              <CalendarClock className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p>Grafico de receitas e despesas</p>
              <p className="text-xs text-gray-600">Integre com Recharts aqui</p>
            </div>
          </div>
        </div>

        {/* Upcoming reminders */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="mb-4 text-base font-semibold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Proximos Lembretes
          </h3>
          {reminders.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum lembrete pendente.</p>
          ) : (
            <ul className="space-y-3">
              {reminders.map((r) => (
                <li
                  key={r.id_lembrete}
                  className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {r.descricao}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(r.data_vencimento)}
                    </p>
                  </div>
                  {r.valor_previsto != null && (
                    <span className="ml-3 flex-shrink-0 text-sm font-semibold text-yellow-400">
                      {formatCurrency(r.valor_previsto)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h3 className="mb-4 text-base font-semibold text-white">
          Transacoes Recentes
        </h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma transacao encontrada.
          </p>
        ) : (
          <div className="divide-y divide-gray-800">
            {transactions.map((t) => (
              <div
                key={t.id_transacao}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                      t.tipo === 'Entrada'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    {t.tipo === 'Entrada' ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {t.descricao}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.categoria} &middot; {formatDate(t.data_transacao)}
                    </p>
                  </div>
                </div>
                <span
                  className={`ml-4 flex-shrink-0 text-sm font-semibold ${
                    t.tipo === 'Entrada' ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {t.tipo === 'Entrada' ? '+' : '-'}
                  {formatCurrency(Math.abs(t.valor))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
