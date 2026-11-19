'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vscode = require('vscode');

const store = require('./lib/store');
const harnesses = require('./lib/harnesses');
const isolator = require('./lib/isolator');
const stats = require('./lib/stats');
const { renderSidebarHtml } = require('./webview/sidebar');
const { renderArenaHtml } = require('./webview/arena');
const { renderAnalysisHtml } = require('./webview/analysis');

function getWorkspaceRoot() {
  const folders = vscode.workspace.workspaceFolders;
  if (folders && folders.length > 0) {
    return folders[0].uri.fsPath;
  }
  return path.join(os.homedir(), '.agent-arena-default');
}

function getConfig() {
  const cfg = vscode.workspace.getConfiguration('agentArena');
  return {
    presets: cfg.get('presets') || [],
    defaultIsolationMode: cfg.get('defaultIsolationMode') || 'direct',
    maxConcurrency: Number(cfg.get('maxConcurrency')) || 6,
    timeoutMinutes: Number(cfg.get('timeoutMinutes')) || 30,
    symlinkDirs: cfg.get('symlinkDirs') || isolator.DEFAULT_SYMLINK_DIRS,
    claudePermissionMode: cfg.get('claudePermissionMode') || 'acceptEdits',
    codexSandboxMode: cfg.get('codexSandboxMode') || 'workspace-write',
    opencodeAuto: cfg.get('opencodeAuto') !== false,
  };
}

function activate(context) {
  let sidebarView = null;
  let arenaPanel = null;
  let analysisPanel = null;
  let activeArenaTaskId = null;
  let activeAnalysisTaskId = null;
  let analysisFilter = { tag: '', harness: '' };
  let activeRunners = new Map(); // `${taskId}::${candId}` -> { cancel, taskId, candId }
  let deletedTasks = new Set();
  let recentLaunchHashes = new Map();
  let launchInFlight = false;
  let statusTicker = null;

  // Clean up any orphaned running/pending tasks left over from a previous VS Code session
  store.reconcileStaleTasks(getWorkspaceRoot(), new Set());

  function isTutorialVisible() {
    const dismissed = Boolean(context.globalState && context.globalState.get('agentArena.tutorialDismissed'));
    if (dismissed) return false;
    const tasks = store.listTasks(getWorkspaceRoot());
    const tutTid = context.globalState && context.globalState.get('agentArena.tutorialTaskId');
    if (tasks.some((t) => Boolean(t.judgment)) && !tutTid) return false;
    return true;
  }

  function getTutorialState() {
    const tutTid = context.globalState ? context.globalState.get('agentArena.tutorialTaskId') : null;
    const tasks = store.listTasks(getWorkspaceRoot());
    const tutTask = tutTid ? tasks.find((t) => t.id === tutTid) : null;
    return {
      visible: isTutorialVisible(),
      taskId: tutTask ? tutTask.id : null,
      completed: Boolean(tutTask && tutTask.judgment),
    };
  }

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
  statusBar.text = '$(beaker) Arena: Ready';
  statusBar.tooltip = 'Open Agent Arena Side-by-Side Panel';
  statusBar.command = 'agentArena.openArena';
  statusBar.show();
  context.subscriptions.push(statusBar);

  function updateStatusBar() {
    const running = Array.from(activeRunners.values());
    if (running.length > 0) {
      const root = getWorkspaceRoot();
      const firstTid = running[0].taskId;
      const task = store.loadTask(root, firstTid);
      const total = task ? task.candidates.length : running.length;
      const done = task
        ? task.candidates.filter((c) => c.status !== 'running' && c.status !== 'pending').length
        : 0;
      const elapsedSec = task && task.startedAt
        ? Math.max(0, Math.floor((Date.now() - Date.parse(task.startedAt)) / 1000))
        : 0;
      const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
      const ss = String(elapsedSec % 60).padStart(2, '0');
      statusBar.text = `$(sync~spin) Arena: ${done}/${total} done · ${mm}:${ss}`;
      statusBar.command = 'agentArena.openArena';
      if (!statusTicker) {
        statusTicker = setInterval(updateStatusBar, 1000);
      }
      return;
    }
    if (statusTicker) {
      clearInterval(statusTicker);
      statusTicker = null;
    }
    const root = getWorkspaceRoot();
    const tasks = store.listTasks(root);
    if (tasks.length > 0 && tasks[0].finishedAt) {
      const latest = tasks[0];
      const ok = latest.candidates.filter((c) => c.status === 'done').length;
      statusBar.text = `$(check) Arena: ${ok}/${latest.candidates.length} done`;
      statusBar.command = 'agentArena.openAnalysis';
    } else {
      statusBar.text = '$(beaker) Arena: Ready';
      statusBar.command = 'agentArena.openArena';
    }
  }

  function pushSidebarState() {
    if (!sidebarView) return;
    const root = getWorkspaceRoot();
    sidebarView.webview.postMessage({
      type: 'state',
      payload: {
        harnesses: harnesses.detectHarnesses(),
        tasks: store.listTasks(root),
      },
    });
  }

  function pushArenaState(taskId = activeArenaTaskId) {
    if (!arenaPanel) return;
    const root = getWorkspaceRoot();
    const cfg = getConfig();
    const tasks = store.listTasks(root);
    if (taskId !== undefined) activeArenaTaskId = taskId;
    const activeTask = activeArenaTaskId ? store.loadTask(root, activeArenaTaskId) : null;
    const detected = harnesses.detectHarnesses();
    arenaPanel.webview.postMessage({
      type: 'state',
      payload: {
        presets: harnesses.getEffectivePresets(cfg.presets, detected),
        tutorialPresets: harnesses.pickTutorialConfigs(detected),
        harnesses: detected,
        tasks,
        activeTaskId: activeTask ? activeTask.id : null,
        activeTask,
        defaultIsolationMode: cfg.defaultIsolationMode,
        settingsSummary: {
          claudePermissionMode: cfg.claudePermissionMode,
          codexSandboxMode: cfg.codexSandboxMode,
        },
        tutorial: getTutorialState(),
      },
    });
  }

  function pushAnalysisState(taskId = activeAnalysisTaskId, tab = null) {
    if (!analysisPanel) return;
    const root = getWorkspaceRoot();
    const tasks = store.listTasks(root);
    if (taskId) activeAnalysisTaskId = taskId;
    if (!activeAnalysisTaskId && tasks.length) activeAnalysisTaskId = tasks[0].id;
    analysisPanel.webview.postMessage({
      type: 'state',
      payload: {
        tasks,
        selectedTaskId: activeAnalysisTaskId,
        leaderboard: stats.computeLeaderboard(tasks, analysisFilter),
        tab: tab || undefined,
      },
    });
  }

  function refreshAllViews() {
    updateStatusBar();
    pushSidebarState();
    pushArenaState(activeArenaTaskId);
    pushAnalysisState(activeAnalysisTaskId);
  }

  async function openFileInIde(taskId, candId, relPath) {
    const root = getWorkspaceRoot();
    const task = store.loadTask(root, taskId);
    if (!task) return;
    const cand = (task.candidates || []).find((c) => c.id === candId);
    if (!cand) return;
    let target;
    try {
      target = isolator.assertInsideDir(cand.workDir, relPath);
    } catch (err) {
      vscode.window.showWarningMessage(err.message);
      return;
    }
    if (!fs.existsSync(target)) {
      vscode.window.showWarningMessage(`File not found: ${relPath}`);
      return;
    }
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(target));
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  async function openDiffInIde(taskId, candId, relPath) {
    const root = getWorkspaceRoot();
    const task = store.loadTask(root, taskId);
    if (!task) return;
    const cand = (task.candidates || []).find((c) => c.id === candId);
    if (!cand) return;
    let rightPath;
    try {
      rightPath = isolator.assertInsideDir(cand.workDir, relPath);
      if (task.baselineDir) isolator.assertInsideDir(task.baselineDir, relPath);
    } catch (err) {
      vscode.window.showWarningMessage(err.message);
      return;
    }
    const leftPath = task.baselineDir ? path.join(task.baselineDir, relPath) : '';
    if (!fs.existsSync(rightPath)) {
      vscode.window.showWarningMessage(`Candidate file not found: ${relPath}`);
      return;
    }
    if (!task.baselineDir || !fs.existsSync(leftPath)) {
      await openFileInIde(taskId, candId, relPath);
      return;
    }
    await vscode.commands.executeCommand(
      'vscode.diff',
      vscode.Uri.file(leftPath),
      vscode.Uri.file(rightPath),
      `${cand.label}: ${relPath}`,
    );
  }

  async function adoptCandidateIntoWorkspace(taskId, candId) {
    const root = getWorkspaceRoot();
    const task = store.loadTask(root, taskId);
    if (!task) return;
    if (task.isolationMode === 'direct') {
      vscode.window.showInformationMessage('Task ran directly in the workspace; changes are already present.');
      return;
    }
    const cand = (task.candidates || []).find((c) => c.id === candId);
    if (!cand) return;
    const ch = cand.changedFiles || {};
    const fileList = [...(ch.added || []), ...(ch.modified || [])];
    if (!fileList.length) {
      vscode.window.showInformationMessage('Selected candidate produced no added or modified files.');
      return;
    }
    const preview = fileList.slice(0, 8).join(', ') + (fileList.length > 8 ? ` (+${fileList.length - 8} more)` : '');
    const choice = await vscode.window.showWarningMessage(
      `Copy ${fileList.length} file(s) from "${cand.label}" into ${path.basename(root)}?\n${preview}`,
      { modal: true },
      'Adopt Files',
    );
    if (choice !== 'Adopt Files') return;
    const res = isolator.adoptWinner(root, cand.workDir, ch);
    vscode.window.showInformationMessage(`Adopted ${res.applied.length} file(s) from ${cand.label}.`);
  }

  async function exportAllData(preferredFormat = null) {
    const root = getWorkspaceRoot();
    const tasks = store.listTasks(root);
    if (!tasks.length) {
      vscode.window.showInformationMessage('Agent Arena: No tasks to export yet.');
      return;
    }
    let fmt = preferredFormat;
    if (!fmt) {
      const picked = await vscode.window.showQuickPick(['csv', 'json'], {
        placeHolder: 'Choose export format',
      });
      if (!picked) return;
      fmt = picked;
    }
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(path.join(root, `agent-arena-runs.${fmt}`)),
      filters: fmt === 'csv' ? { CSV: ['csv'] } : { JSON: ['json'] },
    });
    if (!uri) return;
    const content = fmt === 'csv' ? store.exportTasksCsv(tasks) : store.exportTasksJson(tasks);
    fs.writeFileSync(uri.fsPath, content, 'utf8');
    vscode.window.showInformationMessage(`Exported ${tasks.length} task(s) to ${path.basename(uri.fsPath)}.`);
  }

  function cancelTask(taskId) {
    let count = 0;
    for (const [k, runner] of activeRunners.entries()) {
      if (!taskId || runner.taskId === taskId) {
        runner.cancel();
        activeRunners.delete(k);
        count += 1;
      }
    }
    updateStatusBar();
    return count;
  }

  async function launchTask(payload) {
    if (!payload || !String(payload.prompt || '').trim() || !Array.isArray(payload.configs) || !payload.configs.length) {
      return;
    }
    const promptHash = crypto.createHash('sha256').update(String(payload.prompt || ''), 'utf8').digest('hex');
    const lastTs = recentLaunchHashes.get(promptHash) || 0;
    if (launchInFlight || Date.now() - lastTs < 3000) {
      return;
    }
    launchInFlight = true;
    recentLaunchHashes.set(promptHash, Date.now());

    const root = getWorkspaceRoot();
    const cfg = getConfig();
    const task = store.createTask(root, {
      title: payload.title,
      tags: payload.tags,
      prompt: payload.prompt,
      isolationMode: payload.isolationMode || cfg.defaultIsolationMode,
      configs: payload.configs,
    });

    try {
      await isolator.prepareTaskEnvironment(root, task, { symlinkDirs: cfg.symlinkDirs });
    } catch (err) {
      launchInFlight = false;
      store.deleteTask(root, task.id);
      vscode.window.showErrorMessage(`Agent Arena setup failed: ${err.message}`);
      if (arenaPanel) {
        arenaPanel.webview.postMessage({ type: 'errorToast', payload: err.message });
      }
      return;
    }

    if (payload.isTutorial && context.globalState) {
      await context.globalState.update('agentArena.tutorialDismissed', false);
      await context.globalState.update('agentArena.tutorialTaskId', task.id);
    }

    task.startedAt = new Date().toISOString();
    store.saveTask(root, task);
    activeArenaTaskId = task.id;
    activeAnalysisTaskId = task.id;
    launchInFlight = false;
    refreshAllViews();

    const maxConc = Math.max(1, cfg.maxConcurrency || 6);
    const queue = [...task.candidates];
    let settledCount = 0;

    async function runOne(candRef) {
      const liveTask = store.loadTask(root, task.id);
      const cand = liveTask.candidates.find((c) => c.id === candRef.id);
      cand.status = 'running';
      cand.startedAt = new Date().toISOString();
      store.saveTask(root, liveTask);

      if (arenaPanel) {
        arenaPanel.webview.postMessage({
          type: 'candidateProgress',
          payload: { ...cand, taskId: task.id },
        });
      }
      updateStatusBar();
      pushSidebarState();

      const key = `${task.id}::${cand.id}`;
      const handle = harnesses.spawnCandidate(
        cand,
        liveTask,
        {
          workspaceRoot: root,
          timeoutMinutes: cfg.timeoutMinutes,
          claudePermissionMode: cfg.claudePermissionMode,
          codexSandboxMode: cfg.codexSandboxMode,
          opencodeAuto: cfg.opencodeAuto,
        },
        {
          onProgress: (prog) => {
            if (!arenaPanel) return;
            arenaPanel.webview.postMessage({
              type: 'candidateProgress',
              payload: {
                ...cand,
                taskId: task.id,
                status: 'running',
                durationMs: prog.durationMs,
                telemetry: prog.telemetry,
                feedPreview: prog.feed,
                finalText: prog.finalText,
              },
            });
          },
        },
      );

      activeRunners.set(key, { cancel: handle.cancel, taskId: task.id, candId: cand.id });
      const res = await handle.promise;
      activeRunners.delete(key);

      if (deletedTasks.has(task.id)) return;
      const postTask = store.loadTask(root, task.id);
      if (!postTask) return;
      const targetCand = postTask.candidates.find((c) => c.id === cand.id);
      if (!targetCand) return;

      targetCand.status = res.status;
      targetCand.exitCode = res.exitCode;
      targetCand.finishedAt = new Date().toISOString();
      targetCand.durationMs = res.durationMs;
      targetCand.telemetry = res.telemetry;
      targetCand.feedPreview = res.feed;
      targetCand.finalText = res.finalText;
      targetCand.error = res.error;

      if (postTask.isolationMode === 'direct') {
        targetCand.changedFiles = isolator.computeDirectChanges(postTask.directBeforeManifest, root, {
          symlinkDirs: cfg.symlinkDirs,
        });
      } else if (postTask.isolationMode === 'scratch') {
        targetCand.changedFiles = isolator.computeWorkspaceDiff(null, targetCand.workDir, {
          symlinkDirs: cfg.symlinkDirs,
        });
      } else {
        targetCand.changedFiles = isolator.computeWorkspaceDiff(postTask.baselineDir, targetCand.workDir, {
          symlinkDirs: cfg.symlinkDirs,
        });
      }

      settledCount += 1;
      if (settledCount === postTask.candidates.length) {
        postTask.finishedAt = new Date().toISOString();
      }
      store.saveTask(root, postTask);

      if (arenaPanel) {
        arenaPanel.webview.postMessage({
          type: 'candidateProgress',
          payload: { ...targetCand, taskId: postTask.id },
        });
      }
      updateStatusBar();
      pushSidebarState();
      pushAnalysisState(postTask.id);

      if (settledCount === postTask.candidates.length) {
        const okCount = postTask.candidates.filter((c) => c.status === 'done').length;
        const msg = `Agent Arena: ${okCount}/${postTask.candidates.length} agents finished — ${postTask.title}`;
        const picked = await vscode.window.showInformationMessage(msg, 'Open Analysis', 'Show Arena');
        if (picked === 'Open Analysis') openAnalysisPanel(postTask.id);
        else if (picked === 'Show Arena') openArenaPanel(postTask.id);
      }
    }

    const workers = Array.from({ length: Math.min(maxConc, queue.length) }, async () => {
      while (queue.length > 0) {
        const nextCand = queue.shift();
        if (nextCand) await runOne(nextCand);
      }
    });
    await Promise.all(workers);
  }

  function openArenaPanel(taskId = undefined) {
    if (taskId !== undefined) activeArenaTaskId = taskId;
    if (arenaPanel) {
      arenaPanel.reveal(vscode.ViewColumn.One);
      pushArenaState(activeArenaTaskId);
      return;
    }
    arenaPanel = vscode.window.createWebviewPanel(
      'agentArena.arena',
      'Agent Arena — Side-by-Side',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    arenaPanel.webview.html = renderArenaHtml(arenaPanel.webview);
    arenaPanel.onDidDispose(() => {
      arenaPanel = null;
    });
    arenaPanel.webview.onDidReceiveMessage(async (msg) => {
      if (!msg) return;
      if (msg.type === 'ready') {
        pushArenaState(activeArenaTaskId);
      } else if (msg.type === 'selectTask') {
        pushArenaState(msg.taskId || null);
      } else if (msg.type === 'launchTask') {
        await launchTask(msg.payload);
      } else if (msg.type === 'cancelTask') {
        cancelTask(msg.taskId);
      } else if (msg.type === 'cancelCandidate') {
        const r = activeRunners.get(`${msg.taskId}::${msg.candId}`);
        if (r) r.cancel();
      } else if (msg.type === 'openAnalysis') {
        openAnalysisPanel(msg.taskId || activeArenaTaskId);
      } else if (msg.type === 'openSettings') {
        await vscode.commands.executeCommand('workbench.action.openSettings', 'agentArena');
      } else if (msg.type === 'rerunTask') {
        const root = getWorkspaceRoot();
        const task = msg.taskId ? store.loadTask(root, msg.taskId) : null;
        if (task) {
          await launchTask({
            title: task.title,
            tags: task.tags || [],
            prompt: task.prompt,
            isolationMode: task.isolationMode,
            configs: (task.candidates || []).map((c) => ({
              label: c.label,
              harness: c.harness,
              model: c.model,
              effort: c.effort,
              extraArgs: c.extraArgs || [],
              commandTemplate: c.commandTemplate || '',
            })),
          });
        }
      } else if (msg.type === 'dismissTutorial') {
        if (context.globalState) await context.globalState.update('agentArena.tutorialDismissed', true);
        pushArenaState(activeArenaTaskId);
      } else if (msg.type === 'openFile') {
        await openFileInIde(msg.taskId, msg.candId, msg.relPath);
      } else if (msg.type === 'diffFile') {
        await openDiffInIde(msg.taskId, msg.candId, msg.relPath);
      } else if (msg.type === 'adoptCandidate') {
        await adoptCandidateIntoWorkspace(msg.taskId, msg.candId);
      } else if (msg.type === 'loadRawLog') {
        const root = getWorkspaceRoot();
        const task = store.loadTask(root, msg.taskId);
        const cand = task && (task.candidates || []).find((c) => c.id === msg.candId);
        let txt = '';
        if (cand) {
          const out = cand.stdoutPath && fs.existsSync(cand.stdoutPath) ? fs.readFileSync(cand.stdoutPath, 'utf8') : '';
          const err = cand.stderrPath && fs.existsSync(cand.stderrPath) ? fs.readFileSync(cand.stderrPath, 'utf8') : '';
          txt = [out, err ? `\n--- STDERR ---\n${err}` : ''].filter(Boolean).join('\n');
          if (txt.length > 150000) txt = `${txt.slice(0, 150000)}\n… [truncated]`;
        }
        arenaPanel.webview.postMessage({ type: 'rawLogLoaded', payload: { candId: msg.candId, text: txt } });
      }
    });
  }

  function openAnalysisPanel(taskId = undefined, tab = null) {
    if (taskId) activeAnalysisTaskId = taskId;
    if (analysisPanel) {
      analysisPanel.reveal(vscode.ViewColumn.Beside);
      pushAnalysisState(activeAnalysisTaskId, tab);
      return;
    }
    analysisPanel = vscode.window.createWebviewPanel(
      'agentArena.analysis',
      'Agent Arena — Analysis & Telemetry',
      vscode.ViewColumn.Beside,
      { enableScripts: true, retainContextWhenHidden: true },
    );
    analysisPanel.webview.html = renderAnalysisHtml(analysisPanel.webview);
    analysisPanel.onDidDispose(() => {
      analysisPanel = null;
    });
    analysisPanel.webview.onDidReceiveMessage(async (msg) => {
      if (!msg) return;
      if (msg.type === 'ready' || msg.type === 'refresh') {
        pushAnalysisState(activeAnalysisTaskId, msg.type === 'ready' ? tab : null);
      } else if (msg.type === 'openArena') {
        openArenaPanel(msg.taskId);
      } else if (msg.type === 'export') {
        await exportAllData(msg.format);
      } else if (msg.type === 'filterLeaderboard') {
        analysisFilter = { tag: msg.tag || '', harness: msg.harness || '' };
        pushAnalysisState(activeAnalysisTaskId, 'board');
      } else if (msg.type === 'loadDiff') {
        const root = getWorkspaceRoot();
        const task = store.loadTask(root, msg.taskId);
        const cand = task && (task.candidates || []).find((c) => c.id === msg.candId);
        let diffText = '';
        if (cand) {
          try {
            diffText = isolator.getUnifiedDiff(task.baselineDir, cand.workDir, msg.relPath);
          } catch (err) {
            diffText = `[Diff error: ${err.message}]`;
          }
        }
        analysisPanel.webview.postMessage({
          type: 'diffLoaded',
          payload: { relPath: msg.relPath, candId: msg.candId, text: diffText },
        });
      } else if (msg.type === 'diffFile') {
        await openDiffInIde(msg.taskId, msg.candId, msg.relPath);
      } else if (msg.type === 'saveJudgment') {
        const root = getWorkspaceRoot();
        store.saveJudgment(root, msg.taskId, msg.payload);
        if (context.globalState && context.globalState.get('agentArena.tutorialTaskId') === msg.taskId) {
          await context.globalState.update('agentArena.tutorialDismissed', true);
        }
        vscode.window.showInformationMessage('Judgment saved and leaderboard updated.');
        refreshAllViews();
      } else if (msg.type === 'adoptWinner') {
        const root = getWorkspaceRoot();
        const task = store.loadTask(root, msg.taskId);
        if (task && task.judgment && task.judgment.winnerId) {
          await adoptCandidateIntoWorkspace(msg.taskId, task.judgment.winnerId);
        }
      }
    });
  }

  const sidebarProvider = {
    resolveWebviewView(webviewView) {
      sidebarView = webviewView;
      webviewView.webview.options = { enableScripts: true };
      webviewView.webview.html = renderSidebarHtml(webviewView.webview);
      webviewView.onDidDispose(() => {
        sidebarView = null;
      });
      webviewView.webview.onDidReceiveMessage(async (msg) => {
        if (!msg) return;
        if (msg.type === 'ready') {
          pushSidebarState();
        } else if (msg.type === 'openArena') {
          openArenaPanel(msg.taskId);
        } else if (msg.type === 'openAnalysis') {
          openAnalysisPanel(msg.taskId);
        } else if (msg.type === 'startTutorial') {
          if (context.globalState) await context.globalState.update('agentArena.tutorialDismissed', false);
          openArenaPanel(null);
        } else if (msg.type === 'openSettings') {
          await vscode.commands.executeCommand('workbench.action.openSettings', 'agentArena');
        } else if (msg.type === 'cancelTask') {
          cancelTask(msg.taskId);
        } else if (msg.type === 'deleteTask') {
          const root = getWorkspaceRoot();
          const task = store.loadTask(root, msg.taskId);
          if (task) {
            const confirm = await vscode.window.showWarningMessage(
              `Delete run "${task.title}" and its logs?`,
              { modal: true },
              'Delete Run',
            );
            if (confirm !== 'Delete Run') return;
            deletedTasks.add(msg.taskId);
            cancelTask(msg.taskId);
            isolator.cleanupTaskWorktrees(root, task);
            store.deleteTask(root, msg.taskId);
            if (activeArenaTaskId === msg.taskId) activeArenaTaskId = null;
            if (activeAnalysisTaskId === msg.taskId) activeAnalysisTaskId = null;
            refreshAllViews();
          }
        }
      });
    },
  };

  context.subscriptions.push(
    { dispose: () => cancelTask(null) },
    vscode.window.registerWebviewViewProvider('agentArena.sidebar', sidebarProvider),
    vscode.commands.registerCommand('agentArena.openArena', () => openArenaPanel()),
    vscode.commands.registerCommand('agentArena.openAnalysis', () => openAnalysisPanel()),
    vscode.commands.registerCommand('agentArena.startTutorial', async () => {
      if (context.globalState) await context.globalState.update('agentArena.tutorialDismissed', false);
      openArenaPanel(null);
    }),
    vscode.commands.registerCommand('agentArena.cancelAll', () => {
      const stopped = cancelTask(null);
      vscode.window.showInformationMessage(`Stopped ${stopped} running agent(s).`);
    }),
    vscode.commands.registerCommand('agentArena.exportData', () => exportAllData()),
  );

  updateStatusBar();
}

function deactivate() {
  // No global background processes left running; VS Code disposes subscriptions.
}

module.exports = {
  activate,
  deactivate,
};
