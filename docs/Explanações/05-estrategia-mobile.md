# Estratégia do app mobile

## Contexto

O MyCash nasceu nas disciplinas de Análise e Desenvolvimento de Software 1, 2 e
3 como aplicação web (Next.js + Supabase). Em ADS 4 a disciplina passa a cobrir
**desenvolvimento mobile**, e o requisito é levar o projeto existente para um
app nativo.

O ponto de partida não é um projeto novo: já existem 13 telas web, 14 endpoints
REST, autenticação, RLS no banco e um schema consolidado. A pergunta não é
"como construir um app de finanças", e sim **"como levar este produto para o
mobile sem duplicar o que já funciona"**.

Este documento explica a decisão de framework, o recorte de telas e a decisão
sobre o repositório.

## Decisão 1 — Framework

**Escolhido: Expo (React Native), SDK 54.**

O material da disciplina apresenta o espectro de opções. Posicionando o MyCash
nele:

| Abordagem | Acesso a APIs nativas | Reaproveitamento | Veredito |
|---|---|---|---|
| Nativo (Kotlin/Swift) | Total | Nenhum — reescrita por plataforma | Descartado: 2 bases de código, time sem Kotlin |
| Web app / PWA | Muito restrito | Total | Já temos — o web é responsivo e instalável como PWA |
| Híbrido (Ionic) | Médio | Alto | Descartado: performance e ergonomia inferiores ao RN |
| **React Native / Expo** | **Alto (via bridge)** | **Alto** | **Escolhido** |

O motivo decisivo não foi "React Native é melhor", e sim **continuidade de
modelo mental**. O time já desenvolve há um ano e meio em React com o App Router
do Next.js, que usa roteamento baseado em arquivos. O Expo Router usa o mesmo
princípio: um arquivo em `app/` vira uma rota. A curva de aprendizado fica
concentrada nas APIs de UI do RN (`View`, `Text`, `StyleSheet`) — que é
exatamente o conteúdo da disciplina — em vez de se dividir entre linguagem,
IDE, roteamento e paradigma ao mesmo tempo.

**Expo em vez de React Native CLI:** o CLI (`@react-native-community/cli init`)
entrega controle total sobre as pastas `android/` e `ios/`, ao custo de um setup
consideravelmente mais longo. Como o projeto não precisa (ainda) de módulos
nativos customizados, o Expo entrega o mesmo resultado com muito menos atrito. A
saída não fica bloqueada: `npx expo prebuild` gera as pastas nativas a qualquer
momento, e `npx expo run:android` compila localmente usando o Android Studio.

**Por que SDK 54 e não o mais novo (57):** o scaffold nasceu no 57, mas foi
rebaixado para o 54. O motivo é o **Expo Go em celular físico**. No emulador o
`expo start` baixa sozinho a versão do Expo Go que casa com o SDK do projeto —
qualquer SDK funciona. No celular, o Expo Go é o que estiver publicado na loja,
e é ele que dita o SDK suportado. Como a turma e o
[repositório de exemplo do professor](https://github.com/erfelipe/Expo-Exemplo)
estão no 54, ficar no 57 significaria não conseguir demonstrar no aparelho e ter
trechos de código da aula que não colam no nosso projeto.

**PWA já existe — por que um app nativo?** O web já é responsivo e instalável
(ver [`docs/How-tos/como-instalar-como-pwa.md`](../How-tos/como-instalar-como-pwa.md)).
O app nativo é requisito da disciplina, mas também abre o que o PWA não alcança:
notificações push confiáveis, biometria para abrir o app e leitura de dados
offline.

## Decisão 2 — Estratégia de dados

**O mobile fala direto com o Supabase**, sem passar pela API REST do Next.js.

```
┌──────────────┐     ┌──────────────┐
│  Web (Next)  │     │ Mobile (Expo)│
└──────┬───────┘     └──────┬───────┘
       │                    │
       │ Repositories       │ @supabase/supabase-js
       │ + API REST         │
       │                    │
       └────────┬───────────┘
                ▼
     ┌─────────────────────┐
     │ Supabase Postgres   │
     │ + Row Level Security│
     └─────────────────────┘
```

A alternativa era o mobile consumir os endpoints `/api/*` do Next.js,
reaproveitando a camada de Repositories. Foi descartada por duas razões:

1. **Dependência de disponibilidade** — exigiria o Next.js publicado e acessível
   para o app funcionar. No emulador, `localhost` aponta para o próprio Android,
   não para o PC do desenvolvedor, o que adiciona configuração de rede a cada
   máquina do time.
2. **A proteção já está no banco** — a migration `20260619_rls_and_auth_user_id.sql`
   aplica Row Level Security em todas as tabelas. O isolamento por usuário não
   depende do servidor Next.js estar no meio do caminho.

O trade-off assumido: as regras de domínio dos Repositories (validações,
`aportar()`, normalizações) não são reaproveitadas automaticamente e precisam
ser reescritas no mobile. Se essa duplicação incomodar, o caminho é extrair os
Repositories para um pacote compartilhado — mas isso só vale a pena depois que o
mobile tiver telas de escrita suficientes para justificar.

### Revisão: passar a usar a API (21/08/2026)

Na avaliação parcial os professores sugeriram **consumir a API REST do Next.js**
em vez de ir direto ao banco. A Fase 1 já entregue continua no acesso direto; a
migração acontece a partir da Fase 2, junto com as telas de escrita — que é
justamente onde a duplicação de regras começaria a doer.

O bloqueio dessa mudança era de autenticação, e já foi resolvido:

> As rotas de `/api/*` liam a sessão **apenas de cookie** (`createServerClient`
> do `@supabase/ssr`). O app nativo não tem cookie — guarda a sessão no
> AsyncStorage e manda `Authorization: Bearer <access_token>`. Toda chamada
> vinda do mobile responderia `401`.
>
> `createClientFromRequest(req)` (em `src/lib/supabase/server.ts`) passa a ler
> o cabeçalho quando ele existe e cai no cookie quando não existe. As 13 rotas
> foram migradas. A mudança é aditiva: o web continua funcionando igual.

Do lado do app, `mobile/lib/api.ts` já anexa o token em toda requisição. Falta
apenas trocar as chamadas `supabase.from(...)` das telas por `api.get(...)`.

**Sobre a URL base:** o padrão é a produção na Vercel, que funciona de qualquer
rede. Para apontar ao servidor local, definir `EXPO_PUBLIC_API_URL` — lembrando
que no emulador Android o host da máquina é `10.0.2.2`, não `localhost`. Era
esse detalhe de rede um dos motivos originais para não usar a API; usar a URL
publicada o elimina.

## Decisão 3 — Telas e processos

As 13 telas do web não vão todas para o mobile de uma vez. O recorte segue a
lógica de **fatia vertical**: cada fase entrega um fluxo que funciona ponta a
ponta, em vez de várias telas pela metade.

### Fase 1 — Fatia vertical mínima

| Tela | Processo | Por que primeiro |
|---|---|---|
| Login | Autenticação via Supabase Auth | Sem sessão, nada mais funciona |
| Dashboard | Saldo consolidado, receitas/despesas do mês | Prova que auth + RLS + query + UI funcionam juntos |

Entregar essas duas valida a stack inteira. Se o Dashboard mostra o saldo certo
do usuário logado, então a sessão persiste, a RLS reconhece o usuário e as
queries funcionam — todo o resto passa a ser trabalho de UI.

### Fase 2 — Uso diário

| Tela | Processo |
|---|---|
| Transações | Listar, filtrar, criar, editar e excluir lançamentos |
| Contas | Visualizar contas e saldos por instituição |

Transações é a tela de maior frequência de uso e a primeira que exige
**escrita** — traz validação de formulário e tratamento de erro.

### Fase 3 — Complemento

| Tela | Processo |
|---|---|
| Metas | Acompanhar progresso e registrar aportes |
| Lembretes | Contas a pagar/receber com vencimento |
| Notificações | Eventos do sistema |
| Perfil | Dados do usuário e logout |

### Fora do escopo mobile por ora

- **Cadastro, recuperação e reset de senha** — fluxos com confirmação por e-mail,
  que o web já resolve. O app pode direcionar para lá.
- **Integração Pluggy (Open Finance)** — a sincronização roda no servidor; o
  mobile consome o resultado, não precisa reimplementar o fluxo de conexão.

## Decisão 4 — Repositório

**Os professores orientaram separar o mobile em um repositório novo.** O time
optou por manter no mesmo repo, na pasta `/mobile`, para preservar histórico
unificado e compartilhar o schema tipado (`src/types/database.ts`).

Essa escolha tem um custo concreto, e ele não é hipotético — **apareceu na
primeira hora de trabalho**:

> O `tsconfig.json` da raiz declarava `include: ["**/*.ts", "**/*.tsx"]`. Assim
> que a pasta `mobile/` passou a existir, o typecheck da raiz começou a
> analisá-la usando o **React 18 do web**, enquanto o mobile usa **React 19**.
> Resultado: 20+ erros `TS2786`/`TS2307` e `npx tsc --noEmit` quebrado. Como o
> CI roda exatamente esse comando, o próximo push teria quebrado o build.
>
> Correção aplicada: `"exclude": ["node_modules", "mobile"]`.

### Cuidados obrigatórios enquanto o mobile viver neste repo

1. **Não remover `"mobile"` do `exclude` do `tsconfig.json` da raiz.** O web usa
   React 18.3.1 e o mobile React 19.1.0 — são incompatíveis em nível de tipos.
2. **O `/mobile` não tem CI.** O `ci.yml` roda typecheck, lint e Vitest apenas na
   raiz. Regressões no mobile só aparecem se alguém rodar na mão. Rodar
   `npx tsc --noEmit` dentro de `mobile/` antes de abrir PR.
3. **O deploy da Vercel builda a raiz como Next.js** (`vercel.json`). A pasta
   `mobile/` sobe junto sem necessidade.
4. **O `.gitignore` da raiz alcança as subpastas.** Regras escritas pensando
   apenas no web passam a valer para `mobile/` também — vale conferir antes de
   assumir que um arquivo novo está sendo versionado.

Se esses cuidados começarem a custar mais do que o histórico unificado entrega,
**separar em repositório próprio é o caminho já indicado pelos professores** — e
a migração é barata enquanto o mobile ainda tem poucas telas.

## Ambiente de desenvolvimento

Stack do scaffold: Expo SDK 54.0.36, React Native 0.81.5, React 19.1.0,
TypeScript 5.9, roteamento por arquivos em `mobile/app/`.

```bash
cd mobile
npx expo start --android   # abre no emulador
npx expo start --tunnel    # QR code que funciona em celular fisico
```

Pré-requisitos por máquina do time: JDK 17, Android SDK com plataforma
android-35, um AVD API 35 e as variáveis `ANDROID_HOME`, `ANDROID_SDK_ROOT` e
`JAVA_HOME` configuradas — o material da disciplina destaca justamente esse
ponto, e é onde a maioria dos setups falha.

> **Atenção ao Expo Go:** a versão precisa casar com o SDK. No emulador o CLI
> resolve sozinho (baixa a build correta, ~100 MB na primeira vez). Se o
> emulador já tiver um Expo Go de outro SDK, o CLI pede confirmação para
> substituir — `adb uninstall host.exp.exponent` força o caminho limpo.

> **Celular físico e o `--tunnel`:** o QR code padrão aponta para o IP da rede
> local, então o celular só conecta se estiver no mesmo Wi-Fi e sem isolamento
> de cliente — o que redes de universidade costumam bloquear.
> `npx expo start --tunnel` roteia por fora da rede e funciona inclusive no 4G.
> Exige `npm install -g @expo/ngrok`.

### O projeto não pode viver dentro do OneDrive

Sintoma: o Metro morre no boot com
`EINVAL: invalid argument, readlink '...\package.json'`.

Causa: o OneDrive marca todo arquivo sincronizado com um *reparse point* de
placeholder (tag `0x9000a01a`). O `fs.readdir` do Node reporta esses arquivos
como symlink — `dirent.isSymbolicLink() === true` para `package.json`,
`app.json`, qualquer um. O `metro-file-map` acredita e chama `readlink`, que o
Windows recusa com `EINVAL`. Diretórios escapam; arquivos não.

Não tem contorno por configuração: o repositório precisa estar fora da pasta
sincronizada. O caminho atual é `C:\Users\mathe\dev\my-cash`.
