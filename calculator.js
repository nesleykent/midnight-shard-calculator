/* Shared by the static page and Node's built-in test runner. */
var MidnightShards = (() => {
  const MAX_SHARDS = 80;
  const MAX_LEVEL = 10000;

  function experienceForLevel(level) {
    return Math.round((50 * level ** 3 - 300 * level ** 2 + 850 * level - 600) / 3);
  }

  function levelForExperience(xp) {
    let low = 1;
    let high = 2;
    while (experienceForLevel(high) <= xp) high *= 2;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (experienceForLevel(middle) <= xp) low = middle;
      else high = middle;
    }
    return low;
  }

  function validate(level, shards, xp) {
    if (!Number.isInteger(level) || level < 1 || level > MAX_LEVEL) {
      throw new Error('Informe um level inteiro de 1 a 10.000.');
    }
    if (!Number.isInteger(shards) || shards < 1 || shards > MAX_SHARDS) {
      throw new Error('Informe de 1 a 80 shards inteiros. O limite do evento é 80 por personagem.');
    }
    if (!Number.isSafeInteger(xp) || xp < experienceForLevel(level) || xp >= experienceForLevel(level + 1)) {
      throw new Error('A XP total precisa estar dentro do level informado. Confira a XP no jogo.');
    }
  }

  function planExchange(level, xp, shards) {
    validate(level, shards, xp);
    const initialXp = xp;
    const bulkXp = shards * level * 300;
    const batches = [];
    let remaining = shards;
    while (remaining > 0) {
      const xpPerShard = level * 300;
      // All shards in a delivery pay at the level BEFORE that delivery.
      // Stop at the first shard that levels up, then recalculate the payout.
      const quantity = Math.min(remaining, Math.ceil((experienceForLevel(level + 1) - xp) / xpPerShard));
      const xpGain = quantity * xpPerShard;
      xp += xpGain;
      const nextLevel = levelForExperience(xp);
      batches.push({ level, shards: quantity, xpGain, nextLevel });
      level = nextLevel;
      remaining -= quantity;
    }
    const xpGain = xp - initialXp;
    return { batches, xpGain, bulkXp, savedXp: xpGain - bulkXp, finalXp: xp, finalLevel: level };
  }

  function estimateExchange(level, shards, xp) {
    const exact = xp !== undefined;
    const min = planExchange(level, exact ? xp : experienceForLevel(level), shards);
    const max = exact ? min : planExchange(level, experienceForLevel(level + 1) - 1, shards);
    return { exact, min, max };
  }

  function parsePercentToGo(value) {
    const text = value.trim();
    if (text === '') return undefined;
    const percent = Number(text.replace(',', '.'));
    if (!/^\d+(?:[.,]\d+)?$/.test(text) || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      throw new Error('Informe a porcentagem que falta para upar, de 0 a 100. Use vírgula ou ponto nos decimais.');
    }
    return percent;
  }

  function estimateExchangeFromPercent(level, shards, percentToGo) {
    if (!Number.isFinite(percentToGo) || percentToGo < 0 || percentToGo > 100) {
      throw new Error('A porcentagem que falta para upar precisa estar entre 0 e 100.');
    }
    const start = experienceForLevel(level);
    const next = experienceForLevel(level + 1);
    const width = next - start;
    // A two-decimal client display loses precision. A conservative margin of
    // 0.01 percentage points covers both rounding and truncation, including 0/100.
    const minXp = Math.max(start, Math.min(next - 1,
      next - Math.ceil(width * Math.min(100, percentToGo + 0.01) / 100)));
    const maxXp = Math.max(start, Math.min(next - 1,
      next - Math.floor(width * Math.max(0, percentToGo - 0.01) / 100)));
    return { exact: false, percentToGo,
      min: planExchange(level, minXp, shards), max: planExchange(level, maxXp, shards) };
  }

  return { MAX_SHARDS, MAX_LEVEL, experienceForLevel, levelForExperience, planExchange,
    estimateExchange, parsePercentToGo, estimateExchangeFromPercent };
})();

if (typeof module !== 'undefined') module.exports = MidnightShards;
