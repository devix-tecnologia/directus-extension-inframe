# 🧩 Task 006 — Validar e declarar suporte às versões mais recentes do Directus 11

- Status: in-progress
- Type: chore
- Assignee: sidarta-veloso

## Description
Validar a extensão contra o Directus 11.17.4 (e versões anteriores, quando viável), atualizar dependências relacionadas ao Directus e declarar o suporte em directus:extension.host e no README. Suporte ao Directus 12 fica fora por decisão de licença da Devix, até ordem explícita.

## Tasks
<!-- [x] feito · [ ] em aberto · [ ] ... — adiado: <razão> para o que se decidiu não fazer -->
- [x] Atualizar a develop com a main (merge da origin/main; develop 3 commits à frente)
- [x] Alinhar ferramentas: nodejs 22.13.1, pnpm 12.7.0 (.tool-versions, packageManager, engines)
- [x] Migrar onlyBuiltDependencies -> allowBuilds no pnpm-workspace.yaml (pnpm 12)
- [x] Atualizar taskin para ^5.0.0 e versionar .taskin/.taskin-users.json
- [x] Validar contra Directus 11.17.4 (integração + E2E)
- [x] Validar contra Directus 11.0.2 (integração + E2E)
- [x] Tentar Directus 10.8.3 (E2E falha; não declarado)
- [x] Conferir dependências Directus: @directus/extensions-sdk ^17.1.4 já é o maior major do Directus 11 (a 18.x é da linha 12)
- [x] Declarar host ^11.0.0 e matriz no README/CONTRIBUTING
- [x] Limitar testes/CI a Directus <= 11 (updateDirectusVersions.js sem 'latest')
- [ ] Suporte ao Directus 12 — adiado: fora por decisão de licença da Devix, até ordem explícita
- [ ] Reativar a validação de segurança em processUrl — adiado: fora do escopo (ver Notas)

## Notes

### Matriz validada (2026-09-30, Docker, SQLite, Chromium headless)

| Directus | Integração (Vitest)         | E2E (Playwright)                    |
| -------- | --------------------------- | ----------------------------------- |
| 11.17.4  | 72/73 (1 falha conhecida)   | 12 passaram, 12 skip (já no código) |
| 11.0.2   | 72/73 (1 falha conhecida)   | 12 passaram, 12 skip (já no código) |
| 10.8.3   | não rodado                  | 4 passaram, 1 falhou, 7 não rodaram |
| 12.x     | não testado (política Devix: licença) | —                         |

- `directus:extension.host`: `^11.0.0` (antes `^11.14.0`).
- `@directus/extensions-sdk` `^17.1.4`: é a versão usada pelo próprio Directus 11.17.4; não há `directus` em devDependencies. O teto `<12` está nas versões de teste (`tests/directus-versions.js`, `MAX_DIRECTUS_MAJOR = 11` no script de atualização).
- No 10.8.3 o hook cria as coleções, mas o E2E "should have inframe collection created" expira; não investigado a fundo.

### Falha conhecida (pré-existente, não corrigida aqui)

`tests/useUrlVariableReplacement.spec.ts` > "should block $token in HTTP URL (non-HTTPS)" falha porque a validação de segurança em `processUrl` (`src/utils/useUrlVariableReplacement.ts`) está comentada ("VALIDAÇÃO TEMPORARIAMENTE DESABILITADA PARA DEBUG") desde o commit 2647af5, publicado na 2.2.0. Com isso, URL HTTP com `$token` não é bloqueada. Precisa de task própria.

### Outras pendências

- `tests/setup.ts` subia o serviço `tests` do docker-compose.test.yml, que reinstalava `node_modules` como root no projeto; corrigido para subir só `directus`. O workflow `release.yml` ainda faz `docker compose up -d` de tudo.
- O CI usa Node 22.17.0; o `.tool-versions` ficou em 22.13.1 (versão instalada localmente).
- Arquivos na raiz que parecem lixo versionado (não removidos): `collections-list.log`, `full-test-output.log`, `test-jwt-validation.log`, `package.deprecated.json` e `test-token-debug.cjs` (este veio da develop; agora ignorado no eslint/prettier).
- Há duas tasks com número 004 em `TASKS/`.
