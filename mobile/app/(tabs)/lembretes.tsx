import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import {
  Aviso,
  Botao,
  BotaoIcone,
  Cabecalho,
  Campo,
  CampoData,
  Carregando,
  Cartao,
  CartaoEstatistica,
  EstadoVazio,
  ModalConfirmacao,
  ModalFormulario,
  Seletor,
  Tela,
  useEstilos,
} from '@/components/ui/kit';
import {
  dataValida,
  formatCurrency,
  formatDateLong,
  parseValor,
  sanitizarValor,
} from '@/constants/mycash';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { lembretesRepository, type GrupoVencimento } from '@/lib/repositories';
import type { Lembrete, TipoLembrete } from '@/types/database';

const VAZIO: Lembrete[] = [];

const carregar = () => lembretesRepository.listar();

/** Mesmos grupos e cores do LembretesClient do web. */
type Grupo = {
  chave: GrupoVencimento;
  titulo: string;
  cor: string;
  icone: 'alert-circle' | 'time' | 'calendar';
};

const grupos = (cores: Cores): Grupo[] => [
  { chave: 'vencidos', titulo: 'Vencidos', cor: cores.danger, icone: 'alert-circle' },
  { chave: 'proximos', titulo: 'Próximos (7 dias)', cor: cores.warn, icone: 'time' },
  { chave: 'futuros', titulo: 'Futuros', cor: cores.accentLight, icone: 'calendar' },
];

type Formulario = {
  descricao: string;
  vencimento: string;
  valor: string;
  tipo: TipoLembrete;
  ativo: boolean;
};

export default function LembretesScreen() {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores } = useTema();

  const { dados, carregando, atualizando, erro, aoPuxar, recarregar, setDados } = useRecurso(
    carregar,
    VAZIO
  );

  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoLembrete>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativo' | 'inativo'>('todos');

  const [editando, setEditando] = useState<Lembrete | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<Formulario | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [excluindo, setExcluindo] = useState<Lembrete | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const filtrados = useMemo(
    () =>
      dados.filter((l) => {
        if (filtroTipo !== 'todos' && l.tipo !== filtroTipo) return false;
        if (filtroStatus === 'ativo' && !l.ativo) return false;
        if (filtroStatus === 'inativo' && l.ativo) return false;
        return true;
      }),
    [dados, filtroTipo, filtroStatus]
  );

  const agrupados = useMemo(() => {
    const grupos: Record<GrupoVencimento, Lembrete[]> = {
      vencidos: [],
      proximos: [],
      futuros: [],
    };
    filtrados.forEach((l) => grupos[lembretesRepository.grupoDe(l.data_vencimento)].push(l));
    return grupos;
  }, [filtrados]);

  const resumo = useMemo(() => {
    const ativos = dados.filter((l) => l.ativo);
    const somar = (tipo: TipoLembrete) =>
      ativos.filter((l) => l.tipo === tipo).reduce((t, l) => t + (l.valor_previsto || 0), 0);
    return { pagar: somar('ContaPagar'), receber: somar('ContaReceber') };
  }, [dados]);

  function abrirNovo() {
    setEditando(null);
    setErroForm(null);
    setForm({ descricao: '', vencimento: '', valor: '', tipo: 'ContaPagar', ativo: true });
    setModalAberto(true);
  }

  function abrirEdicao(lembrete: Lembrete) {
    setEditando(lembrete);
    setErroForm(null);
    setForm({
      descricao: lembrete.descricao,
      vencimento: lembrete.data_vencimento.slice(0, 10),
      valor: String(lembrete.valor_previsto.toFixed(2)),
      tipo: lembrete.tipo,
      ativo: lembrete.ativo,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form) return;

    if (!form.descricao.trim()) return setErroForm('Descrição é obrigatória.');
    if (!dataValida(form.vencimento)) return setErroForm('Data de vencimento inválida (AAAA-MM-DD).');

    const valor = parseValor(form.valor);
    if (Number.isNaN(valor) || valor <= 0) return setErroForm('Valor deve ser maior que zero.');

    setErroForm(null);
    setSalvando(true);
    try {
      const campos = {
        descricao: form.descricao,
        dataVencimento: form.vencimento,
        valorPrevisto: valor,
        tipo: form.tipo,
        ativo: form.ativo,
      };

      if (editando) {
        await lembretesRepository.atualizar(editando.id_lembrete, campos);
      } else {
        await lembretesRepository.criar(campos);
      }

      setModalAberto(false);
      await recarregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro ao salvar lembrete.');
    } finally {
      setSalvando(false);
    }
  }

  /**
   * Lazy update, igual ao web: o switch vira na hora e volta atras se a API
   * recusar. Sem isso o toggle fica parado esperando o round-trip.
   */
  async function alternarAtivo(lembrete: Lembrete) {
    const anterior = dados;
    setDados(
      dados.map((l) =>
        l.id_lembrete === lembrete.id_lembrete ? { ...l, ativo: !l.ativo } : l
      )
    );
    try {
      await lembretesRepository.alternarAtivo(lembrete);
    } catch (e) {
      console.warn('Falha ao alternar lembrete — revertendo:', e);
      setDados(anterior);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setConfirmando(true);
    try {
      await lembretesRepository.remover(excluindo.id_lembrete);
      setExcluindo(null);
      await recarregar();
    } catch (e) {
      setExcluindo(null);
      console.warn('Falha ao excluir lembrete:', e);
    } finally {
      setConfirmando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho
        titulo="Lembretes"
        subtitulo="Contas a pagar e a receber."
        acao={<Botao titulo="Novo" icone="add" compacto aoTocar={abrirNovo} />}
      />

      {erro ? <Aviso texto={erro} /> : null}

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="A pagar (ativos)"
          valor={formatCurrency(resumo.pagar)}
          icone="arrow-up-circle-outline"
          cor={cores.warn}
        />
        <CartaoEstatistica
          rotulo="A receber (ativos)"
          valor={formatCurrency(resumo.receber)}
          icone="arrow-down-circle-outline"
          cor={cores.accentLight}
        />
      </View>

      <Seletor
        opcoes={[
          { value: 'todos', label: 'Todos' },
          { value: 'ContaPagar', label: 'A pagar' },
          { value: 'ContaReceber', label: 'A receber' },
        ]}
        valor={filtroTipo}
        aoEscolher={setFiltroTipo}
      />

      <Seletor
        opcoes={[
          { value: 'todos', label: 'Ativos e inativos' },
          { value: 'ativo', label: 'Só ativos' },
          { value: 'inativo', label: 'Só inativos' },
        ]}
        valor={filtroStatus}
        aoEscolher={setFiltroStatus}
      />

      {filtrados.length === 0 ? (
        <EstadoVazio
          icone="notifications-outline"
          titulo={dados.length ? 'Nenhum lembrete nesse filtro' : 'Nenhum lembrete ainda'}
          descricao={dados.length ? 'Troque os filtros acima.' : 'Toque em Novo para criar o primeiro.'}
        />
      ) : (
        grupos(cores).map((grupo) => {
          const itens = agrupados[grupo.chave];
          if (itens.length === 0) return null;

          return (
            <View key={grupo.chave} style={proprios.grupo}>
              <View style={proprios.grupoTopo}>
                <Ionicons name={grupo.icone} size={16} color={grupo.cor} />
                <Text style={[proprios.grupoTitulo, { color: grupo.cor }]}>{grupo.titulo}</Text>
                <Text style={proprios.grupoContador}>{itens.length}</Text>
              </View>

              {itens.map((l) => {
                const receber = l.tipo === 'ContaReceber';
                return (
                  <Cartao key={l.id_lembrete} style={!l.ativo && proprios.inativo}>
                    <View style={proprios.topo}>
                      <View
                        style={[
                          proprios.icone,
                          {
                            backgroundColor: receber ? cores.accentMuted : cores.warnMuted,
                          },
                        ]}>
                        <Ionicons
                          name={receber ? 'arrow-down' : 'arrow-up'}
                          size={16}
                          color={receber ? cores.accentLight : cores.warn}
                        />
                      </View>

                      <View style={ui.flex1}>
                        <Text style={proprios.descricao} numberOfLines={1}>
                          {l.descricao}
                        </Text>
                        <Text style={proprios.vencimento}>
                          {receber ? 'Receber' : 'Pagar'} em {formatDateLong(l.data_vencimento)}
                        </Text>
                      </View>

                      <Text
                        style={[
                          proprios.valor,
                          { color: receber ? cores.accentLight : cores.warn },
                        ]}>
                        {formatCurrency(l.valor_previsto)}
                      </Text>
                    </View>

                    <View style={proprios.rodape}>
                      <View style={proprios.switchLinha}>
                        <Switch
                          value={l.ativo}
                          onValueChange={() => alternarAtivo(l)}
                          trackColor={{ false: cores.surface4, true: cores.accentDark }}
                          thumbColor={l.ativo ? cores.accentLight : cores.textMute}
                        />
                        <Text style={proprios.switchTexto}>{l.ativo ? 'Ativo' : 'Inativo'}</Text>
                      </View>

                      <View style={proprios.acoes}>
                        <BotaoIcone icone="pencil" aoTocar={() => abrirEdicao(l)} />
                        <BotaoIcone
                          icone="trash-outline"
                          cor={cores.danger}
                          aoTocar={() => setExcluindo(l)}
                        />
                      </View>
                    </View>
                  </Cartao>
                );
              })}
            </View>
          );
        })
      )}

      {form ? (
        <ModalFormulario
          visivel={modalAberto}
          titulo={editando ? 'Editar lembrete' : 'Novo lembrete'}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={salvar}
          salvando={salvando}
          erro={erroForm}>
          <Campo
            rotulo="Descrição"
            value={form.descricao}
            onChangeText={(descricao) => setForm({ ...form, descricao })}
            placeholder="Conta de luz"
          />

          <Seletor
            rotulo="Tipo"
            opcoes={[
              { value: 'ContaPagar', label: 'A pagar' },
              { value: 'ContaReceber', label: 'A receber' },
            ]}
            valor={form.tipo}
            aoEscolher={(tipo) => setForm({ ...form, tipo })}
          />

          <Campo
            rotulo="Valor previsto (R$)"
            value={form.valor}
            onChangeText={(valor) => setForm({ ...form, valor: sanitizarValor(valor) })}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />

          <CampoData
            rotulo="Data de vencimento"
            valor={form.vencimento}
            aoMudar={(vencimento) => setForm({ ...form, vencimento })}
          />

          <View style={proprios.switchCampo}>
            <Text style={ui.rotulo}>Lembrete ativo</Text>
            <Switch
              value={form.ativo}
              onValueChange={(ativo) => setForm({ ...form, ativo })}
              trackColor={{ false: cores.surface4, true: cores.accentDark }}
              thumbColor={form.ativo ? cores.accentLight : cores.textMute}
            />
          </View>
        </ModalFormulario>
      ) : null}

      <ModalConfirmacao
        visivel={excluindo !== null}
        titulo="Excluir lembrete"
        mensagem={`"${excluindo?.descricao ?? ''}" será removido permanentemente.`}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
        confirmando={confirmando}
      />
    </Tela>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  grupo: { gap: 8 },
  grupoTopo: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  grupoTitulo: { fontSize: 14, fontWeight: '700', flex: 1 },
  grupoContador: { fontSize: 12, color: c.textMute, fontWeight: '600' },

  inativo: { opacity: 0.55 },

  topo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icone: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  descricao: { fontSize: 14.5, fontWeight: '600', color: c.text },
  vencimento: { fontSize: 12, color: c.textMute, marginTop: 2 },
  valor: { fontSize: 14.5, fontWeight: '700' },

  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: c.edge1,
    paddingTop: 9,
    marginTop: 2,
  },
  switchLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchTexto: { fontSize: 12.5, color: c.textDim },
  acoes: { flexDirection: 'row', gap: 6 },

  switchCampo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  })
);
