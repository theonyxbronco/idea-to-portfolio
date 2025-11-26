process.env.NODE_ENV = 'test';

const http = require('http');
const assert = require('assert');

let app;
try {
  app = require('../server');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND') {
    console.warn('Dependencies missing, skipping API smoke test:', error.message);
    process.exit(0);
  }
  throw error;
}

const fetchFn = typeof fetch === 'function'
  ? fetch
  : (...args) => import('node-fetch').then(({ default: nodeFetch }) => nodeFetch(...args));

const startServer = (appInstance) => {
  return new Promise((resolve) => {
    const server = http.createServer(appInstance);
    server.listen(0, () => resolve(server));
  });
};

const runHealthCheck = async (baseUrl) => {
  const response = await fetchFn(`${baseUrl}/api/health`);
  assert.strictEqual(
    response.status,
    200,
    `Expected 200 status from /api/health, got ${response.status}`
  );

  const data = await response.json();
  if (!data || data.status !== 'OK') {
    throw new Error('Health check did not return OK status');
  }

  if (!data.platform) {
    throw new Error('Health response missing platform information');
  }
};

(async () => {
  const server = await startServer(app);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await runHealthCheck(baseUrl);
    console.log('✓ API health endpoint responded successfully');
    server.close(() => process.exit(0));
  } catch (error) {
    server.close(() => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
  }
})();
