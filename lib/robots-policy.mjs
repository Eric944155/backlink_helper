function stripComment(line) {
  const index = line.indexOf('#');
  return (index >= 0 ? line.slice(0, index) : line).trim();
}

function parseGroups(text) {
  const groups = [];
  let agents = [];
  let rules = [];
  let hasRule = false;

  const flush = () => {
    if (agents.length) groups.push({ agents: [...agents], rules: [...rules] });
    agents = [];
    rules = [];
    hasRule = false;
  };

  for (const rawLine of String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = stripComment(rawLine);
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (hasRule) flush();
      if (value) agents.push(value.toLowerCase());
      continue;
    }
    if ((field === 'allow' || field === 'disallow') && agents.length) {
      hasRule = true;
      if (value || field === 'allow') rules.push({ directive: field, pattern: value });
    }
  }
  flush();
  return groups;
}

function normalizeOctets(value) {
  const encoded = [...String(value || '')].map((character) => (
    character.codePointAt(0) > 0x7f ? encodeURIComponent(character).toUpperCase() : character
  )).join('');
  return encoded.replace(/%([0-9a-f]{2})/gi, (token, hex) => {
    const character = String.fromCharCode(Number.parseInt(hex, 16));
    return /^[A-Za-z0-9._~-]$/.test(character) ? character : `%${hex.toUpperCase()}`;
  });
}

function ruleRegex(pattern) {
  const normalized = normalizeOctets(pattern);
  const anchored = normalized.endsWith('$');
  const raw = anchored ? normalized.slice(0, -1) : normalized;
  const source = raw
    .split('*')
    .map((part) => part.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${source}${anchored ? '$' : ''}`);
}

function specificity(pattern) {
  return normalizeOctets(pattern).replace(/\*/g, '').replace(/\$$/, '').length;
}

export function evaluateRobots(text, userAgent, path = '/') {
  const groups = parseGroups(text);
  const ua = String(userAgent || '').toLowerCase();
  const normalizedPath = normalizeOctets(path);
  const candidates = [];

  for (const group of groups) {
    let groupScore = -1;
    let matchedAgent = null;
    for (const agent of group.agents) {
      const score = agent === '*' ? 0 : (ua.includes(agent) ? agent.length : -1);
      if (score > groupScore) {
        groupScore = score;
        matchedAgent = agent;
      }
    }
    if (groupScore >= 0) candidates.push({ ...group, score: groupScore, matchedAgent });
  }

  if (!candidates.length) {
    return { allowed: true, matchedAgent: null, matchedRule: null, reason: 'no_applicable_rule' };
  }
  const bestAgentScore = Math.max(...candidates.map((item) => item.score));
  const applicable = candidates.filter((item) => item.score === bestAgentScore);
  const matchedRules = [];
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (rule.pattern && ruleRegex(rule.pattern).test(normalizedPath)) {
        matchedRules.push({ ...rule, length: specificity(rule.pattern) });
      }
    }
  }
  if (!matchedRules.length) {
    return {
      allowed: true,
      matchedAgent: applicable[0]?.matchedAgent ?? null,
      matchedRule: null,
      reason: 'no_applicable_rule',
    };
  }
  matchedRules.sort((a, b) => b.length - a.length || (a.directive === 'allow' ? -1 : 1));
  const winner = matchedRules[0];
  return {
    allowed: winner.directive === 'allow',
    matchedAgent: applicable[0].matchedAgent,
    matchedRule: `${winner.directive}: ${winner.pattern}`,
    reason: winner.directive === 'allow' ? 'allowed_by_rule' : 'disallowed_by_rule',
  };
}

export { parseGroups as parseRobotsGroups };
