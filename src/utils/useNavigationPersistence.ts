import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

// Chave para armazenamento local
const STORAGE_KEY = 'directus_inframe_last_route';
const URL_PARAM_KEY = 'lastRoute';

/**
 * Composable para persistência de navegação
 * Salva e restaura automaticamente a última rota acessada
 */
export const useNavigationPersistence = () => {
  const router = useRouter();
  const route = useRoute();
  const isRestoringRoute = ref(false);

  /**
   * Salva a rota atual no localStorage e URL
   */
  const saveCurrentRoute = (routeId?: string) => {
    const currentId = routeId || (route.params.id as string);

    if (!currentId) return;

    try {
      // Estratégia 1: localStorage
      localStorage.setItem(STORAGE_KEY, currentId);

      // Estratégia 2: Query parameter na URL (sem reload da página)
      const currentQuery = { ...route.query };
      currentQuery[URL_PARAM_KEY] = currentId;

      // Atualiza a URL sem recarregar a página
      router
        .replace({
          path: route.path,
          query: currentQuery,
        })
        .catch(() => {
          // Ignora erros de navegação redundante
        });
    } catch {
      // Silently handle errors - could be logged to external service in production
    }
  };

  /**
   * Restaura a última rota salva
   * Retorna o ID da rota ou null se não houver rota salva
   */
  const getLastRoute = (): string | null => {
    try {
      // Estratégia 1: Verifica query parameter da URL
      const urlParam = route.query[URL_PARAM_KEY] as string;

      if (urlParam) {
        return urlParam;
      }

      // Estratégia 2: Verifica localStorage
      const storedRoute = localStorage.getItem(STORAGE_KEY);

      if (storedRoute) {
        return storedRoute;
      }
    } catch {
      // Silently handle errors - could be logged to external service in production
    }

    return null;
  };

  /**
   * Navega para a última rota salva se existir
   * Retorna true se navegou, false caso contrário
   */
  const restoreLastRoute = async (): Promise<boolean> => {
    const lastRoute = getLastRoute();

    if (!lastRoute) {
      return false;
    }

    try {
      isRestoringRoute.value = true;
      await router.push(`/inframe/${lastRoute}`);
      return true;
    } catch {
      // Silently handle errors - could be logged to external service in production
      return false;
    } finally {
      isRestoringRoute.value = false;
    }
  };

  /**
   * Limpa a rota salva
   */
  const clearSavedRoute = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);

      const currentQuery = { ...route.query };
      delete currentQuery[URL_PARAM_KEY];

      router
        .replace({
          path: route.path,
          query: currentQuery,
        })
        .catch(() => {
          // Ignora erros de navegação redundante
        });
    } catch {
      // Silently handle errors - could be logged to external service in production
    }
  };

  /**
   * Inicia o monitoramento automático de mudanças de rota
   * Salva automaticamente quando a rota muda
   */
  const startAutoSave = () => {
    // Monitora mudanças na rota e salva automaticamente
    watch(
      () => route.params.id,
      (newId) => {
        // Só salva se não estiver restaurando uma rota
        if (!isRestoringRoute.value && newId) {
          saveCurrentRoute(newId as string);
        }
      },
      { immediate: false },
    );
  };

  return {
    saveCurrentRoute,
    getLastRoute,
    restoreLastRoute,
    clearSavedRoute,
    startAutoSave,
    isRestoringRoute,
  };
};
