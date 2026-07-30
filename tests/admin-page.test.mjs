import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('production build contains the admin page route', () => {
  assert.equal(
    existsSync('.next/server/app/admin/page.js'),
    true,
    'expected /admin route in production build',
  );
});
