import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const privacyPage = await readFile(new URL('../datenschutzerklaerung.html', import.meta.url), 'utf8');

test('privacy policy contains the essential Novel Reader disclosures', () => {
  assert.match(privacyPage, /Novel Reader Signal/);
  assert.match(privacyPage, /Chapter Open belegt nicht, dass ein Kapitel gelesen oder beendet/);
  assert.match(privacyPage, /rollierendes 24-Stunden-Fenster/);
  assert.match(privacyPage, /keine Cookies[\s\S]*Browser-Fingerprinting/);
  assert.match(privacyPage, /weder eine dauerhafte Leseridentität noch eine individuelle Lesehistorie/);
  assert.match(privacyPage, /Rohe IP-Adressen und individuelle Anfrage-Datensätze werden nicht veröffentlicht/);
  assert.match(privacyPage, /all_time\.since/);
});
