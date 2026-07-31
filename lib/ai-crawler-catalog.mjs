export const COMMUNITY_SOURCE_URL = 'https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json';
export const CLOUDFLARE_REFERENCE_URL = 'https://developers.cloudflare.com/ai-crawl-control/reference/bots/';

const OFFICIAL = {
  gptbot: {
    name: 'GPTBot', operator: 'OpenAI', category: 'AI 训练爬虫',
    httpUserAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot',
    sourceUrls: ['https://platform.openai.com/docs/bots'],
  },
  'chatgpt-user': {
    name: 'ChatGPT-User', operator: 'OpenAI', category: 'AI 助手',
    httpUserAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot',
    sourceUrls: ['https://platform.openai.com/docs/bots'],
  },
  'oai-searchbot': {
    name: 'OAI-SearchBot', operator: 'OpenAI', category: 'AI 搜索',
    httpUserAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
    sourceUrls: ['https://platform.openai.com/docs/bots'],
  },
  claudebot: {
    name: 'ClaudeBot', operator: 'Anthropic', category: 'AI 训练爬虫',
    httpUserAgent: 'ClaudeBot/1.0; +https://www.anthropic.com/bot',
    sourceUrls: ['https://support.anthropic.com/en/articles/8896518'],
  },
  'claude-user': {
    name: 'Claude-User', operator: 'Anthropic', category: 'AI 助手',
    httpUserAgent: 'Claude-User/1.0; +https://www.anthropic.com/bot',
    sourceUrls: ['https://support.anthropic.com/en/articles/8896518'],
  },
  'claude-searchbot': {
    name: 'Claude-SearchBot', operator: 'Anthropic', category: 'AI 搜索',
    httpUserAgent: 'Claude-SearchBot/1.0; +https://www.anthropic.com/bot',
    sourceUrls: ['https://support.anthropic.com/en/articles/8896518'],
  },
  perplexitybot: {
    name: 'PerplexityBot', operator: 'Perplexity', category: 'AI 搜索',
    httpUserAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot',
    sourceUrls: ['https://docs.perplexity.ai/guides/bots'],
  },
  'perplexity-user': {
    name: 'Perplexity-User', operator: 'Perplexity', category: 'AI 助手',
    httpUserAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; Perplexity-User/1.0; +https://perplexity.ai/perplexity-user',
    sourceUrls: ['https://docs.perplexity.ai/guides/bots'],
  },
  amazonbot: {
    name: 'Amazonbot', operator: 'Amazon', category: 'AI 搜索',
    httpUserAgent: 'Mozilla/5.0 (compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot)',
    sourceUrls: ['https://developer.amazon.com/amazonbot'],
  },
  applebot: {
    name: 'Applebot', operator: 'Apple', category: 'AI 搜索',
    httpUserAgent: 'Mozilla/5.0 (compatible; Applebot/0.3; +http://www.apple.com/go/applebot)',
    sourceUrls: ['https://support.apple.com/en-us/119829'],
  },
  bytespider: {
    name: 'Bytespider', operator: 'ByteDance', category: 'AI 训练爬虫',
    httpUserAgent: 'Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)',
    sourceUrls: ['https://developers.cloudflare.com/ai-crawl-control/reference/bots/'],
  },
  ccBot: undefined,
  ccbot: {
    name: 'CCBot', operator: 'Common Crawl', category: 'AI 数据来源',
    httpUserAgent: 'CCBot/2.0 (https://commoncrawl.org/faq/)',
    sourceUrls: ['https://commoncrawl.org/ccbot'],
  },
  'google-extended': {
    name: 'Google-Extended', operator: 'Google', category: 'robots 策略令牌',
    probeMode: 'policy_only', httpUserAgent: null,
    sourceUrls: ['https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers#google-extended'],
  },
  'applebot-extended': {
    name: 'Applebot-Extended', operator: 'Apple', category: 'robots 策略令牌',
    probeMode: 'policy_only', httpUserAgent: null,
    sourceUrls: ['https://support.apple.com/en-us/119829'],
  },
};
delete OFFICIAL.ccBot;

const CLOUDFLARE_VERIFIED = new Set([
  'gptbot', 'chatgpt-user', 'oai-searchbot', 'claudebot', 'claude-user',
  'claude-searchbot', 'perplexitybot', 'amazonbot', 'applebot', 'bytespider', 'ccbot',
  'google-extended', 'applebot-extended',
  'duckassistbot', 'youbot', 'meta-externalagent', 'googleother', 'imagesiftbot',
  'timpibot', 'cohere-ai', 'anthropic-ai', 'facebookbot',
]);
const GENERIC = new Set(['spider', 'code', 'openai', 'operator', 'bot', 'crawler', 'ai']);
const VERSION_SUFFIX = /(?:\/|\s+)(?:v?\d+(?:\.\d+)*)(?:\b.*)?$/i;

function slug(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function baseToken(token) {
  return String(token || '').trim().replace(VERSION_SUFFIX, '');
}

function cleanOperator(value) {
  const text = String(value || '未知').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
  return /^unclear|^unknown/i.test(text) ? '未知' : text;
}

export function buildCrawlerCatalog(community = {}) {
  const records = new Map();
  for (const [token, details = {}] of Object.entries(community || {})) {
    const base = baseToken(token);
    const id = slug(base);
    if (!id) continue;
    const existing = records.get(id);
    if (existing) {
      if (!existing.aliases.includes(token)) existing.aliases.push(token);
      continue;
    }
    const official = OFFICIAL[id];
    const generic = GENERIC.has(id);
    records.set(id, {
      id,
      name: official?.name || base,
      operator: official?.operator || cleanOperator(details.operator),
      category: official?.category || details.function || '社区收录',
      confidence: official ? 'official' : (CLOUDFLARE_VERIFIED.has(id) ? 'cloudflare_verified' : 'community'),
      httpUserAgent: official?.httpUserAgent ?? (generic ? null : token),
      robotsToken: official?.name || base,
      probeMode: official ? (official.probeMode || 'http') : (generic ? 'excluded_generic' : 'token_probe'),
      sourceUrls: [...new Set([
        ...(official?.sourceUrls || []),
        COMMUNITY_SOURCE_URL,
        ...(CLOUDFLARE_VERIFIED.has(id) ? [CLOUDFLARE_REFERENCE_URL] : []),
      ])],
      verifiedAt: official || CLOUDFLARE_VERIFIED.has(id) ? '2026-07-31' : null,
      aliases: token === base ? [] : [token],
      defaultSelected: !generic && official?.probeMode !== 'policy_only',
    });
  }
  for (const [id, official] of Object.entries(OFFICIAL)) {
    if (records.has(id)) continue;
    records.set(id, {
      id,
      name: official.name,
      operator: official.operator,
      category: official.category,
      confidence: 'official',
      httpUserAgent: official.httpUserAgent,
      robotsToken: official.name,
      probeMode: official.probeMode || 'http',
      sourceUrls: [...new Set([
        ...official.sourceUrls,
        ...(CLOUDFLARE_VERIFIED.has(id) ? [CLOUDFLARE_REFERENCE_URL] : []),
      ])],
      verifiedAt: '2026-07-31',
      aliases: [],
      defaultSelected: official.probeMode !== 'policy_only',
    });
  }
  return [...records.values()].sort((a, b) => a.operator.localeCompare(b.operator) || a.name.localeCompare(b.name));
}

export function summarizeCrawlerCatalog(crawlers, upstreamCount) {
  return {
    upstreamCount,
    normalizedCount: crawlers.length,
    probeableCount: crawlers.filter((item) => item.probeMode === 'http' || item.probeMode === 'token_probe').length,
    policyOnlyCount: crawlers.filter((item) => item.probeMode === 'policy_only').length,
  };
}

export function getOfficialCrawlerEntries() {
  return buildCrawlerCatalog(Object.fromEntries(
    Object.values(OFFICIAL).map((item) => [item.name, { operator: item.operator, function: item.category }]),
  ));
}
