export const SEO_SUBSECTION_NAMES = [
  '外链存活检测',
  'Dofollow / Nofollow 检测',
  'GSC URL 正则匹配',
  'GA4 AI 爬虫正则',
  '批量收录查询',
  'AI 爬虫访问检测',
];

export function migrateSectionCatalog(sections) {
  const input = Array.isArray(sections) ? sections : [];
  const next = [];
  let replacedLegacy = false;

  for (const raw of input) {
    const name = String(raw).trim();
    if (!name) continue;
    if (name === 'SEO工具箱') {
      next.push(...SEO_SUBSECTION_NAMES);
      replacedLegacy = true;
    } else {
      next.push(name);
    }
  }

  for (const name of SEO_SUBSECTION_NAMES) {
    if (!next.includes(name)) next.push(name);
  }

  const normalized = [...new Set(next)];
  const original = [...new Set(input.map((value) => String(value).trim()).filter(Boolean))];
  const changed = replacedLegacy
    || normalized.length !== original.length
    || normalized.some((value, index) => value !== original[index]);

  return { sections: normalized, changed };
}
