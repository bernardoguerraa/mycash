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
} as const;

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
