/*
 * Markdown subset renderer for changelog.md
 */
(function (global) {
  'use strict';

  const RE_HEADING = /^(#{1,6})\s+(.+)$/;
  const RE_LIST_ITEM = /^(\s*)[-*+]\s+(.+)$/;
  const RE_INLINE_CODE = /`([^`]+)`/g;
  const RE_BOLD = /\*\*([^*]+)\*\*/g;
  const RE_ITALIC = /(?<!\*)\*([^*]+)\*(?!\*)/g;
  const RE_LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

  // single-pass HTML entity escaper
  const ESC_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  const RE_ESC = /[&<>"']/g;

  function escapeHtml(str) {
    return str.replace(RE_ESC, (ch) => ESC_MAP[ch]);
  }

  /**
   * Escape raw content first, then safely inject formatted inline spans
   * Supports `code`, **bold**, *italics*, and safe external links
   */
  function renderInline(rawText) {
    return escapeHtml(rawText)
      .replace(RE_INLINE_CODE, '<code>$1</code>')
      .replace(RE_BOLD, '<strong>$1</strong>')
      .replace(RE_ITALIC, '<em>$1</em>')
      .replace(RE_LINK, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');
  }

  /**
   * Markdown -> HTML renderer
   * Ensures strictly valid HTML5
   */
  function render(md) {
    if (!md) return '';

    // fast-path normalize CRLF to LF
    const input = String(md);
    const lines = input.includes('\r') ? input.replace(/\r\n?/g, '\n').split('\n') : input.split('\n');

    const out = [];
    let listDepth = 0;
    let paragraph = [];

    const flushParagraph = () => {
      if (paragraph.length > 0) {
        // render inline once across the joined block rather than per-line
        out.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
        paragraph.length = 0;
      }
    };

    const setListDepth = (targetDepth) => {
      while (listDepth < targetDepth) {
        out.push('<ul><li>');
        listDepth++;
      }
      while (listDepth > targetDepth) {
        out.push('</li></ul>');
        listDepth--;
      }
    };

    const closeAllLists = () => {
      setListDepth(0);
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();

      // empty line signals block separation
      if (!line.trim()) {
        flushParagraph();
        closeAllLists();
        continue;
      }

      // headings
      const headMatch = RE_HEADING.exec(line);
      if (headMatch) {
        flushParagraph();
        closeAllLists();
        const level = headMatch[1].length;
        out.push(`<h${level}>${renderInline(headMatch[2])}</h${level}>`);
        continue;
      }

      // bulllet Lists with indentation handling
      const listMatch = RE_LIST_ITEM.exec(line);
      if (listMatch) {
        flushParagraph();

        // calculate indentation
        const indentStr = listMatch[1];
        const tabEquiv = indentStr.includes('\t') ? indentStr.replace(/\t/g, '    ') : indentStr;
        const targetDepth = Math.min(2, 1 + Math.floor(tabEquiv.length / 4));

        if (listDepth === targetDepth) {
          // same level: close prior item and open next
          out.push('</li><li>' + renderInline(listMatch[2]));
        } else if (targetDepth > listDepth) {
          // deeper level: nest <ul> inside the current open <li>
          while (listDepth < targetDepth) {
            out.push('<ul><li>' + renderInline(listMatch[2]));
            listDepth++;
          }
        } else {
          // shallower level: close inner <li>/<ul> levels
          while (listDepth > targetDepth) {
            out.push('</li></ul>');
            listDepth--;
          }
          out.push('</li><li>' + renderInline(listMatch[2]));
        }
        continue;
      }

      // normal paragraph lines accumulate
      closeAllLists();
      paragraph.push(line.trim());
    }

    // flush remaining buffers
    flushParagraph();
    closeAllLists();

    return out.join('\n');
  }

  // export module
  const TCTMarkdown = Object.freeze({ render, escapeHtml, renderInline });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TCTMarkdown;
  } else {
    global.TCTMarkdown = TCTMarkdown;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
