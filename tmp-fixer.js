import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIR = path.join(__dirname, 'client/src');

const replacements = [
  { from: /bg-\[#0F0F11\]/g, to: 'bg-background' },
  { from: /bg-\[#1A1A1E\]/g, to: 'bg-surface' },
  { from: /border-white\/10/g, to: 'border-border' },
  { from: /border-white\/5/g, to: 'border-border' },
  { from: /text-zinc-200/g, to: 'text-foreground' },
  { from: /text-zinc-300/g, to: 'text-foreground text-opacity-90' },
  { from: /text-zinc-400/g, to: 'text-muted-foreground' },
  { from: /text-zinc-500/g, to: 'text-muted-foreground text-opacity-70' },
  { from: /text-zinc-600/g, to: 'text-muted-foreground text-opacity-50' },
  { from: /text-white/g, to: 'text-foreground' },
  { from: /bg-zinc-800/g, to: 'bg-muted' },
  { from: /bg-zinc-900/g, to: 'bg-muted' },
  { from: /bg-white\/5/g, to: 'bg-muted' },
  { from: /bg-white\/10/g, to: 'bg-muted hover:bg-muted/80' },
  { from: /hover:bg-white\/5/g, to: 'hover:bg-muted' },
  { from: /hover:bg-white\/10/g, to: 'hover:bg-muted' },
  { from: /hover:border-white\/10/g, to: 'hover:border-primary\/50' },
  { from: /placeholder-zinc-500/g, to: 'placeholder-muted-foreground' }
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let original = content;
      replacements.forEach(({ from, to }) => {
        content = content.replace(from, to);
      });
      if (content !== original) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

walk(DIR);
