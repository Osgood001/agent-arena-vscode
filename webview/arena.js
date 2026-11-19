'use strict';

const { makeNonce, sharedCss, browserFormatHelpers } = require('./common');

function renderArenaHtml(webview) {
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
    html, body { height: 100%; overflow: hidden; }
    body {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .topbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      border-bottom: 1px solid var(--aa-border);
      background: var(--aa-card);
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .preset-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-bottom: 1px solid var(--aa-border);
      background: rgba(127, 127, 127, 0.04);
    }
    .preset-chip {
      font-size: 11.5px;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--aa-border);
      background: transparent;
      color: var(--aa-fg);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .preset-chip.selected {
      background: rgba(42, 140, 130, 0.18);
      border-color: var(--aa-teal);
      font-weight: 600;
    }
    .preset-chip.unavailable { opacity: 0.45; }
    .custom-drawer {
      display: none;
      padding: 8px 12px;
      border-bottom: 1px solid var(--aa-border);
      background: var(--aa-card);
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }
    .custom-drawer.open { display: flex; }
    .columns-wrap {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      gap: 10px;
      padding: 10px 12px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .pane {
      flex: 1 1 320px;
      min-width: 310px;
      height: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--aa-border);
      border-radius: 6px;
      background: var(--aa-card);
      overflow: hidden;
    }
    .pane-head {
      padding: 8px 10px;
      border-bottom: 1px solid var(--aa-border);
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(127, 127, 127, 0.05);
    }
    .pane-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
    }
    .pane-name { font-weight: 700; font-size: 13px; word-break: break-word; }
    .pane-sub { font-size: 11px; color: var(--aa-muted); }
    .pane-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      font-size: 11.5px;
    }
    .pane-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 4px;
      padding: 5px 10px;
      border-bottom: 1px solid var(--aa-border);
      font-size: 11px;
      background: rgba(127, 127, 127, 0.02);
    }
    .metric-cell {
      display: flex;
      flex-direction: column;
    }
    .metric-label { font-size: 10px; color: var(--aa-muted); }
    .metric-val { font-weight: 600; font-family: var(--vscode-editor-font-family, monospace); }
    .pane-tabs {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-bottom: 1px solid var(--aa-border);
      font-size: 11px;
      flex-wrap: wrap;
    }
    .pane-tab-group, .pane-filters {
      display: inline-flex;
      gap: 3px;
      align-items: center;
    }
    .pane-tab, .pane-filter {
      padding: 2px 7px;
      border-radius: 3px;
      border: 1px solid transparent;
      background: transparent;
      font-size: 11px;
    }
    .pane-tab.active, .pane-filter.active {
      border-color: var(--aa-border);
      background: rgba(127, 127, 127, 0.16);
      font-weight: 600;
    }
    .pane-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 8px 10px;
      font-size: 12px;
    }
    .feed-item {
      margin-bottom: 7px;
      padding: 5px 7px;
      border-radius: 4px;
      border-left: 3px solid var(--aa-border);
      background: rgba(127, 127, 127, 0.06);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .feed-item.assistant { border-left-color: var(--aa-teal); }
    .feed-item.tool {
      border-left-color: var(--aa-blue);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
    }
    .feed-item.tool_result {
      border-left-color: rgba(127, 127, 127, 0.45);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      color: var(--aa-muted);
    }
    .feed-item.thinking {
      border-left-color: var(--aa-gold);
      color: var(--aa-muted);
      font-style: italic;
      font-size: 11.5px;
    }
    .feed-item.error, .feed-item.stderr {
      border-left-color: var(--aa-err-fg);
      color: var(--aa-err-fg);
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
    }
    .feed-item.notice {
      border-left-color: var(--aa-teal);
      background: rgba(42, 140, 130, 0.12);
    }
    .feed-kind {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--aa-muted);
      margin-bottom: 2px;
      display: block;
    }
    .raw-box {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11px;
      margin: 0;
    }
    .pane-foot {
      padding: 6px 10px;
      border-top: 1px solid var(--aa-border);
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: rgba(127, 127, 127, 0.04);
      font-size: 11px;
    }
    .file-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 58px;
      overflow-y: auto;
    }
    .file-chip {
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 3px;
      border: 1px solid var(--aa-border);
      background: rgba(127, 127, 127, 0.1);
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .file-chip .tag-A { color: var(--aa-ok-fg); font-weight: 700; }
    .file-chip .tag-M { color: var(--aa-warn-fg); font-weight: 700; }
    .file-chip .tag-D { color: var(--aa-err-fg); font-weight: 700; }
    .composer {
      border-top: 1px solid var(--aa-border);
      background: var(--aa-card);
      padding: 9px 12px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .composer-row {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }
    .composer textarea {
      flex: 1 1 auto;
      min-height: 54px;
      max-height: 160px;
    }
    .composer-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }
    .composer-inputs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .tutorial-banner {
      display: none;
      margin: 8px 12px 0;
      padding: 10px 12px;
      border-radius: 6px;
      border: 1px solid rgba(42, 140, 130, 0.55);
      background: rgba(42, 140, 130, 0.08);
      gap: 8px;
      flex-direction: column;
    }
    .tutorial-banner.open { display: flex; }
    .tutorial-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tutorial-steps {
      display: grid;
      grid-template-columns: repeat(4, minmax(150px, 1fr));
      gap: 6px;
    }
    .t-step {
      border: 1px solid var(--aa-border);
      border-radius: 5px;
      padding: 6px 8px;
      background: var(--aa-card);
      font-size: 11.5px;
    }
    .t-step.active {
      border-color: var(--aa-teal);
      box-shadow: 0 0 0 1px rgba(42, 140, 130, 0.35);
    }
    .t-step.done {
      border-color: rgba(63, 185, 80, 0.6);
      background: rgba(63, 185, 80, 0.08);
    }
    .t-step-title { font-weight: 700; font-size: 11.5px; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <strong>Agent Arena</strong>
      <select id="taskSelect" title="Select active or historical task"></select>
      <button id="btnNewDraft" title="Clear and compose a fresh side-by-side run">+ New Run</button>
      <button id="btnRerunTask" title="Re-run this task with the same prompt and agent columns" disabled>↻ Re-run</button>
      <span id="sinceBadge" class="muted" style="font-size:11.5px;"></span>
    </div>
    <div class="topbar-right">
      <button id="btnStopAll" class="danger" disabled>Stop All</button>
      <button id="btnSettings" title="Configure Agent Arena settings (permission &amp; sandbox modes)">Settings ⚙</button>
      <button id="btnOpenAnalysis">Open Analysis &amp; Telemetry ↗</button>
    </div>
  </div>

  <div id="presetBar" class="preset-bar"></div>

  <div id="customDrawer" class="custom-drawer">
    <select id="custHarness">
      <option value="codex">codex</option>
      <option value="claude">claude</option>
      <option value="opencode">opencode</option>
      <option value="pi">pi</option>
      <option value="dsh">dsh</option>
      <option value="custom">custom shell</option>
    </select>
    <input id="custModel" type="text" placeholder="Model (optional, e.g. sonnet, o3, deepseek-chat)" style="width:225px;" />
    <input id="custEffort" type="text" placeholder="Effort (low/medium/high/xhigh)" style="width:165px;" />
    <input id="custArgs" type="text" placeholder="Extra args (optional)" style="width:150px;" />
    <input id="custTpl" type="text" placeholder="Custom cmd template ({prompt_file}, {cwd})" style="width:240px;display:none;" />
    <button id="btnAddCustom" class="primary">Add Column</button>
    <button id="btnCloseCustom">Close</button>
  </div>

  <div id="tutorialBanner" class="tutorial-banner"></div>

  <div id="columnsWrap" class="columns-wrap"></div>

  <div class="composer">
    <div class="composer-row">
      <textarea id="promptInput" placeholder="Enter one shared prompt to launch all selected agents concurrently side-by-side… (Cmd+Enter to run)"></textarea>
      <div style="display:flex;flex-direction:column;gap:5px;min-width:190px;">
        <button id="btnLaunch" class="primary" style="justify-content:center;padding:9px 14px;">Launch All Concurrently</button>
        <div id="isolationHint" class="muted" style="font-size:10.5px;text-align:center;"></div>
      </div>
    </div>
    <div class="composer-meta">
      <div class="composer-inputs">
        <label>Title <input id="titleInput" type="text" placeholder="Optional run title" style="width:180px;" /></label>
        <label>Tags <input id="tagsInput" type="text" placeholder="e.g. paper, refactor" style="width:140px;" /></label>
        <label>Isolation
          <select id="isolationSelect">
            <option value="direct">Direct (Shared Workspace)</option>
            <option value="scratch">Isolated Scratch Folder (Instant)</option>
            <option value="apfs-cow">Isolated (CoW Clone)</option>
            <option value="git-worktree">Isolated (Git Worktree)</option>
          </select>
        </label>
      </div>
      <div class="muted" id="composerStatus">Select agents above, write prompt, launch concurrently.</div>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    ${browserFormatHelpers()}

    let state = {
      presets: [],
      tutorialPresets: [],
      harnesses: {},
      tasks: [],
      activeTaskId: null,
      activeTask: null,
      defaultIsolationMode: 'direct',
      settingsSummary: { claudePermissionMode: 'acceptEdits', codexSandboxMode: 'workspace-write' },
      tutorial: { visible: false, taskId: null, completed: false },
    };
    let draftAgents = [];
    let paneModes = {};   // candId -> 'feed' | 'raw' | 'final'
    let paneFilters = {}; // candId -> 'all' | 'tools' | 'errors'
    let rawCache = {};    // candId -> string
    let isLaunching = false;
    const TUTORIAL_PROMPT = 'Inspect the current workspace top-level files and summarize in 5 concise bullet points what this repository/workspace contains and how its main workflow is structured. Do not edit any existing files.';

    const taskSelect = document.getElementById('taskSelect');
    const presetBar = document.getElementById('presetBar');
    const tutorialBanner = document.getElementById('tutorialBanner');
    const columnsWrap = document.getElementById('columnsWrap');
    const promptInput = document.getElementById('promptInput');
    const titleInput = document.getElementById('titleInput');
    const tagsInput = document.getElementById('tagsInput');
    const isolationSelect = document.getElementById('isolationSelect');
    const isolationHint = document.getElementById('isolationHint');
    const btnLaunch = document.getElementById('btnLaunch');
    const btnRerunTask = document.getElementById('btnRerunTask');
    const btnStopAll = document.getElementById('btnStopAll');
    const btnSettings = document.getElementById('btnSettings');
    const btnOpenAnalysis = document.getElementById('btnOpenAnalysis');
    const sinceBadge = document.getElementById('sinceBadge');
    const composerStatus = document.getElementById('composerStatus');

    function configKeyOf(c) {
      const m = (c.model || '').trim() || 'default';
      const e = (c.effort || '').trim();
      return e ? (c.harness + ' · ' + m + ' (' + e + ')') : (c.harness + ' · ' + m);
    }

    function updateIsolationHint() {
      const v = isolationSelect.value;
      if (v === 'direct') {
        isolationHint.textContent = 'Shared workspace (no isolation, instant)';
      } else if (v === 'scratch') {
        isolationHint.textContent = 'Clean per-agent output folder (instant)';
      } else if (v === 'git-worktree') {
        isolationHint.textContent = 'Detached git worktree per agent';
      } else {
        isolationHint.textContent = 'CoW clone (heavy dirs symlinked)';
      }
    }
    isolationSelect.addEventListener('change', updateIsolationHint);

    document.getElementById('custHarness').addEventListener('change', (e) => {
      document.getElementById('custTpl').style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
    });

    document.getElementById('btnAddCustom').addEventListener('click', () => {
      const harness = document.getElementById('custHarness').value;
      const model = document.getElementById('custModel').value.trim();
      const effort = document.getElementById('custEffort').value.trim();
      const argsRaw = document.getElementById('custArgs').value.trim();
      const extraArgs = argsRaw ? argsRaw.split(/\\s+/) : [];
      const commandTemplate = document.getElementById('custTpl').value.trim();
      const item = { harness, model, effort, extraArgs, commandTemplate };
      item.label = configKeyOf(item);
      draftAgents.push(item);
      if (state.activeTask) {
        // Switching to draft view when customizing columns for a new launch
        state.activeTaskId = null;
        state.activeTask = null;
      }
      renderAll();
    });

    document.getElementById('btnCloseCustom').addEventListener('click', () => {
      document.getElementById('customDrawer').classList.remove('open');
    });

    document.getElementById('btnNewDraft').addEventListener('click', () => {
      state.activeTaskId = null;
      state.activeTask = null;
      btnOpenAnalysis.classList.remove('pulse');
      renderAll();
      promptInput.focus();
    });

    taskSelect.addEventListener('change', () => {
      const val = taskSelect.value;
      if (!val) {
        state.activeTaskId = null;
        state.activeTask = null;
        renderAll();
      } else {
        vscode.postMessage({ type: 'selectTask', taskId: val });
      }
    });

    btnRerunTask.addEventListener('click', () => {
      if (state.activeTask) {
        composerStatus.textContent = 'Re-running ' + state.activeTask.title + '…';
        vscode.postMessage({ type: 'rerunTask', taskId: state.activeTask.id });
      }
    });

    btnStopAll.addEventListener('click', () => {
      if (state.activeTask) {
        vscode.postMessage({ type: 'cancelTask', taskId: state.activeTask.id });
      }
    });

    btnSettings.addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    btnOpenAnalysis.addEventListener('click', () => {
      vscode.postMessage({ type: 'openAnalysis', taskId: state.activeTask ? state.activeTask.id : null });
    });

    function launchCurrent() {
      if (isLaunching) return;
      const prompt = promptInput.value.trim();
      if (!prompt) {
        composerStatus.textContent = 'Enter a prompt first.';
        promptInput.focus();
        return;
      }
      const configs = state.activeTask
        ? state.activeTask.candidates.map((c) => ({
            label: c.label,
            harness: c.harness,
            model: c.model,
            effort: c.effort,
            extraArgs: c.extraArgs || [],
            commandTemplate: c.commandTemplate || '',
          }))
        : draftAgents;
      if (!configs.length) {
        composerStatus.textContent = 'Select at least one agent configuration above.';
        return;
      }
      isLaunching = true;
      btnLaunch.disabled = true;
      setTimeout(() => {
        isLaunching = false;
        btnLaunch.disabled = false;
      }, 2500);
      btnOpenAnalysis.classList.remove('pulse');
      composerStatus.textContent = 'Preparing workspace & launching ' + configs.length + ' agents concurrently…';
      vscode.postMessage({
        type: 'launchTask',
        payload: {
          title: titleInput.value.trim(),
          tags: tagsInput.value.trim(),
          prompt,
          isolationMode: isolationSelect.value,
          configs,
        },
      });
    }

    btnLaunch.addEventListener('click', launchCurrent);
    promptInput.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        launchCurrent();
      }
    });

    function renderTopControls() {
      const opts = ['<option value="">+ Compose New Run</option>'];
      for (const t of state.tasks || []) {
        const sel = state.activeTask && state.activeTask.id === t.id ? ' selected' : '';
        opts.push('<option value="' + esc(t.id) + '"' + sel + '>' + esc(t.title) + ' (' + fmtSince(t.createdAt) + ')</option>');
      }
      taskSelect.innerHTML = opts.join('');

      if (state.settingsSummary) {
        btnSettings.title =
          'Agent Arena Settings (Claude permission: ' +
          (state.settingsSummary.claudePermissionMode || 'acceptEdits') +
          ' | Codex sandbox: ' +
          (state.settingsSummary.codexSandboxMode || 'workspace-write') +
          ')';
      }

      if (state.activeTask) {
        sinceBadge.textContent = 'Created ' + fmtTimeShort(state.activeTask.createdAt) + ' (' + fmtSince(state.activeTask.createdAt) + ') · ' + state.activeTask.isolationMode;
        const anyRunning = (state.activeTask.candidates || []).some((c) => c.status === 'running' || c.status === 'pending');
        btnStopAll.disabled = !anyRunning;
        btnRerunTask.disabled = anyRunning;
        if (!anyRunning && (state.activeTask.candidates || []).length > 0) {
          btnOpenAnalysis.classList.add('pulse');
        } else {
          btnOpenAnalysis.classList.remove('pulse');
        }
      } else {
        sinceBadge.textContent = 'Draft · ' + draftAgents.length + ' agents selected';
        btnStopAll.disabled = true;
        btnRerunTask.disabled = true;
      }
    }

    function renderPresetBar() {
      const activeList = state.activeTask ? [] : draftAgents;
      const selectedKeys = new Set(activeList.map((c) => configKeyOf(c)));
      const chips = (state.presets || []).map((p, idx) => {
        const key = configKeyOf(p);
        const info = (state.harnesses || {})[p.harness];
        const avail = info ? info.available : true;
        const sel = !state.activeTask && selectedKeys.has(key);
        return '<button class="preset-chip' + (sel ? ' selected' : '') + (avail ? '' : ' unavailable') + '" data-preset-idx="' + idx + '" title="' + esc(avail ? 'Toggle ' + key : 'Binary not detected in PATH') + '">' +
          '<span class="dot ' + (avail ? 'ok' : 'no') + '"></span>' +
          esc(p.label || key) +
          '</button>';
      });
      chips.push('<button class="preset-chip" id="btnToggleCustom">+ Custom</button>');
      presetBar.innerHTML = chips.join('');
    }

    presetBar.addEventListener('click', (e) => {
      if (e.target.closest('#btnToggleCustom')) {
        document.getElementById('customDrawer').classList.toggle('open');
        return;
      }
      const btn = e.target.closest('button[data-preset-idx]');
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-preset-idx'));
      const preset = (state.presets || [])[idx];
      if (!preset) return;
      if (state.activeTask) {
        // Fork into draft mode with preset toggled
        state.activeTaskId = null;
        state.activeTask = null;
      }
      const key = configKeyOf(preset);
      const found = draftAgents.findIndex((c) => configKeyOf(c) === key);
      if (found >= 0) draftAgents.splice(found, 1);
      else draftAgents.push({ ...preset, label: preset.label || key });
      renderAll();
    });

    function filterFeedItems(feed, filter) {
      const list = Array.isArray(feed) ? feed : [];
      if (filter === 'tools') {
        return list.filter((x) => x.kind === 'tool' || x.kind === 'tool_result');
      }
      if (filter === 'errors') {
        return list.filter((x) => x.kind === 'error' || x.kind === 'stderr' || x.kind === 'notice');
      }
      return list;
    }

    function renderFeedItems(feed, filter = 'all') {
      const items = filterFeedItems(feed, filter);
      if (!items.length) {
        return '<div class="muted" style="padding:12px 4px;">' + (feed && feed.length ? 'No matching events for this filter.' : 'Waiting for output…') + '</div>';
      }
      return items.map((item) => {
        return '<div class="feed-item ' + esc(item.kind || 'log') + '">' +
          '<span class="feed-kind">' + esc(item.kind || 'log') + '</span>' +
          esc(item.text || '') +
        '</div>';
      }).join('');
    }

    function renderFilesList(cand, isDirect = false) {
      const ch = cand.changedFiles || {};
      const chips = [];
      for (const f of ch.added || []) {
        chips.push('<button class="file-chip" data-action="openFile" data-cid="' + esc(cand.id) + '" data-path="' + esc(f) + '"><span class="tag-A">A</span> ' + esc(f) + '</button>');
      }
      for (const f of ch.modified || []) {
        chips.push('<button class="file-chip" data-action="diffFile" data-cid="' + esc(cand.id) + '" data-path="' + esc(f) + '" title="Open diff vs baseline"><span class="tag-M">M</span> ' + esc(f) + '</button>');
      }
      for (const f of ch.deleted || []) {
        chips.push('<span class="file-chip"><span class="tag-D">D</span> ' + esc(f) + '</span>');
      }
      if (!chips.length) return '<span class="muted">No workspace file changes recorded.</span>';
      const prefix = isDirect
        ? '<div class="muted" style="font-size:10.5px;margin-bottom:3px;">Shared workspace changes (use Scratch/CoW/Worktree for isolated per-agent diffs)</div>'
        : '';
      return prefix + '<div class="file-chips">' + chips.join('') + '</div>';
    }

    function renderPaneFootHtml(cand, isIsolated) {
      const ch = cand.changedFiles || {};
      const fileCount = (ch.added || []).length + (ch.modified || []).length + (ch.deleted || []).length;
      return '<div class="pane-files-list">' + renderFilesList(cand, !isIsolated) + '</div>' +
        '<div style="display:flex;gap:6px;justify-content:flex-end;">' +
          '<button data-action="copyFinal" data-cid="' + esc(cand.id) + '" style="font-size:11px;padding:2px 8px;">Copy Output</button>' +
          (isIsolated && fileCount > 0 ? '<button data-action="adoptCand" data-cid="' + esc(cand.id) + '" style="font-size:11px;padding:2px 8px;">Adopt into Workspace</button>' : '') +
        '</div>';
    }

    function statusBadgeHtml(c) {
      if (c.status === 'running') return '<span class="badge running"><span class="spinner"></span>Running</span>';
      if (c.status === 'pending') return '<span class="badge running">Queued</span>';
      if (c.status === 'done') return '<span class="badge done">Done ✓</span>';
      if (c.status === 'failed') return '<span class="badge failed">Failed ✗</span>';
      if (c.status === 'cancelled') return '<span class="badge cancelled">Stopped</span>';
      if (c.status === 'interrupted') return '<span class="badge cancelled">Interrupted</span>';
      return '<span class="badge">Ready</span>';
    }

    function renderPaneBodyContent(cand, mode, filter = 'all') {
      if (mode === 'raw') {
        const raw = rawCache[cand.id];
        if (raw === undefined) {
          vscode.postMessage({ type: 'loadRawLog', taskId: state.activeTask.id, candId: cand.id });
          return '<div class="muted">Loading raw stdout/stderr…</div>';
        }
        return '<pre class="raw-box">' + esc(raw || '(empty)') + '</pre>';
      }
      if (mode === 'final') {
        const txt = cand.finalText || cand.error || '(No final assistant message yet)';
        return '<pre class="raw-box" style="font-family:inherit;font-size:12.5px;">' + esc(txt) + '</pre>';
      }
      return renderFeedItems(cand.feedPreview || [], filter);
    }

    function renderColumns() {
      if (!state.activeTask) {
        if (!draftAgents.length) {
          columnsWrap.innerHTML = '<div class="card muted" style="margin:auto;max-width:460px;text-align:center;">Click agent preset chips above to add side-by-side columns, enter one prompt below, and launch all agents concurrently.</div>';
          return;
        }
        columnsWrap.innerHTML = draftAgents.map((c, idx) => {
          const key = configKeyOf(c);
          return '<div class="pane">' +
            '<div class="pane-head">' +
              '<div class="pane-title-row">' +
                '<div><div class="pane-name">' + esc(c.label || key) + '</div><div class="pane-sub">' + esc(key) + '</div></div>' +
                '<button data-action="removeDraft" data-idx="' + idx + '" title="Remove column" style="padding:2px 6px;">×</button>' +
              '</div>' +
              '<div class="pane-status-row"><span class="badge">Ready</span><span class="mono muted">00:00</span></div>' +
            '</div>' +
            '<div class="pane-body muted" style="display:flex;align-items:center;justify-content:center;text-align:center;">Ready to launch with shared prompt below.</div>' +
          '</div>';
        }).join('');
        return;
      }

      const task = state.activeTask;
      const isIsolated = task.isolationMode !== 'direct';
      columnsWrap.innerHTML = (task.candidates || []).map((c) => {
        const mode = paneModes[c.id] || 'feed';
        const filter = paneFilters[c.id] || 'all';
        const tel = c.telemetry || {};
        const ch = c.changedFiles || {};
        const fileCount = (ch.added || []).length + (ch.modified || []).length + (ch.deleted || []).length;
        const elapsed = c.status === 'running' && c.startedAt
          ? fmtDuration(Date.now() - Date.parse(c.startedAt))
          : fmtDuration(c.durationMs);
        const tokStr = tel.totalTokens !== null && tel.totalTokens !== undefined
          ? fmtTokens(tel.totalTokens)
          : (tel.inputTokens !== null ? fmtTokens((tel.inputTokens || 0) + (tel.outputTokens || 0)) : '—');
        const subTok = (tel.inputTokens !== null || tel.outputTokens !== null)
          ? ('in ' + fmtTokens(tel.inputTokens) + ' · cac ' + fmtTokens(tel.cachedTokens) + ' · out ' + fmtTokens(tel.outputTokens))
          : 'awaiting usage';

        return '<div class="pane" data-cand-id="' + esc(c.id) + '">' +
          '<div class="pane-head">' +
            '<div class="pane-title-row">' +
              '<div><div class="pane-name">' + esc(c.label) + '</div><div class="pane-sub">' + esc(c.configKey) + '</div></div>' +
              '<span class="pane-head-actions">' +
                (c.status === 'running'
                  ? '<button class="danger" data-action="cancelCand" data-cid="' + esc(c.id) + '" style="padding:2px 7px;font-size:11px;">Stop</button>'
                  : '') +
              '</span>' +
            '</div>' +
            '<div class="pane-status-row">' +
              '<span class="pane-status-slot">' + statusBadgeHtml(c) + '</span>' +
              '<span class="mono pane-timer" data-status="' + esc(c.status) + '" data-start="' + esc(c.startedAt || '') + '">' + elapsed + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pane-metrics">' +
            '<div class="metric-cell" title="' + esc(subTok) + '"><span class="metric-label">Tokens</span><span class="metric-val pane-tok">' + tokStr + '</span></div>' +
            '<div class="metric-cell"><span class="metric-label">Turns / Tools</span><span class="metric-val pane-turns">' + (tel.numTurns || 0) + ' / ' + (tel.toolCalls || 0) + '</span></div>' +
            '<div class="metric-cell"><span class="metric-label">Cost</span><span class="metric-val pane-cost">' + fmtCost(tel.costUsd) + '</span></div>' +
            '<div class="metric-cell"><span class="metric-label">Files</span><span class="metric-val pane-files">' + fileCount + '</span></div>' +
          '</div>' +
          '<div class="pane-tabs">' +
            '<div class="pane-tab-group">' +
              '<button class="pane-tab' + (mode === 'feed' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="feed">Live Feed</button>' +
              '<button class="pane-tab' + (mode === 'final' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="final">Final Answer</button>' +
              '<button class="pane-tab' + (mode === 'raw' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="raw">Raw Log</button>' +
            '</div>' +
            '<div class="pane-filters" style="display:' + (mode === 'feed' ? 'inline-flex' : 'none') + ';">' +
              '<button class="pane-filter' + (filter === 'all' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="all">All</button>' +
              '<button class="pane-filter' + (filter === 'tools' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="tools">Tools</button>' +
              '<button class="pane-filter' + (filter === 'errors' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="errors">Errors</button>' +
            '</div>' +
          '</div>' +
          '<div class="pane-body">' + renderPaneBodyContent(c, mode, filter) + '</div>' +
          '<div class="pane-foot">' + renderPaneFootHtml(c, isIsolated) + '</div>' +
        '</div>';
      }).join('');
    }

    function patchCandidateInPlace(cand) {
      if (!state.activeTask || state.activeTask.id !== cand.taskId) return;
      const idx = (state.activeTask.candidates || []).findIndex((x) => x.id === cand.id);
      if (idx >= 0) state.activeTask.candidates[idx] = cand;
      const pane = columnsWrap.querySelector('.pane[data-cand-id="' + CSS.escape(cand.id) + '"]');
      if (!pane) {
        renderColumns();
        return;
      }
      const headActions = pane.querySelector('.pane-head-actions');
      if (headActions) {
        headActions.innerHTML = cand.status === 'running'
          ? '<button class="danger" data-action="cancelCand" data-cid="' + esc(cand.id) + '" style="padding:2px 7px;font-size:11px;">Stop</button>'
          : '';
      }

      const statusSlot = pane.querySelector('.pane-status-slot');
      if (statusSlot) statusSlot.innerHTML = statusBadgeHtml(cand);

      const timer = pane.querySelector('.pane-timer');
      if (timer) {
        timer.setAttribute('data-status', cand.status);
        timer.setAttribute('data-start', cand.startedAt || '');
        timer.textContent = cand.status === 'running' && cand.startedAt
          ? fmtDuration(Date.now() - Date.parse(cand.startedAt))
          : fmtDuration(cand.durationMs);
      }

      const tel = cand.telemetry || {};
      const ch = cand.changedFiles || {};
      const fileCount = (ch.added || []).length + (ch.modified || []).length + (ch.deleted || []).length;
      const tokEl = pane.querySelector('.pane-tok');
      if (tokEl) {
        tokEl.textContent = tel.totalTokens !== null && tel.totalTokens !== undefined
          ? fmtTokens(tel.totalTokens)
          : (tel.inputTokens !== null ? fmtTokens((tel.inputTokens || 0) + (tel.outputTokens || 0)) : '—');
      }
      const turnsEl = pane.querySelector('.pane-turns');
      if (turnsEl) turnsEl.textContent = (tel.numTurns || 0) + ' / ' + (tel.toolCalls || 0);
      const costEl = pane.querySelector('.pane-cost');
      if (costEl) costEl.textContent = fmtCost(tel.costUsd);
      const filesEl = pane.querySelector('.pane-files');
      if (filesEl) filesEl.textContent = String(fileCount);

      const mode = paneModes[cand.id] || 'feed';
      const filter = paneFilters[cand.id] || 'all';
      pane.querySelectorAll('.pane-tab[data-action="paneMode"]').forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-mode') === mode);
      });
      const filterWrap = pane.querySelector('.pane-filters');
      if (filterWrap) filterWrap.style.display = mode === 'feed' ? 'inline-flex' : 'none';
      pane.querySelectorAll('.pane-filter[data-action="paneFilter"]').forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-filter') === filter);
      });

      const body = pane.querySelector('.pane-body');
      if (body && mode !== 'raw') {
        const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 32;
        body.innerHTML = renderPaneBodyContent(cand, mode, filter);
        if (atBottom && mode === 'feed') {
          body.scrollTop = body.scrollHeight;
        }
      }
      if (cand.status !== 'running' && mode === 'raw') {
        delete rawCache[cand.id];
      }

      const foot = pane.querySelector('.pane-foot');
      const isIsolated = state.activeTask.isolationMode !== 'direct';
      if (foot) foot.innerHTML = renderPaneFootHtml(cand, isIsolated);

      renderTopControls();
    }

    columnsWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'removeDraft') {
        draftAgents.splice(Number(btn.getAttribute('data-idx')), 1);
        renderAll();
        return;
      }
      const cid = btn.getAttribute('data-cid');
      const taskId = state.activeTask && state.activeTask.id;
      if (action === 'paneMode') {
        paneModes[cid] = btn.getAttribute('data-mode');
        const cand = (state.activeTask.candidates || []).find((x) => x.id === cid);
        if (cand) patchCandidateInPlace({ ...cand, taskId });
        return;
      }
      if (action === 'paneFilter') {
        paneFilters[cid] = btn.getAttribute('data-filter') || 'all';
        paneModes[cid] = 'feed';
        const cand = (state.activeTask.candidates || []).find((x) => x.id === cid);
        if (cand) patchCandidateInPlace({ ...cand, taskId });
        return;
      }
      if (action === 'cancelCand') {
        vscode.postMessage({ type: 'cancelCandidate', taskId, candId: cid });
      } else if (action === 'openFile') {
        vscode.postMessage({ type: 'openFile', taskId, candId: cid, relPath: btn.getAttribute('data-path') });
      } else if (action === 'diffFile') {
        vscode.postMessage({ type: 'diffFile', taskId, candId: cid, relPath: btn.getAttribute('data-path') });
      } else if (action === 'copyFinal') {
        const cand = (state.activeTask.candidates || []).find((x) => x.id === cid);
        if (cand && navigator.clipboard) {
          navigator.clipboard.writeText(cand.finalText || '');
          composerStatus.textContent = 'Copied final output from ' + cand.label;
        }
      } else if (action === 'adoptCand') {
        vscode.postMessage({ type: 'adoptCandidate', taskId, candId: cid });
      }
    });

    function renderTutorialBanner() {
      const tut = state.tutorial || {};
      if (!tut.visible) {
        tutorialBanner.classList.remove('open');
        tutorialBanner.innerHTML = '';
        return;
      }
      tutorialBanner.classList.add('open');
      const hEntries = Object.entries(state.harnesses || {}).filter(([k, v]) => k !== 'custom' && v && v.available).map(([k]) => k);
      const tutTask = tut.taskId ? (state.tasks || []).find((t) => t.id === tut.taskId) : null;
      const cands = tutTask ? (tutTask.candidates || []) : [];
      const anyRunning = tutTask && cands.some((c) => c.status === 'running' || c.status === 'pending');
      const allSettled = tutTask && cands.length > 0 && !anyRunning;
      const isJudged = tutTask && Boolean(tutTask.judgment);

      const s1Done = hEntries.length > 0;
      const s2Done = Boolean(tutTask);
      const s3Done = Boolean(allSettled);
      const s4Done = Boolean(isJudged);

      tutorialBanner.innerHTML =
        '<div class="tutorial-head">' +
          '<div><strong>Welcome to Agent Arena — Live Tutorial</strong> <span class="muted" style="font-size:11.5px;">Run a real multi-agent check on your workspace (not a replay)</span></div>' +
          '<div style="display:flex;gap:6px;align-items:center;">' +
            (!tutTask || allSettled ? '<button id="btnRunTutorial" class="primary">▶ Run Live Tutorial (Real Agents)</button>' : '') +
            (allSettled ? '<button id="btnTutorialAnalyze" class="primary">Open Analysis &amp; Judge ↗</button>' : '') +
            '<button id="btnDismissTutorial" title="Hide tutorial">Dismiss</button>' +
          '</div>' +
        '</div>' +
        '<div class="tutorial-steps">' +
          '<div class="t-step ' + (s1Done ? 'done' : 'active') + '"><div class="t-step-title">1. Detect Harnesses</div><div class="muted">' + (s1Done ? ('Ready: ' + esc(hEntries.join(', '))) : 'No CLIs detected in PATH yet') + '</div></div>' +
          '<div class="t-step ' + (s2Done ? 'done' : 'active') + '"><div class="t-step-title">2. Launch Live Trial</div><div class="muted">Preloads a fast workspace summary prompt across 3 real CLIs</div></div>' +
          '<div class="t-step ' + (s3Done ? 'done' : (anyRunning ? 'active' : '')) + '"><div class="t-step-title">3. Watch Side-by-Side</div><div class="muted">' + (anyRunning ? 'Streaming live tokens & elapsed timers…' : (s3Done ? 'All tutorial panes settled' : 'Columns stream concurrently once launched')) + '</div></div>' +
          '<div class="t-step ' + (s4Done ? 'done' : (allSettled ? 'active' : '')) + '"><div class="t-step-title">4. Analyze &amp; Blind Judge</div><div class="muted">' + (s4Done ? 'First judgment saved to Leaderboard!' : 'Inspect tokens/time & pick a blind winner') + '</div></div>' +
        '</div>';
    }

    tutorialBanner.addEventListener('click', (e) => {
      if (e.target.closest('#btnDismissTutorial')) {
        vscode.postMessage({ type: 'dismissTutorial' });
        return;
      }
      if (e.target.closest('#btnTutorialAnalyze')) {
        const tid = (state.tutorial && state.tutorial.taskId) || (state.activeTask && state.activeTask.id);
        vscode.postMessage({ type: 'openAnalysis', taskId: tid });
        return;
      }
      if (e.target.closest('#btnRunTutorial')) {
        if (isLaunching) return;
        const configs = (state.tutorialPresets && state.tutorialPresets.length) ? state.tutorialPresets : draftAgents;
        if (!configs.length) {
          composerStatus.textContent = 'Select at least one available agent above.';
          return;
        }
        state.activeTaskId = null;
        state.activeTask = null;
        draftAgents = configs.map((c) => ({ ...c }));
        if (!promptInput.value.trim()) promptInput.value = TUTORIAL_PROMPT;
        if (!titleInput.value.trim()) titleInput.value = 'Live Welcome Tutorial';
        if (!tagsInput.value.trim()) tagsInput.value = 'tutorial';
        isolationSelect.value = 'scratch';
        updateIsolationHint();
        isLaunching = true;
        btnLaunch.disabled = true;
        setTimeout(() => {
          isLaunching = false;
          btnLaunch.disabled = false;
        }, 2500);
        composerStatus.textContent = 'Launching live tutorial across ' + configs.length + ' real agents…';
        vscode.postMessage({
          type: 'launchTask',
          payload: {
            isTutorial: true,
            title: titleInput.value.trim(),
            tags: tagsInput.value.trim(),
            prompt: promptInput.value.trim(),
            isolationMode: isolationSelect.value,
            configs,
          },
        });
      }
    });

    function renderAll() {
      renderTopControls();
      renderPresetBar();
      renderTutorialBanner();
      renderColumns();
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'state') {
        const prevMode = isolationSelect.value;
        state = msg.payload || state;
        if (!draftAgents.length && (state.presets || []).length) {
          const avail = state.presets.filter((p) => {
            const info = (state.harnesses || {})[p.harness];
            return info && info.available;
          });
          draftAgents = (avail.length ? avail : state.presets).slice(0, 4).map((p) => ({ ...p }));
        }
        if (state.tutorial && state.tutorial.visible && !state.activeTask && !promptInput.value.trim()) {
          promptInput.value = TUTORIAL_PROMPT;
          titleInput.value = 'Live Welcome Tutorial';
          tagsInput.value = 'tutorial';
          if (state.tutorialPresets && state.tutorialPresets.length) {
            draftAgents = state.tutorialPresets.map((p) => ({ ...p }));
          }
        }
        if (!prevMode || !state.activeTask) {
          isolationSelect.value = state.defaultIsolationMode || 'direct';
        }
        updateIsolationHint();
        renderAll();
        if (state.activeTask) {
          const anyRunning = (state.activeTask.candidates || []).some((c) => c.status === 'running' || c.status === 'pending');
          composerStatus.textContent = anyRunning ? 'Agents running concurrently…' : 'Run complete. Open Analysis & Telemetry for deep comparison.';
        }
      } else if (msg.type === 'candidateProgress') {
        patchCandidateInPlace(msg.payload);
        renderTutorialBanner();
      } else if (msg.type === 'rawLogLoaded') {
        rawCache[msg.payload.candId] = msg.payload.text;
        const pane = columnsWrap.querySelector('.pane[data-cand-id="' + CSS.escape(msg.payload.candId) + '"]');
        if (pane && (paneModes[msg.payload.candId] || 'feed') === 'raw') {
          const body = pane.querySelector('.pane-body');
          if (body) body.innerHTML = '<pre class="raw-box">' + esc(msg.payload.text || '(empty)') + '</pre>';
        }
      } else if (msg.type === 'errorToast') {
        composerStatus.textContent = msg.payload;
      }
    });

    // Live 1s timer tick for running panes and "since created"
    setInterval(() => {
      document.querySelectorAll('.pane-timer[data-status="running"]').forEach((el) => {
        const st = el.getAttribute('data-start');
        if (st) el.textContent = fmtDuration(Date.now() - Date.parse(st));
      });
      if (state.activeTask) {
        sinceBadge.textContent = 'Created ' + fmtTimeShort(state.activeTask.createdAt) + ' (' + fmtSince(state.activeTask.createdAt) + ') · ' + state.activeTask.isolationMode;
      }
    }, 1000);

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

module.exports = { renderArenaHtml };
