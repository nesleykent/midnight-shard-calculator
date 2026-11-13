(() => {
  const { estimateExchange } = MidnightShards;
  const $ = id => document.getElementById(id);
  const form = $('exchange-form');
  const nameInput = $('character-name');
  const shardsInput = $('shards');
  const xpInput = $('experience');
  const manualMode = $('manual-mode');
  const levelInput = $('manual-level');
  const button = $('calculate');
  const results = $('results');
  const error = $('error');
  const status = $('lookup-status');
  const format = value => value.toLocaleString('pt-BR');
  const range = (min, max) => min === max ? format(min) : `${format(min)} a ${format(max)}`;
  let activeRequest;

  function setBusy(busy) {
    button.disabled = busy;
    button.textContent = busy ? 'Buscando personagem…' : 'Calcular troca';
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
    summary.textContent = `${title}: ${plan.batches.length} ${plan.batches.length === 1 ? 'entrega' : 'entregas'}`;
    details.append(summary);
    const table = document.createElement('table');
    const caption = table.createCaption();
    caption.textContent = exact ? 'Entregue os lotes nesta ordem.' : 'Exemplo para este cenário, não um plano exato para seu personagem.';
    const head = table.createTHead().insertRow();
    for (const label of ['Entrega', 'Level', 'Shards', 'XP']) {
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
    details.append(table);
    return details;
  }

  function render(character, shards, estimate) {
    const { exact, min, max } = estimate;
    $('result-mode').textContent = exact ? 'Plano com XP informada' : 'Estimativa por level';
    $('result-title').textContent = manualMode.checked ? 'Sua troca' : character.name;
    $('character-level').textContent = `Level ${format(character.level)}`;
    $('character-info').textContent = [character.world, character.vocation, `${shards} shards`].filter(Boolean).join(' / ');
    $('xp-caption').textContent = exact ? 'XP com lotes por level' : 'XP mínima a máxima com lotes por level';
    $('xp-range').textContent = `${range(min.xpGain, max.xpGain)} XP`;
    $('final-level').textContent = `Level final: ${range(min.finalLevel, max.finalLevel)}`;
    $('bulk-xp').textContent = `${format(min.bulkXp)} XP`;
    $('saved-xp').textContent = `${range(min.savedXp, max.savedXp)} XP`;
    const firstMin = Math.min(min.batches[0].shards, max.batches[0].shards);
    const firstMax = Math.max(min.batches[0].shards, max.batches[0].shards);
    $('first-batch').textContent = `${range(firstMin, firstMax)} ${firstMax === 1 ? 'shard' : 'shards'}`;
    $('batch-note').textContent = firstMin === firstMax
      ? (min.batches.length === 1 && max.batches.length === 1
        ? 'Pode entregar tudo de uma vez: dividir não aumenta a XP nesta troca.'
        : 'Entregue esse lote e recalcule o valor dos próximos shards no novo level.')
      : 'O lote depende da XP que falta para upar. Informe sua XP total em “Ajustar XP” para saber a quantidade exata.';
    $('uncertainty-note').textContent = exact
      ? 'O plano usa a XP informada. Se ganhar ou perder XP antes da troca, calcule novamente.'
      : 'A faixa vai do início do level até faltar 1 XP para upar. Os planos abaixo ilustram esses 2 cenários; sua sequência pode ser diferente.';
    const plans = $('plans');
    plans.replaceChildren(renderPlan(min, exact ? 'Sequência de troca' : 'Se estiver no início do level', exact));
    if (!exact) plans.append(renderPlan(max, 'Se faltar 1 XP para upar', false));
    results.hidden = false;
    $('result-title').focus({ preventScroll: true });
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    invalidate();
    // Reject whitespace-only names without making an API request.
    if (!manualMode.checked && !nameInput.value.trim()) {
      error.textContent = 'Informe o nome do personagem.';
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
      let character;
      if (manualMode.checked) {
        character = { level: Number(levelInput.value), world: '', vocation: '' };
      } else {
        setBusy(true);
        status.textContent = 'Consultando o level na TibiaData…';
        timeout = setTimeout(() => { timedOut = true; request.abort(); }, 12000);
        character = await TibiaData.fetchCharacter(nameInput.value, { signal: request.signal });
      }
      if (activeRequest !== request) return;
      const xp = xpInput.value === '' ? undefined : Number(xpInput.value);
      render(character, shards, estimateExchange(character.level, shards, xp));
      status.textContent = manualMode.checked ? 'Cálculo com level informado manualmente.' : 'Level consultado na TibiaData. Confira se corresponde ao jogo.';
    } catch (failure) {
      if (activeRequest !== request) return;
      status.textContent = '';
      error.textContent = timedOut
        ? 'A consulta demorou demais. Tente novamente ou informe o level manualmente em “Ajustar XP”.'
        : (failure instanceof TypeError
          ? 'Não foi possível consultar a TibiaData. Confira sua conexão ou informe o level manualmente em “Ajustar XP”.'
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
