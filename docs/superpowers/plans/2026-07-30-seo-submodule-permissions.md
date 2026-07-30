# SEO Submodule Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the SEO toolbox into five independently assignable permissions while preserving its current main-tab and regex-subtab layout.

**Architecture:** A small browser-and-Node-compatible permission resolver will convert a user's flat `sections` array into a deterministic SEO visibility plan. The existing browser script will apply that plan to marked tabs and panels, while the admin handler will independently migrate the selectable section catalog without modifying any user's stored permissions.

**Tech Stack:** Next.js 14 App Router, React 18, browser JavaScript, Node.js test runner, Upstash Redis REST API

## Global Constraints

- The exact permission names are `外链存活检测`, `Dofollow / Nofollow 检测`, `GSC URL 正则匹配`, `GA4 AI 爬虫正则`, and `批量收录查询`.
- `__all__` grants access to every SEO submodule.
- The legacy `SEO工具箱` permission grants no SEO access.
- Keep the current four main SEO tabs and the nested GSC/GA4 regex tabs.
- Do not enable the currently disabled batch index checker.
- Do not change Redis keys, user password behavior, token format, or the flat user `sections` array.
- Migrating the selectable section catalog must not rewrite any user's stored `sections`.
- Do not add a new runtime dependency.

---

### Task 1: Add a testable SEO permission resolver

**Files:**
- Create: `public/seo-permissions.js`
- Create: `tests/seo-permissions.test.mjs`

**Interfaces:**
- Consumes: a possibly invalid `sections` value from the authenticated user payload.
- Produces: `window.BlhSeoPermissions.resolveSeoAccess(sections)` in the browser and `module.exports.resolveSeoAccess(sections)` in Node.
- Produces this result shape:

```js
{
  showToolbox: boolean,
  main: {
    healthCheck: boolean,
    dofollowCheck: boolean,
    regexTool: boolean,
    indexCheck: boolean,
  },
  regex: {
    gsc: boolean,
    ga4: boolean,
  },
  activeMain: 'healthCheck' | 'dofollowCheck' | 'regexTool' | 'indexCheck' | null,
  activeRegex: 'gsc' | 'ga4' | null,
}
```

- [ ] **Step 1: Write the failing resolver tests**

Create `tests/seo-permissions.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node --test --test-name-pattern="SEO permission|single direct|GSC-only|GA4-only|__all__|legacy" tests/seo-permissions.test.mjs
```

Expected: FAIL because `public/seo-permissions.js` does not exist.

- [ ] **Step 3: Implement the minimal resolver**

Create `public/seo-permissions.js` as a UMD-style module:

```js
(function exposeSeoPermissions(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BlhSeoPermissions = api;
})(typeof window !== 'undefined' ? window : globalThis, function createSeoPermissions() {
  const SEO_PERMISSION_NAMES = [
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
  ];

  function resolveSeoAccess(sections) {
    const granted = new Set(Array.isArray(sections) ? sections : []);
    const all = granted.has('__all__');
    const has = (name) => all || granted.has(name);

    const main = {
      healthCheck: has(SEO_PERMISSION_NAMES[0]),
      dofollowCheck: has(SEO_PERMISSION_NAMES[1]),
      regexTool: has(SEO_PERMISSION_NAMES[2]) || has(SEO_PERMISSION_NAMES[3]),
      indexCheck: has(SEO_PERMISSION_NAMES[4]),
    };
    const regex = {
      gsc: has(SEO_PERMISSION_NAMES[2]),
      ga4: has(SEO_PERMISSION_NAMES[3]),
    };
    const activeMain = Object.keys(main).find((key) => main[key]) || null;
    const activeRegex = regex.gsc ? 'gsc' : (regex.ga4 ? 'ga4' : null);

    return {
      showToolbox: Boolean(activeMain),
      main,
      regex,
      activeMain,
      activeRegex,
    };
  }

  return { SEO_PERMISSION_NAMES, resolveSeoAccess };
});
```

- [ ] **Step 4: Run the resolver tests**

Run:

```bash
node --test --test-name-pattern="SEO permission|single direct|GSC-only|GA4-only|__all__|legacy" tests/seo-permissions.test.mjs
```

Expected: all resolver tests PASS.

- [ ] **Step 5: Commit**

```bash
git add public/seo-permissions.js tests/seo-permissions.test.mjs
git commit -m "feat: add SEO permission resolver"
```

---

### Task 2: Mark SEO tabs and apply visibility without blank states

**Files:**
- Modify: `app/layout.jsx`
- Modify: `app/page.jsx`
- Modify: `public/app.js`
- Create: `tests/seo-markup.test.mjs`

**Interfaces:**
- Consumes: `window.BlhSeoPermissions.resolveSeoAccess(sections)` from Task 1.
- Produces: `applyPerms(sections)` behavior that controls both ordinary `[data-section]` content and SEO submodule state.
- Produces these stable SEO markers:
  - container: `#seoToolsExtension`
  - main tabs: existing IDs `#tabHealthCheck`, `#tabDofollowCheck`, `#tabRegexTool`, `#tabIndexCheck`
  - main panels: existing IDs `#panelHealthCheck`, `#panelDofollowCheck`, `#panelRegexTool`, `#panelIndexCheck`
  - regex tabs: existing IDs `#subtabGsc`, `#subtabGa4`
  - regex panels: existing IDs `#subpanelGsc`, `#subpanelGa4`

- [ ] **Step 1: Write failing markup tests**

Create `tests/seo-markup.test.mjs`:

```js
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
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
  ]) {
    assert.match(page, new RegExp(`data-section="${permission}"`));
  }
  assert.match(page, /id="seoToolsExtension"/);
  assert.doesNotMatch(page, /data-section="SEO工具箱"/);
});

test('main browser script delegates SEO state to the resolver', () => {
  assert.match(appScript, /BlhSeoPermissions\.resolveSeoAccess/);
  assert.match(appScript, /applySeoPermissions/);
});
```

- [ ] **Step 2: Run the markup tests to verify they fail**

Run:

```bash
node --test --test-name-pattern="layout loads|SEO tabs|main browser" tests/seo-markup.test.mjs
```

Expected: FAIL because the resolver script and markers are not wired in.

- [ ] **Step 3: Load the resolver before the main script**

In `app/layout.jsx`, place this immediately before the existing `/app.js` script:

```jsx
<script src="/seo-permissions.js" />
<script src="/app.js" defer />
```

- [ ] **Step 4: Add exact permission markers**

In `app/page.jsx`:

- Change the outer SEO container to `id="seoToolsExtension"` and remove `data-section="SEO工具箱"`.
- Add `data-seo-node="true"` and the matching `data-section` to direct main tabs and panels.
- Add `data-seo-node="true"` and `data-section-any="GSC URL 正则匹配|GA4 AI 爬虫正则"` to `#tabRegexTool` and `#panelRegexTool`.
- Add `data-seo-node="true"` and exact `data-section` values to GSC/GA4 sub-tabs and sub-panels.

Example:

```html
<button
  id="tabHealthCheck"
  data-tab="healthCheck"
  data-seo-node="true"
  data-section="外链存活检测"
>
  外链存活检测
</button>
```

```html
<button
  id="tabRegexTool"
  data-tab="regexTool"
  data-seo-node="true"
  data-section-any="GSC URL 正则匹配|GA4 AI 爬虫正则"
>
  正则表达式生成器
</button>
```

- [ ] **Step 5: Apply the SEO visibility plan**

In `public/app.js`, change the ordinary selector so SEO nodes are not handled by the generic loop:

```js
document.querySelectorAll('[data-section]:not([data-seo-node])')
```

Add `applySeoPermissions(sections)` that:

1. Calls `window.BlhSeoPermissions.resolveSeoAccess(sections)`.
2. Hides or shows `#seoToolsExtension`.
3. Applies `display: none` to unauthorized main tabs and panels.
4. Removes `active` from all SEO main tabs and hides all main panels.
5. Shows and activates only `access.activeMain`.
6. Hides unauthorized GSC/GA4 tabs and panels.
7. Removes `active` from both regex sub-tabs.
8. Shows and activates only `access.activeRegex` when regex is the active main tab.
9. Skips missing DOM elements instead of throwing.

Call `applySeoPermissions(sections)` at the end of the existing `applyPerms(sections)` function. Update `hideAllSections()` to hide `#seoToolsExtension` as well as ordinary sections.

- [ ] **Step 6: Run focused and full tests**

Run:

```bash
node --test --test-name-pattern="layout loads|SEO tabs|main browser" tests/seo-markup.test.mjs
npm test
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add app/layout.jsx app/page.jsx public/app.js tests/seo-markup.test.mjs
git commit -m "feat: enforce SEO submodule visibility"
```

---

### Task 3: Migrate the admin section catalog without changing users

**Files:**
- Create: `lib/section-catalog.mjs`
- Modify: `lib/admin-handler.mjs`
- Modify: `tests/admin-route.test.mjs`

**Interfaces:**
- Produces: `migrateSectionCatalog(sections) -> { sections: string[], changed: boolean }`.
- Consumes: the current `blh:sections` JSON array.
- Preserves: the current `blh:users` object byte-for-byte unless the user explicitly performs a user operation.

- [ ] **Step 1: Add a failing admin migration test**

Extend `tests/admin-route.test.mjs` with a `getAll` scenario:

```js
test('getAll replaces the legacy SEO catalog entry without changing users', async () => {
  const { redis, fetchFake } = createRedisFake();
  redis.set('blh:sections', JSON.stringify([
    'URL读取',
    'SEO工具箱',
    '基础设置',
  ]));
  redis.set('blh:users', JSON.stringify({
    legacy: { pass: 'pw', sections: ['SEO工具箱'] },
  }));

  const POST = createAdminHandler({
    adminPass: 'test-admin',
    redisUrl: 'https://redis.test',
    redisToken: 'test-token',
    fetchImpl: fetchFake,
  });
  const response = await POST(new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPass: 'test-admin', action: 'getAll' }),
  }));
  const result = await response.json();

  assert.deepEqual(result.sections, [
    'URL读取',
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
    '基础设置',
  ]);
  assert.deepEqual(result.users, {
    legacy: { pass: 'pw', sections: ['SEO工具箱'] },
  });
  assert.deepEqual(
    JSON.parse(redis.get('blh:users')),
    { legacy: { pass: 'pw', sections: ['SEO工具箱'] } },
  );
  assert.deepEqual(JSON.parse(redis.get('blh:sections')), result.sections);
});
```

Add a second assertion or test that rerunning `getAll` returns the same catalog without duplicate entries.

- [ ] **Step 2: Run the migration test to verify it fails**

Run:

```bash
node --test --test-name-pattern="replaces the legacy SEO catalog" tests/admin-route.test.mjs
```

Expected: FAIL because `SEO工具箱` is still returned unchanged.

- [ ] **Step 3: Implement the idempotent catalog migration**

Create `lib/section-catalog.mjs`:

```js
export const SEO_SUBSECTION_NAMES = [
  '外链存活检测',
  'Dofollow / Nofollow 检测',
  'GSC URL 正则匹配',
  'GA4 AI 爬虫正则',
  '批量收录查询',
];

export function migrateSectionCatalog(sections) {
  const input = Array.isArray(sections) ? sections : [];
  const next = [];
  let replacedLegacy = false;

  for (const raw of input) {
    const name = String(raw).trim();
    if (!name) continue;
    if (name === 'SEO工具箱') {
      next.push(...SEO_SUBSECTION_NAMES);
      replacedLegacy = true;
    } else {
      next.push(name);
    }
  }

  for (const name of SEO_SUBSECTION_NAMES) {
    if (!next.includes(name)) next.push(name);
  }

  const normalized = [...new Set(next)];
  const original = [...new Set(input.map((value) => String(value).trim()).filter(Boolean))];
  const changed = replacedLegacy
    || normalized.length !== original.length
    || normalized.some((value, index) => value !== original[index]);

  return { sections: normalized, changed };
}
```

In `lib/admin-handler.mjs`, import the helper. During `getAll`:

```js
const [users, storedSections] = await Promise.all([getUsers(), getSections()]);
const migration = migrateSectionCatalog(storedSections);
if (migration.changed) await saveSections(migration.sections);
return json({ success: true, users, sections: migration.sections });
```

Do not call `saveUsers()` from this path.

- [ ] **Step 4: Run focused and full tests**

Run:

```bash
node --test --test-name-pattern="replaces the legacy SEO catalog" tests/admin-route.test.mjs
npm test
```

Expected: all tests PASS, including the existing admin login/save/delete tests.

- [ ] **Step 5: Commit**

```bash
git add lib/section-catalog.mjs lib/admin-handler.mjs tests/admin-route.test.mjs
git commit -m "feat: migrate SEO permission catalog"
```

---

### Task 4: Verify the complete permission flow

**Files:**
- Create: `tests/helpers/fake-redis-server.mjs`
- Modify only if verification exposes a defect: `app/layout.jsx`, `app/page.jsx`, `public/app.js`, `public/seo-permissions.js`, `lib/section-catalog.mjs`, `lib/admin-handler.mjs`

**Interfaces:**
- Consumes: the completed resolver, marked DOM, browser state application, and admin catalog migration.
- Produces: a production-build-verified feature ready for review.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
```

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected:

- Build exits with code 0.
- Route output still contains `/`, `/admin`, `/api/auth`, and `/api/admin`.
- No new compilation or type errors are introduced.

- [ ] **Step 3: Create and start a local Redis REST fake**

Create `tests/helpers/fake-redis-server.mjs`:

```js
import { createServer } from 'node:http';

const store = new Map([
  ['blh:sections', JSON.stringify([
    'URL读取',
    '基础设置',
    '站群配置',
    '整理导出',
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
  ])],
  ['blh:users', JSON.stringify({
    none: { pass: 'pw', sections: [] },
    direct: { pass: 'pw', sections: ['Dofollow / Nofollow 检测'] },
    gsc: { pass: 'pw', sections: ['GSC URL 正则匹配'] },
    ga4: { pass: 'pw', sections: ['GA4 AI 爬虫正则'] },
    all: { pass: 'pw', sections: ['__all__'] },
  })],
]);

createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);

  try {
    const [command, key, value] = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (command === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ result: store.get(key) ?? null }));
      return;
    }
    if (command === 'SET') {
      store.set(key, value);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ result: 'OK' }));
      return;
    }
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: `Unsupported command: ${command}` }));
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
}).listen(4310, '127.0.0.1', () => {
  console.log('Fake Redis listening on http://127.0.0.1:4310');
});
```

Start it in a dedicated terminal:

```bash
node tests/helpers/fake-redis-server.mjs
```

Expected: `Fake Redis listening on http://127.0.0.1:4310`.

- [ ] **Step 4: Start the production server with test configuration**

In a second PowerShell terminal:

```powershell
$env:ADMIN_PASS='test-admin'
$env:KV_REST_API_URL='http://127.0.0.1:4310'
$env:KV_REST_API_TOKEN='test-token'
npm start
```

Expected: the production server listens on `http://localhost:3000`.

- [ ] **Step 5: Verify browser behavior**

Check the page in a desktop viewport and a mobile-width viewport:

- The login screen renders without an error overlay or blank body.
- No SEO permission hides ordinary modules such as `URL读取`.
- Empty permissions hide the complete SEO toolbox.
- A direct SEO permission opens its corresponding main tab.
- GSC-only access shows the regex main tab and only the GSC sub-tab.
- GA4-only access shows the regex main tab and only the GA4 sub-tab.
- `__all__` shows all main and regex sub-tabs.
- Batch index check remains visibly unavailable.
- Switching between test users recalculates active tabs without retaining the previous user's panel.

- [ ] **Step 6: Inspect browser logs**

Confirm:

- no uncaught exceptions;
- no missing `BlhSeoPermissions` error;
- no hidden active panel causing blank SEO content;
- no failed local requests caused by the new permission script.

- [ ] **Step 7: Stop both local servers and rerun the full suite**

Run:

```bash
npm test
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 8: Commit the verification helper and any fixes**

Inspect `git status --short`, then stage the test helper and only the feature files changed during verification:

```bash
git add tests/helpers/fake-redis-server.mjs app/layout.jsx app/page.jsx public/app.js public/seo-permissions.js lib/section-catalog.mjs lib/admin-handler.mjs
git commit -m "fix: stabilize SEO permission state"
```

Omit any listed path that did not change. The helper itself makes this a non-empty verification commit.
