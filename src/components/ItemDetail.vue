<template>
  <private-view :title="title">
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>
    <template #navigation>
      <NavMenu :items="items" />
    </template>

    <div class="main">
      <div v-if="loading">
        <p>Carregando...</p>
      </div>

      <div v-else-if="!item">
        <p>Nenhum item encontrado. Verifique se o item existe e está publicado.</p>
      </div>

      <div v-else-if="item">
        <div class="iframe-area">
          <iframe
            :src="normalizeUrl(item.url)"
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
import { defineComponent, PropType } from 'vue';
import NavMenu from './NavMenu.vue';
import { Item } from '../types';

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
  setup(props) {
    const breadcrumb = [{ name: 'Home', to: `/inframe` }];

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

    return {
      ...props,
      breadcrumb,
      normalizeUrl,
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
</style>
