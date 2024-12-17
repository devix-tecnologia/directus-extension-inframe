import { defineModule } from "@directus/extensions-sdk";
import Home from "./Home.vue";
import Contact from "./Contact.vue";
import List from "./List.vue";
import ItemDetail from "./components/ItemDetail.vue";

export default defineModule({
  id: "dashboard",
  name: "Dashboard",
  icon: "rocket_launch",
  routes: [
    {
      path: "",
      props: true,
      component: List,
    },
    // {
    //   name: "page",
    //   path: ":page",
    //   props: true,
    //   component: Home,
    // },
    {
      name: "contact",
      path: "contact",
      props: true,
      component: Contact,
    },
    {
      name: "list",
      path: "list",
      props: true,
      component: List,
    },
    {
      path: ":id", // Rota dinâmica para cada item
      component: ItemDetail,
      props: true, // Passa os parâmetros da rota como props
    },
  ],
});
