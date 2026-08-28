import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GraficoMensal } from '@/components/ui/grafico-mensal';
import {
  Aviso,
  BotaoNotificacoes,
  BotaoTema,
  Carregando,
  Cartao,
  CartaoEstatistica,
  EstadoVazio,
  Tela,
  useEstilos,
} from '@/components/ui/kit';
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  getGreeting,
  rotuloCategoria,
} from '@/constants/mycash';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { useAuth } from '@/lib/auth';
import { dashboardRepository } from '@/lib/repositories';
import type { ResumoDashboard } from '@/types/database';

const VAZIO: ResumoDashboard = {
  nome: '',
  saldoTotal: 0,
  entradas: 0,
  saidas: 0,
  saldoMes: 0,
  metasAtivas: 0,
  serieMensal: [],
  recentes: [],
  proximosLembretes: [],
};

/**
 * Mesmo painel do dashboard web (src/app/(dashboard)/dashboard/page.tsx).
 *
 * Antes a tela puxava contas, transacoes, metas e lembretes em paralelo e
 * recortava o mes corrente aqui no celular. Agora GET /api/dashboard entrega
 * o resumo pronto: uma requisicao, e a conta feita no Postgres.
 */
const carregar = () => dashboardRepository.resumo();

export default function DashboardScreen() {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores } = useTema();

  const { session } = useAuth();
  const router = useRouter();
  const { dados, carregando, atualizando, erro, aoPuxar } = useRecurso(carregar, VAZIO);

  // O nome cadastrado vem da API. O metadata do Auth e o prefixo do e-mail
  // ficam so como rede de seguranca para contas antigas sem nome.
  const nome =
    dados.nome ||
    (session?.user.user_metadata?.full_name as string | undefined) ||
    (session?.user.user_metadata?.name as string | undefined) ||
    session?.user.email?.split('@')[0] ||
    'Usuário';

  if (carregando) return <Carregando />;

  // Campos de lista chegam com `?? []`: se a API estiver numa versao mais
  // antiga que o app (deploy no meio do caminho), a tela mostra menos, mas
  // nao quebra em `.length` de undefined.
  const serie = dados.serieMensal ?? [];
  const recentes = dados.recentes ?? [];
  const lembretes = dados.proximosLembretes ?? [];

  const saldoNegativo = dados.saldoTotal < 0;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <View style={proprios.topo}>
        <View style={ui.flex1}>
          <Text style={proprios.saudacao}>{getGreeting()},</Text>
          {/* Nome completo cabe em duas linhas; cortar em uma deixava
              "Matheus Lucas Tavares Bu...". */}
          <Text style={proprios.nome} numberOfLines={2}>
            {nome}
          </Text>
        </View>
        <BotaoNotificacoes />
        <BotaoTema />
      </View>

      {erro ? <Aviso texto={erro} /> : null}

      <View
        style={[
          proprios.saldoCartao,
          saldoNegativo && { backgroundColor: cores.dangerMuted, borderColor: cores.danger },
        ]}>
        <Text style={[proprios.saldoRotulo, saldoNegativo && { color: cores.danger }]}>
          Saldo consolidado
        </Text>
        <Text style={proprios.saldoValor}>{formatCurrency(dados.saldoTotal)}</Text>
      </View>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Entradas do mês"
          valor={formatCurrency(dados.entradas)}
          icone="arrow-down-circle-outline"
          cor={cores.accentLight}
        />
        <CartaoEstatistica
          rotulo="Saídas do mês"
          valor={formatCurrency(dados.saidas)}
          icone="arrow-up-circle-outline"
          cor={cores.danger}
        />
      </View>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Metas em andamento"
          valor={String(dados.metasAtivas)}
          icone="flag-outline"
          cor={cores.info}
        />
        <CartaoEstatistica
          rotulo="Saldo do mês"
          valor={formatCurrency(dados.saldoMes)}
          icone="trending-up-outline"
          cor={dados.saldoMes >= 0 ? cores.accentLight : cores.danger}
        />
      </View>

      {serie.length > 0 ? <GraficoMensal serie={serie} /> : null}

      <Secao
        titulo="Transações recentes"
        acao="Ver todas"
        aoTocarAcao={() => router.push('/(tabs)/transacoes')}
      />

      {recentes.length === 0 ? (
        <EstadoVazio
          icone="receipt-outline"
          titulo="Nenhuma transação por aqui ainda"
          descricao="Cadastre a primeira na aba Transações."
        />
      ) : (
        <View style={proprios.lista}>
          {recentes.map((t) => {
            const entrada = t.tipo === 'Entrada';
            return (
              <View key={t.id_transacao} style={proprios.item}>
                <View
                  style={[
                    proprios.itemIcone,
                    { backgroundColor: entrada ? cores.accentMuted : cores.dangerMuted },
                  ]}>
                  <Ionicons
                    name={entrada ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={entrada ? cores.accentLight : cores.danger}
                  />
                </View>

                <View style={ui.flex1}>
                  <Text style={proprios.itemTitulo} numberOfLines={1}>
                    {t.descricao || 'Sem descrição'}
                  </Text>
                  <Text style={proprios.itemMeta}>
                    {t.categoria ? rotuloCategoria(t.categoria) : 'Sem categoria'} ·{' '}
                    {formatDate(t.data_transacao)}
                  </Text>
                </View>

                <Text
                  style={[
                    proprios.itemValor,
                    { color: entrada ? cores.accentLight : cores.danger },
                  ]}>
                  {entrada ? '+' : '−'}
                  {formatCurrency(Math.abs(t.valor || 0))}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Secao
        titulo="Próximos lembretes"
        acao="Ver todos"
        aoTocarAcao={() => router.push('/(tabs)/lembretes')}
      />

      {lembretes.length === 0 ? (
        <EstadoVazio
          icone="notifications-outline"
          titulo="Nenhum lembrete ativo"
          descricao="Contas a pagar e a receber aparecem aqui."
        />
      ) : (
        <View style={proprios.lista}>
          {lembretes.map((l) => {
            const receber = l.tipo === 'ContaReceber';
            return (
              <Cartao key={l.id_lembrete} style={proprios.lembreteCartao}>
                <View style={ui.flex1}>
                  <Text style={proprios.itemTitulo} numberOfLines={1}>
                    {l.descricao}
                  </Text>
                  <Text style={proprios.itemMeta}>
                    Vence em {formatDateLong(l.data_vencimento)}
                  </Text>
                </View>
                <Text
                  style={[
                    proprios.itemValor,
                    { color: receber ? cores.accentLight : cores.warn },
                  ]}>
                  {formatCurrency(l.valor_previsto)}
                </Text>
              </Cartao>
            );
          })}
        </View>
      )}
    </Tela>
  );
}

function Secao({
  titulo,
  acao,
  aoTocarAcao,
}: {
  titulo: string;
  acao?: string;
  aoTocarAcao?: () => void;
}) {
  const proprios = useProprios();

  return (
    <View style={proprios.secao}>
      <Text style={proprios.secaoTitulo}>{titulo}</Text>
      {acao ? (
        <Pressable onPress={aoTocarAcao} hitSlop={8}>
          <Text style={proprios.secaoAcao}>{acao}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  topo: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  saudacao: { fontSize: 15, color: c.textDim },
  nome: { fontSize: 24, fontWeight: '700', color: c.text, letterSpacing: -0.4, lineHeight: 29 },

  saldoCartao: {
    backgroundColor: c.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  saldoRotulo: { fontSize: 13, color: c.accentLight, fontWeight: '600' },
  saldoValor: { fontSize: 31, fontWeight: '700', color: c.text, letterSpacing: -1 },

  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  secaoTitulo: { fontSize: 16, fontWeight: '600', color: c.text },
  secaoAcao: { fontSize: 13, fontWeight: '600', color: c.accentLight },

  lista: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.edge1,
    borderRadius: 12,
    padding: 13,
  },
  itemIcone: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitulo: { fontSize: 14.5, color: c.text, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: c.textMute, marginTop: 2 },
  itemValor: { fontSize: 14.5, fontWeight: '700' },

  lembreteCartao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  })
);
