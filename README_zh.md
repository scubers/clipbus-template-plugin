# Template Plugin

*[English](./README.md) · 中文*

> 写新插件先看 [GUIDE_zh.md](./GUIDE_zh.md)。它和本工程一起就是开发 Clipbus 插件的完整起步资料。

`template-plugin/` 是给三方插件作者和 AI 助手准备的**最小全功能**模板工程，基于插件协议 V2（manifest `schemaVersion` 6）与对应的 SDK 包 `@clipbus/plugin-sdk`，演示全部扩展点：detector、卡片页（renderer）、Action，以及卡片页与插件 runtime 之间的 typed 消息。

> **安装 hook：**manifest 声明了 `install` 时，Clipbus 会先请你确认再执行。Clipbus 通过 `CLIPBUS_PLUGIN_NPM_PATH` 提供已验证的 npm command 或 CLI：本模板用当前 Node 运行 JavaScript CLI，其他由宿主提供的 npm executable/shim 则直接执行；绝不 fallback 到 PATH 中的 `npm`。详见 [GUIDE_zh.md](./GUIDE_zh.md)。

## 必读文档

| 文档 | 用途 |
|---|---|
| [GUIDE_zh.md](./GUIDE_zh.md) | 脚手架工作流：快速开始、预览、在 Clipbus 中调试、构建、校验、测试 |
| `node_modules/@clipbus/plugin-sdk/docs/README.md` | 已安装 SDK 的文档地图：架构、manifest、入口、ctx、坑点 |
| `node_modules/@clipbus/plugin-sdk/API.md` | 自动生成的参考：全部方法、事件、入口、类型与上限 |

> SDK 文档与 `API.md` 随 SDK 包发布，始终对应已安装的版本。用 `npm update @clipbus/plugin-sdk` 刷新，不要手改。

## V2 插件的组成

| 部分 | 在哪运行 | 怎么写 | 本模板中 |
|---|---|---|---|
| detector | 插件 runtime（Node） | `definePlugin({ detectors })`；通过 `ctx.item.*` 写入，不返回值 | `features/template-detector`、`capability-gallery/runtime/detector.ts` |
| 卡片页（renderer） | WebView | `@clipbus/plugin-sdk/view` 的 `ctx`；没有 runtime 入口 | `features/*/app.vue` |
| Action | 插件 runtime | `definePlugin({ actions })`；返回 `result.text / image / none` | `features/auto-action`、`capability-gallery/runtime/actions.ts` |
| 消息 | 插件 runtime | `defineMessage<Req, Resp>(name)`：页面 `.call(data)`，runtime 注册 `.handle(fn)` | `features/expanded-renderer/messages.ts`、`capability-gallery/contracts.ts` |

两侧共用的契约——附件 payload 类型（`defineAttachment<T>`）和消息（`defineMessage<Req, Resp>`）——来自根入口 `@clipbus/plugin-sdk`，放在 runtime 与页面都会 import 的文件里（`payload.ts`、`messages.ts`、`contracts.ts`）。只在 Node 里跑的代码（读文件、算哈希）留在 runtime 文件中。

## 工程结构

```text
template-plugin/
├── manifest.json                       ← schemaVersion 6：detectors、renderers、actions
├── package.json                        ← 依赖 @clipbus/plugin-sdk
├── scripts/
│   ├── build-runtime.mjs               ← src/plugin.ts → runtime.nodeEntry（dist/plugin.cjs）
│   ├── build-ui.mjs                    ← 每个 manifest renderer 构建一个页面（PAGE_SOURCES）
│   ├── verify-build.mjs                ← 检查构建出的 runtime 与页面
│   └── install.mjs                     ← manifest install hook
├── src/
│   ├── plugin.ts                       ← definePlugin：detectors、actions、messages
│   ├── features/
│   │   ├── template-detector/          ← 两张示例卡片的 detector
│   │   ├── preview-renderer/           ← 固定高度卡片页 + 附件契约
│   │   ├── expanded-renderer/          ← 自适应高度卡片页 + Analyze 消息
│   │   ├── auto-action/                ← Action（无 UI）
│   │   └── capability-gallery/         ← V2 全部能力，可点击
│   ├── shared/
│   │   ├── composables/useCard.ts      ← 启动快照 + item/env 事件绑定成 Vue ref
│   │   ├── display.ts                  ← 内容 → 展示信息（runtime 与页面共用）
│   │   ├── digest.ts                   ← 文本或图片文件的 SHA-256（仅 runtime）
│   │   └── base.css
│   └── preview/                        ← 预览工作台（仅开发；@clipbus/plugin-sdk/preview）
│       ├── preview-host/
│       └── scenarios/
└── tests/                              ← `npm test` 针对 dist/ 运行 tests/**/*.test.cjs
    ├── support/                        ← 加载 dist/plugin.cjs、假宿主 ctx、PNG 读取
    ├── runtime/                        ← detector、Action、消息处理函数
    └── integration/                    ← install hook
```

在 Clipbus monorepo 中，本工程另有 `scripts/export.mjs`、`tests/export.test.cjs` 与 `tests/integration/bridge.test.cjs`（在两端宿主内嵌的 Node bridge 里跑构建产物），它们只服务于 monorepo，不会导出到独立模板仓。

## 演示的能力

### detector —— `template-detector`

- 文件：`src/features/template-detector/detector.ts`；`inputKinds`：`text`、`image`
- 通过 `ctx` 写入：带卡片标题（`Text · 3 lines`）的预览附件、展开附件、一条搜索扩展，以及给能解析为 JSON 的文本加 `json` 标签。处理函数不返回值。
- `recopy` 时，宿主仅替换这个 detector owner 显式写入的附件 `type` 组和搜索 `scope` 组；未提及的组保留，空 `entries` 只清空指定组，什么都不写则保留已存产出。与现值相同的组写入会跳过。
- 完整检测轮次（`copy`、`edit` 或 `manual`）在派发前预清旧的 Detector 附件和搜索扩展；处理函数失败不会恢复已清掉的产出。Action、renderer、task 产出各有独立 owner，不受这次清理影响。
- 处理函数的附件与搜索扩展写入在同一个 Core 事务中提交；标签、置顶和其他副作用不属于该事务，后续标签或置顶失败不会回滚这批产物。
- 每次复制都会检测。`trigger` 说明原因：`copy`、`recopy`（Core 命中已有条目）、`edit` 或 `manual`。`recopy` 时本 detector 尝试复用已存产出，缺失时才重新计算哈希。
- 图片条目只带元信息；detector 通过 `ctx.input.imagePath()` 读取文件。

### 卡片页，固定高度 —— `template-renderer`

- 文件：`src/features/preview-renderer/{payload.ts,app.vue}`；manifest `height: { min: 260, max: 260 }`、`tint`、默认 `buttons`
- `useCard(previewAttachment)` 读取启动快照（`ctx.renderer.context`）并跟随 `item.changed` / `env.changed`；按钮经 `ctx.renderer.onButton` 到达，用 `ctx.system.copyText` 复制。
- 卡片标题来自 detector 写入的附件 card，覆盖 manifest 标题。
- **约定**：页面不自绘最外层 background、border、圆角或阴影，卡片框由宿主和预览统一绘制。主题 token 也以 `--clipbus-*` CSS 变量提供。

### 卡片页，自适应高度 —— `template-expanded-renderer`

- 文件：`src/features/expanded-renderer/{payload.ts,messages.ts,analyze.ts,app.vue}`；manifest `height: { min: 120, max: 480 }`
- `@clipbus/plugin-sdk/dom` 的 `autoFit()` 测量内容并调用 `ctx.renderer.update({ height })`；宿主把高度限制在 manifest 范围内。
- **Analyze** 发送 typed 消息 `analyzeItem.call()`；runtime 处理函数读取完整内容（`ctx.item.getContent()`、`ctx.input.imagePath()`）后回复。
- 强调条通过 `env.changed` 跟随主题 token `accent`。

### Action —— `src/features/auto-action/action.ts`

- `template-auto-action`（text、image）、`-text`、`-image`：把输入描述成 `result.text(...)`。`item` 是 Flow 的起点条目，`content` 是当前级联值。图片变体通过 `ctx.input.imagePath()` 读取文件。
- 加上 gallery 的 Action，manifest 共声明 6 个 Action、5 个 renderer，超过免费配额（各 3 个），免费版宿主会展示 Plugin Pro 门控。

### capability-gallery

- 目录：`src/features/capability-gallery/`，能力矩阵见其 [README](./src/features/capability-gallery/README.md)。
- 1 个 detector（三张卡片）+ 3 个 Action（每种结果一个）+ 3 个卡片页（fixed、auto、bounded）+ 3 个消息。
- bounded 页调用全部页面侧方法、展示全部宿主事件；其 runtime probe 在一次消息调用里运行 runtime 侧方法。Node 生成的图片写入 `cache/…`，用 `ctx.asset.fileUrl(path)` 显示。

## 起步改造清单

最先改这几处，让 manifest 与代码保持一致：

1. `manifest.json` —— `plugin.id`、标题、`renderers[].attachmentType`（必须以 `<plugin.id>.` 开头）、`page`、`height`、`tint`、`buttons`、`inputKinds` 与 `writes`（插件会写的全部附件类型与搜索 scope）
2. `src/plugin.ts` —— detector 与 Action 的 key 必须等于 manifest id
3. `src/features/<feature>/payload.ts` / `messages.ts` —— runtime 与页面共用的附件和消息契约
4. detector / Action / 消息处理函数 —— runtime 代码
5. `src/features/<feature>/{app.vue,main.ts,index.html}` —— 卡片页，并在 `scripts/build-ui.mjs` 的 `PAGE_SOURCES` 加一行
6. `src/preview/scenarios/` —— 新卡片的预览场景

通常**不需要改**：`src/shared/`、`scripts/install.mjs`、`scripts/build-runtime.mjs`、`scripts/verify-build.mjs`。

## 常用命令

```sh
npm install       # 安装依赖（含 @clipbus/plugin-sdk）
npm run dev       # 卡片页预览工作台（@clipbus/plugin-sdk/preview）
npm run build     # typecheck + lint + 构建到 dist/ + 校验构建产物
npm test          # 针对构建好的 dist/ 运行 tests/**/*.test.cjs
npm run verify    # manifest 校验、构建、runtime manifest 校验，最后跑测试
```

脚手架工作流详见 [GUIDE_zh.md](./GUIDE_zh.md)。

## 短提示音示例

在 Clipbus 中启用模板后，复制一段文本或一张图片，点击首张预览卡片（`template-renderer`）头部的 **Play sound**。能力画廊的 **System → Play sound** 和 Runtime 探针也能试播。浏览器预览只记录调用、不发声；真实声音使用插件自带的 `sounds/copied.wav`、`sounds/copied.mp3` 或 `sounds/copied.aiff`。

首张预览卡片和能力画廊的 **System** 区都有 **Format** 选择框（WAV / MP3 / AIFF，初始为 WAV）和 **Volume** 滑块（0–100%，默认 100%）。同插件卡片通过 localStorage 记住并共享格式和音量；Runtime 声音探针会接收画廊当前选择。detector 等 Runtime 调用也可显式使用 `playCopiedSound(ctx, 50, "mp3")`。

支持扩展声音契约的 macOS 和 Windows 宿主也接受 MP3、PCM16 AIFF。例如 `ctx.system.playSound({ path: "package/sounds/copied.wav", volume: 50 })`，可用整数百分比 `0–100` 调整本次声音，省略为 `100`；时长限制和全 App 限流保持一致。模板仍默认 WAV 以兼容旧宿主，独立导出会带齐三种文件；参考文件及生成命令见 [sounds/README.md](sounds/README.md)。

三个入口共用 [`src/shared/sound.ts`](src/shared/sound.ts) 的 `playCopiedSound(ctx)`，返回 `started`、`busy` 或 `unsupported`。忙时跳过，不重试、不让 `PluginLimitExceeded` 中断 detector 的其他工作；资源等其他错误仍抛出。宿主格式和额度见 SDK 的 `docs/files.md`。

### 按需改成复制后播放

模板默认不自动发声。如需 copy / recopy 时播放，在 `src/plugin.ts` 导入 helper，并向已有的 `detectors` 添加：

```ts
import { playCopiedSound } from "./shared/sound";

// definePlugin({ detectors: { ... } }) 内：
"copy-sound": async ({ trigger }, ctx) => {
  if (trigger === "copy" || trigger === "recopy") {
    await playCopiedSound(ctx);
  }
},
```

同时在 `manifest.json` 的 `detectors` 数组添加对应声明：

```json
{ "id": "copy-sound", "title": "Copy sound", "inputKinds": ["text", "image"] }
```

独立 detector 不写附件，不会清掉其他 detector 的产出；`edit` 和 `manual` 不播放。多个插件竞争的是全 App 的声音槽，先到者不固定；延迟到达的请求若已过冷却仍可能播放，因此限流不等于“同一次复制只响一次”。

## 默认配置示例

`settings.defaults.json` 声明 `actionTitle`，`template-auto-action` 通过现有只读配置接口实际消费。Clipbus 安装/更新成功后补齐缺失键，用户保存的值在升级时保留。操作步骤见 [GUIDE_zh.md](./GUIDE_zh.md#试用默认配置)，契约以 SDK 的 `docs/manifest.md` 为准；旧宿主忽略该文件，Action 保留本地 fallback。

后台任务：[本地 CPU 示例、独立入口、查询/取消与公共模块复用](GUIDE_zh.md#后台任务)。

模板也演示 Worker 通知与卡片 **Notify demo** 按钮，见[系统通知说明](GUIDE_zh.md#系统通知)。

模型 SSE：在 **Template Expanded** 的 **OpenAI-compatible SSE test** 中，授权独立的模型服务 origin，填写完整 Chat Completions URL、API key、模型和 prompt，点击 **SSE test** 即可实时查看文本；**Cancel SSE** 或关闭卡片会取消请求。key 使用密码输入框，只在当前卡片内存中保留。详见[模型 SSE 测试](GUIDE_zh.md#模型-sse-测试)。

富文本样例：能力画廊的 **Copy rich-text sample** 可复制带标题、加粗和蓝色的内容；**Copy saved rich text** 可读取当前记录保存的 HTML/RTF 后重新复制。请粘贴到富文本编辑器验收，步骤见[使用指南](GUIDE_zh.md#验收富文本复制)。
