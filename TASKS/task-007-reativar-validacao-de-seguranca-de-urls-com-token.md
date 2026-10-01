# 🧩 Task 007 — Reativar validação de segurança de URLs com $token

- Status: done
- Type: fix
- Assignee: sidarta-veloso

## Description
A validação que bloqueia `$token` em URLs não HTTPS está comentada em `processUrl`
(`src/utils/useUrlVariableReplacement.ts`, comentário "VALIDAÇÃO TEMPORARIAMENTE DESABILITADA PARA DEBUG")
desde o commit `2647af5` ("feat: implement JWT token replacement via custom endpoint").

### Risco
`validateUrlSecurity()` ainda detecta o problema, mas o resultado é ignorado: só os avisos são registrados e a URL
segue para a substituição de variáveis. Uma URL `http://` com `$token` recebe o access token (JWT) do usuário logado no
Directus e é carregada num iframe sem TLS. Qualquer intermediário na rede (proxy, Wi-Fi, ISP) pode ler o token e
agir no Directus com as permissões desse usuário até o token expirar.

O mesmo arquivo tem `console.log('[inFrame DEBUG] ...')` que imprimem o tamanho do token e o corpo de resposta do
endpoint `/inframe-token`; é preciso confirmar se algum deles vaza o token.

### Versões afetadas
`v2.1.5`, `v2.1.6`, `v2.1.7`, `v2.1.8` e `v2.2.0` (todas as tags que contêm `2647af5`). A v2.1.4 e anteriores não são
afetadas por esse ponto.

### Impacto no credencia
O projeto credencia roda a `2.1.8` em produção (manifesto `docker/extensions/package.json`). Ali qualquer item do
inFrame com URL `http://...$token` envia o token em texto puro. A correção só chega lá com nova release na `main`,
publicação no npm e atualização do manifesto do credencia.

### Critérios de aceite
- `processUrl` bloqueia (lança erro e preenche `error`) URL com `$token` que não seja HTTPS; a UI mostra
  "Erro de Segurança" e não renderiza o iframe.
- Casos legítimos continuam funcionando: HTTPS com `$token`, URL sem protocolo (normalizada para `https://`),
  HTTP sem `$token`, demais variáveis.
- Qualquer exceção (por exemplo `http://localhost`) é explícita, documentada e coberta por teste; se não houver, isso
  fica registrado.
- Nenhum log registra o token, nem parcialmente; logs de debug removidos ou atrás de flag desligada por padrão.
- O teste "should block $token in HTTP URL (non-HTTPS)" passa sem ser afrouxado; integração 73/73 (ou mais) no
  Directus 11.17.4 e 11.0.2; E2E sem regressão.
- Regras de URL documentadas no README e no CHANGELOG.

## Tasks
<!-- [x] feito · [ ] em aberto · [ ] ... — adiado: <razão> para o que se decidiu não fazer -->
- [x] Entender por que a validação foi desligada (histórico, tasks, testes)
- [x] Reativar o bloqueio em `processUrl` e endurecer `validateUrlSecurity`
- [x] Revisar logs de debug e remover vazamentos
- [x] Testes unitários/integração dos casos bloqueado e permitido
- [x] E2E do caso bloqueado no módulo inFrame
- [x] Build, lint, typecheck, integração (11.17.4 e 11.0.2) e E2E
- [x] README e CHANGELOG
- [ ] Release na `main`, publicação no npm e atualização do credencia — adiado: fora do escopo desta task (develop apenas)
- [ ] Validação também no backend (hook em `items.create/update`, opção C da task-005) — adiado: defesa extra, não necessária para fechar o vazamento

## Notes

### Causa (por que foi desligada)
O bloqueio foi comentado no commit `2647af5`, durante a depuração da troca do `useStores()` pelo endpoint
`/inframe-token` (no Directus 11 o token fica em cookie HTTP-only e o `$token` saía vazio). No mesmo commit o E2E
"should allow HTTPS + $token" estava com `test.only` e buscava o item com
`/items/inframe?filter[url][_contains]=$token&limit=1`, sem filtrar HTTPS. Com o banco do container reaproveitado,
esse filtro pegava o item `http://insecure-site.com/dashboard?token=$token` criado pelo teste de segurança; a
validação o bloqueava, o iframe não aparecia e não dava para ver se o JWT era substituído. A validação foi desligada
para destravar a depuração e o comentário nunca foi revertido. A task-005 depois corrigiu o filtro do teste
(`_starts_with=https`), o que confirma a hipótese.

Não havia caso legítimo bloqueado pela regra: `normalizeUrl` (ItemDetail.vue) já transforma URL sem protocolo em
`https://` antes da validação; os testes e o script `test-token-debug.cjs` usavam HTTPS; nada indica uso de
`http://localhost`.

O E2E de segurança não pegou a regressão porque abria o item no editor de conteúdo (`/admin/content/inframe/:id`) e
aceitava qualquer texto "https" ou classe `error` na página.

### Correção
- `processUrl` volta a lançar erro (e preencher `error`) quando a validação falha, antes de pedir o token.
- `validateUrlSecurity` passa a usar `new URL()`: esquema `https:` sem diferenciar maiúsculas; URL relativa ou
  inválida com `$token` é bloqueada; `$token` no host é bloqueado (vazaria por DNS). Avisos mantidos.
- Defesa em profundidade: a URL final, já com o token, é checada de novo.
- **Sem exceção para `http://localhost`/`127.0.0.1`**: o host é resolvido na máquina de quem abre o painel, e uma
  configuração salva com localhost mandaria o token para qualquer processo local ouvindo a porta. Para dev local, usar
  HTTPS (certificado local) ou testar sem `$token`. Documentado no README.
- Logs: removidos todos os `[inFrame DEBUG]`, o log do tamanho do token, o aviso "JWT válido" e o
  `console.info('URL processed:', processedUrl)`. O catch de `processUrl` passa a registrar só a mensagem.

### Logs vazavam algo sensível?
- `console.log('[inFrame DEBUG] Response:', response.data)` imprimia o corpo inteiro de `/inframe-token` quando o
  token não passava na checagem (`length <= 20` ou não string). Um token estático curto apareceria inteiro no console.
  Com JWT normal esse ramo não roda, mas o caminho existia (v2.1.5 a v2.2.0).
- O tamanho do token era registrado (metadado, sem valor).
- `URL processed:` registrava a URL final sem `$token`, com e-mail, nome, id e papel do usuário (dado pessoal, não
  credencial).
- O E2E HTTPS imprimia o `src` do iframe com o JWT do admin de teste no log do CI; removido.
- Nenhum log imprimia o JWT em fluxo normal.

### Resultado (2026-09-30, Docker, SQLite, Chromium headless)

| Directus | Integração (Vitest) | E2E (Playwright)       |
| -------- | ------------------- | ---------------------- |
| 11.17.4  | 87/87               | 12 passaram, 12 skip   |
| 11.0.2   | 87/87               | 12 passaram, 12 skip   |

- Antes: 72/73 (falhava "should block $token in HTTP URL (non-HTTPS)"). As 73 antigas passam sem alteração; 14 novas.
- E2E igual à linha de base da task-006 (os 12 skip já estavam no código). O E2E de segurança endurecido falha contra
  o código antigo e passa com a correção.
- Build, lint (0 erros; 7 avisos pré-existentes em `scripts/`), typecheck e `prettier --check` ok.

### Para chegar à produção
1. Merge da `develop` na `main`: o semantic-release publica a próxima versão no npm (provavelmente 2.3.0, pois a develop já tem commits `feat:` da task-006).
2. No credencia, atualizar `docker/extensions/package.json` de `directus-extension-inframe` 2.1.8 para a nova versão
   e redeployar.
3. Revisar no credencia os itens do inFrame com `http://` e `$token`; se existirem, considerar os tokens expostos
   (rotacionar sessões/tokens estáticos dos usuários afetados).
