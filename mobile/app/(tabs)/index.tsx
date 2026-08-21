import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MyCash, formatCurrency, formatDate, getGreeting } from '@/constants/mycash';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

type Transacao = {
  id_transacao: number;
  descricao: string | null;
  valor: number | null;
  tipo: string | null;
  data_transacao: string;
  categoria: string | null;
};

type Resumo = {
  saldoTotal: number;
  entradas: number;
  saidas: number;
  metasAtivas: number;
  recentes: Transacao[];
};

const VAZIO: Resumo = {
  saldoTotal: 0,
  entradas: 0,
  saidas: 0,
  metasAtivas: 0,
  recentes: [],
};

/**
 * Mesmas queries do dashboard web (src/app/(dashboard)/dashboard/page.tsx),
 * so que direto do app. A RLS filtra por usuario no banco — nao ha
 * `.eq('id_usuario', ...)` aqui de proposito.
 */
async function carregarResumo(): Promise<Resumo> {
  const agora = new Date();
  const primeiroDia = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString();
  const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).toISOString();

  const [contas, doMes, metas, recentes] = await Promise.all([
    supabase.from('contas_bancarias').select('saldo_atual'),
    supabase
      .from('transacoes')
      .select('valor, tipo')
      .gte('data_transacao', primeiroDia)
      .lte('data_transacao', ultimoDia),
    supabase
      .from('metas_financeiras')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'EmAndamento'),
    supabase
      .from('transacoes')
      .select('id_transacao, descricao, valor, tipo, data_transacao, categoria')
      .order('data_transacao', { ascending: false })
      .limit(5),
  ]);

  const saldoTotal = (contas.data ?? []).reduce((s, c) => s + (c.saldo_atual || 0), 0);

  const entradas = (doMes.data ?? [])
    .filter((t) => t.tipo === 'Entrada')
    .reduce((s, t) => s + (t.valor || 0), 0);

  const saidas = (doMes.data ?? [])
    .filter((t) => t.tipo === 'Saida')
    .reduce((s, t) => s + Math.abs(t.valor || 0), 0);

  return {
    saldoTotal,
    entradas,
    saidas,
    metasAtivas: metas.count ?? 0,
    recentes: (recentes.data as Transacao[]) ?? [],
  };
}

export default function DashboardScreen() {
  const { session } = useAuth();
  const [resumo, setResumo] = useState<Resumo>(VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const buscar = useCallback(async () => {
    try {
      setErro(null);
      setResumo(await carregarResumo());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao carregar os dados.');
    }
  }, []);

  useEffect(() => {
    buscar().finally(() => setCarregando(false));
  }, [buscar]);

  const aoPuxar = useCallback(async () => {
    setAtualizando(true);
    await buscar();
    setAtualizando(false);
  }, [buscar]);

  const nome =
    (session?.user.user_metadata?.full_name as string | undefined) ||
    (session?.user.user_metadata?.name as string | undefined) ||
    session?.user.email?.split('@')[0] ||
    'Usuário';

  if (carregando) {
    return (
      <SafeAreaView style={[styles.safe, styles.centro]}>
        <ActivityIndicator color={MyCash.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={aoPuxar}
            tintColor={MyCash.accent}
          />
        }>
        <View style={styles.cabecalho}>
          <Text style={styles.saudacao}>{getGreeting()},</Text>
          <Text style={styles.nome}>{nome}</Text>
        </View>

        {erro && (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
          </View>
        )}

        <View style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>Saldo consolidado</Text>
          <Text style={styles.saldoValor}>{formatCurrency(resumo.saldoTotal)}</Text>
        </View>

        <View style={styles.linha}>
          <View style={[styles.statCard, styles.flex1]}>
            <Text style={styles.statLabel}>Entradas do mês</Text>
            <Text style={[styles.statValor, { color: MyCash.accentLight }]}>
              {formatCurrency(resumo.entradas)}
            </Text>
          </View>
          <View style={[styles.statCard, styles.flex1]}>
            <Text style={styles.statLabel}>Saídas do mês</Text>
            <Text style={[styles.statValor, { color: MyCash.danger }]}>
              {formatCurrency(resumo.saidas)}
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Metas em andamento</Text>
          <Text style={styles.statValor}>{resumo.metasAtivas}</Text>
        </View>

        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Transações recentes</Text>

          {resumo.recentes.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>Nenhuma transação por aqui ainda.</Text>
            </View>
          ) : (
            <View style={styles.lista}>
              {resumo.recentes.map((t) => {
                const entrada = t.tipo === 'Entrada';
                return (
                  <View key={t.id_transacao} style={styles.item}>
                    <View
                      style={[
                        styles.itemIcone,
                        { backgroundColor: entrada ? MyCash.accentMuted : MyCash.dangerMuted },
                      ]}>
                      <Text
                        style={{
                          color: entrada ? MyCash.accentLight : MyCash.danger,
                          fontWeight: '700',
                        }}>
                        {entrada ? '↓' : '↑'}
                      </Text>
                    </View>

                    <View style={styles.flex1}>
                      <Text style={styles.itemTitulo} numberOfLines={1}>
                        {t.descricao || 'Sem descrição'}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {t.categoria || 'Sem categoria'} · {formatDate(t.data_transacao)}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.itemValor,
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
        </View>

        <Pressable
          style={({ pressed }) => [styles.sair, pressed && { opacity: 0.6 }]}
          onPress={() => supabase.auth.signOut()}>
          <Text style={styles.sairTexto}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: MyCash.surface0 },
  centro: { justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  flex1: { flex: 1 },

  cabecalho: { marginBottom: 2 },
  saudacao: { fontSize: 15, color: MyCash.textDim },
  nome: { fontSize: 26, fontWeight: '700', color: MyCash.text, letterSpacing: -0.4 },

  erroBox: {
    backgroundColor: MyCash.dangerMuted,
    borderWidth: 1,
    borderColor: MyCash.danger,
    borderRadius: 10,
    padding: 12,
  },
  erroTexto: { color: MyCash.danger, fontSize: 13 },

  saldoCard: {
    backgroundColor: MyCash.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  saldoLabel: { fontSize: 13, color: MyCash.accentLight, fontWeight: '600' },
  saldoValor: { fontSize: 32, fontWeight: '700', color: MyCash.text, letterSpacing: -1 },

  linha: { flexDirection: 'row', gap: 12 },
  statCard: {
    backgroundColor: MyCash.surface2,
    borderWidth: 1,
    borderColor: MyCash.edge1,
    borderRadius: 14,
    padding: 16,
    gap: 5,
  },
  statLabel: { fontSize: 12.5, color: MyCash.textDim },
  statValor: { fontSize: 19, fontWeight: '700', color: MyCash.text },

  secao: { gap: 10, marginTop: 6 },
  secaoTitulo: { fontSize: 16, fontWeight: '600', color: MyCash.text },

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
  itemIcone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemTitulo: { fontSize: 14.5, color: MyCash.text, fontWeight: '600' },
  itemMeta: { fontSize: 12, color: MyCash.textMute, marginTop: 2 },
  itemValor: { fontSize: 14.5, fontWeight: '700' },

  vazio: {
    backgroundColor: MyCash.surface2,
    borderWidth: 1,
    borderColor: MyCash.edge1,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  vazioTexto: { color: MyCash.textMute, fontSize: 13.5 },

  sair: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  sairTexto: { color: MyCash.textMute, fontSize: 14, fontWeight: '600' },
});
