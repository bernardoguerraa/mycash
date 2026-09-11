# ADR 001 — Isolamento de estado nos testes de integração e contratos multicanal

**Status:** aceito
**Data:** 11/09/2026
**Contexto:** Aula 02 de ADS 4 (Testes de Integração e Contratos de API)

---

## 1. Contexto

Até aqui a suíte do MyCash é toda de unidade: 197 testes contra a camada de
domínio (`src/domain/`), com repositórios em memória e zero I/O. Isso cobre as
engrenagens, mas não prova que elas se encaixam quando existe um Postgres real
do outro lado — validação de tipo, `check` constraint, chave estrangeira,
`on delete cascade` e o que a RLS deixa ou não enxergar.

Duas decisões precisam ser registradas antes de escrever o primeiro teste de
integração.

---

## 2. Decisão 1 — Estratégia de isolamento de estado

### Alternativas consideradas

| Estratégia | Como funciona | Custo | Problema para o MyCash |
|---|---|---|---|
| **Rollback por teste** | abre transação no `beforeEach`, desfaz no `afterEach` | mais barato | O código de produção não recebe a conexão da transação: as rotas criam o próprio cliente Supabase. Testar exigiria injetar conexão em toda a camada de acesso — mudança grande, e só por causa do teste |
| **Truncate por teste** | apaga as tabelas entre casos | barato | Precisa respeitar a ordem das FKs, ou usar `truncate ... cascade` |
| **Banco por worker** | cada worker do Vitest recebe seu próprio database | mais caro na subida | Sozinho não isola: dentro do mesmo worker os testes continuam compartilhando estado |

### Decisão

**Banco por worker + truncate entre testes**, combinados. Um container
PostgreSQL só, com um database por worker do Vitest (`VITEST_WORKER_ID`)
criado a partir de um *template* com o schema já aplicado.

### Justificativa

- **Rollback foi descartado por acoplamento, não por desempenho.** Ele é a
  opção mais rápida, mas exige que o SUT use a mesma conexão da transação. As
  rotas do MyCash instanciam o cliente Supabase por requisição
  (`createClientFromRequest`); passar uma conexão até lá significaria mudar a
  assinatura de toda a camada de acesso **para servir ao teste**. Quando o
  teste força mudança de design que o produto não pediu, o problema é o teste.

- **Banco por worker resolve paralelismo; truncate resolve ordem.** São
  problemas diferentes e precisam dos dois. Sem banco por worker, quatro forks
  disputam as mesmas linhas. Sem truncate, o segundo teste herda o que o
  primeiro deixou — é o "I" de *Independent* das regras F.I.R.S.T.

- **Template evita reaplicar migration por worker.** O schema é aplicado uma
  vez num database modelo; cada worker faz `create database ... template ...`,
  que é cópia de arquivo no Postgres, não replay de DDL.

- **Truncate com `restart identity cascade`**, numa lista única de tabelas.
  Reiniciar a sequence importa: sem isso, o `id_conta` muda entre execuções e
  qualquer asserção sobre id vira flaky.

### Consequência

Ganhamos determinismo e paralelismo ao custo de ~2 a 5 segundos de subida do
container por execução. Aceitável porque roda separado da suíte de unidade
(`npm test` continua em 148ms; a integração tem script próprio).

---

## 3. Decisão 2 — Participantes de contrato e campos tolerantes

### Os dois consumidores da mesma API

| Participante | O que é | Como atualiza | Quanto tempo até 100% na versão nova |
|---|---|---|---|
| `web-app` | Next.js na Vercel | deploy substitui todo mundo | minutos |
| `mobile-app` | Expo (Android/iOS) | usuário precisa atualizar | dias a semanas — ou **nunca** |

O provedor é a própria aplicação Next.js (`/api/*`), então um único deploy
muda o backend dos dois ao mesmo tempo — mas só o web acompanha na hora.

### Isto não é hipótese: já aconteceu

Em 28/08, ao adicionar o campo `serieMensal` em `GET /api/dashboard`, o app
quebrou com `TypeError: Cannot read property 'length' of undefined`. A causa
foi assimetria de release: o bundle do app já esperava o campo novo e a Vercel
ainda servia a versão anterior da rota. **Uma tela branca por causa de um
campo que ainda não existia.**

A correção foi tornar o app um *leitor tolerante*
(`src/../mobile/app/(tabs)/index.tsx`):

```ts
const serie = dados.serieMensal ?? []
const recentes = dados.recentes ?? []
const lembretes = dados.proximosLembretes ?? []
```

### Regra adotada

**Campos obrigatórios** — o app trava sem eles; remover ou renomear é
*breaking change* e exige encerrar o suporte à versão antiga antes:

| Rota | Campos obrigatórios |
|---|---|
| `GET /api/dashboard` | `saldoTotal`, `entradas`, `saidas`, `metasAtivas` |
| `GET /api/contas` | `id_conta`, `instituicao`, `saldo_atual`, `status_conta` |
| `GET /api/transacoes` | `id_transacao`, `id_conta`, `tipo`, `valor`, `data_transacao` |
| `GET /api/metas` | `id_meta`, `valor_objetivo`, `valor_atual`, `data_limite`, `status` |

**Campos tolerantes** — o app funciona sem eles, mostrando menos. Podem ser
adicionados a qualquer momento sem quebrar cliente antigo:

| Campo | Comportamento quando ausente |
|---|---|
| `dashboard.serieMensal` | gráfico dos 6 meses some, resto da tela intacta |
| `dashboard.recentes` | lista vazia com estado vazio |
| `dashboard.proximosLembretes` | seção vazia |
| `dashboard.nome` | cai no `user_metadata` e depois no prefixo do e-mail |
| `transacoes.categoria` | exibe "Sem categoria" |

### Consequências operacionais

1. **Campo novo na resposta é sempre aditivo e tolerante.** O app antigo
   continua funcionando; o novo passa a usá-lo.
2. **Remover campo obrigatório exige `record-support-ended` antes.** Enquanto
   houver versão do app em uso que dependa dele, o backend mantém.
3. **No Pact Broker, três participantes**, não um: `web-app`,
   `mobile-app-android` e `mobile-app-ios`. iOS e Android divergem porque a
   revisão da App Store adia a chegada da versão nova.
4. **A gravidade é assimétrica.** Erro no web se corrige com um deploy. Erro
   no app vira crash em aparelho instalado, nota ruim na loja e usuário que não
   volta.

---

## 4. Estado atual e o que falta

| Item | Situação |
|---|---|
| Migration do schema base | ✅ `supabase/migrations/20260911_schema_base.sql` |
| Script de conferência contra produção | ✅ `supabase/verificacao-schema.sql` |
| Testcontainers + Postgres efêmero | ⏳ bloqueado: Docker Desktop exige WSL2, ainda não instalado |
| Testes de integração das rotas | ⏳ depende do anterior |
| Job de integração no GitHub Actions | ⏳ depende do anterior |
| Contratos Pact | ⏳ fora do milestone desta aula (é o laboratório em dupla) |

**A migration é o caminho crítico**, e não uma tarefa paralela: o
Testcontainers sobe um Postgres vazio, então sem schema versionado não há o
que testar. As seis tabelas centrais existiam só no painel do Supabase desde o
início do projeto — o teste de integração é o que finalmente forçou a dívida a
ser paga.

**Ressalva:** a migration foi derivada de `src/types/database.ts` e do uso nas
rotas, não extraída do banco de produção (não havia acesso administrativo).
Rodar `supabase/verificacao-schema.sql` em produção e conferir as divergências
é pré-requisito para tratá-la como fonte da verdade. Os pontos inferidos estão
marcados com `INFERIDO` no próprio arquivo.
