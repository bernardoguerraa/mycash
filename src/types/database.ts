export type PlanoUsuario = 'Free' | 'Premium';
export type StatusConta = 'Ativo' | 'Inativo' | 'Bloqueado';
export type TipoTransacao = 'Entrada' | 'Saida';
export type StatusMeta = 'EmAndamento' | 'Concluida' | 'Cancelada';
export type TipoLembrete = 'ContaPagar' | 'ContaReceber';
export type TipoNotificacao = 'Sistema' | 'Meta' | 'Lembrete' | 'Alerta';

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id_usuario: number;
          nome_completo: string;
          email: string;
          senha_hash: string;
          data_cadastro: string;
          plano: PlanoUsuario;
          status_conta: StatusConta;
        };
        Insert: {
          id_usuario?: number;
          nome_completo: string;
          email: string;
          senha_hash: string;
          data_cadastro?: string;
          plano?: PlanoUsuario;
          status_conta?: StatusConta;
        };
        Update: {
          id_usuario?: number;
          nome_completo?: string;
          email?: string;
          senha_hash?: string;
          data_cadastro?: string;
          plano?: PlanoUsuario;
          status_conta?: StatusConta;
        };
        Relationships: [];
      };
      contas_bancarias: {
        Row: {
          id_conta: number;
          id_usuario: number;
          instituicao: string;
          numero_conta: string;
          tipo_conta: string;
          saldo_atual: number;
          ultima_sync: string;
        };
        Insert: {
          id_conta?: number;
          id_usuario: number;
          instituicao: string;
          numero_conta: string;
          tipo_conta: string;
          saldo_atual?: number;
          ultima_sync?: string;
        };
        Update: {
          id_conta?: number;
          id_usuario?: number;
          instituicao?: string;
          numero_conta?: string;
          tipo_conta?: string;
          saldo_atual?: number;
          ultima_sync?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contas_bancarias_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id_usuario'];
          }
        ];
      };
      transacoes: {
        Row: {
          id_transacao: number;
          id_conta: number;
          data_transacao: string;
          tipo: TipoTransacao;
          categoria: string;
          descricao: string;
          valor: number;
        };
        Insert: {
          id_transacao?: number;
          id_conta: number;
          data_transacao?: string;
          tipo: TipoTransacao;
          categoria: string;
          descricao: string;
          valor: number;
        };
        Update: {
          id_transacao?: number;
          id_conta?: number;
          data_transacao?: string;
          tipo?: TipoTransacao;
          categoria?: string;
          descricao?: string;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'transacoes_id_conta_fkey';
            columns: ['id_conta'];
            isOneToOne: false;
            referencedRelation: 'contas_bancarias';
            referencedColumns: ['id_conta'];
          }
        ];
      };
      metas_financeiras: {
        Row: {
          id_meta: number;
          id_usuario: number;
          titulo: string;
          valor_objetivo: number;
          valor_atual: number;
          data_inicio: string;
          data_limite: string;
          status: StatusMeta;
        };
        Insert: {
          id_meta?: number;
          id_usuario: number;
          titulo: string;
          valor_objetivo: number;
          valor_atual?: number;
          data_inicio?: string;
          data_limite: string;
          status?: StatusMeta;
        };
        Update: {
          id_meta?: number;
          id_usuario?: number;
          titulo?: string;
          valor_objetivo?: number;
          valor_atual?: number;
          data_inicio?: string;
          data_limite?: string;
          status?: StatusMeta;
        };
        Relationships: [
          {
            foreignKeyName: 'metas_financeiras_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id_usuario'];
          }
        ];
      };
      lembretes: {
        Row: {
          id_lembrete: number;
          id_usuario: number;
          descricao: string;
          data_vencimento: string;
          valor_previsto: number;
          tipo: TipoLembrete;
          ativo: boolean;
        };
        Insert: {
          id_lembrete?: number;
          id_usuario: number;
          descricao: string;
          data_vencimento: string;
          valor_previsto: number;
          tipo: TipoLembrete;
          ativo?: boolean;
        };
        Update: {
          id_lembrete?: number;
          id_usuario?: number;
          descricao?: string;
          data_vencimento?: string;
          valor_previsto?: number;
          tipo?: TipoLembrete;
          ativo?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'lembretes_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id_usuario'];
          }
        ];
      };
      notificacoes: {
        Row: {
          id_notificacao: number;
          id_usuario: number;
          mensagem: string;
          data_notificacao: string;
          lida: boolean;
          tipo: TipoNotificacao;
        };
        Insert: {
          id_notificacao?: number;
          id_usuario: number;
          mensagem: string;
          data_notificacao?: string;
          lida?: boolean;
          tipo: TipoNotificacao;
        };
        Update: {
          id_notificacao?: number;
          id_usuario?: number;
          mensagem?: string;
          data_notificacao?: string;
          lida?: boolean;
          tipo?: TipoNotificacao;
        };
        Relationships: [
          {
            foreignKeyName: 'notificacoes_id_usuario_fkey';
            columns: ['id_usuario'];
            isOneToOne: false;
            referencedRelation: 'usuarios';
            referencedColumns: ['id_usuario'];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plano_usuario: PlanoUsuario;
      status_conta: StatusConta;
      tipo_transacao: TipoTransacao;
      status_meta: StatusMeta;
      tipo_lembrete: TipoLembrete;
      tipo_notificacao: TipoNotificacao;
    };
    CompositeTypes: Record<string, never>;
  };
}
