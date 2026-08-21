import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. Confira o mobile/.env.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // No mobile a sessao vive no AsyncStorage; no web o @supabase/ssr usa cookie.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Nao ha URL de callback para ler em app nativo.
    detectSessionInUrl: false,
  },
});
