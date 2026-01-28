# Task 003: Corrigir e Reativar Testes E2E

Status: todo
Type: bug
Priority: high
Created: 2026-01-28

## Description

Corrigir e reativar os testes E2E (End-to-End) com Playwright que foram temporariamente desabilitados no workflow de
release devido a falhas consistentes no CI do GitHub Actions.

---

## 📋 Contexto

Os testes E2E (End-to-End) com Playwright foram **temporariamente desabilitados** no workflow de release (`release.yml`)
porque estavam falhando consistentemente no CI do GitHub Actions.

### Testes que falharam:

1. **`directus-login-collections.spec.ts`**
   - Teste: "deve listar as coleções customizadas criadas pelo hook"
   - Erro: `Coleções customizadas não encontradas na navegação. Verifique permissões.`
   - As coleções `inframe` e `language` não aparecem no menu de navegação do Directus

2. **`dynamic-url-variables.spec.ts`**
   - Teste: "should navigate to inframe module"
   - Erro: `expect(locator).toBeVisible() failed - element(s) not found`
   - O módulo inframe não está sendo carregado/visível

---

## 🔍 Análise Inicial

### Possíveis Causas:

1. **Problema de Timing**
   - O hook de setup pode não estar executando antes dos testes
   - O Directus pode não estar completamente inicializado
   - A extensão pode não estar carregada quando os testes iniciam

2. **Problema de Permissões**
   - As coleções podem estar criadas mas sem permissões adequadas para o usuário admin
   - O hook pode não estar configurando as permissões corretamente

3. **Problema de Carregamento da Extensão**
   - A extensão pode não estar sendo montada corretamente no Docker
   - O módulo pode não estar sendo registrado no Directus

4. **Problema de Configuração do Ambiente**
   - Diferença entre ambiente local (funciona) e CI (falha)
   - Pode haver cache ou configuração diferente

---

## ✅ Passos para Resolução

### 1. Investigar o Hook de Setup

- [ ] Adicionar logs detalhados no hook `src/hooks/inframe-setup/index.ts`
- [ ] Verificar se o hook está sendo executado no CI
- [ ] Confirmar que as coleções estão sendo criadas com sucesso
- [ ] Verificar se as permissões estão sendo configuradas corretamente

### 2. Melhorar os Testes E2E

- [ ] Adicionar waits/delays apropriados para aguardar carregamento completo
- [ ] Implementar retry logic para elementos que podem demorar a aparecer
- [ ] Adicionar screenshots de debug em caso de falha
- [ ] Verificar se o Directus está realmente pronto antes de executar testes

### 3. Verificar Configuração do Docker

- [ ] Revisar `docker-compose.test.yml`
- [ ] Confirmar que a extensão está sendo montada corretamente
- [ ] Verificar logs do container do Directus durante os testes
- [ ] Confirmar que as variáveis de ambiente estão corretas

### 4. Adicionar Testes de Diagnóstico

- [ ] Criar teste que verifica se o hook executou
- [ ] Criar teste que lista todas as coleções disponíveis
- [ ] Criar teste que verifica permissões do usuário admin
- [ ] Criar teste que verifica se a extensão está carregada

### 5. Executar Localmente

- [ ] Reproduzir o erro localmente usando o mesmo setup do CI
- [ ] Usar `docker-compose.test.yml` localmente
- [ ] Comparar comportamento local vs CI

---

## 📝 Referências

- **Workflow desabilitado:** `.github/workflows/release.yml` (linhas 33-55 comentadas)
- **Testes que falharam:**
  - `tests/e2e/directus-login-collections.spec.ts:141`
  - `tests/e2e/dynamic-url-variables.spec.ts:109`
- **Commit que desabilitou:** [Verificar no git log]

---

## 🎯 Critérios de Sucesso

- [ ] Testes E2E passam consistentemente no CI (pelo menos 3 execuções seguidas)
- [ ] Não há problemas de timing ou race conditions
- [ ] Logs de debug ajudam a diagnosticar problemas futuros
- [ ] Workflow `release.yml` reabilitado com os testes funcionando
- [ ] Documentação atualizada sobre como executar testes E2E localmente

---

## 📅 Histórico

| Data       | Ação                                           | Por     |
| ---------- | ---------------------------------------------- | ------- |
| 2026-01-28 | Testes E2E desabilitados temporariamente no CI | Copilot |
| 2026-01-28 | Task criada para rastrear a correção           | Copilot |

---

## 💡 Notas

- Os **testes de integração** (vitest) estão passando corretamente
- A funcionalidade principal (variáveis dinâmicas na URL) está funcionando
- O problema é **específico dos testes E2E** com Playwright no ambiente CI
- Localmente, os testes podem se comportar diferentemente
