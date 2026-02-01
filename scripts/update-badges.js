#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read package.json
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = packageJson.version;
const license = packageJson.license;

console.log(`📦 Current version: ${version}`);
console.log(`⚖️  Current license: ${license}`);

// Generate version badge SVG
const versionText = `v${version}`;
const versionTextLength = versionText.length * 70; // Approximate width per character
const badgeWidth = 35 + versionTextLength / 10;

const versionBadgeSVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${badgeWidth}" height="20" role="img" aria-label="npm version ${versionText}">
  <title>npm version ${versionText}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${badgeWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="35" height="20" fill="#555"/>
    <rect x="35" width="${badgeWidth - 35}" height="20" fill="#007ec6"/>
    <rect width="${badgeWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="185" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="250">npm</text>
    <text x="185" y="140" transform="scale(.1)" fill="#fff" textLength="250">npm</text>
    <text aria-hidden="true" x="${35 * 10 + versionTextLength / 2}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${versionTextLength}">${versionText}</text>
    <text x="${35 * 10 + versionTextLength / 2}" y="140" transform="scale(.1)" fill="#fff" textLength="${versionTextLength}">${versionText}</text>
  </g>
</svg>
`;

// Write version badge
const versionBadgePath = join(rootDir, 'docs', `badge-npm-${versionText.replace(/\./g, '-')}.svg`);
writeFileSync(versionBadgePath, versionBadgeSVG);
console.log(`✅ Version badge created: ${versionBadgePath}`);

// Update README.md
const readmePath = join(rootDir, 'README.md');
let readme = readFileSync(readmePath, 'utf-8');

// Replace version badge reference
const versionBadgeRegex = /\[!\[npm version.*?\]\(https:\/\/raw\.githubusercontent\.com\/devix-tecnologia\/directus-extension-inframe\/main\/docs\/badge-npm-v[\d-]+\.svg\)\]\(https:\/\/www\.npmjs\.com\/package\/directus-extension-inframe\)/g;
const newVersionBadge = `[![npm version ${versionText}](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/main/docs/badge-npm-${versionText.replace(/\./g, '-')}.svg)](https://www.npmjs.com/package/directus-extension-inframe)`;

if (versionBadgeRegex.test(readme)) {
  readme = readme.replace(versionBadgeRegex, newVersionBadge);
  console.log(`✅ README.md version badge updated to ${versionText}`);
} else {
  console.log(`⚠️  Version badge pattern not found in README.md`);
}

// Update license badge alt text
const licenseBadgeRegex = /\[!\[License.*?\]\(https:\/\/raw\.githubusercontent\.com\/devix-tecnologia\/directus-extension-inframe\/main\/docs\/badge-license-gpl-3-0\.svg\)\]\(https:\/\/github\.com\/devix-tecnologia\/directus-extension-inframe\/blob\/main\/LICENSE\)/g;
const newLicenseBadge = `[![License ${license}](https://raw.githubusercontent.com/devix-tecnologia/directus-extension-inframe/main/docs/badge-license-gpl-3-0.svg)](https://github.com/devix-tecnologia/directus-extension-inframe/blob/main/LICENSE)`;

if (licenseBadgeRegex.test(readme)) {
  readme = readme.replace(licenseBadgeRegex, newLicenseBadge);
  console.log(`✅ README.md license badge alt text updated to "${license}"`);
} else {
  console.log(`⚠️  License badge pattern not found in README.md`);
}

// Write updated README
writeFileSync(readmePath, readme);
console.log(`✅ README.md updated successfully`);

console.log('\n🎉 Badge update complete!');
