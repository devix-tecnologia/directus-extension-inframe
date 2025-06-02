<template>
  <private-view v-if="item" :title>
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>
    <template #navigation>
      <NavMenu :items />
    </template>

    <div class="main">
      <div v-if="loading">
        <p>Carregando...</p>
      </div>

      <div v-else-if="item">
        <div class="iframe-area">
          <iframe :src="item.url" frameborder="0" sandbox="allow-scripts allow-same-origin"></iframe>
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

    return {
      ...props,
      breadcrumb,
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
