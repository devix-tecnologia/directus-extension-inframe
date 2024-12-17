<template>
  <private-view :title="page_title">
    <div class="container">
      <h2>Contact Us</h2>
      <p>Phone: <strong>(99) 99999-9999</strong></p>
    </div>
  </private-view>
</template>

<script lang="ts">
import { defineComponent } from "vue";

export default defineComponent({
  setup() {
    const page_title = "Contact Us";
    return { page_title };
  },
});
</script>

<style scoped>
@import "./style.css";
</style>
