// The preview workbench (`npm run dev`): the SDK's fake Host injects each
// scenario's startup snapshot, answers the page's calls with the contract's
// validation, draws the card header and buttons, and pushes Host events.

import { reportInputState } from "@clipbus/plugin-sdk/dom";
import { createPreviewWorkbench } from "@clipbus/plugin-sdk/preview";
import { createApp, type Component } from "vue";
import "../../shared/base.css";
import { galleryCards } from "../../features/capability-gallery/contracts";
import RendererAutoApp from "../../features/capability-gallery/renderer-auto-ui/app.vue";
import RendererBoundedApp from "../../features/capability-gallery/renderer-bounded-ui/app.vue";
import RendererFixedApp from "../../features/capability-gallery/renderer-fixed-ui/app.vue";
import ExpandedApp from "../../features/expanded-renderer/app.vue";
import { expandedAttachment } from "../../features/expanded-renderer/payload";
import PreviewApp from "../../features/preview-renderer/app.vue";
import { previewAttachment } from "../../features/preview-renderer/payload";
import { previewScenarios } from "../scenarios/attachmentScenarios";

// Like the Host, pick the card page by attachment type.
const PAGES: Record<string, Component> = {
  [previewAttachment.type]: PreviewApp,
  [expandedAttachment.type]: ExpandedApp,
  [galleryCards.fixed.type]: RendererFixedApp,
  [galleryCards.auto.type]: RendererAutoApp,
  [galleryCards.bounded.type]: RendererBoundedApp,
};

reportInputState();

const root = document.getElementById("app");
if (root === null) {
  throw new Error("preview-host/index.html has no #app element");
}

createPreviewWorkbench(root, {
  scenarios: previewScenarios,
  mount(slotEl, { scenario }) {
    const page = PAGES[scenario.attachment.type];
    if (page === undefined) {
      throw new Error(`No card page for ${scenario.attachment.type}`);
    }
    const app = createApp(page);
    app.mount(slotEl);
    return () => app.unmount();
  },
});
