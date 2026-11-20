'use strict';

/**
 * Self-contained, XSS-safe Markdown-to-HTML renderer with zero runtime dependencies.
 * All helpers live inside renderMarkdown so browserMarkdownScript() can embed
 * renderMarkdown.toString() directly inside sandboxed VS Code webviews.
 */
function renderMarkdown(src) {
  function escHtml(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatEmphasisOnly(escapedText) {
    let out = escapedText;
    out = out.replace(/\*\*\*([^\n*]+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    out = out.replace(/___([^\n_]+?)___/g, '<strong><em>$1</em></strong>');
    out = out.replace(/\*\*([^\n*]+?)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^\w])__([^\n_]+?)__(?=[^\w]|$)/g, '$1<strong>$2</strong>');
    out = out.replace(/~~([^\n~]+?)~~/g, '<del>$1</del>');
    out = out.replace(/(^|[^*])\*([^\s*](?:[^\n*]*?[^\s*])?)\*(?=[^*]|$)/g, '$1<em>$2</em>');
    out = out.replace(/(^|[^\w])_([^\s_](?:[^\n_]*?[^\s_])?)_(?=[^\w]|$)/g, '$1<em>$2</em>');
    return out;
  }

  function inlineFormat(rawLine) {
    const codeTokens = [];
    const linkTokens = [];
    let work = String(rawLine || '').replace(/[\uE000\uE001]/g, '');

    // 1. Protect multi-backtick then single-backtick inline code spans
    work = work.replace(/``([^`]+?)``/g, function (_m, code) {
      const idx = codeTokens.length;
      codeTokens.push('<code>' + escHtml(code.trim()) + '</code>');
      return '\uE000C' + idx + '\uE001';
    });
    work = work.replace(/`([^`\n]+?)`/g, function (_m, code) {
      const idx = codeTokens.length;
      codeTokens.push('<code>' + escHtml(code) + '</code>');
      return '\uE000C' + idx + '\uE001';
    });

    // 2. Extract markdown links and sanitize protocols (allow https/http/mailto only)
    work = work.replace(/\[([^\]]+?)\]\(([^)\n]+?)\)/g, function (_m, label, rawUrl) {
      const idx = linkTokens.length;
      const trimmedUrl = String(rawUrl || '').trim().replace(/^<|>$/g, '');
      const urlClean = trimmedUrl.split(/\s+/)[0];
      const safe = /^(https?:\/\/|mailto:)/i.test(urlClean);
      const labelHtml = formatEmphasisOnly(escHtml(label));
      if (safe) {
        linkTokens.push(
          '<a href="' + escHtml(urlClean) + '" target="_blank" rel="noopener noreferrer">' + labelHtml + '</a>',
        );
      } else {
        linkTokens.push(labelHtml);
      }
      return '\uE000L' + idx + '\uE001';
    });

    // 3. Escape remaining HTML and apply emphasis formatting
    let formatted = formatEmphasisOnly(escHtml(work));

    // 4. Restore links first (labels may contain inline code tokens), then code tokens
    formatted = formatted.replace(/\uE000L(\d+)\uE001/g, function (_m, i) {
      return linkTokens[Number(i)] || '';
    });
    formatted = formatted.replace(/\uE000C(\d+)\uE001/g, function (_m, i) {
      return codeTokens[Number(i)] || '';
    });
    return formatted;
  }

  function isFenceStart(line) {
    const m = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`~]*)\s*$/);
    return m ? { char: m[1][0], len: m[1].length, lang: m[2] || '' } : null;
  }

  function splitPipeRow(line) {
    let trimmed = line.trim();
    if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
    if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1);
    const cells = [];
    let cur = '';
    for (let i = 0; i < trimmed.length; i += 1) {
      if (trimmed[i] === '\\' && trimmed[i + 1] === '|') {
        cur += '|';
        i += 1;
      } else if (trimmed[i] === '|') {
        cells.push(cur.trim());
        cur = '';
      } else {
        cur += trimmed[i];
      }
    }
    cells.push(cur.trim());
    return cells;
  }

  function parseTableSeparator(line) {
    if (!line || !line.includes('|')) return null;
    const cells = splitPipeRow(line);
    if (!cells.length) return null;
    const aligns = [];
    for (let i = 0; i < cells.length; i += 1) {
      const c = cells[i];
      if (!/^:?-{3,}:?$/.test(c)) return null;
      if (c.startsWith(':') && c.endsWith(':')) aligns.push('center');
      else if (c.endsWith(':')) aligns.push('right');
      else aligns.push('left');
    }
    return aligns;
  }

  function parseListLine(line) {
    const u = line.match(/^(\s*)([-*+])\s+(.*)$/);
    if (u) return { indent: u[1].length, type: 'ul', text: u[3] };
    const o = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (o) return { indent: o[1].length, type: 'ol', text: o[3] };
    return null;
  }

  function parseListBlock(lines, startIdx) {
    const first = parseListLine(lines[startIdx]);
    if (!first) return { html: '', nextIdx: startIdx + 1 };

    function renderListLevel(idx, minIndent, listType) {
      const tag = listType === 'ol' ? 'ol' : 'ul';
      const items = [];
      let i = idx;
      while (i < lines.length) {
        const parsed = parseListLine(lines[i]);
        if (!parsed) {
          if (lines[i].trim() === '' && i + 1 < lines.length && parseListLine(lines[i + 1])) {
            const nxt = parseListLine(lines[i + 1]);
            if (nxt && nxt.indent >= minIndent) {
              i += 1;
              continue;
            }
          }
          break;
        }
        if (parsed.indent < minIndent) break;
        if (parsed.indent > minIndent) {
          // Attach nested list onto previous item if available
          const nested = renderListLevel(i, parsed.indent, parsed.type);
          if (items.length > 0) {
            items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, nested.html + '</li>');
          } else {
            items.push('<li>' + nested.html + '</li>');
          }
          i = nested.nextIdx;
          continue;
        }
        if (parsed.type !== listType) break;

        let itemBody = parsed.text;
        i += 1;
        // Gather soft-wrapped continuation lines at greater indent
        while (i < lines.length) {
          const curLine = lines[i];
          if (!curLine.trim()) break;
          if (parseListLine(curLine) || isFenceStart(curLine)) break;
          if (/^\s{2,}/.test(curLine)) {
            itemBody += ' ' + curLine.trim();
            i += 1;
          } else {
            break;
          }
        }

        const taskMatch = itemBody.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          const checked = taskMatch[1].toLowerCase() === 'x';
          items.push(
            '<li class="md-task">' +
              '<span class="md-check' + (checked ? ' checked' : '') + '">' + (checked ? '✓' : '') + '</span>' +
              '<span>' + inlineFormat(taskMatch[2]) + '</span>' +
            '</li>',
          );
        } else {
          items.push('<li>' + inlineFormat(itemBody) + '</li>');
        }
      }
      return { html: '<' + tag + '>' + items.join('') + '</' + tag + '>', nextIdx: i };
    }

    return renderListLevel(startIdx, first.indent, first.type);
  }

  function startsSpecialBlock(lines, idx) {
    const line = lines[idx];
    if (!line || !line.trim()) return true;
    if (isFenceStart(line)) return true;
    if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) return true;
    if (/^\s{0,3}>\s?/.test(line)) return true;
    if (parseListLine(line)) return true;
    if (line.includes('|') && idx + 1 < lines.length && parseTableSeparator(lines[idx + 1])) return true;
    return false;
  }

  function renderBlocks(lines) {
    const out = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }

      // Fenced code block
      const fence = isFenceStart(line);
      if (fence) {
        const codeLines = [];
        i += 1;
        while (i < lines.length) {
          const endM = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
          if (endM && endM[1][0] === fence.char && endM[1].length >= fence.len) {
            i += 1;
            break;
          }
          codeLines.push(lines[i]);
          i += 1;
        }
        const langHtml = fence.lang ? '<div class="md-code-lang">' + escHtml(fence.lang) + '</div>' : '';
        out.push('<div class="md-code-wrap">' + langHtml + '<pre><code>' + escHtml(codeLines.join('\n')) + '</code></pre></div>');
        continue;
      }

      // Heading
      const hMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*$/);
      if (hMatch) {
        const lvl = hMatch[1].length;
        out.push('<h' + lvl + '>' + inlineFormat(hMatch[2]) + '</h' + lvl + '>');
        i += 1;
        continue;
      }

      // Horizontal rule
      if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
        out.push('<hr />');
        i += 1;
        continue;
      }

      // Blockquote
      if (/^\s{0,3}>\s?/.test(line)) {
        const bqLines = [];
        while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
          bqLines.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
          i += 1;
        }
        out.push('<blockquote>' + renderBlocks(bqLines) + '</blockquote>');
        continue;
      }

      // GFM pipe table
      if (line.includes('|') && i + 1 < lines.length) {
        const aligns = parseTableSeparator(lines[i + 1]);
        if (aligns) {
          const headers = splitPipeRow(line);
          const colCount = Math.max(aligns.length, headers.length);
          const ths = [];
          for (let c = 0; c < colCount; c += 1) {
            const al = aligns[c] || 'left';
            ths.push('<th style="text-align:' + al + ';">' + inlineFormat(headers[c] || '') + '</th>');
          }
          i += 2;
          const bodyRows = [];
          while (i < lines.length && lines[i].trim() && lines[i].includes('|') && !isFenceStart(lines[i])) {
            const rowCells = splitPipeRow(lines[i]);
            const tds = [];
            for (let c = 0; c < colCount; c += 1) {
              const al = aligns[c] || 'left';
              tds.push('<td style="text-align:' + al + ';">' + inlineFormat(rowCells[c] || '') + '</td>');
            }
            bodyRows.push('<tr>' + tds.join('') + '</tr>');
            i += 1;
          }
          out.push(
            '<div class="md-table-wrap"><table class="md-table"><thead><tr>' +
              ths.join('') +
            '</tr></thead><tbody>' +
              bodyRows.join('') +
            '</tbody></table></div>',
          );
          continue;
        }
      }

      // Ordered / unordered / task list
      if (parseListLine(line)) {
        const listRes = parseListBlock(lines, i);
        out.push(listRes.html);
        i = listRes.nextIdx;
        continue;
      }

      // Paragraph
      const pLines = [line];
      i += 1;
      while (i < lines.length && !startsSpecialBlock(lines, i)) {
        pLines.push(lines[i]);
        i += 1;
      }
      out.push('<p>' + pLines.map(inlineFormat).join('<br />') + '</p>');
    }
    return out.join('');
  }

  const normalized = String(src === null || src === undefined ? '' : src).replace(/\r\n?/g, '\n');
  if (!normalized.trim()) return '';
  return '<div class="md-view">' + renderBlocks(normalized.split('\n')) + '</div>';
}

function browserMarkdownScript() {
  return renderMarkdown.toString();
}

module.exports = {
  renderMarkdown,
  browserMarkdownScript,
};
