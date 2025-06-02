<template>
  <nav class="nav-menu">
    <ul class="menu-list">
      <li v-for="item in items" :key="item.id" class="menu-item">
        <router-link :to="`/inframe/${item.id}`" class="menu-link" active-class="active-link">
          <v-icon class="menu-icon" :name="item.icon" />
          <span class="menu-link-text">{{ getTitle(item.translations) }}</span>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useFetchItems } from '../utils/useFetchItems';
import { Item } from '../types';

export default defineComponent({
  name: 'NavMenu',
  props: {
    items: {
      type: Array<Item>,
      required: true,
    },
  },
  setup() {
    const { getTitle } = useFetchItems();

    return {
      getTitle,
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
  transition:
    background-color 0.3s ease,
    color 0.3s ease;
}

.menu-link:hover {
  background-color: var(--theme--primary-light);
  color: var(--theme--primary);
}

.menu-link.active-link {
  background-color: var(--theme--primary);
  color: var(--white);
  font-weight: bold;
}

.menu-icon {
  margin-right: 10px;
  font-size: 20px;
}

.menu-link span {
  font-weight: 500;
}
</style>
