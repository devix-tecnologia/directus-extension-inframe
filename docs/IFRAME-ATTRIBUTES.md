# Atributos Configuráveis do Iframe

## Visão Geral

A partir da versão 2.2.0, a extensão directus-extension-inframe permite configurar dinamicamente os atributos HTML do
iframe através da interface do Directus. Isso proporciona controle granular sobre segurança, recursos do navegador e
comportamento de cada iframe.

## Atributos Disponíveis

### 1. Sandbox Permissions (sandbox_tokens)

Controla as restrições de segurança aplicadas ao conteúdo do iframe. Por padrão, o iframe tem restrições máximas e você
deve habilitar explicitamente cada funcionalidade necessária.

**Interface:** Checkbox múltipla  
**Tipo de campo:** JSON (array de strings)  
**Valores padrão:** `allow-scripts`, `allow-same-origin`, `allow-forms`, `allow-popups`,
`allow-popups-to-escape-sandbox`

#### Tokens Disponíveis:

| Token                            | Descrição                                  | Quando usar                          |
| -------------------------------- | ------------------------------------------ | ------------------------------------ |
| `allow-downloads`                | Permite downloads via `<a download>`       | Superset, BI tools, relatórios       |
| `allow-forms`                    | Permite submissão de formulários           | Formulários externos                 |
| `allow-modals`                   | Permite `alert()`, `confirm()`, `prompt()` | Apps interativos                     |
| `allow-popups`                   | Permite `window.open()`                    | OAuth, sistemas legados              |
| `allow-popups-to-escape-sandbox` | Popups não herdam sandbox                  | OAuth, autenticação externa          |
| `allow-same-origin`              | Trata conteúdo como mesma origem           | Necessário para cookies/localStorage |
| `allow-scripts`                  | Permite JavaScript                         | Dashboards, apps web                 |

**⚠️ Avisos de Segurança:**

- **`allow-same-origin` + `allow-scripts`**: Combinação potencialmente perigosa. Use apenas com origens totalmente
  confiáveis.
- **`allow-top-navigation`**: Permite que o iframe redirecione a janela principal. Evite usar.
- **`allow-downloads` sem HTTPS**: Downloads via HTTP são inseguros. Sempre use HTTPS.

### 2. Permissions Policy (allow_directives)

Controla quais APIs e recursos do navegador o iframe pode acessar.

**Interface:** Checkbox múltipla  
**Tipo de campo:** JSON (array de strings)  
**Valores padrão:** `accelerometer`, `autoplay`, `clipboard-write`, `encrypted-media`, `gyroscope`, `picture-in-picture`

#### Diretivas Principais:

| Diretiva             | Descrição                         | Caso de Uso           |
| -------------------- | --------------------------------- | --------------------- |
| `camera`             | Acesso à câmera                   | Videoconferência      |
| `microphone`         | Acesso ao microfone               | Videoconferência      |
| `geolocation`        | Localização GPS                   | Mapas, rastreamento   |
| `clipboard-write`    | Escrever na área de transferência | Copiar dados          |
| `fullscreen`         | Modo tela cheia                   | Vídeos, apresentações |
| `autoplay`           | Reprodução automática de mídia    | Vídeos                |
| `picture-in-picture` | Picture-in-Picture                | Players de vídeo      |

### 3. Loading

Controla o comportamento de carregamento do iframe.

**Interface:** Select dropdown  
**Tipo de campo:** String  
**Valor padrão:** `eager`

**Opções:**

- `eager`: Carrega imediatamente (padrão)
- `lazy`: Carrega apenas quando próximo ao viewport (lazy loading)

**Quando usar lazy:**

- Iframes que não são imediatamente visíveis na página
- Múltiplos iframes pesados na mesma página
- Otimização de performance e largura de banda

### 4. Referrer Policy

Controla quais informações de referrer são enviadas ao iframe.

**Interface:** Select dropdown  
**Tipo de campo:** String  
**Valor padrão:** `strict-origin-when-cross-origin`

**Opções:**

- `no-referrer`: Não envia nenhum referrer (máxima privacidade)
- `strict-origin-when-cross-origin`: Balanceado (recomendado)
- `no-referrer-when-downgrade`: Envia referrer exceto HTTPS→HTTP
- `origin`: Envia apenas a origem
- `same-origin`: Envia referrer apenas para mesma origem

### 5. Allow Fullscreen

Permite que o iframe use a API de fullscreen.

**Interface:** Boolean toggle  
**Tipo de campo:** Boolean  
**Valor padrão:** `true`

### 6. Credentialless (Experimental)

Carrega o iframe sem enviar cookies ou credenciais. Implementa isolamento de storage.

**Interface:** Boolean toggle  
**Tipo de campo:** Boolean  
**Valor padrão:** `false`

**⚠️ Experimental:** Suporte limitado (Chrome 110+)

### 7. Iframe Name

Nome do iframe, usado como target para links (`<a target="nome">`).

**Interface:** Input text  
**Tipo de campo:** String  
**Valor padrão:** `null`

### 8. Iframe Title

Título descritivo para acessibilidade (leitores de tela).

**Interface:** Input text  
**Tipo de campo:** String  
**Valor padrão:** `null`

**Recomendação:** Sempre preencher para melhorar acessibilidade.

### 9. Content Security Policy (Experimental)

Aplica Content Security Policy adicional ao iframe.

**Interface:** Textarea  
**Tipo de campo:** Text  
**Valor padrão:** `null`

**Exemplo:** `default-src 'self'; script-src 'self' https://trusted.cdn.com`

**⚠️ Experimental:** Suporte limitado nos navegadores.

## Presets Recomendados

### Dashboard BI / Superset

```json
{
  "sandbox_tokens": [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups",
    "allow-popups-to-escape-sandbox",
    "allow-downloads"
  ],
  "allow_directives": [
    "clipboard-write",
    "encrypted-media",
    "picture-in-picture"
  ],
  "loading": "eager",
  "referrerpolicy": "strict-origin-when-cross-origin",
  "allowfullscreen": true
}
```

### Videoconferência

```json
{
  "sandbox_tokens": [
    "allow-scripts",
    "allow-same-origin",
    "allow-forms",
    "allow-popups"
  ],
  "allow_directives": [
    "camera",
    "microphone",
    "display-capture",
    "autoplay",
    "fullscreen"
  ],
  "loading": "eager",
  "referrerpolicy": "strict-origin-when-cross-origin",
  "allowfullscreen": true
}
```

### Conteúdo Externo Não Confiável

```json
{
  "sandbox_tokens": [
    "allow-scripts",
    "allow-forms"
  ],
  "allow_directives": [],
  "loading": "lazy",
  "referrerpolicy": "no-referrer",
  "allowfullscreen": false
}
```

## Como Usar

1. **Criar/Editar um Inframe:**
   - Acesse a coleção "Inframe" no Directus
   - Preencha os campos básicos (URL, ícone, título)

2. **Configurar Sandbox:**
   - Marque os tokens sandbox necessários
   - Deixe desmarcado para máxima restrição

3. **Configurar Permissions Policy:**
   - Marque os recursos/APIs que o iframe precisa acessar
   - Recursos sensíveis (camera, microphone) devem ser habilitados com cuidado

4. **Ajustar Performance:**
   - Use `loading="lazy"` para iframes não críticos
   - Otimiza carregamento da página

5. **Configurar Privacidade:**
   - Escolha `referrerpolicy` apropriada
   - Para máxima privacidade, use `no-referrer`

## Validações de Segurança

A extensão aplica validações automáticas e exibe warnings no console quando detecta:

1. **Combinação `allow-same-origin` + `allow-scripts`**: Potencial risco XSS
2. **`allow-top-navigation` habilitado**: Risco de clickjacking
3. **`allow-downloads` com URL HTTP**: Inseguro, use HTTPS

## Comportamento Padrão (Fallback)

Se nenhum campo for configurado, a extensão usa valores padrão seguros:

```javascript
{
  sandbox: "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox",
  allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
  loading: "eager",
  referrerpolicy: "strict-origin-when-cross-origin",
  allowfullscreen: true
}
```

## Suporte de Navegadores

| Atributo       | Chrome | Firefox | Safari       | Edge   |
| -------------- | ------ | ------- | ------------ | ------ |
| sandbox        | ✅     | ✅      | ✅           | ✅     |
| allow          | ✅     | ✅      | ✅ (parcial) | ✅     |
| loading        | ✅83+  | ✅75+   | ✅16.4+      | ✅83+  |
| referrerpolicy | ✅     | ✅      | ✅           | ✅     |
| credentialless | ✅110+ | ❌      | ❌           | ✅110+ |

## Referências

- [MDN - `<iframe>` Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN - iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#sandbox)
- [MDN - Permissions Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy)
- [OWASP - Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)

## Troubleshooting

### Downloads não funcionam no iframe

**Solução:** Adicione `allow-downloads` aos sandbox tokens e certifique-se de que a URL usa HTTPS.

### Vídeo não entra em fullscreen

**Solução:** Habilite `allowfullscreen` e adicione `fullscreen` aos allow_directives.

### Formulário não submete

**Solução:** Adicione `allow-forms` aos sandbox tokens.

### Popup/OAuth não abre

**Solução:** Adicione `allow-popups` e `allow-popups-to-escape-sandbox` aos sandbox tokens.

### Conteúdo do iframe não acessa localStorage

**Solução:** Adicione `allow-same-origin` aos sandbox tokens (⚠️ apenas para origens confiáveis).
