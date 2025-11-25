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
          fields: ['id', 'sort', 'status', 'icon', 'url', 'thumbnail', 'translations.language', 'translations.title'],
          // Removido o filtro deep para buscar TODAS as traduções
          // O getTitle() vai usar a primeira disponível
          filter: {
            status: { _eq: 'published' }, // Filtra apenas itens publicados
          },
          sort: ['sort'],
        },
      });

      // A resposta da API vem como { data: [...] }
      const data = Array.isArray(response.data) ? response.data : (response.data as any).data || [];

      // Filtrar traduções do lado do cliente para priorizar o idioma do usuário
      items.value = data.map((item: Item) => {
        if (item.translations && item.translations.length > 0) {
          // Tentar encontrar tradução no idioma do usuário
          const userLangTranslation = item.translations.find((t) => t.language === languageCode);

          // Se encontrou, colocar como primeira
          if (userLangTranslation) {
            item.translations = [userLangTranslation, ...item.translations.filter((t) => t.language !== languageCode)];
          }
        }

        return item;
      });
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
          fields: ['id', 'status', 'sort', 'icon', 'url', 'thumbnail', 'translations.language', 'translations.title'],
          // Removido o filtro deep para buscar TODAS as traduções
        },
      });

      // A resposta pode vir como { data: {...} } ou diretamente o objeto
      const data = (response.data as any).data || response.data;

      console.log('[useFetchItem] Response:', response.data);
      console.log('[useFetchItem] Parsed data:', data);

      // Filtrar traduções do lado do cliente para priorizar o idioma do usuário
      if (data.translations && data.translations.length > 0) {
        const userLangTranslation = data.translations.find((t: any) => t.language === languageCode);

        if (userLangTranslation) {
          data.translations = [
            userLangTranslation,
            ...data.translations.filter((t: any) => t.language !== languageCode),
          ];
        }
      }

      item.value = data;
      console.log('[useFetchItem] Final item:', item.value);
    } finally {
      loading.value = false;
    }
  };

  return { item, loading, fetchItem, getTitle };
};
