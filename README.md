# Midnight Shard Calculator

Exchange planner for the Tibia Lightbearer event. Enter a character name and
1 to 80 shards. TibiaData supplies the level. Optionally copy the percentage
remaining from the client's **“You have … percent to go”** tooltip. Comma and
dot decimals are accepted. This is the percentage remaining, not completed.

The comparison shows both totals:

- **All at once**: every shard paid at the starting level.
- **In batches (total)**: the sum of XP from all deliveries in the batch plan.
- **Extra XP from batching**: batch total minus the all-at-once total.

Each plan includes a total row with its shard count and summed XP. The result
also shows the final level and first batch size.

## Progress and precision

The public character endpoint provides a level but no exact XP within it.
Without progress, estimates cover the start of the level through to 1 XP before
the next. With a percentage, the range narrows to a conservative margin of
0.01 percentage points on either side, clipped to the current level, to allow
for the client's limited display precision.

For an exact plan, enter current total XP under **Set total XP or enter level
manually**. Filling total XP clears the percentage and vice versa. Manual level
entry is also available if the API is unavailable. The form does not persist
character names or data.

## Calculation

Each shard grants `300 × level` at the start of a delivery. A batch stops at
the first shard that levels up. The next delivery uses the new level. XP above
a level threshold is carried forward. This matches the XP from individual
exchanges while grouping shards with the same payout. At low levels, one shard
can advance several levels, so some batches will still contain only one shard.

Minimum XP at level L: `(50L³ - 300L² + 850L - 600) / 3`.

The event limit is 80 shards per character. If some have already been exchanged,
enter only the amount still intended for exchange, within that total limit.
Public data may be delayed: check the level in-game and recalculate if XP changes.

## Run and validate

Static site with no production dependencies or build step:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000`. The legacy `midnight-shards.html` URL redirects to
the same calculator. Static asset URLs are versioned to keep cached scripts
consistent with the form when publishing updates.

Tests require Node.js 20 or newer:

```sh
node --test
```

Tests cover level boundaries, overflow XP, batches, summed totals, unknown-XP
ranges, percent-to-go conversion and rounding, validation and API responses.
Batch XP is checked against an independent per-shard simulation. Levels from
1 to 10,000 are supported.

Integration contract: [TibiaData OpenAPI](https://docs.tibiadata.com/),
`GET /v4/character/{name}`, using `character.character.level`. Lookups are
cancelled when fields change and time out after 12 seconds. Only name, level,
world and vocation are used, in memory.

## Changes

- English interface with an explicit all-at-once versus summed-batch comparison.
- Optional client percent-to-go input with comma or dot decimals.
- Character lookup and shard quantity replace the old XP-goal form.
- Level-aware batch planning, keyboard access and small-screen layouts.
