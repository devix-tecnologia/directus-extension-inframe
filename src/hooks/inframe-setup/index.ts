import { defineHook } from '@directus/extensions-sdk';
import schema from '../../../schema.json';

interface SetupContext {
  services: any;
  logger: any;
  database: any;
  getSchema: any;
}

export default defineHook(
  (
    { action, init }: { action: any; init: any },
    { services, logger, database, getSchema }: { services: any; logger: any; database: any; getSchema: any },
  ) => {
    logger.info('[inFrame Extension] 🔌 Hook registered, waiting for events...');

    // Hook on initialization event - runs after routes are registered
    // This ensures collections are created before server fully starts
    init('routes.after', async () => {
      logger.info('[inFrame Extension] 🚀 routes.after event triggered, setting up collections...');

      try {
        await setupCollections({ services, logger, database, getSchema });
      } catch (error: any) {
        logger.error(`[inFrame Extension] Error during routes.after setup: ${error.message}`);
      }
    });

    // Hook on server start event - runs once when server starts
    // This is the ideal place to enable the module in settings
    action('server.start', async () => {
      logger.info('[inFrame Extension] 🚀 server.start event triggered, enabling module...');

      try {
        // Also run setup collections here as backup, in case routes.after didn't run
        await setupCollections({ services, logger, database, getSchema });
        await enableInframeModule({ logger, database });
      } catch (error: any) {
        logger.error(`[inFrame Extension] Error during server.start setup: ${error.message}`);
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
        await verifyCollections({ logger, services, database, getSchema });
      } catch (error: any) {
        logger.warn(`[inFrame Extension] Error verifying collections: ${error.message}`);
      }
    });
  },
);

// Function to verify if collections exist
async function verifyCollections({ logger, services, getSchema }: SetupContext) {
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
      logger.warn(`[inFrame Extension] ${existingCount}/${totalCount} collections found. Run setup if needed.`);
    }
  } catch (error: any) {
    logger.warn(`[inFrame Extension] Error verifying collections: ${error.message}`);
  }
}

// Main function to create collections - Based on schema-management-module logic
async function setupCollections({ services, logger, database, getSchema }: SetupContext) {
  const { CollectionsService, FieldsService, RelationsService } = services;

  logger.info('[inFrame Extension] Starting collections configuration...');

  // Get current schema
  const currentSchema = await getSchema();

  // Create services
  const collectionsService = new CollectionsService({
    schema: currentSchema,
    knex: database,
  });

  // Get existing collections
  let allCollections: any[];

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

  const collections = schema.collections || [];
  const fields = schema.fields || [];
  const relations = schema.relations || [];

  logger.info(`[inFrame Extension] 📋 Collections to process: ${collections.map((c: any) => c.collection).join(', ')}`);

  // STEP 1: Import collections recursively (handling folder dependencies)
  try {
    const importedCollections: string[] = [];
    let lastLength: number | null = null;

    // Keep looping until no more collections can be imported
    while (importedCollections.length !== lastLength) {
      lastLength = importedCollections.length;

      for (const collection of collections) {
        // Skip if already imported
        if (importedCollections.includes(collection.collection)) {
          continue;
        }

        // Check if collection has a group (folder) dependency
        if (collection.meta?.group) {
          const { group } = collection.meta;

          // Skip if group doesn't exist in schema and doesn't exist in database
          if (!collections.some((c: any) => c.collection === group) && !existingCollectionNames.has(group)) {
            importedCollections.push(collection.collection);

            logger.warn(
              `[inFrame Extension] ⚠️  Skipping collection "${collection.collection}" because its group "${group}" does not exist`,
            );

            continue;
          }

          // Wait for group to be imported first
          if (!importedCollections.includes(group) && !existingCollectionNames.has(group)) {
            continue;
          }
        }

        // Import collection if it doesn't exist
        if (!existingCollectionNames.has(collection.collection)) {
          try {
            logger.info(`[inFrame Extension] 🔨 Creating collection: ${collection.collection}`);

            // Get fields for this collection
            const collectionFields = fields.filter((f: any) => f.collection === collection.collection);

            // Create collection WITH fields (prevents auto-creation of id field)
            await collectionsService.createOne({
              collection: collection.collection,
              meta: collection.meta,
              schema: collection.schema || null,
              fields: collectionFields.map((field: any) => {
                const fieldData: any = {
                  field: field.field,
                  type: field.type,
                  meta: field.meta,
                };

                // Only add schema if not null (alias fields don't have schema)
                if (field.schema !== null) {
                  fieldData.schema = field.schema;
                }

                return fieldData;
              }),
            });

            collectionsCreated++;
            fieldsCreated += collectionFields.length;

            logger.info(
              `[inFrame Extension] ✅ Collection ${collection.collection} created with ${collectionFields.length} field(s)`,
            );
          } catch (error: any) {
            logger.error(`[inFrame Extension] ❌ Error creating collection ${collection.collection}: ${error.message}`);
          }
        } else {
          logger.info(`[inFrame Extension] ⏭️  Collection ${collection.collection} already exists`);
        }

        importedCollections.push(collection.collection);
      }
    }

    logger.info(`[inFrame Extension] ✅ Imported ${collectionsCreated} collection(s) with ${fieldsCreated} field(s)`);
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error during collections import: ${error.message}`);
  }

  // STEP 2: Add missing fields to existing collections (PATCH mode)
  try {
    // Refresh schema after collections creation
    const updatedSchema = await getSchema({ accountability: null, database });

    const updatedFieldsService = new FieldsService({
      schema: updatedSchema,
      knex: database,
    });

    for (const field of fields) {
      // Only process if collection exists
      if (existingCollectionNames.has(field.collection) || collectionsCreated > 0) {
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

            const fieldData: any = {
              field: field.field,
              type: field.type,
              meta: field.meta,
            };

            if (field.schema !== null) {
              fieldData.schema = field.schema;
            }

            await updatedFieldsService.createField(field.collection, fieldData);

            fieldsCreated++;

            logger.info(`[inFrame Extension] ✅ Field ${field.collection}.${field.field} created`);
          }
        } catch (error: any) {
          logger.error(
            `[inFrame Extension] ❌ Error creating field ${field.collection}.${field.field}: ${error.message}`,
          );
        }
      }
    }

    logger.info(`[inFrame Extension] ✅ Total fields created: ${fieldsCreated}`);
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error during fields import: ${error.message}`);
  }

  // STEP 3: Import relations
  try {
    // Refresh schema again before relations
    const updatedSchema = await getSchema({ accountability: null, database });

    const updatedRelationsService = new RelationsService({
      schema: updatedSchema,
      knex: database,
    });

    logger.info('[inFrame Extension] 📋 Importing relations...');

    for (const relation of relations) {
      try {
        // Check if relation already exists
        const existingRelation = await database
          .select('*')
          .from('directus_relations')
          .where('many_collection', relation.collection)
          .where('many_field', relation.field)
          .first();

        if (existingRelation) {
          logger.info(
            `[inFrame Extension] ⏭️  Relation ${relation.collection}.${relation.field} -> ${relation.related_collection} already exists`,
          );

          continue;
        }

        logger.info(
          `[inFrame Extension] 🔗 Creating relation: ${relation.collection}.${relation.field} -> ${relation.related_collection}`,
        );

        // Create relation using service
        await updatedRelationsService.createOne({
          collection: relation.collection,
          field: relation.field,
          related_collection: relation.related_collection,
          meta: relation.meta,
          schema: relation.schema,
        });

        relationsCreated++;

        logger.info(
          `[inFrame Extension] ✅ Relation ${relation.collection}.${relation.field} -> ${relation.related_collection} created`,
        );
      } catch (error: any) {
        logger.error(
          `[inFrame Extension] ❌ Error creating relation ${relation.collection}.${relation.field}: ${error.message}`,
        );
      }
    }

    logger.info(`[inFrame Extension] ✅ Total relations created: ${relationsCreated}`);
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error during relations import: ${error.message}`);
  }

  // STEP 4: Setup default languages (Português, English, Español)
  try {
    await setupLanguages({ services, logger, database, getSchema });
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error during languages setup: ${error.message}`);
  }

  // STEP 5: Final summary
  logger.info(
    `[inFrame Extension] 🎉 Configuration complete! Created: ${collectionsCreated} collection(s), ${fieldsCreated} field(s), ${relationsCreated} relation(s)`,
  );

  // Force schema refresh
  try {
    await getSchema({ accountability: null, database });

    logger.info('[inFrame Extension] ✅ Schema refreshed');
  } catch (error: any) {
    logger.warn(`[inFrame Extension] ⚠️  Error refreshing schema: ${error.message}`);
  }
}

// Function to setup default languages
async function setupLanguages({ services, logger, database, getSchema }: SetupContext) {
  logger.info('[inFrame Extension] 🌍 Setting up default languages...');

  const { ItemsService } = services;

  // Default languages to create
  const defaultLanguages = [
    {
      code: 'pt-BR',
      name: 'Português',
      direction: 'ltr',
    },
    {
      code: 'en-US',
      name: 'English',
      direction: 'ltr',
    },
    {
      code: 'es-ES',
      name: 'Español',
      direction: 'ltr',
    },
  ];

  try {
    // Check if language collection exists
    const collectionExists = await database
      .select('collection')
      .from('directus_collections')
      .where('collection', 'language')
      .first();

    if (!collectionExists) {
      logger.warn('[inFrame Extension] ⚠️  Language collection does not exist, skipping language setup');

      return;
    }

    // Get current schema
    const currentSchema = await getSchema({ accountability: null, database });

    // Create ItemsService for language collection
    const languagesService = new ItemsService('language', {
      schema: currentSchema,
      knex: database,
    });

    let languagesCreated = 0;

    for (const language of defaultLanguages) {
      try {
        // Check if language already exists
        const existingLanguage = await database.select('*').from('language').where('code', language.code).first();

        if (existingLanguage) {
          logger.info(`[inFrame Extension] ⏭️  Language ${language.code} (${language.name}) already exists`);

          continue;
        }

        // Create language
        await languagesService.createOne(language);

        languagesCreated++;

        logger.info(`[inFrame Extension] ✅ Language ${language.code} (${language.name}) created`);
      } catch (error: any) {
        logger.error(`[inFrame Extension] ❌ Error creating language ${language.code}: ${error.message}`);
      }
    }

    if (languagesCreated > 0) {
      logger.info(`[inFrame Extension] ✅ Created ${languagesCreated} default language(s)`);
    } else {
      logger.info('[inFrame Extension] ℹ️  All default languages already exist');
    }
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error setting up languages: ${error.message}`);
  }
}

// Function to enable inframe module in project settings
export async function enableInframeModule({ logger, database }: { logger: any; database: any }) {
  try {
    logger.info('[inFrame Extension] Checking module visibility in project settings...');

    // Get current settings
    const settings = await database.select('*').from('directus_settings').first();

    if (!settings) {
      logger.warn('[inFrame Extension] ⚠️  Settings not found, skipping module activation');
      return;
    }

    // Parse module_bar JSON
    let moduleBar = [];

    // If module_bar is null, create default module_bar with standard modules
    if (!settings.module_bar) {
      logger.info('[inFrame Extension] ℹ️  module_bar is null, creating default configuration...');

      // Create default module_bar with Directus standard modules
      moduleBar = [
        { type: 'module', id: 'content', enabled: true },
        { type: 'module', id: 'users', enabled: true },
        { type: 'module', id: 'files', enabled: true },
        { type: 'module', id: 'insights', enabled: true },
        { type: 'link', id: 'docs', enabled: true },
        { type: 'module', id: 'settings', enabled: true },
      ];
    } else if (typeof settings.module_bar === 'string') {
      try {
        moduleBar = JSON.parse(settings.module_bar);
      } catch {
        logger.warn('[inFrame Extension] ⚠️  Error parsing module_bar, skipping module activation');
        return;
      }
    } else {
      // Colunas do tipo json/jsonb (ex.: Postgres via pg/knex) já chegam
      // parseadas como array/objeto — não há string pra fazer JSON.parse.
      moduleBar = settings.module_bar;
    }

    // Check if inframe module already exists in module_bar
    const inframeModuleIndex = moduleBar.findIndex((m: any) => m.type === 'module' && m.id === 'inframe');

    if (inframeModuleIndex !== -1) {
      // Module exists, check if it's enabled
      if (moduleBar[inframeModuleIndex].enabled) {
        logger.info('[inFrame Extension] ✓ Inframe module already enabled in project settings');
        return;
      }

      // Enable the module
      moduleBar[inframeModuleIndex].enabled = true;
      logger.info('[inFrame Extension] ✅ Enabled existing inframe module in project settings');
    } else {
      // Add inframe module to module_bar
      moduleBar.push({
        type: 'module',
        id: 'inframe',
        enabled: true,
      });

      logger.info('[inFrame Extension] ✅ Added inframe module to project settings');
    }

    // Update settings
    await database('directus_settings').update({
      module_bar: JSON.stringify(moduleBar),
    });

    logger.info('[inFrame Extension] ✅ Project settings updated successfully');
  } catch (error: any) {
    logger.error(`[inFrame Extension] ❌ Error enabling inframe module: ${error.message}`);
  }
}
