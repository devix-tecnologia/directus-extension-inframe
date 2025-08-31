<template>
  <ItemDetail :item="item" :items="items" :loading="loading" :title="getTitle(item?.translations || [])" />
</template>

<script lang="ts">
import { defineComponent, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import ItemDetail from './components/ItemDetail.vue';
import { useFetchItems, useFetchItem } from './utils/useFetchItems';
import { useNavigationPersistence } from './utils/useNavigationPersistence';

export default defineComponent({
  name: 'ItemDetailRoute',
  components: { ItemDetail },
  setup() {
    const route = useRoute();
    const { items, fetchItems, getTitle } = useFetchItems();
    const { item, loading, fetchItem } = useFetchItem();
    const { saveCurrentRoute, startAutoSave } = useNavigationPersistence();

    onMounted(async () => {
      // Busca todos os itens para o menu de navegação
      await fetchItems();

      // Busca o item específico da rota
      const itemId = route.params.id as string;

      if (itemId) {
        await fetchItem(itemId);
        // Salva a rota atual quando o item é carregado
        saveCurrentRoute(itemId);
      }

      // Inicia o monitoramento automático de mudanças de rota
      startAutoSave();
    });

    // Observa mudanças no parâmetro da rota
    watch(
      () => route.params.id,
      async (newId) => {
        if (newId) {
          await fetchItem(newId as string);
          saveCurrentRoute(newId as string);
        }
      },
    );

    return {
      item,
      items,
      loading,
      getTitle,
    };
  },
});
</script>
