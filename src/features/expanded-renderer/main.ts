import { forwardConsole, reportInputState } from "@clipbus/plugin-sdk/dom";
import { createApp } from "vue";
import App from "./app.vue";
import "../../shared/base.css";

// Opt-in page helpers: console output also goes to the plugin log file, and
// text-input focus is reported to the Host so its shortcuts give way while
// the user types.
forwardConsole();
reportInputState();

createApp(App).mount("#app");
