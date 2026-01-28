# 🧪 Testes E2E - Variáveis Dinâmicas

## 📁 Arquivo de Teste

`tests/e2e/dynamic-url-variables.spec.ts`

## 🎯 Cobertura dos Testes

### Testes Implementados

1. ✅ **Collection exists** - Verifica que a collection `inframe` foi criada
2. ✅ **Create item with variables** - Cria item com variáveis `$user_email`, `$user_id`, `$timestamp`
3. ✅ **Navigate to inframe module** - Navega para o módulo inframe
4. ✅ **Display items in grid** - Verifica que os cards aparecem na grid
5. ✅ **Process URL variables** - Verifica que variáveis são substituídas corretamente
6. ✅ **Security: HTTP + $token** - Bloqueia HTTP com $token (mostra erro)
7. ✅ **Security: HTTPS + $token** - Permite HTTPS com $token
8. ✅ **URLs without variables** - URLs estáticas funcionam normalmente

## 🚀 Como Rodar os Testes

### Opção 1: Rodar todos os testes E2E

```bash
pnpm test:e2e
```

### Opção 2: Rodar apenas os testes de variáveis dinâmicas

```bash
npx playwright test tests/e2e/dynamic-url-variables.spec.ts
```

### Opção 3: Rodar em modo UI (interativo)

```bash
pnpm test:e2e:ui
```

### Opção 4: Rodar com debug

```bash
npx playwright test tests/e2e/dynamic-url-variables.spec.ts --debug
```

### Opção 5: Rodar com headed browser (ver o navegador)

```bash
npx playwright test tests/e2e/dynamic-url-variables.spec.ts --headed
```

## 📊 Cenários de Teste Detalhados

### 1. Substituição de Variáveis Básicas

```typescript
URL cadastrada: https://example.com/dashboard?user=$user_email&id=$user_id
URL processada: https://example.com/dashboard?user=admin%40example.com&id=abc123
```

**Validações:**

- ✅ Variáveis `$user_email` e `$user_id` são removidas
- ✅ Valores reais aparecem na URL
- ✅ URL encoding correto

### 2. Segurança: HTTP + $token (Bloqueado)

```typescript
URL cadastrada: http://insecure-site.com/dashboard?token=$token
Resultado: ❌ ERRO exibido na tela
```

**Validações:**

- ✅ Iframe não é renderizado
- ✅ Mensagem de erro aparece
- ✅ Erro menciona "HTTPS"

### 3. Segurança: HTTPS + $token (Permitido)

```typescript
URL cadastrada: https://trusted-site.com/api/view?token=$token
URL processada: https://trusted-site.com/api/view?token=eyJhbGc...
```

**Validações:**

- ✅ Iframe é renderizado
- ✅ Variável `$token` é substituída
- ✅ URL começa com `https://`
- ✅ Console warnings aparecem

### 4. URLs Estáticas (Sem Variáveis)

```typescript
URL cadastrada: https://example.com/static-page
URL processada: https://example.com/static-page
```

**Validações:**

- ✅ URL permanece exatamente igual
- ✅ Iframe renderiza normalmente
- ✅ Sem processamento desnecessário

## 🐛 Debug de Falhas

### Teste falha no login

Se o teste falhar no login:

```bash
# Verificar se o Directus está rodando
docker ps | grep directus-inframe

# Reiniciar containers
docker compose down
docker compose up -d

# Aguardar Directus iniciar (30-60s)
# Rodar testes novamente
```

### Teste falha ao encontrar elementos

Aumentar timeouts:

```typescript
test.setTimeout(180000); // 3 minutos
await sharedPage.waitForTimeout(3000); // Aguardar mais tempo
```

### Console warnings não aparecem

Os warnings aparecem no console do navegador, não nos logs do Playwright. Para ver:

```bash
# Rodar com headed para ver console do browser
npx playwright test --headed
```

Ou capturar console messages no teste:

```typescript
sharedPage.on('console', (msg) => console.log('BROWSER:', msg.text()));
```

## 📈 Resultados Esperados

Todos os 8 testes devem passar:

```
✓ should have inframe collection created
✓ should create inframe item with dynamic variables
✓ should navigate to inframe module
✓ should display inframe items in grid
✓ should process URL variables when clicking on item
✓ should show security error for HTTP + $token
✓ should allow HTTPS + $token
✓ should handle URLs without variables

8 passed (Xm Xs)
```

## 🔍 O que os Testes NÃO Cobrem (Task-002)

- [ ] Testes unitários isolados para `replaceVariables()`
- [ ] Testes de permissões por role
- [ ] Testes de whitelist de domínios
- [ ] Testes de logs de auditoria
- [ ] Testes de campo `is_trusted`
- [ ] Testes de XSS/injection via variáveis

Estes serão implementados na task-002 como parte das melhorias de segurança.

## 📝 Manutenção

### Adicionar novo teste

1. Adicione o teste em `dynamic-url-variables.spec.ts`
2. Use o padrão existente (beforeAll, shared context)
3. Aumente timeout se necessário: `test.setTimeout(120000)`
4. Rode localmente antes de commitar: `pnpm test:e2e`

### Atualizar seletores

Se o Directus mudar a UI, atualizar seletores:

- `button:has-text("Create Item")` → texto do botão
- `.card, [class*="card"]` → classe dos cards
- `.error-state` → classe do erro

## 🎬 Ver Relatório dos Testes

Após rodar os testes:

```bash
pnpm test:e2e:report
```

Abre relatório HTML com screenshots e detalhes.
