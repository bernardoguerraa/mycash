# Repository pattern no MyCash

## Contexto

O guia ADS III recomenda explicitamente:

> *"É recomendável a aplicação de técnicas modernas de gerenciamento de
> estado, como o padrão de projeto Repository, para isolamento e
> segurança dos dados."*

Este documento explica **por que** adotamos o padrão e **como** ele se
encaixa na arquitetura existente.

## Diagrama de camadas

```
┌────────────────────────────────────────────────────────┐
│ Componentes React (TransacoesClient, MetaModal, ...)   │  UI
├────────────────────────────────────────────────────────┤
│ Repositories (src/lib/api/repositories.ts)             │  Domínio
│   transacoesRepository.criar(), metasRepository.aportar() │
├────────────────────────────────────────────────────────┤
│ API client (src/lib/api/client.ts)                     │  Transporte
│   api.transacoes.create(), api.metas.update()          │
├────────────────────────────────────────────────────────┤
│ API REST (Next.js Route Handlers em src/app/api/)      │  Servidor
├────────────────────────────────────────────────────────┤
│ Supabase Postgres + RLS                                │  Persistência
└────────────────────────────────────────────────────────┘
```

Cada camada tem uma **responsabilidade única**:

- **Componentes** — renderização, interação do usuário, estado de UI
- **Repositories** — regras de domínio (validações, cálculos, normalizações),
  vocabulário do domínio (`aportar()`, `alternarAtivo()`)
- **API client** — mecânica de HTTP, tratamento de status, serialização
- **API REST** — autenticação, validação server-side, roteamento
- **Persistência** — armazenamento e RLS

## Por que separar Repository do API client?

Sem Repository, os componentes chamariam `api.transacoes.create({...})`
com nomes de coluna do banco (`id_conta`, `valor_previsto`, etc.). Isso
vaza detalhes de persistência para a UI.

Com Repository, os componentes falam com o vocabulário do domínio:

```ts
// Antes — o componente conhece o schema do banco
await api.transacoes.create({
  id_conta: idConta,
  valor_previsto: parseFloat(valorStr),
  tipo,
})

// Depois — o componente fala com o domínio
await transacoesRepository.criar({
  idConta,
  valor: parseFloat(valorStr),
  tipo,
})
```

Se amanhã o backend passar a se chamar `conta_id` em vez de `id_conta`,
só o Repository muda. Nenhum componente é tocado.

## Regras de domínio ficam no Repository, não no componente

Antes, cada modal tinha validações duplicadas espalhadas. Depois da
adoção do padrão:

```ts
// src/lib/api/repositories.ts
async criar(input) {
  if (input.valor <= 0) {
    throw new Error('O valor precisa ser positivo. Use tipo=Saida para debitos.')
  }
  return api.transacoes.create({...})
}
```

Qualquer componente que crie uma transação recebe essa validação
automaticamente. Sem duplicação.

Outro exemplo — a meta se marca sozinha como concluída ao atingir o
objetivo:

```ts
async aportar(id, valor, saldoAtual, objetivo) {
  const novoTotal = saldoAtual + valor
  return this.atualizar(id, {
    valorAtual: novoTotal,
    status: novoTotal >= objetivo ? 'Concluida' : undefined,
  })
}
```

O `AddValorModal` chama `metasRepository.aportar()` e a regra de
"virar concluída se atingir 100%" fica em um lugar só, testada.

## Testabilidade

Testar um componente que fala direto com o Supabase exige mockar toda a
biblioteca do Supabase. Testar um componente que fala com o Repository
exige mockar apenas o objeto do Repository.

Testar o Repository sozinho exige mockar apenas `fetch` — é o que
fazemos em `src/lib/api/repositories.test.ts`:

```ts
it('aportar() marca como concluida quando atinge o objetivo', async () => {
  await metasRepository.aportar(1, 300, 800, 1000)
  const body = JSON.parse(fetchMock.mock.calls[0][1]?.body)
  expect(body.status).toBe('Concluida')
})
```

## Convenções adotadas

Todos os repositórios expõem, no mínimo:

- `listar(filtros?)` — lista com filtros opcionais
- `porId(id)` — buscar um por id
- `criar(input)` — criar novo
- `atualizar(id, changes)` — atualizar parcialmente
- `remover(id)` — deletar

Métodos adicionais surgem quando o **domínio** pede — não quando o backend
oferece. Exemplos:

- `metasRepository.aportar()` — não é update genérico, é regra de negócio
- `lembretesRepository.alternarAtivo()` — captura semântica de "toggle"
- `notificacoesRepository.marcarComoLida()` / `marcarTodasComoLidas()`

## O que **não** é responsabilidade do Repository

- Não faz cache (deixar pra hooks/context de UI)
- Não gerencia estado global (usar Zustand/Context se precisar)
- Não sabe nada de autenticação (isso é responsabilidade do middleware)
- Não formata strings pra exibição (`formatCurrency` fica no componente)

## Referências

- Livro *Patterns of Enterprise Application Architecture*, Martin Fowler,
  capítulo Repository
- [Diátaxis](https://diataxis.fr) — framework de documentação usado neste projeto
- Guia ADS III (seção 5 — Back-end e acesso ao banco de dados)
