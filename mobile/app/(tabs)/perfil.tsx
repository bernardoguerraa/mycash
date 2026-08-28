import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Carregando,
  Cartao,
  CartaoEstatistica,
  Etiqueta,
  ModalConfirmacao,
  Seletor,
  Tela,
  useEstilos,
} from '@/components/ui/kit';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { perfilRepository } from '@/lib/repositories';
import { supabase } from '@/lib/supabase';
import type { Perfil, StatusConta } from '@/types/database';

const VAZIO: Perfil = {
  usuario: null,
  email: '',
  stats: { totalContas: 0, totalTransacoes: 0, totalMetas: 0 },
};

const carregar = () => perfilRepository.carregar();

function corDoStatus(status: StatusConta, cores: Cores) {
  if (status === 'Ativo') return { cor: cores.accentLight, fundo: cores.accentMuted };
  if (status === 'Bloqueado') return { cor: cores.danger, fundo: cores.dangerMuted };
  return { cor: cores.textDim, fundo: cores.surface3 };
}

export default function PerfilScreen() {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores, modo, definirModo } = useTema();

  const { dados, carregando, atualizando, erro, aoPuxar, recarregar } = useRecurso(carregar, VAZIO);

  const [editandoNome, setEditandoNome] = useState(false);
  const [nome, setNome] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msgNome, setMsgNome] = useState<{ ok: boolean; texto: string } | null>(null);

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null);

  const [confirmandoSaida, setConfirmandoSaida] = useState(false);

  const usuario = dados.usuario;
  const plano = usuario?.plano ?? 'Free';
  const statusConta = usuario?.status_conta ?? 'Ativo';
  const status = corDoStatus(statusConta, cores);

  const dataCadastro = usuario?.data_cadastro
    ? new Date(usuario.data_cadastro).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '--';

  const iniciais = (usuario?.nome_completo || dados.email || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');

  function abrirEdicaoNome() {
    setNome(usuario?.nome_completo ?? '');
    setMsgNome(null);
    setEditandoNome(true);
  }

  async function salvarNome() {
    if (!nome.trim()) {
      setMsgNome({ ok: false, texto: 'O nome não pode estar vazio.' });
      return;
    }

    setSalvandoNome(true);
    setMsgNome(null);
    try {
      await perfilRepository.renomear(nome);
      setEditandoNome(false);
      setMsgNome({ ok: true, texto: 'Nome atualizado com sucesso.' });
      await recarregar();
    } catch (e) {
      setMsgNome({ ok: false, texto: e instanceof Error ? e.message : 'Erro ao salvar o nome.' });
    } finally {
      setSalvandoNome(false);
    }
  }

  /**
   * Troca de senha continua no @supabase/supabase-js, como no web: e servico
   * de identidade, nao recurso da nossa API. Todo o resto desta tela passa
   * por /api/perfil.
   */
  async function trocarSenha() {
    setMsgSenha(null);

    if (!novaSenha || !confirmaSenha) {
      setMsgSenha({ ok: false, texto: 'Preencha os dois campos.' });
      return;
    }
    if (novaSenha.length < 6) {
      setMsgSenha({ ok: false, texto: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (novaSenha !== confirmaSenha) {
      setMsgSenha({ ok: false, texto: 'As senhas não coincidem.' });
      return;
    }

    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setSalvandoSenha(false);

    if (error) {
      setMsgSenha({ ok: false, texto: error.message });
      return;
    }

    setNovaSenha('');
    setConfirmaSenha('');
    setMsgSenha({ ok: true, texto: 'Senha alterada com sucesso.' });
  }

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho titulo="Meu perfil" subtitulo="Suas informações e configurações." />

      {erro ? <Aviso texto={erro} /> : null}

      <Cartao style={proprios.cartaoPerfil}>
        <View style={proprios.avatar}>
          <Text style={proprios.avatarTexto}>{iniciais || '?'}</Text>
        </View>

        <Text style={proprios.nome}>{usuario?.nome_completo || 'Sem nome cadastrado'}</Text>
        <Text style={proprios.email}>{dados.email}</Text>

        <View style={proprios.etiquetas}>
          <Etiqueta
            texto={plano}
            cor={plano === 'Premium' ? cores.warn : cores.textDim}
            fundo={plano === 'Premium' ? cores.warnMuted : cores.surface3}
          />
          <Etiqueta texto={statusConta} cor={status.cor} fundo={status.fundo} />
        </View>

        <View style={proprios.desde}>
          <Ionicons name="calendar-outline" size={13} color={cores.textMute} />
          <Text style={proprios.desdeTexto}>Membro desde {dataCadastro}</Text>
        </View>
      </Cartao>

      <View style={ui.linha}>
        <CartaoEstatistica
          rotulo="Contas"
          valor={String(dados.stats.totalContas)}
          icone="wallet-outline"
          cor={cores.info}
        />
        <CartaoEstatistica
          rotulo="Transações"
          valor={String(dados.stats.totalTransacoes)}
          icone="swap-horizontal-outline"
          cor={cores.accentLight}
        />
        <CartaoEstatistica
          rotulo="Metas"
          valor={String(dados.stats.totalMetas)}
          icone="flag-outline"
          cor={cores.roxo}
        />
      </View>

      {/* Nome */}
      <Cartao>
        <View style={proprios.secaoTopo}>
          <Ionicons name="person-outline" size={16} color={cores.accentLight} />
          <Text style={proprios.secaoTitulo}>Nome completo</Text>
        </View>

        {msgNome ? <Aviso texto={msgNome.texto} tom={msgNome.ok ? 'info' : 'erro'} /> : null}

        {editandoNome ? (
          <>
            <Campo rotulo="Nome" value={nome} onChangeText={setNome} placeholder="Seu nome" />
            <View style={ui.linha}>
              <View style={ui.flex1}>
                <Botao
                  titulo="Cancelar"
                  variante="secundario"
                  compacto
                  aoTocar={() => setEditandoNome(false)}
                />
              </View>
              <View style={ui.flex1}>
                <Botao titulo="Salvar" compacto aoTocar={salvarNome} ocupado={salvandoNome} />
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={proprios.valorCampo}>
              {usuario?.nome_completo || 'Sem nome cadastrado'}
            </Text>
            <Botao
              titulo="Editar nome"
              icone="pencil"
              variante="secundario"
              compacto
              aoTocar={abrirEdicaoNome}
              desabilitado={!usuario}
            />
          </>
        )}
      </Cartao>

      {/* Senha */}
      <Cartao>
        <View style={proprios.secaoTopo}>
          <Ionicons name="lock-closed-outline" size={16} color={cores.accentLight} />
          <Text style={proprios.secaoTitulo}>Alterar senha</Text>
        </View>

        {msgSenha ? <Aviso texto={msgSenha.texto} tom={msgSenha.ok ? 'info' : 'erro'} /> : null}

        <Campo
          rotulo="Nova senha"
          value={novaSenha}
          onChangeText={setNovaSenha}
          placeholder="Mínimo de 6 caracteres"
          secureTextEntry
          autoCapitalize="none"
        />

        <Campo
          rotulo="Confirmar nova senha"
          value={confirmaSenha}
          onChangeText={setConfirmaSenha}
          placeholder="Repita a nova senha"
          secureTextEntry
          autoCapitalize="none"
        />

        <Botao titulo="Alterar senha" compacto aoTocar={trocarSenha} ocupado={salvandoSenha} />
      </Cartao>

      {/* Aparencia — equivalente ao ThemeToggle do web. */}
      <Cartao>
        <View style={proprios.secaoTopo}>
          <Ionicons name="contrast-outline" size={16} color={cores.accent} />
          <Text style={proprios.secaoTitulo}>Aparência</Text>
        </View>

        <Seletor
          opcoes={[
            { value: 'sistema', label: 'Do sistema' },
            { value: 'claro', label: 'Claro' },
            { value: 'escuro', label: 'Escuro' },
          ]}
          valor={modo}
          aoEscolher={definirModo}
        />

        <Text style={proprios.aparenciaNota}>
          &quot;Do sistema&quot; acompanha o ajuste do aparelho. A escolha fica salva no
          celular.
        </Text>
      </Cartao>

      <Botao
        titulo="Sair da conta"
        icone="log-out-outline"
        variante="perigo"
        aoTocar={() => setConfirmandoSaida(true)}
      />

      <ModalConfirmacao
        visivel={confirmandoSaida}
        titulo="Sair da conta"
        mensagem="Você precisará entrar novamente com e-mail e senha."
        aoConfirmar={() => {
          setConfirmandoSaida(false);
          supabase.auth.signOut();
        }}
        aoCancelar={() => setConfirmandoSaida(false)}
      />
    </Tela>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  cartaoPerfil: { alignItems: 'center', gap: 7, paddingVertical: 22 },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: c.accentMuted,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: { fontSize: 25, fontWeight: '800', color: c.accentLight },
  nome: { fontSize: 18, fontWeight: '700', color: c.text, marginTop: 4 },
  email: { fontSize: 13, color: c.textDim },
  etiquetas: { flexDirection: 'row', gap: 7, marginTop: 4 },
  desde: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  desdeTexto: { fontSize: 11.5, color: c.textMute },

  secaoTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: c.text },
  valorCampo: { fontSize: 14.5, color: c.textDim },
  aparenciaNota: { fontSize: 11.5, color: c.textMute, lineHeight: 16 },
  })
);
