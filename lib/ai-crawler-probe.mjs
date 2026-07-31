const HARD_DENIED = new Set([401, 403, 407, 451]);
const CHALLENGE_PATTERN = /\b(?:captcha|access denied|javascript challenge|checking your browser|verify you are human|cloudflare ray id)\b/i;
const CHALLENGE_URL_PATTERN = /(?:login|signin|challenge|captcha|verify|blocked|access-denied)/i;

export function normalizeProxy(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) throw new Error('代理不能只填写端口，请补充 IP 或域名');

  let candidate = raw;
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
    const parts = candidate.split(':');
    if (parts.length === 4 && !candidate.includes('@')) {
      const [host, port, username, password] = parts;
      candidate = `http://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
    } else {
      candidate = `http://${candidate}`;
    }
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('代理格式无效');
  }
  if (!['http:', 'https:', 'socks5:'].includes(parsed.protocol)) {
    throw new Error('代理仅支持 HTTP、HTTPS 或 SOCKS5');
  }
  if (!parsed.hostname || !parsed.port) throw new Error('代理必须包含主机和端口');
  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('代理端口无效');
  return {
    url: parsed.toString(),
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port,
    username: decodeURIComponent(parsed.username || ''),
    password: decodeURIComponent(parsed.password || ''),
    display: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
  };
}

export function redactSecrets(message, secrets = []) {
  let output = String(message || '')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)([^:/\s]+):([^@\s]+)@/gi, '$1***:***@');
  for (const secret of secrets.filter(Boolean)) {
    output = output.split(String(secret)).join('***');
  }
  return output;
}

function baselineSignals(probe, baseline) {
  const signals = [];
  const length = Number(probe.bodyLength ?? String(probe.body || '').length);
  const baselineLength = Number(baseline?.bodyLength || 0);
  if (baselineLength > 0 && length < baselineLength * 0.2) signals.push('body_under_20_percent');
  if (baseline?.title && !probe.title) signals.push('missing_title');
  if (baseline?.contentType?.includes('text/html') && !String(probe.contentType || '').includes('text/html')) {
    signals.push('unexpected_content_type');
  }
  if (probe.finalUrl && baseline?.finalUrl && probe.finalUrl !== baseline.finalUrl && CHALLENGE_URL_PATTERN.test(probe.finalUrl)) {
    signals.push('challenge_or_login_url');
  }
  return signals;
}

export function classifyProbe(probe, baseline) {
  const statusCode = Number(probe.status || 0);
  if (HARD_DENIED.has(statusCode)) return { status: 'http_denied', label: 'HTTP 拒绝', signals: [`http_${statusCode}`] };
  if (statusCode === 429) return { status: 'rate_limited', label: '请求过多', signals: ['http_429'] };
  if (statusCode < 200 || statusCode >= 300) {
    return { status: 'http_error', label: `HTTP ${statusCode || '异常'}`, signals: [`http_${statusCode || 0}`] };
  }
  if (CHALLENGE_PATTERN.test(String(probe.body || ''))) {
    return { status: 'soft_blocked', label: '疑似软拦截', signals: ['explicit_challenge_marker'] };
  }
  const signals = baselineSignals(probe, baseline);
  if (signals.length >= 2) return { status: 'soft_blocked', label: '疑似软拦截', signals };
  return { status: 'accessible', label: '可访问', signals };
}

export function classifyBaseline(probe) {
  const decision = classifyProbe(probe, probe);
  if (decision.status !== 'accessible') return decision;
  if (CHALLENGE_URL_PATTERN.test(String(probe.finalUrl || ''))) {
    return { status: 'baseline_restricted', label: '落入登录或挑战页面', signals: ['challenge_or_login_url'] };
  }
  return decision;
}

export function summarizeResults(results) {
  const counts = {
    accessible: 0,
    policyAllowed: 0,
    robotsDenied: 0,
    httpDenied: 0,
    rateLimited: 0,
    softBlocked: 0,
    unstable: 0,
    uncertain: 0,
  };
  for (const item of results) {
    if (item.status === 'accessible') counts.accessible += 1;
    else if (item.status === 'policy_allowed') counts.policyAllowed += 1;
    else if (item.status === 'robots_denied') counts.robotsDenied += 1;
    else if (item.status === 'http_denied') counts.httpDenied += 1;
    else if (item.status === 'rate_limited') counts.rateLimited += 1;
    else if (item.status === 'soft_blocked') counts.softBlocked += 1;
    else if (item.status === 'unstable') counts.unstable += 1;
    else counts.uncertain += 1;
  }
  const known = counts.accessible + counts.robotsDenied + counts.httpDenied + counts.rateLimited + counts.softBlocked;
  const restricted = known - counts.accessible;
  let overall = '无法判断';
  if (known && restricted === 0) overall = '全部可访问';
  else if (known && restricted > known / 2) overall = '大部分受限';
  else if (known && restricted > 0) overall = '部分受限';
  return { overall, counts, total: results.length };
}
