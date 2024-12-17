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
        <!-- Renderiza o conteúdo da rota ativa -->
        <router-view />
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from "vue";
import NavMenu from "./components/NavMenu.vue";

export default defineComponent({
  name: "DashboardList",
  components: { NavMenu },
  setup() {
    const page_title = "Dashboard";

    return {
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
