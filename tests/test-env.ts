// Mock das variáveis de ambiente para testes
export const testEnv = {
  // Database config
  DB_CLIENT: 'sqlite3',
  DB_HOST: 'database',
  DB_NAME: 'directus',
  DB_USER: 'directus',
  DB_PASSWORD: 'directus',

  // Directus config
  DIRECTUS_KEY: '255d861b-5ea1-5996-9aa3-922530ec40b1',
  DIRECTUS_SECRET: '6116487b-cda1-52c2-b5b5-c8022c45e263',
  DIRECTUS_ADMIN_EMAIL: 'admin@example.com',
  DIRECTUS_ADMIN_PASSWORD: 'admin123',
  DIRECTUS_PUBLIC_URL: 'http://localhost:18055',

  // Outras configs
  STORAGE_LOCAL_ROOT: '/directus/uploads',
};

// Função para configurar o ambiente de teste
export function setupTestEnv() {
  // Backup das variáveis originais
  const originalEnv = { ...process.env };

  // Aplica as variáveis de teste
  Object.entries(testEnv).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Retorna função para restaurar o ambiente original
  return () => {
    // Restaura as variáveis originais
    Object.keys(testEnv).forEach((key) => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  };
}
