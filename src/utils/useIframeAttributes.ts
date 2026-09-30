import { SandboxToken, AllowDirective, IframeAttributes, Item } from '../types';

/**
 * Lista completa de tokens sandbox válidos
 */
export const VALID_SANDBOX_TOKENS: SandboxToken[] = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-presentation',
  'allow-same-origin',
  'allow-scripts',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation',
  'allow-top-navigation-by-user-activation',
  'allow-top-navigation-to-custom-protocols',
];

/**
 * Lista completa de diretivas allow válidas
 */
export const VALID_ALLOW_DIRECTIVES: AllowDirective[] = [
  'accelerometer',
  'ambient-light-sensor',
  'autoplay',
  'battery',
  'camera',
  'display-capture',
  'document-domain',
  'encrypted-media',
  'fullscreen',
  'gamepad',
  'geolocation',
  'gyroscope',
  'hid',
  'identity-credentials-get',
  'idle-detection',
  'local-fonts',
  'magnetometer',
  'microphone',
  'midi',
  'otp-credentials',
  'payment',
  'picture-in-picture',
  'publickey-credentials-create',
  'publickey-credentials-get',
  'screen-wake-lock',
  'serial',
  'speaker-selection',
  'usb',
  'web-share',
  'xr-spatial-tracking',
  'clipboard-write',
];

/**
 * Valores padrão para atributos do iframe
 */
export const DEFAULT_IFRAME_ATTRIBUTES: IframeAttributes = {
  sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox',
  allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
  loading: 'eager',
  referrerpolicy: 'strict-origin-when-cross-origin',
  allowfullscreen: true,
};

/**
 * Presets pré-configurados para diferentes casos de uso
 */
export const IFRAME_PRESETS = {
  'trusted-internal': {
    sandbox:
      'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals',
    allow: 'clipboard-write; encrypted-media; picture-in-picture; fullscreen',
  },
  'dashboard-bi': {
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads',
    allow: 'clipboard-write; encrypted-media; picture-in-picture',
  },
  videoconference: {
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups',
    allow: 'camera; microphone; display-capture; autoplay; fullscreen',
  },
  'external-trusted': {
    sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox',
    allow: 'encrypted-media; picture-in-picture',
  },
  untrusted: {
    sandbox: 'allow-scripts allow-forms',
    allow: '',
  },
  'view-only': {
    sandbox: '',
    allow: '',
  },
};

/**
 * Composable para gerenciar atributos do iframe
 */
export function useIframeAttributes() {
  /**
   * Parseia e valida tokens sandbox
   * @param tokens - String separada por espaço ou array de tokens
   * @returns Array de tokens válidos
   */
  function parseSandboxTokens(tokens: string | string[] | null | undefined): SandboxToken[] {
    if (!tokens) return [];

    const tokenArray = Array.isArray(tokens) ? tokens : tokens.split(/\s+/);

    return tokenArray.filter((token) => VALID_SANDBOX_TOKENS.includes(token as SandboxToken)) as SandboxToken[];
  }

  /**
   * Parseia e valida diretivas allow
   * @param directives - String separada por ; ou array de diretivas
   * @returns Array de diretivas válidas
   */
  function parseAllowDirectives(directives: string | string[] | null | undefined): string[] {
    if (!directives) return [];

    const directiveArray = Array.isArray(directives) ? directives : directives.split(/[;\s]+/);

    return directiveArray.filter((directive) => {
      const cleanDirective = directive.trim();
      if (!cleanDirective) return false;

      // Verifica se a diretiva base é válida (ignora origens como 'self', 'src', etc)
      const baseDirective = cleanDirective.split(/\s+/)[0];
      return VALID_ALLOW_DIRECTIVES.includes(baseDirective as AllowDirective);
    });
  }

  /**
   * Constrói o atributo sandbox a partir de tokens
   * @param tokens - Array de tokens sandbox
   * @returns String formatada para o atributo sandbox
   */
  function buildSandboxAttribute(tokens: SandboxToken[] | null | undefined): string {
    if (!tokens || tokens.length === 0) {
      return '';
    }

    return tokens.join(' ');
  }

  /**
   * Constrói o atributo allow a partir de diretivas
   * @param directives - Array de diretivas
   * @returns String formatada para o atributo allow
   */
  function buildAllowAttribute(directives: string[] | null | undefined): string {
    if (!directives || directives.length === 0) {
      return '';
    }

    return directives.join('; ');
  }

  /**
   * Valida segurança da configuração sandbox
   * @param tokens - Tokens sandbox
   * @param url - URL do iframe
   * @returns Objeto com status de validação e warnings
   */
  function validateSandboxSecurity(tokens: SandboxToken[], url: string): { isSecure: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Verifica combinação perigosa: allow-same-origin + allow-scripts
    if (tokens.includes('allow-same-origin') && tokens.includes('allow-scripts')) {
      warnings.push(
        '⚠️ ATENÇÃO: Usar "allow-same-origin" + "allow-scripts" pode permitir que o iframe acesse o DOM parent. Certifique-se de que a origem é totalmente confiável.',
      );
    }

    // Verifica allow-top-navigation (risco de clickjacking)
    if (tokens.includes('allow-top-navigation')) {
      warnings.push(
        '⚠️ ATENÇÃO: "allow-top-navigation" permite que o iframe redirecione a janela principal. Use "allow-top-navigation-by-user-activation" se possível.',
      );
    }

    // Verifica allow-downloads sem HTTPS
    if (tokens.includes('allow-downloads') && url && !url.startsWith('https://')) {
      warnings.push('❌ ERRO: "allow-downloads" com URL HTTP é inseguro. Use HTTPS para proteger os downloads.');
    }

    return {
      isSecure: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Retorna atributos padrão do iframe
   */
  function getDefaultAttributes(): IframeAttributes {
    return { ...DEFAULT_IFRAME_ATTRIBUTES };
  }

  /**
   * Constrói todos os atributos do iframe a partir do item
   * @param item - Item com configurações do iframe
   * @returns Objeto com todos os atributos formatados
   */
  function buildIframeAttributes(item: Item | null | undefined): IframeAttributes {
    if (!item) {
      return getDefaultAttributes();
    }

    // Parseia tokens sandbox
    const sandboxTokens = parseSandboxTokens(item.sandbox_tokens);
    const sandbox = buildSandboxAttribute(sandboxTokens);

    // Parseia diretivas allow
    const allowDirectives = parseAllowDirectives(item.allow_directives);
    const allow = buildAllowAttribute(allowDirectives);

    // Valida segurança
    const validation = validateSandboxSecurity(sandboxTokens, item.url || '');

    if (validation.warnings.length > 0) {
      // eslint-disable-next-line no-console
      console.warn('⚠️ Avisos de segurança do iframe:', validation.warnings);
    }

    return {
      sandbox: sandbox || DEFAULT_IFRAME_ATTRIBUTES.sandbox,
      allow: allow || DEFAULT_IFRAME_ATTRIBUTES.allow,
      loading: item.loading || DEFAULT_IFRAME_ATTRIBUTES.loading,
      referrerpolicy: item.referrerpolicy || DEFAULT_IFRAME_ATTRIBUTES.referrerpolicy,
      allowfullscreen: item.allowfullscreen ?? DEFAULT_IFRAME_ATTRIBUTES.allowfullscreen,
      credentialless: item.credentialless || false,
      name: item.iframe_name || undefined,
      title: item.iframe_title || undefined,
      csp: item.csp || undefined,
    };
  }

  /**
   * Aplica preset de configuração
   * @param presetName - Nome do preset
   * @returns Configuração do preset
   */
  function applyPreset(presetName: keyof typeof IFRAME_PRESETS) {
    return IFRAME_PRESETS[presetName] || IFRAME_PRESETS['trusted-internal'];
  }

  return {
    parseSandboxTokens,
    parseAllowDirectives,
    buildSandboxAttribute,
    buildAllowAttribute,
    validateSandboxSecurity,
    getDefaultAttributes,
    buildIframeAttributes,
    applyPreset,
    VALID_SANDBOX_TOKENS,
    VALID_ALLOW_DIRECTIVES,
    DEFAULT_IFRAME_ATTRIBUTES,
    IFRAME_PRESETS,
  };
}
