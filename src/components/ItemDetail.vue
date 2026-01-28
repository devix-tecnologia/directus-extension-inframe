<template>
  <private-view :title="title">
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>
    <template #navigation>
      <NavMenu :items="items" />
    </template>

    <div class="main">
      <div v-if="loading || urlProcessing">
        <p>Carregando...</p>
      </div>

      <div v-else-if="urlError" class="error-state">
        <v-icon name="error" large />
        <h2>Erro de Segurança</h2>
        <p style="white-space: pre-line">{{ urlError }}</p>
        <p class="help-text">
          Para usar variáveis como $token, a URL deve começar com https:// para garantir a segurança dos dados.
        </p>
      </div>

      <div v-else-if="!item">
        <p>Nenhum item encontrado. Verifique se o item existe e está publicado.</p>
      </div>

      <div v-else-if="item">
        <div class="iframe-area">
          <iframe
            :src="processedUrl"
            frameborder="0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
          ></iframe>
        </div>
      </div>

      <div v-else>
        <p>Erro ao carregar dados. Tente novamente mais tarde.</p>
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, PropType, ref, onMounted, watch } from 'vue';
import NavMenu from './NavMenu.vue';
import { Item } from '../types';
import { useUrlVariableReplacement } from '../utils/useUrlVariableReplacement';

export default defineComponent({
  name: 'ItemDetail',
  components: { NavMenu },
  props: {
    item: {
      type: Object as PropType<Item>,
      required: true,
    },
    items: {
      type: Array as PropType<Item[]>,
      required: true,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: '',
    },
  },
  setup(props: { item: Item; items: Item[]; loading: boolean; title: string }) {
    const breadcrumb = [{ name: 'Home', to: `/inframe` }];
    const processedUrl = ref('');
    const urlProcessing = ref(false);
    const urlError = ref<string | null>(null);

    const { processUrl } = useUrlVariableReplacement();

    // Normaliza a URL adicionando https:// se não tiver protocolo
    const normalizeUrl = (url: string) => {
      if (!url) return '';

      // Se já tem protocolo (http:// ou https://), retorna como está
      if (url.match(/^https?:\/\//i)) {
        return url;
      }

      // Caso contrário, adiciona https://
      return `https://${url}`;
    };

    // Processa a URL com substituição de variáveis
    const loadUrl = async (url: string) => {
      if (!url) {
        processedUrl.value = '';
        return;
      }

      urlProcessing.value = true;
      urlError.value = null;

      try {
        // Normaliza a URL primeiro
        const normalized = normalizeUrl(url);

        // Processa variáveis dinâmicas
        const processed = await processUrl(normalized);

        processedUrl.value = processed;
      } catch (error: any) {
        urlError.value = error.message || 'Erro ao processar URL';
        processedUrl.value = '';
      } finally {
        urlProcessing.value = false;
      }
    };

    // Carrega a URL quando o componente é montado
    onMounted(() => {
      if (props.item?.url) {
        loadUrl(props.item.url);
      }
    });

    // Recarrega a URL quando o item muda
    watch(
      () => props.item?.url,
      (newUrl) => {
        if (newUrl) {
          loadUrl(newUrl);
        }
      },
    );

    return {
      ...props,
      breadcrumb,
      processedUrl,
      urlProcessing,
      urlError,
    };
  },
});
</script>

<style scoped>
.header-bar {
  display: none !important;
}

:deep(.header-bar) {
  display: none !important;
}
.container {
  margin: 20px 50px;
}

h2 {
  color: var(--theme--foreground-accent);
  margin-bottom: 10px;
}

p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--theme--foreground-accent);
}

.main {
  position: relative;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
}

.iframe-area {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden !important;
}

iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 400px;
  color: var(--theme--danger);
  text-align: center;
  gap: 1rem;
  padding: 2rem;
}

.error-state h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.error-state p {
  margin: 0;
  font-size: 1rem;
  max-width: 600px;
}

.error-state .help-text {
  color: var(--theme--foreground-subdued);
  font-size: 0.875rem;
}
</style>
