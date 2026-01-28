import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Variáveis compartilhadas entre os testes
let sharedContext: BrowserContext;
let sharedPage: Page;

// Rodar os testes em série para evitar conflitos de sessão
test.describe.configure({ mode: 'serial' });

test.describe('Dynamic URL Variables', () => {
  test.beforeAll(async ({ browser, baseURL }: { browser: Browser; baseURL: string | undefined }) => {
    test.setTimeout(180000);

    // Criar contexto e página compartilhados
    sharedContext = await browser.newContext({ baseURL });
    sharedPage = await sharedContext.newPage();

    // Navega para o login
    await sharedPage.goto('/admin/login', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(1000);

    // Verificar se há botão "Continue" (sessão existente)
    const continueButton = sharedPage.locator('button:has-text("Continue")');
    const hasContinueButton = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasContinueButton) {
      await continueButton.click();
      await sharedPage.waitForURL('**/admin/**', { timeout: 20000 });
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);
    } else {
      // Login normal
      await sharedPage.fill('input[type="email"]', ADMIN_EMAIL);
      await sharedPage.fill('input[type="password"]', ADMIN_PASSWORD);
      await sharedPage.click('button[type="submit"]');
      await sharedPage.waitForURL('**/admin/**', { timeout: 20000 });
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);
    }
  });

  test.afterAll(async () => {
    await sharedPage?.close();
    await sharedContext?.close();
  });

  test('should have inframe collection created', async () => {
    test.setTimeout(60000);

    // Navegar para Content
    await sharedPage.click('a[href="/admin/content"]');
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(1000);

    // Verificar se coleção inframe existe
    const inframeLink = sharedPage.locator('a[href="/admin/content/inframe"]');
    await expect(inframeLink).toBeVisible({ timeout: 10000 });
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

    // Navegar para o módulo inframe via sidebar
    const inframeModule = sharedPage.locator('a[href="/admin/inframe"], a:has-text("Extra")').first();

    // Aguardar módulo estar visível
    await expect(inframeModule).toBeVisible({ timeout: 10000 });

    // Clicar no módulo
    await inframeModule.click();
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(2000);

    // Verificar que estamos na página do inframe
    expect(sharedPage.url()).toContain('/admin/inframe');
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

    // Verificar que a URL contém valores reais
    expect(iframeSrc).toContain('user=');
    expect(iframeSrc).toContain('id=');
    expect(iframeSrc).toContain('timestamp=');
  });

  test('should show security error for HTTP + $token', async () => {
    test.setTimeout(120000);

    // Criar novo item com HTTP + token (deve falhar)
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();
    await sharedPage.waitForURL('**/admin/content/inframe/+');
    await sharedPage.waitForTimeout(2000);

    // Preencher com HTTP + $token (INSEGURO - deve ser bloqueado)
    const urlField = await sharedPage.locator('main input[type="text"]').nth(2);
    await urlField.click();
    await urlField.fill('http://insecure-site.com/dashboard?token=$token');
    await sharedPage.waitForTimeout(500);

    // Salvar
    const saveButton = await sharedPage.waitForSelector('button:has-text("check"), button:has([data-icon="check"])', {
      timeout: 5000,
    });

    await saveButton.click();
    await sharedPage.waitForTimeout(3000);

    // Navegar para o módulo inframe
    const inframeModule = sharedPage.locator('a[href="/admin/inframe"], a:has-text("Extra")').first();
    await inframeModule.click();
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(2000);

    // Clicar no item inseguro (último card)
    const cards = sharedPage.locator('.card, [class*="card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const lastCard = cards.last();
      await lastCard.click();
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);

      // Deve mostrar mensagem de erro de segurança
      const errorState = sharedPage.locator('.error-state, [class*="error"], h2:has-text("Erro de Segurança")').first();
      await expect(errorState).toBeVisible({ timeout: 10000 });

      // Verificar se contém texto sobre HTTPS
      const pageText = await sharedPage.textContent('body');
      expect(pageText).toContain('HTTPS');
    }
  });

  test('should allow HTTPS + $token', async () => {
    test.setTimeout(120000);

    // Criar novo item com HTTPS + token (deve funcionar)
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();
    await sharedPage.waitForURL('**/admin/content/inframe/+');
    await sharedPage.waitForTimeout(2000);

    // Preencher com HTTPS + $token (SEGURO)
    const urlField = await sharedPage.locator('main input[type="text"]').nth(2);
    await urlField.click();
    await urlField.fill('https://trusted-site.com/api/view?token=$token&user=$user_email');
    await sharedPage.waitForTimeout(500);

    // Salvar
    const saveButton = await sharedPage.waitForSelector('button:has-text("check"), button:has([data-icon="check"])', {
      timeout: 5000,
    });

    await saveButton.click();
    await sharedPage.waitForTimeout(3000);

    // Navegar para o módulo inframe
    const inframeModule = sharedPage.locator('a[href="/admin/inframe"], a:has-text("Extra")').first();
    await inframeModule.click();
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(2000);

    // Clicar no último item (com token)
    const cards = sharedPage.locator('.card, [class*="card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const lastCard = cards.last();
      await lastCard.click();
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(3000);

      // Deve mostrar iframe (sem erro)
      const iframe = sharedPage.locator('iframe').first();
      await expect(iframe).toBeVisible({ timeout: 10000 });

      // Obter o src do iframe
      const iframeSrc = await iframe.getAttribute('src');
      expect(iframeSrc).toBeTruthy();

      // Verificar que $token foi substituído
      expect(iframeSrc).not.toContain('$token');
      expect(iframeSrc).toContain('token=');

      // Verificar que é HTTPS
      expect(iframeSrc).toMatch(/^https:\/\//);
    }
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

    // Navegar e clicar no item
    const inframeModule = sharedPage.locator('a[href="/admin/inframe"], a:has-text("Extra")').first();
    await inframeModule.click();
    await sharedPage.waitForLoadState('networkidle');
    await sharedPage.waitForTimeout(2000);

    const cards = sharedPage.locator('.card, [class*="card"]');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const lastCard = cards.last();
      await lastCard.click();
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);

      // Deve mostrar iframe normalmente
      const iframe = sharedPage.locator('iframe').first();
      await expect(iframe).toBeVisible({ timeout: 10000 });

      const iframeSrc = await iframe.getAttribute('src');

      // URL deve permanecer exatamente como cadastrada
      expect(iframeSrc).toBe('https://example.com/static-page');
    }
  });
});
