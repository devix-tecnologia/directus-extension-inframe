# Instruções do GitHub Copilot para Extensão Directus inFrame

## Sobre o Projeto

Este é um projeto de extensão do tipo **Module** para o Directus CMS, voltado para visualização de conteúdo em iframes.
A extensão permite aos usuários configurar e visualizar sites externos dentro do painel administrativo do Directus.

## Arquitetura e Tecnologias

- **Framework**: Vue 3 com Composition API
- **Build**: Directus Extensions SDK
- **Linguagem**: TypeScript
- **Linting**: ESLint com configuração para Vue
- **Formatação**: Prettier
- **Gerenciador de Pacotes**: pnpm

## Estrutura do Projeto

```
src/
├── index.ts          # Definição principal do módulo Directus
├── List.vue          # Componente de listagem principal
├── types.ts          # Definições de tipos TypeScript
├── shims.d.ts        # Declarações de tipos para Vue
├── components/
│   ├── ItemDetail.vue # Componente de detalhes do item
│   └── NavMenu.vue    # Componente de menu de navegação
└── utils/
    └── useFetchItems.ts # Composable para buscar dados
```

## Convenções de Código

### TypeScript

- Use sempre tipagem estrita
- Defina interfaces para objetos complexos em `types.ts`
- Use tipos do Directus quando disponíveis (`@directus/types`)

### Vue 3

- **SEMPRE** use Composition API com `<script setup>`
- Use composables para lógica reutilizável (padrão `use*`)
- Componentes devem ter nomes em PascalCase
- Props devem ser tipadas com interfaces do TypeScript

### Padrões de Nomenclatura

- Arquivos de componentes: PascalCase (ex: `ItemDetail.vue`)
- Composables: camelCase iniciando com "use" (ex: `useFetchItems.ts`)
- Variáveis e funções: camelCase
- Constantes: UPPER_SNAKE_CASE
- Interfaces: PascalCase com prefixo "I" opcional

### Estrutura de Componentes Vue

```vue
<template>
  <!-- HTML template -->
</template>

<script setup lang="ts">
// Imports
// Props/Emits definitions
// Composables usage
// Reactive data
// Computed properties
// Methods
// Lifecycle hooks
</script>

<style scoped>
/* Componente-specific styles */
</style>
```

## Integração com Directus

### Módulo Definition

- O módulo é definido em `src/index.ts` usando `defineModule`
- ID do módulo: `'inframe'`
- Nome exibido: `'Relatórios'`
- Ícone: `'document_scanner'`

### Rotas

- Rota principal (`''`): Lista de itens (componente `List.vue`)
- Rota dinâmica (`':id'`): Detalhes do item (componente `ItemDetail.vue`)

### Estrutura de Dados Esperada

A extensão espera uma coleção chamada `inframe` com os seguintes campos:

- `id`: Identificador único
- `sort`: Ordem de exibição
- `status`: Status do item
- `icon`: Ícone do item
- `url`: URL do iframe
- `thumbnail`: Imagem de miniatura
- `translations.languages_code`: Código do idioma
- `translations.title`: Título traduzido

## Guidelines para Desenvolvimento

### Ao Criar Novos Componentes

1. Sempre usar TypeScript com tipagem estrita
2. Implementar Composition API com `<script setup>`
3. Adicionar props tipadas quando necessário
4. Usar composables para lógica compartilhada
5. Seguir padrões de nomenclatura estabelecidos

### Ao Trabalhar com APIs

- Use composables para encapsular lógica de API
- Implemente tratamento de erros adequado
- Use tipos TypeScript para respostas da API
- Considere loading states e error states

### Estilização

- Use CSS scoped nos componentes
- Siga os padrões de design do Directus
- Use variáveis CSS quando possível
- Mantenha consistência visual

### Tratamento de Erros

- Sempre implemente tratamento de erros
- Use try/catch em operações assíncronas
- Forneça feedback adequado ao usuário
- Log erros para debugging quando necessário

## Comandos Disponíveis

- `pnpm run build`: Build para produção
- `pnpm run dev`: Build em modo desenvolvimento com watch
- `pnpm run lint`: Verificar código com ESLint
- `pnpm run lint:fix`: Corrigir problemas do ESLint automaticamente
- `pnpm run format`: Formatar código com Prettier
- `pnpm run format:check`: Verificar formatação

## Commits Semânticos

Use sempre commits semânticos com mensagens em **português**. Siga o padrão
[Conventional Commits](https://www.conventionalcommits.org/):

### Formato

```
<tipo>[escopo opcional]: <descrição>

[corpo opcional]

[rodapé(s) opcional(is)]
```

### Tipos de Commit

- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Mudanças na documentação
- **style**: Mudanças que não afetam o significado do código (espaços, formatação, etc.)
- **refactor**: Mudança de código que não corrige bug nem adiciona funcionalidade
- **perf**: Mudança de código que melhora performance
- **test**: Adição ou correção de testes
- **chore**: Mudanças em ferramentas de build, dependências, etc.
- **ci**: Mudanças em arquivos de CI/CD

### Exemplos

```bash
feat: adiciona componente de filtro avançado
fix: corrige renderização do iframe em dispositivos móveis
docs: atualiza README com instruções de instalação
style: aplica formatação prettier nos componentes
refactor: reorganiza estrutura de pastas dos utils
perf: otimiza carregamento de dados da API
test: adiciona testes unitários para NavMenu
chore: atualiza dependências do projeto
ci: configura workflow de deploy automático
```

### Quebras de Compatibilidade

Para mudanças que quebram compatibilidade, adicione `!` após o tipo ou inclua `BREAKING CHANGE:` no rodapé:

```bash
feat!: remove suporte ao Directus v9
feat: adiciona nova API

BREAKING CHANGE: a nova API não é compatível com versões anteriores
```

## Considerações de Segurança

- A extensão trabalha com iframes, portanto atenção às políticas CSP
- Em produção, configure adequadamente `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC`
- Valide URLs antes de exibir em iframes
- Considere sandbox attributes para iframes quando apropriado

## Debugging e Desenvolvimento

- Use o modo de desenvolvimento (`pnpm run dev`) para hot reload
- Verifique os logs do browser para erros de JavaScript
- Use Vue DevTools para debugging de componentes
- Teste sempre em diferentes resoluções e navegadores
