import { describe, test, expect } from 'vitest';
import { useIframeAttributes } from '../src/utils/useIframeAttributes';
import type { Item } from '../src/types';

describe('useIframeAttributes', () => {
  const {
    parseSandboxTokens,
    parseAllowDirectives,
    buildSandboxAttribute,
    buildAllowAttribute,
    validateSandboxSecurity,
    getDefaultAttributes,
    buildIframeAttributes,
    VALID_SANDBOX_TOKENS,
    VALID_ALLOW_DIRECTIVES,
  } = useIframeAttributes();

  describe('parseSandboxTokens', () => {
    test('should parse array of valid tokens', () => {
      const tokens = ['allow-scripts', 'allow-same-origin', 'allow-forms'];
      const result = parseSandboxTokens(tokens);
      expect(result).toEqual(tokens);
    });

    test('should parse string with space-separated tokens', () => {
      const tokens = 'allow-scripts allow-same-origin allow-forms';
      const result = parseSandboxTokens(tokens);
      expect(result).toEqual(['allow-scripts', 'allow-same-origin', 'allow-forms']);
    });

    test('should filter out invalid tokens', () => {
      const tokens = ['allow-scripts', 'invalid-token', 'allow-forms', 'another-invalid'];
      const result = parseSandboxTokens(tokens);
      expect(result).toEqual(['allow-scripts', 'allow-forms']);
    });

    test('should return empty array for null', () => {
      const result = parseSandboxTokens(null);
      expect(result).toEqual([]);
    });

    test('should return empty array for undefined', () => {
      const result = parseSandboxTokens(undefined);
      expect(result).toEqual([]);
    });

    test('should handle empty string', () => {
      const result = parseSandboxTokens('');
      expect(result).toEqual([]);
    });
  });

  describe('parseAllowDirectives', () => {
    test('should parse array of valid directives', () => {
      const directives = ['camera', 'microphone', 'geolocation'];
      const result = parseAllowDirectives(directives);
      expect(result).toEqual(directives);
    });

    test('should parse string with semicolon-separated directives', () => {
      const directives = 'camera; microphone; geolocation';
      const result = parseAllowDirectives(directives);
      expect(result).toEqual(['camera', 'microphone', 'geolocation']);
    });

    test('should filter out invalid directives', () => {
      const directives = ['camera', 'invalid-directive', 'microphone'];
      const result = parseAllowDirectives(directives);
      expect(result).toEqual(['camera', 'microphone']);
    });

    test('should return empty array for null', () => {
      const result = parseAllowDirectives(null);
      expect(result).toEqual([]);
    });

    test('should return empty array for undefined', () => {
      const result = parseAllowDirectives(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('buildSandboxAttribute', () => {
    test('should build space-separated string from tokens', () => {
      const tokens = ['allow-scripts', 'allow-same-origin', 'allow-forms'];
      const result = buildSandboxAttribute(tokens as any);
      expect(result).toBe('allow-scripts allow-same-origin allow-forms');
    });

    test('should return empty string for empty array', () => {
      const result = buildSandboxAttribute([]);
      expect(result).toBe('');
    });

    test('should return empty string for null', () => {
      const result = buildSandboxAttribute(null);
      expect(result).toBe('');
    });

    test('should return empty string for undefined', () => {
      const result = buildSandboxAttribute(undefined);
      expect(result).toBe('');
    });
  });

  describe('buildAllowAttribute', () => {
    test('should build semicolon-separated string from directives', () => {
      const directives = ['camera', 'microphone', 'geolocation'];
      const result = buildAllowAttribute(directives);
      expect(result).toBe('camera; microphone; geolocation');
    });

    test('should return empty string for empty array', () => {
      const result = buildAllowAttribute([]);
      expect(result).toBe('');
    });

    test('should return empty string for null', () => {
      const result = buildAllowAttribute(null);
      expect(result).toBe('');
    });
  });

  describe('validateSandboxSecurity', () => {
    test('should warn about allow-same-origin + allow-scripts', () => {
      const tokens = ['allow-same-origin', 'allow-scripts'];
      const result = validateSandboxSecurity(tokens as any, 'https://example.com');

      expect(result.isSecure).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('allow-same-origin');
      expect(result.warnings[0]).toContain('allow-scripts');
    });

    test('should warn about allow-top-navigation', () => {
      const tokens = ['allow-scripts', 'allow-top-navigation'];
      const result = validateSandboxSecurity(tokens as any, 'https://example.com');

      expect(result.isSecure).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('allow-top-navigation');
    });

    test('should warn about allow-downloads with HTTP', () => {
      const tokens = ['allow-scripts', 'allow-downloads'];
      const result = validateSandboxSecurity(tokens as any, 'http://example.com');

      expect(result.isSecure).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('allow-downloads');
      expect(result.warnings[0]).toContain('HTTP');
    });

    test('should allow allow-downloads with HTTPS', () => {
      const tokens = ['allow-scripts', 'allow-downloads'];
      const result = validateSandboxSecurity(tokens as any, 'https://example.com');

      expect(result.isSecure).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should return secure for safe configuration', () => {
      const tokens = ['allow-scripts', 'allow-forms', 'allow-popups'];
      const result = validateSandboxSecurity(tokens as any, 'https://example.com');

      expect(result.isSecure).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    test('should detect multiple security issues', () => {
      const tokens = ['allow-same-origin', 'allow-scripts', 'allow-top-navigation', 'allow-downloads'];
      const result = validateSandboxSecurity(tokens as any, 'http://example.com');

      expect(result.isSecure).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(1);
    });
  });

  describe('getDefaultAttributes', () => {
    test('should return default attributes', () => {
      const defaults = getDefaultAttributes();

      expect(defaults).toHaveProperty('sandbox');
      expect(defaults).toHaveProperty('allow');
      expect(defaults).toHaveProperty('loading');
      expect(defaults).toHaveProperty('referrerpolicy');
      expect(defaults).toHaveProperty('allowfullscreen');

      expect(defaults.sandbox).toContain('allow-scripts');
      expect(defaults.loading).toBe('eager');
      expect(defaults.allowfullscreen).toBe(true);
    });
  });

  describe('buildIframeAttributes', () => {
    test('should return default attributes for null item', () => {
      const result = buildIframeAttributes(null);
      const defaults = getDefaultAttributes();

      expect(result).toEqual(defaults);
    });

    test('should return default attributes for undefined item', () => {
      const result = buildIframeAttributes(undefined);
      const defaults = getDefaultAttributes();

      expect(result).toEqual(defaults);
    });

    test('should build attributes from item with custom sandbox tokens', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: ['allow-scripts', 'allow-forms', 'allow-downloads'],
        allow_directives: null,
        loading: null,
        referrerpolicy: null,
        allowfullscreen: null,
      };

      const result = buildIframeAttributes(item);

      expect(result.sandbox).toBe('allow-scripts allow-forms allow-downloads');
      expect(result.allow).toBeDefined(); // Should have default
      expect(result.loading).toBe('eager'); // Should have default
    });

    test('should build attributes from item with custom allow directives', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: null,
        allow_directives: ['camera', 'microphone', 'geolocation'],
        loading: null,
        referrerpolicy: null,
        allowfullscreen: null,
      };

      const result = buildIframeAttributes(item);

      expect(result.allow).toBe('camera; microphone; geolocation');
      expect(result.sandbox).toBeDefined(); // Should have default
    });

    test('should use custom loading value', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: null,
        allow_directives: null,
        loading: 'lazy',
        referrerpolicy: null,
        allowfullscreen: null,
      };

      const result = buildIframeAttributes(item);

      expect(result.loading).toBe('lazy');
    });

    test('should use custom referrerpolicy', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: null,
        allow_directives: null,
        loading: null,
        referrerpolicy: 'no-referrer',
        allowfullscreen: null,
      };

      const result = buildIframeAttributes(item);

      expect(result.referrerpolicy).toBe('no-referrer');
    });

    test('should use custom allowfullscreen', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: null,
        allow_directives: null,
        loading: null,
        referrerpolicy: null,
        allowfullscreen: false,
      };

      const result = buildIframeAttributes(item);

      expect(result.allowfullscreen).toBe(false);
    });

    test('should include optional attributes when provided', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'document',
        url: 'https://example.com',
        thumbnail: '',
        translations: [],
        sandbox_tokens: null,
        allow_directives: null,
        loading: null,
        referrerpolicy: null,
        allowfullscreen: null,
        credentialless: true,
        iframe_name: 'test-iframe',
        iframe_title: 'Test Iframe for Accessibility',
        csp: "default-src 'self'",
      };

      const result = buildIframeAttributes(item);

      expect(result.credentialless).toBe(true);
      expect(result.name).toBe('test-iframe');
      expect(result.title).toBe('Test Iframe for Accessibility');
      expect(result.csp).toBe("default-src 'self'");
    });

    test('should handle complete Dashboard BI configuration', () => {
      const item: Item = {
        id: '1',
        sort: 1,
        status: 'published',
        icon: 'dashboard',
        url: 'https://superset.example.com/dashboard/123',
        thumbnail: '',
        translations: [],
        sandbox_tokens: [
          'allow-scripts',
          'allow-same-origin',
          'allow-forms',
          'allow-popups',
          'allow-popups-to-escape-sandbox',
          'allow-downloads',
        ],
        allow_directives: ['clipboard-write', 'encrypted-media', 'picture-in-picture'],
        loading: 'eager',
        referrerpolicy: 'strict-origin-when-cross-origin',
        allowfullscreen: true,
      };

      const result = buildIframeAttributes(item);

      expect(result.sandbox).toContain('allow-downloads');
      expect(result.allow).toContain('clipboard-write');
      expect(result.loading).toBe('eager');
      expect(result.allowfullscreen).toBe(true);
    });
  });

  describe('Constants', () => {
    test('should have all 14 valid sandbox tokens', () => {
      expect(VALID_SANDBOX_TOKENS).toHaveLength(14);
      expect(VALID_SANDBOX_TOKENS).toContain('allow-downloads');
      expect(VALID_SANDBOX_TOKENS).toContain('allow-scripts');
      expect(VALID_SANDBOX_TOKENS).toContain('allow-same-origin');
    });

    test('should have valid allow directives', () => {
      expect(VALID_ALLOW_DIRECTIVES.length).toBeGreaterThan(20);
      expect(VALID_ALLOW_DIRECTIVES).toContain('camera');
      expect(VALID_ALLOW_DIRECTIVES).toContain('microphone');
      expect(VALID_ALLOW_DIRECTIVES).toContain('clipboard-write');
    });
  });
});
