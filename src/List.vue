<template>
  <private-view :title="page_title">
    <template #navigation>
      <NavMenu :items="items" />
    </template>

    <div class="container">
      <!-- Mensagem quando não há itens -->
      <div v-if="items.length === 0" class="empty-state">
        <v-icon name="inbox" large />
        <h2>Nenhum item cadastrado</h2>
        <p>Crie um novo item na coleção inframe para começar.</p>
      </div>

      <!-- Lista de cards quando está na página inicial (sem ID na rota) -->
      <div v-else-if="!currentItemId" class="card-container">
        <div v-for="item in items" :key="item.id" class="card" @click="navigateToItem(item.id)">
          <div
            class="card-link"
            :style="item.thumbnail ? `background-image: url(http://localhost:8055/assets/${item.thumbnail})` : ''"
          >
            <div class="card-header">
              <h3>{{ getTitle(item.translations) }}</h3>
            </div>
          </div>
        </div>
      </div>

      <!-- O router-view vai renderizar o conteúdo quando há um item selecionado -->
      <router-view v-else />
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import NavMenu from './components/NavMenu.vue';
import { useFetchItems } from './utils/useFetchItems';
import { useNavigationPersistence } from './utils/useNavigationPersistence';

export default defineComponent({
  name: 'InframeList',
  components: { NavMenu },
  setup() {
    const page_title = 'Extra';
    const { items, fetchItems, getTitle } = useFetchItems();
    const router = useRouter();
    const route = useRoute();
    const { startAutoSave } = useNavigationPersistence();

    // Verifica se há um ID na rota atual
    const currentItemId = computed(() => route.params.id as string | undefined);

    // Função para navegar para um item específico
    const navigateToItem = (itemId: string) => {
      router.push(`/inframe/${itemId}`);
    };

    onMounted(async () => {
      await fetchItems();
      startAutoSave();

      // Não redireciona automaticamente mais - deixa o usuário escolher na grid
    });

    return {
      items,
      page_title,
      getTitle,
      currentItemId,
      navigateToItem,
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
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
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
  color: var(--white);
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 400px;
  color: var(--theme--foreground-subdued);
  text-align: center;
  gap: 1rem;
}

.empty-state h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--theme--foreground);
}

.empty-state p {
  margin: 0;
  font-size: 1rem;
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
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  text-align: center;
  overflow: hidden;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-link {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  height: 100%;
  text-decoration: none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 0;
  width: 100%;
}

.card-header h3 {
  margin: 0;
  padding: 10px;
  background: var(--theme--primary);
  width: 100%;
}

.card-header {
  background-color: var(--theme--primary-light);
  padding: 0;
  font-size: 18px;
  font-weight: bold;
  color: var(--white);
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
