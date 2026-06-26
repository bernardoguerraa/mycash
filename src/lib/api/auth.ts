import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Resolve o id_usuario (bigint) do usuario autenticado no Supabase.
 * Retorna null se nao houver sessao ou se o mapeamento falhar.
 *
 * Usado nas rotas de API REST que precisam preencher id_usuario em
 * inserts ou filtrar dados pelo usuario corrente.
 */
export async function getCurrentIdUsuario(
  supabase: SupabaseClient<Database>
): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id_usuario')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  return data?.id_usuario ?? null
}
