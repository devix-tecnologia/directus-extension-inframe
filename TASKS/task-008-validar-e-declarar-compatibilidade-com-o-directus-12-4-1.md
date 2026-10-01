# 🧩 Task 008 — Validar e declarar compatibilidade com o Directus 12.4.1

- Status: in-progress
- Type: chore
- Assignee: sidarta-veloso

## Description
Validar a extensão (mesma build) contra o Directus 12.4.1 sem perder a compatibilidade declarada com o Directus 11 (^11.0.0, validado em 11.0.2 e 11.17.4). Se compatível, ampliar directus:extension.host para ^11.0.0 || ^12.0.0 e incluir a 12.4.1 na matriz de testes. Autorização explícita do usuário para esta extensão; projetos Devix continuam no Directus 11.

## Tasks
<!-- [x] feito · [ ] em aberto · [ ] ... — adiado: <razão> para o que se decidiu não fazer -->
- [x] Ajustar os tetos anti-12 (testes, script de versões, CI) para permitir testar a 12.4.1 exata, sem `latest`
- [x] Rodar integração, E2E e `directus-extension validate` no Directus 12.4.1
- [x] Analisar breaking changes do Directus 12 que afetam extensões
- [x] Revalidar a mesma build no Directus 11.17.4 e 11.0.2 (integração + E2E)
- [x] `host` = `^11.0.0 || ^12.0.0`, matriz no CI, README e CONTRIBUTING
- [ ] Trocar `#headline` + `v-breadcrumb` em `ItemDetail.vue` — adiado: só deprecados no 12 (continuam renderizando) e são o caminho certo no 11
- [ ] Atualizar `@directus/extensions-sdk` para 18.x — adiado: desnecessário; a build do SDK 17 roda nos dois e passa no `validate` do SDK 18

## Notes
- Autorização explícita do usuário para declarar compatibilidade com o Directus 12 nesta extensão. Os projetos da
  Devix continuam no Directus 11.
- Teste somente na 12.4.1 (sem matriz 12.x). Nada foi estreitado: `^11.0.0` continua declarado.

### Resultado (2026-10-01, Docker, SQLite, Chromium headless, mesma build com SDK 17.1.4)

| Directus | Integração (Vitest) | E2E (Playwright)     | `directus-extension validate` |
| -------- | ------------------- | -------------------- | ----------------------------- |
| 12.4.1   | 87/87               | 12 passaram, 12 skip | ok (SDK 17.1.4 e SDK 18.0.5)  |
| 11.17.4  | 87/87               | 12 passaram, 12 skip | ok (SDK 17.1.4)               |
| 11.0.2   | 87/87               | 12 passaram, 12 skip | —                             |

- Os 12 skip já estavam no código (mesma linha de base das tasks 006 e 007).
- Build, lint (0 erros; 7 avisos pré-existentes em `scripts/`), typecheck e `prettier --check` ok.
- `directus:extension.host`: `^11.0.0` → `^11.0.0 || ^12.0.0`.

### O que quebrou no 12.4.1 (só o ambiente de testes; o código da extensão não mudou)
1. **`/server/health` exige autenticação** (12.0.0, #27160): responde 403 para anônimos, então o healthcheck do
   container nunca ficava healthy e a integração falhava no setup. Correção: healthcheck com `/server/ping`
   (`docker-compose.test.yml` e `docker-compose.yaml`) e a espera do bootstrap em `tests/setup.ts` confirma só pelo
   login com `access_token`. Funciona no 11 e no 12.
2. **Modais de licença no app** (12.0.0, licenciamento ativo): o modal "Have a license key?" cobria a tela e
   interceptava os cliques do E2E. Correção: `tests/e2e/helpers/dismissLicensePrompts.ts` define os cookies que o
   próprio app grava ao dispensar (`license-onboarding-dismissed`, `license-banner-dismissed`,
   `license-login-modal-dismissed`). No 11 são ignorados.
3. **Novo header de ações** (12.0.0, #27437): o botão de salvar virou "Save" (era o ícone "check") e o menu virou
   "More options" (era "more_vert"). Correção: seletores do E2E aceitam os dois nomes.

### Breaking changes do Directus 12 analisadas (release notes de v12.0.0-rc.1 a v12.4.1)
- **Licença MSCL-1.0-GPL e licenciamento ativo (Core tier por padrão)**: SSO e regras de permissão customizadas
  exigem licença. A extensão não usa SSO nem cria políticas/permissões; o hook só cria coleções, campos, relações,
  idiomas e ajusta `directus_settings.module_bar` direto pelo knex. Sem impacto funcional.
- **`/server/health` só autenticado**: afetava apenas o healthcheck dos testes (corrigido acima).
- **Header/navegação (#27437)**: slot `headline` da `private-view` e `v-breadcrumb` deprecados, mas continuam
  renderizando. `ItemDetail.vue` usa os dois; mantido para não quebrar o 11. `v-button rounded` removido: não usado.
  `VResizeable` deprecado: não usado.
- **Temas (shell scope, focus ring, sombras)**: a extensão só usa `--theme--primary`, `--theme--primary-light`,
  `--theme--foreground`, `--theme--foreground-subdued` e `--theme--foreground-accent`, que continuam existindo.
- **Permissões mínimas de app em `directus_settings` (12.2.0)**: vale só para políticas novas; a extensão lê
  `directus_settings` no servidor pelo knex, sem passar por permissões.
- **`IP_TRUST_PROXY` padrão `false`, endpoints `/utils/hash/*` removidos, mutações GraphQL de uso único, CORS em
  WebSocket, itens versionados travados, `exists()` do storage, MapLibre/WebGL2, tipos de `@directus/sdk` e
  `@directus/types`**: não usados pela extensão.
- **`@directus/extensions-sdk` 18.x**: mudanças são licença, `esbuild` 0.28.1 e correção do `validate` com sandbox.
  A API de extensões (`defineModule`, `defineHook`, `defineEndpoint`, `useApi`) não mudou; o endpoint
  `/inframe-token` continua lendo `req.accountability`/`req.token`. Mantido o SDK 17 (o mesmo do Directus 11.17.4),
  cuja build roda nos dois majors.

### Ajustes de versões de teste
- `tests/directus-versions.js`: `['11.0.2', '11.17.4', '12.4.1']`.
- `.github/scripts/updateDirectusVersions.js`: 12.4.1 entra como versão fixa; a busca automática continua limitada
  a major <= 11 (sem matriz 12.x). A tag `latest` não é usada em lugar nenhum.
- CI: matriz de integração dos PRs para `main` com 11.0.2, 11.17.4 e 12.4.1. Testes rápidos e o padrão local
  continuam no 11.17.4.
