import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { LocationQueryValue, RouteLocationRaw } from 'vue-router';

// Chave para armazenamento local
const STORAGE_KEY = 'directus_inframe_last_route';
const URL_PARAM_KEY = 'lastRoute';

// Tipo customizado para o router com os métodos que precisamos
interface VueRouter {
  push: (to: RouteLocationRaw | string) => Promise<void>;
  replace: (to: RouteLocationRaw) => Promise<void>;
}

/**
 * Composable para persistência de navegação
 * Salva e restaura automaticamente a última rota acessada
 */
export const useNavigationPersistence = () => {
  const routerRaw = useRouter();
  // Cast para nosso tipo customizado que tem os métodos necessários
  const router = routerRaw as unknown as VueRouter;
  const route = useRoute();
  const isRestoringRoute = ref(false);

  // Limpa valores inválidos do localStorage ao inicializar
  const cleanInvalidStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored === 'undefined' || stored === 'null' || stored === '') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Silently handle errors
    }
  };

  // Executa limpeza ao criar o composable
  cleanInvalidStorage();

  /**
   * Salva a rota atual no localStorage e URL
   */
  const saveCurrentRoute = (routeId?: string) => {
    const currentId = routeId || (route.params.id as string);

    // Não salva se o ID for undefined, null, vazio ou 'undefined' (string)
    if (!currentId || currentId === 'undefined') return;

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
      const urlParam = route.query[URL_PARAM_KEY] as LocationQueryValue;

      if (urlParam && typeof urlParam === 'string' && urlParam !== 'undefined') {
        return urlParam;
      }

      // Estratégia 2: Verifica localStorage
      const storedRoute = localStorage.getItem(STORAGE_KEY);

      if (storedRoute && storedRoute !== 'undefined') {
        return storedRoute;
      }

      // Se encontrou 'undefined', limpa o storage
      if (storedRoute === 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
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

    // Não restaura se a rota for undefined, null, vazia ou 'undefined' (string)
    if (!lastRoute || lastRoute === 'undefined') {
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
      (newId: string | string[] | undefined) => {
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
