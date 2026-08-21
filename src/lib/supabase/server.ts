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
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
