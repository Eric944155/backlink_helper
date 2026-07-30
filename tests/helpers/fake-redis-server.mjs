import { createServer } from 'node:http';

const store = new Map([
  ['blh:sections', JSON.stringify([
    'URL读取',
    '基础设置',
    '站群配置',
    '整理导出',
    '外链存活检测',
    'Dofollow / Nofollow 检测',
    'GSC URL 正则匹配',
    'GA4 AI 爬虫正则',
    '批量收录查询',
  ])],
  ['blh:users', JSON.stringify({
    none: { pass: 'pw', sections: [] },
    direct: { pass: 'pw', sections: ['Dofollow / Nofollow 检测'] },
    gsc: { pass: 'pw', sections: ['GSC URL 正则匹配'] },
    ga4: { pass: 'pw', sections: ['GA4 AI 爬虫正则'] },
    all: { pass: 'pw', sections: ['__all__'] },
  })],
]);

createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);

  try {
    const [command, key, value] = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (command === 'GET') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ result: store.get(key) ?? null }));
      return;
    }
    if (command === 'SET') {
      store.set(key, value);
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ result: 'OK' }));
      return;
    }
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: `Unsupported command: ${command}` }));
  } catch (error) {
    response.writeHead(400, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
}).listen(4310, '127.0.0.1', () => {
  console.log('Fake Redis listening on http://127.0.0.1:4310');
});
