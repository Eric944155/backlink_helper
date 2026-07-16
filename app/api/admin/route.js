/**
 * Admin API — manage users and sections via Upstash Redis.
 * Protected by ADMIN_PASS environment variable.
 *
 * Redis keys:
 *   blh:users    → JSON { "username": { "pass":"xxx", "sections":["SEO工具箱"] }, ... }
 *   blh:sections → JSON ["SEO工具箱", "关键词分析", ...]
 *
 * All requests: POST /api/admin  body: { adminPass, action, ...params }
 */

import { NextResponse } from 'next/server';
const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;
const ADMIN_PASS = process.env.ADMIN_PASS;

async function redisCmd(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  const data = await res.json();
  return data.result;
}

async function getUsers() {
  const raw = await redisCmd('GET', 'blh:users');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}
async function saveUsers(users) {
  await redisCmd('SET', 'blh:users', JSON.stringify(users));
}
async function getSections() {
  const raw = await redisCmd('GET', 'blh:sections');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
async function saveSections(sections) {
  await redisCmd('SET', 'blh:sections', JSON.stringify(sections));
}

export async function POST(request) {










  try { parsed = await request.json(); } catch { return NextResponse.json({ success: false, error: 'Invalid JSON' }); }



  const { adminPass, action } = parsed || {};

  // Verify admin password
  if (action === 'login') {
    if (!ADMIN_PASS) return res.status(200).json({ success: false, error: '未设置 ADMIN_PASS 环境变量' });
    if (adminPass !== ADMIN_PASS) return res.status(200).json({ success: false, error: '管理密码错误' });
    return NextResponse.json({ success: true });
  }

  if (!ADMIN_PASS || adminPass !== ADMIN_PASS) {
    return NextResponse.json({ success: false, error: '管理密码错误' });
  }

  try {
    switch (action) {
      case 'getAll': {
        const users = await getUsers();
        const sections = await getSections();
        return NextResponse.json({ success: true, users, sections });
      }

      case 'saveUser': {
        const { username, password, sections } = parsed;
        if (!username || !password) return res.status(200).json({ success: false, error: '用户名和密码不能为空' });
        const users = await getUsers();
        users[username.trim()] = { pass: password, sections: sections || [] };
        await saveUsers(users);
        return NextResponse.json({ success: true });
      }

      case 'deleteUser': {
        const { username } = parsed;
        if (!username) return res.status(200).json({ success: false, error: '缺少用户名' });
        const users = await getUsers();
        delete users[username];
        await saveUsers(users);
        return NextResponse.json({ success: true });
      }

      case 'saveSections': {
        const { sections } = parsed;
        if (!Array.isArray(sections)) return res.status(200).json({ success: false, error: 'sections 必须是数组' });
        await saveSections(sections.map(s => String(s).trim()).filter(Boolean));
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ success: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || '操作失败' });
  }
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
