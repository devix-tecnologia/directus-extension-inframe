import { useApi } from '@directus/extensions-sdk';
import { ref } from 'vue';

export interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  language: string;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/** Variables that carry a Directus credential and therefore require HTTPS */
const TOKEN_VARIABLE_PATTERN = /\$(refresh_)?token/;

const HTTPS_REQUIRED_ERROR =
  '🔒 SECURITY ERROR: $token variable can only be used with HTTPS URLs. HTTP is not allowed.';

const isHttpsUrl = (url: string): boolean => {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Composable for URL variable replacement with security validations
 */
export const useUrlVariableReplacement = () => {
  const api = useApi();
  const userData = ref<UserData | null>(null);
  const accessToken = ref<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * Fetch current user data from Directus API
   */
  const getUserData = async (): Promise<UserData | null> => {
    try {
      const response = await api.get('/users/me', {
        params: {
          fields: ['id', 'email', 'first_name', 'last_name', 'role', 'language'],
        },
      });

      const data = response.data?.data || response.data;

      userData.value = {
        id: data.id || '',
        email: data.email || '',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        role: data.role || '',
        language: data.language || 'en-US',
      };

      return userData.value;
    } catch (err: any) {
      error.value = `Failed to fetch user data: ${err.message}`;
      // eslint-disable-next-line no-console
      console.error('[inFrame Security]', error.value);

      return null;
    }
  };

  /**
   * Get access token from custom endpoint
   * Since Directus 11+ uses HTTP-only cookies and stores are not available in modules,
   * we use a custom endpoint that returns the token from the authenticated request.
   *
   * SECURITY: never log the token, any part of it, its length or the raw endpoint response.
   */
  const getAccessToken = async (): Promise<string> => {
    try {
      const response = await api.get('/inframe-token');
      const token = response.data?.data?.access_token;

      if (token && typeof token === 'string' && token.length > 20) {
        accessToken.value = token;
        return token;
      }

      // eslint-disable-next-line no-console
      console.error('[inFrame Security] The /inframe-token endpoint did not return a valid access token');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[inFrame Security] Failed to get access token from /inframe-token:', err?.message);
    }

    return '';
  };

  /**
   * Validate URL security before replacing variables.
   *
   * Rules for URLs that contain a token variable ($token or $refresh_token):
   * - the URL must be absolute and parseable;
   * - the scheme must be https: (case-insensitive). There is NO exception for http://localhost or 127.0.0.1;
   * - the token variable may not appear in the host name (it would leak through DNS).
   *
   * URLs without token variables are not restricted by this function (HTTP is allowed).
   * The URL must already be normalized (see normalizeUrl in ItemDetail.vue, which adds https:// when the
   * protocol is missing) and is validated as a template, before any variable is replaced.
   */
  const validateUrlSecurity = (url: string): SecurityValidationResult => {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!url || !TOKEN_VARIABLE_PATTERN.test(url)) {
      return result;
    }

    let parsed: URL | null;

    try {
      parsed = new URL(url.trim());
    } catch {
      parsed = null;
    }

    if (!parsed || parsed.protocol !== 'https:') {
      result.isValid = false;
      result.errors.push(HTTPS_REQUIRED_ERROR);
    } else if (TOKEN_VARIABLE_PATTERN.test(parsed.hostname)) {
      result.isValid = false;

      result.errors.push(
        '🔒 SECURITY ERROR: $token variable cannot be used in the host name of the URL. Use it in the path or query string.',
      );
    }

    // Add warning even for HTTPS
    result.warnings.push(
      '⚠️ WARNING: You are using $token in the URL. The token will be exposed in server logs, browser history, and referrer headers.',
    );

    result.warnings.push(
      '⚠️ Only use this with fully trusted external sites. Consider using a backend proxy for better security.',
    );

    return result;
  };

  /**
   * Replace variables in URL with actual values
   */
  const replaceVariables = (url: string, user: UserData | null, token: string): string => {
    if (!url) return '';

    let replacedUrl = url;

    // Authentication variables
    if (token && url.includes('$token')) {
      replacedUrl = replacedUrl.replace(/\$token/g, encodeURIComponent(token));
    }

    // User identity variables
    if (user) {
      replacedUrl = replacedUrl
        .replace(/\$user_id/g, encodeURIComponent(user.id))
        .replace(/\$user_email/g, encodeURIComponent(user.email))
        .replace(/\$user_first_name/g, encodeURIComponent(user.first_name))
        .replace(/\$user_last_name/g, encodeURIComponent(user.last_name))
        .replace(/\$user_name/g, encodeURIComponent(`${user.first_name} ${user.last_name}`))
        .replace(/\$user_role/g, encodeURIComponent(user.role))
        .replace(/\$locale/g, encodeURIComponent(user.language));
    }

    // Context variables
    const timestamp = new Date().toISOString();
    replacedUrl = replacedUrl.replace(/\$timestamp/g, encodeURIComponent(timestamp));

    return replacedUrl;
  };

  /**
   * Main function: Process URL with variable replacement and security validation
   */
  const processUrl = async (url: string): Promise<string> => {
    if (!url) return '';

    loading.value = true;
    error.value = null;

    try {
      // Step 1: Validate security (before fetching the token or replacing anything)
      const validation = validateUrlSecurity(url);

      validation.warnings.forEach((warning) => {
        // eslint-disable-next-line no-console
        console.warn('[inFrame Security]', warning);
      });

      // Block if validation failed
      if (!validation.isValid) {
        throw new Error(validation.errors.join('\n'));
      }

      // Step 2: Check if URL has variables
      const hasVariables = url.match(/\$\w+/);

      if (!hasVariables) {
        // No variables, return normalized URL
        return url;
      }

      // Step 3: Fetch user data if needed
      const user = await getUserData();

      if (!user) {
        // eslint-disable-next-line no-console
        console.warn('[inFrame] Failed to fetch user data, some variables may not be replaced');
      }

      // Step 4: Get access token if needed
      let token = '';

      if (url.includes('$token')) {
        token = await getAccessToken();

        if (!token) {
          // eslint-disable-next-line no-console
          console.error(
            '[inFrame] The URL contains $token but no access token was found; the variable will not be replaced',
          );
        }
      }

      // Step 5: Replace variables
      const processedUrl = replaceVariables(url, user, token);

      // Step 6: Defense in depth - the final URL that carries the token must still be HTTPS
      if (token && !isHttpsUrl(processedUrl)) {
        throw new Error(HTTPS_REQUIRED_ERROR);
      }

      // Never log the processed URL: it may contain the token or personal data
      return processedUrl;
    } catch (err: any) {
      error.value = err?.message || String(err);
      // eslint-disable-next-line no-console
      console.error('[inFrame Security]', error.value);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    processUrl,
    getUserData,
    getAccessToken,
    validateUrlSecurity,
    replaceVariables,
    userData,
    accessToken,
    loading,
    error,
  };
};
