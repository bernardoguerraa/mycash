import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TransacoesClient from '@/components/transacoes/TransacoesClient'

export default async function TransacoesPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's contas_bancarias
  const { data: contas } = await supabase
    .from('contas_bancarias')
    .select('id_conta, instituicao, tipo_conta')

  const contaIds = contas?.map((c) => c.id_conta) ?? []

  // Fetch transacoes for those accounts
  let transacoes: Array<{
    id_transacao: number
    id_conta: number
    data_transacao: string
    tipo: 'Entrada' | 'Saida'
    categoria: string
    descricao: string
    valor: number
  }> = []

  if (contaIds.length > 0) {
    const { data } = await supabase
      .from('transacoes')
      .select('*')
      .in('id_conta', contaIds)
      .order('data_transacao', { ascending: false })

    transacoes = data ?? []
  }

  // Build conta lookup for display
  const contasMap =
    contas?.map((c) => ({
      id_conta: c.id_conta,
      label: `${c.instituicao} - ${c.tipo_conta}`,
    })) ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          Transacoes
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Gerencie todas as suas transacoes financeiras.
        </p>
      </div>

      <TransacoesClient
        initialTransacoes={transacoes}
        contas={contasMap}
      />
    </div>
  )
}
