# 🧩 Task 007 — Reativar validação de segurança de URLs com $token

- Status: in-progress
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
- [ ] Entender por que a validação foi desligada (histórico, tasks, testes)
- [ ] Reativar o bloqueio em `processUrl` e endurecer `validateUrlSecurity`
- [ ] Revisar logs de debug e remover vazamentos
- [ ] Testes unitários/integração dos casos bloqueado e permitido
- [ ] E2E do caso bloqueado no módulo inFrame
- [ ] Build, lint, typecheck, integração (11.17.4 e 11.0.2) e E2E
- [ ] README e CHANGELOG

## Notes
