'use strict';

const { execFile, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const HARNESS_BINARIES = {
  claude: 'claude',
  codex: 'codex',
  agy: 'agy',
  opencode: 'opencode',
  pi: 'pi',
  dsh: 'dsh',
};

const HARNESS_LABELS = {
  claude: 'Claude Code',
  codex: 'Codex',
  agy: 'Antigravity',
  opencode: 'OpenCode',
  pi: 'Pi',
  dsh: 'DSH',
  custom: 'Custom',
};

const DEFAULT_PRESETS = [
  {
    label: 'Codex · default (low)',
    harness: 'codex',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'Codex · default (medium)',
    harness: 'codex',
    model: '',
    effort: 'medium',
    extraArgs: [],
  },
  {
    label: 'Codex · default (high)',
    harness: 'codex',
    model: '',
    effort: 'high',
    extraArgs: [],
  },
  {
    label: 'Claude Code · default (medium)',
    harness: 'claude',
    model: '',
    effort: 'medium',
    extraArgs: [],
  },
  {
    label: 'Claude Code · default (high)',
    harness: 'claude',
    model: '',
    effort: 'high',
    extraArgs: [],
  },
  {
    label: 'Antigravity · default (medium)',
    harness: 'agy',
    model: '',
    effort: 'medium',
    extraArgs: [],
  },
  {
    label: 'Antigravity · default (high)',
    harness: 'agy',
    model: '',
    effort: 'high',
    extraArgs: [],
  },
  {
    label: 'OpenCode · default',
    harness: 'opencode',
    model: '',
    effort: '',
    extraArgs: [],
  },
  {
    label: 'Pi · default (low)',
    harness: 'pi',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'DSH · headless',
    harness: 'dsh',
    model: 'headless',
    effort: '',
    extraArgs: [],
  },
];

const TUTORIAL_PRESETS = [
  {
    label: 'Codex · default (low)',
    harness: 'codex',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'Claude Code · default (low)',
    harness: 'claude',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'OpenCode · default',
    harness: 'opencode',
    model: '',
    effort: '',
    extraArgs: [],
  },
  {
    label: 'Antigravity · default (low)',
    harness: 'agy',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'Pi · default (low)',
    harness: 'pi',
    model: '',
    effort: 'low',
    extraArgs: [],
  },
  {
    label: 'DSH · headless',
    harness: 'dsh',
    model: 'headless',
    effort: '',
    extraArgs: [],
  },
];

function parseTomlTopLevelString(tomlText, key) {
  const re = new RegExp(`^${key}\\s*=\\s*['"]([^'"]+)['"]`);
  for (const rawLine of String(tomlText || '').split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) break; // stop at first [section] header
    const m = trimmed.match(re);
    if (m) return m[1].trim();
  }
  return '';
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

/**
 * Safely inspects standard local CLI config files for default model/effort names only.
 * Never reads or returns API keys, tokens, URLs, or credentials.
 */
function discoverLocalDefaults(homeDir = os.homedir()) {
  const defaults = {
    codex: { model: '', effort: '' },
    claude: { model: '', effort: '' },
    agy: {
      model: '',
      effort: '',
      agentMode: '',
      enableTerminalSandbox: null,
      disableSlashCommands: null,
    },
    opencode: { model: '', effort: '' },
    pi: { model: '', effort: '' },
    dsh: { model: 'headless', effort: '' },
  };

  try {
    const codexToml = path.join(homeDir, '.codex', 'config.toml');
    if (fs.existsSync(codexToml)) {
      const txt = fs.readFileSync(codexToml, 'utf8');
      defaults.codex.model = parseTomlTopLevelString(txt, 'model');
      defaults.codex.effort = parseTomlTopLevelString(txt, 'model_reasoning_effort');
    }
  } catch (_) {
    // ignore unreadable config
  }

  try {
    const claudeCfg = readJsonSafe(path.join(homeDir, '.claude', 'settings.json'));
    if (claudeCfg && typeof claudeCfg === 'object') {
      const env = claudeCfg.env && typeof claudeCfg.env === 'object' ? claudeCfg.env : {};
      defaults.claude.model = String(
        claudeCfg.model ||
          env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
          env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
          env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
          '',
      ).trim();
      defaults.claude.effort = String(claudeCfg.effortLevel || '').trim();
    }
  } catch (_) {
    // ignore unreadable config
  }

  try {
    const agyCfg = readJsonSafe(path.join(homeDir, '.gemini', 'antigravity-cli', 'settings.json'));
    if (agyCfg && typeof agyCfg === 'object') {
      if (typeof agyCfg.model === 'string') {
        defaults.agy.model = agyCfg.model.trim();
      }
      if (typeof agyCfg.effort === 'string') {
        defaults.agy.effort = agyCfg.effort.trim();
      }
      if (typeof agyCfg.agentMode === 'string') {
        defaults.agy.agentMode = agyCfg.agentMode.trim();
      }
      if (typeof agyCfg.enableTerminalSandbox === 'boolean') {
        defaults.agy.enableTerminalSandbox = agyCfg.enableTerminalSandbox;
      }
      if (typeof agyCfg.disableSlashCommands === 'boolean') {
        defaults.agy.disableSlashCommands = agyCfg.disableSlashCommands;
      }
    }
  } catch (_) {
    // ignore unreadable config
  }

  try {
    const ocCfg = readJsonSafe(path.join(homeDir, '.config', 'opencode', 'opencode.json'));
    if (ocCfg && typeof ocCfg === 'object') {
      defaults.opencode.model = String(ocCfg.model || '').trim();
    }
  } catch (_) {
    // ignore unreadable config
  }

  try {
    const piCfg = readJsonSafe(path.join(homeDir, '.pi', 'agent', 'settings.json'));
    if (piCfg && typeof piCfg === 'object') {
      const prov = String(piCfg.defaultProvider || '').trim();
      const mod = String(piCfg.defaultModel || '').trim();
      defaults.pi.model = prov && mod ? `${prov}/${mod}` : mod;
      defaults.pi.effort = String(piCfg.defaultThinkingLevel || '').trim();
    }
  } catch (_) {
    // ignore unreadable config
  }

  return defaults;
}

function makePresetLabel(harness, model, effort) {
  const title = HARNESS_LABELS[harness] || harness;
  const mod = (model || '').trim() || 'default';
  const eff = (effort || '').trim();
  return eff ? `${title} · ${mod} (${eff})` : `${title} · ${mod}`;
}

function buildAutoPresets(detectedHarnesses, localDefaults) {
  const detected = detectedHarnesses || detectHarnesses();
  const defs = localDefaults || discoverLocalDefaults();

  const codexModel = (defs.codex && defs.codex.model) || '';
  const claudeModel = (defs.claude && defs.claude.model) || '';
  const agyModel = (defs.agy && defs.agy.model) || '';
  const opencodeModel = (defs.opencode && defs.opencode.model) || '';
  const piModel = (defs.pi && defs.pi.model) || '';
  const piEffort = (defs.pi && defs.pi.effort) || 'low';
  const dshModel = (defs.dsh && defs.dsh.model) || 'headless';

  const candidates = [
    { harness: 'codex', model: codexModel, effort: 'low' },
    { harness: 'codex', model: codexModel, effort: 'medium' },
    { harness: 'codex', model: codexModel, effort: 'high' },
    { harness: 'claude', model: claudeModel, effort: 'medium' },
    { harness: 'claude', model: claudeModel, effort: 'high' },
    { harness: 'agy', model: agyModel, effort: 'medium' },
    { harness: 'agy', model: agyModel, effort: 'high' },
    { harness: 'opencode', model: opencodeModel, effort: '' },
    { harness: 'pi', model: piModel, effort: piEffort },
    { harness: 'dsh', model: dshModel, effort: '' },
  ];

  // Prioritize detected harnesses first, keeping unavailable ones at the end so chips stay informative
  const available = candidates.filter((c) => detected[c.harness] && detected[c.harness].available);
  const unavailable = candidates.filter((c) => !detected[c.harness] || !detected[c.harness].available);
  return [...available, ...unavailable].map((c) => ({
    label: makePresetLabel(c.harness, c.model, c.effort),
    harness: c.harness,
    model: c.model,
    effort: c.effort,
    extraArgs: [],
  }));
}

function getEffectivePresets(userPresets, detectedHarnesses, homeDir = os.homedir()) {
  if (Array.isArray(userPresets) && userPresets.length > 0) {
    return userPresets;
  }
  const detected = detectedHarnesses || detectHarnesses();
  const defs = discoverLocalDefaults(homeDir);
  return buildAutoPresets(detected, defs);
}

function pickTutorialConfigs(detectedHarnesses, homeDir = os.homedir()) {
  const detected = detectedHarnesses || detectHarnesses();
  const defs = discoverLocalDefaults(homeDir);
  const baseList = TUTORIAL_PRESETS.map((p) => {
    const ld = defs[p.harness] || {};
    const model = p.harness === 'dsh' ? (ld.model || p.model || 'headless') : (ld.model || '');
    const effort = p.effort;
    return {
      ...p,
      model,
      effort,
      label: makePresetLabel(p.harness, model, effort),
    };
  });
  const avail = baseList.filter((p) => detected[p.harness] && detected[p.harness].available);
  if (avail.length > 0) return avail.slice(0, 3).map((p) => ({ ...p }));
  return baseList.slice(0, 2).map((p) => ({ ...p }));
}

function buildChildEnv(extraEnv = {}) {
  const home = os.homedir();
  const extraPaths =
    process.platform === 'win32'
      ? [
          path.join(home, '.gemini', 'bin'),
          path.join(home, '.gemini', 'antigravity', 'bin'),
          path.join(home, '.local', 'bin'),
          path.join(home, 'AppData', 'Roaming', 'npm'),
        ]
      : [
          path.join(home, '.gemini', 'bin'),
          path.join(home, '.gemini', 'antigravity', 'bin'),
          path.join(home, '.local', 'bin'),
          path.join(home, '.opencode', 'bin'),
          '/opt/homebrew/bin',
          '/usr/local/bin',
        ];
  const current = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
  const merged = [];
  for (const p of [...extraPaths, ...current]) {
    if (!merged.includes(p)) merged.push(p);
  }
  return {
    ...process.env,
    ...extraEnv,
    PATH: merged.join(path.delimiter),
  };
}

function isExecutable(filePath) {
  try {
    const st = fs.statSync(filePath);
    if (!st.isFile()) return false;
    if (process.platform === 'win32') return true;
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch (_) {
    return false;
  }
}

function resolveBinary(harness, overrides = {}) {
  if (harness === 'custom') {
    return process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : '/bin/sh';
  }
  const exts = process.platform === 'win32' ? ['', '.exe', '.cmd', '.bat'] : [''];
  const override = overrides[harness];
  if (override) {
    for (const ext of exts) {
      const p = ext && !override.toLowerCase().endsWith(ext) ? `${override}${ext}` : override;
      if (isExecutable(p)) return p;
    }
    return null;
  }
  const binName = HARNESS_BINARIES[harness] || harness;
  const env = buildChildEnv();
  const dirs = (env.PATH || '').split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(dir, `${binName}${ext}`);
      if (isExecutable(candidate)) return candidate;
    }
  }
  return null;
}

function detectHarnesses(overrides = {}) {
  const result = {};
  for (const harness of Object.keys(HARNESS_BINARIES)) {
    const resolved = resolveBinary(harness, overrides);
    result[harness] = {
      available: Boolean(resolved),
      path: resolved,
    };
  }
  result.custom = {
    available: true,
    path: resolveBinary('custom', overrides),
  };
  return result;
}

function cleanTerminalLines(rawText) {
  const ansiRe = /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\))/g;
  return String(rawText || '')
    .replace(ansiRe, '')
    .split('\n')
    .map((line) => {
      const parts = line.split('\r');
      for (let i = parts.length - 1; i >= 0; i -= 1) {
        const s = parts[i].trim();
        if (s) return s;
      }
      return '';
    })
    .filter(Boolean);
}

function parseAgyModelsOutput(stdout) {
  const lines = cleanTerminalLines(stdout);
  const seen = new Set();
  const models = [];
  for (const line of lines) {
    if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(line)) continue;
    if (/^(fetching\b|available models|usage:|flags:|no models)/i.test(line)) continue;
    if (/^[-=]{3,}$/.test(line)) continue;

    let parts = line.split(/\t+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    }
    const id = parts[0] || '';
    if (!id || /\s/.test(id) || seen.has(id)) continue;
    seen.add(id);

    const label = parts.slice(1).join(' ').trim() || id;
    const rawGroup = label.split(/\s+/)[0].replace(/[^A-Za-z0-9.-]/g, '');
    const group = rawGroup || 'Other';
    const hasEmbeddedEffort = /-(low|medium|high|xhigh|max)$/i.test(id);
    models.push({ id, label, group, hasEmbeddedEffort });
  }
  return models;
}

function parseAgyAgentsOutput(stdout) {
  const lines = cleanTerminalLines(stdout);
  const seen = new Set();
  const agents = [];
  for (const line of lines) {
    if (/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/.test(line)) continue;
    if (/^(fetching\b|available agents|usage:|flags:|no agents|-h\b|--help\b)/i.test(line)) continue;
    if (/^[-=]{3,}$/.test(line)) continue;

    let parts = line.split(/\t+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) {
      parts = line.split(/\s{2,}/).map((p) => p.trim()).filter(Boolean);
    }
    const id = parts[0] || '';
    if (!id || /\s/.test(id) || seen.has(id)) continue;
    seen.add(id);
    const label = parts.slice(1).join(' ').trim() || id;
    agents.push({ id, label });
  }
  return agents;
}

function execFileCapture(bin, args, opts = {}) {
  return new Promise((resolve) => {
    try {
      execFile(
        bin,
        args,
        {
          env: buildChildEnv(),
          timeout: opts.timeoutMs || 8000,
          signal: opts.signal,
          maxBuffer: 2 * 1024 * 1024,
        },
        (err, stdout) => {
          resolve({
            ok: !err,
            stdout: typeof stdout === 'string' ? stdout : String(stdout || ''),
            error: err ? err.message : null,
          });
        },
      );
    } catch (err) {
      resolve({ ok: false, stdout: '', error: err.message });
    }
  });
}

async function discoverAgyCatalogAsync(opts = {}) {
  const bin = opts.binary || resolveBinary('agy', opts.binaryOverrides || {});
  if (!bin) {
    return { models: [], agents: [], fetchedAt: Date.now(), error: null };
  }
  const [mRes, aRes] = await Promise.allSettled([
    execFileCapture(bin, ['models'], opts),
    execFileCapture(bin, ['agents'], opts),
  ]);
  const modelsOut = mRes.status === 'fulfilled' ? mRes.value : { ok: false, stdout: '', error: String(mRes.reason) };
  const agentsOut = aRes.status === 'fulfilled' ? aRes.value : { ok: false, stdout: '', error: String(aRes.reason) };
  const models = parseAgyModelsOutput(modelsOut.stdout);
  const agents = parseAgyAgentsOutput(agentsOut.stdout);
  const error = !modelsOut.ok && !models.length ? (modelsOut.error || 'Failed to query agy models') : null;
  return {
    models,
    agents,
    fetchedAt: Date.now(),
    error,
  };
}

function normalizeAgyOptions(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const permissionMode = typeof raw.permissionMode === 'string' ? raw.permissionMode.trim() : '';
  const sandbox = typeof raw.sandbox === 'boolean' ? raw.sandbox : null;
  const disableSlashCommands = typeof raw.disableSlashCommands === 'boolean' ? raw.disableSlashCommands : null;
  const agent = typeof raw.agent === 'string' ? raw.agent.trim() : '';
  const settings = typeof raw.settings === 'string' ? raw.settings.trim() : '';
  if (!permissionMode && sandbox === null && disableSlashCommands === null && !agent && !settings) {
    return null;
  }
  return {
    permissionMode,
    sandbox,
    disableSlashCommands,
    agent,
    settings,
  };
}

function buildCommand(candidate, task, opts = {}) {
  const harness = candidate.harness;
  const model = (candidate.model || '').trim();
  const effort = (candidate.effort || '').trim();
  const extraArgs = Array.isArray(candidate.extraArgs) ? candidate.extraArgs.filter(Boolean) : [];
  const prompt = task.prompt || '';
  const cwd = candidate.workDir;
  const binary = resolveBinary(harness, opts.binaryOverrides || {});

  if (harness === 'claude') {
    const args = [];
    if (opts.workspaceRoot && path.resolve(opts.workspaceRoot) !== path.resolve(cwd)) {
      args.push('--add-dir', opts.workspaceRoot);
    }
    args.push(
      '-p',
      '--verbose',
      '--output-format',
      'stream-json',
      '--permission-mode',
      opts.claudePermissionMode || 'acceptEdits',
    );
    if (model) args.push('--model', model);
    if (effort) args.push('--effort', effort);
    args.push(...extraArgs, prompt);
    return { command: binary || 'claude', args, cwd };
  }

  if (harness === 'agy') {
    const ao = normalizeAgyOptions(candidate.agyOptions) || {};
    const args = [];
    if (opts.workspaceRoot && path.resolve(opts.workspaceRoot) !== path.resolve(cwd)) {
      args.push('--add-dir', opts.workspaceRoot);
    }
    args.push('--output-format', 'stream-json');
    const agyMode = (ao.permissionMode && ao.permissionMode !== '')
      ? ao.permissionMode
      : (opts.agyPermissionMode || 'default');
    if (agyMode === 'dangerously-skip-permissions') {
      args.push('--dangerously-skip-permissions');
    } else if (agyMode === 'accept-edits' || agyMode === 'auto' || agyMode === 'plan') {
      args.push('--mode', agyMode);
    }
    const useSandbox = typeof ao.sandbox === 'boolean' ? ao.sandbox : Boolean(opts.agySandbox);
    if (useSandbox) {
      args.push('--sandbox');
    }
    const noSlash = typeof ao.disableSlashCommands === 'boolean'
      ? ao.disableSlashCommands
      : Boolean(opts.agyDisableSlashCommands);
    if (noSlash) {
      args.push('--disable-slash-commands');
    }
    const agyAgent = (ao.agent || '').trim() || (opts.agyAgent || '').trim();
    if (agyAgent) {
      args.push('--agent', agyAgent);
    }
    const agySettings = (ao.settings || '').trim() || (opts.agySettings || '').trim();
    if (agySettings) {
      args.push('--settings', agySettings);
    }
    if (model) args.push('--model', model);
    if (effort) args.push('--effort', effort);
    args.push(...extraArgs, `-p=${prompt}`);
    return { command: binary || 'agy', args, cwd };
  }

  if (harness === 'codex') {
    const args = [
      'exec',
      '--skip-git-repo-check',
      '--json',
      '-s',
      opts.codexSandboxMode || 'workspace-write',
      '-C',
      cwd,
    ];
    if (model) args.push('-m', model);
    if (effort) args.push('-c', `model_reasoning_effort=${effort}`);
    if (candidate.lastMessagePath) args.push('-o', candidate.lastMessagePath);
    args.push(...extraArgs, prompt);
    return { command: binary || 'codex', args, cwd };
  }

  if (harness === 'opencode') {
    const args = ['run', '--format', 'json'];
    if (model) args.push('--model', model);
    if (effort) args.push('--variant', effort);
    if (opts.opencodeAuto !== false) args.push('--auto');
    args.push(...extraArgs, prompt);
    return { command: binary || 'opencode', args, cwd };
  }

  if (harness === 'pi') {
    const args = ['-p', '--mode', 'json', '--no-session'];
    if (model) args.push('--model', model);
    if (effort) args.push('--thinking', effort);
    args.push(...extraArgs, prompt);
    return { command: binary || 'pi', args, cwd };
  }

  if (harness === 'dsh') {
    const profile = model || 'headless';
    const args = ['--profile', profile, ...extraArgs, prompt];
    return { command: binary || 'dsh', args, cwd };
  }

  if (harness === 'custom') {
    const tpl = (candidate.commandTemplate || '').trim() || 'echo "No commandTemplate configured"';
    const promptFile = path.join(path.dirname(candidate.stdoutPath || cwd), 'prompt.txt');
    const filled = tpl
      .replace(/\{prompt_file\}/g, JSON.stringify(promptFile))
      .replace(/\{cwd\}/g, JSON.stringify(cwd))
      .replace(/\{model\}/g, JSON.stringify(model))
      .replace(/\{effort\}/g, JSON.stringify(effort));
    if (process.platform === 'win32') {
      return {
        command: process.env.ComSpec || 'cmd.exe',
        args: ['/d', '/s', '/c', filled],
        cwd,
        promptFile,
      };
    }
    return { command: '/bin/sh', args: ['-lc', filled], cwd, promptFile };
  }

  throw new Error(`Unsupported harness: ${harness}`);
}

function truncateText(text, max = 800) {
  const s = String(text || '').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function addSum(prev, delta) {
  const d = Number(delta);
  if (!Number.isFinite(d)) return prev;
  return (prev || 0) + d;
}

function createStreamParser(harness) {
  const telemetry = {
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    reasoningTokens: null,
    totalTokens: null,
    costUsd: null,
    numTurns: 0,
    toolCalls: 0,
  };
  const feed = [];
  const textParts = [];
  let finalText = '';
  let hasAuthoritativeResult = false;
  let liveTurns = 0;
  let liveInput = 0;
  let liveCached = 0;
  let liveOutput = 0;
  let liveThinking = 0;
  let emittedPermNotice = false;
  const startedCodexTools = new Set();
  const startedAgyTools = new Set();
  let agyStepIndex = null;
  let agyStepBuf = '';
  let agyActiveFeedItem = null;
  let agyThinkStepIndex = null;
  let agyThinkBuf = '';
  let agyActiveThinkItem = null;
  let lineBuffer = '';

  function pushFeed(kind, text) {
    const clean = truncateText(text, 1200);
    if (!clean) return null;
    const item = {
      ts: new Date().toISOString(),
      kind,
      text: clean,
    };
    feed.push(item);
    if (feed.length > 250) {
      feed.splice(0, feed.length - 250);
    }
    return item;
  }

  function recomputeTotal() {
    if (telemetry.inputTokens !== null || telemetry.outputTokens !== null) {
      telemetry.totalTokens = (telemetry.inputTokens || 0) + (telemetry.outputTokens || 0);
    }
  }

  function handleClaudeEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    if (ev.type === 'assistant' && ev.message) {
      liveTurns += 1;
      if (!hasAuthoritativeResult) {
        telemetry.numTurns = liveTurns;
        const u = ev.message.usage;
        if (u && typeof u === 'object') {
          const uncached = Number(u.input_tokens || 0);
          const cacheRead = Number(u.cache_read_input_tokens || 0);
          const cacheCreate = Number(u.cache_creation_input_tokens || 0);
          const out = Number(u.output_tokens || 0);
          liveInput += uncached + cacheRead + cacheCreate;
          liveCached += cacheRead;
          liveOutput += out;
          telemetry.inputTokens = liveInput;
          telemetry.cachedTokens = liveCached;
          telemetry.outputTokens = liveOutput;
          recomputeTotal();
        }
      }
      if (Array.isArray(ev.message.content)) {
        for (const blk of ev.message.content) {
          if (!blk || typeof blk !== 'object') continue;
          if (blk.type === 'text' && blk.text) {
            textParts.push(blk.text);
            finalText = blk.text;
            pushFeed('assistant', blk.text);
          } else if (blk.type === 'thinking' && blk.thinking) {
            pushFeed('thinking', blk.thinking);
          } else if (blk.type === 'tool_use') {
            telemetry.toolCalls += 1;
            const inputSnippet = blk.input ? JSON.stringify(blk.input) : '';
            pushFeed('tool', `${blk.name || 'tool'}(${truncateText(inputSnippet, 180)})`);
          }
        }
      }
      return;
    }
    if (ev.type === 'user' && ev.message && Array.isArray(ev.message.content)) {
      for (const blk of ev.message.content) {
        if (blk && blk.type === 'tool_result') {
          const content = typeof blk.content === 'string'
            ? blk.content
            : JSON.stringify(blk.content || '');
          pushFeed(blk.is_error ? 'error' : 'tool_result', truncateText(content, 240));
          if (blk.is_error && !emittedPermNotice && /permission|haven't granted|not allowed/i.test(content)) {
            emittedPermNotice = true;
            pushFeed(
              'notice',
              'Tool blocked by Claude permission mode. Open Agent Arena Settings (agentArena.claudePermissionMode) to allow unattended tools if desired.',
            );
          }
        }
      }
      return;
    }
    if (ev.type === 'result') {
      hasAuthoritativeResult = true;
      if (typeof ev.result === 'string' && ev.result.trim()) {
        finalText = ev.result;
      }
      if (typeof ev.num_turns === 'number') {
        telemetry.numTurns = ev.num_turns;
      }
      if (typeof ev.total_cost_usd === 'number') {
        telemetry.costUsd = ev.total_cost_usd;
      }
      const u = ev.usage || {};
      const uncached = Number(u.input_tokens || 0);
      const cacheRead = Number(u.cache_read_input_tokens || 0);
      const cacheCreate = Number(u.cache_creation_input_tokens || 0);
      const out = Number(u.output_tokens || 0);
      if (u.input_tokens !== undefined || u.cache_read_input_tokens !== undefined || u.output_tokens !== undefined) {
        telemetry.inputTokens = uncached + cacheRead + cacheCreate;
        telemetry.cachedTokens = cacheRead;
        telemetry.outputTokens = out;
        recomputeTotal();
      }
      if (u.output_tokens_details && typeof u.output_tokens_details.reasoning_tokens === 'number') {
        telemetry.reasoningTokens = u.output_tokens_details.reasoning_tokens;
      }
      if (ev.is_error && ev.result) {
        pushFeed('error', ev.result);
      }
    }
  }

  function handleCodexEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    if ((ev.type === 'item.completed' || ev.type === 'item.started') && ev.item) {
      const it = ev.item;
      const itemId = it.id || `${it.type}-${telemetry.toolCalls}`;
      if (it.type === 'agent_message' && it.text && ev.type === 'item.completed') {
        textParts.push(it.text);
        finalText = it.text;
        pushFeed('assistant', it.text);
      } else if (it.type === 'reasoning' && ev.type === 'item.completed') {
        const rText =
          it.text ||
          (Array.isArray(it.summary)
            ? it.summary.map((s) => (typeof s === 'string' ? s : s && s.text) || '').filter(Boolean).join('\n')
            : '');
        if (rText) pushFeed('thinking', rText);
      } else if (it.type === 'web_search') {
        if (ev.type === 'item.completed') {
          telemetry.toolCalls += 1;
          const actionQueries =
            it.action && Array.isArray(it.action.queries) ? it.action.queries.join(', ') : '';
          const query = it.query || actionQueries || 'search';
          pushFeed('tool', `web_search: ${truncateText(query, 200)}`);
        }
      } else if (it.type === 'command_execution') {
        if (ev.type === 'item.started') {
          startedCodexTools.add(itemId);
          telemetry.toolCalls += 1;
          pushFeed('tool', `$ ${it.command || ''}`);
        } else {
          if (!startedCodexTools.has(itemId)) {
            telemetry.toolCalls += 1;
            if (it.command) pushFeed('tool', `$ ${it.command}`);
          }
          const exitStr = typeof it.exit_code === 'number' ? ` [exit ${it.exit_code}]` : '';
          const out = it.aggregated_output ? `: ${truncateText(it.aggregated_output, 220)}` : '';
          pushFeed(it.exit_code === 0 ? 'tool_result' : 'error', `cmd${exitStr}${out}`);
        }
      } else if (it.type === 'file_change' && ev.type === 'item.completed') {
        telemetry.toolCalls += 1;
        const changes = Array.isArray(it.changes)
          ? it.changes.map((c) => `${c.kind || 'edit'} ${c.path || ''}`).join(', ')
          : '';
        pushFeed('tool', `files: ${changes}`);
      } else if (it.type === 'mcp_tool_call') {
        if (ev.type === 'item.started') {
          startedCodexTools.add(itemId);
          telemetry.toolCalls += 1;
          pushFeed('tool', `mcp:${it.server || ''}.${it.tool || ''}`);
        } else if (!startedCodexTools.has(itemId)) {
          telemetry.toolCalls += 1;
          pushFeed('tool', `mcp:${it.server || ''}.${it.tool || ''}`);
        }
      } else if (it.type === 'function_call' || it.type === 'custom_tool_call' || it.type === 'tool_call') {
        if (ev.type === 'item.started') {
          startedCodexTools.add(itemId);
          telemetry.toolCalls += 1;
          const argStr = it.arguments || it.input ? JSON.stringify(it.arguments || it.input) : '';
          pushFeed('tool', `${it.name || it.tool || it.type}(${truncateText(argStr, 180)})`);
        } else {
          if (!startedCodexTools.has(itemId)) {
            telemetry.toolCalls += 1;
            const argStr = it.arguments || it.input ? JSON.stringify(it.arguments || it.input) : '';
            pushFeed('tool', `${it.name || it.tool || it.type}(${truncateText(argStr, 180)})`);
          }
          if (it.output || it.result || it.error) {
            pushFeed(it.error ? 'error' : 'tool_result', truncateText(it.error || it.output || it.result, 220));
          }
        }
      }
      return;
    }
    if (ev.type === 'turn.completed') {
      telemetry.numTurns += 1;
      const u = ev.usage || {};
      if (u.input_tokens !== undefined) telemetry.inputTokens = addSum(telemetry.inputTokens, u.input_tokens);
      if (u.cached_input_tokens !== undefined) telemetry.cachedTokens = addSum(telemetry.cachedTokens, u.cached_input_tokens);
      if (u.output_tokens !== undefined) telemetry.outputTokens = addSum(telemetry.outputTokens, u.output_tokens);
      if (u.reasoning_output_tokens !== undefined) {
        telemetry.reasoningTokens = addSum(telemetry.reasoningTokens, u.reasoning_output_tokens);
      }
      recomputeTotal();
      return;
    }
    if (ev.type === 'error' || ev.type === 'turn.failed') {
      const msg = (ev.error && ev.error.message) || ev.message || JSON.stringify(ev);
      pushFeed('error', msg);
    }
  }

  function handleOpencodeEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    const part = ev.part || {};
    if (ev.type === 'text' && (part.text || ev.text)) {
      const txt = part.text || ev.text;
      textParts.push(txt);
      finalText = txt;
      pushFeed('assistant', txt);
      return;
    }
    if (ev.type === 'reasoning' && (part.text || ev.text)) {
      pushFeed('thinking', part.text || ev.text);
      return;
    }
    if (ev.type === 'tool_use') {
      telemetry.toolCalls += 1;
      const name = part.tool || ev.tool || 'tool';
      const title =
        (part.state && part.state.title) ||
        (part.state && part.state.input && JSON.stringify(part.state.input)) ||
        '';
      pushFeed('tool', `${name} ${truncateText(title, 180)}`.trim());
      if (part.state && part.state.status === 'error') {
        const errTxt = part.state.error || title || `${name} failed`;
        pushFeed('error', truncateText(typeof errTxt === 'string' ? errTxt : JSON.stringify(errTxt), 260));
      }
      return;
    }
    if (ev.type === 'step_finish' || ev.type === 'message_finish' || part.tokens || ev.tokens || ev.usage) {
      if (ev.type === 'step_finish') telemetry.numTurns += 1;
      const cost = part.cost !== undefined ? part.cost : ev.cost;
      if (typeof cost === 'number') telemetry.costUsd = addSum(telemetry.costUsd, cost);
      const tok = part.tokens || ev.tokens || ev.usage || {};
      const inp = tok.input !== undefined ? tok.input : tok.input_tokens;
      const out = tok.output !== undefined ? tok.output : tok.output_tokens;
      const cacheRead = tok.cache && typeof tok.cache.read === 'number'
        ? tok.cache.read
        : (tok.cache_read_input_tokens || tok.cached_input_tokens || 0);
      const cacheWrite = tok.cache && typeof tok.cache.write === 'number'
        ? tok.cache.write
        : (tok.cache_creation_input_tokens || 0);
      const reasoning = tok.reasoning !== undefined ? tok.reasoning : tok.reasoning_tokens;
      if (inp !== undefined || cacheRead) {
        telemetry.inputTokens = addSum(telemetry.inputTokens, Number(inp || 0) + Number(cacheRead || 0) + Number(cacheWrite || 0));
      }
      if (cacheRead) telemetry.cachedTokens = addSum(telemetry.cachedTokens, cacheRead);
      if (out !== undefined) telemetry.outputTokens = addSum(telemetry.outputTokens, out);
      if (reasoning !== undefined) telemetry.reasoningTokens = addSum(telemetry.reasoningTokens, reasoning);
      recomputeTotal();
      return;
    }
    if (ev.type === 'error') {
      pushFeed('error', ev.message || (ev.error && ev.error.message) || JSON.stringify(ev));
    }
  }

  function handlePiEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    if (ev.type === 'tool_execution_start') {
      telemetry.toolCalls += 1;
      pushFeed('tool', `${ev.toolName || ev.tool || 'tool'}(${truncateText(JSON.stringify(ev.args || {}), 160)})`);
      return;
    }
    if (ev.type === 'tool_execution_end') {
      const resStr = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev.result || '');
      pushFeed(ev.isError ? 'error' : 'tool_result', truncateText(resStr, 200));
      return;
    }
    const msg = ev.message || (ev.type === 'message_end' ? ev.message : null);
    if (ev.type === 'message_end' && msg && msg.role === 'assistant') {
      telemetry.numTurns += 1;
      if (Array.isArray(msg.content)) {
        for (const blk of msg.content) {
          if (blk && blk.type === 'text' && blk.text) {
            textParts.push(blk.text);
            finalText = blk.text;
            pushFeed('assistant', blk.text);
          } else if (blk && blk.type === 'thinking' && blk.thinking) {
            pushFeed('thinking', blk.thinking);
          }
        }
      } else if (typeof msg.content === 'string' && msg.content.trim()) {
        textParts.push(msg.content);
        finalText = msg.content;
        pushFeed('assistant', msg.content);
      }
      const u = msg.usage || ev.usage;
      if (u && typeof u === 'object') {
        const inp = Number(u.input || u.input_tokens || 0);
        const cacheRead = Number(u.cacheRead || u.cache_read_input_tokens || 0);
        const cacheWrite = Number(u.cacheWrite || u.cache_creation_input_tokens || 0);
        const out = Number(u.output || u.output_tokens || 0);
        if (inp || cacheRead || cacheWrite) {
          telemetry.inputTokens = addSum(telemetry.inputTokens, inp + cacheRead + cacheWrite);
        }
        if (cacheRead) telemetry.cachedTokens = addSum(telemetry.cachedTokens, cacheRead);
        if (out || u.output !== undefined || u.output_tokens !== undefined) {
          telemetry.outputTokens = addSum(telemetry.outputTokens, out);
        }
        const costVal = u.cost && typeof u.cost === 'object' ? u.cost.total : u.cost;
        if (typeof costVal === 'number') telemetry.costUsd = addSum(telemetry.costUsd, costVal);
        recomputeTotal();
      }
      return;
    }
    if (ev.type === 'agent_end' && Array.isArray(ev.messages) && !finalText) {
      for (let i = ev.messages.length - 1; i >= 0; i -= 1) {
        const m = ev.messages[i];
        if (m && m.role === 'assistant') {
          if (typeof m.content === 'string') {
            finalText = m.content;
            break;
          }
          if (Array.isArray(m.content)) {
            const t = m.content.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
            if (t) {
              finalText = t;
              break;
            }
          }
        }
      }
      return;
    }
    if (ev.type === 'error' || ev.type === 'turn_error') {
      pushFeed('error', ev.message || (ev.error && ev.error.message) || JSON.stringify(ev));
    }
  }

  function handleAgyEvent(ev) {
    if (!ev || typeof ev !== 'object') return;
    if (ev.event === 'step_update' && ev.step_update && typeof ev.step_update === 'object') {
      const su = ev.step_update;
      const stepKey = su.step_index !== undefined && su.step_index !== null ? String(su.step_index) : 'step';

      if (su.step_type === 'tool') {
        const ti = su.tool_info && typeof su.tool_info === 'object' ? su.tool_info : {};
        const toolName = su.tool_name || ti.name || 'tool';
        const params = ti.parameters ? JSON.stringify(ti.parameters) : '';
        if (su.state === 'ACTIVE' || !startedAgyTools.has(stepKey)) {
          startedAgyTools.add(stepKey);
          telemetry.toolCalls += 1;
          pushFeed('tool', `${toolName}(${truncateText(params, 180)})`);
        }
        if (su.state === 'DONE' || su.state === 'ERROR') {
          if (ti.error) {
            const errMsg = typeof ti.error === 'string' ? ti.error : (ti.error.message || JSON.stringify(ti.error));
            pushFeed('error', truncateText(errMsg, 260));
          } else if (ti.output) {
            const outMsg = typeof ti.output === 'string' ? ti.output : JSON.stringify(ti.output);
            pushFeed('tool_result', truncateText(outMsg, 240));
          }
        }
        return;
      }

      if (su.step_type === 'thinking') {
        const txt = su.text_delta || su.text || '';
        if (txt) {
          if (agyThinkStepIndex !== stepKey) {
            agyThinkStepIndex = stepKey;
            agyThinkBuf = '';
            agyActiveThinkItem = null;
          }
          agyThinkBuf += txt;
          if (agyActiveThinkItem && feed.includes(agyActiveThinkItem)) {
            agyActiveThinkItem.text = truncateText(agyThinkBuf, 1200);
          } else {
            agyActiveThinkItem = pushFeed('thinking', agyThinkBuf);
          }
        }
        if (su.state === 'DONE' || su.state === 'ERROR') {
          agyThinkStepIndex = null;
          agyThinkBuf = '';
          agyActiveThinkItem = null;
        }
        return;
      }

      if (su.step_type === 'agent_response') {
        if (typeof su.thinking_delta === 'string' && su.thinking_delta) {
          if (agyThinkStepIndex !== stepKey) {
            agyThinkStepIndex = stepKey;
            agyThinkBuf = '';
            agyActiveThinkItem = null;
          }
          agyThinkBuf += su.thinking_delta;
          if (agyActiveThinkItem && feed.includes(agyActiveThinkItem)) {
            agyActiveThinkItem.text = truncateText(agyThinkBuf, 1200);
          } else {
            agyActiveThinkItem = pushFeed('thinking', agyThinkBuf);
          }
        }
        if (typeof su.text_delta === 'string' && su.text_delta) {
          if (agyStepIndex !== stepKey) {
            agyStepIndex = stepKey;
            agyStepBuf = '';
            agyActiveFeedItem = null;
          }
          agyStepBuf += su.text_delta;
          finalText = agyStepBuf;
          if (agyActiveFeedItem && feed.includes(agyActiveFeedItem)) {
            agyActiveFeedItem.text = truncateText(agyStepBuf, 1200);
          } else {
            agyActiveFeedItem = pushFeed('assistant', agyStepBuf);
          }
        }
        if (su.state === 'DONE' || su.state === 'ERROR') {
          if (agyStepBuf.trim()) {
            textParts.push(agyStepBuf.trim());
            finalText = agyStepBuf.trim();
          }
          agyStepIndex = null;
          agyStepBuf = '';
          agyActiveFeedItem = null;
          agyThinkStepIndex = null;
          agyThinkBuf = '';
          agyActiveThinkItem = null;

          if (su.state === 'DONE') {
            liveTurns += 1;
            if (!hasAuthoritativeResult) {
              telemetry.numTurns = liveTurns;
              const u = su.usage;
              if (u && typeof u === 'object') {
                const uncached = Number(u.input_tokens || 0);
                const cacheRead = Number(u.cache_read_tokens || 0);
                const out = Number(u.output_tokens || 0);
                const think = Number(u.thinking_tokens || 0);
                liveInput += uncached + cacheRead;
                liveCached += cacheRead;
                liveOutput += out;
                liveThinking += think;
                telemetry.inputTokens = liveInput;
                telemetry.cachedTokens = liveCached;
                telemetry.outputTokens = liveOutput;
                if (liveThinking > 0 || u.thinking_tokens !== undefined) {
                  telemetry.reasoningTokens = liveThinking;
                }
                recomputeTotal();
              }
            }
          }
        }
      }
      return;
    }

    if (ev.event === 'result' && ev.result && typeof ev.result === 'object') {
      hasAuthoritativeResult = true;
      const r = ev.result;
      if (typeof r.response === 'string' && r.response.trim()) {
        finalText = r.response.trim();
      }
      if (typeof r.num_turns === 'number') {
        telemetry.numTurns = r.num_turns;
      }
      const u = r.usage;
      if (u && typeof u === 'object') {
        const uncached = Number(u.input_tokens || 0);
        const cacheRead = Number(u.cache_read_tokens || 0);
        const out = Number(u.output_tokens || 0);
        if (u.input_tokens !== undefined || u.cache_read_tokens !== undefined || u.output_tokens !== undefined) {
          telemetry.inputTokens = uncached + cacheRead;
          telemetry.cachedTokens = cacheRead;
          telemetry.outputTokens = out;
          recomputeTotal();
        }
        if (typeof u.thinking_tokens === 'number') {
          telemetry.reasoningTokens = u.thinking_tokens;
        }
      }
      if (Array.isArray(r.denied_actions) && r.denied_actions.length > 0 && !emittedPermNotice) {
        emittedPermNotice = true;
        pushFeed(
          'notice',
          'Tool blocked by Antigravity headless permissions. Configure agentArena.agyPermissionMode in Settings or add allow-rules in ~/.gemini/antigravity-cli/settings.json.',
        );
      }
      if (r.status && r.status !== 'SUCCESS') {
        pushFeed('error', r.error || `Antigravity exited with status: ${r.status}`);
      }
      return;
    }

    if (ev.event === 'error' || ev.type === 'error') {
      const msg = ev.message || (ev.error && ev.error.message) || JSON.stringify(ev);
      pushFeed('error', msg);
    }
  }

  function processLine(rawLine) {
    const line = rawLine.trim();
    if (!line) return;
    if (harness === 'dsh' || harness === 'custom') {
      textParts.push(rawLine);
      finalText = textParts.join('\n').trim();
      pushFeed('assistant', rawLine);
      return;
    }
    let parsed = null;
    try {
      parsed = JSON.parse(line);
    } catch (_) {
      pushFeed('log', line);
      if (!hasAuthoritativeResult && !finalText) {
        textParts.push(rawLine);
      }
      return;
    }
    if (harness === 'claude') handleClaudeEvent(parsed);
    else if (harness === 'agy') handleAgyEvent(parsed);
    else if (harness === 'codex') handleCodexEvent(parsed);
    else if (harness === 'opencode') handleOpencodeEvent(parsed);
    else if (harness === 'pi') handlePiEvent(parsed);
  }

  return {
    pushStdoutChunk(chunk) {
      lineBuffer += chunk.toString('utf8');
      let idx = lineBuffer.indexOf('\n');
      while (idx !== -1) {
        const line = lineBuffer.slice(0, idx);
        lineBuffer = lineBuffer.slice(idx + 1);
        processLine(line);
        idx = lineBuffer.indexOf('\n');
      }
    },
    pushStderrChunk(chunk) {
      const lines = chunk.toString('utf8').split(/\r?\n/);
      for (const l of lines) {
        const t = l.trim();
        if (!t) continue;
        if (
          harness === 'dsh' &&
          (t.includes('MODULE_TYPELESS_PACKAGE_JSON') ||
            t.startsWith('Reparsing as ES module') ||
            t.startsWith('To eliminate this warning') ||
            t.startsWith('(Use `node --trace-warnings'))
        ) {
          continue;
        }
        if (harness === 'codex' && t === 'Reading additional input from stdin...') {
          continue;
        }
        pushFeed('stderr', t);
      }
    },
    finalize() {
      if (lineBuffer.trim()) {
        processLine(lineBuffer);
        lineBuffer = '';
      }
      return {
        telemetry: { ...telemetry },
        feed: [...feed],
        finalText: finalText || textParts.join('\n').trim(),
      };
    },
    snapshot() {
      return {
        telemetry: { ...telemetry },
        feed: [...feed],
        finalText: finalText || textParts.join('\n').trim(),
      };
    },
  };
}

function killProcessGroup(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    try {
      const tk = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
      tk.on('error', () => {
        try {
          process.kill(pid, 'SIGTERM');
        } catch (_) {
          // ignore
        }
      });
    } catch (_) {
      try {
        process.kill(pid, 'SIGTERM');
      } catch (_) {
        // ignore
      }
    }
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch (_) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (_) {
      return;
    }
  }
  setTimeout(() => {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch (_) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch (_) {
        // already exited
      }
    }
  }, 2500).unref();
}

function spawnCandidate(candidate, task, opts = {}, callbacks = {}) {
  const resolved = resolveBinary(candidate.harness, opts.binaryOverrides || {});
  if (!resolved) {
    const errMsg = `CLI binary not found for harness "${candidate.harness}". Check PATH or settings.`;
    return {
      cancel: () => {},
      promise: Promise.resolve({
        status: 'failed',
        exitCode: -1,
        durationMs: 0,
        error: errMsg,
        telemetry: createStreamParser(candidate.harness).finalize().telemetry,
        feed: [{ ts: new Date().toISOString(), kind: 'error', text: errMsg }],
        finalText: '',
      }),
    };
  }
  const { command, args, cwd, promptFile } = buildCommand(candidate, task, opts);

  if (promptFile) {
    fs.writeFileSync(promptFile, task.prompt || '', 'utf8');
  }
  const stdoutStream = fs.createWriteStream(candidate.stdoutPath, { flags: 'w' });
  const stderrStream = fs.createWriteStream(candidate.stderrPath, { flags: 'w' });
  const parser = createStreamParser(candidate.harness);
  const startMs = Date.now();

  const child = spawn(command, args, {
    cwd,
    env: buildChildEnv(opts.extraEnv || {}),
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let cancelled = false;
  let timedOut = false;
  let lastEmit = 0;
  let flushTimer = null;

  const emitProgress = (force = false) => {
    if (!callbacks.onProgress) return;
    const now = Date.now();
    if (force || now - lastEmit >= 250) {
      lastEmit = now;
      const snap = parser.snapshot();
      callbacks.onProgress({
        durationMs: now - startMs,
        ...snap,
      });
    } else if (!flushTimer) {
      flushTimer = setTimeout(() => {
        flushTimer = null;
        emitProgress(true);
      }, 260);
    }
  };

  child.stdout.on('data', (chunk) => {
    stdoutStream.write(chunk);
    parser.pushStdoutChunk(chunk);
    emitProgress(false);
  });

  child.stderr.on('data', (chunk) => {
    stderrStream.write(chunk);
    parser.pushStderrChunk(chunk);
    emitProgress(false);
  });

  const timeoutMs = (Number(opts.timeoutMinutes) || 30) * 60 * 1000;
  const timeoutHandle = setTimeout(() => {
    timedOut = true;
    killProcessGroup(child.pid);
  }, timeoutMs);
  timeoutHandle.unref();

  let settled = false;
  const promise = new Promise((resolve) => {
    const finish = (exitCode, spawnErr = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      if (flushTimer) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      stdoutStream.end();
      stderrStream.end();
      const durationMs = Date.now() - startMs;
      const res = parser.finalize();

      // Codex -o lastMessagePath fallback if agent_message wasn't emitted in stream
      if (!res.finalText && candidate.lastMessagePath && fs.existsSync(candidate.lastMessagePath)) {
        try {
          res.finalText = fs.readFileSync(candidate.lastMessagePath, 'utf8').trim();
        } catch (_) {
          // ignore
        }
      }

      let status = exitCode === 0 ? 'done' : 'failed';
      let error = spawnErr ? spawnErr.message : null;
      if (cancelled) {
        status = 'cancelled';
        error = 'Cancelled by user';
      } else if (timedOut) {
        status = 'failed';
        error = `Timed out after ${opts.timeoutMinutes || 30} minutes`;
      } else if (exitCode !== 0 && !error) {
        error = `Process exited with code ${exitCode}`;
      }

      resolve({
        status,
        exitCode: exitCode === null ? -1 : exitCode,
        durationMs,
        error,
        ...res,
      });
    };

    child.on('error', (err) => finish(-1, err));
    child.on('close', (code) => finish(code));
  });

  return {
    pid: child.pid,
    cancel: () => {
      cancelled = true;
      killProcessGroup(child.pid);
    },
    promise,
  };
}

module.exports = {
  HARNESS_BINARIES,
  HARNESS_LABELS,
  DEFAULT_PRESETS,
  TUTORIAL_PRESETS,
  discoverLocalDefaults,
  parseAgyModelsOutput,
  parseAgyAgentsOutput,
  discoverAgyCatalogAsync,
  normalizeAgyOptions,
  buildAutoPresets,
  getEffectivePresets,
  pickTutorialConfigs,
  buildChildEnv,
  resolveBinary,
  detectHarnesses,
  buildCommand,
  createStreamParser,
  spawnCandidate,
};
