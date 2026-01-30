export type PromQueryResponse = {
  status: "success" | "error";
  data: {
    resultType: "vector" | "matrix" | "scalar" | "string";
    result: Array<{
      metric: Record<string, string>;
      value: [number, string]; // [timestamp, value]
    }>;
  };
};

export async function promQuery(query: string): Promise<PromQueryResponse> {
  const url = `/prom/api/v1/query?query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Prometheus query failed: ${res.status}`);
  console.log(res.json);
  return res.json();
}
