# Admin Console Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore a working `/admin` page and repair the admin API so the administrator can manage users and section permissions.

**Architecture:** Keep `POST /api/admin` as the only management boundary. The client page holds `ADMIN_PASS` only in React memory, sends it with each action, and renders Redis-backed users and sections. The route owns validation, authentication, normalization, and Redis persistence.

**Tech Stack:** Next.js 14 App Router, React 18, JavaScript, Node.js built-in test runner, Upstash Redis REST API.

## Global Constraints

- The admin password must not be written to localStorage, sessionStorage, or cookies.
- Preserve the existing Redis keys `blh:users` and `blh:sections`.
- Do not change the ordinary user login flow.
- Do not refactor unrelated homepage tools.
- All route responses use `NextResponse.json`.

---

## File Structure

- Create `tests/admin-route.test.mjs`: route-level regression tests with an in-memory fake for the external Redis REST boundary.
- Create `tests/admin-page.test.mjs`: acceptance check that a production build emits the `/admin` route.
- Modify `package.json`: add the Node test command.
- Modify `app/api/admin/route.js`: parse requests, authenticate, validate, normalize, and persist.
- Create `app/admin/page.jsx`: client-side login and permission-management interface.

### Task 1: Capture the broken admin API with regression tests

**Files:**
- Create: `tests/admin-route.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `POST(request)` exported by `app/api/admin/route.js`.
- Produces: `npm test`, which runs `node --test tests/*.test.mjs`.

- [ ] **Step 1: Add the test command**

Set the scripts entry to include:

```json
"test": "node --test tests/*.test.mjs"
```

- [ ] **Step 2: Write the failing route test**

Create an in-memory Redis map and replace `global.fetch` with a fake that accepts the same JSON command arrays as Upstash. Set `ADMIN_PASS=test-admin`, `KV_REST_API_URL=https://redis.test`, and `KV_REST_API_TOKEN=test-token` before importing the route.

Cover these literal behaviors:

```js
await assertResponse({ adminPass: 'test-admin', action: 'login' }, { success: true });
await assertResponse({ adminPass: 'wrong', action: 'login' }, { success: false, error: '管理密码错误' });
await assertResponse({ adminPass: 'test-admin', action: 'saveUser', username: ' alice ', password: 'pw', sections: ['SEO工具箱'] }, { success: true });
assert.deepEqual(JSON.parse(redis.get('blh:users')), { alice: { pass: 'pw', sections: ['SEO工具箱'] } });
await assertResponse({ adminPass: 'test-admin', action: 'saveSections', sections: ['SEO工具箱', ' SEO工具箱 ', '', 'URL读取'] }, { success: true });
assert.deepEqual(JSON.parse(redis.get('blh:sections')), ['SEO工具箱', 'URL读取']);
```

Also assert that malformed JSON returns `Invalid JSON`, missing Redis configuration returns a clear configuration error in an isolated import, and deleting `alice` removes the stored user.

- [ ] **Step 3: Run the tests to verify RED**

Run: `npm test`

Expected: FAIL on the valid login case because the current route assigns to undeclared `parsed` and returns `Invalid JSON`.

- [ ] **Step 4: Commit the failing tests**

```bash
git add package.json tests/admin-route.test.mjs
git commit -m "test: cover admin management API"
```

### Task 2: Repair the admin API

**Files:**
- Modify: `app/api/admin/route.js`
- Test: `tests/admin-route.test.mjs`

**Interfaces:**
- Consumes: JSON bodies containing `adminPass`, `action`, and action parameters.
- Produces: JSON objects with `success`, optional `error`, and for `getAll`, `users` and `sections`.

- [ ] **Step 1: Replace request parsing and response handling**

Use one declared request-body variable and one response helper:

```js
const reply = (body, status = 200) => NextResponse.json(body, { status });

let parsed;
try {
  parsed = await request.json();
} catch {
  return reply({ success: false, error: 'Invalid JSON' }, 400);
}
```

Remove every `res.status(...).json(...)` call.

- [ ] **Step 2: Validate configuration and administrator password**

For all actions, reject a missing `ADMIN_PASS`. For data actions, also reject missing `KV_REST_API_URL` or `KV_REST_API_TOKEN`. The `login` action succeeds without contacting Redis when the supplied password matches.

- [ ] **Step 3: Harden the Redis boundary**

After calling Redis, check `res.ok` and the returned `error` field. Throw a readable error instead of silently returning `undefined`.

- [ ] **Step 4: Normalize mutation inputs**

Use these exact rules:

```js
const normalizedUsername = String(username || '').trim();
const normalizedSections = Array.isArray(sections)
  ? [...new Set(sections.map(value => String(value).trim()).filter(Boolean))]
  : [];
```

Reject an empty normalized username or password. Save and delete using the normalized username.

- [ ] **Step 5: Run tests to verify GREEN**

Run: `npm test`

Expected: all admin route tests pass with zero failures.

- [ ] **Step 6: Commit the API repair**

```bash
git add app/api/admin/route.js
git commit -m "fix: repair admin management API"
```

### Task 3: Add a failing acceptance test for the admin page

**Files:**
- Create: `tests/admin-page.test.mjs`
- Test: `tests/admin-page.test.mjs`

**Interfaces:**
- Consumes: a completed Next.js production build in `.next/server/app`.
- Produces: an assertion that `.next/server/app/admin/page.js` exists.

- [ ] **Step 1: Write the acceptance test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

test('production build contains the admin page route', () => {
  assert.equal(existsSync('.next/server/app/admin/page.js'), true, 'expected /admin route in production build');
});
```

- [ ] **Step 2: Build the current application**

Run: `npm run build`

Expected: build completes, but it does not emit `.next/server/app/admin/page.js`.

- [ ] **Step 3: Run the acceptance test to verify RED**

Run: `node --test tests/admin-page.test.mjs`

Expected: FAIL with `expected /admin route in production build`.

- [ ] **Step 4: Commit the failing acceptance test**

```bash
git add tests/admin-page.test.mjs
git commit -m "test: require admin page route"
```

### Task 4: Build the admin page

**Files:**
- Create: `app/admin/page.jsx`
- Test: `tests/admin-page.test.mjs`

**Interfaces:**
- Consumes: `POST /api/admin` actions `login`, `getAll`, `saveUser`, `deleteUser`, and `saveSections`.
- Produces: the browser route `/admin`.

- [ ] **Step 1: Create the client component and API helper**

Start with `'use client'`. Keep `adminPass` in React state only. Define:

```js
async function adminRequest(adminPass, action, payload = {}) {
  const response = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPass, action, ...payload }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || '操作失败');
  return data;
}
```

- [ ] **Step 2: Implement administrator login**

Render a password form before authentication. On submit, call `login`, then `getAll`. Do not store the password outside React state. Show pending and error states.

- [ ] **Step 3: Implement user management**

Render each user with username, password input, and section checkboxes. Saving calls `saveUser`; deletion uses `window.confirm('确定删除该用户吗？')` and calls `deleteUser`. Include a blank form for creating a new user.

- [ ] **Step 4: Implement section management**

Render one section per line in a textarea. Saving splits on newlines and calls `saveSections`; refresh the displayed data after success.

- [ ] **Step 5: Add scoped presentation styles**

Keep styling inside the page component with JSX `<style>`. Use a centered login card, responsive two-column management layout, clear focus states, readable error/success banners, and disabled buttons during requests.

- [ ] **Step 6: Build and verify GREEN**

Run: `npm run build`

Then run: `npm test`

Expected: build exits 0, `tests/admin-page.test.mjs` passes, and all API tests pass.

- [ ] **Step 7: Commit the admin page**

```bash
git add app/admin/page.jsx
git commit -m "feat: restore admin console"
```

### Task 5: End-to-end verification

**Files:**
- Verify: `app/admin/page.jsx`
- Verify: `app/api/admin/route.js`
- Verify: `tests/admin-route.test.mjs`
- Verify: `tests/admin-page.test.mjs`

**Interfaces:**
- Consumes: the final repository state.
- Produces: a verified build and usable `/admin` route.

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test`

Run: `npm run build`

Expected: both commands exit 0 with no failed tests or build errors.

- [ ] **Step 2: Verify the route manually**

Start the production server with `npm start`, open `http://localhost:3000/admin`, and verify the administrator password form appears. Submit a deliberately wrong password and verify `管理密码错误` appears without navigation.

- [ ] **Step 3: Verify deployment behavior**

After the main branch deployment completes, open `https://backlink-tool-rho.vercel.app/admin`. Confirm the page loads, a wrong password is rejected, and a correct password loads existing users and sections. Do not create or delete production users solely for verification.
