# Task 001 — suportar variaveis dinamicas na url do inframe

Status: pending
Type: feat
Assignee: Sidarta Veloso

## Description

Implementar suporte para variáveis dinâmicas nas URLs dos iframes, permitindo personalização e autenticação automática com sistemas externos.

### Problema
Atualmente, as URLs dos iframes são estáticas. Muitos sistemas externos (BI tools, dashboards, reports) precisam receber informações do usuário logado no Directus para:
- Autenticação SSO/Single Sign-On
- Personalização de conteúdo por usuário
- Controle de acesso e permissões
- Auditoria e logs de acesso

### Solução
Permitir uso de variáveis placeholder na URL que serão substituídas dinamicamente com dados do usuário/sessão atual.

**Exemplo:**
```
URL cadastrada: https://metabase.com/dashboard/123?token=$token&user=$user_email
URL renderizada: https://metabase.com/dashboard/123?token=eyJhbGc...&user=user@example.com
```

### Variáveis a Implementar

**Autenticação:**
- `$token` - Token JWT da sessão Directus (access token)
- `$refresh_token` - Refresh token (se disponível)

**Identidade do Usuário:**
- `$user_id` - ID do usuário
- `$user_email` - Email do usuário
- `$user_name` - Nome completo
- `$user_first_name` - Primeiro nome
- `$user_last_name` - Sobrenome

**Permissões:**
- `$user_role` - Role principal do usuário
- `$user_roles` - Lista de roles (JSON array ou comma-separated)

**Contexto:**
- `$timestamp` - Timestamp atual (ISO 8601)
- `$locale` - Idioma do usuário (pt-BR, en-US, etc)

## Tasks

- [ ] Criar composable `src/utils/useUrlVariableReplacement.ts`
  - [ ] Função `getUserData()` para buscar dados do usuário via API `/users/me`
  - [ ] Função `getAccessToken()` para obter token da sessão
  - [ ] Função `replaceVariables(url, userData, token)` para substituir placeholders
  - [ ] Adicionar tratamento de erros e fallbacks

- [ ] Modificar `src/components/ItemDetail.vue`
  - [ ] Importar e usar `useUrlVariableReplacement()`
  - [ ] Buscar dados do usuário no `onMounted`
  - [ ] Aplicar replace de variáveis antes de passar URL para iframe
  - [ ] Adicionar loading state durante fetch de user data
  - [ ] Tratar erros de API

- [ ] Adicionar tipos TypeScript
  - [ ] Interface `UserData` em `src/types.ts`
  - [ ] Interface `VariableReplacementOptions`
  - [ ] Tipos para funções do composable

- [ ] Atualizar documentação
  - [ ] README.md - seção "Dynamic URL Variables"
  - [ ] Adicionar exemplos práticos de uso
  - [ ] Listar todas as variáveis disponíveis
  - [ ] Adicionar warnings de segurança
  - [ ] CONTRIBUTING.md - explicar o sistema de variáveis

- [ ] Testes
  - [ ] Testes unitários para `replaceVariables()`
  - [ ] Testes de integração E2E
  - [ ] Validar substituição de todas as variáveis
  - [ ] Validar comportamento com variáveis inexistentes
  - [ ] Validar URLs sem variáveis (não devem quebrar)

- [ ] Validações e Segurança
  - [ ] Adicionar validação de HTTPS quando usar `$token`
  - [ ] Console warning se usar `$token` com HTTP
  - [ ] Documentar riscos de segurança no README
  - [ ] URL encoding automático dos valores substituídos

## Notes

### Considerações de Segurança

⚠️ **IMPORTANTE - Uso de $token:**
- Expor o token JWT na URL pode ser arriscado se o site externo não for confiável
- Tokens na URL podem aparecer em logs de servidor, histórico do browser, etc.
- **Recomendação**: Usar apenas com sites HTTPS e confiáveis
- Adicionar warning visual no Directus quando cadastrar URL com `$token`?

### Exemplos de Uso Real

**Power BI com autenticação:**
```
https://app.powerbi.com/view?token=$token&user_id=$user_id
```

**Metabase com user context:**
```
https://metabase.company.com/dashboard/sales?user=$user_email&role=$user_role
```

**Grafana com SSO:**
```
https://grafana.company.com/d/dashboard123?auth_token=$token
```

**Analytics personalizado:**
```
https://analytics.com/view?viewer=$user_email&timestamp=$timestamp&locale=$locale
```

### Implementação Técnica

**Buscar dados do usuário:**
```typescript
const api = useApi();
const response = await api.get('/users/me', {
  params: {
    fields: ['id', 'email', 'first_name', 'last_name', 'role', 'language']
  }
});
```

**Obter access token:**
O token está disponível no `localStorage` ou pode ser obtido via SDK do Directus.

**Replace de variáveis:**
```typescript
function replaceVariables(url: string, userData: UserData, token: string): string {
  return url
    .replace(/\$token/g, encodeURIComponent(token))
    .replace(/\$user_id/g, encodeURIComponent(userData.id))
    .replace(/\$user_email/g, encodeURIComponent(userData.email))
    // ... etc
}
```

### Arquivos Afetados

- `src/utils/useUrlVariableReplacement.ts` (novo)
- `src/components/ItemDetail.vue` (modificar)
- `src/types.ts` (adicionar interfaces)
- `README.md` (documentação)
- `CONTRIBUTING.md` (explicar funcionalidade)
- `tests/` (novos testes)

### Links Relacionados

- Directus API Users: https://docs.directus.io/reference/system/users.html
- Directus SDK Auth: https://docs.directus.io/guides/sdk/authentication.html
