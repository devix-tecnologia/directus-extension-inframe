# Directus - Extensão Module inFrame

Este projeto é uma extensão do tipo Module para o Directus voltada para visualização de conteúdo em iframes.

## ✨ Funcionalidades

### � Setup Automático de Coleções (Novo!)

A extensão agora cria **automaticamente** todas as coleções, campos e relações necessárias quando instalada!

**Você não precisa mais:**

- Criar manualmente a coleção `inframe`
- Configurar campos um por um
- Criar relações de tradução
- Seguir tutoriais complexos de setup

**O que acontece automaticamente:**

- ✅ Criação da coleção `inframe` (relatórios)
- ✅ Criação da coleção `languages` (idiomas)
- ✅ Criação da coleção `inframe_translations` (traduções)
- ✅ Criação da coleção `inframe_pasta` (organização em pastas)
- ✅ Configuração de todos os campos necessários
- ✅ Criação de relações entre coleções

**Como funciona:**

1. Instale a extensão normalmente (`npm install` ou através da UI do Directus)
2. Reinicie o servidor Directus
3. Pronto! As coleções estarão criadas e prontas para uso

O hook de setup roda automaticamente quando:

- O servidor Directus é iniciado
- A extensão é instalada
- As extensões são recarregadas

📖 [Veja mais detalhes técnicos sobre o setup automático](./docs/AUTO_SETUP.md)

### 🔄 Persistência de Navegação

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

Os testes são executados automaticamente com múltiplas versões do Directus usando Docker.

**Testar com todas as versões configuradas:**

```bash
pnpm test
```

**Testar com uma versão específica do Directus:**

```bash
# Usando a variável de ambiente
DIRECTUS_TEST_VERSION=10.8.3 pnpm test:version

# Ou definir ambas as variáveis para controle completo
DIRECTUS_TEST_VERSION=11.10.2 DIRECTUS_VERSION=11.10.2 pnpm test:version
```

**Gerenciar container de teste manualmente:**

```bash
# Iniciar container com versão específica
DIRECTUS_VERSION=10.8.3 docker compose -f docker-compose.test.yml up -d

# Parar container de teste
docker compose -f docker-compose.test.yml down

# Ver logs do container
docker compose -f docker-compose.test.yml logs -f
```

### Versões do Directus testadas

Os testes são executados nas seguintes versões:

- Directus 9.x (últimas versões estáveis)
- Directus 10.x (últimas versões estáveis)
- Directus 11.x (últimas versões estáveis)
- Directus latest

## 💎 Usando a extensão

**Setup é automático!** As coleções necessárias são criadas automaticamente quando você:

1. Instala a extensão no Directus
2. Inicia/reinicia o servidor

**Não é necessário criar manualmente nenhuma coleção.** ✨

Após a instalação, você verá:

- ✅ Coleção `inframe` para gerenciar relatórios
- ✅ Coleção `languages` para idiomas
- ✅ Coleção `inframe_translations` para traduções
- ✅ Novo módulo "Relatórios" no menu do Directus

### Adicionando Relatórios

1. Acesse o módulo "Relatórios" no menu lateral
2. Clique em "Criar novo"
3. Preencha os campos:
   - **Título**: Nome do relatório
   - **URL**: Link do iframe a ser exibido
   - **Status**: Publicado/Rascunho
   - **Ícone**: Ícone do Material Design
   - **Traduções**: Traduções para outros idiomas

### Configuração Manual (Legado)

<details>
<summary>Se por algum motivo o setup automático falhar, você ainda pode criar manualmente:</summary>

- Ative o novo módulo na página de configurações do Directus;
- Crie uma nova Coleção com nome de `inframe` e adicione os seguintes campos:
  ` "id", "sort", "status", "icon", "url", "thumbnail", "translations.languages_code", "translations.title"`;

- [Veja mais sobre traduções aqui](https://docs.directus.io/guides/headless-cms/content-translations.html)

</details>

![Tela de visualização da extensão](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/develop/docs/tela.jpg)

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
