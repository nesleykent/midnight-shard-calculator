# Midnight Shard Calculator

Planejador de trocas de Midnight Shards para o evento The Lightbearer do Tibia.

Informe o nome do personagem e de 1 a 80 shards. A calculadora consulta o level
na [TibiaData](https://tibiadata.com/) e mostra:

- XP mínima e máxima ao entregar lotes por level, level final e primeiro lote.
- XP de uma entrega única e quanto os lotes podem render a mais.
- Sequências ilustrativas para o início do level e para quando falta 1 XP para upar.

O endpoint público de personagem não fornece a XP exata dentro do level.
Por isso, as faixas consideram desde a XP mínima do level até 1 XP antes do
próximo. Em **Ajustar XP**, informe a XP total atual do jogo para obter uma
sequência exata. O level também pode ser informado manualmente se a API estiver
indisponível. O formulário não salva nomes nem dados de personagens.

## Cálculo

Cada shard rende `300 × level` no início de cada entrega. Um lote termina no
primeiro shard que sobe o level; os shards seguintes usam o novo level. A XP que
ultrapassa o limite do level é mantida no cálculo. Isso produz o mesmo ganho da
troca individual, agrupando os shards que rendem o mesmo valor. Em levels baixos,
um único shard pode subir vários levels, então alguns lotes ainda terão 1 shard.

XP mínima para o level L: `(50L³ - 300L² + 850L - 600) / 3`.

O limite de troca do evento é 80 shards por personagem. Se já entregou parte,
informe apenas a quantidade restante que pretende trocar, respeitando esse
limite total. Os dados públicos podem estar atrasados; confira o level no jogo
e recalcule se ganhar ou perder XP antes de entregar.

## Executar e validar

Site estático, sem dependências de produção ou etapa de build. Sirva a pasta:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8000`. O endereço antigo `midnight-shards.html` redireciona
para a mesma calculadora. A hospedagem existente de arquivos estáticos continua
compatível.

Testes com Node.js 20 ou superior:

```sh
node --test
```

Os testes verificam limites de level, XP excedente, lotes, faixas sem XP exata,
validação e respostas da API. O ganho dos lotes é comparado com uma simulação
independente shard por shard. Levels de 1 a 10.000 são suportados.

Contrato da integração: [TibiaData OpenAPI](https://docs.tibiadata.com/),
`GET /v4/character/{name}`, usando `character.character.level`. A consulta é
cancelada ao editar os campos e expira após 12 segundos. Apenas nome, level,
mundo e vocação retornados pela API são usados em memória.

## Alterações

- O fluxo principal passa de meta de XP e level manual para personagem e shards.
- A simulação considera subidas de level e recomenda lotes, com comparação
  contra uma entrega única.
- Interface em português, acessível por teclado e adaptada para telas pequenas.
