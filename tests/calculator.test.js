const { test } = require('node:test');
const assert = require('node:assert/strict');
const { experienceForLevel, levelForExperience, planExchange, estimateExchange } = require('../calculator.js');

test('Tibia level thresholds and exact boundaries', () => {
  for (const [level, xp] of [[1, 0], [2, 100], [8, 4200], [100, 15694800]]) {
    assert.equal(experienceForLevel(level), xp);
    assert.equal(levelForExperience(xp), level);
    if (level > 1) assert.equal(levelForExperience(xp - 1), level - 1);
  }
});

test('batches only at level changes, preserving the one-at-a-time maximum', () => {
  const result = planExchange(99, experienceForLevel(99), 40);
  // 17 × 29,700 overshoots level 100 by 29,500 XP, so only 16 more
  // shards are needed for level 101. Carry this XP into the next batch.
  assert.deepEqual(result.batches.map(b => b.shards), [17, 16, 7]);
  assert.equal(result.xpGain, 1197000);
  assert.equal(result.bulkXp, 1188000);
  assert.equal(result.savedXp, 9000);
  assert.equal(result.finalLevel, 101);
});

test('a shard that reaches a threshold is paid at the previous level', () => {
  const result = planExchange(99, experienceForLevel(100) - 1, 2);
  assert.deepEqual(result.batches.map(b => [b.level, b.shards]), [[99, 1], [100, 1]]);
  assert.equal(result.xpGain, 59700);
});

test('remaining shards go in one batch when no level changes', () => {
  const result = planExchange(1000, experienceForLevel(1000), 80);
  assert.equal(result.batches.length, 1);
  assert.equal(result.xpGain, 24000000);
  assert.equal(result.savedXp, 0);
});

test('unknown XP gives honest bounds; explicit XP gives a single exact plan', () => {
  const range = estimateExchange(99, 40);
  assert.equal(range.exact, false);
  assert.equal(range.min.xpGain, 1197000);
  assert.equal(range.max.xpGain, 1208700);
  const exact = estimateExchange(99, 40, experienceForLevel(99) + 5000);
  assert.equal(exact.exact, true);
  assert.deepEqual(exact.min, exact.max);
});

test('batched plans match an independent per-shard simulation across progress and levels', () => {
  for (const level of [1, 2, 8, 20, 59, 99, 100, 250, 1000, 10000]) {
    const start = experienceForLevel(level);
    const width = experienceForLevel(level + 1) - start;
    for (const fraction of [0, 0.1, 0.5, 0.99]) {
      const xp = start + Math.floor((width - 1) * fraction);
      for (const shards of [1, 2, 40, 80]) {
        let total = xp;
        for (let i = 0; i < shards; i++) total += 300 * levelForExperience(total);
        const plan = planExchange(level, xp, shards);
        assert.equal(plan.finalXp, total);
        assert.equal(plan.batches.reduce((sum, b) => sum + b.shards, 0), shards);
        assert.equal(plan.batches.reduce((sum, b) => sum + b.xpGain, 0), plan.xpGain);
        assert.equal(plan.bulkXp, shards * level * 300);
        assert.equal(plan.savedXp, plan.xpGain - plan.bulkXp);
        assert.ok(plan.savedXp >= 0);
        assert.ok(plan.batches.length <= shards);
        const range = estimateExchange(level, shards);
        assert.ok(plan.xpGain >= range.min.xpGain && plan.xpGain <= range.max.xpGain);
      }
    }
  }
});

test('rejects invalid quantities, levels and XP inconsistent with the level', () => {
  for (const shards of [0, -1, 81, 1.5, NaN, Infinity, '40']) {
    assert.throws(() => estimateExchange(99, shards));
  }
  for (const level of [0, -1, 1.5, NaN, Infinity, 10001]) {
    assert.throws(() => estimateExchange(level, 40));
  }
  for (const xp of [0, experienceForLevel(100), NaN, Infinity, 15500000.5]) {
    assert.throws(() => estimateExchange(99, 40, xp));
  }
});

const { estimateExchangeFromPercent, parsePercentToGo } = require('../calculator.js');

test('percent to go accepts client decimals with comma or dot', () => {
  assert.equal(parsePercentToGo('65,53'), 65.53);
  assert.equal(parsePercentToGo('65.53'), 65.53);
  assert.equal(parsePercentToGo(' 100 '), 100);
  assert.equal(parsePercentToGo('0'), 0);
  assert.equal(parsePercentToGo(''), undefined);
  for (const value of ['abc', '65,53x', '-1', '101', '1,2.3']) {
    assert.throws(() => parsePercentToGo(value));
  }
});

test('percent to go calculates one starting XP and one exchange sequence', () => {
  const result = estimateExchangeFromPercent(84, 40, 65.53);
  assert.equal(result.exact, true);
  assert.equal(result.percentToGo, 65.53);
  assert.equal(result.min.finalXp - result.min.xpGain, 9313736);
  assert.deepEqual(result.min, result.max);
  assert.deepEqual(result.min.batches.map(batch => batch.shards), [9, 14, 14, 3]);
  assert.equal(result.min.xpGain, 1023300);
  assert.equal(result.min.bulkXp, 1008000);
});

test('percent conversion produces a single plan at boundaries and across levels', () => {
  for (const level of [1, 8, 84, 1000, 10000]) {
    const start = experienceForLevel(level);
    const next = experienceForLevel(level + 1);
    for (const percent of [0, 0.01, 50, 65.53, 99.99, 100]) {
      const result = estimateExchangeFromPercent(level, 80, percent);
      const xp = Math.max(start, Math.min(next - 1,
        next - Math.round((next - start) * percent / 100)));
      assert.equal(result.exact, true);
      assert.deepEqual(result.min, result.max);
      assert.deepEqual(result.min, planExchange(level, xp, 80));
    }
  }
  for (const percent of [-1, 101, NaN, Infinity, '65.53']) {
    assert.throws(() => estimateExchangeFromPercent(84, 40, percent));
  }
});
