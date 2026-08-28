/**
 * Cliente da API REST do Next.js — espelho mobile de src/lib/api/client.ts.
 *
 * O app NAO fala com o Supabase para ler ou gravar dados de dominio. Todo
 * acesso passa por /api/*, exatamente como o web faz. A unica coisa que
 * continua no @supabase/supabase-js e a autenticacao (login, sessao,
 * troca de senha), porque isso e servico de identidade, nao recurso REST.
 *
 * Como o app se autentica: o web manda cookie de sessao; o app nativo nao
 * tem cookie, entao manda `Authorization: Bearer <access_token>`. Do outro
 * lado, `createClientFromRequest` (src/lib/supabase/server.ts) prefere o
 * cabecalho e cai no cookie quando ele nao existe — mesma rota, dois
 * clientes, sem ramificacao. A RLS continua sendo quem filtra por usuario.
 *
 * Base URL: por padrao a producao na Vercel, que funciona de qualquer rede.
 * Para apontar ao servidor local, defina EXPO_PUBLIC_API_URL no mobile/.env
 * — lembrando que no emulador Android o host da maquina e 10.0.2.2, nao
 * localhost.
 */

import { supabase } from './supabase';
import type {
  Conta,
  ContaInput,
  Lembrete,
  LembreteInput,
  Meta,
  MetaInput,
  Notificacao,
  NotificacaoInput,
  Perfil,
  Transacao,
  TransacaoInput,
} from '@/types/database';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://mycash-nu.vercel.app';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Monta a query string ignorando filtros vazios. */
function qs(params?: Record<string, string | number | boolean | undefined>) {
  if (!params) return '';
  const pares: string[] = [];
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === '') continue;
    pares.push(`${encodeURIComponent(chave)}=${encodeURIComponent(String(valor))}`);
  }
  return pares.length ? `?${pares.join('&')}` : '';
}

async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new ApiError('Sessao expirada. Entre novamente.', 401);

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
  } catch {
    // fetch so rejeita por falha de rede — vale avisar o usuario disso.
    throw new ApiError('Sem conexao com o servidor. Verifique a internet.', 0);
  }

  // 204 (DELETE) nao tem corpo.
  if (resposta.status === 204) return null as T;

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ApiError(corpo?.error ?? `Erro ${resposta.status}.`, resposta.status);
  }

  // As rotas respondem { data: ... }.
  return (corpo?.data ?? corpo) as T;
}

const verbos = {
  get: <T,>(caminho: string) => apiFetch<T>(caminho),
  post: <T,>(caminho: string, corpo: unknown) =>
    apiFetch<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),
  patch: <T,>(caminho: string, corpo: unknown) =>
    apiFetch<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),
  delete: <T,>(caminho: string) => apiFetch<T>(caminho, { method: 'DELETE' }),
};

export const api = {
  // Verbos crus, para chamadas pontuais.
  ...verbos,

  transacoes: {
    list: (filtros?: { id_conta?: number; tipo?: 'Entrada' | 'Saida'; limit?: number }) =>
      verbos.get<Transacao[]>(`/transacoes${qs(filtros)}`),
    get: (id: number) => verbos.get<Transacao>(`/transacoes/${id}`),
    create: (corpo: TransacaoInput) => verbos.post<Transacao>('/transacoes', corpo),
    update: (id: number, corpo: Partial<TransacaoInput>) =>
      verbos.patch<Transacao>(`/transacoes/${id}`, corpo),
    delete: (id: number) => verbos.delete<null>(`/transacoes/${id}`),
  },

  contas: {
    list: () => verbos.get<Conta[]>('/contas'),
    get: (id: number) => verbos.get<Conta>(`/contas/${id}`),
    create: (corpo: ContaInput) => verbos.post<Conta>('/contas', corpo),
    update: (id: number, corpo: Partial<ContaInput>) =>
      verbos.patch<Conta>(`/contas/${id}`, corpo),
    delete: (id: number) => verbos.delete<null>(`/contas/${id}`),
  },

  metas: {
    list: (filtros?: { status?: 'EmAndamento' | 'Concluida' | 'Cancelada' }) =>
      verbos.get<Meta[]>(`/metas${qs(filtros)}`),
    get: (id: number) => verbos.get<Meta>(`/metas/${id}`),
    create: (corpo: MetaInput) => verbos.post<Meta>('/metas', corpo),
    update: (id: number, corpo: Partial<MetaInput>) =>
      verbos.patch<Meta>(`/metas/${id}`, corpo),
    delete: (id: number) => verbos.delete<null>(`/metas/${id}`),
  },

  lembretes: {
    list: (filtros?: { ativo?: boolean; tipo?: 'ContaPagar' | 'ContaReceber' }) =>
      verbos.get<Lembrete[]>(`/lembretes${qs(filtros)}`),
    get: (id: number) => verbos.get<Lembrete>(`/lembretes/${id}`),
    create: (corpo: LembreteInput) => verbos.post<Lembrete>('/lembretes', corpo),
    update: (id: number, corpo: Partial<LembreteInput>) =>
      verbos.patch<Lembrete>(`/lembretes/${id}`, corpo),
    delete: (id: number) => verbos.delete<null>(`/lembretes/${id}`),
  },

  notificacoes: {
    list: (filtros?: { lida?: boolean }) =>
      verbos.get<Notificacao[]>(`/notificacoes${qs(filtros)}`),
    get: (id: number) => verbos.get<Notificacao>(`/notificacoes/${id}`),
    create: (corpo: NotificacaoInput) => verbos.post<Notificacao>('/notificacoes', corpo),
    update: (id: number, corpo: Partial<NotificacaoInput>) =>
      verbos.patch<Notificacao>(`/notificacoes/${id}`, corpo),
    delete: (id: number) => verbos.delete<null>(`/notificacoes/${id}`),
  },

  perfil: {
    get: () => verbos.get<Perfil>('/perfil'),
    update: (corpo: { nome_completo: string }) => verbos.patch<Perfil['usuario']>('/perfil', corpo),
  },
};
