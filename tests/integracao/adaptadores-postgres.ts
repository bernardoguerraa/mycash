import type { Pool } from 'pg'

import type {
  ContaDoDominio,
  ContasPort,
  TransacaoDoDominio,
  TransacoesPort,
} from '@/domain/portas'

/**
 * Implementacoes Postgres das portas do dominio.
 *
 * Sao o outro lado da Inversao de Dependencia: em `src/domain/lancamentos.test.ts`
 * as mesmas portas recebem Fakes em memoria; aqui recebem SQL de verdade. A
 * regra de negocio exercitada e identica — muda so quem persiste.
 *
 * Ficam em tests/ porque em producao quem cumpre esse papel e o cliente
 * Supabase dentro das rotas. O objetivo do teste de integracao nao e trocar a
 * camada de producao, e sim provar que o dominio se encaixa num banco real:
 * tipo numerico, chave estrangeira, cascade, arredondamento.
 *
 * `status_conta` mora em `usuarios`, nao em `contas_bancarias` — dai o join.
 * Bloquear uma conta e bloquear o dono dela.
 */

/** O driver `pg` devolve `numeric` como string para nao perder precisao. */
function paraNumero(valor: string | number): number {
  return typeof valor === 'number' ? valor : Number(valor)
}

export class ContasPostgres implements ContasPort {
  constructor(private readonly db: Pool) {}

  async porId(idConta: number): Promise<ContaDoDominio | null> {
    const { rows } = await this.db.query(
      `select c.id_conta, c.instituicao, c.saldo_atual, u.status_conta
         from public.contas_bancarias c
         join public.usuarios u on u.id_usuario = c.id_usuario
        where c.id_conta = $1`,
      [idConta]
    )
    if (!rows[0]) return null

    return { ...rows[0], saldo_atual: paraNumero(rows[0].saldo_atual) }
  }

  async ajustarSaldo(idConta: number, delta: number): Promise<void> {
    // Incremento no proprio SQL, e nao le-soma-escreve: duas operacoes
    // simultaneas na mesma conta perderiam uma das somas.
    await this.db.query(
      `update public.contas_bancarias
          set saldo_atual = saldo_atual + $2
        where id_conta = $1`,
      [idConta, delta]
    )
  }
}

export class TransacoesPostgres implements TransacoesPort {
  constructor(private readonly db: Pool) {}

  async porId(idTransacao: number): Promise<TransacaoDoDominio | null> {
    const { rows } = await this.db.query(
      `select id_transacao, id_conta, tipo, valor, descricao, categoria, data_transacao
         from public.transacoes where id_transacao = $1`,
      [idTransacao]
    )
    if (!rows[0]) return null

    return { ...rows[0], valor: paraNumero(rows[0].valor) }
  }

  async inserir(dados: Omit<TransacaoDoDominio, 'id_transacao'>): Promise<TransacaoDoDominio> {
    const { rows } = await this.db.query(
      `insert into public.transacoes
         (id_conta, tipo, valor, descricao, categoria, data_transacao)
       values ($1, $2, $3, $4, $5, $6)
       returning id_transacao, id_conta, tipo, valor, descricao, categoria, data_transacao`,
      [
        dados.id_conta,
        dados.tipo,
        dados.valor,
        dados.descricao,
        dados.categoria,
        dados.data_transacao,
      ]
    )

    return { ...rows[0], valor: paraNumero(rows[0].valor) }
  }

  async atualizar(
    idTransacao: number,
    dados: Partial<Omit<TransacaoDoDominio, 'id_transacao'>>
  ): Promise<TransacaoDoDominio> {
    // Update parcial montado a partir das chaves presentes: mandar o objeto
    // inteiro sobrescreveria o que ninguem editou.
    const campos = Object.keys(dados) as (keyof typeof dados)[]
    if (campos.length === 0) {
      const atual = await this.porId(idTransacao)
      if (!atual) throw new Error(`Transacao ${idTransacao} nao existe.`)
      return atual
    }

    const sets = campos.map((campo, i) => `${campo} = $${i + 2}`).join(', ')
    const valores = campos.map((campo) => dados[campo])

    const { rows } = await this.db.query(
      `update public.transacoes set ${sets}
        where id_transacao = $1
       returning id_transacao, id_conta, tipo, valor, descricao, categoria, data_transacao`,
      [idTransacao, ...valores]
    )

    return { ...rows[0], valor: paraNumero(rows[0].valor) }
  }

  async remover(idTransacao: number): Promise<void> {
    await this.db.query(`delete from public.transacoes where id_transacao = $1`, [idTransacao])
  }
}
