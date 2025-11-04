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
  const { CollectionsService, FieldsService, RelationsService } = services;

  logger.info('[inFrame Extension] Iniciando configuração de coleções...');

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
  let fieldsCreated = 0;
  let relationsCreated = 0;

  // Criar serviços
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: database,
  });

  const fieldsService = new FieldsService({
    schema: currentSchema,
    knex: database,
  });

  const relationsService = new RelationsService({
    schema: currentSchema,
    knex: database,
  });

  // Criar coleções
  for (const collection of schema.collections) {
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

    // Atualizar schema para incluir as novas coleções
    await getSchema({ accountability: null, database });
  }

  // Criar campos
  for (const field of schema.fields) {
    try {
      // Verificar se o campo já existe
      const existingField = await database
        .select('*')
        .from('directus_fields')
        .where('collection', field.collection)
        .where('field', field.field)
        .first();

      if (!existingField) {
        await fieldsService.createField(field.collection, {
          field: field.field,
          type: field.type as any,
          schema: field.schema,
          meta: field.meta,
        });

        fieldsCreated++;
      }
    } catch (error: any) {
      // Ignorar erro se for campo de sistema ou duplicado
      if (!error.message?.includes('already exists')) {
        logger.warn(`[inFrame Extension] Aviso ao criar campo ${field.collection}.${field.field}: ${error.message}`);
      }
    }
  }

  // Criar relações
  if (schema.relations && Array.isArray(schema.relations)) {
    for (const relation of schema.relations) {
      try {
        // Verificar se a relação já existe
        const existingRelation = await database
          .select('*')
          .from('directus_relations')
          .where('many_collection', relation.collection)
          .where('many_field', relation.field)
          .first();

        if (!existingRelation) {
          await relationsService.createOne(relation);
          relationsCreated++;
        }
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          logger.warn(
            `[inFrame Extension] Aviso ao criar relação ${relation.collection}.${relation.field}: ${error.message}`,
          );
        }
      }
    }
  }

  // Log do resultado
  if (collectionsCreated > 0 || fieldsCreated > 0 || relationsCreated > 0) {
    logger.info(
      `[inFrame Extension] Configuração concluída! ` +
        `Criadas: ${collectionsCreated} coleções, ${fieldsCreated} campos, ${relationsCreated} relações ✓`,
    );
  } else {
    logger.info('[inFrame Extension] Todas as coleções já estão configuradas ✓');
  }
}
