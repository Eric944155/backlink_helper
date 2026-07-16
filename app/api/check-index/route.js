import http from 'http';
import https from 'https';
import zlib from 'zlib';
import { requireAuth, assertSafeUrl } from '@/lib/security';

const TIMEOUT_MS = 12000;
const MAX_REDIRECTS = 5;
const MAX_BODY = 1500000;

/* ========== Low-level HTTP helpers ========== */

function decodeBody(buffer, headers = {}) {
  const enc = String(headers['content-encoding'] || '').toLowerCase();
  try {
    if (enc.includes('br') && zlib.brotliDecompressSync) return zlib.brotliDecompressSync(buffer).toString('utf8');
    if (enc.includes('gzip')) return zlib.gunzipSync(buffer).toString('utf8');
    if (enc.includes('deflate')) return zlib.inflateSync(buffer).toString('utf8');
  } catch { return buffer.toString('utf8'); }
  return buffer.toString('utf8');
}

/**
 * Generic GET with redirect following. Returns { statusCode, body, headers, finalUrl, error }
 */
async function httpGet(targetUrl, extraHeaders = {}, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    return { statusCode: 0, body: '', headers: {}, finalUrl: targetUrl, error: 'Too many redirects' };
  }

  // 每一跳跳转都要重新校验，防止先返回安全地址再跳到内网（SSRF 绕过）
  try {
    await assertSafeUrl(targetUrl);
  } catch (e) {
    return { statusCode: 0, body: '', headers: {}, finalUrl: targetUrl, error: e.message || '不允许访问该地址' };
  }

  return new Promise(resolve => {
    let urlObj;
    try { urlObj = new URL(targetUrl); } catch (e) {
      return resolve({ statusCode: 0, body: '', headers: {}, finalUrl: targetUrl, error: 'Invalid URL' });
    }
    const client = urlObj.protocol === 'https:' ? https : http;
    const req = client.request({
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'close',
        ...extraHeaders
      }
    }, res => {
      const status = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume();
        let next;
        try { next = new URL(res.headers.location, targetUrl).href; } catch { next = res.headers.location; }
        return httpGet(next, extraHeaders, redirectCount + 1).then(resolve);
      }
      const chunks = [];
      let total = 0;
      res.on('data', chunk => { total += chunk.length; if (total <= MAX_BODY) chunks.push(chunk); });
      res.on('end', () => {
        let body = '';
        try { body = decodeBody(Buffer.concat(chunks), res.headers); } catch { body = Buffer.concat(chunks).toString('utf8'); }
        resolve({ statusCode: status, body, headers: res.headers || {}, finalUrl: targetUrl, error: null });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ statusCode: 0, body: '', headers: {}, finalUrl: targetUrl, error: 'Timeout' }); });
    req.on('error', err => { resolve({ statusCode: 0, body: '', headers: {}, finalUrl: targetUrl, error: err.message }); });
    req.end();
  });
}

/* ========== Search engine index checks ========== */

/**
 * Check Google via site: query.
 * Returns: 'indexed' | 'not_indexed' | 'blocked' | 'error'
 */
async function checkGoogle(url) {
  const query = encodeURIComponent(`site:${url}`);
  const searchUrl = `https://www.google.com/search?q=${query}&num=3&hl=en&gl=us`;
  const result = await httpGet(searchUrl, {
    'Referer': 'https://www.google.com/',
    'Upgrade-Insecure-Requests': '1'
  });

  if (result.error) return { status: 'error', detail: result.error };
  if (result.statusCode === 429 || result.statusCode === 503) return { status: 'blocked', detail: `HTTP ${result.statusCode} rate limited` };

  const body = result.body || '';

  // Detect CAPTCHA / unusual traffic block
  if (/unusual traffic|captcha|recaptcha|sorry\/index|detected unusual/i.test(body)) {
    return { status: 'blocked', detail: 'Google anti-bot triggered' };
  }

  // Check if "did not match any documents" or equivalent
  if (/did not match any|没有找到.*符合|未找到任何结果|Your search.*did not match/i.test(body)) {
    return { status: 'not_indexed', detail: 'No results for site: query' };
  }

  // Parse domain/path from the target URL and check if it appears in results
  let targetHost, targetPath;
  try {
    const u = new URL(url);
    targetHost = u.hostname.replace(/^www\./, '');
    targetPath = u.pathname.replace(/\/+$/, '');
  } catch {
    return { status: 'error', detail: 'Invalid URL' };
  }

  // Look for the URL in search result links - Google wraps results in <a> tags, <cite> tags, etc.
  const bodyLower = body.toLowerCase();
  const hostLower = targetHost.toLowerCase();
  const pathLower = targetPath.toLowerCase();

  // Multiple heuristics to detect indexed results
  const hasHost = bodyLower.includes(hostLower);
  const hasPath = pathLower.length > 1 && bodyLower.includes(pathLower);
  // Google shows URLs in <cite> tags typically
  const citeRegex = new RegExp(`<cite[^>]*>[^<]*${escapeRegExp(targetHost)}[^<]*<\\/cite>`, 'i');
  const hasCite = citeRegex.test(body);

  if (hasCite || (hasHost && hasPath)) {
    return { status: 'indexed', detail: 'Found in Google results' };
  }

  // If we got a valid page but didn't find the URL, it's likely not indexed
  // But only if we're confident the page rendered properly (has search result structure)
  if (/<div[^>]*class="[^"]*g[^"]*"[^>]*>|<div id="search"|<div id="rso"/i.test(body)) {
    return { status: 'not_indexed', detail: 'URL not found in Google results' };
  }

  // Can't determine - page might be blocked or format changed
  return { status: 'uncertain', detail: 'Could not parse Google response' };
}

/**
 * Check Bing via site: query.
 */
async function checkBing(url) {
  const query = encodeURIComponent(`url:${url}`);
  const searchUrl = `https://www.bing.com/search?q=${query}&setlang=en`;
  const result = await httpGet(searchUrl, {
    'Referer': 'https://www.bing.com/'
  });

  if (result.error) return { status: 'error', detail: result.error };
  if (result.statusCode === 429 || result.statusCode === 503) return { status: 'blocked', detail: `HTTP ${result.statusCode}` };

  const body = result.body || '';

  if (/captcha|are you a human|verify you're human|traffic from your computer/i.test(body)) {
    return { status: 'blocked', detail: 'Bing anti-bot triggered' };
  }

  // Bing "no results" signals
  if (/No results found|没有找到.*结果|There are no results for/i.test(body)) {
    return { status: 'not_indexed', detail: 'No Bing results' };
  }

  let targetHost;
  try { targetHost = new URL(url).hostname.replace(/^www\./, ''); } catch { return { status: 'error', detail: 'Invalid URL' }; }

  const bodyLower = body.toLowerCase();
  const hostLower = targetHost.toLowerCase();

  // Bing shows URLs in <cite> tags
  const citeRegex = new RegExp(`<cite[^>]*>[^<]*${escapeRegExp(targetHost)}[^<]*<\\/cite>`, 'i');
  if (citeRegex.test(body) || bodyLower.includes(hostLower)) {
    // Confirm with result container
    if (/<li[^>]*class="[^"]*b_algo[^"]*"|<ol[^>]*id="b_results"/i.test(body)) {
      return { status: 'indexed', detail: 'Found in Bing results' };
    }
  }

  if (/<ol[^>]*id="b_results"/i.test(body)) {
    return { status: 'not_indexed', detail: 'URL not found in Bing results' };
  }

  return { status: 'uncertain', detail: 'Could not parse Bing response' };
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ========== On-page indexability analysis ========== */

async function analyzePageIndexability(url) {
  const result = await httpGet(url);
  const analysis = {
    httpStatus: result.statusCode || 0,
    finalUrl: result.finalUrl || url,
    redirected: result.finalUrl !== url,
    error: result.error || null,
    // Indexability signals
    metaRobotsNoindex: false,
    metaRobotsNofollow: false,
    metaGooglebotNoindex: false,
    xRobotsNoindex: false,
    canonical: null,
    canonicalIsSelf: null,
    title: '',
    metaDescription: '',
    hasHreflang: false,
    contentType: '',
    // Computed
    indexable: true,
    blockReasons: []
  };

  if (result.error || !result.statusCode) {
    analysis.indexable = false;
    analysis.blockReasons.push('Page unreachable: ' + (result.error || 'No response'));
    return analysis;
  }

  if (result.statusCode >= 400) {
    analysis.indexable = false;
    analysis.blockReasons.push(`HTTP ${result.statusCode} error`);
    return analysis;
  }

  const headers = result.headers || {};
  const body = result.body || '';
  analysis.contentType = headers['content-type'] || '';

  // 1. X-Robots-Tag header
  const xRobots = String(headers['x-robots-tag'] || '');
  if (/noindex/i.test(xRobots)) {
    analysis.xRobotsNoindex = true;
    analysis.indexable = false;
    analysis.blockReasons.push('X-Robots-Tag: noindex');
  }

  // 2. <meta name="robots"> and <meta name="googlebot">
  const metaRobots = body.match(/<meta\b[^>]*name\s*=\s*["']robots["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i)
    || body.match(/<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']robots["'][^>]*>/i);
  if (metaRobots) {
    const content = metaRobots[1].toLowerCase();
    if (/noindex/.test(content)) {
      analysis.metaRobotsNoindex = true;
      analysis.indexable = false;
      analysis.blockReasons.push('meta robots: noindex');
    }
    if (/nofollow/.test(content)) analysis.metaRobotsNofollow = true;
  }

  const metaGooglebot = body.match(/<meta\b[^>]*name\s*=\s*["']googlebot["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i)
    || body.match(/<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']googlebot["'][^>]*>/i);
  if (metaGooglebot && /noindex/i.test(metaGooglebot[1])) {
    analysis.metaGooglebotNoindex = true;
    analysis.indexable = false;
    analysis.blockReasons.push('meta googlebot: noindex');
  }

  // 3. Canonical tag
  const canonicalMatch = body.match(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i)
    || body.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']canonical["'][^>]*>/i);
  if (canonicalMatch) {
    let canonicalUrl;
    try { canonicalUrl = new URL(canonicalMatch[1], result.finalUrl).href; } catch { canonicalUrl = canonicalMatch[1]; }
    analysis.canonical = canonicalUrl;
    // Compare normalized
    const normCanonical = normalizeUrlForCompare(canonicalUrl);
    const normSelf = normalizeUrlForCompare(result.finalUrl);
    analysis.canonicalIsSelf = normCanonical === normSelf;
    if (!analysis.canonicalIsSelf) {
      analysis.indexable = false;
      analysis.blockReasons.push('Canonical points to different URL: ' + canonicalUrl);
    }
  }

  // 4. Title
  const titleMatch = body.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    analysis.title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200);
  }
  if (!analysis.title) {
    analysis.blockReasons.push('Missing <title> tag');
  }

  // 5. Meta description
  const descMatch = body.match(/<meta\b[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["'][^>]*>/i)
    || body.match(/<meta\b[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']description["'][^>]*>/i);
  if (descMatch) analysis.metaDescription = descMatch[1].trim().slice(0, 300);

  // 6. Hreflang
  analysis.hasHreflang = /<link\b[^>]*hreflang\s*=/i.test(body);

  // 7. Redirect check
  if (analysis.redirected) {
    analysis.blockReasons.push('Page redirects to: ' + result.finalUrl);
  }

  return analysis;
}

function normalizeUrlForCompare(url) {
  try {
    const u = new URL(url);
    return (u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/+$/, '') + u.search).toLowerCase();
  } catch { return url.toLowerCase(); }
}

/* ========== robots.txt check ========== */

async function checkRobotsTxt(url) {
  let origin;
  try { origin = new URL(url).origin; } catch { return { blocked: false, error: 'Invalid URL' }; }

  const robotsUrl = origin + '/robots.txt';
  const result = await httpGet(robotsUrl);

  if (result.error || result.statusCode !== 200) {
    return { blocked: false, robotsFound: false, detail: 'robots.txt not accessible' };
  }

  const body = result.body || '';
  let path;
  try { path = new URL(url).pathname; } catch { return { blocked: false, robotsFound: true }; }

  // Very simplified robots.txt parser - check User-agent: * blocks
  const lines = body.split(/\r?\n/);
  let inWildcardBlock = false;
  const disallowRules = [];
  const allowRules = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const [directive, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    if (/^user-agent$/i.test(directive.trim())) {
      inWildcardBlock = value === '*' || /googlebot/i.test(value);
    } else if (inWildcardBlock) {
      if (/^disallow$/i.test(directive.trim()) && value) {
        disallowRules.push(value);
      }
      if (/^allow$/i.test(directive.trim()) && value) {
        allowRules.push(value);
      }
    }
  }

  // Check if path matches any disallow rule (simple prefix match)
  let blocked = false;
  let matchedRule = '';
  for (const rule of disallowRules) {
    if (rule === '/' || path.startsWith(rule) || matchWildcard(path, rule)) {
      blocked = true;
      matchedRule = rule;
    }
  }
  // Check allow overrides (longer match wins in practice, simplified here)
  if (blocked) {
    for (const rule of allowRules) {
      if (path.startsWith(rule) && rule.length > matchedRule.length) {
        blocked = false;
      }
    }
  }

  return { blocked, robotsFound: true, matchedRule: blocked ? matchedRule : null, detail: blocked ? `Disallow: ${matchedRule}` : 'Not blocked' };
}

function matchWildcard(path, rule) {
  // Handle * wildcard and $ end anchor in robots.txt rules
  if (!rule.includes('*') && !rule.endsWith('$')) return path.startsWith(rule);
  let pattern = rule.replace(/[.+?^{}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  if (pattern.endsWith('\\$')) {
    pattern = pattern.slice(0, -2) + '$';
  }
  try { return new RegExp('^' + pattern).test(path); } catch { return false; }
}

/* ========== Main handler ========== */

export async function GET(request) {








  const { error: authErr } = requireAuth(request);
  if (authErr) return authErr;

  const inputUrl = (req.query.url || '').trim();
  const engine = (req.query.engine || 'all').toLowerCase(); // 'google', 'bing', 'all'
  const skipPage = searchParams.get('skipPage') === '1'; // Skip on-page analysis to save time

  if (!inputUrl) {
    return Response.json({ success: false, error: 'Missing url parameter' });
  }

  let targetUrl = inputUrl;
  if (!/^https?:\/\//i.test(targetUrl)) targetUrl = 'https://' + targetUrl;

  try {
    const response = {
      success: true,
      url: targetUrl,
      google: null,
      bing: null,
      page: null,
      robots: null,
      verdict: 'unknown' // 'indexed', 'not_indexed', 'blocked', 'uncertain'
    };

    // Run checks in parallel for speed
    const tasks = [];

    if (engine === 'all' || engine === 'google') {
      tasks.push(checkGoogle(targetUrl).then(r => { response.google = r; }));
    }
    if (engine === 'all' || engine === 'bing') {
      tasks.push(checkBing(targetUrl).then(r => { response.bing = r; }));
    }
    if (!skipPage) {
      tasks.push(analyzePageIndexability(targetUrl).then(r => { response.page = r; }));
      tasks.push(checkRobotsTxt(targetUrl).then(r => { response.robots = r; }));
    }

    await Promise.all(tasks);

    // Compute verdict
    const g = response.google;
    const b = response.bing;
    const p = response.page;
    const r = response.robots;

    if (g && g.status === 'indexed') {
      response.verdict = 'indexed';
    } else if (b && b.status === 'indexed') {
      response.verdict = 'indexed';
    } else if (g && g.status === 'not_indexed' && b && b.status === 'not_indexed') {
      response.verdict = 'not_indexed';
    } else if (g && g.status === 'not_indexed') {
      response.verdict = 'not_indexed';
    } else if (p && !p.indexable) {
      response.verdict = 'not_indexable';
    } else if (r && r.blocked) {
      response.verdict = 'robots_blocked';
    } else if (g && g.status === 'blocked' && b && b.status === 'blocked') {
      response.verdict = 'check_limited';
    } else if (g && g.status === 'blocked') {
      // Google blocked but we got Bing result
      if (b && b.status === 'indexed') response.verdict = 'indexed';
      else if (b && b.status === 'not_indexed') response.verdict = 'not_indexed';
      else response.verdict = 'check_limited';
    } else {
      response.verdict = 'uncertain';
    }

    return Response.json(response);
  } catch (error) {
    return Response.json({ success: false, url: targetUrl, error: error.message || 'Check failed' });
  }
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
}
