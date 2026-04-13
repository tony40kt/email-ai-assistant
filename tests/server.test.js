const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Minimal HTTP helper – no external deps needed for tests
function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
let port;

before(async () => {
  process.env.GEMINI_API_KEY = '';
  const app = require('../server');
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  port = server.address().port;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe('Health endpoint', () => {
  it('returns status ok', async () => {
    const res = await request({ host: 'localhost', port, path: '/api/health', method: 'GET' });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.apiConfigured, false);
    assert.ok(res.body.timestamp);
  });
});

describe('Compose endpoint', () => {
  it('returns 400 when subject is missing', async () => {
    const res = await request(
      { host: 'localhost', port, path: '/api/compose', method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      {}
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  it('returns 500 when API key is not configured', async () => {
    const res = await request(
      { host: 'localhost', port, path: '/api/compose', method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      { subject: 'Test subject' }
    );
    assert.equal(res.status, 500);
    assert.match(res.body.error, /GEMINI_API_KEY/i);
  });
});

describe('Summarize endpoint', () => {
  it('returns 400 when email content is missing', async () => {
    const res = await request(
      { host: 'localhost', port, path: '/api/summarize', method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      {}
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('Reply endpoint', () => {
  it('returns 400 when email content is missing', async () => {
    const res = await request(
      { host: 'localhost', port, path: '/api/reply', method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      {}
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('Improve endpoint', () => {
  it('returns 400 when email content is missing', async () => {
    const res = await request(
      { host: 'localhost', port, path: '/api/improve', method: 'POST',
        headers: { 'Content-Type': 'application/json' } },
      {}
    );
    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });
});

describe('Static frontend', () => {
  it('serves the index page', async () => {
    const res = await request({ host: 'localhost', port, path: '/', method: 'GET' });
    assert.equal(res.status, 200);
  });
});
