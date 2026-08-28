import { PALETA_CLARA, PALETA_ESCURA, type Cores } from '@/constants/mycash';
import { useTema } from './tema';

/**
 * Transforma uma fabrica de estilos num hook que devolve a versao do tema
 * em vigor.
 *
 *   const useProprios = criarUseEstilos((c) => StyleSheet.create({ ... }));
 *   // dentro do componente:
 *   const proprios = useProprios();
 *
 * As duas paletas sao montadas uma vez, no import do modulo, e depois o hook
 * so escolhe entre elas. Sao dois temas fixos, entao nao ha motivo para
 * recriar StyleSheet a cada render nem para carregar useMemo em toda tela.
 */
export function criarUseEstilos<T>(fabrica: (cores: Cores) => T) {
  const prontos = {
    escuro: fabrica(PALETA_ESCURA),
    claro: fabrica(PALETA_CLARA),
  };

  return function useEstilosDoTema(): T {
    const { escuro } = useTema();
    return escuro ? prontos.escuro : prontos.claro;
  };
}
