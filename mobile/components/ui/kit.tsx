/**
 * Primitivas visuais compartilhadas pelas telas.
 *
 * O web resolve isso com Tailwind + lucide-react; no React Native nao ha
 * classes, entao os mesmos tokens de `constants/mycash.ts` viram StyleSheet
 * aqui e as telas so compoem.
 */

import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode } from 'react';
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

import { MyCash } from '@/constants/mycash';

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
              tintColor={MyCash.accent}
              colors={[MyCash.accent]}
            />
          ) : undefined
        }>
        {children}
      </ScrollView>
    </SafeAreaView>
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
  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.flex1}>
        <Text style={estilos.cabecalhoTitulo}>{titulo}</Text>
        {subtitulo ? <Text style={estilos.cabecalhoSub}>{subtitulo}</Text> : null}
      </View>
      {acao}
    </View>
  );
}

export function Carregando() {
  return (
    <SafeAreaView style={[estilos.tela, estilos.centro]}>
      <ActivityIndicator color={MyCash.accent} size="large" />
    </SafeAreaView>
  );
}

export function Aviso({ texto, tom = 'erro' }: { texto: string; tom?: 'erro' | 'info' }) {
  const erro = tom === 'erro';
  return (
    <View
      style={[
        estilos.aviso,
        {
          backgroundColor: erro ? MyCash.dangerMuted : MyCash.infoMuted,
          borderColor: erro ? MyCash.danger : MyCash.info,
        },
      ]}>
      <Ionicons
        name={erro ? 'alert-circle-outline' : 'information-circle-outline'}
        size={16}
        color={erro ? MyCash.danger : MyCash.info}
      />
      <Text style={[estilos.avisoTexto, { color: erro ? MyCash.danger : MyCash.info }]}>
        {texto}
      </Text>
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
  return (
    <View style={estilos.vazio}>
      <Ionicons name={icone} size={34} color={MyCash.textMute} />
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
  return <View style={[estilos.cartao, style]}>{children}</View>;
}

export function CartaoEstatistica({
  rotulo,
  valor,
  icone,
  cor = MyCash.text,
}: {
  rotulo: string;
  valor: string;
  icone?: IconeNome;
  cor?: string;
}) {
  return (
    <View style={[estilos.cartao, estilos.flex1, estilos.statCartao]}>
      <View style={estilos.statTopo}>
        <Text style={estilos.statRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
        {icone ? <Ionicons name={icone} size={15} color={cor} /> : null}
      </View>
      <Text style={[estilos.statValor, { color: cor }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  );
}

export function Etiqueta({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo, borderColor: cor }]}>
      <View style={[estilos.etiquetaPonto, { backgroundColor: cor }]} />
      <Text style={[estilos.etiquetaTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

export function BarraProgresso({ percentual, cor = MyCash.accent }: { percentual: number; cor?: string }) {
  return (
    <View style={estilos.trilha}>
      <View
        style={[
          estilos.preenchimento,
          { width: `${Math.max(0, Math.min(percentual, 100))}%`, backgroundColor: cor },
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
  const inerte = ocupado || desabilitado;
  const cores = {
    primario: { fundo: MyCash.accent, borda: MyCash.accent, texto: '#04140d' },
    secundario: { fundo: MyCash.surface3, borda: MyCash.edge2, texto: MyCash.text },
    perigo: { fundo: MyCash.dangerMuted, borda: MyCash.danger, texto: MyCash.danger },
    fantasma: { fundo: 'transparent', borda: 'transparent', texto: MyCash.textDim },
  }[variante];

  return (
    <Pressable
      onPress={aoTocar}
      disabled={inerte}
      style={({ pressed }) => [
        estilos.botao,
        compacto && estilos.botaoCompacto,
        { backgroundColor: cores.fundo, borderColor: cores.borda },
        (pressed || inerte) && { opacity: 0.6 },
      ]}>
      {ocupado ? (
        <ActivityIndicator size="small" color={cores.texto} />
      ) : (
        <>
          {icone ? <Ionicons name={icone} size={16} color={cores.texto} /> : null}
          <Text style={[estilos.botaoTexto, compacto && estilos.botaoTextoCompacto, { color: cores.texto }]}>
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
  cor = MyCash.textDim,
  ocupado,
}: {
  icone: IconeNome;
  aoTocar: () => void;
  cor?: string;
  ocupado?: boolean;
}) {
  return (
    <Pressable
      onPress={aoTocar}
      disabled={ocupado}
      hitSlop={8}
      style={({ pressed }) => [estilos.botaoIcone, pressed && { opacity: 0.5 }]}>
      {ocupado ? <ActivityIndicator size="small" color={cor} /> : <Ionicons name={icone} size={18} color={cor} />}
    </Pressable>
  );
}

export function Campo({
  rotulo,
  erro,
  ...props
}: TextInputProps & { rotulo: string; erro?: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={MyCash.textMute}
        {...props}
        style={[estilos.input, !!erro && { borderColor: MyCash.danger }, props.style]}
      />
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
  return (
    <View style={estilos.campo}>
      {rotulo ? <Text style={estilos.rotulo}>{rotulo}</Text> : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={estilos.chips}
        keyboardShouldPersistTaps="handled">
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
              <Text style={[estilos.chipTexto, ativo && estilos.chipTextoAtivo]}>{opcao.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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
  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoCancelar}>
      <View style={estilos.modalFundo}>
        <View style={[estilos.modalCaixa, estilos.modalPequeno]}>
          <View style={estilos.confirmaTopo}>
            <View style={estilos.confirmaIcone}>
              <Ionicons name="trash-outline" size={20} color={MyCash.danger} />
            </View>
            <Text style={estilos.modalTitulo}>{titulo}</Text>
          </View>
          <Text style={estilos.confirmaTexto}>{mensagem}</Text>
          <View style={estilos.modalRodape}>
            <View style={estilos.flex1}>
              <Botao titulo="Cancelar" variante="secundario" aoTocar={aoCancelar} />
            </View>
            <View style={estilos.flex1}>
              <Botao titulo="Excluir" variante="perigo" aoTocar={aoConfirmar} ocupado={confirmando} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================================

export const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: MyCash.surface0 },
  telaConteudo: { padding: 18, gap: 14, paddingBottom: 40 },
  centro: { justifyContent: 'center', alignItems: 'center' },
  flex1: { flex: 1 },
  linha: { flexDirection: 'row', gap: 10 },

  cabecalho: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 2 },
  cabecalhoTitulo: { fontSize: 25, fontWeight: '700', color: MyCash.text, letterSpacing: -0.5 },
  cabecalhoSub: { fontSize: 13.5, color: MyCash.textDim, marginTop: 3 },

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
    backgroundColor: MyCash.surface2,
    borderWidth: 1,
    borderColor: MyCash.edge1,
    borderRadius: 14,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  vazioTitulo: { color: MyCash.textDim, fontSize: 14.5, fontWeight: '600' },
  vazioTexto: { color: MyCash.textMute, fontSize: 12.5, textAlign: 'center' },

  cartao: {
    backgroundColor: MyCash.surface2,
    borderWidth: 1,
    borderColor: MyCash.edge1,
    borderRadius: 14,
    padding: 15,
    gap: 8,
  },
  statCartao: { padding: 13, gap: 6, minWidth: 0 },
  statTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  statRotulo: { flex: 1, fontSize: 12, color: MyCash.textDim },
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

  trilha: { height: 7, borderRadius: 4, backgroundColor: MyCash.surface4, overflow: 'hidden' },
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
  botaoIcone: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MyCash.surface3,
  },

  campo: { gap: 6 },
  rotulo: { fontSize: 12.5, fontWeight: '600', color: MyCash.textDim },
  input: {
    backgroundColor: MyCash.surface3,
    borderWidth: 1,
    borderColor: MyCash.edge2,
    borderRadius: 11,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15.5,
    color: MyCash.text,
  },
  campoErro: { fontSize: 12, color: MyCash.danger },

  chips: { flexDirection: 'row', gap: 7, paddingRight: 4 },
  chip: {
    borderWidth: 1,
    borderColor: MyCash.edge2,
    backgroundColor: MyCash.surface3,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipAtivo: { backgroundColor: MyCash.accentMuted, borderColor: MyCash.accent },
  chipTexto: { fontSize: 13, color: MyCash.textDim, fontWeight: '500' },
  chipTextoAtivo: { color: MyCash.accentLight, fontWeight: '700' },

  modalFundo: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCaixa: {
    backgroundColor: MyCash.surface1,
    borderWidth: 1,
    borderColor: MyCash.edge2,
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
    borderBottomColor: MyCash.edge1,
  },
  modalTitulo: { fontSize: 16.5, fontWeight: '700', color: MyCash.text },
  modalCorpo: { padding: 18, gap: 14 },
  modalRodape: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4 },

  confirmaTopo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  confirmaIcone: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MyCash.dangerMuted,
  },
  confirmaTexto: { fontSize: 13.5, color: MyCash.textDim, lineHeight: 19 },
});
