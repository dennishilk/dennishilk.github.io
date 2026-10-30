// Curated preview, deliberately not selected by date. No network or model needed.
export const words = [
  {
    id: 'moin', word: 'Moin', de: 'Hallo / Guten Tag', en: 'Hello / good day',
    example: 'Moin!', exampleDe: 'Hallo!', exampleEn: 'Hello!',
    noteDe: 'Ein Gruß für jede Tageszeit. Im Wörterbuch für Ostfriesland belegt; kein ausschließlich Wiesmoorer Ausdruck.',
    noteEn: 'A greeting for any time of day. Attested in the dictionary for East Frisia; not exclusive to Wiesmoor.',
    source: 'https://www.platt-wb.de/platt-hoch/?term=Moin',
    sourceLabel: 'Wörterbuch für Ostfriesland · Moin',
    checked: '2026-10-30', region: 'Ostfriesland', audio: null,
  },
  {
    id: 'snacken', word: 'snacken', de: 'sprechen / plaudern', en: 'to speak / to chat',
    example: 'Van snacken kummt snacken.',
    exampleDe: 'Ein Wort gibt das andere.', exampleEn: 'One word leads to another.',
    noteDe: 'Das Wörterbuch kennzeichnet diese Form und das Beispiel als ostostfriesisch. Der genaue Gebrauch in Wiesmoor ist noch nicht gesondert geprüft.',
    noteEn: 'The dictionary marks this form and example as eastern East Frisian. Usage specifically in Wiesmoor has not yet been checked separately.',
    source: 'https://www.platt-wb.de/platt-hoch/?term=snacken',
    sourceLabel: 'Wörterbuch für Ostfriesland · snacken',
    checked: '2026-10-30', region: 'Östliches Ostfriesland', audio: null,
  },
];

export function wordAt(index) {
  return words[((index % words.length) + words.length) % words.length];
}
