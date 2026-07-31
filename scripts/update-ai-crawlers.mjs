import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMUNITY_SOURCE_URL } from '../lib/ai-crawler-catalog.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'data', 'ai-crawlers-fallback.json');
const fromLogIndex = process.argv.indexOf('--from-log');

async function loadSource() {
  if (fromLogIndex >= 0) {
    const logPath = process.argv[fromLogIndex + 1];
    if (!logPath) throw new Error('--from-log 后必须提供日志路径');
    const text = await fs.readFile(logPath, 'utf8');
    const entries = {};
    for (const match of text.matchAll(/\[\s*\d+\/\d+\]\s+(.+?)\.\.\.\s+->/g)) {
      entries[match[1].trim()] = {
        operator: 'Unclear at snapshot time.',
        function: 'Community listed AI crawler',
        description: 'Recovered from the latest known community-source execution log.',
      };
    }
    if (!Object.keys(entries).length) throw new Error('日志中未找到爬虫条目');
    return entries;
  }
  const response = await fetch(COMMUNITY_SOURCE_URL, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`上游返回 HTTP ${response.status}`);
  return response.json();
}

const crawlers = await loadSource();
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `${JSON.stringify({
  source: COMMUNITY_SOURCE_URL,
  capturedAt: new Date().toISOString(),
  crawlers,
}, null, 2)}\n`, 'utf8');
console.log(`已写入 ${Object.keys(crawlers).length} 条：${output}`);
