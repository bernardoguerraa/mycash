/**
 * Client-side wrapper tipado para a API REST em /api/*.
 *
 * Vantagens sobre chamar `supabase.from(...)` direto no componente:
 * - Desacopla o front do Supabase (front mobile consome os mesmos endpoints)
 * - Concentra o tratamento de erros num lugar so
 * - Validacoes e regras server-side (RLS, campos obrigatorios) rodam sempre
 * - Substituivel: se um dia migrarmos de Supabase para outro banco, so o
 *   backend muda; componentes ficam iguais
 */

import type { Database } from '@/types/database'

type TB = Database['public']['Tables']
type Transacao = TB['transacoes']['Row']
type TransacaoInsert = TB['transacoes']['Insert']
type Conta = TB['contas_bancarias']['Row']
type ContaInsert = Omit<TB['contas_bancarias']['Insert'], 'id_usuario'>
type Meta = TB['metas_financeiras']['Row']
type MetaInsert = Omit<TB['metas_financeiras']['Insert'], 'id_usuario'>
type Lembrete = TB['lembretes']['Row']
type LembreteInsert = Omit<TB['lembretes']['Insert'], 'id_usuario'>
type Notificacao = TB['notificacoes']['Row']
type NotificacaoInsert = Omit<TB['notificacoes']['Insert'], 'id_usuario'>

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (resp.status === 204) return null as T

  const json = (await resp.json().catch(() => ({}))) as {
    data?: T
    error?: string
  }

  if (!resp.ok) {
    throw new ApiError(resp.status, json.error ?? `HTTP ${resp.status}`)
  }

  return json.data as T
}

function qs(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return ''
  const pairs: string[] = []
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    pairs.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
  }
  return pairs.length ? `?${pairs.join('&')}` : ''
}

export const api = {
  transacoes: {
    list: (params?: { id_conta?: number; tipo?: 'Entrada' | 'Saida'; limit?: number }) =>
      apiFetch<Transacao[]>(`/api/transacoes${qs(params)}`),
    get: (id: number) => apiFetch<Transacao>(`/api/transacoes/${id}`),
    create: (body: TransacaoInsert) =>
      apiFetch<Transacao>('/api/transacoes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<TransacaoInsert>) =>
      apiFetch<Transacao>(`/api/transacoes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      apiFetch<null>(`/api/transacoes/${id}`, { method: 'DELETE' }),
  },

  contas: {
    list: () => apiFetch<Conta[]>('/api/contas'),
    get: (id: number) => apiFetch<Conta>(`/api/contas/${id}`),
    create: (body: ContaInsert) =>
      apiFetch<Conta>('/api/contas', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<ContaInsert>) =>
      apiFetch<Conta>(`/api/contas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      apiFetch<null>(`/api/contas/${id}`, { method: 'DELETE' }),
  },

  metas: {
    list: (params?: { status?: 'EmAndamento' | 'Concluida' | 'Cancelada' }) =>
      apiFetch<Meta[]>(`/api/metas${qs(params)}`),
    get: (id: number) => apiFetch<Meta>(`/api/metas/${id}`),
    create: (body: MetaInsert) =>
      apiFetch<Meta>('/api/metas', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number, body: Partial<MetaInsert>) =>
      apiFetch<Meta>(`/api/metas/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      apiFetch<null>(`/api/metas/${id}`, { method: 'DELETE' }),
  },

  lembretes: {
    list: (params?: { ativo?: boolean; tipo?: 'ContaPagar' | 'ContaReceber' }) =>
      apiFetch<Lembrete[]>(`/api/lembretes${qs(params)}`),
    get: (id: number) => apiFetch<Lembrete>(`/api/lembretes/${id}`),
    create: (body: LembreteInsert) =>
      apiFetch<Lembrete>('/api/lembretes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<LembreteInsert>) =>
      apiFetch<Lembrete>(`/api/lembretes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      apiFetch<null>(`/api/lembretes/${id}`, { method: 'DELETE' }),
  },

  notificacoes: {
    list: (params?: { lida?: boolean }) =>
      apiFetch<Notificacao[]>(`/api/notificacoes${qs(params)}`),
    get: (id: number) => apiFetch<Notificacao>(`/api/notificacoes/${id}`),
    create: (body: NotificacaoInsert) =>
      apiFetch<Notificacao>('/api/notificacoes', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: number, body: Partial<NotificacaoInsert>) =>
      apiFetch<Notificacao>(`/api/notificacoes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    delete: (id: number) =>
      apiFetch<null>(`/api/notificacoes/${id}`, { method: 'DELETE' }),
  },
}
