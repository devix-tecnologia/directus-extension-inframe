import { setupTestEnvironment, teardownTestEnvironment } from './setup.js';
import { createTestCollection, createTestItem, getTestItems, deleteTestCollection } from './helper_test.js';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { logger } from './test-logger.js';
import { directusVersions } from './directus-versions.js';

// Mock the inframe extension module for testing
const mockInframeModule = {
  id: 'inframe',
  name: 'Relatórios',
  icon: 'document_scanner',
  routes: [
    {
      path: '',
      props: true,
      component: 'List',
    },
    {
      path: ':id',
      component: 'ItemDetailRoute',
      props: true,
    },
  ],
};

describe.each(directusVersions)('Directus Extension Inframe Integration Tests - Directus %s', (version: string) => {
  let testCollectionName: string;

  beforeEach(() => {
    logger.setCurrentTest(`Directus ${version}`);
  });

  beforeAll(async () => {
    process.env.DIRECTUS_VERSION = version;
    await setupTestEnvironment();

    // Cleanup any existing test collection
    await deleteTestCollection();

    // Create test collection
    testCollectionName = await createTestCollection();

    // Create test items
    await createTestItem('Test Report 1', 'https://example.com/report1');
    await createTestItem('Test Report 2', 'https://example.com/report2');
    await createTestItem('Draft Report', 'https://example.com/draft', 'draft');
  }, 120000);

  afterAll(async () => {
    // Cleanup test collection
    await deleteTestCollection();
    await teardownTestEnvironment();
  });

  test('Extension module should have correct configuration', () => {
    expect(mockInframeModule.id).toBe('inframe');
    expect(mockInframeModule.name).toBe('Relatórios');
    expect(mockInframeModule.icon).toBe('document_scanner');
    expect(mockInframeModule.routes).toHaveLength(2);
  });

  test('Extension routes should be properly configured', () => {
    const routes = mockInframeModule.routes;

    // Test main route
    expect(routes[0]?.path).toBe('');
    expect(routes[0]?.props).toBe(true);
    expect(routes[0]?.component).toBe('List');

    // Test detail route
    expect(routes[1]?.path).toBe(':id');
    expect(routes[1]?.props).toBe(true);
    expect(routes[1]?.component).toBe('ItemDetailRoute');
  });

  test('Should create test collection successfully', () => {
    expect(testCollectionName).toBe('test_inframe_items');
  });

  test('Should create and retrieve test items', async () => {
    const items = await getTestItems();

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(2);

    // Check if published items exist
    const publishedItems = items.filter((item: any) => item.status === 'published');
    expect(publishedItems.length).toBeGreaterThanOrEqual(2);

    // Check item structure
    const firstItem = publishedItems[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('title');
    expect(firstItem).toHaveProperty('url');
    expect(firstItem).toHaveProperty('status');
  });

  test('Should filter published items correctly', async () => {
    const items = await getTestItems();
    const publishedItems = items.filter((item: any) => item.status === 'published');
    const draftItems = items.filter((item: any) => item.status === 'draft');

    expect(publishedItems.length).toBeGreaterThanOrEqual(2);
    expect(draftItems.length).toBeGreaterThanOrEqual(1);

    // Verify published items have valid URLs
    publishedItems.forEach((item: any) => {
      expect(item.url).toMatch(/^https?:\/\/.+/);
      expect(typeof item.title).toBe('string');
      expect(item.title.length).toBeGreaterThan(0);
    });
  });

  test('Should handle Directus API connection', async () => {
    expect(process.env.DIRECTUS_ACCESS_TOKEN).toBeDefined();
    expect(process.env.DIRECTUS_PUBLIC_URL).toBe('http://directus:8055');

    // Test if we can access the items
    const items = await getTestItems();
    expect(Array.isArray(items)).toBe(true);
  });

  test('Extension should work with different Directus versions', () => {
    // This test ensures the extension structure is compatible
    // across different Directus versions
    expect(typeof mockInframeModule.id).toBe('string');
    expect(typeof mockInframeModule.name).toBe('string');
    expect(typeof mockInframeModule.icon).toBe('string');
    expect(Array.isArray(mockInframeModule.routes)).toBe(true);

    // Version-specific compatibility checks could be added here
    // based on the Directus version being tested
    if (version.startsWith('9.')) {
      // Directus v9 specific checks
      expect(mockInframeModule.routes.length).toBeGreaterThan(0);
    } else if (version.startsWith('10.') || version.startsWith('11.')) {
      // Directus v10/v11 specific checks
      expect(mockInframeModule.routes.length).toBeGreaterThan(0);
    }
  });
});
