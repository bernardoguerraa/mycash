# Tutorial: primeiro setup do MyCash

> Objetivo: ao final deste tutorial você terá o MyCash rodando localmente em
> http://localhost:3000, conectado a um projeto Supabase próprio, com cadastro
> e login funcionando.

Este tutorial é para quem nunca rodou o projeto antes. Não é necessário
conhecimento prévio de Next.js ou Supabase — siga os passos na ordem.

## O que você vai precisar

- **Node.js 20+** instalado ([nodejs.org](https://nodejs.org))
- **Git** instalado
- Uma conta gratuita no **Supabase** ([supabase.com](https://supabase.com))
- Um editor de código (VS Code recomendado)

## Passo 1 — Clonar o repositório

Abra o terminal e rode:

```bash
git clone https://github.com/bernardoguerraa/mycash.git
cd mycash
```

## Passo 2 — Instalar dependências

```bash
npm ci
```

Deve aparecer algo como `added 471 packages`. Se der erro, confirme com
`node --version` que você está na versão 20 ou superior.

## Passo 3 — Criar um projeto no Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) e faça login
2. Clique em **New project**
3. Escolha:
   - **Name**: `mycash-dev` (ou outro)
   - **Database password**: anote em local seguro
   - **Region**: `South America (São Paulo)` para menor latência
4. Clique em **Create new project** e espere ~2 minutos até o projeto ficar pronto

## Passo 4 — Pegar as credenciais do Supabase

Com o projeto criado, vá em **Project Settings → API**. Você vai precisar de:

- **Project URL** (algo como `https://xxxxxxxx.supabase.co`)
- **anon public** key (chave longa começando com `eyJ...`)
- **service_role** key (outra chave longa — atenção: é segredo, não compartilhe)

## Passo 5 — Criar o arquivo `.env.local`

Na raiz do projeto, crie um arquivo chamado `.env.local` com este conteúdo
(substituindo pelos valores reais do passo 4):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

> **Atenção**: o `.env.local` está no `.gitignore` e nunca deve ser commitado.

## Passo 6 — Criar as tabelas do banco

Ainda no painel Supabase, vá em **SQL Editor → New query** e cole o conteúdo
do arquivo [`docs/Referências/schema-banco.md`](../Referências/) (será adicionado
em entrega futura) — ou use o assistente do Supabase para criar as tabelas
descritas em `src/types/database.ts`.

> **Nota**: Em uma próxima entrega, as migrations completas estarão em
> `supabase/migrations/`. Por ora a migration do Pluggy
> (`20260417_pluggy_integration.sql`) já existe e cobre as tabelas
> `pluggy_connections` e `pluggy_webhook_events`.

## Passo 7 — Subir o projeto

```bash
npm run dev
```

Deve aparecer:

```
   ▲ Next.js 14.2.35
   - Local:   http://localhost:3000
   ✓ Ready in ~2s
```

Abra http://localhost:3000 no navegador.

## Passo 8 — Criar sua primeira conta

1. Você verá a tela de login. Clique em **Cadastrar-se**
2. Preencha nome, e-mail e senha (mínimo 6 caracteres)
3. Clique em **Criar conta**
4. Dependendo da configuração do Supabase, você precisará confirmar o e-mail —
   verifique sua caixa de entrada e clique no link.
5. Faça login com o e-mail e senha criados

Ao logar você cai no `/dashboard`. Com banco vazio você verá saldos zerados e
listas vazias. Cadastre uma conta bancária em **Contas → Adicionar conta** e
uma transação em **Transações → Nova transação** para popular o dashboard.

## Resultado esperado

- ✅ Projeto rodando em http://localhost:3000
- ✅ Conta criada e logada
- ✅ Dashboard carregando (mesmo que vazio)

## Próximos passos

- Para entender por que cada peça da stack foi escolhida, leia
  [`docs/Explanações/01-stack-frontend.md`](../Explanações/01-stack-frontend.md)
- Para implementar uma feature, veja o tutorial `02-primeira-feature.md`
  (entrega futura)
- Para tarefas específicas (deploy, migrations), consulte os
  [How-tos](../How-tos/)

## Problemas comuns

| Sintoma | Causa provável |
|---|---|
| `Error: @supabase/ssr: Your project's URL and API key are required` | `.env.local` faltando ou variáveis com nomes errados |
| `Failed to fetch` na tela de cadastro | Projeto Supabase pausado (free tier pausa após ~7 dias sem uso) — restaurar no painel |
| Build falha com `@typescript-eslint/no-explicit-any` | Rodar `npm run lint` localmente para ver os erros antes do deploy |
