/* Course mode: gated chapters, gate quiz UI, exam gate */
(function (global) {
  const ICONS = {
    locked:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    available:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    in_progress:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 5a7 7 0 0 1 0 14" fill="currentColor"/></svg>',
    passed:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12.5l2.5 2.5L16 9.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    failed:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v6M12 16.5v.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    visited:
      '<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>'
  };

  function statusMeta(status) {
    const map = {
      locked: { label: 'Locked', icon: ICONS.locked, cls: 'is-locked' },
      available: { label: 'Available', icon: ICONS.available, cls: 'is-available' },
      in_progress: { label: 'In progress', icon: ICONS.in_progress, cls: 'is-progress' },
      passed: { label: 'Passed', icon: ICONS.passed, cls: 'is-passed' },
      failed: { label: 'Retry gate', icon: ICONS.failed, cls: 'is-failed' },
      visited: { label: 'Visited', icon: ICONS.visited, cls: 'is-progress' }
    };
    return map[status] || map.available;
  }

  function courseLevel(passedN, total) {
    if (passedN >= total && total > 0) return { name: 'Path complete', tip: 'Final exam is unlocked', tag: 'Max' };
    if (passedN >= 18) return { name: 'Specialist', tip: 'Few gates left — finish strong', tag: 'L5' };
    if (passedN >= 12) return { name: 'Strategist', tip: 'You’re deep into the catalog', tag: 'L4' };
    if (passedN >= 6) return { name: 'Analyst', tip: 'Momentum is building', tag: 'L3' };
    if (passedN >= 1) return { name: 'Explorer', tip: 'First unlock earned — keep going', tag: 'L2' };
    return { name: 'Newcomer', tip: 'Pass Gate 1 at 70% to unlock Ch. 2', tag: 'L1' };
  }

  function milestones(passedN, total, examBest) {
    const items = [
      { id: 'first', label: 'First gate', need: 1, done: passedN >= 1 },
      { id: 'quarter', label: '25%', need: Math.ceil(total * 0.25), done: passedN >= Math.ceil(total * 0.25) },
      { id: 'half', label: 'Halfway', need: Math.ceil(total * 0.5), done: passedN >= Math.ceil(total * 0.5) },
      { id: 'almost', label: 'Almost', need: Math.ceil(total * 0.75), done: passedN >= Math.ceil(total * 0.75) },
      { id: 'all', label: 'All gates', need: total, done: passedN >= total && total > 0 },
      { id: 'exam', label: 'Exam 80%', need: 80, done: typeof examBest === 'number' && examBest >= 80 }
    ];
    return items;
  }

  function renderProgressPanel(topicIds, topics) {
    const passed = GA4.passedCount(topicIds);
    const avg = GA4.gateAverage(topicIds);
    const p = GA4.getProgress();
    const examBest = p.examBest;
    const level = courseLevel(passed.n, passed.total);
    const pct = passed.pct;
    const r = 34;
    const c = 2 * Math.PI * r;
    const dash = Math.max((pct / 100) * c, pct > 0 ? 4 : 0);
    const examReady = GA4.allChaptersPassed(topicIds);
    const nextIdx = topicIds.findIndex((id, i) => {
      const st = GA4.chapterStatus(id, i, topicIds);
      return st !== 'passed' && st !== 'locked';
    });
    const nextLocked = topicIds.findIndex((id, i) => GA4.chapterStatus(id, i, topicIds) === 'locked');
    let nextLabel = examReady ? 'Exam ready' : 'All chapters passed';
    if (!examReady && nextIdx >= 0 && topics && topics[nextIdx]) {
      nextLabel = `Up next · Ch. ${nextIdx + 1}`;
    } else if (!examReady && nextLocked >= 0) {
      nextLabel = `Pass Ch. ${nextLocked} gate to unlock`;
    }
    const segments = topicIds
      .map((id, i) => {
        const st = GA4.chapterStatus(id, i, topicIds);
        return `<span class="xp-seg is-${st === 'in_progress' ? 'progress' : st}" title="Ch. ${i + 1}"></span>`;
      })
      .join('');
    const ms = milestones(passed.n, passed.total, examBest)
      .map(
        (m) =>
          `<span class="xp-badge ${m.done ? 'is-on' : ''}" title="${GA4.escapeHtml(m.label)}">${GA4.escapeHtml(m.label)}</span>`
      )
      .join('');
    const clears = passed.n;

    return {
      html: `
        <details class="prog-acc" id="progressAccordion">
          <summary class="prog-acc-summary">
            <div class="prog-acc-heading">
              <span class="prog-acc-title">Your progress</span>
              <span class="prog-acc-meta"><span class="xp-level-tag">${GA4.escapeHtml(level.tag)}</span> ${GA4.escapeHtml(level.name)} · ${passed.n}/${passed.total}</span>
            </div>
            <div class="prog-acc-glance" aria-hidden="true">
              <div class="prog-acc-mini-bar"><span style="width:${pct}%"></span></div>
              <strong class="prog-acc-pct">${pct}%</strong>
            </div>
          </summary>
          <div class="prog-acc-body">
            <div class="xp-panel">
              <div class="xp-top">
                <div class="xp-ring" aria-hidden="true">
                  <svg viewBox="0 0 80 80" width="64" height="64">
                    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#e6eaed" stroke-width="7"/>
                    <circle cx="40" cy="40" r="${r}" fill="none" stroke="#2a7a82" stroke-width="7"
                      stroke-linecap="round" stroke-dasharray="${dash} ${c}"
                      transform="rotate(-90 40 40)"/>
                    <text x="40" y="38" text-anchor="middle" font-size="13" font-weight="700" fill="#1c2430">${pct}%</text>
                    <text x="40" y="52" text-anchor="middle" font-size="8" fill="#5a6570">DONE</text>
                  </svg>
                </div>
                <div class="xp-copy">
                  <div class="xp-level"><span class="xp-level-tag">${GA4.escapeHtml(level.tag)}</span> ${GA4.escapeHtml(level.name)}</div>
                  <div class="xp-sub">${passed.n} / ${passed.total} gates cleared · ${GA4.escapeHtml(level.tip)}</div>
                  <div class="xp-next">${GA4.escapeHtml(nextLabel)}</div>
                </div>
              </div>
              <div class="xp-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Course progress">
                <span style="width:${pct}%"></span>
              </div>
              <div class="xp-segs" aria-hidden="true">${segments}</div>
              <div class="xp-badges">${ms}</div>
              <div class="xp-stats">
                <div><span class="lms-stat-label">Clears</span><strong>${clears}</strong></div>
                <div><span class="lms-stat-label">Gate avg</span><strong>${avg == null ? '—' : avg + '%'}</strong></div>
                <div><span class="lms-stat-label">Exam</span><strong>${examBest == null ? '—' : examBest + '%'}</strong></div>
              </div>
            </div>
          </div>
        </details>`,
      passed,
      avg,
      examBest,
      level,
      examReady,
      pct,
      nextLabel
    };
  }

  function renderNavList(topics, currentId, onOpen) {
    const ids = topics.map((t) => t.id);
    const nav = document.createElement('ul');
    nav.className = 'side-list lms-nav';
    topics.forEach((t, i) => {
      const st = GA4.chapterStatus(t.id, i, ids);
      const meta = statusMeta(st);
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.id = t.id;
      btn.dataset.status = st;
      btn.className = `${meta.cls}${t.id === currentId ? ' active' : ''}`;
      btn.setAttribute('aria-label', `${t.title}, ${meta.label}`);
      if (st === 'locked') {
        btn.disabled = true;
        btn.setAttribute('aria-disabled', 'true');
      }
      btn.innerHTML = `<span class="num">${i + 1}.</span><span class="nav-title">${GA4.escapeHtml(t.title)}</span><span class="nav-status" title="${meta.label}">${meta.icon}</span>`;
      btn.addEventListener('click', () => {
        if (st === 'locked') return;
        onOpen(t.id);
      });
      li.appendChild(btn);
      nav.appendChild(li);
    });
    return nav;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderGateQuiz(topic, gateBank, onFinished) {
    const wrap = document.createElement('div');
    wrap.className = 'gate-quiz';
    const questions = (gateBank && gateBank.questions) || [];
    const passPct = (gateBank && gateBank.passPercent) || GA4.GATE_PASS;
    if (!questions.length) {
      wrap.innerHTML = `<p class="callout plain">Gate questions missing for this chapter.</p>`;
      return wrap;
    }

    const state = {
      idx: 0,
      answers: Array(questions.length).fill(null),
      submitted: false
    };

    function paint() {
      const q = questions[state.idx];
      wrap.innerHTML = `
        <div class="gate-head">
          <p class="kicker">Chapter gate · ${passPct}% to unlock next</p>
          <p class="gate-meta">Question ${state.idx + 1} of ${questions.length}</p>
        </div>
        <div class="qtext">${GA4.escapeHtml(q.q)}</div>
        <div class="options"></div>
        <div class="toolbar gate-toolbar">
          <button type="button" class="btn btn-secondary btn-sm" data-act="prev" ${state.idx === 0 ? 'disabled' : ''}>Previous</button>
          <button type="button" class="btn btn-secondary btn-sm" data-act="next" ${state.idx >= questions.length - 1 ? 'disabled' : ''}>Next</button>
          <button type="button" class="btn btn-primary btn-sm" data-act="submit">Submit gate</button>
        </div>
        <div class="gate-result hidden"></div>`;

      const opts = wrap.querySelector('.options');
      q.o.forEach((text, oi) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'opt' + (state.answers[state.idx] === oi ? ' correct' : '');
        b.textContent = text;
        b.addEventListener('click', () => {
          state.answers[state.idx] = oi;
          paint();
        });
        opts.appendChild(b);
      });

      wrap.querySelector('[data-act="prev"]').onclick = () => {
        if (state.idx > 0) {
          state.idx--;
          paint();
        }
      };
      wrap.querySelector('[data-act="next"]').onclick = () => {
        if (state.idx < questions.length - 1) {
          state.idx++;
          paint();
        }
      };
      wrap.querySelector('[data-act="submit"]').onclick = () => finish();
    }

    function finish() {
      const unanswered = state.answers.filter((a) => a == null).length;
      if (unanswered) {
        const go = confirm(`You left ${unanswered} unanswered (count as wrong). Submit anyway?`);
        if (!go) return;
      }
      let correct = 0;
      const review = [];
      questions.forEach((q, i) => {
        const ok = state.answers[i] === q.c;
        if (ok) correct++;
        else {
          review.push({
            q: q.q,
            yours: state.answers[i] == null ? '(blank)' : q.o[state.answers[i]],
            right: q.o[q.c],
            e: q.e
          });
        }
      });
      const pct = Math.round((correct / questions.length) * 100);
      const passed = pct >= passPct;
      GA4.recordGateAttempt(topic.id, pct, passed);
      const box = wrap.querySelector('.gate-result') || wrap;
      const resultHtml = passed
        ? `<div class="result-card result-pass" role="status">
            <h3>Chapter passed</h3>
            <p>${correct}/${questions.length} correct (${pct}%). Next chapter is unlocked.</p>
            <button type="button" class="btn btn-primary btn-sm" data-act="next-chapter">Continue</button>
          </div>`
        : `<div class="result-card result-fail" role="status">
            <h3>Not yet — ${pct}%</h3>
            <p>Need ${passPct}% to unlock the next chapter. Review misses and retry the gate (Practice tab stays available for drills).</p>
            <ol class="gate-review">${review
              .map(
                (r) =>
                  `<li><strong>${GA4.escapeHtml(r.q)}</strong><br>Your answer: ${GA4.escapeHtml(
                    r.yours
                  )}<br>Correct: ${GA4.escapeHtml(r.right)}<br><em>${GA4.escapeHtml(r.e)}</em></li>`
              )
              .join('')}</ol>
            <button type="button" class="btn btn-primary btn-sm" data-act="retry">Retry gate</button>
          </div>`;

      wrap.innerHTML = `<div class="gate-head"><p class="kicker">Gate result</p></div>${resultHtml}`;
      const retry = wrap.querySelector('[data-act="retry"]');
      if (retry) retry.onclick = () => {
        state.answers = Array(questions.length).fill(null);
        state.idx = 0;
        paint();
      };
      if (onFinished) onFinished({ passed, pct, correct, total: questions.length });
      const next = wrap.querySelector('[data-act="next-chapter"]');
      if (next && onFinished) {
        next.onclick = () => onFinished({ passed, pct, correct, total: questions.length, advance: true });
      }
    }

    paint();
    return wrap;
  }

  function examBlockedMessage(topicIds) {
    const p = GA4.getProgress();
    const remaining = topicIds.filter((id) => !((p.chapters || {})[id] && (p.chapters || {})[id].status === 'passed'));
    return `Finish all chapter gates first (${remaining.length} remaining). Final exam unlocks at 100% chapters passed.`;
  }

  global.GA4Course = {
    statusMeta,
    renderProgressPanel,
    renderNavList,
    renderGateQuiz,
    examBlockedMessage,
    shuffle
  };
})(window);
