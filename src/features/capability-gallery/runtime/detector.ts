// gallery-detector: three cards per item, one per manifest height shape.
//
// This detector is cheap, so it writes on every trigger, recopy included. The
// Host drops writes equal to what is stored, so keep payloads stable for the
// same content (no timestamps or counters): an unchanged payload means no
// item.changed and no search-extension sync event on each copy.
//
// Entries carry no `card`: the Host keeps the card already stored for the
// same type and key, so a title or buttons a page wrote back with
// `ctx.renderer.update` survive re-detection. The manifest gives the defaults.

import type { DetectorHandler } from "@clipbus/plugin-sdk/runtime";
import { GALLERY_SHAPES, galleryCards, type GalleryShape } from "../contracts";

export const GALLERY_SEARCH_SCOPE = "gallery";

const HIGHLIGHTS: Record<GalleryShape, string[]> = {
  fixed: ["fixed height", "startup snapshot", "env.onChange", "renderer.onButton"],
  auto: ["autoFit", "item.onChange", "ctx.plugin"],
  bounded: ["every view method", "runtime probes", "asset URLs", "renderer.update"],
};

export const detectGallery: DetectorHandler = async ({ content }, ctx) => {
  await Promise.all([
    ...GALLERY_SHAPES.map((shape) =>
      galleryCards[shape].set(ctx, [{ key: shape, payload: { shape, inputKind: content.kind, highlights: HIGHLIGHTS[shape] } }]),
    ),
    ctx.item.setSearchExtension({
      scope: GALLERY_SEARCH_SCOPE,
      entries: GALLERY_SHAPES.map((shape) => ({
        key: shape,
        text: `capability gallery ${shape} ${HIGHLIGHTS[shape].join(" ")}`,
        label: "Gallery",
      })),
    }),
  ]);
};
