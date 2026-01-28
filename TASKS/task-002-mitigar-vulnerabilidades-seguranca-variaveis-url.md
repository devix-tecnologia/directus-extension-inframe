# Task 002 — Mitigar vulnerabilidades de segurança das variáveis dinâmicas na URL

Status: done
Type: security
Assignee: Sidarta Veloso
Priority: high
Depends on: task-001

## Description

Implementar camadas de segurança para mitigar os riscos de usar `$token` e outras variáveis sensíveis nas URLs dos
iframes.

### Problema

A task-001 introduz riscos de segurança significativos:

- **Token na URL**: Expõe JWT em logs, histórico, referrer headers
- **Session hijacking**: URLs com token podem ser interceptadas/compartilhadas
- **Sites maliciosos**: Admin pode cadastrar iframe apontando para site não confiável
- **PII exposure**: Dados pessoais do usuário expostos na URL
- **LGPD/GDPR**: Violação de regulamentações de privacidade

### Solução

Implementar múltiplas camadas de proteção para reduzir (não eliminar completamente) os riscos quando `$token` for usado.

**⚠️ IMPORTANTE**: Esta task mitiga, mas NÃO elimina todos os riscos. O uso de token em URL continua sendo uma prática
insegura por natureza.

## Tasks

### 1. Validações de Segurança no Frontend

- [ ] Criar `src/utils/useSecurityValidation.ts`
  - [ ] Função `validateHttps(url)` - rejeitar HTTP quando usar $token
  - [ ] Função `validateTrustedDomain(url, trustedDomains)` - validar whitelist
  - [ ] Função `hasSecurityRisk(url)` - detectar variáveis sensíveis
  - [ ] Função `getSecurityLevel(url)` - retornar nível de risco (low/medium/high)

- [ ] Modificar `src/components/ItemDetail.vue`
  - [ ] Adicionar validação HTTPS antes de renderizar iframe
  - [ ] Bloquear renderização se URL com $token usar HTTP
  - [ ] Exibir erro visual se validação falhar
  - [ ] Log de erro no console com detalhes

### 2. Campo "Trusted" na Collection

- [ ] Modificar `schema.json`
  - [ ] Adicionar campo `is_trusted` (boolean) na collection `inframe`
  - [ ] Adicionar campo `trusted_by` (user relation) - quem marcou como trusted
  - [ ] Adicionar campo `trusted_at` (datetime) - quando foi marcado
  - [ ] Adicionar campo `trusted_domains` (JSON array) - whitelist de domínios

- [ ] Atualizar hook `src/hooks/inframe-setup/index.ts`
  - [ ] Incluir novos campos na criação automática da collection
  - [ ] Migração para instâncias existentes

- [ ] Validar no frontend
  - [ ] Bloquear uso de $token se `is_trusted = false`
  - [ ] Exibir mensagem: "Este iframe não está marcado como confiável"

### 3. Permissões e Controle de Acesso

- [ ] Criar lógica de permissões
  - [ ] Verificar role do usuário via `/users/me`
  - [ ] Permitir $token apenas para roles específicas (admin, trusted_user)
  - [ ] Criar constante `ROLES_ALLOWED_TOKEN` no código

- [ ] Modificar `src/utils/useUrlVariableReplacement.ts`
  - [ ] Adicionar parâmetro `userRole` nas funções
  - [ ] Validar permissão antes de substituir $token
  - [ ] Se não tiver permissão, retornar URL sem substituir ou erro

- [ ] Documentar permissões
  - [ ] Adicionar seção no README sobre controle de acesso
  - [ ] Explicar como configurar roles permitidas

### 4. Warnings Visuais e Alertas

- [ ] Criar componente `src/components/SecurityWarning.vue`
  - [ ] Exibir alerta quando URL contém $token
  - [ ] Listar riscos de segurança
  - [ ] Botão "Entendi os riscos" para confirmar
  - [ ] Persistir confirmação no localStorage (por sessão)

- [ ] Adicionar warnings no Directus Admin
  - [ ] Toast/notification ao salvar iframe com $token
  - [ ] Modal de confirmação com checklist de segurança
  - [ ] Documentação inline nos campos

- [ ] Console warnings
  - [ ] `console.warn()` quando $token é usado
  - [ ] Exibir URL do iframe e riscos associados

### 5. Logs de Auditoria

- [ ] Implementar logging (frontend)
  - [ ] Logar quando $token é usado (console + localStorage)
  - [ ] Incluir: timestamp, user_id, iframe_id, url_pattern
  - [ ] Criar `src/utils/useAuditLog.ts`

- [ ] Implementar logging (backend - opcional)
  - [ ] Hook para logar uso de iframes com variáveis sensíveis
  - [ ] Salvar em collection `inframe_audit_logs`
  - [ ] Campos: user, iframe, timestamp, action, ip_address

### 6. Whitelist de Domínios Confiáveis

- [ ] Criar sistema de whitelist
  - [ ] Adicionar campo `allowed_domains` (JSON) na collection `directus_settings`
  - [ ] Interface no admin para gerenciar domínios confiáveis
  - [ ] Validar domínio do iframe contra whitelist

- [ ] Implementar validação de domínio
  - [ ] Função `extractDomain(url)` para pegar domínio base
  - [ ] Função `isDomainWhitelisted(domain, whitelist)`
  - [ ] Bloquear $token se domínio não estiver na whitelist

- [ ] Domínios pré-aprovados (sugestão)
  ```json
  {
    "trusted_domains": ["app.powerbi.com", "public.tableau.com", "metabase.company.com", "grafana.company.com"]
  }
  ```

### 7. URL Encoding e Sanitização

- [ ] Melhorar função de replace
  - [ ] Aplicar `encodeURIComponent()` em TODOS os valores substituídos
  - [ ] Sanitizar caracteres especiais
  - [ ] Prevenir injection via variáveis malformadas

- [ ] Validar URL final
  - [ ] Verificar se URL é válida após replace
  - [ ] Rejeitar URLs com caracteres suspeitos
  - [ ] Try/catch em new URL() para validação

### 8. Documentação de Segurança

- [ ] Atualizar `README.md`
  - [ ] Seção "⚠️ Security Considerations"
  - [ ] Listar todos os riscos do uso de $token
  - [ ] Best practices para uso seguro
  - [ ] Alternativas mais seguras (backend proxy)
  - [ ] Compliance (LGPD/GDPR)

- [ ] Criar `SECURITY.md` no root do projeto
  - [ ] Política de segurança
  - [ ] Como reportar vulnerabilidades
  - [ ] Riscos conhecidos e mitigações
  - [ ] Responsabilidade do usuário

- [ ] Atualizar `CONTRIBUTING.md`
  - [ ] Seção sobre segurança
  - [ ] Checklist de segurança para PRs
  - [ ] Testes de segurança obrigatórios

### 9. Testes de Segurança

- [ ] Testes unitários
  - [ ] Testar validação HTTPS
  - [ ] Testar whitelist de domínios
  - [ ] Testar validação de permissões
  - [ ] Testar URL encoding

- [ ] Testes E2E
  - [ ] Tentar usar $token com HTTP (deve falhar)
  - [ ] Tentar usar $token sem permissão (deve falhar)
  - [ ] Tentar usar domínio não-whitelisted (deve falhar)
  - [ ] Validar warnings aparecem corretamente

- [ ] Testes de segurança
  - [ ] Tentar injection via variáveis
  - [ ] Tentar bypass de validações
  - [ ] Testar XSS via URL malformada

### 10. Feature Flags (Opcional)

- [ ] Adicionar toggle para desabilitar $token
  - [ ] Variável de ambiente `ENABLE_TOKEN_VARIABLE=false`
  - [ ] Permitir admins desabilitarem via settings
  - [ ] Default: disabled (opt-in explícito)

## Notes

### ⚠️ Disclaimer Crítico

**ESTA TASK NÃO ELIMINA TODOS OS RISCOS!**

Mesmo com todas as proteções implementadas, o uso de `$token` na URL continua sendo inerentemente inseguro porque:

1. ❌ Token aparecerá em logs do servidor externo (não podemos controlar)
2. ❌ Token ficará no histórico do navegador
3. ❌ Token pode vazar via Referer header
4. ❌ Usuário pode copiar/compartilhar URL com token
5. ❌ Proxies/CDNs podem logar o token

**As mitigações desta task apenas reduzem a superfície de ataque, não a eliminam.**

### Alternativas Mais Seguras (Futuras)

**Task 003 (Futura)**: Implementar backend proxy que:

- ✅ Token nunca sai do servidor
- ✅ Backend faz a requisição
- ✅ Frontend recebe apenas o conteúdo
- ✅ Zero exposição de credenciais

### Implementação de Emergência

Como esta funcionalidade precisa ser entregue hoje com SSO:

**Fase 1 (MVP - Hoje)**: Implementar apenas:

- ✅ Validação HTTPS obrigatório
- ✅ Console warning
- ✅ Documentação dos riscos

**Fase 2 (Próximos dias)**: Adicionar:

- ✅ Campo `is_trusted`
- ✅ Permissões por role
- ✅ Warnings visuais

**Fase 3 (Médio prazo)**: Completar:

- ✅ Whitelist de domínios
- ✅ Logs de auditoria
- ✅ Testes de segurança completos

### Responsabilidade Legal

Adicionar disclaimer no README e no admin:

```
⚠️ AVISO LEGAL

O uso de tokens de autenticação em URLs é considerado uma prática insegura
pela indústria de segurança. Esta funcionalidade é fornecida "AS IS" e o
desenvolvedor/administrador assume todos os riscos relacionados ao seu uso.

Recomendamos fortemente:
- Usar apenas com sites HTTPS e totalmente confiáveis
- Não usar em ambientes de produção sem aprovação de segurança
- Considerar alternativas mais seguras (backend proxy)
- Auditar regularmente o uso desta funcionalidade

Para ambientes críticos, considere implementar um proxy server que mantenha
os tokens no backend.
```

### Checklist de Segurança (Antes de Usar)

Adicionar no README checklist para admins:

- [ ] O site externo usa HTTPS?
- [ ] O site externo é totalmente confiável?
- [ ] Você controla/conhece o site externo?
- [ ] O site não loga URLs completas?
- [ ] Você tem aprovação de segurança/compliance?
- [ ] Usuários foram informados dos riscos?
- [ ] Há acordo de confidencialidade com o site externo?
- [ ] Existem alternativas mais seguras disponíveis?

**Se respondeu NÃO para qualquer item, NÃO use $token!**

### Links de Referência

- OWASP Top 10 - Broken Authentication: https://owasp.org/www-project-top-ten/
- RFC 6750 - Bearer Token Usage: https://tools.ietf.org/html/rfc6750
- NIST Authentication Guidelines: https://pages.nist.gov/800-63-3/
- LGPD - Lei Geral de Proteção de Dados: https://www.gov.br/lgpd/
- GDPR - General Data Protection Regulation: https://gdpr.eu/

### Arquivos Afetados

**Novos:**

- `src/utils/useSecurityValidation.ts`
- `src/utils/useAuditLog.ts`
- `src/components/SecurityWarning.vue`
- `SECURITY.md`

**Modificados:**

- `schema.json` (campos de segurança)
- `src/hooks/inframe-setup/index.ts` (novos campos)
- `src/components/ItemDetail.vue` (validações)
- `src/utils/useUrlVariableReplacement.ts` (permissões)
- `README.md` (documentação de segurança)
- `CONTRIBUTING.md` (checklist de segurança)
- `tests/` (novos testes de segurança)
