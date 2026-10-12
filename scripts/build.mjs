// Optional static packaging. GitHub Pages can still publish the repository root.
import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '_site');
if (dirname(output) !== root) throw new Error('Output must stay inside this project.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const entries = ['index.html', 'works.html', '404.html', 'favicon.svg', '.nojekyll', 'css', 'js', 'assets', 'links', 'projects', 'games', 'about'];
for (const entry of entries) await cp(join(root, entry), join(output, entry), {
  recursive: true,
  filter: path => !path.includes('original-upload') && !path.endsWith('README.md')
});
async function count(dir) {
  let total = 0;
  for (const file of await readdir(dir, { withFileTypes: true })) total += file.isDirectory() ? await count(join(dir, file.name)) : 1;
  return total;
}
console.log(`Static package ready: _site/ (${await count(output)} files). No runtime dependencies.`);
