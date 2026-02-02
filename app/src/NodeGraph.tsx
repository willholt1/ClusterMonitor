import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { getCPUInfoRange, getMemInfoRange, getDiskInfoRange } from "./prometheus";

function toNumber(s: string) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

type ComponentType = "cpu" | "memory" | "disk";

export default function CPUGraph(props: { nodename: string; component: ComponentType }) {
    const { nodename, component } = props;

    const [hours, setHours] = useState(1);
    const [data, setData] = useState<Array<{ t: number; v: number }>>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setError(null);

                const end = new Date();
                const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
                const stepSeconds = Math.max(15, Math.floor((hours * 3600) / 240));

                let resp;
                if (component === "cpu") {
                    resp = await getCPUInfoRange(nodename, start, end, stepSeconds);
                } else if (component === "memory") {
                    resp = await getMemInfoRange(nodename, start, end, stepSeconds);
                } else {
                    resp = await getDiskInfoRange(nodename, start, end, stepSeconds);
                }

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
    }, [hours, nodename]);

    const graphLabel = component === "cpu" ? "CPU" : component === "memory" ? "Memory" : "Disk";

    return (
        <div style={{ padding: 16 }}>
            <h2 style={{ marginBottom: 8 }}>{nodename} — {graphLabel}</h2>

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
                        <Line dataKey="v" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
