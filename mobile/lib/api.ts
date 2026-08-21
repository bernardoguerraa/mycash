import { supabase } from './supabase';

/**
 * Cliente da API REST do Next.js.
 *
 * O web chama `/api/*` com cookie de sessao. O app nao tem cookie, entao
 * manda o access_token do Supabase no cabecalho Authorization — que e o
 * que `createClientFromRequest` (src/lib/supabase/server.ts) le do outro
 * lado antes de cair no cookie.
 *
 * Base URL: por padrao a producao na Vercel, que funciona de qualquer
 * rede. Para apontar ao servidor local, defina EXPO_PUBLIC_API_URL no
 * mobile/.env — lembrando que no emulador Android o host da maquina e
 * 10.0.2.2, nao localhost.
 */
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

async function apiFetch<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) throw new ApiError('Sem sessao ativa.', 401);

  const resposta = await fetch(`${BASE}/api${caminho}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    throw new ApiError(corpo?.error ?? `Erro ${resposta.status}.`, resposta.status);
  }

  // As rotas respondem { data: ... }.
  return (corpo?.data ?? corpo) as T;
}

export const api = {
  get: <T>(caminho: string) => apiFetch<T>(caminho),

  post: <T>(caminho: string, corpo: unknown) =>
    apiFetch<T>(caminho, { method: 'POST', body: JSON.stringify(corpo) }),

  patch: <T>(caminho: string, corpo: unknown) =>
    apiFetch<T>(caminho, { method: 'PATCH', body: JSON.stringify(corpo) }),

  delete: <T>(caminho: string) => apiFetch<T>(caminho, { method: 'DELETE' }),
};
