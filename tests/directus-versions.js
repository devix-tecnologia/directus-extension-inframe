// Lista de versões do Directus para testes automatizados
// Este arquivo é gerado automaticamente pelo script de CI

// Se uma versão específica for fornecida via env, usa apenas ela
const specificVersion = process.env.DIRECTUS_TEST_VERSION;

const allVersions = ['9.23.1', '9.22.4', '9.24.0', '10.8.3', '11.13.1'];

// Exporta apenas a versão específica se fornecida, ou todas as versões
export const directusVersions = specificVersion ? [specificVersion] : allVersions;

// Lista de versões bloqueadas (não serão testadas)
// 11.10.1 tem um erro conhecido que impede os testes
export const blockedDirectusVersions = ['11.10.1'];
