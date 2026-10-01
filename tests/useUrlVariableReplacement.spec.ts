import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useApi } from '@directus/extensions-sdk';
import { useUrlVariableReplacement } from '../src/utils/useUrlVariableReplacement';

// Mock do SDK do Directus
// Desde a 2.2.0 o token vem do endpoint customizado /inframe-token (o Directus 11 usa
// cookies HTTP-only); os dados do usuário continuam vindo de /users/me.
vi.mock('@directus/extensions-sdk', () => ({
  useApi: vi.fn(() => ({
    get: vi.fn(async (path: string) => {
      if (path === '/inframe-token') {
        return { data: { data: { access_token: 'test-access-token-xyz' } } };
      }

      return {
        data: {
          id: 'test-user-123',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'admin',
          language: 'en-US',
        },
      };
    }),
  })),
  useStores: vi.fn(() => ({
    useUserStore: vi.fn(() => ({
      currentUser: {
        id: 'test-user-123',
        email: 'test@example.com',
      },
      accessToken: 'test-access-token-xyz',
    })),
  })),
}));

describe('useUrlVariableReplacement', () => {
  let composable: ReturnType<typeof useUrlVariableReplacement>;

  beforeEach(() => {
    composable = useUrlVariableReplacement();
    vi.clearAllMocks();
  });

  describe('Token variable replacement ($token)', () => {
    test('should replace $token in HTTPS URL with actual access token', async () => {
      const inputUrl = 'https://dashboard.example.com/report?auth=$token';
      const expectedToken = 'test-access-token-xyz';

      const result = await composable.processUrl(inputUrl);

      expect(result).toContain(encodeURIComponent(expectedToken));
      expect(result).toBe(`https://dashboard.example.com/report?auth=${encodeURIComponent(expectedToken)}`);
    });

    test('should replace $token along with other variables in HTTPS URL', async () => {
      const inputUrl = 'https://analytics.example.com/view?token=$token&user=$user_id&email=$user_email';

      const result = await composable.processUrl(inputUrl);

      expect(result).toContain('token=test-access-token-xyz');
      expect(result).toContain('user=test-user-123');
      expect(result).toContain('email=test%40example.com');
    });

    test('should block $token in HTTP URL (non-HTTPS)', async () => {
      const inputUrl = 'http://insecure.example.com/report?auth=$token';

      await expect(composable.processUrl(inputUrl)).rejects.toThrow(/SECURITY ERROR.*HTTPS/);
    });

    test('should not replace $token if URL does not contain the variable', async () => {
      const inputUrl = 'https://dashboard.example.com/report?user=$user_id';

      const result = await composable.processUrl(inputUrl);

      expect(result).not.toContain('test-access-token-xyz');
      expect(result).toContain('user=test-user-123');
    });

    test('REGRESSION: should replace $token even with special URL patterns', async () => {
      // This test ensures that the early return bug doesn't prevent token replacement
      const testCases = [
        'https://app.example.com/api?auth=$token',
        'https://app.example.com/api?token=$token&refresh=$refresh_token',
        'https://app.example.com/$token/path',
        'https://app.example.com/endpoint?key=$token#section',
      ];

      for (const inputUrl of testCases) {
        const result = await composable.processUrl(inputUrl);

        // Token should be replaced in all cases
        expect(result).toContain('test-access-token-xyz');
        expect(result).not.toContain('$token');
      }
    });
  });

  describe('Other dynamic variables', () => {
    test('should replace $user_id correctly', async () => {
      const inputUrl = 'https://example.com/dashboard?user=$user_id';

      const result = await composable.processUrl(inputUrl);

      expect(result).toBe('https://example.com/dashboard?user=test-user-123');
    });

    test('should replace $user_email correctly', async () => {
      const inputUrl = 'https://example.com/view?email=$user_email';

      const result = await composable.processUrl(inputUrl);

      expect(result).toBe('https://example.com/view?email=test%40example.com');
    });

    test('should replace $user_role correctly', async () => {
      const inputUrl = 'https://example.com/access?role=$user_role';

      const result = await composable.processUrl(inputUrl);

      expect(result).toBe('https://example.com/access?role=admin');
    });

    test('should replace $locale correctly', async () => {
      const inputUrl = 'https://example.com/lang?locale=$locale';

      const result = await composable.processUrl(inputUrl);

      expect(result).toBe('https://example.com/lang?locale=en-US');
    });

    test('should replace $timestamp with ISO 8601 format', async () => {
      const inputUrl = 'https://example.com/log?time=$timestamp';

      const result = await composable.processUrl(inputUrl);

      expect(result).toMatch(/https:\/\/example\.com\/log\?time=\d{4}-\d{2}-\d{2}T\d{2}%3A\d{2}%3A\d{2}\.\d{3}Z/);
    });

    test('should replace multiple variables in the same URL', async () => {
      const inputUrl = 'https://example.com/report?user=$user_id&email=$user_email&role=$user_role&lang=$locale';

      const result = await composable.processUrl(inputUrl);

      expect(result).toContain('user=test-user-123');
      expect(result).toContain('email=test%40example.com');
      expect(result).toContain('role=admin');
      expect(result).toContain('lang=en-US');
    });
  });

  describe('Security validation', () => {
    test('should pass validation for HTTPS URL with $token', () => {
      const url = 'https://secure.example.com/api?token=$token';

      const validation = composable.validateUrlSecurity(url);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings.length).toBeGreaterThan(0); // Should have security warnings
    });

    test('should fail validation for HTTP URL with $token', () => {
      const url = 'http://insecure.example.com/api?token=$token';

      const validation = composable.validateUrlSecurity(url);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('SECURITY ERROR');
      expect(validation.errors[0]).toContain('HTTPS');
    });

    test('should pass validation for URL without $token (HTTP allowed)', () => {
      const url = 'http://example.com/public?user=$user_id';

      const validation = composable.validateUrlSecurity(url);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should display security warnings when using $token', () => {
      const url = 'https://trusted.example.com/auth?token=$token';

      const validation = composable.validateUrlSecurity(url);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.includes('token will be exposed'))).toBe(true);
    });

    test('should validate and show warnings even with $token in query params', () => {
      const url = 'https://app.example.com/dashboard?auth=$token&user=$user_id';

      const validation = composable.validateUrlSecurity(url);

      // Should pass validation (HTTPS)
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Should have warnings about token exposure
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.toLowerCase().includes('warning'))).toBe(true);
    });

    test('should validate regardless of $token position in URL', () => {
      const urls = [
        'https://example.com/page?token=$token',
        'https://example.com/page?user=$user_id&token=$token',
        'https://example.com/page?token=$token&other=value',
        'https://example.com/$token/page',
      ];

      urls.forEach((url) => {
        const validation = composable.validateUrlSecurity(url);

        // All should pass (HTTPS) and have warnings
        expect(validation.isValid).toBe(true);
        expect(validation.warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Security rules (task-007)', () => {
    const TOKEN = 'test-access-token-xyz';

    const getApiMock = () => vi.mocked(useApi).mock.results.at(-1)!.value as { get: ReturnType<typeof vi.fn> };

    test.each([
      ['http://insecure.example.com/report?auth=$token'],
      ['HTTP://insecure.example.com/report?auth=$token'],
      ['http://localhost:3000/report?auth=$token'],
      ['http://127.0.0.1:8080/report?auth=$token'],
      ['ftp://files.example.com/?auth=$token'],
      ['javascript:alert(1)//$token'],
      ['/relative/path?auth=$token'],
      ['example.com/report?auth=$token'],
      ['http://insecure.example.com/report?auth=$refresh_token'],
    ])('should block token variable in non-HTTPS URL: %s', async (inputUrl) => {
      const fresh = useUrlVariableReplacement();
      const api = getApiMock();

      await expect(fresh.processUrl(inputUrl)).rejects.toThrow(/SECURITY ERROR.*HTTPS/);
      expect(fresh.error.value).toMatch(/SECURITY ERROR/);
      expect(fresh.loading.value).toBe(false);
      // The token must not even be requested for a blocked URL
      expect(api.get).not.toHaveBeenCalledWith('/inframe-token');
    });

    test('should block $token in the host name', async () => {
      const fresh = useUrlVariableReplacement();

      await expect(fresh.processUrl('https://$token.attacker.example.com/')).rejects.toThrow(/host name/);
    });

    test('should accept HTTPS scheme in any letter case', async () => {
      const result = await composable.processUrl('HTTPS://dashboard.example.com/report?auth=$token');

      expect(result).toContain(`auth=${TOKEN}`);
    });

    test('should allow HTTP URLs without token variables', async () => {
      const result = await composable.processUrl('http://intranet.example.com/report?user=$user_id');

      expect(result).toBe('http://intranet.example.com/report?user=test-user-123');
      expect(composable.error.value).toBeNull();
    });

    test('should never log the token', async () => {
      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => {}),
      );

      try {
        await composable.processUrl('https://dashboard.example.com/report?auth=$token&user=$user_id');
        await expect(composable.processUrl('http://insecure.example.com/?auth=$token')).rejects.toThrow();

        const logged = spies
          .flatMap((spy) => spy.mock.calls.flat())
          .map((arg) => {
            try {
              return typeof arg === 'string' ? arg : JSON.stringify(arg);
            } catch {
              return String(arg);
            }
          });

        expect(logged.some((line) => line.includes(TOKEN))).toBe(false);
        expect(logged.some((line) => line.includes('test-access'))).toBe(false);
        expect(logged.some((line) => /inFrame DEBUG/.test(line))).toBe(false);
      } finally {
        spies.forEach((spy) => spy.mockRestore());
      }
    });

    test('should not log the endpoint response when the token is invalid', async () => {
      const shortToken = 'short-secret';
      const fresh = useUrlVariableReplacement();
      const api = getApiMock();

      api.get.mockImplementation(async (path: string) =>
        path === '/inframe-token' ? { data: { data: { access_token: shortToken } } } : { data: { id: 'u1' } },
      );

      const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((method) =>
        vi.spyOn(console, method).mockImplementation(() => {}),
      );

      try {
        const result = await fresh.processUrl('https://dashboard.example.com/report?auth=$token');

        // Invalid token is rejected (not sent to the iframe)
        expect(result).not.toContain(shortToken);

        const logged = spies.flatMap((spy) => spy.mock.calls.flat()).map((arg) => JSON.stringify(arg));
        expect(logged.some((line) => line.includes(shortToken))).toBe(false);
      } finally {
        spies.forEach((spy) => spy.mockRestore());
      }
    });
  });

  describe('Edge cases', () => {
    test('should return empty string for empty URL', async () => {
      const result = await composable.processUrl('');

      expect(result).toBe('');
    });

    test('should return URL unchanged if no variables present', async () => {
      const inputUrl = 'https://example.com/static-page';

      const result = await composable.processUrl(inputUrl);

      expect(result).toBe(inputUrl);
    });

    test('should properly encode special characters in variables', async () => {
      const inputUrl = 'https://example.com/search?email=$user_email';

      const result = await composable.processUrl(inputUrl);

      // @ should be encoded as %40
      expect(result).toContain('%40');
    });
  });
});
