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
      await verifyCollections({ logger, services, getSchema });
    } catch (error: any) {
      logger.warn(`[inFrame Extension] Erro ao verificar coleções: ${error.message}`);
    }
  });
});

// Função para verificar se as coleções existem
async function verifyCollections({ logger, services, getSchema }: any) {
  const { CollectionsService } = services;
  const currentSchema = await getSchema();
  
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: null as any,
  });

  try {
    const allCollections = await collectionsService.readByQuery();
    const existingCollectionNames = new Set(allCollections.map((c: any) => c.collection));
    
    const ourCollections = schema.collections.map((c: any) => c.collection);
    const existingCount = ourCollections.filter(c => existingCollectionNames.has(c)).length;
    const totalCount = ourCollections.length;

    if (existingCount === totalCount) {
      logger.info(`[inFrame Extension] Todas as ${totalCount} coleções estão configuradas corretamente ✓`);
    } else {
      logger.warn(
        `[inFrame Extension] ${existingCount}/${totalCount} coleções encontradas. Execute setup se necessário.`,
      );
    }
  } catch (error: any) {
    logger.warn(`[inFrame Extension] Erro ao verificar coleções: ${error.message}`);
  }
}

// Função principal para criar as coleções
async function setupCollections({ services, logger, database, getSchema }: any) {
  const { CollectionsService, RelationsService } = services;

  logger.info('[inFrame Extension] Iniciando configuração de coleções...');

  // Obter o schema atual
  const currentSchema = await getSchema();

  // Criar serviço de coleções
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: database,
  });

  // Verificar se as coleções já existem usando o serviço
  let allCollections: any[] = [];
  
  try {
    allCollections = await collectionsService.readByQuery();
  } catch (error: any) {
    logger.warn(`[inFrame Extension] Erro ao listar coleções: ${error.message}`);
    allCollections = [];
  }

  const existingCollectionNames = new Set(allCollections.map((c: any) => c.collection));

  let collectionsCreated = 0;
  let fieldsCreated = 0;
  let relationsCreated = 0;

  // Ordenar coleções por dependências (folders primeiro, depois as que dependem deles)
  const orderedCollections = [...schema.collections].sort((a: any, b: any) => {
    const aIsFolder = !a.meta?.group; // Coleções sem grupo (folders) vêm primeiro
    const bIsFolder = !b.meta?.group;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    return 0;
  });

  const collectionNames = orderedCollections.map((c: any) => c.collection);

  logger.info(
    `[inFrame Extension] 📋 Coleções a serem criadas (se não existirem): ${collectionNames.join(', ')}`,
  );

  // Criar coleções com campos incluídos (conforme documentação oficial)
  for (const collection of orderedCollections) {
    if (!existingCollectionNames.has(collection.collection)) {
      try {
        logger.info(`[inFrame Extension] 🔨 Criando coleção: ${collection.collection}`);

        // Buscar campos que pertencem a esta coleção
        const collectionFields = schema.fields.filter((f: any) => f.collection === collection.collection);
        
        // Criar coleção com campos incluídos (API do Directus suporta isso)
        await collectionsService.createOne({
          collection: collection.collection,
          meta: collection.meta,
          fields: collectionFields.length > 0 ? collectionFields : undefined,
        });

        collectionsCreated++;
        fieldsCreated += collectionFields.length;
        
        logger.info(
          `[inFrame Extension] ✅ Coleção ${collection.collection} criada com ${collectionFields.length} campo(s)`
        );
      } catch (error: any) {
        logger.error(`[inFrame Extension] ❌ Erro ao criar coleção ${collection.collection}: ${error.message}`);
      }
    } else {
      logger.info(`[inFrame Extension] ⏭️  Coleção ${collection.collection} já existe, verificando campos...`);
    }
  }

  // Se criamos novas coleções, limpar cache e forçar reload do schema
  if (collectionsCreated > 0) {
    logger.info(`[inFrame Extension] ${collectionsCreated} coleção(ões) criada(s) com ${fieldsCreated} campo(s)`);
    logger.info('[inFrame Extension] 🧹 Aguardando propagação do schema no Directus...');
    
    // Aguardar para o schema ser atualizado no banco
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    // Forçar atualização do schema chamando getSchema várias vezes
    for (let i = 0; i < 3; i++) {
      await getSchema({ accountability: null, database });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    
    logger.info('[inFrame Extension] ✅ Schema sincronizado (aguardou 9 segundos)');
  }

  // Atualizar schema para criação de relações (forçar reload completo)
  const updatedSchema = await getSchema({ accountability: null, database });
  
  logger.info('[inFrame Extension] 📋 Verificando relações...');
  
  // Debug: listar todas as coleções disponíveis no schema
  const availableCollections = Object.keys(updatedSchema.collections || {});

  const ourCollections = availableCollections.filter(c => 
    c.startsWith('inframe') || c === 'languages'
  );
  
  logger.info(`[inFrame Extension] 🔍 Coleções encontradas no schema: ${ourCollections.join(', ') || 'nenhuma'}`);
  logger.info(`[inFrame Extension] 📊 Total de coleções no schema: ${availableCollections.length}`);

  // Recriar RelationsService com schema atualizado
  const updatedRelationsService = new RelationsService({
    schema: updatedSchema,
    knex: database,
  });

  // Criar relações
  for (const relation of schema.relations) {
    try {
      // Verificar se as coleções envolvidas existem diretamente no banco
      // EXCETO coleções do sistema (directus_*)
      if (!relation.collection.startsWith('directus_')) {
        const collectionExists = await database
          .select('collection')
          .from('directus_collections')
          .where('collection', relation.collection)
          .first();
        
        if (!collectionExists) {
          logger.warn(
            `[inFrame Extension] ⚠️  Coleção ${relation.collection} não encontrada no banco, pulando relação`,
          );

          continue;
        }
      }

      if (relation.related_collection && !relation.related_collection.startsWith('directus_')) {
        const relatedExists = await database
          .select('collection')
          .from('directus_collections')
          .where('collection', relation.related_collection)
          .first();
          
        if (!relatedExists) {
          logger.warn(
            `[inFrame Extension] ⚠️  Coleção relacionada ${relation.related_collection} não encontrada no banco, pulando relação`,
          );

          continue;
        }
      }

      // Verificar se a relação já existe
      const existingRelationCheck = await database
        .select('*')
        .from('directus_relations')
        .where('many_collection', relation.collection)
        .where('many_field', relation.field)
        .first();

      if (existingRelationCheck) {
        logger.info(`[inFrame Extension] ⏭️  Relação ${relation.collection}.${relation.field} já existe`);
        continue;
      }

      logger.info(
        `[inFrame Extension] 🔗 Criando relação: ${relation.collection}.${relation.field}`,
      );

      // Como o schema não é atualizado a tempo, vamos criar a relação diretamente no banco
      try {
        await database('directus_relations').insert({
          many_collection: relation.meta.many_collection,
          many_field: relation.meta.many_field,
          one_collection: relation.meta.one_collection,
          one_field: relation.meta.one_field,
          one_collection_field: relation.meta.one_collection_field,
          one_allowed_collections: relation.meta.one_allowed_collections ? JSON.stringify(relation.meta.one_allowed_collections) : null,
          junction_field: relation.meta.junction_field,
          sort_field: relation.meta.sort_field,
          one_deselect_action: relation.meta.one_deselect_action || 'nullify',
        });
        
        relationsCreated++;

        logger.info(
          `[inFrame Extension] ✅ Relação ${relation.collection}.${relation.field} criada diretamente no banco`,
        );
      } catch (dbError: any) {
        // Se der erro (ex: já existe), tentar com o serviço
        logger.warn(`[inFrame Extension] Tentativa direta falhou: ${dbError.message}, tentando com serviço...`);
        
        await updatedRelationsService.createOne({
          collection: relation.collection,
          field: relation.field,
          related_collection: relation.related_collection,
          meta: relation.meta,
          schema: relation.schema,
        });

        relationsCreated++;

        logger.info(
          `[inFrame Extension] ✅ Relação ${relation.collection}.${relation.field} criada via serviço`,
        );
      }
    } catch (error: any) {
      logger.error(
        `[inFrame Extension] ❌ Erro ao criar relação ${relation.collection}.${relation.field}: ${error.message}`,
      );
    }
  }

  logger.info(
    `[inFrame Extension] ✅ Configuração concluída! Criadas: ${collectionsCreated} coleção(ões), ${fieldsCreated} campo(s), ${relationsCreated} relação(ões)`,
  );
}
