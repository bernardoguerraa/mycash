import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { api, ApiError } from './client'

/**
 * Smoke tests do wrapper de API. Focam nos comportamentos de rede
 * e de tratamento de resposta que sao usados por todos os componentes.
 * Mockam globalThis.fetch para nao bater em rede real.
 */

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

describe('api.transacoes', () => {
  it('list() chama GET /api/transacoes sem parametros', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ data: [] }))

    const result = await api.transacoes.list()

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes')
    // GET por default (nenhum method setado)
    expect(init?.method).toBeUndefined()
    expect(result).toEqual([])
  })

  it('list() serializa filtros na query string', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ data: [] }))

    await api.transacoes.list({ id_conta: 5, tipo: 'Saida', limit: 50 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes?id_conta=5&tipo=Saida&limit=50')
  })

  it('create() faz POST com JSON serializado no body', async () => {
    const created = { id_transacao: 1, id_conta: 2, tipo: 'Saida', valor: 100 }
    fetchMock.mockResolvedValueOnce(mockResponse({ data: created }, 201))

    const payload = {
      id_conta: 2,
      tipo: 'Saida' as const,
      categoria: 'Alimentacao',
      descricao: 'Mercado',
      valor: 100,
    }
    const result = await api.transacoes.create(payload)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual(payload)
    expect(result).toEqual(created)
  })

  it('delete() faz DELETE e retorna null em 204', async () => {
    fetchMock.mockResolvedValueOnce({ status: 204, ok: true } as Response)

    const result = await api.transacoes.delete(42)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes/42')
    expect(init?.method).toBe('DELETE')
    expect(result).toBeNull()
  })

  it('list() lanca ApiError quando servidor retorna 401', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'nao autenticado' }, 401))

    try {
      await api.transacoes.list()
      expect.fail('devia ter lancado ApiError')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(401)
      expect((err as ApiError).message).toBe('nao autenticado')
    }
  })

  it('update() propaga a mensagem de erro do backend', async () => {
    fetchMock.mockResolvedValue(mockResponse({ error: 'valor invalido' }, 400))

    try {
      await api.transacoes.update(1, { valor: -1 })
      expect.fail('devia ter lancado ApiError')
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      expect((err as ApiError).status).toBe(400)
      expect((err as ApiError).message).toBe('valor invalido')
    }
  })
})

describe('api.contas', () => {
  it('create() nao envia id_usuario (server deriva da sessao)', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ data: { id_conta: 1 } }, 201))

    await api.contas.create({
      instituicao: 'Nubank',
      numero_conta: '****1234',
      tipo_conta: 'Conta Corrente',
      saldo_atual: 100,
    })

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init?.body as string)
    expect(body).not.toHaveProperty('id_usuario')
    expect(body.instituicao).toBe('Nubank')
  })
})

describe('ApiError', () => {
  it('carrega status HTTP e message', () => {
    const err = new ApiError(403, 'proibido')
    expect(err.status).toBe(403)
    expect(err.message).toBe('proibido')
    expect(err.name).toBe('ApiError')
    expect(err).toBeInstanceOf(Error)
  })
})
