/* Per-diagram slideshow: plays authored data-diag-step groups only. */
(function (global) {
  const STEP_MS = 700;
  const GAP_MS = 180;
  const REDUCE = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function uniquifyMarkers(svg) {
    const uid = 'd' + Math.random().toString(36).slice(2, 9);
    const defs = svg.querySelector('defs');
    if (!defs) return;
    const idMap = {};
    defs.querySelectorAll('[id]').forEach((node) => {
      const old = node.getAttribute('id');
      if (!old) return;
      const neu = uid + '-' + old;
      idMap[old] = neu;
      node.setAttribute('id', neu);
    });
    const attrs = ['marker-start', 'marker-end', 'marker-mid', 'filter', 'clip-path', 'mask', 'fill', 'stroke'];
    svg.querySelectorAll('*').forEach((el) => {
      attrs.forEach((a) => {
        const v = el.getAttribute(a);
        if (!v || v.indexOf('url(') === -1) return;
        let next = v;
        Object.keys(idMap).forEach((old) => {
          next = next.replace(new RegExp('url\\(#' + old + '\\)', 'g'), 'url(#' + idMap[old] + ')');
        });
        if (next !== v) el.setAttribute(a, next);
      });
    });
  }

  function stepGroups(svg) {
    return Array.from(svg.children)
      .filter((el) => (el.localName || el.tagName || '').toLowerCase() === 'g' && el.hasAttribute('data-diag-step'))
      .sort((a, b) => {
        return (parseInt(a.getAttribute('data-diag-step'), 10) || 0) - (parseInt(b.getAttribute('data-diag-step'), 10) || 0);
      });
  }

  function sleep(ms, token, runId) {
    return new Promise((resolve) => {
      const t = setTimeout(() => resolve(token === runId.current), ms);
      runId.timers.push(t);
    });
  }

  function setOn(el, on) {
    el.classList.toggle('diag-on', on);
    el.classList.toggle('diag-off', !on);
  }

  function showAll(wrap) {
    const svg = wrap.querySelector('svg');
    if (!svg || !svg._diag) return;
    svg._diag.steps.forEach((g) => setOn(g, true));
    const status = wrap.querySelector('[data-diag-status]');
    if (status) status.textContent = 'Complete — replay anytime';
    wrap.classList.remove('is-playing');
    wrap.classList.add('is-complete');
  }

  async function play(wrap) {
    const svg = wrap.querySelector('svg');
    if (!svg || !svg._diag) return;
    const state = svg._diag;
    state.runId.current += 1;
    state.runId.timers.forEach(clearTimeout);
    state.runId.timers = [];
    const token = state.runId.current;

    if (REDUCE) {
      showAll(wrap);
      return;
    }

    state.steps.forEach((g) => setOn(g, false));
    wrap.classList.add('is-playing');
    wrap.classList.remove('is-complete');
    const status = wrap.querySelector('[data-diag-status]');

    for (let i = 0; i < state.steps.length; i++) {
      if (token !== state.runId.current) return;
      const g = state.steps[i];
      const label = g.getAttribute('data-diag-label') || `Step ${i + 1}`;
      if (status) status.textContent = `${i + 1}/${state.steps.length} — ${label}`;
      setOn(g, true);
      const ok = await sleep(STEP_MS + GAP_MS, token, state.runId);
      if (!ok) return;
    }

    if (status) status.textContent = 'Complete — replay anytime';
    wrap.classList.remove('is-playing');
    wrap.classList.add('is-complete');
  }

  function enhance(wrap) {
    if (!wrap || wrap.dataset.diagBound) return;
    const svg = wrap.querySelector('svg');
    if (!svg) return;

    uniquifyMarkers(svg);
    const steps = stepGroups(svg);
    if (!steps.length) {
      // No authored steps — leave static (do not invent a flow)
      return;
    }

    wrap.dataset.diagBound = '1';
    steps.forEach((g) => {
      g.classList.add('diag-node', 'diag-off');
      g.style.strokeDasharray = '';
      g.style.strokeDashoffset = '';
    });

    svg._diag = { steps, runId: { current: 0, timers: [] } };

    const controls = document.createElement('div');
    controls.className = 'diagram-controls';
    controls.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" data-diag-replay>Replay flow</button>
      <button type="button" class="btn btn-ghost btn-sm" data-diag-skip>Show all</button>
      <span class="diagram-status" data-diag-status>${REDUCE ? 'Static diagram' : 'Watch the flow'}</span>`;
    wrap.appendChild(controls);
    controls.querySelector('[data-diag-replay]').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      play(wrap);
    });
    controls.querySelector('[data-diag-skip]').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      svg._diag.runId.current += 1;
      svg._diag.runId.timers.forEach(clearTimeout);
      svg._diag.runId.timers = [];
      showAll(wrap);
    });

    if (REDUCE) {
      showAll(wrap);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !wrap.dataset.diagPlayed) {
            wrap.dataset.diagPlayed = '1';
            play(wrap);
            io.disconnect();
          }
        });
      },
      { threshold: 0.3, rootMargin: '0px 0px -6% 0px' }
    );
    io.observe(wrap);
  }

  function bind(root) {
    (root || document).querySelectorAll('.diagram-svg').forEach(enhance);
  }

  global.GA4Diagrams = { bind, enhance, play };
})(window);
