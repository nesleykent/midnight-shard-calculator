const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchCharacter } = require('../tibiadata.js');

const payload = { character: { character: { name: 'Example Knight', level: 99, world: 'Antica', vocation: 'Elite Knight' } } };

test('encodes character names and reads the documented v4 response', async () => {
  const signal = new AbortController().signal;
  const character = await fetchCharacter('  Example Knight  ', { signal, fetch: async (url, options) => {
    assert.equal(url, 'https://api.tibiadata.com/v4/character/Example%20Knight');
    assert.equal(options.signal, signal);
    return { ok: true, json: async () => payload };
  } });
  assert.equal(character.level, 99);
  assert.equal(character.name, 'Example Knight');
});

test('handles missing characters, rate limits, failures and malformed responses', async () => {
  for (const [status, message] of [[404, /not found/], [429, /requests/], [502, /unavailable/]]) {
    await assert.rejects(fetchCharacter('Example Knight', { fetch: async () => ({ ok: false, status }) }), message);
  }
  for (const invalid of [{}, { character: { character: {} } }, { character: { character: { name: 'Example Knight', level: 0 } } }]) {
    await assert.rejects(fetchCharacter('Example Knight', { fetch: async () => ({ ok: true, json: async () => invalid }) }), /valid character/);
  }
});
