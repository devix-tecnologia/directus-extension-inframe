import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { DirectusE2EHelper } from './helpers/DirectusE2EHelper';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Variáveis compartilhadas entre os testes
let sharedContext: BrowserContext;
let sharedPage: Page;
let directus: DirectusE2EHelper;

// Rodar os testes em série para evitar conflitos de sessão
test.describe.configure({ mode: 'serial' });

test.describe('Dynamic URL Variables', () => {
  test.beforeAll(async ({ browser, baseURL }: { browser: Browser; baseURL: string | undefined }) => {
    test.setTimeout(180000);

    // Criar contexto e página compartilhados
    sharedContext = await browser.newContext({ baseURL });
    sharedPage = await sharedContext.newPage();

    // Inicializar helper
    directus = new DirectusE2EHelper(sharedPage, baseURL!);

    // Login
    await directus.login(ADMIN_EMAIL, ADMIN_PASSWORD);

    // Enable inframe module via API
    await directus.enableModule('inframe');

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

    // Navegar para coleção inframe
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // No Directus 11, o botão de criar é um link <a>
    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();

    // Aguardar formulário de criação
    await sharedPage.waitForURL('**/admin/content/inframe/+');
    await sharedPage.waitForTimeout(2000);

    // Preencher URL com variáveis dinâmicas
    const urlField = await sharedPage.locator('main input[type="text"]').nth(2);
    await urlField.click();
    await urlField.fill('https://example.com/dashboard?user=$user_email&id=$user_id&timestamp=$timestamp');
    await sharedPage.waitForTimeout(500);

    // Salvar (botão check no header)
    const saveButton = await sharedPage.waitForSelector('button:has-text("check"), button:has([data-icon="check"])', {
      timeout: 5000,
    });

    await saveButton.click();

    // Aguardar salvamento
    await sharedPage.waitForTimeout(3000);

    // Verificar que o item foi salvo
    // Aceita qualquer URL que contenha 'inframe' e não seja a página de criação ('+')
    const currentUrl = sharedPage.url();
    const isSuccess = currentUrl.includes('/inframe') && !currentUrl.endsWith('/inframe/+');

    expect(isSuccess).toBeTruthy();
  });

  test('should navigate to inframe module', async () => {
    test.setTimeout(60000);

    // O módulo foi ativado no beforeAll via API
    // Verificar se está habilitado
    const isEnabled = await directus.isModuleEnabled('inframe');
    expect(isEnabled).toBeTruthy();

    // Navigate directly to module URL (UI refresh issue after API changes)
    await directus.page.goto('/admin/inframe', { waitUntil: 'networkidle' });
    await directus.page.waitForTimeout(2000);

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

      // Salvar
      const saveButton = await sharedPage.waitForSelector('button:has-text("check"), button:has([data-icon="check"])', {
        timeout: 5000,
      });

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

    // Primeiro, pegar o ID de um item da coleção via API
    const itemsResponse = await sharedPage.evaluate(async () => {
      const response = await fetch('/items/inframe?limit=1&fields=id');
      const data = await response.json();
      return data.data;
    });

    expect(itemsResponse).toBeTruthy();
    expect(itemsResponse.length).toBeGreaterThan(0);

    const itemId = itemsResponse[0].id;

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
    expect(iframeSrc).not.toContain('$user_email');
    expect(iframeSrc).not.toContain('$user_id');
    expect(iframeSrc).not.toContain('$timestamp');

    // Verificar que a URL contém valores reais (não vazios)
    const userMatch = iframeSrc.match(/user=([^&]*)/);
    const idMatch = iframeSrc.match(/id=([^&]*)/);
    const timestampMatch = iframeSrc.match(/timestamp=([^&]*)/);

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

    // Navegar diretamente para o item criado
    await sharedPage.goto(`/admin/content/inframe/${createResult.itemId}`);
    await sharedPage.waitForLoadState('networkidle');

    // Aguardar um pouco para o iframe tentar carregar
    await sharedPage.waitForTimeout(2000);

    // Verificar se há mensagem de erro de segurança
    // A mensagem pode estar em diferentes elementos dependendo da implementação
    const securityErrorLocators = [
      sharedPage.locator('text=/security/i'),
      sharedPage.locator('text=/https/i'),
      sharedPage.locator('text=/insecure/i'),
      sharedPage.locator('text=/não seguro/i'),
      sharedPage.locator('[class*="error"]'),
      sharedPage.locator('[class*="warning"]'),
    ];

    // Verificar se pelo menos um dos localizadores encontra a mensagem de erro
    let errorFound = false;
    for (const locator of securityErrorLocators) {
      const count = await locator.count();
      if (count > 0) {
        errorFound = true;
        // eslint-disable-next-line no-console
        console.log('✅ Security error found with locator:', locator);
        break;
      }
    }

    expect(errorFound).toBe(true);
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

    // eslint-disable-next-line no-console
    console.log('🔍 iframe src:', iframeSrc);

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

    // Criar item sem variáveis (URL estática normal)
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();
    await sharedPage.waitForURL('**/admin/content/inframe/+');
    await sharedPage.waitForTimeout(2000);

    // URL sem variáveis
    const urlField = await sharedPage.locator('main input[type="text"]').nth(2);
    await urlField.click();
    await urlField.fill('https://example.com/static-page');
    await sharedPage.waitForTimeout(500);

    // Salvar
    const saveButton = await sharedPage.waitForSelector('button:has-text("check"), button:has([data-icon="check"])', {
      timeout: 5000,
    });

    await saveButton.click();
    await sharedPage.waitForTimeout(3000);

    // Get the created item ID from URL
    const currentUrl = sharedPage.url();
    const itemIdMatch = currentUrl.match(/\/inframe\/([a-f0-9-]+)/);

    if (!itemIdMatch) {
      throw new Error('Could not extract item ID from URL');
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
