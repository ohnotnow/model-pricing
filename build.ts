import { loadModels } from "./data";

const DIST = "./dist";

// 1. Fetch & process model data
console.log("Loading model data...");
const models = await loadModels();
console.log(`Processed ${models.length} models`);

// 2. Write the static JSON file
await Bun.write(`${DIST}/models.json`, JSON.stringify(models));
console.log("Wrote dist/models.json");

// 3. Bundle the frontend
const result = await Bun.build({
  entrypoints: ["./index.html"],
  outdir: DIST,
  minify: true,
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log(`Build complete — ${result.outputs.length} files written to dist/`);
