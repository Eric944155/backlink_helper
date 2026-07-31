import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAuth, requireSection } from '../lib/security.js';

test('missing login token returns 401 before section authorization', async () => {
  const { error, payload } = requireAuth(new Request('https://app.test/api/ai-crawler-check'));
  assert.equal(payload, null);
  assert.equal(error.status, 401);
  assert.equal((await error.json()).success, false);
});

test('section permission allows direct and administrator access', () => {
  assert.equal(requireSection({ sections: ['AI 爬虫访问检测'] }, 'AI 爬虫访问检测'), null);
  assert.equal(requireSection({ sections: ['__all__'] }, 'AI 爬虫访问检测'), null);
});

test('section permission returns 403 when permission is missing', async () => {
  const response = requireSection({ sections: ['外链存活检测'] }, 'AI 爬虫访问检测');
  assert.equal(response.status, 403);
  assert.equal((await response.json()).success, false);
});

test('stream route declares node runtime, 300 second maximum and permission guard', async () => {
  const source = await import('node:fs/promises').then((fs) => fs.readFile('app/api/ai-crawler-check/route.js', 'utf8'));
  assert.match(source, /maxDuration\s*=\s*300/);
  assert.match(source, /runtime\s*=\s*['"]nodejs['"]/);
  assert.match(source, /requireSection\(auth\.payload,\s*SECTION\)/);
  assert.match(source, /application\/x-ndjson/);
});
