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
    ],
    meta: {
      icon: 'article',
    },
  };

  const response = await dockerHttpRequest('POST', '/collections', collectionData, {
    Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
  });

  return response.data?.collection || response.collection;
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

  return response.data || response;
}

export async function getTestItems() {
  const response = await dockerHttpRequest('GET', '/items/test_inframe_items', undefined, {
    Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
  });

  // A resposta do Directus pode estar em response.data.data ou response.data
  const items = response.data?.data || response.data || response;

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
