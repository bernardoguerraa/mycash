import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  BarraProgresso,
  Botao,
  BotaoIcone,
  Cabecalho,
  Campo,
  CampoData,
  Carregando,
  Cartao,
  CartaoEstatistica,
  EstadoVazio,
  Etiqueta,
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
  hojeISO,
  parseValor,
  sanitizarValor,
} from '@/constants/mycash';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { metasRepository } from '@/lib/repositories';
import type { Meta, StatusMeta } from '@/types/database';

const VAZIO: Meta[] = [];

const carregar = () => metasRepository.listar();

/** Mesmas cores de status do MetasClient do web. */
function aparenciaStatus(status: StatusMeta, cores: Cores) {
  switch (status) {
    case 'Concluida':
      return { label: 'Concluída', cor: cores.accentLight, fundo: cores.accentMuted };
    case 'Cancelada':
      return { label: 'Cancelada', cor: cores.danger, fundo: cores.dangerMuted };
    default:
      return { label: 'Em andamento', cor: cores.warn, fundo: cores.warnMuted };
  }
}

type Formulario = {
  titulo: string;
  objetivo: string;
  atual: string;
  inicio: string;
  limite: string;
  status: StatusMeta;
};

export default function MetasScreen() {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores } = useTema();

  const { dados, carregando, atualizando, erro, aoPuxar, recarregar } = useRecurso(carregar, VAZIO);

  const [filtro, setFiltro] = useState<'Todas' | StatusMeta>('Todas');

  const [editando, setEditando] = useState<Meta | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<Formulario | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [aportando, setAportando] = useState<Meta | null>(null);
  const [valorAporte, setValorAporte] = useState('');
  const [erroAporte, setErroAporte] = useState<string | null>(null);
  const [salvandoAporte, setSalvandoAporte] = useState(false);

  const [excluindo, setExcluindo] = useState<Meta | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const filtradas = useMemo(
    () => (filtro === 'Todas' ? dados : dados.filter((m) => m.status === filtro)),
    [dados, filtro]
  );

  const stats = useMemo(
    () => ({
      emAndamento: dados.filter((m) => m.status === 'EmAndamento').length,
      concluidas: dados.filter((m) => m.status === 'Concluida').length,
      investido: dados.reduce((total, m) => total + (m.valor_atual || 0), 0),
    }),
    [dados]
  );

  function abrirNova() {
    setEditando(null);
    setErroForm(null);
    setForm({
      titulo: '',
      objetivo: '',
      atual: '0,00',
      inicio: hojeISO(),
      limite: '',
      status: 'EmAndamento',
    });
    setModalAberto(true);
  }

  function abrirEdicao(meta: Meta) {
    setEditando(meta);
    setErroForm(null);
    setForm({
      titulo: meta.titulo,
      objetivo: String(meta.valor_objetivo.toFixed(2)),
      atual: String(meta.valor_atual.toFixed(2)),
      inicio: meta.data_inicio.slice(0, 10),
      limite: meta.data_limite.slice(0, 10),
      status: meta.status,
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form) return;

    if (!form.titulo.trim()) return setErroForm('Título é obrigatório.');

    const objetivo = parseValor(form.objetivo);
    if (Number.isNaN(objetivo) || objetivo <= 0) {
      return setErroForm('Valor objetivo deve ser maior que zero.');
    }

    const atual = parseValor(form.atual || '0');
    if (Number.isNaN(atual) || atual < 0) return setErroForm('Valor atual inválido.');

    if (!dataValida(form.inicio)) return setErroForm('Data de início inválida (AAAA-MM-DD).');
    if (!dataValida(form.limite)) return setErroForm('Data limite inválida (AAAA-MM-DD).');
    if (new Date(form.limite) <= new Date(form.inicio)) {
      return setErroForm('Data limite deve ser posterior à data de início.');
    }

    setErroForm(null);
    setSalvando(true);
    try {
      if (editando) {
        await metasRepository.atualizar(editando.id_meta, {
          titulo: form.titulo,
          valorObjetivo: objetivo,
          valorAtual: atual,
          dataInicio: form.inicio,
          dataLimite: form.limite,
          status: form.status,
        });
      } else {
        await metasRepository.criar({
          titulo: form.titulo,
          valorObjetivo: objetivo,
          valorAtual: atual,
          dataInicio: form.inicio,
          dataLimite: form.limite,
        });
      }

      setModalAberto(false);
      await recarregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro inesperado ao salvar meta.');
    } finally {
      setSalvando(false);
    }
  }

  async function salvarAporte() {
    if (!aportando) return;

    const valor = parseValor(valorAporte);
    if (Number.isNaN(valor) || valor <= 0) return setErroAporte('Informe um valor maior que zero.');

    setErroAporte(null);
    setSalvandoAporte(true);
    try {
      // O repositorio conclui a meta sozinho quando o aporte bate o objetivo.
      await metasRepository.aportar(aportando, valor);
      setAportando(null);
      setValorAporte('');
      await recarregar();
    } catch (e) {
      setErroAporte(e instanceof Error ? e.message : 'Erro ao registrar aporte.');
    } finally {
      setSalvandoAporte(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setConfirmando(true);
    try {
      await metasRepository.remover(excluindo.id_meta);
      setExcluindo(null);
      await recarregar();
    } catch (e) {
      setExcluindo(null);
      console.warn('Falha ao excluir meta:', e);
    } finally {
      setConfirmando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho
        titulo="Metas"
        subtitulo="Acompanhe seus objetivos."
        acao={<Botao titulo="Nova" icone="add" compacto aoTocar={abrirNova} />}
      />

      {erro ? <Aviso texto={erro} /> : null}

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Em andamento"
          valor={String(stats.emAndamento)}
          icone="flame-outline"
          cor={cores.warn}
        />
        <CartaoEstatistica
          rotulo="Concluídas"
          valor={String(stats.concluidas)}
          icone="checkmark-circle-outline"
          cor={cores.accentLight}
        />
      </View>

      <Cartao>
        <Text style={proprios.investidoRotulo}>Total guardado nas metas</Text>
        <Text style={proprios.investidoValor}>{formatCurrency(stats.investido)}</Text>
      </Cartao>

      <Seletor
        opcoes={[
          { value: 'Todas', label: 'Todas' },
          { value: 'EmAndamento', label: 'Em andamento' },
          { value: 'Concluida', label: 'Concluídas' },
          { value: 'Cancelada', label: 'Canceladas' },
        ]}
        valor={filtro}
        aoEscolher={setFiltro}
      />

      {filtradas.length === 0 ? (
        <EstadoVazio
          icone="flag-outline"
          titulo={dados.length ? 'Nenhuma meta nesse filtro' : 'Nenhuma meta ainda'}
          descricao={dados.length ? 'Troque o filtro acima.' : 'Toque em Nova para criar a primeira.'}
        />
      ) : (
        <View style={proprios.lista}>
          {filtradas.map((meta) => {
            const progresso = metasRepository.progresso(meta);
            const dias = metasRepository.diasRestantes(meta);
            const status = aparenciaStatus(meta.status, cores);
            const emAndamento = meta.status === 'EmAndamento';
            const atrasada = emAndamento && dias < 0;

            return (
              <Cartao key={meta.id_meta}>
                <View style={proprios.topo}>
                  <View style={ui.flex1}>
                    <Text style={proprios.titulo} numberOfLines={1}>
                      {meta.titulo}
                    </Text>
                    <Text style={proprios.prazo}>
                      Até {formatDateLong(meta.data_limite)}
                    </Text>
                  </View>

                  <View style={proprios.acoes}>
                    <BotaoIcone icone="pencil" aoTocar={() => abrirEdicao(meta)} />
                    <BotaoIcone
                      icone="trash-outline"
                      cor={cores.danger}
                      aoTocar={() => setExcluindo(meta)}
                    />
                  </View>
                </View>

                <View style={proprios.valores}>
                  <Text style={proprios.valorAtual}>{formatCurrency(meta.valor_atual)}</Text>
                  <Text style={proprios.valorObjetivo}>
                    de {formatCurrency(meta.valor_objetivo)}
                  </Text>
                </View>

                <BarraProgresso
                  percentual={progresso}
                  cor={meta.status === 'Concluida' ? cores.accent : cores.info}
                />

                <View style={proprios.rodape}>
                  <Etiqueta texto={status.label} cor={status.cor} fundo={status.fundo} />

                  <View style={proprios.rodapeDireita}>
                    <Text style={proprios.percentual}>{progresso.toFixed(0)}%</Text>
                    {emAndamento ? (
                      <Text style={[proprios.dias, atrasada && { color: cores.danger }]}>
                        <Ionicons name="time-outline" size={11} />{' '}
                        {atrasada ? `${Math.abs(dias)}d atrasada` : `${dias}d restantes`}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {emAndamento ? (
                  <Botao
                    titulo="Adicionar valor"
                    icone="add-circle-outline"
                    variante="secundario"
                    compacto
                    aoTocar={() => {
                      setAportando(meta);
                      setValorAporte('');
                      setErroAporte(null);
                    }}
                  />
                ) : null}
              </Cartao>
            );
          })}
        </View>
      )}

      {form ? (
        <ModalFormulario
          visivel={modalAberto}
          titulo={editando ? 'Editar meta' : 'Nova meta'}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={salvar}
          salvando={salvando}
          erro={erroForm}>
          <Campo
            rotulo="Título"
            value={form.titulo}
            onChangeText={(titulo) => setForm({ ...form, titulo })}
            placeholder="Reserva de emergência"
          />

          <Campo
            rotulo="Valor objetivo (R$)"
            value={form.objetivo}
            onChangeText={(objetivo) => setForm({ ...form, objetivo: sanitizarValor(objetivo) })}
            placeholder="10.000,00"
            keyboardType="decimal-pad"
          />

          <Campo
            rotulo="Valor já guardado (R$)"
            value={form.atual}
            onChangeText={(atual) => setForm({ ...form, atual: sanitizarValor(atual) })}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />

          <CampoData
            rotulo="Data de início"
            valor={form.inicio}
            aoMudar={(inicio) => setForm({ ...form, inicio })}
          />

          <CampoData
            rotulo="Data limite"
            valor={form.limite}
            aoMudar={(limite) => setForm({ ...form, limite })}
          />

          {editando ? (
            <Seletor
              rotulo="Status"
              opcoes={[
                { value: 'EmAndamento', label: 'Em andamento' },
                { value: 'Concluida', label: 'Concluída' },
                { value: 'Cancelada', label: 'Cancelada' },
              ]}
              valor={form.status}
              aoEscolher={(status) => setForm({ ...form, status })}
            />
          ) : null}
        </ModalFormulario>
      ) : null}

      {aportando ? (
        <ModalFormulario
          visivel
          titulo="Adicionar valor"
          rotuloSalvar="Adicionar"
          aoFechar={() => setAportando(null)}
          aoSalvar={salvarAporte}
          salvando={salvandoAporte}
          erro={erroAporte}>
          <Text style={proprios.aporteMeta}>{aportando.titulo}</Text>
          <Text style={proprios.aporteFalta}>
            Faltam {formatCurrency(Math.max(aportando.valor_objetivo - aportando.valor_atual, 0))}{' '}
            para concluir.
          </Text>

          <Campo
            rotulo="Valor do aporte (R$)"
            value={valorAporte}
            onChangeText={(v) => setValorAporte(sanitizarValor(v))}
            placeholder="0,00"
            keyboardType="decimal-pad"
            autoFocus
          />
        </ModalFormulario>
      ) : null}

      <ModalConfirmacao
        visivel={excluindo !== null}
        titulo="Excluir meta"
        mensagem={`"${excluindo?.titulo ?? ''}" será removida permanentemente.`}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
        confirmando={confirmando}
      />
    </Tela>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  investidoRotulo: { fontSize: 12.5, color: c.textDim },
  investidoValor: { fontSize: 23, fontWeight: '700', color: c.text, letterSpacing: -0.5 },

  lista: { gap: 10 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 15.5, fontWeight: '700', color: c.text },
  prazo: { fontSize: 12, color: c.textMute, marginTop: 2 },
  acoes: { flexDirection: 'row', gap: 6 },

  valores: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  valorAtual: { fontSize: 19, fontWeight: '700', color: c.text },
  valorObjetivo: { fontSize: 12.5, color: c.textMute },

  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  rodapeDireita: { alignItems: 'flex-end' },
  percentual: { fontSize: 13, fontWeight: '700', color: c.text },
  dias: { fontSize: 11, color: c.textMute, marginTop: 1 },

  aporteMeta: { fontSize: 16, fontWeight: '700', color: c.text },
  aporteFalta: { fontSize: 13, color: c.textDim, marginTop: -8 },
  })
);
