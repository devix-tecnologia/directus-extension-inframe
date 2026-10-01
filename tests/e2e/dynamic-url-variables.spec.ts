import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { DirectusE2EHelper } from './helpers/DirectusE2EHelper';
import { dismissLicensePrompts } from './helpers/dismissLicensePrompts';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Variáveis compartilhadas entre os testes
let sharedContext: BrowserContext;
let sharedPage: Page;
let directus: DirectusE2EHelper;
let itemIdWithVariables: string; // ID do item criado com variáveis dinâmicas na URL

// Rodar os testes em série para evitar conflitos de sessão
test.describe.configure({ mode: 'serial' });

test.describe('Dynamic URL Variables', () => {
  test.beforeAll(async ({ browser, baseURL }: { browser: Browser; baseURL: string | undefined }) => {
    test.setTimeout(180000);

    // Criar contexto e página compartilhados
    sharedContext = await browser.newContext({ baseURL });
    await dismissLicensePrompts(sharedContext, baseURL);
    sharedPage = await sharedContext.newPage();

    // Inicializar helper
    directus = new DirectusE2EHelper(sharedPage, baseURL!);

    // Login
    await directus.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // Enable inframe module via API
    await directus.enableModule('inframe');

    // Wait for the extension setup hook to create the inframe collection.
    // The healthcheck passes before the hook finishes on a fresh DB (tmpfs),
    // so we poll until the collection exists.
    await directus.waitForCollection('inframe', 60000);

    // Reload page to apply module changes
    await directus.reload();
  });

  test.afterAll(async () => {
    // Cleanup
    await sharedPage?.close();
    await sharedContext?.close();
  });

  test('should have inframe collection created', async () => {
    test.setTimeout(60000);

    // Verificar se a coleção inframe existe via API
    const exists = await directus.collectionExists('inframe');
    expect(exists).toBeTruthy();

    // Navegar para a coleção via UI
    await directus.navigateToCollection('inframe');

    // Verificar que estamos na página correta
    expect(directus.urlContains('/admin/content/inframe')).toBeTruthy();
  });

  test('should create inframe item with dynamic variables', async () => {
    test.setTimeout(120000);

    // Criar via API para ter o ID disponível imediatamente
    const item = await directus.createItem('inframe', {
      url: 'https://example.com/dashboard?user=$user_email&id=$user_id&timestamp=$timestamp',
      status: 'published',
    });

    expect(item).toBeTruthy();
    expect(item.id).toBeTruthy();

    // Armazenar o ID para ser usado pelo próximo teste
    itemIdWithVariables = item.id;
  });

  test('should navigate to inframe module', async () => {
    test.setTimeout(60000);

    // O módulo foi ativado no beforeAll via API
    // Verificar se está habilitado
    const isEnabled = await directus.isModuleEnabled('inframe');
    expect(isEnabled).toBeTruthy();

    // Navigate directly to module URL (UI refresh issue after API changes)
    await directus.getPage().goto('/admin/inframe', { waitUntil: 'networkidle' });
    await directus.getPage().waitForTimeout(2000);

    // Verificar que estamos na página do inframe
    expect(directus.urlContains('/admin/inframe')).toBeTruthy();
  });

  test('should display inframe items in grid', async () => {
    test.setTimeout(60000);

    // Navegar para a coleção inframe (não o módulo customizado)
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Verificar se há items (cards no grid ou rows na tabela)
    // Usa seletores múltiplos: cards OU rows de tabela OU elementos com v-table-row
    const items = sharedPage.locator(
      '.card, [class*="card"], table tbody tr, [class*="table"] [class*="row"]:not([class*="header"])',
    );

    const itemCount = await items.count();

    // Se não houver items, criar um para o teste
    if (itemCount === 0) {
      // Clicar em Create Item
      const createButton = await sharedPage.waitForSelector(
        'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"]',
        { timeout: 10000 },
      );

      await createButton.click();

      await sharedPage.waitForURL('**/admin/content/inframe/+');
      await sharedPage.waitForTimeout(2000);

      // Preencher apenas a URL
      const urlField = await sharedPage.locator('main input[type="text"]').nth(2);
      await urlField.click();
      await urlField.fill('https://httpbin.org/get?test=grid');
      await sharedPage.waitForTimeout(500);

      // Salvar: ícone "check" no Directus 11, botão "Save" no Directus 12
      const saveButton = sharedPage.getByRole('banner').getByRole('button', { name: /^(check|Save)$/ });

      await expect(saveButton).toBeVisible({ timeout: 5000 });
      await saveButton.click();
      await sharedPage.waitForTimeout(3000);

      // Voltar para a grid
      await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
      await sharedPage.waitForTimeout(2000);
    }

    // Deve ter pelo menos 1 item (card ou row)
    expect(itemCount).toBeGreaterThanOrEqual(1);
  });

  test('should process URL variables when clicking on item', async () => {
    test.setTimeout(120000);

    // Usar o ID do item criado com variáveis no teste anterior
    expect(itemIdWithVariables).toBeTruthy();

    const itemId = itemIdWithVariables;

    // Navegar para o módulo inframe com o ID do item
    await sharedPage.goto(`/admin/inframe/${itemId}`, { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(3000);
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(3000);

    // Verificar se há um iframe na página
    const iframe = sharedPage.locator('iframe').first();
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Obter o src do iframe
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBeTruthy();

    // Verificar que as variáveis foram substituídas (não deve conter $)
    expect(iframeSrc!).not.toContain('$user_email');
    expect(iframeSrc!).not.toContain('$user_id');
    expect(iframeSrc!).not.toContain('$timestamp');

    // Verificar que a URL contém valores reais (não vazios)
    const userMatch = iframeSrc!.match(/user=([^&]*)/);
    const idMatch = iframeSrc!.match(/id=([^&]*)/);
    const timestampMatch = iframeSrc!.match(/timestamp=([^&]*)/);

    expect(userMatch).toBeTruthy();
    expect(idMatch).toBeTruthy();
    expect(timestampMatch).toBeTruthy();

    // Verificar que os valores não estão vazios
    expect(decodeURIComponent(userMatch![1])).toBeTruthy();
    expect(decodeURIComponent(idMatch![1])).toBeTruthy();
    expect(decodeURIComponent(timestampMatch![1])).toBeTruthy();

    // eslint-disable-next-line no-console
    console.log('✅ User variables validated:', {
      user: decodeURIComponent(userMatch![1]),
      id: decodeURIComponent(idMatch![1]),
      timestamp: decodeURIComponent(timestampMatch![1]),
    });
  });

  test('should show security error for HTTP + $token', async () => {
    test.setTimeout(120000);

    // Criar item com HTTP + $token via API
    const createResult = await sharedPage.evaluate(async () => {
      try {
        const response = await fetch('/items/inframe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'http://insecure-site.com/dashboard?token=$token',
            status: 'published',
          }),
        });

        const data = await response.json();

        return {
          ok: response.ok,
          status: response.status,
          itemId: data?.data?.id,
        };
      } catch (error: any) {
        return {
          ok: false,
          error: error.message,
        };
      }
    });

    // eslint-disable-next-line no-console
    console.log('🔍 Item created:', createResult);

    // Item deve ser criado com sucesso
    expect(createResult.ok).toBe(true);
    expect(createResult.itemId).toBeTruthy();

    // Abrir o item no módulo inFrame, onde a URL é processada e o iframe seria renderizado
    await sharedPage.goto(`/admin/inframe/${createResult.itemId}?lastRoute=${createResult.itemId}`, {
      waitUntil: 'networkidle',
    });

    // Deve mostrar o erro de segurança do inFrame
    await expect(sharedPage.locator('.error-state h2', { hasText: 'Erro de Segurança' })).toBeVisible({
      timeout: 15000,
    });

    await expect(sharedPage.locator('.error-state')).toContainText(/SECURITY ERROR.*HTTPS/);

    // E não deve renderizar o iframe (o token não pode ir para a URL HTTP)
    await expect(sharedPage.locator('.iframe-area iframe')).toHaveCount(0);
  });

  test('should allow HTTPS + $token', async () => {
    test.setTimeout(60000);

    // Buscar item HTTPS específico com $token
    let inframeItem = await sharedPage.evaluate(async () => {
      const response = await fetch(
        '/items/inframe?filter[url][_starts_with]=https&filter[url][_contains]=$token&limit=1',
      );

      const data = await response.json();
      return data.data?.[0];
    });

    if (!inframeItem) {
      // Criar item com URL HTTPS contendo $token
      inframeItem = await sharedPage.evaluate(async () => {
        const response = await fetch('/items/inframe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: 'https://example.com/test?token=$token',
            status: 'published',
          }),
        });

        const data = await response.json();

        return data.data;
      });

      // Verificar se foi criado
      if (!inframeItem) {
        throw new Error('Failed to create inframe item with HTTPS');
      }
    }

    // eslint-disable-next-line no-console
    console.log('🔍 Testing with inframe item ID:', inframeItem.id);

    // Navegar direto para o módulo inframe com o item específico
    await sharedPage.goto(`/admin/inframe/${inframeItem.id}?lastRoute=${inframeItem.id}`, {
      waitUntil: 'networkidle',
    });

    await sharedPage.waitForTimeout(3000);

    // Deve mostrar iframe (sem erro)
    const iframe = sharedPage.locator('iframe').first();
    await expect(iframe).toBeVisible({ timeout: 15000 });

    // Obter o src do iframe
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toBeTruthy();

    // Não registrar o src: ele contém o token

    // Verificar que $token foi substituído
    expect(iframeSrc).not.toContain('$token');
    expect(iframeSrc).toContain('token=');

    // CRÍTICO: Verificar que o token é um JWT válido
    const tokenMatch = iframeSrc!.match(/token=([^&]*)/);
    expect(tokenMatch).toBeTruthy();

    const tokenValue = decodeURIComponent(tokenMatch![1]);
    expect(tokenValue).toBeTruthy(); // Token não deve estar vazio
    expect(tokenValue).not.toBe('$token'); // Token não deve ser literal

    // JWT tem formato: header.payload.signature (3 partes separadas por ponto)
    const jwtParts = tokenValue.split('.');
    expect(jwtParts.length).toBe(3); // Deve ter exatamente 3 partes
    expect(jwtParts[0].length).toBeGreaterThan(10); // Header deve ter tamanho razoável
    expect(jwtParts[1].length).toBeGreaterThan(10); // Payload deve ter tamanho razoável
    expect(jwtParts[2].length).toBeGreaterThan(10); // Signature deve ter tamanho razoável

    // eslint-disable-next-line no-console
    console.log('✅ JWT Token validated - Format: xxx.xxx.xxx');

    // eslint-disable-next-line no-console
    console.log(
      'Token parts lengths:',
      jwtParts.map((p) => p.length),
    );

    // Verificar que é HTTPS
    expect(iframeSrc).toMatch(/^https:\/\//);
  });

  test('should handle URLs without variables', async () => {
    test.setTimeout(120000);

    // Criar item sem variáveis (URL estática normal) via UI
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"], a[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();
    await sharedPage.waitForURL('**/admin/content/inframe/+');
    await sharedPage.waitForTimeout(2000);

    // URL sem variáveis
    const urlField = sharedPage.locator('main input[type="text"]').nth(2);
    await urlField.click();
    await urlField.fill('https://example.com/static-page');
    await sharedPage.waitForTimeout(500);

    // Usar "Save and Stay" para permanecer na página e ter o ID disponível na URL
    await directus.saveAndStay();

    // Extrair o ID do item criado a partir da URL atual
    const currentUrl = sharedPage.url();
    const itemIdMatch = currentUrl.match(/\/inframe\/([a-f0-9-]{36})/);

    if (!itemIdMatch) {
      throw new Error(`Could not extract item ID from URL: ${currentUrl}`);
    }

    const itemId = itemIdMatch[1];

    // Navigate directly to the item in inframe module
    await sharedPage.goto(`/admin/inframe/${itemId}`, { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Deve mostrar iframe normalmente
    const iframe = sharedPage.locator('iframe').first();
    await expect(iframe).toBeVisible({ timeout: 10000 });

    const iframeSrc = await iframe.getAttribute('src');

    // URL deve permanecer exatamente como cadastrada
    expect(iframeSrc).toBe('https://example.com/static-page');
  });
});
