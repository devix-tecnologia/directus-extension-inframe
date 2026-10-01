// Lista de versões do Directus para testes automatizados
// Este arquivo é gerado automaticamente pelo script de CI

// Se uma versão específica for fornecida via env, usa apenas ela
const specificVersion = process.env.DIRECTUS_TEST_VERSION;

// Directus 11: 11.0.2 (mais antiga validada) e 11.17.4 (padrão dos testes).
// Directus 12: só a 12.4.1, fixada (autorização explícita para declarar compatibilidade; sem matriz 12.x).
// Nunca usar a tag 'latest': sempre versões exatas.
const allVersions = ['11.0.2', '11.17.4', '12.4.1'];

// Exporta apenas a versão específica se fornecida, ou todas as versões
export const directusVersions = specificVersion ? [specificVersion] : allVersions;

// Lista de versões bloqueadas (não serão testadas)
// 11.10.1 tem um erro conhecido que impede os testes
export const blockedDirectusVersions = ['11.10.1'];
