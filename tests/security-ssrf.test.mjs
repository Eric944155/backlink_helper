import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSafeUrl } from '../lib/security.js';

test('safe URL resolution returns the exact public address to pin for the socket', async () => {
  const resolved = await resolveSafeUrl('https://public.test/path', {
    lookup: async () => [{ address: '93.184.216.34', family: 4 }],
  });
  assert.equal(resolved.address, '93.184.216.34');
  assert.equal(resolved.family, 4);
  assert.equal(resolved.hostname, 'public.test');
});

test('rejects any hostname answer set containing a private address', async () => {
  await assert.rejects(
    resolveSafeUrl('https://rebinding.test/', {
      lookup: async () => [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ],
    }),
    /内网|公开/,
  );
});

test('handles IPv6 literals and blocks non-public or IPv4-mapped private forms', async () => {
  const publicV6 = await resolveSafeUrl('https://[2606:4700:4700::1111]/');
  assert.equal(publicV6.address, '2606:4700:4700::1111');
  assert.equal(publicV6.family, 6);
  await assert.rejects(resolveSafeUrl('https://[::]/'), /内网|公开/);
  await assert.rejects(resolveSafeUrl('https://[::ffff:7f00:1]/'), /内网|公开/);
});
