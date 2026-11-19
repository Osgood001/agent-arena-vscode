'use strict';

const { makeNonce, sharedCss, browserFormatHelpers } = require('./common');

function renderAnalysisHtml(webview) {
  const nonce = makeNonce();
  const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    ${sharedCss()}
    body { padding: 12px 16px 32px; }
    .header-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--aa-border);
      margin-bottom: 12px;
    }
    .tab-group { display: inline-flex; gap: 4px; }
    .tab-btn {
      padding: 6px 12px;
      font-weight: 600;
      border-radius: 5px;
    }
    .tab-btn.active {
      background: var(--aa-accent);
      color: var(--aa-accent-fg);
      border-color: transparent;
    }
    .toolbar-right { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(145px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 6px;
      padding: 9px 11px;
    }
    .kpi-label { font-size: 11px; color: var(--aa-muted); }
    .kpi-val { font-size: 17px; font-weight: 700; margin-top: 2px; font-family: var(--vscode-editor-font-family, monospace); }
    .section-h {
      font-size: 13px;
      font-weight: 700;
      margin: 16px 0 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .tbl-wrap {
      overflow-x: auto;
      border: 1px solid var(--aa-border);
      border-radius: 6px;
      background: var(--aa-card);
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      padding: 7px 9px;
      border-bottom: 1px solid var(--aa-border);
      text-align: left;
      vertical-align: top;
      white-space: nowrap;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--aa-muted);
      background: rgba(127, 127, 127, 0.06);
    }
    tr:last-child td { border-bottom: none; }
    td.num, th.num { text-align: right; font-family: var(--vscode-editor-font-family, monospace); }
    .ci-sub { display: block; font-size: 10.5px; color: var(--aa-muted); }
    .charts-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }
    .chart-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 6px;
      padding: 10px 12px;
    }
    .chart-title { font-size: 12.5px; font-weight: 700; margin-bottom: 6px; }
    .responses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .resp-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      max-height: 360px;
    }
    .resp-head {
      padding: 7px 10px;
      border-bottom: 1px solid var(--aa-border);
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }
    .resp-body {
      padding: 9px 10px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }
    .diff-viewer {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 14px;
      max-height: 360px;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      white-space: pre;
    }
    .diff-add { color: var(--aa-diff-add); }
    .diff-del { color: var(--aa-diff-del); }
    .diff-hunk { color: var(--aa-diff-hunk); }
    .judge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
      margin: 10px 0;
    }
    .judge-cand {
      border: 1px solid var(--aa-border);
      border-radius: 5px;
      padding: 8px 10px;
      background: rgba(127, 127, 127, 0.04);
    }
    .judge-cand.selected {
      border-color: var(--aa-gold);
      background: rgba(217, 163, 54, 0.1);
    }
    .rating-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11.5px;
      margin-top: 5px;
    }
    .rating-row input { width: 58px; text-align: center; padding: 2px 4px; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: rgba(127, 127, 127, 0.08); }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="tab-group">
      <button id="tabRun" class="tab-btn active">Run Analysis</button>
      <button id="tabBoard" class="tab-btn">All-Runs Leaderboard</button>
    </div>
    <div class="toolbar-right">
      <select id="taskPicker" title="Select run to analyze"></select>
      <button id="btnBlind">Blind Mode: OFF</button>
      <button id="btnOpenInArena">Open in Arena ↗</button>
      <button id="btnExportCsv">Export CSV</button>
      <button id="btnExportJson">Export JSON</button>
      <button id="btnRefresh">Refresh</button>
    </div>
  </div>

  <div id="viewRun"></div>
  <div id="viewBoard" style="display:none;"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    ${browserFormatHelpers()}

    let state = {
      tasks: [],
      selectedTaskId: null,
      leaderboard: null,
      activeTab: 'run',
    };
    let blindMode = false;
    let selectedDiff = null; // { relPath, candId, text }
    let filterTag = '';
    let filterHarness = '';

    const viewRun = document.getElementById('viewRun');
    const viewBoard = document.getElementById('viewBoard');
    const tabRun = document.getElementById('tabRun');
    const tabBoard = document.getElementById('tabBoard');
    const taskPicker = document.getElementById('taskPicker');
    const btnBlind = document.getElementById('btnBlind');

    function displayName(task, cand) {
      if (blindMode && task && task.blindMap && task.blindMap[cand.id]) {
        return task.blindMap[cand.id];
      }
      return cand.label || cand.configKey;
    }

    function setTab(tab) {
      state.activeTab = tab;
      tabRun.classList.toggle('active', tab === 'run');
      tabBoard.classList.toggle('active', tab === 'board');
      viewRun.style.display = tab === 'run' ? 'block' : 'none';
      viewBoard.style.display = tab === 'board' ? 'block' : 'none';
    }

    tabRun.addEventListener('click', () => setTab('run'));
    tabBoard.addEventListener('click', () => setTab('board'));

    btnBlind.addEventListener('click', () => {
      blindMode = !blindMode;
      btnBlind.textContent = blindMode ? 'Blind Mode: ON' : 'Blind Mode: OFF';
      btnBlind.classList.toggle('primary', blindMode);
      renderRunView();
    });

    taskPicker.addEventListener('change', () => {
      state.selectedTaskId = taskPicker.value;
      selectedDiff = null;
      setTab('run');
      renderRunView();
    });

    document.getElementById('btnOpenInArena').addEventListener('click', () => {
      vscode.postMessage({ type: 'openArena', taskId: state.selectedTaskId });
    });
    document.getElementById('btnExportCsv').addEventListener('click', () => {
      vscode.postMessage({ type: 'export', format: 'csv' });
    });
    document.getElementById('btnExportJson').addEventListener('click', () => {
      vscode.postMessage({ type: 'export', format: 'json' });
    });
    document.getElementById('btnRefresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    function orderedCandidates(task) {
      const list = [...(task.candidates || [])];
      if (blindMode && task && task.blindMap) {
        list.sort((a, b) => String(task.blindMap[a.id] || a.id).localeCompare(String(task.blindMap[b.id] || b.id)));
      }
      return list;
    }

    function svgElapsedChart(task) {
      const cands = orderedCandidates(task);
      const maxMs = Math.max(1000, ...cands.map((c) => c.durationMs || 0));
      const rowH = 30;
      const labelW = 275;
      const barW = 195;
      const rightW = 70;
      const w = labelW + barW + rightW;
      const h = Math.max(60, cands.length * rowH + 14);
      const rows = cands.map((c, idx) => {
        const y = idx * rowH + 8;
        const ms = c.durationMs || 0;
        const bw = Math.max(2, (ms / maxMs) * barW);
        const col = c.status === 'done' ? '#2a8c82' : (c.status === 'failed' ? '#d0654f' : '#d9a336');
        return '<text x="' + (labelW - 8) + '" y="' + (y + 15) + '" text-anchor="end" fill="currentColor" font-size="11">' + esc(displayName(task, c).slice(0, 44)) + '</text>' +
          '<rect x="' + labelW + '" y="' + (y + 4) + '" width="' + bw.toFixed(1) + '" height="16" rx="3" fill="' + col + '" opacity="0.88" />' +
          '<text x="' + (labelW + bw + 6).toFixed(1) + '" y="' + (y + 15) + '" fill="currentColor" font-size="11">' + esc(fmtDuration(c.durationMs)) + '</text>';
      }).join('');
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;">' + rows + '</svg>';
    }

    function svgTokenChart(task) {
      const cands = orderedCandidates(task);
      const totals = cands.map((c) => {
        const t = c.telemetry || {};
        return (t.inputTokens || 0) + (t.outputTokens || 0);
      });
      const maxTok = Math.max(1, ...totals);
      const rowH = 30;
      const labelW = 275;
      const barW = 195;
      const rightW = 70;
      const w = labelW + barW + rightW;
      const h = Math.max(60, cands.length * rowH + 28);
      const rows = cands.map((c, idx) => {
        const y = idx * rowH + 22;
        const t = c.telemetry || {};
        const inp = t.inputTokens || 0;
        const cac = Math.min(inp, t.cachedTokens || 0);
        const unc = Math.max(0, inp - cac);
        const out = t.outputTokens || 0;
        const tot = unc + cac + out;
        const wUnc = (unc / maxTok) * barW;
        const wCac = (cac / maxTok) * barW;
        const wOut = (out / maxTok) * barW;
        let x = labelW;
        let bars = '';
        if (wUnc > 0) { bars += '<rect x="' + x.toFixed(1) + '" y="' + (y + 4) + '" width="' + wUnc.toFixed(1) + '" height="16" fill="#3a6ea5" />'; x += wUnc; }
        if (wCac > 0) { bars += '<rect x="' + x.toFixed(1) + '" y="' + (y + 4) + '" width="' + wCac.toFixed(1) + '" height="16" fill="#2a8c82" />'; x += wCac; }
        if (wOut > 0) { bars += '<rect x="' + x.toFixed(1) + '" y="' + (y + 4) + '" width="' + wOut.toFixed(1) + '" height="16" fill="#d9a336" />'; x += wOut; }
        if (!tot) { bars += '<rect x="' + labelW + '" y="' + (y + 4) + '" width="2" height="16" fill="#8b949e" opacity="0.4" />'; }
        return '<text x="' + (labelW - 8) + '" y="' + (y + 15) + '" text-anchor="end" fill="currentColor" font-size="11">' + esc(displayName(task, c).slice(0, 44)) + '</text>' +
          bars +
          '<text x="' + (Math.max(labelW + 4, x) + 6).toFixed(1) + '" y="' + (y + 15) + '" fill="currentColor" font-size="11">' + esc(tot ? fmtTokens(tot) : '—') + '</text>';
      }).join('');
      const legend = '<g font-size="10.5" fill="currentColor">' +
        '<rect x="' + labelW + '" y="4" width="10" height="10" fill="#3a6ea5"/><text x="' + (labelW + 14) + '" y="13">Uncached In</text>' +
        '<rect x="' + (labelW + 90) + '" y="4" width="10" height="10" fill="#2a8c82"/><text x="' + (labelW + 104) + '" y="13">Cached In</text>' +
        '<rect x="' + (labelW + 170) + '" y="4" width="10" height="10" fill="#d9a336"/><text x="' + (labelW + 184) + '" y="13">Output</text>' +
      '</g>';
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;">' + legend + rows + '</svg>';
    }

    function formatDiffLines(diffText) {
      return String(diffText || '').split(/\\r?\\n/).map((line) => {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
          return '<div class="diff-hunk">' + esc(line) + '</div>';
        }
        if (line.startsWith('+')) return '<div class="diff-add">' + esc(line) + '</div>';
        if (line.startsWith('-')) return '<div class="diff-del">' + esc(line) + '</div>';
        return '<div>' + esc(line) + '</div>';
      }).join('');
    }

    function renderRunView() {
      const tasks = state.tasks || [];
      if (!tasks.length) {
        viewRun.innerHTML = '<div class="card muted">No benchmark tasks recorded yet. Launch a run in the Side-by-Side Arena first.</div>';
        return;
      }
      const task = tasks.find((t) => t.id === state.selectedTaskId) || tasks[0];
      state.selectedTaskId = task.id;
      const cands = orderedCandidates(task);

      const blindBanner = blindMode
        ? '<div class="notice-banner"><div><strong>Blind Mode Active</strong> — Model/harness identities are masked as Candidate A/B/C in randomized order until you save a judgment.</div><span class="badge winner">Unbiased Eval</span></div>'
        : '';

      const totalTokensTask = cands.reduce((s, c) => s + ((c.telemetry && c.telemetry.totalTokens) || 0), 0);
      const validDurs = cands.map((c) => c.durationMs).filter((d) => typeof d === 'number');
      const minDur = validDurs.length ? Math.min(...validDurs) : null;
      const maxDur = validDurs.length ? Math.max(...validDurs) : null;
      const totalCost = cands.reduce((s, c) => s + ((c.telemetry && c.telemetry.costUsd) || 0), 0);

      // Union of changed files
      const fileSet = new Set();
      for (const c of cands) {
        const ch = c.changedFiles || {};
        for (const f of [...(ch.added || []), ...(ch.modified || []), ...(ch.deleted || [])]) {
          fileSet.add(f);
        }
      }
      const allFiles = Array.from(fileSet).sort();

      const tableRows = cands.map((c) => {
        const tel = c.telemetry || {};
        const ch = c.changedFiles || {};
        const inTok = tel.inputTokens;
        const cacTok = tel.cachedTokens;
        const hit = (typeof inTok === 'number' && inTok > 0 && typeof cacTok === 'number')
          ? ((cacTok / inTok) * 100).toFixed(1) + '%'
          : '—';
        const isFastest = minDur !== null && c.durationMs === minDur && validDurs.length > 1;
        const isWinner = task.judgment && task.judgment.winnerId === c.id;
        return '<tr>' +
          '<td><strong>' + esc(displayName(task, c)) + '</strong>' + (isWinner ? ' <span class="badge winner">★ Winner</span>' : '') + '</td>' +
          '<td><span class="badge ' + esc(c.status) + '">' + esc(c.status) + '</span></td>' +
          '<td class="num">' + (c.exitCode === null || c.exitCode === undefined ? '—' : esc(c.exitCode)) + '</td>' +
          '<td class="num">' + fmtDuration(c.durationMs) + (isFastest ? ' <span class="badge done">fastest</span>' : '') + '</td>' +
          '<td class="mono" style="font-size:11px;">' + fmtTimeShort(c.startedAt) + ' → ' + fmtTimeShort(c.finishedAt) + '</td>' +
          '<td class="num">' + fmtTokens(tel.inputTokens) + '</td>' +
          '<td class="num">' + fmtTokens(tel.cachedTokens) + ' <span class="ci-sub">' + hit + '</span></td>' +
          '<td class="num">' + fmtTokens(tel.outputTokens) + '</td>' +
          '<td class="num"><strong>' + fmtTokens(tel.totalTokens) + '</strong></td>' +
          '<td class="num">' + fmtCost(tel.costUsd) + '</td>' +
          '<td class="num">' + (tel.numTurns || 0) + ' / ' + (tel.toolCalls || 0) + '</td>' +
          '<td class="num">+' + (ch.added || []).length + ' / ~' + (ch.modified || []).length + ' / -' + (ch.deleted || []).length + '</td>' +
        '</tr>';
      }).join('');

      const sharedNotice = task.isolationMode === 'direct' && allFiles.length > 0
        ? '<div class="notice-banner"><div><strong>Shared Workspace Mode:</strong> Multiple agents shared one directory, so file lists show workspace-level changes rather than per-agent diffs. Use Scratch, CoW Clone, or Git Worktree for isolated per-agent diffs.</div></div>'
        : '';

      const filesMatrix = allFiles.length ? (
        sharedNotice +
        '<div class="tbl-wrap"><table><thead><tr><th>Changed File</th>' +
        cands.map((c) => '<th>' + esc(displayName(task, c)) + '</th>').join('') +
        '</tr></thead><tbody>' +
        allFiles.map((f) => {
          return '<tr><td class="mono">' + esc(f) + '</td>' + cands.map((c) => {
            const ch = c.changedFiles || {};
            if ((ch.added || []).includes(f)) {
              return '<td><button data-action="viewDiff" data-cid="' + esc(c.id) + '" data-path="' + esc(f) + '">Added · Diff</button> ' +
                '<button data-action="openVscodeDiff" data-cid="' + esc(c.id) + '" data-path="' + esc(f) + '">IDE</button></td>';
            }
            if ((ch.modified || []).includes(f)) {
              return '<td><button data-action="viewDiff" data-cid="' + esc(c.id) + '" data-path="' + esc(f) + '">Modified · Diff</button> ' +
                '<button data-action="openVscodeDiff" data-cid="' + esc(c.id) + '" data-path="' + esc(f) + '">IDE</button></td>';
            }
            if ((ch.deleted || []).includes(f)) {
              return '<td><span class="badge failed">Deleted</span></td>';
            }
            return '<td class="muted">—</td>';
          }).join('') + '</tr>';
        }).join('') +
        '</tbody></table></div>'
      ) : '<div class="card muted" style="margin-bottom:12px;">No workspace files were added, modified, or deleted during this run.</div>';

      const j = task.judgment || { winnerId: null, isTie: false, scores: {}, notes: '' };
      const judgeCards = cands.map((c) => {
        const sc = (j.scores && j.scores[c.id]) || { correctness: '', clarity: '', efficiency: '' };
        const isWin = !j.isTie && j.winnerId === c.id;
        return '<div class="judge-cand' + (isWin ? ' selected' : '') + '">' +
          '<label style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:pointer;">' +
            '<input type="radio" name="winnerRadio" value="' + esc(c.id) + '"' + (isWin ? ' checked' : '') + ' />' +
            esc(displayName(task, c)) +
          '</label>' +
          '<div class="rating-row"><span>Correctness (1–5)</span><input type="number" min="1" max="5" step="1" data-score-cid="' + esc(c.id) + '" data-dim="correctness" value="' + esc(sc.correctness || '') + '" /></div>' +
          '<div class="rating-row"><span>Clarity (1–5)</span><input type="number" min="1" max="5" step="1" data-score-cid="' + esc(c.id) + '" data-dim="clarity" value="' + esc(sc.clarity || '') + '" /></div>' +
          '<div class="rating-row"><span>Efficiency (1–5)</span><input type="number" min="1" max="5" step="1" data-score-cid="' + esc(c.id) + '" data-dim="efficiency" value="' + esc(sc.efficiency || '') + '" /></div>' +
        '</div>';
      }).join('');

      const canAdopt = task.isolationMode !== 'direct' && j.winnerId;

      viewRun.innerHTML =
        blindBanner +
        '<div class="card" style="margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">' +
            '<div><strong style="font-size:15px;">' + esc(task.title) + '</strong></div>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
              '<span class="muted mono" style="font-size:11px;">prompt sha256: ' + esc((task.promptSha256 || '').slice(0, 12)) + '</span>' +
              '<button id="btnCopyPrompt" style="font-size:11px;padding:2px 8px;">Copy Prompt</button>' +
            '</div>' +
          '</div>' +
          '<div class="meta-strip" style="margin-top:6px;margin-bottom:6px;">' +
            '<span>Created: <strong>' + esc(fmtDateTime(task.createdAt)) + '</strong></span>' +
            '<span>Since Created: <strong class="since-age" data-iso="' + esc(task.createdAt) + '">' + fmtSince(task.createdAt) + '</strong></span>' +
            '<span>Isolation: <span class="badge">' + esc(task.isolationMode) + '</span></span>' +
            ((task.tags || []).length ? '<span>Tags: ' + task.tags.map((t) => '<span class="badge">' + esc(t) + '</span>').join(' ') + '</span>' : '') +
          '</div>' +
          '<details><summary style="cursor:pointer;font-size:12px;" class="muted">Show prompt (' + esc((task.prompt || '').length) + ' chars)</summary>' +
            '<pre style="white-space:pre-wrap;margin:8px 0 0;font-family:inherit;">' + esc(task.prompt) + '</pre>' +
          '</details>' +
        '</div>' +

        '<div class="kpi-grid">' +
          '<div class="kpi-card"><div class="kpi-label">Agents Run</div><div class="kpi-val">' + cands.length + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Elapsed Span</div><div class="kpi-val">' + fmtDuration(minDur) + ' – ' + fmtDuration(maxDur) + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Total Tokens (All)</div><div class="kpi-val">' + fmtTokens(totalTokensTask) + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Total Cost</div><div class="kpi-val">' + (totalCost > 0 ? fmtCost(totalCost) : '—') + '</div></div>' +
          '<div class="kpi-card"><div class="kpi-label">Files Touched</div><div class="kpi-val">' + allFiles.length + '</div></div>' +
        '</div>' +

        '<div class="section-h"><span>Execution Telemetry &amp; Resource Breakdown</span></div>' +
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Configuration</th><th>Status</th><th class="num">Exit</th><th class="num">Elapsed</th><th>Started → Finished</th>' +
          '<th class="num">Input</th><th class="num">Cached (Hit)</th><th class="num">Output</th><th class="num">Total Tok</th>' +
          '<th class="num">Cost</th><th class="num">Turns/Tools</th><th class="num">Files</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +

        '<div class="charts-2">' +
          '<div class="chart-card"><div class="chart-title">Elapsed Wall-Clock Time</div>' + svgElapsedChart(task) + '</div>' +
          '<div class="chart-card"><div class="chart-title">Token Usage Breakdown</div>' + svgTokenChart(task) + '</div>' +
        '</div>' +

        '<div class="section-h"><span>Changed Files &amp; Workspace Diffs</span></div>' +
        filesMatrix +
        (selectedDiff ? '<div class="diff-viewer"><div style="font-weight:700;margin-bottom:6px;font-family:inherit;">Diff: ' + esc(selectedDiff.relPath) + '</div>' + formatDiffLines(selectedDiff.text) + '</div>' : '') +

        '<div class="section-h"><span>Final Assistant Responses (Side-by-Side)</span></div>' +
        '<div class="responses-grid">' +
          cands.map((c) => {
            return '<div class="resp-card">' +
              '<div class="resp-head"><span>' + esc(displayName(task, c)) + '</span><span class="badge ' + esc(c.status) + '">' + fmtDuration(c.durationMs) + ' · ' + fmtTokens(c.telemetry && c.telemetry.totalTokens) + '</span></div>' +
              '<div class="resp-body">' + esc(c.finalText || c.error || '(No final assistant text)') + '</div>' +
            '</div>';
          }).join('') +
        '</div>' +

        '<div class="card">' +
          '<div class="section-h" style="margin-top:0;"><span>Judge &amp; Record Outcome</span>' +
            '<label style="font-weight:400;font-size:12px;cursor:pointer;"><input type="radio" name="winnerRadio" value="__TIE__"' + (j.isTie ? ' checked' : '') + ' /> Mark as Tie</label>' +
          '</div>' +
          '<div class="judge-grid">' + judgeCards + '</div>' +
          '<textarea id="judgeNotes" placeholder="Qualitative notes (why one model/harness/effort performed better)…" style="width:100%;min-height:54px;margin-bottom:8px;">' + esc(j.notes || '') + '</textarea>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button id="btnSaveJudgment" class="primary">Save Judgment &amp; Reveal</button>' +
            (canAdopt ? '<button id="btnAdoptWinner">Adopt Winner into Workspace</button>' : '') +
          '</div>' +
        '</div>';
    }

    function svgForestPlot(configs) {
      const scored = configs.filter((c) => c.nJudged > 0 && c.scoreMean !== null);
      const list = scored.length ? scored : configs;
      if (!list.length) return '<div class="muted">No data yet.</div>';
      const useScore = scored.length > 0;
      const rowH = 28;
      const labelW = 240;
      const plotW = 220;
      const rightW = 100;
      const w = labelW + plotW + rightW;
      const h = list.length * rowH + 30;
      const maxVal = useScore ? 5.0 : 1.0;

      const rows = list.map((c, idx) => {
        const y = idx * rowH + 10;
        const val = useScore ? c.scoreMean : c.winRate;
        const [lo, hi] = useScore ? c.scoreCi : c.winCi;
        const xVal = labelW + ((val || 0) / maxVal) * plotW;
        const xLo = labelW + ((lo || 0) / maxVal) * plotW;
        const xHi = labelW + ((hi || 0) / maxVal) * plotW;
        const lbl = useScore ? (val.toFixed(2) + ' [' + lo.toFixed(2) + ',' + hi.toFixed(2) + ']') : ((val * 100).toFixed(0) + '%');
        return '<text x="' + (labelW - 8) + '" y="' + (y + 14) + '" text-anchor="end" fill="currentColor" font-size="11">' + esc(c.configKey.slice(0, 38)) + '</text>' +
          '<line x1="' + xLo.toFixed(1) + '" y1="' + (y + 10) + '" x2="' + xHi.toFixed(1) + '" y2="' + (y + 10) + '" stroke="#2a8c82" stroke-width="2" />' +
          '<line x1="' + xLo.toFixed(1) + '" y1="' + (y + 6) + '" x2="' + xLo.toFixed(1) + '" y2="' + (y + 14) + '" stroke="#2a8c82" stroke-width="1.5" />' +
          '<line x1="' + xHi.toFixed(1) + '" y1="' + (y + 6) + '" x2="' + xHi.toFixed(1) + '" y2="' + (y + 14) + '" stroke="#2a8c82" stroke-width="1.5" />' +
          '<circle cx="' + xVal.toFixed(1) + '" cy="' + (y + 10) + '" r="4.5" fill="#2a8c82" />' +
          '<text x="' + (labelW + plotW + 8) + '" y="' + (y + 14) + '" fill="currentColor" font-size="10.5">' + lbl + '</text>';
      }).join('');
      const axisY = list.length * rowH + 14;
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;">' +
        '<line x1="' + labelW + '" y1="6" x2="' + labelW + '" y2="' + axisY + '" stroke="rgba(127,127,127,0.35)" />' +
        '<line x1="' + (labelW + plotW) + '" y1="6" x2="' + (labelW + plotW) + '" y2="' + axisY + '" stroke="rgba(127,127,127,0.35)" stroke-dasharray="3,3" />' +
        rows +
      '</svg>';
    }

    function svgParetoPlot(configs) {
      const valid = configs.filter((c) => typeof c.durationMedMs === 'number' && c.durationMedMs > 0);
      if (!valid.length) return '<div class="muted">No timing telemetry yet.</div>';
      const w = 480;
      const h = 240;
      const padL = 48;
      const padR = 28;
      const padT = 24;
      const padB = 34;
      const pw = w - padL - padR;
      const ph = h - padT - padB;
      const maxSec = Math.max(10, ...valid.map((c) => c.durationMedMs / 1000)) * 1.15;
      const useScore = valid.some((c) => c.scoreMean !== null);
      const maxY = useScore ? 5.0 : 1.0;

      const pts = valid.map((c) => {
        const sec = c.durationMedMs / 1000;
        const yVal = useScore ? (c.scoreMean || 0) : (c.winRate || 0);
        const x = padL + (sec / maxSec) * pw;
        const y = padT + ph - (yVal / maxY) * ph;
        const flipLeft = x > padL + pw * 0.58;
        const tx = flipLeft ? (x - 7) : (x + 7);
        const anchor = flipLeft ? 'end' : 'start';
        return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="5" fill="#3a6ea5" />' +
          '<text x="' + tx.toFixed(1) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="' + anchor + '" fill="currentColor" font-size="10">' + esc(c.configKey.slice(0, 26)) + '</text>';
      }).join('');

      return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto;">' +
        '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (padT + ph) + '" stroke="rgba(127,127,127,0.5)" />' +
        '<line x1="' + padL + '" y1="' + (padT + ph) + '" x2="' + (padL + pw) + '" y2="' + (padT + ph) + '" stroke="rgba(127,127,127,0.5)" />' +
        '<text x="' + (padL + pw / 2) + '" y="' + (h - 6) + '" text-anchor="middle" fill="currentColor" font-size="11">Median Elapsed Time (seconds)</text>' +
        '<text x="14" y="' + (padT + ph / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + (padT + ph / 2) + ')" fill="currentColor" font-size="11">' + (useScore ? 'Mean Overall Score (1–5)' : 'Win Rate') + '</text>' +
        pts +
      '</svg>';
    }

    function svgPairwiseMatrix(board) {
      const configs = board.configs || [];
      const pw = board.pairwise || {};
      const judgedConfigs = configs.filter((c) => c.nJudged > 0);
      if (judgedConfigs.length < 2) {
        return '<div class="muted">Judge at least one task with 2+ configurations to view the pairwise matrix.</div>';
      }
      const rows = judgedConfigs.map((a) => {
        const cells = judgedConfigs.map((b) => {
          if (a.configKey === b.configKey) return '<td class="num muted">—</td>';
          const rec = (pw[a.configKey] && pw[a.configKey][b.configKey]) || { wins: 0, ties: 0, losses: 0, total: 0 };
          if (!rec.total) return '<td class="num muted">0-0</td>';
          const bg = rec.wins > rec.losses
            ? 'rgba(42,140,130,0.22)'
            : (rec.losses > rec.wins ? 'rgba(208,101,79,0.20)' : 'rgba(127,127,127,0.12)');
          return '<td class="num" style="background:' + bg + ';">' + rec.wins + '-' + rec.ties + '-' + rec.losses + '</td>';
        }).join('');
        return '<tr><td><strong>' + esc(a.configKey.slice(0, 26)) + '</strong></td>' + cells + '</tr>';
      }).join('');
      return '<div class="tbl-wrap" style="margin-bottom:0;"><table><thead><tr><th>Row vs. Col (W-T-L)</th>' +
        judgedConfigs.map((c) => '<th class="num">' + esc(c.configKey.slice(0, 14)) + '</th>').join('') +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    function renderBoardView() {
      const tasks = state.tasks || [];
      const board = state.leaderboard || { totals: {}, configs: [], pairwise: {} };
      const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags || []))).sort();
      const allHarnesses = Array.from(new Set(tasks.flatMap((t) => (t.candidates || []).map((c) => c.harness)))).sort();

      const t = board.totals || {};
      const configs = board.configs || [];

      const filterHtml = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px;">' +
        '<label>Tag <select id="fltTag"><option value="">All tags</option>' +
          allTags.map((tg) => '<option value="' + esc(tg) + '"' + (tg === filterTag ? ' selected' : '') + '>' + esc(tg) + '</option>').join('') +
        '</select></label>' +
        '<label>Harness <select id="fltHarness"><option value="">All harnesses</option>' +
          allHarnesses.map((h) => '<option value="' + esc(h) + '"' + (h === filterHarness ? ' selected' : '') + '>' + esc(h) + '</option>').join('') +
        '</select></label>' +
      '</div>';

      const kpis = '<div class="kpi-grid">' +
        '<div class="kpi-card"><div class="kpi-label">Total Tasks</div><div class="kpi-val">' + (t.totalTasks || 0) + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">Judged Tasks</div><div class="kpi-val">' + (t.judgedTasks || 0) + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">Agent Runs</div><div class="kpi-val">' + (t.totalRuns || 0) + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">Cumulative Tokens</div><div class="kpi-val">' + fmtTokens(t.totalTokens) + '</div></div>' +
        '<div class="kpi-card"><div class="kpi-label">Cumulative Time</div><div class="kpi-val">' + fmtDuration(t.totalDurationMs) + '</div></div>' +
      '</div>';

      const lbRows = configs.map((c) => {
        const wr = c.nJudged ? ((c.winRate * 100).toFixed(1) + '%<span class="ci-sub">[' + (c.winCi[0] * 100).toFixed(0) + '%, ' + (c.winCi[1] * 100).toFixed(0) + '%]</span>') : '—';
        const sc = c.scoreMean !== null ? (c.scoreMean.toFixed(2) + '<span class="ci-sub">[' + c.scoreCi[0].toFixed(2) + ', ' + c.scoreCi[1].toFixed(2) + ']</span>') : '—';
        const elo = c.nJudged ? (Math.round(c.elo) + '<span class="ci-sub">[' + Math.round(c.eloCi[0]) + ', ' + Math.round(c.eloCi[1]) + ']</span>') : '—';
        const dur = c.durationMedMs !== null ? (fmtDuration(c.durationMedMs) + '<span class="ci-sub">[' + fmtDuration(c.durationCiMs[0]) + ', ' + fmtDuration(c.durationCiMs[1]) + ']</span>') : '—';
        const tok = c.tokensMed !== null ? (fmtTokens(c.tokensMed) + '<span class="ci-sub">[' + fmtTokens(c.tokensCi[0]) + ', ' + fmtTokens(c.tokensCi[1]) + ']</span>') : '—';
        const cac = c.cacheHitMean !== null ? ((c.cacheHitMean * 100).toFixed(1) + '%') : '—';
        return '<tr>' +
          '<td><strong>' + esc(c.configKey) + '</strong></td>' +
          '<td class="num">' + c.nCompleted + '/' + c.nRuns + '</td>' +
          '<td class="num">' + c.wins + '-' + c.ties + '-' + c.losses + '</td>' +
          '<td class="num">' + wr + '</td>' +
          '<td class="num">' + sc + '</td>' +
          '<td class="num">' + elo + '</td>' +
          '<td class="num">' + dur + '</td>' +
          '<td class="num">' + tok + '</td>' +
          '<td class="num">' + cac + '</td>' +
          '<td class="num">' + fmtCost(c.costMedUsd) + '</td>' +
        '</tr>';
      }).join('');

      const ledgerRows = tasks.filter((tk) => !filterTag || (tk.tags || []).includes(filterTag)).map((tk) => {
        const cs = tk.candidates || [];
        const totTok = cs.reduce((s, c) => s + ((c.telemetry && c.telemetry.totalTokens) || 0), 0);
        const maxMs = Math.max(0, ...cs.map((c) => c.durationMs || 0));
        let winLabel = '<span class="muted">Unjudged</span>';
        if (tk.judgment) {
          if (tk.judgment.isTie) winLabel = '<span class="badge winner">Tie</span>';
          else if (tk.judgment.winnerId) {
            const wc = cs.find((c) => c.id === tk.judgment.winnerId);
            if (wc) winLabel = '<span class="badge winner">' + esc(wc.configKey) + '</span>';
          }
        }
        return '<tr class="clickable-row" data-open-task="' + esc(tk.id) + '">' +
          '<td><strong>' + esc(tk.title) + '</strong><span class="ci-sub">' + esc((tk.prompt || '').slice(0, 72)) + '</span></td>' +
          '<td>' + esc(fmtDateTime(tk.createdAt)) + '<span class="ci-sub since-age" data-iso="' + esc(tk.createdAt) + '">' + fmtSince(tk.createdAt) + '</span></td>' +
          '<td class="num">' + cs.length + '</td>' +
          '<td>' + winLabel + '</td>' +
          '<td class="num">' + fmtTokens(totTok) + '</td>' +
          '<td class="num">' + fmtDuration(maxMs) + '</td>' +
        '</tr>';
      }).join('');

      viewBoard.innerHTML = filterHtml + kpis +
        '<div class="section-h"><span>Configuration Leaderboard (95% Wilson / Bootstrap CIs)</span></div>' +
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Configuration</th><th class="num">Done/Runs</th><th class="num">W-T-L</th><th class="num">Win Rate</th>' +
          '<th class="num">Mean Score</th><th class="num">Elo</th><th class="num">Med. Time</th><th class="num">Med. Tokens</th>' +
          '<th class="num">Cache Hit</th><th class="num">Med. Cost</th>' +
        '</tr></thead><tbody>' + (lbRows || '<tr><td colspan="10" class="muted">No runs recorded.</td></tr>') + '</tbody></table></div>' +
        '<div class="charts-2">' +
          '<div class="chart-card"><div class="chart-title">Quality / Win Rate with 95% Error Bars</div>' + svgForestPlot(configs) + '</div>' +
          '<div class="chart-card"><div class="chart-title">Quality vs. Median Elapsed Time</div>' + svgParetoPlot(configs) + '</div>' +
        '</div>' +
        '<div class="chart-card" style="margin-bottom:14px;"><div class="chart-title">Pairwise Head-to-Head Matrix (W-T-L)</div>' + svgPairwiseMatrix(board) + '</div>' +
        '<div class="section-h"><span>All Historical Runs (Click Row to Inspect)</span></div>' +
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Task &amp; Prompt</th><th>Created / Since</th><th class="num">Agents</th><th>Winner</th><th class="num">Total Tok</th><th class="num">Max Time</th>' +
        '</tr></thead><tbody>' + (ledgerRows || '<tr><td colspan="6" class="muted">No matching runs.</td></tr>') + '</tbody></table></div>';
    }

    function renderAll() {
      const tasks = state.tasks || [];
      taskPicker.innerHTML = tasks.map((t) => {
        const sel = t.id === state.selectedTaskId ? ' selected' : '';
        return '<option value="' + esc(t.id) + '"' + sel + '>' + esc(t.title) + ' (' + fmtSince(t.createdAt) + ')</option>';
      }).join('');
      renderRunView();
      renderBoardView();
    }

    viewRun.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action], button#btnSaveJudgment, button#btnAdoptWinner, button#btnCopyPrompt');
      if (!btn) return;
      const taskId = state.selectedTaskId;
      if (btn.id === 'btnCopyPrompt') {
        const task = (state.tasks || []).find((t) => t.id === taskId);
        if (task && navigator.clipboard) {
          navigator.clipboard.writeText(task.prompt || '');
          btn.textContent = 'Copied ✓';
          setTimeout(() => {
            btn.textContent = 'Copy Prompt';
          }, 1500);
        }
        return;
      }
      if (btn.id === 'btnSaveJudgment') {
        const checked = viewRun.querySelector('input[name="winnerRadio"]:checked');
        const val = checked ? checked.value : null;
        const isTie = val === '__TIE__';
        const winnerId = (!isTie && val) ? val : null;
        const scores = {};
        viewRun.querySelectorAll('input[data-score-cid]').forEach((inp) => {
          const cid = inp.getAttribute('data-score-cid');
          const dim = inp.getAttribute('data-dim');
          if (!scores[cid]) scores[cid] = {};
          const v = Number(inp.value);
          if (v > 0) scores[cid][dim] = v;
        });
        const notes = (document.getElementById('judgeNotes') && document.getElementById('judgeNotes').value) || '';
        const wasBlinded = blindMode;
        blindMode = false;
        btnBlind.textContent = 'Blind Mode: OFF';
        btnBlind.classList.remove('primary');
        vscode.postMessage({
          type: 'saveJudgment',
          taskId,
          payload: { blindedWhenJudged: wasBlinded, winnerId, isTie, scores, notes },
        });
        return;
      }
      if (btn.id === 'btnAdoptWinner') {
        vscode.postMessage({ type: 'adoptWinner', taskId });
        return;
      }
      const action = btn.getAttribute('data-action');
      const cid = btn.getAttribute('data-cid');
      const relPath = btn.getAttribute('data-path');
      if (action === 'viewDiff') {
        vscode.postMessage({ type: 'loadDiff', taskId, candId: cid, relPath });
      } else if (action === 'openVscodeDiff') {
        vscode.postMessage({ type: 'diffFile', taskId, candId: cid, relPath });
      }
    });

    viewBoard.addEventListener('change', (e) => {
      if (e.target.id === 'fltTag' || e.target.id === 'fltHarness') {
        filterTag = (document.getElementById('fltTag') && document.getElementById('fltTag').value) || '';
        filterHarness = (document.getElementById('fltHarness') && document.getElementById('fltHarness').value) || '';
        vscode.postMessage({ type: 'filterLeaderboard', tag: filterTag, harness: filterHarness });
      }
    });

    viewBoard.addEventListener('click', (e) => {
      const row = e.target.closest('tr[data-open-task]');
      if (!row) return;
      state.selectedTaskId = row.getAttribute('data-open-task');
      selectedDiff = null;
      setTab('run');
      renderAll();
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'state') {
        state = { ...state, ...(msg.payload || {}) };
        if (msg.payload && typeof msg.payload.blindMode === 'boolean') {
          blindMode = msg.payload.blindMode;
          btnBlind.textContent = blindMode ? 'Blind Mode: ON' : 'Blind Mode: OFF';
          btnBlind.classList.toggle('primary', blindMode);
        }
        if (msg.payload && msg.payload.tab) setTab(msg.payload.tab);
        renderAll();
      } else if (msg.type === 'diffLoaded') {
        selectedDiff = msg.payload;
        renderRunView();
      }
    });

    setInterval(() => {
      document.querySelectorAll('.since-age[data-iso]').forEach((el) => {
        el.textContent = fmtSince(el.getAttribute('data-iso'));
      });
    }, 5000);

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

module.exports = { renderAnalysisHtml };
