<template>
  <nav>
    <ul>
      <li v-for="item in items" :key="item.id">
        <!-- Cada item redireciona para uma rota baseada no ID -->
        <router-link :to="`/dashboard/${item.id}`">
          {{ item.title }}
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  name: "DashboardList",
  setup() {
    const page_title = "Dashboard";
    const items = ref([]);
    const loading = ref(true);
    const api = useApi();

    const fetchItems = async () => {
      try {
        const response = await api.get("/items/dashboard");
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
nav ul {
  list-style: none;
  padding: 0;
}

nav li {
  margin-bottom: 10px;
}

a {
  text-decoration: none;
  color: blue;
}
</style>
