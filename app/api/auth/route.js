/**
 * User Auth API（Next.js Route Handler 版本）
 *
 * POST /api/auth          body: { user, pass }   → 登录
 * GET  /api/auth?action=verify&token=xxx          → 验证 token
 * GET  /api/auth?action=status                    → 查询是否启用了登录
 */

import crypto from 'crypto';
import { NextResponse } from 'next/server';

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.ADMIN_PASS || 'blh-default-secret';
const TOKEN_EXPIRY_HOURS = 72;

const REDIS_URL   = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

/* ---- Upstash Redis ---- */
async function redisCmd(...args) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const data = await res.json();
  return data.result;
}

async function getUsers() {
  const raw = await redisCmd('GET', 'blh:users');
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

/* ---- Token ---- */
function createToken(username, sections) {
  const payload = { u: username, s: sections, exp: Date.now() + TOKEN_EXPIRY_HOURS * 3600000 };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const p = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!p.exp || Date.now() > p.exp) return null;
    return { username: p.u, sections: p.s || [] };
  } catch { return null; }
}

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store',
};

/* ---- GET ---- */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'status') {
    if (!REDIS_URL || !REDIS_TOKEN) {
      return NextResponse.json({ success: true, authEnabled: false }, { headers: HEADERS });
    }
    const users = await getUsers();
    return NextResponse.json({ success: true, authEnabled: Object.keys(users).length > 0 }, { headers: HEADERS });
  }

  if (action === 'verify') {
    const token = searchParams.get('token') || '';
    const payload = verifyToken(token);
    if (payload) {
      return NextResponse.json({ success: true, username: payload.username, sections: payload.sections }, { headers: HEADERS });
    }
    return NextResponse.json({ success: false, error: 'Token 无效或已过期' }, { headers: HEADERS });
  }

  return NextResponse.json({ success: false, error: 'Unknown action' }, { headers: HEADERS });
}

/* ---- POST（登录） ---- */
export async function POST(request) {
  let parsed;
  try { parsed = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { headers: HEADERS });
  }

  const { user, pass } = parsed || {};
  if (!user || !pass) {
    return NextResponse.json({ success: false, error: '请输入用户名和密码' }, { headers: HEADERS });
  }

  if (!REDIS_URL || !REDIS_TOKEN) {
    // 未配置 Redis → 直接放行（开发模式）
    return NextResponse.json({
      success: true,
      token: createToken(user, ['__all__']),
      username: user,
      sections: ['__all__'],
    }, { headers: HEADERS });
  }

  const users = await getUsers();
  const found = Object.entries(users).find(
    ([name, info]) => name.toLowerCase() === user.toLowerCase() && info.pass === pass
  );
  if (!found) {
    return NextResponse.json({ success: false, error: '用户名或密码错误' }, { headers: HEADERS });
  }

  const [username, info] = found;
  return NextResponse.json({
    success: true,
    token: createToken(username, info.sections || []),
    username,
    sections: info.sections || [],
  }, { headers: HEADERS });
}

/* ---- OPTIONS（CORS preflight） ---- */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });
}
