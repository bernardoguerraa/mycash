import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  Botao,
  BotaoIcone,
  Cabecalho,
  Carregando,
  Cartao,
  EstadoVazio,
  ModalConfirmacao,
  Seletor,
  Tela,
  estilos as ui,
} from '@/components/ui/kit';
import { MyCash, formatarTempoRelativo } from '@/constants/mycash';
import { useRecurso } from '@/hooks/use-recurso';
import { notificacoesRepository } from '@/lib/repositories';
import type { Notificacao, TipoNotificacao } from '@/types/database';

const VAZIO: Notificacao[] = [];

const carregar = () => notificacoesRepository.listar();

type IconeNome = ComponentProps<typeof Ionicons>['name'];

/** Mesmos icones e cores por tipo do NotificacoesClient do web. */
const APARENCIA: Record<TipoNotificacao, { icone: IconeNome; cor: string; fundo: string }> = {
  Sistema: { icone: 'settings-outline', cor: MyCash.info, fundo: MyCash.infoMuted },
  Meta: { icone: 'flag-outline', cor: MyCash.roxo, fundo: MyCash.roxoMuted },
  Lembrete: { icone: 'notifications-outline', cor: MyCash.warn, fundo: MyCash.warnMuted },
  Alerta: { icone: 'alert-circle-outline', cor: MyCash.danger, fundo: MyCash.dangerMuted },
};

export default function NotificacoesScreen() {
  const { dados, setDados, carregando, atualizando, erro, aoPuxar, recarregar } = useRecurso(
    carregar,
    VAZIO
  );

  const [filtro, setFiltro] = useState<'todas' | 'nao_lidas'>('todas');
  const [marcandoTodas, setMarcandoTodas] = useState(false);

  const [excluindo, setExcluindo] = useState<Notificacao | null>(null);
  const [confirmando, setConfirmando] = useState(false);

  const filtradas = useMemo(
    () => (filtro === 'nao_lidas' ? dados.filter((n) => !n.lida) : dados),
    [dados, filtro]
  );

  const naoLidas = useMemo(() => dados.filter((n) => !n.lida).length, [dados]);

  /**
   * Lazy update, igual ao web: a UI muda na hora e volta atras se a API
   * recusar. Aqui isso pesa mais que no web — no celular o round-trip e
   * lento o bastante para o toque parecer perdido.
   */
  async function marcarComoLida(notificacao: Notificacao) {
    if (notificacao.lida) return;

    const anterior = dados;
    setDados(
      dados.map((n) =>
        n.id_notificacao === notificacao.id_notificacao ? { ...n, lida: true } : n
      )
    );
    try {
      await notificacoesRepository.marcarComoLida(notificacao.id_notificacao);
    } catch (e) {
      console.warn('Falha ao marcar como lida — revertendo:', e);
      setDados(anterior);
    }
  }

  async function marcarTodas() {
    const ids = dados.filter((n) => !n.lida).map((n) => n.id_notificacao);
    if (ids.length === 0) return;

    const anterior = dados;
    setMarcandoTodas(true);
    setDados(dados.map((n) => ({ ...n, lida: true })));
    try {
      await notificacoesRepository.marcarTodasComoLidas(ids);
    } catch (e) {
      console.warn('Falha ao marcar todas — revertendo:', e);
      setDados(anterior);
    } finally {
      setMarcandoTodas(false);
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    setConfirmando(true);
    try {
      await notificacoesRepository.remover(excluindo.id_notificacao);
      setExcluindo(null);
      await recarregar();
    } catch (e) {
      setExcluindo(null);
      console.warn('Falha ao excluir notificacao:', e);
    } finally {
      setConfirmando(false);
    }
  }

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho
        titulo="Notificações"
        subtitulo={
          naoLidas > 0
            ? `${naoLidas} não lida${naoLidas === 1 ? '' : 's'}`
            : 'Tudo em dia por aqui.'
        }
        acao={
          naoLidas > 0 ? (
            <Botao
              titulo="Marcar todas"
              icone="checkmark-done"
              variante="secundario"
              compacto
              ocupado={marcandoTodas}
              aoTocar={marcarTodas}
            />
          ) : undefined
        }
      />

      {erro ? <Aviso texto={erro} /> : null}

      <Seletor
        opcoes={[
          { value: 'todas', label: `Todas (${dados.length})` },
          { value: 'nao_lidas', label: `Não lidas (${naoLidas})` },
        ]}
        valor={filtro}
        aoEscolher={setFiltro}
      />

      {filtradas.length === 0 ? (
        <EstadoVazio
          icone="notifications-off-outline"
          titulo={filtro === 'nao_lidas' ? 'Nenhuma não lida' : 'Nenhuma notificação'}
          descricao="As notificações do sistema aparecem aqui."
        />
      ) : (
        <View style={proprios.lista}>
          {filtradas.map((n) => {
            const aparencia = APARENCIA[n.tipo] ?? APARENCIA.Sistema;
            return (
              <Pressable key={n.id_notificacao} onPress={() => marcarComoLida(n)}>
                <Cartao style={[proprios.cartao, !n.lida && proprios.naoLida]}>
                  <View style={[proprios.icone, { backgroundColor: aparencia.fundo }]}>
                    <Ionicons name={aparencia.icone} size={17} color={aparencia.cor} />
                  </View>

                  <View style={ui.flex1}>
                    <Text style={[proprios.mensagem, !n.lida && proprios.mensagemNaoLida]}>
                      {n.mensagem}
                    </Text>
                    <Text style={proprios.meta}>
                      {n.tipo} · {formatarTempoRelativo(n.data_notificacao)}
                    </Text>
                  </View>

                  <View style={proprios.direita}>
                    {!n.lida ? <View style={proprios.pontoNaoLida} /> : null}
                    <BotaoIcone
                      icone="trash-outline"
                      cor={MyCash.danger}
                      aoTocar={() => setExcluindo(n)}
                    />
                  </View>
                </Cartao>
              </Pressable>
            );
          })}
        </View>
      )}

      <ModalConfirmacao
        visivel={excluindo !== null}
        titulo="Excluir notificação"
        mensagem="A notificação será removida permanentemente."
        aoConfirmar={confirmarExclusao}
        aoCancelar={() => setExcluindo(null)}
        confirmando={confirmando}
      />
    </Tela>
  );
}

const proprios = StyleSheet.create({
  lista: { gap: 8 },
  cartao: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  naoLida: { borderColor: 'rgba(16,185,129,0.28)', backgroundColor: MyCash.surface3 },
  icone: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mensagem: { fontSize: 14, color: MyCash.textDim, lineHeight: 19 },
  mensagemNaoLida: { color: MyCash.text, fontWeight: '600' },
  meta: { fontSize: 11.5, color: MyCash.textMute, marginTop: 3 },
  direita: { alignItems: 'center', gap: 7 },
  pontoNaoLida: { width: 7, height: 7, borderRadius: 4, backgroundColor: MyCash.accent },
});
