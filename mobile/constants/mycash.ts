/**
 * Tokens visuais do MyCash, espelhando o web.
 * Fonte: tailwind.config.ts (accent) e src/app/globals.css (surfaces/edges).
 */

export const MyCash = {
  // superficies (tema escuro, que e o padrao do web)
  surface0: '#09090b',
  surface1: '#0c0d10',
  surface2: '#111318',
  surface3: '#16181d',
  surface4: '#1c1f26',

  edge1: 'rgba(255,255,255,0.06)',
  edge2: 'rgba(255,255,255,0.09)',
  edge3: 'rgba(255,255,255,0.12)',

  text: '#f4f4f5',
  textDim: '#a1a1aa',
  textMute: '#71717a',

  accent: '#10b981',
  accentLight: '#34d399',
  accentDark: '#059669',
  accentMuted: 'rgba(16,185,129,0.12)',

  danger: '#f43f5e',
  dangerMuted: 'rgba(244,63,94,0.12)',

  warn: '#f59e0b',
  warnMuted: 'rgba(245,158,11,0.10)',

  info: '#60a5fa',
  infoMuted: 'rgba(96,165,250,0.10)',

  roxo: '#c084fc',
  roxoMuted: 'rgba(192,132,252,0.10)',
} as const;

// ============================================================================
// Formatacao
// ============================================================================

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

/** "12 ago" — usado nas listas. */
export const formatDate = (dateStr: string) =>
  paraData(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/** "12 ago 2026" — usado nos cartoes de meta e lembrete. */
export const formatDateLong = (dateStr: string) =>
  paraData(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

/**
 * Datas que chegam como "YYYY-MM-DD" viram meia-noite UTC no construtor do
 * JS, o que no Brasil joga o dia para tras. Ancorar no horario local resolve.
 */
function paraData(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(`${dateStr}T00:00:00`);
  return new Date(dateStr);
}

/** "ha 3 horas", "ha 2 dias" — substitui o date-fns que o web usa. */
export function formatarTempoRelativo(dateStr: string): string {
  const segundos = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

  if (segundos < 60) return 'agora mesmo';

  const faixas: [number, string, string][] = [
    [60, 'minuto', 'minutos'],
    [3600, 'hora', 'horas'],
    [86400, 'dia', 'dias'],
    [604800, 'semana', 'semanas'],
    [2592000, 'mês', 'meses'],
    [31536000, 'ano', 'anos'],
  ];

  let escolhida = faixas[0];
  for (const faixa of faixas) {
    if (segundos >= faixa[0]) escolhida = faixa;
  }

  const quantidade = Math.floor(segundos / escolhida[0]);
  return `há ${quantidade} ${quantidade === 1 ? escolhida[1] : escolhida[2]}`;
}

/** Hoje no formato YYYY-MM-DD, que e o que a API espera nas datas. */
export const hojeISO = () => {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
};

// ============================================================================
// Entrada de numeros e datas
// ============================================================================

/**
 * Le o que o usuario digitou como valor. Aceita "1.234,56" e "1234.56",
 * porque o teclado numerico do Android e do iOS discordam do separador.
 */
export function parseValor(entrada: string): number {
  if (!entrada) return NaN;
  const limpo = entrada.trim().replace(/\s/g, '');
  // Se tem virgula, ela e o separador decimal e o ponto e milhar.
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  return parseFloat(normalizado);
}

/** Mantem no campo so o que pode compor um numero. */
export const sanitizarValor = (bruto: string) => bruto.replace(/[^0-9.,-]/g, '');

/**
 * Formata a data enquanto se digita: so os digitos importam e os hifens
 * entram sozinhos. Sem isso o usuario teria que acertar "2026-09-15" na
 * unha, e no Android o teclado numerico nem mostra o hifen.
 */
export function sanitizarData(bruto: string): string {
  const digitos = bruto.replace(/\D/g, '').slice(0, 8);
  if (digitos.length <= 4) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 4)}-${digitos.slice(4)}`;
  return `${digitos.slice(0, 4)}-${digitos.slice(4, 6)}-${digitos.slice(6)}`;
}

/** Valida o formato YYYY-MM-DD e se a data existe de fato. */
export function dataValida(entrada: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entrada)) return false;
  const data = new Date(`${entrada}T00:00:00`);
  if (Number.isNaN(data.getTime())) return false;
  // Rejeita 2026-02-31, que o construtor silenciosamente vira 03/03.
  return String(data.getDate()).padStart(2, '0') === entrada.slice(8, 10);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ============================================================================
// Listas de dominio — as mesmas do web
// ============================================================================

/** Fonte: src/components/transacoes/TransacaoModal.tsx */
export const CATEGORIAS = [
  'Alimentacao',
  'Transporte',
  'Moradia',
  'Saude',
  'Educacao',
  'Lazer',
  'Salario',
  'Freelance',
  'Investimento',
  'Outros',
];

/** Fonte: src/components/contas/ContaModal.tsx */
export const TIPOS_CONTA: { value: string; label: string }[] = [
  { value: 'Corrente', label: 'Corrente' },
  { value: 'Poupanca', label: 'Poupança' },
  { value: 'Investimento', label: 'Investimento' },
  { value: 'Carteira Digital', label: 'Carteira Digital' },
];

/**
 * Os valores acima e os de CATEGORIAS vao sem acento de proposito: e assim
 * que estao gravados no banco desde o web, e mexer nisso quebraria os
 * registros existentes. O acento entra so na hora de mostrar.
 */
const ROTULOS_CATEGORIA: Record<string, string> = {
  Alimentacao: 'Alimentação',
  Saude: 'Saúde',
  Educacao: 'Educação',
  Salario: 'Salário',
};

const ROTULOS_TIPO_CONTA: Record<string, string> = {
  Poupanca: 'Poupança',
};

/** Nome de exibicao da categoria; categorias livres passam intactas. */
export const rotuloCategoria = (valor: string) => ROTULOS_CATEGORIA[valor] ?? valor;

/** Nome de exibicao do tipo de conta. */
export const rotuloTipoConta = (valor: string) => ROTULOS_TIPO_CONTA[valor] ?? valor;
