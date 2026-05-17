const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (filePath.endsWith('.css')) {
    // 1. Fix Profile.css undefined variables
    if (content.includes('--color-surface-glass')) {
      content = content.replace(/--color-surface-glass/g, '--color-glass');
      modified = true;
    }
    if (content.includes('--color-border-glass')) {
      content = content.replace(/--color-border-glass/g, '--color-glass-border');
      modified = true;
    }

    // 2. Fix Dashboard.css hardcoded gradient
    if (content.includes('background: linear-gradient(135deg, var(--color-primary) 0%, #059669 100%);')) {
      content = content.replace(
        'background: linear-gradient(135deg, var(--color-primary) 0%, #059669 100%);',
        'background-color: var(--color-primary);\n  background-image: linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.25) 100%);'
      );
      modified = true;
    }

    // 3. Make all font-sizes dynamic
    // Match "font-size: 14px;" or "font-size: 14px"
    const fontSizeRegex = /font-size:\s*(\d+(?:\.\d+)?)px/g;
    if (fontSizeRegex.test(content)) {
      content = content.replace(fontSizeRegex, 'font-size: calc($1px + var(--font-size-offset, 0px))');
      modified = true;
    }
  } else if (filePath.endsWith('AppContext.tsx')) {
    // 4. Update AppContext to set --font-size-offset instead of document.documentElement.style.fontSize
    if (content.includes('document.documentElement.style.fontSize = `${16 + fontSizeOffset}px`;')) {
      content = content.replace(
        'document.documentElement.style.fontSize = `${16 + fontSizeOffset}px`;',
        'document.documentElement.style.setProperty(\'--font-size-offset\', `${fontSizeOffset}px`);'
      );
      content = content.replace(
        'document.documentElement.style.removeProperty(\'font-size\');',
        'document.documentElement.style.removeProperty(\'--font-size-offset\');'
      );
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else {
      processFile(fullPath);
    }
  }
}

walkDir(srcDir);
console.log('Done patching files.');
