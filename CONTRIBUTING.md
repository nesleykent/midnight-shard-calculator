# Contributing

Thank you for helping improve Midnight Shard Calculator.

## Run locally

This is a static website. No package install or build is required.

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Use Node.js 20 or later to run the test suite:

```sh
node --test
```

## Before opening a pull request

- Keep changes focused on one problem and describe the resulting behavior.
- Add or update calculation tests when behavior changes. Preserve overflow XP,
  level boundaries, shard limits and the meaning of percent remaining.
- Verify the rendered interface at desktop and small phone widths, including
  320 px, when changing HTML or CSS. Check keyboard focus and error states.
- Run `node --test`, `node --check app.js` and `git diff --check`.
- Update the version query on changed CSS or JavaScript references in
  `index.html` so returning visitors receive the current assets.
- Keep credentials, character names, personal screenshots and local files out
  of commits. Use fictional or anonymous examples in tests and documentation.

## Report an issue

Include the expected and actual result, the starting level, shard quantity and
whether you used percent remaining or total XP. A small anonymous reproduction
is more useful than an account name. For layout issues, include the viewport
width and browser version; redact personal information from screenshots.

## Project structure

- `index.html` and `styles.css`: accessible form and responsive presentation.
- `app.js`: browser state, input handling and result rendering.
- `calculator.js`: pure level, percentage and batch calculations.
- `tibiadata.js`: public character lookup and response validation.
- `tests/`: dependency-free tests using Node's built-in runner.

The GitHub Actions CI workflow validates syntax, calculations and whitespace on
pushes and pull requests. GitHub Pages publishes the static site from `main`.
