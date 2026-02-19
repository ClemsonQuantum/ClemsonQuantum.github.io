import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, '..', 'content');
const OUTPUT = path.join(__dirname, '..', 'public', 'search.json');

function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { data: {}, content: raw };
  const frontMatter = match[1];
  const content = raw.slice(match[0].length).trim();
  const data = {};
  for (const line of frontMatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && val && !val.startsWith('-')) data[key] = val;
  }
  return { data, content };
}

function walkDir(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, results);
    } else if (entry.name.endsWith('.md')) {
      const raw = fs.readFileSync(fullPath, 'utf-8');
      const { data, content } = parseFrontMatter(raw);
      const relDir = path.relative(CONTENT_ROOT, path.dirname(fullPath));
      const slug = entry.name.replace(/\.md$/, '');
      const url = `/${relDir}/${slug}/`.replace(/\\/g, '/');
      const excerpt = content
        .replace(/<[^>]+>/g, '')
        .replace(/[#*`_[\](){}|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 300);
      results.push({
        title: data.title ?? slug,
        url,
        excerpt,
        date: data.date ?? null,
      });
    }
  }
  return results;
}

const index = walkDir(CONTENT_ROOT);
fs.writeFileSync(OUTPUT, JSON.stringify(index, null, 2));
console.log(`Search index: ${index.length} entries → public/search.json`);
