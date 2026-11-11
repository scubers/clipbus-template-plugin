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

假宿主目前宣称支持 `tasks.*`，但这些调用只返回 `{}`，没有模拟任务生命周期。即使预览中 `ctx.capabilities.has("tasks.enqueue")` 为 true，任务接纳、查询、取消和结果写回仍须在 Clipbus 中验收。

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

Clipbus 加载 manifest schema v6；不支持的 `schemaVersion` 会显示为 `requiresUpdate`。当前字段和校验规则见已安装 SDK 的 `docs/manifest.md`。默认沙箱禁止 Runtime 与 Task Worker 直接联网、启动其他程序。用户文件夹须通过声明的槽位、由用户选择后才能访问（gallery 的 `exports` 槽位）；通过 `ctx.http` 的 HTTP 请求使用宿主已授权的网络槽位。`ctx.system.reveal` 接受插件目录或用户授权文件夹内的现存路径。

插件可声明 `"permissions": { "unrestrictedRuntime": true }` 请求高信任 Runtime 模式；只有用户批准后，Runtime 与 Task Worker 才以 `direct` 模式运行。直接文件、网络与子进程访问受 OS 和当前用户约束，不受文件夹/网络槽位限制；卡片页与宿主代办 API 仍遵守各自限制。本模板保持不声明，使用默认沙箱。

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

## 短提示音示例

在 Clipbus 中复制文本或图片后，点击首张预览卡片头部的 **Play sound**；能力画廊也有页面按钮和 Runtime 探针。首张卡片和画廊 **System** 区可选 **Format**（WAV / MP3 / AIFF）和 **Volume**，也会传给 Runtime 声音探针；卡片本地记住这两项设置。`sounds/` 中的三份真实参考文件都会随独立导出分发。浏览器预览只记调用、不发声。共享 helper 位于 `src/shared/sound.ts`，忙时正常跳过；默认不在 copy 后自动播放。可选 copy/recopy detector 的接入片段见 [README_zh.md 的短提示音示例](README_zh.md#短提示音示例)，宿主格式与额度以 SDK 的 `docs/files.md` 为准。

## 试用默认配置

根目录的 `settings.defaults.json` 会随模板导出。在 Clipbus 安装或更新本插件，会在外部配置中初始化 `plugin.template.full.actionTitle`。修改此值后再次更新，用户标题保持不变，新声明的键会补入。`template-auto-action` 实际通过 `ctx.settings.get()` 读取标题，旧宿主缺失配置时使用本地 fallback；单独重新加载不会导入。运行 `npm run verify` 可校验默认文件并验证配置覆盖和 fallback 分支。包规则以 SDK 的 `docs/manifest.md` 为准。

## 后台任务

模板需要支持 tasks 的 Host；旧 Host 即使接受 manifest v6，也会拒绝这次新增的字段。

复制以 `local-digest:` 开头的文本，短 detector 只提交本地 CPU 任务：一百万轮串联 SHA-256，耗时取决于机器。文本条目的 Expanded Preview 提供 **Start background**（替换当前任务）和 **Cancel background**（精确取消 taskId）。页面在任务活动时查询，重开时再查询；关闭页面不取消已接纳任务，退出 Clipbus 可以中断。

`src/plugin.ts` 处理 detector/messages；`src/tasks.ts` 是独立 Worker 入口。两边 import 同一份 `features/background-work/compute.ts`；普通消息 `template.localDigest` 用较少轮次调用相同函数。共享的是实现，进程内实例、缓存和全局变量分别存在。

任务按主体 itemId 调度。data 相同的 reuse 保留活动任务的原输入，需要按修改后的内容重算时使用 replace。hash 只在最终写回时校验：条目缺失或 hash 不同则丢弃结果，接受 A→B→A。

Worker 分批 yield 并检查 `ctx.task.signal`，使用 task owner 写入 key 为 `background-digest` 的 expanded 附件。失败或取消保留上次成功结果。它不依赖网络或子进程。浏览器预览工作台不执行真实 Node Worker，后台生命周期需在 Clipbus 中验证。

`build:runtime` 同时构建 `runtime.nodeEntry` 与 `runtime.taskEntry`；`verify:build` 分别核对各自的处理函数。完整 API 与限制见 SDK `docs/runtime.md` 和 `API.md`。

## 系统通知

Expanded Preview 提供 **Notify demo** 按钮。后台 Worker 也会在计算完成后尝试通知；通知权限或限流失败不影响计算结果。

```ts
if (ctx.capabilities.has("system.notify")) {
  try {
    await ctx.system.notify({
      title: "计算结束",
      body: "请重新打开原条目，检查结果是否已保存。",
    });
  } catch {
    // 通知被关闭或被限流时，仍保留任务的计算结果。
  }
}
```

普通 Runtime、后台 Worker 与卡片页均可调用。title/body 是非空、单行纯文本，按 UTF-8 字节限制长度；Clipbus 与插件身份由宿主固定。当前准入限制为每插件 10 秒一次、全局 2 秒一次，跨进程与页面共享。

macOS 首次调用可能请求系统通知权限，Windows 尊重系统通知开关。短 detector 可能先超时，建议先通过 **Notify demo** 完成授权，再从 detector 请求通知。成功表示已提交系统，不保证出现横幅；专注模式可能抑制展示。浏览器预览工作台只记录调用。

通知属于即时副作用，task handler 中发送通知不证明宿主已提交暂存结果。因此示例使用“计算结束”，不使用“结果已保存”。不要默认把剪贴板正文或密钥放进通知：系统可能在锁屏显示，并保存在通知历史中。

## 模型 SSE 测试

1. 重新加载/更新模板，在插件网络授权中批准新增的 `model-api` 槽位。只填写模型服务的 origin，例如 `https://api.openai.com`，或本地兼容服务的协议、主机和端口。该槽位仅允许 POST，与现有 `http-demo` 独立。
2. 打开 **Template Expanded → OpenAI-compatible SSE test**，填写完整 Chat Completions URL（例如 `https://api.openai.com/v1/chat/completions`）、API key、服务支持的模型名和 prompt。URL 的 origin 必须与授权一致；兼容服务的路径按实际填写，不自动拼接或改写。
3. 点击 **SSE test**，示例发送 `{ model, messages: [{ role: "user", content: prompt }], stream: true }`，可选 `Authorization: Bearer …`，并随 SSE 事件实时追加 `choices[0].delta.content`。点击 **Cancel SSE** 取消；失败或取消保留已收到的文字。未收到 `[DONE]` 就断流会提示结果可能不完整。

本例只支持 [OpenAI Chat Completions 文本流](https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events)，不实现 Responses API 或工具调用。宿主提供 HTTP，模板复用后台示例的 SSE 分帧；没有新增模型 SDK 或宿主 API。

key 使用密码输入框，本地服务允许留空；key、prompt 和结果只留在当前卡片内存，不写入设置、storage、附件或日志。仅发送手动填写的 prompt，不读取剪贴板正文。此请求属于卡片页面，关闭或替换卡片会取消，重开后清空 key、模型、prompt 和结果。真实服务可能计费，示例不会自动发起调用，仍受原生 HTTP 时限约束。真实模型由使用者手工验收；自动化测试仅使用合成 SSE，不使用真实 key 或付费调用。

## 验收富文本复制

在 Clipbus 安装模板插件，选中一条文本记录，打开高度受限的能力画廊卡片。在 **System** 区点击 **Copy rich-text sample**，粘贴到 TextEdit、Word 等富文本编辑器，应看到标题、加粗和蓝色文字。Clipbus 新记录仍显示纯文本。选中新记录后点击 **Copy saved rich text**，验证从持久化记录取回 HTML/RTF 并再次复制；重启应用或跨端同步后再试一次。Runtime probe 中也提供相同操作。浏览器 preview 是模拟宿主，最终格式请在原生应用验收。
