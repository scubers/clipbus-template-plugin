# 插件开发指南（脚手架工作流）

*[English](./GUIDE.md) · 中文*

本工程（`plugins/template-plugin/`）是 Clipbus 三方插件的**脚手架与可运行示例**。本文件只讲**脚手架工作流**（起步、本地预览、在 Clipbus 中调试、构建、校验、测试）与**工程结构**。

**插件开发的权威知识**（架构、manifest、SDK 入口、detector、卡片页、Action、消息、入参形状、坑点）**随 SDK 包发布**，`npm install` 后在 `node_modules/@clipbus/plugin-sdk/docs/`——它始终对应你当前安装的 SDK 版本。

- **AI / 工具**：请先读本工程根目录的 [`AGENTS.md`](./AGENTS.md)，它指向 SDK 文档的稳定入口。
- **文档地图**：`node_modules/@clipbus/plugin-sdk/docs/README.md`
- **API 参考**：`node_modules/@clipbus/plugin-sdk/API.md`（generated，有冲突以它为准）
- 通过 `npm update @clipbus/plugin-sdk` 刷新文档与 API，**无需替换本工程任何文件**。

> 本工程内的代码与说明是**示例**，可能滞后于已安装的 SDK；与 SDK 文档冲突时**以 SDK 文档为准**。

---

## 0. 快速开始

### 前置条件

- 开发与测试使用 Node.js 22 的最新补丁版本（与 CI 一致）或更新的兼容版本：测试使用带 glob 的 `node --test` 和 `zlib.crc32`。`package.json` 中 `engines.node` 声明的较低下限不覆盖开发工具链。
- 支持插件协议 V2（manifest `schemaVersion` 6）的 Clipbus，与对应的 `@clipbus/plugin-sdk`。具体 API 以已安装 SDK 的文档和 `API.md` 为准。

### 初始化

```sh
npm install
```

`@clipbus/plugin-sdk` 是独立发布的 npm 包（三方工程通过 `npm install @clipbus/plugin-sdk` 安装）。它的入口：

| 引入 | 用在 | 提供 |
|---|---|---|
| `@clipbus/plugin-sdk` | runtime 与页面 | `defineMessage`、`defineAttachment`、错误、契约类型与常量 |
| `@clipbus/plugin-sdk/runtime` | runtime | `definePlugin`、`result`、runtime 侧 `ctx` 类型 |
| `@clipbus/plugin-sdk/view` | 卡片页 | 页面的 `ctx` |
| `@clipbus/plugin-sdk/dom` | 卡片页 | `autoFit`、`reportInputState`、`forwardConsole` |
| `@clipbus/plugin-sdk/validate` | 工具 | manifest 校验器（也是 `clipbus-validate-manifest` 命令行） |
| `@clipbus/plugin-sdk/preview` | 开发 | `createPreviewWorkbench` |

**插件作者不需要查看或修改 SDK 源码。**

### 本地预览

```sh
npm run dev
```

启动 Vite 预览工作台。`src/preview/preview-host/main.ts` 调用 `@clipbus/plugin-sdk/preview` 的 `createPreviewWorkbench`，并像宿主一样按附件类型选择卡片页。SDK 的假宿主为每个场景注入启动快照，按契约校验并回答页面的调用，绘制卡片头部（标题、颜色、按钮），推送 `item.changed`、`env.changed` 与 `renderer.button`。工作台提供场景下拉、主题预设（以 `--clipbus-*` CSS 变量应用，并推送 `env.changed`）、宽度滑杆与调用日志；`renderer.update({ height })` 在场景的高度范围内调整卡片高度。修改 `src/features/**/app.vue` 后热更新。

场景（`src/preview/scenarios/attachmentScenarios.ts`）从 `manifest.json` 读取卡片标题、颜色、按钮与高度范围，并用 detector 同一套函数构造 payload。工作台没有 Node 进程：场景里的 `messages` 代替插件 runtime 回答 `runtime.call`，资源 URL（`clipbus-asset://…`）也不会加载。harness 完整 API 见 SDK 文档。

### 在 Clipbus 中调试

两侧的 `ctx.log.debug/info/warn/error(...)`（以及 `ctx.log.write`）写入插件自己的日志文件；产品日志只记录条数和限流。卡片页上，`@clipbus/plugin-sdk/dom` 的 `forwardConsole()`（本工程每个 `main.ts` 都已调用）会把 `console.*` 输出也送到那里。runtime 用 `console.*` 打印的内容进入 bridge 的 stderr，不会混进协议流。开发插件的 data、cache、logs 与同 id 的已安装插件分开存放。

Clipbus → 设置 → 插件 负责管理开发插件（以下按钮名以 macOS 为准）：

1. **添加插件** → **本地开发插件** — 选择含 `manifest.json` 的目录（即 `sourceRootPath`），之后工程会出现在 **开发插件** 区段。开发插件直接从这个目录运行，源文件变化时 runtime 会重启。
2. 若 `manifest.json` 声明了 `install` 字段，Clipbus 会先请你确认，再执行安装脚本；工作目录为 `sourceRootPath`。`node_modules/` 等产物落到工程目录（等价于你手动 `npm install`）。
3. 安装日志写入 `<AppData>/development-plugins/<pluginID>/install-logs/`，不会污染你的 git status。

> **安装 hook 里的 npm：**Clipbus 通过 `CLIPBUS_PLUGIN_NPM_PATH` 提供已验证的 npm command 或 CLI。本模板解析 symlink 后，用 `process.execPath <npm-cli> ...` 运行 JavaScript CLI，其他由宿主提供的 npm executable/shim 则直接执行；刻意不提供 `npm` PATH fallback。变量缺失或路径不可用时，安装失败。安装脚本使用本机的 npm 配置与缓存；Clipbus 设置了 `npm_config_ignore_scripts=true`，依赖包自带的安装脚本（`postinstall` 等）不会运行，`npm run build` 照常。本模板有 `package-lock.json` 时用 `npm ci`，按 lockfile 锁定的版本与校验值安装。

每个开发插件行都有 **操作** 菜单：

| 操作 | 行为 |
|---|---|
| **重新加载** | 重读并校验 `manifest.json`，刷新 fingerprint 与加载状态。**不**重跑 install。 |
| **运行安装脚本…** | 就地重跑 install hook，更新 `lastInstallExecution`；仅当 manifest 声明了 `install` 时可用。 |
| **安装日志** | 打开已记录的安装日志。 |
| **在 Finder 中显示** | 在 Finder 中定位工程目录。 |
| **查看原因** | 插件不是 `ready` 时显示，说明最近一次加载或安装失败的原因。 |
| **解除绑定…** | 停止插件并解除绑定，工程文件保持不变。 |

加载状态：

| 状态 | 含义 |
|---|---|
| `installing` | install hook 正在运行。 |
| `installFailed` | install hook 失败或退出码非 0，或安装未完成就被中断。 |
| `runtimeUnavailable` | Clipbus 没有可用的 Node 运行环境来执行 install hook。 |
| `loadFailed` | 重新加载或启动时，`manifest.json` 或其指向的构建产物校验失败。 |
| `requiresUpdate` | manifest 的 `schemaVersion` 不受支持（见下文）。 |
| `conflict` | 已有启用中的已安装插件使用相同的 `plugin.id`。 |
| `ready` | 可用。 |

为旧版 manifest schema 编写的插件在迁移到 v6 并重新构建之前一直显示为 `requiresUpdate`，没有兼容层。从 v5 到 v6：`install` 去掉了 `runtime` 字段（安装脚本总是用 Node 运行），`ctx.system.openPath` 被删除，`ctx.system.openUrl` 只在卡片页可用且只接受 `http`、`https`、`mailto`，`ctx.system.reveal` 只接受插件自己目录里的文件。v6 还加了 `permissions.folders`：Runtime 不能联网、不能启动其他程序，用户的文件夹只能经声明的槽位、由用户选择后才能读写（gallery 的 `exports` 槽位）。更早从 v4 到 v5，本模板的迁移包括：`attachmentRenderers` 改为 `renderers`，页面路径 `page` 相对插件根目录（不再有 `runtime.uiRoot`）；`height` 改为 `{ min, max }`，并可声明 `tint`、`buttons` 默认值；`supportedInputKinds` 改为 `inputKinds`（只有 text 和 image）；去掉 `permissions`，detector 的 `attachmentTypes` 改为插件级的 `writes` 声明（插件会写的全部附件类型与搜索 scope）；detector 通过 `ctx` 写入而不是返回 artifact；卡片页从 `clipbus.*` 改用 `@clipbus/plugin-sdk/view` 的 `ctx`。完整对照见 SDK 文档。

### 生产构建

```sh
npm run build
```

依次：typecheck → lint → clean → build:runtime → build:ui → verify:build，输出到 `dist/`。

- `build:runtime` 把 `src/plugin.ts` 打包到 manifest 的 `runtime.nodeEntry`。
- `build:ui` 为每个 manifest renderer 在其 `page` 位置构建一个自包含页面（`index.html` + `index.js` + `index.css`）。`scripts/build-ui.mjs` 的 `PAGE_SOURCES` 把 renderer id 映射到源码目录；renderer 没有源码、源码没有对应 renderer、或两个页面放在同一个目录时构建会停下（构建在页面旁边写 `index.js` 与 `index.css`，所以每个页面一个目录，例如 `dist/ui/renderers/<renderer id>/index.html`）。
- `verify:build` 检查构建产物：runtime 模块注册的 detector 与 Action 恰好是 manifest 声明的那些；每个页面只用相对路径引用页面旁真实存在的文件。

### 校验插件

```sh
npm run verify
```

依次执行：**manifest 校验 → 构建 → runtime manifest 校验 → 测试**。

`npm run verify:manifest` 运行 SDK 的 manifest 校验器，也就是宿主加载插件时用的那一个。它在构建前把每个问题报告为一条 JSON 路径加一条规则（`pattern`、`uniqueBy`、`pluginNamespace`、`requiredWhen`、`fieldOrder`、`unsupportedSchemaVersion` 等）。构建之后，`npm run verify:manifest:runtime` 以 `--runtime` 再校验一次，额外要求 manifest 指向的文件（`runtime.nodeEntry`、`install.entry`、各 `renderers[].page`）都存在于插件目录内。

也可以单独运行校验器：

```sh
npm run verify:manifest
# 或直接调用 SDK 命令行：
npx clipbus-validate-manifest .
npx clipbus-validate-manifest . --runtime  # 额外检查构建产物
```

### 测试

```sh
npm test         # tests/ 下全部测试（tests/**/*.test.cjs）
```

测试加载构建出的 runtime（`dist/plugin.cjs`），所以先构建（`npm run verify` 会先构建）。`tests/support/plugin.cjs` 用启动上下文和真实的临时 data、cache 目录建立插件，并为一次调用扮演宿主：每个 `ctx` 方法记录参数，并按测试给的脚本回答。测试处理函数写了什么、返回了什么——一次 detector 运行的全部写入、Action 的结果、消息的回复——而不是代码的组织方式。

---

## 1. 工程结构

插件按 feature 切分，每个 feature 一个自洽目录。推荐布局：

```text
your-plugin/
├── manifest.json
├── package.json                        ← 依赖 @clipbus/plugin-sdk
├── scripts/                            ← build:runtime / build:ui / verify:build / install
├── src/
│   ├── plugin.ts                       ← definePlugin：detectors、actions、messages
│   ├── features/<feature-name>/        ← 每个能力一个文件夹
│   │   ├── payload.ts                  ← defineAttachment 契约 + payload 构造（两侧共用）
│   │   ├── messages.ts                 ← defineMessage 契约（两侧共用）
│   │   ├── detector.ts / action.ts     ← runtime 处理函数（Node）
│   │   ├── app.vue                     ← 卡片页
│   │   └── main.ts / index.html        ← 页面入口，由 build:ui 构建
│   ├── shared/                         ← 跨 feature 的薄工具层
│   └── preview/                        ← 预览工作台（仅开发）
└── tests/
```

runtime 与页面都会 import 的文件不要用 Node 或 DOM API；runtime bundle 面向 Node，每个页面 bundle 面向 WebView。本模板自带的 feature 见 [README_zh.md](./README_zh.md) "演示的能力"。

> SDK 是独立包 `@clipbus/plugin-sdk`，由插件契约生成——**不要手动改**。

---

## 接下来

脚手架工作流就这些。**插件实现的全部知识在 SDK 文档**——见根目录 [`AGENTS.md`](./AGENTS.md)，或直接打开 `node_modules/@clipbus/plugin-sdk/docs/README.md`（文档地图）与 `node_modules/@clipbus/plugin-sdk/API.md`（API 参考）。
