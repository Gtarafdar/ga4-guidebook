/* Shared app helpers: paths, data load, progress v2, nav, site chrome */
(function (global) {
  const PROGRESS_KEY_V1 = 'ga4lms_progress_v1';
  const PROGRESS_KEY = 'ga4lms_progress_v2';
  const QUIZ_KEY = 'ga4lms_quiz_session_v1';
  const GATE_PASS = 70;
  const EXAM_PASS = 80;

  const SITE = {
    name: 'GA4 Desk',
    tagline: 'A free Google Analytics 4 guidebook',
    pagesBase: 'https://gtarafdar.github.io/ga4-guidebook',
    repoUrl: 'https://github.com/Gtarafdar/ga4-guidebook',
    starUrl: 'https://github.com/Gtarafdar/ga4-guidebook',
    githubProfile: 'https://github.com/Gtarafdar',
    xUrl: 'https://x.com/Gtarafdarr',
    linkedinUrl: 'https://www.linkedin.com/in/gobinda-tarafdar/',
    donateUrl: 'https://gtarafdar.com/donate',
    demoJoinUrl: 'https://support.google.com/analytics/answer/6367342',
    skillZip: 'downloads/ga4-business-toolkit.zip',
    makerName: 'Gobinda Tarafdar'
  };

  function detectBase() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src || '';
      const m = src.match(/^(.*)js\/app\.js(?:\?.*)?$/);
      if (m) return m[1];
    }
    if (
      location.pathname.includes('/course/') ||
      location.pathname.includes('/resources/') ||
      location.pathname.includes('/coach/') ||
      location.pathname.includes('/academy/') ||
      location.pathname.includes('/settings/') ||
      location.pathname.includes('/skill/')
    ) {
      return '../';
    }
    return './';
  }

  const base = detectBase();

  function asset(path) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
    return base + path.replace(/^\.\//, '');
  }

  async function loadJSON(rel) {
    const res = await fetch(asset(rel));
    if (!res.ok) throw new Error('Failed to load ' + rel + ' (' + res.status + ')');
    return res.json();
  }

  function emptyProgress() {
    return {
      version: 2,
      visited: {},
      chapters: {},
      examBest: null,
      examHistory: []
    };
  }

  function migrateProgress() {
    try {
      const rawV2 = localStorage.getItem(PROGRESS_KEY);
      if (rawV2) {
        const p = JSON.parse(rawV2);
        if (p && p.version === 2) return p;
      }
    } catch (e) { /* ignore */ }

    const p = emptyProgress();
    try {
      const rawV1 = localStorage.getItem(PROGRESS_KEY_V1);
      if (rawV1) {
        const v1 = JSON.parse(rawV1);
        const completed = v1.completed || {};
        Object.keys(completed).forEach((id) => {
          p.visited[id] = completed[id];
          p.chapters[id] = p.chapters[id] || { status: 'visited', gateBest: null, attempts: 0 };
        });
      }
    } catch (e) { /* ignore */ }
    saveProgress(p);
    return p;
  }

  function getProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && p.version === 2) return p;
      }
    } catch (e) { /* ignore */ }
    return migrateProgress();
  }

  function saveProgress(p) {
    p.version = 2;
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  function markVisited(topicId) {
    const p = getProgress();
    p.visited = p.visited || {};
    p.chapters = p.chapters || {};
    if (!p.visited[topicId]) p.visited[topicId] = Date.now();
    const ch = p.chapters[topicId] || { status: 'available', gateBest: null, attempts: 0 };
    if (ch.status === 'available' || !ch.status) ch.status = 'in_progress';
    if (ch.status === 'visited') ch.status = 'in_progress';
    p.chapters[topicId] = ch;
    saveProgress(p);
    return p;
  }

  /** @deprecated use markChapterPassed after gate — kept for Resources soft progress */
  function markComplete(topicId) {
    return markVisited(topicId);
  }

  function recordGateAttempt(topicId, pct, passed) {
    const p = getProgress();
    p.chapters = p.chapters || {};
    const ch = p.chapters[topicId] || { status: 'in_progress', gateBest: null, attempts: 0 };
    ch.attempts = (ch.attempts || 0) + 1;
    ch.gateBest = ch.gateBest == null ? pct : Math.max(ch.gateBest, pct);
    ch.lastAttemptAt = Date.now();
    if (passed) {
      ch.status = 'passed';
      ch.passedAt = Date.now();
    }
    p.chapters[topicId] = ch;
    saveProgress(p);
    return p;
  }

  function recordExam(pct, passed, detail) {
    const p = getProgress();
    p.examHistory = p.examHistory || [];
    p.examHistory.push({ at: Date.now(), pct, passed, detail: detail || null });
    p.examBest = p.examBest == null ? pct : Math.max(p.examBest, pct);
    saveProgress(p);
    return p;
  }

  function chapterStatus(topicId, topicIndex, topicIds) {
    const p = getProgress();
    const ch = (p.chapters || {})[topicId];
    if (ch && ch.status === 'passed') return 'passed';
    if (topicIndex === 0) {
      if (ch && ch.status === 'failed') return 'failed';
      if (ch && (ch.status === 'in_progress' || ch.status === 'visited')) return 'in_progress';
      return 'available';
    }
    if (topicIndex == null || !topicIds) {
      return (ch && ch.status) || 'available';
    }
    const prevId = topicIds[topicIndex - 1];
    const prev = (p.chapters || {})[prevId];
    if (!prev || prev.status !== 'passed') return 'locked';
    if (ch && ch.status === 'failed') return 'failed';
    if (ch && (ch.status === 'in_progress' || ch.status === 'visited')) return 'in_progress';
    return 'available';
  }

  function allChaptersPassed(topicIds) {
    const p = getProgress();
    return topicIds.every((id) => ((p.chapters || {})[id] || {}).status === 'passed');
  }

  function passedCount(topicIds) {
    const p = getProgress();
    const n = topicIds.filter((id) => ((p.chapters || {})[id] || {}).status === 'passed').length;
    return { n, total: topicIds.length, pct: topicIds.length ? Math.round((n / topicIds.length) * 100) : 0 };
  }

  function gateAverage(topicIds) {
    const p = getProgress();
    const scores = topicIds
      .map((id) => ((p.chapters || {})[id] || {}).gateBest)
      .filter((n) => n != null);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  function completedCount(totalTopics) {
    const p = getProgress();
    const n = Object.keys(p.chapters || {}).filter((id) => (p.chapters[id] || {}).status === 'passed').length;
    const visited = Object.keys(p.visited || {}).length;
    const use = n || 0;
    return { n: use, total: totalTopics, pct: totalTopics ? Math.round((use / totalTopics) * 100) : 0, visited };
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function stripTags(s) {
    return String(s || '').replace(/<[^>]+>/g, '');
  }

  function setActiveNav(id) {
    document.querySelectorAll('[data-nav]').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('data-nav') === id);
    });
  }

  function renderHeader(active) {
    const el = document.getElementById('siteHeader');
    if (!el) return;
    el.innerHTML = `
      <a class="brand" href="${asset('index.html')}">
        <img class="brand-mark-img" src="${asset('assets/brand/icon.svg?v=20260802q')}" width="36" height="36" alt="GA4" />
        <div class="brand-text">
          <strong>GA4 Desk</strong>
          <span>Guidebook · Course · Skill</span>
        </div>
      </a>
      <button type="button" class="nav-toggle" id="navToggle" aria-expanded="false" aria-controls="primaryNav" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
      <nav class="nav-links" id="primaryNav" aria-label="Primary">
        <a data-nav="home" href="${asset('index.html')}">Home</a>
        <a data-nav="course" href="${asset('course/index.html')}">Course</a>
        <a data-nav="academy" href="${asset('academy/index.html')}">Academy</a>
        <a data-nav="resources" href="${asset('resources/index.html')}">Resources</a>
        <a data-nav="coach" href="${asset('coach/index.html')}">Coach</a>
        <a data-nav="skill" href="${asset('skill/index.html')}">Skill</a>
        <a data-nav="settings" href="${asset('settings/index.html')}">Settings</a>
        <a class="btn btn-star btn-sm" href="${SITE.starUrl}" target="_blank" rel="noopener">★ Star</a>
      </nav>`;
    setActiveNav(active);
    const toggle = document.getElementById('navToggle');
    const nav = document.getElementById('primaryNav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = !nav.classList.contains('is-open');
        nav.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      });
    }
  }

  function renderFooter() {
    const el = document.getElementById('siteFooter');
    if (!el) return;
    el.innerHTML = `
      <div class="wrap footer-grid">
        <div>
          <strong>GA4 Desk</strong>
          <p class="footer-note">Free static GA4 guidebook. Not affiliated with Google. Practice exam ≠ official Skillshop certification. Demo screenshots from Google’s Merchandise Store property.</p>
        </div>
        <div class="footer-cols">
          <div>
            <h3>Learn</h3>
            <a href="${asset('course/index.html')}">Course</a>
            <a href="${asset('academy/index.html')}">Academy</a>
            <a href="${asset('resources/index.html')}">Resources</a>
            <a href="${asset('coach/index.html')}">Coach</a>
            <a href="${asset('skill/index.html')}">AI Skill</a>
            <a href="${asset('settings/index.html')}">Settings</a>
          </div>
          <div>
            <h3>Open</h3>
            <a href="${SITE.repoUrl}" target="_blank" rel="noopener">GitHub repo</a>
            <a href="${SITE.starUrl}" target="_blank" rel="noopener">★ Star on GitHub</a>
            <a href="${asset(SITE.skillZip)}" download>Download skill zip</a>
            <a href="${SITE.demoJoinUrl}" target="_blank" rel="noopener">Join GA4 demo account</a>
            <a href="${SITE.donateUrl}" target="_blank" rel="noopener">Donate</a>
          </div>
          <div>
            <h3>Maker</h3>
            <a href="${SITE.githubProfile}" target="_blank" rel="noopener">GitHub</a>
            <a href="${SITE.xUrl}" target="_blank" rel="noopener">X / Twitter</a>
            <a href="${SITE.linkedinUrl}" target="_blank" rel="noopener">LinkedIn</a>
          </div>
        </div>
      </div>`;
  }

  /** Inject common SEO link tags when a page opts in via data attributes on <html> or meta helpers. */
  function ensureBrandIcons() {
    const head = document.head;
    if (!head || head.querySelector('link[rel="icon"]')) return;
    const links = [
      { rel: 'icon', href: asset('assets/brand/favicon.ico'), sizes: 'any' },
      { rel: 'icon', type: 'image/png', href: asset('assets/brand/favicon-32.png'), sizes: '32x32' },
      { rel: 'apple-touch-icon', href: asset('assets/brand/apple-touch-icon.png') }
    ];
    links.forEach((cfg) => {
      const l = document.createElement('link');
      Object.keys(cfg).forEach((k) => l.setAttribute(k, cfg[k]));
      head.appendChild(l);
    });
  }

  ensureBrandIcons();

  global.GA4 = {
    base,
    asset,
    loadJSON,
    getProgress,
    saveProgress,
    markComplete,
    markVisited,
    recordGateAttempt,
    recordExam,
    chapterStatus,
    allChaptersPassed,
    passedCount,
    gateAverage,
    completedCount,
    escapeHtml,
    stripTags,
    renderHeader,
    renderFooter,
    setActiveNav,
    SITE,
    PROGRESS_KEY,
    PROGRESS_KEY_V1,
    QUIZ_KEY,
    GATE_PASS,
    EXAM_PASS
  };
})(window);
