import { patchConsole, patchTextInputState } from "@clipbus/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import GalleryRendererBoundedApp from "./app.vue";
import "../../../shared/base.css";

createApp(GalleryRendererBoundedApp).mount("#app");
