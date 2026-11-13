const author = /\bdennis(?:\s+hilk)?\b/iu;
const family = /\b(?:ehefrau|ehemann|ehepartner(?:in)?|lebenspartner(?:in)?|partner(?:in)?|freundin|frau|mann|kinder?|sohn|tochter|geschwister|eltern|familie|privatleben|verheiratet|wife|husband|spouse|girlfriend|boyfriend|children|kids?|son|daughter|siblings?|parents?|family|private life|married)\b/iu;
const personalReference = /\b(?:sein(?:e[rmns]?)?|ihr(?:e[rmns]?)?|von ihm|his|her|their)\b/iu;
const familyPossessive = /\b(?:seine[rmsn]?|ihre[rmsn]?|dennis(?: hilk)?s?|his|her|their) (?:frau|mann|freundin|partner(?:in)?|ehefrau|ehemann|wife|husband|spouse|girlfriend|boyfriend|partner)\b/iu;
const nameQuestion = /^(?:(?:wer ist|was macht|kennst du|who is|what does|do you know|tell me about|erzahl mir (?:etwas|was) uber) )?([\p{L}][\p{L}'’-]*) hilk(?: beruflich| do for a living)?(?: eigentlich| bitte| please)?$/iu;
const topicContext = /^(?:(?:wer ist|kennst du|was macht|who is|do you know|what does) )?dennis hilk\b/iu;
const privateFollowUp = /^(?:und |and )?(?:was macht sie(?: beruflich)?|wo (?:wohnt|arbeitet) sie|wie heisst sie|erzahl mir mehr uber sie|was weisst du uber sie|what does she do(?: for a living)?|where does she (?:live|work)|what s her name|tell me more about her|what do you know about her)(?: bitte| please)?$/iu;

export function asksAboutPrivateLife(text, authorInContext = false, privateLifeInContext = false) {
  const question = text.toLowerCase().replaceAll('ß','ss').normalize('NFD').replace(/\p{M}/gu,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
  if (privateLifeInContext && privateFollowUp.test(question)) return true;
  const firstName = nameQuestion.exec(question)?.[1];
  if (firstName && !/^dennis$/iu.test(firstName)) return true;
  if (!family.test(question)) return false;
  if (authorInContext && (personalReference.test(question) || /\b(?:ist er|hat er|is he|does he)\b/iu.test(question))) return true;
  if (familyPossessive.test(question) && /\bhilk\b/iu.test(question)) return true;
  return author.test(question) && /\b(?:wer|wie|wo|hat|ist|verheiratet|privatleben|suche|recherchiere|who|how|where|does|is|married|private life|search|look up)\b/iu.test(question);
}

export function authorQuestionInContext(text) {
  return topicContext.test(text.trim());
}

export function privateLifeReply(language) {
  return language === 'de'
    ? 'Dazu habe ich keine verlässlichen öffentlichen Informationen. Zu Dennis’ Projekten und seinem Buch kann ich dir gern etwas erzählen.'
    : 'I don’t have reliable public information about that. I can tell you about Dennis’s projects and his book.';
}
