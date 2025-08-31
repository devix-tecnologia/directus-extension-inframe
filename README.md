# Directus - Extensão Module inFrame

Este projeto é uma extensão do tipo Module para o Directus voltada para visualização de conteúdo em iframes.

## ✨ Funcionalidades

### 🔄 Persistência de Navegação (Novo!)

A extensão agora inclui um sistema avançado de persistência de navegação que permite que você continue exatamente de
onde parou em sua última sessão.

**Principais benefícios:**

- **Continuidade de trabalho:** retome instantaneamente suas atividades sem perder o contexto
- **Navegação simplificada:** economize tempo ao evitar repetir passos de navegação
- **Experiência personalizada:** o sistema se adapta ao seu fluxo de trabalho individual
- **Múltiplas estratégias:** utiliza localStorage e parâmetros de URL para máxima confiabilidade

**Como funciona:**

- Salva automaticamente a rota atual sempre que você navega para uma nova página
- Restaura sua última visualização quando você retorna à aplicação
- Funciona mesmo após recarregar a página ou fechar/abrir o navegador
- Integrado nativamente com o sistema de roteamento do Directus

A Persistência de Navegação funciona discretamente em segundo plano, sem comprometer o desempenho ou exigir
configurações adicionais.

## 🧪 Testes

Esta extensão inclui testes automatizados que verificam a compatibilidade com diferentes versões do Directus.

### Estrutura de Testes

```
tests/
├── index.spec.ts          # Testes principais
├── setup.ts              # Configuração do ambiente
├── helper_test.ts        # Funções auxiliares
├── test-env.ts           # Variáveis de ambiente
├── test-logger.ts        # Sistema de logs
└── directus-versions.js  # Versões testadas
```

### Executando os testes

```bash
# Instalar dependências
pnpm install

# Executar todos os testes
pnpm test

# Executar testes em modo watch
pnpm test:watch

# Executar testes com coverage
pnpm test:coverage
```

### Testando com diferentes versões do Directus

Os testes são executados automaticamente com múltiplas versões do Directus usando Docker:

```bash
# Testar com uma versão específica
DIRECTUS_VERSION=11.10.2 pnpm test

# Iniciar container de teste manualmente
docker compose -f docker-compose.test.yml up -d

# Parar container de teste
docker compose -f docker-compose.test.yml down
```

### Versões do Directus testadas

Os testes são executados nas seguintes versões:

- Directus 9.x (últimas versões estáveis)
- Directus 10.x (últimas versões estáveis)
- Directus 11.x (últimas versões estáveis)
- Directus latest

## 💎 Usando a extensão

- Ative o novo módulo na página de configurações do Directus;
- Crie uma nova Coleção com nome de `inframe` e adicione os seguintes campos:
  ` "id", "sort", "status", "icon", "url", "thumbnail", "translations.languages_code", "translations.title"`;

- [Veja mais sobre traduções aqui](https://docs.directus.io/guides/headless-cms/content-translations.html)

![Tela de visualização da extensão](docs/tela.jpg)

## 🚀 Levantando um Directus a partir de docker-compose

- Baixe este projeto ou copie o arquivo `docker-compose.yml` e inicie uma instalação do zero;
- Com o docker instalado na máquina ([saiba mais](https://docs.docker.com/get-docker/)), rode o comando:

```
 docker compose up
```

> [!IMPORTANT] _O docker-compose usado neste projeto está configurado para permitir iframe de qualquer domínio. Em
> produção você deve liberar apenas domínios confiáveis."_

```yaml
CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC: '*' # permite iframe de qualquer domínio
```
