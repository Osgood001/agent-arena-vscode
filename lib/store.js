'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ARENA_DIR = '.agent-arena';
const TASKS_DIR = 'tasks';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeConfigKey(cfg) {
  const harness = (cfg.harness || 'custom').trim();
  const model = (cfg.model || '').trim() || 'default';
  const effort = (cfg.effort || '').trim();
  return effort ? `${harness} · ${model} (${effort})` : `${harness} · ${model}`;
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';
}

function generateTaskId(now = new Date()) {
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
  const rand = crypto.randomBytes(2).toString('hex');
  return `${stamp}-${rand}`;
}

function buildBlindMap(candidates, seed) {
  const ids = candidates.map((c) => c.id);
  const rng = mulberry32(seed);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const blindMap = {};
  ids.forEach((id, idx) => {
    const letter = idx < 26 ? String.fromCharCode(65 + idx) : `C${idx + 1}`;
    blindMap[id] = `Candidate ${letter}`;
  });
  return blindMap;
}

function arenaRoot(workspaceRoot) {
  return path.join(workspaceRoot, ARENA_DIR);
}

function tasksRoot(workspaceRoot) {
  return path.join(arenaRoot(workspaceRoot), TASKS_DIR);
}

function assertSafeTaskId(taskId) {
  if (!taskId || typeof taskId !== 'string' || /[\\/]|\.\./.test(taskId)) {
    throw new Error(`Invalid task ID: ${taskId}`);
  }
  return taskId;
}

function taskDir(workspaceRoot, taskId) {
  assertSafeTaskId(taskId);
  return path.join(tasksRoot(workspaceRoot), taskId);
}

function taskJsonPath(workspaceRoot, taskId) {
  return path.join(taskDir(workspaceRoot, taskId), 'task.json');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function emptyTelemetry() {
  return {
    inputTokens: null,
    outputTokens: null,
    cachedTokens: null,
    reasoningTokens: null,
    totalTokens: null,
    costUsd: null,
    numTurns: 0,
    toolCalls: 0,
  };
}

function createCandidateRecord(tDir, cfg, idx, createdAt, existingIds = new Set()) {
  const configKey = makeConfigKey(cfg);
  const label = (cfg.label || '').trim() || configKey;
  let num = idx + 1;
  let candId = '';
  do {
    candId = `cand-${String(num).padStart(2, '0')}-${slugify(cfg.harness)}-${slugify(cfg.model || 'default')}-${slugify(cfg.effort || 'std')}`;
    num += 1;
  } while (existingIds.has(candId));
  existingIds.add(candId);
  const cDir = path.join(tDir, 'candidates', candId);
  ensureDir(cDir);
  return {
    id: candId,
    index: idx,
    configKey,
    label,
    harness: cfg.harness || 'codex',
    model: cfg.model || '',
    effort: cfg.effort || '',
    extraArgs: Array.isArray(cfg.extraArgs) ? cfg.extraArgs : [],
    commandTemplate: cfg.commandTemplate || '',
    status: 'pending',
    createdAt,
    startedAt: null,
    finishedAt: null,
    durationMs: null,
    exitCode: null,
    workDir: cDir,
    stdoutPath: path.join(cDir, 'stdout.log'),
    stderrPath: path.join(cDir, 'stderr.log'),
    lastMessagePath: path.join(cDir, 'last-message.txt'),
    eventsPath: path.join(cDir, 'events.jsonl'),
    finalText: '',
    feedPreview: [],
    telemetry: emptyTelemetry(),
    changedFiles: { added: [], modified: [], deleted: [] },
    error: null,
  };
}

function createTask(workspaceRoot, spec) {
  const now = new Date();
  const createdAt = now.toISOString();
  const id = spec.id || generateTaskId(now);
  const tDir = taskDir(workspaceRoot, id);
  ensureDir(path.join(tDir, 'candidates'));

  const prompt = String(spec.prompt || '');
  const promptSha256 = crypto.createHash('sha256').update(prompt, 'utf8').digest('hex');
  const blindSeed = typeof spec.blindSeed === 'number'
    ? spec.blindSeed >>> 0
    : crypto.randomBytes(4).readUInt32BE(0);

  const rawConfigs = Array.isArray(spec.configs) ? spec.configs : [];
  const existingIds = new Set();
  const candidates = rawConfigs.map((cfg, idx) => createCandidateRecord(tDir, cfg, idx, createdAt, existingIds));

  const tags = Array.isArray(spec.tags)
    ? spec.tags.map((t) => String(t).trim()).filter(Boolean)
    : String(spec.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const title = (spec.title || '').trim() || prompt.split(/\r?\n/)[0].trim().slice(0, 64) || `Run ${id}`;

  const task = {
    schemaVersion: 1,
    id,
    title,
    prompt,
    promptSha256,
    createdAt,
    startedAt: null,
    finishedAt: null,
    tags,
    isolationMode: spec.isolationMode || 'direct',
    baselineDir: path.join(tDir, 'baseline'),
    directBeforeManifest: null,
    blindSeed,
    blindMap: buildBlindMap(candidates, blindSeed),
    candidates,
    judgment: null,
  };

  saveTask(workspaceRoot, task);
  return task;
}

function appendCandidates(workspaceRoot, taskId, configs) {
  const task = loadTask(workspaceRoot, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);
  const rawConfigs = Array.isArray(configs) ? configs.filter(Boolean) : [];
  if (!rawConfigs.length) throw new Error('At least one agent configuration is required.');

  const tDir = taskDir(workspaceRoot, task.id);
  ensureDir(path.join(tDir, 'candidates'));
  const nowIso = new Date().toISOString();
  const existing = Array.isArray(task.candidates) ? task.candidates : [];
  const existingIds = new Set(existing.map((c) => c.id));
  const startIdx = existing.length;

  const addedCandidates = rawConfigs.map((cfg, offset) =>
    createCandidateRecord(tDir, cfg, startIdx + offset, nowIso, existingIds),
  );
  task.candidates = [...existing, ...addedCandidates];

  if (!task.blindMap || typeof task.blindMap !== 'object') {
    task.blindMap = buildBlindMap(task.candidates, task.blindSeed || 1);
  } else {
    const usedLabels = new Set(Object.values(task.blindMap));
    const nextLabels = [];
    let labelIdx = 0;
    while (nextLabels.length < addedCandidates.length) {
      const lbl = labelIdx < 26 ? `Candidate ${String.fromCharCode(65 + labelIdx)}` : `Candidate C${labelIdx + 1}`;
      if (!usedLabels.has(lbl)) {
        usedLabels.add(lbl);
        nextLabels.push(lbl);
      }
      labelIdx += 1;
    }
    const shuffledIds = addedCandidates.map((c) => c.id);
    const rng = mulberry32(((task.blindSeed || 1) + task.candidates.length) >>> 0);
    for (let i = shuffledIds.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
    }
    shuffledIds.forEach((cid, i) => {
      task.blindMap[cid] = nextLabels[i];
    });
  }

  task.finishedAt = null;
  saveTask(workspaceRoot, task);
  return { task, addedCandidates };
}

function saveTask(workspaceRoot, task) {
  const filePath = taskJsonPath(workspaceRoot, task.id);
  ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(task, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    try {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    } catch (_) {
      // ignore cleanup failure
    }
    throw err;
  }
}

function loadTask(workspaceRoot, taskId) {
  const filePath = taskJsonPath(workspaceRoot, taskId);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) {
    return null;
  }
}

function listTasks(workspaceRoot) {
  const root = tasksRoot(workspaceRoot);
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const tasks = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const jp = path.join(root, ent.name, 'task.json');
    if (!fs.existsSync(jp)) continue;
    try {
      tasks.push(JSON.parse(fs.readFileSync(jp, 'utf8')));
    } catch (_) {
      // Skip malformed task.json
    }
  }
  tasks.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return tasks;
}

function deleteTask(workspaceRoot, taskId) {
  const dir = taskDir(workspaceRoot, taskId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function reconcileStaleTasks(workspaceRoot, activeTaskIds = new Set()) {
  const tasks = listTasks(workspaceRoot);
  let reconciled = 0;
  const nowIso = new Date().toISOString();
  for (const task of tasks) {
    if (activeTaskIds.has(task.id)) continue;
    let changed = false;
    for (const cand of task.candidates || []) {
      if (cand.status === 'running' || cand.status === 'pending') {
        cand.status = 'interrupted';
        cand.finishedAt = cand.finishedAt || nowIso;
        cand.error = cand.error || 'Session ended before completion';
        changed = true;
      }
    }
    if (changed) {
      if (!task.finishedAt) task.finishedAt = nowIso;
      saveTask(workspaceRoot, task);
      reconciled += 1;
    }
  }
  return reconciled;
}

function saveJudgment(workspaceRoot, taskId, judgmentInput) {
  const task = loadTask(workspaceRoot, taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const scores = {};
  for (const [cid, sc] of Object.entries(judgmentInput.scores || {})) {
    const c = Number(sc.correctness) || 0;
    const cl = Number(sc.clarity) || 0;
    const ef = Number(sc.efficiency) || 0;
    const valid = [c, cl, ef].filter((v) => v > 0);
    const overall = typeof sc.overall === 'number' && sc.overall > 0
      ? sc.overall
      : (valid.length ? Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(3)) : 0);
    scores[cid] = {
      correctness: c,
      clarity: cl,
      efficiency: ef,
      overall,
    };
  }

  task.judgment = {
    judgedAt: new Date().toISOString(),
    judgeType: judgmentInput.judgeType || 'human',
    judgeConfig: judgmentInput.judgeConfig || null,
    judgeDurationMs: typeof judgmentInput.judgeDurationMs === 'number' ? judgmentInput.judgeDurationMs : null,
    judgeTelemetry: judgmentInput.judgeTelemetry || null,
    blindedWhenJudged: Boolean(judgmentInput.blindedWhenJudged),
    judgedCandidateIds: Array.isArray(judgmentInput.judgedCandidateIds)
      ? judgmentInput.judgedCandidateIds
      : (task.candidates || []).map((c) => c.id),
    winnerId: judgmentInput.isTie ? null : (judgmentInput.winnerId || null),
    isTie: Boolean(judgmentInput.isTie),
    scores,
    notes: String(judgmentInput.notes || ''),
  };
  saveTask(workspaceRoot, task);
  return task;
}

function csvEscape(val) {
  const s = val === null || val === undefined ? '' : String(val);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportTasksJson(tasks) {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      taskCount: tasks.length,
      tasks,
    },
    null,
    2,
  );
}

function exportTasksCsv(tasks) {
  const headers = [
    'task_id',
    'task_title',
    'created_at',
    'isolation_mode',
    'tags',
    'prompt_sha256',
    'candidate_id',
    'config_key',
    'harness',
    'model',
    'effort',
    'status',
    'started_at',
    'finished_at',
    'duration_ms',
    'exit_code',
    'input_tokens',
    'cached_tokens',
    'output_tokens',
    'total_tokens',
    'cache_hit_rate',
    'cost_usd',
    'num_turns',
    'tool_calls',
    'files_added',
    'files_modified',
    'files_deleted',
    'is_winner',
    'is_tie',
    'overall_score',
    'reasoning_tokens',
    'judge_type',
  ];
  const lines = [headers.join(',')];
  for (const task of tasks) {
    const j = task.judgment;
    for (const cand of task.candidates || []) {
      const tel = cand.telemetry || {};
      const ch = cand.changedFiles || {};
      const inTok = tel.inputTokens;
      const cacTok = tel.cachedTokens;
      const cacheHit = (typeof inTok === 'number' && inTok > 0 && typeof cacTok === 'number')
        ? (cacTok / inTok).toFixed(4)
        : '';
      const sc = j && j.scores && j.scores[cand.id] ? j.scores[cand.id].overall : '';
      const isWinner = j ? (j.winnerId === cand.id ? 'true' : 'false') : '';
      const isTie = j ? (j.isTie ? 'true' : 'false') : '';
      const row = [
        task.id,
        task.title,
        task.createdAt,
        task.isolationMode,
        (task.tags || []).join(';'),
        task.promptSha256,
        cand.id,
        cand.configKey,
        cand.harness,
        cand.model,
        cand.effort,
        cand.status,
        cand.startedAt,
        cand.finishedAt,
        cand.durationMs,
        cand.exitCode,
        tel.inputTokens,
        tel.cachedTokens,
        tel.outputTokens,
        tel.totalTokens,
        cacheHit,
        tel.costUsd,
        tel.numTurns,
        tel.toolCalls,
        (ch.added || []).length,
        (ch.modified || []).length,
        (ch.deleted || []).length,
        isWinner,
        isTie,
        sc,
        tel.reasoningTokens,
        j ? (j.judgeType || 'human') : '',
      ];
      lines.push(row.map(csvEscape).join(','));
    }
  }
  return lines.join('\n') + '\n';
}

module.exports = {
  ARENA_DIR,
  assertSafeTaskId,
  arenaRoot,
  tasksRoot,
  taskDir,
  taskJsonPath,
  makeConfigKey,
  buildBlindMap,
  emptyTelemetry,
  createTask,
  appendCandidates,
  saveTask,
  loadTask,
  listTasks,
  deleteTask,
  reconcileStaleTasks,
  saveJudgment,
  exportTasksJson,
  exportTasksCsv,
};
