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

export type PromRangeResponse = {
    status: "success" | "error";
    data: {
        resultType: "matrix";
        result: Array<{
            metric: Record<string, string>;
            values: Array<[number, string]>; // [timestampSeconds, valueString]
        }>;
    };
};

export async function getNodeInfo(): Promise<PromQueryResponse> {
    const query: string = "kube_node_info";

    return queryPrometheus(query);
}

export async function getCPUInfo(): Promise<PromQueryResponse> {
    const query: string = `(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100))
                         * on(instance) group_left(nodename) node_uname_info`.trim();

    return queryPrometheus(query);
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

    return queryPrometheus(query);
}

export async function getDiskInfo(): Promise<PromQueryResponse> {
    const query: string = `
                            (
                              100 - (
                                (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|squashfs|fuse.lxcfs|ramfs", mountpoint="/"}
                                / node_filesystem_size_bytes{fstype!~"tmpfs|overlay|squashfs|fuse.lxcfs|ramfs", mountpoint="/"})
                                * 100
                              )
                            )
                            * on(instance) group_left(nodename)
                            node_uname_info
                        `.trim();

    return queryPrometheus(query);
}

async function queryPrometheus<T = PromQueryResponse>(query: string): Promise<T> {
    const res = await fetch(`/api/prom/query?query=${encodeURIComponent(query)}`);

    if (!res.ok) throw new Error(`Prometheus query failed: ${res.status}`);
    return res.json();
}

export async function getCPUInfoRange(
    nodename: string,
    start: Date,
    end: Date,
    stepSeconds: number
): Promise<PromRangeResponse> {
    const query: string = `
      (
        100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
      )
      * on(instance) group_left(nodename)
      node_uname_info{nodename="${nodename}"}
    `.trim();

    return queryPrometheusRange(query, start, end, stepSeconds);
}

export async function getMemInfoRange(
    nodename: string,
    start: Date,
    end: Date,
    stepSeconds: number
): Promise<PromRangeResponse> {
    const query: string = `
      (
        (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
        / node_memory_MemTotal_bytes * 100
      )
      * on(instance) group_left(nodename)
      node_uname_info{nodename="${nodename}"}
    `.trim();

    return queryPrometheusRange(query, start, end, stepSeconds);
}

export async function getDiskInfoRange(
    nodename: string,
    start: Date,
    end: Date,
    stepSeconds: number
): Promise<PromRangeResponse> {
    const query: string = `
    (
      100 - (
        (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|squashfs|fuse.lxcfs|ramfs", mountpoint="/"}
        / node_filesystem_size_bytes{fstype!~"tmpfs|overlay|squashfs|fuse.lxcfs|ramfs", mountpoint="/"})
        * 100
      )
    )
    * on(instance) group_left(nodename)
    node_uname_info{nodename="${nodename}"}
  `.trim();

    return queryPrometheusRange(query, start, end, stepSeconds);
}

export async function queryPrometheusRange(
    query: string,
    start: Date,
    end: Date,
    stepSeconds: number
): Promise<PromRangeResponse> {
    const params = new URLSearchParams({
        query,
        start: (start.getTime() / 1000).toString(),
        end: (end.getTime() / 1000).toString(),
        step: stepSeconds.toString(),
    });

    const res = await fetch(`/api/prom/query_range?${params.toString()}`);
    if (!res.ok) throw new Error(`Prometheus range query failed: ${res.status}`);
    return res.json();
}