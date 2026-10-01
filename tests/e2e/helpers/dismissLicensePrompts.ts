import { BrowserContext } from '@playwright/test';

/**
 * O app do Directus 12 abre modais de licença (onboarding, banner e aviso no login) que cobrem a tela
 * e interceptam os cliques dos testes. O próprio app grava estes cookies quando o usuário clica em
 * "Skip"/dispensar; aqui eles são definidos antes da navegação. No Directus 11 os cookies são ignorados.
 */
const LICENSE_PROMPT_COOKIES = [
  'license-onboarding-dismissed',
  'license-banner-dismissed',
  'license-login-modal-dismissed',
];

export async function dismissLicensePrompts(context: BrowserContext, baseURL: string | undefined): Promise<void> {
  const url = baseURL || 'http://localhost:8055';

  await context.addCookies(LICENSE_PROMPT_COOKIES.map((name) => ({ name, value: 'true', url })));
}
