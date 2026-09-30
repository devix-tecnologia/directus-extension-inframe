# DirectusE2EHelper

Uma classe helper reutilizável para facilitar testes End-to-End (E2E) em projetos Directus.

## Visão Geral

`DirectusE2EHelper` encapsula operações comuns do Directus (autenticação, gerenciamento de módulos, operações de
coleções, navegação) em métodos simples e reutilizáveis, tornando os testes E2E mais limpos e fáceis de manter.

## Instalação

Copie o arquivo `DirectusE2EHelper.ts` para o diretório de helpers do seu projeto de testes:

```bash
cp tests/e2e/helpers/DirectusE2EHelper.ts seu-projeto/tests/helpers/
```

## Uso Básico

```typescript
import { test, Page } from '@playwright/test';
import { DirectusE2EHelper } from './helpers/DirectusE2EHelper';

let page: Page;
let directus: DirectusE2EHelper;

test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL });
  page = await context.newPage();

  // Inicializar helper
  directus = new DirectusE2EHelper(page, baseURL!);

  // Login
  await directus.login('admin@example.com', 'password');
});

test('meu teste', async () => {
  // Usar os métodos do helper
  await directus.navigateToCollection('users');
  // ... resto do teste
});
```

## Recursos Principais

### 🔐 Autenticação

```typescript
// Login (trata automaticamente sessões existentes com botão "Continue")
await directus.login('admin@example.com', 'password');

// Logout
await directus.logout();

// Verificar se está autenticado
const isAuth = await directus.isAuthenticated();

// Garantir autenticação (faz login se necessário)
await directus.ensureAuthenticated('admin@example.com', 'password');
```

### 🧩 Gerenciamento de Módulos

```typescript
// Ativar módulo via API (mais confiável que UI)
await directus.enableModule('inframe');

// Desativar módulo
await directus.disableModule('inframe');

// Verificar se módulo está ativado
const isEnabled = await directus.isModuleEnabled('inframe');

// Clicar no módulo na navegação
await directus.clickModuleInNav('inframe', 'Extra');
```

### 📦 Operações de Coleções

```typescript
// Verificar se coleção existe
const exists = await directus.collectionExists('users');

// Criar item via API
const newUser = await directus.createItem('users', {
  email: 'test@example.com',
  first_name: 'Test',
});

// Buscar items
const users = await directus.getItems('users', ['id', 'email']);

// Deletar todos os items de uma coleção
await directus.deleteAllItems('temp_collection');
```

### 🧭 Navegação

```typescript
// Navegar para coleção
await directus.navigateToCollection('users');

// Navegar para módulo
await directus.navigateToModule('inframe');

// Navegar para settings
await directus.navigateToSettings('project');

// Verificar URL atual
if (directus.urlContains('/admin/users')) {
  // ...
}
```

### ⚙️ Configurações

```typescript
// Buscar configurações
const settings = await directus.getSettings();

// Atualizar configurações
await directus.updateSettings({
  project_name: 'Meu Projeto',
});
```

### 🛠️ Utilidades

```typescript
// Aguardar página estar pronta
await directus.waitForReady();

// Recarregar página
await directus.reload();

// Screenshot para debug
await directus.screenshot('after-login');

// Acessar Page do Playwright diretamente para operações avançadas
const page = directus.getPage();
await page.locator('.custom-selector').click();
```

## Exemplos Reais

### Exemplo 1: Testar Criação de Item

```typescript
test('deve criar um novo usuário', async () => {
  // Navegar para coleção
  await directus.navigateToCollection('users');

  // Criar via API (mais rápido que UI)
  const user = await directus.createItem('users', {
    email: 'novo@example.com',
    first_name: 'Novo',
    last_name: 'Usuário',
    password: 'senha123',
    role: 'admin-role-uuid',
  });

  expect(user.id).toBeDefined();

  // Verificar na UI que o item aparece
  const page = directus.getPage();
  await expect(page.locator(`text=${user.email}`)).toBeVisible();
});
```

### Exemplo 2: Testar Módulo Customizado

```typescript
test('deve habilitar e acessar módulo customizado', async () => {
  // Habilitar módulo via API
  await directus.enableModule('meu-modulo');

  // Verificar que foi habilitado
  const isEnabled = await directus.isModuleEnabled('meu-modulo');
  expect(isEnabled).toBe(true);

  // Recarregar para aplicar mudanças na UI
  await directus.reload();

  // Clicar no módulo na navegação
  await directus.clickModuleInNav('meu-modulo', 'Meu Módulo');

  // Verificar que estamos na página correta
  expect(directus.urlContains('/admin/meu-modulo')).toBe(true);
});
```

### Exemplo 3: Setup e Teardown

```typescript
let directus: DirectusE2EHelper;

test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  directus = new DirectusE2EHelper(page, baseURL!);
  await directus.login('admin@example.com', 'password');
});

test.afterEach(async () => {
  // Limpar dados de teste após cada teste
  await directus.deleteAllItems('test_collection');
});

test('teste 1', async () => {
  // Criar dados de teste
  await directus.createItem('test_collection', { name: 'Test 1' });
  // ... teste
});

test('teste 2', async () => {
  // Dados limpos, começamos do zero
  await directus.createItem('test_collection', { name: 'Test 2' });
  // ... teste
});
```

## Vantagens

✅ **Reutilizável**: Use em múltiplos projetos Directus  
✅ **Confiável**: Usa API sempre que possível, evitando fragilidade da UI  
✅ **Manutenível**: Mudanças no Directus? Atualize apenas o helper  
✅ **Legível**: Testes ficam mais declarativos e fáceis de entender  
✅ **Produtivo**: Escreva menos código repetitivo

## Comparação: Antes vs Depois

### ❌ Antes (sem helper)

```typescript
test('teste usuário', async () => {
  // 15+ linhas de código repetitivo
  await page.goto('/admin/login');
  await page.waitForTimeout(1000);
  const continueButton = page.locator('button:has-text("Continue")');
  const hasContinue = await continueButton.isVisible({ timeout: 3000 }).catch(() => false);
  if (hasContinue) {
    await continueButton.click();
    await page.waitForURL('**/admin/**');
  } else {
    await page.fill('input[type="email"]', 'admin@example.com');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin/**');
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Finalmente começar o teste...
});
```

### ✅ Depois (com helper)

```typescript
test('teste usuário', async () => {
  // 1 linha!
  await directus.login('admin@example.com', 'password');

  // Foco no que realmente importa
  await directus.navigateToCollection('users');
  // ... teste
});
```

## Contribuindo

Este helper está em constante evolução. Sugestões de melhorias:

1. Adicionar métodos para operações de relacionamentos
2. Suporte para permissões e roles
3. Helpers para webhooks e flows
4. Suporte para upload de arquivos
5. Helpers para filtros e buscas complexas

## Licença

MIT - use livremente em seus projetos!
