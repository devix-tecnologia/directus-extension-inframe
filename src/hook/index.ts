import { defineHook } from '@directus/extensions-sdk';
import schema from '../../schema.json';

export default defineHook(({ action, init }, { services, logger, database, getSchema }) => {
  logger.info('[inFrame Extension] 🔌 Hook registered, waiting for events...');

  // Hook on initialization event - runs after routes are registered
  init('routes.after', async () => {
    logger.info('[inFrame Extension] 🚀 routes.after event triggered, running setup...');

    try {
      await setupCollections({ services, logger, database, getSchema });
    } catch (error: any) {
      logger.error(`[inFrame Extension] Error during initial setup: ${error.message}`);
    }
  });

  // Hook on server start event (action)
  action('server.start', async () => {
    logger.info('[inFrame Extension] 🚀 server.start event triggered, running setup...');

    try {
      await setupCollections({ services, logger, database, getSchema });
    } catch (error: any) {
      logger.error(`[inFrame Extension] Error during initial setup: ${error.message}`);
    }
  });

  // Hook for when extension is installed/updated
  action('extensions.install', async ({ extension }: any) => {
    if (extension?.includes('inframe') || extension?.includes('@devix-tecnologia/directus-extension-inframe')) {
      logger.info('[inFrame Extension] Extension installed, configuring collections...');

      try {
        await setupCollections({ services, logger, database, getSchema });
      } catch (error: any) {
        logger.error(`[inFrame Extension] Error during installation: ${error.message}`);
      }
    }
  });

  // Hook for when extensions are reloaded
  action('extensions.reload', async () => {
    logger.info('[inFrame Extension] Verifying collections configuration...');

    try {
      await verifyCollections({ logger, services, getSchema });
    } catch (error: any) {
      logger.warn(`[inFrame Extension] Error verifying collections: ${error.message}`);
    }
  });
});

// Function to verify if collections exist
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
    const existingCount = ourCollections.filter((c) => existingCollectionNames.has(c)).length;
    const totalCount = ourCollections.length;

    if (existingCount === totalCount) {
      logger.info(`[inFrame Extension] All ${totalCount} collections are configured correctly ✓`);
    } else {
      logger.warn(
        `[inFrame Extension] ${existingCount}/${totalCount} collections found. Run setup if needed.`,
      );
    }
  } catch (error: any) {
    logger.warn(`[inFrame Extension] Error verifying collections: ${error.message}`);
  }
}

// Main function to create collections
async function setupCollections({ services, logger, database, getSchema }: any) {
  const { CollectionsService, RelationsService, FieldsService } = services;

  logger.info('[inFrame Extension] Starting collections configuration...');

  // Get current schema
  const currentSchema = await getSchema();

  // Create collections service
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: database,
  });

  // Check if collections already exist using the service
  let allCollections: any[] = [];

  try {
    allCollections = await collectionsService.readByQuery();
  } catch (error: any) {
    logger.warn(`[inFrame Extension] Error listing collections: ${error.message}`);
    allCollections = [];
  }

  const existingCollectionNames = new Set(allCollections.map((c: any) => c.collection));

  let collectionsCreated = 0;
  let fieldsCreated = 0;
  let relationsCreated = 0;

  // Order collections by dependencies (folders first, then those that depend on them)
  const orderedCollections = [...schema.collections].sort((a: any, b: any) => {
    const aIsFolder = !a.meta?.group; // Collections without group (folders) come first
    const bIsFolder = !b.meta?.group;

    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;

    return 0;
  });

  const collectionNames = orderedCollections.map((c: any) => c.collection);

  logger.info(`[inFrame Extension] 📋 Collections to be created (if they don't exist): ${collectionNames.join(', ')}`);

  // Create collections with included fields (as per official documentation)
  for (const collection of orderedCollections) {
    if (!existingCollectionNames.has(collection.collection)) {
      try {
        logger.info(`[inFrame Extension] 🔨 Creating collection: ${collection.collection}`);

        // Find fields that belong to this collection
        const collectionFields = schema.fields.filter((f: any) => f.collection === collection.collection);

        // Create only the collection first (WITHOUT fields)
        await collectionsService.createOne({
          collection: collection.collection,
          meta: collection.meta,
          schema: collection.schema || null,
        });

        collectionsCreated++;

        logger.info(
          `[inFrame Extension] ✅ Collection ${collection.collection} created (${collectionFields.length} field(s) will be created later)`,
        );
      } catch (error: any) {
        logger.error(`[inFrame Extension] ❌ Error creating collection ${collection.collection}: ${error.message}`);
      }
    } else {
      logger.info(`[inFrame Extension] ⏭️  Collection ${collection.collection} already exists, checking fields...`);
    }
  }

  // If we created new collections, clear cache and force schema reload
  if (collectionsCreated > 0) {
    logger.info(`[inFrame Extension] ${collectionsCreated} collection(s) created`);
    logger.info('[inFrame Extension] 🧹 Waiting for schema propagation in Directus...');

    // Wait for schema to be updated in database
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Force schema update by calling getSchema multiple times
    for (let i = 0; i < 3; i++) {
      await getSchema({ accountability: null, database });
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    logger.info('[inFrame Extension] ✅ Schema synchronized (waited 9 seconds)');
    logger.info('[inFrame Extension] 🔨 Creating fields...');

    // Create FieldsService with updated schema
    const updatedSchemaForFields = await getSchema({ accountability: null, database });

    const fieldsService = new FieldsService({
      schema: updatedSchemaForFields,
      knex: database,
    });

    // Create fields
    for (const field of schema.fields) {
      try {
        // Check if field already exists
        const existingField = await database
          .select('*')
          .from('directus_fields')
          .where('collection', field.collection)
          .where('field', field.field)
          .first();

        if (!existingField) {
          logger.info(`[inFrame Extension] 🔨 Creating field: ${field.collection}.${field.field}`);

          // For alias fields, we shouldn't pass the schema property
          const fieldData: any = {
            field: field.field,
            type: field.type,
            meta: field.meta,
          };

          // Only add schema if not null (alias fields don't have schema)
          if (field.schema !== null) {
            fieldData.schema = field.schema;
          }

          await fieldsService.createField(field.collection, fieldData);

          fieldsCreated++;
          logger.info(`[inFrame Extension] ✅ Field ${field.collection}.${field.field} created`);
        }
      } catch (error: any) {
        logger.error(`[inFrame Extension] ❌ Error creating field ${field.collection}.${field.field}: ${error.message}`);
      }
    }

    logger.info(`[inFrame Extension] ✅ ${fieldsCreated} field(s) created`);
  }

  // Update schema for relations creation (force complete reload)
  const updatedSchema = await getSchema({ accountability: null, database });

  logger.info('[inFrame Extension] 📋 Verifying relations...');

  // Debug: list all collections available in schema
  const availableCollections = Object.keys(updatedSchema.collections || {});

  const ourCollections = availableCollections.filter((c) => c.startsWith('inframe') || c === 'languages');

  logger.info(`[inFrame Extension] 🔍 Collections found in schema: ${ourCollections.join(', ') || 'none'}`);
  logger.info(`[inFrame Extension] 📊 Total collections in schema: ${availableCollections.length}`);

  // Recreate RelationsService with updated schema
  const updatedRelationsService = new RelationsService({
    schema: updatedSchema,
    knex: database,
  });

  // Create relations
  for (const relation of schema.relations) {
    try {
      // Check if involved collections exist directly in database
      // EXCEPT system collections (directus_*)
      if (!relation.collection.startsWith('directus_')) {
        const collectionExists = await database
          .select('collection')
          .from('directus_collections')
          .where('collection', relation.collection)
          .first();

        if (!collectionExists) {
          logger.warn(
            `[inFrame Extension] ⚠️  Collection ${relation.collection} not found in database, skipping relation`,
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
            `[inFrame Extension] ⚠️  Related collection ${relation.related_collection} not found in database, skipping relation`,
          );

          continue;
        }
      }

      // Check if relation already exists
      const existingRelationCheck = await database
        .select('*')
        .from('directus_relations')
        .where('many_collection', relation.collection)
        .where('many_field', relation.field)
        .first();

      if (existingRelationCheck) {
        logger.info(`[inFrame Extension] ⏭️  Relation ${relation.collection}.${relation.field} already exists`);
        continue;
      }

      logger.info(`[inFrame Extension] 🔗 Creating relation: ${relation.collection}.${relation.field}`);

      // Since schema is not updated in time, let's create the relation directly in database
      try {
        await database('directus_relations').insert({
          many_collection: relation.meta.many_collection,
          many_field: relation.meta.many_field,
          one_collection: relation.meta.one_collection,
          one_field: relation.meta.one_field,
          one_collection_field: relation.meta.one_collection_field,
          one_allowed_collections: relation.meta.one_allowed_collections
            ? JSON.stringify(relation.meta.one_allowed_collections)
            : null,
          junction_field: relation.meta.junction_field,
          sort_field: relation.meta.sort_field,
          one_deselect_action: relation.meta.one_deselect_action || 'nullify',
        });

        relationsCreated++;

        logger.info(
          `[inFrame Extension] ✅ Relation ${relation.collection}.${relation.field} created directly in database`,
        );
      } catch (dbError: any) {
        // If error occurs (e.g.: already exists), try with service
        logger.warn(`[inFrame Extension] Direct attempt failed: ${dbError.message}, trying with service...`);

        await updatedRelationsService.createOne({
          collection: relation.collection,
          field: relation.field,
          related_collection: relation.related_collection,
          meta: relation.meta,
          schema: relation.schema,
        });

        relationsCreated++;

        logger.info(`[inFrame Extension] ✅ Relation ${relation.collection}.${relation.field} created via service`);
      }
    } catch (error: any) {
      logger.error(
        `[inFrame Extension] ❌ Error creating relation ${relation.collection}.${relation.field}: ${error.message}`,
      );
    }
  }

  logger.info(
    `[inFrame Extension] ✅ Configuration complete! Created: ${collectionsCreated} collection(s), ${fieldsCreated} field(s), ${relationsCreated} relation(s)`,
  );

  // Force schema update and clear caches
  try {
    logger.info('[inFrame Extension] 🔄 Clearing cache and updating schema...');

    // Force a new schema read
    await getSchema({ accountability: null, database });

    // Wait a bit to ensure schema was updated
    await new Promise((resolve) => setTimeout(resolve, 2000));

    logger.info('[inFrame Extension] ✅ Cache cleared and schema updated');
  } catch (cacheError: any) {
    logger.warn(`[inFrame Extension] ⚠️  Error clearing cache: ${cacheError.message}`);
  }
}
