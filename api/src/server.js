import express from "express";

const app = express();

// Prometheus inside the cluster (set via env in Deployment)
const PROM_URL = process.env.PROM_URL || "http://prometheus.monitoring.svc:9090";

function buildUrl(path, queryParams) {
  const url = new URL(path, PROM_URL);
  for (const [k, v] of Object.entries(queryParams)) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function promFetch(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  const text = await res.text();
  if (!res.ok) {
    return { ok: false, status: res.status, body: text };
  }
  return { ok: true, status: res.status, body: text };
}

// Health endpoints (good for probes)
app.get("/healthz", (_req, res) => res.status(200).send("ok"));
app.get("/readyz", (_req, res) => res.status(200).send("ok"));

// Instant query: /api/prom/query?query=...
app.get("/api/prom/query", async (req, res) => {
  const query = req.query.query;
  if (!query) return res.status(400).json({ error: "Missing query parameter: query" });

  const url = buildUrl("/api/v1/query", { query });
  const r = await promFetch(url);
  res.status(r.ok ? 200 : 502).type("application/json").send(r.body);
});

// Range query: /api/prom/query_range?query=...&start=...&end=...&step=...
app.get("/api/prom/query_range", async (req, res) => {
  const { query, start, end, step } = req.query;
  if (!query) return res.status(400).json({ error: "Missing query parameter: query" });
  if (!start || !end || !step) {
    return res.status(400).json({ error: "Missing one of: start, end, step" });
  }

  const url = buildUrl("/api/v1/query_range", { query, start, end, step });
  const r = await promFetch(url);
  res.status(r.ok ? 200 : 502).type("application/json").send(r.body);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`clustermonitor-api listening on ${port}, PROM_URL=${PROM_URL}`);
});
