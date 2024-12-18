<template>
  <private-view :title="item.title">
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
import { useApi } from "@directus/extensions-sdk";
import NavMenu from "./NavMenu.vue";

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
    const breadcrumb = [{ name: "Home", to: `/dashboard` }];
    const item = ref(null);
    const loading = ref(true);
    const api = useApi();

    const fetchItem = async (id: string) => {
      loading.value = true; // Reinicia o estado de carregamento
      try {
        const response = await api.get(`/items/dashboard/${id}`);
        item.value = response.data.data;
      } catch (error) {
        console.error("Erro ao buscar o item:", error);
      } finally {
        loading.value = false;
      }
    };

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
    };
  },
});
</script>

<style scoped>
@import "./style.css";
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
