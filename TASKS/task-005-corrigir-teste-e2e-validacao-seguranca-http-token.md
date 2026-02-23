# Task 005 — Corrigir teste E2E de validação de segurança HTTP + $token

Status: todo
Type: fix  
Assignee: Sidarta Veloso
Priority: high

## Description

O teste E2E "should show security error for HTTP + $token" está falhando porque a validação de segurança não ocorre no backend (API), mas sim na interface do usuário quando o iframe tenta carregar.

### Problema

O teste atual tenta criar um item com URL insegura (HTTP + variável `$token`) esperando que a API bloqueie a criação, mas a API permite criar o item com status 200. A validação de segurança provavelmente ocorre apenas quando o usuário visualiza o item e o iframe tenta carregar a URL.

**Arquivo:** `tests/e2e/dynamic-url-variables.spec.ts`  
**Teste falhando:** "should show security error for HTTP + $token"

**Comportamento atual:**
- API retorna status 200 e cria o item com sucesso
- Teste espera que `createResult.ok` seja `false`, mas recebe `true`

**Comportamento esperado:**
- Deve haver validação de segurança impedindo URLs HTTP quando `$token` é usado
- Esta validação pode ocorrer na API (hook) ou na UI (componente)

### Log do Erro

```
🔍 API response: {
  ok: true,
  status: 200,
  data: {
    id: '02f8bfc5-12c4-4620-abd5-cf8da8847185',
    url: 'http://insecure-site.com/dashboard?token=$token'
  }
}

Error: expect(received).toBe(expected)
Expected: false
Received: true

at dynamic-url-variables.spec.ts:259:29
```

### Análise Técnica

A extensão `directus-extension-inframe` implementa validação de segurança para prevenir vazamento de tokens em URLs HTTP (task-002). Esta validação pode estar em dois níveis:

1. **Backend (API)**: Hook de validação antes de criar/atualizar item
2. **Frontend (UI)**: Validação no componente antes de renderizar o iframe

Atualmente, a validação parece estar **apenas na UI**, mas o teste foi escrito esperando validação no **backend**.

## Tasks

- [ ] Investigar onde a validação de segurança HTTP + $token está implementada
  - [ ] Verificar hook em `src/hooks/inframe-setup/index.ts`
  - [ ] Verificar validação em `src/components/ItemDetail.vue`
  - [ ] Verificar validação em `src/utils/useUrlVariableReplacement.ts`
- [ ] Decidir abordagem correta:
  - **Opção A**: Implementar validação no backend (hook) e testar resposta da API
  - **Opção B**: Manter validação apenas na UI e ajustar teste para verificar mensagem de erro visual
  - **Opção C**: Implementar validação em ambos os níveis (defesa em profundidade)
- [ ] Implementar correções necessárias no código de produção
- [ ] Atualizar o teste E2E para refletir o comportamento correto
- [ ] Executar teste e verificar que passa
- [ ] Documentar decisão e implementação

## Possíveis Soluções

### Opção A: Validação no Backend (Recomendado)

Implementar hook de validação em `src/hooks/inframe-setup/index.ts`:

```typescript
// Validar URLs antes de salvar
action('items.create', async ({ payload, collection }) => {
  if (collection !== 'inframe') return;
  
  const url = payload.url;
  if (!url) return;
  
  // Verificar se usa $token em URL HTTP
  if (url.startsWith('http://') && url.includes('$token')) {
    throw new ForbiddenException(
      'HTTPS is required when using $token variable to prevent token exposure'
    );
  }
});
```

**Vantagens:**
- Segurança em camada de dados
- Impede criação de configurações inseguras
- Teste mais simples (verificar resposta da API)

**Teste esperado:**
```typescript
const createResult = await sharedPage.evaluate(async () => {
  const response = await fetch('/items/inframe', {
    method: 'POST',
    body: JSON.stringify({
      url: 'http://insecure-site.com/dashboard?token=$token'
    })
  });
  return { ok: response.ok, status: response.status };
});

expect(createResult.ok).toBe(false);
expect([400, 403]).toContain(createResult.status);
```

### Opção B: Validação apenas na UI

Se a validação já existe na UI, ajustar o teste para:

```typescript
// Criar o item via API (permitido)
const createResult = await sharedPage.evaluate(async () => {
  const response = await fetch('/items/inframe', {
    method: 'POST',
    body: JSON.stringify({
      url: 'http://insecure-site.com/dashboard?token=$token'
    })
  });
  const data = await response.json();
  return { ok: response.ok, itemId: data?.data?.id };
});

expect(createResult.ok).toBe(true);

// Navegar para a página do item
await sharedPage.goto(`/admin/content/inframe/${createResult.itemId}`);
await sharedPage.waitForLoadState('networkidle');

// Verificar mensagem de erro de segurança na UI
const errorMessage = sharedPage.locator('text=/https.*required|security.*error/i');
await expect(errorMessage).toBeVisible();
```

**Limitações:**
- Item inseguro pode ser criado e salvo no banco
- Apenas previne exibição na UI
- Mais complexo para testar

### Opção C: Validação em Ambos os Níveis (Defesa em Profundidade)

Implementar validação tanto no backend quanto no frontend:
- Backend: Previne persistência de configurações inseguras
- Frontend: Feedback imediato ao usuário durante preenchimento do formulário

## Locators para Teste de UI

Se optar por testar na UI, usar os seguintes locators:

```typescript
const securityErrorLocators = [
  sharedPage.locator('text=/security/i'),
  sharedPage.locator('text=/https.*required/i'),
  sharedPage.locator('text=/insecure/i'),
  sharedPage.locator('text=/não seguro/i'),
  sharedPage.locator('[class*="error"]'),
  sharedPage.locator('[class*="warning"]'),
];
```

## Arquivos Relacionados

- `tests/e2e/dynamic-url-variables.spec.ts` (linha 225)
- `src/hooks/inframe-setup/index.ts` - Hook de setup da coleção
- `src/components/ItemDetail.vue` - Componente de visualização do iframe
- `src/utils/useUrlVariableReplacement.ts` - Lógica de substituição de variáveis
- `tests/e2e/helpers/DirectusE2EHelper.ts` - Helper de testes E2E

## Comandos Úteis

```bash
# Executar apenas este teste
npx playwright test --grep="should show security error"

# Executar com UI mode para debug
npx playwright test --ui --grep="should show security error"

# Ver trace do teste falhado
npx playwright show-trace test-results/dynamic-url-variables-Dyna-79cb9-curity-error-for-HTTP-token-chromium/trace.zip

# Executar todos os testes de variáveis dinâmicas
DIRECTUS_URL=http://localhost:32812 npx playwright test --grep="dynamic-url-variables"
```

## Context from Task-002

Esta task está relacionada à [task-002-mitigar-vulnerabilidades-seguranca-variaveis-url.md](task-002-mitigar-vulnerabilidades-seguranca-variaveis-url.md), que implementou as mitigações de segurança para variáveis dinâmicas na URL.

**Vulnerabilidade mitigada:** Token Exposure via Insecure Protocol
- URLs HTTP com `$token` expõem o JWT em texto claro
- Atacantes podem interceptar tokens via man-in-the-middle

**Mitigação implementada:** Forçar HTTPS quando `$token` é usado

O teste E2E deve validar que esta mitigação está funcionando corretamente.

## Definition of Done

- [ ] Validação de segurança implementada e funcionando (backend e/ou frontend)
- [ ] Teste E2E atualizado e passando
- [ ] Todos os 8 testes do arquivo `dynamic-url-variables.spec.ts` passando
- [ ] Documentação atualizada (se necessário)
- [ ] Code review aprovado
- [ ] Commit realizado com mensagem descritiva
