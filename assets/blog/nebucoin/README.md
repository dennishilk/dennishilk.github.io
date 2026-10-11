# Nebucoin educational reconstruction

Published alongside the bilingual personal story at:

- `/blog/i-built-my-own-cryptocurrency/`
- `/de/blog/i-built-my-own-cryptocurrency/`

These assets were created in October 2026. They are not original Nebucoin code,
wallet software, screenshots or evidence of historical transactions.
The N-on-coin motif is a modern reconstruction. The social-card SVG sources are
original artwork, with localized 1200 × 630 PNG exports.

## Source boundaries

Dennis's supplied recollections are authoritative for his personal experience.
Approximate dates, the L3 revision/hash rate, supply estimate, original PoS source,
difficulty rules and message fee formula cannot be independently recovered.
The Medium Raspberry Pi tutorial is a surviving contextual reference using
BankSocietyCoin, not a record of Nebucoin itself.

External references, linked in both articles:

- https://github.com/litecoin-project/litecoin
- https://www.futurebit.io/moonlander-2-support
- https://github.com/zone117x/node-open-mining-portal
- https://github.com/EasyX-Community/easyNOMP
- https://medium.com/@manydogecoin/how-to-install-any-qt-wallet-on-the-raspberry-pi-pi3b-21b20b10da6a

NOMP supplies the conceptual context; easyNOMP is related visual inspiration.
No source code or screenshots from either project are copied into these assets.
No surviving original interface or exact easyNOMP fork usage is asserted.

## Toy model

A: selectable architecture stages distinguish ordinary shares from valid blocks.

B: Web Crypto SHA-256 over `JSON.stringify([height, previous, data, difficulty,
nonce])`; accept 1–3 leading hexadecimal zeros. Not Scrypt or actual mining.
Each click is capped at 12,000 attempts with periodic event-loop pauses;
a session is capped at 12 blocks. A generation token cancels runs on reset.
There are no timers that start mining, staking or time progression on their own.

C/D: integer hundredths avoid monetary rounding drift. Ordinary shares and
invalid work generate no reward. An accepted toy block creates a fictional
5-NEBU pending reward. One later block makes that reward available. These reward
and maturity parameters are lab conventions, not historical chain parameters.
A 5-NEBU payout reserves 4.75 for the recipient and records 0.25 as pool deduction.
It is included only by a subsequently mined block; the recipient ledger then
changes. The wallet displays its last synchronized view while offline.
No independent transaction fee, signatures, peers, reorgs or consensus are modeled.

E: independent record preview, not a debit from C/D. Count Unicode code points,
reject more than 80; extra message fee is 0 if empty, otherwise
`1 + 0.25 * max(0, ceil(length / 20) - 1)` NEBU. This formula is illustrative,
not original C++ or evidence of historical consensus enforcement. User content
is rendered with `textContent`, never as markup. The recipient is visibly fake.

F: independent PoS exercise. Compare 100/500 eligible units, plus matured outputs.
Chance is `eligible / (eligible + 900)`, using hypothetical competing stake,
not the original essentially single-participant network. Seeded LCG draws
illustrate variance, not cryptographic staking. Each success adds one immature
NEBU, eligible after 24 simulated hours. A clock advancement produces no reward.
Limits: 200 searches, 240 simulated hours.

No fetch, sockets, storage, wallet connections, key input or third-party assets.
State exists only in page memory. No-JS readers get the full article, static
architecture explanations and disabled controls. SHA-256 requires HTTPS or
another browser-recognized secure context.

## Verification

```sh
node --test tests/nebucoin-lab.test.cjs tests/blog-rss.test.mjs tests/sitemaps.test.mjs tests/seo-sitemap-generator.test.mjs
npm run test:seo
node scripts/generate-blog-rss.mjs --check
```

Browser acceptance sequence, in each language:

1. Select architecture stages; submit one share and invalid work. Balances stay zero.
2. Mine two blocks; request payout; mine a third. Ledger credit is 4.75, wallet stays zero.
3. Open wallet; its view becomes 4.75. Check predecessor hashes and confirmations.
4. Try 80/81-character and Unicode messages; check fee boundaries and safe text preview.
5. Advance PoS time; eligibility changes but no automatic reward. Try searches and larger stake.
6. Reset during a mining run; old state must not reappear. Keyboard Enter activates controls.
7. Check both language-switch directions, no-JS reading, reduced motion and 320/375/768/1440 widths.
8. Confirm no external requests or browser errors.

Use the existing RSS generator and `sync-seo.mjs --sitemaps-only` after index changes.
