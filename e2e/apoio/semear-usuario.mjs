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

const alvo = process.argv.includes('--limpar') ? limpar : semear
alvo().catch((e) => {
  console.error(e.message ?? e)
  process.exit(1)
})
