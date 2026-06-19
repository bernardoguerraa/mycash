# Como configurar as variáveis de ambiente

> Receita para configurar as variáveis de ambiente do projeto, tanto
> localmente quanto no deploy da Vercel. Use também como roteiro de
> diagnóstico quando o app retorna **"Failed to fetch"** ou erros de auth.

**Pré-requisitos**
- Projeto Supabase criado (veja o [tutorial de primeiro setup](../Tutoriais/01-primeiro-setup.md) se ainda não tem)
- (Para Vercel) acesso ao painel do projeto na Vercel

## Variáveis usadas pelo projeto

Todos os nomes precisam ser **exatamente** estes — o código importa
`process.env.NEXT_PUBLIC_SUPABASE_URL`, etc., e qualquer divergência (por
exemplo, usar `VITE_SUPABASE_URL` como em projetos Vite) faz a variável virar
`undefined` em runtime.

| Variável | Obrigatória | Onde se usa |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Client + server (auth, queries) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | Client + server (auth pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | sim (rotas de ingest) | Server (webhook Pluggy, sync — bypassa RLS) |
| `PLUGGY_CLIENT_ID` | só Pluggy | Server (rotas `/api/pluggy/*`) |
| `PLUGGY_CLIENT_SECRET` | só Pluggy | Server (rotas `/api/pluggy/*`) |
| `NEXT_PUBLIC_APP_URL` | só Pluggy | Construir a URL de webhook |

Especificação detalhada de cada uma em
[`docs/Referências/variaveis-ambiente.md`](../Referências/variaveis-ambiente.md).

## Localmente — criar `.env.local`

1. Na raiz do projeto, crie um arquivo `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

2. Confirme que o `.gitignore` está cobrindo o arquivo:

   ```bash
   git check-ignore .env.local
   ```

   A saída deve ser `.env.local` — significa que o git vai ignorá-lo.

3. Reinicie o `npm run dev` (variáveis de ambiente são lidas no boot do servidor).

## Na Vercel — configurar pelo painel

1. Acesse [vercel.com](https://vercel.com), abra o projeto e vá em
   **Settings → Environment Variables**

2. Para cada variável da tabela acima, clique em **Add New** e preencha:
   - **Key**: o nome exato (ex: `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: o valor real
   - **Environments**: marque **Production**, **Preview** e **Development**

3. **Importante — disparar redeploy**: variáveis `NEXT_PUBLIC_*` são
   **embutidas no bundle no momento do build**. Adicionar ou alterar uma
   delas no painel **não afeta os deploys já feitos**. Você precisa:
   - Vá em **Deployments → ⋯ no último deploy → Redeploy**
   - Ou faça qualquer push pra `master` que dispara um novo build

   Variáveis server-only (sem prefixo `NEXT_PUBLIC_`) são lidas em runtime,
   então não precisam de redeploy — mas é prudente fazer um mesmo assim.

## Para integração com Pluggy

Além das variáveis Supabase, adicione as credenciais Pluggy obtidas em
[dashboard.pluggy.ai](https://dashboard.pluggy.ai):

```env
PLUGGY_CLIENT_ID=seu-client-id
PLUGGY_CLIENT_SECRET=seu-client-secret
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```

`NEXT_PUBLIC_APP_URL` deve ser a URL pública do app (usada para construir o
endpoint de webhook que a Pluggy chama).

## Diagnóstico — "Failed to fetch" na tela de cadastro

Se o cadastro/login retorna **"Failed to fetch"**:

1. **Abra DevTools (F12) → aba Network → tente o cadastro de novo.** Clique na
   request vermelha. A URL revela o problema:
   - Se for `https://xxxx.supabase.co/auth/v1/signup` falhando → o projeto
     Supabase está **pausado** (free tier pausa após ~7 dias sem uso).
     Restaure no painel Supabase clicando em **Restore project**.
   - Se a URL estiver malformada ou for `undefined/...` → variável está
     vazia/com nome errado.

2. **Confirme as variáveis na Vercel** (se for o site de produção):
   - Settings → Environment Variables
   - Os nomes têm que começar com `NEXT_PUBLIC_SUPABASE_*` (não `VITE_*`)
   - Após corrigir, **disparar redeploy** (variáveis `NEXT_PUBLIC_*` precisam de novo build)

3. **Se o erro for "Ocorreu um erro inesperado"** em vez de "Failed to fetch":
   provavelmente as variáveis estão vazias/`undefined` — o
   `createBrowserClient` lança erro antes mesmo de fazer a chamada.

## Segurança

- **Nunca commite** `.env.local`, screenshots ou prints com a `SUPABASE_SERVICE_ROLE_KEY`
  — ela bypassa Row Level Security e dá acesso total ao banco.
- Se uma chave for exposta acidentalmente, **rotacione imediatamente** em
  Supabase → Project Settings → API → **Reset service role key**.
- A `NEXT_PUBLIC_SUPABASE_ANON_KEY` é por desenho pública (vai pro bundle do
  navegador) — não é segredo, mas use-a apenas em conjunto com RLS bem
  configurado.
