import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { notificacoesRepository } from './repositories';

/**
 * Quantas notificacoes estao por ler.
 *
 * Fica num contexto porque o sino aparece no cabecalho de todas as telas: se
 * cada cabecalho buscasse o proprio numero, trocar de aba dispararia uma
 * requisicao por tela montada, e os contadores divergiriam entre elas.
 */

type EstadoNotificacoes = {
  naoLidas: number;
  atualizar: () => Promise<void>;
};

const NotificacoesContext = createContext<EstadoNotificacoes>({
  naoLidas: 0,
  atualizar: async () => {},
});

export function NotificacoesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);

  const atualizar = useCallback(async () => {
    if (!session) {
      setNaoLidas(0);
      return;
    }
    try {
      const lista = await notificacoesRepository.listar({ lida: false });
      setNaoLidas(lista.length);
    } catch {
      // Um contador que falhou nao pode derrubar a tela em que o sino esta.
    }
  }, [session]);

  useEffect(() => {
    atualizar();
  }, [atualizar]);

  return (
    <NotificacoesContext.Provider value={{ naoLidas, atualizar }}>
      {children}
    </NotificacoesContext.Provider>
  );
}

export const useNotificacoes = () => useContext(NotificacoesContext);
