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
      throw new Error('Enter a whole-number level from 1 to 10,000.');
    }
    if (!Number.isInteger(shards) || shards < 1 || shards > MAX_SHARDS) {
      throw new Error('Enter 1 to 80 whole shards. The event limit is 80 per character.');
    }
    if (!Number.isSafeInteger(xp) || xp < experienceForLevel(level) || xp >= experienceForLevel(level + 1)) {
      throw new Error('Total XP must fall within the entered level. Check your XP in-game.');
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
      throw new Error('Enter the percentage remaining to level up, from 0 to 100. Use comma or dot decimals.');
    }
    return percent;
  }

  function estimateExchangeFromPercent(level, shards, percentToGo) {
    if (!Number.isFinite(percentToGo) || percentToGo < 0 || percentToGo > 100) {
      throw new Error('The percentage remaining to level up must be between 0 and 100.');
    }
    const start = experienceForLevel(level);
    const next = experienceForLevel(level + 1);
    const width = next - start;
    const xpRemaining = Math.round(width * percentToGo / 100);
    // Keep the starting XP within the supplied level, including a displayed 0%.
    const xp = Math.max(start, Math.min(next - 1, next - xpRemaining));
    return { ...estimateExchange(level, shards, xp), percentToGo };
  }

  return { MAX_SHARDS, MAX_LEVEL, experienceForLevel, levelForExperience, planExchange,
    estimateExchange, parsePercentToGo, estimateExchangeFromPercent };
})();

if (typeof module !== 'undefined') module.exports = MidnightShards;
