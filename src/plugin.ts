// The plugin runtime: the Node module the Host's bridge loads (`runtime.nodeEntry`).
// Detector and Action keys must equal the manifest ids; messages need no
// manifest entry. Card pages have no runtime registration.

import { definePlugin } from "@clipbus/plugin-sdk/runtime";
import { describeImageInput, describeInput, describeTextInput } from "./features/auto-action/action";
import { galleryImageAction, galleryNoneAction, galleryTextAction } from "./features/capability-gallery/runtime/actions";
import { detectGallery } from "./features/capability-gallery/runtime/detector";
import { galleryMessages } from "./features/capability-gallery/runtime/messages";
import { handleAnalyzeItem } from "./features/expanded-renderer/analyze";
import { detectTemplate } from "./features/template-detector/detector";

export default definePlugin({
  detectors: {
    "template-detector": detectTemplate,
    "gallery-detector": detectGallery,
  },
  actions: {
    "template-auto-action": describeInput,
    "template-auto-action-text": describeTextInput,
    "template-auto-action-image": describeImageInput,
    "gallery-auto-text": galleryTextAction,
    "gallery-auto-image": galleryImageAction,
    "gallery-auto-none": galleryNoneAction,
  },
  messages: [handleAnalyzeItem, ...galleryMessages],
});
