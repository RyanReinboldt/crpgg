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

// Second output: body content only, for hosts that supply their own document
// skeleton (the Artifact viewer wraps the file in doctype/head/body itself).
const style = out.slice(out.indexOf('<style>'), out.indexOf('</style>') + 8);
const body = out.slice(out.indexOf('<body'), out.lastIndexOf('</body>'));
const inner = body.slice(body.indexOf('>') + 1);
const embed = '<title>IRONVOID</title>\n' + style +
  '\n<style>html,body{margin:0;padding:0;background:#0b0e11}</style>\n' +
  '<script>document.body.dataset.scene="meta";</script>\n' + inner;
const dest2 = path.join(root, 'dist', 'ironvoid.embed.html');
fs.writeFileSync(dest2, embed);
console.log('wrote ' + path.relative(process.cwd(), dest2) + '  (' + (embed.length / 1024).toFixed(1) + ' KB)');
