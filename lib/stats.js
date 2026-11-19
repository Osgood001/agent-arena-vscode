'use strict';

const WILSON_Z = 1.959963984540054;
const DEFAULT_BOOTSTRAPS = 2000;

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

function quantile(sorted, q) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function median(values) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return quantile(s, 0.5);
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((acc, v) => acc + v, 0) / values.length;
}

function wilsonCi(successes, total, z = WILSON_Z) {
  if (!total) return [0, 0, 0];
  const p = successes / total;
  const denom = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denom;
  const half = (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) / denom;
  return [p, Math.max(0, center - half), Math.min(1, center + half)];
}

function bootstrapCi(values, statFn, rng, nBoot = DEFAULT_BOOTSTRAPS) {
  if (!values.length) return [null, null, null];
  const point = statFn(values);
  if (values.length === 1) return [point, point, point];
  const n = values.length;
  const boots = new Array(nBoot);
  const sample = new Array(n);
  for (let b = 0; b < nBoot; b += 1) {
    for (let i = 0; i < n; i += 1) {
      sample[i] = values[Math.floor(rng() * n)];
    }
    boots[b] = statFn(sample);
  }
  boots.sort((a, b) => a - b);
  return [point, quantile(boots, 0.025), quantile(boots, 0.975)];
}

function solveBradleyTerryElo(configKeys, matches) {
  const n = configKeys.length;
  const ratings = {};
  if (!n) return ratings;
  const idxMap = new Map(configKeys.map((k, i) => [k, i]));

  // Wins matrix with weak Laplace smoothing toward a 0.5 virtual opponent to keep ratings finite
  const wins = Array.from({ length: n }, () => new Array(n).fill(0));
  const total = Array.from({ length: n }, () => new Array(n).fill(0));
  for (const m of matches) {
    const i = idxMap.get(m.a);
    const j = idxMap.get(m.b);
    if (i === undefined || j === undefined || i === j) continue;
    total[i][j] += 1;
    total[j][i] += 1;
    if (m.result === 'a') wins[i][j] += 1;
    else if (m.result === 'b') wins[j][i] += 1;
    else {
      wins[i][j] += 0.5;
      wins[j][i] += 0.5;
    }
  }

  // MM algorithm with weak 0.25 prior tie against anchor strength 1.0
  let p = new Array(n).fill(1.0);
  for (let iter = 0; iter < 60; iter += 1) {
    const next = new Array(n);
    for (let i = 0; i < n; i += 1) {
      let wSum = 0.25;
      let denom = 0.5 / (p[i] + 1.0);
      for (let j = 0; j < n; j += 1) {
        if (i === j || total[i][j] === 0) continue;
        wSum += wins[i][j];
        denom += total[i][j] / (p[i] + p[j]);
      }
      next[i] = wSum / Math.max(1e-9, denom);
    }
    const geo = Math.exp(next.reduce((s, v) => s + Math.log(Math.max(1e-9, v)), 0) / n);
    p = next.map((v) => v / geo);
  }

  const scale = 400 / Math.LN10;
  for (let i = 0; i < n; i += 1) {
    ratings[configKeys[i]] = 1500 + scale * Math.log(Math.max(1e-9, p[i]));
  }
  return ratings;
}

function extractTaskMatches(task) {
  const j = task.judgment;
  if (!j) return [];
  const matches = [];
  const cands = task.candidates || [];
  for (let i = 0; i < cands.length; i += 1) {
    for (let k = i + 1; k < cands.length; k += 1) {
      const a = cands[i];
      const b = cands[k];
      if (a.configKey === b.configKey) continue;
      let res = null;
      if (j.isTie) {
        res = 'tie';
      } else if (j.winnerId === a.id) {
        res = 'a';
      } else if (j.winnerId === b.id) {
        res = 'b';
      } else if (j.scores && j.scores[a.id] && j.scores[b.id]) {
        const sa = j.scores[a.id].overall || 0;
        const sb = j.scores[b.id].overall || 0;
        if (sa > sb + 1e-6) res = 'a';
        else if (sb > sa + 1e-6) res = 'b';
        else if (sa > 0 || sb > 0) res = 'tie';
      }
      if (res) {
        matches.push({ a: a.configKey, b: b.configKey, result: res });
      }
    }
  }
  return matches;
}

function computeLeaderboard(tasks, filters = {}) {
  const rng = mulberry32(42);
  const tagFilter = (filters.tag || '').trim();
  const harnessFilter = (filters.harness || '').trim();

  const filteredTasks = tasks.filter((t) => {
    if (tagFilter && !(t.tags || []).includes(tagFilter)) return false;
    return true;
  });

  const configMap = new Map();
  const judgedTasks = [];
  let totalRuns = 0;
  let totalTokensAll = 0;
  let totalDurationAll = 0;

  for (const task of filteredTasks) {
    const j = task.judgment;
    const taskMatches = extractTaskMatches(task);
    if (j) judgedTasks.push({ task, matches: taskMatches });

    for (const cand of task.candidates || []) {
      if (harnessFilter && cand.harness !== harnessFilter) continue;
      totalRuns += 1;
      const tel = cand.telemetry || {};
      if (typeof tel.totalTokens === 'number') totalTokensAll += tel.totalTokens;
      if (typeof cand.durationMs === 'number') totalDurationAll += cand.durationMs;

      if (!configMap.has(cand.configKey)) {
        configMap.set(cand.configKey, {
          configKey: cand.configKey,
          harness: cand.harness,
          model: cand.model,
          effort: cand.effort,
          nRuns: 0,
          nCompleted: 0,
          nFailed: 0,
          nJudged: 0,
          wins: 0,
          ties: 0,
          losses: 0,
          scores: [],
          durationsMs: [],
          totalTokensList: [],
          costsUsd: [],
          cacheRates: [],
          turnsList: [],
        });
      }
      const row = configMap.get(cand.configKey);
      row.nRuns += 1;
      if (cand.status === 'done') row.nCompleted += 1;
      else if (cand.status === 'failed' || cand.status === 'cancelled') row.nFailed += 1;

      if (typeof cand.durationMs === 'number' && cand.durationMs >= 0) {
        row.durationsMs.push(cand.durationMs);
      }
      if (typeof tel.totalTokens === 'number') {
        row.totalTokensList.push(tel.totalTokens);
      }
      if (typeof tel.costUsd === 'number') {
        row.costsUsd.push(tel.costUsd);
      }
      if (typeof tel.inputTokens === 'number' && tel.inputTokens > 0 && typeof tel.cachedTokens === 'number') {
        row.cacheRates.push(tel.cachedTokens / tel.inputTokens);
      }
      if (typeof tel.numTurns === 'number' && tel.numTurns > 0) {
        row.turnsList.push(tel.numTurns);
      }

      if (j) {
        row.nJudged += 1;
        if (j.isTie) row.ties += 1;
        else if (j.winnerId === cand.id) row.wins += 1;
        else if (j.winnerId) row.losses += 1;

        const sc = j.scores && j.scores[cand.id] ? j.scores[cand.id].overall : null;
        if (typeof sc === 'number' && sc > 0) row.scores.push(sc);
      }
    }
  }

  const configKeys = Array.from(configMap.keys());
  const allMatches = [];
  for (const jt of judgedTasks) {
    for (const m of jt.matches) {
      if (configMap.has(m.a) && configMap.has(m.b)) allMatches.push(m);
    }
  }

  const pointElo = solveBradleyTerryElo(configKeys, allMatches);
  const eloSamples = Object.fromEntries(configKeys.map((k) => [k, []]));
  if (judgedTasks.length >= 2 && configKeys.length >= 2) {
    const nBoot = 400;
    const nt = judgedTasks.length;
    for (let b = 0; b < nBoot; b += 1) {
      const bootMatches = [];
      for (let i = 0; i < nt; i += 1) {
        const picked = judgedTasks[Math.floor(rng() * nt)];
        for (const m of picked.matches) {
          if (configMap.has(m.a) && configMap.has(m.b)) bootMatches.push(m);
        }
      }
      const r = solveBradleyTerryElo(configKeys, bootMatches);
      for (const k of configKeys) {
        eloSamples[k].push(r[k]);
      }
    }
    for (const k of configKeys) eloSamples[k].sort((a, b) => a - b);
  }

  // Pairwise head-to-head lookup
  const pairwise = {};
  for (const k of configKeys) {
    pairwise[k] = {};
    for (const o of configKeys) {
      pairwise[k][o] = { wins: 0, ties: 0, losses: 0, total: 0 };
    }
  }
  for (const m of allMatches) {
    pairwise[m.a][m.b].total += 1;
    pairwise[m.b][m.a].total += 1;
    if (m.result === 'a') {
      pairwise[m.a][m.b].wins += 1;
      pairwise[m.b][m.a].losses += 1;
    } else if (m.result === 'b') {
      pairwise[m.b][m.a].wins += 1;
      pairwise[m.a][m.b].losses += 1;
    } else {
      pairwise[m.a][m.b].ties += 1;
      pairwise[m.b][m.a].ties += 1;
    }
  }

  const configs = configKeys.map((k) => {
    const r = configMap.get(k);
    const [winRate, winLo, winHi] = wilsonCi(r.wins + 0.5 * r.ties, r.nJudged);
    const [scoreMean, scoreLo, scoreHi] = bootstrapCi(r.scores, mean, rng);
    const [durMed, durLo, durHi] = bootstrapCi(r.durationsMs, median, rng);
    const [tokMed, tokLo, tokHi] = bootstrapCi(r.totalTokensList, median, rng);
    const costMed = median(r.costsUsd);
    const cacheHitMean = mean(r.cacheRates);
    const turnsMed = median(r.turnsList);
    const eloPts = eloSamples[k];
    const eloLo = eloPts.length ? quantile(eloPts, 0.025) : pointElo[k];
    const eloHi = eloPts.length ? quantile(eloPts, 0.975) : pointElo[k];

    return {
      configKey: k,
      harness: r.harness,
      model: r.model,
      effort: r.effort,
      nRuns: r.nRuns,
      nCompleted: r.nCompleted,
      nFailed: r.nFailed,
      nJudged: r.nJudged,
      wins: r.wins,
      ties: r.ties,
      losses: r.losses,
      winRate,
      winCi: [winLo, winHi],
      scoreMean,
      scoreCi: [scoreLo, scoreHi],
      elo: pointElo[k],
      eloCi: [eloLo, eloHi],
      durationMedMs: durMed,
      durationCiMs: [durLo, durHi],
      tokensMed: tokMed,
      tokensCi: [tokLo, tokHi],
      costMedUsd: costMed,
      cacheHitMean,
      turnsMed,
    };
  });

  configs.sort((a, b) => {
    if (a.nJudged !== b.nJudged && (a.nJudged === 0 || b.nJudged === 0)) {
      return b.nJudged - a.nJudged;
    }
    if (Math.abs((b.elo || 0) - (a.elo || 0)) > 1e-6 && (a.nJudged > 0 || b.nJudged > 0)) {
      return (b.elo || 0) - (a.elo || 0);
    }
    return b.nCompleted - a.nCompleted;
  });

  return {
    totals: {
      totalTasks: filteredTasks.length,
      judgedTasks: judgedTasks.length,
      totalRuns,
      totalTokens: totalTokensAll,
      totalDurationMs: totalDurationAll,
      uniqueConfigs: configs.length,
    },
    configs,
    pairwise,
  };
}

module.exports = {
  wilsonCi,
  bootstrapCi,
  solveBradleyTerryElo,
  computeLeaderboard,
};
