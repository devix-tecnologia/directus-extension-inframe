import { useApi, useStores } from '@directus/extensions-sdk';
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
   * Get access token from stores
   */
  const getAccessToken = (): string => {
    try {
      const { useUserStore } = useStores();
      const userStore = useUserStore();
      
      // Try to get token from user store
      if (userStore && userStore.currentUser) {
        accessToken.value = userStore.accessToken || '';
        return accessToken.value;
      }

      // Fallback: try localStorage
      const token = localStorage.getItem('directus_token') || '';
      accessToken.value = token;
      return token;
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('[inFrame Security] Failed to get access token:', err.message);

      return '';
    }
  };

  /**
   * Validate URL security before replacing variables
   * MVP: Only validates HTTPS when using $token
   */
  const validateUrlSecurity = (url: string): SecurityValidationResult => {
    const result: SecurityValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    // Check if URL contains $token
    const hasToken = url.includes('$token') || url.includes('$refresh_token');

    if (hasToken) {
      // CRITICAL: Token variables require HTTPS
      if (!url.match(/\$token/) && !url.match(/\$refresh_token/)) {
        // No token variables after all
        return result;
      }

      // Extract the base URL to check protocol
      const urlParts = url.split('?');
      const urlPattern = urlParts.length > 0 ? urlParts[0] : url;

      if (urlPattern && !urlPattern.startsWith('https://')) {
        result.isValid = false;

        result.errors.push(
          '🔒 SECURITY ERROR: $token variable can only be used with HTTPS URLs. HTTP is not allowed.',
        );
      }

      // Add warning even for HTTPS
      result.warnings.push(
        '⚠️ WARNING: You are using $token in the URL. The token will be exposed in server logs, browser history, and referrer headers.'
      );

      result.warnings.push(
        '⚠️ Only use this with fully trusted external sites. Consider using a backend proxy for better security.'
      );
    }

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
      // Step 1: Validate security
      const validation = validateUrlSecurity(url);

      // Log warnings
      if (validation.warnings.length > 0) {
        validation.warnings.forEach((warning) => {
          // eslint-disable-next-line no-console
          console.warn('[inFrame Security]', warning);
        });
      }

      // Block if validation failed
      if (!validation.isValid) {
        validation.errors.forEach((err) => {
          // eslint-disable-next-line no-console
          console.error('[inFrame Security]', err);
        });

        error.value = validation.errors.join('\n');
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
      const token = url.includes('$token') ? getAccessToken() : '';

      // Step 5: Replace variables
      const processedUrl = replaceVariables(url, user, token);

      // Step 6: Log success (but not the full URL with token)
      if (url.includes('$token')) {
        // eslint-disable-next-line no-console
        console.info('[inFrame] URL processed with token variable (not logging full URL for security)');
      } else {
        // eslint-disable-next-line no-console
        console.info('[inFrame] URL processed:', processedUrl);
      }

      return processedUrl;
    } catch (err: any) {
      error.value = err.message;
      // eslint-disable-next-line no-console
      console.error('[inFrame] Error processing URL:', err);
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
