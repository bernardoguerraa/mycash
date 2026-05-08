import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NotificacoesClient from '@/components/notificacoes/NotificacoesClient'

export default async function NotificacoesPage() {
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

  const { data: notificacoes } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('id_usuario', usuario.id_usuario)
    .order('data_notificacao', { ascending: false })

  return <NotificacoesClient notificacoes={notificacoes ?? []} />
}
