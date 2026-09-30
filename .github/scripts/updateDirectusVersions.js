// Script para atualizar src/tests/directus-versions.js com as versões não-deprecadas do Directus
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionsPath = path.resolve(__dirname, '../../tests/directus-versions.js');

// Importa versões bloqueadas do arquivo de versões
import { blockedDirectusVersions } from '../../tests/directus-versions.js';

// Versões fixas que você quer sempre testar (a 11.x mais antiga validada)
const fixedVersions = ['11.0.2'];

// Política Devix: Directus nunca >= 12 (a v12 muda a licença).
// Só entram versões com major <= MAX_DIRECTUS_MAJOR; a tag 'latest' não é usada
// porque já aponta para a 12.x.
const MAX_DIRECTUS_MAJOR = 11;

function getAllDirectusVersions() {
  return new Promise((resolve, reject) => {
    https
      .get('https://registry.npmjs.org/directus', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));

        res.on('end', () => {
          try {
            const json = JSON.parse(data);

            const versions = Object.entries(json.versions)
              .filter(([v, meta]) => !meta.deprecated && !blockedDirectusVersions.includes(v))
              .map(([v]) => v)
              .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
              .filter((v) => Number(v.split('.')[0]) <= MAX_DIRECTUS_MAJOR);

            resolve(versions);
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function updateVersions() {
  let allVersions = [];

  try {
    allVersions = await getAllDirectusVersions();
  } catch {
    console.warn('Não foi possível buscar as versões do Directus, mantendo apenas as fixas.');
  }

  // Mantém as últimas 5 versões não-deprecadas
  const latestVersions = allVersions.slice(-5);

  // Junta as fixas e as últimas (sem 'latest': ver MAX_DIRECTUS_MAJOR)
  const uniqueVersions = Array.from(new Set([...fixedVersions, ...latestVersions]));

  // Lê o conteúdo atual do arquivo
  let fileContent = fs.readFileSync(versionsPath, 'utf8');

  // Substitui apenas o array allVersions
  const newArray = `const allVersions = [\n  '${uniqueVersions.join("',\n  '")}',\n];`;

  fileContent = fileContent.replace(/const allVersions = \[[^\]]*\];/m, newArray);

  fs.writeFileSync(versionsPath, fileContent);

  console.log('Directus versions updated in directus-versions.js:', uniqueVersions);
  console.log('Blocked Directus versions:', blockedDirectusVersions);
}

updateVersions();
