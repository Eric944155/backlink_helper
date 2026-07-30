import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { SEO_PERMISSION_NAMES, resolveSeoAccess } = require('../public/seo-permissions.js');

test('SEO permission names remain exact and ordered', () => {
  assert.deepEqual(SEO_PERMISSION_NAMES, [
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
  ]);
});

test('single direct permission selects its matching main tab', () => {
  assert.deepEqual(resolveSeoAccess(['Dofollow / Nofollow 检测']), {
    showToolbox: true,
    main: {
      healthCheck: false,
      dofollowCheck: true,
      regexTool: false,
      indexCheck: false,
    },
    regex: { gsc: false, ga4: false },
    activeMain: 'dofollowCheck',
    activeRegex: null,
  });
});

test('GSC-only permission opens regex with only GSC enabled', () => {
  const access = resolveSeoAccess(['GSC URL 正则匹配']);
  assert.equal(access.showToolbox, true);
  assert.deepEqual(access.main, {
    healthCheck: false,
    dofollowCheck: false,
    regexTool: true,
    indexCheck: false,
  });
  assert.deepEqual(access.regex, { gsc: true, ga4: false });
  assert.equal(access.activeMain, 'regexTool');
  assert.equal(access.activeRegex, 'gsc');
});

test('GA4-only permission opens regex with only GA4 enabled', () => {
  const access = resolveSeoAccess(['GA4 AI 爬虫正则']);
  assert.equal(access.activeMain, 'regexTool');
  assert.equal(access.activeRegex, 'ga4');
  assert.deepEqual(access.regex, { gsc: false, ga4: true });
});

test('__all__ enables all SEO permissions', () => {
  const access = resolveSeoAccess(['__all__']);
  assert.deepEqual(access.main, {
    healthCheck: true,
    dofollowCheck: true,
    regexTool: true,
    indexCheck: true,
  });
  assert.deepEqual(access.regex, { gsc: true, ga4: true });
  assert.equal(access.activeMain, 'healthCheck');
  assert.equal(access.activeRegex, 'gsc');
});

test('legacy, unknown, missing, and invalid permissions grant no SEO access', () => {
  for (const sections of [
    ['SEO工具箱'],
    ['unknown'],
    [],
    undefined,
    '外链存活检测',
  ]) {
    const access = resolveSeoAccess(sections);
    assert.equal(access.showToolbox, false);
    assert.equal(access.activeMain, null);
    assert.equal(access.activeRegex, null);
  }
});
