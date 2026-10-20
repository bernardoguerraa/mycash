/**
 * Semeia o usuario de teste do E2E via API Admin do Supabase.
 *
 *   node e2e/apoio/semear-usuario.mjs          # cria e imprime as credenciais
 *   node e2e/apoio/semear-usuario.mjs --limpar # remove o usuario e os dados
 *
 * Por que script, e nao clicar na tela de registro: o cadastro manual exige
 * confirmacao por e-mail e produz um usuario diferente a cada execucao. O
 * roteiro da aula chama isso de API Data Seeding — o estado de partida do
 * teste vem de uma chamada deterministica, nao de uma jornada pela interface
 * nem de um registro fixo que alguem pode ter apagado.
 *
 * Idempotente: rodar de novo reaproveita o usuario existente e so garante a
 * conta bancaria. Isso importa porque o teste precisa do mesmo ponto de
 * partida em qualquer execucao.
 *
 * ATENCAO: isto escreve no projeto Supabase configurado em .env. O usuario
 * criado e identificavel pelo e-mail e removivel com --limpar.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

// Le .env sem dependencia extra: o Node nativo so carrega .env com flag.
function carregarEnv(arquivo) {
  try {
    for (const linha of readFileSync(arquivo, 'utf8').split('\n')) {
      const m = linha.match(/^\s*([A-Z_0-9]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  } catch {
    /* arquivo ausente e normal: no CI as variaveis vem do ambiente */
  }
}
carregarEnv('.env')
carregarEnv('.env.local')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !SERVICE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

export const EMAIL = 'e2e-teste@mycash.dev'
export const SENHA = 'E2e!MyCash#2026'

// Service role ignora RLS — e o que permite criar usuario e semear conta sem
// sessao. Por isso esta chave nunca pode ganhar prefixo NEXT_PUBLIC_: iria
// para o bundle do navegador e daria esse mesmo poder a qualquer visitante.
const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function acharUsuarioAuth() {
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw error
  return data.users.find((u) => u.email === EMAIL) ?? null
}

async function limpar() {
  const existente = await acharUsuarioAuth()
  if (!existente) {
    console.log('Nada a limpar.')
    return
  }
  // `on delete cascade` em usuarios -> contas_bancarias -> transacoes faz o
  // resto: apagar a raiz leva tudo. Comportamento verificado em
  // tests/integracao/schema.test.ts.
  await admin.from('usuarios').delete().eq('email', EMAIL)
  const { error } = await admin.auth.admin.deleteUser(existente.id)
  if (error) throw error
  console.log(`Removido: ${EMAIL}`)
}

async function semear() {
  let usuario = await acharUsuarioAuth()

  if (usuario) {
    console.log(`Usuario de teste ja existe: ${EMAIL}`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: SENHA,
      // Sem isto o login falha com "Email not confirmed": o fluxo normal
      // manda e-mail de confirmacao, que um teste automatizado nao abre.
      email_confirm: true,
      user_metadata: { nome_completo: 'Usuario E2E', full_name: 'Usuario E2E' },
    })
    if (error) throw error
    usuario = data.user
    console.log(`Usuario criado: ${EMAIL}`)
  }

  // O trigger handle_new_auth_user cria a linha em public.usuarios.
  const { data: perfil, error: erroPerfil } = await admin
    .from('usuarios')
    .select('id_usuario')
    .eq('email', EMAIL)
    .single()
  if (erroPerfil) throw erroPerfil

  // Conta bancaria: o modal de transacao precisa de pelo menos uma opcao no
  // seletor "Conta". Sem ela o cenario transacional nao tem onde lancar.
  const { data: contas, error: erroContas } = await admin
    .from('contas_bancarias')
    .select('id_conta')
    .eq('id_usuario', perfil.id_usuario)
  if (erroContas) throw erroContas

  if (contas.length === 0) {
    const { error } = await admin.from('contas_bancarias').insert({
      id_usuario: perfil.id_usuario,
      instituicao: 'Banco E2E',
      numero_conta: '0001/00000-1',
      tipo_conta: 'Corrente',
      saldo_atual: 1000,
      origem: 'manual',
    })
    if (error) throw error
    console.log('Conta bancaria semeada com saldo 1000.')
  } else {
    console.log(`Conta bancaria ja existe (${contas.length}).`)
  }

  console.log('\nExporte antes de rodar o cenario transacional:')
  console.log(`  E2E_EMAIL=${EMAIL}`)
  console.log(`  E2E_SENHA=${SENHA}`)
}

/**
 * Dados de demonstracao para as capturas do relatorio.
 *
 * Separado de `semear` de proposito: a suite E2E precisa de um ponto de
 * partida minimo e previsivel, enquanto o print precisa de uma tela que
 * pareca um uso real. Misturar os dois faria o teste depender de dados que
 * existem so para a foto.
 */
async function demo() {
  const { data: perfil } = await admin
    .from('usuarios')
    .select('id_usuario')
    .eq('email', EMAIL)
    .single()
  if (!perfil) throw new Error('Rode sem --demo primeiro para criar o usuario.')

  const { data: contas } = await admin
    .from('contas_bancarias')
    .select('id_conta')
    .eq('id_usuario', perfil.id_usuario)
  const idConta = contas[0].id_conta

  // Limpa o que sobrou de execucoes anteriores do E2E: transacao marcada com
  // o prefixo [e2e- nao deve aparecer no print do relatorio.
  await admin.from('transacoes').delete().like('descricao', '[e2e-%')
  await admin.from('transacoes').delete().eq('id_conta', idConta)
  await admin.from('metas_financeiras').delete().eq('id_usuario', perfil.id_usuario)
  await admin.from('lembretes').delete().eq('id_usuario', perfil.id_usuario)

  const hoje = new Date()
  const dia = (offset) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() - offset)
    return d.toISOString().slice(0, 10)
  }
  const mesPassado = (meses, diaDoMes) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - meses, diaDoMes)
    return d.toISOString().slice(0, 10)
  }

  const transacoes = [
    { tipo: 'Entrada', categoria: 'Salario', descricao: 'Salario mensal', valor: 4200, data_transacao: dia(12) },
    { tipo: 'Saida', categoria: 'Moradia', descricao: 'Aluguel', valor: 1450, data_transacao: dia(11) },
    { tipo: 'Saida', categoria: 'Alimentacao', descricao: 'Supermercado Extra', valor: 487.93, data_transacao: dia(9) },
    { tipo: 'Saida', categoria: 'Transporte', descricao: 'Combustivel', valor: 220, data_transacao: dia(7) },
    { tipo: 'Saida', categoria: 'Lazer', descricao: 'Cinema e jantar', valor: 138.5, data_transacao: dia(5) },
    { tipo: 'Entrada', categoria: 'Freelance', descricao: 'Projeto freelance', valor: 1800, data_transacao: dia(4) },
    { tipo: 'Saida', categoria: 'Saude', descricao: 'Farmacia', valor: 96.4, data_transacao: dia(3) },
    { tipo: 'Saida', categoria: 'Educacao', descricao: 'Curso online', valor: 349, data_transacao: dia(2) },
    { tipo: 'Saida', categoria: 'Alimentacao', descricao: 'Restaurante', valor: 72.8, data_transacao: dia(1) },
    // Meses anteriores alimentam o grafico de seis meses do dashboard.
    { tipo: 'Entrada', categoria: 'Salario', descricao: 'Salario mensal', valor: 4200, data_transacao: mesPassado(1, 5) },
    { tipo: 'Saida', categoria: 'Moradia', descricao: 'Aluguel', valor: 1450, data_transacao: mesPassado(1, 6) },
    { tipo: 'Saida', categoria: 'Alimentacao', descricao: 'Supermercado', valor: 612.4, data_transacao: mesPassado(1, 14) },
    { tipo: 'Entrada', categoria: 'Salario', descricao: 'Salario mensal', valor: 4200, data_transacao: mesPassado(2, 5) },
    { tipo: 'Saida', categoria: 'Moradia', descricao: 'Aluguel', valor: 1450, data_transacao: mesPassado(2, 6) },
    { tipo: 'Saida', categoria: 'Transporte', descricao: 'Manutencao do carro', valor: 890, data_transacao: mesPassado(2, 19) },
    { tipo: 'Entrada', categoria: 'Salario', descricao: 'Salario mensal', valor: 4200, data_transacao: mesPassado(3, 5) },
    { tipo: 'Saida', categoria: 'Moradia', descricao: 'Aluguel', valor: 1450, data_transacao: mesPassado(3, 6) },
  ].map((t) => ({ ...t, id_conta: idConta, origem: 'manual' }))

  const { error: errTx } = await admin.from('transacoes').insert(transacoes)
  if (errTx) throw errTx

  const saldo = transacoes.reduce(
    (total, t) => total + (t.tipo === 'Entrada' ? t.valor : -t.valor),
    0
  )
  await admin
    .from('contas_bancarias')
    .update({ saldo_atual: Number(saldo.toFixed(2)) })
    .eq('id_conta', idConta)

  const emMeses = (n) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + n, 15)
    return d.toISOString().slice(0, 10)
  }

  await admin.from('metas_financeiras').insert([
    { id_usuario: perfil.id_usuario, titulo: 'Reserva de emergencia', valor_objetivo: 12000, valor_atual: 4800, data_inicio: mesPassado(4, 1), data_limite: emMeses(8), status: 'EmAndamento' },
    { id_usuario: perfil.id_usuario, titulo: 'Notebook novo', valor_objetivo: 6500, valor_atual: 5200, data_inicio: mesPassado(2, 1), data_limite: emMeses(2), status: 'EmAndamento' },
    { id_usuario: perfil.id_usuario, titulo: 'Viagem de ferias', valor_objetivo: 8000, valor_atual: 1200, data_inicio: mesPassado(1, 1), data_limite: emMeses(10), status: 'EmAndamento' },
  ])

  const emDias = (n) => {
    const d = new Date(hoje)
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  await admin.from('lembretes').insert([
    { id_usuario: perfil.id_usuario, descricao: 'Fatura do cartao', tipo: 'ContaPagar', valor_previsto: 1832.47, data_vencimento: emDias(3), ativo: true },
    { id_usuario: perfil.id_usuario, descricao: 'Conta de luz', tipo: 'ContaPagar', valor_previsto: 187.9, data_vencimento: emDias(6), ativo: true },
    { id_usuario: perfil.id_usuario, descricao: 'Internet', tipo: 'ContaPagar', valor_previsto: 119.9, data_vencimento: emDias(12), ativo: true },
    { id_usuario: perfil.id_usuario, descricao: 'Reembolso do plano de saude', tipo: 'ContaReceber', valor_previsto: 340, data_vencimento: emDias(9), ativo: true },
  ])

  console.log(`Demo semeada: ${transacoes.length} transacoes, 3 metas, 4 lembretes.`)
  console.log(`Saldo da conta: R$ ${saldo.toFixed(2)}`)
}

const alvo = process.argv.includes('--limpar')
  ? limpar
  : process.argv.includes('--demo')
    ? demo
    : semear
alvo().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
