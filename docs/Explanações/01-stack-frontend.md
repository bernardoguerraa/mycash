# Stack de Frontend

## Decisão

O frontend do MyCash é construído em **Next.js 14 (App Router) + React 18 + TypeScript +
Tailwind CSS**, integrado ao **Supabase** (auth + Postgres) e à **Pluggy SDK** (Open Finance).

## Por que Next.js 14 (App Router)

- **Server Components por padrão**: dados sensíveis (saldo, transações) ficam server-side, reduzindo o JS enviado ao cliente
- **Roteamento por arquivo + route groups**: `src/app/(dashboard)/` agrupa rotas autenticadas sem afetar a URL
- **Middleware nativo**: usado em `src/lib/supabase/middleware.ts` para refresh de sessão e proteção de rotas
- **Deploy first-class na Vercel**: a equipe já usa Vercel para deploy contínuo

## Por que TypeScript

- Schema do banco em `src/types/database.ts` gera autocompletar e checagem em todas as queries
- Reduz bugs em runtime — o pipeline de CI já valida tipos via `tsc --noEmit`

## Por que Tailwind CSS

- Velocidade de prototipagem alinhada com o design system dark fintech
- `tailwind.config.ts` centraliza cores e tipografia — fonte única de verdade
- Sem CSS-in-JS, então nenhum runtime extra no bundle do cliente

## Por que Supabase

- Auth + Postgres + Storage em um único provedor com SDK TypeScript
- Row Level Security (RLS) cobre o requisito de isolamento por usuário sem código extra na API
- Integração com SSR via `@supabase/ssr` (já adotada nos arquivos `src/lib/supabase/*`)

## Por que Pluggy

- Provedor brasileiro de Open Finance — cobre os bancos que o público-alvo usa
- SDK em Node fácil de plugar em rotas de API (`src/app/api/pluggy/`)
- Webhook permite sincronização incremental de transações

## Alternativas consideradas

| Alternativa            | Por que não foi escolhida                                        |
|------------------------|------------------------------------------------------------------|
| Vite + React Router    | Já era a stack inicial, mas faltava SSR e middleware             |
| Remix                  | Menor adoção interna, ecossistema menor                          |
| Firebase (em vez do Supabase) | Modelo NoSQL não casa com relacionamentos do domínio financeiro |
| Belvo / Klavi (em vez do Pluggy) | Pluggy tem cobertura maior dos bancos brasileiros relevantes |
