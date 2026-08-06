import { describe, expect, it, vi } from 'vitest';

// A importação real de '@directus/extensions-sdk' puxa transitivamente
// '@directus/themes', que exige 'pinia' — não resolvido neste ambiente de
// teste (isolamento de deps do pnpm). O teste não usa defineHook de verdade,
// então mockamos o pacote pra não carregar essa cadeia.
vi.mock('@directus/extensions-sdk', () => ({
  defineHook: (fn: unknown) => fn,
}));

const { enableInframeModule } = await import('./index.js');

/**
 * Mock mínimo do knex: `database` é uma função (usada como `database('tabela')`)
 * que também expõe `.select()` encadeável (usada como
 * `database.select('*').from('tabela').first()`) — exatamente como o hook usa.
 */
function makeDatabaseMock(settings: Record<string, unknown> | null) {
  const update = vi.fn().mockResolvedValue(undefined);

  const database = vi.fn(() => ({ update })) as unknown as {
    (table: string): { update: typeof update };
    select: ReturnType<typeof vi.fn>;
  };

  database.select = vi.fn(() => ({
    from: vi.fn(() => ({
      first: vi.fn().mockResolvedValue(settings),
    })),
  }));

  return { database, update };
}

function makeLoggerMock() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe('enableInframeModule', () => {
  it('aceita module_bar já parseado (array) — é o que o driver pg devolve pra coluna tipo json/jsonb', async () => {
    const { database, update } = makeDatabaseMock({
      module_bar: [{ type: 'module', id: 'content', enabled: true }],
    });

    const logger = makeLoggerMock();

    await enableInframeModule({ logger, database });

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Error parsing module_bar'));

    expect(update).toHaveBeenCalledTimes(1);
    const savedModuleBar = JSON.parse(update.mock.calls[0]![0].module_bar);
    expect(savedModuleBar).toContainEqual({ type: 'module', id: 'inframe', enabled: true });
  });

  it('continua aceitando module_bar como string JSON (compatibilidade com outros drivers/bancos)', async () => {
    const { database, update } = makeDatabaseMock({
      module_bar: JSON.stringify([{ type: 'module', id: 'content', enabled: true }]),
    });

    const logger = makeLoggerMock();

    await enableInframeModule({ logger, database });

    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('Error parsing module_bar'));

    expect(update).toHaveBeenCalledTimes(1);
    const savedModuleBar = JSON.parse(update.mock.calls[0]![0].module_bar);
    expect(savedModuleBar).toContainEqual({ type: 'module', id: 'inframe', enabled: true });
  });

  it('avisa e não quebra quando module_bar é uma string realmente inválida', async () => {
    const { database, update } = makeDatabaseMock({ module_bar: '{not valid json' });
    const logger = makeLoggerMock();

    await enableInframeModule({ logger, database });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Error parsing module_bar'));

    expect(update).not.toHaveBeenCalled();
  });
});
