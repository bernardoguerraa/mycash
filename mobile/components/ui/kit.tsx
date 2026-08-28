/**
 * Primitivas visuais compartilhadas pelas telas.
 *
 * O web resolve isso com Tailwind + lucide-react; no React Native nao ha
 * classes, entao os tokens de `constants/mycash.ts` viram StyleSheet aqui e
 * as telas so compoem.
 *
 * Tudo aqui e sensivel ao tema: `useEstilos()` devolve a folha da paleta em
 * vigor e `useTema().cores` da as cores para o que precisa ser calculado em
 * tempo de render (variantes de botao, tons de aviso).
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Cores } from '@/constants/mycash';
import { formatDateLong } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useNotificacoes } from '@/lib/notificacoes-contexto';
import { useTema } from '@/lib/tema';

type IconeNome = ComponentProps<typeof Ionicons>['name'];

// ============================================================================
// Estrutura de tela
// ============================================================================

export function Tela({
  children,
  atualizando,
  aoPuxar,
}: {
  children: ReactNode;
  atualizando?: boolean;
  aoPuxar?: () => void;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.telaConteudo}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          aoPuxar ? (
            <RefreshControl
              refreshing={!!atualizando}
              onRefresh={aoPuxar}
              tintColor={cores.accent}
              colors={[cores.accent]}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Alterna claro/escuro em um toque. Fica no cabecalho de todas as telas —
 * enterrar isso numa tela de ajustes so faz o usuario procurar.
 *
 * Sempre grava um modo explicito: quem toca aqui esta dizendo qual tema
 * quer, nao pedindo para seguir o aparelho. O modo "do sistema" continua
 * disponivel no Perfil.
 */
export function BotaoTema() {
  const { escuro, definirModo } = useTema();

  return (
    <BotaoIcone
      icone={escuro ? 'sunny-outline' : 'moon-outline'}
      aoTocar={() => definirModo(escuro ? 'claro' : 'escuro')}
    />
  );
}

/**
 * Sino com o numero de nao lidas, ao lado do botao de tema — mesmo lugar do
 * Header do web. Reconta ao ganhar foco, entao voltar de Notificacoes com
 * tudo lido zera o selo sem precisar recarregar.
 */
export function BotaoNotificacoes() {
  const estilos = useEstilos();
  const { cores } = useTema();
  const { naoLidas, atualizar } = useNotificacoes();
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      atualizar();
    }, [atualizar])
  );

  return (
    <View>
      <BotaoIcone
        icone={naoLidas > 0 ? 'notifications' : 'notifications-outline'}
        cor={naoLidas > 0 ? cores.accent : undefined}
        aoTocar={() => router.push('/(tabs)/notificacoes')}
      />
      {naoLidas > 0 ? (
        <View style={estilos.selo}>
          <Text style={estilos.seloTexto}>{naoLidas > 9 ? '9+' : naoLidas}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function Cabecalho({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  const estilos = useEstilos();

  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.flex1}>
        <Text style={estilos.cabecalhoTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.cabecalhoSub}>{subtitulo}</Text> : null}
      </View>
      {acao}
      <BotaoNotificacoes />
      <BotaoTema />
    </View>
  );
}

export function Carregando() {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <SafeAreaView style={[estilos.tela, estilos.centro]}>
      <ActivityIndicator color={cores.accent} size="large" />
    </SafeAreaView>
  );
}

export function Aviso({ texto, tom = 'erro' }: { texto: string; tom?: 'erro' | 'info' }) {
  const estilos = useEstilos();
  const { cores } = useTema();

  const erro = tom === 'erro';
  const cor = erro ? cores.danger : cores.info;
  const fundo = erro ? cores.dangerMuted : cores.infoMuted;

  return (
    <View style={[estilos.aviso, { backgroundColor: fundo, borderColor: cor }]}>
      <Ionicons
        name={erro ? 'alert-circle-outline' : 'information-circle-outline'}
        size={16}
        color={cor}
      />
      <Text style={[estilos.avisoTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function EstadoVazio({
  icone = 'file-tray-outline',
  titulo,
  descricao,
}: {
  icone?: IconeNome;
  titulo: string;
  descricao?: string;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <View style={estilos.vazio}>
      <Ionicons name={icone} size={34} color={cores.textMute} />
      <Text style={estilos.vazioTitulo}>{titulo}</Text>
      {descricao ? <Text style={estilos.vazioTexto}>{descricao}</Text> : null}
    </View>
  );
}

// ============================================================================
// Cartoes
// ============================================================================

export function Cartao({
  children,
  style,
}: {
  children: ReactNode;
  style?: ComponentProps<typeof View>['style'];
}) {
  const estilos = useEstilos();
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function CartaoEstatistica({
  rotulo,
  valor,
  icone,
  cor,
}: {
  rotulo: string;
  valor: string;
  icone?: IconeNome;
  cor?: string;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();
  const tom = cor ?? cores.text;

  return (
    <View style={[estilos.cartao, estilos.flex1, estilos.statCartao]}>
      <View style={estilos.statTopo}>
        <Text style={estilos.statRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
        {icone ? <Ionicons name={icone} size={15} color={tom} /> : null}
      </View>
      <Text style={[estilos.statValor, { color: tom }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

export function Etiqueta({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  const estilos = useEstilos();

  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo, borderColor: cor }]}>
      <View style={[estilos.etiquetaPonto, { backgroundColor: cor }]} />
      <Text style={[estilos.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function BarraProgresso({ percentual, cor }: { percentual: number; cor?: string }) {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <View style={estilos.trilha}>
      <View
        style={[
          estilos.preenchimento,
          {
            width: `${Math.max(0, Math.min(percentual, 100))}%`,
            backgroundColor: cor ?? cores.accent,
          },
        ]}
      />
    </View>
  );
}

// ============================================================================
// Controles
// ============================================================================

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma';

export function Botao({
  titulo,
  aoTocar,
  variante = 'primario',
  icone,
  ocupado,
  desabilitado,
  compacto,
}: {
  titulo: string;
  aoTocar: () => void;
  variante?: VarianteBotao;
  icone?: IconeNome;
  ocupado?: boolean;
  desabilitado?: boolean;
  compacto?: boolean;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();

  const inerte = ocupado || desabilitado;
  const tom = {
    primario: { fundo: cores.accent, borda: cores.accent, texto: cores.sobreAccent },
    secundario: { fundo: cores.surface3, borda: cores.edge2, texto: cores.text },
    perigo: { fundo: cores.dangerMuted, borda: cores.danger, texto: cores.danger },
    fantasma: { fundo: 'transparent', borda: 'transparent', texto: cores.textDim },
  }[variante];

  return (
    <Pressable
      onPress={aoTocar}
      disabled={inerte}
      style={({ pressed }) => [
        estilos.botao,
        compacto && estilos.botaoCompacto,
        { backgroundColor: tom.fundo, borderColor: tom.borda },
        (pressed || inerte) && { opacity: 0.6 },
      ]}>
      {ocupado ? (
        <ActivityIndicator size="small" color={tom.texto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={16} color={tom.texto} /> : null}
          <Text
            style={[
              estilos.botaoTexto,
              compacto && estilos.botaoTextoCompacto,
              { color: tom.texto },
            ]}>
            {titulo}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function BotaoIcone({
  icone,
  aoTocar,
  cor,
  ocupado,
}: {
  icone: IconeNome;
  aoTocar: () => void;
  cor?: string;
  ocupado?: boolean;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();
  const tom = cor ?? cores.textDim;

  return (
    <Pressable
      onPress={aoTocar}
      disabled={ocupado}
      hitSlop={8}
      style={({ pressed }) => [estilos.botaoIcone, pressed && { opacity: 0.5 }]}>
      {ocupado ? (
        <ActivityIndicator size="small" color={tom} />
      ) : (
        <Ionicons name={icone} size={18} color={tom} />
      )}
    </Pressable>
  );
}

export function Campo({
  rotulo,
  erro,
  ...props
}: TextInputProps & { rotulo: string; erro?: string }) {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={cores.textMute}
        {...props}
        style={[estilos.input, !!erro && { borderColor: cores.danger }, props.style]}
      />
      {erro ? <Text style={estilos.campoErro}>{erro}</Text> : null}
    </View>
  );
}

/**
 * Data por calendario nativo, no lugar de digitar AAAA-MM-DD.
 *
 * O valor continua trafegando como 'YYYY-MM-DD', que e o que a API espera —
 * o calendario e so a forma de escolher. A data e montada com os componentes
 * locais (getFullYear/getMonth/getDate) em vez de toISOString, senao no
 * Brasil a conversao para UTC devolve o dia anterior.
 */
export function CampoData({
  rotulo,
  valor,
  aoMudar,
  erro,
  placeholder = 'Escolher data',
}: {
  rotulo: string;
  valor: string;
  aoMudar: (iso: string) => void;
  erro?: string;
  placeholder?: string;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();
  const [aberto, setAberto] = useState(false);

  const paraISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

  // Sem data escolhida o calendario abre em hoje, que e o palpite mais util.
  const inicial = /^\d{4}-\d{2}-\d{2}$/.test(valor)
    ? new Date(`${valor}T00:00:00`)
    : new Date();

  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>

      <Pressable
        onPress={() => setAberto(true)}
        style={({ pressed }) => [
          estilos.input,
          estilos.campoData,
          !!erro && { borderColor: cores.danger },
          pressed && { opacity: 0.7 },
        ]}>
        <Text style={[estilos.campoDataTexto, !valor && { color: cores.textMute }]}>
          {valor ? formatDateLong(valor) : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={17} color={cores.textDim} />
      </Pressable>

      {valor ? (
        <Pressable onPress={() => aoMudar('')} hitSlop={6}>
          <Text style={estilos.campoDataLimpar}>Limpar data</Text>
        </Pressable>
      ) : null}

      {aberto ? (
        <DateTimePicker
          value={inicial}
          mode="date"
          display="calendar"
          onChange={(evento, escolhida) => {
            // No Android o dialogo se fecha sozinho; 'dismissed' e cancelar.
            setAberto(false);
            if (evento.type === 'set' && escolhida) aoMudar(paraISO(escolhida));
          }}
        />
      ) : null}

      {erro ? <Text style={estilos.campoErro}>{erro}</Text> : null}
    </View>
  );
}

/** Escolha entre poucas opcoes — substitui o <select> do web. */
export function Seletor<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
  erro,
}: {
  rotulo?: string;
  opcoes: { value: T; label: string }[];
  valor: T;
  aoEscolher: (v: T) => void;
  erro?: string;
}) {
  const estilos = useEstilos();

  return (
    <View style={estilos.campo}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      {/*
        Os chips quebram linha em vez de rolar na horizontal. Com rolagem, a
        ultima opcao aparecia cortada na borda e lia-se como defeito — e
        dentro do modal, onde a caixa tem overflow hidden, nem dava para
        adivinhar que havia mais. Quebrando, tudo fica visivel de uma vez.
      */}
      <View style={estilos.chips}>
        {opcoes.map((opcao) => {
          const ativo = opcao.value === valor;
          return (
            <Pressable
              key={String(opcao.value)}
              onPress={() => aoEscolher(opcao.value)}
              style={({ pressed }) => [
                estilos.chip,
                ativo && estilos.chipAtivo,
                pressed && { opacity: 0.7 },
              ]}>
              <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>
                {opcao.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {erro ? <Text style={estilos.campoErro}>{erro}</Text> : null}
    </View>
  );
}

// ============================================================================
// Modal de formulario
// ============================================================================

export function ModalFormulario({
  visivel,
  titulo,
  aoFechar,
  aoSalvar,
  salvando,
  erro,
  rotuloSalvar = 'Salvar',
  children,
}: {
  visivel: boolean;
  titulo: string;
  aoFechar: () => void;
  aoSalvar: () => void;
  salvando?: boolean;
  erro?: string | null;
  rotuloSalvar?: string;
  children: ReactNode;
}) {
  const estilos = useEstilos();

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        style={estilos.modalFundo}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={estilos.modalCaixa}>
          <View style={estilos.modalTopo}>
            <Text style={estilos.modalTitulo}>{titulo}</Text>
            <BotaoIcone icone="close" aoTocar={aoFechar} />
          </View>

          <ScrollView
            contentContainerStyle={estilos.modalCorpo}
            keyboardShouldPersistTaps="handled">
            {erro ? <Aviso texto={erro} /> : null}
            {children}
          </ScrollView>

          <View style={estilos.modalRodape}>
            <View style={estilos.flex1}>
              <Botao titulo="Cancelar" variante="secundario" aoTocar={aoFechar} />
            </View>
            <View style={estilos.flex1}>
              <Botao titulo={rotuloSalvar} aoTocar={aoSalvar} ocupado={salvando} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** Confirmacao destrutiva — o Alert nativo some rapido demais na demo. */
export function ModalConfirmacao({
  visivel,
  titulo,
  mensagem,
  aoConfirmar,
  aoCancelar,
  confirmando,
}: {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  aoConfirmar: () => void;
  aoCancelar: () => void;
  confirmando?: boolean;
}) {
  const estilos = useEstilos();
  const { cores } = useTema();

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoCancelar}>
      <View style={estilos.modalFundo}>
        <View style={[estilos.modalCaixa, estilos.modalPequeno]}>
          <View style={estilos.confirmaTopo}>
            <View style={estilos.confirmaIcone}>
              <Ionicons name="trash-outline" size={20} color={cores.danger} />
            </View>
            <Text style={estilos.modalTitulo}>{titulo}</Text>
          </View>
          <Text style={estilos.confirmaTexto}>{mensagem}</Text>
          <View style={estilos.modalRodape}>
            <View style={estilos.flex1}>
              <Botao titulo="Cancelar" variante="secundario" aoTocar={aoCancelar} />
            </View>
            <View style={estilos.flex1}>
              <Botao
                titulo="Excluir"
                variante="perigo"
                aoTocar={aoConfirmar}
                ocupado={confirmando}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================

export const useEstilos = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
    tela: { flex: 1, backgroundColor: c.surface0 },
    telaConteudo: { padding: 18, gap: 14, paddingBottom: 40 },
    centro: { justifyContent: 'center', alignItems: 'center' },
    flex1: { flex: 1 },
    linha: { flexDirection: 'row', gap: 10 },

    cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 2 },
    cabecalhoTitulo: { fontSize: 25, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
    cabecalhoSub: { fontSize: 13.5, color: c.textDim, marginTop: 3 },

    aviso: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    avisoTexto: { flex: 1, fontSize: 13 },

    vazio: {
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.edge1,
      borderRadius: 14,
      paddingVertical: 32,
      paddingHorizontal: 20,
    },
    vazioTitulo: { color: c.textDim, fontSize: 14.5, fontWeight: '600' },
    vazioTexto: { color: c.textMute, fontSize: 12.5, textAlign: 'center' },

    cartao: {
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.edge1,
      borderRadius: 14,
      padding: 15,
      gap: 8,
    },
    statCartao: { padding: 13, gap: 6, minWidth: 0 },
    statTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    statRotulo: { flex: 1, fontSize: 12, color: c.textDim },
    statValor: { fontSize: 18, fontWeight: '700' },

    etiqueta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    etiquetaPonto: { width: 5, height: 5, borderRadius: 3 },
    etiquetaTexto: { fontSize: 11, fontWeight: '600' },

    trilha: { height: 7, borderRadius: 4, backgroundColor: c.surface4, overflow: 'hidden' },
    preenchimento: { height: '100%', borderRadius: 4 },

    botao: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderWidth: 1,
      borderRadius: 11,
      paddingVertical: 13,
      paddingHorizontal: 14,
    },
    botaoCompacto: { paddingVertical: 8, paddingHorizontal: 11, borderRadius: 9 },
    botaoTexto: { fontSize: 14.5, fontWeight: '700' },
    botaoTextoCompacto: { fontSize: 13 },
    selo: {
      position: 'absolute',
      top: -3,
      right: -3,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.danger,
      borderWidth: 1.5,
      borderColor: c.surface0,
    },
    seloTexto: { fontSize: 9.5, fontWeight: '800', color: '#fff' },
    botaoIcone: {
      width: 32,
      height: 32,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface3,
    },

    campo: { gap: 6 },
    rotulo: { fontSize: 12.5, fontWeight: '600', color: c.textDim },
    input: {
      backgroundColor: c.surface3,
      borderWidth: 1,
      borderColor: c.edge2,
      borderRadius: 11,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15.5,
      color: c.text,
    },
    campoErro: { fontSize: 12, color: c.danger },
    campoData: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    campoDataTexto: { fontSize: 15.5, color: c.text },
    campoDataLimpar: { fontSize: 12, color: c.textMute, alignSelf: 'flex-start' },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: {
      borderWidth: 1,
      borderColor: c.edge2,
      backgroundColor: c.surface3,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 7,
    },
    chipAtivo: { backgroundColor: c.accentMuted, borderColor: c.accent },
    chipTexto: { fontSize: 13, color: c.textDim, fontWeight: '500' },
    chipTextoAtivo: { color: c.accent, fontWeight: '700' },

    modalFundo: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 16,
    },
    modalCaixa: {
      backgroundColor: c.surface1,
      borderWidth: 1,
      borderColor: c.edge2,
      borderRadius: 18,
      maxHeight: '88%',
      overflow: 'hidden',
    },
    modalPequeno: { padding: 18, gap: 14 },
    modalTopo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.edge1,
    },
    modalTitulo: { fontSize: 16.5, fontWeight: '700', color: c.text },
    modalCorpo: { padding: 18, gap: 14 },
    modalRodape: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },

    confirmaTopo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    confirmaIcone: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.dangerMuted,
    },
    confirmaTexto: { fontSize: 13.5, color: c.textDim, lineHeight: 19 },
  })
);
