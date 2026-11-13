var TibiaData = (() => {
  async function fetchCharacter(name, options = {}) {
    const response = await (options.fetch || fetch)(
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(name.trim())}`,
      { signal: options.signal }
    );
    if (response.status === 404) throw new Error('Character not found. Check the name and try again.');
    if (response.status === 429) throw new Error('Too many TibiaData requests. Wait a moment and try again.');
    if (!response.ok) throw new Error('TibiaData is unavailable. Try again or enter your level manually.');
    const data = await response.json();
    const character = data?.character?.character;
    if (!character || typeof character.name !== 'string' || !character.name.trim() ||
        !Number.isInteger(character.level) || character.level < 1) {
      throw new Error('TibiaData did not return a valid character. Try again or enter your level manually.');
    }
    // Keep only the public fields needed by this calculator, in memory only.
    return { name: character.name, level: character.level,
      world: typeof character.world === 'string' ? character.world : '',
      vocation: typeof character.vocation === 'string' ? character.vocation : '' };
  }
  return { fetchCharacter };
})();

if (typeof module !== 'undefined') module.exports = TibiaData;
