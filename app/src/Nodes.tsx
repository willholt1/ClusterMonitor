import { useEffect, useState } from "react";
import { getNodeInfo, getCPUInfo, getMemInfo, getDiskInfo} from "./prometheus";

type NodeRow = {
    node: string;
    cpuPct?: number;
    memPct?: number;
    diskPct?: number;
};

function toNumber(s: string) {
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
}

export default function Nodes() {
    const [rows, setRows] = useState<NodeRow[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setError(null);

                // Node list from kube-state-metrics (Kubernetes truth)
                const nodesResp = await getNodeInfo();
                const nodeNames = Array.from(
                    new Set(nodesResp.data.result.map((r) => r.metric.node).filter(Boolean))
                ).sort();

                // CPU% with nodename label (joined via node_uname_info)
                const cpuResp = await getCPUInfo();

                // Mem% with nodename label
                const memResp = await getMemInfo();

                const diskResp = await getDiskInfo();

                // Build maps keyed by host name
                const cpuByNode = new Map<string, number>();
                for (const r of cpuResp.data.result) {
                    const name = r.metric.nodename;
                    const v = toNumber(r.value[1]);
                    if (name && v !== undefined) cpuByNode.set(name, v);
                }

                const memByNode = new Map<string, number>();
                for (const r of memResp.data.result) {
                    const name = r.metric.nodename;
                    const v = toNumber(r.value[1]);
                    if (name && v !== undefined) memByNode.set(name, v);
                }

                const diskByNode = new Map<string, number>();
                for (const r of diskResp.data.result) {
                    const name = r.metric.nodename;
                    const v = toNumber(r.value[1]);
                    if (name && v !== undefined) diskByNode.set(name, v);
                }

                // Merge into rows
                const nextRows: NodeRow[] = nodeNames.map((node) => ({
                    node,
                    cpuPct: cpuByNode.get(node),
                    memPct: memByNode.get(node),
                    diskPct: diskByNode.get(node),
                }));

                setRows(nextRows);
            } catch (e: any) {
                setError(e?.message ?? String(e));
            }
        })();
    }, []);

    return (
        <div style={{ padding: 16 }}>
            <h1>Cluster Nodes</h1>
            {error && <pre style={{ whiteSpace: "pre-wrap" }}>{error}</pre>}

            <table cellPadding={8} style={{ borderCollapse: "collapse" }}>
                <thead>
                    <tr>
                        <th align="left">Node</th>
                        <th align="left">CPU %</th>
                        <th align="left">Mem %</th>
                        <th align="left">Disk %</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr key={r.node}>
                            <td>{r.node}</td>
                            <td>{r.cpuPct !== undefined ? r.cpuPct.toFixed(1) : "-"}</td>
                            <td>{r.memPct !== undefined ? r.memPct.toFixed(1) : "-"}</td>
                            <td>{r.diskPct !== undefined ? r.diskPct.toFixed(1) : "-"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
