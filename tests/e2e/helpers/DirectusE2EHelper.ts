import { Page, expect } from '@playwright/test';

/**
 * Helper class for Directus E2E testing
 *
 * Provides reusable methods for common Directus operations like:
 * - Authentication (login, logout)
 * - Module management (enable, disable, check)
 * - Collection operations (exists, create items, delete)
 * - Navigation (collections, modules, settings)
 * - Settings management
 *
 * @example
 * ```typescript
 * const directus = new DirectusE2EHelper(page, baseURL);
 * await directus.login('admin@example.com', 'password');
 * await directus.enableModule('inframe');
 * await directus.navigateToCollection('users');
 * ```
 */
export class DirectusE2EHelper {
  private page: Page;
  private baseURL: string;

  constructor(page: Page, baseURL: string) {
    this.page = page;
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
  }

  // Internal logging helpers to avoid direct console calls (ESLint no-console)
  private log(...args: any[]) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }

  private error(...args: any[]) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  /**
   * Login to Directus admin panel via UI
   *
   * Handles both fresh login and "Continue" button for existing sessions
   */
  async login(email: string, password: string): Promise<void> {
    this.log('[DirectusE2E] Navigating to login page...');
    await this.page.goto('/admin/login', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);

    // Check if there's a "Continue" button (existing session)
    const continueButton = this.page.locator('button:has-text("Continue")');
    const hasContinueButton = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasContinueButton) {
      this.log('[DirectusE2E] Found Continue button, clicking...');
      await continueButton.click();
      await this.page.waitForURL('**/admin/**', { timeout: 20000 });
    } else {
      this.log('[DirectusE2E] Performing fresh login...');
      // Fresh login
      await this.page.fill('input[type="email"]', email);
      await this.page.fill('input[type="password"]', password);
      await this.page.click('button[type="submit"]');
      await this.page.waitForURL('**/admin/**', { timeout: 20000 });
    }

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);

    this.log('[DirectusE2E] Login complete');
  }

  /**
   * Logout from Directus admin panel
   */
  async logout(): Promise<void> {
    await this.page.goto('/admin/logout', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if user is authenticated by verifying URL
   */
  async isAuthenticated(): Promise<boolean> {
    const url = this.page.url();
    return url.includes('/admin/') && !url.includes('/admin/login');
  }

  /**
   * Ensure user is authenticated, login if not
   */
  async ensureAuthenticated(email: string, password: string): Promise<void> {
    const authenticated = await this.isAuthenticated();

    if (!authenticated) {
      await this.login(email, password);
    }
  }

  // ============================================================================
  // MODULE MANAGEMENT
  // ============================================================================

  /**
   * Enable a module via Directus API
   *
   * This is more reliable than UI-based activation as it directly modifies
   * the module_bar setting in the database
   */
  async enableModule(moduleId: string): Promise<boolean> {
    try {
      this.log(`[DirectusE2E] Enabling module: ${moduleId}`);

      // Wait a bit to ensure cookies are set
      await this.page.waitForTimeout(1000);

      // Check if we have cookies (debug)
      const cookies = await this.page.context().cookies();
      this.log(`[DirectusE2E] Found ${cookies.length} cookies`);

      // First verify we're authenticated by making a simple API call
      const meResponse = await this.page.request.get(`${this.baseURL}/users/me`);

      if (!meResponse.ok()) {
        this.error(`[DirectusE2E] Not authenticated (users/me returned ${meResponse.status()})`);
        return false;
      }

      this.log(`[DirectusE2E] Authentication verified`);

      // Get current settings via API using page.request (maintains cookies)
      const settingsResponse = await this.page.request.get(`${this.baseURL}/settings`);

      if (!settingsResponse.ok()) {
        this.error(`[DirectusE2E] Failed to fetch settings: ${settingsResponse.status()}`);
        return false;
      }

      const settingsData = await settingsResponse.json();
      const settings = settingsData.data || settingsData;

      // Parse existing module_bar or create default
      let moduleBar: any[] = [];

      if (settings.module_bar) {
        try {
          // Check if module_bar is already an array or needs parsing
          moduleBar = typeof settings.module_bar === 'string' ? JSON.parse(settings.module_bar) : settings.module_bar;
        } catch {
          moduleBar = [];
        }
      }

      // If module_bar is empty, create default with Directus standard modules
      if (moduleBar.length === 0) {
        moduleBar = [
          { type: 'module', id: 'content', enabled: true },
          { type: 'module', id: 'users', enabled: true },
          { type: 'module', id: 'files', enabled: true },
          { type: 'module', id: 'insights', enabled: true },
          { type: 'link', id: 'docs', enabled: true },
          { type: 'module', id: 'settings', enabled: true },
        ];
      }

      // Check if module already exists
      const moduleIndex = moduleBar.findIndex((m: any) => m.type === 'module' && m.id === moduleId);

      if (moduleIndex !== -1) {
        // Module exists
        if (moduleBar[moduleIndex].enabled) {
          this.log(`[DirectusE2E] Module ${moduleId} already enabled`);

          return true;
        }

        // Enable it
        moduleBar[moduleIndex].enabled = true;
      } else {
        // Add module
        moduleBar.push({
          type: 'module',
          id: moduleId,
          enabled: true,
        });
      }

      // Update settings via PATCH using page.request
      const updateResponse = await this.page.request.patch(`${this.baseURL}/settings`, {
        data: {
          module_bar: JSON.stringify(moduleBar),
        },
      });

      if (!updateResponse.ok()) {
        this.error(`[DirectusE2E] Failed to update settings: ${updateResponse.status()}`);
        return false;
      }

      this.log(`[DirectusE2E] ✅ Module ${moduleId} enabled successfully`);
      return true;
    } catch (error: any) {
      this.error(`[DirectusE2E] Error enabling module ${moduleId}:`, error.message);
      return false;
    }
  }

  /**
   * Disable a module via Directus API
   */
  async disableModule(moduleId: string): Promise<boolean> {
    try {
      const settingsResponse = await this.page.request.get(`${this.baseURL}/settings`);

      if (!settingsResponse.ok()) return false;

      const settingsData = await settingsResponse.json();
      const settings = settingsData.data || settingsData;

      if (!settings.module_bar) return false;

      // Check if module_bar is already an array or needs parsing
      const moduleBar = typeof settings.module_bar === 'string' ? JSON.parse(settings.module_bar) : settings.module_bar;

      const moduleIndex = moduleBar.findIndex((m: any) => m.type === 'module' && m.id === moduleId);

      if (moduleIndex === -1) return true; // Module doesn't exist, already "disabled"

      moduleBar[moduleIndex].enabled = false;

      const updateResponse = await this.page.request.patch(`${this.baseURL}/settings`, {
        data: { module_bar: JSON.stringify(moduleBar) },
      });

      return updateResponse.ok();
    } catch (error: any) {
      this.error(`[DirectusE2E] Error disabling module ${moduleId}:`, error.message);
      return false;
    }
  }

  /**
   * Check if a module is enabled
   */
  async isModuleEnabled(moduleId: string): Promise<boolean> {
    try {
      this.log(`[DirectusE2E] Checking if module ${moduleId} is enabled...`);

      const settingsResponse = await this.page.request.get(`${this.baseURL}/settings`);

      if (!settingsResponse.ok()) {
        this.log(`[DirectusE2E] Failed to fetch settings: ${settingsResponse.status()}`);
        return false;
      }

      const settingsData = await settingsResponse.json();
      const settings = settingsData.data || settingsData;

      if (!settings.module_bar) {
        this.log(`[DirectusE2E] module_bar is null/undefined`);
        return false;
      }

      // Check if module_bar is already an array or needs parsing
      const moduleBar = typeof settings.module_bar === 'string' ? JSON.parse(settings.module_bar) : settings.module_bar;

      this.log(`[DirectusE2E] module_bar parsed:`, moduleBar);

      const module = moduleBar.find((m: any) => m.type === 'module' && m.id === moduleId);

      this.log(`[DirectusE2E] Found module:`, module);
      this.log(`[DirectusE2E] Module enabled: ${module?.enabled === true}`);

      return module?.enabled === true;
    } catch (error: any) {
      this.error(`[DirectusE2E] Error checking module:`, error.message);
      return false;
    }
  }

  // ============================================================================
  // COLLECTION OPERATIONS
  // ============================================================================

  /**
   * Check if a collection exists via API
   */
  async collectionExists(collectionName: string): Promise<boolean> {
    try {
      const response = await this.page.request.get(`${this.baseURL}/collections/${collectionName}`);

      return response.ok();
    } catch {
      return false;
    }
  }

  /**
   * Wait until a collection exists via API, with polling.
   *
   * The extension setup hook creates collections after the server starts.
   * The Docker healthcheck can pass before the hook finishes, so we need
   * to poll until the collection is available.
   *
   * @param collectionName - Collection to wait for
   * @param timeoutMs      - Max time to wait in milliseconds (default 60 s)
   * @param intervalMs     - Polling interval in milliseconds (default 2 s)
   */
  async waitForCollection(collectionName: string, timeoutMs = 60000, intervalMs = 2000): Promise<void> {
    this.log(`[DirectusE2E] Waiting for collection "${collectionName}" to be available...`);
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await this.collectionExists(collectionName)) {
        this.log(`[DirectusE2E] Collection "${collectionName}" is ready ✓`);
        return;
      }

      await this.page.waitForTimeout(intervalMs);
    }

    throw new Error(
      `Collection "${collectionName}" was not available after ${timeoutMs / 1000}s. ` +
        `The extension setup hook may not have run yet.`,
    );
  }

  /**
   * Create an item in a collection via API
   */
  async createItem(collection: string, data: any): Promise<any> {
    try {
      const response = await this.page.request.post(`${this.baseURL}/items/${collection}`, {
        data,
      });

      if (!response.ok()) {
        throw new Error(`Failed to create item: ${response.status()}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      this.error(`[DirectusE2E] Error creating item in ${collection}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete all items from a collection via API
   */
  async deleteAllItems(collection: string): Promise<boolean> {
    try {
      // Get all item IDs
      const response = await this.page.request.get(`${this.baseURL}/items/${collection}?fields=id`);

      if (!response.ok()) return false;

      const data = await response.json();
      const items = data.data || data;

      if (!Array.isArray(items) || items.length === 0) return true;

      // Delete all items
      const ids = items.map((item: any) => item.id);

      const deleteResponse = await this.page.request.delete(`${this.baseURL}/items/${collection}`, {
        data: ids,
      });

      return deleteResponse.ok();
    } catch (error: any) {
      this.error(`[DirectusE2E] Error deleting items from ${collection}:`, error.message);
      return false;
    }
  }

  /**
   * Get all items from a collection via API
   */
  async getItems(collection: string, fields?: string[]): Promise<any[]> {
    try {
      const params = fields ? `?fields=${fields.join(',')}` : '';
      const response = await this.page.request.get(`${this.baseURL}/items/${collection}${params}`);

      if (!response.ok()) return [];

      const data = await response.json();
      return data.data || data || [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  /**
   * Navigate to a collection in the Directus admin
   */
  async navigateToCollection(collectionName: string): Promise<void> {
    await this.page.goto(`/admin/content/${collectionName}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to a module by ID
   * After navigation, waits for the page to load
   */
  async navigateToModule(moduleId: string): Promise<void> {
    await this.page.goto(`/admin/${moduleId}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Navigate to settings page
   */
  async navigateToSettings(section: string = 'project'): Promise<void> {
    await this.page.goto(`/admin/settings/${section}`, { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click on a module in the navigation bar
   * Useful after enabling a module to test if it appears in UI
   */
  async clickModuleInNav(moduleId: string, moduleName: string): Promise<void> {
    const moduleLink = this.page.locator(`a[href="/admin/${moduleId}"], button:has-text("${moduleName}")`).first();
    await expect(moduleLink).toBeVisible({ timeout: 10000 });
    await moduleLink.click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);
  }

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  /**
   * Get current Directus settings via API
   */
  async getSettings(): Promise<any> {
    try {
      const response = await this.page.request.get(`${this.baseURL}/settings`);

      if (!response.ok()) return null;

      const data = await response.json();
      return data.data || data;
    } catch {
      return null;
    }
  }

  /**
   * Update Directus settings via API
   */
  async updateSettings(settings: any): Promise<boolean> {
    try {
      const response = await this.page.request.patch(`${this.baseURL}/settings`, {
        data: settings,
      });

      return response.ok();
    } catch {
      return false;
    }
  }

  // ============================================================================
  // UI ACTIONS
  // ============================================================================

  /**
   * Click "Save and Stay" from the split save button dropdown.
   *
   * In Directus, the save button area contains a main save button and a small
   * chevron/arrow button on its right that opens a dropdown menu with options:
   * "Save and Stay", "Save and Create Another", "Discard and Leave".
   *
   * This method opens that dropdown and clicks the "Save and Stay" option,
   * which saves the current item and keeps the browser on the same edit page,
   * making the item ID available in the URL.
   *
   * @param timeout - How long to wait for the save to complete (default 10 s)
   */
  async saveAndStay(timeout: number = 10000): Promise<void> {
    this.log('[DirectusE2E] Opening save dropdown menu...');

    // In Directus the header (banner) contains two action buttons:
    //   1. "check"      – main save button
    //   2. "more_vert"  – kebab menu with "Save and Stay", "Discard", etc.
    //
    // We use getByRole with the accessible name "more_vert" as shown in the
    // a11y tree, which is the most reliable way to find Material Design icon
    // buttons regardless of their CSS rendering.
    const moreVertBtn = this.page.getByRole('button', { name: 'more_vert' });

    await expect(moreVertBtn).toBeVisible({ timeout });
    await moreVertBtn.click();

    this.log('[DirectusE2E] Waiting for "Save and Stay" menu item...');

    // Click the "Save and Stay" option – Directus can render it in multiple
    // languages, so we match common variants and Portuguese labels.
    const saveAndStayOption = this.page
      .locator(
        [
          'li:has-text("Save and Stay")',
          'button:has-text("Save and Stay")',
          '[role="menuitem"]:has-text("Save and Stay")',
          // Portuguese label used in some Directus locales
          'li:has-text("Salvar e Ficar")',
          'button:has-text("Salvar e Ficar")',
          // Another common variant
          'li:has-text("Save & Stay")',
        ].join(', '),
      )
      .first();

    await expect(saveAndStayOption).toBeVisible({ timeout });
    await saveAndStayOption.click();

    // Wait for the network to settle after saving
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000);

    this.log('[DirectusE2E] Save and Stay completed ✓');
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Wait for Directus to be ready
   * Useful after login or before starting tests
   */
  async waitForReady(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(2000);
  }

  /**
   * Reload the page and wait for it to be ready
   */
  async reload(): Promise<void> {
    await this.page.reload({ waitUntil: 'networkidle' });
    await this.page.waitForTimeout(2000);
  }

  /**
   * Take a screenshot for debugging
   */
  async screenshot(name: string, fullPage: boolean = true): Promise<void> {
    await this.page.screenshot({
      path: `tests/e2e/screenshots/${name}.png`,
      fullPage,
    });
  }

  /**
   * Get current page URL
   */
  getURL(): string {
    return this.page.url();
  }

  /**
   * Check if current URL contains a path
   */
  urlContains(path: string): boolean {
    return this.page.url().includes(path);
  }

  /**
   * Get the underlying Playwright Page object
   * Useful for advanced operations not covered by this helper
   */
  getPage(): Page {
    return this.page;
  }
}
