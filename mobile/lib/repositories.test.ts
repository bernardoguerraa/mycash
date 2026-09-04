import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Testes dos repositorios do app.
 *
 * O alvo aqui e a traducao camelCase -> snake_case e o encaminhamento para a
 * API. As regras de negocio em si (valor positivo, conclusao da meta, grupo
 * de vencimento) vivem em ../../src/domain, compartilhadas com o web e ja
 * cobertas la.
 *
 * Alguns casos abaixo existem como guarda contra regressao: enquanto o mobile
 * tinha copia propria das regras, elas divergiram do web — aceitava aporte em
 * meta concluida, somava sem arredondar centavos e nao validava conta
 * bloqueada. Os testes fixam o comportamento unificado.
 */

const getSession = vi.fn();
const signOut = vi.fn();

vi.mock('./supabase', () => ({
  supabase: { auth: { getSession, signOut } },
}));

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  getSession.mockResolvedValue({ data: { session: { access_token: 'token' } } });
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: {} }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function carregar() {
  return import('./repositories');
}

/** Corpo JSON enviado na chamada de indice `n`. */
function corpoEnviado(n = 0) {
  const [, init] = fetchMock.mock.calls[n];
  return JSON.parse(init?.body as string);
}

describe('transacoesRepository', () => {
  it('criar_camposEmCamelCase_traduzParaSnakeCaseDaApi', async () => {
    // Arrange
    const { transacoesRepository } = await carregar();

    // Act
    await transacoesRepository.criar({
      idConta: 3,
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao: 'Feira',
      valor: 87.5,
    });

    // Assert
    expect(corpoEnviado()).toMatchObject({
      id_conta: 3,
      tipo: 'Saida',
      categoria: 'Alimentacao',
      descricao: 'Feira',
      valor: 87.5,
    });
  });

  it('criar_descricaoComEspacosNasBordas_enviaOTextoAparado', async () => {
    const { transacoesRepository } = await carregar();

    await transacoesRepository.criar({
      idConta: 1,
      tipo: 'Saida',
      categoria: '  Lazer  ',
      descricao: '  Cinema  ',
      valor: 40,
    });

    expect(corpoEnviado()).toMatchObject({ categoria: 'Lazer', descricao: 'Cinema' });
  });

  it('criar_valorZero_recusaAntesDeChamarAApi', async () => {
    const { transacoesRepository } = await carregar();

    await expect(
      transacoesRepository.criar({
        idConta: 1,
        tipo: 'Saida',
        categoria: 'Outros',
        descricao: 'x',
        valor: 0,
      })
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('atualizar_apenasUmCampo_enviaSomenteOCampoAlterado', async () => {
    // PATCH parcial: mandar o objeto inteiro sobrescreveria o que a pessoa
    // nao editou.
    const { transacoesRepository } = await carregar();

    await transacoesRepository.atualizar(10, { descricao: 'Novo nome' });

    expect(corpoEnviado()).toEqual({ descricao: 'Novo nome' });
  });

  it('atualizar_valorNegativo_recusaAntesDeChamarAApi', async () => {
    const { transacoesRepository } = await carregar();

    await expect(transacoesRepository.atualizar(10, { valor: -5 })).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('listar_comPeriodo_encaminhaOsFiltrosParaAQueryString', async () => {
    // O recorte roda no Postgres, nao no celular.
    const { transacoesRepository } = await carregar();

    await transacoesRepository.listar({ de: '2026-09-01', ate: '2026-09-30' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('de=2026-09-01');
    expect(url).toContain('ate=2026-09-30');
  });
});

describe('contasRepository', () => {
  it('criar_semSaldoInformado_assumeZero', async () => {
    const { contasRepository } = await carregar();

    await contasRepository.criar({
      instituicao: 'Nubank',
      numeroConta: '12345',
      tipoConta: 'Corrente',
    });

    expect(corpoEnviado()).toMatchObject({ saldo_atual: 0 });
  });

  it('saldoConsolidado_variasContas_somaTodosOsSaldos', async () => {
    const { contasRepository } = await carregar();

    const total = contasRepository.saldoConsolidado([
      { saldo_atual: 1000 },
      { saldo_atual: 250.5 },
      { saldo_atual: -80.5 },
    ] as never);

    expect(total).toBe(1170);
  });
});

describe('metasRepository', () => {
  it('aportar_valorAbaixoDoObjetivo_naoConcluiAMeta', async () => {
    const { metasRepository } = await carregar();
    const meta = {
      id_meta: 1,
      valor_objetivo: 10000,
      valor_atual: 4000,
      status: 'EmAndamento',
    };

    await metasRepository.aportar(meta as never, 1000);

    expect(corpoEnviado()).toMatchObject({ valor_atual: 5000, status: 'EmAndamento' });
  });

  it('aportar_atingeOObjetivo_concluiAMeta', async () => {
    const { metasRepository } = await carregar();
    const meta = {
      id_meta: 1,
      valor_objetivo: 10000,
      valor_atual: 9000,
      status: 'EmAndamento',
    };

    await metasRepository.aportar(meta as never, 1000);

    expect(corpoEnviado()).toMatchObject({ status: 'Concluida' });
  });

  it('aportar_metaJaConcluida_recusaOAporte', async () => {
    // Regressao: a copia que o mobile mantinha aceitava este caso, e o
    // dinheiro entrava numa meta que ninguem acompanhava mais.
    const { metasRepository } = await carregar();
    const meta = {
      id_meta: 1,
      valor_objetivo: 10000,
      valor_atual: 10000,
      status: 'Concluida',
    };

    await expect(metasRepository.aportar(meta as never, 500)).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('aportar_valorComCentavos_arredondaAntesDeEnviar', async () => {
    // Regressao: sem arredondar, 0.1 + 0.2 chegava a API como
    // 0.30000000000000004.
    const { metasRepository } = await carregar();
    const meta = {
      id_meta: 1,
      valor_objetivo: 10000,
      valor_atual: 0.1,
      status: 'EmAndamento',
    };

    await metasRepository.aportar(meta as never, 0.2);

    expect(corpoEnviado()).toMatchObject({ valor_atual: 0.3 });
  });

  it('progresso_metadeDoObjetivo_retorna50PorCento', async () => {
    const { metasRepository } = await carregar();

    expect(metasRepository.progresso({ valor_objetivo: 1000, valor_atual: 500 } as never)).toBe(50);
  });
});

describe('lembretesRepository', () => {
  it('criar_valorPrevistoZero_recusaAntesDeChamarAApi', async () => {
    const { lembretesRepository } = await carregar();

    await expect(
      lembretesRepository.criar({
        descricao: 'Luz',
        dataVencimento: '2026-09-10',
        valorPrevisto: 0,
        tipo: 'ContaPagar',
      })
    ).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('alternarAtivo_lembreteAtivo_enviaFalse', async () => {
    const { lembretesRepository } = await carregar();

    await lembretesRepository.alternarAtivo({ id_lembrete: 7, ativo: true } as never);

    expect(corpoEnviado()).toEqual({ ativo: false });
  });

  it('grupoDe_vencimentoDeOntem_classificaComoVencido', async () => {
    const { lembretesRepository } = await carregar();
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const iso = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, '0')}-${String(
      ontem.getDate()
    ).padStart(2, '0')}`;

    expect(lembretesRepository.grupoDe(iso)).toBe('vencidos');
  });

  it('grupoDe_vencimentoHoje_classificaComoProximo', async () => {
    const { lembretesRepository } = await carregar();
    const hoje = new Date();
    const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(
      hoje.getDate()
    ).padStart(2, '0')}`;

    expect(lembretesRepository.grupoDe(iso)).toBe('proximos');
  });
});

describe('notificacoesRepository', () => {
  it('marcarComoLida_id_enviaApenasOCampoLida', async () => {
    const { notificacoesRepository } = await carregar();

    await notificacoesRepository.marcarComoLida(5);

    expect(corpoEnviado()).toEqual({ lida: true });
  });

  it('marcarTodasComoLidas_variosIds_disparaUmaChamadaPorNotificacao', async () => {
    const { notificacoesRepository } = await carregar();

    await notificacoesRepository.marcarTodasComoLidas([1, 2, 3]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('marcarTodasComoLidas_listaVazia_naoChamaAApi', async () => {
    const { notificacoesRepository } = await carregar();

    await notificacoesRepository.marcarTodasComoLidas([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('perfilRepository', () => {
  it('renomear_nomeSoComEspacos_recusaAntesDeChamarAApi', async () => {
    const { perfilRepository } = await carregar();

    await expect(perfilRepository.renomear('   ')).rejects.toThrow();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renomear_nomeComEspacosNasBordas_enviaOTextoAparado', async () => {
    const { perfilRepository } = await carregar();

    await perfilRepository.renomear('  Matheus Bueno  ');

    expect(corpoEnviado()).toEqual({ nome_completo: 'Matheus Bueno' });
  });
});
