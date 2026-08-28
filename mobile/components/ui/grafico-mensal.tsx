import { StyleSheet, Text, View } from 'react-native';

import type { Cores } from '@/constants/mycash';
import { formatCurrency } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import type { PontoMensal } from '@/types/database';

/**
 * Entradas x saidas dos ultimos seis meses — equivalente ao MonthlyChart do
 * web (src/components/dashboard/MonthlyChart.tsx).
 *
 * Desenhado com View e altura proporcional, sem biblioteca de grafico: sao
 * doze barras, e uma dependencia nativa a mais so aumentaria o bundle e o
 * risco de quebrar o Expo Go na apresentacao.
 *
 * As barras sao escaladas pelo maior valor da serie, entao um mes com pouco
 * movimento nao vira uma linha invisivel ao lado de um mes cheio.
 */
export function GraficoMensal({ serie }: { serie: PontoMensal[] }) {
  const estilos = useEstilos();
  const { cores } = useTema();

  const teto = Math.max(...serie.map((p) => Math.max(p.entradas, p.saidas)), 0);
  const semMovimento = teto === 0;

  // Altura minima visivel para um mes que teve movimento, mas pouco.
  const altura = (valor: number) => (teto === 0 ? 0 : Math.max((valor / teto) * 100, valor > 0 ? 4 : 0));

  return (
    <View style={estilos.caixa}>
      <View style={estilos.topo}>
        <Text style={estilos.titulo}>Últimos 6 meses</Text>
        <View style={estilos.legenda}>
          <Legenda cor={cores.accent} texto="Entradas" />
          <Legenda cor={cores.danger} texto="Saídas" />
        </View>
      </View>

      {semMovimento ? (
        <Text style={estilos.vazio}>Sem movimentação no período.</Text>
      ) : (
        <>
          <View style={estilos.grafico}>
            {serie.map((ponto) => (
              <View key={`${ponto.mes}-${ponto.ano}`} style={estilos.coluna}>
                <View style={estilos.barras}>
                  <View
                    style={[
                      estilos.barra,
                      { height: `${altura(ponto.entradas)}%`, backgroundColor: cores.accent },
                    ]}
                  />
                  <View
                    style={[
                      estilos.barra,
                      { height: `${altura(ponto.saidas)}%`, backgroundColor: cores.danger },
                    ]}
                  />
                </View>
                <Text style={estilos.mes}>{ponto.mes}</Text>
              </View>
            ))}
          </View>

          <Text style={estilos.escala}>Maior valor do período: {formatCurrency(teto)}</Text>
        </>
      )}
    </View>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  const estilos = useEstilos();

  return (
    <View style={estilos.legendaItem}>
      <View style={[estilos.legendaPonto, { backgroundColor: cor }]} />
      <Text style={estilos.legendaTexto}>{texto}</Text>
    </View>
  );
}

const useEstilos = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
    caixa: {
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.edge1,
      borderRadius: 14,
      padding: 15,
      gap: 14,
    },
    topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    titulo: { fontSize: 14.5, fontWeight: '700', color: c.text },

    legenda: { flexDirection: 'row', gap: 12 },
    legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendaPonto: { width: 7, height: 7, borderRadius: 4 },
    legendaTexto: { fontSize: 11, color: c.textDim },

    grafico: { flexDirection: 'row', height: 116, gap: 6 },
    coluna: { flex: 1, gap: 6 },
    barras: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
    barra: { flex: 1, borderRadius: 3, minHeight: 2 },
    mes: { fontSize: 10.5, color: c.textMute, textAlign: 'center' },

    escala: { fontSize: 11, color: c.textMute },
    vazio: { fontSize: 13, color: c.textMute, paddingVertical: 18, textAlign: 'center' },
  })
);
