import { patchConsole, patchTextInputState } from "@clipbus/plugin-sdk/dom";
patchConsole();
patchTextInputState();

import { createApp } from "vue";
import ExpandedAttachmentTemplateApp from "./app.vue";
import "../../shared/base.css";

createApp(ExpandedAttachmentTemplateApp).mount("#app");
