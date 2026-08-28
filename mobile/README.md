# MyCash — app mobile

App React Native (Expo SDK 54) do MyCash. Consome a **API REST do Next.js**
que já servia o app web — o mesmo backend, os mesmos endpoints.

## Arquitetura

```
telas (app/)
   ↓
repositories (lib/repositories.ts)   regras de domínio
   ↓
api (lib/api.ts)                     HTTP + Authorization: Bearer
   ↓
/api/* do Next.js                    validações, RLS
   ↓
Supabase / Postgres
```

O app **não fala com o banco**. Todo dado de domínio passa pela API. O
`@supabase/supabase-js` fica só na autenticação (login, sessão, troca de
senha), que é serviço de identidade e não recurso REST.

Como o app se autentica: o web manda cookie de sessão; o app nativo guarda a
sessão no AsyncStorage e manda `Authorization: Bearer <access_token>`. Do
outro lado, `createClientFromRequest` (`src/lib/supabase/server.ts`) prefere o
cabeçalho e cai no cookie quando ele não existe — mesma rota, dois clientes.
A RLS continua filtrando por usuário no banco.

## Telas

| Tela | Rota | Endpoints |
|---|---|---|
| Login | `app/login.tsx` | Supabase Auth |
| Início (dashboard) | `app/(tabs)/index.tsx` | `GET /api/contas`, `/transacoes`, `/metas`, `/lembretes` |
| Transações | `app/(tabs)/transacoes.tsx` | CRUD `/api/transacoes` + `GET /api/contas` |
| Contas | `app/(tabs)/contas.tsx` | CRUD `/api/contas` |
| Metas | `app/(tabs)/metas.tsx` | CRUD `/api/metas` |
| Lembretes | `app/(tabs)/lembretes.tsx` | CRUD `/api/lembretes` |
| Notificações | `app/(tabs)/notificacoes.tsx` | `GET/PATCH/DELETE /api/notificacoes` |
| Perfil | `app/(tabs)/perfil.tsx` | `GET/PATCH /api/perfil` |
| Mais (hub) | `app/(tabs)/mais.tsx` | contadores |

O menu do web tem sete itens; a barra inferior mostra cinco e as três
restantes ficam atrás da aba **Mais**.

## Rodando

```bash
npm install
cp .env.example .env    # preencha com os valores do .env.local da raiz
npx expo start
```

- **Emulador Android:** `npx expo start --android`
- **Celular físico:** Expo Go + QR code. No Android use o scanner de dentro do
  Expo Go (a câmera nativa não abre). O eduroam bloqueia LAN — use hotspot do
  celular com o PC conectado nele.

### Apontando para a API

Por padrão o app consome a produção (`https://mycash-nu.vercel.app`), que
funciona de qualquer rede. Para usar o servidor local, rode `npm run dev` na
raiz e defina no `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

No emulador Android o host da máquina é `10.0.2.2`, não `localhost`. No
celular físico use o IP da máquina na rede (`http://192.168.x.x:3000`).

A aba **Mais** mostra qual base está em uso — útil para conferir na hora da
apresentação.

## Avisos

- O repositório **não pode** ficar dentro do OneDrive: o placeholder de
  sincronização quebra o `metro-file-map` no boot.
- O `tsconfig.json` da raiz precisa manter `"exclude": ["node_modules", "mobile"]`
  — o web usa React 18.3.1 e o mobile, React 19.1.0.
