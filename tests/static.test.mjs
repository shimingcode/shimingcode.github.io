import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import vm from 'node:vm';
const root = resolve(import.meta.dirname, '..');
const read = path => readFileSync(join(root, path), 'utf8');
const context = { window: {} };
for (const file of ['config', 'projects-data', 'works-data']) vm.runInNewContext(read(`js/${file}.js`), context);
const config = context.window.SITE_CONFIG;
const localPath = value => join(root, decodeURIComponent(value.split(/[?#]/)[0]));
const pages = ['index.html','works.html','404.html','projects/index.html','games/index.html','links/index.html','about/index.html'];

test('Every JavaScript file parses', () => {
  for (const file of readdirSync(join(root, 'js'))) if (file.endsWith('.js')) new vm.Script(read(`js/${file}`), { filename: file });
});
test('All eleven existing platform entries remain valid and configurable', () => {
  assert.equal(config.socialLinks.length, 11);
  for (const item of config.socialLinks) {
    assert.ok(item.name && item.category && item.icon);
    if (item.action === 'copy') assert.ok(config[item.field]);
    else { const url = new URL(item.url); assert.ok(['http:','https:'].includes(url.protocol)); assert.equal(url.username + url.password, ''); }
  }
  assert.equal(config.socialLinks.filter(x => x.icon === 'qq').length, 2);
});
test('Static pages reference existing resources, including subdirectory routes', () => {
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /lang="zh-CN"/);
    assert.match(html, /name="viewport"/);
    for (const match of html.matchAll(/(?:src|srcset|href)="([^"\s]+)"/g)) {
      const value = match[1]; if (/^(?:[a-z]+:|#|\/)/i.test(value)) continue;
      const target = resolve(root, dirname(page), value.split(/[?#]/)[0]);
      assert.ok(existsSync(target), `${page}: missing ${value}`);
    }
  }
  for (const page of config.pages) assert.ok(existsSync(localPath(page.url)), page.url);
});
test('CSS images resolve relative to their stylesheet', () => {
  for (const name of readdirSync(join(root,'css'))) {
    for (const match of read(`css/${name}`).matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
      assert.ok(existsSync(resolve(root,'css',match[1])), `${name}: ${match[1]}`);
    }
  }
});
test('Every gallery item has a real JPEG and a real WebP thumbnail', () => {
  const ids = new Set();
  for (const work of context.window.WORKS) {
    assert.ok(!ids.has(work.id)); ids.add(work.id);
    const original = readFileSync(localPath(work.image));
    const thumb = readFileSync(localPath(work.thumbnail));
    assert.equal(original.readUInt16BE(0), 0xffd8);
    assert.equal(thumb.toString('ascii',0,4), 'RIFF');
    assert.equal(thumb.toString('ascii',8,12), 'WEBP');
    assert.ok(work.width > 0 && work.height > 0);
  }
});
test('Project examples are explicit, covers exist, real local demos resolve', () => {
  const categories = new Set();
  for (const project of context.window.PROJECTS) {
    categories.add(project.category); assert.ok(existsSync(localPath(project.cover)));
    const svg=readFileSync(localPath(project.cover),'utf8');
    assert.doesNotMatch(svg, /&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-f]+;)/i, 'SVG text must escape ampersands');
    if (project.example) { assert.equal(project.source,null); assert.equal(project.demo,null); }
    else { assert.ok(project.source && project.demo); if (project.demo.startsWith('.')) assert.ok(existsSync(localPath(project.demo))); }
  }
  assert.equal(categories.size, 5);
});
test('Single configured music source exists and pages keep one persistent audio shell', () => {
  assert.ok(existsSync(localPath(config.music.src)));
  assert.equal(config.music.playlist, undefined);
  for (const page of pages.filter(x => x !== '404.html')) {
    const html=read(page); assert.match(html, /<audio[^>]+preload="none"/); assert.doesNotMatch(html, /<audio[^>]+(?:autoplay|src=)/);
    assert.equal((html.match(/<audio /g) || []).length,1);
    assert.match(html, /data-site-shell="music-v3"/);
    assert.doesNotMatch(html, /fonts\.googleapis|cdn\.jsdelivr|unpkg\.com/);
  }
});
test('Pages deployment marker and safe external link handling exist', () => {
  assert.ok(existsSync(join(root,'.nojekyll')));
  assert.match(read('js/core.js'), /noopener noreferrer/);
  assert.match(read('js/links.js'), /noopener noreferrer/);
  assert.match(read('js/core.js'), /result\.username \|\| result\.password/);
});
