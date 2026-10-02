# =============================================================================
# MyCash — imagem de producao do app Next.js
#
# Tres estagios, porque compilar e executar tem necessidades opostas: compilar
# precisa de toolchain C/C++, da node_modules completa e do codigo-fonte;
# executar precisa de um runtime Node e do servidor gerado. Juntar as duas
# coisas numa imagem so significa embarcar compilador em producao.
#
# Build:  docker build -t mycash-web .
# Rodar:  docker compose up --build
# =============================================================================

# Versao fixada com patch, nao `node:22-slim`. Tag movel reintroduz
# exatamente a deriva que infraestrutura imutavel existe para eliminar: a
# mesma linha de Dockerfile produziria imagens diferentes em datas
# diferentes, e o build deixaria de ser reproduzivel.
ARG NODE_VERSION=22.14.0-bookworm-slim

# =============================================================================
# ESTAGIO 1 — deps: resolucao de dependencias
# =============================================================================
FROM node:${NODE_VERSION} AS deps
WORKDIR /app

# python3/make/g++ compilam dependencias com addon nativo. Em imagem Debian
# (glibc); `libc6-compat` nao se aplica aqui — aquele pacote e do Alpine, que
# usa musl libc.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Apenas os manifestos antes do `npm ci`: enquanto package.json e
# package-lock.json nao mudarem, o Docker reaproveita a camada de instalacao.
# Copiar o projeto inteiro aqui invalidaria o cache a cada edicao de .tsx e
# faria o npm ci rodar de novo em todo build.
COPY package.json package-lock.json ./
RUN npm ci

# =============================================================================
# ESTAGIO 2 — builder: compilacao
# =============================================================================
FROM node:${NODE_VERSION} AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# -----------------------------------------------------------------------------
# Variaveis NEXT_PUBLIC_* sao de BUILD, nao de runtime.
#
# O compilador do Next substitui cada ocorrencia textual de
# `process.env.NEXT_PUBLIC_*` pelo valor literal dentro do bundle JavaScript.
# Depois do build o valor esta no arquivo que vai para o navegador: passar
# essas variaveis em `environment:` no compose nao tem efeito nenhum no
# codigo do cliente.
#
# Por isso elas entram como ARG. E por isso NUNCA pode existir um
# NEXT_PUBLIC_ com segredo: a anon key do Supabase e publica por design
# (protegida por RLS), mas a service role key NAO — se alguem a renomear
# para NEXT_PUBLIC_, ela vai para o bundle e para a internet inteira.
#
# Default vazio de proposito: o build precisa concluir sem credencial (o CI
# compila sem secret). As paginas que dependem do Supabase sao dinamicas e
# resolvem em runtime.
# -----------------------------------------------------------------------------
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=""
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

# Emite .next/standalone (ver output: 'standalone' em next.config.mjs).
RUN npm run build

# =============================================================================
# ESTAGIO 3 — runner: imagem final
#
# Nao herda compilador, nem node_modules de desenvolvimento, nem codigo-fonte.
# =============================================================================
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# 0.0.0.0 e obrigatorio: ligado em 127.0.0.1 o servidor atende so dentro do
# proprio contentor, e o mapeamento de porta do compose nao alcanca nada.
ENV HOSTNAME="0.0.0.0"

# UID/GID fixos em 1001. O Docker roda como root por padrao; uma falha de RCE
# na aplicacao viraria root no contentor, e com namespace de usuario mal
# configurado isso chega perto do root do host. Identificador fixo tambem faz
# o ownership de volume montado ser previsivel entre maquinas.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder /app/public ./public

# .next precisa existir com dono correto antes de o processo subir: o servidor
# escreve cache de imagem ali em runtime, e um diretorio criado pelo root
# depois deixaria o usuario nextjs sem permissao de escrita.
RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Healthcheck em processo no proprio contentor: e o que o compose usa em
# `condition: service_healthy` para so marcar o servico pronto quando ele
# responde de fato, e nao quando o PID 1 nasceu.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# `node server.js`, nao `npm start`: o npm viraria PID 1 e intermediaria os
# sinais, entao SIGTERM do `docker stop` nao chegaria limpo ao Node e o
# encerramento cairia no timeout de 10s com SIGKILL.
CMD ["node", "server.js"]
