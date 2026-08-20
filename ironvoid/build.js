#!/usr/bin/env node
// Inline every source file into a single self-contained HTML page so the game
// can be opened from disk or published anywhere without a server.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = fs.readdirSync(path.join(root, 'src')).filter((f) => f.endsWith('.js')).sort();

let bundle = '';
for (const f of files) {
  bundle += '\n/* ==== ' + f + ' ==== */\n' + fs.readFileSync(path.join(root, 'src', f), 'utf8');
}

const out = html.replace(/<script src="src\/[^"]+"><\/script>\s*/g, '')
                .replace('</body>', '<script>' + bundle + '\n</script>\n</body>');

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const dest = path.join(root, 'dist', 'ironvoid.html');
fs.writeFileSync(dest, out);
console.log('wrote ' + path.relative(process.cwd(), dest) + '  (' + (out.length / 1024).toFixed(1) + ' KB, ' + files.length + ' modules)');
