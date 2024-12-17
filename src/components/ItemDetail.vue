<template>
  <private-view :title="item.title">
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>

    <div class="main">
      <div class="container"></div>
      <div class="iframe-area">
        <iframe :src="item.url" frameborder="0"></iframe>
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  name: "ItemDetail",
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

    const fetchItem = async () => {
      try {
        const response = await api.get(`/items/dashboard/${props.id}`);
        item.value = response.data.data;
      } catch (error) {
        console.error("Erro ao buscar o item:", error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchItem();
    });

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
