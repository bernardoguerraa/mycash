# MyCash

Plataforma de gestão financeira pessoal com sincronização automática de contas via Open Finance, controle de transações, metas financeiras e lembretes de pagamentos.

## Objetivos

- Centralizar a visão financeira do usuário (saldos, receitas, despesas, metas) em uma única interface
- Reduzir o trabalho manual de lançamento de transações por meio de integração com Open Finance (Pluggy)
- Apresentar a saúde financeira de forma compreensível, com gráficos e indicadores mensais
- Notificar o usuário sobre vencimentos e desvios de orçamento

## Selling-points

- **Multi-conta**: agrega contas-corrente, poupança, cartões e investimentos em um único dashboard
- **Open Finance brasileiro**: integração com Pluggy cobre os principais bancos do país
- **Web responsivo**: dark UI desenhada no Figma, navegação mobile-friendly
- **Server-side rendering**: dados sensíveis ficam server-side (Next.js App Router), reduzindo exposição no cliente
- **Row Level Security**: isolamento por usuário garantido no banco (Supabase Postgres)

## Funcionalidades principais

| Área | O que faz |
|---|---|
| **Autenticação** | Cadastro e login por e-mail/senha (Supabase Auth), recuperação de senha, callback OAuth |
| **Dashboard** | Saldo total agregado, receitas/despesas do mês, metas ativas, próximos lembretes, transações recentes, gráfico de 6 meses |
| **Transações** | CRUD completo, filtros por tipo/categoria/conta, busca por descrição |
| **Contas bancárias** | Cadastro manual + sincronização via Pluggy (Open Finance) |
| **Metas financeiras** | Criação, acompanhamento de progresso, adição parcial de valor |
| **Lembretes** | Contas a pagar/receber com data de vencimento e valor previsto |
| **Notificações** | Eventos do sistema (metas, lembretes, alertas de saldo) |

## Stack

**Front-end**
- [Next.js 14.2](https://nextjs.org) (App Router) + [React 18](https://react.dev)
- [TypeScript 5](https://www.typescriptlang.org)
- [Tailwind CSS 3.4](https://tailwindcss.com)
- [Recharts](https://recharts.org) para gráficos
- [Lucide React](https://lucide.dev) para ícones
- [date-fns](https://date-fns.org) para manipulação de datas

**Back-end / Persistência**
- [Supabase](https://supabase.com) — Auth + Postgres (com Row Level Security)
- Next.js API Route Handlers como camada REST (`src/app/api/`)

**Integrações**
- [Pluggy SDK](https://pluggy.ai) — Open Finance (sincronização de contas e transações)

**Ferramentas**
- ESLint 8 + `eslint-config-next`
- PostCSS 8
- GitHub Actions (typecheck + lint a cada push)
- Vercel para deploy contínuo

## Setup

### Pré-requisitos
- Node.js 20+
- npm 10+
- Conta no Supabase (gratuita) com um projeto criado

### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/bernardoguerraa/mycash.git
   cd mycash
   ```

2. **Instale as dependências**
   ```bash
   npm ci
   ```

3. **Configure as variáveis de ambiente**

   Crie um arquivo `.env.local` na raiz do projeto com:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-chave-anon>
   SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role>
   ```

   Opcionais (para a integração Pluggy):

   ```env
   PLUGGY_CLIENT_ID=<seu-client-id-pluggy>
   PLUGGY_CLIENT_SECRET=<seu-client-secret-pluggy>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Veja [`docs/Referências/variaveis-ambiente.md`](./docs/Referências/variaveis-ambiente.md) para a especificação completa.

4. **Rode em modo desenvolvimento**
   ```bash
   npm run dev
   ```

   O app sobe em http://localhost:3000.

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Build de produção (lint + typecheck + compilação) |
| `npm run start` | Roda o build de produção |
| `npm run lint` | Roda ESLint |
| `npx tsc --noEmit` | Apenas typecheck |

## Documentação

A documentação segue o framework [Diátaxis](https://diataxis.fr) e está em [`docs/`](./docs):

- [`docs/Tutoriais/`](./docs/Tutoriais/) — aprendizado guiado (primeiro setup, primeira feature)
- [`docs/How-tos/`](./docs/How-tos/) — receitas para tarefas comuns (configurar envs, criar migration)
- [`docs/Referências/`](./docs/Referências/) — especificações (rotas, schema, variáveis de ambiente)
- [`docs/Explanações/`](./docs/Explanações/) — decisões de stack e arquitetura

## Estrutura do projeto

```
src/
├── app/
│   ├── (dashboard)/          # rotas autenticadas (dashboard, transacoes, contas, ...)
│   ├── api/pluggy/           # rotas REST da integração Pluggy
│   ├── auth/callback/        # callback OAuth/e-mail
│   ├── login/                # tela de login
│   ├── registro/             # tela de cadastro
│   └── recuperar-senha/      # recuperação de senha
├── components/               # componentes React por área (contas, transacoes, metas, ...)
├── lib/
│   ├── supabase/             # clients (browser/server/service) + middleware
│   └── pluggy/               # client + sync + mapping
├── types/                    # interfaces (incluindo schema do banco)
└── middleware.ts             # refresh de sessão Supabase

docs/                         # documentação Diátaxis
supabase/migrations/          # migrations SQL do Supabase
```

## Status do projeto

- ✅ Front-end implementado a partir do design Figma
- ✅ **Layout responsivo** — sidebar vira drawer no mobile, grids adaptam por breakpoint
- ✅ Autenticação completa (cadastro, confirmação de e-mail, login, reset de senha)
- ✅ Dashboard com dados reais (saldo, receitas/despesas, metas, lembretes)
- ✅ CRUD de transações, contas, metas, lembretes, notificações
- ✅ **API REST** — 5 recursos × 4-5 métodos = 20+ endpoints ([docs](./docs/Referências/rotas-api.md))
- ✅ **Repository pattern** para isolar domínio da persistência ([por quê](./docs/Explanações/03-repository-pattern.md))
- ✅ **Row Level Security** — isolamento por usuário garantido no banco
- ✅ Sincronização Pluggy (Open Finance) codada + migration aplicada
- ✅ Deploy contínuo na Vercel + CI (typecheck + lint + testes) em cada push
- ✅ Testes automatizados com Vitest (19+ testes cobrindo API client e Repositories)
- ✅ Cron de keepalive Supabase com auto-restore via Management API
- ✅ Alternância tema claro/escuro persistente
- 🚧 App móvel nativo (opcional — o web já é responsivo)

## Equipe

| Membro | GitHub | Contato |
|---|---|---|
| Bernardo Guerra | [@bernardoguerraa](https://github.com/bernardoguerraa) | _(adicionar contato)_ |
| Frederico Pires | [@Fredgomes28](https://github.com/Fredgomes28) | [d2023006205@unifei.edu.br](mailto:d2023006205@unifei.edu.br) |
| Luiz Otávio | [@luizin004](https://github.com/luizin004) | [d2023009833@unifei.edu.br](mailto:d2023009833@unifei.edu.br) |
| Matheus Bueno | [@mbu3no](https://github.com/mbu3no) | [d2023013120@unifei.edu.br](mailto:d2023013120@unifei.edu.br) · [LinkedIn](https://www.linkedin.com/in/matheusltbueno/) |
| Rodrigo Amorim | — | [d2023010861@unifei.edu.br](mailto:d2023010861@unifei.edu.br) |

## Contribuição

Contribuições são bem-vindas. Para reportar um problema ou propor uma melhoria, abra uma issue ou pull request.

## Licença

Este projeto está sob licença MIT.
