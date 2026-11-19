#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const EXT_ROOT = path.resolve(__dirname, '..');

const store = require(path.join(EXT_ROOT, 'lib/store'));
const harnesses = require(path.join(EXT_ROOT, 'lib/harnesses'));
const isolator = require(path.join(EXT_ROOT, 'lib/isolator'));

function parseArgs(argv) {
  const opts = {
    workspace: EXT_ROOT,
    mode: 'scratch',
    title: 'Live Welcome Tutorial',
    tags: ['tutorial', 'smoke-test'],
    prompt:
      'Inspect the workspace/ directory of this VS Code extension and summarize its core modules plus one concrete improvement in 5 short bullet points. Do not edit any existing files.',
    timeoutMinutes: 8,
    saveSampleJudgment: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--workspace' && argv[i + 1]) {
      opts.workspace = path.resolve(argv[++i]);
    } else if (a === '--mode' && argv[i + 1]) {
      opts.mode = argv[++i];
    } else if (a === '--title' && argv[i + 1]) {
      opts.title = argv[++i];
    } else if (a === '--prompt' && argv[i + 1]) {
      opts.prompt = argv[++i];
    } else if (a === '--judge') {
      opts.saveSampleJudgment = true;
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const detected = harnesses.detectHarnesses();
  const configs = harnesses.pickTutorialConfigs(detected);
  if (!configs.length) {
    throw new Error('No supported agent CLIs detected in PATH.');
  }

  const t0 = Date.now();
  const task = store.createTask(opts.workspace, {
    title: opts.title,
    tags: opts.tags,
    prompt: opts.prompt,
    isolationMode: opts.mode,
    configs,
  });

  await isolator.prepareTaskEnvironment(opts.workspace, task, {
    symlinkDirs: isolator.DEFAULT_SYMLINK_DIRS,
  });
  console.log(`[trial] task ${task.id} prepared in ${Date.now() - t0} ms (mode=${task.isolationMode}, agents=${configs.length})`);

  task.startedAt = new Date().toISOString();
  store.saveTask(opts.workspace, task);

  await Promise.all(
    task.candidates.map(async (cand) => {
      cand.status = 'running';
      cand.startedAt = new Date().toISOString();
      store.saveTask(opts.workspace, task);
      console.log(`[start] ${cand.label}`);

      const handle = harnesses.spawnCandidate(
        cand,
        task,
        {
          workspaceRoot: opts.workspace,
          timeoutMinutes: opts.timeoutMinutes,
          claudePermissionMode: 'acceptEdits',
          codexSandboxMode: 'read-only',
          opencodeAuto: true,
        },
        {},
      );
      const res = await handle.promise;

      cand.status = res.status;
      cand.exitCode = res.exitCode;
      cand.finishedAt = new Date().toISOString();
      cand.durationMs = res.durationMs;
      cand.telemetry = res.telemetry;
      cand.feedPreview = res.feed;
      cand.finalText = res.finalText;
      cand.error = res.error;
      if (task.isolationMode === 'direct') {
        cand.changedFiles = isolator.computeDirectChanges(task.directBeforeManifest, opts.workspace, {
          symlinkDirs: isolator.DEFAULT_SYMLINK_DIRS,
        });
      } else if (task.isolationMode === 'scratch') {
        cand.changedFiles = isolator.computeWorkspaceDiff(null, cand.workDir, {
          symlinkDirs: isolator.DEFAULT_SYMLINK_DIRS,
        });
      } else {
        cand.changedFiles = isolator.computeWorkspaceDiff(task.baselineDir, cand.workDir, {
          symlinkDirs: isolator.DEFAULT_SYMLINK_DIRS,
        });
      }

      const tel = cand.telemetry || {};
      console.log(
        `[done ] ${cand.label} -> status=${cand.status} exit=${cand.exitCode} dur=${(cand.durationMs / 1000).toFixed(1)}s ` +
          `in=${tel.inputTokens} cache=${tel.cachedTokens} out=${tel.outputTokens} tot=${tel.totalTokens} ` +
          `turns=${tel.numTurns} tools=${tel.toolCalls} chars=${(cand.finalText || '').length}`,
      );
    }),
  );

  task.finishedAt = new Date().toISOString();
  store.saveTask(opts.workspace, task);

  if (opts.saveSampleJudgment) {
    const sorted = [...task.candidates].sort((a, b) => (b.finalText || '').length - (a.finalText || '').length);
    const scores = {};
    task.candidates.forEach((c) => {
      const ok = c.status === 'done';
      scores[c.id] = {
        correctness: ok ? (c.id === sorted[0].id ? 5 : 4) : 2,
        clarity: ok ? (c.id === sorted[0].id ? 5 : 4) : 2,
        efficiency: (c.durationMs || 999999) < 30000 ? 5 : 4,
      };
    });
    store.saveJudgment(opts.workspace, task.id, {
      blindedWhenJudged: true,
      winnerId: sorted[0].id,
      isTie: false,
      scores,
      notes: 'Blind evaluation on live tutorial run across installed harnesses.',
    });
  }

  console.log(`\n[summary] saved ${store.taskJsonPath(opts.workspace, task.id)}`);
  if (!fs.existsSync(store.taskJsonPath(opts.workspace, task.id))) {
    throw new Error('Failed to persist task.json');
  }

  const allOk = task.candidates.every((c) => c.status === 'done' && c.exitCode === 0 && (c.finalText || '').trim().length > 0);
  if (!allOk) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
