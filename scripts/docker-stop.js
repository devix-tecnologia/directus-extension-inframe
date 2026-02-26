#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// eslint-disable-next-line no-console
const log = (...args) => console.log('[docker:stop]', ...args);
// eslint-disable-next-line no-console
const logError = (...args) => console.error('[docker:stop]', ...args);

async function getDockerComposeCommand() {
  try {
    await execAsync('docker compose version');
    return 'docker compose';
  } catch {
    try {
      await execAsync('docker-compose version');
      return 'docker-compose';
    } catch {
      throw new Error('Neither "docker compose" nor "docker-compose" found. Please install Docker Compose.');
    }
  }
}

async function main() {
  try {
    const composeCmd = await getDockerComposeCommand();
    log(`Using: ${composeCmd}`);
    log('Stopping Directus dev container...');

    const { stdout, stderr } = await execAsync(`${composeCmd} -f docker-compose.yaml down`);
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    log('Container stopped ✓');
  } catch (error) {
    logError('Failed to stop container:', error.message);
    process.exit(1);
  }
}

main();
