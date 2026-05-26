const prisma = require('../config/prisma');

// ── Relevance: term overlap between input and output ──────────────────────────
function scoreRelevance(input, output) {
  const inputWords = new Set(input.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []);
  const outputWords = output.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? [];
  if (inputWords.size === 0) return 0.5;
  const hits = outputWords.filter((w) => inputWords.has(w)).length;
  return Math.min(hits / (inputWords.size * 0.2), 1.0);
}

// ── Coherence: penalises truncation, repetition, all-caps ─────────────────────
function scoreCoherence(output) {
  const sentences = output.split(/[.!?]+/).filter(Boolean);
  if (sentences.length === 0) return 0.0;

  let score = 1.0;

  const last = sentences[sentences.length - 1].trim();
  if (last.split(/\s+/).length < 4 && !output.match(/[.!?]$/)) score -= 0.3;

  const unique = new Set(sentences.map((s) => s.trim().toLowerCase()));
  if (unique.size < sentences.length * 0.8) score -= 0.2;

  const upperRatio = (output.match(/[A-Z]/g) ?? []).length / output.length;
  if (upperRatio > 0.5) score -= 0.2;

  return Math.max(0, score);
}

// ── Length: checks output is within 20–400 words ──────────────────────────────
function scoreLengthOk(output, { minWords = 20, maxWords = 400 } = {}) {
  const words = output.trim().split(/\s+/).length;
  if (words < minWords) return Math.max(0, words / minWords);
  if (words > maxWords) return Math.max(0, 1 - (words - maxWords) / maxWords);
  return 1.0;
}

// ── Composite scorer ──────────────────────────────────────────────────────────
function evaluate(input, output) {
  const rel = scoreRelevance(input, output);
  const coh = scoreCoherence(output);
  const len = scoreLengthOk(output);

  const overall = rel * 0.4 + coh * 0.4 + len * 0.2;

  const evalStatus =
    overall >= 0.65 ? 'passed' :
    overall >= 0.40 ? 'flagged' : 'failed';

  return {
    scoreRelevance: parseFloat(rel.toFixed(3)),
    scoreCoherence: parseFloat(coh.toFixed(3)),
    scoreLengthOk:  parseFloat(len.toFixed(3)),
    scoreOverall:   parseFloat(overall.toFixed(3)),
    evalStatus,
  };
}

// ── Run eval and persist to LLMLog ────────────────────────────────────────────
async function runAndPersistEval(logId, input, output) {
  const scores = evaluate(input, output);
  await prisma.lLMLog.update({
    where: { id: logId },
    data: scores,
  });
  return scores;
}

// ── Aggregate stats for a prompt ──────────────────────────────────────────────
async function getEvalStats(promptName) {
  const logs = await prisma.lLMLog.findMany({
    where: {
      promptVersion: { name: promptName },
      evalStatus: { not: 'pending' },
    },
    select: {
      scoreOverall: true,
      scoreRelevance: true,
      scoreCoherence: true,
      scoreLengthOk: true,
      evalStatus: true,
      latencyMs: true,
    },
  });

  if (logs.length === 0) return { count: 0 };

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    count: logs.length,
    passRate: parseFloat((logs.filter((l) => l.evalStatus === 'passed').length / logs.length).toFixed(3)),
    avgScoreOverall:   parseFloat(avg(logs.map((l) => l.scoreOverall ?? 0)).toFixed(3)),
    avgScoreRelevance: parseFloat(avg(logs.map((l) => l.scoreRelevance ?? 0)).toFixed(3)),
    avgScoreCoherence: parseFloat(avg(logs.map((l) => l.scoreCoherence ?? 0)).toFixed(3)),
    avgLatencyMs: Math.round(avg(logs.map((l) => l.latencyMs))),
    statusBreakdown: {
      passed:  logs.filter((l) => l.evalStatus === 'passed').length,
      flagged: logs.filter((l) => l.evalStatus === 'flagged').length,
      failed:  logs.filter((l) => l.evalStatus === 'failed').length,
    },
  };
}

module.exports = { evaluate, runAndPersistEval, getEvalStats };
