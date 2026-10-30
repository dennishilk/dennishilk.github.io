// Learning component: independent of chat matching and conversation state.
export async function loadWords(fetcher = fetch) {
  const response = await fetcher(new URL('./knowledge/platt-words.json',import.meta.url));
  if (!response.ok) throw new Error('WORDS_UNAVAILABLE');
  return (await response.json()).entries;
}
export function wordAt(words,index) { return words[((index % words.length)+words.length)%words.length]; }
export function dailyWordIndex(words,date = new Date()) {
  // Local calendar date, not elapsed 24-hour intervals (DST-safe). Stable IDs.
  const key = Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()) / 86400000;
  return ((key % words.length)+words.length)%words.length;
}
