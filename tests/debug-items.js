// Script de debug para testar criação e recuperação de items
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function dockerHttpRequest(method, path, data) {
  const containerName = 'directus-inframe-9.23.1';

  const headersJson = JSON.stringify({ 'Content-Type': 'application/json' }).replace(/"/g, '\\"');
  const dataJson = data ? JSON.stringify(data).replace(/"/g, '\\"') : '';

  const nodeScript = `
const http = require('http');
const options = {
  hostname: '127.0.0.1',
  port: 8055,
  path: '${path}',
  method: '${method}',
  headers: JSON.parse("${headersJson}")
};
${data ? `const postData = "${dataJson}"; options.headers['Content-Length'] = Buffer.byteLength(postData);` : ''}
const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});
req.on('error', (error) => { console.error(JSON.stringify({error: error.message})); process.exit(1); });
${data ? `req.write(postData);` : ''}
req.end();
`;

  const escapedScript = nodeScript.replace(/\n/g, ' ').replace(/'/g, "'\\''");
  const fullCommand = `docker exec ${containerName} node -e '${escapedScript}'`;

  try {
    const { stdout } = await execAsync(fullCommand);

    if (!stdout || stdout.trim() === '') {
      return {};
    }

    return JSON.parse(stdout);
  } catch (error) {
    console.error('Request failed:', error.message);
    throw error;
  }
}

async function test() {
  try {
    console.log('1. Login...');

    const loginResponse = await dockerHttpRequest('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123',
    });

    const token = loginResponse.data?.access_token || loginResponse.access_token;
    console.log('   Token:', token ? 'OK' : 'FAILED');

    console.log('\n2. Get collections...');
    const collectionsResponse = await dockerHttpRequest('GET', '/collections', null);
    console.log('   Response keys:', Object.keys(collectionsResponse));
    console.log('   Has data:', !!collectionsResponse.data);

    console.log('\n3. Create test collection...');

    const collectionData = {
      collection: 'debug_test',
      fields: [
        {
          field: 'id',
          type: 'integer',
          schema: { is_primary_key: true, has_auto_increment: true },
          meta: { hidden: true },
        },
        {
          field: 'title',
          type: 'string',
          schema: { is_nullable: false },
          meta: { interface: 'input' },
        },
      ],
    };

    // Note: This won't work without auth, but shows the structure
    console.log('   Collection structure:', JSON.stringify(collectionData, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
