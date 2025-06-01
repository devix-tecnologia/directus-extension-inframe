import { useApi } from "@directus/extensions-sdk";
import { ref } from "vue";

// Função que busca o idioma do usuário logado
const fetchLanguage = async (api: ReturnType<typeof useApi>) => {
  try {
    const response = await api.get("/users/me");
    return response.data.data.language || "en-US"; // Idioma padrão se não houver resposta
  } catch (error) {
    console.error("Erro ao obter idioma do Directus:", error);
    return "en-US"; // Retorna um idioma padrão em caso de erro
  }
};

// Função para obter o título traduzido
const getTitle = (translations: {title: string}[]) => {
  if (!translations || translations.length === 0 || !translations[0]) {
    return "Item inFrame";
  }
  return translations[0].title || "Item inFrame";
};

// Função para buscar múltiplos itens
export const useFetchItems = () => {
  const items = ref([]);
  const loading = ref(false);
  const api = useApi();

  const fetchItems = async () => {
    loading.value = true; // Reinicia o estado de carregamento
    try {
      const languageCode = await fetchLanguage(api); // Obtém o idioma do usuário
      const response = await api.get("/items/inframe", {
        params: {
          fields: [
            "id",
            "sort",
            "status",
            "icon",
            "url",
            "thumbnail",
            "translations.languages_code",
            "translations.title",
          ],
          deep: {
            translations: {
              _filter: {
                languages_code: { _eq: languageCode }, // Filtro pelo idioma configurado no Directus
              },
            },
          },
          sort: ["sort"],
        },
      });
      items.value = response.data.data;
    } catch (error) {
      console.error("Erro ao buscar os itens:", error);
    } finally {
      loading.value = false;
    }
  };

  return { items, loading, fetchItems, getTitle };
};

// Função para buscar um item específico
export const useFetchItem = () => {
  const item = ref(null);
  const loading = ref(false);
  const api = useApi();

  const fetchItem = async (id: string) => {
    loading.value = true; // Reinicia o estado de carregamento
    try {
      const languageCode = await fetchLanguage(api); // Obtém o idioma do usuário
      const response = await api.get(`/items/inframe/${id}`, {
        params: {
          fields: [
            "id",
            "status",
            "sort",
            "icon",
            "url",
            "thumbnail",
            "translations.languages_code",
            "translations.title",
          ],
          deep: {
            translations: {
              _filter: {
                languages_code: { _eq: languageCode }, // Filtro pelo idioma configurado no Directus
              },
            },
          },
        },
      });
      item.value = response.data.data;
    } catch (error) {
      console.error("Erro ao buscar o item:", error);
    } finally {
      loading.value = false;
    }
  };

  return { item, loading, fetchItem, getTitle };
};
