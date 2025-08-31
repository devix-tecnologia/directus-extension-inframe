import { defineModule } from '@directus/extensions-sdk';
import List from './List.vue';
import ItemDetailRoute from './ItemDetailRoute.vue';

export default defineModule({
  id: 'inframe',
  name: 'Relatórios',
  icon: 'document_scanner',
  routes: [
    {
      path: '',
      props: true,
      component: List,
    },
    {
      path: ':id', // Rota dinâmica para cada item
      component: ItemDetailRoute,
      props: true, // Passa os parâmetros da rota como props
    },
  ],
});
