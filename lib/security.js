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

export function requireSection(payload, sectionName) {
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  if (sections.includes('__all__') || sections.includes(sectionName)) return null;
  return Response.json(
    { success: false, message: `无权使用${sectionName}` },
    { status: 403 },
  );
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
  if (a === 192 && b === 0) return true;
  if (a === 192 && b === 0 && parts[2] === 2) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && parts[2] === 100) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a >= 224) return true;
  return false;
}

function expandIPv6(input) {
  let value = String(input || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (value.includes('%')) return null;
  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':');
    const dotted = value.slice(lastColon + 1);
    const octets = dotted.split('.').map(Number);
    if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
    value = `${value.slice(0, lastColon)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = value.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const parts = [...left, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...right]
    .map((part) => Number.parseInt(part || '0', 16));
  if (parts.length !== 8 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 0xffff)) return null;
  return parts;
}

function isPrivateIPv6(ip) {
  const parts = expandIPv6(ip);
  if (!parts) return true;
  const allZero = parts.every((part) => part === 0);
  const loopback = parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  if (allZero || loopback) return true;
  const compatibleV4 = parts.slice(0, 6).every((part) => part === 0);
  const mappedV4 = parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff;
  if (compatibleV4 || mappedV4) {
    const v4 = `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
    return isPrivateIPv4(v4);
  }
  if ((parts[0] & 0xfe00) === 0xfc00) return true;
  if ((parts[0] & 0xffc0) === 0xfe80) return true;
  if ((parts[0] & 0xff00) === 0xff00) return true;
  if ((parts[0] & 0xe000) !== 0x2000) return true;
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return true;
  return false;
}

function isUnsafeAddress(address, family = net.isIP(address)) {
  if (family === 4) return isPrivateIPv4(address);
  if (family === 6) return isPrivateIPv6(address);
  return true;
}

export async function resolveSafeUrl(rawUrl, { lookup = dns.lookup } = {}) {
  let urlObj;
  try {
    urlObj = new URL(rawUrl);
  } catch {
    throw new Error('URL 格式不合法');
  }
  if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
    throw new Error('仅支持 http/https 协议');
  }
  const hostname = urlObj.hostname.replace(/^\[|\]$/g, '');
  if (['localhost', '0.0.0.0'].includes(hostname.toLowerCase())) {
    throw new Error('不允许访问内网地址');
  }
  const ipVersion = net.isIP(hostname);
  let records;
  if (ipVersion) {
    records = [{ address: hostname, family: ipVersion }];
  }
  if (!ipVersion) {
    try {
      records = await lookup(hostname, { all: true });
    } catch {
      throw new Error('域名解析失败');
    }
  }
  if (!Array.isArray(records) || !records.length) throw new Error('域名没有可用的公开地址');
  for (const record of records) {
    if (isUnsafeAddress(record.address, record.family)) throw new Error('不允许访问内网或非公开地址');
  }
  const selected = records[0];
  return {
    url: urlObj,
    hostname,
    address: selected.address,
    family: selected.family,
    addresses: records,
  };
}

export async function assertSafeUrl(rawUrl) {
  await resolveSafeUrl(rawUrl);
  return true;
}
