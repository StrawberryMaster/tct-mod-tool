/*
 * Changelog modal
 */
(function (global) {
  'use strict';

  const MD_URL = 'changelog.md';

  // State
  let cachedText = null;
  let inflightPromise = null;
  let renderedHtml = null;
  let abortCtrl = null;

  let dialogEl = null;
  let bodyEl = null;

  // loading & prefetching
  function loadMarkdown() {
    if (cachedText !== null) return Promise.resolve(cachedText);
    if (inflightPromise) return inflightPromise;

    abortCtrl = new AbortController();

    inflightPromise = fetch(MD_URL, {
      signal: abortCtrl.signal,
      cache: 'default',
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        cachedText = text;
        renderedHtml = null;
        inflightPromise = null;
        return text;
      })
      .catch((err) => {
        inflightPromise = null;
        if (err.name === 'AbortError') return null;
        throw err;
      });

    return inflightPromise;
  }

  // prefetch when user hovers or focuses the link
  function prefetch() {
    if (cachedText === null && !inflightPromise) {
      loadMarkdown().catch(() => { });
    }
  }

  // rendering helpers
  function renderToBody(htmlString) {
    if (!bodyEl) return;
    if ('setHTMLUnsafe' in Element.prototype) {
      bodyEl.setHTMLUnsafe(htmlString);
    } else {
      bodyEl.innerHTML = htmlString;
    }
  }

  function getParsedHtml() {
    if (renderedHtml === null && cachedText !== null) {
      // local markdown subset renderer
      renderedHtml = global.TCTMarkdown?.render?.(cachedText) ?? cachedText;
    }
    return renderedHtml;
  }

  function showLoading() {
    renderToBody(
      '<p class="text-sm" style="color: var(--utility-text-gray)">Loading changelog&hellip;</p>'
    );
  }

  function showError() {
    renderToBody(`
      <p class="text-sm" style="color: var(--utility-text-gray)">
        Could not load the changelog. You can still
        <a href="./changelog.html" target="_blank" rel="noopener" style="text-decoration: underline;">
          read it on its own page
        </a>.
      </p>
    `);
  }

  function paint() {
    renderToBody(getParsedHtml());
    bodyEl.scrollTop = 0;
    bodyEl.focus({ preventScroll: true });
  }

  // modal setup
  function buildModal() {
    const dialog = document.createElement('dialog');
    dialog.className = 'm-auto p-0 rounded-lg shadow-xl border bg-transparent backdrop:bg-black/50 max-w-3xl w-full max-h-[85vh] focus:outline-none';
    dialog.setAttribute('aria-label', 'Changelog');

    dialog.innerHTML = `
        <div class="theme-panel flex flex-col h-[85vh] max-h-[85vh] min-h-0 rounded-lg overflow-hidden border">
          <div class="theme-panel-header p-4 border-b flex justify-between items-center rounded-t-lg shrink-0">
            <h2 class="text-lg font-semibold">Changelog</h2>
            <button type="button" class="text-white/90 hover:text-white text-xl leading-none"
                    data-close aria-label="Close">&#10005;</button>
          </div>
          <!-- Note: tabindex="-1" and min-h-0 allow wheel/trackpad events to bind cleanly -->
          <div class="changelog-body p-5 flex-1 min-h-0 overflow-y-auto outline-none"
               tabindex="-1"
               style="color: var(--app-text); -webkit-overflow-scrolling: touch;"></div>
        </div>
      `;

    bodyEl = dialog.querySelector('.changelog-body');

    // vlose when clicking directly on backdrop or [data-close] targets
    dialog.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      const isBackdropClick = target === dialog;
      if (isBackdropClick || target.closest('[data-close]')) {
        close();
      }
    });

    dialog.addEventListener('close', () => {
      if (abortCtrl) {
        abortCtrl.abort();
        abortCtrl = null;
      }
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  // opem/close
  function isOpen() {
    return dialogEl?.open ?? false;
  }

  function open() {
    if (!dialogEl) dialogEl = buildModal();
    if (isOpen()) return;

    dialogEl.showModal();

    if (cachedText !== null) {
      paint();
      return;
    }

    showLoading();
    loadMarkdown()
      .then((res) => {
        if (res && isOpen()) paint();
      })
      .catch(() => {
        if (isOpen()) showError();
      });
  }

  function close() {
    if (!isOpen()) return;
    dialogEl.close();
  }

  // event delegation
  document.addEventListener('click', (e) => {
    const link = e.target instanceof Element ? e.target.closest('a[data-changelog]') : null;
    if (!link) return;
    e.preventDefault();
    open();
  });

  // passive prefetching on intent: user hovers or tabs into the changelog link
  document.addEventListener('mouseover', (e) => {
    if (e.target instanceof Element && e.target.closest('a[data-changelog]')) {
      prefetch();
    }
  }, { passive: true });

  document.addEventListener('focusin', (e) => {
    if (e.target instanceof Element && e.target.closest('a[data-changelog]')) {
      prefetch();
    }
  }, { passive: true });

  global.openChangelogModal = open;
})(window);
