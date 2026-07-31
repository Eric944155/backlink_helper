import { getCrawlerCatalog } from '@/lib/ai-crawler-catalog-service.mjs';
import { classifyBaseline, classifyProbe, normalizeProxy, summarizeResults } from '@/lib/ai-crawler-probe.mjs';
import { evaluateRobots } from '@/lib/robots-policy.mjs';
import { browserHeaders, createProxyAgent, requestDocument } from '@/lib/http-probe.mjs';
import { assertSafeUrl, requireAuth, requireSection, resolveSafeUrl } from '@/lib/security';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const SECTION = 'AI 爬虫访问检测';
const DEADLINE_MS = 285000;

function authorize(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth;
  return { ...auth, error: requireSection(auth.payload, SECTION) };
}

function authorizeCatalog(request) {
  const auth = requireAuth(request);
  if (auth.error) return auth;
  const sections = Array.isArray(auth.payload?.sections) ? auth.payload.sections : [];
  const allowed = sections.includes('__all__') || sections.includes(SECTION) || sections.includes('GA4 AI 爬虫正则');
  return {
    ...auth,
    error: allowed ? null : Response.json({ success: false, message: '无权读取 AI 爬虫目录' }, { status: 403 }),
  };
}

function publicCrawler(crawler) {
  return {
    id: crawler.id,
    name: crawler.name,
    operator: crawler.operator,
    category: crawler.category,
    confidence: crawler.confidence,
    httpUserAgent: crawler.httpUserAgent,
    robotsToken: crawler.robotsToken,
    probeMode: crawler.probeMode,
    sourceUrls: crawler.sourceUrls,
    verifiedAt: crawler.verifiedAt,
    aliases: crawler.aliases,
    defaultSelected: crawler.defaultSelected,
  };
}

export async function GET(request) {
  const { error } = authorizeCatalog(request);
  if (error) return error;
  try {
    const catalog = await getCrawlerCatalog();
    return Response.json({ ...catalog, crawlers: catalog.crawlers.map(publicCrawler) });
  } catch (catalogError) {
    return Response.json({ success: false, message: catalogError.message || '爬虫目录读取失败' }, { status: 503 });
  }
}

async function validateProxy(proxyInput) {
  const proxy = normalizeProxy(proxyInput);
  if (proxy) {
    const resolved = await resolveSafeUrl(`http://${proxy.hostname}:${proxy.port}/`);
    proxy.address = resolved.address;
    proxy.family = resolved.family;
  }
  return proxy;
}

function safeResult(crawler, robots, probe, decision, retry = null) {
  return {
    crawler: publicCrawler(crawler),
    robots,
    httpStatus: probe?.status || null,
    status: decision.status,
    conclusion: decision.label,
    finalUrl: probe?.finalUrl || null,
    redirectChain: probe?.chain || [],
    contentType: probe?.contentType || null,
    bodyLength: probe?.bodyLength ?? null,
    evidence: decision.signals || [],
    retry,
    error: probe?.error || null,
    errorKind: probe?.errorKind || null,
  };
}

function networkDecision(probe) {
  const labels = {
    dns: 'DNS 解析失败',
    tls: 'TLS 连接失败',
    proxy: '代理连接失败',
    timeout: '请求超时',
    redirect: '重定向异常',
  };
  return {
    status: 'network_error',
    label: labels[probe.errorKind] || '网络请求失败',
    signals: [probe.errorKind || 'network'],
  };
}

async function probeCrawler(crawler, context) {
  if (context.robotsUnavailable) {
    return safeResult(crawler, null, null, {
      status: 'robots_unavailable',
      label: 'robots 暂不可用',
      signals: ['robots_unavailable'],
    });
  }
  const path = `${context.target.pathname || '/'}${context.target.search || ''}`;
  const robots = evaluateRobots(context.robotsText, crawler.robotsToken, path);
  if (!robots.allowed) {
    return safeResult(crawler, robots, null, { status: 'robots_denied', label: '策略禁止', signals: [robots.matchedRule] });
  }
  if (crawler.probeMode === 'policy_only') {
    return safeResult(crawler, robots, null, { status: 'policy_allowed', label: '策略允许（仅 robots）', signals: [] });
  }

  const run = () => requestDocument(context.target.href, {
    agent: context.agent,
    signal: context.signal,
    proxySecrets: context.proxySecrets,
    headers: { 'User-Agent': crawler.httpUserAgent || crawler.robotsToken },
  });
  const first = await run();
  if (first.error) return safeResult(crawler, robots, first, networkDecision(first));
  const firstDecision = classifyProbe(first, context.baseline);
  if (firstDecision.status !== 'soft_blocked') return safeResult(crawler, robots, first, firstDecision);

  const second = await run();
  const secondDecision = second.error ? networkDecision(second) : classifyProbe(second, context.baseline);
  const retry = {
    httpStatus: second.status || null,
    status: secondDecision.status,
    finalUrl: second.finalUrl || null,
    evidence: secondDecision.signals || [],
    error: second.error || null,
  };
  if (secondDecision.status !== firstDecision.status) {
    return safeResult(crawler, robots, first, {
      status: 'unstable',
      label: '结果不稳定',
      signals: [...new Set([...firstDecision.signals, ...secondDecision.signals])],
    }, retry);
  }
  return safeResult(crawler, robots, first, firstDecision, retry);
}

function ndjsonStream(run, onCancel) {
  const encoder = new TextEncoder();
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      const emit = (event) => {
        if (cancelled) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          cancelled = true;
          onCancel?.();
        }
      };
      Promise.resolve(run(emit))
        .catch((error) => emit({ type: 'error', message: error.message || '检测失败' }))
        .finally(() => {
          if (!cancelled) controller.close();
        });
    },
    cancel() {
      cancelled = true;
      onCancel?.();
    },
  });
}

export async function POST(request) {
  const { error } = authorize(request);
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, message: '请求体必须是 JSON' }, { status: 400 });
  }

  const rawUrl = String(body?.url || '').trim();
  if (!rawUrl) return Response.json({ success: false, message: '请填写公开 URL' }, { status: 400 });
  const targetUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
  try {
    await assertSafeUrl(targetUrl);
  } catch (urlError) {
    return Response.json({ success: false, message: urlError.message }, { status: 400 });
  }

  let proxy;
  try {
    proxy = await validateProxy(body?.proxy);
  } catch (proxyError) {
    return Response.json({ success: false, message: proxyError.message }, { status: 400 });
  }

  const mode = new URL(request.url).searchParams.get('mode');
  if (mode === 'proxy-test') {
    let agent;
    try {
      agent = await createProxyAgent(proxy);
      const result = await requestDocument(targetUrl, {
        agent,
        signal: request.signal,
        proxySecrets: [proxy?.username, proxy?.password],
        headers: browserHeaders(),
      });
      return Response.json({
        success: !result.error,
        status: result.status,
        finalUrl: result.finalUrl,
        outbound: proxy?.display || '服务器默认出口',
        error: result.error,
      }, { status: result.error ? 502 : 200 });
    } finally {
      agent?.destroy?.();
    }
  }

  const concurrency = Math.min(5, Math.max(1, Number.parseInt(body?.concurrency, 10) || 2));
  const selectedIds = Array.isArray(body?.crawlerIds) ? new Set(body.crawlerIds.map(String)) : null;
  const taskController = new AbortController();
  const abortTask = () => taskController.abort();
  request.signal.addEventListener('abort', abortTask, { once: true });

  const stream = ndjsonStream(async (emit) => {
    const startedAt = Date.now();
    const deadlineTimer = setTimeout(abortTask, DEADLINE_MS);
    let agent;
    const results = [];
    try {
      const catalog = await getCrawlerCatalog();
      const crawlers = catalog.crawlers.filter((crawler) => {
        if (selectedIds) return selectedIds.has(crawler.id);
        return crawler.defaultSelected || crawler.probeMode === 'policy_only';
      });
      if (!crawlers.length) throw new Error('没有可检测的爬虫条目');

      agent = await createProxyAgent(proxy);
      const target = new URL(targetUrl);
      emit({
        type: 'start',
        total: crawlers.length,
        concurrency,
        outbound: proxy?.display || '服务器默认出口',
        catalog: {
          upstreamCount: catalog.upstreamCount,
          normalizedCount: catalog.normalizedCount,
          probeableCount: catalog.probeableCount,
          policyOnlyCount: catalog.policyOnlyCount,
          updatedAt: catalog.updatedAt,
          sourceStatus: catalog.sourceStatus,
        },
      });

      const robotsUrl = `${target.origin}/robots.txt`;
      const [robotsResponse, baseline] = await Promise.all([
        requestDocument(robotsUrl, {
          agent, signal: taskController.signal, proxySecrets: [proxy?.username, proxy?.password], headers: browserHeaders(),
        }),
        requestDocument(target.href, {
          agent, signal: taskController.signal, proxySecrets: [proxy?.username, proxy?.password], headers: browserHeaders(),
        }),
      ]);
      const robotsUnavailable = Boolean(robotsResponse.error || robotsResponse.status >= 500);
      const robotsText = robotsUnavailable || robotsResponse.status >= 400 ? '' : robotsResponse.body;
      emit({
        type: 'baseline',
        httpStatus: baseline.status || null,
        finalUrl: baseline.finalUrl,
        contentType: baseline.contentType,
        bodyLength: baseline.bodyLength,
        robotsStatus: robotsResponse.status || null,
        robotsError: robotsResponse.error,
        error: baseline.error,
      });
      if (baseline.error) throw new Error(`普通浏览器基线失败：${baseline.error}`);
      const baselineDecision = classifyBaseline(baseline);
      if (baselineDecision.status !== 'accessible') {
        throw new Error(`普通浏览器基线受限：${baselineDecision.label}`);
      }

      let nextIndex = 0;
      const worker = async () => {
        while (!taskController.signal.aborted) {
          const index = nextIndex++;
          if (index >= crawlers.length) return;
          if (Date.now() - startedAt >= DEADLINE_MS) return;
          const result = await probeCrawler(crawlers[index], {
            target, robotsText, robotsUnavailable, baseline, agent, signal: taskController.signal,
            proxySecrets: [proxy?.username, proxy?.password],
          });
          results.push(result);
          emit({ type: 'crawler_result', index, completed: results.length, total: crawlers.length, result });
        }
      };
      await Promise.all(Array.from({ length: Math.min(concurrency, crawlers.length) }, worker));

      if (results.length < crawlers.length) {
        const completed = new Set(results.map((item) => item.crawler.id));
        for (const crawler of crawlers) {
          if (completed.has(crawler.id)) continue;
          const timeoutResult = safeResult(crawler, null, null, {
            status: 'timeout_unmeasured', label: '超时未测', signals: ['task_deadline'],
          });
          results.push(timeoutResult);
          emit({ type: 'crawler_result', completed: results.length, total: crawlers.length, result: timeoutResult });
        }
      }
      emit({ type: 'summary', ...summarizeResults(results), durationMs: Date.now() - startedAt });
    } finally {
      clearTimeout(deadlineTimer);
      request.signal.removeEventListener('abort', abortTask);
      agent?.destroy?.();
    }
  }, abortTask);

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
