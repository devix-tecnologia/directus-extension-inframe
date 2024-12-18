<template>
  <private-view v-if="item" :title="getTitle(item.translations)">
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>
    <template #navigation>
      <NavMenu />
    </template>

    <div class="main">
      <div v-if="loading">
        <p>Carregando...</p>
      </div>

      <div v-else-if="item">
        <div class="iframe-area">
          <iframe :src="item.url" frameborder="0"></iframe>
        </div>
      </div>

      <div v-else>
        <p>Erro ao carregar os dados. Tente novamente mais tarde.</p>
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from "vue";
import NavMenu from "./NavMenu.vue";
import { useFetchItem } from "../utils/useFetchItems";

export default defineComponent({
  name: "ItemDetail",
  components: { NavMenu },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const breadcrumb = [{ name: "Home", to: `/inframe` }];
    const { item, loading, fetchItem, getTitle } = useFetchItem();

    // Busca inicial ao montar o componente
    onMounted(() => {
      fetchItem(props.id);
    });

    // Observa mudanças no parâmetro `id`
    watch(
      () => props.id,
      (newId) => {
        fetchItem(newId); // Atualiza o item ao mudar a rota
      }
    );

    return {
      item,
      loading,
      breadcrumb,
      getTitle,
    };
  },
});
</script>

<style scoped>
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
  height: calc(100% - 120px);
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
