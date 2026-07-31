import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { resolveSafeUrl } from './security.js';
import { redactSecrets } from './ai-crawler-probe.mjs';

export const REQUEST_TIMEOUT_MS = 12000;
export const MAX_REDIRECTS = 5;
export const MAX_RESPONSE_BYTES = 1.5 * 1024 * 1024;

function decodeBody(buffer, headers) {
  const encoding = String(headers['content-encoding'] || '').toLowerCase();
  try {
    const options = { maxOutputLength: MAX_RESPONSE_BYTES };
    if (encoding.includes('br')) return zlib.brotliDecompressSync(buffer, options).toString('utf8');
    if (encoding.includes('gzip')) return zlib.gunzipSync(buffer, options).toString('utf8');
    if (encoding.includes('deflate')) return zlib.inflateSync(buffer, options).toString('utf8');
  } catch {
    return buffer.toString('utf8');
  }
  return buffer.toString('utf8');
}

function titleFromHtml(body) {
  const match = String(body || '').match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) : '';
}

function errorKind(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === 'ABORT_ERR' || /timeout|timed out/i.test(message)) return 'timeout';
  if (/^EAI_|ENOTFOUND|dns/i.test(`${code} ${message}`)) return 'dns';
  if (/CERT_|TLS|SSL|certificate/i.test(`${code} ${message}`)) return 'tls';
  if (/proxy|407|ECONNREFUSED/i.test(`${code} ${message}`)) return 'proxy';
  return 'network';
}

function pinnedProxyUrl(proxy) {
  const source = new URL(proxy.url);
  const credentials = source.username
    ? `${source.username}${source.password ? `:${source.password}` : ''}@`
    : '';
  const host = proxy.family === 6 ? `[${proxy.address}]` : proxy.address;
  return `${source.protocol}//${credentials}${host}:${proxy.port}/`;
}

export async function createProxyAgent(proxy) {
  if (!proxy) return null;
  const { ProxyAgent } = await import('proxy-agent');
  const pinnedUrl = pinnedProxyUrl(proxy);
  const commonOptions = {
    getProxyForUrl: () => pinnedUrl,
    ...(proxy.protocol === 'https:' ? { servername: proxy.hostname } : {}),
  };
  const generalAgent = new ProxyAgent(commonOptions);
  let plainHttpAgent = generalAgent;

  if (proxy.protocol === 'http:' || proxy.protocol === 'https:') {
    const { HttpProxyAgent } = await import('http-proxy-agent');
    class PinnedHttpProxyAgent extends HttpProxyAgent {
      setRequestProps(request, options) {
        const originalHost = request.getHeader('host');
        const targetHost = options.pinnedTargetFamily === 6
          ? `[${options.pinnedTargetAddress}]`
          : options.pinnedTargetAddress;
        if (targetHost) request.setHeader('host', targetHost);
        super.setRequestProps(request, options);
        if (originalHost) request.setHeader('host', originalHost);
      }
    }
    plainHttpAgent = new PinnedHttpProxyAgent(pinnedUrl, {
      ...(proxy.protocol === 'https:' ? { servername: proxy.hostname } : {}),
    });
  }

  return {
    forProtocol(protocol) {
      return protocol === 'http:' ? plainHttpAgent : generalAgent;
    },
    destroy() {
      plainHttpAgent.destroy?.();
      if (generalAgent !== plainHttpAgent) generalAgent.destroy?.();
    },
  };
}

function requestFailure(targetUrl, chain, error, proxySecrets) {
  return {
    status: 0,
    finalUrl: targetUrl,
    chain,
    body: '',
    bodyLength: 0,
    error: redactSecrets(error?.message || '网络请求失败', proxySecrets),
    errorKind: errorKind(error),
  };
}

export async function requestDocument(targetUrl, {
  headers = {},
  agent = null,
  signal = null,
  proxySecrets = [],
  redirectCount = 0,
  chain = [],
  deadlineAt = Date.now() + REQUEST_TIMEOUT_MS,
  resolveUrl = resolveSafeUrl,
} = {}) {
  if (redirectCount > MAX_REDIRECTS) {
    return { status: 0, finalUrl: targetUrl, chain, body: '', bodyLength: 0, error: '重定向次数超过 5 次', errorKind: 'redirect' };
  }

  let resolved;
  try {
    resolved = await resolveUrl(targetUrl);
  } catch (error) {
    return requestFailure(targetUrl, chain, error, proxySecrets);
  }
  const url = resolved.url instanceof URL ? resolved.url : new URL(targetUrl);
  const remainingMs = deadlineAt - Date.now();
  if (remainingMs <= 0) {
    return requestFailure(targetUrl, chain, Object.assign(new Error('请求超时'), { code: 'ABORT_ERR' }), proxySecrets);
  }

  return new Promise((resolve) => {
    let settled = false;
    let response = null;
    let abortListener = null;
    const done = (value) => {
      if (settled) return;
      settled = true;
      if (signal && abortListener) signal.removeEventListener('abort', abortListener);
      response?.removeAllListeners('aborted');
      response?.removeAllListeners('error');
      resolve(value);
    };

    const client = url.protocol === 'https:' ? https : http;
    const request = client.request({
      protocol: url.protocol,
      hostname: resolved.address,
      family: resolved.family,
      servername: url.protocol === 'https:' ? resolved.hostname : undefined,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: 'GET',
      agent: agent?.forProtocol ? agent.forProtocol(url.protocol) : (agent || undefined),
      pinnedTargetAddress: resolved.address,
      pinnedTargetFamily: resolved.family,
      timeout: remainingMs,
      headers: {
        Host: url.host,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'en-US,en;q=0.9',
        Connection: 'close',
        ...headers,
      },
    }, (incoming) => {
      response = incoming;
      const status = response.statusCode || 0;
      const location = response.headers.location;
      response.once('aborted', () => done(requestFailure(targetUrl, chain, new Error('响应在传输完成前中断'), proxySecrets)));
      response.once('error', (error) => done(requestFailure(targetUrl, chain, error, proxySecrets)));

      if ([301, 302, 303, 307, 308].includes(status) && location) {
        let nextUrl;
        try {
          nextUrl = new URL(location, targetUrl).href;
        } catch {
          response.resume();
          done({ status, finalUrl: targetUrl, chain, body: '', bodyLength: 0, error: '重定向 URL 无效', errorKind: 'redirect' });
          return;
        }
        const nextChain = [...chain, { url: targetUrl, status, redirectTo: nextUrl }];
        response.resume();
        requestDocument(nextUrl, {
          headers,
          agent,
          signal,
          proxySecrets,
          redirectCount: redirectCount + 1,
          chain: nextChain,
          deadlineAt,
          resolveUrl,
        }).then(done, (error) => done(requestFailure(nextUrl, nextChain, error, proxySecrets)));
        return;
      }

      const chunks = [];
      let total = 0;
      let truncated = false;
      const finish = () => {
        const body = decodeBody(Buffer.concat(chunks), response.headers);
        done({
          status,
          finalUrl: targetUrl,
          chain: [...chain, { url: targetUrl, status, redirectTo: null }],
          body,
          bodyLength: body.length,
          title: titleFromHtml(body),
          contentType: String(response.headers['content-type'] || ''),
          headers: response.headers,
          truncated,
          error: null,
          errorKind: null,
        });
      };
      response.on('data', (chunk) => {
        const remaining = MAX_RESPONSE_BYTES - total;
        if (remaining > 0) chunks.push(chunk.subarray(0, remaining));
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          truncated = true;
          response.removeAllListeners('end');
          response.removeAllListeners('aborted');
          response.removeAllListeners('error');
          response.destroy();
          finish();
        }
      });
      response.once('end', finish);
    });

    abortListener = () => request.destroy(Object.assign(new Error('请求已停止'), { code: 'ABORT_ERR' }));
    if (signal) {
      if (signal.aborted) abortListener();
      else signal.addEventListener('abort', abortListener, { once: true });
    }
    request.once('timeout', () => request.destroy(Object.assign(new Error('请求超时'), { code: 'ABORT_ERR' })));
    request.once('error', (error) => done(requestFailure(targetUrl, chain, error, proxySecrets)));
    request.end();
  });
}

export function browserHeaders() {
  return {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  };
}
