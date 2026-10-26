// Which card pages scripts/build-ui.mjs builds: one per page file of the manifest renderers.

import path from "node:path";

/**
 * One build per page file; renderers may share a page when they share a source. Each page gets
 * its own folder: the build writes index.js and index.css next to the page and empties the folder
 * first, so two pages in one folder would overwrite each other.
 *
 * @param {Array<{ id: string, page: string }>} renderers - manifest renderers
 * @param {Record<string, string>} sources - renderer id → page source folder
 * @returns {Array<{ id: string, page: string, source: string }>}
 */
export function planPages(renderers, sources) {
  const pages = new Map();
  for (const renderer of renderers) {
    const source = sources[renderer.id];
    if (source === undefined) {
      throw new Error(`Renderer "${renderer.id}" has no page source in scripts/build-ui.mjs PAGE_SOURCES`);
    }
    const planned = pages.get(renderer.page);
    if (planned !== undefined && planned.source !== source) {
      throw new Error(`Renderers "${planned.id}" and "${renderer.id}" share ${renderer.page} but have different sources`);
    }
    pages.set(renderer.page, { id: renderer.id, page: renderer.page, source });
  }
  const unused = Object.keys(sources).filter((id) => !renderers.some((renderer) => renderer.id === id));
  if (unused.length > 0) {
    throw new Error(`PAGE_SOURCES lists renderers that manifest.json does not declare: ${unused.join(", ")}`);
  }
  const folders = new Map();
  for (const { page } of pages.values()) {
    const folder = path.posix.dirname(page);
    const other = folders.get(folder);
    if (other !== undefined) {
      throw new Error(
        `Pages ${other} and ${page} share the folder ${folder}/; give each page its own folder, ` +
          `such as dist/ui/renderers/<renderer id>/index.html`,
      );
    }
    folders.set(folder, page);
  }
  return [...pages.values()];
}
