# model-pricing

A visual comparison tool for LLM API pricing across providers and models.

## What it does

model-pricing pulls pricing data from the [litellm](https://github.com/BerriAI/litellm) community-maintained model list and presents it as an interactive report. You can search and select models, then compare their input and output costs across two charts: a cost curve showing how price scales from zero to ten million tokens (with drag-to-zoom for focusing on a specific range), and a grouped or stacked bar chart for a side-by-side snapshot.

The report is designed to give a quick, manager-friendly ball-park comparison rather than an exhaustive breakdown of every pricing tier.

## Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)

## Getting started

```bash
bun install
```

For local development with hot reloading:

```bash
bun --hot index.ts
```

Then open http://localhost:3000.

The litellm pricing data is fetched automatically if there is no local copy or if it is more than a week old. A copy of the raw JSON is kept locally as `model_prices_and_context_window.json` (gitignored).

## Building for production

```bash
bun run build.ts
```

This fetches fresh pricing data, processes it into a simplified JSON file, and bundles everything into `dist/`. The output is a fully static site ready for any static host.

A `netlify.toml` is included for one-click Netlify deploys.

## Contributing

1. Clone the repo
2. Run `bun install`
3. Run `bun --hot index.ts` and open http://localhost:3000
4. Make your changes and submit a PR

## Licence

[MIT](LICENCE)
