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

// Versões fixas que você quer sempre testar
const fixedVersions = ['11.15.4'];

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
              .filter((v) => /^\d+\.\d+\.\d+$/.test(v));

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

  // Junta as fixas, as últimas e o "latest"
  const uniqueVersions = Array.from(new Set([...fixedVersions, ...latestVersions, 'latest']));

  // Lê o conteúdo atual do arquivo
  let fileContent = fs.readFileSync(versionsPath, 'utf8');

  // Substitui apenas o array directusVersions
  const newArray = `export const directusVersions = [\n  '${uniqueVersions.join("',\n  '")}',\n];`;

  fileContent = fileContent.replace(/export const directusVersions = \[[^\]]*\];/m, newArray);

  fs.writeFileSync(versionsPath, fileContent);

  console.log('Directus versions updated in directus-versions.js:', uniqueVersions);
  console.log('Blocked Directus versions:', blockedDirectusVersions);
}

updateVersions();
