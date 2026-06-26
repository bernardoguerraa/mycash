# Referência: rotas da API REST

> Especificação dos endpoints REST do MyCash. Cobrem as 5 entidades de
> domínio (transações, contas, metas, lembretes, notificações) com as
> operações CRUD padrão. Web e mobile consomem estes endpoints.

## Convenções

- **Base path**: `/api`
- **Formato**: JSON em request body e response body
- **Autenticação**: cookie de sessão Supabase (gerenciado automaticamente pelo
  middleware Next.js — chamadas a partir do front autenticado funcionam sem header extra)
- **Isolamento por usuário**: Row Level Security no Postgres. Cada request só
  enxerga linhas do próprio usuário; tentativas de acessar dados de outros
  retornam 404 ou 0 linhas
- **Códigos HTTP**:
  - `200` — OK (GET/PATCH)
  - `201` — Created (POST)
  - `204` — No Content (DELETE)
  - `400` — Bad Request (body inválido, campo faltando, violação de regra)
  - `401` — Unauthorized (sem sessão)
  - `404` — Not Found
  - `500` — Erro server-side

## Wrapper de resposta

Sucesso (`2xx`):
```json
{ "data": { ... } }
```
ou para listagens:
```json
{ "data": [ { ... }, { ... } ] }
```

Erro (`4xx`/`5xx`):
```json
{ "error": "mensagem descritiva" }
```

---

## `/api/transacoes`

### `GET /api/transacoes`

Lista transações do usuário logado, ordenadas por `data_transacao` decrescente.

Query params:
| Param | Tipo | Descrição |
|---|---|---|
| `id_conta` | number | Filtra por conta bancária |
| `tipo` | `Entrada` \| `Saida` | Filtra por tipo |
| `limit` | number (max 500) | Limita resultados, default 200 |

Resposta:
```json
{
  "data": [
    {
      "id_transacao": 1,
      "id_conta": 1,
      "data_transacao": "2026-06-19",
      "tipo": "Saida",
      "categoria": "Alimentacao",
      "descricao": "Mercado",
      "valor": 250.50,
      "origem": "manual",
      "pluggy_tx_id": null,
      "raw_data": null
    }
  ]
}
```

### `POST /api/transacoes`

Cria uma transação. `id_conta` deve pertencer ao usuário logado (validado por RLS).

Body:
```json
{
  "id_conta": 1,
  "data_transacao": "2026-06-19",
  "tipo": "Saida",
  "categoria": "Alimentacao",
  "descricao": "Mercado",
  "valor": 250.50
}
```

Obrigatórios: `id_conta`, `tipo`, `categoria`, `descricao`, `valor`.
Opcionais: `data_transacao` (default: agora).

### `GET /api/transacoes/[id]`

Retorna transação específica. `404` se não pertencer ao usuário.

### `PATCH /api/transacoes/[id]`

Atualiza campos da transação. Body aceita qualquer subconjunto de campos.

### `DELETE /api/transacoes/[id]`

Remove a transação. Retorna `204` sem corpo.

---

## `/api/contas`

### `GET /api/contas`

Lista contas bancárias do usuário, ordenadas por `id_conta` ascendente.

### `POST /api/contas`

Cria conta bancária. `id_usuario` é derivado automaticamente da sessão (não envie no body).

Body:
```json
{
  "instituicao": "Nubank",
  "numero_conta": "****1234",
  "tipo_conta": "Conta Corrente",
  "saldo_atual": 3450.78
}
```

Obrigatórios: `instituicao`, `numero_conta`, `tipo_conta`.
Opcionais: `saldo_atual` (default: 0).

### `GET /api/contas/[id]`

### `PATCH /api/contas/[id]`

### `DELETE /api/contas/[id]`

---

## `/api/metas`

### `GET /api/metas`

Lista metas, ordenadas por `data_limite` ascendente.

Query params:
| Param | Tipo | Descrição |
|---|---|---|
| `status` | `EmAndamento` \| `Concluida` \| `Cancelada` | Filtra por status |

### `POST /api/metas`

Body:
```json
{
  "titulo": "Reserva de emergência",
  "valor_objetivo": 10000,
  "valor_atual": 1500,
  "data_inicio": "2026-06-01",
  "data_limite": "2026-12-31",
  "status": "EmAndamento"
}
```

Obrigatórios: `titulo`, `valor_objetivo`, `data_limite`.
Opcionais: `valor_atual` (default: 0), `data_inicio` (default: hoje), `status` (default: `EmAndamento`).

### `GET /api/metas/[id]`

### `PATCH /api/metas/[id]`

### `DELETE /api/metas/[id]`

---

## `/api/lembretes`

### `GET /api/lembretes`

Lista lembretes, ordenados por `data_vencimento` ascendente.

Query params:
| Param | Tipo | Descrição |
|---|---|---|
| `ativo` | `true` \| `false` | Filtra por estado |
| `tipo` | `ContaPagar` \| `ContaReceber` | Filtra por tipo |

### `POST /api/lembretes`

Body:
```json
{
  "descricao": "Aluguel",
  "data_vencimento": "2026-07-05",
  "valor_previsto": 1800,
  "tipo": "ContaPagar",
  "ativo": true
}
```

Obrigatórios: `descricao`, `data_vencimento`, `valor_previsto`, `tipo`.
Opcionais: `ativo` (default: `true`).

### `GET /api/lembretes/[id]`

### `PATCH /api/lembretes/[id]`

### `DELETE /api/lembretes/[id]`

---

## `/api/notificacoes`

### `GET /api/notificacoes`

Lista notificações, ordenadas por `data_notificacao` decrescente.

Query params:
| Param | Tipo | Descrição |
|---|---|---|
| `lida` | `true` \| `false` | Filtra por lidas/não lidas |

### `POST /api/notificacoes`

Body:
```json
{
  "mensagem": "Sua meta 'Reserva' atingiu 50%",
  "tipo": "Meta",
  "lida": false
}
```

Obrigatórios: `mensagem`, `tipo`.
Tipos válidos: `Sistema`, `Meta`, `Lembrete`, `Alerta`.

### `GET /api/notificacoes/[id]`

### `PATCH /api/notificacoes/[id]`

Uso típico: marcar como lida com body `{ "lida": true }`.

### `DELETE /api/notificacoes/[id]`

---

## `/api/pluggy/*` (já documentadas)

Estas rotas existem há mais tempo para a integração Open Finance:

- `POST /api/pluggy/connect-token` — gera token para abrir o widget Pluggy
- `POST /api/pluggy/connections` — persiste conexão após sucesso no widget
- `DELETE /api/pluggy/connections?id=<connectionId>` — remove conexão
- `POST /api/pluggy/sync/[connectionId]` — força sincronização manual
- `POST /api/pluggy/webhook` — recebe eventos Pluggy (não autenticada — usa service role)

---

## Por que essa API existe

Antes, o cliente chamava o Supabase diretamente (`supabase.from('transacoes')...`).
Isso funciona para web, mas **acopla o front à escolha de banco**. Para que um
front-end móvel possa consumir os mesmos dados sem reimplementar lógica de
auth/RLS/queries, esta camada REST foi criada — qualquer cliente (web, mobile,
script de testes) usa os mesmos endpoints.

Atende ao requisito do guia da disciplina ADS III:

> *"O back-end deverá estar implementado na forma de uma API REST,
> fornecendo endpoints para acesso ao banco de dados para os front-ends
> web e móvel."*

## Como testar (Postman / Insomnia / curl)

Para testar localmente é necessário ter cookie de sessão Supabase (ou setar
cabeçalho `Authorization: Bearer <jwt>`). O modo mais simples é:

1. Logar no app pelo navegador
2. Abrir DevTools → Application → Cookies → copiar o cookie `sb-*-auth-token`
3. Colar esse cookie no Postman/Insomnia
4. Chamar `GET http://localhost:3000/api/transacoes`

Alternativa (curl):
```bash
curl -s http://localhost:3000/api/transacoes \
  -H "Cookie: sb-xxxxx-auth-token=eyJ..." | jq
```

## Receitas relacionadas

- [Como configurar variáveis de ambiente](../How-tos/como-configurar-variaveis-ambiente.md)
- [Primeiro setup do projeto](../Tutoriais/01-primeiro-setup.md)
- [Variáveis de ambiente](./variaveis-ambiente.md)
