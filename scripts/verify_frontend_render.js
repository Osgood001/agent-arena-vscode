#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const EXT_ROOT = path.resolve(__dirname, '..');

const store = require(path.join(EXT_ROOT, 'lib/store'));
const harnesses = require(path.join(EXT_ROOT, 'lib/harnesses'));
const judge = require(path.join(EXT_ROOT, 'lib/judge'));
const stats = require(path.join(EXT_ROOT, 'lib/stats'));
const { renderArenaHtml } = require(path.join(EXT_ROOT, 'webview/arena'));
const { renderAnalysisHtml } = require(path.join(EXT_ROOT, 'webview/analysis'));

const THEMES = {
  dark: `
  <style>
    :root {
      --vscode-editor-background: #1e1e1e;
      --vscode-editor-foreground: #d4d4d4;
      --vscode-descriptionForeground: #9da5b4;
      --vscode-editorWidget-background: #252526;
      --vscode-panel-border: #3c3c3c;
      --vscode-button-background: #2a8c82;
      --vscode-button-foreground: #ffffff;
      --vscode-button-hoverBackground: #23746c;
      --vscode-button-secondaryBackground: #3a3d41;
      --vscode-button-secondaryForeground: #cccccc;
      --vscode-input-background: #3c3c3c;
      --vscode-input-foreground: #cccccc;
      --vscode-input-border: #555555;
      --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      --vscode-editor-font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --vscode-font-size: 13px;
    }
  </style>`,
  light: `
  <style>
    :root {
      --vscode-editor-background: #ffffff;
      --vscode-editor-foreground: #1f2328;
      --vscode-descriptionForeground: #57606a;
      --vscode-editorWidget-background: #f6f8fa;
      --vscode-panel-border: #d0d7de;
      --vscode-button-background: #2a8c82;
      --vscode-button-foreground: #ffffff;
      --vscode-button-hoverBackground: #23746c;
      --vscode-button-secondaryBackground: #eaeef2;
      --vscode-button-secondaryForeground: #24292f;
      --vscode-input-background: #ffffff;
      --vscode-input-foreground: #1f2328;
      --vscode-input-border: #d0d7de;
      --vscode-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      --vscode-editor-font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --vscode-font-size: 13px;
    }
  </style>`,
};

function findChromeBinary() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error('Headless Chrome binary not found. Set CHROME_BIN to render screenshots.');
}

function parseArgs(argv) {
  const opts = {
    workspace: EXT_ROOT,
    outDir: path.join(EXT_ROOT, 'docs', 'screenshots'),
    theme: 'dark',
    qaDir: '',
    sanitizeLabels: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--workspace' && argv[i + 1]) opts.workspace = path.resolve(argv[++i]);
    else if (a === '--out-dir' && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
    else if (a === '--qa-dir' && argv[i + 1]) opts.qaDir = path.resolve(argv[++i]);
    else if (a === '--theme' && argv[i + 1]) opts.theme = argv[++i];
    else if (a === '--sanitize-labels') opts.sanitizeLabels = true;
  }
  return opts;
}

function buildRedactions() {
  const defs = harnesses.discoverLocalDefaults();
  const map = [];
  const home = os.homedir();
  if (home) {
    map.push([home, '~']);
    const stripped = home.replace(/^[/\\]+/, '');
    if (stripped) map.push([stripped, '~']);
  }
  const replacementByHarness = {
    codex: 'o3-mini',
    claude: 'claude-sonnet',
    opencode: 'deepseek-chat',
    pi: 'deepseek-chat',
  };
  for (const [h, d] of Object.entries(defs)) {
    if (d && d.model && replacementByHarness[h] && d.model !== replacementByHarness[h]) {
      const target = replacementByHarness[h];
      map.push([d.model, target]);
      const slugFrom = d.model.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const slugTo = target.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (slugFrom && slugFrom !== slugTo) {
        map.push([slugFrom, slugTo]);
      }
    }
  }
  return map;
}

function sanitizeStringForPublic(str, redactions) {
  let s = String(str || '');
  for (const [from, to] of redactions) {
    if (from) s = s.split(from).join(to);
  }
  return s;
}

function sanitizeJudgeConfigForPublic(jCfg, redactions) {
  if (!jCfg) return jCfg;
  const pubModelMap = {
    codex: 'o3-mini',
    claude: 'claude-sonnet',
    opencode: 'deepseek-chat',
    pi: 'deepseek-chat',
    dsh: 'headless',
  };
  const mod = pubModelMap[jCfg.harness] || sanitizeStringForPublic(jCfg.model, redactions);
  const eff = jCfg.effort || '';
  const title = harnesses.HARNESS_LABELS[jCfg.harness] || jCfg.harness;
  return {
    ...jCfg,
    model: mod,
    label: eff ? `${title} · ${mod} (${eff})` : `${title} · ${mod}`,
  };
}

function sanitizeTasksForPublic(tasks) {
  const redactions = buildRedactions();
  const publicNames = {
    codex: { model: 'o3-mini', effort: 'low', label: 'Codex · default (low)' },
    claude: { model: 'claude-sonnet', effort: 'low', label: 'Claude Code · default (low)' },
    opencode: { model: 'deepseek-chat', effort: '', label: 'OpenCode · default' },
    pi: { model: 'deepseek-chat', effort: 'low', label: 'Pi · default (low)' },
    dsh: { model: 'headless', effort: '', label: 'DSH · headless' },
  };
  return tasks.map((t) => {
    const cleanedJudgment = t.judgment
      ? {
          ...t.judgment,
          judgeConfig: sanitizeJudgeConfigForPublic(t.judgment.judgeConfig, redactions),
          notes: sanitizeStringForPublic(t.judgment.notes, redactions),
        }
      : t.judgment;

    return {
      ...t,
      prompt: sanitizeStringForPublic(t.prompt, redactions),
      judgment: cleanedJudgment,
      candidates: (t.candidates || []).map((c) => {
        const m = publicNames[c.harness];
        const cleanedFeed = (c.feedPreview || [])
          .filter((item) => !(item.kind === 'stderr' && String(item.text || '').includes('unrecognized_model')))
          .map((item) => ({
            ...item,
            text: sanitizeStringForPublic(item.text, redactions),
          }));
        const cleanedFinal = sanitizeStringForPublic(c.finalText, redactions);
        const cleanedErr = c.error ? sanitizeStringForPublic(c.error, redactions) : c.error;
        if (!m) {
          return {
            ...c,
            feedPreview: cleanedFeed,
            finalText: cleanedFinal,
            error: cleanedErr,
          };
        }
        const key = m.effort ? `${c.harness} · ${m.model} (${m.effort})` : `${c.harness} · ${m.model}`;
        return {
          ...c,
          label: m.label,
          model: m.model,
          effort: m.effort,
          configKey: key,
          feedPreview: cleanedFeed,
          finalText: cleanedFinal,
          error: cleanedErr,
        };
      }),
    };
  });
}

function sanitizePresetsForPublic(presets) {
  return presets.map((p) => {
    const eff = (p.effort || '').trim();
    const title = harnesses.HARNESS_LABELS[p.harness] || p.harness;
    const mod = p.harness === 'dsh' ? 'headless' : 'default';
    return {
      ...p,
      model: mod === 'default' ? '' : mod,
      label: eff ? `${title} · ${mod} (${eff})` : `${title} · ${mod}`,
    };
  });
}

function injectHydration(html, statePayload, theme = 'dark') {
  const themeStyle = THEMES[theme] || THEMES.dark;
  const bodyClass = theme === 'light' ? 'vscode-light' : 'vscode-dark';
  const shim = `
  ${themeStyle}
  <script>
    window.acquireVsCodeApi = function() {
      return {
        postMessage: function(msg) {
          if (msg && msg.type === 'ready') {
            setTimeout(function() {
              window.dispatchEvent(new MessageEvent('message', {
                data: { type: 'state', payload: ${JSON.stringify(statePayload)} }
              }));
            }, 30);
          }
        },
        setState: function() {},
        getState: function() { return {}; }
      };
    };
  </script>
  `;
  return html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
    .replace('<head>', `<head>${shim}`)
    .replace('<body>', `<body class="${bodyClass}">`)
    .replace(/const vscode = acquireVsCodeApi\(\);/g, 'const vscode = window.acquireVsCodeApi();');
}

function capturePng(chromeBin, htmlContent, pngPath, tmpHtmlPath, windowSize = '1440,1200') {
  fs.mkdirSync(path.dirname(pngPath), { recursive: true });
  fs.writeFileSync(tmpHtmlPath, htmlContent, 'utf8');
  try {
    execFileSync(
      chromeBin,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-sandbox',
        `--window-size=${windowSize}`,
        '--virtual-time-budget=1200',
        `--screenshot=${pngPath}`,
        `file://${tmpHtmlPath}`,
      ],
      { stdio: 'pipe', timeout: 25000 },
    );
  } catch (err) {
    if (!fs.existsSync(pngPath) || fs.statSync(pngPath).size < 1000) {
      throw err;
    }
  }
  console.log(`[render] ${pngPath} (${fs.statSync(pngPath).size} bytes)`);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const chromeBin = findChromeBinary();
  const rawTasks = store.listTasks(opts.workspace);
  if (!rawTasks.length) {
    throw new Error(`No tasks found in ${path.join(opts.workspace, '.agent-arena/tasks')}`);
  }
  const tasks = opts.sanitizeLabels ? sanitizeTasksForPublic(rawTasks) : rawTasks;
  const activeTask = tasks[0];
  const detected = harnesses.detectHarnesses();
  const rawPresets = harnesses.getEffectivePresets([], detected);
  const presets = opts.sanitizeLabels ? sanitizePresetsForPublic(rawPresets) : rawPresets;
  const tutPresets = opts.sanitizeLabels ? sanitizePresetsForPublic(harnesses.pickTutorialConfigs(detected)) : harnesses.pickTutorialConfigs(detected);
  const rawJudgeCfg = judge.resolveJudgeConfig({}, {}, detected);
  const judgeConfig = opts.sanitizeLabels ? sanitizeJudgeConfigForPublic(rawJudgeCfg, buildRedactions()) : rawJudgeCfg;

  const fakeWebview = { cspSource: 'https:' };
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arena-render-'));

  try {
    const arenaPayload = {
      presets,
      tutorialPresets: tutPresets,
      harnesses: detected,
      tasks,
      activeTaskId: activeTask.id,
      activeTask,
      defaultIsolationMode: 'direct',
      settingsSummary: { claudePermissionMode: 'acceptEdits', codexSandboxMode: 'workspace-write' },
      tutorial: { visible: true, taskId: activeTask.id, completed: Boolean(activeTask.judgment) },
    };
    const leaderboard = stats.computeLeaderboard(tasks, {});

    capturePng(
      chromeBin,
      injectHydration(renderArenaHtml(fakeWebview), arenaPayload, opts.theme),
      path.join(opts.outDir, 'arena-side-by-side.png'),
      path.join(tmpDir, 'arena.html'),
      '1440,1040',
    );
    capturePng(
      chromeBin,
      injectHydration(
        renderAnalysisHtml(fakeWebview),
        { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, tab: 'run' },
        opts.theme,
      ),
      path.join(opts.outDir, 'analysis-telemetry.png'),
      path.join(tmpDir, 'analysis.html'),
      '1440,1260',
    );
    capturePng(
      chromeBin,
      injectHydration(
        renderAnalysisHtml(fakeWebview),
        { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, tab: 'board' },
        opts.theme,
      ),
      path.join(opts.outDir, 'analysis-leaderboard.png'),
      path.join(tmpDir, 'board.html'),
      '1440,860',
    );

    if (opts.qaDir) {
      capturePng(
        chromeBin,
        injectHydration(
          renderAnalysisHtml(fakeWebview),
          { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, expandDetails: true, tab: 'run' },
          'dark',
        ),
        path.join(opts.qaDir, 'qa_v04_analysis_expanded.png'),
        path.join(tmpDir, 'qa_v04_analysis_expanded.html'),
        '1440,1480',
      );
      capturePng(
        chromeBin,
        injectHydration(
          renderAnalysisHtml(fakeWebview),
          { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, expandDetails: true, tab: 'board' },
          'dark',
        ),
        path.join(opts.qaDir, 'qa_v04_leaderboard_expanded.png'),
        path.join(tmpDir, 'qa_v04_leaderboard_expanded.html'),
        '1440,1320',
      );
      capturePng(
        chromeBin,
        injectHydration(renderArenaHtml(fakeWebview), arenaPayload, 'light'),
        path.join(opts.qaDir, 'qa_v04_arena_light.png'),
        path.join(tmpDir, 'qa_v04_arena_light.html'),
        '1440,1040',
      );
      capturePng(
        chromeBin,
        injectHydration(
          renderAnalysisHtml(fakeWebview),
          { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, tab: 'run' },
          'light',
        ),
        path.join(opts.qaDir, 'qa_v04_analysis_light.png'),
        path.join(tmpDir, 'qa_v04_analysis_light.html'),
        '1440,1260',
      );
      capturePng(
        chromeBin,
        injectHydration(
          renderAnalysisHtml(fakeWebview),
          { tasks, selectedTaskId: activeTask.id, leaderboard, harnesses: detected, judgeConfig, tab: 'run', blindMode: true },
          'dark',
        ),
        path.join(opts.qaDir, 'qa_v04_analysis_blind.png'),
        path.join(tmpDir, 'qa_v04_analysis_blind.html'),
        '1440,1220',
      );
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
