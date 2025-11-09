import { exec } from 'child_process';
import { promisify } from 'util';
import { setupTestEnv, testEnv } from './test-env.js';
import { logger } from './test-logger.js';

const execAsync = promisify(exec);

// Função para fazer requisições HTTP via Node.js dentro do container
export async function dockerHttpRequest(
  method: string,
  path: string,
  data?: any,
  headers?: Record<string, string>,
  testSuiteId?: string,
): Promise<any> {
  const suiteId = testSuiteId || process.env.TEST_SUITE_ID || 'main';
  const containerName = `directus-inframe-${suiteId}-${process.env.DIRECTUS_VERSION}`;

  // Cria um script Node.js para fazer a requisição HTTP
  const headersJson = JSON.stringify(headers || {}).replace(/"/g, '\\"');
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
${data ? `const postData = "${dataJson}"; options.headers['Content-Type'] = 'application/json'; options.headers['Content-Length'] = Buffer.byteLength(postData);` : ''}
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

    // Se stdout estiver vazio, retornar objeto vazio ao invés de tentar fazer parse
    if (!stdout || stdout.trim() === '') {
      return {};
    }

    return JSON.parse(stdout);
  } catch (error: any) {
    logger.error('Docker HTTP request failed:', error);
    throw error;
  }
}

async function cleanupDocker(_testSuiteId: string) {
  try {
    logger.debug('Cleaning up test containers...');

    // NOTE: The following cleanup is commented out so test containers
    // remain available after the tests for manual inspection. To re-enable
    // automatic cleanup, uncomment the lines below.

    // // Para e remove containers
    // await execAsync(
    //   `TEST_SUITE_ID=${_testSuiteId} DIRECTUS_VERSION=${process.env.DIRECTUS_VERSION} docker-compose -f docker-compose.test.yml down --remove-orphans --volumes`,
    // );

    // // Aguarda um pouco para garantir que as portas foram liberadas
    // await new Promise((resolve) => setTimeout(resolve, 2000));

    // logger.debug('Test containers removed');
  } catch (error) {
    logger.warn('Warning while cleaning test containers:', error);

    // NOTE: The forced removal fallback is also commented out to avoid
    // deleting containers during debugging. Uncomment if automatic forced
    // removal is desired.

    // try {
    //   await execAsync("docker ps -a | grep directus-inframe | awk '{print $1}' | xargs -r docker rm -f");
    // } catch {
    //   // Ignora erros na limpeza forçada
    // }
  }
}

async function waitForContainerHealth(containerName: string, retries = 60, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const { stdout } = await execAsync(`docker inspect --format='{{.State.Health.Status}}' ${containerName}`);
      const healthStatus = stdout.trim();

      if (healthStatus === 'healthy') {
        logger.info(`Container ${containerName} is healthy`);
        return;
      }

      logger.debug(`Container health: ${healthStatus} (attempt ${i + 1}/${retries})`);
    } catch {
      logger.debug(`Waiting for container to be created (attempt ${i + 1}/${retries})`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error(`Container ${containerName} did not become healthy`);
}

export async function setupTestEnvironment(testSuiteId: string = 'main') {
  try {
    // Limpa o ambiente Docker
    await cleanupDocker(testSuiteId);

    // Configura o ambiente de teste
    setupTestEnv();

    // Start Docker containers
    logger.info('Starting test environment...');

    const { stdout, stderr } = await execAsync(
      `TEST_SUITE_ID=${testSuiteId} DIRECTUS_VERSION=${process.env.DIRECTUS_VERSION} docker-compose -f docker-compose.test.yml up -d`,
    );

    // Docker Compose uses stderr for progress messages
    const realError = stderr && !stderr.includes('Creating') && !stderr.includes('Starting');

    if (realError) {
      logger.error('Docker Compose error:', stderr);
    } else if (stdout || stderr) {
      logger.dockerProgress(stdout || stderr);
    }

    // Wait for container to be healthy (using docker healthcheck)
    logger.info('Waiting for container to be healthy...');
    const containerName = `directus-inframe-${testSuiteId}-${process.env.DIRECTUS_VERSION}`;
    await waitForContainerHealth(containerName);

    // Wait for Directus to be ready
    logger.info('Waiting for Directus to be ready...');
    await waitForBootstrap(testSuiteId);

    // Login to get admin access token via docker exec
    const loginResponse = await dockerHttpRequest(
      'POST',
      '/auth/login',
      {
        email: testEnv.DIRECTUS_ADMIN_EMAIL,
        password: testEnv.DIRECTUS_ADMIN_PASSWORD,
      },
      undefined,
      testSuiteId,
    );

    const accessToken = loginResponse.data?.access_token || loginResponse.access_token;

    // Set access token for tests
    process.env.DIRECTUS_ACCESS_TOKEN = accessToken;

    return accessToken;
  } catch (error) {
    logger.error('Failed to setup test environment:', error);
    throw error;
  }
}

export async function teardownTestEnvironment(_testSuiteId: string = 'main') {
  try {
    logger.info('Shutting down test environment...');

    // NOTE: The automatic teardown is commented out so the test containers
    // are left running for manual inspection after tests complete. To re-enable
    // automatic teardown, uncomment the lines below.

    // await execAsync(
    //   `TEST_SUITE_ID=${_testSuiteId} DIRECTUS_VERSION=${process.env.DIRECTUS_VERSION} docker-compose -f docker-compose.test.yml down --remove-orphans`,
    // );
  } catch (error) {
    logger.error('Erro ao finalizar ambiente de teste:', error);
    throw error;
  }
}

async function waitForBootstrap(testSuiteId: string, retries = 60, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      logger.debug(`Connection attempt ${i + 1}/${retries}`);

      // Check if server is responding via docker exec
      const healthCheck = await dockerHttpRequest('GET', '/server/health', undefined, undefined, testSuiteId);

      if (healthCheck.status !== 'ok') {
        throw new Error('Health check failed');
      }

      // Try to login to verify if the system is fully ready
      try {
        await dockerHttpRequest(
          'POST',
          '/auth/login',
          {
            email: testEnv.DIRECTUS_ADMIN_EMAIL,
            password: testEnv.DIRECTUS_ADMIN_PASSWORD,
          },
          undefined,
          testSuiteId,
        );

        logger.info('Directus is ready and accepting authentication');
        return;
      } catch {
        throw new Error('System not ready for authentication');
      }
    } catch (error: any) {
      if (i === retries - 1) {
        logger.error('Failed to connect to Directus', error);
        throw new Error('Directus failed to start');
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
