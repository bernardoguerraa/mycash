import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MetasClient from '@/components/metas/MetasClient'

export default async function MetasPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get id_usuario from the usuarios table using auth email
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id_usuario')
    .eq('email', user.email!)
    .single()

  if (!usuario) {
    redirect('/login')
  }

  const { data: metas } = await supabase
    .from('metas_financeiras')
    .select('*')
    .eq('id_usuario', usuario.id_usuario)
    .order('data_limite', { ascending: true })

  return <MetasClient metas={metas ?? []} idUsuario={usuario.id_usuario} />
}
