/* Skill-grounded coach + optional vision screenshot via OpenRouter BYOK */
(function (global) {
  const OR_KEY = 'ga4lms_or_key';
  const OR_MODEL = 'ga4lms_or_model';
  const OR_VISION = 'ga4lms_or_vision_model';
  const OR_ENABLED = 'ga4lms_or_enabled';
  const CHAT_KEY = 'ga4lms_chat_v1';
  const DEFAULT_MODEL = 'openai/gpt-4o-mini';
  const DEFAULT_VISION = 'openai/gpt-4o-mini';

  let skillText = '';
  let corpus = [];
  let chat = [];

  function settings() {
    return {
      key: localStorage.getItem(OR_KEY) || '',
      model: localStorage.getItem(OR_MODEL) || DEFAULT_MODEL,
      visionModel: localStorage.getItem(OR_VISION) || DEFAULT_VISION,
      enabled: localStorage.getItem(OR_ENABLED) === '1'
    };
  }

  function saveSettings(s) {
    if (s.key != null) localStorage.setItem(OR_KEY, s.key);
    if (s.model != null) localStorage.setItem(OR_MODEL, s.model);
    if (s.visionModel != null) localStorage.setItem(OR_VISION, s.visionModel);
    if (s.enabled != null) localStorage.setItem(OR_ENABLED, s.enabled ? '1' : '0');
  }

  function loadChat() {
    try { chat = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]'); } catch (e) { chat = []; }
    return chat;
  }

  function saveChat() {
    localStorage.setItem(CHAT_KEY, JSON.stringify(chat.slice(-80)));
  }

  function tokenize(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  }

  function buildCorpus(topics, references) {
    corpus = [];
    (topics || []).forEach((t) => {
      corpus.push({ topicId: t.id, title: t.title, type: 'tldr', q: t.title, a: t.tldr, weight: 1.2 });
      corpus.push({ topicId: t.id, title: t.title, type: 'plain', q: t.title + ' plain english', a: t.plain, weight: 1.1 });
      (t.learn || []).forEach((p, i) => corpus.push({ topicId: t.id, title: t.title, type: 'learn', q: t.title + ' ' + i, a: GA4.stripTags(p), weight: 1 }));
      (t.faq || []).forEach((f) => corpus.push({ topicId: t.id, title: t.title, type: 'faq', q: f.q, a: f.a, weight: 1.15 }));
      (t.quickWins || []).forEach((w) => corpus.push({ topicId: t.id, title: t.title, type: 'quickwin', q: 'quick win ' + t.title, a: w, weight: 1 }));
      (t.questions || []).slice(0, 8).forEach((qq) => corpus.push({ topicId: t.id, title: t.title, type: 'quiz', q: qq.q, a: qq.e, weight: 0.85 }));
      if (t.example) corpus.push({ topicId: t.id, title: t.title, type: 'example', q: t.title + ' example', a: t.example, weight: 1.1 });
    });
    (references || []).forEach((r) => {
      corpus.push({ topicId: r.id, title: r.title, type: 'reference', q: r.title, a: r.body.slice(0, 2500), weight: 1.25 });
    });
  }

  function topChunks(query, n) {
    const qTokens = tokenize(query);
    if (!qTokens.length) return [];
    const scored = corpus.map((c) => {
      const set = new Set(tokenize(c.q + ' ' + c.a + ' ' + c.title));
      let score = 0;
      qTokens.forEach((t) => { if (set.has(t)) score += 1; });
      return { c, score: score * (c.weight || 1) };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
    return scored.map((x) => x.c);
  }

  function localAnswer(query) {
    const chunks = topChunks(query, 3);
    if (!chunks.length) {
      return { matched: false, text: 'No close match in the curated GA4 Desk material. Try rephrasing, browse Resources, or enable Ask AI (BYOK) for a grounded answer.' };
    }
    const best = chunks[0];
    return {
      matched: true,
      text: `From “${best.title}” (${best.type}):\n\n${GA4.stripTags(best.a)}`,
      chunks
    };
  }

  function systemPrompt(chunks) {
    const material = chunks.map((c) => `[${c.title} — ${c.type}]\nQ: ${c.q}\nA: ${GA4.stripTags(c.a)}`).join('\n\n');
    return `You are GA4 Desk Coach — a practical Google Analytics 4 tutor and workplace coach.

RULES:
1) Prefer the SKILL GUIDE and REFERENCE MATERIAL below over generic knowledge.
2) If material only partially covers the question, answer from it and clearly label anything you add from general GA4 knowledge as "Beyond curated material".
3) If material does not cover it, say so before answering from general knowledge.
4) Be concrete and short. Use business framing ("how you'd use this at work").
5) Never invent metrics, case studies, or product claims. For quotas/limits, treat numbers as last-known and suggest verifying on support.google.com/analytics when stakes are high.
6) If a screenshot is provided, describe what you see, map it to GA4 concepts, and give the next click-path or fix — do not invent UI labels that are not visible.

SKILL GUIDE:
${skillText.slice(0, 12000)}

REFERENCE MATERIAL:
${material || '(no closely matching chunks)'}`;
  }

  async function init({ skillMarkdown, topics, references }) {
    skillText = skillMarkdown || '';
    buildCorpus(topics, references);
    loadChat();
  }

  async function askOpenRouter({ text, imageDataUrl }) {
    const s = settings();
    if (!s.enabled || !s.key) throw new Error('Enable OpenRouter in settings and add your API key.');
    const chunks = topChunks(text || 'explain this screenshot', 6);
    const sys = systemPrompt(chunks);
    const model = imageDataUrl ? s.visionModel : s.model;
    const userContent = imageDataUrl
      ? [
          { type: 'text', text: text || 'Explain this GA4 screenshot and tell me what to do next.' },
          { type: 'image_url', image_url: { url: imageDataUrl } }
        ]
      : text;

    const recent = chat.filter((m) => m.role === 'user' || m.role === 'assistant').slice(-10);
    const messages = [
      { role: 'system', content: sys },
      ...recent.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent }
    ];

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + s.key,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'GA4 Desk'
      },
      body: JSON.stringify({ model, messages, max_tokens: 900 })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error('OpenRouter ' + res.status + ': ' + t.slice(0, 240));
    }
    const data = await res.json();
    return (data.choices && data.choices[0] && data.choices[0].message.content) || '(empty response)';
  }

  function push(role, content) {
    chat.push({ role, content, at: Date.now() });
    saveChat();
    return chat;
  }

  function clear() {
    chat = [];
    saveChat();
  }

  global.GA4Coach = {
    init,
    settings,
    saveSettings,
    localAnswer,
    askOpenRouter,
    loadChat,
    push,
    clear,
    topChunks,
    get chat() { return chat; }
  };
})(window);
