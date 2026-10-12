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

| Provider | What translates |
| --- | --- |
| `auto` | A dsh-loaded model. Follows the current conversation's provider and model by default, or pins one you pick from the catalog. |
| `bing` | The Microsoft Bing Translate free HTTP endpoint. No model inference. |
| `google` | The Google Translate free HTTP endpoint. No model inference. |

`auto` stays inside credentials you already loaded; `bing` and `google` are free
but send the text to a third-party service. Pick the tradeoff you want — the
`model` field is ignored entirely for the free engines.

### Settings

Every field is `.volatile()`, so the settings panel is live-editable and
`apply()` re-reads the current values on the next stream — no remount.

| Setting | Default | Notes |
| --- | --- | --- |
| `provider` | `auto` | `auto` / `bing` / `google` |
| `model` | `auto` | Model routes only. `auto` follows the conversation's model |
| `targetLanguage` | `auto` | `auto` resolves from `LANG` / `LC_ALL` / `LANGUAGE` |
| `translateOutput` | `true` | |
| `translateThinking` | `true` | |
| `timeoutMs` | `10000` | Bounded to 100–60000 |
| `maxTextChars` | `4000` | Longer blocks pass through untranslated |

The form offers `auto`, `zh`, `en`, `ja`, `ko`, `fr`, `de`, `es`; the config
itself accepts any language tag, so `zh-TW` or `pt-BR` works if you edit
`cordis.patch.yml` directly. Simplified and traditional Chinese are normalized
per provider — `zh-Hans` / `zh-Hant` for Bing, `zh-CN` / `zh-TW` for Google.

### What it never breaks

- **Code is never translated.** Fenced blocks and inline code are swapped for
  `[[CODE0]]`-style placeholders before the text leaves the process, then
  reinserted verbatim. If a translation drops a placeholder, the code is
  appended back at the end — it is never lost.
- **Translation failures are invisible.** Any error — a timeout, an HTTP
  failure, a malformed response, or a translation model that starts emitting
  reasoning — flushes the original text unchanged. You never get a half-translated
  answer.
- **No translation recursion.** A re-entrancy guard skips the `llm/stream` call
  the translation model makes of its own, so translation never translates itself.
- **Repeated blocks are cheap.** A process-lifetime cache, bounded at 500
  entries and keyed by provider, model, language and text, so retries, replays
  and duplicate blocks translate once. Failures are not cached, so a transient
  outage clears on the next attempt; concurrent identical misses share a single
  call.
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

| 服务 | 谁来做翻译 |
| --- | --- |
| `auto` | 一个 dsh 已加载的模型。默认跟随当前对话的 provider 与模型，也可指定目录中的某个模型。 |
| `bing` | 微软 Bing Translate 免费 HTTP 端点。不调用模型。 |
| `google` | Google Translate 免费 HTTP 端点。不调用模型。 |

`auto` 待在你已加载的凭据之内；`bing` 与 `google` 免费，但会把文本发给第三方服务。
按你的取舍选择 —— `model` 字段对免费引擎完全不起作用。

### 设置

每个字段都是 `.volatile()`，因此设置面板可实时编辑，`apply()` 在下一条流上重新
读取当前值 —— 无需重新挂载插件。

| 设置项 | 默认值 | 说明 |
| --- | --- | --- |
| `provider` | `auto` | `auto` / `bing` / `google` |
| `model` | `auto` | 仅模型路由。`auto` 跟随当前对话的模型 |
| `targetLanguage` | `auto` | `auto` 从 `LANG` / `LC_ALL` / `LANGUAGE` 解析 |
| `translateOutput` | `true` | |
| `translateThinking` | `true` | |
| `timeoutMs` | `10000` | 限制在 100–60000 |
| `maxTextChars` | `4000` | 更长的块不翻译、原样通过 |

表单提供 `auto`、`zh`、`en`、`ja`、`ko`、`fr`、`de`、`es`；配置本身接受任意语言
标签，所以直接改 `cordis.patch.yml` 时用 `zh-TW` 或 `pt-BR` 也可以。简繁中文按
服务归一化 —— Bing 用 `zh-Hans` / `zh-Hant`，Google 用 `zh-CN` / `zh-TW`。

### 它不会弄坏什么

- **代码从不被翻译。** 围栏代码块与行内代码在文本离开进程前被替换成 `[[CODE0]]`
  形式的占位符，翻译完再原样插回。如果翻译把占位符弄丢了，代码会被追加回结尾 ——
  代码不会丢。
- **翻译失败是无形的。** 任何错误 —— 超时、HTTP 失败、响应格式异常、或者翻译模型
  开始吐出推理内容 —— 都会把原文原样冲出。你永远不会看到一个翻译了一半的答案。
- **没有翻译递归。** 重入守卫会跳过翻译模型自己发起的 `llm/stream` 调用，因此翻译
  不会去翻译翻译本身。
- **重复的块很便宜。** 一个进程生命周期的缓存，上限 500 条，按 provider、model、
  语言与文本做键，因此重试、重放与重复块只翻译一次。失败不写缓存，所以临时故障
  下次尝试就恢复；并发的相同未命中共享同一次调用。
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
