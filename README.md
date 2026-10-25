# model-translator — translate model output and thinking into any language
# model-translator — 将模型输出与思考翻译为任意语言

**Language / 语言：** [🇬🇧 English](#english) · [🇨🇳 中文](#中文)

---

## English

<details>
<summary><strong>🇬🇧 English</strong></summary>

A DSH host plugin that hooks the `llm/stream` pipeline and translates what the
model says — and, if you want, what it *thinks* — into another language **while
it is streaming**. Nothing is re-fetched and no request is replayed; the
translation happens inline, block by block.

### What it translates

| Block | Toggle | Default |
| --- | --- | --- |
| Visible model output (`text`) | `translateOutput` | on |
| Thinking / reasoning (`reasoning`) | `translateThinking` | on |

With both off, the stream passes through completely untouched. Tool-call blocks
(e.g. `todo_write`) are never translated, so the conversation history stays
verbatim.

### Providers

There are five `provider` values — two free engines, two model modes, and one offline engine:

| Provider | What translates |
| --- | --- |
| `auto` | The dsh-loaded model the conversation is currently on. No separate model pick; provider and model both follow the stream. |
| `model` | A dsh-loaded model you pick below. The provider is looked up from that model's catalog group. |
| `bing` | The Microsoft Bing Translate free HTTP endpoint. No model inference. |
| `google` | The Google Translate free HTTP endpoint. No model inference. |
| `opus` | An **offline** CTranslate2 + Opus-MT model running on this machine. No network call, no API key, no credentials used. The en-zh model ships bundled with the plugin; other pairs download on first use when `offlineAutoDownload` is on. |

`auto` and `model` stay inside credentials you already loaded; `bing` and `google`
are free but send the text to a third-party service; `opus` sends nothing anywhere
and includes the en-zh model in the package itself, so a fresh install translates
offline with no download. Turn `offlineAutoDownload` on to fetch other language
pairs from HuggingFace. The `model` field is ignored entirely for the free and
offline engines. Model routes translate with
`reasoningEffort: 'off'` and `maxTokens: 4096`, so an adapter that does not
advertise an `off` effort will refuse the call (the original text is flushed).

### Settings

Every field is `.volatile()`, so the settings panel is live-editable and
`apply()` re-reads the current values on the next stream — no remount. The form
exposes all of them, including the two advanced ones:

| Setting | Default | Notes |
| --- | --- | --- |
| `provider` | `auto` | `auto` / `model` / `bing` / `google` / `opus` |
| `model` | `auto` | Model routes only. `auto` follows the conversation's model |
| `targetLanguage` | `auto` | `auto` follows the interface language (pushed by the client); falls back to the host `LANG` |
| `translateOutput` | `true` | |
| `translateThinking` | `true` | |
| `timeoutMs` | `10000` | Per translation request, bounded to 100–60000. Raise it for model routes — a `maxTextChars`-sized segment often takes longer than 10 s. Not used by `opus`, which has no timeout |
| `maxTextChars` | `4000` | Per-request segment size; longer blocks are split and translated in full (no hard cap). `opus` caps segments at 2000 chars regardless |
| `offlinePair` | `auto` | Offline only. `auto` infers the pair per block from its detected language; otherwise force a direction like `en-zh` |
| `offlineModelDir` | *(empty)* | Offline only. Override for `$DSH_HOME/model-translator/models` |
| `offlineThreads` | `4` | Offline only. CPU threads for the CTranslate2 backend, 1–32 |
| `offlineBeamSize` | `4` | Offline only. Beam search width, 1–12 |
| `offlineAutoDownload` | `false` | Offline only. When off, only bundled or already-cached models work; when on, other pairs download ~160 MB on first use (HuggingFace, hf-mirror and ModelScope tried in order). Progress goes to the JSONL log and a `.download-progress` file in the model directory — there is no UI channel for it |
| `interfaceLanguage` | `auto` | Not editable. Mirrors the UI locale so `targetLanguage: auto` resolves to what you actually read, not the host `LANG` |

The form offers `auto`, `zh`, `en`, `ja`, `ko`, `fr`, `de`, `es`; the config
itself accepts any language tag, so `zh-TW` or `pt-BR` works if you edit
`cordis.patch.yml` directly. Simplified and traditional Chinese are normalized
per provider — `zh-Hans` / `zh-Hant` for Bing, `zh-CN` / `zh-TW` for Google.

### What it never breaks

- **Code, identifiers and symbols are never translated.** Fenced code blocks
  are split out as their own segments and never sent to any engine. Inline
  proper nouns, CamelCase identifiers, URLs, version numbers, template
  variables, and symbol/emoji runs (arrows, check marks, ZWJ family emoji,
  keycaps — currency symbols excluded so number localization keeps working)
  are swapped for `[[⟪*0⟫]]`-style placeholders before the text leaves the
  process, then reinserted verbatim; a placeholder the translation dropped is
  appended back at the end — it is never lost.
- **Translation failures never break the stream.** Any error — a timeout, an
  HTTP failure, a malformed response, an unsupported model, or a translation
  that comes back empty — flushes the original text unchanged. Every failure is
  also written to the host process log with the provider, model, target
  language, timeout, and elapsed time, so "it did not translate" is diagnosable
  instead of indistinguishable from "nothing to translate". A failed segment
  fails the whole block, so you never get a half-translated answer.
- **Reasoning output does not break a translation.** The plugin asks the
  adapter for `reasoningEffort: 'off'` so the translator does not think, but
  `'off'` is adapter vocabulary, not a universal constant: a hand-declared
  OpenAI-compat route whose wire spelling is `"none"` (sensenova) advertises no
  effort levels at all, and the LLM service refuses the call before a single
  token is sent. So the id is probed per route and omitted when unsupported,
  and any `reasoning-delta` that still arrives is dropped rather than fatal —
  only tool calls and a completely empty response fail the translation.
- **Every decision is logged to a file.** All events — `boot`, `capability`
  (the route's advertised effort vocabulary), `hook`,
  `translated`, `skip` (`short-block`, `streamed-live`,
  `already-target-language`, `cache-hit`), `fallback`, `fail`,
  `session-records`, `session-record-fail` and the `offline-download-*` trio — are appended
  as JSONL to `$DSH_HOME/logs/model-translator.log` (falling back to
  `~/.dsh/logs/` — the host does not export `DSH_HOME` — and finally to
  `$TMPDIR/logs/`). The host's `console.error` goes to whatever terminal
  launched it, which is often a pseudo-terminal nobody else can read; the file
  survives restarts and stays readable by anyone in the process. A missing
  `boot` line means `apply()` never ran (the module failed to load, or the
  bundle is disabled); a `boot` line with no `hook` line means the hook was
  registered but never called. Logging never throws into translation.
- **Every translation call is recorded in the session log.** Each text sent to
  a translation engine is appended to the conversation's own session log as a
  `plugin:model-translator/request` + `plugin:model-translator/result` record
  pair — the harness's "model-visible ⟺ recorded" invariant — which also
  makes the translation cache durable: after a restart, the same text is
  served from the session records instead of being translated again. Records
  live in the plugin's own `plugin:` namespace, never enter the model-visible
  surface, and are best-effort: if the session packages cannot be imported or
  the stream carries no session id, translation proceeds with the in-memory
  cache alone. The identity covers provider, model, exact text, both
  languages and a recipe revision, so a prompt change starts a fresh cache.
- **Markdown structure survives translation.** Headers, bold/italic, list
  markers, blockquotes, tables and blank lines pass through the pipeline
  intact: whole-line table separators and horizontal rules are exempt from
  both the garbled-output detector and the CJK dash rule, and the
  segment-level whitespace that separates blocks is preserved instead of
  trimmed away. Link and image destinations keep their ASCII parens — and
  when a free engine normalizes them to full-width ("[docs]（https://…）"),
  the URL destination is repaired back to CommonMark syntax on the way out.
- **Translation calls are marked auxiliary.** Model-route translation requests
  carry `purpose: 'translation'`, the same mechanism `session-title` and
  compaction use, so pipeline observers can tell an auxiliary call from a
  conversation turn.
- **Consecutive blocks translate with continuity.** The tail of the previously
  translated passage (source + translation) rides along in the prompt, so
  pronouns, terminology and tone stay consistent across blocks and sentences.
- **No translation recursion.** The re-entrancy guard targets only the
  `llm/stream` call this plugin itself issues (detected via an async-local
  store), so translation never translates itself — and never suppresses a
  concurrent genuine stream either.
- **Concurrent streams are safe.** Because the guard is per-call, not a
  process-wide flag, teammate, subagent and workflow streams running at the
  same time are each translated independently.
- **Same-language blocks stream live.** Once a block's buffered prose is
  confidently the target language (by script; CJK targets only), it switches
  to live passthrough — no wasted call, no fake identical "translation", and the
  text streams in real time instead of dumping at block-end. Latin-script
  targets (en/fr/de/es) can't be told apart by script, so they always translate
  (at block-end).
- **Translated blocks do not stream token by token.** A block that will be
  translated accumulates all of its deltas and only yields the rewritten
  `block-end`, so the text appears in one piece after the translation call
  returns. That delay is real latency, not a hang — and a `timeoutMs` that is
  too small shows up as exactly this: a block that never translates.
- **Chinese presentation fixes only apply to Chinese.** Punctuation, brackets,
  dates, currency, thousand separators, abbreviations and ordinals are rewritten
  to Chinese conventions only when the target language is Chinese. For every
  other target the translation is returned as the service produced it.
- **Free engines are firewalled.** Bing/Google requests use
  `credentials: 'omit'` and treat any redirect as an error.

### Where you configure it

The settings form appears in the plugin bundle's config panel
(`plugins.bundle.config`). Its model dropdown is filled from the loaded model
catalog, grouped by provider, and refreshes when adapters, credentials or
settings change. If the form is unavailable, edit the bundle's
`cordis.patch.yml` directly:

```yaml
- insert:
    - id: model-translator
      name: '@local/model-translator'
      config:
        provider: auto
        model: auto
        targetLanguage: auto
        translateOutput: true
        translateThinking: true
```

### Install / uninstall

```
plugin_manager install_bundle  <absolute path to this directory>
plugin_manager remove_bundle   @local/model-translator
```

Installing and re-enabling apply through HMR; disabling stops the stream hook
entirely.

[↑ back to top](#model-translator--translate-model-output-and-thinking-into-any-language)

</details>

---

## 中文

<details open>
<summary><strong>🇨🇳 中文</strong></summary>

一个 DSH 宿主插件，挂载到 `llm/stream` 管道，在**流式输出过程中**就把模型说出的
内容 —— 以及如果你想，它「想」的内容 —— 翻译成另一种语言。不重复抓取，也不重放
请求；翻译就地在每个块结束后完成。

### 翻译什么

| 内容块 | 开关 | 默认 |
| --- | --- | --- |
| 模型可见输出（`text`） | `translateOutput` | 开 |
| 思考 / 推理（`reasoning`） | `translateThinking` | 开 |

两个开关都关时，整个流原样通过。工具调用块（如 `todo_write`）从不被翻译，因此
对话历史保持原文。

### 翻译服务

`provider` 一共有五种取值 —— 两个免费引擎，两种模型模式，一个离线引擎：

| 服务 | 谁来做翻译 |
| --- | --- |
| `auto` | 当前对话正在使用的那个 dsh 已加载模型。不另选模型，provider 与模型都跟随这条流。 |
| `model` | 你自己在下方指定的 dsh 已加载模型。provider 按该模型在目录中的分组查找。 |
| `bing` | 微软 Bing Translate 免费 HTTP 端点。不调用模型。 |
| `google` | Google Translate 免费 HTTP 端点。不调用模型。 |
| `opus` | **离线**：在本机运行的 CTranslate2 + Opus-MT 模型。无网络请求、无 API key、不使用任何凭据。en-zh 模型已随插件捆绑；其他语言对开启 `offlineAutoDownload` 后首次使用时下载。 |

`auto` 与 `model` 都在你已加载的凭据之内；`bing` 与 `google` 免费，但会把文本
发给第三方服务；`opus` 不往任何地方发送文本，并且 en-zh 模型直接包含在插件包中，
因此新安装即可离线翻译，无需下载。开启 `offlineAutoDownload` 可从 HuggingFace
获取其他语言对。`model` 字段对免费与离线引擎完全不起作用。模型路由
以 `reasoningEffort: 'off'`、`maxTokens: 4096` 发起翻译，因此不声明 `off` 级别的
适配器会拒绝这次调用（此时会放出原文）。

### 设置

每个字段都是 `.volatile()`，因此设置面板可实时编辑，`apply()` 在下一条流上重新
读取当前值 —— 无需重新挂载插件。表单包含全部字段，包括两个高级项：

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `provider` | `auto` | `auto` / `model` / `bing` / `google` / `opus` |
| `model` | `auto` | 仅模型路由。`auto` 跟随当前对话的模型 |
| `targetLanguage` | `auto` | `auto` 跟随界面语言（由 client 推送）；回退到 host `LANG` |
| `translateOutput` | `true` | |
| `translateThinking` | `true` | |
| `timeoutMs` | `10000` | 单次翻译请求，限制在 100–60000。模型路由建议调大 —— 一个 `maxTextChars` 大小的分段常常比 10 秒更久。`opus` 不使用此项（离线推理无超时） |
| `maxTextChars` | `4000` | 每段请求大小；更长的块会被切分并完整翻译（无硬上限）。`opus` 无论如何都把分段限制在 2000 字符 |
| `offlinePair` | `auto` | 仅离线。`auto` 按每个块的检测语言推断语言对；也可固定方向如 `en-zh` |
| `offlineModelDir` | *(空)* | 仅离线。覆盖 `$DSH_HOME/model-translator/models` |
| `offlineThreads` | `4` | 仅离线。CTranslate2 后端 CPU 线程数，1–32 |
| `offlineBeamSize` | `4` | 仅离线。束搜索宽度，1–12 |
| `offlineAutoDownload` | `false` | 仅离线。关闭时仅使用捆绑或已缓存的模型；开启后其他语言对首次使用时下载约 160 MB（按顺序尝试 HuggingFace、hf-mirror 与 ModelScope）。进度写入 JSONL 日志和模型目录下的 `.download-progress` 文件 —— 没有UI通道 |
| `interfaceLanguage` | `auto` | 不可编辑。镜像 UI 语言，让 `targetLanguage: auto` 解析成你实际阅读的语言，而不是 host `LANG` |

表单提供 `auto`、`zh`、`en`、`ja`、`ko`、`fr`、`de`、`es`；配置本身接受任意语言
标签，所以直接改 `cordis.patch.yml` 时用 `zh-TW` 或 `pt-BR` 也可以。简繁中文按
服务归一化 —— Bing 用 `zh-Hans` / `zh-Hant`，Google 用 `zh-CN` / `zh-TW`。

### 它不会弄坏什么

- **代码、标识符与符号从不被翻译。** 围栏代码块会被拆成独立段落，不发给任何引擎。
  行内专有名词、CamelCase 标识符、URL、版本号、模板变量以及符号/emoji（箭头、
  对勾、ZWJ 家庭 emoji、按键帽 —— 货币符号除外，数字本地化仍有效）在文本离开进程
  前被替换成 `[[⟪*0⟫]]` 形式的占位符，翻译完再原样插回；翻译丢掉的占位符会被
  追加回结尾 —— 代码不会丢。
- **翻译失败不会弄断流。** 任何错误 —— 超时、HTTP 失败、响应格式异常、模型不受
  支持、或者整条翻译返回空 —— 都会把原文原样冲出。每一次失败同时写入
  host 进程日志，带上 provider、模型、目标语言、超时值和耗时，所以「没有翻译」是
  可查的，而不是和「本来就不用翻译」无法区分。某段翻译失败会让整块回退原文，所以
  你永远不会看到一个翻译了一半的答案。
- **推理内容不会弄坏翻译。** 插件会向适配器请求 `reasoningEffort: 'off'` 以避免翻译模型思考，
  但 `'off'` 是各适配器自己的词汇，不是通用常量：一个手工声明的 OpenAI 兼容路由，
  其线上的关闭拼写是 `"none"`（sensenova），就不声明任何 effort 级别，LLM 服务会在
  发出任何 token 之前直接拒绝这次调用。因此这个 id 会按路由探测，不支持时干脆不传；
  即使仍然回来的 `reasoning-delta` 也只会被丢弃，不会报错 —— 只有工具调用和完全空的
  响应才会让翻译失败。
- **每个决策都落盘。** 所有事件 —— `boot`、`capability`（该路由声明的 effort 词汇表）、`hook`、`translated`、`skip`
  （`short-block` / `streamed-live` / `already-target-language` / `cache-hit`）、
  `fallback`、`fail`、`session-records`、`session-record-fail` 及 `offline-download-*` 三件套 —— 都以 JSONL 追加到
  `$DSH_HOME/logs/model-translator.log`
  （回退到 `~/.dsh/logs/` —— host 并没有导出 `DSH_HOME` —— 最后回退到 `$TMPDIR/logs/`）。host 的 `console.error` 只会写进启动它的那个终端，
  往往是没人读得到的伪终端；文件跨重启保留，且进程内任何人均可读。没有 `boot`
  行说明 `apply()` 从未执行（模块加载失败或 bundle 被禁用）；有 `boot` 但没有
  `hook` 说明 hook 注册了却从未被调用。写日志绝不打断翻译。
- **每次翻译调用都记录进会话日志。** 发给翻译引擎的每段文本都会以
  `plugin:model-translator/request` + `plugin:model-translator/result`
  记录对的形式追加到该对话自己的会话日志 —— 即 harness 的
  「模型可见 ⟺ 已记录」不变量 —— 同时这也让翻译缓存获得持久形态：重启之后同样的
  文本直接从会话记录中复用，不再重新翻译。记录使用插件自己的 `plugin:` 命名空间，
  永不进入模型可见面；且为尽力而为 —— 会话包无法导入或流上没有 sessionId 时，
  翻照常进行，只是退回内存缓存。缓存身份覆盖 provider、模型、精确原文、两种语言
  和配方修订号，因此提示词一变，缓存即从零开始。
- **Markdown 结构在翻译后原样保留。** 标题、加粗、列表标记、引用、表格和空行
  完整通过管线：整行表格分隔线与水平线既不触发乱码检测、也不被中文破折号规则
  粉碎；分段之间的空白（围栏前的空行、行内代码两侧的空格）在重装时原样接回，
  不会被引擎的 trim 吃掉。链接与图片目标保持半角括号 —— 若免费引擎把它们归一化
  成全角（「[文档]（https://…）」），输出前会把 URL 目标修复回 CommonMark 语法。
- **翻译调用带辅助标识。** 模型路由的翻译请求携带 `purpose: 'translation'` ——
  与 `session-title`、压缩相同的机制 —— 让管道观察者能把它和对话轮次区分开。
- **相邻块带上下文翻译。** 上一段已译内容（原文 + 译文）的尾部会随提示词一起发送，
  代词、术语和语气因此跨块、跨句保持一致。
- **没有翻译递归。** 重入守卫只针对插件自己发起的那次 `llm/stream` 调用（用
  async-local 存储识别），因此翻译不会去翻译翻译本身——也不会误杀并发的真实流。
- **并发流是安全的。** 守卫是按调用而非进程级开关，因此同时运行的 teammate、
  subagent、workflow 流各自独立翻译。
- **同语言块实时流式。** 一旦块内已缓冲的文字被确认为目标语言（按文字脚本判定；仅 CJK 目标），即切换为实时放行——
  不浪费调用、不显示假翻译，且文字逐字流出而非攒到块尾一次性放出。拉丁脚本目标（en/fr/de/es）无法靠脚本区分，因此始终翻译（在块尾）。
- **要翻译的块不会逐字流式。** 会被翻译的块先把所有增量攒齐，只在 `block-end`
  时放出改写后的块，所以文字是在翻译调用返回后一次性出现的。这段等待是真实的
  延迟，不是卡死 —— `timeoutMs` 设得太小正好就是这个表现：块永远不翻译。
- **中文排版修正只对中文生效。** 标点、括号、日期、货币、千分位、缩写和序数只在
  目标语言是中文时改写成中文习惯。其他目标语言一律按翻译服务返回的原文输出。
- **免费引擎被隔离。** Bing/Google 请求使用 `credentials: 'omit'`，任何重定向都视为
  错误。

### 在哪配置

设置表单出现在插件 bundle 的配置面板（`plugins.bundle.config`）中。它的模型下拉
列表来自已加载的模型目录，按 provider 分组，并在适配器、凭据或设置变化时刷新。
如果表单不可用，直接编辑 bundle 的 `cordis.patch.yml`：

```yaml
- insert:
    - id: model-translator
      name: '@local/model-translator'
      config:
        provider: auto
        model: auto
        targetLanguage: auto
        translateOutput: true
        translateThinking: true
```

### 安装 / 卸载

```
plugin_manager install_bundle  <此目录的绝对路径>
plugin_manager remove_bundle   @local/model-translator
```

安装与重新启用通过 HMR 生效；禁用会完全停止该流钩子。

[↑ 返回顶部](#model-translator--将模型输出与思考翻译为任意语言)

</details>

[![](https://img.shields.io/badge/powered_by-dsh-4D6BFE?style=flat-square&logo=deepseek&logoColor=white)](https://github.com/deepseek-ai/deepseek-harness)
