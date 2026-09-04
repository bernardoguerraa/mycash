import { ValorInvalidoError } from './erros'

/**
 * Leitura e normalizacao de valores monetarios.
 *
 * Funcao pura: mesma entrada, mesma saida, sem I/O e sem relogio. E o tipo de
 * unidade que a Aula 01 chama de f : X -> Y — o caso mais barato de testar e o
 * que mais protege, porque erro aqui contamina saldo, grafico e relatorio.
 */

/**
 * Le o que o usuario digitou. Aceita "1.234,56" (pt-BR) e "1234.56" (teclado
 * numerico do iOS), porque os dois aparecem na pratica no mesmo aplicativo.
 *
 * Retorna NaN em vez de lancar: quem chama decide se campo vazio e erro ou
 * apenas "ainda nao preenchido". Validar aqui obrigaria a tela a usar
 * try/catch a cada tecla digitada.
 */
export function parseValor(entrada: string): number {
  if (typeof entrada !== 'string') return NaN

  const limpo = entrada.trim().replace(/\s/g, '')
  if (!limpo) return NaN

  // Com virgula presente, ela e o separador decimal e o ponto e milhar
  // ("1.234,56"). Sem virgula, o ponto e o proprio decimal ("1234.56").
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo

  const numero = Number(normalizado)
  return Number.isFinite(numero) ? numero : NaN
}

/**
 * Arredonda para centavos.
 *
 * Somar float acumula residuo binario (0.1 + 0.2 = 0.30000000000000004), e
 * saldo com catorze casas decimais vaza para a tela e para o banco.
 */
export function emCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

/**
 * Garante valor monetario estritamente positivo.
 *
 * O sinal do lancamento vem do campo `tipo` (Entrada/Saida), nunca do sinal do
 * numero — permitir valor negativo criaria duas representacoes para a mesma
 * coisa (uma saida de 50 e uma entrada de -50) e o saldo passaria a depender
 * de qual delas foi gravada.
 */
export function exigirValorPositivo(valor: number, campo = 'valor'): number {
  if (!Number.isFinite(valor) || valor <= 0) {
    throw new ValorInvalidoError(`O ${campo} precisa ser um numero maior que zero.`)
  }
  return valor
}
