<template>
  <nav class="nav-menu">
    <ul class="menu-list">
      <li v-for="item in items" :key="item.id" class="menu-item">
        <!-- Ícones de Material Design -->
        <router-link
          :to="`/dashboard/${item.id}`"
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
        const response = await api.get("/items/dashboard");
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
  height: 100%;
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
  margin-bottom: 8px; /* Espaçamento entre os itens */
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
  background-color: var(--theme--background); /* Cor de hover */
  color: var(--theme--primary); /* Cor do texto no hover */
}

.menu-link.active-link {
  /* Estilo para o item ativo */
  background-color: var(--theme--primary-light); /* Cor de fundo quando ativo */
  color: var(--theme--primary); /* Cor do texto quando ativo */
  font-weight: bold; /* Para destacar o texto ativo */
}

.menu-icon {
  margin-right: 10px;
  font-size: 20px;
  color: var(--theme--primary-accent); /* Cor dos ícones */
}

.menu-link span {
  font-weight: 500;
}
</style>
