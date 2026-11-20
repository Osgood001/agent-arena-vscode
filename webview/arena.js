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
      padding: 8px 14px;
      border-bottom: 1px solid var(--aa-border);
      background: var(--aa-card);
    }
    .topbar-left, .topbar-right {
      display: flex;
      align-items: center;
      gap: 7px;
      flex-wrap: wrap;
    }
    .brand { font-weight: 700; font-size: 13.5px; letter-spacing: -0.01em; margin-right: 2px; }
    .drawer-wrap {
      display: none;
      flex-direction: column;
      gap: 7px;
      padding: 8px 14px;
      border-bottom: 1px solid var(--aa-border);
      background: var(--aa-subtle);
    }
    .drawer-wrap.open { display: flex; }
    .add-mode-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
    }
    .preset-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
    }
    .preset-chip {
      font-size: 11.5px;
      padding: 3px 9px;
      border-radius: 999px;
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      color: var(--aa-fg);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .preset-chip.selected {
      background: rgba(42, 140, 130, 0.16);
      border-color: var(--aa-teal);
      font-weight: 600;
    }
    .preset-chip.unavailable { opacity: 0.45; }
    .custom-drawer {
      display: none;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
      padding-top: 4px;
    }
    .custom-drawer.open { display: flex; }
    .agy-picker {
      display: none;
      flex-direction: column;
      gap: 7px;
      padding: 9px 10px;
      border: 1px solid var(--aa-border);
      border-radius: 6px;
      background: var(--aa-bg);
    }
    .agy-picker.open { display: flex; }
    .agy-picker-top, .agy-picker-opts {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
    }
    .agy-group-pills {
      display: inline-flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .agy-models-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
      gap: 5px;
      max-height: 210px;
      overflow-y: auto;
      padding-top: 2px;
    }
    .agy-model-card {
      text-align: left;
      padding: 5px 8px;
      border-radius: 5px;
      border: 1px solid var(--aa-border);
      background: var(--aa-subtle);
      color: var(--aa-fg);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 1px;
      font-size: 11.5px;
    }
    .agy-model-card:hover { border-color: var(--aa-teal); }
    .agy-model-card.selected {
      background: rgba(42, 140, 130, 0.16);
      border-color: var(--aa-teal);
    }
    .agy-model-id {
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 10.5px;
      color: var(--aa-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cust-agy-opts {
      display: none;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding-top: 4px;
      font-size: 11.5px;
    }
    .cust-agy-opts.open { display: flex; }
    .tutorial-strip {
      display: none;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      padding: 6px 14px;
      border-bottom: 1px solid rgba(42, 140, 130, 0.35);
      background: rgba(42, 140, 130, 0.08);
      font-size: 12px;
    }
    .tutorial-strip.open { display: flex; }
    .tut-steps-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .tut-pill {
      padding: 1px 7px;
      border-radius: 999px;
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      font-size: 11px;
      color: var(--aa-muted);
    }
    .tut-pill.active {
      border-color: var(--aa-teal);
      color: var(--aa-fg);
      font-weight: 600;
    }
    .tut-pill.done {
      border-color: rgba(63, 185, 80, 0.45);
      color: var(--aa-ok-fg);
    }
    .columns-wrap {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      gap: 12px;
      padding: 12px 14px;
      overflow-x: auto;
      overflow-y: hidden;
    }
    .pane {
      flex: 1 1 340px;
      min-width: 310px;
      height: 100%;
      display: flex;
      flex-direction: column;
      border: 1px solid var(--aa-border);
      border-radius: 8px;
      background: var(--aa-card);
      overflow: hidden;
    }
    .pane-head {
      padding: 10px 12px 7px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .pane-title-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .pane-name { font-weight: 700; font-size: 13px; word-break: break-word; }
    .pane-head-right {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .pane-meta-line {
      font-size: 11.5px;
      color: var(--aa-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .pane-tabs {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      padding: 5px 12px 7px;
      border-bottom: 1px solid var(--aa-border);
      font-size: 11.5px;
      flex-wrap: wrap;
    }
    .pane-tab-left {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .md-file-pill {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid var(--aa-border);
      background: transparent;
      color: var(--aa-muted);
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .md-file-pill.active {
      border-color: var(--aa-teal);
      color: var(--aa-fg);
      background: rgba(42, 140, 130, 0.14);
      font-weight: 600;
    }
    .pane-tab-right {
      display: inline-flex;
      align-items: center;
      gap: 3px;
    }
    .mini-btn {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 5px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--aa-muted);
    }
    .mini-btn:hover { background: var(--aa-subtle); color: var(--aa-fg); }
    .mini-btn.active {
      border-color: var(--aa-border);
      background: var(--aa-bg);
      color: var(--aa-fg);
      font-weight: 600;
    }
    .pane-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
      padding: 12px 13px;
      font-size: 12.5px;
    }
    .feed-item {
      margin-bottom: 7px;
      padding: 5px 8px;
      border-radius: 5px;
      border-left: 2.5px solid var(--aa-border);
      background: var(--aa-subtle);
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
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
      font-size: 9.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--aa-muted);
      margin-bottom: 2px;
      display: block;
    }
    .raw-box {
      white-space: pre-wrap;
      word-break: break-word;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 11.5px;
      margin: 0;
      line-height: 1.5;
    }
    .pane-foot {
      padding: 7px 12px;
      border-top: 1px solid var(--aa-border);
      display: flex;
      flex-direction: column;
      gap: 5px;
      background: var(--aa-subtle);
      font-size: 11px;
    }
    .file-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      max-height: 54px;
      overflow-y: auto;
    }
    .file-chip {
      font-size: 10.5px;
      padding: 1px 6px;
      border-radius: 4px;
      border: 1px solid var(--aa-border);
      background: var(--aa-bg);
      font-family: var(--vscode-editor-font-family, monospace);
    }
    .file-chip .tag-A { color: var(--aa-ok-fg); font-weight: 700; }
    .file-chip .tag-M { color: var(--aa-warn-fg); font-weight: 700; }
    .file-chip .tag-D { color: var(--aa-err-fg); font-weight: 700; }
    .composer {
      border-top: 1px solid var(--aa-border);
      background: var(--aa-card);
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .composer-row {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }
    .composer textarea {
      flex: 1 1 auto;
      min-height: 48px;
      max-height: 150px;
      padding: 7px 10px;
    }
    .composer-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
    }
    .composer-left {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
    }
    .extra-opts {
      display: none;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .extra-opts.open { display: flex; }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="topbar-left">
      <span class="brand">Agent Arena</span>
      <select id="taskSelect" title="Select active or historical run"></select>
      <button id="btnNewDraft" title="Compose a fresh side-by-side run">+ New</button>
      <button id="btnAgentsDrawer" title="Toggle agent presets &amp; custom columns">Agents (0)</button>
      <button id="btnRerunTask" title="Re-run this prompt and agent columns" style="display:none;">↻ Re-run</button>
      <span id="sinceBadge" class="muted" style="font-size:11.5px;"></span>
    </div>
    <div class="topbar-right">
      <button id="btnStopAll" class="danger" style="display:none;">Stop All</button>
      <button id="btnOpenAnalysis">Analysis &amp; Leaderboard ↗</button>
      <button id="btnSettings" class="ghost" title="Configure Agent Arena settings">⚙</button>
    </div>
  </div>

  <div id="agentsDrawer" class="drawer-wrap">
    <div id="addModeHeader" class="add-mode-bar" style="display:none;"></div>
    <div id="presetBar" class="preset-bar"></div>
    <div id="agyPicker" class="agy-picker">
      <div class="agy-picker-top">
        <input id="agySearchInput" type="text" placeholder="Filter Antigravity models…" style="width:185px;" />
        <div id="agyGroupPills" class="agy-group-pills"></div>
        <span style="flex:1 1 auto;"></span>
        <button id="btnRefreshAgyCatalog" class="ghost" style="font-size:11px;padding:2px 7px;" title="Refresh models &amp; agents from agy CLI">↻</button>
        <button id="btnCloseAgyPicker" class="ghost" style="font-size:11px;padding:2px 7px;">Close</button>
      </div>
      <div class="agy-picker-opts">
        <label style="display:inline-flex;align-items:center;gap:4px;">Effort
          <select id="agyPickEffort" title="Reasoning effort passed via --effort (empty = model default)">
            <option value="">Auto (model default)</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="xhigh">xhigh</option>
            <option value="max">max</option>
          </select>
        </label>
        <label style="display:inline-flex;align-items:center;gap:4px;">Mode
          <select id="agyPickMode" title="Antigravity execution mode">
            <option value="default">default</option>
            <option value="accept-edits">accept-edits</option>
            <option value="auto">auto</option>
            <option value="plan">plan</option>
            <option value="dangerously-skip-permissions">skip-permissions</option>
          </select>
        </label>
        <label style="display:inline-flex;align-items:center;gap:4px;">Agent
          <input id="agyPickAgent" type="text" list="agyAgentList" placeholder="Agent (default)" style="width:120px;" />
        </label>
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
          <input id="agyPickSandbox" type="checkbox" /> Sandbox
        </label>
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
          <input id="agyPickNoSlash" type="checkbox" /> No slash cmds
        </label>
      </div>
      <div id="agyModelsGrid" class="agy-models-grid"></div>
    </div>
    <div id="customDrawer" class="custom-drawer">
      <select id="custHarness">
        <option value="codex">codex</option>
        <option value="claude">claude</option>
        <option value="agy">agy (Antigravity)</option>
        <option value="opencode">opencode</option>
        <option value="pi">pi</option>
        <option value="dsh">dsh</option>
        <option value="custom">custom shell</option>
      </select>
      <input id="custModel" type="text" placeholder="Model (optional, e.g. sonnet, o3)" style="width:240px;" />
      <input id="custEffort" type="text" placeholder="Effort (low/medium/high)" style="width:145px;" />
      <input id="custArgs" type="text" placeholder="Extra args" style="width:120px;" />
      <input id="custTpl" type="text" placeholder="Custom cmd template ({prompt_file}, {cwd})" style="width:230px;display:none;" />
      <button id="btnAddCustom" class="primary">Add</button>
      <button id="btnCloseCustom" class="ghost">Close</button>
      <div id="custAgyOpts" class="cust-agy-opts">
        <select id="custAgyMode" title="Antigravity mode">
          <option value="">Mode: Global default</option>
          <option value="default">Mode: default</option>
          <option value="accept-edits">Mode: accept-edits</option>
          <option value="auto">Mode: auto</option>
          <option value="plan">Mode: plan</option>
          <option value="dangerously-skip-permissions">Mode: skip-permissions</option>
        </select>
        <input id="custAgyAgent" type="text" list="agyAgentList" placeholder="--agent (optional)" style="width:130px;" />
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input id="custAgySandbox" type="checkbox" /> --sandbox</label>
        <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;"><input id="custAgyNoSlash" type="checkbox" /> --disable-slash-commands</label>
        <input id="custAgySettings" type="text" placeholder="--settings JSON or path" style="width:185px;" />
      </div>
    </div>
    <datalist id="agyModelList"></datalist>
    <datalist id="agyEffortList">
      <option value="low"></option>
      <option value="medium"></option>
      <option value="high"></option>
      <option value="xhigh"></option>
      <option value="max"></option>
    </datalist>
    <datalist id="agyAgentList"></datalist>
  </div>

  <div id="tutorialBanner" class="tutorial-strip"></div>

  <div id="columnsWrap" class="columns-wrap"></div>

  <div class="composer">
    <div class="composer-row">
      <textarea id="promptInput" placeholder="One shared prompt for all selected agents… (⌘Enter / Ctrl+Enter to run)"></textarea>
      <button id="btnLaunch" class="primary" style="min-width:110px;justify-content:center;padding:8px 16px;">Run ⌘↵</button>
    </div>
    <div class="composer-meta">
      <div class="composer-left">
        <select id="isolationSelect" title="Workspace isolation mode">
          <option value="direct">Direct (Shared Workspace)</option>
          <option value="scratch">Scratch Folder (Isolated)</option>
          <option value="apfs-cow">CoW Clone (Isolated)</option>
          <option value="git-worktree">Git Worktree (Isolated)</option>
        </select>
        <button id="btnToggleOptions" class="ghost" style="padding:2px 7px;font-size:11.5px;">Options ▾</button>
        <div id="extraOpts" class="extra-opts">
          <input id="titleInput" type="text" placeholder="Run title" style="width:165px;" />
          <input id="tagsInput" type="text" placeholder="Tags (comma separated)" style="width:155px;" />
        </div>
      </div>
      <div class="muted" id="composerStatus">Ready.</div>
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
      agyCatalog: { models: [], agents: [], loading: false, fetchedAt: 0, error: null },
      agyDefaults: { permissionMode: 'default', sandbox: false, disableSlashCommands: false, agent: '', settings: '' },
      settingsSummary: { claudePermissionMode: 'acceptEdits', codexSandboxMode: 'workspace-write', agyPermissionMode: 'default' },
      tutorial: { visible: false, taskId: null, completed: false },
    };
    let draftAgents = [];
    let pendingAddAgents = [];
    let paneModes = {};     // candId -> 'output' | 'activity' | 'raw' | 'file:<relPath>'
    let paneFilters = {};   // candId -> 'all' | 'tools' | 'errors'
    let paneRawText = {};   // candId -> boolean (true = show unrendered markdown source in Output/File)
    let rawCache = {};      // candId -> string
    let fileCache = {};     // taskId::candId::relPath -> { text, error }
    let agentsDrawerOpen = null; // null = auto (open in draft, collapsed in active run)
    let agyPickerOpen = false;
    let agySearchQuery = '';
    let agyGroupFilter = '';
    let agyPickerInitialized = false;
    let isLaunching = false;
    let isAddingAgents = false;
    let scrollColumnsToEndNext = false;
    const TUTORIAL_PROMPT = 'Inspect the current workspace top-level files and summarize in 5 concise bullet points plus a small Markdown table what this project contains and how it is structured. Do not edit any existing files.';

    const taskSelect = document.getElementById('taskSelect');
    const agentsDrawer = document.getElementById('agentsDrawer');
    const addModeHeader = document.getElementById('addModeHeader');
    const btnAgentsDrawer = document.getElementById('btnAgentsDrawer');
    const presetBar = document.getElementById('presetBar');
    const agyPicker = document.getElementById('agyPicker');
    const agySearchInput = document.getElementById('agySearchInput');
    const agyGroupPills = document.getElementById('agyGroupPills');
    const agyModelsGrid = document.getElementById('agyModelsGrid');
    const custHarnessEl = document.getElementById('custHarness');
    const custModelEl = document.getElementById('custModel');
    const custEffortEl = document.getElementById('custEffort');
    const custAgyOptsEl = document.getElementById('custAgyOpts');
    const agyModelListEl = document.getElementById('agyModelList');
    const agyAgentListEl = document.getElementById('agyAgentList');
    const tutorialBanner = document.getElementById('tutorialBanner');
    const columnsWrap = document.getElementById('columnsWrap');
    const promptInput = document.getElementById('promptInput');
    const titleInput = document.getElementById('titleInput');
    const tagsInput = document.getElementById('tagsInput');
    const extraOpts = document.getElementById('extraOpts');
    const btnToggleOptions = document.getElementById('btnToggleOptions');
    const isolationSelect = document.getElementById('isolationSelect');
    const btnLaunch = document.getElementById('btnLaunch');
    const btnRerunTask = document.getElementById('btnRerunTask');
    const btnStopAll = document.getElementById('btnStopAll');
    const btnSettings = document.getElementById('btnSettings');
    const btnOpenAnalysis = document.getElementById('btnOpenAnalysis');
    const sinceBadge = document.getElementById('sinceBadge');
    const composerStatus = document.getElementById('composerStatus');

    function normalizeAgyOptsClient(raw) {
      if (!raw || typeof raw !== 'object') return null;
      const pm = typeof raw.permissionMode === 'string' ? raw.permissionMode.trim() : '';
      const sb = typeof raw.sandbox === 'boolean' ? raw.sandbox : null;
      const ns = typeof raw.disableSlashCommands === 'boolean' ? raw.disableSlashCommands : null;
      const ag = typeof raw.agent === 'string' ? raw.agent.trim() : '';
      const st = typeof raw.settings === 'string' ? raw.settings.trim() : '';
      if (!pm && sb === null && ns === null && !ag && !st) return null;
      return { permissionMode: pm, sandbox: sb, disableSlashCommands: ns, agent: ag, settings: st };
    }

    function agyOptionsSuffix(agyOptions) {
      if (!agyOptions || typeof agyOptions !== 'object') return '';
      const parts = [];
      const pm = typeof agyOptions.permissionMode === 'string' ? agyOptions.permissionMode.trim() : '';
      if (pm && pm !== 'default') parts.push(pm);
      if (agyOptions.sandbox === true) parts.push('sandbox');
      if (agyOptions.disableSlashCommands === true) parts.push('no-slash');
      const ag = typeof agyOptions.agent === 'string' ? agyOptions.agent.trim() : '';
      if (ag) parts.push('agent:' + ag);
      const st = typeof agyOptions.settings === 'string' ? agyOptions.settings.trim() : '';
      if (st) parts.push('custom-settings');
      return parts.length ? (' [' + parts.join(', ') + ']') : '';
    }

    function configKeyOf(c) {
      const m = (c.model || '').trim() || 'default';
      const e = (c.effort || '').trim();
      const base = e ? (c.harness + ' · ' + m + ' (' + e + ')') : (c.harness + ' · ' + m);
      const suffix = c.harness === 'agy' ? agyOptionsSuffix(c.agyOptions) : '';
      return base + suffix;
    }

    function syncAgyDatalists() {
      const models = (state.agyCatalog && state.agyCatalog.models) || [];
      const agents = (state.agyCatalog && state.agyCatalog.agents) || [];
      if (agyModelListEl) {
        agyModelListEl.innerHTML = models.map((m) =>
          '<option value="' + esc(m.id) + '">' + esc(m.label || m.id) + '</option>'
        ).join('');
      }
      if (agyAgentListEl) {
        agyAgentListEl.innerHTML = agents.map((a) =>
          '<option value="' + esc(a.id) + '">' + esc(a.label || a.id) + '</option>'
        ).join('');
      }
    }

    function syncCustomAgyUi() {
      const h = custHarnessEl.value;
      document.getElementById('custTpl').style.display = h === 'custom' ? 'inline-block' : 'none';
      const isAgy = h === 'agy';
      custAgyOptsEl.classList.toggle('open', isAgy);
      if (isAgy) {
        custModelEl.setAttribute('list', 'agyModelList');
        custEffortEl.setAttribute('list', 'agyEffortList');
      } else {
        custModelEl.removeAttribute('list');
        custEffortEl.removeAttribute('list');
      }
    }

    function readPickerAgyOptions() {
      const def = state.agyDefaults || {};
      const modeVal = document.getElementById('agyPickMode').value;
      const agentVal = document.getElementById('agyPickAgent').value.trim();
      const sbVal = Boolean(document.getElementById('agyPickSandbox').checked);
      const nsVal = Boolean(document.getElementById('agyPickNoSlash').checked);
      const out = {};
      if (modeVal !== (def.permissionMode || 'default') || (modeVal && modeVal !== 'default')) {
        out.permissionMode = modeVal;
      }
      if (sbVal !== Boolean(def.sandbox) || sbVal) {
        out.sandbox = sbVal;
      }
      if (nsVal !== Boolean(def.disableSlashCommands) || nsVal) {
        out.disableSlashCommands = nsVal;
      }
      if (agentVal !== (def.agent || '') || agentVal) {
        out.agent = agentVal;
      }
      return normalizeAgyOptsClient(out);
    }

    function effectivePaneMode(c) {
      if (paneModes[c.id]) return paneModes[c.id];
      if (c.status === 'running' || c.status === 'pending') return 'activity';
      return 'output';
    }

    function candidateMarkdownFiles(task, cand) {
      const ch = cand.changedFiles || {};
      const list = Array.from(new Set([...(ch.added || []), ...(ch.modified || [])]));
      return list.filter((f) => /\\.(md|markdown)$/i.test(f)).slice(0, 2);
    }

    btnToggleOptions.addEventListener('click', () => {
      const open = extraOpts.classList.toggle('open');
      btnToggleOptions.textContent = open ? 'Options ▴' : 'Options ▾';
    });

    btnAgentsDrawer.addEventListener('click', () => {
      const cur = agentsDrawer.classList.contains('open');
      agentsDrawerOpen = !cur;
      renderDrawerVisibility();
    });

    custHarnessEl.addEventListener('change', syncCustomAgyUi);

    document.getElementById('btnAddCustom').addEventListener('click', () => {
      const harness = custHarnessEl.value;
      const model = custModelEl.value.trim();
      const effort = custEffortEl.value.trim();
      const argsRaw = document.getElementById('custArgs').value.trim();
      const extraArgs = argsRaw ? argsRaw.split(/\\s+/) : [];
      const commandTemplate = document.getElementById('custTpl').value.trim();
      let agyOptions = null;
      if (harness === 'agy') {
        const cm = document.getElementById('custAgyMode').value;
        const ca = document.getElementById('custAgyAgent').value.trim();
        const csb = document.getElementById('custAgySandbox').checked;
        const cns = document.getElementById('custAgyNoSlash').checked;
        const cst = document.getElementById('custAgySettings').value.trim();
        agyOptions = normalizeAgyOptsClient({
          permissionMode: cm,
          sandbox: csb ? true : null,
          disableSlashCommands: cns ? true : null,
          agent: ca,
          settings: cst,
        });
      }
      const item = { harness, model, effort, extraArgs, commandTemplate, agyOptions };
      item.label = configKeyOf(item);
      if (state.activeTask) {
        pendingAddAgents.push(item);
        agentsDrawerOpen = true;
        renderDrawerVisibility();
        renderAddModeHeader();
        renderPresetBar();
        renderAgyPicker();
      } else {
        draftAgents.push(item);
        renderAll();
      }
    });

    agySearchInput.addEventListener('input', () => {
      agySearchQuery = agySearchInput.value.trim().toLowerCase();
      renderAgyPicker();
    });

    document.getElementById('btnRefreshAgyCatalog').addEventListener('click', () => {
      if (!state.agyCatalog) state.agyCatalog = { models: [], agents: [], loading: true, fetchedAt: 0, error: null };
      state.agyCatalog.loading = true;
      renderAgyPicker();
      vscode.postMessage({ type: 'refreshAgyCatalog' });
    });

    document.getElementById('btnCloseAgyPicker').addEventListener('click', () => {
      agyPickerOpen = false;
      renderAgyPicker();
    });

    ['agyPickEffort', 'agyPickMode', 'agyPickSandbox', 'agyPickNoSlash', 'agyPickAgent'].forEach((id) => {
      document.getElementById(id).addEventListener('change', () => {
        renderAgyPicker();
      });
    });

    agyGroupPills.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-agy-group]');
      if (!btn) return;
      agyGroupFilter = btn.getAttribute('data-agy-group') || '';
      renderAgyPicker();
    });

    agyModelsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('button[data-agy-model-id]');
      if (!card) return;
      const modelId = card.getAttribute('data-agy-model-id');
      const modelObj = ((state.agyCatalog && state.agyCatalog.models) || []).find((m) => m.id === modelId);
      const effort = document.getElementById('agyPickEffort').value.trim();
      const agyOptions = readPickerAgyOptions();
      const item = {
        harness: 'agy',
        model: modelId,
        effort,
        extraArgs: [],
        commandTemplate: '',
        agyOptions,
      };
      const baseTitle = 'Antigravity · ' + ((modelObj && modelObj.label) || modelId);
      const suffix = agyOptionsSuffix(agyOptions);
      item.label = (effort ? (baseTitle + ' (' + effort + ')') : baseTitle) + suffix;
      const key = configKeyOf(item);

      if (state.activeTask) {
        const idx = pendingAddAgents.findIndex((c) => configKeyOf(c) === key);
        if (idx >= 0) pendingAddAgents.splice(idx, 1);
        else pendingAddAgents.push(item);
        agentsDrawerOpen = true;
        renderDrawerVisibility();
        renderAddModeHeader();
        renderPresetBar();
        renderAgyPicker();
      } else {
        const idx = draftAgents.findIndex((c) => configKeyOf(c) === key);
        if (idx >= 0) draftAgents.splice(idx, 1);
        else draftAgents.push(item);
        agentsDrawerOpen = true;
        renderAll();
      }
    });

    document.getElementById('btnCloseCustom').addEventListener('click', () => {
      document.getElementById('customDrawer').classList.remove('open');
    });

    document.getElementById('btnNewDraft').addEventListener('click', () => {
      state.activeTaskId = null;
      state.activeTask = null;
      pendingAddAgents = [];
      agentsDrawerOpen = true;
      btnOpenAnalysis.classList.remove('pulse');
      renderAll();
      promptInput.focus();
    });

    taskSelect.addEventListener('change', () => {
      const val = taskSelect.value;
      pendingAddAgents = [];
      if (!val) {
        state.activeTaskId = null;
        state.activeTask = null;
        agentsDrawerOpen = true;
        renderAll();
      } else {
        agentsDrawerOpen = false;
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
            agyOptions: c.agyOptions || null,
          }))
        : draftAgents;
      if (!configs.length) {
        agentsDrawerOpen = true;
        renderDrawerVisibility();
        composerStatus.textContent = 'Select at least one agent first.';
        return;
      }
      isLaunching = true;
      btnLaunch.disabled = true;
      setTimeout(() => {
        isLaunching = false;
        btnLaunch.disabled = false;
      }, 2500);
      agentsDrawerOpen = false;
      btnOpenAnalysis.classList.remove('pulse');
      composerStatus.textContent = 'Launching ' + configs.length + ' agents concurrently…';
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

    function renderDrawerVisibility() {
      const shouldOpen = agentsDrawerOpen !== null ? agentsDrawerOpen : !state.activeTask;
      agentsDrawer.classList.toggle('open', shouldOpen);
      if (state.activeTask) {
        btnAgentsDrawer.textContent = '+ Add Agent' + (shouldOpen ? ' ▴' : ' ▾');
        btnAgentsDrawer.title = 'Add & run another agent configuration in this existing run without re-running completed columns';
      } else {
        btnAgentsDrawer.textContent = 'Agents (' + draftAgents.length + ')' + (shouldOpen ? ' ▴' : ' ▾');
        btnAgentsDrawer.title = 'Toggle agent presets & custom columns';
      }
    }

    function renderAddModeHeader() {
      if (!state.activeTask) {
        addModeHeader.style.display = 'none';
        addModeHeader.innerHTML = '';
        return;
      }
      addModeHeader.style.display = 'flex';
      const n = pendingAddAgents.length;
      addModeHeader.innerHTML =
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
          '<strong>Add agent to this run</strong>' +
          '<span class="muted">Runs the same prompt alongside existing columns</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;">' +
          (n > 0 ? '<button id="btnClearPendingAdd" class="ghost" style="font-size:11.5px;padding:2px 8px;">Clear</button>' : '') +
          '<button id="btnRunAddedAgents" class="primary" style="font-size:11.5px;padding:3px 10px;"' + (n === 0 || isAddingAgents ? ' disabled' : '') + '>▶ Run Added (' + n + ')</button>' +
        '</div>';
    }

    addModeHeader.addEventListener('click', (e) => {
      if (e.target.closest('#btnClearPendingAdd')) {
        pendingAddAgents = [];
        renderAddModeHeader();
        renderPresetBar();
        return;
      }
      if (e.target.closest('#btnRunAddedAgents')) {
        if (isAddingAgents || !state.activeTask || !pendingAddAgents.length) return;
        const configs = pendingAddAgents.map((c) => ({ ...c }));
        const targetTaskId = state.activeTask.id;
        isAddingAgents = true;
        setTimeout(() => {
          isAddingAgents = false;
          renderAddModeHeader();
        }, 1800);
        pendingAddAgents = [];
        agentsDrawerOpen = false;
        scrollColumnsToEndNext = true;
        btnOpenAnalysis.classList.remove('pulse');
        composerStatus.textContent = 'Adding ' + configs.length + ' agent(s) to ' + state.activeTask.title + '…';
        renderDrawerVisibility();
        renderAddModeHeader();
        renderPresetBar();
        vscode.postMessage({ type: 'addCandidatesToTask', taskId: targetTaskId, configs });
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
          'Settings (Claude: ' +
          (state.settingsSummary.claudePermissionMode || 'acceptEdits') +
          ' | Codex: ' +
          (state.settingsSummary.codexSandboxMode || 'workspace-write') +
          ' | Agy: ' +
          (state.settingsSummary.agyPermissionMode || 'default') +
          ')';
      }

      renderDrawerVisibility();

      if (state.activeTask) {
        sinceBadge.textContent = fmtSince(state.activeTask.createdAt) + ' · ' + state.activeTask.isolationMode;
        const anyRunning = (state.activeTask.candidates || []).some((c) => c.status === 'running' || c.status === 'pending');
        btnStopAll.style.display = anyRunning ? 'inline-flex' : 'none';
        btnRerunTask.style.display = anyRunning ? 'none' : 'inline-flex';
        if (!anyRunning && (state.activeTask.candidates || []).length > 0) {
          btnOpenAnalysis.classList.add('pulse');
        } else {
          btnOpenAnalysis.classList.remove('pulse');
        }
      } else {
        sinceBadge.textContent = '';
        btnStopAll.style.display = 'none';
        btnRerunTask.style.display = 'none';
        btnOpenAnalysis.classList.remove('pulse');
      }
    }

    function renderAgyPicker() {
      const agyInfo = (state.harnesses || {}).agy;
      if (!agyInfo || !agyInfo.available || !agyPickerOpen) {
        agyPicker.classList.remove('open');
        return;
      }
      agyPicker.classList.add('open');

      const cat = state.agyCatalog || { models: [], agents: [], loading: false, error: null };
      const models = Array.isArray(cat.models) ? cat.models : [];
      const groups = Array.from(new Set(models.map((m) => m.group).filter(Boolean)));
      if (agyGroupFilter && !groups.includes(agyGroupFilter)) {
        agyGroupFilter = '';
      }

      agyGroupPills.innerHTML =
        '<button class="mini-btn' + (!agyGroupFilter ? ' active' : '') + '" data-agy-group="">All (' + models.length + ')</button>' +
        groups.map((g) =>
          '<button class="mini-btn' + (agyGroupFilter === g ? ' active' : '') + '" data-agy-group="' + esc(g) + '">' + esc(g) + '</button>'
        ).join('');

      if (cat.loading && !models.length) {
        agyModelsGrid.innerHTML = '<div class="muted" style="padding:6px 2px;">Fetching available Antigravity models…</div>';
        return;
      }
      if (cat.error && !models.length) {
        agyModelsGrid.innerHTML = '<div class="muted" style="color:var(--aa-err-fg);padding:6px 2px;">' + esc(cat.error) + '</div>';
        return;
      }

      const inAddMode = Boolean(state.activeTask);
      const activeList = inAddMode ? pendingAddAgents : draftAgents;
      const effort = document.getElementById('agyPickEffort').value.trim();
      const agyOpts = readPickerAgyOptions();
      const selectedKeys = new Set(activeList.map((c) => configKeyOf(c)));
      const existingKeys = new Set(inAddMode ? (state.activeTask.candidates || []).map((c) => configKeyOf(c)) : []);

      const filtered = models.filter((m) => {
        if (agyGroupFilter && m.group !== agyGroupFilter) return false;
        if (agySearchQuery) {
          const hay = (m.id + ' ' + (m.label || '')).toLowerCase();
          if (!hay.includes(agySearchQuery)) return false;
        }
        return true;
      });

      if (!filtered.length) {
        agyModelsGrid.innerHTML = '<div class="muted" style="padding:6px 2px;">No matching Antigravity models found.</div>';
        return;
      }

      agyModelsGrid.innerHTML = filtered.map((m) => {
        const probeKey = configKeyOf({ harness: 'agy', model: m.id, effort, agyOptions: agyOpts });
        const sel = selectedKeys.has(probeKey);
        const inTask = inAddMode && existingKeys.has(probeKey);
        return '<button class="agy-model-card' + (sel ? ' selected' : '') + '" data-agy-model-id="' + esc(m.id) + '" title="' + esc('Toggle ' + probeKey) + '">' +
          '<span><strong>' + esc(m.label || m.id) + '</strong>' + (inTask ? ' <span class="muted">✓</span>' : '') + '</span>' +
          '<span class="agy-model-id">' + esc(m.id) + '</span>' +
        '</button>';
      }).join('');
    }

    function renderPresetBar() {
      const inAddMode = Boolean(state.activeTask);
      const activeList = inAddMode ? pendingAddAgents : draftAgents;
      const selectedKeys = new Set(activeList.map((c) => configKeyOf(c)));
      const existingKeys = new Set(
        inAddMode ? (state.activeTask.candidates || []).map((c) => configKeyOf(c)) : [],
      );
      const presetKeys = new Set((state.presets || []).map((p) => configKeyOf(p)));
      const chips = (state.presets || []).map((p, idx) => {
        const key = configKeyOf(p);
        const info = (state.harnesses || {})[p.harness];
        const avail = info ? info.available : true;
        const sel = selectedKeys.has(key);
        const alreadyInTask = inAddMode && existingKeys.has(key);
        return '<button class="preset-chip' + (sel ? ' selected' : '') + (avail ? '' : ' unavailable') + '" data-preset-idx="' + idx + '" title="' + esc(avail ? ('Toggle ' + key + (alreadyInTask ? ' (already in run)' : '')) : 'Binary not detected in PATH') + '">' +
          '<span class="dot ' + (avail ? 'ok' : 'no') + '"></span>' +
          esc(p.label || key) +
          (alreadyInTask ? ' <span class="muted">✓</span>' : '') +
          '</button>';
      });
      activeList.forEach((c, aIdx) => {
        const key = configKeyOf(c);
        if (!presetKeys.has(key)) {
          chips.push('<button class="preset-chip selected" data-extra-idx="' + aIdx + '" title="Remove agent configuration">' +
            esc(c.label || key) + ' ×</button>');
        }
      });
      const agyInfo = (state.harnesses || {}).agy;
      if (agyInfo && agyInfo.available) {
        const agyModels = (state.agyCatalog && state.agyCatalog.models) || [];
        const agyCountLbl = (state.agyCatalog && state.agyCatalog.loading && !agyModels.length)
          ? '…'
          : String(agyModels.length);
        chips.push('<button class="preset-chip' + (agyPickerOpen ? ' selected' : '') + '" id="btnToggleAgyPicker" title="Browse all Antigravity models &amp; settings">✦ Antigravity Models (' + agyCountLbl + ') ' + (agyPickerOpen ? '▴' : '▾') + '</button>');
      }
      chips.push('<button class="preset-chip" id="btnToggleCustom">+ Custom</button>');
      presetBar.innerHTML = chips.join('');
    }

    presetBar.addEventListener('click', (e) => {
      if (e.target.closest('#btnToggleAgyPicker')) {
        agyPickerOpen = !agyPickerOpen;
        if (agyPickerOpen && (!state.agyCatalog || (!state.agyCatalog.fetchedAt && !state.agyCatalog.loading))) {
          vscode.postMessage({ type: 'refreshAgyCatalog' });
        }
        renderPresetBar();
        renderAgyPicker();
        return;
      }
      if (e.target.closest('#btnToggleCustom')) {
        syncCustomAgyUi();
        document.getElementById('customDrawer').classList.toggle('open');
        return;
      }
      const extraBtn = e.target.closest('button[data-extra-idx]');
      if (extraBtn) {
        const eIdx = Number(extraBtn.getAttribute('data-extra-idx'));
        if (state.activeTask) {
          pendingAddAgents.splice(eIdx, 1);
          renderAddModeHeader();
          renderPresetBar();
          renderAgyPicker();
        } else {
          draftAgents.splice(eIdx, 1);
          renderAll();
        }
        return;
      }
      const btn = e.target.closest('button[data-preset-idx]');
      if (!btn) return;
      const idx = Number(btn.getAttribute('data-preset-idx'));
      const preset = (state.presets || [])[idx];
      if (!preset) return;
      const key = configKeyOf(preset);
      if (state.activeTask) {
        const found = pendingAddAgents.findIndex((c) => configKeyOf(c) === key);
        if (found >= 0) pendingAddAgents.splice(found, 1);
        else pendingAddAgents.push({ ...preset, label: preset.label || key });
        agentsDrawerOpen = true;
        renderDrawerVisibility();
        renderAddModeHeader();
        renderPresetBar();
        renderAgyPicker();
      } else {
        const found = draftAgents.findIndex((c) => configKeyOf(c) === key);
        if (found >= 0) draftAgents.splice(found, 1);
        else draftAgents.push({ ...preset, label: preset.label || key });
        agentsDrawerOpen = true;
        renderAll();
      }
    });

    function filterFeedItems(feed, filter) {
      const list = Array.isArray(feed) ? feed : [];
      if (filter === 'tools') return list.filter((x) => x.kind === 'tool' || x.kind === 'tool_result');
      if (filter === 'errors') return list.filter((x) => x.kind === 'error' || x.kind === 'stderr' || x.kind === 'notice');
      return list;
    }

    function renderFeedItems(feed, filter = 'all') {
      const items = filterFeedItems(feed, filter);
      if (!items.length) {
        return '<div class="muted" style="padding:12px 4px;">' + (feed && feed.length ? 'No events for this filter.' : 'Waiting for stream…') + '</div>';
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
      if (!chips.length) return '';
      const prefix = isDirect
        ? '<div class="muted" style="font-size:10.5px;">Shared workspace changes</div>'
        : '';
      return prefix + '<div class="file-chips">' + chips.join('') + '</div>';
    }

    function renderPaneFootHtml(cand, isIsolated) {
      const ch = cand.changedFiles || {};
      const fileCount = (ch.added || []).length + (ch.modified || []).length + (ch.deleted || []).length;
      if (!fileCount) return '';
      return '<div class="pane-files-list">' + renderFilesList(cand, !isIsolated) + '</div>' +
        (isIsolated
          ? '<div style="display:flex;justify-content:flex-end;"><button data-action="adoptCand" data-cid="' + esc(cand.id) + '" style="font-size:11px;padding:2px 8px;">Adopt Files</button></div>'
          : '');
    }

    function elapsedOf(c) {
      return c.status === 'running' && c.startedAt
        ? fmtDuration(Date.now() - Date.parse(c.startedAt))
        : fmtDuration(c.durationMs);
    }

    function statusChipHtml(c) {
      const t = elapsedOf(c);
      if (c.status === 'running') {
        return '<span class="badge running"><span class="spinner"></span>Running · <span class="mono pane-timer" data-status="running" data-start="' + esc(c.startedAt || '') + '">' + t + '</span></span>';
      }
      if (c.status === 'pending') return '<span class="badge running">Queued</span>';
      if (c.status === 'done') return '<span class="badge done">Done · ' + t + '</span>';
      if (c.status === 'failed') return '<span class="badge failed">Failed · ' + t + '</span>';
      if (c.status === 'cancelled') return '<span class="badge cancelled">Stopped · ' + t + '</span>';
      if (c.status === 'interrupted') return '<span class="badge cancelled">Interrupted · ' + t + '</span>';
      return '<span class="badge">Ready</span>';
    }

    function metaLineInfo(c) {
      const tel = c.telemetry || {};
      const tot = tel.totalTokens !== null && tel.totalTokens !== undefined
        ? tel.totalTokens
        : (tel.inputTokens !== null ? (tel.inputTokens || 0) + (tel.outputTokens || 0) : null);
      const parts = [];
      if (tot !== null) parts.push(fmtTokens(tot) + ' tok');
      if (tel.toolCalls) parts.push(tel.toolCalls + ' tools');
      else if (tel.numTurns) parts.push(tel.numTurns + ' turns');
      if (typeof tel.costUsd === 'number' && tel.costUsd > 0) parts.push(fmtCost(tel.costUsd));
      const summary = parts.length ? parts.join(' · ') : (c.status === 'running' ? 'streaming…' : '—');
      const tip = (tel.inputTokens !== null || tel.outputTokens !== null)
        ? ('in ' + fmtTokens(tel.inputTokens) + ' · cached ' + fmtTokens(tel.cachedTokens) + ' · out ' + fmtTokens(tel.outputTokens))
        : 'Telemetry';
      return { summary, tip };
    }

    function renderPaneBodyContent(cand, mode, filter = 'all') {
      if (mode === 'raw') {
        const raw = rawCache[cand.id];
        if (raw === undefined) {
          vscode.postMessage({ type: 'loadRawLog', taskId: state.activeTask.id, candId: cand.id });
          return '<div class="muted">Loading raw log…</div>';
        }
        return '<pre class="raw-box">' + esc(raw || '(empty)') + '</pre>';
      }
      if (mode.startsWith('file:')) {
        const relPath = mode.slice(5);
        const ck = state.activeTask.id + '::' + cand.id + '::' + relPath;
        const cached = fileCache[ck];
        if (!cached) {
          vscode.postMessage({ type: 'loadFileContent', taskId: state.activeTask.id, candId: cand.id, relPath });
          return '<div class="muted">Loading ' + esc(relPath) + '…</div>';
        }
        if (cached.error) {
          return '<div class="muted">' + esc(cached.error) + '</div>';
        }
        if (paneRawText[cand.id]) {
          return '<pre class="raw-box">' + esc(cached.text || '') + '</pre>';
        }
        return renderMarkdown(cached.text || '(empty file)');
      }
      if (mode === 'output') {
        const txt = cand.finalText || cand.error || '';
        if (!txt) {
          return '<div class="muted">' + (cand.status === 'running' ? 'Waiting for final response…' : '(No final response captured)') + '</div>';
        }
        if (paneRawText[cand.id]) {
          return '<pre class="raw-box">' + esc(txt) + '</pre>';
        }
        return renderMarkdown(txt);
      }
      return renderFeedItems(cand.feedPreview || [], filter);
    }

    function renderColumns() {
      if (!state.activeTask) {
        if (!draftAgents.length) {
          columnsWrap.innerHTML = '<div class="card muted" style="margin:auto;max-width:440px;text-align:center;">Toggle agent presets above, write one prompt below, and press <strong>Run ⌘↵</strong> to compare side-by-side.</div>';
          return;
        }
        columnsWrap.innerHTML = draftAgents.map((c, idx) => {
          const key = configKeyOf(c);
          return '<div class="pane">' +
            '<div class="pane-head">' +
              '<div class="pane-title-row">' +
                '<div class="pane-name">' + esc(c.label || key) + '</div>' +
                '<button class="ghost" data-action="removeDraft" data-idx="' + idx + '" title="Remove" style="padding:1px 6px;">×</button>' +
              '</div>' +
              '<div class="pane-meta-line"><span>' + esc(key) + '</span><span class="badge">Ready</span></div>' +
            '</div>' +
            '<div class="pane-body muted" style="display:flex;align-items:center;justify-content:center;text-align:center;">Ready to run with prompt below.</div>' +
          '</div>';
        }).join('');
        return;
      }

      const task = state.activeTask;
      const isIsolated = task.isolationMode !== 'direct';
      columnsWrap.innerHTML = (task.candidates || []).map((c) => {
        const mode = effectivePaneMode(c);
        const filter = paneFilters[c.id] || 'all';
        const showRawSrc = Boolean(paneRawText[c.id]);
        const meta = metaLineInfo(c);
        const mdFiles = candidateMarkdownFiles(task, c);
        const footHtml = renderPaneFootHtml(c, isIsolated);
        const showMarkdownTools = mode === 'output' || mode.startsWith('file:');

        return '<div class="pane" data-cand-id="' + esc(c.id) + '">' +
          '<div class="pane-head">' +
            '<div class="pane-title-row">' +
              '<div class="pane-name" title="' + esc(c.configKey) + '">' + esc(c.label) + '</div>' +
              '<span class="pane-head-right">' +
                '<span class="pane-status-slot">' + statusChipHtml(c) + '</span>' +
                (c.status === 'running'
                  ? '<button class="danger" data-action="cancelCand" data-cid="' + esc(c.id) + '" style="padding:1px 7px;font-size:11px;">Stop</button>'
                  : '') +
              '</span>' +
            '</div>' +
            '<div class="pane-meta-line">' +
              '<span class="pane-meta-summary" title="' + esc(meta.tip) + '">' + esc(meta.summary) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pane-tabs">' +
            '<div class="pane-tab-left">' +
              '<div class="segmented">' +
                '<button class="seg-btn' + (mode === 'output' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="output">Output</button>' +
                '<button class="seg-btn' + (mode === 'activity' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="activity">Activity</button>' +
                '<button class="seg-btn' + (mode === 'raw' ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="raw">Raw</button>' +
              '</div>' +
              mdFiles.map((f) => {
                const fm = 'file:' + f;
                const base = f.split('/').pop();
                return '<button class="md-file-pill' + (mode === fm ? ' active' : '') + '" data-action="paneMode" data-cid="' + esc(c.id) + '" data-mode="' + esc(fm) + '" title="' + esc(f) + '">📄 ' + esc(base) + '</button>';
              }).join('') +
            '</div>' +
            '<div class="pane-tab-right">' +
              '<span class="pane-filters" style="display:' + (mode === 'activity' ? 'inline-flex' : 'none') + ';gap:2px;">' +
                '<button class="mini-btn' + (filter === 'all' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="all">All</button>' +
                '<button class="mini-btn' + (filter === 'tools' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="tools">Tools</button>' +
                '<button class="mini-btn' + (filter === 'errors' ? ' active' : '') + '" data-action="paneFilter" data-cid="' + esc(c.id) + '" data-filter="errors">Errors</button>' +
              '</span>' +
              '<span class="pane-output-tools" style="display:' + (showMarkdownTools ? 'inline-flex' : 'none') + ';gap:2px;">' +
                '<button class="mini-btn' + (showRawSrc ? ' active' : '') + '" data-action="toggleSrc" data-cid="' + esc(c.id) + '" title="Toggle rendered Markdown vs raw source">' + (showRawSrc ? 'MD' : 'Src') + '</button>' +
                '<button class="mini-btn" data-action="copyFinal" data-cid="' + esc(c.id) + '" title="Copy output text">Copy</button>' +
              '</span>' +
            '</div>' +
          '</div>' +
          '<div class="pane-body">' + renderPaneBodyContent(c, mode, filter) + '</div>' +
          '<div class="pane-foot" style="display:' + (footHtml ? 'flex' : 'none') + ';">' + footHtml + '</div>' +
        '</div>';
      }).join('');
    }

    function patchCandidateInPlace(cand) {
      if (!state.activeTask || state.activeTask.id !== cand.taskId) return;
      const idx = (state.activeTask.candidates || []).findIndex((x) => x.id === cand.id);
      if (idx >= 0) {
        state.activeTask.candidates[idx] = cand;
      } else {
        state.activeTask.candidates.push(cand);
        renderColumns();
        return;
      }
      const pane = columnsWrap.querySelector('.pane[data-cand-id="' + CSS.escape(cand.id) + '"]');
      if (!pane) {
        renderColumns();
        return;
      }

      const headRight = pane.querySelector('.pane-head-right');
      if (headRight) {
        headRight.innerHTML =
          '<span class="pane-status-slot">' + statusChipHtml(cand) + '</span>' +
          (cand.status === 'running'
            ? '<button class="danger" data-action="cancelCand" data-cid="' + esc(cand.id) + '" style="padding:1px 7px;font-size:11px;">Stop</button>'
            : '');
      }

      const meta = metaLineInfo(cand);
      const metaEl = pane.querySelector('.pane-meta-summary');
      if (metaEl) {
        metaEl.textContent = meta.summary;
        metaEl.title = meta.tip;
      }

      const mode = effectivePaneMode(cand);
      const filter = paneFilters[cand.id] || 'all';
      const showRawSrc = Boolean(paneRawText[cand.id]);
      const showMarkdownTools = mode === 'output' || mode.startsWith('file:');

      pane.querySelectorAll('[data-action="paneMode"]').forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-mode') === mode);
      });
      const filterWrap = pane.querySelector('.pane-filters');
      if (filterWrap) filterWrap.style.display = mode === 'activity' ? 'inline-flex' : 'none';
      pane.querySelectorAll('.mini-btn[data-action="paneFilter"]').forEach((el) => {
        el.classList.toggle('active', el.getAttribute('data-filter') === filter);
      });

      const outTools = pane.querySelector('.pane-output-tools');
      if (outTools) outTools.style.display = showMarkdownTools ? 'inline-flex' : 'none';
      const srcBtn = pane.querySelector('.mini-btn[data-action="toggleSrc"]');
      if (srcBtn) {
        srcBtn.classList.toggle('active', showRawSrc);
        srcBtn.textContent = showRawSrc ? 'MD' : 'Src';
      }

      const body = pane.querySelector('.pane-body');
      if (body && mode !== 'raw') {
        const atBottom = body.scrollTop + body.clientHeight >= body.scrollHeight - 32;
        body.innerHTML = renderPaneBodyContent(cand, mode, filter);
        if (atBottom && mode === 'activity') {
          body.scrollTop = body.scrollHeight;
        }
      }
      if (cand.status !== 'running' && mode === 'raw') {
        delete rawCache[cand.id];
      }

      const isIsolated = state.activeTask.isolationMode !== 'direct';
      const foot = pane.querySelector('.pane-foot');
      if (foot) {
        const footHtml = renderPaneFootHtml(cand, isIsolated);
        foot.innerHTML = footHtml;
        foot.style.display = footHtml ? 'flex' : 'none';
      }

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
      const cand = state.activeTask && (state.activeTask.candidates || []).find((x) => x.id === cid);
      if (action === 'paneMode') {
        paneModes[cid] = btn.getAttribute('data-mode');
        if (cand) patchCandidateInPlace({ ...cand, taskId });
        return;
      }
      if (action === 'paneFilter') {
        paneFilters[cid] = btn.getAttribute('data-filter') || 'all';
        paneModes[cid] = 'activity';
        if (cand) patchCandidateInPlace({ ...cand, taskId });
        return;
      }
      if (action === 'toggleSrc') {
        paneRawText[cid] = !paneRawText[cid];
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
        if (cand && navigator.clipboard) {
          const mode = effectivePaneMode(cand);
          let toCopy = cand.finalText || '';
          if (mode.startsWith('file:')) {
            const rel = mode.slice(5);
            const cached = fileCache[taskId + '::' + cid + '::' + rel];
            if (cached && cached.text) toCopy = cached.text;
          }
          navigator.clipboard.writeText(toCopy);
          composerStatus.textContent = 'Copied output from ' + cand.label;
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

      const s1 = hEntries.length > 0;
      const s2 = Boolean(tutTask);
      const s3 = Boolean(allSettled);
      const s4 = Boolean(isJudged);

      tutorialBanner.innerHTML =
        '<div class="tut-steps-inline">' +
          '<strong>Welcome</strong>' +
          '<span class="tut-pill ' + (s1 ? 'done' : 'active') + '">1 Detect' + (s1 ? ' ✓' : '') + '</span>' +
          '<span class="muted">→</span>' +
          '<span class="tut-pill ' + (s2 ? 'done' : 'active') + '">2 Run' + (s2 ? ' ✓' : '') + '</span>' +
          '<span class="muted">→</span>' +
          '<span class="tut-pill ' + (s3 ? 'done' : (anyRunning ? 'active' : '')) + '">3 Compare' + (s3 ? ' ✓' : '') + '</span>' +
          '<span class="muted">→</span>' +
          '<span class="tut-pill ' + (s4 ? 'done' : (allSettled ? 'active' : '')) + '">4 Judge' + (s4 ? ' ✓' : '') + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          (!tutTask || allSettled ? '<button id="btnRunTutorial" class="primary" style="padding:3px 10px;font-size:11.5px;">▶ Live Tutorial</button>' : '') +
          (allSettled ? '<button id="btnTutorialAnalyze" style="padding:3px 10px;font-size:11.5px;">Open Analysis ↗</button>' : '') +
          '<button id="btnDismissTutorial" class="ghost" style="padding:2px 6px;" title="Hide tutorial">×</button>' +
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
          composerStatus.textContent = 'Select at least one available agent first.';
          return;
        }
        state.activeTaskId = null;
        state.activeTask = null;
        draftAgents = configs.map((c) => ({ ...c }));
        if (!promptInput.value.trim()) promptInput.value = TUTORIAL_PROMPT;
        if (!titleInput.value.trim()) titleInput.value = 'Live Welcome Tutorial';
        if (!tagsInput.value.trim()) tagsInput.value = 'tutorial';
        isolationSelect.value = 'scratch';
        agentsDrawerOpen = false;
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
      syncAgyDatalists();
      syncCustomAgyUi();
      renderTopControls();
      renderAddModeHeader();
      renderPresetBar();
      renderAgyPicker();
      renderTutorialBanner();
      renderColumns();
    }

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === 'state') {
        const prevMode = isolationSelect.value;
        state = msg.payload || state;
        if (!agyPickerInitialized && state.agyDefaults) {
          agyPickerInitialized = true;
          const d = state.agyDefaults;
          document.getElementById('agyPickMode').value = d.permissionMode || 'default';
          document.getElementById('agyPickAgent').value = d.agent || '';
          document.getElementById('agyPickSandbox').checked = Boolean(d.sandbox);
          document.getElementById('agyPickNoSlash').checked = Boolean(d.disableSlashCommands);
        }
        if (state.openAddDrawer) {
          agentsDrawerOpen = true;
        }
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
        renderAll();
        if (scrollColumnsToEndNext) {
          scrollColumnsToEndNext = false;
          columnsWrap.scrollLeft = columnsWrap.scrollWidth;
        }
        if (state.activeTask) {
          const anyRunning = (state.activeTask.candidates || []).some((c) => c.status === 'running' || c.status === 'pending');
          composerStatus.textContent = anyRunning ? 'Running concurrently…' : 'Complete.';
        }
      } else if (msg.type === 'candidateProgress') {
        patchCandidateInPlace(msg.payload);
        renderTutorialBanner();
      } else if (msg.type === 'rawLogLoaded') {
        rawCache[msg.payload.candId] = msg.payload.text;
        const pane = columnsWrap.querySelector('.pane[data-cand-id="' + CSS.escape(msg.payload.candId) + '"]');
        if (pane && state.activeTask) {
          const cand = (state.activeTask.candidates || []).find((x) => x.id === msg.payload.candId);
          if (cand && effectivePaneMode(cand) === 'raw') {
            const body = pane.querySelector('.pane-body');
            if (body) body.innerHTML = '<pre class="raw-box">' + esc(msg.payload.text || '(empty)') + '</pre>';
          }
        }
      } else if (msg.type === 'fileContentLoaded') {
        const p = msg.payload || {};
        const ck = p.taskId + '::' + p.candId + '::' + p.relPath;
        fileCache[ck] = { text: p.text || '', error: p.error || null };
        if (state.activeTask && state.activeTask.id === p.taskId) {
          const cand = (state.activeTask.candidates || []).find((x) => x.id === p.candId);
          if (cand && effectivePaneMode(cand) === 'file:' + p.relPath) {
            patchCandidateInPlace({ ...cand, taskId: p.taskId });
          }
        }
      } else if (msg.type === 'errorToast') {
        composerStatus.textContent = msg.payload;
      }
    });

    setInterval(() => {
      document.querySelectorAll('.pane-timer[data-status="running"]').forEach((el) => {
        const st = el.getAttribute('data-start');
        if (st) el.textContent = fmtDuration(Date.now() - Date.parse(st));
      });
      if (state.activeTask) {
        sinceBadge.textContent = fmtSince(state.activeTask.createdAt) + ' · ' + state.activeTask.isolationMode;
      }
    }, 1000);

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}

module.exports = { renderArenaHtml };
