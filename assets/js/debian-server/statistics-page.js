const dataUrl = '/api/debian-exploration/statistics';
const duration = milliseconds => {
  const minutes = Math.round(milliseconds / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minutes` : ''}`;
};
const node = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
function render(data) {
  const empty = document.querySelector('#statistics-empty');
  if (!data.completedSessions) { empty.hidden = false; return; }
  empty.hidden = true; document.querySelector('#statistics-content').hidden = false;
  const overview = document.querySelector('#statistics-overview');
  [['Completed sessions', data.completedSessions.toLocaleString()], ['Average session', duration(data.averageDurationMs)], ['Average commands', data.averageCommands.toLocaleString()], ['Longest session', duration(data.longestDurationMs)]].forEach(([label, value]) => { const card=node('article','statistics-number');card.append(node('p','statistics-label',label),node('strong','',value));overview.append(card); });
  const themes = document.querySelector('#curiosity-themes');
  data.themes.filter(theme => theme.visitors > 0).forEach(theme => { const card=node('article','curiosity-card');card.append(node('h3','',theme.title),node('p','curiosity-measure',`${theme.percentage}% of visitors ${theme.description}.`));if(theme.common.length){card.append(node('h4','','Most common commands'));const list=node('ul','command-list');theme.common.forEach(item=>list.append(node('li','',item.command)));card.append(list);}themes.append(card); });
  const observations=document.querySelector('#observations'); data.observations.forEach(item=>{const li=node('li','',item.text);if(item.command)li.append(node('code','',item.command));observations.append(li);}); document.querySelector('#observations-section').hidden=!data.observations.length;
  const patterns=document.querySelector('#patterns');data.patterns.forEach((pattern,index)=>{const card=node('article','pattern-card');card.append(node('h3','',`Exploration pattern ${index+1}`));const flow=node('ol','pattern-flow');pattern.commands.forEach(command=>flow.append(node('li','',command)));card.append(flow,node('p','pattern-support',`Observed in ${pattern.count} completed sessions.`));patterns.append(card);});document.querySelector('#patterns-section').hidden=!data.patterns.length;
}
fetch(dataUrl, { credentials: 'omit', referrerPolicy: 'no-referrer' }).then(response => { if (!response.ok) throw new Error('unavailable'); return response.json(); }).then(render).catch(() => { const empty=document.querySelector('#statistics-empty');empty.hidden=false;empty.replaceChildren(node('h2','','The public archive is temporarily unavailable.'),node('p','','No statistics have been invented.')); });
