<template>
  <private-view :title="page_title">
    <!-- Breadcrumb -->
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>

    <!-- Conteúdo da Página -->
    <router-view name="dashboard" :page="page" />
  </private-view>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from "vue";
import { useRoute } from "vue-router";

export default defineComponent({
  setup() {
    const route = useRoute();
    const page = ref(route.params.page || "home");
    const page_title = ref("");
    const breadcrumb = ref([]);

    render_page(page.value);

    // Observa mudanças na rota
    watch(
      () => route.params.page,
      (newPage) => {
        page.value = newPage || "home";
        render_page(page.value);
      }
    );

    return { page_title, breadcrumb };

    function render_page(currentPage: string) {
      // Define título da página e breadcrumb
      switch (currentPage) {
        case "home":
          page_title.value = "Home";
          breadcrumb.value = [{ name: "Home", to: `/dashboard` }];
          break;
        case "hello-world":
          page_title.value = "Hello World";
          breadcrumb.value = [
            { name: "Home", to: `/dashboard` },
            { name: "Hello World", to: `/dashboard/hello-world` },
          ];
          break;
        case "contact":
          page_title.value = "Contact Us";
          breadcrumb.value = [
            { name: "Home", to: `/dashboard` },
            { name: "Contact Us", to: `/dashboard/contact` },
          ];
          break;
        default:
          page_title.value = "404: Not Found";
          breadcrumb.value = [
            { name: "Home", to: `/dashboard` },
            { name: "404", to: "" },
          ];
      }
    }
  },
});
</script>

<style scoped>
h1 {
  color: #333;
}
</style>
