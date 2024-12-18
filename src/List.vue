<template>
  <private-view :title="page_title">
    <template #navigation>
      <NavMenu />
    </template>

    <div class="container">
      <!-- Exibe os cards com os itens -->
      <div class="card-container">
        <div v-for="item in items" :key="item.id" class="card">
          <router-link
            :to="`/inframe/${item.id}`"
            class="card-link"
            :style="{ backgroundImage: `url('/assets/${item.thumbnail}')` }"
          >
            <div class="card-header">
              <h3>{{ getTitle(item.translations) }}</h3>
            </div>
          </router-link>
        </div>
      </div>
      <!-- Renderiza o conteúdo da rota ativa -->
      <router-view />
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, onMounted } from "vue";
import NavMenu from "./components/NavMenu.vue";
import { useFetchItems } from "./utils/useFetchItems";

export default defineComponent({
  name: "inframeList",
  components: { NavMenu },
  setup() {
    const page_title = "inFrame";
    const { items, fetchItems, getTitle } = useFetchItems();

    onMounted(() => {
      fetchItems();
    });

    return {
      items,
      page_title,
      getTitle,
    };
  },
});
</script>

<style scoped>
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  padding: 20px 50px;
}

.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  width: 100%;
}

.card {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  flex: 1 1 25%;
  height: 200px;
  display: flex;
  flex-direction: column; /* Para garantir que o conteúdo não sobreponha a imagem */
  justify-content: flex-end; /* Ajusta o conteúdo para o fundo */
  align-items: center;
  text-align: center;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-link {
  display: flex;
  flex-direction: column;
  justify-content: flex-end; /* Coloca o conteúdo no fundo do link */
  align-items: center;
  height: 100%;
  text-decoration: none; /* Remove o estilo de link */
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 0;
  width: 100%;
}

.card-header h3 {
  margin: 0; /* Remove a margem para melhor controle de espaçamento */
  padding: 10px;
  background: var(--theme--primary);
  width: 100%;
}

.card-header {
  background-color: var(--theme--primary-light);
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--theme--foreground);
  width: 100%;
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
