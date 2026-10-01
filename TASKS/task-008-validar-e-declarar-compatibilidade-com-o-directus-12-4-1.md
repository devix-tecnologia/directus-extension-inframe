# 🧩 Task 008 — Validar e declarar compatibilidade com o Directus 12.4.1

- Status: in-progress
- Type: chore
- Assignee: sidarta-veloso

## Description
Validar a extensão (mesma build) contra o Directus 12.4.1 sem perder a compatibilidade declarada com o Directus 11 (^11.0.0, validado em 11.0.2 e 11.17.4). Se compatível, ampliar directus:extension.host para ^11.0.0 || ^12.0.0 e incluir a 12.4.1 na matriz de testes. Autorização explícita do usuário para esta extensão; projetos Devix continuam no Directus 11.

## Tasks
<!-- [x] feito · [ ] em aberto · [ ] ... — adiado: <razão> para o que se decidiu não fazer -->
- [ ] Ajustar os tetos anti-12 (testes, script de versões, CI) para permitir testar a 12.4.1 exata, sem `latest`
- [ ] Rodar integração, E2E e `directus-extension validate` no Directus 12.4.1
- [ ] Analisar breaking changes do Directus 12 que afetam extensões
- [ ] Revalidar a mesma build no Directus 11.17.4 (integração + E2E)
- [ ] Se compatível: `host` = `^11.0.0 || ^12.0.0`, matriz no CI, README e CONTRIBUTING

## Notes
- Teste somente na 12.4.1 (sem matriz 12.x).
- Não estreitar o que já é declarado (`^11.0.0`).
