/**
 * Repository pattern — camada que encapsula o acesso a dados por dominio.
 *
 * Por que ter isso alem do `api.*`?
 * - Semanticamente rico: `transacoesRepository.criarSaida(...)` diz o que
 *   faz, `api.transacoes.create({...})` so descreve HTTP.
 * - Ponto unico para regras de dominio (calculos, validacoes, normalizacoes)
 *   antes de bater no backend.
 * - Substituivel: se um dia a origem dos dados mudar (outra API, cache local,
 *   etc.), so o repositorio precisa mudar; os componentes ficam intactos.
 * - Testavel: mocka o repositorio no teste do componente sem tocar em fetch.
 *
 * Convencao: cada repositorio tem `list`, `porId`, `criar`, `atualizar`,
 * `remover`. Metodos adicionais surgem por necessidade de dominio.
 *
 * Guia ADS III explicitamente recomenda o padrao Repository:
 *   "e recomendavel a aplicacao de tecnicas modernas de gerenciamento de
 *    estado, como o padrao de projeto Repository, para isolamento e
 *    seguranca dos dados"
 */

import { api } from './client'
import type { Database } from '@/types/database'

type TB = Database['public']['Tables']
type Transacao = TB['transacoes']['Row']
type Conta = TB['contas_bancarias']['Row']
type Meta = TB['metas_financeiras']['Row']
type Lembrete = TB['lembretes']['Row']
type Notificacao = TB['notificacoes']['Row']

// ============================================================================
// Transacoes
// ============================================================================

export const transacoesRepository = {
  async listar(filtros?: {
    idConta?: number
    tipo?: 'Entrada' | 'Saida'
    limit?: number
  }): Promise<Transacao[]> {
    return api.transacoes.list({
      id_conta: filtros?.idConta,
      tipo: filtros?.tipo,
      limit: filtros?.limit,
    })
  },

  porId(id: number): Promise<Transacao> {
    return api.transacoes.get(id)
  },

  async criar(input: {
    idConta: number
    dataTransacao?: string
    tipo: 'Entrada' | 'Saida'
    categoria: string
    descricao: string
    valor: number
  }): Promise<Transacao> {
    if (input.valor <= 0) {
      throw new Error('O valor precisa ser positivo. Use tipo=Saida para debitos.')
    }
    return api.transacoes.create({
      id_conta: input.idConta,
      data_transacao: input.dataTransacao,
      tipo: input.tipo,
      categoria: input.categoria,
      descricao: input.descricao,
      valor: input.valor,
    })
  },

  atualizar(
    id: number,
    changes: Partial<{
      idConta: number
      dataTransacao: string
      tipo: 'Entrada' | 'Saida'
      categoria: string
      descricao: string
      valor: number
    }>
  ): Promise<Transacao> {
    const payload: Record<string, unknown> = {}
    if (changes.idConta !== undefined) payload.id_conta = changes.idConta
    if (changes.dataTransacao !== undefined) payload.data_transacao = changes.dataTransacao
    if (changes.tipo !== undefined) payload.tipo = changes.tipo
    if (changes.categoria !== undefined) payload.categoria = changes.categoria
    if (changes.descricao !== undefined) payload.descricao = changes.descricao
    if (changes.valor !== undefined) payload.valor = changes.valor
    return api.transacoes.update(id, payload)
  },

  remover(id: number): Promise<null> {
    return api.transacoes.delete(id)
  },
}

// ============================================================================
// Contas bancarias
// ============================================================================

export const contasRepository = {
  listar(): Promise<Conta[]> {
    return api.contas.list()
  },

  porId(id: number): Promise<Conta> {
    return api.contas.get(id)
  },

  criar(input: {
    instituicao: string
    numeroConta: string
    tipoConta: string
    saldoAtual?: number
  }): Promise<Conta> {
    return api.contas.create({
      instituicao: input.instituicao.trim(),
      numero_conta: input.numeroConta.trim(),
      tipo_conta: input.tipoConta,
      saldo_atual: input.saldoAtual ?? 0,
    })
  },

  atualizar(id: number, changes: Partial<{
    instituicao: string
    numeroConta: string
    tipoConta: string
    saldoAtual: number
  }>): Promise<Conta> {
    const payload: Record<string, unknown> = {}
    if (changes.instituicao !== undefined) payload.instituicao = changes.instituicao.trim()
    if (changes.numeroConta !== undefined) payload.numero_conta = changes.numeroConta.trim()
    if (changes.tipoConta !== undefined) payload.tipo_conta = changes.tipoConta
    if (changes.saldoAtual !== undefined) payload.saldo_atual = changes.saldoAtual
    return api.contas.update(id, payload)
  },

  remover(id: number): Promise<null> {
    return api.contas.delete(id)
  },
}

// ============================================================================
// Metas financeiras
// ============================================================================

export const metasRepository = {
  listar(filtros?: {
    status?: 'EmAndamento' | 'Concluida' | 'Cancelada'
  }): Promise<Meta[]> {
    return api.metas.list({ status: filtros?.status })
  },

  porId(id: number): Promise<Meta> {
    return api.metas.get(id)
  },

  async criar(input: {
    titulo: string
    valorObjetivo: number
    valorAtual?: number
    dataInicio?: string
    dataLimite: string
  }): Promise<Meta> {
    if (input.valorObjetivo <= 0) {
      throw new Error('O valor objetivo precisa ser positivo.')
    }
    return api.metas.create({
      titulo: input.titulo.trim(),
      valor_objetivo: input.valorObjetivo,
      valor_atual: input.valorAtual,
      data_inicio: input.dataInicio,
      data_limite: input.dataLimite,
      status: 'EmAndamento',
    })
  },

  atualizar(id: number, changes: Partial<{
    titulo: string
    valorObjetivo: number
    valorAtual: number
    dataInicio: string
    dataLimite: string
    status: 'EmAndamento' | 'Concluida' | 'Cancelada'
  }>): Promise<Meta> {
    const payload: Record<string, unknown> = {}
    if (changes.titulo !== undefined) payload.titulo = changes.titulo.trim()
    if (changes.valorObjetivo !== undefined) payload.valor_objetivo = changes.valorObjetivo
    if (changes.valorAtual !== undefined) payload.valor_atual = changes.valorAtual
    if (changes.dataInicio !== undefined) payload.data_inicio = changes.dataInicio
    if (changes.dataLimite !== undefined) payload.data_limite = changes.dataLimite
    if (changes.status !== undefined) payload.status = changes.status
    return api.metas.update(id, payload)
  },

  /**
   * Aporta um valor na meta e marca como concluida se atingir o objetivo.
   * Metodo de dominio — encapsula regra de negocio que estava espalhada
   * pelo AddValorModal.
   */
  async aportar(id: number, valor: number, saldoAtual: number, objetivo: number): Promise<Meta> {
    if (valor <= 0) throw new Error('Valor de aporte precisa ser positivo.')
    const novoTotal = saldoAtual + valor
    return this.atualizar(id, {
      valorAtual: novoTotal,
      status: novoTotal >= objetivo ? 'Concluida' : undefined,
    })
  },

  remover(id: number): Promise<null> {
    return api.metas.delete(id)
  },
}

// ============================================================================
// Lembretes
// ============================================================================

export const lembretesRepository = {
  listar(filtros?: {
    ativo?: boolean
    tipo?: 'ContaPagar' | 'ContaReceber'
  }): Promise<Lembrete[]> {
    return api.lembretes.list({ ativo: filtros?.ativo, tipo: filtros?.tipo })
  },

  porId(id: number): Promise<Lembrete> {
    return api.lembretes.get(id)
  },

  criar(input: {
    descricao: string
    dataVencimento: string
    valorPrevisto: number
    tipo: 'ContaPagar' | 'ContaReceber'
    ativo?: boolean
  }): Promise<Lembrete> {
    return api.lembretes.create({
      descricao: input.descricao.trim(),
      data_vencimento: input.dataVencimento,
      valor_previsto: input.valorPrevisto,
      tipo: input.tipo,
      ativo: input.ativo,
    })
  },

  atualizar(id: number, changes: Partial<{
    descricao: string
    dataVencimento: string
    valorPrevisto: number
    tipo: 'ContaPagar' | 'ContaReceber'
    ativo: boolean
  }>): Promise<Lembrete> {
    const payload: Record<string, unknown> = {}
    if (changes.descricao !== undefined) payload.descricao = changes.descricao.trim()
    if (changes.dataVencimento !== undefined) payload.data_vencimento = changes.dataVencimento
    if (changes.valorPrevisto !== undefined) payload.valor_previsto = changes.valorPrevisto
    if (changes.tipo !== undefined) payload.tipo = changes.tipo
    if (changes.ativo !== undefined) payload.ativo = changes.ativo
    return api.lembretes.update(id, payload)
  },

  alternarAtivo(id: number, ativoAtual: boolean): Promise<Lembrete> {
    return this.atualizar(id, { ativo: !ativoAtual })
  },

  remover(id: number): Promise<null> {
    return api.lembretes.delete(id)
  },
}

// ============================================================================
// Notificacoes
// ============================================================================

export const notificacoesRepository = {
  listar(filtros?: { lida?: boolean }): Promise<Notificacao[]> {
    return api.notificacoes.list({ lida: filtros?.lida })
  },

  porId(id: number): Promise<Notificacao> {
    return api.notificacoes.get(id)
  },

  criar(input: {
    mensagem: string
    tipo: 'Sistema' | 'Meta' | 'Lembrete' | 'Alerta'
    lida?: boolean
  }): Promise<Notificacao> {
    return api.notificacoes.create({
      mensagem: input.mensagem.trim(),
      tipo: input.tipo,
      lida: input.lida,
    })
  },

  marcarComoLida(id: number): Promise<Notificacao> {
    return api.notificacoes.update(id, { lida: true })
  },

  async marcarTodasComoLidas(ids: number[]): Promise<Notificacao[]> {
    return Promise.all(ids.map((id) => this.marcarComoLida(id)))
  },

  remover(id: number): Promise<null> {
    return api.notificacoes.delete(id)
  },
}

// ============================================================================
// Acesso agregado — util para injecao em contextos/hooks
// ============================================================================

export const repositories = {
  transacoes: transacoesRepository,
  contas: contasRepository,
  metas: metasRepository,
  lembretes: lembretesRepository,
  notificacoes: notificacoesRepository,
}
