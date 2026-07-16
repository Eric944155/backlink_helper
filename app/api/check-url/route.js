/**
 * check-url API（Next.js Route Handler 版本）
 * GET /api/check-url?url=xxx&mode=health|links
 */

import http from 'http';
import https from 'https';
import zlib from 'zlib';
import { requireAuth, assertSafeUrl } from '@/lib/security';

const REQUEST_TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 10;
const MAX_HTML_CHARS = 2200000;

function ensureAbsoluteUrl(input = '') {
  const v = String(input || '').trim();
  return /^https?:\/\//i.test(v) ? v : v ? `https://${v}` : '';
}

function decodeHtmlEntities(text = '') {
  return String(text || '')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&apos;/gi, "'")
    .replace(/&#039;/gi, "'").replace(/&#39;/gi, "'").replace(/&#x27;/gi, "'").replace(/&#x2F;/gi, '/')
    .replace(/&#(\d+);/g, (_, c) => { try { return String.fromCharCode(Number(c)); } catch { return _; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => { try { return String.fromCharCode(parseInt(c, 16)); } catch { return _; } });
}

function normalizeText(text = '') {
  return decodeHtmlEntities(String(text || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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

function decodeBody(buffer, headers = {}) {
  const enc = String(headers['content-encoding'] || '').toLowerCase();
  try {
    if (enc.includes('br') && zlib.brotliDecompressSync) return zlib.brotliDecompressSync(buffer).toString('utf8');
    if (enc.includes('gzip')) return zlib.gunzipSync(buffer).toString('utf8');
    if (enc.includes('deflate')) return zlib.inflateSync(buffer).toString('utf8');
  } catch { return buffer.toString('utf8'); }
  return buffer.toString('utf8');
}

async function requestWithChain(targetUrl, headers = {}, chain = [], redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) return { chain, finalUrl: targetUrl, statusCode: 0, body: '', error: '重定向次数过多' };
  try { await assertSafeUrl(targetUrl); } catch (e) {
    return { chain, finalUrl: targetUrl, statusCode: 0, body: '', error: e.message };
  }
  return new Promise((resolve) => {
    let urlObj;
    try { urlObj = new URL(targetUrl); } catch { return resolve({ chain, finalUrl: targetUrl, statusCode: 0, body: '', error: 'URL 格式错误' }); }
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request({
      protocol: urlObj.protocol, hostname: urlObj.hostname, port: urlObj.port,
      path: urlObj.pathname + urlObj.search, method: 'GET', timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br', Referer: 'https://www.google.com/', Connection: 'close', ...headers,
      },
    }, res => {
      const status = res.statusCode || 0;
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        const nextUrl = resolveUrl(location, targetUrl) || location;
        chain.push({ url: targetUrl, statusCode: status, redirectTo: nextUrl });
        res.resume();
        requestWithChain(nextUrl, headers, chain, redirectCount + 1).then(resolve);
        return;
      }
      const chunks = []; let total = 0;
      res.on('data', chunk => { total += chunk.length; if (total <= MAX_HTML_CHARS) chunks.push(chunk); });
      res.on('end', () => {
        let body = '';
        try { body = decodeBody(Buffer.concat(chunks), res.headers); } catch { body = Buffer.concat(chunks).toString('utf8'); }
        chain.push({ url: targetUrl, statusCode: status, redirectTo: null });
        resolve({ chain, finalUrl: targetUrl, statusCode: status, body, headers: res.headers, error: null });
      });
    });
    req.on('timeout', () => { req.destroy(); chain.push({ url: targetUrl, statusCode: 0, redirectTo: null, error: '超时' }); resolve({ chain, finalUrl: targetUrl, statusCode: 0, body: '', error: '请求超时' }); });
    req.on('error', err => { chain.push({ url: targetUrl, statusCode: 0, redirectTo: null, error: err.message }); resolve({ chain, finalUrl: targetUrl, statusCode: 0, body: '', error: err.message }); });
    req.end();
  });
}

function checkPageNoindex(html = '', headers = {}) {
  const meta = String(html).match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (meta && /noindex/i.test(meta[1])) return true;
  if (/noindex/i.test(headers['x-robots-tag'] || '')) return true;
  return false;
}

function checkPageNofollow(html = '') {
  const meta = String(html).match(/<meta\b[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  return !!(meta && /nofollow/i.test(meta[1]));
}

function extractLinksWithDofollow(html = '', pageUrl = '') {
  const body = String(html || '').match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const scanHtml = (body ? body[1] : String(html || ''))
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
  const pageNofollow = checkPageNofollow(html);
  const links = [], seen = new Set();
  const aRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = aRe.exec(scanHtml)) !== null) {
    const attrs = m[1] || '', innerHtml = m[2] || '';
    const rawHref = getAttr(attrs, 'href');
    const targetUrl = resolveUrl(rawHref, pageUrl);
    if (!targetUrl) continue;
    let anchorText = normalizeText(innerHtml);
    if (!anchorText) anchorText = normalizeText(getAttr(attrs, 'aria-label') || getAttr(attrs, 'title'));
    if (!anchorText) { const img = innerHtml.match(/<img\b[^>]*(?:alt|title)=["']([^"']+)["'][^>]*>/i); anchorText = img ? normalizeText(img[1]) : ''; }
    if (!anchorText || anchorText.length > 300) continue;
    const key = `${anchorText.toLowerCase()}||${targetUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const rel = (getAttr(attrs, 'rel') || '').toLowerCase();
    const linkNofollow = /nofollow/.test(rel);
    links.push({ anchorText, targetUrl, rel, dofollow: (pageNofollow || linkNofollow) ? 'No' : 'Yes', sponsored: /sponsored/.test(rel), ugc: /ugc/.test(rel), pageNofollow, source: 'checkApiLink' });
  }
  return links;
}

function extractTitle(html = '', fallbackUrl = '') {
  const h1 = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) { const t = normalizeText(h1[1]); if (t) return t.slice(0, 180); }
  const og = String(html).match(/<meta\b[^>]*(?:property|name)=["'](?:og:title|twitter:title)["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (og) { const t = normalizeText(og[1]); if (t) return t.slice(0, 180); }
  const title = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (title) { const t = normalizeText(title[1]); if (t) return (t.replace(/\s*[|｜-]\s*[^|｜-]{2,80}$/g, '').trim() || t).slice(0, 180); }
  try { const p = new URL(fallbackUrl); return decodeURIComponent(p.pathname.split('/').filter(Boolean).pop() || p.hostname || fallbackUrl); } catch { return fallbackUrl; }
}

export async function GET(request) {
  const { error, payload } = requireAuth(request);
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const inputUrl = searchParams.get('url');
  const mode = searchParams.get('mode') || 'health';

  if (!inputUrl) return Response.json({ success: false, error: '缺少 url 参数' });

  const targetUrl = ensureAbsoluteUrl(inputUrl);

  try {
    const result = await requestWithChain(targetUrl);
    if (result.error && !result.body) {
      return Response.json({ success: false, url: targetUrl, error: result.error, chain: result.chain, finalUrl: result.finalUrl, finalStatus: result.statusCode });
    }
    const response = {
      success: true, url: targetUrl, finalUrl: result.finalUrl, finalStatus: result.statusCode,
      chain: result.chain, redirectCount: result.chain.length - 1,
      title: extractTitle(result.body || '', result.finalUrl),
      noindex: checkPageNoindex(result.body || '', result.headers || {}),
      contentType: (result.headers || {})['content-type'] || '',
    };
    if (mode === 'links' && result.body) {
      const links = extractLinksWithDofollow(result.body, result.finalUrl);
      response.links = links; response.linkCount = links.length; response.pageNofollow = checkPageNofollow(result.body);
    }
    return Response.json(response);
  } catch (err) {
    return Response.json({ success: false, url: targetUrl, error: err.message || '检测失败', chain: [], finalStatus: 0 });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
}
