const prisma = require('../config/prisma');

// ── Template renderer: replaces {{key}} and {{nested.key}} ────────────────────
function renderTemplate(template, data) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, path) => {
    const value = path.split('.').reduce((obj, key) => obj?.[key], data);
    return value !== undefined && value !== null ? String(value) : '';
  });
}

// ── In-process cache (60s TTL) ────────────────────────────────────────────────
const cache = new Map();
const CACHE_TTL_MS = 60_000;

async function getActivePrompt(name) {
  const cacheKey = `active:${name}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.promptVersion;

  const promptVersion = await prisma.promptVersion.findFirst({
    where: { name, isActive: true },
    orderBy: { version: 'desc' },
  });

  if (!promptVersion) {
    throw new Error(`No active PromptVersion found for "${name}". Run: node src/ai/seed.js`);
  }

  cache.set(cacheKey, { promptVersion, expiresAt: Date.now() + CACHE_TTL_MS });
  return promptVersion;
}

async function getPromptVersion(name, version) {
  const promptVersion = await prisma.promptVersion.findUnique({
    where: { name_version: { name, version } },
  });
  if (!promptVersion) throw new Error(`PromptVersion "${name}" v${version} not found.`);
  return promptVersion;
}

async function listPromptVersions(name) {
  return prisma.promptVersion.findMany({
    where: { name },
    orderBy: { version: 'desc' },
    select: {
      id: true, name: true, version: true, isActive: true,
      modelId: true, maxTokens: true, temperature: true,
      notes: true, createdAt: true,
    },
  });
}

async function activatePromptVersion(name, version) {
  return prisma.$transaction([
    prisma.promptVersion.updateMany({
      where: { name },
      data: { isActive: false },
    }),
    prisma.promptVersion.update({
      where: { name_version: { name, version } },
      data: { isActive: true },
    }),
  ]);
}

function renderUserMessage(promptVersion, data) {
  return renderTemplate(promptVersion.userTemplate, data);
}

module.exports = {
  getActivePrompt,
  getPromptVersion,
  listPromptVersions,
  activatePromptVersion,
  renderUserMessage,
};
