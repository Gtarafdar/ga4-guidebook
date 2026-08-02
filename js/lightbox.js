/* Simple image lightbox for lesson media */
(function (global) {
  let root = null;
  let imgEl = null;
  let capEl = null;

  function ensure() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'lightbox hidden';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Image preview');
    root.innerHTML = `
      <button type="button" class="lightbox-backdrop" aria-label="Close"></button>
      <div class="lightbox-panel">
        <button type="button" class="lightbox-close" aria-label="Close preview">×</button>
        <img class="lightbox-img" alt="">
        <p class="lightbox-cap"></p>
      </div>`;
    document.body.appendChild(root);
    imgEl = root.querySelector('.lightbox-img');
    capEl = root.querySelector('.lightbox-cap');
    root.querySelector('.lightbox-backdrop').addEventListener('click', close);
    root.querySelector('.lightbox-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root && !root.classList.contains('hidden')) close();
    });
  }

  function open(src, alt, caption) {
    ensure();
    imgEl.src = src;
    imgEl.alt = alt || '';
    capEl.textContent = caption || alt || '';
    root.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    if (!root) return;
    root.classList.add('hidden');
    imgEl.removeAttribute('src');
    document.body.style.overflow = '';
  }

  function bind(scope) {
    ensure();
    (scope || document).querySelectorAll('[data-lightbox]').forEach((el) => {
      if (el.dataset.lbBound) return;
      el.dataset.lbBound = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const src = el.getAttribute('data-lightbox') || el.getAttribute('href') || (el.querySelector('img') && el.querySelector('img').src);
        if (!src) return;
        const img = el.tagName === 'IMG' ? el : el.querySelector('img');
        const alt = (img && img.alt) || el.getAttribute('data-alt') || '';
        const cap = el.getAttribute('data-caption') || (el.closest('figure') && el.closest('figure').querySelector('figcaption')
          ? el.closest('figure').querySelector('figcaption').textContent
          : alt);
        open(src, alt, cap);
      });
    });
  }

  global.GA4Lightbox = { open, close, bind };
})(window);
