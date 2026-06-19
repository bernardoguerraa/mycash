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
          auth_user_id: string | null;
          nome_completo: string;
          email: string;
          senha_hash: string;
          data_cadastro: string;
          plano: PlanoUsuario;
          status_conta: StatusConta;
        };
        Insert: {
          id_usuario?: number;
          auth_user_id?: string | null;
          nome_completo: string;
          email: string;
          senha_hash: string;
          data_cadastro?: string;
          plano?: PlanoUsuario;
          status_conta?: StatusConta;
        };
        Update: {
          id_usuario?: number;
          auth_user_id?: string | null;
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
          pluggy_item_id: string | null;
          pluggy_account_id: string | null;
          pluggy_status: string | null;
          pluggy_last_error: string | null;
          origem: 'manual' | 'pluggy';
        };
        Insert: {
          id_conta?: number;
          id_usuario: number;
          instituicao: string;
          numero_conta: string;
          tipo_conta: string;
          saldo_atual?: number;
          ultima_sync?: string;
          pluggy_item_id?: string | null;
          pluggy_account_id?: string | null;
          pluggy_status?: string | null;
          pluggy_last_error?: string | null;
          origem?: 'manual' | 'pluggy';
        };
        Update: {
          id_conta?: number;
          id_usuario?: number;
          instituicao?: string;
          numero_conta?: string;
          tipo_conta?: string;
          saldo_atual?: number;
          ultima_sync?: string;
          pluggy_item_id?: string | null;
          pluggy_account_id?: string | null;
          pluggy_status?: string | null;
          pluggy_last_error?: string | null;
          origem?: 'manual' | 'pluggy';
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
          pluggy_tx_id: string | null;
          origem: 'manual' | 'pluggy';
          raw_data: Record<string, unknown> | null;
        };
        Insert: {
          id_transacao?: number;
          id_conta: number;
          data_transacao?: string;
          tipo: TipoTransacao;
          categoria: string;
          descricao: string;
          valor: number;
          pluggy_tx_id?: string | null;
          origem?: 'manual' | 'pluggy';
          raw_data?: Record<string, unknown> | null;
        };
        Update: {
          id_transacao?: number;
          id_conta?: number;
          data_transacao?: string;
          tipo?: TipoTransacao;
          categoria?: string;
          descricao?: string;
          valor?: number;
          pluggy_tx_id?: string | null;
          origem?: 'manual' | 'pluggy';
          raw_data?: Record<string, unknown> | null;
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
      pluggy_connections: {
        Row: {
          id: number;
          id_usuario: number;
          pluggy_item_id: string;
          connector_id: number | null;
          institution_name: string | null;
          status: string | null;
          execution_status: string | null;
          last_updated_at: string | null;
          error_code: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          id_usuario: number;
          pluggy_item_id: string;
          connector_id?: number | null;
          institution_name?: string | null;
          status?: string | null;
          execution_status?: string | null;
          last_updated_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          id_usuario?: number;
          pluggy_item_id?: string;
          connector_id?: number | null;
          institution_name?: string | null;
          status?: string | null;
          execution_status?: string | null;
          last_updated_at?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      pluggy_webhook_events: {
        Row: {
          id: number;
          event_id: string | null;
          event_type: string;
          pluggy_item_id: string | null;
          payload: Record<string, unknown>;
          processed: boolean;
          processed_at: string | null;
          error: string | null;
          received_at: string;
        };
        Insert: {
          id?: number;
          event_id?: string | null;
          event_type: string;
          pluggy_item_id?: string | null;
          payload: Record<string, unknown>;
          processed?: boolean;
          processed_at?: string | null;
          error?: string | null;
          received_at?: string;
        };
        Update: {
          id?: number;
          event_id?: string | null;
          event_type?: string;
          pluggy_item_id?: string | null;
          payload?: Record<string, unknown>;
          processed?: boolean;
          processed_at?: string | null;
          error?: string | null;
          received_at?: string;
        };
        Relationships: [];
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
