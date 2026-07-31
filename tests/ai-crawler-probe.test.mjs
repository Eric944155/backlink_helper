import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyBaseline, classifyProbe, normalizeProxy, redactSecrets, summarizeResults } from '../lib/ai-crawler-probe.mjs';

test('normalizes all supported proxy formats and rejects a bare port', () => {
  assert.equal(normalizeProxy('proxy.test:8080').url, 'http://proxy.test:8080/');
  assert.equal(normalizeProxy('proxy.test:8080:user:pass').url, 'http://user:pass@proxy.test:8080/');
  assert.equal(normalizeProxy('user:pass@proxy.test:8080').url, 'http://user:pass@proxy.test:8080/');
  assert.equal(normalizeProxy('https://user:pass@proxy.test:8080').protocol, 'https:');
  assert.equal(normalizeProxy('socks5://proxy.test:1080').protocol, 'socks5:');
  assert.throws(() => normalizeProxy('8080'), /IP|域名/);
});

test('redacts proxy credentials from errors', () => {
  assert.equal(
    redactSecrets('connect http://alice:secret@proxy.test:8080 failed', ['alice', 'secret']),
    'connect http://***:***@proxy.test:8080 failed',
  );
});

test('classifies hard blocks, rate limits, explicit challenge and baseline differences', () => {
  const baseline = { bodyLength: 1000, title: 'Home', contentType: 'text/html', finalUrl: 'https://a.test/' };
  assert.equal(classifyProbe({ status: 403, body: '', ...baseline }, baseline).status, 'http_denied');
  assert.equal(classifyProbe({ status: 429, body: '', ...baseline }, baseline).status, 'rate_limited');
  assert.equal(classifyProbe({ status: 200, body: '<title>Access Denied</title> CAPTCHA', ...baseline }, baseline).status, 'soft_blocked');
  assert.equal(classifyProbe({
    status: 200,
    body: 'tiny',
    bodyLength: 5,
    title: '',
    contentType: 'text/plain',
    finalUrl: 'https://a.test/challenge',
  }, baseline).status, 'soft_blocked');
  assert.equal(classifyProbe({ status: 200, body: '<title>Home</title>normal', bodyLength: 950, ...baseline }, baseline).status, 'accessible');
});

test('overall summary uses only explicit outcome labels', () => {
  assert.equal(summarizeResults([{ status: 'accessible' }, { status: 'accessible' }]).overall, '全部可访问');
  assert.equal(summarizeResults([{ status: 'accessible' }, { status: 'robots_denied' }]).overall, '部分受限');
  assert.equal(summarizeResults([{ status: 'http_denied' }, { status: 'robots_denied' }, { status: 'accessible' }]).overall, '大部分受限');
  assert.equal(summarizeResults([{ status: 'network_error' }]).overall, '无法判断');
  assert.equal(summarizeResults([{ status: 'policy_allowed' }]).counts.policyAllowed, 1);
});

test('rejects an ordinary-browser baseline that lands on a login or challenge URL', () => {
  const decision = classifyBaseline({
    status: 200,
    body: '<title>Continue</title>',
    bodyLength: 23,
    title: 'Continue',
    contentType: 'text/html',
    finalUrl: 'https://a.test/login',
  });
  assert.equal(decision.status, 'baseline_restricted');
});
