# Task 004 — Tornar atributos do iframe configuráveis

Status: in-progress
Type: feat
Assignee: TBD
Priority: medium

## Description

Tornar os atributos do elemento `<iframe>` configuráveis através da coleção `inframe` do Directus, permitindo que cada iframe tenha configurações personalizadas de segurança, recursos e comportamento.

### Problema

Atualmente, os atributos do iframe estão hardcoded no componente `ItemDetail.vue`:

```vue
<iframe
  :src="processedUrl"
  frameborder="0"
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
```

**Limitações:**
- Todos os iframes compartilham as mesmas permissões de sandbox
- Não é possível personalizar Permissions Policy (`allow`) por iframe
- Impossível restringir funcionalidades específicas (ex: bloquear popups para alguns iframes)
- Falta controle granular sobre recursos do navegador
- Não suporta novos atributos HTML como `loading`, `referrerpolicy`, `credentialless`

**Casos de Uso:**
1. **Superset/BI Tools**: Precisa de `allow-downloads` no sandbox para permitir download de relatórios
2. **Dashboards internos**: Pode usar sandbox mais permissivo (allow-same-origin)
3. **Conteúdo externo não confiável**: Sandbox restritivo sem allow-scripts
4. **Formulários externos**: Permitir allow-forms mas bloquear allow-popups
5. **Vídeos/Mídia**: Habilitar autoplay e fullscreen apenas onde necessário

### Solução

Adicionar novos campos na coleção `inframe` para configurar cada atributo do iframe individualmente. O usuário poderá personalizar:
- Permissões de sandbox (segurança)
- Permissions Policy / Feature Policy (recursos do navegador)
- Comportamento de carregamento
- Política de referrer
- Credenciais
- CSP (Content Security Policy)

## Atributos Configuráveis

### 1. Sandbox (Segurança)

**Referência:** [MDN - iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)

Controla o nível de restrições aplicadas ao conteúdo do iframe. Cada token habilita uma funcionalidade específica.

**Tokens disponíveis:**

| Token | Descrição | Caso de Uso |
|-------|-----------|-------------|
| `allow-downloads` | Permite downloads via `<a download>` | Superset, BI tools que exportam relatórios |
| `allow-forms` | Permite submissão de formulários | Formulários externos, surveys |
| `allow-modals` | Permite `alert()`, `confirm()`, `prompt()` | Apps interativos |
| `allow-orientation-lock` | Permite bloquear orientação da tela | Apps mobile, games |
| `allow-pointer-lock` | Permite Pointer Lock API | Games, apps 3D |
| `allow-popups` | Permite `window.open()`, `target="_blank"` | OAuth flows, sistemas legados |
| `allow-popups-to-escape-sandbox` | Popups não herdam sandbox | OAuth, autenticação externa |
| `allow-presentation` | Permite Presentation API | Apresentações, screencasts |
| `allow-same-origin` | Trata conteúdo como mesma origem | Necessário para cookies, localStorage |
| `allow-scripts` | Permite JavaScript | Quase todos os casos (dashboards, apps) |
| `allow-storage-access-by-user-activation` | Permite Storage Access API | Partitioned cookies |
| `allow-top-navigation` | Permite `window.top.location` | Raro, geralmente inseguro |
| `allow-top-navigation-by-user-activation` | Permite top navigation apenas com interação | Menos inseguro que anterior |
| `allow-top-navigation-to-custom-protocols` | Permite protocolos personalizados (mailto:, tel:) | Links de contato |

**Valores padrão sugeridos:**
- **Conteúdo confiável interno:** `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals`
- **Conteúdo externo confiável:** `allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox`
- **Conteúdo não confiável:** `allow-scripts allow-forms` (sem allow-same-origin)
- **Apenas visualização:** vazio (bloqueia tudo exceto visualização)

### 2. Permissions Policy / Allow (Recursos do Navegador)

**Referência:** [MDN - iframe allow](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#allow)

Controla quais recursos/APIs do navegador o iframe pode acessar.

**Diretivas disponíveis:**

| Diretiva | Descrição | Caso de Uso |
|----------|-----------|-------------|
| `accelerometer` | Sensor de aceleração | Apps de realidade aumentada |
| `ambient-light-sensor` | Sensor de luz ambiente | Ajuste automático de tema |
| `autoplay` | Reprodução automática de mídia | Vídeos, apresentações |
| `battery` | Battery Status API | Apps mobile |
| `camera` | Acesso à câmera | Videoconferência, upload de fotos |
| `display-capture` | Screen Capture API | Compartilhamento de tela |
| `document-domain` | `document.domain` setter | Legado, evitar |
| `encrypted-media` | Encrypted Media Extensions (DRM) | Players de vídeo Netflix-like |
| `fullscreen` | API de fullscreen | Vídeos, apresentações, games |
| `gamepad` | Gamepad API | Games |
| `geolocation` | API de geolocalização | Mapas, rastreamento |
| `gyroscope` | Sensor giroscópio | Realidade aumentada, games |
| `hid` | WebHID API | Dispositivos USB especializados |
| `identity-credentials-get` | FedCM API | Login federado |
| `idle-detection` | Idle Detection API | Apps de produtividade |
| `local-fonts` | Local Font Access API | Editores de design |
| `magnetometer` | Sensor de magnetômetro | Bússola, navegação |
| `microphone` | Acesso ao microfone | Videoconferência, gravação |
| `midi` | Web MIDI API | Apps de música |
| `otp-credentials` | WebOTP API | Autenticação SMS |
| `payment` | Payment Request API | Checkouts |
| `picture-in-picture` | Picture-in-Picture | Players de vídeo |
| `publickey-credentials-create` | WebAuthn create | Registro de chaves de segurança |
| `publickey-credentials-get` | WebAuthn get | Login com chaves de segurança |
| `screen-wake-lock` | Screen Wake Lock API | Apresentações, receitas |
| `serial` | Web Serial API | Arduino, hardware serial |
| `speaker-selection` | Audio Output Devices API | Seleção de alto-falantes |
| `usb` | WebUSB API | Dispositivos USB |
| `web-share` | Web Share API | Compartilhar conteúdo mobile |
| `xr-spatial-tracking` | WebXR Device API | Realidade virtual/aumentada |

**Sintaxe:** `permission 'origin'` ou `permission *`
- `'self'` - apenas mesma origem
- `'src'` - origem do src do iframe
- `*` - todas as origens
- `https://example.com` - origem específica

**Exemplo:** `camera 'self'; microphone 'self'; geolocation *`

**Valores padrão sugeridos:**
- **Dashboards BI:** `clipboard-write; encrypted-media; picture-in-picture`
- **Vídeoconferência:** `camera; microphone; display-capture; autoplay; fullscreen`
- **Mapas/GPS:** `geolocation; fullscreen`
- **Mídia/Vídeo:** `autoplay; fullscreen; picture-in-picture; encrypted-media`
- **Padrão seguro:** vazio (bloqueia todos os recursos especiais)

### 3. Loading (Performance)

**Referência:** [MDN - iframe loading](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#loading)

Controla quando o iframe deve ser carregado.

**Valores:**
- `eager` (padrão): Carrega imediatamente
- `lazy`: Carrega apenas quando estiver próximo ao viewport (lazy loading)

**Caso de Uso:** 
- `lazy` para iframes que não são imediatamente visíveis
- `eager` para conteúdo crítico acima da dobra

### 4. Referrerpolicy (Privacidade)

**Referência:** [MDN - iframe referrerpolicy](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#referrerpolicy)

Controla quais informações de referrer são enviadas ao iframe.

**Valores:**
- `no-referrer` - Não envia referrer
- `no-referrer-when-downgrade` (padrão) - Envia referrer exceto HTTPS→HTTP
- `origin` - Envia apenas origem (https://example.com)
- `origin-when-cross-origin` - URL completa same-origin, apenas origem cross-origin
- `same-origin` - Envia referrer apenas same-origin
- `strict-origin` - Envia origem, exceto HTTPS→HTTP
- `strict-origin-when-cross-origin` - URL completa same-origin, origem cross-origin, nada HTTPS→HTTP
- `unsafe-url` - Sempre envia URL completa (inseguro)

**Recomendação:** `strict-origin-when-cross-origin` (balanceado) ou `no-referrer` (máxima privacidade)

### 5. Credentialless (Segurança Avançada)

**Referência:** [MDN - iframe credentialless](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#credentialless)

Carrega iframe sem cookies ou storage. Implementa mesmo conceito de COEP (Cross-Origin-Embedder-Policy).

**Valores:**
- `false` (padrão): Envia credenciais normalmente
- `true`: Não envia cookies, storage isolado

**Caso de Uso:** Embed de conteúdo público de terceiros sem vazar credenciais do usuário

**Nota:** Atributo experimental, suporte limitado (Chrome 110+)

### 6. CSP (Content Security Policy)

**Referência:** [MDN - iframe csp](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#csp)

Aplica Content Security Policy adicional ao iframe.

**Exemplo:** `default-src 'self'; script-src 'self' https://trusted.cdn.com`

**Nota:** Atributo experimental, suporte limitado

### 7. Outros Atributos

| Atributo | Descrição | Valores |
|----------|-----------|---------|
| `allowfullscreen` | Permite API fullscreen (atalho para allow="fullscreen") | boolean |
| `allowpaymentrequest` | Permite Payment Request API | boolean |
| `name` | Nome do iframe (usado como target) | string |
| `title` | Título acessível (ARIA) | string |

## Tasks

### 1. Modelagem de Dados

- [ ] Analisar melhor estrutura para armazenar múltiplas opções (sandbox, allow)
  - [ ] Opção A: Campos JSON `sandbox_options` e `allow_options` com arrays
  - [ ] Opção B: Campos text simples com strings separadas por espaço (HTML-like)
  - [ ] Opção C: Interface checkbox com múltiplas opções
  - [ ] Decidir abordagem final

- [ ] Modificar `schema.json` (collection inframe)
  - [ ] Campo `sandbox_tokens` (string ou JSON) - tokens do atributo sandbox
  - [ ] Campo `allow_directives` (string ou JSON) - diretivas do atributo allow
  - [ ] Campo `loading` (select: eager/lazy)
  - [ ] Campo `referrerpolicy` (select dropdown com 8 opções)
  - [ ] Campo `credentialless` (boolean) - experimental
  - [ ] Campo `csp` (textarea) - experimental
  - [ ] Campo `allowfullscreen` (boolean)
  - [ ] Campo `allowpaymentrequest` (boolean)
  - [ ] Campo `iframe_name` (string)
  - [ ] Campo `iframe_title` (string) - acessibilidade

- [ ] Criar presets/templates de configuração
  - [ ] Preset "Conteúdo Confiável Interno" (sandbox completo + allow completo)
  - [ ] Preset "Dashboard BI" (sandbox + allow clipboard/picture-in-picture)
  - [ ] Preset "Vídeoconferência" (camera/microphone/display-capture)
  - [ ] Preset "Conteúdo Não Confiável" (sandbox restritivo)
  - [ ] Preset "Apenas Visualização" (sandbox vazio)

### 2. Backend / Schema Hook

- [ ] Atualizar hook `src/hooks/inframe-setup/index.ts`
  - [ ] Adicionar novos campos na criação automática da collection
  - [ ] Definir valores padrão para novos campos
  - [ ] Adicionar traduções pt-BR/en-US para novos campos
  - [ ] Migração para instâncias existentes (adicionar campos se não existirem)

### 3. Interface Directus (Admin UI)

- [ ] Criar campo de interface para `sandbox_tokens`
  - [ ] Interface: `select-multiple-checkbox`
  - [ ] Opções: todos os 14 tokens sandbox da tabela acima
  - [ ] Nota de ajuda explicando cada token
  - [ ] Validação: warn se allow-downloads sem HTTPS (tarefa-005)
  - [ ] Validação: warn se allow-same-origin + allow-scripts (risco XSS se conteúdo não confiável)

- [ ] Criar campo de interface para `allow_directives`
  - [ ] Interface: `select-multiple-checkbox` ou editor de texto estruturado
  - [ ] Opções: principais diretivas da tabela acima
  - [ ] Campo adicional: origem (`'self'`, `'src'`, `*`, custom)
  - [ ] Nota de ajuda explicando recursos sensíveis (camera, microphone, geolocation)

- [ ] Criar campo select para `loading`
  - [ ] Opções: eager (padrão), lazy
  - [ ] Nota: "lazy melhora performance para iframes fora do viewport"

- [ ] Criar campo select para `referrerpolicy`
  - [ ] Opções: 8 valores listados acima
  - [ ] Padrão: `strict-origin-when-cross-origin`
  - [ ] Nota de ajuda explicando privacidade vs funcionalidade

- [ ] Criar campo boolean para `credentialless`
  - [ ] Badge "Experimental"
  - [ ] Nota: "Suporte limitado a Chrome 110+"

- [ ] Criar aba "Configurações Avançadas" agrupando:
  - [ ] credentialless
  - [ ] csp
  - [ ] iframe_name
  - [ ] iframe_title
  - [ ] allowfullscreen
  - [ ] allowpaymentrequest

- [ ] Criar campo "Preset de Configuração"
  - [ ] Select dropdown com presets definidos
  - [ ] Ao selecionar preset, preenche campos automaticamente
  - [ ] Permite sobrescrever valores individualmente após aplicar preset

### 4. Frontend / ItemDetail.vue

- [ ] Modificar `src/components/ItemDetail.vue`
  - [ ] Ler novos campos do item (sandbox_tokens, allow_directives, etc)
  - [ ] Criar função `buildSandboxAttribute(tokens: string[]): string`
  - [ ] Criar função `buildAllowAttribute(directives: object[]): string`
  - [ ] Aplicar atributos dinamicamente ao `<iframe>`
  - [ ] Fallback para valores padrão se campos vazios
  - [ ] Log de debug (console) com atributos aplicados

- [ ] Criar composable `src/utils/useIframeAttributes.ts`
  - [ ] Função `parseSandboxTokens()` - valida e sanitiza tokens
  - [ ] Função `parseAllowDirectives()` - valida e sanitiza diretivas
  - [ ] Função `validateSandboxSecurity()` - detecta combinações inseguras
  - [ ] Função `getDefaultAttributes()` - retorna valores padrão
  - [ ] Exportar constantes com listas de tokens/diretivas válidos

### 5. Tipos TypeScript

- [ ] Atualizar `src/types.ts`
  - [ ] Type `SandboxToken` com union de todos os tokens
  - [ ] Type `AllowDirective` com union de todas as diretivas
  - [ ] Type `LoadingValue` = 'eager' | 'lazy'
  - [ ] Type `ReferrerPolicy` com 8 valores
  - [ ] Interface `IframeAttributes` com todos os campos
  - [ ] Interface `IframeConfig` extendendo Item com novos campos

### 6. Validações de Segurança

- [ ] Validar combinações inseguras de sandbox
  - [ ] Warn: `allow-same-origin` + `allow-scripts` + conteúdo não confiável = XSS
  - [ ] Warn: `allow-top-navigation` = clickjacking / phishing
  - [ ] Error: `allow-downloads` sem HTTPS (task-005)

- [ ] Validar allow directives sensíveis
  - [ ] Warn ao habilitar: camera, microphone, geolocation, payment
  - [ ] Mensagem: "Este recurso expõe informações sensíveis do usuário"

- [ ] Sanitização de valores
  - [ ] Remover tokens sandbox inválidos
  - [ ] Remover diretivas allow inválidas
  - [ ] Escapar valores de CSP para prevenir injeção

### 7. Documentação

- [ ] Atualizar `README.md`
  - [ ] Seção "Configurações do Iframe"
  - [ ] Tabela completa de atributos configuráveis
  - [ ] Exemplos de presets de configuração
  - [ ] Guia de segurança (quando usar cada opção)
  - [ ] Referências para MDN de cada atributo

- [ ] Criar `docs/IFRAME-ATTRIBUTES.md`
  - [ ] Guia detalhado de cada atributo
  - [ ] Casos de uso práticos por tipo de conteúdo
  - [ ] Matriz de compatibilidade entre navegadores
  - [ ] Troubleshooting de problemas comuns

- [ ] Adicionar JSDoc nos composables
  - [ ] Documentar cada função com exemplos
  - [ ] Adicionar notas de segurança onde aplicável

### 8. Migrations

- [ ] Criar script de migração para instâncias existentes
  - [ ] `scripts/migrate-iframe-attributes.ts`
  - [ ] Detectar versão atual do schema
  - [ ] Adicionar novos campos se não existirem
  - [ ] Aplicar valores padrão para registros existentes
  - [ ] Preservar atributos hardcoded atuais como padrão

- [ ] Testar migração em instância de teste
  - [ ] Backup de schema.json antes de migrar
  - [ ] Executar migração
  - [ ] Verificar campos criados
  - [ ] Verificar valores padrão aplicados

### 9. Testes

- [ ] Tests unitários - `tests/unit/iframe-attributes.spec.ts`
  - [ ] `buildSandboxAttribute()` com múltiplos tokens
  - [ ] `buildAllowAttribute()` com múltiplas diretivas
  - [ ] `parseSandboxTokens()` filtra tokens inválidos
  - [ ] `parseAllowDirectives()` sanitiza valores
  - [ ] `validateSandboxSecurity()` detecta combinações inseguras

- [ ] Tests E2E - `tests/e2e/configurable-iframe-attributes.spec.ts`
  - [ ] Criar iframe com preset "Dashboard BI"
  - [ ] Verificar sandbox tokens aplicados corretamente no HTML
  - [ ] Verificar allow directives aplicados corretamente
  - [ ] Alterar configuração e verificar re-render
  - [ ] Testar loading=lazy (verificar não carrega até scroll)
  - [ ] Testar referrerpolicy (verificar header HTTP)

- [ ] Tests de segurança
  - [ ] Tentar injetar token sandbox inválido → deve ser filtrado
  - [ ] Tentar injetar código em CSP → deve ser escapado
  - [ ] Verificar warn aparece com allow-same-origin + allow-scripts
  - [ ] Verificar downloads bloqueados sem allow-downloads (task-005)

### 10. Performance

- [ ] Otimizar re-renders
  - [ ] Memoizar buildSandboxAttribute() e buildAllowAttribute()
  - [ ] Re-aplicar atributos apenas quando campos mudarem
  - [ ] Usar computed properties no Vue

- [ ] Lazy loading inteligente
  - [ ] Se loading=lazy, adiar processamento de variáveis URL até visible
  - [ ] Implementar Intersection Observer para detectar visibilidade

## Considerações de Segurança

### Riscos e Mitigações

1. **XSS via allow-same-origin + allow-scripts**
   - Se iframe contém conteúdo de origem não confiável COM allow-same-origin + allow-scripts, o iframe pode acessar o DOM parent e executar código malicioso
   - **Mitigação:** Exibir warning crítico na UI quando essa combinação for detectada
   - **Solução:** Remover allow-same-origin OU não carregar conteúdo não confiável

2. **Clickjacking via allow-top-navigation**
   - Iframe pode redirecionar aba/janela principal do usuário
   - **Mitigação:** Exibir warning na UI
   - **Solução:** Usar allow-top-navigation-by-user-activation ao invés

3. **Token exposure na URL (task-005)**
   - Usar allow-downloads sem HTTPS expõe downloads a MitM
   - **Mitigação:** Validação cruzada com task-005 (bloquear HTTP + downloads)

4. **Permissões sensíveis sem consentimento**
   - Habilitar camera/microphone sem explicar ao usuário
   - **Mitigação:** Warnings na UI + documentação clara

5. **CSP Injection**
   - Usuário pode tentar injetar código via campo CSP
   - **Mitigação:** Sanitizar e escapar valores CSP

### Princípio do Menor Privilégio

Por padrão, aplicar configuração mais restritiva possível:
- Sandbox vazio (apenas visualização) OU
- Sandbox mínimo necessário (allow-scripts apenas)
- Allow vazio (bloquear todos os recursos)
- loading="lazy" (melhor performance)
- referrerpolicy="strict-origin-when-cross-origin" (privacidade)

Usuário deve explicitamente habilitar cada funcionalidade necessária.

## Dependencies

- task-005: Relacionado ao allow-downloads + HTTPS validation
- task-002: Validações de segurança (trusted domains podem influenciar sandbox)

## Testing Strategy

1. **Matriz de Testes:**
   - Testar cada sandbox token individualmente
   - Testar cada allow directive individualmente
   - Testar combinações comuns (presets)
   - Testar combinações inseguras (validações)

2. **Navegadores:**
   - Chrome/Edge (suporte completo)
   - Firefox (sem credentialless)
   - Safari (suporte parcial de allow)

3. **Casos de Uso Reais:**
   - Embed Superset (allow-downloads)
   - Embed YouTube (autoplay, fullscreen)
   - Embed Google Maps (geolocation)
   - Embed formulário externo (allow-forms)

## Success Criteria

- [ ] Usuário pode configurar todos os atributos principais do iframe via Directus UI
- [ ] Presets funcionam e facilitam configuração rápida
- [ ] Warnings de segurança aparecem para configurações arriscadas
- [ ] Documentação completa com exemplos práticos
- [ ] Testes E2E validam funcionalidade
- [ ] Performance não é degradada (lazy loading funciona)
- [ ] Migração de instâncias existentes funciona sem quebrar iframes atuais

## Future Enhancements

- [ ] Templates compartilháveis entre múltiplos iframes
- [ ] Auditoria de mudanças de configuração (quem alterou, quando)
- [ ] Sugestões inteligentes baseadas no domínio da URL (ex: youtube.com → sugerir autoplay + fullscreen)
- [ ] Validação em tempo real se recursos estão funcionando (ex: downloads realmente funcionam)
- [ ] Dashboard de conformidade de segurança (quantos iframes têm configuração insegura)

## References

- [MDN - `<iframe>` Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN - iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [MDN - Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy)
- [HTML Living Standard - iframe](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#the-iframe-element)
- [OWASP - Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)
- [W3C - Referrer Policy](https://www.w3.org/TR/referrer-policy/)
