import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import { PALETA_CLARA, PALETA_ESCURA, type Cores } from '@/constants/mycash';

/**
 * Tema claro/escuro do app — equivalente ao ThemeToggle do web
 * (src/components/theme/ThemeToggle.tsx).
 *
 * Tres modos, e nao dois: "sistema" acompanha o aparelho, que e o que a
 * maioria das pessoas espera hoje. A escolha fica no AsyncStorage, mesmo
 * lugar da sessao, entao sobrevive a fechar o app.
 */

export type ModoTema = 'sistema' | 'claro' | 'escuro';

type EstadoTema = {
  modo: ModoTema;
  /** Tema em vigor depois de resolver "sistema". */
  escuro: boolean;
  cores: Cores;
  definirModo: (modo: ModoTema) => void;
};

const CHAVE = 'mycash.tema';

const TemaContext = createContext<EstadoTema>({
  modo: 'sistema',
  escuro: true,
  cores: PALETA_ESCURA,
  definirModo: () => {},
});

export function TemaProvider({ children }: { children: ReactNode }) {
  const doSistema = useColorScheme();
  const [modo, setModo] = useState<ModoTema>('sistema');

  // Le a preferencia salva uma vez. Ate ela chegar vale "sistema", que e o
  // padrao — nao vale a pena segurar a tela por causa disso.
  useEffect(() => {
    let ativo = true;
    AsyncStorage.getItem(CHAVE)
      .then((salvo) => {
        if (!ativo) return;
        if (salvo === 'claro' || salvo === 'escuro' || salvo === 'sistema') {
          setModo(salvo);
        }
      })
      .catch(() => {
        // Sem preferencia salva o padrao ja esta certo.
      });
    return () => {
      ativo = false;
    };
  }, []);

  const valor = useMemo<EstadoTema>(() => {
    const escuro = modo === 'sistema' ? doSistema !== 'light' : modo === 'escuro';

    return {
      modo,
      escuro,
      cores: escuro ? PALETA_ESCURA : PALETA_CLARA,
      definirModo: (novo) => {
        setModo(novo);
        AsyncStorage.setItem(CHAVE, novo).catch(() => {
          // Falhar em salvar nao pode impedir a troca na tela.
        });
      },
    };
  }, [modo, doSistema]);

  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>;
}

export const useTema = () => useContext(TemaContext);
