/**
 * Tipos do dominio.
 *
 * Sao declarados aqui, e nao importados de `@/types/database`, por dois
 * motivos:
 *
 * 1. O dominio nao deve depender do formato da tabela. Se amanha uma coluna
 *    for renomeada, quem muda e o adaptador — a regra de negocio nao tem por
 *    que saber.
 * 2. Sem `@/`, esta pasta e portavel: o app mobile importa os mesmos arquivos
 *    por caminho relativo, e as regras deixam de existir em duas copias que
 *    divergem com o tempo.
 *
 * Os nomes coincidem de proposito com os enums do Postgres — sao o vocabulario
 * que o time ja usa. O que muda e a direcao da dependencia.
 */

export type StatusConta = 'Ativo' | 'Inativo' | 'Bloqueado'
export type TipoTransacao = 'Entrada' | 'Saida'
export type StatusMeta = 'EmAndamento' | 'Concluida' | 'Cancelada'
export type TipoLembrete = 'ContaPagar' | 'ContaReceber'
