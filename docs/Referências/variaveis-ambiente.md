# Referência: variáveis de ambiente

> Especificação completa de cada variável de ambiente lida pelo projeto, com
> formato, escopo de uso e arquivo do código que a referencia.

## Convenções

- Variáveis com prefixo `NEXT_PUBLIC_` são **embutidas no bundle do cliente
  no momento do build** — visíveis pelo navegador, exigem redeploy quando
  alteradas.
- Variáveis sem o prefixo são **server-only**, lidas em runtime, nunca
  enviadas ao cliente.
- Em desenvolvimento são lidas de `.env.local` (gitignored); em produção, do
  painel de Environment Variables da Vercel.

## Variáveis Supabase

### `NEXT_PUBLIC_SUPABASE_URL`

| | |
|---|---|
| **Obrigatória** | Sim |
| **Escopo** | Client + Server |
| **Formato** | URL HTTPS, ex.: `https://xxxxxxxx.supabase.co` |
| **Origem** | Supabase → Project Settings → API → Project URL |
| **Usada em** | `src/lib/supabase/{client,server,middleware,service}.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts` |

Endereço público da API do projeto Supabase. Sem barra no final.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

| | |
|---|---|
| **Obrigatória** | Sim |
| **Escopo** | Client + Server |
| **Formato** | JWT (string longa começando com `eyJ...`) |
| **Origem** | Supabase → Project Settings → API → `anon` / `public` |
| **Usada em** | `src/lib/supabase/{client,server,middleware}.ts`, `src/middleware.ts`, `src/app/auth/callback/route.ts` |

Chave anônima. Por desenho pública — pode ir pro bundle do navegador. Só
funciona em combinação com Row Level Security configurada no banco.

### `SUPABASE_SERVICE_ROLE_KEY`

| | |
|---|---|
| **Obrigatória** | Sim (para rotas server-side de ingest) |
| **Escopo** | Server-only |
| **Formato** | JWT (string longa começando com `eyJ...`) |
| **Origem** | Supabase → Project Settings → API → `service_role` |
| **Usada em** | `src/lib/supabase/service.ts` (consumido pelo webhook Pluggy e sync) |

> **⚠️ Atenção**: bypassa Row Level Security. Acesso total ao banco. Nunca
> exponha em cliente, screenshots, commits ou logs. Se vazar, rotacione
> imediatamente em Supabase → Project Settings → API.

## Variáveis Pluggy (Open Finance)

### `PLUGGY_CLIENT_ID`

| | |
|---|---|
| **Obrigatória** | Apenas se usar Pluggy |
| **Escopo** | Server-only |
| **Formato** | UUID |
| **Origem** | [dashboard.pluggy.ai](https://dashboard.pluggy.ai) → Application |
| **Usada em** | `src/lib/pluggy/client.ts` |

### `PLUGGY_CLIENT_SECRET`

| | |
|---|---|
| **Obrigatória** | Apenas se usar Pluggy |
| **Escopo** | Server-only |
| **Formato** | string longa |
| **Origem** | [dashboard.pluggy.ai](https://dashboard.pluggy.ai) → Application |
| **Usada em** | `src/lib/pluggy/client.ts` |

> Mesma regra de segurança da `SUPABASE_SERVICE_ROLE_KEY` — não expor.

### `NEXT_PUBLIC_APP_URL`

| | |
|---|---|
| **Obrigatória** | Apenas se usar Pluggy |
| **Escopo** | Client + Server |
| **Formato** | URL absoluta, ex.: `https://mycash.vercel.app` ou `http://localhost:3000` |
| **Usada em** | `src/app/api/pluggy/connect-token/route.ts` (constrói `webhookUrl`) |

URL pública do app, usada para construir o endpoint de webhook que a Pluggy
chama (`${NEXT_PUBLIC_APP_URL}/api/pluggy/webhook`). Em dev pode ficar como
`http://localhost:3000`, mas o webhook só funciona em produção (Pluggy
precisa acessar de fora).

## Tabela-resumo

| Variável | Cliente? | Obrigatória | Sensível |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | sim | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | sim | não |
| `SUPABASE_SERVICE_ROLE_KEY` | **não** | sim | **alta** |
| `PLUGGY_CLIENT_ID` | não | só Pluggy | média |
| `PLUGGY_CLIENT_SECRET` | não | só Pluggy | **alta** |
| `NEXT_PUBLIC_APP_URL` | sim | só Pluggy | não |

## Validação de presença

Apenas o `service.ts` valida explicitamente a presença das variáveis:

```ts
// src/lib/supabase/service.ts
if (!url || !serviceKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente')
}
```

Os demais clientes usam `process.env.X!` (non-null assertion) e contam com a
validação interna do `@supabase/ssr`, que lança
`"@supabase/ssr: Your project's URL and API key are required to create a Supabase client!"`
se a URL ou a key vier vazia/`undefined`.

## Receitas relacionadas

- [Como configurar as variáveis de ambiente](../How-tos/como-configurar-variaveis-ambiente.md)
- [Primeiro setup do projeto](../Tutoriais/01-primeiro-setup.md)
