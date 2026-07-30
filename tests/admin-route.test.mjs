import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminHandler } from '../lib/admin-handler.mjs';

function createRedisFake() {
  const redis = new Map();

  const fetchFake = async (_url, options = {}) => {
    const [command, key, value] = JSON.parse(options.body || '[]');

    if (command === 'GET') {
      return Response.json({ result: redis.get(key) ?? null });
    }

    if (command === 'SET') {
      redis.set(key, value);
      return Response.json({ result: 'OK' });
    }

    return Response.json({ error: `Unsupported command: ${command}` }, { status: 400 });
  };

  return { redis, fetchFake };
}

async function readJson(response) {
  return {
    status: response.status,
    body: await response.json(),
  };
}

test('admin route authenticates and persists normalized user permissions', async () => {
  const { redis, fetchFake } = createRedisFake();
  const POST = createAdminHandler({
    adminPass: 'test-admin',
    redisUrl: 'https://redis.test',
    redisToken: 'test-token',
    fetchImpl: fetchFake,
  });

  const call = (body) => POST(new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }));

  assert.deepEqual(
    await readJson(await call({ adminPass: 'test-admin', action: 'login' })),
    { status: 200, body: { success: true } },
  );

  assert.deepEqual(
    await readJson(await call({ adminPass: 'wrong', action: 'login' })),
    { status: 401, body: { success: false, error: '管理密码错误' } },
  );

  assert.deepEqual(
    await readJson(await call({
      adminPass: 'test-admin',
      action: 'saveUser',
      username: ' alice ',
      password: 'pw',
      sections: ['SEO工具箱', ' SEO工具箱 ', '', 'URL读取'],
    })),
    { status: 200, body: { success: true } },
  );
  assert.deepEqual(
    JSON.parse(redis.get('blh:users')),
    { alice: { pass: 'pw', sections: ['SEO工具箱', 'URL读取'] } },
  );

  assert.deepEqual(
    await readJson(await call({
      adminPass: 'test-admin',
      action: 'saveSections',
      sections: ['SEO工具箱', ' SEO工具箱 ', '', 'URL读取'],
    })),
    { status: 200, body: { success: true } },
  );
  assert.deepEqual(
    JSON.parse(redis.get('blh:sections')),
    ['SEO工具箱', 'URL读取'],
  );

  assert.deepEqual(
    await readJson(await call({
      adminPass: 'test-admin',
      action: 'deleteUser',
      username: ' alice ',
    })),
    { status: 200, body: { success: true } },
  );
  assert.deepEqual(JSON.parse(redis.get('blh:users')), {});

  const malformed = await POST(new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not-json',
  }));
  assert.deepEqual(
    await readJson(malformed),
    { status: 400, body: { success: false, error: 'Invalid JSON' } },
  );
});

test('admin route reports missing server configuration', async () => {
  const POST = createAdminHandler({
    adminPass: undefined,
    redisUrl: undefined,
    redisToken: undefined,
    fetchImpl: async () => {
      throw new Error('Redis should not be called');
    },
  });
  const response = await POST(new Request('http://localhost/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminPass: 'anything', action: 'login' }),
  }));

  assert.deepEqual(
    await readJson(response),
    { status: 500, body: { success: false, error: '未设置 ADMIN_PASS 环境变量' } },
  );
});
