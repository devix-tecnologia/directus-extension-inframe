# Testing Documentation

Este documento descreve a estratégia de testes implementada para a extensão `directus-extension-inframe`.

## Estrutura de Testes

### Arquivos de Teste

- `tests/index.spec.ts` - Testes principais da extensão
- `tests/setup.ts` - Configuração do ambiente de teste
- `tests/helper_test.ts` - Funções auxiliares para testes
- `tests/test-env.ts` - Configuração de variáveis de ambiente
- `tests/test-logger.ts` - Logger para testes
- `tests/directus-versions.js` - Lista de versões do Directus para testar

### Configuração de Testes

- `vitest.config.js` - Configuração do Vitest
- `docker-compose.test.yml` - Container Docker para testes
- `tsconfig.test.json` - Configuração TypeScript para testes

## Estratégia de Testes

### Testes de Compatibilidade

Os testes são executados contra múltiplas versões do Directus para garantir compatibilidade:

- **Directus 9.x**: Versões finais da linha 9.x
- **Directus 10.x**: Versões estáveis da linha 10.x
- **Directus 11.x**: Versões mais recentes da linha 11.x
- **Latest**: Sempre a versão mais recente disponível

### Testes Implementados

1. **Configuração da Extensão**
   - Verifica se a extensão tem a configuração correta (id, nome, ícone)
   - Testa se as rotas estão configuradas adequadamente

2. **Integração com Directus**
   - Cria uma coleção de teste dinamicamente
   - Insere itens de teste com diferentes status
   - Verifica se a API do Directus está funcionando

3. **Funcionalidade da Extensão**
   - Testa filtros de itens publicados vs rascunhos
   - Verifica estrutura dos dados retornados
   - Valida URLs e títulos dos itens

4. **Compatibilidade entre Versões**
   - Verifica se a extensão funciona em diferentes versões do Directus
   - Identifica quebras de compatibilidade automaticamente

## Executando os Testes

### Localmente

```bash
# Instalar dependências
pnpm install

# Executar todos os testes
pnpm test

# Executar testes em modo watch
pnpm test:watch

# Executar com coverage
pnpm test:coverage

# Testar com versão específica do Directus
DIRECTUS_VERSION=11.10.2 pnpm test
```

### Docker

```bash
# Iniciar container de teste
docker compose -f docker-compose.test.yml up -d

# Parar container
docker compose -f docker-compose.test.yml down

# Ver logs do container
docker compose -f docker-compose.test.yml logs
```

## CI/CD

### GitHub Actions

- **CI Workflow** (`.github/workflows/ci.yml`):
  - Executa em push/PR para `main` e `develop`
  - Roda lint, build e testes
  - Usa matriz de versões do Directus

- **Release Workflow** (`.github/workflows/release.yml`):
  - Executa apenas na branch `main`
  - Faz release automático com semantic-release
  - Atualiza versões do Directus automaticamente (cron diário)

### Dependabot

Configurado em `.github/dependabot.yml` para:

- Atualizar dependências npm semanalmente
- Atualizar GitHub Actions
- Agrupar dependências relacionadas

## Estrutura do Container de Teste

O `docker-compose.test.yml` configura:

- **Directus**: Imagem oficial com versão variável
- **Banco**: SQLite em memória (tmpfs)
- **Storage**: Sistema de arquivos temporário
- **Rede**: Rede isolada para testes

### Variáveis de Ambiente

```env
DIRECTUS_VERSION=latest
DIRECTUS_PUBLIC_URL=http://localhost:18055
DIRECTUS_ADMIN_EMAIL=admin@example.com
DIRECTUS_ADMIN_PASSWORD=admin123
DEBUG_TESTS=false
```

## Manutenção

### Atualizando Versões do Directus

As versões são atualizadas automaticamente via:

- Cron job diário no GitHub Actions
- Script `.github/scripts/updateDirectusVersions.js`
- Pull request automático com as novas versões

### Versões Bloqueadas

Versões problemáticas podem ser bloqueadas em `directus-versions.js`:

```javascript
export const blockedDirectusVersions = ['11.10.1'];
```

## Troubleshooting

### Testes Falhando

1. Verificar se o Docker está rodando
2. Verificar se a porta 18055 está disponível
3. Checar logs do container: `docker compose -f docker-compose.test.yml logs`
4. Limpar containers: `docker compose -f docker-compose.test.yml down --volumes`

### Timeout nos Testes

- Aumentar timeout em `vitest.config.js`
- Verificar se o Directus está iniciando corretamente
- Checar recursos do sistema (memória, CPU)

### Problemas de Rede

- Verificar configuração de rede no Docker
- Testar conectividade: `curl http://localhost:18055/server/health`
- Verificar firewall/proxy

## Referências

- [Vitest Documentation](https://vitest.dev/)
- [Directus Extensions Documentation](https://docs.directus.io/extensions/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
