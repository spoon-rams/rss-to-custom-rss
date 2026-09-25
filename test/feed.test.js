const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { fetchSourceRSS, querySearchFilter } = require('../utils');
const { transformItem } = require('../helpers');

const mockFeed = (t, xml) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(xml));
};

test('normalizes numeric text and attributed categories without losing attributes', async (t) => {
  mockFeed(t, '<rss><channel><item><title>2026</title><category>123</category><category domain="type">Lecture</category></item></channel></rss>');
  const items = (await fetchSourceRSS('https://example.com')).map(transformItem);
  assert.equal(items[0].title, '2026');
  assert.equal(querySearchFilter({ query: { category: '123' } }, items).length, 1);
  assert.equal(querySearchFilter({ query: { category: 'LECTURE' } }, items).length, 1);
  assert.equal(items[0].category[1]['@_domain'], 'type');
});

test('accepts channels with no events', async (t) => {
  for (const xml of ['<rss><channel><title>Empty</title></channel></rss>', '<rss><channel/></rss>']) {
    mockFeed(t, xml);
    assert.deepEqual(await fetchSourceRSS('https://example.com'), []);
  }
});

test('rejects malformed XML and non-RSS responses', async (t) => {
  t.mock.method(console, 'error', () => {});
  for (const xml of ['<rss><channel></rss>', '<html><body>Error</body></html>']) {
    mockFeed(t, xml);
    await assert.rejects(fetchSourceRSS('https://example.com'), /invalid XML|valid RSS channel/);
  }
});

test('stops and cancels oversized streams without relying on content-length', async (t) => {
  t.mock.method(console, 'error', () => {});
  let cancelled = false;
  let reads = 0;
  const stream = new ReadableStream({
    pull(controller) {
      reads++;
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() { cancelled = true; },
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(stream));
  await assert.rejects(fetchSourceRSS('https://example.com'), /size limit/);
  assert.equal(cancelled, true);
  assert.ok(reads <= 7);
});

test('retains multibyte characters split between stream chunks', async (t) => {
  const bytes = Buffer.from('<rss><channel><item><title>Café</title></item></channel></rss>');
  const split = bytes.indexOf(Buffer.from('é')) + 1;
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(bytes.subarray(0, split));
    controller.enqueue(bytes.subarray(split));
    controller.close();
  } });
  t.mock.method(globalThis, 'fetch', async () => new Response(stream));
  assert.equal((await fetchSourceRSS('https://example.com'))[0].title, 'Café');
});

test('validates startup configuration and defaults the port', () => {
  const base = { ...process.env, RSS_URL: 'https://example.com/rss', FEED_URL: 'https://example.com/feed' };
  delete base.PORT;
  const run = (env) => spawnSync(process.execPath, ['-e', 'console.log(require("./helpers/config/env").PORT)'], { cwd: require('node:path').join(__dirname, '..'), env, encoding: 'utf8' });
  const valid = run(base);
  assert.equal(valid.status, 0);
  assert.equal(valid.stdout.trim(), '8000');
  for (const override of [{ RSS_URL: '' }, { FEED_URL: 'bad-url' }, { RSS_URL: 'file:///tmp/feed' }, { PORT: '0' }, { PORT: '65536' }, { PORT: 'abc' }]) {
    assert.notEqual(run({ ...base, ...override }).status, 0);
  }
});
