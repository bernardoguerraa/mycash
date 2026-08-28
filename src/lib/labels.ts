/**
 * Nomes de exibicao para valores que ficam sem acento no banco.
 *
 * As categorias e os tipos de conta foram gravados sem acento desde o inicio
 * ("Alimentacao", "Poupanca"). Trocar o valor armazenado quebraria os
 * registros que ja existem e os filtros que comparam string, entao o acento
 * entra so na renderizacao — mesma abordagem do mobile
 * (mobile/constants/mycash.ts).
 */

const CATEGORIAS_ROTULOS: Record<string, string> = {
  Alimentacao: 'Alimentação',
  Saude: 'Saúde',
  Educacao: 'Educação',
  Salario: 'Salário',
}

const TIPOS_CONTA_ROTULOS: Record<string, string> = {
  Poupanca: 'Poupança',
}

/** Categorias livres (digitadas pelo usuario) passam intactas. */
export function rotuloCategoria(valor: string): string {
  return CATEGORIAS_ROTULOS[valor] ?? valor
}

export function rotuloTipoConta(valor: string): string {
  return TIPOS_CONTA_ROTULOS[valor] ?? valor
}
