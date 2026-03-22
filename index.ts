import { loadModels } from "./data";
import index from "./index.html";

const models = await loadModels();
console.log(`Loaded ${models.length} models`);

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    "/models.json": () => Response.json(models),
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("Running at http://localhost:3000");
