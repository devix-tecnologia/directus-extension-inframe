# Setup Automático de Coleções

Esta extensão agora inclui um **hook de instalação automática** que cria todas as coleções, campos e relações
necessárias quando a extensão é instalada ou o servidor é iniciado.

## Como Funciona

A extensão agora é um **bundle** que contém:

1. **Módulo** (`inframe`): Interface visual para gerenciar relatórios
2. **Hook** (`inframe-setup`): Configuração automática das coleções

## Coleções Criadas Automaticamente

O hook irá verificar e criar as seguintes coleções:

- `inframe_pasta` (grupo/folder para organização)
- `languages` (idiomas disponíveis)
- `inframe` (coleção principal de relatórios)
- `inframe_translations` (traduções dos relatórios)

### Estrutura de Campos

Cada coleção terá todos os campos configurados conforme o schema definido em `schema.json`.

## Quando o Setup é Executado

O hook é acionado automaticamente em 3 momentos:

1. **`server.start`**: Quando o servidor Directus é iniciado
2. **`extensions.install`**: Quando a extensão é instalada
3. **`extensions.reload`**: Quando as extensões são recarregadas (apenas verifica)

## Logs

O hook registra todas as operações no log do Directus:

```
[inFrame Extension] Iniciando configuração de coleções...
[inFrame Extension] Criando coleção: inframe
[inFrame Extension] Criando coleção: languages
[inFrame Extension] Configuração concluída! Criadas: 4 coleções, 25 campos, 3 relações ✓
```

## Verificação Manual

Se necessário, você pode verificar o status das coleções no log ao recarregar as extensões.

## Comportamento Inteligente

- ✅ **Idempotente**: Pode ser executado múltiplas vezes sem duplicar dados
- ✅ **Seguro**: Verifica se coleções/campos já existem antes de criar
- ✅ **Transparente**: Não requer ação manual do usuário
- ✅ **Recuperável**: Se algo falhar, tenta novamente na próxima inicialização

## Desenvolvimento

Se você estiver desenvolvendo e quiser testar o setup:

1. Remova as coleções manualmente no Directus
2. Reinicie o servidor: `npx directus start`
3. As coleções serão recriadas automaticamente

## Schema Source

O schema das coleções está definido em `/schema.json` no repositório. Este arquivo foi exportado de uma instância
Directus funcionando e serve como template para a criação automática.
