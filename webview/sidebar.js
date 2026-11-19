'use strict';

const { makeNonce, sharedCss, browserFormatHelpers } = require('./common');

function renderSidebarHtml(webview) {
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
    body { padding: 10px; }
    .actions { display: grid; grid-template-columns: 1fr; gap: 6px; margin-bottom: 12px; }
    .actions > button { width: 100%; justify-content: center; padding: 7px 10px; }
    .actions-row { display: flex; gap: 6px; min-width: 0; }
    .actions-row button { justify-content: center; padding: 6px 8px; min-width: 0; }
    .section-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--aa-muted);
      margin: 12px 0 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .harness-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 8px;
    }
    .h-pill {
      font-size: 11px;
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid var(--aa-border);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .task-list { display: flex; flex-direction: column; gap: 7px; }
    .task-item {
      border: 1px solid var(--aa-border);
      background: var(--aa-card);
      border-radius: 5px;
      padding: 8px;
    }
    .task-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 6px;
      margin-bottom: 4px;
    }
    .task-title {
      font-weight: 600;
      font-size: 12.5px;
      word-break: break-word;
    }
    .task-meta {
      font-size: 11px;
      color: var(--aa-muted);
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 6px;
    }
    .task-btns {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }
    .task-btns button { font-size: 11px; padding: 3px 7px; }
  </style>
</head>
<body>
  <div class="actions">
    <button id="btnOpenArena" class="primary">Open Side-by-Side Arena</button>
    <button id="btnOpenAnalysis">Open Analysis &amp; Telemetry</button>
    <div class="actions-row">
      <button id="btnStartTutorial" style="flex:1 1 auto;">Live Welcome Tutorial</button>
      <button id="btnOpenSettings" title="Configure Agent Arena Settings" style="flex:0 0 auto;">Settings ⚙</button>
    </div>
  </div>

  <div class="section-title">
    <span>Detected Harnesses</span>
    <span id="harnessRatio" class="mono"></span>
  </div>
  <div id="harnesses" class="harness-grid"></div>

  <div class="section-title">
    <span>Recent Runs</span>
    <span id="runCount" class="mono"></span>
  </div>
  <div id="taskList" class="task-list"></div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    ${browserFormatHelpers()}

    let currentState = { harnesses: {}, tasks: [] };

    document.getElementById('btnOpenArena').addEventListener('click', () => {
      vscode.postMessage({ type: 'openArena' });
    });
    document.getElementById('btnOpenAnalysis').addEventListener('click', () => {
      vscode.postMessage({ type: 'openAnalysis' });
    });
    document.getElementById('btnStartTutorial').addEventListener('click', () => {
      vscode.postMessage({ type: 'startTutorial' });
    });
    document.getElementById('btnOpenSettings').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    function render() {
      const hEl = document.getElementById('harnesses');
      const hEntries = Object.entries(currentState.harnesses || {}).filter(([k]) => k !== 'custom');
      const availCount = hEntries.filter(([, info]) => info && info.available).length;
      document.getElementById('harnessRatio').textContent = availCount + '/' + hEntries.length;
      hEl.innerHTML = hEntries.map(([name, info]) => {
        const cls = info && info.available ? 'ok' : 'no';
        return '<span class="h-pill" title="' + esc(info && info.path ? info.path : 'Not found in PATH') + '">' +
          '<span class="dot ' + cls + '"></span>' + esc(name) + '</span>';
      }).join('');

      const tasks = currentState.tasks || [];
      document.getElementById('runCount').textContent = String(tasks.length);
      const tEl = document.getElementById('taskList');
      if (!tasks.length) {
        tEl.innerHTML = '<div class="card muted" style="font-size:12px;">No runs yet. Open the Side-by-Side Arena to launch your first multi-agent prompt.</div>';
        return;
      }

      tEl.innerHTML = tasks.map((t) => {
        const cands = t.candidates || [];
        const running = cands.filter((c) => c.status === 'running' || c.status === 'pending').length;
        const done = cands.filter((c) => c.status === 'done').length;
        const interrupted = cands.filter((c) => c.status === 'interrupted').length;
        let badge = '<span class="badge done">' + done + '/' + cands.length + ' done</span>';
        if (running > 0) {
          badge = '<span class="badge running"><span class="spinner"></span>' + (cands.length - running) + '/' + cands.length + '</span>';
        } else if (interrupted > 0 && done === 0) {
          badge = '<span class="badge cancelled">Interrupted</span>';
        } else if (interrupted > 0) {
          badge = '<span class="badge cancelled">' + done + '/' + cands.length + ' (' + interrupted + ' int.)</span>';
        }
        let winnerHtml = '';
        if (t.judgment) {
          if (t.judgment.isTie) {
            winnerHtml = '<span class="badge winner">Tie</span>';
          } else if (t.judgment.winnerId) {
            const wc = cands.find((c) => c.id === t.judgment.winnerId);
            if (wc) winnerHtml = '<span class="badge winner">★ ' + esc(wc.label) + '</span>';
          }
        }
        return '<div class="task-item">' +
          '<div class="task-head"><div class="task-title">' + esc(t.title) + '</div>' + badge + '</div>' +
          '<div class="task-meta">' +
            '<span class="since-age" data-iso="' + esc(t.createdAt) + '">' + fmtSince(t.createdAt) + '</span>' +
            '<span>· ' + esc(t.isolationMode || 'direct') + '</span>' +
            '<span>· ' + cands.length + ' agents</span>' +
            winnerHtml +
          '</div>' +
          '<div class="task-btns">' +
            '<button data-action="arena" data-id="' + esc(t.id) + '">Arena</button>' +
            '<button data-action="analysis" data-id="' + esc(t.id) + '">Analysis</button>' +
            (running > 0 ? '<button class="danger" data-action="cancel" data-id="' + esc(t.id) + '">Stop</button>' : '') +
            '<button class="danger" data-action="delete" data-id="' + esc(t.id) + '" title="Delete task">Del</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    document.getElementById('taskList').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const taskId = btn.getAttribute('data-id');
      if (action === 'arena') vscode.postMessage({ type: 'openArena', taskId });
      else if (action === 'analysis') vscode.postMessage({ type: 'openAnalysis', taskId });
      else if (action === 'cancel') vscode.postMessage({ type: 'cancelTask', taskId });
      else if (action === 'delete') vscode.postMessage({ type: 'deleteTask', taskId });
    });

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (msg && msg.type === 'state') {
        currentState = msg.payload || currentState;
        render();
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

module.exports = { renderSidebarHtml };
