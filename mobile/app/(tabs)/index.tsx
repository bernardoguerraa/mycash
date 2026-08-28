import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  Carregando,
  Cartao,
  CartaoEstatistica,
  EstadoVazio,
  Tela,
  estilos as ui,
} from '@/components/ui/kit';
import {
  MyCash,
  formatCurrency,
  formatDate,
  formatDateLong,
  getGreeting,
} from '@/constants/mycash';
import { useRecurso } from '@/hooks/use-recurso';
import { useAuth } from '@/lib/auth';
import {
  contasRepository,
  lembretesRepository,
  metasRepository,
  transacoesRepository,
} from '@/lib/repositories';
import type { Lembrete, Transacao } from '@/types/database';

type Resumo = {
  saldoTotal: number;
  entradas: number;
  saidas: number;
  metasAtivas: number;
  recentes: Transacao[];
  proximosLembretes: Lembrete[];
};

const VAZIO: Resumo = {
  saldoTotal: 0,
  entradas: 0,
  saidas: 0,
  metasAtivas: 0,
  recentes: [],
  proximosLembretes: [],
};

/**
 * Mesmo painel do dashboard web (src/app/(dashboard)/dashboard/page.tsx),
 * so que montado a partir da API REST em vez de consultas diretas ao banco.
 *
 * A API nao filtra transacao por intervalo de data, entao o recorte do mes e
 * o corte das cinco mais recentes acontecem aqui — o volume que uma pessoa
 * fisica gera cabe no limite padrao da rota.
 */
async function carregarResumo(): Promise<Resumo> {
  const [contas, transacoes, metasAtivas, lembretes] = await Promise.all([
    contasRepository.listar(),
    transacoesRepository.listar(),
    metasRepository.listar({ status: 'EmAndamento' }),
    lembretesRepository.listar({ ativo: true }),
  ]);

  const agora = new Date();
  const doMes = transacoes.filter((t) => {
    const data = new Date(t.data_transacao);
    return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
  });

  const somar = (lista: Transacao[]) =>
    lista.reduce((total, t) => total + Math.abs(t.valor || 0), 0);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  return {
    saldoTotal: contasRepository.saldoConsolidado(contas),
    entradas: somar(doMes.filter((t) => t.tipo === 'Entrada')),
    saidas: somar(doMes.filter((t) => t.tipo === 'Saida')),
    metasAtivas: metasAtivas.length,
    recentes: transacoes.slice(0, 5),
    proximosLembretes: lembretes
      .filter((l) => new Date(`${l.data_vencimento.slice(0, 10)}T00:00:00`) >= hoje)
      .slice(0, 4),
  };
}

export default function DashboardScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const { dados, carregando, atualizando, erro, aoPuxar } = useRecurso(carregarResumo, VAZIO);

  const nome =
    (session?.user.user_metadata?.full_name as string | undefined) ||
    (session?.user.user_metadata?.name as string | undefined) ||
    session?.user.email?.split('@')[0] ||
    'Usuário';

  if (carregando) return <Carregando />;

  const saldoNegativo = dados.saldoTotal < 0;
  const saldoMes = dados.entradas - dados.saidas;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <View>
        <Text style={proprios.saudacao}>{getGreeting()},</Text>
        <Text style={proprios.nome}>{nome}</Text>
      </View>

      {erro ? <Aviso texto={erro} /> : null}

      <View
        style={[
          proprios.saldoCartao,
          saldoNegativo && { backgroundColor: MyCash.dangerMuted, borderColor: MyCash.danger },
        ]}>
        <Text style={[proprios.saldoRotulo, saldoNegativo && { color: MyCash.danger }]}>
          Saldo consolidado
        </Text>
        <Text style={proprios.saldoValor}>{formatCurrency(dados.saldoTotal)}</Text>
      </View>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Entradas do mês"
          valor={formatCurrency(dados.entradas)}
          icone="arrow-down-circle-outline"
          cor={MyCash.accentLight}
        />
        <CartaoEstatistica
          rotulo="Saídas do mês"
          valor={formatCurrency(dados.saidas)}
          icone="arrow-up-circle-outline"
          cor={MyCash.danger}
        />
      </View>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Metas em andamento"
          valor={String(dados.metasAtivas)}
          icone="flag-outline"
          cor={MyCash.info}
        />
        <CartaoEstatistica
          rotulo="Saldo do mês"
          valor={formatCurrency(saldoMes)}
          icone="trending-up-outline"
          cor={saldoMes >= 0 ? MyCash.accentLight : MyCash.danger}
        />
      </View>

      <Secao
        titulo="Transações recentes"
        acao="Ver todas"
        aoTocarAcao={() => router.push('/(tabs)/transacoes')}
      />

      {dados.recentes.length === 0 ? (
        <EstadoVazio
          icone="receipt-outline"
          titulo="Nenhuma transação por aqui ainda"
          descricao="Cadastre a primeira na aba Transações."
        />
      ) : (
        <View style={proprios.lista}>
          {dados.recentes.map((t) => {
            const entrada = t.tipo === 'Entrada';
            return (
              <View key={t.id_transacao} style={proprios.item}>
                <View
                  style={[
                    proprios.itemIcone,
                    { backgroundColor: entrada ? MyCash.accentMuted : MyCash.dangerMuted },
                  ]}>
                  <Ionicons
                    name={entrada ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={entrada ? MyCash.accentLight : MyCash.danger}
                  />
                </View>

                <View style={ui.flex1}>
                  <Text style={proprios.itemTitulo} numberOfLines={1}>
                    {t.descricao || 'Sem descrição'}
                  </Text>
                  <Text style={proprios.itemMeta}>
                    {t.categoria || 'Sem categoria'} · {formatDate(t.data_transacao)}
                  </Text>
                </View>

                <Text
                  style={[
                    proprios.itemValor,
                    { color: entrada ? MyCash.accentLight : MyCash.danger },
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

      {dados.proximosLembretes.length === 0 ? (
        <EstadoVazio
          icone="notifications-outline"
          titulo="Nenhum lembrete ativo"
          descricao="Contas a pagar e a receber aparecem aqui."
        />
      ) : (
        <View style={proprios.lista}>
          {dados.proximosLembretes.map((l) => {
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
                    { color: receber ? MyCash.accentLight : MyCash.warn },
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

const proprios = StyleSheet.create({
  saudacao: { fontSize: 15, color: MyCash.textDim },
  nome: { fontSize: 26, fontWeight: '700', color: MyCash.text, letterSpacing: -0.4 },

  saldoCartao: {
    backgroundColor: MyCash.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  saldoRotulo: { fontSize: 13, color: MyCash.accentLight, fontWeight: '600' },
  saldoValor: { fontSize: 31, fontWeight: '700', color: MyCash.text, letterSpacing: -1 },

  secao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  secaoTitulo: { fontSize: 16, fontWeight: '600', color: MyCash.text },
  secaoAcao: { fontSize: 13, fontWeight: '600', color: MyCash.accentLight },

  lista: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: MyCash.surface2,
    borderWidth: 1,
    borderColor: MyCash.edge1,
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
  itemTitulo: { fontSize: 14.5, color: MyCash.text, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: MyCash.textMute, marginTop: 2 },
  itemValor: { fontSize: 14.5, fontWeight: '700' },

  lembreteCartao: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
});
