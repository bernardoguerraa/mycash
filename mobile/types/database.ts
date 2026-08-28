/**
 * Espelho tipado do schema do MyCash, alinhado com src/types/database.ts do web.
 *
 * Aqui ficam so as linhas (Row) e os campos que o app precisa enviar, porque
 * o mobile nunca fala com o Postgres: ele fala com /api/*, e quem monta o
 * insert (id_usuario, origem, defaults) e o handler do Next.js.
 *
 * Atencao: as PKs nao seguem o padrao `id` — sao id_usuario, id_conta,
 * id_transacao, id_meta, id_lembrete, id_notificacao.
 */

export type PlanoUsuario = 'Free' | 'Premium';
export type StatusConta = 'Ativo' | 'Inativo' | 'Bloqueado';
export type TipoTransacao = 'Entrada' | 'Saida';
export type StatusMeta = 'EmAndamento' | 'Concluida' | 'Cancelada';
export type TipoLembrete = 'ContaPagar' | 'ContaReceber';
export type TipoNotificacao = 'Sistema' | 'Meta' | 'Lembrete' | 'Alerta';

export type Origem = 'manual' | 'pluggy';

export type Usuario = {
  id_usuario: number;
  auth_user_id: string | null;
  nome_completo: string;
  email: string;
  data_cadastro: string;
  plano: PlanoUsuario;
  status_conta: StatusConta;
};

export type Conta = {
  id_conta: number;
  id_usuario: number;
  instituicao: string;
  numero_conta: string;
  tipo_conta: string;
  saldo_atual: number;
  ultima_sync: string;
  origem: Origem;
};

export type ContaInput = {
  instituicao: string;
  numero_conta: string;
  tipo_conta: string;
  saldo_atual?: number;
};

export type Transacao = {
  id_transacao: number;
  id_conta: number;
  data_transacao: string;
  tipo: TipoTransacao;
  categoria: string;
  descricao: string;
  valor: number;
  origem: Origem;
};

export type TransacaoInput = {
  id_conta: number;
  data_transacao?: string;
  tipo: TipoTransacao;
  categoria: string;
  descricao: string;
  valor: number;
};

export type Meta = {
  id_meta: number;
  id_usuario: number;
  titulo: string;
  valor_objetivo: number;
  valor_atual: number;
  data_inicio: string;
  data_limite: string;
  status: StatusMeta;
};

export type MetaInput = {
  titulo: string;
  valor_objetivo: number;
  valor_atual?: number;
  data_inicio?: string;
  data_limite: string;
  status?: StatusMeta;
};

export type Lembrete = {
  id_lembrete: number;
  id_usuario: number;
  descricao: string;
  data_vencimento: string;
  valor_previsto: number;
  tipo: TipoLembrete;
  ativo: boolean;
};

export type LembreteInput = {
  descricao: string;
  data_vencimento: string;
  valor_previsto: number;
  tipo: TipoLembrete;
  ativo?: boolean;
};

export type Notificacao = {
  id_notificacao: number;
  id_usuario: number;
  mensagem: string;
  data_notificacao: string;
  lida: boolean;
  tipo: TipoNotificacao;
};

export type NotificacaoInput = {
  mensagem: string;
  tipo: TipoNotificacao;
  lida?: boolean;
};

/**
 * Retorno de GET /api/dashboard. O recorte do mes e a soma dos saldos ficam
 * no servidor — o app so desenha o que chega.
 */
/** Um mes da serie de GET /api/dashboard. */
export type PontoMensal = {
  mes: string;
  ano: number;
  entradas: number;
  saidas: number;
};

export type ResumoDashboard = {
  /** nome_completo da tabela usuarios; vazio se o cadastro nao tiver nome. */
  nome: string;
  saldoTotal: number;
  entradas: number;
  saidas: number;
  saldoMes: number;
  metasAtivas: number;
  /** Seis meses, do mais antigo ao corrente. */
  serieMensal: PontoMensal[];
  recentes: Transacao[];
  proximosLembretes: Pick<
    Lembrete,
    'id_lembrete' | 'descricao' | 'data_vencimento' | 'valor_previsto' | 'tipo'
  >[];
};

/** Retorno de GET /api/perfil — o usuario mais os contadores das telas. */
export type Perfil = {
  usuario: Usuario | null;
  email: string;
  stats: {
    totalContas: number;
    totalTransacoes: number;
    totalMetas: number;
  };
};
