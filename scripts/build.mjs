// Optional static packaging. GitHub Pages can still publish the repository root.
import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { transform } from 'esbuild';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '_site');
if (dirname(output) !== root) throw new Error('Output must stay inside this project.');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const entries = ['index.html', 'works.html', '404.html', 'favicon.svg', 'robots.txt', 'sitemap.xml', '.nojekyll', 'css', 'js', 'assets', 'links', 'projects', 'games', 'about'];
for (const entry of entries) await cp(join(root, entry), join(output, entry), {
  recursive: true,
  filter: path => !path.includes('original-upload') && !path.endsWith('README.md')
});
const assets = {}, routes = {};
const shell = ['config','core','main','sakura','effects','music','router'].map(name=>`js/${name}.js`);
const pageGroups = {
  links: ['icons','links'], projects: ['projects-data','projects'],
  games: ['game-engine','games'], works: ['works-data','works'],
  hit: ['dialogue','game-state','voice-manager','effects','game'].map(name=>`funny-hit/${name}`)
};
const pages = {
  'index.html':['./',['links','projects']], 'links/index.html':['./links/',['links']],
  'projects/index.html':['./projects/',['projects']], 'games/index.html':['./games/',['games']],
  'games/funny-hit/index.html':['./games/funny-hit/',['hit']],
  'works.html':['./works.html',['works']], 'about/index.html':['./about/',[]]
};
async function emit(path, source, loader) {
  const result = await transform(source, { loader, minify:true, target:'es2020', legalComments:'none', charset:'utf8' });
  const hash = createHash('sha256').update(result.code).digest('hex').slice(0,12);
  const hashed = path.replace(/\.(js|css)$/, `-${hash}.$1`);
  await writeFile(join(output,hashed),result.code);
  return './'+hashed;
}
for (const path of ['css/style.css','css/music.css','css/works.css','css/games.css','games/funny-hit/style.css','js/theme-init.js','js/page-content.js']) {
  assets['./'+path] = await emit(path, await readFile(join(root,path),'utf8'), path.endsWith('.css')?'css':'js');
}
const pageAssets = {};
for (const [name, modules] of Object.entries(pageGroups)) {
  const paths=modules.map(name=>name.startsWith('funny-hit/')?`games/${name}.js`:`js/${name}.js`);
  const source=(await Promise.all(paths.map(path=>readFile(join(root,path),'utf8')))).join('\n;\n');
  pageAssets[name]=await emit(`js/page-${name}.js`, source, 'js');
}
for (const [route,groups] of Object.values(pages)) routes[route]=groups.map(group=>pageAssets[group]);
// Resource hashes belong to the document, so editing a page or its CSS does not
// invalidate the shared shell. Escape HTML delimiters before embedding JSON.
const inlineJSON=value=>JSON.stringify(value).replace(/</g,'\\u003c');
const manifest=`window.SITE_ASSETS=${inlineJSON(assets)};window.SITE_ROUTE_ASSETS=${inlineJSON(routes)};`;
const shellAsset=await emit('js/shell.js',(await Promise.all(shell.map(path=>readFile(join(root,path),'utf8')))).join('\n;\n'),'js');
for (const [page,[route,groups]] of Object.entries(pages)) {
  let html=await readFile(join(root,page),'utf8'),insertedShell=false,insertedPage=false;
  const href=asset=>relative(dirname(join(output,page)),join(output,asset.slice(2))).replaceAll('\\','/');
  html=html.replace(/<script src="([^"]+)"(?: defer)?><\/script>/g,(tag,source)=>{
    const path=relative(root,resolve(root,dirname(page),source.split('?')[0])).replaceAll('\\','/');
    if(path==='js/theme-init.js')return `<script src="${href(assets['./'+path])}"></script>`;
    if(shell.includes(path)) {
      if(insertedShell)return '';insertedShell=true;
      return `<script id="site-asset-manifest">${manifest}</script>\n<script src="${href(shellAsset)}" defer></script>`;
    }
    if(!groups.length)throw Error(`Unexpected page script: ${path}`);
    if(insertedPage)return '';insertedPage=true;
    return routes[route].map(asset=>`<script src="${href(asset)}" defer></script>`).join('\n');
  });
  html=html.replace(/(<link rel="stylesheet" href=")([^"]+)(")/g,(tag,prefix,source,suffix)=>{
    const path='./'+relative(root,resolve(root,dirname(page),source.split('?')[0])).replaceAll('\\','/');
    if(!assets[path])throw Error(`Unmapped stylesheet: ${path}`);
    return prefix+href(assets[path])+suffix;
  });
  await writeFile(join(output,page),html.replace(/\n\s*\n/g,'\n'));
}
await writeFile(join(output,'asset-manifest.json'),JSON.stringify({assets,routes,shell:shellAsset},null,2));
async function count(dir) {
  let total = 0;
  for (const file of await readdir(dir, { withFileTypes: true })) total += file.isDirectory() ? await count(join(dir, file.name)) : 1;
  return total;
}
console.log(`Static package ready: _site/ (${await count(output)} files). Minified shell and on-demand page bundles use content hashes; no runtime dependencies.`);
