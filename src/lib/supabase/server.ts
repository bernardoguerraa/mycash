import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Cliente para rotas de API que atendem tanto o web quanto o app mobile.
 *
 * O web autentica por cookie (@supabase/ssr, escrito no login e renovado
 * pelo middleware). O app nativo nao tem cookie: ele guarda a sessao no
 * AsyncStorage e manda `Authorization: Bearer <access_token>`.
 *
 * Esta funcao prefere o cabecalho quando ele existe e cai no cookie caso
 * contrario, entao a mesma rota serve os dois clientes sem ramificacao.
 *
 * A RLS continua sendo quem filtra: o token vai para o PostgREST do mesmo
 * jeito, so muda de onde ele foi lido.
 */
export function createClientFromRequest(req: Request) {
  const authorization = req.headers.get('authorization');

  if (!authorization?.toLowerCase().startsWith('bearer ')) {
    return createClient();
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: authorization },
        // O supabase-js chama `fetch` por baixo, e o App Router do Next
        // guarda respostas de fetch por padrao (Data Cache). Cada URL do
        // PostgREST vira uma chave, entao as consultas congelavam em momentos
        // diferentes: o painel voltava com o saldo e a contagem de metas de
        // minutos antes enquanto /api/contas e /api/metas ja traziam o valor
        // novo — a mesma tabela, respostas diferentes.
        fetch: (entrada, init) => fetch(entrada, { ...init, cache: 'no-store' }),
      },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
