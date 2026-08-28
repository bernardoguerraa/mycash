import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  Botao,
  BotaoIcone,
  Cabecalho,
  Campo,
  Carregando,
  Cartao,
  CartaoEstatistica,
  Etiqueta,
  EstadoVazio,
  ModalConfirmacao,
  ModalFormulario,
  Seletor,
  Tela,
  estilos as ui,
} from '@/components/ui/kit';
import {
  MyCash,
  TIPOS_CONTA,
  formatCurrency,
  parseValor,
  sanitizarValor,
} from '@/constants/mycash';
import { useRecurso } from '@/hooks/use-recurso';
import { contasRepository } from '@/lib/repositories';
import type { Conta } from '@/types/database';

const VAZIO: Conta[] = [];

const carregar = () => contasRepository.listar();

type Formulario = {
  instituicao: string;
  numeroConta: string;
  tipoConta: string;
  saldo: string;
};

export default function ContasScreen() {
  const { dados, carregando, atualizando, erro, aoPuxar, recarregar } = useRecurso(carregar, VAZIO);

  const [editando, setEditando] = useState<Conta | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<Formulario | null>(null);
  const [erroForm, setErroForm] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [excluindo, setExcluindo] = useState<Conta | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const saldoTotal = useMemo(() => contasRepository.saldoConsolidado(dados), [dados]);
  const conectadas = useMemo(() => dados.filter((c) => c.origem === 'pluggy').length, [dados]);

  function abrirNova() {
    setEditando(null);
    setErroForm(null);
    setForm({
      instituicao: '',
      numeroConta: '',
      tipoConta: TIPOS_CONTA[0].value,
      saldo: '0,00',
    });
    setModalAberto(true);
  }

  function abrirEdicao(conta: Conta) {
    setEditando(conta);
    setErroForm(null);
    setForm({
      instituicao: conta.instituicao,
      numeroConta: conta.numero_conta,
      tipoConta: conta.tipo_conta,
      saldo: String(conta.saldo_atual.toFixed(2)),
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form) return;

    if (!form.instituicao.trim()) return setErroForm('Informe a instituição.');
    if (!form.numeroConta.trim()) return setErroForm('Informe o número da conta.');
    if (!form.tipoConta) return setErroForm('Selecione o tipo da conta.');

    const saldo = parseValor(form.saldo);
    if (Number.isNaN(saldo)) return setErroForm('Informe um saldo válido.');

    setErroForm(null);
    setSalvando(true);
    try {
      const campos = {
        instituicao: form.instituicao,
        numeroConta: form.numeroConta,
        tipoConta: form.tipoConta,
        saldoAtual: saldo,
      };

      if (editando) {
        await contasRepository.atualizar(editando.id_conta, campos);
      } else {
        await contasRepository.criar(campos);
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
      await contasRepository.remover(excluindo.id_conta);
      setExcluindo(null);
      await recarregar();
    } catch (e) {
      setExcluindo(null);
      // Conta com transacoes vinculadas e recusada pela FK; a mensagem
      // aparece no proximo carregamento da tela.
      console.warn('Falha ao excluir conta:', e);
    } finally {
      setConfirmando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho
        titulo="Contas"
        subtitulo="Acompanhe seus saldos."
        acao={<Botao titulo="Nova" icone="add" compacto aoTocar={abrirNova} />}
      />

      {erro ? <Aviso texto={erro} /> : null}

      <View style={proprios.saldoCartao}>
        <Text style={proprios.saldoRotulo}>Saldo total</Text>
        <Text style={proprios.saldoValor}>{formatCurrency(saldoTotal)}</Text>
      </View>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Contas cadastradas"
          valor={String(dados.length)}
          icone="wallet-outline"
          cor={MyCash.info}
        />
        <CartaoEstatistica
          rotulo="Sincronizadas"
          valor={String(conectadas)}
          icone="sync-outline"
          cor={MyCash.accentLight}
        />
      </View>

      {dados.length === 0 ? (
        <EstadoVazio
          icone="wallet-outline"
          titulo="Nenhuma conta cadastrada"
          descricao="Toque em Nova para cadastrar a primeira."
        />
      ) : (
        <View style={proprios.lista}>
          {dados.map((conta) => {
            const negativo = conta.saldo_atual < 0;
            const doPluggy = conta.origem === 'pluggy';
            return (
              <Cartao key={conta.id_conta}>
                <View style={proprios.topo}>
                  <View style={proprios.icone}>
                    <Ionicons name="business-outline" size={18} color={MyCash.accentLight} />
                  </View>

                  <View style={ui.flex1}>
                    <Text style={proprios.instituicao} numberOfLines={1}>
                      {conta.instituicao}
                    </Text>
                    <Text style={proprios.numero} numberOfLines={1}>
                      {conta.tipo_conta} · nº {conta.numero_conta}
                    </Text>
                  </View>

                  <View style={proprios.acoes}>
                    <BotaoIcone icone="pencil" aoTocar={() => abrirEdicao(conta)} />
                    <BotaoIcone
                      icone="trash-outline"
                      cor={MyCash.danger}
                      aoTocar={() => setExcluindo(conta)}
                    />
                  </View>
                </View>

                <View style={proprios.rodape}>
                  <View>
                    <Text style={proprios.saldoLabelPequeno}>Saldo</Text>
                    <Text
                      style={[
                        proprios.saldoConta,
                        { color: negativo ? MyCash.danger : MyCash.text },
                      ]}>
                      {formatCurrency(conta.saldo_atual)}
                    </Text>
                  </View>

                  <Etiqueta
                    texto={doPluggy ? 'Open Finance' : 'Manual'}
                    cor={doPluggy ? MyCash.info : MyCash.textDim}
                    fundo={doPluggy ? MyCash.infoMuted : MyCash.surface3}
                  />
                </View>
              </Cartao>
            );
          })}
        </View>
      )}

      {form ? (
        <ModalFormulario
          visivel={modalAberto}
          titulo={editando ? 'Editar conta' : 'Nova conta'}
          aoFechar={() => setModalAberto(false)}
          aoSalvar={salvar}
          salvando={salvando}
          erro={erroForm}>
          <Campo
            rotulo="Instituição"
            value={form.instituicao}
            onChangeText={(instituicao) => setForm({ ...form, instituicao })}
            placeholder="Nubank"
          />

          <Campo
            rotulo="Número da conta"
            value={form.numeroConta}
            onChangeText={(numeroConta) => setForm({ ...form, numeroConta })}
            placeholder="12345-6"
            autoCapitalize="none"
          />

          <Seletor
            rotulo="Tipo"
            opcoes={TIPOS_CONTA.map((t) => ({ value: t.value, label: t.label }))}
            valor={form.tipoConta}
            aoEscolher={(tipoConta) => setForm({ ...form, tipoConta })}
          />

          <Campo
            rotulo="Saldo atual (R$)"
            value={form.saldo}
            onChangeText={(saldo) => setForm({ ...form, saldo: sanitizarValor(saldo) })}
            placeholder="0,00"
            keyboardType="numbers-and-punctuation"
          />
        </ModalFormulario>
      ) : null}

      <ModalConfirmacao
        visivel={excluindo !== null}
        titulo="Excluir conta"
        mensagem={`"${excluindo?.instituicao ?? ''}" será removida. Contas com transações lançadas não podem ser excluídas.`}
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
        confirmando={confirmando}
      />
    </Tela>
  );
}

const proprios = StyleSheet.create({
  saldoCartao: {
    backgroundColor: MyCash.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 16,
    padding: 18,
    gap: 5,
  },
  saldoRotulo: { fontSize: 13, color: MyCash.accentLight, fontWeight: '600' },
  saldoValor: { fontSize: 28, fontWeight: '700', color: MyCash.text, letterSpacing: -0.8 },

  lista: { gap: 10 },
  topo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MyCash.accentMuted,
  },
  instituicao: { fontSize: 15, fontWeight: '700', color: MyCash.text },
  numero: { fontSize: 12, color: MyCash.textMute, marginTop: 2 },
  acoes: { flexDirection: 'row', gap: 6 },

  rodape: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: MyCash.edge1,
    paddingTop: 11,
    marginTop: 3,
  },
  saldoLabelPequeno: { fontSize: 11.5, color: MyCash.textMute },
  saldoConta: { fontSize: 19, fontWeight: '700', marginTop: 2 },
});
