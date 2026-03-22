import React, { useState, useEffect, useRef, useMemo } from "react";
import { createRoot } from "react-dom/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import "./styles.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ─── Types ────────────────────────────────────────────

interface ModelPricing {
  id: string;
  provider: string;
  model: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
}

// ─── Colour Palette ───────────────────────────────────

const CHART_COLOURS = [
  "#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#a855f7",
  "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#e879f9",
  "#14b8a6", "#fb923c", "#818cf8", "#f43f5e", "#22d3ee",
  "#facc15", "#4ade80", "#c084fc", "#fb7185", "#2dd4bf",
];

function getColour(index: number): string {
  return CHART_COLOURS[index % CHART_COLOURS.length];
}

// ─── App ──────────────────────────────────────────────

function App() {
  const [models, setModels] = useState<ModelPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ModelPricing[]>([]);
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [barMode, setBarMode] = useState<"grouped" | "stacked">("grouped");
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/models.json")
      .then((r) => r.json())
      .then((data: ModelPricing[]) => {
        setModels(data);
        // Pre-select a few interesting models
        const defaults = [
          "gpt-5.4",
          "claude-opus-4-6",
          "claude-sonnet-4-6",
          "gemini/gemini-3.1-pro-preview",
          "moonshot/kimi-k2.5",
          "deepseek/deepseek-v3.2",
        ];
        const preselected = defaults
          .map((id) => data.find((m) => m.id === id))
          .filter(Boolean) as ModelPricing[];
        setSelected(preselected);
        setLoading(false);
      });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return [];
    const terms = search.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const selectedIds = new Set(selected.map((m) => m.id));
    return models
      .filter((m) => {
        if (selectedIds.has(m.id)) return false;
        const haystack = `${m.id} ${m.provider} ${m.model}`.toLowerCase();
        return terms.every((term) => haystack.includes(term));
      })
      .slice(0, 50);
  }, [search, models, selected]);

  const addModel = (model: ModelPricing) => {
    setSelected((prev) => [...prev, model]);
    setSearch("");
    searchRef.current?.focus();
  };

  const removeModel = (id: string) => {
    setSelected((prev) => prev.filter((m) => m.id !== id));
  };

  if (loading) {
    return <div className="loading">Loading model data…</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-eyebrow">Comparative Analysis</div>
        <h1>LLM Pricing Report</h1>
        <p>
          Compare input and output costs across models and providers.
          Costs shown per 1M tokens.
        </p>
      </header>

      {/* ─── Model Picker ─── */}
      <section className="picker-section">
        <div className="picker-label">Select models to compare</div>
        <div className="picker-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={searchRef}
            className="picker-search"
            type="text"
            placeholder="Search models… e.g. gpt-4o, claude, gemini"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => search.trim() && setDropdownOpen(true)}
          />
          {dropdownOpen && filtered.length > 0 && (
            <div className="picker-dropdown" ref={dropdownRef}>
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="picker-option"
                  onClick={() => addModel(m)}
                >
                  <span className="picker-option-provider">{m.provider}</span>
                  <span className="picker-option-model">{m.model}</span>
                  <span className="picker-option-cost">
                    ${m.inputCostPer1M.toFixed(2)} / ${m.outputCostPer1M.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pills">
          {selected.length === 0 && (
            <span className="pills-empty">No models selected — search above to add models</span>
          )}
          {selected.map((m, i) => (
            <span
              key={m.id}
              className="pill"
              style={{
                borderColor: getColour(i),
                color: getColour(i),
                background: `${getColour(i)}15`,
              }}
            >
              {m.id}
              <button
                className="pill-close"
                onClick={() => removeModel(m.id)}
                aria-label={`Remove ${m.id}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </section>

      {/* ─── Charts ─── */}
      <div className="charts-grid">
        <CostCurveChart models={selected} />
        <CostBarChart
          models={selected}
          stacked={barMode === "stacked"}
          barMode={barMode}
          setBarMode={setBarMode}
        />
      </div>
    </div>
  );
}

// ─── Line Chart: Cost vs Token Count ──────────────────

const TOKEN_STEPS = [
  0, 100_000, 250_000, 500_000, 1_000_000, 2_000_000,
  3_000_000, 5_000_000, 7_500_000, 10_000_000,
];

const TOKEN_LABELS = TOKEN_STEPS.map((t) =>
  t === 0 ? "0" : t >= 1_000_000 ? `${t / 1_000_000}M` : `${t / 1_000}K`
);

function CostCurveChart({ models }: { models: ModelPricing[] }) {
  if (models.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Cost Curve</div>
            <div className="chart-card-subtitle">
              Cost as token count increases (0 – 10M tokens)
            </div>
          </div>
        </div>
        <div className="chart-wrap">
          <div className="chart-empty">Select models above to see the cost curve</div>
        </div>
      </div>
    );
  }

  const datasets = models.flatMap((m, i) => {
    const colour = getColour(i);
    const inputData = TOKEN_STEPS.map(
      (t) => (t / 1_000_000) * m.inputCostPer1M
    );
    const outputData = TOKEN_STEPS.map(
      (t) => (t / 1_000_000) * m.outputCostPer1M
    );
    const mixData = TOKEN_STEPS.map(
      (t) =>
        (t / 1_000_000) * (m.inputCostPer1M * 0.5 + m.outputCostPer1M * 0.5)
    );

    return [
      {
        label: `${m.id} (input)`,
        data: inputData,
        borderColor: colour,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderDash: [6, 3],
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
      },
      {
        label: `${m.id} (output)`,
        data: outputData,
        borderColor: colour,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
      },
      {
        label: `${m.id} (50/50 mix)`,
        data: mixData,
        borderColor: colour,
        backgroundColor: `${colour}18`,
        borderWidth: 2,
        borderDash: [2, 2],
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.1,
      },
    ];
  });

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">Cost Curve</div>
          <div className="chart-card-subtitle">
            Cost as token count increases (0 – 10M tokens) — solid = output, dashed = input, dotted = 50/50 mix
            <br />Tooltip shows: model (input / output / mix)
          </div>
        </div>
      </div>
      <div className="chart-wrap">
        <Line
          data={{ labels: TOKEN_LABELS, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#1c2438",
                borderColor: "#2a3350",
                borderWidth: 1,
                titleFont: { family: "IBM Plex Sans", size: 13 },
                bodyFont: { family: "IBM Plex Mono", size: 12 },
                padding: 12,
                // Keep one item per model (every 3rd dataset = the input line)
                filter: (item) => item.datasetIndex % 3 === 0,
                // Sort by most expensive (mix value) first
                itemSort: (a, b) => {
                  const mixA = a.chart.data.datasets[a.datasetIndex + 2]?.data[a.dataIndex] as number ?? 0;
                  const mixB = b.chart.data.datasets[b.datasetIndex + 2]?.data[b.dataIndex] as number ?? 0;
                  return mixB - mixA;
                },
                callbacks: {
                  // Build one condensed line per model: "name  $in / $out / $mix"
                  label: (ctx) => {
                    const idx = ctx.dataIndex;
                    const base = ctx.datasetIndex;
                    const input = ctx.chart.data.datasets[base]?.data[idx] as number ?? 0;
                    const output = ctx.chart.data.datasets[base + 1]?.data[idx] as number ?? 0;
                    const mix = ctx.chart.data.datasets[base + 2]?.data[idx] as number ?? 0;
                    const modelId = (ctx.dataset.label ?? "").replace(/ \(input\)$/, "");
                    return ` ${modelId}  $${input.toFixed(2)} / $${output.toFixed(2)} / $${mix.toFixed(2)}`;
                  },
                  labelColor: (ctx) => ({
                    borderColor: ctx.dataset.borderColor as string,
                    backgroundColor: ctx.dataset.borderColor as string,
                    borderRadius: 2,
                  }),
                },
              },
            },
            scales: {
              x: {
                grid: { color: "rgba(255,255,255,0.04)" },
                ticks: {
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Mono", size: 11 },
                },
                title: {
                  display: true,
                  text: "Tokens",
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Sans", size: 12 },
                },
              },
              y: {
                grid: { color: "rgba(255,255,255,0.04)" },
                ticks: {
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Mono", size: 11 },
                  callback: (v) => `$${v}`,
                },
                title: {
                  display: true,
                  text: "Cost (USD)",
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Sans", size: 12 },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

// ─── Bar Chart: Input vs Output Cost ──────────────────

function CostBarChart({
  models,
  stacked,
  barMode,
  setBarMode,
}: {
  models: ModelPricing[];
  stacked: boolean;
  barMode: string;
  setBarMode: (m: "grouped" | "stacked") => void;
}) {
  const labels = models.map((m) => m.id);

  if (models.length === 0) {
    return (
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Cost per 1M Tokens</div>
            <div className="chart-card-subtitle">
              Input vs output cost comparison
            </div>
          </div>
        </div>
        <div className="chart-wrap">
          <div className="chart-empty">Select models above to see the comparison</div>
        </div>
      </div>
    );
  }

  const datasets = [
    {
      label: "Input (per 1M tokens)",
      data: models.map((m) => m.inputCostPer1M),
      backgroundColor: models.map((_, i) => `${getColour(i)}99`),
      borderColor: models.map((_, i) => getColour(i)),
      borderWidth: 1,
      borderRadius: 4,
    },
    {
      label: "Output (per 1M tokens)",
      data: models.map((m) => m.outputCostPer1M),
      backgroundColor: models.map((_, i) => getColour(i)),
      borderColor: models.map((_, i) => getColour(i)),
      borderWidth: 1,
      borderRadius: 4,
    },
  ];

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">Cost per 1M Tokens</div>
          <div className="chart-card-subtitle">
            Input vs output cost comparison
          </div>
        </div>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${barMode === "grouped" ? "active" : ""}`}
            onClick={() => setBarMode("grouped")}
          >
            Grouped
          </button>
          <button
            className={`toggle-btn ${barMode === "stacked" ? "active" : ""}`}
            onClick={() => setBarMode("stacked")}
          >
            Stacked
          </button>
        </div>
      </div>
      <div className="chart-wrap">
        <Bar
          data={{ labels, datasets }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: {
                position: "top",
                align: "end",
                labels: {
                  color: "#b8c0d4",
                  font: { family: "IBM Plex Sans", size: 12 },
                  boxWidth: 12,
                  boxHeight: 12,
                  borderRadius: 3,
                  useBorderRadius: true,
                  padding: 16,
                },
              },
              tooltip: {
                backgroundColor: "#1c2438",
                borderColor: "#2a3350",
                borderWidth: 1,
                titleFont: { family: "IBM Plex Sans", size: 13 },
                bodyFont: { family: "IBM Plex Mono", size: 12 },
                padding: 12,
                callbacks: {
                  label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`,
                },
              },
            },
            scales: {
              x: {
                stacked,
                grid: { display: false },
                ticks: {
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Mono", size: 10 },
                  maxRotation: 45,
                },
              },
              y: {
                stacked,
                grid: { color: "rgba(255,255,255,0.04)" },
                ticks: {
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Mono", size: 11 },
                  callback: (v) => `$${v}`,
                },
                title: {
                  display: true,
                  text: "USD per 1M tokens",
                  color: "#8e9ab4",
                  font: { family: "IBM Plex Sans", size: 12 },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

// ─── Mount ────────────────────────────────────────────

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
