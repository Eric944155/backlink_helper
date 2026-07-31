(function exposeSeoPermissions(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.BlhSeoPermissions = api;
})(typeof window !== 'undefined' ? window : globalThis, function createSeoPermissions() {
  const SEO_PERMISSION_NAMES = [
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
    'AI 爬虫访问检测',
  ];

  function resolveSeoAccess(sections) {
    const granted = new Set(Array.isArray(sections) ? sections : []);
    const all = granted.has('__all__');
    const has = (name) => all || granted.has(name);

    const main = {
      healthCheck: has(SEO_PERMISSION_NAMES[0]),
      dofollowCheck: has(SEO_PERMISSION_NAMES[1]),
      regexTool: has(SEO_PERMISSION_NAMES[2]) || has(SEO_PERMISSION_NAMES[3]),
      indexCheck: has(SEO_PERMISSION_NAMES[4]),
      aiCrawlerCheck: has(SEO_PERMISSION_NAMES[5]),
    };
    const regex = {
      gsc: has(SEO_PERMISSION_NAMES[2]),
      ga4: has(SEO_PERMISSION_NAMES[3]),
    };
    const activeMain = Object.keys(main).find((key) => main[key]) || null;
    const activeRegex = regex.gsc ? 'gsc' : (regex.ga4 ? 'ga4' : null);

    return {
      showToolbox: Boolean(activeMain),
      main,
      regex,
      activeMain,
      activeRegex,
    };
  }

  return { SEO_PERMISSION_NAMES, resolveSeoAccess };
});
