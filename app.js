(() => {
  const { estimateExchange, estimateExchangeFromPercent, parsePercentToGo } = MidnightShards;
  const $ = id => document.getElementById(id);
  const form = $('exchange-form');
  const nameInput = $('character-name');
  const shardsInput = $('shards');
  const xpInput = $('experience');
  const percentInput = $('percent-to-go');
  const manualMode = $('manual-mode');
  const levelInput = $('manual-level');
  const button = $('calculate');
  const results = $('results');
  const error = $('error');
  const status = $('lookup-status');
  const format = value => value.toLocaleString('en-US');
  const range = (min, max) => min === max ? format(min) : `${format(min)} to ${format(max)}`;
  let activeRequest;

  function setBusy(busy) {
    button.disabled = busy;
    button.textContent = busy ? 'Looking up character…' : 'Calculate exchange';
    form.setAttribute('aria-busy', String(busy));
  }

  function invalidate() {
    if (activeRequest) activeRequest.abort();
    activeRequest = undefined;
    setBusy(false);
    results.hidden = true;
    error.hidden = true;
    status.textContent = '';
  }

  form.addEventListener('input', invalidate);
  percentInput.addEventListener('input', () => {
    if (percentInput.value.trim() !== '') xpInput.value = '';
  });
  xpInput.addEventListener('input', () => {
    if (xpInput.value !== '') percentInput.value = '';
  });
  manualMode.addEventListener('change', () => {
    $('manual-field').hidden = !manualMode.checked;
    levelInput.disabled = !manualMode.checked;
    levelInput.required = manualMode.checked;
    nameInput.required = !manualMode.checked;
    nameInput.disabled = manualMode.checked;
  });

  function renderPlan(plan, title, exact) {
    const details = document.createElement('details');
    details.className = 'plan';
    details.open = exact;
    const summary = document.createElement('summary');
    summary.textContent = `${title}: ${plan.batches.length} ${plan.batches.length === 1 ? 'delivery' : 'deliveries'}`;
    details.append(summary);
    const table = document.createElement('table');
    const caption = table.createCaption();
    caption.textContent = exact ? 'Deliver these batches in order.' : 'Example for this scenario; your exact sequence may differ.';
    const head = table.createTHead().insertRow();
    for (const label of ['Delivery', 'Level', 'Shards', 'XP']) {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      head.append(th);
    }
    const body = table.createTBody();
    plan.batches.forEach((batch, index) => {
      const row = body.insertRow();
      for (const value of [index + 1, batch.level, batch.shards, batch.xpGain]) {
        row.insertCell().textContent = format(value);
      }
    });
    const total = table.createTFoot().insertRow();
    const totalLabel = document.createElement('th');
    totalLabel.scope = 'row';
    totalLabel.textContent = 'Total';
    total.append(totalLabel);
    total.insertCell().textContent = '';
    total.insertCell().textContent = format(plan.batches.reduce((sum, batch) => sum + batch.shards, 0));
    total.insertCell().textContent = format(plan.xpGain);
    details.append(table);
    return details;
  }

  function render(character, shards, estimate) {
    const { exact, min, max } = estimate;
    const percentBased = estimate.percentToGo !== undefined;
    $('result-mode').textContent = percentBased ? 'Plan from percent to go' : (exact ? 'Plan from total XP' : 'Estimate from level');
    $('result-title').textContent = manualMode.checked ? 'Your exchange' : character.name;
    $('character-level').textContent = `Level ${format(character.level)}`;
    $('character-info').textContent = [character.world, character.vocation, `${shards} shards`].filter(Boolean).join(' / ');
    $('xp-caption').textContent = exact ? 'Total XP in batches' : 'Total XP in batches (min to max)';
    $('xp-range').textContent = `${range(min.xpGain, max.xpGain)} XP`;
    $('final-level').textContent = `Final level: ${range(min.finalLevel, max.finalLevel)}`;
    $('bulk-xp').textContent = `${format(min.bulkXp)} XP`;
    $('batches-xp').textContent = `${range(min.xpGain, max.xpGain)} XP`;
    $('saved-xp').textContent = `${range(min.savedXp, max.savedXp)} XP`;
    const firstMin = Math.min(min.batches[0].shards, max.batches[0].shards);
    const firstMax = Math.max(min.batches[0].shards, max.batches[0].shards);
    $('first-batch').textContent = `${range(firstMin, firstMax)} ${firstMax === 1 ? 'shard' : 'shards'}`;
    $('batch-note').textContent = firstMin === firstMax
      ? (min.batches.length === 1 && max.batches.length === 1
        ? 'You can deliver everything at once: splitting does not increase XP for this exchange.'
        : 'Deliver this batch, then use your new level for the next batch.')
      : 'This batch depends on your XP remaining. Enter the client percentage or total XP to narrow the estimate.';
    $('uncertainty-note').textContent = percentBased
      ? `Starting XP: ${format(min.finalXp - min.xpGain)}, calculated from ${estimate.percentToGo.toLocaleString('en-US', { maximumFractionDigits: 10 })}% to go. Recalculate if your progress changes before exchanging.`
      : (exact
        ? 'This plan uses your supplied XP. Recalculate if you gain or lose XP before exchanging.'
        : 'The range covers the start of your level through to 1 XP before leveling up. The plans below illustrate those two scenarios; your sequence may differ.');
    const plans = $('plans');
    plans.replaceChildren(renderPlan(min, exact ? 'Exchange sequence' : 'At the start of your level', exact));
    if (!exact) plans.append(renderPlan(max, 'With 1 XP left to level up', false));
    results.hidden = false;
    $('result-title').focus({ preventScroll: true });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    invalidate();
    // Reject whitespace-only names without making an API request.
    if (!manualMode.checked && !nameInput.value.trim()) {
      error.textContent = 'Enter a character name.';
      error.hidden = false;
      nameInput.focus();
      return;
    }
    const request = new AbortController();
    activeRequest = request;
    let timeout;
    let timedOut = false;
    try {
      const shards = Number(shardsInput.value);
      const percent = parsePercentToGo(percentInput.value);
      let character;
      if (manualMode.checked) {
        character = { level: Number(levelInput.value), world: '', vocation: '' };
      } else {
        setBusy(true);
        status.textContent = 'Looking up your level on TibiaData…';
        timeout = setTimeout(() => { timedOut = true; request.abort(); }, 12000);
        character = await TibiaData.fetchCharacter(nameInput.value, { signal: request.signal });
      }
      if (activeRequest !== request) return;
      const xp = xpInput.value === '' ? undefined : Number(xpInput.value);
      render(character, shards, percent === undefined
        ? estimateExchange(character.level, shards, xp)
        : estimateExchangeFromPercent(character.level, shards, percent));
      status.textContent = manualMode.checked ? 'Calculated using a manually entered level.' : 'Level fetched from TibiaData. Check it matches your in-game level.';
    } catch (failure) {
      if (activeRequest !== request) return;
      status.textContent = '';
      error.textContent = timedOut
        ? 'The lookup timed out. Try again or enter your level manually.'
        : (failure instanceof TypeError
          ? 'Could not reach TibiaData. Check your connection or enter your level manually.'
          : failure.message);
      error.hidden = false;
    } finally {
      clearTimeout(timeout);
      if (activeRequest === request) {
        activeRequest = undefined;
        setBusy(false);
      }
    }
  });
})();
