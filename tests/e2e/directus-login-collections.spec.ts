import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Para CommonJS, usamos __dirname diretamente
const storageFile = path.resolve(__dirname, 'auth-storage.json');

// Variáveis compartilhadas entre os testes
let sharedContext: BrowserContext;
let sharedPage: Page;

// Rodar os testes em série para evitar conflitos de sessão
test.describe.configure({ mode: 'serial' });

test.describe('Directus Admin Panel - Login e Coleções', () => {
  test.beforeAll(async ({ browser }: { browser: Browser }) => {
    // Criar contexto e página compartilhados
    sharedContext = await browser.newContext();
    sharedPage = await sharedContext.newPage();

    // Navega para o login e faz autenticação
    await sharedPage.goto('/admin/login', { waitUntil: 'networkidle' });

    // Aguardar um pouco para a página carregar completamente
    await sharedPage.waitForTimeout(1000);

    // Verificar se há um botão "Continue" (sessão existente)
    // O Directus mostra esse botão quando já existe uma sessão autenticada
    const continueButton = sharedPage.locator('button:has-text("Continue")');
    const hasContinueButton = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasContinueButton) {
      // Se há botão Continue, clicar nele e aguardar redirecionamento
      await continueButton.click();
      await sharedPage.waitForURL('**/admin/**', { timeout: 20000 });

      // Aguardar a página carregar completamente após o Continue
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);
    } else {
      // Caso contrário, fazer login normal
      await sharedPage.fill('input[type="email"]', ADMIN_EMAIL);
      await sharedPage.fill('input[type="password"]', ADMIN_PASSWORD);
      await sharedPage.click('button[type="submit"]');
      await sharedPage.waitForURL('**/admin/**', { timeout: 20000 });
      await sharedPage.waitForLoadState('networkidle');
    }

    // Esperar elementos de navegação visíveis (com timeout maior)
    await sharedPage.waitForSelector('#navigation, aside[role="navigation"], [data-test-id="navigation"]', {
      timeout: 30000,
    });
  });

  test.afterAll(async () => {
    // Fechar contexto compartilhado
    if (sharedContext) {
      await sharedContext.close();
    }

    // Remover storage file (se existir)
    if (fs.existsSync(storageFile)) {
      try {
        fs.unlinkSync(storageFile);
      } catch {
        // ignore
      }
    }
  });

  test('deve fazer login com sucesso e estabilizar o dashboard', async () => {
    // A página compartilhada já está autenticada e no dashboard
    // Apenas verificar que os elementos estão presentes

    // Verificar URL e elementos do dashboard
    expect(sharedPage.url()).toContain('/admin');

    // Aguardar navegação estar visível (já deve estar do beforeAll)
    const nav = await sharedPage.locator('#navigation, aside[role="navigation"], [data-test-id="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5000 });

    // Tirar screenshot para debug
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/dashboard.png', fullPage: true });
  });

  test('deve acessar a listagem de coleções (Content)', async () => {
    // No Directus 11, não há uma página /admin/content genérica
    // Vamos verificar se conseguimos acessar uma coleção específica
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });

    // Se o Directus redirecionar para login, falhar explicitamente
    if (sharedPage.url().includes('/login')) {
      throw new Error('Redirecionado para login — sessão inválida');
    }

    // Aguardar elementos da página de coleção (header, tabela, ou empty state)
    await sharedPage.waitForSelector('header, .header-bar, table, [role="table"], .v-info, .empty-state', {
      timeout: 20000,
    });

    // Screenshot para debug
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/collections-page.png', fullPage: true });
  });

  test('deve verificar que a coleção "inframe" existe e está acessível', async () => {
    // Usar página compartilhada
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });

    if (sharedPage.url().includes('/login')) {
      throw new Error('Redirecionado para login — sessão inválida');
    }

    // Aguardar elementos que indicam página carregada
    await sharedPage.waitForSelector(
      'table, [role="table"], .v-grid, .grid-container, .v-info, .empty-state, .v-notice, header',
      { timeout: 20000 },
    );

    // Fazer uma verificação leve no corpo para erros óbvios
    const bodyText = (await sharedPage.textContent('body')) || '';
    expect(bodyText.toLowerCase()).not.toContain('forbidden');
    expect(bodyText.toLowerCase()).not.toContain('no permission');

    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/inframe-collection.png', fullPage: true });
  });

  test('deve listar as coleções customizadas criadas pelo hook', async () => {
    // Usar página compartilhada
    await sharedPage.goto('/admin', { waitUntil: 'networkidle' });

    // Verificar se há botão Continue novamente (pode aparecer ao navegar)
    const continueButton = sharedPage.locator('button:has-text("Continue")');
    const hasContinueButton = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasContinueButton) {
      await continueButton.click();
      await sharedPage.waitForLoadState('networkidle');
      await sharedPage.waitForTimeout(2000);
    }

    // Aguardar navegação
    const nav = await sharedPage.waitForSelector('#navigation, aside[role="navigation"], [data-test-id="navigation"]', {
      timeout: 20000,
    });

    const navText = (await nav.textContent()) || '';

    const hasInframe = navText.toLowerCase().includes('inframe') || navText.toLowerCase().includes('relatórios');
    const hasLanguages = navText.toLowerCase().includes('language') || navText.toLowerCase().includes('idioma');

    // Screenshot da navegação
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/navigation.png', fullPage: false });

    // Não falhar imediatamente — apenas informar caso não encontre (pode ser permissões)
    if (!hasInframe && !hasLanguages) {
      throw new Error('Coleções customizadas não encontradas na navegação. Verifique permissões.');
    }
  });

  test('deve criar um novo registro na coleção inframe', async () => {
    // Navegar para a coleção inframe
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });

    // Aguardar a página carregar
    await sharedPage.waitForTimeout(2000);

    // Screenshot para debug
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/inframe-collection-page.png', fullPage: true });

    // No Directus 11, o botão de criar é um link <a> com classe button
    // Usar o link que contém o texto "Create Item" ou o ícone add
    const createButton = await sharedPage.waitForSelector(
      'a[href*="/inframe/+"]:has-text("Create Item"), a.button.icon[href*="/inframe/+"]',
      { timeout: 10000 },
    );

    await createButton.click();

    // Aguardar o formulário de criação abrir
    await sharedPage.waitForURL('**/admin/content/inframe/+');

    // Aguardar o formulário carregar completamente
    await sharedPage.waitForSelector('main', { state: 'visible' });
    await sharedPage.waitForTimeout(2000);

    // Verificar se ainda estamos na página de criação
    expect(sharedPage.url()).toContain('/inframe/+');

    // Status já vem preenchido com "Rascunho", deixar como está
    // Ícone é opcional, vamos pular para evitar o dropdown

    // Preencher o campo URL diretamente (terceiro input de texto)
    // Usar waitForSelector para garantir que o campo existe
    await sharedPage.waitForSelector('main input[type="text"]', { state: 'visible', timeout: 5000 });

    const urlField = await sharedPage.locator('main input[type="text"]').nth(2); // terceiro input (índice 2)

    await urlField.click(); // Focar no campo
    await urlField.fill('https://example.com/test-report');

    await sharedPage.waitForTimeout(500);

    // Screenshot antes de salvar
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/create-inframe-form.png', fullPage: true });

    // Clicar no botão de salvar (ícone check no banner/header)
    const saveButton = await sharedPage.waitForSelector(
      'banner button:has-text("check"), button:has([data-icon="check"])',
      {
        timeout: 5000,
      },
    );

    await saveButton.click();

    // Aguardar o salvamento e redirecionamento
    await sharedPage.waitForTimeout(3000);

    // Verificar se foi redirecionado para a listagem ou para o item criado
    const currentUrl = sharedPage.url();
    expect(currentUrl).toMatch(/\/admin\/content\/inframe/);

    // Screenshot após salvar
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/after-create-inframe.png', fullPage: true });

    // Verificar se o item aparece na listagem
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Procurar pela URL que acabamos de criar
    const itemCreated = await sharedPage.locator('text=https://example.com/test-report').first().isVisible({
      timeout: 5000,
    });

    expect(itemCreated).toBeTruthy();
  });
});
