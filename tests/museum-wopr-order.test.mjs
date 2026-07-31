import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../museum/index.html', import.meta.url), 'utf8');
const featuredSection = html.match(/<section class="museum-featured"[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert.ok(featuredSection, 'Featured experience section must exist');
assert.match(featuredSection, /museum-card-linux-academy/, 'Linux Terminal Academy must be the featured experience');
assert.match(featuredSection, /<h2[^>]*>Linux Terminal Academy<\/h2>/, 'Featured experience must use the Linux Terminal Academy title');
assert.match(featuredSection, /href="\/museum\/linux-terminal-academy\/"/, 'Featured Academy CTA must link to the Linux Terminal Academy route');
assert.doesNotMatch(featuredSection, /museum-card-wopr|>WOPR</, 'WOPR must not be the featured experience');

const authorLabSection = html.match(/<section class="museum-behind"[^>]*>([\s\S]*?)<\/section>/)?.[1];
assert.ok(authorLabSection, 'Behind the Museum section must exist');
const authorLabCard = authorLabSection.match(/<article class="museum-card museum-card-author-lab">([\s\S]*?)<\/article>/)?.[0];
assert.equal(authorLabCard, `<article class="museum-card museum-card-author-lab">
        <div class="museum-card-top"><span class="museum-status available">AVAILABLE</span><span class="museum-real-systems">REAL SYSTEMS</span></div>
        <div class="museum-behind-content">
          <div>
            <h2 id="behind-museum-title">The Author's Computing Lab</h2>
            <p>The real computers and infrastructure behind this website and museum — connecting a Windows 98 workstation, modern Linux, a private homelab and the remote systems serving the project.</p>
          </div>
          <p class="museum-behind-path">WINDOWS 98 <span aria-hidden="true">→</span> LINUX <span aria-hidden="true">→</span> HOMELAB <span aria-hidden="true">→</span> WORLDNODE</p>
        </div>
        <a class="card-button" href="/museum/home-computing-lab/">EXPLORE THE REAL SETUP <span aria-hidden="true">→</span></a>
      </article>`, 'The Author\'s Computing Lab must remain unchanged');

const interactiveSection = html.match(/<section class="museum-collection" aria-labelledby="interactive-computing-title">([\s\S]*?)<\/section>/)?.[1];
assert.ok(interactiveSection, 'Interactive Computing section must exist');
const cards = [...interactiveSection.matchAll(/<article class="museum-card ([^"]+)">([\s\S]*?)<\/article>/g)];
assert.ok(cards.length > 0, 'Interactive Computing must contain cards');
assert.match(cards[0][1], /museum-card-wopr/, 'WOPR must be the first Interactive Computing card');
assert.match(cards[0][2], /museum-status available/, 'WOPR must retain AVAILABLE status');
assert.match(cards[0][2], /href="\/wopr\/"/, 'WOPR must link directly to its existing experience');
console.log('museum featured experience and WOPR ordering checks passed');
