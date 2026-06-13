import { patchConsole, patchTextInputState } from "@clipbus/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import GalleryDraftActionApp from "./app.vue";
import "../../../shared/base.css";

createApp(GalleryDraftActionApp).mount("#app");
