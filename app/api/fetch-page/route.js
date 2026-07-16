/**
 * fetch-page API（Next.js Route Handler 版本）
 * GET /api/fetch-page?url=xxx
 */

import http from 'http';
import https from 'https';
import zlib from 'zlib';
import { requireAuth, assertSafeUrl } from '@/lib/security';

const MAX_HTML_CHARS = 2200000;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;

function ensureAbsoluteUrl(input = '') {
  const value = String(input || '').trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function decodeHtmlEntities(text = '') {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#039;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, code) => { try { return String.fromCharCode(Number(code)); } catch { return _; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => { try { return String.fromCharCode(parseInt(code, 16)); } catch { return _; } });
}

function normalizeText(text = '') {
  return decodeHtmlEntities(String(text || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAttr(attrs = '', name = '') {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = String(attrs || '').match(re);
  return m ? decodeHtmlEntities(m[2] || m[3] || m[4] || '') : '';
}

function shouldSkipHref(href = '') {
  const v = String(href || '').trim();
  return !v || v.startsWith('#') || /^(javascript|mailto|tel|sms|data|blob|about):/i.test(v);
}

function resolveUrl(href = '', baseUrl = '') {
  const clean = String(href || '').trim().replace(/\s+/g, '');
  if (shouldSkipHref(clean)) return '';
  try { return new URL(clean, baseUrl).href; } catch { return ''; }
}

function extractTitle(html = '', fallbackUrl = '') {
  const h1 = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) { const t = normalizeText(h1[1]); if (t) return t.slice(0, 180); }
  const og = String(html).match(/<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (og) { const t = normalizeText(og[1]); if (t) return t.slice(0, 180); }
  const title = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title) { const t = normalizeText(title[1]); if (t) return (t.replace(/\s*[|｜-]\s*[^|｜-]{2,80}$/g, '').trim() || t).slice(0, 180); }
  try {
    const parsed = new URL(fallbackUrl);
    return decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname || fallbackUrl);
  } catch { return fallbackUrl; }
}

function cleanForAnchorScan(html = '') {
  const body = String(html || '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = body ? body[1] : String(html || '');
  return bodyHtml
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
}

function getAnchorText(innerHtml = '', attrs = '', targetUrl = '') {
  let text = normalizeText(innerHtml);
  if (text) return text;
  const aria = getAttr(attrs, 'aria-label') || getAttr(attrs, 'title');
  text = normalizeText(aria);
  if (text) return text;
  const imgAlt = String(innerHtml || '').match(/<img\b[^>]*(?:alt|title)=["']([^"']+)["'][^>]*>/i);
  text = imgAlt ? normalizeText(imgAlt[1]) : '';
  if (text) return text;
  return targetUrl;
}

function isLikelyAntiBotPage(html = '', statusCode = 200) {
  if ([401, 403, 429].includes(Number(statusCode))) return true;
  const text = String(html || '').slice(0, 12000).toLowerCase();
  return ['checking your browser','verify you are human','are you a human','just a moment',
    'attention required','cloudflare','cf-browser-verification','cf-chl','security check',
    'enable javascript and cookies','access denied','forbidden','ddos-guard','captcha',
    'recaptcha','hcaptcha','human verification','please wait while we verify',
    '正在验证','人机验证','访问验证'].some(s => text.includes(s));
}

function extractLinks(html = '', pageUrl = '') {
  const scanHtml = cleanForAnchorScan(html);
  const links = [];
  const seen = new Set();
  const aRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let scannedAnchors = 0;
  let m;
  while ((m = aRe.exec(scanHtml)) !== null) {
    scannedAnchors++;
    const attrs = m[1] || '';
    const innerHtml = m[2] || '';
    const rawHref = getAttr(attrs, 'href');
    const targetUrl = resolveUrl(rawHref, pageUrl);
    if (!targetUrl) continue;
    const anchorText = getAnchorText(innerHtml, attrs, targetUrl);
    if (!anchorText || anchorText.length > 240) continue;
    const rel = getAttr(attrs, 'rel');
    const key = `${anchorText.toLowerCase()}||${targetUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    links.push({ anchorText, targetUrl, rel, dofollow: /nofollow/i.test(rel) ? 'No' : 'Yes', source: 'vercelApiLink' });
  }
  return { links, scannedAnchors };
}

function decodeBody(buffer, headers = {}) {
  const enc = String(headers['content-encoding'] || '').toLowerCase();
  try {
    if (enc.includes('br') && zlib.brotliDecompressSync) return zlib.brotliDecompressSync(buffer).toString('utf8');
    if (enc.includes('gzip')) return zlib.gunzipSync(buffer).toString('utf8');
    if (enc.includes('deflate')) return zlib.inflateSync(buffer).toString('utf8');
  } catch { return buffer.toString('utf8'); }
  return buffer.toString('utf8');
}

async function requestOnce(targetUrl, headers = {}, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) throw new Error('重定向次数过多');
  await assertSafeUrl(targetUrl);
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request({
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: 'https://www.google.com/',
        Connection: 'close',
        ...headers,
      },
    }, res => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        const nextUrl = resolveUrl(location, targetUrl);
        res.resume();
        requestOnce(nextUrl, headers, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      if ([401, 403, 429].includes(status)) {
        res.resume();
        resolve({ statusCode: status, headers: res.headers, body: '', finalUrl: targetUrl, fastFailed: true });
        return;
      }
      const chunks = [];
      let total = 0;
      let truncated = false;
      res.on('data', chunk => { total += chunk.length; if (total <= MAX_HTML_CHARS) chunks.push(chunk); else truncated = true; });
      res.on('end', () => {
        let body = '';
        try { body = decodeBody(Buffer.concat(chunks), res.headers); } catch { body = Buffer.concat(chunks).toString('utf8'); }
        resolve({ statusCode: status, headers: res.headers, body, finalUrl: targetUrl, truncated, fastFailed: false });
      });
    });
    req.on('timeout', () => req.destroy(new Error('目标页面响应超时')));
    req.on('error', reject);
    req.end();
  });
}

function failure(message, extra = {}) {
  return { success: false, message, error: message, links: [], linkCount: 0, scannedAnchors: 0, fastFailed: true, ...extra };
}

export async function GET(request) {
  const { error, payload } = requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const inputUrl = searchParams.get('url');
  if (!inputUrl) return Response.json(failure('缺少 url 参数'));

  const targetUrl = ensureAbsoluteUrl(inputUrl);

  try {
    await assertSafeUrl(targetUrl);
    const page = await requestOnce(targetUrl, {});

    if (page.fastFailed) {
      const s = page.statusCode;
      const msg = s === 401 ? '目标页面 HTTP 401，访问验证或权限限制'
        : s === 403 ? '目标页面 HTTP 403，反爬或访问拒绝'
        : s === 429 ? '目标页面 HTTP 429，请求过快或被限流'
        : `目标页面 HTTP ${s}`;
      return Response.json(failure(msg, { url: targetUrl, finalUrl: page.finalUrl, statusCode: s }));
    }

    if (!(page.statusCode >= 200 && page.statusCode < 400) || !page.body) {
      return Response.json(failure(`目标页面 HTTP ${page.statusCode}`, { url: targetUrl, finalUrl: page.finalUrl, statusCode: page.statusCode }));
    }

    const html = page.body;
    if (isLikelyAntiBotPage(html, page.statusCode)) {
      return Response.json(failure('目标站启用了人机验证/访问校验，已快速跳过', { url: targetUrl, finalUrl: page.finalUrl, statusCode: page.statusCode }));
    }

    const contentType = String(page.headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml') && !contentType.includes('text/plain')) {
      return Response.json(failure(`目标页面不是 HTML 内容：${page.headers['content-type']}`, { url: targetUrl, finalUrl: page.finalUrl, statusCode: page.statusCode }));
    }

    const title = extractTitle(html, page.finalUrl || targetUrl);
    const extracted = extractLinks(html, page.finalUrl || targetUrl);

    return Response.json({
      success: true,
      via: 'vercel-api-links-fast-keep-links',
      url: targetUrl,
      finalUrl: page.finalUrl || targetUrl,
      title,
      pageTitle: title,
      contentType: page.headers['content-type'] || '',
      statusCode: page.statusCode,
      scannedAnchors: extracted.scannedAnchors,
      totalAnchors: extracted.scannedAnchors,
      linkCount: extracted.links.length,
      links: extracted.links,
      fastFailed: false,
      truncated: !!page.truncated,
      warnings: extracted.links.length > 100 ? ['该页面链接数量偏多，建议填写目标网站域名过滤。'] : [],
    });
  } catch (err) {
    return Response.json(failure(err.message || '读取失败', { url: targetUrl, finalUrl: targetUrl, statusCode: err.statusCode || null }));
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });
}
