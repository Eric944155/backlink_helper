import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCrawlerCatalog, summarizeCrawlerCatalog } from '../lib/ai-crawler-catalog.mjs';

test('official overrides win and aliases collapse versioned community entries', () => {
  const community = {
    GPTBot: { operator: 'Unknown', function: 'Training' },
    'GPTBot/1.0': { operator: 'Legacy', function: 'Training' },
    'Google-Extended': { operator: 'Google', function: 'Training control' },
    Spider: { operator: 'Unknown', function: 'Unknown' },
  };
  const catalog = buildCrawlerCatalog(community);
  const gpt = catalog.find((item) => item.id === 'gptbot');
  assert.equal(gpt.confidence, 'official');
  assert.equal(gpt.operator, 'OpenAI');
  assert.equal(gpt.probeMode, 'http');
  assert.ok(gpt.aliases.includes('GPTBot/1.0'));
  assert.equal(catalog.find((item) => item.id === 'google-extended').probeMode, 'policy_only');
  assert.equal(catalog.find((item) => item.id === 'spider').probeMode, 'excluded_generic');
});

test('Cloudflare-verified community entries retain their middle trust tier', () => {
  const catalog = buildCrawlerCatalog({
    DuckAssistBot: { operator: 'DuckDuckGo', function: 'AI assistant' },
  });
  assert.equal(catalog.find((item) => item.id === 'duckassistbot').confidence, 'cloudflare_verified');
});

test('official entries remain available when the community feed omits them', () => {
  const catalog = buildCrawlerCatalog({});
  assert.equal(catalog.find((item) => item.id === 'gptbot').confidence, 'official');
  assert.equal(catalog.find((item) => item.id === 'applebot-extended').probeMode, 'policy_only');
});

test('summary separates raw, normalized, probeable and policy-only counts', () => {
  const community = {
    GPTBot: { operator: 'OpenAI' },
    'GPTBot/1.0': { operator: 'OpenAI' },
    'Google-Extended': { operator: 'Google' },
    Spider: { operator: 'Unknown' },
  };
  const catalog = buildCrawlerCatalog(community);
  const summary = summarizeCrawlerCatalog(catalog, Object.keys(community).length);
  assert.equal(summary.upstreamCount, 4);
  assert.equal(summary.normalizedCount, catalog.length);
  assert.ok(summary.policyOnlyCount >= 2);
  assert.equal(
    summary.probeableCount,
    catalog.filter((item) => item.probeMode === 'http' || item.probeMode === 'token_probe').length,
  );
});
