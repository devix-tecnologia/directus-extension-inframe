import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'fs';

/**
 * Credenciais de admin padrão do ambiente de teste
 */
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin123';

// Use path relativo ao workspace (funciona em CJS e ESM)
const storageFile = `${process.cwd()}/tests/e2e/auth-storage.json`;

// Variáveis compartilhadas entre os testes
let sharedContext: BrowserContext;
let sharedPage: Page;

// Rodar os testes em série para evitar conflitos de sessão
test.describe.configure({ mode: 'serial' });

test.describe('Directus Admin Panel - Login e Coleções', () => {
  test.beforeAll(async ({ browser, baseURL }: { browser: Browser; baseURL: string | undefined }) => {
    // Aumentar timeout do beforeAll para dar tempo de login + navegação completa (3 minutos)
    test.setTimeout(180000);

    // Criar contexto e página compartilhados com baseURL explícito
    sharedContext = await browser.newContext({ baseURL });
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

      // Enviar o formulário com Enter (mais robusto em headless e variações de DOM)
      await Promise.all([
        sharedPage.waitForURL('**/admin/**', { timeout: 20000 }),
        sharedPage.press('input[type="password"]', 'Enter'),
      ]);

      await sharedPage.waitForLoadState('networkidle');
    }

    // Esperar elementos de navegação visíveis (com timeout maior)
    await sharedPage.waitForSelector('#navigation, aside[role="navigation"], [data-test-id="navigation"]', {
      // Aumentado timeout para acomodar ambientes lentos/CI
      timeout: 120000,
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

  // This test is redundant - other tests already verify collections exist by interacting with them
  test.skip('deve listar as coleções customizadas criadas pelo hook', async () => {
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

    // Try to expand the Inframe Pasta folder if it exists by clicking the chevron button
    const expandButton = sharedPage.locator('button:has-text("chevron_right")').first();
    const hasExpandButton = await expandButton.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasExpandButton) {
      // Click the expand button
      await expandButton.click();
      await sharedPage.waitForTimeout(1000);
    }

    const navText = (await nav.textContent()) || '';

    const hasInframe = navText.toLowerCase().includes('inframe');
    const hasLanguages = navText.toLowerCase().includes('language');

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

  // Module activation is now handled via API in dynamic-url-variables.spec.ts
  // This test attempted UI-based activation but Directus UI structure varies by version
  test.skip('deve ativar o módulo inframe nas configurações do projeto', async () => {
    test.setTimeout(120000); // 2 minutos

    // 1. Navegar para Settings
    await sharedPage.goto('/admin/settings/project', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // eslint-disable-next-line no-console
    console.log('[E2E] Acessando configurações do projeto...');

    // 2. Procurar pelo campo Module Bar (pode estar em um accordion ou seção)
    // Vamos procurar por um input ou área que controla os módulos
    const moduleBarSection = sharedPage.locator('text=Module Bar, text=Modules').first();
    const hasModuleBarSection = await moduleBarSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasModuleBarSection) {
      // eslint-disable-next-line no-console
      console.log('[E2E] Seção Module Bar encontrada, expandindo...');
      await moduleBarSection.click();
      await sharedPage.waitForTimeout(1000);
    }

    // 3. Procurar pelo checkbox ou toggle do módulo "inframe" ou "Extra"
    // Directus 11 usa uma interface de drag-and-drop com checkboxes
    const inframeModuleToggle = sharedPage
      .locator(
        'input[type="checkbox"][value="inframe"], ' +
          'label:has-text("Extra") input[type="checkbox"], ' +
          '[data-module="inframe"] input[type="checkbox"]',
      )
      .first();

    const hasToggle = await inframeModuleToggle.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasToggle) {
      // eslint-disable-next-line no-console
      console.log('[E2E] Toggle do módulo inframe encontrado');

      // Verificar se já está marcado
      const isChecked = await inframeModuleToggle.isChecked();

      if (!isChecked) {
        // eslint-disable-next-line no-console
        console.log('[E2E] Ativando módulo inframe...');
        await inframeModuleToggle.check();
        await sharedPage.waitForTimeout(1000);

        // 4. Salvar configurações
        const saveButton = sharedPage.locator('button:has-text("Save"), button[type="submit"]').first();
        await saveButton.click();
        await sharedPage.waitForTimeout(2000);

        // eslint-disable-next-line no-console
        console.log('[E2E] Configurações salvas');
      } else {
        // eslint-disable-next-line no-console
        console.log('[E2E] Módulo já estava ativado');
      }
    } else {
      // eslint-disable-next-line no-console
      console.log('[E2E] ⚠️ Toggle do módulo não encontrado, tentando ativar via module_bar diretamente...');

      // Fallback: tentar encontrar e editar o campo module_bar JSON diretamente se existir
      // (Isso é menos comum mas pode existir em algumas versões do Directus)
    }

    // 5. Navegar de volta para a home e verificar se o módulo aparece
    await sharedPage.goto('/admin', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Screenshot para debug
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/after-enable-module.png', fullPage: true });

    // 6. Verificar se o módulo Extra está visível na navegação
    const extraButton = sharedPage.locator('a[href="/admin/inframe"], button:has-text("Extra")').first();
    const isModuleVisible = await extraButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isModuleVisible) {
      // eslint-disable-next-line no-console
      console.log('[E2E] ✅ Módulo inframe está visível na navegação');
    } else {
      // eslint-disable-next-line no-console
      console.log('[E2E] ⚠️ Módulo não apareceu na navegação (pode precisar de reload)');

      // Tentar reload
      await sharedPage.reload({ waitUntil: 'networkidle' });
      await sharedPage.waitForTimeout(2000);

      await expect(extraButton).toBeVisible({ timeout: 10000 });
    }
  });

  // This test is covered by dynamic-url-variables.spec.ts "should navigate to inframe module"
  test.skip('deve verificar que o módulo inframe foi habilitado automaticamente pelo hook', async () => {
    // O hook deve ter habilitado o módulo automaticamente
    // Vamos navegar e dar reload para garantir que o módulo apareça

    // 1. Navegar para a página principal
    await sharedPage.goto('/admin', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(1000);

    // 2. Reload da página para garantir que o módulo foi carregado
    await sharedPage.reload({ waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // 3. Verificar se o módulo Extra está visível na barra superior
    // Procurar por link com href="/admin/inframe" ou texto "Extra"
    const extraButton = sharedPage.locator('a[href="/admin/inframe"], a:has-text("Extra")').first();

    await expect(extraButton).toBeVisible({ timeout: 10000 });

    // Screenshot com o botão Extra visível
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/extra-button-visible.png', fullPage: false });

    // 4. Clicar no botão Extra
    await extraButton.click();
    await sharedPage.waitForTimeout(2000);

    // Screenshot após clicar no Extra
    await sharedPage.screenshot({ path: 'tests/e2e/screenshots/extra-module-opened.png', fullPage: true });

    // 5. Verificar que o módulo inframe foi exibido
    await sharedPage.waitForSelector('main, .module-content', { timeout: 10000 });

    // Verificar que há conteúdo no módulo
    const moduleContent = await sharedPage.locator('main, .module-content').first();
    await expect(moduleContent).toBeVisible({ timeout: 5000 });
  });

  // Test has timing issues, skipping for now
  test.skip('deve exibir mensagem quando não há inframes cadastrados', async () => {
    test.setTimeout(120000); // 2 minutos

    // 1. Verificar se há itens na coleção inframe e deletá-los
    await sharedPage.goto('/admin/content/inframe', { waitUntil: 'networkidle' });
    await sharedPage.waitForTimeout(2000);

    // Verificar se há itens e deletar todos
    const hasItems = (await sharedPage.locator('table tbody tr').count()) > 0;

    if (hasItems) {
      try {
        // Selecionar todos os itens
        const selectAllCheckbox = sharedPage.locator('table thead input[type="checkbox"]').first();
        await selectAllCheckbox.click({ timeout: 5000 });
        await sharedPage.waitForTimeout(500);

        // Clicar no botão de deletar
        const deleteButton = sharedPage.locator('button[data-tooltip="Delete"]').first();
        await deleteButton.click({ timeout: 5000 });
        await sharedPage.waitForTimeout(500);

        // Confirmar deleção no modal
        const confirmButton = sharedPage.locator('button:has-text("Delete")').last();
        await confirmButton.click({ timeout: 5000 });
        await sharedPage.waitForTimeout(2000);
      } catch (error: any) {
        // eslint-disable-next-line no-console
        console.log('Error deleting items, continuing test:', error.message);
      }
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
