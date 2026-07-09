# Lazy update (optimistic UI) no MyCash

## Contexto

O guia ADS III recomenda explicitamente:

> *"É recomendável a aplicação de técnicas modernas de gerenciamento de
> estado, como o padrão de projeto Repository, para isolamento e
> segurança dos dados e **lazy update para responsividade de interface**."*

Este documento explica o que "lazy update" significa na prática, por que
o adotamos e onde ele é aplicado no código.

## O problema

Antes da adoção do padrão, todo handler de ação seguia o fluxo:

```
1. Usuário clica em "excluir"
2. UI mostra "excluindo..." (loading spinner)
3. Envia request pro servidor
4. Espera resposta (~150-400ms em conexão boa)
5. Atualiza a UI
```

Isso funciona, mas **cria a percepção de lentidão**. Em ações
frequentes (marcar notificação como lida, alternar lembrete, deletar),
cada clique parece parar por meio segundo — o app "não responde".

## A solução: lazy update

Assumimos otimisticamente que o servidor vai aceitar a mudança e
atualizamos a UI **imediatamente**. Se o servidor recusar, revertemos.

```
1. Usuário clica em "excluir"
2. UI remove o item DA HORA (0ms)
3. Envia request pro servidor em paralelo
4. Se der certo: nada muda (UI já reflete o estado final)
5. Se der errado: restaura o snapshot e loga o erro
```

## Padrão adotado no código

Todo handler otimista segue esta forma:

```ts
async function handleAcao() {
  // 1. Salva snapshot do estado atual — necessario pra reverter
  const snapshot = estado

  // 2. Atualiza a UI otimisticamente
  setEstado(novoEstado)

  try {
    // 3. Confirma com o backend
    await api.recurso.acao(...)
  } catch (err) {
    // 4. Reverte se falhou
    console.error('Falha — revertendo:', err)
    setEstado(snapshot)
  }
}
```

O snapshot é a chave: sem ele não conseguimos voltar ao estado
consistente se o servidor recusar.

## Onde está aplicado

- `TransacoesClient.handleDelete` — remove transação da lista
- `ContasClient.handleDelete` — remove conta bancária
- `MetasClient.handleDelete` — remove meta
- `LembretesClient.handleDelete` — remove lembrete
- `LembretesClient.handleToggleAtivo` — alterna checkbox de ativo
- `NotificacoesClient.handleMarkAsRead` — marca uma notificação como lida
- `NotificacoesClient.handleMarkAllAsRead` — marca todas como lidas em lote

Cada um segue exatamente o padrão acima.

## Onde NÃO aplicamos (e por quê)

- **Criações via modal** (`TransacaoModal`, `ContaModal`, etc.) — o
  usuário já espera algum tempo depois de submeter o formulário; e o
  servidor precisa devolver o `id` gerado antes da UI mostrar o item novo.
  Aqui o feedback loading é razoável.
- **Aportes em metas** — pequenas mudanças que envolvem cálculo de status
  (concluída/não) fazem mais sentido esperar a resposta autoritativa
  do backend.
- **Chamadas de autenticação** (signup, login) — segurança > velocidade.

## Trade-offs

**A favor:**
- Interface parece instantânea (percepção de velocidade)
- Reduz uso perceptível de loading spinners
- Encoraja o usuário a interagir mais (menos fricção)

**Contra:**
- Complexidade extra no handler (snapshot + try/catch)
- Se der reversão frequente, é confuso pro usuário (item some, volta)
  → mitigado por RLS server-side ser muito estável

**Nossa avaliação:** vale a pena para ações de UI comum
(delete/toggle/mark), não vale para criações e ações de segurança.

## Diferença em relação a "eventual consistency"

Lazy update **não é** eventual consistency. Não trabalhamos com estado
divergente entre cliente e servidor por muito tempo — se der erro,
revertemos em milissegundos. É apenas uma técnica de **UX**, não de
distribuição de dados.

## Referências

- [Google Material Design — Motion: Latency vs. perceived performance](https://m3.material.io/foundations/motion)
- Guia ADS III (seção 5 — Back-end e acesso ao banco de dados)
- Ver também: [`03-repository-pattern.md`](./03-repository-pattern.md) —
  a camada de repositórios é o que torna essa técnica ergonômica
