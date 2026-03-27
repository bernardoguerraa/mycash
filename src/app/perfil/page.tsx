import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PerfilClient from '@/components/perfil/PerfilClient'

export default async function PerfilPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile from usuarios table
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*')
    .eq('email', user.email!)
    .single()

  // Fetch stats
  const { count: totalContas } = await supabase
    .from('contas_bancarias')
    .select('*', { count: 'exact', head: true })

  const { count: totalTransacoes } = await supabase
    .from('transacoes')
    .select('*', { count: 'exact', head: true })

  const { count: totalMetas } = await supabase
    .from('metas_financeiras')
    .select('*', { count: 'exact', head: true })

  return (
    <PerfilClient
      usuario={usuario}
      userEmail={user.email ?? ''}
      stats={{
        totalContas: totalContas ?? 0,
        totalTransacoes: totalTransacoes ?? 0,
        totalMetas: totalMetas ?? 0,
      }}
    />
  )
}
