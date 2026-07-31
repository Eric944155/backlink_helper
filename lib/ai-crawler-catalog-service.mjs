import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCrawlerCatalog, COMMUNITY_SOURCE_URL, summarizeCrawlerCatalog } from './ai-crawler-catalog.mjs';

const CACHE_MS = 6 * 60 * 60 * 1000;
const fallbackPath = path.join(process.cwd(), 'data', 'ai-crawlers-fallback.json');
let memoryCache = null;

async function readFallback() {
  const parsed = JSON.parse(await fs.readFile(fallbackPath, 'utf8'));
  return {
    raw: parsed.crawlers || {},
    updatedAt: parsed.capturedAt || null,
    sourceStatus: 'fallback',
  };
}

async function readUpstream() {
  const response = await fetch(COMMUNITY_SOURCE_URL, {
    signal: AbortSignal.timeout(10000),
    next: { revalidate: 21600 },
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = await response.json();
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('上游目录格式异常');
  return {
    raw,
    updatedAt: response.headers.get('last-modified') || new Date().toISOString(),
    sourceStatus: 'live',
  };
}

export async function getCrawlerCatalog({ force = false } = {}) {
  if (!force && memoryCache && Date.now() - memoryCache.cachedAt < CACHE_MS) return memoryCache.value;
  let source;
  try {
    source = await readUpstream();
  } catch (error) {
    source = await readFallback();
    source.sourceError = error.message;
  }
  const crawlers = buildCrawlerCatalog(source.raw);
  const value = {
    ...summarizeCrawlerCatalog(crawlers, Object.keys(source.raw).length),
    updatedAt: source.updatedAt,
    sourceStatus: source.sourceStatus,
    sourceError: source.sourceError || null,
    crawlers,
  };
  memoryCache = { cachedAt: Date.now(), value };
  return value;
}

export function clearCrawlerCatalogCache() {
  memoryCache = null;
}
