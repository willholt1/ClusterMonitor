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

export async function getNodeInfo(): Promise<PromQueryResponse> {
    const query: string = "kube_node_info";

    const url = `/prom/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Prometheus query failed: ${res.status}`);
    return res.json();
}

export async function getCPUInfo(): Promise<PromQueryResponse> {
    const query: string = `(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))
                         * on(instance) group_left(nodename) node_uname_info`.trim();

    const url = `/prom/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Prometheus query failed: ${res.status}`);
    return res.json();
}

export async function getMemInfo(): Promise<PromQueryResponse> {
    const query: string = `
                          (
                            (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
                            / node_memory_MemTotal_bytes * 100
                          )
                          * on(instance) group_left(nodename)
                          node_uname_info
                        `.trim();

    const url = `/prom/api/v1/query?query=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Prometheus query failed: ${res.status}`);
    return res.json();
}
