// Full-utterance aliases keep greetings and feedback from swallowing real questions.
export const SMALL_TALK = [
  ['greeting', ['moin', 'moin moin', 'hallo', 'hey', 'hi', 'hello', 'guten tag'], ['Moin! Schön, dass du da bist.', 'Moin! Good to see you.']],
  ['morning', ['guten morgen', 'good morning', 'morning'], ['Moin! Guten Morgen.', 'Moin! Good morning.']],
  ['evening', ['guten abend', 'good evening'], ['Moin! Guten Abend.', 'Moin! Good evening.']],
  ['how-are-you', ['wie geht es dir', 'wie gehts dir', 'wie geht’s dir', 'wie gehts', 'wie geht’s', 'na wie gehts', 'na wie geht’s', 'how are you', 'how are you doing', 'how’s it going', 'how is it going'], ['Mir geht’s gut, danke. Und dir?', 'I’m doing well, thanks. How are you?']],
  ['doing-well', ['mir geht es gut', 'mir gehts gut', 'mir geht’s gut', 'mir geht es auch gut', 'mir gehts auch gut', 'mir geht’s auch gut', 'mir geht es gut danke', 'mir geht es auch gut danke', 'mir geht es prima', 'mir geht es super', 'mir geht es bestens', 'ich bin gut drauf', 'i’m good', 'i’m fine', 'i’m doing well', 'i am doing well', 'i’m great', 'i’m good too', 'i’m well too'], ['Schön, dass es dir gut geht!', 'Glad to hear you’re doing well!']],
  ['also-thanks', ['auch danke', 'auch gut danke', 'gut danke', 'auch gut', 'fine thanks', 'good thanks', 'well thanks', 'i’m fine thanks'], ['Freut mich zu hören!', 'Glad to hear it!']],
  ['thanks', ['danke', 'danke schön', 'dankeschön', 'vielen dank', 'thanks', 'thank you', 'many thanks', 'thank you very much'], ['Gern geschehen!', 'You’re welcome!']],
  ['thanks-for-help', ['danke für deine hilfe', 'danke für die hilfe', 'vielen dank für deine hilfe', 'vielen dank für die hilfe', 'thanks for your help', 'thank you for your help', 'thanks for helping'], ['Gern. Schön, dass ich helfen konnte.', 'Glad I could help.']],
  ['funny', ['das war lustig', 'der war gut', 'das war witzig', 'that was funny', 'that was a good joke', 'good one'], ['Gut, dann hat der Witz seinen Dienst getan.', 'Good. The joke did its job.']],
  ['laughter', ['haha', 'hahaha', 'ha ha', 'lol'], ['Hehe.', 'Heh.']],
  ['correction', ['das stimmt nicht', 'das ist falsch', 'du liegst falsch', 'that’s wrong', 'that’s not right', 'that isn’t correct', 'you’re wrong'], ['Danke für den Hinweis. Welche Stelle soll ich noch mal prüfen?', 'Thanks for flagging it. Which part should I check again?']],
  ['understood', ['jetzt verstehe ich es', 'jetzt verstehe ich das', 'hab ich verstanden', 'i get it now', 'i understand now', 'got it now'], ['Gut, freut mich.', 'Glad that cleared it up.']],
  ['acknowledgment', ['ok', 'okay', 'alles klar', 'verstanden', 'got it', 'all right'], ['Alles klar.', 'All right.']],
  ['apology', ['sorry', 'tut mir leid', 'entschuldigung', 'i’m sorry', 'my apologies'], ['Alles gut.', 'No worries.']],
  ['no-problem', ['kein problem', 'keine ursache', 'gern geschehen', 'no problem', 'you’re welcome'], ['Alles klar.', 'All right.']],
  ['compliment', ['du bist nett', 'das hast du gut erklärt', 'du bist sympathisch', 'you’re nice', 'that was a good explanation', 'well explained'], ['Danke, das freut mich.', 'Thanks, I appreciate that.']],
  ['good-night', ['gute nacht', 'schlaf gut', 'good night', 'night night'], ['Gute Nacht!', 'Good night!']],
  ['tomorrow', ['bis morgen', 'bis morgen dann', 'see you tomorrow', 'talk to you tomorrow'], ['Bis morgen!', 'See you tomorrow!']],
  ['later', ['bis später', 'bis gleich', 'bis nachher', 'see you later', 'talk later'], ['Bis später!', 'See you later!']],
  ['bye', ['tschüss', 'tschüs', 'auf wiedersehen', 'bis bald', 'mach’s gut', 'mach es gut', 'bye', 'goodbye', 'see you', 'take care'], ['Mach’s gut!', 'Take care!']],
  ['activity', ['was machst du', 'was machst du gerade', 'was treibst du so', 'what are you doing', 'what are you up to'], ['Ich schnacke mit dir. Bei Fragen helfe ich mit meinem Wissensbuch oder meinem Sprachmodell weiter.', 'I’m chatting with you. I can answer from my knowledge book or use my language model.']],
  ['origin', ['woher kommst du', 'wo wohnst du', 'woher kommst du snakkie', 'where are you from', 'where do you live'], ['Aus Wiesmoor in Ostfriesland. Da gehört ein Moin praktisch zur Grundausstattung.', 'I’m from Wiesmoor in East Frisia, where a friendly Moin goes a long way.']],
  ['is-ai', ['bist du eine ki', 'bist du ein chatbot', 'bist du ein mensch', 'are you an ai', 'are you a chatbot', 'are you human'], ['Ich bin ein KI-Assistent. Für bekannte Fragen habe ich feste Antworten, und für offene Fragen nutze ich ein Sprachmodell auf Worldnode.', 'I’m an AI assistant. I use prepared answers for familiar questions and a language model on Worldnode for open questions.']],
  ['compare-ai', ['bist du schlauer als chatgpt', 'bist du besser als chatgpt', 'are you smarter than chatgpt', 'are you better than chatgpt'], ['Ich bin für einen kleineren Einsatz gebaut. Bei Wiesmoor und meinem Wissensbuch kenne ich mich am besten aus.', 'I’m built for a smaller job. Wiesmoor and my knowledge book are where I’m most at home.']],
  ['languages', ['welche sprachen sprichst du', 'welche sprachen kannst du', 'what languages do you speak', 'which languages can you speak'], ['Ich antworte auf Deutsch oder Englisch. Ein paar belegte Platt-Wörter habe ich auch dabei.', 'I answer in German or English. I also have a few dictionary-checked Platt words.']],
  ['where-model', ['wo läuft deine ki', 'wo läuft dein sprachmodell', 'where does your ai run', 'where does your model run'], ['Mein Sprachmodell läuft auf Worldnode, Dennis’ Debian-Server.', 'My language model runs on Worldnode, Dennis’s Debian server.']],
  ['uses-arch', ['ich benutze arch linux', 'ich nutze arch linux', 'i use arch linux', 'i run arch linux'], ['Arch Linux also. Was möchtest du dazu wissen?', 'Arch Linux, then. What would you like to know about it?']],
  ['weather-source', ['woher hast du das wetter', 'woher kommen deine wetterdaten', 'where do you get the weather', 'where does your weather data come from'], ['Das Wetter für Wiesmoor kommt aus dem World Observer. Den Zeitstand zeige ich in der Wetterantwort an.', 'The Wiesmoor weather comes from World Observer. I show its timestamp in the weather reply.']]
];

export const TOPICAL_SMALL_TALK = new Set(['activity', 'origin', 'is-ai', 'compare-ai', 'languages', 'where-model', 'weather-source', 'uses-arch']);
