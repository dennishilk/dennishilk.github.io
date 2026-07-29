import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { aggregateSessions, anonymizeCommand, createAnonymousSession, submitAnonymousCompletedSession } from '../assets/js/debian-server/exploration-statistics.js';
import { COMMAND_EXPLANATIONS, UNKNOWN_COMMAND_EXPLANATION, explainCommand } from '../assets/js/debian-server/command-interpretations.js';

const completed = (commands, durationMs = 60000) => ({ status: 'completed', durationMs, commands: commands.map(([text, elapsedMs = 0]) => ({ text, elapsedMs, empty: false })) });
test('anonymous records discard free-form arguments and reject incomplete sessions', () => {
  assert.equal(createAnonymousSession({ status: 'active', commands: [] }), null);
  const result = createAnonymousSession(completed([['cat /home/visitor/private-name'], ['echo secret'], ['ping google.com']]));
  assert.deepEqual(result.commands.map(x => x.command), ['cat', 'other', 'ping google.com']);
  assert.equal(JSON.stringify(result).includes('private-name'), false);
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
test('aggregation calculates themes, percentages, durations, observations, and supported sequences', () => {
  const sessions = [completed([['ls'], ['cd /tmp'], ['pwd'], ['exit']], 120000), completed([['ls'], ['cd /'], ['pwd'], ['exit']], 240000)];
  const data = aggregateSessions(sessions.map(createAnonymousSession));
  assert.equal(data.completedSessions, 2); assert.equal(data.averageDurationMs, 180000); assert.equal(data.averageCommands, 4); assert.equal(data.longestDurationMs, 240000);
  assert.equal(data.themes.find(x => x.id === 'filesystem').percentage, 100);
  assert.ok(data.patterns.some(pattern => pattern.commands.slice(0, 3).join(' ') === 'ls cd pwd'));
  assert.equal(data.observations.find(x => x.text.includes('first command')).command, 'ls');
});
test('empty aggregation is honest and finite', () => { const data=aggregateSessions([]); assert.equal(data.completedSessions,0);assert.equal(data.averageDurationMs,0);assert.deepEqual(data.observations,[]); });
test('submission omits credentials and only marks successful completed sessions', async () => {
  const storage=new Map();let request,calls=0;const sessionStorage={getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)};
  const ok=await submitAnonymousCompletedSession(completed([['uname -a']]), async (...args)=>{calls++;request=args;return {ok:true};},sessionStorage);
  assert.equal(ok,true);assert.equal(request[0],'/api/debian-exploration/session');assert.equal(request[1].credentials,'omit');assert.equal(request[1].referrerPolicy,'no-referrer');assert.equal(JSON.parse(request[1].body).schema_version,1);assert.equal(JSON.parse(request[1].body).commands[0].command,'uname -a');
  assert.equal(await submitAnonymousCompletedSession(completed([['uname -a']]), async()=>{calls++;return {ok:true};},sessionStorage),false);assert.equal(calls,1);
});
test('command normalization retains only allowlisted statistics', () => { assert.equal(anonymizeCommand('  SUDO   shutdown now '),'sudo shutdown now');assert.equal(anonymizeCommand('curl https://personal.example/a'),'curl'); });
test('archive command interpretations use exact entries, safe families, and a neutral fallback', () => {
  for (const command of ['ls', 'cd', 'mkdir']) assert.match(explainCommand(command), /visitor/i);
  for (const command of ['rm -rf /', 'rm -rf --no-preserve-root /', 'sudo shutdown now', 'sudo reboot']) assert.match(explainCommand(command), /browser simulation does not affect a real computer/i);
  for (const command of ['ssh private.example', 'curl https://private.example', 'export SECRET=value', 'echo secret']) {
    assert.equal(explainCommand(command), COMMAND_EXPLANATIONS[command.split(' ')[0]]);
    assert.doesNotMatch(explainCommand(command), /private|secret/i);
  }
  assert.equal(explainCommand('not-in-catalog argument'), UNKNOWN_COMMAND_EXPLANATION);
  assert.equal(explainCommand(null), UNKNOWN_COMMAND_EXPLANATION);
});
test('experiment landing page has one linked session start and retains the archive invitation', async () => {
  const html = await readFile(new URL('../museum/debian-server-experiment/index.html', import.meta.url), 'utf8');
  assert.equal(html.match(/START SESSION/g)?.length, 1);
  assert.match(html, /<li><a href="\/museum\/debian-server-experiment\/session\/">START SESSION<\/a><\/li>/);
  assert.doesNotMatch(html, /class="debian-launch"|>SESSION<\/h2>/);
  assert.match(html, /VIEW THE PUBLIC EXPLORATION ARCHIVE/);
});
