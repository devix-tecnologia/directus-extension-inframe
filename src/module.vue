<template>
  <!-- Estrutura principal com breadcrumb -->
  <private-view :title="page_title">
    <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template>

    <!-- Conteúdo da Página -->
    <div class="main">
      <template v-if="page === 'home'">
        <!-- Conteúdo da Home -->
        <div class="container">
          <!-- Iframe com site externo -->
        </div>
        <div class="iframe-area">
          <iframe src="https://devix.co/" frameborder="0"></iframe>
        </div>
      </template>

      <template v-else-if="page === 'contact'">
        <!-- Conteúdo da Página de Contato -->
        <div class="container">
          <h2>Entre em Contato</h2>
          <p>Telefone: <strong>(99) 99999-9999</strong></p>
        </div>
      </template>

      <template v-else-if="page === 'hello-world'">
        <!-- Conteúdo da Página Hello World -->
        <div class="container">
          <h2>Hello World</h2>
          <p>
            Esta é a página Hello World. Adicione aqui qualquer conteúdo
            desejado.
          </p>
        </div>
      </template>

      <template v-else>
        <!-- Página 404 -->
        <div class="container">
          <h2>404: Página não encontrada</h2>
          <p>A página solicitada não existe.</p>
        </div>
      </template>
    </div>
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

    // Função para renderizar conteúdo baseado na página
    render_page(page.value);

    // Observa mudanças na rota
    watch(
      () => route.params.page,
      (newPage) => {
        page.value = newPage || "home";
        render_page(page.value);
      }
    );

    function render_page(currentPage: string) {
      switch (currentPage) {
        case "home":
          page_title.value = "Home";
          breadcrumb.value = [{ name: "Home", to: `/dashboard` }];
          break;
        case "contact":
          page_title.value = "Contact Us";
          breadcrumb.value = [
            { name: "Home", to: `/dashboard` },
            { name: "Contact Us", to: `/dashboard/contact` },
          ];
          break;
        case "hello-world":
          page_title.value = "Hello World";
          breadcrumb.value = [
            { name: "Home", to: `/dashboard` },
            { name: "Hello World", to: `/dashboard/hello-world` },
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

    return { page, page_title, breadcrumb };
  },
});
</script>

<style scoped>
.main {
  position: relative;
  width: 100%;
  height: calc(100% - 120px);
  margin: 0;
  padding: 0;
}

.container {
  margin: 20px 50px;
}

h2 {
  color: var(--theme--foreground-accent);
  margin-bottom: 10px;
}

p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--theme--foreground-accent);
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
