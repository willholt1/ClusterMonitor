import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { queryPrometheusRange } from "./prometheus";

type MetricKind = "cpu" | "mem" | "disk";

function metricQuery(kind: MetricKind, nodename: string) {
    // All are "instant-like" expressions; range query will evaluate them over time.
    if (kind === "cpu") {
        return `
      (
        100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
      )
      * on(instance) group_left(nodename)
      node_uname_info{nodename="${nodename}"}
    `.trim();
    }

    if (kind === "mem") {
        return `
      (
        (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
        / node_memory_MemTotal_bytes * 100
      )
      * on(instance) group_left(nodename)
      node_uname_info{nodename="${nodename}"}
    `.trim();
    }

    // disk root usage %
    return `
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
}

function toNumber(s: string) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

export default function NodeGraph(props: { nodename: string }) {
    const { nodename } = props;

    const [kind, setKind] = useState<MetricKind>("cpu");
    const [hours, setHours] = useState(1);
    const [data, setData] = useState<Array<{ t: number; v: number }>>([]);
    const [error, setError] = useState<string | null>(null);

    const title = useMemo(() => {
        if (kind === "cpu") return "CPU %";
        if (kind === "mem") return "Memory %";
        return "Disk % (/) ";
    }, [kind]);

    useEffect(() => {
        (async () => {
            try {
                setError(null);

                const end = new Date();
                const start = new Date(end.getTime() - hours * 60 * 60 * 1000);

                // choose step: ~240 points max
                const stepSeconds = Math.max(15, Math.floor((hours * 3600) / 240));

                const q = metricQuery(kind, nodename);
                const resp = await queryPrometheusRange(q, start, end, stepSeconds);

                const series = resp.data.result[0];
                if (!series) {
                    setData([]);
                    return;
                }

                const points = series.values
                    .map(([ts, vs]) => {
                        const v = toNumber(vs);
                        return v === null ? null : { t: ts * 1000, v };
                    })
                    .filter((p): p is { t: number; v: number } => p !== null);

                setData(points);
            } catch (e: any) {
                setError(e?.message ?? String(e));
            }
        })();
    }, [kind, hours, nodename]);

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{nodename} — {title}</h2>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
                <label>
                    Metric{" "}
                    <select value={kind} onChange={(e) => setKind(e.target.value as MetricKind)}>
                        <option value="cpu">CPU %</option>
                        <option value="mem">Memory %</option>
                        <option value="disk">Disk %</option>
                    </select>
                </label>

                <label>
                    Range{" "}
                    <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                        <option value={1}>Last 1h</option>
                        <option value={6}>Last 6h</option>
                        <option value={24}>Last 24h</option>
                    </select>
                </label>
            </div>

            {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

            <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                    <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="t"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(ms) => new Date(ms).toLocaleTimeString()}
                        />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                            labelFormatter={(ms) => new Date(ms as number).toLocaleString()}
                            formatter={(value) => [(value as number).toFixed(1), title]}
                        />
                        <Line dataKey="v" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
