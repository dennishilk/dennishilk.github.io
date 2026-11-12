import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {distros,desktops,questions,rank} from '../assets/linux-distro-finder/catalog.js';
import {generate,wmSettings} from '../assets/linux-distro-finder/config.js';
import {plan} from '../assets/linux-distro-finder/packages.js';
import {portraits} from '../content/linux-distro-finder/distros.mjs';
import {profiles} from '../content/linux-distro-finder/desktops.mjs';
import {updates,commandNotes} from '../content/linux-distro-finder/updates.mjs';

const root=join(import.meta.dirname,'..');
const read=path=>readFileSync(join(root,path),'utf8');
const screens=JSON.parse(read('content/linux-distro-finder/screens.json'));
const variants=[
 {lang:'en',prefix:'',article:'which-linux-distro-2026'},
 {lang:'de',prefix:'de/',article:'welche-linux-distribution-passt-zu-mir-2026'}
];

test('catalogs cover the 15 questions, 11 distributions and 12 desktops',()=>{
 assert.equal(questions.length,15);
 assert.equal(distros.length,11);
 assert.equal(desktops.length,12);
 for (const distro of distros) {
  assert.equal(portraits[distro.id].length,2);
  assert.equal(distro.profile.length,questions.length);
  assert.ok(distro.profile.every(n=>[0,1,2].includes(n)));
  assert.ok(distro.desktops.every(id=>desktops.some(d=>d.id===id)));
  for (const command of updates[distro.id][0]) assert.equal(commandNotes[command].length,2);
 }
 for (const desktop of desktops) {
  assert.equal(profiles[desktop.id].length,3);
  assert.ok(screens[profiles[desktop.id][0]]);
 }
});

test('rankings include every distribution, honor skipping and explain their score',()=>{
 assert.equal(rank([]).length,11);
 assert.ok(rank([]).every(r=>r.score===0));
 assert.equal(rank(distros.find(x=>x.id==='mint').profile)[0].id,'mint');
 assert.equal(rank(distros.find(x=>x.id==='gentoo').profile)[0].id,'gentoo');
 assert.equal(rank(distros.find(x=>x.id==='nixos').profile)[0].id,'nixos');
 const answers=[0,null,2,0,null,1];
 const initial=rank(answers);
 const updated=rank([2,...answers.slice(1)]);
 assert.notDeepEqual(initial.map(x=>x.score),updated.map(x=>x.score));
 for (const result of initial) {
  assert.equal(result.compared.length,4);
  assert.equal(result.score,result.compared.reduce((sum,x)=>sum+x.cost,0));
 }
 assert.deepEqual(rank(answers),initial);
});

test('Debian 13 and Arch xmonad plans include actual dependencies and launcher names',()=>{
 const choose=distro=>plan({distro,wm:'xmonad',browser:'firefox',terminal:'kitty'});
 const debian=choose('debian'),arch=choose('arch');
 assert.equal(debian.status,'direct');
 assert.equal(arch.status,'direct');
 assert.match(debian.command[1],/xmonad ghc libghc-xmonad-dev libghc-xmonad-contrib-dev xserver-xorg xinit suckless-tools kitty firefox-esr$/);
 assert.match(arch.command[0],/^sudo pacman -Syu xmonad xmonad-contrib ghc xorg-server xorg-xinit dmenu kitty firefox$/);
 for (const [distro,firefox] of [[debian,'firefox-esr'],[arch,'firefox']]) {
  const config=generate({wm:'xmonad',terminal:distro.term,browser:distro.launchBrowser})['xmonad.hs'];
  assert.match(config,new RegExp('spawn "'+firefox+'"'));
  assert.match(config,/spawn "kitty"/);
  assert.equal(distro.startup,'startx /usr/bin/xmonad');
 }
});

test('every package selection has a classified plan and supported paths produce files',()=>{
 let supported=0;
 for (const {id:distro} of distros) for (const wm of Object.keys(wmSettings)) {
  for (const browser of ['firefox','chromium','chrome']) for (const terminal of ['classic','kitty','alacritty']) {
   const settings=wmSettings[wm];
   const route=plan({distro,wm,browser,terminal,wallpaper:true});
   assert.ok(['direct','extra','unverified'].includes(route.status));
   if (route.status==='unverified') {
    assert.equal(route.command,undefined);
    continue;
   }
   supported++;
   assert.ok(route.command.every(Boolean));
   if (terminal==='classic') assert.equal(route.term,settings.protocol==='wayland'?'foot':'xterm');
   const files=generate({wm,browser:route.launchBrowser,terminal:route.term,wallpaper:true});
   assert.ok(files[settings.file].includes(route.term));
   assert.ok(files[settings.file].includes(route.launchBrowser));
   assert.ok(Object.entries(files).every(([name,value])=>!name.includes('/')&&value.endsWith('\n')));
   if (distro==='nixos') assert.match(route.module,/environment\.systemPackages = with pkgs;/);
  }
 }
 assert.ok(supported>350);
 assert.equal(plan({distro:'slackware',wm:'hyprland',browser:'firefox',terminal:'classic'}).status,'unverified');
});

test('design options are scoped to supported settings and input is allowlisted',()=>{
 const common={terminal:'kitty',browser:'firefox',preset:'custom',colors:['#010101','#020202','#a0b0c0','#d0e0f0'],font:'";touch example',fontSize:1000,gaps:12,border:4,bar:'bottom'};
 const dwm=generate({...common,wm:'dwm'})['config.h'];
 assert.match(dwm,/dmenufont\[\]\s*= "monospace:size=10"/);
 assert.doesNotMatch(dwm,/gaps|touch example/);
 const hypr=generate({...common,wm:'hyprland',animations:true})['hyprland.lua'];
 assert.match(hypr,/animations = \{ enabled = true \}/);
 assert.doesNotMatch(hypr,/position = "bottom"|touch example/);
 assert.throws(()=>generate({...common,wm:'xmonad',shortcuts:{browser:'Return'}}),/duplicate/);
 assert.throws(()=>generate({...common,wm:'xmonad',shortcuts:{browser:'1'}}),/reserved/);
 assert.throws(()=>generate({...common,wm:'xmonad',browser:'firefox; date'}),/selection/);
});

test('both languages have indexable profiles, credited image files and reciprocal metadata',()=>{
 for (const {lang,prefix,article} of variants) {
  const toolPath='/'+prefix+'tools/linux-distro-finder/';
  const articlePath='/'+prefix+'blog/'+article+'/';
  const tool=read(toolPath+'index.html'),story=read(articlePath+'index.html');
  assert.equal((tool.match(/id="distro-[a-z]+"/g)||[]).length,11);
  assert.equal((tool.match(/id="desktop-[a-z0-9]+"/g)||[]).length,12);
  assert.equal((tool.match(/id="update-[a-z]+"/g)||[]).length,11);
  assert.match(tool,/src="\/assets\/linux-distro-finder\/itsfine.webp"/);
  assert.doesNotMatch(tool,/hide-the-pain-dennis/);
  for (const image of Object.values(screens)) {
   assert.ok(existsSync(join(root,image.path)),image.path);
   assert.ok(tool.includes(image.path)&&tool.includes(image.source));
   assert.ok(image.w>0&&image.h>0);
  }
  for (const [html,path] of [[tool,toolPath],[story,articlePath]]) {
   assert.ok(html.includes('<html lang="'+lang+'">'));
   assert.ok(html.includes('rel="canonical" href="https://www.dennishilk.com'+path+'"'));
   assert.equal((html.match(/hreflang="(?:en|de|x-default)"/g)||[]).length,4);
   assert.ok(JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'].some(x=>x['@type']==='BreadcrumbList'));
  }
  const home=read(prefix+'index.html');
  const featured=home.split('class="cards"')[1].split('</section>')[0];
  assert.equal((featured.match(/class="card\b/g)||[]).length,5);
  const cardStart=featured.indexOf('<a href="'+toolPath+'" class="card">');
  assert.ok(cardStart>=0);
  const card=featured.slice(cardStart,featured.indexOf('</a>',cardStart));
  assert.match(card,/<h3>Distro &amp; WM Companion<\/h3>\s*<p>[^<]+<\/p>/);
  assert.doesNotMatch(card,/<(?:details|summary|button)\b|fa-arrow/);
  assert.match(tool,/href="\/linux-migration-companion\/"/);
  assert.ok(read(prefix+'blog/feed.xml').includes(articlePath));
 }
});
