# Melhorias no Hook de Importação de Schema

## Baseado na extensão `directus-extension-schema-management-module`

---

## O que Mudou?

### ✅ 1. Importação Recursiva de Coleções com Dependências de Grupos (Folders)

**Problema anterior:** Se você tinha uma coleção dentro de um folder (group), e o folder não existia ainda, a criação
falhava.

**Solução:** Loop recursivo que espera o grupo ser criado primeiro.

```typescript
const importedCollections: string[] = [];
let lastLength: number | null = null;

// Keep looping until no more collections can be imported
while (importedCollections.length !== lastLength) {
  lastLength = importedCollections.length;

  for (const collection of collections) {
    // Check if collection has a group (folder) dependency
    if (collection.meta?.group) {
      const { group } = collection.meta;

      // Wait for group to be imported first
      if (!importedCollections.includes(group) && !existingCollectionNames.has(group)) {
        continue; // Skip this collection for now, try again in next iteration
      }
    }

    // Import collection...
  }
}
```

**Resultado:** Coleções são importadas na ordem correta, respeitando hierarquias de folders.

---

### ✅ 2. Coleções Criadas COM Campos (Evita auto-criação de `id`)

**Problema anterior:** Quando criávamos coleção sem campos, o Directus automaticamente adicionava um campo `id`.

**Solução:** Passar os campos diretamente na criação da coleção.

```typescript
await collectionsService.createOne({
  collection: collection.collection,
  meta: collection.meta,
  schema: collection.schema || null,
  fields: collectionFields.map((field: any) => ({
    field: field.field,
    type: field.type,
    meta: field.meta,
    schema: field.schema !== null ? field.schema : undefined,
  })),
});
```

**Resultado:** A coleção `language` é criada com `code`, `name`, `direction` - SEM campo `id` indesejado.

---

### ✅ 3. Modo PATCH - Adiciona Campos Faltantes em Coleções Existentes

**Problema anterior:** Se a coleção já existia, os campos não eram adicionados.

**Solução:** Após criar coleções novas, verifica e adiciona campos faltantes.

```typescript
// STEP 2: Add missing fields to existing collections
for (const field of fields) {
  if (existingCollectionNames.has(field.collection) || collectionsCreated > 0) {
    const existingField = await database
      .select('*')
      .from('directus_fields')
      .where('collection', field.collection)
      .where('field', field.field)
      .first();

    if (!existingField) {
      await fieldsService.createField(field.collection, fieldData);
    }
  }
}
```

**Resultado:** Se você atualizar o schema e adicionar novos campos, eles serão criados automaticamente.

---

### ✅ 4. Importação em 3 Etapas Bem Definidas

A importação agora segue um fluxo claro:

```
STEP 1: Import Collections (com campos incluídos)
  └─> Respeita dependências de grupos (folders)
  └─> Cria collections + fields em uma única operação

STEP 2: Add Missing Fields (modo PATCH)
  └─> Adiciona campos que faltam em coleções existentes
  └─> Refresh do schema antes de começar

STEP 3: Import Relations
  └─> Refresh do schema novamente
  └─> Cria relações entre coleções
  └─> Verifica se já existem antes de criar
```

**Resultado:** Ordem correta e previsível, com refresh do schema nos momentos certos.

---

### ✅ 5. Melhor Tratamento de Erros

Cada etapa tem seu próprio try-catch:

```typescript
try {
  // STEP 1: Import collections
} catch (error: any) {
  logger.error(`Error during collections import: ${error.message}`);
}

try {
  // STEP 2: Add missing fields
} catch (error: any) {
  logger.error(`Error during fields import: ${error.message}`);
}

try {
  // STEP 3: Import relations
} catch (error: any) {
  logger.error(`Error during relations import: ${error.message}`);
}
```

**Resultado:** Se uma etapa falhar, as outras ainda podem executar.

---

### ✅ 6. Logging Mais Detalhado

```
[inFrame Extension] 📋 Collections to process: language, inframe, inframe_translation, inframe_pasta
[inFrame Extension] 🔨 Creating collection: inframe_pasta
[inFrame Extension] ✅ Collection inframe_pasta created with 0 field(s)
[inFrame Extension] 🔨 Creating collection: language
[inFrame Extension] ✅ Collection language created with 3 field(s)
[inFrame Extension] 🔨 Creating collection: inframe
[inFrame Extension] ✅ Collection inframe created with 7 field(s)
[inFrame Extension] ⏭️  Collection inframe already exists
[inFrame Extension] 🔗 Creating relation: inframe_translation.language -> language
[inFrame Extension] ✅ Relation created
[inFrame Extension] 🎉 Configuration complete! Created: 3 collection(s), 15 field(s), 3 relation(s)
```

**Resultado:** Fácil de debugar e acompanhar o progresso.

---

## Comparação: Antes vs Depois

### ANTES (Problemas)

❌ Coleção `language` criada com campo `id` indesejado  
❌ Coleções criadas sem campos, depois campos adicionados separadamente  
❌ Não respeitava ordem de dependências (folders)  
❌ Se coleção existia, campos não eram adicionados  
❌ Muitos waits/sleeps desnecessários

### DEPOIS (Soluções)

✅ Coleção `language` criada APENAS com `code`, `name`, `direction`  
✅ Coleções criadas COM campos em uma operação  
✅ Importação recursiva respeita hierarquia de folders  
✅ Modo PATCH adiciona campos faltantes  
✅ Refreshes de schema apenas quando necessário

---

## Como Usar

### 1. Exporte o schema de uma instância Directus

Você pode usar a extensão `schema-management-module` ou qualquer outra ferramenta para exportar o schema como JSON.

### 2. Coloque o schema.json no seu projeto

```
extensions/
  hooks/
    inframe-setup/
      schema.json          ← Seu schema aqui
      index.ts             ← Hook melhorado
      package.json
```

### 3. Instale a extensão

```bash
npm install
directus bootstrap
directus start
```

O hook irá:

1. Detectar que as coleções não existem
2. Importar na ordem correta
3. Criar coleções COM campos
4. Criar relações
5. Fazer refresh do schema

---

## Teste de Importação

Para testar se está funcionando:

```bash
# 1. Delete as coleções do seu Directus
# 2. Reinicie o Directus
# 3. Veja os logs

[inFrame Extension] 🚀 server.start event triggered, running setup...
[inFrame Extension] Starting collections configuration...
[inFrame Extension] 📋 Collections to process: language, inframe, inframe_translation, inframe_pasta
[inFrame Extension] 🔨 Creating collection: inframe_pasta
[inFrame Extension] ✅ Collection inframe_pasta created with 0 field(s)
[inFrame Extension] 🔨 Creating collection: language
[inFrame Extension] ✅ Collection language created with 3 field(s)
# ... etc
[inFrame Extension] 🎉 Configuration complete!
```

---

## Vantagens dessa Abordagem

1. **Idempotente** - Pode rodar múltiplas vezes sem problemas
2. **Incremental** - Adiciona apenas o que falta
3. **Robusto** - Trata erros em cada etapa
4. **Ordenado** - Respeita dependências
5. **Completo** - Collections + Fields + Relations

---

## Diferenças vs `/schema/apply`

A extensão `schema-management-module` **NÃO usa** o endpoint `/schema/apply` do Directus. Por quê?

### Endpoint `/schema/apply`

- Aplica DIFF entre schemas
- Mais complexo
- Pode ter comportamentos inesperados com conflitos

### Abordagem da Extensão (que usamos)

- Cria recursos individuais via API
- Mais controle granular
- Melhor tratamento de erros
- Mais fácil de debugar

---

## Próximos Passos

Agora você pode:

1. ✅ Exportar schema de uma instância Directus
2. ✅ Importar automaticamente via hook
3. ✅ Distribuir sua extensão com schema incluído
4. ✅ Ter certeza que `language` não terá campo `id`
5. ✅ Adicionar novos campos sem quebrar coleções existentes

**Pronto para produção! 🚀**
