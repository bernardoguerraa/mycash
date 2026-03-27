import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ContasClient from '@/components/contas/ContasClient'

export default async function ContasPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: contas } = await supabase
    .from('contas_bancarias')
    .select('*')
    .order('instituicao', { ascending: true })

  return <ContasClient contas={contas ?? []} />
}
