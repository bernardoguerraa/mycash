import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Testes do cliente da API do app.
 *
 * `lib/supabase.ts` cria o client no carregamento do modulo e depende de
 * AsyncStorage — coisas que nao existem em Node. O modulo inteiro e
 * substituido por um dublê: aqui o alvo e o comportamento HTTP do cliente
 * (cabecalhos, formato da resposta, tratamento de erro), nao a autenticacao.
 *
 * O `fetch` global tambem e substituido. Sem rede, sem servidor, determinismo
 * total — nenhum destes casos depende da internet estar de pe.
 */

const getSession = vi.fn();
const signOut = vi.fn();

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession, signOut } },
}));

let fetchMock: ReturnType<typeof vi.fn>;

/** Resposta HTTP minima, no formato que as rotas de /api/* devolvem. */
function resposta(corpo: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => corpo,
  } as Response;
}

beforeEach(() => {
  vi.resetModules();
  getSession.mockResolvedValue({ data: { session: { access_token: 'token-valido' } } });
  signOut.mockResolvedValue(undefined);

  fetchMock = vi.fn().mockResolvedValue(resposta({ data: [] }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Import dinamico: o mock de ./supabase precisa estar de pe antes. */
async function carregarApi() {
  return (await import('./api')).api;
}

describe('autenticacao', () => {
  it('requisicao_comSessaoAtiva_enviaOTokenNoCabecalhoAuthorization', async () => {
    // Arrange
    const api = await carregarApi();

    // Act
    await api.contas.list();

    // Assert
    const [, init] = fetchMock.mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-valido');
  });

  it('requisicao_semSessao_naoChegaAFazerAChamadaHttp', async () => {
    // Sem token nao ha o que autenticar: gastar a viagem seria certeza de 401.
    getSession.mockResolvedValue({ data: { session: null } });
    const api = await carregarApi();

    await expect(api.contas.list()).rejects.toThrow(/sess/i);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requisicao_semSessao_encerraASessaoLocal', async () => {
    // Token velho no AsyncStorage sobrevive a reinstalacao do app. Sem
    // derrubar a sessao, as telas ficariam com "nao autenticado" e valores
    // zerados — parece defeito, mas e falta de login.
    getSession.mockResolvedValue({ data: { session: null } });
    const api = await carregarApi();

    await expect(api.contas.list()).rejects.toThrow();

    expect(signOut).toHaveBeenCalled();
  });

  it('respostaHttp401_tokenRecusadoPelaApi_encerraASessaoLocal', async () => {
    fetchMock.mockResolvedValue(resposta({ error: 'nao autenticado' }, 401));
    const api = await carregarApi();

    await expect(api.contas.list()).rejects.toThrow(/sess/i);

    expect(signOut).toHaveBeenCalled();
  });
});

describe('montagem da requisicao', () => {
  it('requisicao_semCacheExplicito_pedeQueNadaSejaReaproveitado', async () => {
    // O OkHttp do Android honra cache HTTP por conta propria: sem isso o
    // painel voltava com o saldo de minutos antes.
    const api = await carregarApi();

    await api.dashboard.get();

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.cache).toBe('no-store');
  });

  it('get_comFiltros_montaAQueryStringIgnorandoValoresVazios', async () => {
    const api = await carregarApi();

    await api.transacoes.list({ tipo: 'Saida', de: '2026-09-01', id_conta: undefined });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('tipo=Saida');
    expect(url).toContain('de=2026-09-01');
    expect(url).not.toContain('id_conta');
  });

  it('get_semFiltros_naoAcrescentaInterrogacaoNaUrl', async () => {
    const api = await carregarApi();

    await api.metas.list();

    const [url] = fetchMock.mock.calls[0];
    expect(url).not.toContain('?');
  });

  it('post_comCorpo_serializaOJsonNoBody', async () => {
    fetchMock.mockResolvedValue(resposta({ data: { id_conta: 1 } }, 201));
    const api = await carregarApi();

    await api.contas.create({
      instituicao: 'Nubank',
      numero_conta: '12345',
      tipo_conta: 'Corrente',
      saldo_atual: 0,
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toMatchObject({ instituicao: 'Nubank' });
  });
});

describe('leitura da resposta', () => {
  it('resposta200_comEnvelopeData_devolveApenasOConteudo', async () => {
    // As rotas respondem { data: ... }; a tela nao deve conhecer o envelope.
    fetchMock.mockResolvedValue(resposta({ data: [{ id_conta: 1 }] }));
    const api = await carregarApi();

    const contas = await api.contas.list();

    expect(contas).toEqual([{ id_conta: 1 }]);
  });

  it('resposta204_semCorpo_devolveNuloSemTentarLerJson', async () => {
    // DELETE responde 204; chamar .json() num corpo vazio lancaria.
    fetchMock.mockResolvedValue({ ok: true, status: 204 } as Response);
    const api = await carregarApi();

    await expect(api.contas.delete(1)).resolves.toBeNull();
  });

  it('resposta400_comMensagemDaApi_propagaAMensagemRecebida', async () => {
    fetchMock.mockResolvedValue(resposta({ error: 'campos obrigatorios: titulo' }, 400));
    const api = await carregarApi();

    await expect(api.metas.create({ titulo: '', valor_objetivo: 1, data_limite: 'x' })).rejects.toThrow(
      'campos obrigatorios: titulo'
    );
  });

  it('resposta500_semCorpoLegivel_usaMensagemGenericaComStatus', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('corpo nao e json');
      },
    } as unknown as Response);
    const api = await carregarApi();

    await expect(api.contas.list()).rejects.toThrow(/500/);
  });

  it('falhaDeRede_fetchRejeita_viraMensagemSobreConexao', async () => {
    // fetch so rejeita por falha de rede; a mensagem precisa dizer isso, e
    // nao um erro tecnico que a pessoa nao sabe interpretar.
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const api = await carregarApi();

    await expect(api.contas.list()).rejects.toThrow(/conex/i);
  });
});
