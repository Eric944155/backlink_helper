/**
 * 共用安全模块（Next.js 版本）
 * 1. requireAuth  —— 校验登录 token，未登录返回 401 Response
 * 2. assertSafeUrl —— 防止 SSRF
 */

import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.ADMIN_PASS || 'blh-default-secret';

/* ---------------- 登录鉴权 ---------------- */

export function verifyToken(token) {
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
  } catch {
    return null;
  }
}

/**
 * Next.js Route Handler 版本的鉴权
 * 未登录直接返回 401 Response，调用方 return 掉即可
 */
export function requireAuth(request) {
  const header = request.headers.get('authorization') || '';
  const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const url = new URL(request.url);
  const token = bearer || url.searchParams.get('token') || '';
  const payload = verifyToken(token);
  if (!payload) {
    return {
      error: Response.json(
        { success: false, message: '未授权，请先登录后再使用该功能' },
        { status: 401 }
      ),
      payload: null,
    };
  }
  return { error: null, payload };
}

/* ---------------- SSRF 防护 ---------------- */

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isPrivateIPv6(ip) {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('fe80')) return true;
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.split(':').pop();
    if (net.isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

export async function assertSafeUrl(rawUrl) {
  let urlObj;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    throw new Error('URL 格式不合法');
  }
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('仅支持 http/https 协议');
  }
  const hostname = urlObj.hostname;
  if (['localhost', '0.0.0.0'].includes(hostname.toLowerCase())) {
    throw new Error('不允许访问内网地址');
  }
  const ipVersion = net.isIP(hostname);
  if (ipVersion === 4 && isPrivateIPv4(hostname)) throw new Error('不允许访问内网地址');
  if (ipVersion === 6 && isPrivateIPv6(hostname)) throw new Error('不允许访问内网地址');
  if (!ipVersion) {
    let records;
    try {
      records = await dns.lookup(hostname, { all: true });
    } catch {
      throw new Error('域名解析失败');
    }
    for (const r of records) {
      if (r.family === 4 && isPrivateIPv4(r.address)) throw new Error('不允许访问内网地址');
      if (r.family === 6 && isPrivateIPv6(r.address)) throw new Error('不允许访问内网地址');
    }
  }
  return true;
}
