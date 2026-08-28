import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Carrega um recurso da API e cuida dos tres estados que toda tela repete:
 * primeira carga, pull-to-refresh e erro.
 *
 * Recarrega sempre que a tela ganha foco. Isso importa no app inteiro: criar
 * uma transacao na aba Transacoes precisa mudar o saldo na aba Inicio sem o
 * usuario fazer nada.
 *
 * `carregar` pode mudar entre renders — a versao mais recente fica numa ref,
 * entao `recarregar` continua estavel enquanto sempre chama a busca atual.
 * E o que permite uma tela filtrar no servidor (periodo, tipo) sem precisar
 * remontar o hook a cada tecla.
 */
export function useRecurso<T>(carregar: () => Promise<T>, inicial: T) {
  const [dados, setDados] = useState<T>(inicial);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregarRef = useRef(carregar);
  carregarRef.current = carregar;

  const buscar = useCallback(async () => {
    try {
      setErro(null);
      setDados(await carregarRef.current());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar os dados.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      buscar().finally(() => {
        if (ativo) setCarregando(false);
      });
      return () => {
        ativo = false;
      };
    }, [buscar])
  );

  /** Pull-to-refresh: mesma busca, spinner diferente. */
  const aoPuxar = useCallback(async () => {
    setAtualizando(true);
    await buscar();
    setAtualizando(false);
  }, [buscar]);

  return { dados, setDados, carregando, atualizando, erro, setErro, recarregar: buscar, aoPuxar };
}
