import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile('app/page.jsx', 'utf8');
const layout = await readFile('app/layout.jsx', 'utf8');
const appScript = await readFile('public/app.js', 'utf8');

test('layout loads the SEO resolver before the main browser script', () => {
  assert.ok(layout.indexOf('/seo-permissions.js') >= 0);
  assert.ok(layout.indexOf('/seo-permissions.js') < layout.indexOf('/app.js'));
});

test('SEO tabs and panels carry exact permission markers', () => {
  for (const permission of [
    '\u5916\u94fe\u5b58\u6d3b\u68c0\u6d4b',
    'Dofollow / Nofollow \u68c0\u6d4b',
    'GSC URL \u6b63\u5219\u5339\u914d',
    'GA4 AI \u722c\u866b\u6b63\u5219',
    '\u6279\u91cf\u6536\u5f55\u67e5\u8be2',
  ]) {
    assert.match(page, new RegExp(`data-section="${permission}"`));
  }
  assert.match(page, /id="seoToolsExtension"/);
  assert.doesNotMatch(page, /data-section="SEO\u5de5\u5177\u7bb1"/);
});

test('main browser script delegates SEO state to the resolver', () => {
  assert.match(appScript, /BlhSeoPermissions\.resolveSeoAccess/);
  assert.match(appScript, /applySeoPermissions/);
});
