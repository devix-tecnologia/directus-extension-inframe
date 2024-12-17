<template>
  <!-- Estrutura principal com breadcrumb -->
  <private-view :title="page_title">
    <!-- <template v-if="breadcrumb.length > 0" #headline>
      <v-breadcrumb :items="breadcrumb" />
    </template> -->

    <!-- Conteúdo da Página -->
    <div class="main">
      <div class="container"></div>
      <div class="iframe-area">
        <iframe src="https://devix.co/" frameborder="0"></iframe>
      </div>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const page_title = "Home";
    // const breadcrumb = [{ name: "Home", to: `/dashboard` }];

    return { page_title };
  },
});
</script>

<style scoped>
@import "./style.css";
.main {
  position: relative;
  width: 100%;
  height: calc(100% - 120px);
  margin: 0;
  padding: 0;
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
