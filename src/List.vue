<template>
  <private-view :title="page_title">
    <template #navigation>
      <NavMenu />
    </template>

    <div class="container">
      <div v-if="loading">
        <p>Carregando...</p>
      </div>

      <div v-else>
        <!-- Exibe os cards com os itens -->
        <div class="card-container">
          <div v-for="item in items" :key="item.id" class="card">
            <router-link :to="`/inframe/${item.id}`" class="card-link">
              <div class="card-header">
                <h3>{{ item.title }}</h3>
              </div>
              <div class="card-body">
                <p>{{ item.description }}</p>
                <!-- Exemplo de descrição do item -->
              </div>
            </router-link>
          </div>
        </div>
        <!-- Renderiza o conteúdo da rota ativa -->
        <router-view />
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import NavMenu from "./components/NavMenu.vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  name: "inframeList",
  components: { NavMenu },
  setup() {
    const page_title = "inFrame";
    const items = ref([]);
    const loading = ref(true);
    const api = useApi();

    const fetchItems = async () => {
      try {
        const response = await api.get("/items/inframe");
        items.value = response.data.data;
      } catch (error) {
        console.error("Erro ao buscar dados da coleção:", error);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchItems();
    });

    return {
      items,
      loading,
      page_title,
    };
  },
});
</script>

<style scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px;
}

.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 250px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.card-header {
  background-color: var(--theme--primary-light);
  padding: 16px;
  font-size: 18px;
  font-weight: bold;
  color: var(--theme--primary);
}

.card-body {
  padding: 16px;
  font-size: 14px;
  color: var(--theme--foreground);
}

.card-body p {
  margin: 0;
}
</style>
