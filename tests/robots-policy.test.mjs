import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRobots } from '../lib/robots-policy.mjs';

test('uses exact user-agent group before wildcard and applies longest match', () => {
  const robots = `
User-agent: *
Disallow: /

User-agent: GPTBot
Disallow: /private/
Allow: /private/public$
`;
  assert.equal(evaluateRobots(robots, 'GPTBot', '/news').allowed, true);
  assert.equal(evaluateRobots(robots, 'GPTBot', '/private/a').allowed, false);
  assert.equal(evaluateRobots(robots, 'GPTBot', '/private/public').allowed, true);
  assert.equal(evaluateRobots(robots, 'OtherBot', '/news').allowed, false);
});

test('supports wildcards, end anchors and allow wins equal-length ties', () => {
  const robots = `
User-agent: TestBot
Disallow: /*.pdf$
Disallow: /same
Allow: /same
`;
  assert.equal(evaluateRobots(robots, 'TestBot', '/a.pdf').allowed, false);
  assert.equal(evaluateRobots(robots, 'TestBot', '/a.pdf?download=1').allowed, true);
  assert.equal(evaluateRobots(robots, 'TestBot', '/same').allowed, true);
});

test('normalizes RFC 9309 percent-encoded octets before matching', () => {
  const robots = `
User-agent: TestBot
Disallow: /users/~private
Disallow: /docs/a%2Fb
Disallow: /café
`;
  assert.equal(evaluateRobots(robots, 'TestBot', '/users/%7eprivate').allowed, false);
  assert.equal(evaluateRobots(robots, 'TestBot', '/docs/a%2fb').allowed, false);
  assert.equal(evaluateRobots(robots, 'TestBot', '/caf%C3%A9').allowed, false);
});

test('missing policy defaults to allowed with evidence', () => {
  assert.deepEqual(evaluateRobots('', 'GPTBot', '/'), {
    allowed: true,
    matchedAgent: null,
    matchedRule: null,
    reason: 'no_applicable_rule',
  });
});
