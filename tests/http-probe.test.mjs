import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createProxyAgent, requestDocument } from '../lib/http-probe.mjs';

async function withServer(handler, run) {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await run(server.address().port);
  } finally {
    server.closeAllConnections?.();
    server.close();
    await once(server, 'close');
  }
}

function localResolver(targetUrl) {
  return {
    url: new URL(targetUrl),
    hostname: new URL(targetUrl).hostname,
    address: '127.0.0.1',
    family: 4,
  };
}

test('connects to the already-vetted address while preserving the original Host header', async () => {
  await withServer((request, response) => {
    response.setHeader('content-type', 'text/html');
    response.end(`<title>${request.headers.host}</title>ok`);
  }, async (port) => {
    const result = await requestDocument(`http://public.example:${port}/`, { resolveUrl: localResolver });
    assert.equal(result.status, 200);
    assert.equal(result.title, `public.example:${port}`);
    assert.equal(result.finalUrl, `http://public.example:${port}/`);
  });
});

test('revalidates and pins every redirect without resetting the absolute deadline', async () => {
  const resolved = [];
  await withServer((request, response) => {
    if (request.url === '/first') {
      response.writeHead(302, { Location: '/second' });
      response.end();
      return;
    }
    response.end('done');
  }, async (port) => {
    const result = await requestDocument(`http://redirect.example:${port}/first`, {
      resolveUrl: (url) => {
        resolved.push(url);
        return localResolver(url);
      },
    });
    assert.equal(result.status, 200);
    assert.equal(resolved.length, 2);
    assert.equal(result.chain.length, 2);
  });
});

test('aborts an in-flight request and reports a timeout', async () => {
  await withServer(() => {}, async (port) => {
    const controller = new AbortController();
    const pending = requestDocument(`http://slow.example:${port}/`, {
      resolveUrl: localResolver,
      signal: controller.signal,
    });
    controller.abort();
    const result = await pending;
    assert.equal(result.errorKind, 'timeout');
  });
});

test('HTTP proxy receives the vetted target IP in the request line and the original Host header', async () => {
  let observed;
  await withServer((request, response) => {
    observed = { url: request.url, host: request.headers.host };
    response.end('proxied');
  }, async (proxyPort) => {
    const proxy = {
      url: `http://proxy-rebinding.example:${proxyPort}/`,
      protocol: 'http:',
      hostname: 'proxy-rebinding.example',
      port: proxyPort,
      address: '127.0.0.1',
      family: 4,
    };
    const agent = await createProxyAgent(proxy);
    try {
      const result = await requestDocument('http://target.example:8080/path?q=1', {
        agent,
        resolveUrl: () => ({
          url: new URL('http://target.example:8080/path?q=1'),
          hostname: 'target.example',
          address: '93.184.216.34',
          family: 4,
        }),
      });
      assert.equal(result.status, 200);
      assert.equal(observed.url, 'http://93.184.216.34:8080/path?q=1');
      assert.equal(observed.host, 'target.example:8080');
    } finally {
      agent.destroy();
    }
  });
});

test('SOCKS proxy URL replaces its hostname with the vetted proxy IP', async () => {
  const agent = await createProxyAgent({
    url: 'socks5://user:pass@proxy-rebinding.example:1080/',
    protocol: 'socks5:',
    hostname: 'proxy-rebinding.example',
    port: 1080,
    address: '203.0.113.9',
    family: 4,
  });
  try {
    assert.equal(
      await agent.forProtocol('http:').getProxyForUrl('http://target.example/'),
      'socks5://user:pass@203.0.113.9:1080/',
    );
  } finally {
    agent.destroy();
  }
});
