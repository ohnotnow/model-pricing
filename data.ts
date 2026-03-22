const DATA_FILE = "model_prices_and_context_window.json";
const DATA_URL =
  "https://raw.githubusercontent.com/BerriAI/litellm/refs/heads/main/model_prices_and_context_window.json";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

interface RawModelEntry {
  litellm_provider?: string;
  input_cost_per_token?: number;
  output_cost_per_token?: number;
  mode?: string;
}

async function ensureFreshData(): Promise<void> {
  const file = Bun.file(DATA_FILE);
  const exists = await file.exists();

  if (exists) {
    const stat = await file.stat();
    const age = Date.now() - (stat?.mtime?.getTime() ?? 0);
    if (age < MAX_AGE_MS) return;
  }

  console.log("Fetching fresh model pricing data...");
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    if (exists) {
      console.warn("Fetch failed, using existing local copy.");
      return;
    }
    throw new Error(`Failed to fetch pricing data: ${response.status}`);
  }
  await Bun.write(DATA_FILE, await response.text());
  console.log("Updated model pricing data.");
}

export async function loadModels(): Promise<ModelPricing[]> {
  await ensureFreshData();

  const raw: Record<string, RawModelEntry> = await Bun.file(DATA_FILE).json();
  const models: ModelPricing[] = [];

  for (const [id, entry] of Object.entries(raw)) {
    if (
      entry.mode !== "chat" ||
      entry.input_cost_per_token == null ||
      entry.output_cost_per_token == null ||
      entry.input_cost_per_token === 0 ||
      entry.output_cost_per_token === 0
    ) {
      continue;
    }

    const provider = entry.litellm_provider ?? "unknown";
    // Strip provider prefix from the model name if present
    const model = id.includes("/") ? id.split("/").slice(1).join("/") : id;

    models.push({
      id,
      provider,
      model,
      inputCostPer1M: entry.input_cost_per_token * 1_000_000,
      outputCostPer1M: entry.output_cost_per_token * 1_000_000,
    });
  }

  // Sort by provider then model name
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}
