/** Client-side configuration UI for @local/model-translator.
 *  Registers a form in the plugins.bundle.config slot that lets the user
 *  choose translation provider, target language, model (from the loaded
 *  model catalog), and toggles. All strings are localized via ctx.locale. */
window.__ModuleLoader__.load({
  id: '@local/model-translator',
  factory(require) {
    const React = require('react');
    const { useState, useEffect, useRef } = React;
    const h = React.createElement;

    /* ── locale dictionaries (inline so no resource resolution is needed) ── */

    const NS = 'model-translator';
    const en = {
      title: 'Model Translator Settings',
      subtitle: 'Automatically translates model output and thinking (reasoning) during streaming. If translation fails, the original text is shown.',
      provider: 'Translation Provider',
      providerHintFree: 'Free translation API \u2014 no model inference, text is sent to the translation service.',
      providerHintAuto: 'Follow the current conversation\u2019s model (no separate model pick).',
      providerHintModel: 'Translate with a specific dsh-loaded model. Pick one below.',
      model: 'Translation Model',
      modelHintModel: 'Pick a dsh-loaded model for translation. It uses that model\u2019s own provider route.',
      modelAuto: 'Auto (follow current conversation model)',
      modelLoading: 'Loading available models\u2026',
      modelLoadFailed: 'Could not load the model list.',
      targetLanguage: 'Target Language',
      targetLanguageHint: 'Use \u201cAuto\u201d to follow the interface language, or select a specific language.',
      translateOutput: 'Translate model output',
      translateThinking: 'Translate thinking (reasoning)',
      advanced: 'Advanced',
      timeoutMs: 'Translation timeout (ms)',
      timeoutMsHint: 'Per translation request, 100\u201360000 ms. Raise it for model routes \u2014 a 4000-char segment often exceeds 10s and the block is then flushed untranslated.',
      maxTextChars: 'Segment size (chars)',
      maxTextCharsHint: 'Longer blocks are split into segments of this size, translated, and joined back. Raise for fewer calls, lower for providers with small request limits.',
      providerAuto: 'Auto (follow current conversation model)',
      providerModel: 'Model translation engine (pick a model)',
      providerBing: 'Bing Translate (free)',
      providerGoogle: 'Google Translate (free)',
      providerOpus: 'Offline (CTranslate2 + Opus-MT)',
      providerHintFree: 'Free translation API \u2014 no model inference, text is sent to the translation service.',
      providerHintOpus: 'Runs CTranslate2 + an Opus-MT model locally on this machine. No network call, no API key, text never leaves the host. The en\u2013zh model ships bundled; other pairs download on first use. Slower than a model route \u2014 roughly 100 chars/s on 4 CPU threads.',
      offline: 'Offline engine',
      offlinePair: 'Language pair',
      offlinePairHint: 'The offline model is per language pair and directional. \u201cAuto\u201d picks it from the block\u2019s detected language; a concrete pair forces that direction only.',
      offlinePairAuto: 'Auto (infer from the block)',
      offlinePairCap: 'Forced pair',
      offlineAutoDownload: 'Download other language pairs automatically',
      offlineAutoDownloadHint: 'The en\u2013zh model ships bundled. When this is on, any other pair downloads ~160 MB from HuggingFace on first use; when off, only bundled or already-cached models work.',
      offlineCached: 'Pairs available locally',
      offlineNone: 'none',
      offlineNote: 'Long blocks are split below 2000 chars because Opus-MT models have a 512-token context limit. Offline inference is synchronous CPU work, so concurrent segments are run serially.',
      langAuto: 'Auto (follow interface language)',
      langZh: 'Chinese (Simplified)',
      langEn: 'English',
      langJa: 'Japanese',
      langKo: 'Korean',
      langFr: 'French',
      langDe: 'German',
      langEs: 'Spanish',
      loading: 'Loading settings\u2026',
      unavailable: 'Settings are not available. Please ensure the plugin is properly configured.',
      formUnavailable: 'Configuration form is not available. Edit the bundle\u2019s cordis.patch.yml directly.',
      saving: 'Saving\u2026',
      save: 'Save Settings',
      saved: 'Settings saved!',
      saveFailed: 'Save failed. Please try again.',
      saveFailedGeneric: 'Save failed.',
    };
    const zh = {
      title: '模型翻译设置',
      subtitle: '在流式输出时自动翻译模型输出和思考（推理）。翻译失败时显示原文。',
      provider: '翻译服务',
      providerHintFree: '免费翻译 API —— 不调用模型，文本会发送到翻译服务。',
      providerHintAuto: '跟随当前对话的模型翻译（不另选模型）。',
      providerHintModel: '用一个 dsh 已加载的指定模型翻译。在下方选择模型。',
      model: '翻译模型',
      modelHintModel: '选择一个 dsh 已加载的模型用于翻译。翻译时会用该模型所属的服务。',
      modelAuto: '自动（跟随当前对话模型）',
      modelLoading: '正在加载可用模型…',
      modelLoadFailed: '无法加载模型列表。',
      targetLanguage: '目标语言',
      targetLanguageHint: '选择“自动”跟随界面语言，或选择一个具体语言。',
      translateOutput: '翻译模型输出',
      translateThinking: '翻译模型思考（推理）',
      advanced: '高级选项',
      timeoutMs: '翻译超时（毫秒）',
      timeoutMsHint: '单次翻译请求的超时，100–60000 毫秒。模型路由建议调大：4000 字符的分段经常超过 10 秒，超时后该块会原样放出（即看起来「没翻译」）。',
      maxTextChars: '分段大小（字符）',
      maxTextCharsHint: '更长的块会按此大小切分、分段翻译后再拼回。调大则调用更少，调小则适合请求上限较低的翻译服务。',
      providerAuto: '自动（跟随当前对话模型）',
      providerModel: '模型翻译引擎（选择模型）',
      providerBing: 'Bing 翻译（免费）',
      providerGoogle: 'Google 翻译（免费）',
      providerOpus: '离线（CTranslate2 + Opus-MT）',
      providerHintFree: '免费翻译 API —— 不调用模型，文本会发送到翻译服务。',
      providerHintOpus: '在本机用 CTranslate2 + Opus-MT 模型运行。无网络请求、无 API key、文本不离开主机。en-zh 模型已随插件捆绑；其他语言对首次使用时下载。比模型路由慢 —— 4 个 CPU 线程下约 100 字符/秒。',
      offline: '离线引擎',
      offlinePair: '语言对',
      offlinePairHint: '离线模型是按语言对且单向的。「自动」按文本检测到的语言选择；指定具体语言对则只走该方向。',
      offlinePairAuto: '自动（按文本推断）',
      offlinePairCap: '固定语言对',
      offlineAutoDownload: '自动下载其他语言对的模型',
      offlineAutoDownloadHint: 'en-zh 模型已随插件捆绑。开启后，其他语言对首次使用时从 HuggingFace 下载约 160 MB；关闭后，仅捆绑的或已缓存的模型可用。',
      offlineCached: '本地已有语言对',
      offlineNone: '无',
      offlineNote: '长块会切分到 2000 字符以下，因为 Opus-MT 模型有 512 token 上下文上限。离线推理是同步 CPU 计算，因此分段串行执行。',
      langAuto: '自动（跟随界面语言）',
      langZh: '中文（简体）',
      langEn: '英语',
      langJa: '日语',
      langKo: '韩语',
      langFr: '法语',
      langDe: '德语',
      langEs: '西班牙语',
      loading: '正在加载设置…',
      unavailable: '设置不可用。请确保插件配置正确。',
      formUnavailable: '配置表单不可用。请直接编辑 bundle 的 cordis.patch.yml。',
      saving: '保存中…',
      save: '保存设置',
      saved: '设置已保存！',
      saveFailed: '保存失败，请重试。',
      saveFailedGeneric: '保存失败。',
    };

    /* ── provider & language options (labels resolved via t) ── */

    function providerLabel(t, value) {
      switch (value) {
        case 'auto': return t('providerAuto');
        case 'model': return t('providerModel');
        case 'bing': return t('providerBing');
        case 'google': return t('providerGoogle');
        case 'opus': return t('providerOpus');
        default: return value;
      }
    }
    const PROVIDER_VALUES = ['auto', 'model', 'bing', 'google', 'opus'];

    /* Supported offline language pairs. Opus-MT models are per-pair and
       directional, so this is what the dropdown offers when a user wants to
       force a direction instead of letting the plugin infer it per block. */
    const OFFLINE_PAIR_VALUES = [
      'auto', 'en-zh', 'zh-en', 'en-ja', 'ja-en', 'en-ko', 'ko-en',
      'en-fr', 'fr-en', 'en-de', 'de-en', 'en-es', 'es-en',
      'en-ru', 'ru-en', 'en-pt', 'pt-en', 'en-nl', 'nl-en',
      'zh-ja', 'ja-zh', 'en-it', 'it-en',
    ];

    function offlinePairLabel(t, value) {
      return value === 'auto' ? t('offlinePairAuto') : value;
    }

    function languageLabel(t, value) {
      switch (value) {
        case 'auto': return t('langAuto');
        case 'zh': return t('langZh');
        case 'en': return t('langEn');
        case 'ja': return t('langJa');
        case 'ko': return t('langKo');
        case 'fr': return t('langFr');
        case 'de': return t('langDe');
        case 'es': return t('langEs');
        default: return value;
      }
    }
    const LANGUAGE_VALUES = ['auto', 'zh', 'en', 'ja', 'ko', 'fr', 'de', 'es'];

    /* Free HTTP translation engines plus the offline engine; every other
       provider value is a model route that needs a model id (possibly 'auto'
       to follow the chat). */
    function isFreeEngine(provider) {
      return provider === 'bing' || provider === 'google' || provider === 'opus';
    }

    /* ── shared inline styles ── */

    const S = {
      label:  { fontWeight: 600, marginBottom: '4px', fontSize: '13px' },
      input:  { padding: '6px 10px', borderRadius: '6px', border: '1px solid #d0d0d0', fontSize: '13px', width: '100%', boxSizing: 'border-box', height: '34px' },
      desc:   { margin: '4px 0 0', fontSize: '11px', color: '#888', lineHeight: '1.4' },
      check:  { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' },
      btn:    { padding: '8px 20px', borderRadius: '6px', background: '#4a90d9', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600 },
      card:   { padding: '12px', borderRadius: '8px', background: 'rgba(0,0,0,0.04)' },
      err:    { color: '#d32f2f', margin: 0, fontSize: '12px' },
      ok:     { color: '#388e3c', margin: 0, fontSize: '12px' },
      wait:   { padding: '16px', fontSize: '13px', color: '#888' },
    };

    /* ── main form component ──
       `t` is a bound locale translate; `models` is the loaded model catalog
       (groups of {id, name, models:[{id,name}]}). */

    function TranslatorSettings({ form, snapshot, t, models, modelsLoading, modelsError }) {
      const value = snapshot.value ?? {};

      const [provider,          setProvider]          = useState(value.provider          ?? 'auto');
      const [model,             setModel]             = useState(value.model             ?? 'auto');
      const [language,          setLanguage]          = useState(value.targetLanguage    ?? 'auto');
      const [translateOutput,   setTranslateOutput]   = useState(value.translateOutput   ?? true);
      const [translateThinking, setTranslateThinking] = useState(value.translateThinking ?? true);
      const [timeoutMs,     setTimeoutMs]     = useState(value.timeoutMs     ?? 10000);
      const [maxTextChars,  setMaxTextChars]  = useState(value.maxTextChars  ?? 4000);
      const [offlinePair,   setOfflinePair]   = useState(value.offlinePair   ?? 'auto');
      const [offlineAutoDownload, setOfflineAutoDownload] = useState(value.offlineAutoDownload ?? false);
      const [offlinePairs,  setOfflinePairs]  = useState([]);

      const [saving, setSaving] = useState(false);
      const [saved,  setSaved]  = useState(false);
      const [error,  setError]  = useState(null);

      /* sync draft state when the accepted snapshot's EDITABLE fields change.
         A background write to a non-editable field (the auto-synced
         interfaceLanguage mirror) must NOT clobber the user's in-progress
         edits, so we compare only the editable signature and skip otherwise. */
      const lastSig = useRef(null);
      useEffect(() => {
        const v = snapshot.value ?? {};
        const sig = [v.provider, v.model, v.targetLanguage, v.translateOutput, v.translateThinking,
          v.timeoutMs, v.maxTextChars, v.offlinePair, v.offlineAutoDownload].join('\u0001');
        if (sig === lastSig.current) return;
        lastSig.current = sig;
        setProvider(v.provider ?? 'auto');
        setModel(v.model ?? 'auto');
        setLanguage(v.targetLanguage ?? 'auto');
        setTranslateOutput(v.translateOutput ?? true);
        setTranslateThinking(v.translateThinking ?? true);
        setTimeoutMs(v.timeoutMs ?? 10000);
        setMaxTextChars(v.maxTextChars ?? 4000);
        setOfflinePair(v.offlinePair ?? 'auto');
        setOfflineAutoDownload(v.offlineAutoDownload ?? false);
        setError(null);
      }, [snapshot.value]);

      /* auto-clear the "Saved!" toast */
      useEffect(() => {
        if (!saved) return;
        const tt = setTimeout(() => setSaved(false), 2000);
        return () => clearTimeout(tt);
      }, [saved]);

      /* ── save handler ── */
      async function save() {
        setSaving(true);
        setError(null);
        try {
          // model is only meaningful in 'model' mode (pick a loaded model).
          const isModelMode = provider === 'model';
          // Clamp the numeric fields to the schema's declared range before
          // sending, so a stray keystroke cannot make the server refuse the
          // whole write (every field is validated together).
          const toNum = (raw, fallback) => {
            const n = Math.round(Number(raw));
            return Number.isFinite(n) ? n : fallback;
          };
          const timeout  = Math.min(60000, Math.max(100, toNum(timeoutMs, 10000)));
          const maxChars = Math.max(2, toNum(maxTextChars, 4000));
          setTimeoutMs(timeout);
          setMaxTextChars(maxChars);
          const ops = [
            { op: 'set', path: ['provider'],        value: provider },
            { op: 'set', path: ['targetLanguage'],  value: language },
            { op: 'set', path: ['translateOutput'], value: translateOutput },
            { op: 'set', path: ['translateThinking'], value: translateThinking },
            { op: 'set', path: ['timeoutMs'],       value: timeout },
            { op: 'set', path: ['maxTextChars'],    value: maxChars },
            { op: 'set', path: ['offlinePair'],     value: offlinePair },
            { op: 'set', path: ['offlineAutoDownload'], value: offlineAutoDownload },
          ];
          if (isModelMode) ops.push({ op: 'set', path: ['model'], value: model });

          const ok = await form.mutate(ops);
          if (ok) setSaved(true);
          else    setError(t('saveFailed'));
        } catch (e) {
          setError(e.message || t('saveFailedGeneric'));
        } finally {
          setSaving(false);
        }
      }

      const disabled    = snapshot.status !== 'ready' || !snapshot.writable || saving;
      const isModelMode = provider === 'model';
      const isOfflineMode = provider === 'opus';
      const isFree      = isFreeEngine(provider);

      /* ── loading / unavailable guards ── */
      if (snapshot.status === 'loading')
        return h('div', { style: S.wait }, t('loading'));
      if (snapshot.status === 'unavailable')
        return h('div', { style: S.wait, color: '#d32f2f' }, t('unavailable'));

      /* ── model options: Auto + every loaded model, grouped by provider ── */
      const modelGroups = models?.groups ?? [];
      const modelOptions = [
        h('option', { key: 'auto', value: 'auto' }, t('modelAuto')),
        ...modelGroups.flatMap((group) => {
          if (!Array.isArray(group.models) || group.models.length === 0) return [];
          return [h('optgroup', { key: group.id, label: group.name },
            group.models.map((m) =>
              h('option', { key: m.id, value: m.id }, m.name || m.id)),
          )];
        }),
      ];

      /* ── render form ── */
      return h('div', { style: { padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px', fontSize: '13px' } },

        /* description card */
        h('div', { style: S.card },
          h('p', { style: { margin: 0, fontWeight: 600, fontSize: '14px' } }, t('title')),
          h('p', { style: { margin: '6px 0 0', color: '#555', lineHeight: '1.5' } }, t('subtitle')),
        ),

        /* ── Provider ── */
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('label', { style: S.label }, t('provider')),
          h('select', {
            value: provider,
            onChange: (e) => { setProvider(e.target.value); setSaved(false); },
            disabled,
            style: S.input,
          },
            PROVIDER_VALUES.map((v) => h('option', { key: v, value: v }, providerLabel(t, v))),
          ),
          h('p', { style: S.desc },
            provider === 'opus' ? t('providerHintOpus')
              : isFree ? t('providerHintFree')
              : provider === 'model' ? t('providerHintModel')
              : t('providerHintAuto')),
        ),

        /* ── Model (only in 'model' mode) ── */
        isModelMode ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('label', { style: S.label }, t('model')),
          modelsLoading
            ? h('div', { style: { ...S.input, display: 'flex', alignItems: 'center', color: '#888' } }, t('modelLoading'))
            : h('select', {
                value: model,
                onChange: (e) => { setModel(e.target.value); setSaved(false); },
                disabled,
                style: S.input,
              },
                modelOptions.length > 1
                  ? modelOptions
                  : [h('option', { key: 'auto', value: 'auto' }, t('modelAuto'))],
              ),
          modelsError ? h('p', { style: { ...S.desc, color: '#d32f2f' } }, t('modelLoadFailed')) : null,
          h('p', { style: S.desc }, t('modelHintModel')),
        ) : null,

        /* ── Offline engine (only in 'opus' mode) ── */
        isOfflineMode ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('p', { style: { margin: 0, fontWeight: 600, fontSize: '12px', color: '#888' } }, t('offline')),
          h('div', { style: { ...S.input, display: 'flex', alignItems: 'center', gap: '8px', color: '#555' } },
            h('label', { style: S.check, margin: 0 },
              h('input', {
                type: 'checkbox',
                checked: offlineAutoDownload,
                onChange: (e) => { setOfflineAutoDownload(e.target.checked); setSaved(false); },
                disabled,
              }),
              h('span', {}, t('offlineAutoDownload')),
            ),
          ),
          h('p', { style: S.desc }, t('offlineAutoDownloadHint')),
          h('label', { style: S.label }, t('offlinePair')),
          h('select', {
            value: offlinePair,
            onChange: (e) => { setOfflinePair(e.target.value); setSaved(false); },
            disabled,
            style: S.input,
          },
            OFFLINE_PAIR_VALUES.map((v) => h('option', { key: v, value: v }, offlinePairLabel(t, v))),
          ),
          h('p', { style: S.desc }, t('offlinePairHint')),
          h('p', { style: S.desc }, t('offlineNote')),
        ) : null,

        /* ── Target Language ── */
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('label', { style: S.label }, t('targetLanguage')),
          h('select', {
            value: language,
            onChange: (e) => { setLanguage(e.target.value); setSaved(false); },
            disabled,
            style: S.input,
          },
            LANGUAGE_VALUES.map((v) => h('option', { key: v, value: v }, languageLabel(t, v))),
          ),
          h('p', { style: S.desc }, t('targetLanguageHint')),
        ),

        /* ── Toggle: translate output ── */
        h('label', { style: S.check },
          h('input', {
            type: 'checkbox',
            checked: translateOutput,
            onChange: (e) => { setTranslateOutput(e.target.checked); setSaved(false); },
            disabled,
          }),
          h('span', {}, t('translateOutput')),
        ),

        /* ── Toggle: translate thinking ── */
        h('label', { style: S.check },
          h('input', {
            type: 'checkbox',
            checked: translateThinking,
            onChange: (e) => { setTranslateThinking(e.target.checked); setSaved(false); },
            disabled,
          }),
          h('span', {}, t('translateThinking')),
        ),

        /* ── Advanced: timeout + segment size ──
           Both were previously unreachable from the form, so every user was
           stuck on the 10000 ms / 4000 char defaults — which is exactly the
           combination that times out on a model route and silently flushes
           the original text. */
        h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
          h('p', { style: { margin: 0, fontWeight: 600, fontSize: '12px', color: '#888' } }, t('advanced')),
          h('div', { style: { display: 'flex', gap: '12px', flexWrap: 'wrap' } },
            h('div', { style: { flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('label', { style: S.label }, t('timeoutMs')),
              h('input', {
                type: 'number',
                value: timeoutMs,
                min: 100,
                max: 60000,
                step: 500,
                onChange: (e) => { setTimeoutMs(e.target.value); setSaved(false); },
                disabled,
                style: S.input,
              }),
              h('p', { style: S.desc }, t('timeoutMsHint')),
            ),
            h('div', { style: { flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '6px' } },
              h('label', { style: S.label }, t('maxTextChars')),
              h('input', {
                type: 'number',
                value: maxTextChars,
                min: 2,
                step: 100,
                onChange: (e) => { setMaxTextChars(e.target.value); setSaved(false); },
                disabled,
                style: S.input,
              }),
              h('p', { style: S.desc }, t('maxTextCharsHint')),
            ),
          ),
        ),

        /* ── Status messages ── */
        error ? h('p', { style: S.err }, error) : null,
        saved ? h('p', { style: S.ok  }, t('saved')) : null,

        /* ── Save button ── */
        h('button', {
          onClick: save,
          disabled,
          style: { ...S.btn, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' },
        }, saving ? t('saving') : t('save')),
      );
    }

    /* ── plugin factory return ── */
    return {
      inject: ['slots', 'locale', 'remote', 'remote.session', 'configForms'],
      apply(ctx) {
        // Register this plugin's locale dictionaries so t() resolves.
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'model-translator: dictionaries');
        const t = ctx.locale.bind(NS);

        const cf     = ctx.get('configForms');
        const form   = cf ? cf.get('model-translator') : null;

        /* Keep the host's `interfaceLanguage` mirror in sync with the live UI
           locale so `targetLanguage: 'auto'` resolves to the interface language
           (what the user reads), not the host process LANG. Pushed silently —
           no save toast — and only when the active locale actually changes. */
        if (form && typeof ctx.locale?.getLocale === 'function') {
          ctx.effect(() => {
            let last = undefined;
            const push = () => {
              const snap = form.getSnapshot();
              if (snap.status !== 'ready' || !snap.writable) return;
              const active = ctx.locale.getLocale()?.active;
              if (!active || active === last) return;
              last = active;
              form.mutate([{ op: 'set', path: ['interfaceLanguage'], value: active }]).catch(() => {});
            };
            push();
            const off = typeof ctx.locale.subscribe === 'function' ? ctx.locale.subscribe(push) : (() => {});
            return () => { off(); };
          }, 'model-translator: interface language sync');
        }

        /* Load the available model catalog once, and refresh on topology /
           settings changes so the dropdown stays current. */
        let modelsState = { models: null, loading: false, error: false, version: 0 };
        const modelsListeners = new Set();
        function notifyModels() { for (const fn of modelsListeners) fn(); }
        async function loadModels() {
          modelsState = { ...modelsState, loading: true, error: false };
          notifyModels();
          const version = ++modelsState.version;
          try {
            const remote = ctx.get('remote');
            const session = remote?.session;
            const response = session && typeof session.modelCatalog === 'function'
              ? await session.modelCatalog()
              : undefined;
            if (version !== modelsState.version) return;
            const ok = response && response.ok;
            const value = ok ? response.value : null;
            modelsState = { models: value, loading: false, error: !ok, version };
          } catch (_e) {
            if (version !== modelsState.version) return;
            modelsState = { models: null, loading: false, error: true, version };
          }
          notifyModels();
        }
        loadModels();
        // Re-fetch when providers/credentials/settings change.
        ctx.effect(() => {
          const remote = ctx.get('remote');
          const off = [];
          if (remote && typeof remote.$on === 'function') {
            off.push(remote.$on('llm/adapters-updated', loadModels));
            off.push(remote.$on('credentials/record-updated', loadModels));
            off.push(remote.$on('credentials/reference-updated', loadModels));
            off.push(remote.$on('settings/document-updated', loadModels));
          }
          return () => { for (const dispose of off) dispose(); };
        }, 'model-translator: model catalog refresh');

        /* Wrapper subscribes to the live form snapshot and models state. */
        function SettingsWrapper(props) {
          if (props.view !== 'page') return null;

          if (!form) {
            return h('div', { style: { padding: '16px', fontSize: '13px', color: '#888' } },
              t('formUnavailable'));
          }

          const [snapshot, setSnapshot] = useState(form.getSnapshot());
          useEffect(() => form.subscribe(() => setSnapshot(form.getSnapshot())), []);

          const [, forceModels] = useState(0);
          useEffect(() => {
            const fn = () => forceModels((n) => n + 1);
            modelsListeners.add(fn);
            return () => { modelsListeners.delete(fn); };
          }, []);

          return h(TranslatorSettings, {
            form, snapshot, t,
            models: modelsState.models,
            modelsLoading: modelsState.loading,
            modelsError: modelsState.error,
          });
        }

        ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({
          name: 'plugins.bundle.config',
          key:  '@local/model-translator',
        }, SettingsWrapper));
      },
    };
  },
});
