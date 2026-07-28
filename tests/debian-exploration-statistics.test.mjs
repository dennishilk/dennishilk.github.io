import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateSessions, anonymizeCommand, createAnonymousSession, submitAnonymousCompletedSession } from '../assets/js/debian-server/exploration-statistics.js';

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
  const storage=new Map();let request;
  const ok=await submitAnonymousCompletedSession(completed([['uname -a']]), async (...args)=>{request=args;return {ok:true};},{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)});
  assert.equal(ok,true);assert.equal(request[1].credentials,'omit');assert.equal(request[1].referrerPolicy,'no-referrer');assert.equal(JSON.parse(request[1].body).commands[0].command,'uname -a');
});
test('command normalization retains only allowlisted statistics', () => { assert.equal(anonymizeCommand('  SUDO   shutdown now '),'sudo shutdown now');assert.equal(anonymizeCommand('curl https://personal.example/a'),'curl'); });
