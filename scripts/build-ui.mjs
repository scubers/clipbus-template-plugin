// Build one self-contained card page per manifest renderer.
//
// Each renderer's `page` (relative to the plugin root) is the HTML the Host
// loads; its folder, one per page, receives index.js and index.css next to it.
// PAGE_SOURCES says which source folder (index.html + main.ts) builds each
// renderer's page. To add a renderer: declare it in manifest.json and add a
// line here.

import { build } from "vite";
import vue from "@vitejs/plugin-vue";
import { access, copyFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planPages } from "./ui-pages.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Renderer id → page source folder. */
const PAGE_SOURCES = {
  "template-renderer": "src/features/preview-renderer",
  "template-expanded-renderer": "src/features/expanded-renderer",
  "gallery-renderer-fixed": "src/features/capability-gallery/renderer-fixed-ui",
  "gallery-renderer-auto": "src/features/capability-gallery/renderer-auto-ui",
  "gallery-renderer-bounded": "src/features/capability-gallery/renderer-bounded-ui",
};

const manifest = JSON.parse(await readFile(path.join(projectRoot, "manifest.json"), "utf8"));
const renderers = manifest.renderers ?? [];

function globalName(id) {
  return `ClipbusPlugin_${id.replace(/[^A-Za-z0-9]/g, "_")}`;
}

const pages = planPages(renderers, PAGE_SOURCES);

for (const { id, page, source } of pages) {
  const sourceDir = path.join(projectRoot, source);
  const entry = path.join(sourceDir, "main.ts");
  const template = path.join(sourceDir, "index.html");
  await Promise.all([access(entry), access(template)]);

  const outDir = path.dirname(path.join(projectRoot, page));
  await rm(outDir, { recursive: true, force: true });
  await build({
    root: projectRoot,
    configFile: false,
    logLevel: "warn",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
    plugins: [vue()],
    build: {
      lib: { entry, name: globalName(id), formats: ["iife"], fileName: () => "index.js", cssFileName: "index" },
      outDir,
      emptyOutDir: true,
      cssCodeSplit: false,
      assetsDir: ".",
      rollupOptions: {
        output: { assetFileNames: (asset) => (asset.name?.endsWith(".css") ? "index.css" : "[name][extname]") },
      },
    },
  });
  await copyFile(template, path.join(projectRoot, page));
  console.log(`[build-ui] ${id} → ${page}`);
}
