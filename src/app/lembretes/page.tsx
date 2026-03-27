import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LembretesClient from '@/components/lembretes/LembretesClient'

export default async function LembretesPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get id_usuario by querying usuarios table with auth user's email
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id_usuario')
    .eq('email', user.email!)
    .single()

  if (!usuario) {
    redirect('/login')
  }

  const { data: lembretes } = await supabase
    .from('lembretes')
    .select('*')
    .eq('id_usuario', usuario.id_usuario)
    .order('data_vencimento', { ascending: true })

  return <LembretesClient lembretes={lembretes ?? []} idUsuario={usuario.id_usuario} />
}
