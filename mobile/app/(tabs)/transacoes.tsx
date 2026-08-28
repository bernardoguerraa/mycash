import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Aviso,
  Botao,
  BotaoIcone,
  Cabecalho,
  Campo,
  Carregando,
  CartaoEstatistica,
  EstadoVazio,
  ModalConfirmacao,
  ModalFormulario,
  Seletor,
  Tela,
  useEstilos,
} from '@/components/ui/kit';
import {
  CATEGORIAS,
  dataValida,
  formatCurrency,
  formatDate,
  hojeISO,
  parseValor,
  rotuloCategoria,
  rotuloTipoConta,
  sanitizarData,
  sanitizarValor,
} from '@/constants/mycash';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { contasRepository, transacoesRepository } from '@/lib/repositories';
import type { Conta, TipoTransacao, Transacao } from '@/types/database';

type Dados = { transacoes: Transacao[]; contas: Conta[] };
const VAZIO: Dados = { transacoes: [], contas: [] };

/**
 * A tela precisa das contas para nomear a origem e para o formulario.
 *
 * O periodo vai para a API (`de`/`ate`) em vez de ser recortado aqui: o
 * filtro roda no Postgres, onde ha indice, e o celular so recebe o que vai
 * mostrar. Tipo, categoria e busca continuam locais — sao baratos e mudam a
 * cada tecla.
 */
async function carregar(periodo: { de?: string; ate?: string }): Promise<Dados> {
  const [transacoes, contas] = await Promise.all([
    transacoesRepository.listar(periodo),
    contasRepository.listar(),
  ]);
  return { transacoes, contas };
}

type Formulario = {
  idConta: number;
  tipo: TipoTransacao;
  categoria: string;
  /** Preenchido quando a categoria escolhida e OUTRA. */
  categoriaLivre: string;
  descricao: string;
  valor: string;
  data: string;
};

/** Valor sentinela do seletor: abre o campo de texto livre. */
const OUTRA = '__outra__';

type Ordem = 'data' | 'valor';

export default function TransacoesScreen() {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores } = useTema();

  // Periodo aplicado (o que ja foi para a API) x periodo digitado.
  const [periodo, setPeriodo] = useState<{ de?: string; ate?: string }>({});
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const buscarDados = useCallback(() => carregar(periodo), [periodo]);
  const { dados, carregando, atualizando, erro, aoPuxar, recarregar } = useRecurso(
    buscarDados,
    VAZIO
  );

  // A primeira carga ja vem do efeito de foco; so re-busca quando o periodo
  // realmente muda, para nao duplicar requisicao na abertura da tela.
  const primeiraCarga = useRef(true);
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    recarregar();
  }, [periodo, recarregar]);

  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todas' | TipoTransacao>('Todas');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [ordem, setOrdem] = useState<Ordem>('data');
  const [crescente, setCrescente] = useState(false);

  const [editando, setEditando] = useState<Transacao | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<Formulario | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [excluindo, setExcluindo] = useState<Transacao | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const nomeConta = useMemo(() => {
    const mapa: Record<number, string> = {};
    dados.contas.forEach((c) => {
      mapa[c.id_conta] = `${c.instituicao} · ${rotuloTipoConta(c.tipo_conta)}`;
    });
    return mapa;
  }, [dados.contas]);

  // Categorias do formulario mais as que ja existem nos dados, como no web.
  const categorias = useMemo(() => {
    const daBase = dados.transacoes.map((t) => t.categoria).filter(Boolean);
    return Array.from(new Set([...CATEGORIAS, ...daBase])).sort();
  }, [dados.transacoes]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const lista = dados.transacoes.filter((t) => {
      if (filtroTipo !== 'Todas' && t.tipo !== filtroTipo) return false;
      if (filtroCategoria !== 'Todas' && t.categoria !== filtroCategoria) return false;
      if (termo && !(t.descricao ?? '').toLowerCase().includes(termo)) return false;
      return true;
    });

    lista.sort((a, b) => {
      const cmp =
        ordem === 'data'
          ? a.data_transacao.localeCompare(b.data_transacao)
          : Math.abs(a.valor || 0) - Math.abs(b.valor || 0);
      return crescente ? cmp : -cmp;
    });

    return lista;
  }, [dados.transacoes, filtroTipo, filtroCategoria, busca, ordem, crescente]);

  const totais = useMemo(() => {
    const somar = (tipo: TipoTransacao) =>
      filtradas
        .filter((t) => t.tipo === tipo)
        .reduce((total, t) => total + Math.abs(t.valor || 0), 0);
    return { entradas: somar('Entrada'), saidas: somar('Saida') };
  }, [filtradas]);

  /**
   * Manda o periodo para a API. Datas incompletas sao ignoradas em vez de
   * virarem erro: quem digitou so o "de" quer tudo a partir dali.
   */
  function aplicarPeriodo() {
    setPeriodo({
      de: dataValida(de) ? de : undefined,
      ate: dataValida(ate) ? ate : undefined,
    });
  }

  function abrirNova() {
    setEditando(null);
    setErroForm(null);
    setForm({
      idConta: dados.contas[0]?.id_conta ?? 0,
      tipo: 'Saida',
      categoria: CATEGORIAS[0],
      categoriaLivre: '',
      descricao: '',
      valor: '',
      data: hojeISO(),
    });
    setModalAberto(true);
  }

  function abrirEdicao(t: Transacao) {
    setEditando(t);
    setErroForm(null);
    // Categoria que nao esta na lista abre ja no campo livre, como no web.
    const naLista = CATEGORIAS.includes(t.categoria);
    setForm({
      idConta: t.id_conta,
      tipo: t.tipo,
      categoria: naLista ? t.categoria : OUTRA,
      categoriaLivre: naLista ? '' : t.categoria,
      descricao: t.descricao ?? '',
      valor: String(Math.abs(t.valor ?? 0).toFixed(2)),
      data: t.data_transacao.slice(0, 10),
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form) return;

    const categoria = form.categoria === OUTRA ? form.categoriaLivre.trim() : form.categoria;

    if (!form.idConta) return setErroForm('Selecione uma conta.');
    if (!categoria) return setErroForm('Informe a categoria.');
    if (!form.descricao.trim()) return setErroForm('Informe a descrição.');

    const valor = parseValor(form.valor);
    if (Number.isNaN(valor) || valor <= 0) return setErroForm('Informe um valor positivo.');
    if (!dataValida(form.data)) return setErroForm('Informe a data no formato AAAA-MM-DD.');

    setErroForm(null);
    setSalvando(true);
    try {
      const campos = {
        idConta: form.idConta,
        dataTransacao: form.data,
        tipo: form.tipo,
        categoria,
        descricao: form.descricao,
        valor,
      };

      if (editando) {
        await transacoesRepository.atualizar(editando.id_transacao, campos);
      } else {
        await transacoesRepository.criar(campos);
      }

      setModalAberto(false);
      await recarregar();
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro inesperado ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setConfirmando(true);
    try {
      await transacoesRepository.remover(excluindo.id_transacao);
      setExcluindo(null);
      await recarregar();
    } catch {
      // O aviso da tela aparece na proxima carga; fechar o modal evita travar.
      setExcluindo(null);
    } finally {
      setConfirmando(false);
    }
  }

  if (carregando) return <Carregando />;

  const semContas = dados.contas.length === 0;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho
        titulo="Transações"
        subtitulo="Gerencie suas movimentações."
        acao={
          <Botao
            titulo="Nova"
            icone="add"
            compacto
            aoTocar={abrirNova}
            desabilitado={semContas}
          />
        }
      />

      {erro ? <Aviso texto={erro} /> : null}
      {semContas ? (
        <Aviso
          tom="info"
          texto="Cadastre uma conta bancária antes de lançar transações."
        />
      ) : null}

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Entradas"
          valor={formatCurrency(totais.entradas)}
          icone="arrow-down-circle-outline"
          cor={cores.accentLight}
        />
        <CartaoEstatistica
          rotulo="Saídas"
          valor={formatCurrency(totais.saidas)}
          icone="arrow-up-circle-outline"
          cor={cores.danger}
        />
      </View>

      <View style={proprios.busca}>
        <Ionicons name="search" size={16} color={cores.textMute} />
        <TextInput
          style={proprios.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar pela descrição"
          placeholderTextColor={cores.textMute}
          autoCapitalize="none"
        />
        {busca ? <BotaoIcone icone="close" aoTocar={() => setBusca('')} /> : null}
      </View>

      <Seletor
        opcoes={[
          { value: 'Todas', label: 'Todas' },
          { value: 'Entrada', label: 'Entradas' },
          { value: 'Saida', label: 'Saídas' },
        ]}
        valor={filtroTipo}
        aoEscolher={setFiltroTipo}
      />

      <Seletor
        opcoes={[
          { value: 'Todas', label: 'Toda categoria' },
          ...categorias.map((c) => ({ value: c, label: rotuloCategoria(c) })),
        ]}
        valor={filtroCategoria}
        aoEscolher={setFiltroCategoria}
      />

      <View style={proprios.periodo}>
        <View style={ui.flex1}>
          <Campo
            rotulo="De"
            value={de}
            onChangeText={(v) => setDe(sanitizarData(v))}
            placeholder="AAAA-MM-DD"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
        <View style={ui.flex1}>
          <Campo
            rotulo="Até"
            value={ate}
            onChangeText={(v) => setAte(sanitizarData(v))}
            placeholder="AAAA-MM-DD"
            keyboardType="numeric"
            maxLength={10}
          />
        </View>
      </View>

      <View style={ui.linha}>
        <View style={ui.flex1}>
          <Botao
            titulo="Aplicar período"
            icone="calendar-outline"
            variante="secundario"
            compacto
            aoTocar={aplicarPeriodo}
          />
        </View>
        {periodo.de || periodo.ate ? (
          <View style={ui.flex1}>
            <Botao
              titulo="Limpar"
              variante="fantasma"
              compacto
              aoTocar={() => {
                setDe('');
                setAte('');
                setPeriodo({});
              }}
            />
          </View>
        ) : null}
      </View>

      <View style={proprios.ordenar}>
        <Text style={proprios.ordenarRotulo}>Ordenar por</Text>
        <View style={proprios.ordenarBotoes}>
          <Botao
            titulo={ordem === 'data' ? 'Data' : 'Valor'}
            variante="secundario"
            compacto
            aoTocar={() => setOrdem(ordem === 'data' ? 'valor' : 'data')}
          />
          <Botao
            titulo={crescente ? 'Crescente' : 'Decrescente'}
            icone={crescente ? 'arrow-up' : 'arrow-down'}
            variante="secundario"
            compacto
            aoTocar={() => setCrescente(!crescente)}
          />
        </View>
      </View>

      <Text style={proprios.contador}>
        {filtradas.length} de {dados.transacoes.length} lançamento
        {dados.transacoes.length === 1 ? '' : 's'}
      </Text>

      {filtradas.length === 0 ? (
        <EstadoVazio
          icone="receipt-outline"
          titulo={dados.transacoes.length ? 'Nada com esses filtros' : 'Nenhuma transação ainda'}
          descricao={
            dados.transacoes.length
              ? 'Ajuste a busca ou os filtros acima.'
              : 'Toque em Nova para lançar a primeira.'
          }
        />
      ) : (
        <View style={proprios.lista}>
          {filtradas.map((t) => {
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
                  <Text style={proprios.itemMeta} numberOfLines={1}>
                    {rotuloCategoria(t.categoria)} · {formatDate(t.data_transacao)}
                  </Text>
                  <Text style={proprios.itemConta} numberOfLines={1}>
                    {nomeConta[t.id_conta] ?? 'Conta removida'}
                  </Text>
                </View>

                <View style={proprios.itemDireita}>
                  <Text
                    style={[
                      proprios.itemValor,
                      { color: entrada ? cores.accentLight : cores.danger },
                    ]}>
                    {entrada ? '+' : '−'}
                    {formatCurrency(Math.abs(t.valor || 0))}
                  </Text>
                  <View style={proprios.acoes}>
                    <BotaoIcone icone="pencil" aoTocar={() => abrirEdicao(t)} />
                    <BotaoIcone
                      icone="trash-outline"
                      cor={cores.danger}
                      aoTocar={() => setExcluindo(t)}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {form ? (
        <ModalFormulario
          visivel={modalAberto}
          titulo={editando ? 'Editar transação' : 'Nova transação'}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={salvar}
          salvando={salvando}
          erro={erroForm}>
          <Seletor
            rotulo="Conta"
            opcoes={dados.contas.map((c) => ({
              value: c.id_conta,
              label: `${c.instituicao} · ${rotuloTipoConta(c.tipo_conta)}`,
            }))}
            valor={form.idConta}
            aoEscolher={(idConta) => setForm({ ...form, idConta })}
          />

          <Seletor
            rotulo="Tipo"
            opcoes={[
              { value: 'Saida', label: 'Saída' },
              { value: 'Entrada', label: 'Entrada' },
            ]}
            valor={form.tipo}
            aoEscolher={(tipo) => setForm({ ...form, tipo })}
          />

          <Seletor
            rotulo="Categoria"
            opcoes={[
              ...categorias.map((c) => ({ value: c, label: rotuloCategoria(c) })),
              { value: OUTRA, label: '+ Outra' },
            ]}
            valor={form.categoria}
            aoEscolher={(categoria) => setForm({ ...form, categoria })}
          />

          {form.categoria === OUTRA ? (
            <Campo
              rotulo="Nova categoria"
              value={form.categoriaLivre}
              onChangeText={(categoriaLivre) => setForm({ ...form, categoriaLivre })}
              placeholder="Pet, Viagem, Assinaturas..."
              autoFocus
            />
          ) : null}

          <Campo
            rotulo="Descrição"
            value={form.descricao}
            onChangeText={(descricao) => setForm({ ...form, descricao })}
            placeholder="Mercado do bairro"
          />

          <Campo
            rotulo="Valor (R$)"
            value={form.valor}
            onChangeText={(valor) => setForm({ ...form, valor: sanitizarValor(valor) })}
            placeholder="0,00"
            keyboardType="decimal-pad"
          />

          <Campo
            rotulo="Data"
            value={form.data}
            onChangeText={(data) => setForm({ ...form, data: sanitizarData(data) })}
            placeholder="AAAA-MM-DD"
            keyboardType="numeric"
            maxLength={10}
          />
        </ModalFormulario>
      ) : null}

      <ModalConfirmacao
        visivel={excluindo !== null}
        titulo="Excluir transação"
        mensagem={`"${excluindo?.descricao ?? ''}" será removida permanentemente.`}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
        confirmando={confirmando}
      />
    </Tela>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.edge2,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  buscaInput: { flex: 1, color: c.text, fontSize: 15, paddingVertical: 9 },

  contador: { fontSize: 12, color: c.textMute, marginTop: 2 },

  periodo: { flexDirection: 'row', gap: 10 },
  ordenar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ordenarRotulo: { fontSize: 12.5, color: c.textDim, fontWeight: '600' },
  ordenarBotoes: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },

  lista: { gap: 8 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.edge1,
    borderRadius: 12,
    padding: 12,
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
  itemConta: { fontSize: 11, color: c.textMute, marginTop: 1 },
  itemDireita: { alignItems: 'flex-end', gap: 6 },
  itemValor: { fontSize: 14.5, fontWeight: '700' },
  acoes: { flexDirection: 'row', gap: 6 },
  })
);
