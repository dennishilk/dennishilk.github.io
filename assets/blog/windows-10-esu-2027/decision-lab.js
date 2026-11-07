const consumerEditions = ['home', 'pro', 'proVariant'];

export function recommend(answers) {
  const mustKeepWindows = answers.apps === 'yes' || answers.anticheat === 'yes';
  const unknownDependencies = answers.apps === 'unknown' || answers.anticheat === 'unknown';
  const preferLessChange = answers.priority === 'low-change';
  const consumerCandidate = answers.managed === 'no' && consumerEditions.includes(answers.edition);
  let route;

  if (answers.managed !== 'no') {
    route = 'verify';
  } else if ((mustKeepWindows || preferLessChange) && answers.win11 === 'yes') {
    route = 'windows';
  } else if (mustKeepWindows || (preferLessChange && answers.live !== 'passed')) {
    route = consumerCandidate ? 'esu' : 'verify';
  } else if (answers.live === 'passed' && !unknownDependencies) {
    route = 'migration';
  } else {
    route = 'live';
  }

  const notes = [answers.workload];
  if (answers.win11 === 'unknown') notes.push('win11');
  if (mustKeepWindows) notes.push('windowsWorkload');
  if (unknownDependencies) notes.push('unknownWorkload');
  if (route === 'live' || route === 'migration') {
    notes.push(answers.spare === 'yes' ? 'spare' : 'noSpare');
  }
  if (route === 'esu') {
    notes.push('requirements');
    const eeaAccount = {microsoft: 'eeaMicrosoft', local: 'eeaLocal', unknown: 'eeaUnknown'};
    notes.push(answers.region === 'eea' ? eeaAccount[answers.account] : 'region');
  }
  return {route, notes};
}

const lab = typeof document === 'undefined' ? null : document.querySelector('[data-esu-lab]');
if (lab) {
  const form = lab.querySelector('form');
  const result = lab.querySelector('.esu-result');
  const title = result.querySelector('h3');
  const body = result.querySelector('[data-esu-answer]');
  const notes = result.querySelector('[data-esu-notes]');

  function clearResult() {
    result.hidden = true;
    title.textContent = '';
    body.replaceChildren();
    notes.replaceChildren();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const recommendation = recommend(Object.fromEntries(new FormData(form)));
    const answer = lab.querySelector(`[data-esu-route="${recommendation.route}"]`).content.cloneNode(true);
    const heading = answer.querySelector('h4');
    title.textContent = heading.textContent;
    heading.remove();
    body.replaceChildren(answer);
    notes.replaceChildren(...recommendation.notes.map(key =>
      lab.querySelector(`[data-esu-note="${key}"]`).content.cloneNode(true)));
    result.hidden = false;
    title.focus();
  });
  form.addEventListener('change', clearResult);
  form.addEventListener('reset', () => {
    clearResult();
    form.querySelector('select').focus();
  });
  lab.hidden = false;
}
