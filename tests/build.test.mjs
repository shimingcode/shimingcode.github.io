import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'../_site');
const manifest=JSON.parse(readFileSync(resolve(root,'asset-manifest.json'),'utf8'));
const assets=[...Object.values(manifest.assets),manifest.shell,...Object.values(manifest.routes).flat()];
test('Every generated asset name matches its actual content hash',()=>{
  for(const asset of assets){
    const source=readFileSync(resolve(root,asset));
    const hash=createHash('sha256').update(source).digest('hex').slice(0,12);
    assert(asset.includes(`-${hash}.`),asset);
  }
});
test('Built pages load their route bundles once after the same shell, with valid relative resources',()=>{
  for(const [page,route] of Object.entries({'index.html':'./','links/index.html':'./links/','projects/index.html':'./projects/','games/index.html':'./games/','games/funny-hit/index.html':'./games/funny-hit/','works.html':'./works.html','about/index.html':'./about/'})){
    const html=readFileSync(resolve(root,page),'utf8');
    const scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(scripts.length,2+manifest.routes[route].length,page);
    assert.equal(scripts.filter(s=>s.includes(manifest.shell.slice(5))).length,1,page);
    const resolved=scripts.map(source=>resolve(root,dirname(page),source));
    assert.deepEqual(resolved,[manifest.assets['./js/theme-init.js'],manifest.shell,...manifest.routes[route]].map(asset=>resolve(root,asset)),page);
    assert.equal(new Set(resolved).size,resolved.length,page);
    const deferred=[...html.matchAll(/<script src="([^"]+)" defer><\/script>/g)].map(m=>resolve(root,dirname(page),m[1]));
    assert.deepEqual(deferred,resolved.slice(1),page);
    const inline=[...html.matchAll(/<script id="site-asset-manifest">([\s\S]*?)<\/script>/g)];
    assert.equal(inline.length,1,page);
    assert(inline[0].index<html.indexOf(`<script src="${scripts[1]}"`),`${page}: manifest must precede shell`);
    assert.doesNotMatch(inline[0][1],/</,`${page}: manifest JSON must escape HTML delimiters`);
    const context={window:{}};vm.runInNewContext(inline[0][1],context);
    assert.deepEqual(JSON.parse(JSON.stringify(context.window)),{SITE_ASSETS:manifest.assets,SITE_ROUTE_ASSETS:manifest.routes},page);
    for(const m of html.matchAll(/(?:src|href)="([^"\s]+)"/g)){
      if(/^(?:[a-z]+:|#|\/)/i.test(m[1]))continue;
      assert(existsSync(resolve(root,dirname(page),m[1].split(/[?#]/)[0])),`${page}: ${m[1]}`);
    }
  }
});

test('Home reuses the exact platform and project bundles across route transitions',()=>{
  assert.deepEqual(manifest.routes['./'],[...manifest.routes['./links/'],...manifest.routes['./projects/']]);
  assert.equal(manifest.routes['./links/'].length,1);
  assert.equal(manifest.routes['./projects/'].length,1);
  const loaded=new Set(),registrations=[];
  const context={window:{Site:{register:name=>registrations.push(name)}}};
  for(const route of ['./','./links/','./projects/','./']){
    for(const asset of manifest.routes[route]){
      if(loaded.has(asset))continue;
      vm.runInNewContext(readFileSync(resolve(root,asset),'utf8'),context);
      loaded.add(asset);
    }
  }
  assert.equal(loaded.size,2);
  assert.deepEqual(registrations,['links','projects']);
  assert(context.window.SITE_ICONS.github);
  assert.equal(context.window.PROJECTS.length,5);
});

test('Shared shell does not embed changing page or stylesheet asset URLs',()=>{
  const shell=readFileSync(resolve(root,manifest.shell),'utf8');
  for(const asset of [...Object.values(manifest.assets),...Object.values(manifest.routes).flat()]){
    assert(!shell.includes(asset),`Shell must not embed ${asset}`);
  }
  assert.doesNotMatch(shell,/window\.SITE_(?:ROUTE_)?ASSETS\s*=/);
});
test('Runtime sources, all original game dialogue and audio remain packaged',()=>{
  for(const path of ['js/config.js','games/funny-hit/dialogue.js','assets/games/funny-hit/voices/xiaosheng-denial.wav','assets/audio/bgm-web.mp3'])assert(existsSync(resolve(root,path)),path);
  const shell=readFileSync(resolve(root,manifest.shell),'utf8');
  assert.match(shell,/import\(/);
  assert.match(shell,/Page module timed out/);
  assert(!existsSync(resolve(root,'service-worker.js')));
});
