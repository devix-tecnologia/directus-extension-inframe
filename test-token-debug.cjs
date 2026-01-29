#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🔍 Testando substituição de variável $token...\n');
console.log('📝 Criando build da extensão...\n');

const projectDir = path.resolve(__dirname);

try {
  // Build da extensão
  execSync('pnpm build', { 
    cwd: projectDir, 
    stdio: 'inherit' 
  });

  console.log('\n✅ Build concluído!\n');
  console.log('🧪 Próximos passos para testar manualmente:');
  console.log('1. Reinicie o Directus');
  console.log('2. Acesse o módulo inFrame');
  console.log('3. Crie um item com URL: https://httpbin.org/get?token=$token');
  console.log('4. Abra o console do navegador (F12)');
  console.log('5. Procure por logs \'[inFrame DEBUG]\'\n');
  console.log('📊 Logs esperados:');
  console.log('   - Getting access token...');
  console.log('   - Token from userStore ou localStorage');
  console.log('   - replaceVariables called');
  console.log('   - Replacing $token...\n');
} catch (error) {
  console.error('❌ Erro ao executar build:', error.message);
  process.exit(1);
}
