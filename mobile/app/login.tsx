import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BotaoTema } from '@/components/ui/kit';

import type { Cores } from '@/constants/mycash';
import { criarUseEstilos } from '@/lib/estilos';
import { useTema } from '@/lib/tema';
import { supabase } from '@/lib/supabase';

/**
 * Cadastro e recuperacao de senha ficam no web: os dois fluxos dependem de
 * confirmacao por e-mail, que o Next.js ja resolve. O app so encaminha.
 */
const SITE = 'https://mycash-nu.vercel.app';

const abrirCadastro = () => WebBrowser.openBrowserAsync(`${SITE}/registro`);
const abrirRecuperacao = () => WebBrowser.openBrowserAsync(`${SITE}/recuperar-senha`);

export default function LoginScreen() {
  const styles = useEstilos();
  const { cores } = useTema();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro(null);

    if (!email.trim() || !senha) {
      setErro('Preencha e-mail e senha.');
      return;
    }

    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setEnviando(false);

    // O _layout redireciona sozinho quando a sessao aparece.
    if (error) {
      setErro(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : error.message
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Da para trocar o tema antes mesmo de entrar. */}
      <View style={styles.barraTopo}>
        <BotaoTema />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          <View style={styles.marca}>
            <View style={styles.logo}>
              <Text style={styles.logoTexto}>M</Text>
            </View>
            <Text style={styles.titulo}>MyCash</Text>
            <Text style={styles.subtitulo}>Suas finanças em um só lugar</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.campo}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="voce@email.com"
                placeholderTextColor={cores.textMute}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                inputMode="email"
              />
            </View>

            <View style={styles.campo}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={senha}
                onChangeText={setSenha}
                placeholder="••••••••"
                placeholderTextColor={cores.textMute}
                secureTextEntry
                onSubmitEditing={entrar}
                returnKeyType="go"
              />
            </View>

            {erro && (
              <View style={styles.erroBox}>
                <Text style={styles.erroTexto}>{erro}</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.botao, pressed && styles.botaoPressed]}
              onPress={entrar}
              disabled={enviando}>
              {enviando ? (
                <ActivityIndicator color={cores.sobreAccent} />
              ) : (
                <Text style={styles.botaoTexto}>Entrar</Text>
              )}
            </Pressable>

            <View style={styles.rodape}>
              <Text style={styles.rodapeTexto}>Ainda não tem conta? </Text>
              <Text style={styles.rodapeLink} onPress={abrirCadastro}>
                Cadastre-se no site
              </Text>
            </View>

            <Text style={styles.rodapeTexto} onPress={abrirRecuperacao}>
              Esqueci minha senha
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useEstilos = criarUseEstilos((c: Cores) =>
  StyleSheet.create({
  safe: { flex: 1, backgroundColor: c.surface0 },
  barraTopo: { alignItems: 'flex-end', paddingHorizontal: 18, paddingTop: 8 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 40 },

  marca: { alignItems: 'center', gap: 10 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTexto: { fontSize: 34, fontWeight: '800', color: c.sobreAccent },
  titulo: { fontSize: 30, fontWeight: '700', color: c.text, letterSpacing: -0.5 },
  subtitulo: { fontSize: 14, color: c.textDim },

  form: { gap: 16 },
  campo: { gap: 7 },
  label: { fontSize: 13, fontWeight: '600', color: c.textDim },
  input: {
    backgroundColor: c.surface2,
    borderWidth: 1,
    borderColor: c.edge2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: c.text,
  },

  erroBox: {
    backgroundColor: c.dangerMuted,
    borderWidth: 1,
    borderColor: c.danger,
    borderRadius: 10,
    padding: 12,
  },
  erroTexto: { color: c.danger, fontSize: 13.5 },

  botao: {
    backgroundColor: c.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  botaoPressed: { backgroundColor: c.accentDark },
  botaoTexto: { color: c.sobreAccent, fontSize: 16, fontWeight: '700' },

  rodape: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  rodapeTexto: { textAlign: 'center', color: c.textMute, fontSize: 13.5 },
  rodapeLink: { color: c.accentLight, fontSize: 13.5, fontWeight: '600' },
  })
);
