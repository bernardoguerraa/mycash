/**
 * Repository pattern no mobile — espelho de src/lib/api/repositories.ts.
 *
 * Por que existir alem do `api.*`?
 * - Semanticamente rico: `metasRepository.aportar(...)` diz o que faz;
 *   `api.metas.update({...})` so descreve HTTP.
 * - Ponto unico para as regras de dominio (valor positivo, conclusao
 *   automatica da meta) — as mesmas do web, escritas uma vez por lado.
 * - Substituivel: se a origem dos dados mudar (outra API, cache offline),
 *   so o repositorio muda; as telas ficam intactas.
 *
 * O guia de ADS III recomenda o padrao explicitamente:
 *   "e recomendavel a aplicacao de tecnicas modernas de gerenciamento de
 *    estado, como o padrao de projeto Repository, para isolamento e
 *    seguranca dos dados"
 *
 * Convencao: `listar`, `porId`, `criar`, `atualizar`, `remover`. Metodos
 * extras aparecem quando o dominio pede.
 */

import { api } from './api';
import type {
  Conta,
  Lembrete,
  Meta,
  Notificacao,
  Perfil,
  ResumoDashboard,
  StatusMeta,
  TipoLembrete,
  TipoNotificacao,
  TipoTransacao,
  Transacao,
  Usuario,
} from '@/types/database';

// ============================================================================
// Dashboard
// ============================================================================

export const dashboardRepository = {
  /**
   * Resumo do painel numa requisicao. A conta do mes e a soma dos saldos
   * ficam em GET /api/dashboard, entao a tela nao recalcula nada.
   */
  resumo(): Promise<ResumoDashboard> {
    return api.dashboard.get();
  },
};

// ============================================================================
// Transacoes
// ============================================================================

export const transacoesRepository = {
  listar(filtros?: {
    idConta?: number;
    tipo?: TipoTransacao;
    /** Recorte por periodo, em YYYY-MM-DD. Filtra no banco, nao no celular. */
    de?: string;
    ate?: string;
    limit?: number;
  }): Promise<Transacao[]> {
    return api.transacoes.list({
      id_conta: filtros?.idConta,
      tipo: filtros?.tipo,
      de: filtros?.de,
      ate: filtros?.ate,
      limit: filtros?.limit,
    });
  },

  porId(id: number): Promise<Transacao> {
    return api.transacoes.get(id);
  },

  criar(input: {
    idConta: number;
    dataTransacao?: string;
    tipo: TipoTransacao;
    categoria: string;
    descricao: string;
    valor: number;
  }): Promise<Transacao> {
    if (input.valor <= 0) {
      throw new Error('O valor precisa ser positivo. Use o tipo Saída para débitos.');
    }
    return api.transacoes.create({
      id_conta: input.idConta,
      data_transacao: input.dataTransacao,
      tipo: input.tipo,
      categoria: input.categoria.trim(),
      descricao: input.descricao.trim(),
      valor: input.valor,
    });
  },

  atualizar(
    id: number,
    mudancas: Partial<{
      idConta: number;
      dataTransacao: string;
      tipo: TipoTransacao;
      categoria: string;
      descricao: string;
      valor: number;
    }>
  ): Promise<Transacao> {
    if (mudancas.valor !== undefined && mudancas.valor <= 0) {
      throw new Error('O valor precisa ser positivo. Use o tipo Saída para débitos.');
    }
    const payload: Record<string, unknown> = {};
    if (mudancas.idConta !== undefined) payload.id_conta = mudancas.idConta;
    if (mudancas.dataTransacao !== undefined) payload.data_transacao = mudancas.dataTransacao;
    if (mudancas.tipo !== undefined) payload.tipo = mudancas.tipo;
    if (mudancas.categoria !== undefined) payload.categoria = mudancas.categoria.trim();
    if (mudancas.descricao !== undefined) payload.descricao = mudancas.descricao.trim();
    if (mudancas.valor !== undefined) payload.valor = mudancas.valor;
    return api.transacoes.update(id, payload);
  },

  remover(id: number): Promise<null> {
    return api.transacoes.delete(id);
  },
};

// ============================================================================
// Contas bancarias
// ============================================================================

export const contasRepository = {
  listar(): Promise<Conta[]> {
    return api.contas.list();
  },

  porId(id: number): Promise<Conta> {
    return api.contas.get(id);
  },

  criar(input: {
    instituicao: string;
    numeroConta: string;
    tipoConta: string;
    saldoAtual?: number;
  }): Promise<Conta> {
    return api.contas.create({
      instituicao: input.instituicao.trim(),
      numero_conta: input.numeroConta.trim(),
      tipo_conta: input.tipoConta,
      saldo_atual: input.saldoAtual ?? 0,
    });
  },

  atualizar(
    id: number,
    mudancas: Partial<{
      instituicao: string;
      numeroConta: string;
      tipoConta: string;
      saldoAtual: number;
    }>
  ): Promise<Conta> {
    const payload: Record<string, unknown> = {};
    if (mudancas.instituicao !== undefined) payload.instituicao = mudancas.instituicao.trim();
    if (mudancas.numeroConta !== undefined) payload.numero_conta = mudancas.numeroConta.trim();
    if (mudancas.tipoConta !== undefined) payload.tipo_conta = mudancas.tipoConta;
    if (mudancas.saldoAtual !== undefined) payload.saldo_atual = mudancas.saldoAtual;
    return api.contas.update(id, payload);
  },

  remover(id: number): Promise<null> {
    return api.contas.delete(id);
  },

  /** Regra de tela: o saldo consolidado e a soma das contas. */
  saldoConsolidado(contas: Conta[]): number {
    return contas.reduce((total, c) => total + (c.saldo_atual || 0), 0);
  },
};

// ============================================================================
// Metas financeiras
// ============================================================================

export const metasRepository = {
  listar(filtros?: { status?: StatusMeta }): Promise<Meta[]> {
    return api.metas.list({ status: filtros?.status });
  },

  porId(id: number): Promise<Meta> {
    return api.metas.get(id);
  },

  criar(input: {
    titulo: string;
    valorObjetivo: number;
    valorAtual?: number;
    dataInicio?: string;
    dataLimite: string;
  }): Promise<Meta> {
    if (input.valorObjetivo <= 0) {
      throw new Error('O valor objetivo precisa ser positivo.');
    }
    return api.metas.create({
      titulo: input.titulo.trim(),
      valor_objetivo: input.valorObjetivo,
      valor_atual: input.valorAtual,
      data_inicio: input.dataInicio,
      data_limite: input.dataLimite,
      status: 'EmAndamento',
    });
  },

  atualizar(
    id: number,
    mudancas: Partial<{
      titulo: string;
      valorObjetivo: number;
      valorAtual: number;
      dataInicio: string;
      dataLimite: string;
      status: StatusMeta;
    }>
  ): Promise<Meta> {
    const payload: Record<string, unknown> = {};
    if (mudancas.titulo !== undefined) payload.titulo = mudancas.titulo.trim();
    if (mudancas.valorObjetivo !== undefined) payload.valor_objetivo = mudancas.valorObjetivo;
    if (mudancas.valorAtual !== undefined) payload.valor_atual = mudancas.valorAtual;
    if (mudancas.dataInicio !== undefined) payload.data_inicio = mudancas.dataInicio;
    if (mudancas.dataLimite !== undefined) payload.data_limite = mudancas.dataLimite;
    if (mudancas.status !== undefined) payload.status = mudancas.status;
    return api.metas.update(id, payload);
  },

  /**
   * Aporta um valor na meta e conclui automaticamente ao bater o objetivo.
   * Regra de dominio — a mesma do AddValorModal do web.
   */
  aportar(meta: Meta, valor: number): Promise<Meta> {
    if (valor <= 0) throw new Error('Valor de aporte precisa ser positivo.');
    const novoTotal = meta.valor_atual + valor;
    return this.atualizar(meta.id_meta, {
      valorAtual: novoTotal,
      status: novoTotal >= meta.valor_objetivo ? 'Concluida' : undefined,
    });
  },

  remover(id: number): Promise<null> {
    return api.metas.delete(id);
  },

  /** Percentual concluido, travado em 100. */
  progresso(meta: Meta): number {
    if (meta.valor_objetivo <= 0) return 0;
    return Math.min((meta.valor_atual / meta.valor_objetivo) * 100, 100);
  },

  /** Dias que faltam ate a data limite (negativo quando ja passou). */
  diasRestantes(meta: Meta): number {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(`${meta.data_limite.slice(0, 10)}T00:00:00`);
    limite.setHours(0, 0, 0, 0);
    return Math.ceil((limite.getTime() - hoje.getTime()) / 86400000);
  },
};

// ============================================================================
// Lembretes
// ============================================================================

export type GrupoVencimento = 'vencidos' | 'proximos' | 'futuros';

export const lembretesRepository = {
  listar(filtros?: { ativo?: boolean; tipo?: TipoLembrete }): Promise<Lembrete[]> {
    return api.lembretes.list({ ativo: filtros?.ativo, tipo: filtros?.tipo });
  },

  porId(id: number): Promise<Lembrete> {
    return api.lembretes.get(id);
  },

  criar(input: {
    descricao: string;
    dataVencimento: string;
    valorPrevisto: number;
    tipo: TipoLembrete;
    ativo?: boolean;
  }): Promise<Lembrete> {
    if (input.valorPrevisto <= 0) throw new Error('Valor deve ser maior que zero.');
    return api.lembretes.create({
      descricao: input.descricao.trim(),
      data_vencimento: input.dataVencimento,
      valor_previsto: input.valorPrevisto,
      tipo: input.tipo,
      ativo: input.ativo,
    });
  },

  atualizar(
    id: number,
    mudancas: Partial<{
      descricao: string;
      dataVencimento: string;
      valorPrevisto: number;
      tipo: TipoLembrete;
      ativo: boolean;
    }>
  ): Promise<Lembrete> {
    const payload: Record<string, unknown> = {};
    if (mudancas.descricao !== undefined) payload.descricao = mudancas.descricao.trim();
    if (mudancas.dataVencimento !== undefined) payload.data_vencimento = mudancas.dataVencimento;
    if (mudancas.valorPrevisto !== undefined) payload.valor_previsto = mudancas.valorPrevisto;
    if (mudancas.tipo !== undefined) payload.tipo = mudancas.tipo;
    if (mudancas.ativo !== undefined) payload.ativo = mudancas.ativo;
    return api.lembretes.update(id, payload);
  },

  alternarAtivo(lembrete: Lembrete): Promise<Lembrete> {
    return this.atualizar(lembrete.id_lembrete, { ativo: !lembrete.ativo });
  },

  remover(id: number): Promise<null> {
    return api.lembretes.delete(id);
  },

  /** Vencido, proximo (ate 7 dias) ou futuro — mesma regra do web. */
  grupoDe(dataVencimento: string): GrupoVencimento {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(`${dataVencimento.slice(0, 10)}T00:00:00`);
    vencimento.setHours(0, 0, 0, 0);

    const dias = (vencimento.getTime() - hoje.getTime()) / 86400000;
    if (dias < 0) return 'vencidos';
    if (dias <= 7) return 'proximos';
    return 'futuros';
  },
};

// ============================================================================
// Notificacoes
// ============================================================================

export const notificacoesRepository = {
  listar(filtros?: { lida?: boolean }): Promise<Notificacao[]> {
    return api.notificacoes.list({ lida: filtros?.lida });
  },

  porId(id: number): Promise<Notificacao> {
    return api.notificacoes.get(id);
  },

  criar(input: {
    mensagem: string;
    tipo: TipoNotificacao;
    lida?: boolean;
  }): Promise<Notificacao> {
    return api.notificacoes.create({
      mensagem: input.mensagem.trim(),
      tipo: input.tipo,
      lida: input.lida,
    });
  },

  marcarComoLida(id: number): Promise<Notificacao> {
    return api.notificacoes.update(id, { lida: true });
  },

  marcarTodasComoLidas(ids: number[]): Promise<Notificacao[]> {
    return Promise.all(ids.map((id) => this.marcarComoLida(id)));
  },

  remover(id: number): Promise<null> {
    return api.notificacoes.delete(id);
  },
};

// ============================================================================
// Perfil
// ============================================================================

export const perfilRepository = {
  carregar(): Promise<Perfil> {
    return api.perfil.get();
  },

  renomear(nomeCompleto: string): Promise<Usuario | null> {
    if (!nomeCompleto.trim()) throw new Error('O nome não pode estar vazio.');
    return api.perfil.update({ nome_completo: nomeCompleto.trim() });
  },
};

// ============================================================================
// Acesso agregado — util para injecao em contextos/hooks
// ============================================================================

export const repositories = {
  dashboard: dashboardRepository,
  transacoes: transacoesRepository,
  contas: contasRepository,
  metas: metasRepository,
  lembretes: lembretesRepository,
  notificacoes: notificacoesRepository,
  perfil: perfilRepository,
};
