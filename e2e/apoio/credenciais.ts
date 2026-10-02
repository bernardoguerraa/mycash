/**
 * Credenciais do usuario de teste.
 *
 * Nao ficam no repositorio, e nem poderiam: sao uma conta real no Supabase
 * Auth. Vem de `.env.e2e` (ignorado pelo git) ou do ambiente:
 *
 *   E2E_EMAIL=...
 *   E2E_SENHA=...
 *
 * No CI viriam de `secrets`. Aqui o teste e explicito sobre a ausencia em vez
 * de falhar com "Invalid login credentials": `test.skip` com motivo legivel
 * diz o que fazer, enquanto um expect quebrado so diria que algo nao deu
 * certo.
 */

export type Credenciais = { email: string; senha: string }

export function credenciais(): Credenciais | null {
  const email = process.env.E2E_EMAIL
  const senha = process.env.E2E_SENHA
  if (!email || !senha) return null
  return { email, senha }
}

export const MOTIVO_SEM_CREDENCIAL =
  'E2E_EMAIL / E2E_SENHA nao definidos. Crie um usuario de teste no Supabase e ' +
  'exporte as duas variaveis (ou use .env.e2e) para rodar o cenario autenticado.'

/**
 * Marcador para os dados que o teste cria.
 *
 * O cenario escreve num banco real compartilhado, entao cada execucao precisa
 * reconhecer o que e seu: o prefixo mais o timestamp evitam que uma execucao
 * apague a transacao de outra, e deixam lixo identificavel se o teardown
 * falhar no meio.
 */
export function descricaoDeTeste(rotulo: string): string {
  return `[e2e-${Date.now()}] ${rotulo}`
}
