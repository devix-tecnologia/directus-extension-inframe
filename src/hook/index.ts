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

  const relationsService = new RelationsService({
    schema: currentSchema,
    knex: database,
  });

  // Ordenar coleções por dependências (folders primeiro, depois as que dependem deles)
  const orderedCollections = [...schema.collections].sort((a: any, b: any) => {
    const aIsFolder = !a.meta?.group; // Coleções sem grupo (folders) vêm primeiro
    const bIsFolder = !b.meta?.group;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    return 0;
  });

  logger.info(
    `[inFrame Extension] 📋 Ordem de criação: ${orderedCollections.map((c: any) => c.collection).join(' → ')}`,
  );

  // Criar coleções na ordem correta
  for (const collection of orderedCollections) {
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

    // Aguardar mais tempo para o schema ser sincronizado
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Atualizar schema e recriar serviços com novo schema
    const updatedSchema = await getSchema({ accountability: null, database });
    
    logger.info('[inFrame Extension] 📋 Schema atualizado, recriando serviços...');

    // Recriar FieldsService com schema atualizado
    const updatedFieldsService = new FieldsService({
      schema: updatedSchema,
      knex: database,
    });

    // Verificar se as coleções estão disponíveis no schema
    const availableCollections = updatedSchema.collections || {};

    logger.info(
      `[inFrame Extension] Coleções disponíveis no schema: ${Object.keys(availableCollections).length}`,
    );

    // Criar campos usando o serviço atualizado
    for (const field of schema.fields) {
      try {
        // Verificar se a coleção existe no schema
        if (!availableCollections[field.collection]) {
          logger.warn(
            `[inFrame Extension] ⚠ Coleção ${field.collection} não encontrada no schema, pulando campo ${field.field}`,
          );

          continue;
        }

        // Verificar se o campo já existe
        const existingField = await database
          .select('*')
          .from('directus_fields')
          .where('collection', field.collection)
          .where('field', field.field)
          .first();

        if (!existingField) {
          logger.info(`[inFrame Extension] 🔨 Criando campo: ${field.collection}.${field.field}`);
          
          await updatedFieldsService.createField(field.collection, {
            field: field.field,
            type: field.type as any,
            schema: field.schema,
            meta: field.meta,
          });

          fieldsCreated++;
          logger.info(`[inFrame Extension] ✅ Campo ${field.collection}.${field.field} criado`);
        }
      } catch (error: any) {
        // Ignorar erro se for campo de sistema ou duplicado
        if (!error.message?.includes('already exists')) {
          logger.error(
            `[inFrame Extension] ❌ Erro ao criar campo ${field.collection}.${field.field}: ${error.message}`,
          );
        }
      }
    }

    // Aguardar novamente e atualizar schema para relações
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const finalSchema = await getSchema({ accountability: null, database });

    // Recriar RelationsService com schema final
    const updatedRelationsService = new RelationsService({
      schema: finalSchema,
      knex: database,
    });

    logger.info('[inFrame Extension] 📋 Preparando criação de relações...');

    // Criar relações usando serviço atualizado
    for (const relation of schema.relations) {
      try {
        // Verificar se as coleções envolvidas existem
        if (!finalSchema.collections[relation.collection]) {
          logger.warn(
            `[inFrame Extension] ⚠ Coleção ${relation.collection} não encontrada, pulando relação`,
          );

          continue;
        }

        if (relation.related_collection && !finalSchema.collections[relation.related_collection]) {
          logger.warn(
            `[inFrame Extension] ⚠ Coleção ${relation.related_collection} não encontrada, pulando relação`,
          );

          continue;
        }

        // Verificar se a relação já existe
        const existingRelation = await database
          .select('*')
          .from('directus_relations')
          .where('many_collection', relation.collection)
          .where('many_field', relation.field)
          .first();

        if (!existingRelation) {
          logger.info(
            `[inFrame Extension] 🔗 Criando relação: ${relation.collection}.${relation.field}`,
          );

          await updatedRelationsService.createOne({
            collection: relation.collection,
            field: relation.field,
            related_collection: relation.related_collection,
            meta: relation.meta,
            schema: relation.schema,
          });

          relationsCreated++;

          logger.info(
            `[inFrame Extension] ✅ Relação ${relation.collection}.${relation.field} criada`,
          );
        }
      } catch (error: any) {
        logger.error(
          `[inFrame Extension] ❌ Erro ao criar relação ${relation.collection}.${relation.field}: ${error.message}`,
        );
      }
    }

    logger.info(
      `[inFrame Extension] ✅ Configuração concluída! ` +
        `Criadas: ${collectionsCreated} coleções, ${fieldsCreated} campos, ${relationsCreated} relações`,
    );
  } else {
    logger.info('[inFrame Extension] Nenhuma coleção nova criada, pulando criação de campos e relações');
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
