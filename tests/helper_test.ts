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
      try {
        const permResponse = await dockerHttpRequest(
          'POST',
          '/permissions',
          { ...permissionData, action },
          {
            Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
          },
          testSuiteId,
        );

        logger.info(
          `[DEBUG] Created ${action} permission for ${collectionName}:`,
          JSON.stringify(permResponse, null, 2),
        );
      } catch (permError: any) {
        logger.error(`[ERROR] Failed to create ${action} permission:`, permError.message);
        throw permError;
      }
    }
  } catch (error: any) {
    logger.error('[ERROR] Permission creation failed:', error.message);
    throw error;
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
    url,
    status,
  };

  try {
    const response = await dockerHttpRequest(
      'POST',
      '/items/inframe',
      itemData,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );

    // Verificar se há erro na resposta
    if (response.errors && response.errors.length > 0) {
      logger.error('[ERROR] API returned errors when creating item:', JSON.stringify(response.errors, null, 2));
      throw new Error(`Failed to create item: ${response.errors[0].message}`);
    }

    const item = response.data?.data || response.data || response;

    logger.info('[DEBUG] Created item:', item);

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
      '/items/inframe',
      undefined,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );

    logger.info('[DEBUG] getTestItems full response:', JSON.stringify(response, null, 2));

    // A resposta do Directus pode estar em response.data.data ou response.data
    const items = response.data?.data || response.data || response;

    logger.info('[DEBUG] Extracted items:', JSON.stringify(items, null, 2));
    logger.info('[DEBUG] Is array:', Array.isArray(items));
    logger.info('[DEBUG] Items length:', Array.isArray(items) ? items.length : 'not an array');

    // Se items não for um array, retornar array vazio
    return Array.isArray(items) ? items : [];
  } catch (error: any) {
    logger.error('[ERROR] Failed to get test items:', error.message);
    logger.error('[ERROR] Error details:', JSON.stringify(error, null, 2));

    if (error.response?.status === 403) {
      logger.warn('[WARN] 403 error when getting test items - this is a known permissions issue');
    }

    return [];
  }
}

export async function deleteTestItems(testSuiteId?: string) {
  try {
    // Buscar todos os itens
    const items = await getTestItems(testSuiteId);

    // Deletar cada item
    for (const item of items) {
      try {
        await dockerHttpRequest(
          'DELETE',
          `/items/inframe/${item.id}`,
          undefined,
          {
            Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
          },
          testSuiteId,
        );
      } catch {
        // Ignorar erros ao deletar itens
      }
    }
  } catch {
    // Collection might not exist or be empty, ignore error
  }
}

export async function createLanguage(code: string, name: string, testSuiteId?: string) {
  const languageData = {
    code,
    name,
  };

  try {
    const response = await dockerHttpRequest(
      'POST',
      '/items/languages',
      languageData,
      {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
      testSuiteId,
    );

    // Verificar se há erro na resposta
    if (response.errors && response.errors.length > 0) {
      logger.error('[ERROR] API returned errors when creating language:', JSON.stringify(response.errors, null, 2));
      throw new Error(`Failed to create language: ${response.errors[0].message}`);
    }

    const language = response.data?.data || response.data || response;

    logger.info('[DEBUG] Created language:', language);

    return language;
  } catch (error: any) {
    // Se o idioma já existe, ignorar erro
    if (error.message?.includes('already exists') || error.message?.includes('UNIQUE constraint')) {
      logger.info(`[INFO] Language ${code} already exists, skipping creation`);
      return { code, name };
    }

    logger.error('[ERROR] Failed to create language:', error.message);
    throw error;
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
