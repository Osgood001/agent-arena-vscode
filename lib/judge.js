'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const harnesses = require('./harnesses');
const isolator = require('./isolator');
const store = require('./store');

const PREFERRED_JUDGE_ORDER = ['codex', 'claude', 'opencode', 'pi', 'dsh'];

function resolveJudgeConfig(overrideCfg = {}, savedJudgeCfg = {}, detectedHarnesses = null, homeDir = os.homedir()) {
  const detected = detectedHarnesses || harnesses.detectHarnesses();
  const localDefs = harnesses.discoverLocalDefaults(homeDir);

  let harness = String(overrideCfg.harness !== undefined ? overrideCfg.harness : (savedJudgeCfg.harness || '')).trim();
  if (!harness) {
    harness = PREFERRED_JUDGE_ORDER.find((h) => detected[h] && detected[h].available) || 'codex';
  }

  const hasExplicitModel = overrideCfg.model !== undefined && String(overrideCfg.model).trim() !== '';
  const hasSavedModel = savedJudgeCfg.model !== undefined && String(savedJudgeCfg.model).trim() !== '' &&
    (!overrideCfg.harness || overrideCfg.harness === savedJudgeCfg.harness);

  let model = '';
  if (hasExplicitModel) {
    model = String(overrideCfg.model).trim();
  } else if (hasSavedModel) {
    model = String(savedJudgeCfg.model).trim();
  } else if (localDefs[harness] && localDefs[harness].model) {
    model = localDefs[harness].model;
  }

  let effort = '';
  if (overrideCfg.effort !== undefined) {
    effort = String(overrideCfg.effort || '').trim();
  } else if (savedJudgeCfg.effort !== undefined) {
    effort = String(savedJudgeCfg.effort || '').trim();
  } else if (harness === 'codex' || harness === 'claude' || harness === 'pi') {
    effort = (localDefs[harness] && localDefs[harness].effort) || 'medium';
  }

  const blind = typeof overrideCfg.blind === 'boolean'
    ? overrideCfg.blind
    : (savedJudgeCfg.blind !== false);

  const rubric = String(
    overrideCfg.rubric !== undefined ? overrideCfg.rubric : (savedJudgeCfg.rubric || ''),
  ).trim();

  const extraArgs = Array.isArray(overrideCfg.extraArgs)
    ? overrideCfg.extraArgs.filter(Boolean)
    : (Array.isArray(savedJudgeCfg.extraArgs) ? savedJudgeCfg.extraArgs.filter(Boolean) : []);

  const commandTemplate = String(
    overrideCfg.commandTemplate !== undefined ? overrideCfg.commandTemplate : (savedJudgeCfg.commandTemplate || ''),
  ).trim();

  const title = harnesses.HARNESS_LABELS[harness] || harness;
  const modLabel = model || 'default';
  const label = effort ? `${title} · ${modLabel} (${effort})` : `${title} · ${modLabel}`;

  return {
    harness,
    model,
    effort,
    blind,
    rubric,
    extraArgs,
    commandTemplate,
    label,
  };
}

function collectCandidateMarkdownDocs(task, cand, maxCharsPerFile = 10000) {
  if (!task || !cand || task.isolationMode === 'direct' || !cand.workDir) return [];
  const ch = cand.changedFiles || {};
  const relPaths = Array.from(new Set([...(ch.added || []), ...(ch.modified || [])]))
    .filter((p) => /\.(md|markdown)$/i.test(p))
    .slice(0, 2);

  const docs = [];
  for (const relPath of relPaths) {
    try {
      const absPath = isolator.assertInsideDir(cand.workDir, relPath);
      if (!fs.existsSync(absPath)) continue;
      const st = fs.statSync(absPath);
      if (!st.isFile() || st.size > 512 * 1024) continue;
      const buf = fs.readFileSync(absPath);
      if (buf.subarray(0, 4096).includes(0)) continue;
      let text = buf.toString('utf8');
      if (text.length > maxCharsPerFile) {
        text = `${text.slice(0, maxCharsPerFile)}\n… [truncated]`;
      }
      docs.push({ relPath, content: text });
    } catch (_) {
      // skip invalid or unreadable artifacts
    }
  }
  return docs;
}

function formatDurationCompact(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return 'n/a';
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokensCompact(tel) {
  if (!tel) return 'n/a';
  const tot = tel.totalTokens !== null && tel.totalTokens !== undefined
    ? tel.totalTokens
    : ((tel.inputTokens || 0) + (tel.outputTokens || 0));
  return tot ? String(tot) : 'n/a';
}

function buildJudgePrompt(task, opts = {}) {
  const blind = opts.blind !== false;
  const rubric = String(opts.rubric || '').trim();
  const cands = [...(task.candidates || [])];
  if (blind && task.blindMap) {
    cands.sort((a, b) => String(task.blindMap[a.id] || a.id).localeCompare(String(task.blindMap[b.id] || b.id)));
  }

  const aliasToCandId = {};
  const candIdToAlias = {};
  const orderedAliases = [];
  const sections = [];

  cands.forEach((cand, idx) => {
    let alias = blind
      ? ((task.blindMap && task.blindMap[cand.id]) || `Candidate ${String.fromCharCode(65 + idx)}`)
      : (cand.label || cand.configKey || cand.id);
    if (Object.prototype.hasOwnProperty.call(aliasToCandId, alias)) {
      alias = `${alias} (#${idx + 1})`;
    }
    aliasToCandId[alias] = cand.id;
    aliasToCandId[alias.toLowerCase()] = cand.id;
    candIdToAlias[cand.id] = alias;
    orderedAliases.push(alias);

    const ch = cand.changedFiles || {};
    const changedAll = [...(ch.added || []), ...(ch.modified || []), ...(ch.deleted || [])];
    const finalTxt = String(cand.finalText || cand.error || '(empty output)').trim();
    const trimmedFinal = finalTxt.length > 16000 ? `${finalTxt.slice(0, 16000)}\n… [truncated]` : finalTxt;
    const docs = collectCandidateMarkdownDocs(task, cand);

    const lines = [
      `## ${alias}`,
      `- Status: ${cand.status || 'unknown'} | Elapsed: ${formatDurationCompact(cand.durationMs)} | Tokens: ${formatTokensCompact(cand.telemetry)}`,
    ];
    if (changedAll.length) {
      lines.push(`- Changed files (${task.isolationMode}): ${changedAll.slice(0, 20).join(', ')}`);
    }
    lines.push('', '### Final Response', trimmedFinal);
    if (docs.length) {
      lines.push('', '### Produced Markdown Files');
      for (const doc of docs) {
        lines.push(`#### File: ${doc.relPath}`, '```markdown', doc.content, '```');
      }
    }
    sections.push(lines.join('\n'));
  });

  const sampleAlias = orderedAliases[0] || 'Candidate A';
  const promptParts = [
    'You are an impartial expert software & research evaluator judging side-by-side submissions produced for the exact same task prompt.',
    'Do NOT run shell commands, search the web, or modify any workspace files; judge strictly from the submissions below.',
    '',
    '# Original Task Prompt',
    String(task.prompt || '').trim(),
    '',
  ];
  if (rubric) {
    promptParts.push('# Evaluation Rubric', rubric, '');
  }
  promptParts.push(
    '# Submissions',
    sections.join('\n\n---\n\n'),
    '',
    '# Scoring & Output Format',
    'Score every submission on integers 1 to 5 for `correctness`, `clarity`, and `efficiency`, pick the best overall `winner` (or set `"isTie": true` and `"winner": null` if genuinely tied), and give a concise 2–4 sentence `rationale`.',
    'Respond with ONLY a valid JSON object inside a ```json fenced code block matching this exact schema:',
    '```json',
    JSON.stringify(
      {
        winner: sampleAlias,
        isTie: false,
        scores: Object.fromEntries(
          orderedAliases.map((a) => [a, { correctness: 4, clarity: 4, efficiency: 4 }]),
        ),
        rationale: 'Brief justification citing concrete strengths and weaknesses.',
      },
      null,
      2,
    ),
    '```',
  );

  return {
    prompt: promptParts.join('\n'),
    aliasToCandId,
    candIdToAlias,
    orderedAliases,
  };
}

function extractBalancedJsonObjects(text) {
  const candidates = [];
  const s = String(text || '');
  for (let i = 0; i < s.length; i += 1) {
    if (s[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let escaped = false;
    for (let j = i; j < s.length; j += 1) {
      const ch = s[j];
      if (inStr) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') {
        inStr = true;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          candidates.push(s.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return candidates;
}

function clampScore(v) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.min(5, Math.round(n * 10) / 10));
}

function parseJudgeOutput(rawText, aliasToCandId) {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new Error('Judge agent returned empty output.');
  }

  const jsonPayloads = [];
  const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
  let m;
  while ((m = fenceRe.exec(text)) !== null) {
    jsonPayloads.push(m[1].trim());
  }
  for (const objStr of extractBalancedJsonObjects(text)) {
    jsonPayloads.push(objStr);
  }

  let parsed = null;
  // Prefer the last valid JSON object that specifies winner or scores
  for (let i = jsonPayloads.length - 1; i >= 0; i -= 1) {
    try {
      const obj = JSON.parse(jsonPayloads[i]);
      if (obj && typeof obj === 'object' && ('winner' in obj || 'scores' in obj || 'isTie' in obj)) {
        parsed = obj;
        break;
      }
    } catch (_) {
      // try previous candidate
    }
  }

  if (!parsed) {
    throw new Error(`Judge output did not contain valid verdict JSON. Raw tail: ${text.slice(-260)}`);
  }

  const validCandIds = new Set(Object.values(aliasToCandId || {}));
  function resolveCandId(rawKey) {
    if (rawKey === null || rawKey === undefined) return null;
    const cleaned = String(rawKey).replace(/^[`"*#\s]+|[`"*#\s]+$/g, '').trim();
    if (!cleaned) return null;
    if (validCandIds.has(cleaned)) return cleaned;
    if (Object.prototype.hasOwnProperty.call(aliasToCandId, cleaned)) return aliasToCandId[cleaned];
    const lower = cleaned.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(aliasToCandId, lower)) return aliasToCandId[lower];
    if (/^[a-z]$/i.test(cleaned)) {
      const candKey = `candidate ${lower}`;
      if (Object.prototype.hasOwnProperty.call(aliasToCandId, candKey)) return aliasToCandId[candKey];
    }
    return null;
  }

  const scores = {};
  if (parsed.scores && typeof parsed.scores === 'object') {
    for (const [rawKey, sc] of Object.entries(parsed.scores)) {
      const cid = resolveCandId(rawKey);
      if (!cid || !sc || typeof sc !== 'object') continue;
      const correctness = clampScore(sc.correctness);
      const clarity = clampScore(sc.clarity);
      const efficiency = clampScore(sc.efficiency);
      scores[cid] = { correctness, clarity, efficiency };
    }
  }

  const rawWinnerStr = parsed.winner === null || parsed.winner === undefined ? '' : String(parsed.winner).trim();
  let isTie = Boolean(parsed.isTie) || /^tie$/i.test(rawWinnerStr);
  let winnerId = isTie ? null : resolveCandId(rawWinnerStr);

  if (!isTie && !winnerId && Object.keys(scores).length > 0) {
    // Infer winner from highest mean score if unique
    const ranked = Object.entries(scores)
      .map(([cid, sc]) => {
        const vals = [sc.correctness, sc.clarity, sc.efficiency].filter((v) => v > 0);
        return { cid, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
      })
      .sort((a, b) => b.avg - a.avg);
    if (ranked.length === 1 || (ranked.length > 1 && ranked[0].avg > ranked[1].avg + 1e-6)) {
      winnerId = ranked[0].cid;
    } else if (ranked.length > 1 && ranked[0].avg > 0) {
      isTie = true;
    }
  }

  if (!isTie && !winnerId && !Object.keys(scores).length) {
    throw new Error('Judge JSON did not reference any valid submission candidates.');
  }

  return {
    winnerId,
    isTie,
    scores,
    notes: String(parsed.rationale || parsed.notes || parsed.reason || '').trim(),
  };
}

function runAgentJudge(workspaceRoot, task, judgeCfgInput = {}, opts = {}) {
  const judgeCfg = resolveJudgeConfig(judgeCfgInput, opts.savedJudgeCfg || {}, opts.detectedHarnesses, opts.homeDir);
  const stamp = `${Date.now()}-${crypto.randomBytes(2).toString('hex')}`;
  const judgeDir = path.join(store.taskDir(workspaceRoot, task.id), 'judge', stamp);
  const judgeWorkDir = path.join(judgeDir, 'work');
  fs.mkdirSync(judgeWorkDir, { recursive: true });

  const built = buildJudgePrompt(task, { blind: judgeCfg.blind, rubric: judgeCfg.rubric });
  fs.writeFileSync(path.join(judgeDir, 'prompt.txt'), built.prompt, 'utf8');

  const judgeCandidate = {
    id: `judge-${stamp}`,
    harness: judgeCfg.harness,
    model: judgeCfg.model,
    effort: judgeCfg.effort,
    extraArgs: judgeCfg.extraArgs || [],
    commandTemplate: judgeCfg.commandTemplate || '',
    workDir: judgeWorkDir,
    stdoutPath: path.join(judgeDir, 'stdout.log'),
    stderrPath: path.join(judgeDir, 'stderr.log'),
    lastMessagePath: path.join(judgeDir, 'last-message.txt'),
  };

  const handle = harnesses.spawnCandidate(
    judgeCandidate,
    { prompt: built.prompt },
    {
      timeoutMinutes: opts.timeoutMinutes || 5,
      codexSandboxMode: 'read-only',
      claudePermissionMode: opts.claudePermissionMode || 'acceptEdits',
      opencodeAuto: opts.opencodeAuto !== false,
      binaryOverrides: opts.binaryOverrides || {},
    },
    opts.callbacks || {},
  );

  const promise = handle.promise.then((res) => {
    if (res.status === 'cancelled') {
      throw new Error('AI Judge cancelled');
    }
    if (res.status !== 'done') {
      throw new Error(res.error || `AI Judge exited with status ${res.status}`);
    }
    const verdict = parseJudgeOutput(res.finalText, built.aliasToCandId);
    const judgmentInput = {
      judgeType: 'agent',
      judgeConfig: {
        harness: judgeCfg.harness,
        model: judgeCfg.model,
        effort: judgeCfg.effort,
        label: judgeCfg.label,
      },
      judgeDurationMs: res.durationMs,
      judgeTelemetry: res.telemetry,
      blindedWhenJudged: judgeCfg.blind !== false,
      winnerId: verdict.winnerId,
      isTie: verdict.isTie,
      scores: verdict.scores,
      notes: verdict.notes,
    };
    return {
      judgmentInput,
      rawOutput: res.finalText,
      durationMs: res.durationMs,
      telemetry: res.telemetry,
      judgeConfig: judgeCfg,
    };
  });

  return {
    cancel: handle.cancel,
    judgeConfig: judgeCfg,
    promise,
  };
}

module.exports = {
  PREFERRED_JUDGE_ORDER,
  resolveJudgeConfig,
  collectCandidateMarkdownDocs,
  buildJudgePrompt,
  parseJudgeOutput,
  runAgentJudge,
};
