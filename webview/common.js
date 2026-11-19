'use strict';

const crypto = require('crypto');

function makeNonce() {
  return crypto.randomBytes(16).toString('base64');
}

function escapeHtml(val) {
  return String(val === null || val === undefined ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sharedCss() {
  return `
    :root {
      --aa-bg: var(--vscode-editor-background);
      --aa-fg: var(--vscode-editor-foreground);
      --aa-muted: var(--vscode-descriptionForeground);
      --aa-card: var(--vscode-editorWidget-background, rgba(127, 127, 127, 0.08));
      --aa-border: var(--vscode-panel-border, rgba(127, 127, 127, 0.25));
      --aa-accent: var(--vscode-button-background, #2a8c82);
      --aa-accent-fg: var(--vscode-button-foreground, #ffffff);
      --aa-accent-hover: var(--vscode-button-hoverBackground, #23746c);
      --aa-sec-bg: var(--vscode-button-secondaryBackground, rgba(127,127,127,0.18));
      --aa-sec-fg: var(--vscode-button-secondaryForeground, var(--aa-fg));
      --aa-input-bg: var(--vscode-input-background);
      --aa-input-fg: var(--vscode-input-foreground);
      --aa-input-border: var(--vscode-input-border, var(--aa-border));
      --aa-teal: #2a8c82;
      --aa-blue: #3a6ea5;
      --aa-gold: #d9a336;
      --aa-coral: #d0654f;
      --aa-ok: #2ea043;
      --aa-ok-fg: #3fb950;
      --aa-warn-fg: #e5a93c;
      --aa-err-fg: #f85149;
      --aa-diff-add: #3fb950;
      --aa-diff-del: #f85149;
      --aa-diff-hunk: #58a6ff;
    }
    body.vscode-light {
      --aa-ok-fg: #1a7f37;
      --aa-warn-fg: #9a6700;
      --aa-err-fg: #cf222e;
      --aa-diff-add: #1a7f37;
      --aa-diff-del: #cf222e;
      --aa-diff-hunk: #0969da;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: var(--aa-bg);
      color: var(--aa-fg);
      font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      font-size: var(--vscode-font-size, 13px);
      line-height: 1.45;
    }
    button, input, select, textarea {
      font-family: inherit;
      font-size: inherit;
    }
    button {
      cursor: pointer;
      border: 1px solid var(--aa-border);
      background: var(--aa-sec-bg);
      color: var(--aa-sec-fg);
      border-radius: 4px;
      padding: 5px 10px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    button:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    button:disabled {
      opacity: 0.48;
      cursor: not-allowed;
    }
    button.primary {
      background: var(--aa-accent);
      color: var(--aa-accent-fg);
      border-color: transparent;
      font-weight: 600;
    }
    button.primary:hover:not(:disabled) {
      background: var(--aa-accent-hover);
      filter: none;
    }
    button.danger {
      border-color: rgba(208, 101, 79, 0.5);
      color: var(--aa-coral);
      background: rgba(208, 101, 79, 0.1);
    }
    button.pulse {
      box-shadow: 0 0 0 2px rgba(42, 140, 130, 0.45);
      border-color: var(--aa-teal);
    }
    input[type="text"], input[type="number"], select, textarea {
      background: var(--aa-input-bg);
      color: var(--aa-input-fg);
      border: 1px solid var(--aa-input-border);
      border-radius: 4px;
      padding: 5px 8px;
    }
    textarea { resize: vertical; }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 999px;
      border: 1px solid var(--aa-border);
      background: rgba(127, 127, 127, 0.12);
      white-space: nowrap;
    }
    .badge.running { color: var(--aa-warn-fg); border-color: rgba(217, 163, 54, 0.55); background: rgba(217, 163, 54, 0.14); }
    .badge.done { color: var(--aa-ok-fg); border-color: rgba(63, 185, 80, 0.45); background: rgba(63, 185, 80, 0.12); }
    .badge.failed { color: var(--aa-err-fg); border-color: rgba(248, 81, 73, 0.45); background: rgba(248, 81, 73, 0.12); }
    .badge.cancelled { color: var(--aa-muted); }
    .badge.winner { color: var(--aa-warn-fg); border-color: rgba(217, 163, 54, 0.65); background: rgba(217, 163, 54, 0.16); }
    .notice-banner {
      border: 1px solid rgba(42, 140, 130, 0.5);
      background: rgba(42, 140, 130, 0.1);
      border-radius: 5px;
      padding: 7px 10px;
      font-size: 12px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .dot.ok { background: var(--aa-ok-fg); }
    .dot.no { background: #8b949e; opacity: 0.55; }
    .mono { font-family: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, monospace); }
    .muted { color: var(--aa-muted); }
    .card {
      background: var(--aa-card);
      border: 1px solid var(--aa-border);
      border-radius: 6px;
      padding: 10px 12px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .spinner {
      width: 10px;
      height: 10px;
      border: 1.8px solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      display: inline-block;
      animation: spin 0.8s linear infinite;
    }
  `;
}

function browserFormatHelpers() {
  return `
    function esc(s) {
      return String(s === null || s === undefined ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function fmtDuration(ms) {
      if (ms === null || ms === undefined || !isFinite(ms)) return '—';
      const totalSec = Math.max(0, Math.floor(ms / 1000));
      if (totalSec < 60) return (ms / 1000).toFixed(ms < 10000 ? 1 : 0) + 's';
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
    function fmtSince(iso) {
      if (!iso) return '—';
      const t = Date.parse(iso);
      if (!isFinite(t)) return '—';
      const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
      if (sec < 5) return 'just now';
      if (sec < 60) return sec + 's ago';
      const min = Math.floor(sec / 60);
      if (min < 60) return min + 'm ' + (sec % 60) + 's ago';
      const hr = Math.floor(min / 60);
      if (hr < 24) return hr + 'h ' + (min % 60) + 'm ago';
      const d = Math.floor(hr / 24);
      return d + 'd ' + (hr % 24) + 'h ago';
    }
    function fmtTokens(n) {
      if (n === null || n === undefined || !isFinite(n)) return '—';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
      return String(Math.round(n));
    }
    function fmtCost(c) {
      if (c === null || c === undefined || !isFinite(c)) return '—';
      return '$' + (c >= 1 ? c.toFixed(2) : c.toFixed(4));
    }
    function fmtTimeShort(iso) {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } catch (_) {
        return iso;
      }
    }
    function fmtDateTime(iso) {
      if (!iso) return '—';
      try {
        return new Date(iso).toLocaleString();
      } catch (_) {
        return iso;
      }
    }
  `;
}

module.exports = {
  makeNonce,
  escapeHtml,
  sharedCss,
  browserFormatHelpers,
};
