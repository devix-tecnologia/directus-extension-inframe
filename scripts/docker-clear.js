#!/usr/bin/env node

/**
 * Removes all test containers whose names start with "directus-inframe"
 * and prunes unused Docker networks created by the test pipeline.
 *
 * Works with both "docker compose" and "docker-compose", and is safe
 * to run on Colima or any Docker-compatible runtime.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// eslint-disable-next-line no-console
const log = (...args) => console.log('[docker:clear]', ...args);
// eslint-disable-next-line no-console
const logError = (...args) => console.error('[docker:clear]', ...args);

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

async function getContainersMatchingFilter(filter) {
  try {
    const { stdout } = await execAsync(`docker ps -aq --filter "name=${filter}"`);
    return stdout.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  try {
    const composeCmd = await getDockerComposeCommand();
    log(`Using: ${composeCmd}`);

    // 1. Stop & remove dev container via compose (graceful shutdown)
    log('Stopping dev container (docker-compose.yaml)...');
    try {
      await execAsync(`${composeCmd} -f docker-compose.yaml down --remove-orphans`);
      log('Dev container stopped ✓');
    } catch {
      log('Dev container was not running (skipped)');
    }

    // 2. Remove all test containers matching "directus-inframe"
    log('Looking for test containers (directus-inframe-*)...');
    const containerIds = await getContainersMatchingFilter('directus-inframe');

    if (containerIds.length > 0) {
      log(`Found ${containerIds.length} test container(s), removing...`);
      await execAsync(`docker rm -f ${containerIds.join(' ')}`);
      log(`Removed ${containerIds.length} container(s) ✓`);
    } else {
      log('No test containers found ✓');
    }

    // 3. Prune unused networks created by the test pipeline
    log('Pruning unused Docker networks...');
    await execAsync('docker network prune -f');
    log('Networks pruned ✓');

    log('Cleanup complete ✓');
  } catch (error) {
    logError('Cleanup failed:', error.message);
    process.exit(1);
  }
}

main();
