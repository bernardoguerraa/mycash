# Como instalar o MyCash como app (PWA)

> Receita para instalar o MyCash na tela inicial do celular ou como app
> desktop. O MyCash é uma **Progressive Web App** — o mesmo código serve
> tanto o navegador quanto o "app" instalado, sem precisar de loja.

**Pré-requisitos**
- Acesso à URL de produção: https://mycash-nu.vercel.app
- Chrome, Edge, Safari 16.4+ ou Firefox mobile

## No Android (Chrome)

1. Abra https://mycash-nu.vercel.app no Chrome
2. Faça login normalmente
3. Chrome vai mostrar automaticamente uma barra "**Adicionar MyCash à tela inicial**".
   Se não aparecer:
   - Toque no menu (⋮) no canto superior direito
   - Toque em **Adicionar à tela inicial** ou **Instalar app**
4. Confirme

O ícone aparece na tela inicial. Ao tocar, o app abre em modo **standalone**
(sem barra do navegador) — parece exatamente um app nativo.

## No iOS (Safari)

1. Abra https://mycash-nu.vercel.app no **Safari** (Chrome iOS não instala PWA)
2. Toque no botão de **compartilhamento** (quadrado com seta para cima)
3. Role para baixo e toque em **Adicionar à Tela de Início**
4. Confirme o nome (MyCash) e toque em **Adicionar**

## No desktop (Chrome / Edge)

1. Abra https://mycash-nu.vercel.app
2. Na barra de endereço, procure o ícone de **instalação** (⊕ ou monitor com seta)
3. Clique e confirme **Instalar**

Aparece na lista de apps do sistema (Menu Iniciar no Windows,
Launchpad no Mac). Abre em janela própria, sem abas do navegador.

## Como desinstalar

- **Android**: pressionar e segurar o ícone → **Desinstalar**
- **iOS**: pressionar e segurar o ícone → **Remover App**
- **Desktop**: abrir o app → menu (⋮) → **Desinstalar MyCash**

## O que a versão PWA faz diferente

- **Ícone dedicado** — aparece na tela inicial junto com apps nativos
- **Modo standalone** — sem barra de endereço, sem abas
- **Splash screen** — tela verde ao abrir com o logo (gerada automaticamente
  pelo browser a partir do manifest e do theme_color)
- **Cache de assets** — o "shell" da UI carrega mesmo com conexão instável;
  dados dinâmicos (transações, saldos) exigem internet
- **Notificações do sistema** (futuro) — a base está pronta para push
  notifications sem código adicional

## Como o PWA está implementado no código

- `public/manifest.webmanifest` — declara nome, ícones, cores, start_url
- `public/icon.svg` — ícone principal (usa gradiente emerald do design)
- `public/icon-maskable.svg` — variante com área segura pra adaptação
  em ícones circulares/quadrados nos launchers Android
- `public/sw.js` — service worker mínimo com cache stale-while-revalidate
  do shell (não intercepta `/api/*`)
- `src/app/layout.tsx` — meta tags Apple, viewport, theme_color, registro
  do service worker

Ver também [Explanações/03-repository-pattern.md](../Explanações/03-repository-pattern.md)
para entender por que a mesma API que serve o web pode servir o mobile sem
adaptações.

## Verificando que está funcionando

**Chrome DevTools:**
1. F12 → aba **Application**
2. **Manifest** — deve mostrar todos os campos (nome, ícones, cores)
3. **Service Workers** — deve listar `/sw.js` como "activated and is running"
4. Aba **Lighthouse** → rodar auditoria **Progressive Web App** → nota deve subir consideravelmente

Se algum critério do Lighthouse falhar, o log da auditoria explica o porquê
(exemplo comum: precisa estar em HTTPS — o preview local em `http://localhost`
não instala; só em produção Vercel).
