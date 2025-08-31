import axios from 'axios';

export async function createTestCollection(): Promise<string> {
  const url = `${process.env.DIRECTUS_PUBLIC_URL}/collections`;

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

  const response = await axios.post(url, collectionData, {
    headers: {
      Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
    },
  });

  return response.data.data.collection;
}

export async function createTestItem(title: string, url: string, status = 'published') {
  const collectionUrl = `${process.env.DIRECTUS_PUBLIC_URL}/items/test_inframe_items`;

  const itemData = {
    title,
    url,
    status,
  };

  const response = await axios.post(collectionUrl, itemData, {
    headers: {
      Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
    },
  });

  return response.data.data;
}

export async function getTestItems() {
  const url = `${process.env.DIRECTUS_PUBLIC_URL}/items/test_inframe_items`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
    },
  });

  return response.data.data;
}

export async function deleteTestCollection() {
  try {
    const url = `${process.env.DIRECTUS_PUBLIC_URL}/collections/test_inframe_items`;

    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${String(process.env.DIRECTUS_ACCESS_TOKEN)}`,
      },
    });
  } catch {
    // Collection might not exist, ignore error
  }
}
