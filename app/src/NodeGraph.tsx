import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { getCPUInfoRange, getMemInfoRange, getDiskInfoRange, getNodeInfo } from "./prometheus";

function toNumber(s: string) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

type ComponentType = "cpu" | "memory" | "disk";

// Generate a consistent color for each node
const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1", "#d084d0", "#a4de6c"];

export default function PerformanceGraph(props: { component: ComponentType }) {
    const { component } = props;

    const [nodenames, setNodenames] = useState<string[]>([]);
    const [hours, setHours] = useState(1);
    const [data, setData] = useState<Array<{ t: number;[key: string]: number }>>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setError(null);

                const nodesResp = await getNodeInfo();
                const nodes = Array.from(
                    new Set(nodesResp.data.result.map((r) => r.metric.node).filter(Boolean))
                ).sort();

                setNodenames(nodes);

                const end = new Date();
                const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
                const stepSeconds = Math.max(15, Math.floor((hours * 3600) / 240));

                // Fetch data for all nodes in parallel
                const promises = nodes.map(async (nodename) => {
                    let resp;
                    if (component === "cpu") {
                        resp = await getCPUInfoRange(nodename, start, end, stepSeconds);
                    } else if (component === "memory") {
                        resp = await getMemInfoRange(nodename, start, end, stepSeconds);
                    } else {
                        resp = await getDiskInfoRange(nodename, start, end, stepSeconds);
                    }

                    const series = resp.data.result[0];
                    if (!series) return { nodename, points: [] };

                    const points = series.values
                        .map(([ts, vs]) => {
                            const v = toNumber(vs);
                            return v === null ? null : { t: ts * 1000, v };
                        })
                        .filter((p): p is { t: number; v: number } => p !== null);

                    return { nodename, points };
                });

                const results = await Promise.all(promises);

                // Merge all node data by timestamp
                const timeMap = new Map<number, { t: number;[key: string]: number }>();

                results.forEach(({ nodename, points }) => {
                    points.forEach(({ t, v }) => {
                        if (!timeMap.has(t)) {
                            timeMap.set(t, { t });
                        }
                        timeMap.get(t)![nodename] = v;
                    });
                });

                const merged = Array.from(timeMap.values()).sort((a, b) => a.t - b.t);
                setData(merged);
            } catch (e: any) {
                setError(e?.message ?? String(e));
            }
        })();
    }, [hours, component]);

    const graphLabel = component === "cpu" ? "CPU" : component === "memory" ? "Memory" : "Disk";

    return (
        <div style={{ padding: 16, width: "80vw"}}>
            <h2 style={{ marginBottom: 8 }}>
                {nodenames.length === 1 ? nodenames[0] : `${nodenames.length} Nodes`} — {graphLabel}
            </h2>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
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
                            formatter={(value) => [(value as number).toFixed(1), graphLabel]}
                        />
                        <Legend />
                        {nodenames.map((nodename, i) => (
                            <Line
                                key={nodename}
                                dataKey={nodename}
                                stroke={colors[i % colors.length]}
                                dot={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
