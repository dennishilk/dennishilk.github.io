import { LIMITS, diagnosticSummary } from './core.js';
import { catalog } from './catalog.js';

const language = document.documentElement.lang === 'de' ? 'de' : 'en';
const de = language === 'de';
const t = de ? {
  empty:'Füge zuerst einen Log-Auszug ein.', large:'Der Auszug ist zu groß. Bitte höchstens 2 Millionen Zeichen, 20.000 Zeilen und Dateien bis 2 MB verwenden.',
  failed:'Die lokale Analyse konnte nicht starten. Prüfe Browser-Unterstützung und lade die Seite neu. Es wurde nichts hochgeladen.',
  running:'Analysiere lokal …', none:'Keine bekannte Signatur gefunden. Das schließt Fehler nicht aus. Nutze die Diagnosehilfen oder prüfe den zeitlichen Verlauf.',
  result:n=>`${n} getrennte Hinweise gefunden. Eine gemeinsame Ursache ist damit nicht bewiesen.`, lines:n=>`${n} passende Zeilen; maximal ${LIMITS.examples} Beispiele je Signatur.`,
  shortened:n=>`${n} überlange Zeilen wurden auf ${LIMITS.lineLength} Zeichen begrenzt.`, confidence:'Sicherheit: Textsignatur erkannt; die Ursache bleibt offen.',
  next:'Nächster Prüfschritt', causes:'Mögliche Ursachen, noch unbestätigt', article:'Passende Problemanleitung', clear:'Auszug und Ergebnisse aus dem Arbeitsspeicher entfernt.',
  copied:'Zusammenfassung kopiert.', copyFailed:'Kopieren ist gesperrt. Markiere die Zusammenfassung und kopiere sie selbst.', sample:'Synthetisches Beispiel geladen; keine Daten eines echten Systems.',
  includeWarn:'Prüfe alle Ausschnitte vor dem Weitergeben. Automatische Schwärzung kann persönliche Angaben übersehen.', export:'Lokale Zusammenfassung erstellt.',
} : {
  empty:'Paste a log excerpt first.', large:'The excerpt is too large. Use at most 2 million characters, 20,000 lines and files up to 2 MB.',
  failed:'Local analysis could not start. Check browser support and reload the page. Nothing was uploaded.',
  running:'Analysing locally …', none:'No known signature found. This does not exclude a fault. Use the assistants or examine the timeline.',
  result:n=>`${n} separate findings detected. A shared root cause has not been established.`, lines:n=>`${n} matching lines; at most ${LIMITS.examples} examples per signature.`,
  shortened:n=>`${n} long lines were limited to ${LIMITS.lineLength} characters.`, confidence:'Confidence: a text signature matched; the root cause remains uncertain.',
  next:'Next diagnostic step', causes:'Possible causes, not yet confirmed', article:'Relevant problem guide', clear:'Excerpt and findings cleared from working memory.',
  copied:'Summary copied.', copyFailed:'Clipboard access is blocked. Select the summary and copy it manually.', sample:'Synthetic example loaded; no data from a real system.',
  includeWarn:'Review every excerpt before passing it on. Automatic redaction can miss personal information.', export:'Local summary created.',
};
const $ = id => document.getElementById(id);
const input = $('log-input'), output = $('log-findings'), status = $('log-status'), analyse = $('log-analyse');
let worker, result, currentVersion = 0;
const element = (tag,text,className) => { const node=document.createElement(tag); if(text!==undefined)node.textContent=text; if(className)node.className=className; return node; };
const cancel = () => { worker?.terminate(); worker=null; analyse.disabled=false; currentVersion++; };
const summary = () => diagnosticSummary(result,catalog,language,{includeLines:$('log-include-lines').checked,redact:$('log-redact').checked});
const clearResults = () => { result=null; output.replaceChildren(); $('log-export-controls').hidden=true; $('log-summary-fallback').hidden=true; $('log-summary-fallback').value=''; };
const render = data => {
  result=data; output.replaceChildren(); $('log-export-controls').hidden=false;
  status.textContent=data.findings.length?t.result(data.findings.length):t.none;
  if(data.shortened)output.append(element('p',t.shortened(data.shortened),'lab-status'));
  for(const finding of data.findings) {
    const pattern=catalog.patterns.find(item=>item.id===finding.patternId),problem=catalog.problems.find(item=>item.id===finding.problemId);
    const article=element('article'); article.append(element('p',catalog.categories[problem.category][language],'eyebrow'),element('h3',problem.title[language]),
      element('p',pattern.explanation[language]),element('p',pattern.significance[language]),element('p',t.confidence,'lab-source-note'),element('p',t.lines(finding.count),'lab-muted'));
    article.append(element('h4',t.causes));
    const causes=element('ul'); for(const cause of problem.causes)causes.append(element('li',cause[language])); article.append(causes);
    const matches=element('pre',finding.lines.map(line=>`${line.number}: ${line.text}`).join('\n')); matches.tabIndex=0; article.append(matches);
    article.append(element('h4',t.next),element('p',problem.diagnostic.explanation[language]),element('pre',problem.diagnostic.command),element('p',problem.diagnostic.interpretation[language]));
    const link=element('a',t.article); link.href=problem.path[language]+'#diagnostics'; article.append(link); output.append(article);
  }
};
analyse.addEventListener('click',()=> {
  cancel(); clearResults();
  if(!input.value.trim()){status.textContent=t.empty;input.focus();return;}
  if(input.value.length>LIMITS.characters){status.textContent=t.large;return;}
  if(!globalThis.Worker){status.textContent=t.failed;return;}
  const version=currentVersion; status.textContent=t.running; analyse.disabled=true;
  try {
    worker=new Worker(new URL('./inspector-worker.js',import.meta.url),{type:'module'});
    worker.onmessage=event=> {
      if(version!==currentVersion)return;
      const data=event.data; cancel();
      if(data.error){status.textContent=['too-large','too-many-lines'].includes(data.error)?t.large:t.failed;return;}
      render(data.result);
    };
    worker.onerror=()=>{if(version!==currentVersion)return;cancel();status.textContent=t.failed;};
    worker.postMessage(input.value);
  } catch {cancel();status.textContent=t.failed;}
});
input.addEventListener('input',()=> { cancel();clearResults();status.textContent=''; });
$('log-clear').addEventListener('click',()=> {cancel();clearResults();input.value='';$('log-file').value='';status.textContent=t.clear;input.focus();});
$('log-sample').addEventListener('click',()=> {cancel();clearResults();input.value=['graphics','storage','services'].map(category=>catalog.patterns.find(item=>catalog.problems.find(problem=>problem.id===item.problemId).category===category)).filter(Boolean).map(item=>item.sample).join('\n');status.textContent=t.sample;input.focus();});
$('log-file').addEventListener('change',async event=> {
  cancel();clearResults();const version=currentVersion,file=event.target.files[0];if(!file)return;
  if(file.size>2_000_000){status.textContent=t.large;event.target.value='';return;}
  try {const text=await file.text();if(version!==currentVersion)return;input.value=text;status.textContent='';}
  catch {if(version===currentVersion)status.textContent=t.failed;}
});
$('log-copy').addEventListener('click',async()=> {
  if(!result)return;const text=summary();
  try {await navigator.clipboard.writeText(text);status.textContent=t.copied;}
  catch {const field=$('log-summary-fallback');field.hidden=false;field.value=text;field.focus();field.select();status.textContent=t.copyFailed;}
});
$('log-export').addEventListener('click',()=> {
  if(!result)return;
  const url=URL.createObjectURL(new Blob([summary()],{type:'text/plain;charset=utf-8'}));
  const link=element('a');link.href=url;link.download=`linux-fix-lab-${language}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent=t.export;
});
window.addEventListener('pagehide',()=> {cancel();input.value='';$('log-file').value='';clearResults();});
// The browser can restore a page from its back/forward cache: never restore old excerpts.
window.addEventListener('pageshow',event=> {if(event.persisted){input.value='';$('log-file').value='';clearResults();}});
