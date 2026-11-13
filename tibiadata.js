var TibiaData = (() => {
  async function fetchCharacter(name, options = {}) {
    const response = await (options.fetch || fetch)(
      `https://api.tibiadata.com/v4/character/${encodeURIComponent(name.trim())}`,
      { signal: options.signal }
    );
    if (response.status === 404) throw new Error('Personagem não encontrado. Confira o nome e tente novamente.');
    if (response.status === 429) throw new Error('Muitas consultas à TibiaData. Aguarde um pouco e tente novamente.');
    if (!response.ok) throw new Error('TibiaData indisponível agora. Tente novamente ou informe o level manualmente.');
    const data = await response.json();
    const character = data?.character?.character;
    if (!character || typeof character.name !== 'string' || !character.name.trim() ||
        !Number.isInteger(character.level) || character.level < 1) {
      throw new Error('A TibiaData não retornou um personagem válido. Tente novamente ou informe o level manualmente.');
    }
    // Keep only the public fields needed by this calculator, in memory only.
    return { name: character.name, level: character.level,
      world: typeof character.world === 'string' ? character.world : '',
      vocation: typeof character.vocation === 'string' ? character.vocation : '' };
  }
  return { fetchCharacter };
})();

if (typeof module !== 'undefined') module.exports = TibiaData;
