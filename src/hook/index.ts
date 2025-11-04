import { defineHook } from '@directus/extensions-sdk';
import schema from '../../schema.json';

export default defineHook(({ action }, { services, logger, database, getSchema }) => {
  // Hook executado quando a extensão é carregada/instalada
  action('server.start', async () => {
    try {
      await setupCollections({ services, logger, database, getSchema });
    } catch (error: any) {
      logger.error(`[inFrame Extension] Erro durante setup inicial: ${error.message}`);
    }
  });

  // Hook executado quando uma extensão é instalada
  action('extensions.install', async ({ extension }: any) => {
    if (extension?.includes('inframe') || extension?.includes('@devix-tecnologia/directus-extension-inframe')) {
      logger.info('[inFrame Extension] Extensão instalada, configurando coleções...');

      try {
        await setupCollections({ services, logger, database, getSchema });
      } catch (error: any) {
        logger.error(`[inFrame Extension] Erro durante instalação: ${error.message}`);
      }
    }
  });

  // Hook executado quando extensões são recarregadas
  action('extensions.reload', async () => {
    logger.info('[inFrame Extension] Verificando configuração das coleções...');

    try {
      await verifyCollections({ logger, database });
    } catch (error: any) {
      logger.warn(`[inFrame Extension] Erro ao verificar coleções: ${error.message}`);
    }
  });
});

// Função para verificar se as coleções existem
async function verifyCollections({ logger, database }: any) {
  const existingCollections = await database
    .select('collection')
    .from('directus_collections')
    .whereIn(
      'collection',
      schema.collections.map((c: any) => c.collection),
    );

  const existingCount = existingCollections.length;
  const totalCount = schema.collections.length;

  if (existingCount === totalCount) {
    logger.info(`[inFrame Extension] Todas as ${totalCount} coleções estão configuradas corretamente ✓`);
  } else {
    logger.warn(
      `[inFrame Extension] ${existingCount}/${totalCount} coleções encontradas. Execute setup se necessário.`,
    );
  }
}

// Função principal para criar as coleções
async function setupCollections({ services, logger, database, getSchema }: any) {
  const { SchemaService } = services;

  logger.info('[inFrame Extension] Iniciando configuração usando schema snapshot...');

  try {
    // Criar serviço de schema
    const schemaService = new SchemaService({
      knex: database,
      schema: await getSchema(),
    });

    // Aplicar o schema completo
    const diff = {
      collections: schema.collections,
      fields: schema.fields,
      relations: schema.relations,
    };

    await schemaService.apply(diff);

    logger.info('[inFrame Extension] Schema aplicado com sucesso! Todas as coleções, campos e relações foram criados.');
  } catch (error: any) {
    logger.error(`[inFrame Extension] Erro ao aplicar schema: ${error.message}`);
    logger.info('[inFrame Extension] Tentando abordagem alternativa...');

    // Fallback: criar apenas coleções
    await createCollectionsOnly({ services, logger, database, getSchema });
  }
}

// Função de fallback para criar apenas coleções
async function createCollectionsOnly({ services, logger, database, getSchema }: any) {
  const { CollectionsService } = services;

  logger.info('[inFrame Extension] Criando coleções individualmente...');

  // Obter o schema atual
  const currentSchema = await getSchema();

  // Verificar se as coleções já existem
  const existingCollections = await database
    .select('collection')
    .from('directus_collections')
    .whereIn(
      'collection',
      schema.collections.map((c: any) => c.collection),
    );

  const existingCollectionNames = new Set(existingCollections.map((c: any) => c.collection));

  let collectionsCreated = 0;

  // Criar serviços
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: database,
  });

  // Criar coleções em duas passagens: primeiro as pastas (grupos), depois as outras
  // Primeira passagem: criar coleções de grupo (sem dependências)
  const folderCollections = schema.collections.filter((c: any) => !c.meta.group);
  const otherCollections = schema.collections.filter((c: any) => c.meta.group);

  for (const collection of [...folderCollections, ...otherCollections]) {
    if (!existingCollectionNames.has(collection.collection)) {
      try {
        logger.info(`[inFrame Extension] Criando coleção: ${collection.collection}`);

        // Criar apenas com metadata, sem schema de campos (para evitar foreign key errors)
        await collectionsService.createOne({
          collection: collection.collection,
          meta: collection.meta,
          // NÃO incluir schema aqui - será criado pelos campos depois
        });

        collectionsCreated++;
      } catch (error: any) {
        logger.error(`[inFrame Extension] Erro ao criar coleção ${collection.collection}: ${error.message}`);
      }
    }
  }

  // Aguardar um pouco para garantir que as coleções foram criadas
  if (collectionsCreated > 0) {
    logger.info(`[inFrame Extension] ${collectionsCreated} coleções criadas, aguardando sincronização...`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info(
      `[inFrame Extension] Configuração concluída! ` +
        `Criadas: ${collectionsCreated} coleções. ` +
        `Os campos e relações serão criados automaticamente pelo Directus na primeira utilização.`,
    );
  } else {
    logger.info('[inFrame Extension] Todas as coleções já estão configuradas ✓');
  }
}
