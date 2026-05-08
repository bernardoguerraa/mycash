'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export interface ChartDataPoint {
  month: string
  receitas: number
  despesas: number
}

interface TooltipPayloadEntry {
  name: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(v)

  return (
    <div className="rounded-xl bg-surface-3 border border-edge-3 p-3 shadow-lg">
      <p className="text-xs font-medium text-zinc-400 mb-2">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="text-sm font-medium font-mono-nums leading-relaxed"
          style={{ color: entry.color }}
        >
          {entry.name === 'receitas' ? 'Receitas' : 'Despesas'}:{' '}
          {fmt(entry.value)}
        </p>
      ))}
    </div>
  )
}

interface MonthlyChartProps {
  data: ChartDataPoint[]
}

export default function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="rgba(255,255,255,0.04)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#71717a', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#71717a', fontSize: 11 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="receitas"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#colorReceitas)"
          name="receitas"
        />
        <Area
          type="monotone"
          dataKey="despesas"
          stroke="#f43f5e"
          strokeWidth={2}
          fill="url(#colorDespesas)"
          name="despesas"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
