import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Para módulos ES, usamos import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

  test('deve habilitar o módulo inframe nas configurações e verificar menu Extra', async () => {
    // 1. Navegar diretamente para a página de configurações do projeto
    await sharedPage.goto('/settings/project', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Screenshot da página de configurações do projeto
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/settings-project-page.png', fullPage: true });

    // 2. Clicar no checkbox para habilitar o módulo Extra (8º item da lista)
    const extraCheckbox = sharedPage.locator(
      '#main-content > div > main > div.settings > div > div:nth-child(7) > div.interface > div > ul > li:nth-child(8) > button',
    );

    await expect(extraCheckbox).toBeVisible({ timeout: 10000 });

    // Verificar se já está ativo
    const isActive = await extraCheckbox.evaluate((el) => el.classList.contains('active')).catch(() => false);

    if (!isActive) {
      await extraCheckbox.click();
      await sharedPage.waitForTimeout(1000);
    }

    // Screenshot após habilitar
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/extra-checkbox-enabled.png', fullPage: true });

    // 3. Salvar as configurações - botão de check no canto superior direito
    const saveButton = sharedPage.locator('header button.icon, .header-bar-actions button, button[data-v-6f44c4ef]').last();
    await expect(saveButton).toBeVisible({ timeout: 10000 });
    await saveButton.click();
    await sharedPage.waitForTimeout(3000);

    // Screenshot após salvar
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/settings-saved.png', fullPage: true });

    // 4. Verificar se o botão Extra apareceu na barra lateral (7º item)
    const extraButton = sharedPage.locator('#navigation > div.module-bar > div.modules > div:nth-child(7) > a');
    await expect(extraButton).toBeVisible({ timeout: 10000 });

    // Screenshot com o botão Extra visível
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/extra-button-visible.png', fullPage: false });

    // 5. Clicar no botão Extra
    await extraButton.click();
    await sharedPage.waitForTimeout(2000);

    // Screenshot após clicar no Extra
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/extra-module-opened.png', fullPage: true });

    // 6. Verificar que o módulo inframe foi exibido
    // Deve mostrar os links/botões para os inframes cadastrados
    await sharedPage.waitForSelector('main, .module-content, iframe', { timeout: 10000 });

    // Verificar que há conteúdo no módulo
    const moduleContent = await sharedPage.locator('main, .module-content').first();
    await expect(moduleContent).toBeVisible({ timeout: 5000 });
  });

  test('deve exibir mensagem quando não há inframes cadastrados', async () => {
    // 1. Verificar se há itens na coleção inframe e deletá-los
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Verificar se há itens e deletar todos
    const hasItems = (await sharedPage.locator('table tbody tr').count()) > 0;

    if (hasItems) {
      // Selecionar todos os itens
      const selectAllCheckbox = sharedPage.locator('table thead input[type="checkbox"]').first();
      await selectAllCheckbox.click();
      await sharedPage.waitForTimeout(500);

      // Clicar no botão de deletar
      const deleteButton = sharedPage.locator('button[data-tooltip="Delete"]').first();
      await deleteButton.click();
      await sharedPage.waitForTimeout(500);

      // Confirmar deleção no modal
      const confirmButton = sharedPage.locator('button:has-text("Delete")').last();
      await confirmButton.click();
      await sharedPage.waitForTimeout(2000);
    }

    // 2. Navegar para o módulo inframe
    await sharedPage.goto('/admin/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // 3. Verificar que a mensagem de "Nenhum item cadastrado" é exibida
    const emptyStateIcon = sharedPage.locator('.empty-state i.v-icon');
    await expect(emptyStateIcon).toBeVisible({ timeout: 5000 });

    const emptyStateHeading = sharedPage.locator('.empty-state h2:has-text("Nenhum item cadastrado")');
    await expect(emptyStateHeading).toBeVisible({ timeout: 5000 });

    const emptyStateText = sharedPage.locator(
      '.empty-state p:has-text("Crie um novo item na coleção inframe para começar")',
    );
    
    await expect(emptyStateText).toBeVisible({ timeout: 5000 });

    // Screenshot do estado vazio
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/inframe-empty-state.png', fullPage: true });
  });
});
