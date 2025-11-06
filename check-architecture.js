/**
 * Simple Clean Architecture Checker
 * Verifies layer dependencies are correct
 */

const fs = require('fs');
const path = require('path');

// Define layer rules
const LAYERS = {
  domain: ['domain'],
  application: ['domain', 'application'],
  infrastructure: ['domain', 'application', 'infrastructure'],
  presentation: ['domain', 'application', 'presentation']
};

const violations = [];

function shouldIgnore(filePath) {
  // ✅ Exclude node_modules and other non-source directories
  return filePath.includes('node_modules') ||
         filePath.includes('dist') ||
         filePath.includes('build') ||
         filePath.includes('.git');
}

function getLayer(filePath) {
  if (filePath.includes('/domain/')) return 'domain';
  if (filePath.includes('/application/')) return 'application';
  if (filePath.includes('/infrastructure/')) return 'infrastructure';
  if (filePath.includes('/presentation/')) return 'presentation';
  return null;
}

function checkFile(filePath) {
  if (shouldIgnore(filePath)) return; // ✅ Skip ignored files

  const layer = getLayer(filePath);
  if (!layer) return;

  const content = fs.readFileSync(filePath, 'utf8');
  const importRegex = /from ['"](.+?)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) continue; // Relative imports are fine

    const importedLayer = getLayer(importPath);
    if (!importedLayer) continue;

    const allowedLayers = LAYERS[layer];
    if (!allowedLayers.includes(importedLayer)) {
      violations.push({
        file: filePath,
        layer: layer,
        importing: importedLayer,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldIgnore(filePath)) { // ✅ Skip ignored directories
        walkDir(filePath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      checkFile(filePath);
    }
  });
}

// Run checker on src/ directory only
console.log('🔍 Checking Clean Architecture in src/...\n');
walkDir('./src');

if (violations.length === 0) {
  console.log('✅ No architecture violations found!');
  console.log('🎉 Score: 100/100');
  process.exit(0);
} else {
  console.log(`❌ Found ${violations.length} violations:\n`);
  violations.forEach(v => {
    console.log(`  ${v.file}:${v.line}`);
    console.log(`  ${v.layer} layer cannot import from ${v.importing} layer\n`);
  });
  process.exit(1);
}
