/* Read-aloud: chunked play/pause, highlight + progress, browser + ElevenLabs voices */
(function (global) {
  const EL_KEY = 'ga4lms_eleven_key';
  const EL_VOICE = 'ga4lms_eleven_voice';
  const EL_ENABLED = 'ga4lms_eleven_enabled';
  const BR_VOICE = 'ga4lms_browser_voice';
  const BR_RATE = 'ga4lms_tts_rate';
  const DB_NAME = 'ga4lms_tts_v1';
  const STORE = 'audio';

  const EL_PRESETS = [
    { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel' },
    { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella' },
    { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh' },
    { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold' },
    { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam' }
  ];

  function settings() {
    const rate = parseFloat(localStorage.getItem(BR_RATE) || '1');
    return {
      key: localStorage.getItem(EL_KEY) || '',
      voiceId: localStorage.getItem(EL_VOICE) || '21m00Tcm4TlvDq8ikWAM',
      enabled: localStorage.getItem(EL_ENABLED) === '1',
      browserVoice: localStorage.getItem(BR_VOICE) || '',
      rate: Number.isFinite(rate) && rate >= 0.7 && rate <= 1.4 ? rate : 1
    };
  }

  function saveSettings( partial ) {
    if (!partial) return;
    if (partial.key != null) localStorage.setItem(EL_KEY, partial.key);
    if (partial.voiceId != null) localStorage.setItem(EL_VOICE, partial.voiceId);
    if (partial.enabled != null) localStorage.setItem(EL_ENABLED, partial.enabled ? '1' : '0');
    if (partial.browserVoice != null) localStorage.setItem(BR_VOICE, partial.browserVoice);
    if (partial.rate != null) localStorage.setItem(BR_RATE, String(partial.rate));
  }

  async function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheSet(key, blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function hashText(text) {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  function splitChunks(text) {
    const clean = String(text || '').replace(/\s+/g, ' ').trim();
    if (!clean) return [];
    const parts = clean.match(/[^.!?]+(?:[.!?]+|$)/g) || [clean];
    return parts.map((p) => p.trim()).filter(Boolean);
  }

  function isInterrupt(err) {
    const s = String(err || '').toLowerCase();
    return s === 'interrupted' || s === 'canceled' || s === 'cancelled';
  }

  /* Drop novelty / robotic / non-English voices — keep natural reading options only */
  const VOICE_BLOCK =
    /zarvox|whisper|trinoids|boing|bubbles|bad news|bahh|bells|cellos|good news|jester|organ|pipes|reed|frosty|grandma|grandpa|kathy|albert|junior|princess|ralph|deranged|hysterical|superstar|noise|robot|novelty|compact|eloquence|embedded|espeak|festival|whispering|sinister|stubborn|sarge|wobble|bungee|bruce|agnes|bruce|fred|junior|vicki|victoria(?!\s*natural)|trinoids|boing|cellos|pipe organ|zarvox/i;
  const VOICE_BOOST =
    /natural|neural|premium|enhanced|online\s*\(|google|microsoft\s+(aria|jenny|guy|sara|ryan|sonia|andrew|brian|emma|michelle)|samantha|karen|daniel|moira|tessa|fiona|veena|rishi|serena|susan|alex(?![a-z])|siri|wavenet|studio|neural2|journey|studio/i;

  function voiceScore(v) {
    const name = v.name || '';
    const lang = String(v.lang || '').toLowerCase().replace('_', '-');
    if (!lang.startsWith('en')) return -100;
    if (VOICE_BLOCK.test(name)) return -100;
    // Skip tiny “compact” / legacy mobile packs that sound robotic
    if (/\bcompact\b|\bmobile\b|\bembedded\b/i.test(name)) return -100;

    let score = 20;
    if (VOICE_BOOST.test(name)) score += 50;
    if (/^en-us\b/.test(lang)) score += 8;
    else if (/^en-(gb|au|in|ie|za|ca)\b/.test(lang)) score += 5;
    // Chrome cloud / remote voices are usually clearer than old local synths
    if (v.localService === false) score += 18;
    if (/\bdesktop\b/i.test(name) && !VOICE_BOOST.test(name)) score -= 8;
    if (/\bspeech\b/i.test(name) && !VOICE_BOOST.test(name) && v.localService !== false) score -= 4;
    return score;
  }

  function getBrowserVoices() {
    if (!global.speechSynthesis) return [];
    const scored = speechSynthesis
      .getVoices()
      .map((v) => ({ v, q: voiceScore(v) }))
      .filter((x) => x.q >= 20);

    // If we have clear “natural/neural/Google/…” picks, show only those
    const premium = scored.filter((x) => x.q >= 60);
    const pool = premium.length >= 2 ? premium : scored;

    pool.sort((a, b) => b.q - a.q || (a.v.name || '').localeCompare(b.v.name || ''));

    // Dedupe by display name (OS often lists duplicates)
    const seen = new Set();
    const out = [];
    pool.forEach(({ v }) => {
      const key = (v.name || '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(v);
    });
    return out;
  }

  function pickBrowserVoice(voiceURI) {
    const all = global.speechSynthesis ? speechSynthesis.getVoices() : [];
    if (voiceURI) {
      const hit = all.find((v) => v.voiceURI === voiceURI || v.name === voiceURI);
      if (hit) return hit;
    }
    const curated = getBrowserVoices();
    if (curated.length) return curated[0];
    return all.find((v) => /en(-|_)US/i.test(v.lang)) || all.find((v) => /^en/i.test(v.lang)) || all[0] || null;
  }

  let currentAudio = null;
  let currentUtterance = null;
  let playToken = 0;
  let engine = 'browser';
  let paused = false;
  let speaking = false;
  let pauseWaiters = [];

  function notifyPauseWaiters() {
    const list = pauseWaiters.slice();
    pauseWaiters = [];
    list.forEach((fn) => fn());
  }

  function waitIfPaused(token) {
    if (!paused || token !== playToken) return Promise.resolve();
    return new Promise((resolve) => {
      pauseWaiters.push(() => resolve());
    });
  }

  function hardStopAudio() {
    if (currentAudio) {
      try {
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.ontimeupdate = null;
        currentAudio.pause();
        if (currentAudio.src && currentAudio.src.startsWith('blob:')) URL.revokeObjectURL(currentAudio.src);
      } catch (e) { /* ignore */ }
      currentAudio = null;
    }
    if (global.speechSynthesis) {
      try {
        speechSynthesis.cancel();
      } catch (e) { /* ignore */ }
    }
    currentUtterance = null;
  }

  function stop() {
    playToken++;
    paused = false;
    speaking = false;
    hardStopAudio();
    notifyPauseWaiters();
  }

  function pause() {
    if (!speaking || paused) return false;
    paused = true;
    if (engine === 'eleven' && currentAudio) {
      try {
        currentAudio.pause();
      } catch (e) { /* ignore */ }
    } else if (global.speechSynthesis) {
      try {
        speechSynthesis.pause();
      } catch (e) { /* ignore */ }
    }
    return true;
  }

  function resume() {
    if (!speaking || !paused) return false;
    paused = false;
    if (engine === 'eleven' && currentAudio) {
      currentAudio.play().catch(() => {});
    } else if (global.speechSynthesis) {
      try {
        speechSynthesis.resume();
      } catch (e) { /* ignore */ }
    }
    notifyPauseWaiters();
    return true;
  }

  function speakBrowserChunk(text, token, onBoundary, opts) {
    return new Promise((resolve, reject) => {
      if (!global.speechSynthesis) {
        reject(new Error('Browser speechSynthesis not available'));
        return;
      }
      hardStopAudio();
      const s = settings();
      const rate = opts && opts.rate != null ? opts.rate : s.rate;
      const browserVoice = opts && opts.browserVoice != null ? opts.browserVoice : s.browserVoice;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      const voice = pickBrowserVoice(browserVoice);
      if (voice) u.voice = voice;
      currentUtterance = u;
      engine = 'browser';

      u.onboundary = (ev) => {
        if (token !== playToken) return;
        if (typeof onBoundary === 'function' && ev.name === 'word') {
          onBoundary(ev.charIndex || 0, (ev.charLength != null ? ev.charLength : 0) || 0);
        }
      };
      u.onend = () => {
        if (token !== playToken) return resolve('stopped');
        currentUtterance = null;
        resolve('browser');
      };
      u.onerror = (e) => {
        currentUtterance = null;
        if (token !== playToken || isInterrupt(e.error)) return resolve('stopped');
        reject(e.error || new Error('TTS failed'));
      };
      speechSynthesis.speak(u);
      if (paused) {
        try {
          speechSynthesis.pause();
        } catch (e) { /* ignore */ }
      }
    });
  }

  async function speakElevenChunk(text, token, onTime, opts) {
    const s = settings();
    const key = opts && opts.key != null ? opts.key : s.key;
    const voiceId = opts && opts.voiceId != null ? opts.voiceId : s.voiceId;
    const rate = opts && opts.rate != null ? opts.rate : s.rate;
    const requireEnabled = !(opts && opts.preview);
    if (requireEnabled && !s.enabled) throw new Error('ElevenLabs not configured');
    if (!key) throw new Error('ElevenLabs API key required');
    const cacheKey = 'el:' + voiceId + ':' + rate + ':' + (await hashText(text));
    let blob = await cacheGet(cacheKey);
    let fromCache = !!blob;
    if (!blob) {
      const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId), {
        method: 'POST',
        headers: {
          'xi-api-key': key,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: { stability: 0.4, similarity_boost: 0.7 }
        })
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error('ElevenLabs ' + res.status + ': ' + t.slice(0, 180));
      }
      blob = await res.blob();
      await cacheSet(cacheKey, blob);
    }
    if (token !== playToken) return 'stopped';
    hardStopAudio();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    currentAudio = audio;
    engine = 'eleven';
    await new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('Audio playback failed'));
      };
      audio.ontimeupdate = () => {
        if (token !== playToken || typeof onTime !== 'function' || !audio.duration) return;
        onTime(audio.currentTime / audio.duration);
      };
      audio.play().then(() => {
        if (paused) audio.pause();
      }).catch(reject);
    });
    if (token !== playToken) return 'stopped';
    return fromCache ? 'eleven-cache' : 'eleven';
  }

  const PREVIEW_SAMPLE =
    'Hello. This is how this voice will sound when reading GA4 Desk lessons.';

  /**
   * Short sample for Settings / Voice panel. Does not change saved prefs.
   * opts: { engine: 'browser'|'eleven', browserVoice, voiceId, key, rate, text }
   */
  async function previewVoice(opts) {
    const o = opts || {};
    const sample = (o.text || PREVIEW_SAMPLE).trim();
    stop();
    const token = ++playToken;
    speaking = true;
    paused = false;
    try {
      if (o.engine === 'eleven') {
        const mode = await speakElevenChunk(sample, token, null, {
          key: o.key,
          voiceId: o.voiceId,
          rate: o.rate,
          preview: true
        });
        return mode === 'stopped' ? 'stopped' : 'eleven';
      }
      const mode = await speakBrowserChunk(sample, token, null, {
        browserVoice: o.browserVoice,
        rate: o.rate
      });
      return mode === 'stopped' ? 'stopped' : 'browser';
    } finally {
      if (token === playToken) speaking = false;
    }
  }

  async function fetchElevenVoices() {
    const s = settings();
    if (!s.key) return EL_PRESETS.slice();
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': s.key }
      });
      if (!res.ok) return EL_PRESETS.slice();
      const data = await res.json();
      const list = (data.voices || []).map((v) => ({ id: v.voice_id, name: v.name || v.voice_id }));
      return list.length ? list : EL_PRESETS.slice();
    } catch (e) {
      return EL_PRESETS.slice();
    }
  }

  /**
   * Play full text in chunks with pause/resume, progress, and highlight callbacks.
   * handlers: { onChunk(i,total,text), onProgress(pct), onWord(start,len), onChunkProgress(0-1), onState(state), onDone(mode) }
   */
  async function playText(text, handlers) {
    const h = handlers || {};
    const chunks = splitChunks(text);
    if (!chunks.length) {
      if (h.onDone) h.onDone('empty');
      return 'empty';
    }
    stop();
    const token = ++playToken;
    paused = false;
    speaking = true;
    if (h.onState) h.onState('playing');

    const s = settings();
    const preferEleven = s.enabled && !!s.key;
    let lastMode = 'browser';

    for (let i = 0; i < chunks.length; i++) {
      if (token !== playToken) {
        speaking = false;
        return 'stopped';
      }
      await waitIfPaused(token);
      if (token !== playToken) {
        speaking = false;
        return 'stopped';
      }
      if (h.onChunk) h.onChunk(i, chunks.length, chunks[i]);
      if (h.onProgress) h.onProgress(Math.round((i / chunks.length) * 100));

      try {
        if (preferEleven) {
          try {
            lastMode = await speakElevenChunk(chunks[i], token, (p) => {
              if (h.onChunkProgress) h.onChunkProgress(p);
              if (h.onProgress) h.onProgress(Math.round(((i + p) / chunks.length) * 100));
            });
            if (lastMode === 'stopped') {
              speaking = false;
              return 'stopped';
            }
          } catch (e) {
            console.warn('ElevenLabs chunk failed, falling back to browser', e);
            lastMode = await speakBrowserChunk(chunks[i], token, (start, len) => {
              if (h.onWord) h.onWord(start, len);
            });
          }
        } else {
          lastMode = await speakBrowserChunk(chunks[i], token, (start, len) => {
            if (h.onWord) h.onWord(start, len);
          });
        }
      } catch (e) {
        speaking = false;
        if (h.onState) h.onState('error');
        throw e;
      }

      if (token !== playToken || lastMode === 'stopped') {
        speaking = false;
        return 'stopped';
      }
      if (h.onProgress) h.onProgress(Math.round(((i + 1) / chunks.length) * 100));
    }

    speaking = false;
    paused = false;
    if (token === playToken) {
      if (h.onProgress) h.onProgress(100);
      if (h.onState) h.onState('done');
      if (h.onDone) h.onDone(lastMode);
    }
    return lastMode;
  }

  /* Back-compat single-shot API */
  async function speak(text, { preferEleven = true } = {}) {
    const s = settings();
    if (!preferEleven) {
      const prev = s.enabled;
      saveSettings({ enabled: false });
      try {
        return await playText(text);
      } finally {
        saveSettings({ enabled: prev });
      }
    }
    return playText(text);
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mountControls(container, getText) {
    if (!container) return;
    container.innerHTML = `
      <div class="tts-player">
        <div class="tts-controls">
          <button type="button" class="btn btn-secondary btn-sm" data-tts="play">Play</button>
          <button type="button" class="btn btn-ghost btn-sm" data-tts="pause" disabled>Pause</button>
          <button type="button" class="btn btn-ghost btn-sm" data-tts="stop" disabled>Stop</button>
          <button type="button" class="btn btn-ghost btn-sm" data-tts="settings">Voice settings</button>
          <span class="tts-status" aria-live="polite"></span>
        </div>
        <div class="tts-progress" aria-hidden="true"><span data-tts-fill></span></div>
        <div class="tts-settings hidden" data-tts-panel>
          <div class="tts-settings-grid">
            <label>Browser voice
              <select class="select-input" data-tts-browser-voice></select>
            </label>
            <label>Speed
              <input type="range" min="0.75" max="1.35" step="0.05" data-tts-rate>
              <span data-tts-rate-label>1.00×</span>
            </label>
            <label class="tts-check"><input type="checkbox" data-tts-el-enabled> Prefer ElevenLabs when key is set</label>
            <label>ElevenLabs API key
              <input class="text-input" type="password" data-tts-el-key placeholder="xi-… (stays in this browser)">
            </label>
            <label>ElevenLabs voice
              <select class="select-input" data-tts-el-voice></select>
            </label>
          </div>
          <div class="toolbar">
            <button type="button" class="btn btn-ghost btn-sm" data-tts-preview-br>Hear browser voice</button>
            <button type="button" class="btn btn-ghost btn-sm" data-tts-preview-el>Hear ElevenLabs</button>
            <button type="button" class="btn btn-secondary btn-sm" data-tts-save>Save voice settings</button>
            <button type="button" class="btn btn-ghost btn-sm" data-tts-refresh-el>Refresh EL voices</button>
          </div>
          <p class="tts-settings-hint">Browser voices are free. ElevenLabs clips are cached on this device so the same sentence isn’t billed twice.</p>
        </div>
        <div class="tts-readout hidden" data-tts-readout aria-live="polite">
          <div class="tts-readout-label">Now reading</div>
          <div class="tts-readout-body" data-tts-readout-body></div>
        </div>
      </div>`;

    const playBtn = container.querySelector('[data-tts="play"]');
    const pauseBtn = container.querySelector('[data-tts="pause"]');
    const stopBtn = container.querySelector('[data-tts="stop"]');
    const settingsBtn = container.querySelector('[data-tts="settings"]');
    const status = container.querySelector('.tts-status');
    const fill = container.querySelector('[data-tts-fill]');
    const panel = container.querySelector('[data-tts-panel]');
    const readout = container.querySelector('[data-tts-readout]');
    const readoutBody = container.querySelector('[data-tts-readout-body]');
    const browserSelect = container.querySelector('[data-tts-browser-voice]');
    const rateInput = container.querySelector('[data-tts-rate]');
    const rateLabel = container.querySelector('[data-tts-rate-label]');
    const elEnabled = container.querySelector('[data-tts-el-enabled]');
    const elKey = container.querySelector('[data-tts-el-key]');
    const elVoice = container.querySelector('[data-tts-el-voice]');

    let chunksCache = [];
    let activeChunk = -1;
    let runId = 0;

    function setProgress(pct) {
      if (fill) fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    }

    function paintReadout(chunkIndex, wordStart, wordLen) {
      if (!readoutBody || !chunksCache.length) return;
      readout.classList.remove('hidden');
      readoutBody.innerHTML = chunksCache
        .map((chunk, i) => {
          if (i !== chunkIndex) {
            return `<p class="tts-chunk ${i < chunkIndex ? 'is-done' : ''}">${escapeHtml(chunk)}</p>`;
          }
          if (wordStart == null || wordLen <= 0) {
            return `<p class="tts-chunk is-active">${escapeHtml(chunk)}</p>`;
          }
          const a = Math.max(0, Math.min(chunk.length, wordStart));
          const b = Math.max(a, Math.min(chunk.length, wordStart + wordLen));
          return `<p class="tts-chunk is-active">${escapeHtml(chunk.slice(0, a))}<mark class="tts-word">${escapeHtml(chunk.slice(a, b))}</mark>${escapeHtml(chunk.slice(b))}</p>`;
        })
        .join('');
      const active = readoutBody.querySelector('.tts-chunk.is-active');
      if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function setIdle(kind, msg) {
      playBtn.disabled = false;
      playBtn.textContent = kind === 'done' || kind === 'stopped' ? 'Play again' : 'Play';
      pauseBtn.disabled = true;
      pauseBtn.textContent = 'Pause';
      stopBtn.disabled = true;
      status.textContent = msg || '';
      if (kind === 'idle') {
        setProgress(0);
        readout.classList.add('hidden');
        readoutBody.innerHTML = '';
      }
    }

    function setPlayingUi() {
      playBtn.disabled = true;
      playBtn.textContent = 'Playing…';
      pauseBtn.disabled = false;
      pauseBtn.textContent = 'Pause';
      stopBtn.disabled = false;
      status.textContent = 'Reading aloud…';
    }

    function setPausedUi() {
      playBtn.disabled = false;
      playBtn.textContent = 'Resume';
      pauseBtn.disabled = true;
      pauseBtn.textContent = 'Paused';
      stopBtn.disabled = false;
      status.textContent = 'Paused';
    }

    function fillBrowserVoices() {
      const voices = getBrowserVoices();
      const cur = settings().browserVoice;
      browserSelect.innerHTML =
        `<option value="">Best available (auto)</option>` +
        voices
          .map(
            (v) =>
              `<option value="${escapeHtml(v.voiceURI)}" ${v.voiceURI === cur || v.name === cur ? 'selected' : ''}>${escapeHtml(v.name)} · ${escapeHtml(v.lang)}</option>`
          )
          .join('');
      if (!voices.length) {
        browserSelect.innerHTML = `<option value="">No clear English voices found — using system default</option>`;
      }
    }

    async function fillElevenVoices() {
      const list = await fetchElevenVoices();
      const cur = settings().voiceId;
      elVoice.innerHTML = list
        .map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === cur ? 'selected' : ''}>${escapeHtml(v.name)}</option>`)
        .join('');
      if (cur && !list.some((v) => v.id === cur)) {
        elVoice.innerHTML += `<option value="${escapeHtml(cur)}" selected>Custom · ${escapeHtml(cur)}</option>`;
      }
    }

    function loadPanelFromSettings() {
      const s = settings();
      fillBrowserVoices();
      rateInput.value = String(s.rate);
      rateLabel.textContent = s.rate.toFixed(2) + '×';
      elEnabled.checked = s.enabled;
      elKey.value = s.key;
      fillElevenVoices();
    }

    if (global.speechSynthesis) {
      fillBrowserVoices();
      speechSynthesis.addEventListener('voiceschanged', fillBrowserVoices);
    }
    rateInput.addEventListener('input', () => {
      rateLabel.textContent = parseFloat(rateInput.value).toFixed(2) + '×';
    });
    settingsBtn.addEventListener('click', () => {
      panel.classList.toggle('hidden');
      if (!panel.classList.contains('hidden')) loadPanelFromSettings();
    });
    container.querySelector('[data-tts-save]').addEventListener('click', () => {
      saveSettings({
        browserVoice: browserSelect.value,
        rate: parseFloat(rateInput.value) || 1,
        enabled: elEnabled.checked,
        key: elKey.value.trim(),
        voiceId: elVoice.value || '21m00Tcm4TlvDq8ikWAM'
      });
      status.textContent = 'Voice settings saved on this device';
      panel.classList.add('hidden');
    });
    container.querySelector('[data-tts-refresh-el]').addEventListener('click', () => {
      saveSettings({ key: elKey.value.trim(), enabled: elEnabled.checked });
      fillElevenVoices().then(() => {
        status.textContent = 'ElevenLabs voice list refreshed';
      });
    });

    async function runPreview(engine) {
      status.textContent = engine === 'eleven' ? 'Fetching ElevenLabs sample…' : 'Playing browser sample…';
      try {
        const mode = await previewVoice({
          engine,
          browserVoice: browserSelect.value,
          rate: parseFloat(rateInput.value) || 1,
          key: elKey.value.trim(),
          voiceId: elVoice.value || '21m00Tcm4TlvDq8ikWAM'
        });
        if (mode === 'stopped') status.textContent = 'Preview stopped';
        else status.textContent = engine === 'eleven' ? 'ElevenLabs sample finished' : 'Browser sample finished';
      } catch (e) {
        status.textContent = 'Preview failed: ' + (e && e.message ? e.message : e);
      }
    }
    container.querySelector('[data-tts-preview-br]').addEventListener('click', () => runPreview('browser'));
    container.querySelector('[data-tts-preview-el]').addEventListener('click', () => runPreview('eleven'));

    playBtn.addEventListener('click', async () => {
      if (speaking && paused) {
        resume();
        setPlayingUi();
        return;
      }
      if (speaking && !paused) return;

      const text = typeof getText === 'function' ? getText() : '';
      chunksCache = splitChunks(text);
      activeChunk = -1;
      const myRun = ++runId;
      setPlayingUi();
      setProgress(0);
          paintReadout(0);

      try {
        const mode = await playText(text, {
          onChunk(i, total, chunk) {
            if (myRun !== runId) return;
            activeChunk = i;
            paintReadout(i);
            status.textContent = `Reading ${i + 1} / ${total}`;
          },
          onWord(start, len) {
            if (myRun !== runId) return;
            paintReadout(activeChunk, start, len);
          },
          onChunkProgress() {
            /* progress handled in onProgress */
          },
          onProgress(pct) {
            if (myRun !== runId) return;
            setProgress(pct);
          },
          onState(st) {
            if (myRun !== runId) return;
            if (st === 'playing') setPlayingUi();
          },
          onDone(m) {
            if (myRun !== runId) return;
            const label =
              m === 'eleven-cache'
                ? 'Finished (ElevenLabs cache)'
                : m === 'eleven'
                  ? 'Finished (ElevenLabs)'
                  : m === 'empty'
                    ? 'Nothing to read'
                    : 'Finished (browser voice)';
            setIdle('done', label);
            setProgress(100);
          }
        });
        if (mode === 'stopped' && myRun === runId) {
          setIdle('stopped', 'Stopped — press Play again');
        }
      } catch (e) {
        if (myRun !== runId) return;
        setIdle('stopped', 'Could not read aloud: ' + (e && e.message ? e.message : e));
      }
    });

    pauseBtn.addEventListener('click', () => {
      if (pause()) setPausedUi();
    });

    stopBtn.addEventListener('click', () => {
      runId++;
      stop();
      setIdle('stopped', 'Stopped — press Play again');
      setProgress(0);
      readout.classList.add('hidden');
    });

    setIdle('idle');
  }

  /** Optional helper for coach settings form */
  function bindSettingsForm({ enabledEl, keyEl, voiceEl, browserEl, rateEl }) {
    const s = settings();
    if (enabledEl) enabledEl.checked = s.enabled;
    if (keyEl) keyEl.value = s.key;
    if (voiceEl) {
      voiceEl.value = s.voiceId;
      fetchElevenVoices().then((list) => {
        if (!voiceEl.tagName || voiceEl.tagName !== 'SELECT') return;
        voiceEl.innerHTML = list
          .map((v) => `<option value="${escapeHtml(v.id)}" ${v.id === s.voiceId ? 'selected' : ''}>${escapeHtml(v.name)}</option>`)
          .join('');
      });
    }
    if (browserEl && browserEl.tagName === 'SELECT') {
      const fill = () => {
        const voices = getBrowserVoices();
        browserEl.innerHTML =
          `<option value="">Best available (auto)</option>` +
          voices
            .map(
              (v) =>
                `<option value="${escapeHtml(v.voiceURI)}" ${v.voiceURI === s.browserVoice ? 'selected' : ''}>${escapeHtml(v.name)} · ${escapeHtml(v.lang)}</option>`
            )
            .join('');
        if (!voices.length) {
          browserEl.innerHTML = `<option value="">No clear English voices found — using system default</option>`;
        }
      };
      fill();
      if (global.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fill);
    }
    if (rateEl) rateEl.value = String(s.rate);
  }

  global.GA4TTS = {
    speak,
    playText,
    previewVoice,
    stop,
    pause,
    resume,
    settings,
    saveSettings,
    mountControls,
    hashText,
    getBrowserVoices,
    fetchElevenVoices,
    bindSettingsForm,
    splitChunks,
    EL_PRESETS,
    PREVIEW_SAMPLE
  };
})(window);
