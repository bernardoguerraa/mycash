import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  transacoesRepository,
  metasRepository,
  lembretesRepository,
  notificacoesRepository,
} from './repositories'

/**
 * Testes dos repositorios. Focam nas regras de dominio e no formato do
 * payload enviado a API — nao testam de novo a mecanica de fetch (isso ja
 * esta coberto em client.test.ts).
 */

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: {} }),
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transacoesRepository', () => {
  it('criar() traduz camelCase -> snake_case e envia para /api/transacoes', async () => {
    await transacoesRepository.criar({
      idConta: 3,
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao: 'Feira',
      valor: 87.5,
    })

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init?.body as string)
    expect(body).toEqual({
      id_conta: 3,
      data_transacao: undefined,
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao: 'Feira',
      valor: 87.5,
    })
  })

  it('criar() rejeita valores nao positivos com mensagem clara', async () => {
    await expect(
      transacoesRepository.criar({
        idConta: 1,
        tipo: 'Saida',
        categoria: 'Outros',
        descricao: 'invalido',
        valor: -10,
      })
    ).rejects.toThrow('positivo')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('atualizar() so envia campos que mudaram', async () => {
    await transacoesRepository.atualizar(42, { valor: 200 })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes/42')
    expect(init?.method).toBe('PATCH')
    const body = JSON.parse(init?.body as string)
    expect(body).toEqual({ valor: 200 })
  })

  it('listar() propaga filtros como query params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    })

    await transacoesRepository.listar({ idConta: 5, tipo: 'Entrada', limit: 20 })

    const [url] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/transacoes?id_conta=5&tipo=Entrada&limit=20')
  })
})

describe('metasRepository', () => {
  it('criar() rejeita objetivo nao positivo', async () => {
    await expect(
      metasRepository.criar({ titulo: 'X', valorObjetivo: 0, dataLimite: '2027-01-01' })
    ).rejects.toThrow('positivo')
  })

  it('aportar() marca como concluida quando atinge o objetivo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { id_meta: 1, status: 'Concluida', valor_atual: 1000 } }),
    })

    await metasRepository.aportar(1, 300, 800, 1000) // saldo 800 + aporte 300 = 1100 >= 1000

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/metas/1')
    expect(init?.method).toBe('PATCH')
    const body = JSON.parse(init?.body as string)
    expect(body.valor_atual).toBe(1100)
    expect(body.status).toBe('Concluida')
  })

  it('aportar() NAO marca como concluida quando fica abaixo do objetivo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: {} }),
    })

    await metasRepository.aportar(1, 100, 200, 1000) // 300 << 1000

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    expect(body.valor_atual).toBe(300)
    expect(body.status).toBeUndefined()
  })
})

describe('lembretesRepository', () => {
  it('alternarAtivo() inverte o ativo atual', async () => {
    await lembretesRepository.alternarAtivo(7, true)

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    expect(body).toEqual({ ativo: false })
  })

  it('criar() faz trim na descricao', async () => {
    await lembretesRepository.criar({
      descricao: '  Aluguel  ',
      dataVencimento: '2027-01-05',
      valorPrevisto: 1800,
      tipo: 'ContaPagar',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1]?.body as string)
    expect(body.descricao).toBe('Aluguel')
  })
})

describe('notificacoesRepository', () => {
  it('marcarComoLida() faz PATCH com lida:true', async () => {
    await notificacoesRepository.marcarComoLida(99)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/notificacoes/99')
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(init?.body as string)).toEqual({ lida: true })
  })

  it('marcarTodasComoLidas() dispara N PATCHs em paralelo', async () => {
    await notificacoesRepository.marcarTodasComoLidas([1, 2, 3])

    expect(fetchMock).toHaveBeenCalledTimes(3)
    const urls = fetchMock.mock.calls.map((c) => c[0])
    expect(urls.sort()).toEqual([
      '/api/notificacoes/1',
      '/api/notificacoes/2',
      '/api/notificacoes/3',
    ])
  })
})
