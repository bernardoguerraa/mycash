import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Aviso,
  Cabecalho,
  Carregando,
  Cartao,
  Tela,
  useEstilos,
} from '@/components/ui/kit';
import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { useRecurso } from '@/hooks/use-recurso';
import { useAuth } from '@/lib/auth';
import { lembretesRepository, notificacoesRepository } from '@/lib/repositories';

const SITE = 'https://mycash-nu.vercel.app';
const BASE_API = process.env.EXPO_PUBLIC_API_URL ?? SITE;

type Contadores = { lembretesAtivos: number; naoLidas: number };
const VAZIO: Contadores = { lembretesAtivos: 0, naoLidas: 0 };

async function carregar(): Promise<Contadores> {
  const [lembretes, naoLidas] = await Promise.all([
    lembretesRepository.listar({ ativo: true }),
    notificacoesRepository.listar({ lida: false }),
  ]);
  return { lembretesAtivos: lembretes.length, naoLidas: naoLidas.length };
}

type IconeNome = ComponentProps<typeof Ionicons>['name'];

export default function MaisScreen() {
  const proprios = useProprios();
  const { cores } = useTema();

  const router = useRouter();
  const { session } = useAuth();
  const { dados, carregando, atualizando, erro, aoPuxar } = useRecurso(carregar, VAZIO);

  if (carregando) return <Carregando />;

  return (
    <Tela atualizando={atualizando} aoPuxar={aoPuxar}>
      <Cabecalho titulo="Mais" subtitulo="Demais telas e informações do app." />

      {erro ? <Aviso texto={erro} /> : null}

      <View style={proprios.lista}>
        <Atalho
          icone="notifications-outline"
          cor={cores.warn}
          fundo={cores.warnMuted}
          titulo="Lembretes"
          descricao="Contas a pagar e a receber"
          contador={dados.lembretesAtivos}
          aoTocar={() => router.push('/(tabs)/lembretes')}
        />

        <Atalho
          icone="mail-unread-outline"
          cor={cores.info}
          fundo={cores.infoMuted}
          titulo="Notificações"
          descricao="Avisos do sistema"
          contador={dados.naoLidas}
          aoTocar={() => router.push('/(tabs)/notificacoes')}
        />

        <Atalho
          icone="person-outline"
          cor={cores.accentLight}
          fundo={cores.accentMuted}
          titulo="Perfil"
          descricao="Seus dados, senha e sair da conta"
          aoTocar={() => router.push('/(tabs)/perfil')}
        />

        <Atalho
          icone="globe-outline"
          cor={cores.roxo}
          fundo={cores.roxoMuted}
          titulo="Abrir o MyCash no navegador"
          descricao="Relatórios e Open Finance ficam na versão web"
          aoTocar={() => WebBrowser.openBrowserAsync(SITE)}
        />
      </View>

      {/* Util na apresentacao: mostra de onde os dados estao vindo. */}
      <Cartao>
        <Text style={proprios.tecnicoTitulo}>Sobre esta build</Text>
        <Linha rotulo="Conectado como" valor={session?.user.email ?? '--'} />
        <Linha rotulo="API consumida" valor={`${BASE_API}/api`} />
        <Linha rotulo="Autenticação" valor="Supabase Auth · Bearer token" />
        <Text style={proprios.tecnicoNota}>
          Todas as telas leem e gravam pela API REST do Next.js. O acesso direto ao banco
          ficou só na autenticação.
        </Text>
      </Cartao>
    </Tela>
  );
}

function Atalho({
  icone,
  cor,
  fundo,
  titulo,
  descricao,
  contador,
  aoTocar,
}: {
  icone: IconeNome;
  cor: string;
  fundo: string;
  titulo: string;
  descricao: string;
  contador?: number;
  aoTocar: () => void;
}) {
  const ui = useEstilos();
  const proprios = useProprios();
  const { cores } = useTema();

  return (
    <Pressable onPress={aoTocar} style={({ pressed }) => pressed && { opacity: 0.7 }}>
      <Cartao style={proprios.atalho}>
        <View style={[proprios.icone, { backgroundColor: fundo }]}>
          <Ionicons name={icone} size={19} color={cor} />
        </View>

        <View style={ui.flex1}>
          <Text style={proprios.atalhoTitulo}>{titulo}</Text>
          <Text style={proprios.atalhoDescricao} numberOfLines={1}>
            {descricao}
          </Text>
        </View>

        {contador ? (
          <View style={proprios.selo}>
            <Text style={proprios.seloTexto}>{contador}</Text>
          </View>
        ) : null}

        <Ionicons name="chevron-forward" size={17} color={cores.textMute} />
      </Cartao>
    </Pressable>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  const proprios = useProprios();

  return (
    <View style={proprios.linhaTecnica}>
      <Text style={proprios.linhaRotulo}>{rotulo}</Text>
      <Text style={proprios.linhaValor} numberOfLines={1}>
        {valor}
      </Text>
    </View>
  );
}

const useProprios = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  lista: { gap: 9 },
  atalho: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  icone: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  atalhoTitulo: { fontSize: 14.5, fontWeight: '700', color: c.text },
  atalhoDescricao: { fontSize: 12, color: c.textMute, marginTop: 2 },
  selo: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontSize: 11.5, fontWeight: '800', color: '#04140d' },

  tecnicoTitulo: { fontSize: 14, fontWeight: '700', color: c.text, marginBottom: 2 },
  linhaTecnica: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  linhaRotulo: { fontSize: 12.5, color: c.textMute },
  linhaValor: { flex: 1, fontSize: 12.5, color: c.textDim, textAlign: 'right' },
  tecnicoNota: { fontSize: 11.5, color: c.textMute, lineHeight: 16, marginTop: 4 },
  })
);
