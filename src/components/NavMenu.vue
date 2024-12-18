<template>
  <nav class="nav-menu">
    <ul class="menu-list">
      <li v-for="item in items" :key="item.id" class="menu-item">
        <!-- Ícones de Material Design -->
        <router-link
          :to="`/inframe/${item.id}`"
          class="menu-link"
          active-class="active-link"
        >
          <span>{{ item.title }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import { useApi } from "@directus/extensions-sdk";

export default defineComponent({
  name: "NavMenu",
  setup() {
    const items = ref([]);
    const api = useApi();

    const fetchItems = async () => {
      try {
        const response = await api.get("/items/inframe");
        items.value = response.data.data;
      } catch (error) {
        console.error("Erro ao buscar dados da coleção:", error);
      }
    };

    onMounted(() => {
      fetchItems();
    });

    return {
      items,
    };
  },
});
</script>

<style scoped>
.nav-menu {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  margin-bottom: 8px;
}

.menu-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--theme--foreground-accent);
  font-size: 16px;
  padding: 12px 20px;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.menu-link:hover {
  background-color: var(--theme--primary-light);
  color: var(--theme--primary);
}

.menu-link.active-link {
  background-color: var(--theme--primary);
  color: var(--theme--foreground-accent);
  font-weight: bold;
}

.menu-icon {
  margin-right: 10px;
  font-size: 20px;
  color: var(--theme--primary-accent);
}

.menu-link span {
  font-weight: 500;
}
</style>
