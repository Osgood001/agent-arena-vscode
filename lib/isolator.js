'use strict';

const { execFile, execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const DEFAULT_EXCLUDE_DIRS = ['.agent-arena', '.DS_Store'];
const DEFAULT_HEAVY_DIRS = [
  'node_modules',
  '.venv',
  'venv',
  '.git',
  'dist',
  'build',
  'target',
  '.next',
  '.cache',
  'data',
  'archive',
  'output',
  '.bundle',
  '.agent-arena',
];
const DEFAULT_SYMLINK_DIRS = DEFAULT_HEAVY_DIRS.filter((d) => d !== '.agent-arena');

function assertInsideDir(baseDir, relPath) {
  if (!relPath || typeof relPath !== 'string' || path.isAbsolute(relPath)) {
    throw new Error(`Invalid relative path: ${relPath}`);
  }
  const rootAbs = path.resolve(baseDir);
  const targetAbs = path.resolve(rootAbs, relPath);
  if (!targetAbs.startsWith(rootAbs + path.sep)) {
    throw new Error(`Path escapes workspace root: ${relPath}`);
  }
  return targetAbs;
}

function createSymlinkSafe(target, dst, isDir = false) {
  const type = process.platform === 'win32' && isDir ? 'junction' : undefined;
  fs.symlinkSync(target, dst, type);
}

function exceedsEntryBudget(dirPath, limit = 250) {
  let count = 0;
  const stack = [dirPath];
  while (stack.length > 0) {
    const cur = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const ent of entries) {
      count += 1;
      if (count > limit) return true;
      if (ent.isDirectory() && !ent.isSymbolicLink()) {
        stack.push(path.join(cur, ent.name));
      }
    }
  }
  return false;
}

async function fallbackCpIfSmall(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory() && exceedsEntryBudget(src, 250)) {
    throw new Error(`Directory exceeds CoW fallback entry limit; add it to agentArena.symlinkDirs: ${path.basename(src)}`);
  }
  await fs.promises.cp(src, dst, { recursive: true, verbatimSymlinks: true });
}

async function copyCowAsync(src, dst) {
  if (process.platform === 'darwin') {
    try {
      await execFileAsync('cp', ['-cRP', src, dst], { maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (_) {
      await fallbackCpIfSmall(src, dst);
      return;
    }
  }
  if (process.platform === 'linux') {
    try {
      await execFileAsync('cp', ['--reflink=auto', '-RP', src, dst], { maxBuffer: 4 * 1024 * 1024 });
      return;
    } catch (_) {
      await fallbackCpIfSmall(src, dst);
      return;
    }
  }
  await fallbackCpIfSmall(src, dst);
}

function getIsolationLists(opts = {}) {
  const exclude = new Set([...DEFAULT_EXCLUDE_DIRS, ...(opts.excludeDirs || [])]);
  const symlink = new Set([...(opts.symlinkDirs || DEFAULT_SYMLINK_DIRS)]);
  const heavy = new Set([...DEFAULT_HEAVY_DIRS, ...symlink]);
  return { exclude, symlink, heavy };
}

async function cloneTreeFilteredAsync(srcRoot, dstRoot, opts = {}) {
  const { exclude, heavy } = getIsolationLists(opts);
  fs.mkdirSync(dstRoot, { recursive: true });
  const entries = fs.readdirSync(srcRoot, { withFileTypes: true });
  for (const ent of entries) {
    if (exclude.has(ent.name)) continue;
    const src = path.join(srcRoot, ent.name);
    const dst = path.join(dstRoot, ent.name);
    const shouldSymlink =
      heavy.has(ent.name) ||
      ent.isSymbolicLink() ||
      (ent.isDirectory() && exceedsEntryBudget(src, opts.maxEntriesPerDir || 250));
    if (shouldSymlink) {
      const target = ent.isSymbolicLink() ? fs.readlinkSync(src) : src;
      const absTarget = path.isAbsolute(target) ? target : path.resolve(srcRoot, target);
      let isDir = ent.isDirectory();
      try {
        isDir = fs.statSync(absTarget).isDirectory();
      } catch (_) {
        // fallback to entry flag
      }
      createSymlinkSafe(absTarget, dst, isDir);
      continue;
    }
    await copyCowAsync(src, dst);
  }
}

async function cloneDirPreservingTopSymlinksAsync(srcRoot, dstRoot) {
  fs.mkdirSync(dstRoot, { recursive: true });
  const entries = fs.readdirSync(srcRoot, { withFileTypes: true });
  for (const ent of entries) {
    const src = path.join(srcRoot, ent.name);
    const dst = path.join(dstRoot, ent.name);
    if (ent.isSymbolicLink()) {
      const target = fs.readlinkSync(src);
      let isDir = false;
      try {
        isDir = fs.statSync(src).isDirectory();
      } catch (_) {
        isDir = false;
      }
      createSymlinkSafe(target, dst, isDir);
    } else {
      await copyCowAsync(src, dst);
    }
  }
}

function isGitRepo(workspaceRoot) {
  try {
    execFileSync('git', ['-C', workspaceRoot, 'rev-parse', '--is-inside-work-tree'], {
      stdio: 'pipe',
    });
    return true;
  } catch (_) {
    return false;
  }
}

async function prepareTaskEnvironment(workspaceRoot, task, opts = {}) {
  const mode = task.isolationMode || 'direct';
  if (mode === 'direct') {
    task.directBeforeManifest = snapshotDirectManifest(workspaceRoot, opts);
    for (const cand of task.candidates) {
      cand.workDir = workspaceRoot;
    }
    return task;
  }

  if (mode === 'scratch') {
    for (const cand of task.candidates) {
      const workDir = path.join(path.dirname(cand.stdoutPath), 'work');
      fs.mkdirSync(workDir, { recursive: true });
      const wsLink = path.join(workDir, 'workspace');
      if (!fs.existsSync(wsLink)) {
        try {
          createSymlinkSafe(workspaceRoot, wsLink, true);
        } catch (_) {
          // ignore if symlink already exists or OS disallows
        }
      }
      cand.workDir = workDir;
    }
    return task;
  }

  if (mode === 'git-worktree') {
    if (!isGitRepo(workspaceRoot)) {
      throw new Error(
        'Git worktree mode requires a Git repository. Choose "direct", "scratch", or "apfs-cow".',
      );
    }
    if (!fs.existsSync(task.baselineDir)) {
      await execFileAsync(
        'git',
        ['-C', workspaceRoot, 'worktree', 'add', '--detach', task.baselineDir, 'HEAD'],
        { maxBuffer: 4 * 1024 * 1024 },
      );
    }
    for (const cand of task.candidates) {
      const workDir = path.join(path.dirname(cand.stdoutPath), 'work');
      if (!fs.existsSync(workDir)) {
        await execFileAsync(
          'git',
          ['-C', workspaceRoot, 'worktree', 'add', '--detach', workDir, 'HEAD'],
          { maxBuffer: 4 * 1024 * 1024 },
        );
      }
      cand.workDir = workDir;
    }
    return task;
  }

  // CoW clone (apfs-cow on macOS, reflink on Linux, bounded fallback)
  if (!fs.existsSync(task.baselineDir)) {
    await cloneTreeFilteredAsync(workspaceRoot, task.baselineDir, opts);
  }
  await Promise.all(
    task.candidates.map(async (cand) => {
      const workDir = path.join(path.dirname(cand.stdoutPath), 'work');
      if (!fs.existsSync(workDir)) {
        await cloneDirPreservingTopSymlinksAsync(task.baselineDir, workDir);
      }
      cand.workDir = workDir;
    }),
  );
  return task;
}

function walkRegularFiles(rootDir, opts = {}) {
  const { exclude, heavy } = getIsolationLists(opts);
  const maxDepth = typeof opts.maxDepth === 'number' ? opts.maxDepth : 12;
  const maxFiles = typeof opts.maxFiles === 'number' ? opts.maxFiles : 25000;
  const skipHeavy = opts.skipHeavy !== false;
  const files = new Map();
  if (!rootDir || !fs.existsSync(rootDir)) return files;

  function visit(absDir, relDir, depth) {
    if (files.size >= maxFiles || depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(absDir, { withFileTypes: true });
    } catch (_) {
      return;
    }
    for (const ent of entries) {
      if (files.size >= maxFiles) break;
      if (exclude.has(ent.name)) continue;
      if (skipHeavy && depth === 0 && heavy.has(ent.name)) continue;
      if (ent.isSymbolicLink()) continue;
      const absPath = path.join(absDir, ent.name);
      const relPath = relDir ? `${relDir}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        visit(absPath, relPath, depth + 1);
      } else if (ent.isFile()) {
        try {
          const st = fs.statSync(absPath);
          files.set(relPath, { absPath, size: st.size, mtimeMs: st.mtimeMs });
        } catch (_) {
          // ignore transient files
        }
      }
    }
  }

  visit(rootDir, '', 0);
  return files;
}

function fileSha256(absPath) {
  const h = crypto.createHash('sha256');
  h.update(fs.readFileSync(absPath));
  return h.digest('hex');
}

function snapshotDirectManifest(workspaceRoot, opts = {}) {
  const files = walkRegularFiles(workspaceRoot, {
    ...opts,
    maxDepth: opts.maxDepth ?? 4,
    maxFiles: opts.maxFiles ?? 8000,
    skipHeavy: true,
  });
  const manifest = {};
  for (const [relPath, info] of files.entries()) {
    manifest[relPath] = { size: info.size, mtimeMs: info.mtimeMs };
  }
  return manifest;
}

function computeDirectChanges(beforeManifest, workspaceRoot, opts = {}) {
  const after = walkRegularFiles(workspaceRoot, {
    ...opts,
    maxDepth: opts.maxDepth ?? 4,
    maxFiles: opts.maxFiles ?? 8000,
    skipHeavy: true,
  });
  const before = beforeManifest || {};
  const added = [];
  const modified = [];
  const deleted = [];

  for (const [relPath, info] of after.entries()) {
    if (!Object.prototype.hasOwnProperty.call(before, relPath)) {
      added.push(relPath);
    } else {
      const prev = before[relPath];
      if (prev.size !== info.size || Math.abs(prev.mtimeMs - info.mtimeMs) > 1) {
        modified.push(relPath);
      }
    }
  }
  for (const relPath of Object.keys(before)) {
    if (!after.has(relPath)) deleted.push(relPath);
  }
  added.sort();
  modified.sort();
  deleted.sort();
  return { added, modified, deleted };
}

function computeWorkspaceDiff(baselineDir, workDir, opts = {}) {
  if (!baselineDir || !fs.existsSync(baselineDir)) {
    const workFiles = walkRegularFiles(workDir, { ...opts, skipHeavy: false });
    const added = Array.from(workFiles.keys()).sort();
    return { added, modified: [], deleted: [] };
  }
  const baseFiles = walkRegularFiles(baselineDir, opts);
  const workFiles = walkRegularFiles(workDir, opts);
  const added = [];
  const modified = [];
  const deleted = [];

  for (const [relPath, wInfo] of workFiles.entries()) {
    const bInfo = baseFiles.get(relPath);
    if (!bInfo) {
      added.push(relPath);
    } else if (bInfo.size !== wInfo.size || fileSha256(bInfo.absPath) !== fileSha256(wInfo.absPath)) {
      modified.push(relPath);
    }
  }
  for (const relPath of baseFiles.keys()) {
    if (!workFiles.has(relPath)) deleted.push(relPath);
  }

  added.sort();
  modified.sort();
  deleted.sort();
  return { added, modified, deleted };
}

function looksBinary(buf) {
  const len = Math.min(buf.length, 4096);
  for (let i = 0; i < len; i += 1) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function splitLines(text) {
  if (!text) return [];
  const norm = String(text).replace(/\r\n/g, '\n');
  const lines = norm.split('\n');
  if (norm.endsWith('\n')) lines.pop();
  return lines;
}

function computeJsUnifiedDiff(oldText, newText, relPath, contextLines = 3) {
  if ((oldText || '') === (newText || '')) return '';
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const n = a.length;
  const m = b.length;

  const header = `--- a/${relPath}\n+++ b/${relPath}\n`;
  if (n > 2000 || m > 2000 || (n + 1) * (m + 1) > 4000000) {
    const aRange = n === 0 ? '0,0' : `1,${n}`;
    const bRange = m === 0 ? '0,0' : `1,${m}`;
    const body = [
      ...a.map((l) => `-${l}`),
      ...b.map((l) => `+${l}`),
    ].join('\n');
    return `${header}@@ -${aRange} +${bRange} @@\n${body}\n`;
  }

  // Build LCS table backwards
  const width = m + 1;
  const dp = new Int32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    const rowOff = i * width;
    const nextOff = (i + 1) * width;
    for (let j = m - 1; j >= 0; j -= 1) {
      if (a[i] === b[j]) {
        dp[rowOff + j] = dp[nextOff + j + 1] + 1;
      } else {
        const down = dp[nextOff + j];
        const right = dp[rowOff + j + 1];
        dp[rowOff + j] = down >= right ? down : right;
      }
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      ops.push({ type: ' ', text: a[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (j < m && (i === n || dp[i * width + (j + 1)] >= dp[(i + 1) * width + j])) {
      ops.push({ type: '+', text: b[j], oldLine: i + 1, newLine: j + 1 });
      j += 1;
    } else {
      ops.push({ type: '-', text: a[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
    }
  }

  const changeIndices = [];
  for (let idx = 0; idx < ops.length; idx += 1) {
    if (ops[idx].type !== ' ') changeIndices.push(idx);
  }
  if (!changeIndices.length) return '';

  const hunks = [];
  let hStart = Math.max(0, changeIndices[0] - contextLines);
  let hEnd = Math.min(ops.length - 1, changeIndices[0] + contextLines);
  for (let c = 1; c < changeIndices.length; c += 1) {
    const nextStart = Math.max(0, changeIndices[c] - contextLines);
    const nextEnd = Math.min(ops.length - 1, changeIndices[c] + contextLines);
    if (nextStart <= hEnd + 1) {
      hEnd = nextEnd;
    } else {
      hunks.push([hStart, hEnd]);
      hStart = nextStart;
      hEnd = nextEnd;
    }
  }
  hunks.push([hStart, hEnd]);

  const renderedHunks = hunks.map(([s, e]) => {
    const slice = ops.slice(s, e + 1);
    let oldCount = 0;
    let newCount = 0;
    let firstOld = slice[0].oldLine;
    let firstNew = slice[0].newLine;
    for (const op of slice) {
      if (op.type === ' ' || op.type === '-') oldCount += 1;
      if (op.type === ' ' || op.type === '+') newCount += 1;
    }
    if (oldCount === 0) firstOld = Math.max(0, firstOld - 1);
    if (newCount === 0) firstNew = Math.max(0, firstNew - 1);
    const body = slice.map((op) => `${op.type}${op.text}`).join('\n');
    return `@@ -${firstOld},${oldCount} +${firstNew},${newCount} @@\n${body}`;
  });

  return `${header}${renderedHunks.join('\n')}\n`;
}

function getUnifiedDiff(baselineDir, workDir, relPath) {
  if (workDir) assertInsideDir(workDir, relPath);
  if (baselineDir) assertInsideDir(baselineDir, relPath);

  const bPath = baselineDir ? path.join(baselineDir, relPath) : null;
  const wPath = workDir ? path.join(workDir, relPath) : null;
  const bExists = Boolean(bPath && fs.existsSync(bPath) && fs.statSync(bPath).isFile());
  const wExists = Boolean(wPath && fs.existsSync(wPath) && fs.statSync(wPath).isFile());

  if (!bExists && !wExists) return '';
  if (bExists && fs.statSync(bPath).size > 512 * 1024) {
    return `[Diff omitted: baseline file exceeds 512 KB (${relPath})]`;
  }
  if (wExists && fs.statSync(wPath).size > 512 * 1024) {
    return `[Diff omitted: candidate file exceeds 512 KB (${relPath})]`;
  }
  if ((bExists && looksBinary(fs.readFileSync(bPath))) || (wExists && looksBinary(fs.readFileSync(wPath)))) {
    return `[Binary file changed: ${relPath}]`;
  }

  if (process.platform !== 'win32' && fs.existsSync('/usr/bin/diff')) {
    const left = bExists ? bPath : '/dev/null';
    const right = wExists ? wPath : '/dev/null';
    try {
      const out = execFileSync('/usr/bin/diff', ['-u', '--label', `a/${relPath}`, '--label', `b/${relPath}`, left, right], {
        encoding: 'utf8',
        maxBuffer: 2 * 1024 * 1024,
      });
      return out || '';
    } catch (err) {
      if (err.status === 1 && typeof err.stdout === 'string') {
        return err.stdout;
      }
    }
  }

  const oldText = bExists ? fs.readFileSync(bPath, 'utf8') : '';
  const newText = wExists ? fs.readFileSync(wPath, 'utf8') : '';
  return computeJsUnifiedDiff(oldText, newText, relPath);
}

function adoptWinner(workspaceRoot, workDir, changedFiles) {
  if (!workDir || path.resolve(workspaceRoot) === path.resolve(workDir)) {
    return { applied: [], skipped: 'Already running directly in workspace.' };
  }
  const applied = [];
  const toCopy = [...(changedFiles.added || []), ...(changedFiles.modified || [])];
  for (const relPath of toCopy) {
    const src = assertInsideDir(workDir, relPath);
    const dst = assertInsideDir(workspaceRoot, relPath);
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    applied.push(relPath);
  }
  return { applied };
}

function cleanupTaskWorktrees(workspaceRoot, task) {
  if (task.isolationMode !== 'git-worktree' || !isGitRepo(workspaceRoot)) return;
  const dirs = [task.baselineDir, ...task.candidates.map((c) => c.workDir)].filter(Boolean);
  for (const dir of dirs) {
    try {
      if (fs.existsSync(dir)) {
        execFileSync('git', ['-C', workspaceRoot, 'worktree', 'remove', '--force', dir], { stdio: 'pipe' });
      }
    } catch (_) {
      // ignore cleanup failures
    }
  }
}

module.exports = {
  DEFAULT_EXCLUDE_DIRS,
  DEFAULT_HEAVY_DIRS,
  DEFAULT_SYMLINK_DIRS,
  assertInsideDir,
  prepareTaskEnvironment,
  snapshotDirectManifest,
  computeDirectChanges,
  computeWorkspaceDiff,
  computeJsUnifiedDiff,
  getUnifiedDiff,
  adoptWinner,
  cleanupTaskWorktrees,
};
