import { useApi } from '@directus/extensions-sdk';
import { ref } from 'vue';
import { Item } from '../types';

// Função que busca o idioma do usuário logado
const fetchLanguage = async (api: ReturnType<typeof useApi>) => {
  const response = await api.get('/users/me');
  return response.data.data.language || 'en-US'; // Idioma padrão se não houver resposta
};

// Função para obter o título traduzido
const getTitle = (translations: { title: string }[]) => {
  if (!translations || translations.length === 0 || !translations[0] || !translations[0].title) {
    return 'Item inFrame';
  }

  return translations[0].title;
};

// Função para buscar múltiplos itens
export const useFetchItems = () => {
  const items = ref<Item[]>([]);
  const loading = ref(false);
  const api = useApi();

  const fetchItems = async () => {
    loading.value = true; // Reinicia o estado de carregamento

    try {
      const languageCode = await fetchLanguage(api); // Obtém o idioma do usuário

      const response = await api.get<Item[]>('/items/inframe', {
        params: {
          fields: [
            'id',
            'sort',
            'status',
            'icon',
            'url',
            'thumbnail',
            'translations.languages_code',
            'translations.title',
          ],
          deep: {
            translations: {
              _filter: {
                languages_code: { _eq: languageCode }, // Filtro pelo idioma configurado no Directus
              },
            },
          },
          filter: {
            status: { _eq: 'published' }, // Filtra apenas itens publicados
          },
          sort: ['sort'],
        },
      });

      items.value = response.data;
    } finally {
      loading.value = false;
    }
  };

  return { items, loading, fetchItems, getTitle };
};

// Função para buscar um item específico
export const useFetchItem = () => {
  const item = ref<Item | null>(null);
  const loading = ref(false);
  const api = useApi();

  const fetchItem = async (id: string) => {
    if (!id) {
      return;
    }

    loading.value = true; // Reinicia o estado de carregamento

    try {
      const languageCode = await fetchLanguage(api); // Obtém o idioma do usuário

      const response = await api.get<Item>(`/items/inframe/${id}`, {
        params: {
          fields: [
            'id',
            'status',
            'sort',
            'icon',
            'url',
            'thumbnail',
            'translations.languages_code',
            'translations.title',
          ],
          deep: {
            translations: {
              _filter: {
                languages_code: { _eq: languageCode }, // Filtro pelo idioma configurado no Directus
              },
            },
          },
          filter: {
            status: { _eq: 'published' }, // Filtra apenas itens publicados
          },
        },
      });

      item.value = response.data;
    } finally {
      loading.value = false;
    }
  };

  return { item, loading, fetchItem, getTitle };
};
