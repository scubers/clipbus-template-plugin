# AGENTS.md — 给 AI 与编码工具的入口指引

本工程（`@clipbus/template-plugin`）是 Clipbus 三方插件的**脚手架与可运行示例**，基于插件协议 V2（manifest `schemaVersion` 6）与对应的 `@clipbus/plugin-sdk`。

## 权威开发知识在 SDK 包内，不在本工程

插件开发的全部权威文档（架构、`manifest.json`、SDK 入口、detector / 卡片页 / Action、消息、入参形状、坑点）**随 `@clipbus/plugin-sdk` 一起发布**。`npm install` 后它们就在本地：

- **文档地图（稳定入口，先读这个）**：`node_modules/@clipbus/plugin-sdk/docs/README.md`
- **API 真相源**：`node_modules/@clipbus/plugin-sdk/API.md`（由 codegen 直出，保证与代码一致）

开发本插件前，请先打开上面的**文档地图**——它会列出当前 SDK 版本的全部主题文档。

## 工作约定

- 这些 SDK 文档**始终对应当前安装的 SDK 版本**；通过 `npm update @clipbus/plugin-sdk` 刷新，**无需替换本工程任何文件**。
- 本工程内的代码、`GUIDE.md` 及注释都是**示例与脚手架工作流说明，可能滞后于已安装的 SDK**。**与 SDK 文档冲突时以 SDK 文档为准；方法签名与上限以 `API.md` 为准。**
- 本工程的 `GUIDE.md` 只覆盖**脚手架工作流**（起步、本地预览、在 Clipbus 调试、构建、校验、测试）与工程结构。
- **不要**查看或修改 `node_modules/@clipbus/plugin-sdk/` 内的 SDK 源码；它由 codegen 维护。

## 改动本工程时

- manifest 的 detector / Action id 必须与 `src/plugin.ts` 里 `definePlugin` 的 key 一一对应；新增 renderer 要在 `scripts/build-ui.mjs` 的 `PAGE_SOURCES` 加一行。`npm run build` 的 `verify:build` 会检查这两点。
- runtime 与卡片页共用的契约（`defineAttachment`、`defineMessage`）放在两侧都 import 的文件里，这些文件不得使用 Node 或 DOM API。
- 新增附件类型或搜索 scope 时，同时加进 manifest 的 `writes.attachmentTypes` / `writes.searchScopes`；没声明的写入在宿主里会被拒绝（`undeclared`）。
- 改完运行 `npm run verify`（manifest 校验 → 构建 → runtime manifest 校验 → 测试）。测试针对构建产物 `dist/plugin.cjs`，验证写入、结果与回复等行为，不写源码字符串或代码形状的检查。
