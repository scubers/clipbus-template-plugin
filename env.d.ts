/// <reference types="vite/client" />

// File is intentionally a SCRIPT (no `export {}`) so the ambient `*.vue`
// module declaration merges with the global scope. Adding `export {}` would
// scope it to a module and break resolution of `import X from "*.vue"`.

// Shim Single-File Vue components so TS resolves their default export type.
declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
  export default component;
}
