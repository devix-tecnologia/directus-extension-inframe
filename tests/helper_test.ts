import { dockerHttpRequest } from './setup.js';

export async function createTestCollection(): Promise<string> {
  const collectionData = {
    collection: 'test_inframe_items',
    fields: [
      {
        field: 'id',
        type: 'integer',
        meta: {
          hidden: true,
          interface: 'input',
          readonly: true,
          width: 'half',
        },
        schema: {
          is_primary_key: true,
          has_auto_increment: true,
        },
      },
      {
        field: 'status',
        type: 'string',
        meta: {
          width: 'full',
          options: {
            choices: [
              { text: 'Published', value: 'published' },
              { text: 'Draft', value: 'draft' },
            ],
          },
          interface: 'select-dropdown',
          display: 'labels',
        },
        schema: {
          default_value: 'draft',
          is_nullable: false,
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
    ],
    meta: {
      icon: 'article',
    },
  };

  const response = await dockerHttpRequest('POST', '/collections', collectionData, {
    Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
  });

  if (process.env.DEBUG_TESTS) {
    console.log('[DEBUG] Create collection response:', JSON.stringify(response, null, 2));
  }

  const collectionName = response.data?.collection || response.collection;

  if (!collectionName) {
    throw new Error('Failed to create collection: ' + JSON.stringify(response));
  }

  // Aguardar um pouco para garantir que a tabela foi criada no banco
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  if (process.env.DEBUG_TESTS) {
    console.log('[DEBUG] Collection created:', collectionName);
  }

  return collectionName;
}

export async function createTestItem(title: string, url: string, status = 'published') {
  const itemData = {
    title,
    url,
    status,
  };

  const response = await dockerHttpRequest('POST', '/items/test_inframe_items', itemData, {
    Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
  });

  const item = response.data?.data || response.data || response;
  
  if (process.env.DEBUG_TESTS) {
    console.log('[DEBUG] Created item:', item);
  }
  
  return item;
}

export async function getTestItems() {
  const response = await dockerHttpRequest('GET', '/items/test_inframe_items', undefined, {
    Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
  });

  // A resposta do Directus pode estar em response.data.data ou response.data
  const items = response.data?.data || response.data || response;

  if (process.env.DEBUG_TESTS) {
    console.log('[DEBUG] getTestItems response:', JSON.stringify(response, null, 2));
    console.log('[DEBUG] Extracted items:', items);
    console.log('[DEBUG] Is array:', Array.isArray(items));
  }

  // Se items não for um array, retornar array vazio
  return Array.isArray(items) ? items : [];
}

export async function deleteTestCollection() {
  try {
    await dockerHttpRequest('DELETE', '/collections/test_inframe_items', undefined, {
      Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
    });
  } catch {
    // Collection might not exist, ignore error
  }
}
