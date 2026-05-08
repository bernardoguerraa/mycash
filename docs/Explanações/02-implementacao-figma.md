# Implementação do Figma → Next.js

## Contexto

O design das telas foi feito no Figma e está sendo portado para Next.js + React +
Tailwind. Este documento mantém o status de cada tela.

## Status por tela

| Tela              | Rota                                  | Componente principal                          | Status    |
|-------------------|---------------------------------------|-----------------------------------------------|-----------|
| Login             | `/login`                              | `src/app/login/page.tsx`                       | ✅ Pronto |
| Registro          | `/registro`                           | `src/app/registro/page.tsx`                    | ✅ Pronto |
| Recuperar senha   | `/recuperar-senha`                    | `src/app/recuperar-senha/page.tsx`             | ✅ Pronto |
| Reset de senha    | `/auth/reset-password`                | `src/app/auth/reset-password/page.tsx`         | ✅ Pronto |
| Dashboard         | `/dashboard`                          | `src/app/(dashboard)/dashboard/page.tsx` + `MonthlyChart` | ✅ Pronto |
| Transações        | `/transacoes`                         | `TransacoesClient`, `TransacaoModal`, `DeleteConfirmModal` | ✅ Pronto |
| Contas bancárias  | `/contas`                             | `ContasClient`, `ContaModal`, `PluggyConnectButton` | ✅ Pronto |
| Metas financeiras | `/metas`                              | `MetasClient`, `MetaModal`, `AddValorModal`    | ✅ Pronto |
| Lembretes         | `/lembretes`                          | `LembretesClient`, `LembreteModal`             | ✅ Pronto |
| Notificações      | `/notificacoes`                       | `NotificacoesClient`                           | ✅ Pronto |
| Perfil            | `/perfil`                             | `PerfilClient`                                 | ✅ Pronto |

## Componentes de layout compartilhados

- `src/components/layout/DashboardShell.tsx` — wrapper que aplica Sidebar + Header em todas as rotas autenticadas
- `src/components/layout/Sidebar.tsx` — navegação lateral
- `src/components/layout/Header.tsx` — topo com perfil e notificações

## Camada de dados

- `src/lib/supabase/{client,server,middleware,service}.ts` — quatro variações do client Supabase para diferentes contextos (browser, server component, middleware, service role)
- `src/lib/pluggy/{client,mapping,rules,sync}.ts` — integração com a API do Pluggy
- `src/app/api/pluggy/{connect-token,connections,sync,webhook}/` — rotas de API que orquestram o Open Finance

## Próximos passos sugeridos

- Aderência pixel-perfect ao Figma em telas com gráficos (revisar paleta exata)
- Animações de transição entre rotas (atualmente sem framer-motion)
- Implementar ícones pendentes do Figma que ainda usam fallback do `lucide-react`
