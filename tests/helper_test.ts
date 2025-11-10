import { dockerHttpRequest } from './setup.js';
import { logger } from './test-logger.js';

export async function createTestCollection(testSuiteId?: string): Promise<string> {
  const collectionName = 'test_inframe_items';

  // 1. Criar a coleção
  const collectionData = {
    collection: collectionName,
    meta: {
      icon: 'article',
    },
  };

  const response = await dockerHttpRequest(
    'POST',
    '/collections',
    collectionData,
    {
      Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
    },
    testSuiteId,
  );

  if (process.env.DEBUG_TESTS) {
    logger.info('[DEBUG] Create collection response:', JSON.stringify(response, null, 2));
  }

  const createdCollectionName = response.data?.collection || response.collection;

  if (!createdCollectionName) {
    throw new Error('Failed to create collection: ' + JSON.stringify(response));
  }

  // 2. Criar os campos individualmente
  const fields = [
    {
      field: 'id',
      type: 'integer',
      meta: {
        hidden: true,
        interface: 'input',
        readonly: true,
      },
      schema: {
        is_primary_key: true,
        has_auto_increment: true,
      },
    },
    {
      field: 'title',
      type: 'string',
      meta: {
        interface: 'input',
        options: {
          placeholder: 'Enter title...',
        },
      },
      schema: {
        is_nullable: false,
      },
    },
    {
      field: 'url',
      type: 'string',
      meta: {
        interface: 'input',
        options: {
          placeholder: 'https://example.com',
        },
      },
      schema: {
        is_nullable: false,
      },
    },
    {
      field: 'status',
      type: 'string',
      meta: {
        interface: 'select-dropdown',
        options: {
          choices: [
            { text: 'Published', value: 'published' },
            { text: 'Draft', value: 'draft' },
            { text: 'Archived', value: 'archived' },
          ],
        },
      },
      schema: {
        default_value: 'draft',
        is_nullable: false,
      },
    },
  ];

  // Criar cada campo
  for (const fieldData of fields) {
    try {
      await dockerHttpRequest(
        'POST',
        `/fields/${collectionName}`,
        fieldData,
        {
          Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
        },
        testSuiteId,
      );

      if (process.env.DEBUG_TESTS) {
        logger.info(`[DEBUG] Created field: ${fieldData.field}`);
      }
    } catch (error: any) {
      logger.error(`[ERROR] Failed to create field ${fieldData.field}:`, error.message);
      throw error;
    }
  }

  // Aguardar mais tempo para garantir que os campos foram criados e o schema atualizado
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Dar permissões completas para o admin na coleção criada
  try {
    const permissionData = {
      role: null, // null = admin role
      collection: collectionName,
      action: 'create',
      permissions: {},
      validation: {},
      presets: null,
      fields: ['*'],
    };

    // Criar permissões para cada action
    for (const action of ['create', 'read', 'update', 'delete']) {
      await dockerHttpRequest(
        'POST',
        '/permissions',
        { ...permissionData, action },
        {
          Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
        },
        testSuiteId,
      );

      if (process.env.DEBUG_TESTS) {
        logger.info(`[DEBUG] Created ${action} permission for ${collectionName}`);
      }
    }
  } catch (error: any) {
    logger.warn('[WARN] Could not create permissions:', error.message);
  }

  if (process.env.DEBUG_TESTS) {
    logger.info('[DEBUG] Collection created with fields:', createdCollectionName);

    // Verificar se os campos foram realmente criados
    try {
      const fieldsCheck = await dockerHttpRequest(
        'GET',
        `/fields/${collectionName}`,
        undefined,
        {
          Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
        },
        testSuiteId,
      );

      logger.info('[DEBUG] Fields verification:', JSON.stringify(fieldsCheck, null, 2));
    } catch (error: any) {
      logger.warn('[WARN] Could not verify fields:', error.message);
    }
  }

  return createdCollectionName;
}

export async function createTestItem(title: string, url: string, status = 'published', testSuiteId?: string) {
  const itemData = {
    title,
    url,
    status,
  };

  try {
    const response = await dockerHttpRequest(
      'POST',
      '/items/test_inframe_items',
      itemData,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );

    const item = response.data?.data || response.data || response;

    if (process.env.DEBUG_TESTS) {
      logger.info('[DEBUG] Created item:', item);
    }

    return item;
  } catch (error: any) {
    logger.error('[ERROR] Failed to create test item:', error.message);

    if (error.response?.status === 403) {
      logger.warn('[WARN] 403 error when creating test item - this is a known permissions issue');
    }

    throw error;
  }
}

export async function getTestItems(testSuiteId?: string) {
  try {
    const response = await dockerHttpRequest(
      'GET',
      '/items/test_inframe_items',
      undefined,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );

    // A resposta do Directus pode estar em response.data.data ou response.data
    const items = response.data?.data || response.data || response;

    if (process.env.DEBUG_TESTS) {
      logger.info('[DEBUG] getTestItems response:', JSON.stringify(response, null, 2));
      logger.info('[DEBUG] Extracted items:', items);
      logger.info('[DEBUG] Is array:', Array.isArray(items));
    }

    // Se items não for um array, retornar array vazio
    return Array.isArray(items) ? items : [];
  } catch (error: any) {
    logger.error('[ERROR] Failed to get test items:', error.message);

    if (error.response?.status === 403) {
      logger.warn('[WARN] 403 error when getting test items - this is a known permissions issue');
    }

    return [];
  }
}

export async function deleteTestCollection(testSuiteId?: string) {
  try {
    await dockerHttpRequest(
      'DELETE',
      '/collections/test_inframe_items',
      undefined,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );
  } catch {
    // Collection might not exist, ignore error
  }
}
