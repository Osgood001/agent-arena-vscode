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
    body { padding: 14px 18px 36px; max-width: 1380px; margin: 0 auto; }
    .header-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--aa-border);
      margin-bottom: 14px;
    }
    .toolbar-right { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .meta-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
      font-size: 12px;
      color: var(--aa-muted);
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 14px;
    }
    .kpi-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      border-radius: 7px;
      padding: 8px 10px;
    }
    .kpi-label { font-size: 11px; color: var(--aa-muted); }
    .kpi-val { font-size: 16px; font-weight: 700; margin-top: 2px; font-family: var(--vscode-editor-font-family, monospace); }
    .section-h {
      font-size: 13px;
      font-weight: 700;
      margin: 16px 0 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tbl-wrap {
      overflow-x: auto;
      border: 1px solid var(--aa-border);
      border-radius: 8px;
      background: var(--aa-card);
      margin-bottom: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    th, td {
      padding: 9px 11px;
      border-bottom: 1px solid var(--aa-border);
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
    }
    th {
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--aa-muted);
      background: var(--aa-subtle);
      font-weight: 600;
    }
    tr:last-child td { border-bottom: none; }
    td.num, th.num { text-align: right; font-family: var(--vscode-editor-font-family, monospace); }
    .ci-sub { display: block; font-size: 10.5px; color: var(--aa-muted); }
    .rank-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 24px;
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      background: var(--aa-subtle);
      border: 1px solid var(--aa-border);
    }
    .rank-pill.r1 { color: var(--aa-warn-fg); border-color: rgba(217, 163, 54, 0.55); background: rgba(217, 163, 54, 0.14); }
    .charts-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }
    .chart-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      border-radius: 7px;
      padding: 10px 12px;
    }
    .chart-title { font-size: 12px; font-weight: 700; margin-bottom: 6px; }
    .responses-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }
    .resp-card {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      max-height: 460px;
      overflow: hidden;
    }
    .resp-head {
      padding: 9px 12px;
      border-bottom: 1px solid var(--aa-border);
      font-weight: 700;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
    }
    .resp-subbar {
      padding: 5px 12px;
      border-bottom: 1px solid var(--aa-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      background: var(--aa-subtle);
      font-size: 11px;
    }
    .resp-pills { display: inline-flex; gap: 4px; flex-wrap: wrap; align-items: center; }
    .mini-pill {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--aa-muted);
    }
    .mini-pill.active {
      border-color: var(--aa-border);
      background: var(--aa-bg);
      color: var(--aa-fg);
      font-weight: 600;
    }
    .resp-body {
      padding: 12px 13px;
      overflow-y: auto;
      font-size: 12.5px;
    }
    .raw-box {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      margin: 0;
    }
    .ai-judge-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 9px 11px;
      border: 1px solid var(--aa-border);
      border-radius: 7px;
      background: var(--aa-subtle);
      margin-bottom: 10px;
      font-size: 12px;
    }
    .ai-judge-inputs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 7px;
    }
    .judge-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 9px;
      margin: 10px 0;
    }
    .judge-cand {
      border: 1px solid var(--aa-border);
      border-radius: 7px;
      padding: 9px 11px;
      background: var(--aa-bg);
    }
    .judge-cand.selected {
      border-color: var(--aa-gold);
      background: rgba(217, 163, 54, 0.08);
    }
    .score-pills {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 5px;
      margin-top: 7px;
    }
    .score-cell {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 10.5px;
      color: var(--aa-muted);
    }
    .score-cell input {
      width: 100%;
      text-align: center;
      padding: 2px 4px;
      font-size: 12px;
    }
    .diff-viewer {
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 12px;
      max-height: 360px;
      overflow: auto;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      white-space: pre;
    }
    .diff-add { color: var(--aa-diff-add); }
    .diff-del { color: var(--aa-diff-del); }
    .diff-hunk { color: var(--aa-diff-hunk); }
    .board-head-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover td { background: var(--aa-subtle); }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="segmented">
      <button id="tabRun" class="seg-btn active">Run Summary</button>
      <button id="tabBoard" class="seg-btn">Leaderboard</button>
    </div>
    <div class="toolbar-right">
      <select id="taskPicker" title="Select run to inspect"></select>
      <button id="btnBlind" title="Mask model identities as Candidate A/B/C">Blind: OFF</button>
      <button id="btnOpenInArena">Arena ↗</button>
      <button id="btnRefresh" class="ghost" title="Refresh data">↻</button>
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
      harnesses: {},
      judgeConfig: { harness: 'codex', model: '', effort: 'medium', blind: true, rubric: '' },
      judgingTaskId: null,
      judgingLabel: '',
      expandDetails: false,
      activeTab: 'run',
    };
    let blindMode = false;
    let selectedDiff = null; // { relPath, candId, text }
    let filterTag = '';
    let filterHarness = '';
    let respViewModes = {}; // candId -> 'response' | 'file:<relPath>'
    let respRawSrc = {};    // candId -> boolean
    let fileCache = {};     // taskId::candId::relPath -> { text, error }
    let draftJudgeCfg = null;
    let judgeErr = '';

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

    function orderedCandidates(task) {
      const list = [...(task.candidates || [])];
      if (blindMode && task && task.blindMap) {
        list.sort((a, b) => String(task.blindMap[a.id] || a.id).localeCompare(String(task.blindMap[b.id] || b.id)));
      }
      return list;
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
      btnBlind.textContent = blindMode ? 'Blind: ON' : 'Blind: OFF';
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
    document.getElementById('btnRefresh').addEventListener('click', () => {
      vscode.postMessage({ type: 'refresh' });
    });

    function svgElapsedChart(task) {
      const cands = orderedCandidates(task);
      const maxMs = Math.max(1000, ...cands.map((c) => c.durationMs || 0));
      const rowH = 30;
      const labelW = 260;
      const barW = 195;
      const rightW = 70;
      const w = labelW + barW + rightW;
      const h = Math.max(60, cands.length * rowH + 14);
      const rows = cands.map((c, idx) => {
        const y = idx * rowH + 8;
        const ms = c.durationMs || 0;
        const bw = Math.max(2, (ms / maxMs) * barW);
        const col = c.status === 'done' ? '#2a8c82' : (c.status === 'failed' ? '#d0654f' : '#d9a336');
        return '<text x="' + (labelW - 8) + '" y="' + (y + 15) + '" text-anchor="end" fill="currentColor" font-size="11">' + esc(displayName(task, c).slice(0, 40)) + '</text>' +
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
      const labelW = 260;
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
        return '<text x="' + (labelW - 8) + '" y="' + (y + 15) + '" text-anchor="end" fill="currentColor" font-size="11">' + esc(displayName(task, c).slice(0, 40)) + '</text>' +
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

    function candidateMarkdownFiles(cand) {
      const ch = cand.changedFiles || {};
      return Array.from(new Set([...(ch.added || []), ...(ch.modified || [])]))
        .filter((f) => /\\.(md|markdown)$/i.test(f))
        .slice(0, 2);
    }

    function renderResponseCardBody(task, cand) {
      const mode = respViewModes[cand.id] || 'response';
      const showSrc = Boolean(respRawSrc[cand.id]);
      if (mode.startsWith('file:')) {
        const relPath = mode.slice(5);
        const ck = task.id + '::' + cand.id + '::' + relPath;
        const cached = fileCache[ck];
        if (!cached) {
          vscode.postMessage({ type: 'loadFileContent', taskId: task.id, candId: cand.id, relPath });
          return '<div class="muted">Loading ' + esc(relPath) + '…</div>';
        }
        if (cached.error) return '<div class="muted">' + esc(cached.error) + '</div>';
        return showSrc
          ? '<pre class="raw-box">' + esc(cached.text || '') + '</pre>'
          : renderMarkdown(cached.text || '(empty file)');
      }
      const txt = cand.finalText || cand.error || '';
      if (!txt) return '<div class="muted">(No final response)</div>';
      return showSrc
        ? '<pre class="raw-box">' + esc(txt) + '</pre>'
        : renderMarkdown(txt);
    }

    function currentJudgeConfig() {
      const base = state.judgeConfig || { harness: 'codex', model: '', effort: 'medium', blind: true, rubric: '' };
      return draftJudgeCfg || { ...base };
    }

    function readJudgeInputsFromDom() {
      const cur = currentJudgeConfig();
      const hEl = document.getElementById('judgeHarness');
      const mEl = document.getElementById('judgeModel');
      const eEl = document.getElementById('judgeEffort');
      const bEl = document.getElementById('judgeBlind');
      const rEl = document.getElementById('judgeRubric');
      if (hEl) cur.harness = hEl.value;
      if (mEl) cur.model = mEl.value.trim();
      if (eEl) cur.effort = eEl.value.trim();
      if (bEl) cur.blind = Boolean(bEl.checked);
      if (rEl) cur.rubric = rEl.value.trim();
      draftJudgeCfg = cur;
      return cur;
    }

    function renderRunView() {
      const tasks = state.tasks || [];
      if (!tasks.length) {
        viewRun.innerHTML = '<div class="card muted">No benchmark runs yet. Launch a prompt in the Side-by-Side Arena first.</div>';
        return;
      }
      const task = tasks.find((t) => t.id === state.selectedTaskId) || tasks[0];
      state.selectedTaskId = task.id;
      const cands = orderedCandidates(task);

      const blindBanner = blindMode
        ? '<div class="notice-banner"><div><strong>Blind Mode Active</strong> — Candidate identities are randomized and masked until a judgment is saved.</div><span class="badge winner">Unbiased Eval</span></div>'
        : '';

      const totalTokensTask = cands.reduce((s, c) => s + ((c.telemetry && c.telemetry.totalTokens) || 0), 0);
      const validDurs = cands.map((c) => c.durationMs).filter((d) => typeof d === 'number');
      const minDur = validDurs.length ? Math.min(...validDurs) : null;
      const maxDur = validDurs.length ? Math.max(...validDurs) : null;
      const totalCost = cands.reduce((s, c) => s + ((c.telemetry && c.telemetry.costUsd) || 0), 0);

      const fileSet = new Set();
      for (const c of cands) {
        const ch = c.changedFiles || {};
        for (const f of [...(ch.added || []), ...(ch.modified || []), ...(ch.deleted || [])]) {
          fileSet.add(f);
        }
      }
      const allFiles = Array.from(fileSet).sort();

      const j = task.judgment || { winnerId: null, isTie: false, scores: {}, notes: '', judgeType: null, judgeConfig: null };

      // 1. Minimalist 5-column Summary Table
      const summaryRows = cands.map((c) => {
        const tel = c.telemetry || {};
        const isFastest = minDur !== null && c.durationMs === minDur && validDurs.length > 1;
        const isWinner = !j.isTie && j.winnerId === c.id;
        const sc = j.scores && j.scores[c.id] && j.scores[c.id].overall ? j.scores[c.id].overall.toFixed(2) : null;
        let outcome = sc ? ('Score ' + sc) : '—';
        if (isWinner) outcome = '<span class="badge winner">★ Winner</span>' + (sc ? (' <span class="muted">(' + sc + ')</span>') : '');
        else if (j.isTie && task.judgment) outcome = '<span class="badge">Tie</span>' + (sc ? (' <span class="muted">(' + sc + ')</span>') : '');
        return '<tr>' +
          '<td><strong>' + esc(displayName(task, c)) + '</strong></td>' +
          '<td><span class="badge ' + esc(c.status) + '">' + esc(c.status) + '</span></td>' +
          '<td class="num">' + fmtDuration(c.durationMs) + (isFastest ? ' <span class="badge done">fastest</span>' : '') + '</td>' +
          '<td class="num">' + fmtTokens(tel.totalTokens) + '</td>' +
          '<td class="num">' + outcome + '</td>' +
        '</tr>';
      }).join('');

      // 2. Full Telemetry Table (for collapsible Detailed Analysis)
      const fullRows = cands.map((c) => {
        const tel = c.telemetry || {};
        const ch = c.changedFiles || {};
        const inTok = tel.inputTokens;
        const cacTok = tel.cachedTokens;
        const hit = (typeof inTok === 'number' && inTok > 0 && typeof cacTok === 'number')
          ? ((cacTok / inTok) * 100).toFixed(1) + '%'
          : '—';
        return '<tr>' +
          '<td><strong>' + esc(displayName(task, c)) + '</strong></td>' +
          '<td class="num">' + (c.exitCode === null || c.exitCode === undefined ? '—' : esc(c.exitCode)) + '</td>' +
          '<td class="mono" style="font-size:11px;">' + fmtTimeShort(c.startedAt) + ' → ' + fmtTimeShort(c.finishedAt) + '</td>' +
          '<td class="num">' + fmtTokens(tel.inputTokens) + '</td>' +
          '<td class="num">' + fmtTokens(tel.cachedTokens) + ' <span class="ci-sub">' + hit + '</span></td>' +
          '<td class="num">' + fmtTokens(tel.outputTokens) + '</td>' +
          '<td class="num">' + fmtTokens(tel.reasoningTokens) + '</td>' +
          '<td class="num"><strong>' + fmtTokens(tel.totalTokens) + '</strong></td>' +
          '<td class="num">' + fmtCost(tel.costUsd) + '</td>' +
          '<td class="num">' + (tel.numTurns || 0) + ' / ' + (tel.toolCalls || 0) + '</td>' +
          '<td class="num">+' + (ch.added || []).length + ' / ~' + (ch.modified || []).length + ' / -' + (ch.deleted || []).length + '</td>' +
        '</tr>';
      }).join('');

      const sharedNotice = task.isolationMode === 'direct' && allFiles.length > 0
        ? '<div class="notice-banner"><div><strong>Shared Workspace Mode:</strong> Multiple agents shared one directory, so file lists reflect workspace changes rather than isolated per-agent diffs.</div></div>'
        : '';

      const filesMatrix = allFiles.length ? (
        sharedNotice +
        '<div class="tbl-wrap" style="margin-bottom:10px;"><table><thead><tr><th>Changed File</th>' +
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
      ) : '<div class="muted" style="font-size:12px;">No workspace files were added, modified, or deleted during this run.</div>';

      // 3. Rendered Markdown Response Cards
      const responseCards = cands.map((c) => {
        const mode = respViewModes[c.id] || 'response';
        const showSrc = Boolean(respRawSrc[c.id]);
        const mdFiles = candidateMarkdownFiles(c);
        const relFile = mode.startsWith('file:') ? mode.slice(5) : null;
        return '<div class="resp-card">' +
          '<div class="resp-head">' +
            '<span>' + esc(displayName(task, c)) + '</span>' +
            '<span class="badge ' + esc(c.status) + '">' + fmtDuration(c.durationMs) + ' · ' + fmtTokens(c.telemetry && c.telemetry.totalTokens) + '</span>' +
          '</div>' +
          '<div class="resp-subbar">' +
            '<div class="resp-pills">' +
              '<button class="mini-pill' + (mode === 'response' ? ' active' : '') + '" data-action="respMode" data-cid="' + esc(c.id) + '" data-mode="response">Response</button>' +
              mdFiles.map((f) => {
                const fm = 'file:' + f;
                return '<button class="mini-pill' + (mode === fm ? ' active' : '') + '" data-action="respMode" data-cid="' + esc(c.id) + '" data-mode="' + esc(fm) + '" title="' + esc(f) + '">📄 ' + esc(f.split('/').pop()) + '</button>';
              }).join('') +
            '</div>' +
            '<div class="resp-pills">' +
              '<button class="mini-pill' + (showSrc ? ' active' : '') + '" data-action="respToggleSrc" data-cid="' + esc(c.id) + '">' + (showSrc ? 'MD' : 'Src') + '</button>' +
              (relFile ? '<button class="mini-pill" data-action="openIdeFile" data-cid="' + esc(c.id) + '" data-path="' + esc(relFile) + '">Open ↗</button>' : '') +
            '</div>' +
          '</div>' +
          '<div class="resp-body">' + renderResponseCardBody(task, c) + '</div>' +
        '</div>';
      }).join('');

      // 4. Judge Controls + AI Agent Judge Bar
      const jCfg = currentJudgeConfig();
      const isJudgingThis = state.judgingTaskId === task.id;
      const harnessOptions = ['codex', 'claude', 'opencode', 'pi', 'dsh', 'custom'].map((h) => {
        const info = (state.harnesses || {})[h];
        const tag = h === 'custom' ? '' : (info && info.available ? '' : ' (not found)');
        return '<option value="' + h + '"' + (jCfg.harness === h ? ' selected' : '') + '>' + h + tag + '</option>';
      }).join('');

      let judgeProvenance = '';
      if (task.judgment) {
        if (j.judgeType === 'agent' && j.judgeConfig) {
          judgeProvenance = '<span class="badge ai">⚡ AI Judge · ' + esc(j.judgeConfig.label || j.judgeConfig.harness) + (j.blindedWhenJudged ? ' · Blind' : '') + '</span>';
        } else {
          judgeProvenance = '<span class="badge">Human Judge' + (j.blindedWhenJudged ? ' · Blind' : '') + '</span>';
        }
      }

      const judgeCards = cands.map((c) => {
        const sc = (j.scores && j.scores[c.id]) || { correctness: '', clarity: '', efficiency: '' };
        const isWin = !j.isTie && j.winnerId === c.id;
        return '<div class="judge-cand' + (isWin ? ' selected' : '') + '">' +
          '<label style="display:flex;align-items:center;gap:6px;font-weight:700;cursor:pointer;font-size:12.5px;">' +
            '<input type="radio" name="winnerRadio" value="' + esc(c.id) + '"' + (isWin ? ' checked' : '') + ' />' +
            esc(displayName(task, c)) +
          '</label>' +
          '<div class="score-pills">' +
            '<label class="score-cell"><span>Correct</span><input type="number" min="1" max="5" step="0.5" data-score-cid="' + esc(c.id) + '" data-dim="correctness" value="' + esc(sc.correctness || '') + '" /></label>' +
            '<label class="score-cell"><span>Clarity</span><input type="number" min="1" max="5" step="0.5" data-score-cid="' + esc(c.id) + '" data-dim="clarity" value="' + esc(sc.clarity || '') + '" /></label>' +
            '<label class="score-cell"><span>Efficiency</span><input type="number" min="1" max="5" step="0.5" data-score-cid="' + esc(c.id) + '" data-dim="efficiency" value="' + esc(sc.efficiency || '') + '" /></label>' +
          '</div>' +
        '</div>';
      }).join('');

      const canAdopt = task.isolationMode !== 'direct' && j.winnerId;
      const openAttr = state.expandDetails ? ' open' : '';

      viewRun.innerHTML =
        blindBanner +
        '<div class="card" style="margin-bottom:12px;">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px;">' +
            '<strong style="font-size:15px;">' + esc(task.title) + '</strong>' +
            '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
              '<button id="btnCopyPrompt" class="ghost" style="font-size:11.5px;padding:2px 8px;">Copy Prompt</button>' +
            '</div>' +
          '</div>' +
          '<div class="meta-strip">' +
            '<span>Created ' + esc(fmtDateTime(task.createdAt)) + ' (<strong class="since-age" data-iso="' + esc(task.createdAt) + '">' + fmtSince(task.createdAt) + '</strong>)</span>' +
            '<span>·</span><span>' + esc(task.isolationMode) + '</span>' +
            '<span>·</span><span>' + cands.length + ' agents</span>' +
            ((task.tags || []).length ? ('<span>·</span><span>' + task.tags.map((t) => '<span class="badge">' + esc(t) + '</span>').join(' ') + '</span>') : '') +
          '</div>' +
          '<details style="margin-top:8px;"><summary style="cursor:pointer;font-size:12px;" class="muted">Show prompt (' + esc((task.prompt || '').length) + ' chars)</summary>' +
            '<div style="margin-top:8px;font-size:12.5px;">' + renderMarkdown(task.prompt || '') + '</div>' +
          '</details>' +
        '</div>' +

        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Configuration</th><th>Status</th><th class="num">Elapsed</th><th class="num">Tokens</th><th class="num">Outcome</th>' +
        '</tr></thead><tbody>' + summaryRows + '</tbody></table></div>' +

        '<div class="section-h"><span>Outputs</span></div>' +
        '<div class="responses-grid">' + responseCards + '</div>' +

        '<div class="card" style="margin-bottom:12px;">' +
          '<div class="section-h" style="margin-top:0;margin-bottom:8px;">' +
            '<span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;">Judge &amp; Record Outcome ' + judgeProvenance + '</span>' +
            '<label style="font-weight:400;font-size:12px;cursor:pointer;"><input type="radio" name="winnerRadio" value="__TIE__"' + (j.isTie ? ' checked' : '') + ' /> Mark as Tie</label>' +
          '</div>' +
          '<div class="ai-judge-bar">' +
            '<div class="ai-judge-inputs">' +
              '<span style="font-weight:600;">AI Judge:</span>' +
              '<select id="judgeHarness" title="Coding agent assigned to evaluate outputs">' + harnessOptions + '</select>' +
              '<input id="judgeModel" type="text" placeholder="Model (auto)" value="' + esc(jCfg.model || '') + '" style="width:140px;" />' +
              '<input id="judgeEffort" type="text" placeholder="Effort" value="' + esc(jCfg.effort || '') + '" style="width:85px;" />' +
              '<label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input id="judgeBlind" type="checkbox"' + (jCfg.blind ? ' checked' : '') + ' /> Blind</label>' +
              '<button id="btnSaveJudgeCfg" class="ghost" style="font-size:11.5px;padding:3px 7px;" title="Save judge settings as default">Save Default</button>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;">' +
              (isJudgingThis
                ? '<span class="badge running"><span class="spinner"></span>Judging (' + esc(state.judgingLabel || jCfg.harness) + ')…</span><button id="btnCancelAiJudge" class="danger" style="font-size:11.5px;">Cancel</button>'
                : '<button id="btnRunAiJudge" class="primary">⚡ Run AI Judge</button>') +
            '</div>' +
          '</div>' +
          (judgeErr ? '<div class="muted" style="color:var(--aa-err-fg);font-size:12px;margin-bottom:8px;">' + esc(judgeErr) + '</div>' : '') +
          '<details style="margin-bottom:8px;"><summary style="cursor:pointer;font-size:11.5px;" class="muted">Custom Judge Rubric (optional)</summary>' +
            '<textarea id="judgeRubric" placeholder="Optional criteria for the AI judge (e.g. prioritize correctness of diffs over verbosity)…" style="width:100%;min-height:46px;margin-top:6px;">' + esc(jCfg.rubric || '') + '</textarea>' +
          '</details>' +
          '<div class="judge-grid">' + judgeCards + '</div>' +
          '<textarea id="judgeNotes" placeholder="Judge rationale / notes…" style="width:100%;min-height:52px;margin-bottom:8px;">' + esc(j.notes || '') + '</textarea>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<button id="btnSaveJudgment" class="primary">Save Judgment</button>' +
            (canAdopt ? '<button id="btnAdoptWinner">Adopt Winner Files</button>' : '') +
          '</div>' +
        '</div>' +

        '<details class="disclosure" id="deepTelemetry"' + openAttr + '>' +
          '<summary>Detailed Telemetry, Charts &amp; Workspace Diffs</summary>' +
          '<div class="disclosure-body">' +
            '<div class="kpi-grid">' +
              '<div class="kpi-card"><div class="kpi-label">Agents Run</div><div class="kpi-val">' + cands.length + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Elapsed Span</div><div class="kpi-val">' + fmtDuration(minDur) + ' – ' + fmtDuration(maxDur) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Total Tokens</div><div class="kpi-val">' + fmtTokens(totalTokensTask) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Total Cost</div><div class="kpi-val">' + (totalCost > 0 ? fmtCost(totalCost) : '—') + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Files Touched</div><div class="kpi-val">' + allFiles.length + '</div></div>' +
            '</div>' +
            '<div class="tbl-wrap"><table><thead><tr>' +
              '<th>Configuration</th><th class="num">Exit</th><th>Started → Finished</th>' +
              '<th class="num">Input</th><th class="num">Cached (Hit)</th><th class="num">Output</th><th class="num">Reasoning</th><th class="num">Total Tok</th>' +
              '<th class="num">Cost</th><th class="num">Turns/Tools</th><th class="num">Files</th>' +
            '</tr></thead><tbody>' + fullRows + '</tbody></table></div>' +
            '<div class="charts-2">' +
              '<div class="chart-card"><div class="chart-title">Elapsed Wall-Clock Time</div>' + svgElapsedChart(task) + '</div>' +
              '<div class="chart-card"><div class="chart-title">Token Usage Breakdown</div>' + svgTokenChart(task) + '</div>' +
            '</div>' +
            '<div class="section-h"><span>Workspace File Changes</span></div>' +
            filesMatrix +
            (selectedDiff ? '<div class="diff-viewer"><div style="font-weight:700;margin-bottom:6px;font-family:inherit;">Diff: ' + esc(selectedDiff.relPath) + '</div>' + formatDiffLines(selectedDiff.text) + '</div>' : '') +
            '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">' +
              '<button data-action="exportFmt" data-fmt="csv">Export CSV</button>' +
              '<button data-action="exportFmt" data-fmt="json">Export JSON</button>' +
            '</div>' +
          '</div>' +
        '</details>';
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
            ? 'rgba(42,140,130,0.2)'
            : (rec.losses > rec.wins ? 'rgba(208,101,79,0.18)' : 'rgba(127,127,127,0.1)');
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
      const openAttr = state.expandDetails ? ' open' : '';

      const headMeta = '<div class="board-head-meta">' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">' +
          '<select id="fltTag" title="Filter by tag"><option value="">All tags</option>' +
            allTags.map((tg) => '<option value="' + esc(tg) + '"' + (tg === filterTag ? ' selected' : '') + '>' + esc(tg) + '</option>').join('') +
          '</select>' +
          '<select id="fltHarness" title="Filter by harness"><option value="">All harnesses</option>' +
            allHarnesses.map((h) => '<option value="' + esc(h) + '"' + (h === filterHarness ? ' selected' : '') + '>' + esc(h) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="muted" style="font-size:12px;">' +
          (t.totalTasks || 0) + ' tasks · ' + (t.judgedTasks || 0) + ' judged · ' + fmtTokens(t.totalTokens) + ' total tokens' +
        '</div>' +
      '</div>';

      // Clean Minimalist Primary Leaderboard
      const cleanRows = configs.map((c, idx) => {
        const wr = c.nJudged ? ((c.winRate * 100).toFixed(0) + '%') : '—';
        const sc = c.scoreMean !== null ? c.scoreMean.toFixed(2) : '—';
        const elo = c.nJudged ? Math.round(c.elo) : '—';
        const medLine = fmtDuration(c.durationMedMs) + ' · ' + fmtTokens(c.tokensMed);
        return '<tr>' +
          '<td><span class="rank-pill' + (idx === 0 && c.nJudged ? ' r1' : '') + '">#' + (idx + 1) + '</span></td>' +
          '<td><strong>' + esc(c.configKey) + '</strong> <span class="muted" style="font-size:11px;">(' + c.nCompleted + '/' + c.nRuns + ')</span></td>' +
          '<td class="num"><strong>' + elo + '</strong></td>' +
          '<td class="num">' + wr + '</td>' +
          '<td class="num">' + sc + '</td>' +
          '<td class="num muted">' + medLine + '</td>' +
        '</tr>';
      }).join('');

      // Detailed Statistical Rows (inside collapsible disclosure)
      const ciRows = configs.map((c) => {
        const wr = c.nJudged ? ((c.winRate * 100).toFixed(1) + '%<span class="ci-sub">[' + (c.winCi[0] * 100).toFixed(0) + '%, ' + (c.winCi[1] * 100).toFixed(0) + '%]</span>') : '—';
        const sc = c.scoreMean !== null ? (c.scoreMean.toFixed(2) + '<span class="ci-sub">[' + c.scoreCi[0].toFixed(2) + ', ' + c.scoreCi[1].toFixed(2) + ']</span>') : '—';
        const elo = c.nJudged ? (Math.round(c.elo) + '<span class="ci-sub">[' + Math.round(c.eloCi[0]) + ', ' + Math.round(c.eloCi[1]) + ']</span>') : '—';
        const dur = c.durationMedMs !== null ? (fmtDuration(c.durationMedMs) + '<span class="ci-sub">[' + fmtDuration(c.durationCiMs[0]) + ', ' + fmtDuration(c.durationCiMs[1]) + ']</span>') : '—';
        const tok = c.tokensMed !== null ? (fmtTokens(c.tokensMed) + '<span class="ci-sub">[' + fmtTokens(c.tokensCi[0]) + ', ' + fmtTokens(c.tokensCi[1]) + ']</span>') : '—';
        const cac = c.cacheHitMean !== null ? ((c.cacheHitMean * 100).toFixed(1) + '%') : '—';
        return '<tr>' +
          '<td><strong>' + esc(c.configKey) + '</strong></td>' +
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
          const icon = tk.judgment.judgeType === 'agent' ? '⚡ ' : '★ ';
          if (tk.judgment.isTie) winLabel = '<span class="badge winner">' + icon + 'Tie</span>';
          else if (tk.judgment.winnerId) {
            const wc = cs.find((c) => c.id === tk.judgment.winnerId);
            if (wc) winLabel = '<span class="badge winner">' + icon + esc(wc.configKey) + '</span>';
          }
        }
        return '<tr class="clickable-row" data-open-task="' + esc(tk.id) + '">' +
          '<td><strong>' + esc(tk.title) + '</strong></td>' +
          '<td>' + winLabel + '</td>' +
          '<td class="muted since-age" data-iso="' + esc(tk.createdAt) + '">' + fmtSince(tk.createdAt) + '</td>' +
          '<td class="num muted">' + fmtDuration(maxMs) + ' · ' + fmtTokens(totTok) + '</td>' +
        '</tr>';
      }).join('');

      viewBoard.innerHTML =
        headMeta +
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Rank</th><th>Configuration</th><th class="num">Elo</th><th class="num">Win Rate</th><th class="num">Avg Score</th><th class="num">Med. Time · Tokens</th>' +
        '</tr></thead><tbody>' + (cleanRows || '<tr><td colspan="6" class="muted">No runs recorded yet.</td></tr>') + '</tbody></table></div>' +

        '<details class="disclosure" id="deepStats"' + openAttr + '>' +
          '<summary>Statistical Details, 95% CIs, Plots &amp; Pairwise Matrix</summary>' +
          '<div class="disclosure-body">' +
            '<div class="kpi-grid">' +
              '<div class="kpi-card"><div class="kpi-label">Total Tasks</div><div class="kpi-val">' + (t.totalTasks || 0) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Judged Tasks</div><div class="kpi-val">' + (t.judgedTasks || 0) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Agent Runs</div><div class="kpi-val">' + (t.totalRuns || 0) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Cumulative Tokens</div><div class="kpi-val">' + fmtTokens(t.totalTokens) + '</div></div>' +
              '<div class="kpi-card"><div class="kpi-label">Cumulative Time</div><div class="kpi-val">' + fmtDuration(t.totalDurationMs) + '</div></div>' +
            '</div>' +
            '<div class="tbl-wrap"><table><thead><tr>' +
              '<th>Configuration</th><th class="num">W-T-L</th><th class="num">Win Rate (95% CI)</th>' +
              '<th class="num">Mean Score (95% CI)</th><th class="num">Elo (95% CI)</th><th class="num">Med. Time</th><th class="num">Med. Tokens</th>' +
              '<th class="num">Cache Hit</th><th class="num">Med. Cost</th>' +
            '</tr></thead><tbody>' + (ciRows || '<tr><td colspan="9" class="muted">No runs recorded.</td></tr>') + '</tbody></table></div>' +
            '<div class="charts-2">' +
              '<div class="chart-card"><div class="chart-title">Quality / Win Rate with 95% Error Bars</div>' + svgForestPlot(configs) + '</div>' +
              '<div class="chart-card"><div class="chart-title">Quality vs. Median Elapsed Time</div>' + svgParetoPlot(configs) + '</div>' +
            '</div>' +
            '<div class="chart-card" style="margin-bottom:10px;"><div class="chart-title">Pairwise Head-to-Head Matrix (W-T-L)</div>' + svgPairwiseMatrix(board) + '</div>' +
            '<div style="display:flex;gap:8px;justify-content:flex-end;">' +
              '<button data-action="exportFmt" data-fmt="csv">Export CSV</button>' +
              '<button data-action="exportFmt" data-fmt="json">Export JSON</button>' +
            '</div>' +
          '</div>' +
        '</details>' +

        '<div class="section-h"><span>Recent Runs</span></div>' +
        '<div class="tbl-wrap"><table><thead><tr>' +
          '<th>Task</th><th>Winner</th><th>When</th><th class="num">Time · Tokens</th>' +
        '</tr></thead><tbody>' + (ledgerRows || '<tr><td colspan="4" class="muted">No matching runs.</td></tr>') + '</tbody></table></div>';
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

    viewRun.addEventListener('change', (e) => {
      if (['judgeHarness', 'judgeModel', 'judgeEffort', 'judgeBlind', 'judgeRubric'].includes(e.target.id)) {
        readJudgeInputsFromDom();
      }
    });

    viewRun.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action], button#btnSaveJudgment, button#btnAdoptWinner, button#btnCopyPrompt, button#btnRunAiJudge, button#btnCancelAiJudge, button#btnSaveJudgeCfg');
      if (!btn) return;
      const taskId = state.selectedTaskId;
      if (btn.id === 'btnCopyPrompt') {
        const task = (state.tasks || []).find((t) => t.id === taskId);
        if (task && navigator.clipboard) {
          navigator.clipboard.writeText(task.prompt || '');
          btn.textContent = 'Copied ✓';
          setTimeout(() => { btn.textContent = 'Copy Prompt'; }, 1500);
        }
        return;
      }
      if (btn.id === 'btnSaveJudgeCfg') {
        const jCfg = readJudgeInputsFromDom();
        vscode.postMessage({ type: 'saveJudgeConfig', payload: jCfg });
        return;
      }
      if (btn.id === 'btnRunAiJudge') {
        judgeErr = '';
        const jCfg = readJudgeInputsFromDom();
        vscode.postMessage({ type: 'runAgentJudge', taskId, judgeConfig: jCfg });
        return;
      }
      if (btn.id === 'btnCancelAiJudge') {
        vscode.postMessage({ type: 'cancelAgentJudge', taskId });
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
        btnBlind.textContent = 'Blind: OFF';
        btnBlind.classList.remove('primary');
        vscode.postMessage({
          type: 'saveJudgment',
          taskId,
          payload: { judgeType: 'human', blindedWhenJudged: wasBlinded, winnerId, isTie, scores, notes },
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
      } else if (action === 'openIdeFile') {
        vscode.postMessage({ type: 'openFile', taskId, candId: cid, relPath });
      } else if (action === 'respMode') {
        respViewModes[cid] = btn.getAttribute('data-mode') || 'response';
        renderRunView();
      } else if (action === 'respToggleSrc') {
        respRawSrc[cid] = !respRawSrc[cid];
        renderRunView();
      } else if (action === 'exportFmt') {
        vscode.postMessage({ type: 'export', format: btn.getAttribute('data-fmt') });
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
      const expBtn = e.target.closest('button[data-action="exportFmt"]');
      if (expBtn) {
        vscode.postMessage({ type: 'export', format: expBtn.getAttribute('data-fmt') });
        return;
      }
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
        if (!draftJudgeCfg && state.judgeConfig) {
          draftJudgeCfg = { ...state.judgeConfig };
        }
        if (msg.payload && typeof msg.payload.blindMode === 'boolean') {
          blindMode = msg.payload.blindMode;
          btnBlind.textContent = blindMode ? 'Blind: ON' : 'Blind: OFF';
          btnBlind.classList.toggle('primary', blindMode);
        }
        if (msg.payload && msg.payload.tab) setTab(msg.payload.tab);
        renderAll();
      } else if (msg.type === 'diffLoaded') {
        selectedDiff = msg.payload;
        renderRunView();
      } else if (msg.type === 'fileContentLoaded') {
        const p = msg.payload || {};
        const ck = p.taskId + '::' + p.candId + '::' + p.relPath;
        fileCache[ck] = { text: p.text || '', error: p.error || null };
        renderRunView();
      } else if (msg.type === 'judgeStatus') {
        const p = msg.payload || {};
        state.judgingTaskId = p.running ? p.taskId : null;
        state.judgingLabel = p.label || '';
        judgeErr = p.error || '';
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
