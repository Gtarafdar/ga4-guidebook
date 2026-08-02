/* Lesson / resource rendering — diagrams, videos, stories, sims, illustrations */
(function (global) {
  let DIAGRAMS = {};
  let VIDEOS = {};
  let SIMS = {};
  let ILLUSTRATIONS = {};
  let SCENARIOS = {};
  let PLAYLIST = 'https://www.youtube.com/playlist?list=PLI5YfMzCfRtZNBRmhTEJkcHYvN_x_wpxM';
  let VIDEO_HUB = 'https://support.google.com/analytics/answer/13284728';

  function setMedia({ diagrams, videos, playlistUrl, videoHubUrl, simulations, illustrations, scenarios }) {
    DIAGRAMS = diagrams || {};
    VIDEOS = videos || {};
    SIMS = simulations || {};
    ILLUSTRATIONS = illustrations || {};
    SCENARIOS = scenarios || {};
    if (playlistUrl) PLAYLIST = playlistUrl;
    if (videoHubUrl) VIDEO_HUB = videoHubUrl;
  }

  function moduleCard(num, title, hint, body, extraClass) {
    if (!body || !String(body).trim()) return '';
    return `<article class="lesson-module ${extraClass || ''}">
      <header class="lesson-module-head">
        <span class="lesson-step-num" aria-hidden="true">${num}</span>
        <div>
          <h3 class="lesson-module-title">${title}</h3>
          ${hint ? `<p class="lesson-module-hint">${hint}</p>` : ''}
        </div>
      </header>
      <div class="lesson-module-body">${body}</div>
    </article>`;
  }

  function zoomableImg(src, alt, caption) {
    const safeAlt = GA4.escapeHtml(alt || '');
    const safeCap = GA4.escapeHtml(caption || '');
    const url = GA4.asset(src);
    return `<figure class="media-card">
      <button type="button" class="media-zoom" data-lightbox="${GA4.escapeHtml(url)}" data-caption="${safeCap}" aria-label="Enlarge image">
        <img src="${url}" alt="${safeAlt}" loading="lazy">
        <span class="zoom-hint">Click to enlarge</span>
      </button>
      <figcaption>${safeCap}</figcaption>
    </figure>`;
  }

  function diagramFor(topic) {
    const key = topic.diagram || topic.id;
    const svg = DIAGRAMS[key];
    if (svg) {
      return `<div class="diagram-svg diagram-animated"><span class="illus-label">Concept diagram</span>${svg}</div>`;
    }
    return '';
  }

  function illustrationItems(topic, kindFilter) {
    const ill = ILLUSTRATIONS[topic.id] || (topic.illustrations && topic.illustrations[0]);
    if (!ill) return [];
    const items = Array.isArray(ill) ? ill : [ill];
    return items
      .map((item) => {
        if (typeof item === 'string') return { src: item, caption: 'Educational illustration', kind: 'info' };
        return {
          src: item.src,
          caption: item.caption || item.alt || 'Educational illustration',
          kind: item.kind || 'info',
          alt: item.alt
        };
      })
      .filter((item) => (kindFilter ? item.kind === kindFilter : true));
  }

  function illustrationFor(topic, kindFilter) {
    const items = illustrationItems(topic, kindFilter);
    if (!items.length) return '';
    return `<div class="media-grid">${items
      .map((item) =>
        zoomableImg(
          item.src,
          item.alt || item.caption || 'Educational illustration',
          (item.caption || 'Educational illustration') + ' — not a GA4 UI screenshot.'
        )
      )
      .join('')}</div>`;
  }

  function scenarioFor(topic) {
    const fromMeta = SCENARIOS[topic.id];
    if (fromMeta && fromMeta.length) {
      return `<div class="media-grid scenario-grid">${fromMeta
        .map((item) =>
          zoomableImg(
            item.src,
            item.caption || 'Scenario',
            (item.caption || 'Scenario') + ' — educational, not a GA4 UI screenshot.'
          )
        )
        .join('')}</div>`;
    }
    return illustrationFor(topic, 'scenario');
  }

  function renderScreenshots(topic) {
    if (!topic.screenshots || !topic.screenshots.length) return '';
    return `<div class="media-grid shot-grid">${topic.screenshots
      .map((s) =>
        zoomableImg(
          s.src,
          s.alt || s.caption,
          (s.caption || '') + ' — from Google’s public GA4 Demo Account.'
        )
      )
      .join('')}</div>`;
  }

  function sourceChip(source) {
    if (source === 'expert') return '<span class="chip chip-expert">Expert</span>';
    return '<span class="chip chip-official">Official</span>';
  }

  function videoCard(v) {
    const creator = v.creator ? GA4.escapeHtml(v.creator) : v.source === 'expert' ? 'Expert creator' : 'Google Analytics / Skillshop';
    const watchOn =
      v.source === 'expert'
        ? `${creator} — Expert (not Google) · opens on YouTube ↗`
        : `${creator} — Official · opens on YouTube ↗`;
    return `
      <a class="video-card" href="https://www.youtube.com/watch?v=${encodeURIComponent(v.id)}" target="_blank" rel="noopener">
        <div class="thumb-wrap">
          <img src="https://img.youtube.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg" alt="${GA4.escapeHtml(v.title)}" loading="lazy">
          <div class="play-badge"></div>
        </div>
        <div class="cap">${sourceChip(v.source)} ${GA4.escapeHtml(v.title)}<span class="watch-on">${watchOn}</span></div>
      </a>`;
  }

  function normalizeVideoEntry(raw) {
    if (!raw) return null;
    if (raw.id) {
      return {
        id: raw.id,
        title: raw.title,
        source: raw.source || 'official',
        creator: raw.creator || (raw.source === 'expert' ? 'Expert' : 'Google Analytics'),
        related: raw.related || []
      };
    }
    return null;
  }

  function renderVideo(topic) {
    const confirmed = normalizeVideoEntry(VIDEOS[topic.id]);
    let body;
    if (confirmed && confirmed.id) {
      const related = Array.isArray(confirmed.related) ? confirmed.related : [];
      body = `
        ${videoCard(confirmed)}
        ${
          related.length
            ? `<ul class="video-related">${related
                .map((r) => {
                  const src = r.source || confirmed.source || 'official';
                  return `<li>${sourceChip(src)} <a href="https://www.youtube.com/watch?v=${encodeURIComponent(r.id)}" target="_blank" rel="noopener">${GA4.escapeHtml(r.title)}</a>${r.creator ? ` <span class="muted-inline">· ${GA4.escapeHtml(r.creator)}</span>` : ''}</li>`;
                })
                .join('')}</ul>`
            : ''
        }
        <p class="video-more"><a href="${PLAYLIST}" target="_blank" rel="noopener">Full Analytics Academy playlist</a> · <a href="${VIDEO_HUB}" target="_blank" rel="noopener">GA4 video hub</a> · <a href="${GA4.asset('academy/index.html')}">Video Academy</a></p>`;
    } else {
      const q = encodeURIComponent('Analytics Academy Skillshop ' + topic.title);
      body = `<div class="video-fallback">No confirmed video mapped yet for this topic (we only map when titles verify — no guessed IDs).
        <a href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">Search Skillshop for “${GA4.escapeHtml(topic.title)}” →</a>
        or browse the <a href="${PLAYLIST}" target="_blank" rel="noopener">Analytics Academy playlist</a>
        / <a href="${GA4.asset('academy/index.html')}">Video Academy</a>.</div>`;
    }
    return body;
  }

  function renderStory(story) {
    if (!story) return '';
    return `<div class="story-cards">
      <div class="story-card story-problem">
        <span class="story-kicker">Problem</span>
        <p>${GA4.escapeHtml(story.problem)}</p>
      </div>
      <div class="story-card story-solution">
        <span class="story-kicker">Worked solution</span>
        <p>${GA4.escapeHtml(story.solution)}</p>
      </div>
      <div class="story-card story-takeaway">
        <span class="story-kicker">Stakeholder takeaway</span>
        <p>${GA4.escapeHtml(story.takeaway)}</p>
      </div>
    </div>`;
  }

  function renderSimulation(topic) {
    const sim = SIMS[topic.id] || null;
    if (sim && sim.steps && sim.steps.length) {
      const wrapId = 'sim-' + topic.id;
      const demoUrl = sim.demoUrl || 'https://analytics.google.com/analytics/index/demoaccount?appstate=/p213025502';
      const joinUrl = sim.demoJoinUrl || 'https://support.google.com/analytics/answer/6367342';
      return `<div class="sim-interactive" id="${wrapId}" data-sim="${topic.id}">
        <p class="sim-demo-cta">Open the live <a href="${GA4.escapeHtml(demoUrl)}" target="_blank" rel="noopener">GA4 demo account</a> (Merchandise Store) and click along. First time? Use Google’s <a href="${GA4.escapeHtml(joinUrl)}" target="_blank" rel="noopener">demo join page</a>.</p>
        <div class="sim-layout">
          <ol class="sim-rail" role="tablist"></ol>
          <div class="sim-stage">
            <div class="sim-media"></div>
            <h4 class="sim-step-title"></h4>
            <p class="sim-step-body"></p>
            <div class="toolbar">
              <button type="button" class="btn btn-secondary btn-sm" data-sim-prev>Previous</button>
              <button type="button" class="btn btn-primary btn-sm" data-sim-next>Next step</button>
            </div>
          </div>
        </div>
        <p class="sim-note">Screenshots are from Google’s public demo property. Shared demo — don’t paste real business data. Illustration steps appear only when no demo shot exists for that click.</p>
      </div>`;
    }
    if (!topic.simulation || !topic.simulation.length) return '';
    return `<div class="sim">
      <ol class="sim-steps">${topic.simulation.map((step) => `<li>${GA4.escapeHtml(step)}</li>`).join('')}</ol>
      <p style="margin:10px 0 0;font-size:15px;color:var(--muted)">Open the live property via Google’s join page, then follow these steps.</p>
    </div>`;
  }

  function bindSimulations(root) {
    (root || document).querySelectorAll('.sim-interactive').forEach((el) => {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      const id = el.getAttribute('data-sim');
      const sim = SIMS[id];
      if (!sim) return;
      let idx = 0;
      const rail = el.querySelector('.sim-rail');
      const media = el.querySelector('.sim-media');
      const title = el.querySelector('.sim-step-title');
      const body = el.querySelector('.sim-step-body');
      const prev = el.querySelector('[data-sim-prev]');
      const next = el.querySelector('[data-sim-next]');

      function paint() {
        const step = sim.steps[idx];
        rail.innerHTML = sim.steps
          .map(
            (s, i) =>
              `<li><button type="button" role="tab" class="${i === idx ? 'active' : ''}" data-i="${i}" aria-selected="${i === idx}">${i + 1}. ${GA4.escapeHtml(s.title)}</button></li>`
          )
          .join('');
        rail.querySelectorAll('button').forEach((b) =>
          b.addEventListener('click', () => {
            idx = +b.dataset.i;
            paint();
          })
        );
        title.textContent = step.title;
        body.textContent = step.body;
        if (step.media) {
          const label = step.mediaType === 'illustration' ? 'Educational illustration' : 'Demo screenshot';
          const cap = label + (step.mediaType === 'illustration' ? ' — not a GA4 UI screenshot.' : ' — from Google’s public demo.');
          media.innerHTML = zoomableImg(step.media, step.title, cap);
          if (global.GA4Lightbox) GA4Lightbox.bind(media);
        } else {
          media.innerHTML = `<div class="sim-illus-fallback"><span class="illus-label">Educational illustration step</span><p>${GA4.escapeHtml(step.title)}</p><p class="muted-inline">${GA4.escapeHtml(step.body)}</p></div>`;
        }
        prev.disabled = idx === 0;
        next.textContent = idx >= sim.steps.length - 1 ? 'Done' : 'Next step';
      }
      prev.onclick = () => {
        if (idx > 0) {
          idx--;
          paint();
        }
      };
      next.onclick = () => {
        if (idx < sim.steps.length - 1) {
          idx++;
          paint();
        }
      };
      paint();
    });
  }

  function renderLearn(topic, extras) {
    const story = (extras && extras.story) || null;
    const mode = (extras && extras.mode) || 'course';
    const infoIllustrations = illustrationItems(topic).filter((i) => i.kind !== 'scenario');
    const infoHtml = infoIllustrations.length
      ? `<div class="media-grid">${infoIllustrations
          .map((item) =>
            zoomableImg(
              item.src,
              item.alt || item.caption,
              (item.caption || 'Educational illustration') + ' — not a GA4 UI screenshot.'
            )
          )
          .join('')}</div>`
      : '';

    const snapshot = `
      ${topic.tldr ? `<div class="callout tldr"><div><b>TL;DR</b><p>${GA4.escapeHtml(topic.tldr)}</p></div></div>` : ''}
      ${topic.plain ? `<div class="callout plain"><div><b>In plain English</b><p>${GA4.escapeHtml(topic.plain)}</p></div></div>` : ''}`;

    const storyBody = `
      ${scenarioFor(topic)}
      ${renderStory(story)}`;

    const conceptBody = `<div class="lede-block">${(topic.learn || []).map((p) => `<p>${p}</p>`).join('')}</div>
      ${topic.example ? `<div class="callout example"><div><b>Worked example</b><p>${GA4.escapeHtml(topic.example)}</p></div></div>` : ''}
      ${(topic.quickWins || []).length ? `<div class="quick-wins"><b>Quick wins</b><ul>${topic.quickWins.map((w) => `<li>${GA4.escapeHtml(w)}</li>`).join('')}</ul></div>` : ''}`;

    const seeBody = `${diagramFor(topic)}${infoHtml}`;
    const shots = renderScreenshots(topic);
    const sim = renderSimulation(topic);
    const video = renderVideo(topic);
    const faq =
      (topic.faq || []).length
        ? topic.faq
            .map(
              (f) =>
                `<div class="faq-item"><div class="faq-q">Q: ${GA4.escapeHtml(f.q)}</div><div class="faq-a">${GA4.escapeHtml(f.a)}</div></div>`
            )
            .join('')
        : '';
    const links =
      (topic.resources || []).length
        ? `<ul class="resource-links">${topic.resources
            .map((r) => `<li><a href="${GA4.escapeHtml(r.u)}" target="_blank" rel="noopener">${GA4.escapeHtml(r.t)}</a></li>`)
            .join('')}</ul>`
        : '';

    const startBanner =
      mode === 'course'
        ? `<div class="next-step-banner" role="status">
        <span class="next-step-label">Start here</span>
        <p>Read the snapshot → follow the workplace story → then Practice. Pass the <strong>Gate</strong> at 70% to unlock the next chapter.</p>
      </div>`
        : `<div class="next-step-banner" role="status">
        <span class="next-step-label">Browse freely</span>
        <p>Same lesson cards as Course mode — no gates here. Jump into Course when you want unlock progress.</p>
      </div>`;

    const continueBar =
      mode === 'course'
        ? `<div class="lesson-continue">
        <div>
          <span class="next-step-label">When you’re ready</span>
          <p>Drill with <strong>Practice</strong>, then take the required <strong>Gate</strong> quiz (70%).</p>
        </div>
        <div class="lesson-continue-actions">
          <button type="button" class="btn btn-secondary" data-jump-tab="practice">Practice</button>
          <button type="button" class="btn btn-primary" data-jump-tab="gate">Take Gate quiz</button>
        </div>
      </div>`
        : '';

    let n = 1;
    return `<div class="lesson-flow">
      ${startBanner}
      ${moduleCard(n++, 'Snapshot', 'Get oriented in 30 seconds', snapshot, 'mod-snapshot')}
      ${moduleCard(n++, 'Workplace story', 'See why this matters on the job', storyBody, 'mod-story')}
      ${moduleCard(n++, 'Learn the concept', 'Core explanation', conceptBody, 'mod-concept')}
      ${seeBody.trim() ? moduleCard(n++, 'See it visually', 'Diagrams & infographics — click to enlarge', seeBody, 'mod-visual') : ''}
      ${shots ? moduleCard(n++, 'Demo screens', 'Real GA4 demo account — click any image to enlarge', shots, 'mod-shots') : ''}
      ${sim ? moduleCard(n++, 'Try the path', 'Click through with the live demo', sim, 'mod-sim') : ''}
      ${moduleCard(n++, 'Watch', 'Official or expert video when mapped', video, 'mod-video')}
      ${faq || links ? moduleCard(n++, 'Doubts & links', 'FAQ and official references', `${faq}${links ? `<h4 class="mini-label">Official links</h4>${links}` : ''}`, 'mod-faq') : ''}
      ${continueBar}
    </div>`;
  }

  function renderPractice(topic, onAnswered) {
    const wrap = document.createElement('div');
    wrap.className = 'practice-wrap';
    (topic.questions || []).forEach((qq, qi) => {
      const qel = document.createElement('div');
      qel.className = 'question question-card';
      qel.innerHTML = `<div class="qtext">${qi + 1}. ${GA4.escapeHtml(qq.q)}</div><div class="options"></div><div class="explain hidden"></div>`;
      const opts = qel.querySelector('.options');
      const exp = qel.querySelector('.explain');
      qq.o.forEach((opt, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt';
        b.textContent = opt;
        b.addEventListener('click', () => {
          if (b.dataset.done) return;
          opts.querySelectorAll('.opt').forEach((o) => {
            o.dataset.done = '1';
          });
          const ok = oi === qq.c;
          b.classList.add(ok ? 'correct' : 'wrong');
          opts.children[qq.c].classList.add('correct');
          exp.classList.remove('hidden');
          exp.textContent = (ok ? 'Correct. ' : 'Not quite. ') + qq.e;
          if (onAnswered) onAnswered(ok);
        });
        opts.appendChild(b);
      });
      wrap.appendChild(qel);
    });
    return wrap;
  }

  function listenText(topic, story) {
    const parts = [
      topic.title,
      topic.tldr,
      topic.plain,
      story ? 'Workplace story: ' + story.problem + ' Solution: ' + story.solution + ' Takeaway: ' + story.takeaway : '',
      ...(topic.learn || []).map(GA4.stripTags),
      topic.example ? 'Worked example: ' + topic.example : ''
    ].filter(Boolean);
    return parts.join('. ');
  }

  global.GA4Render = {
    setMedia,
    diagramFor,
    renderLearn,
    renderPractice,
    renderScreenshots,
    renderVideo,
    renderStory,
    bindSimulations,
    bindDiagrams: function (root) {
      if (global.GA4Diagrams) GA4Diagrams.bind(root);
    },
    videoCard,
    listenText,
    sourceChip
  };
})(window);
