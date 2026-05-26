const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');
const { callAndLog } = require('../ai/llmClient');
const {
  getActivePrompt,
  getPromptVersion,
  listPromptVersions,
  activatePromptVersion,
  renderUserMessage,
} = require('../ai/promptRegistry');
const { runAndPersistEval, getEvalStats } = require('../ai/evalPipeline');

// ── Hydrate ticket data for prompt rendering ──────────────────────────────────
async function hydrateTicket(ticketId) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      project:  { select: { name: true } },
      assignee: { select: { name: true } },
      comments: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!ticket) return null;

  const recentComments = ticket.comments.length
    ? ticket.comments.map((c) => `[${c.user.name}]: ${c.content}`).join('\n')
    : 'No comments yet.';

  return {
    ticket: {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description || '(no description)',
      status: ticket.status,
      priority: ticket.priority,
      projectName: ticket.project.name,
      assigneeName: ticket.assignee?.name ?? 'Unassigned',
      createdAt: ticket.createdAt.toISOString().split('T')[0],
      recentComments,
    },
  };
}

// POST /api/ai/tickets/:id/summarize
const summarizeTicket = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.id);

  if (Number.isNaN(ticketId)) {
    return res.status(400).json({ success: false, message: 'Invalid ticket id.' });
  }

  const data = await hydrateTicket(ticketId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  const promptVersion = req.query.version
    ? await getPromptVersion('ticket_summarize', parseInt(req.query.version))
    : await getActivePrompt('ticket_summarize');

  const renderedPrompt = renderUserMessage(promptVersion, data);
  const { text, logId } = await callAndLog({ promptVersion, ticketId, renderedPrompt });

  let summary;
  try {
    summary = JSON.parse(text);
  } catch {
    summary = { raw: text, parseError: 'LLM did not return valid JSON' };
  }

  // Eval runs in background — doesn't block the response
  runAndPersistEval(logId, renderedPrompt, text).catch(console.error);

  return res.status(200).json({
    success: true,
    message: 'Ticket summary generated.',
    data: {
      ticketId,
      promptName: promptVersion.name,
      promptVersion: promptVersion.version,
      modelId: promptVersion.modelId,
      logId,
      summary,
    },
  });
});

// POST /api/ai/tickets/:id/suggest-resolution
const suggestResolution = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.id);

  if (Number.isNaN(ticketId)) {
    return res.status(400).json({ success: false, message: 'Invalid ticket id.' });
  }

  const data = await hydrateTicket(ticketId);
  if (!data) {
    return res.status(404).json({ success: false, message: 'Ticket not found.' });
  }

  const promptVersion = req.query.version
    ? await getPromptVersion('suggest_resolution', parseInt(req.query.version))
    : await getActivePrompt('suggest_resolution');

  const renderedPrompt = renderUserMessage(promptVersion, data);
  const { text, logId } = await callAndLog({ promptVersion, ticketId, renderedPrompt });

  let playbook;
  try {
    playbook = JSON.parse(text);
  } catch {
    playbook = { raw: text, parseError: 'LLM did not return valid JSON' };
  }

  runAndPersistEval(logId, renderedPrompt, text).catch(console.error);

  return res.status(200).json({
    success: true,
    message: 'Resolution playbook generated.',
    data: {
      ticketId,
      promptName: promptVersion.name,
      promptVersion: promptVersion.version,
      modelId: promptVersion.modelId,
      logId,
      playbook,
    },
  });
});

// GET /api/ai/prompts/:name/versions
const listVersions = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const versions = await listPromptVersions(name);

  return res.status(200).json({
    success: true,
    message: 'Prompt versions fetched.',
    data: { promptName: name, versions },
  });
});

// PATCH /api/ai/prompts/:name/versions/:version/activate
const activateVersion = asyncHandler(async (req, res) => {
  const { name, version } = req.params;
  await activatePromptVersion(name, parseInt(version));

  return res.status(200).json({
    success: true,
    message: `Activated ${name} v${version}. All other versions deactivated.`,
  });
});

// GET /api/ai/prompts/:name/eval-stats
const evalStats = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const stats = await getEvalStats(name);

  return res.status(200).json({
    success: true,
    message: 'Eval stats fetched.',
    data: { promptName: name, stats },
  });
});

// GET /api/ai/metrics
const getMetrics = asyncHandler(async (req, res) => {
  const [totalCalls, statusCounts, latencyAgg, tokenAgg] = await Promise.all([
    prisma.lLMLog.count(),
    prisma.lLMLog.groupBy({ by: ['evalStatus'], _count: { id: true } }),
    prisma.lLMLog.aggregate({ _avg: { latencyMs: true }, _max: { latencyMs: true } }),
    prisma.lLMLog.aggregate({ _sum: { inputTokens: true, outputTokens: true } }),
  ]);

  const statusMap = Object.fromEntries(
    statusCounts.map((s) => [s.evalStatus, s._count.id])
  );

  const passRate = totalCalls > 0
    ? parseFloat(((statusMap['passed'] ?? 0) / totalCalls).toFixed(4))
    : 0;

  return res.status(200).json({
    success: true,
    message: 'LLM metrics fetched.',
    data: {
      totalCalls,
      passRate,
      avgLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
      maxLatencyMs: latencyAgg._max.latencyMs ?? 0,
      totalInputTokens: tokenAgg._sum.inputTokens ?? 0,
      totalOutputTokens: tokenAgg._sum.outputTokens ?? 0,
      statusBreakdown: {
        passed:  statusMap['passed'] ?? 0,
        flagged: statusMap['flagged'] ?? 0,
        failed:  statusMap['failed'] ?? 0,
        pending: statusMap['pending'] ?? 0,
      },
    },
  });
});

module.exports = {
  summarizeTicket,
  suggestResolution,
  listVersions,
  activateVersion,
  evalStats,
  getMetrics,
};
