// Keep exact conversation cues separate from general knowledge matching.
const rephrase = [
  /^(?:das verstehe ich nicht|ich versteh(?:e)? das nicht)$/u,
  /^(?:(?:kannst du )?(?:erklär(?:e|en)? )?(?:mir )?(?:das|es|deine antwort) )?(?:bitte )?(?:noch )?(?:einfacher|ausführlicher|genauer)(?: erklär(?:e|en))?$/u,
  /^i (?:do not|don['’]t) (?:understand|get)(?: (?:it|that))?$/u,
  /^(?:(?:can|could) you )?explain (?:it|that|your (?:last )?answer) (?:again|more simply|in (?:more )?detail)$/u,
  /^(?:could you )?(?:say|put) (?:it|that) more simply$/u
];
const reference = new Set([
  'was hältst du davon', 'was haeltst du davon', 'was meinst du dazu', 'wie meinst du das',
  'was meinst du damit', 'warum ist das so', 'warum denn', 'warum', 'und weiter', 'was noch',
  'what do you think', 'what do you think about it', 'what do you think about that',
  'what do you mean', 'what do you mean by that', 'why', 'why is that', 'what else'
]);
const comparison = [
  /^und (?:wie sieht (?:es|das) mit .+ aus|(?:bei|mit) .+)$/u,
  /^(?:and )?(?:what|how) about .+$/u,
  /^(?:und|and) [\p{L}\d][\p{L}\d+.#-]*(?: linux)?$/u
];

export function followUpKind(text) {
  const question = text.trim().toLowerCase().replace(/[.!?,]+$/u, '').trim();
  if (rephrase.some(pattern => pattern.test(question))) return 'rephrase';
  if (reference.has(question)) return 'reference';
  if (comparison.some(pattern => pattern.test(question))) return 'comparison';
  return null;
}

export function relevantHistory(text, history, followUp=false) {
  const refersBack = /\b(?:dazu|davon|darauf|vorherige antwort|letzte antwort|das noch mal|your (?:last|previous) (?:answer|reply)|you just said|an example of (?:that|it)|expand on (?:that|it))\b/iu.test(text);
  if ((!followUp && !followUpKind(text) && !refersBack) || !history.length) return [];
  const latest = history.slice(-2);
  if (!followUpKind(latest[0].content)) return latest;
  for (let index = history.length - 4; index >= 0; index -= 2) {
    if (!followUpKind(history[index].content)) return [...history.slice(index, index + 2), ...latest];
  }
  return latest;
}

export function clarification(kind, language) {
  if (kind === 'rephrase') return language === 'de'
    ? 'Gern. Was soll ich einfacher oder genauer erklären?'
    : 'Sure. What would you like me to explain?';
  return language === 'de' ? 'Worauf beziehst du dich genau?' : 'What are you referring to?';
}
