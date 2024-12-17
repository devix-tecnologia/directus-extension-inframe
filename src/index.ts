import { defineModule } from "@directus/extensions-sdk";
import ModuleComponent from "./module.vue";

export default defineModule({
  id: "dasboard",
  name: "Dashboard",
  icon: "rocket_launch",
  routes: [
    {
      path: "",
      props: true,
      component: ModuleComponent,
    },
    {
      name: "page",
      path: ":page",
      props: true,
      component: ModuleComponent,
    },
  ],
});
