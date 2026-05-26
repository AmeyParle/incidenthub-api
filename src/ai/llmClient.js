const prisma = require('../config/prisma');

// ── Retry with exponential backoff ────────────────────────────────────────────
async function withRetry(fn, maxAttempts = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.status === 429 || err.status === 503 || err.code === 'ECONNRESET';
      if (!isRetryable || attempt === maxAttempts) throw err;
      const backoff = delayMs * 2 ** (attempt - 1);
      console.warn(`[llmClient] Attempt ${attempt} failed (${err.status}). Retrying in ${backoff}ms…`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

// ── Core LLM call (Groq — OpenAI-compatible API) ─────────────────────────────
async function callLLM({ modelId, systemPrompt, userMessage, maxTokens, temperature }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set. Add it to your .env file.');
  }

  const start = Date.now();

  const response = await withRetry(async () => {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelId,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      const err = new Error(`Groq API error: ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  });

  const latencyMs    = Date.now() - start;
  const inputTokens  = response.usage?.prompt_tokens ?? 0;
  const outputTokens = response.usage?.completion_tokens ?? 0;
  const text         = response.choices?.[0]?.message?.content ?? '';

  return { text, inputTokens, outputTokens, latencyMs, estimatedCostUsd: 0 };
}

// ── Call + persist log to DB ──────────────────────────────────────────────────
async function callAndLog({ promptVersion, ticketId, renderedPrompt }) {
  const { text, inputTokens, outputTokens, latencyMs } = await callLLM({
    modelId: promptVersion.modelId,
    systemPrompt: promptVersion.systemPrompt,
    userMessage: renderedPrompt,
    maxTokens: promptVersion.maxTokens,
    temperature: promptVersion.temperature,
  });

  const log = await prisma.lLMLog.create({
    data: {
      promptVersionId: promptVersion.id,
      ticketId: ticketId ?? null,
      inputSnapshot: renderedPrompt,
      rawOutput: text,
      inputTokens,
      outputTokens,
      latencyMs,
      evalStatus: 'pending',
    },
  });

  return { text, logId: log.id };
}

module.exports = { callLLM, callAndLog };
