import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

export default function AuditLogs() {
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [logs, setLogs] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [view, setView] = useState("LOGS");

    const fetchData = useCallback(async () => {
        const [metricsRes, dataRes] = await Promise.all([
            request({ url: "/admin/security-metrics", method: "GET" }),
            request({ url: view === "LOGS" ? "/admin/audit-logs" : "/admin/anomalies", method: "GET" }),
        ]);

        setMetrics(metricsRes?.data || null);
        if (view === "LOGS") setLogs(dataRes?.data || []);
        else setAnomalies(dataRes?.data || []);
    }, [request, view]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData().catch(() => toast.error("Failed to fetch monitoring data"));
    }, [fetchData, toast]);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">Security Feeds</p>
                    <h1 className="sf-page-title mt-2">Security Operations</h1>
                    <p className="text-[#45464d] mt-1">Immutable audit trails and anomaly signals.</p>
                </div>
                <div className="flex border border-[#c6c6cd] bg-white rounded overflow-hidden">
                    <TabButton active={view === "LOGS"} onClick={() => setView("LOGS")}>Audit Logs</TabButton>
                    <TabButton active={view === "ANOMALIES"} onClick={() => setView("ANOMALIES")}>Threat Detection</TabButton>
                </div>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <Metric label="Risk Score" value={metrics?.riskScore ?? 0} tone={(metrics?.riskScore ?? 0) > 50 ? "danger" : "default"} />
                <Metric label="Failed Logins" value={metrics?.failedLogins ?? 0} />
                <Metric label="Locked Accounts" value={metrics?.lockedAccounts ?? 0} />
                <Metric label="Events 24H" value={metrics?.totalEvents ?? 0} />
            </section>

            {metrics && (
                <section className="sf-dark-panel p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div>
                            <p className="sf-label text-slate-400">Threat Activity</p>
                            <h2 className="text-xl font-semibold text-white mt-2">Live Security Breakdown</h2>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                            <span className="text-red-200">Critical: {metrics.criticalEvents}</span>
                            <span className="text-amber-200">Warning: {metrics.highEvents}</span>
                        </div>
                    </div>
                    <div className="h-3 bg-slate-700 mt-5 overflow-hidden">
                        <div className="h-full bg-red-500 inline-block" style={{ width: `${percent(metrics.criticalEvents, metrics.totalEvents)}%` }} />
                        <div className="h-full bg-amber-400 inline-block" style={{ width: `${percent(metrics.highEvents, metrics.totalEvents)}%` }} />
                    </div>
                </section>
            )}

            <section className="sf-panel overflow-hidden">
                <div className="p-5 border-b border-[#c6c6cd] bg-[#f7f9fb] flex items-center justify-between">
                    <h2 className="sf-section-title">{view === "LOGS" ? "Audit Log Registry" : "Anomaly Registry"}</h2>
                    <Button size="sm" variant="secondary" onClick={fetchData}>Refresh</Button>
                </div>
                {loading ? (
                    <div className="p-6"><Skeleton preset="card" /></div>
                ) : view === "LOGS" ? (
                    <AuditTable logs={logs} />
                ) : (
                    <AnomalyTable anomalies={anomalies} />
                )}
            </section>
        </div>
    );
}

function AuditTable({ logs }) {
    if (logs.length === 0) {
        return <EmptyState title="No audit logs found" description="Login, feedback, and administrative actions will appear here." />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                        <th className="p-4 sf-label">Timestamp</th>
                        <th className="p-4 sf-label">Actor</th>
                        <th className="p-4 sf-label">Action</th>
                        <th className="p-4 sf-label">Resource</th>
                        <th className="p-4 sf-label">Severity</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                    {logs.map((log) => (
                        <tr key={log.id} className="hover:bg-[#f7f9fb]">
                            <td className="p-4 font-mono text-xs text-[#45464d]">{new Date(log.timestamp).toLocaleString()}</td>
                            <td className="p-4">
                                <p className="font-semibold text-black">{log.user?.email || "SYSTEM"}</p>
                                <p className="text-xs text-[#45464d]">{log.user?.role?.name || "SYSTEM"}</p>
                            </td>
                            <td className="p-4 font-mono text-xs">{log.action}</td>
                            <td className="p-4 text-xs text-[#45464d]">{log.resourceType || "SYSTEM"} {log.resourceId ? log.resourceId.slice(0, 8) : ""}</td>
                            <td className="p-4"><SeverityBadge severity={log.severity} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AnomalyTable({ anomalies }) {
    if (anomalies.length === 0) {
        return <EmptyState title="No anomalies detected" description="Abuse and submission integrity anomalies will appear here when detected." />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                        <th className="p-4 sf-label">Detected At</th>
                        <th className="p-4 sf-label">Type</th>
                        <th className="p-4 sf-label">Form</th>
                        <th className="p-4 sf-label">Severity</th>
                        <th className="p-4 sf-label">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                    {anomalies.map((anomaly) => (
                        <tr key={anomaly.id} className="hover:bg-[#f7f9fb]">
                            <td className="p-4 font-mono text-xs text-[#45464d]">{new Date(anomaly.createdAt).toLocaleString()}</td>
                            <td className="p-4 font-semibold text-black">{anomaly.anomalyType}</td>
                            <td className="p-4 text-[#45464d]">{anomaly.form?.title || anomaly.formId}</td>
                            <td className="p-4"><SeverityBadge severity={anomaly.severity} /></td>
                            <td className="p-4 font-mono text-xs text-[#45464d] max-w-sm truncate">{JSON.stringify(anomaly.metadata)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TabButton({ active, children, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2 text-sm font-semibold ${active ? "bg-black text-white" : "bg-white text-[#45464d] hover:bg-[#f7f9fb]"}`}
        >
            {children}
        </button>
    );
}

function Metric({ label, value, tone = "default" }) {
    return (
        <div className="sf-stat">
            <p className="sf-label">{label}</p>
            <p className={`sf-metric text-3xl mt-3 ${tone === "danger" ? "text-[#ba1a1a]" : ""}`}>{value}</p>
        </div>
    );
}

function SeverityBadge({ severity }) {
    const variant = severity === "CRITICAL" || severity === "HIGH" ? "danger" : severity === "WARNING" ? "warning" : "info";
    return <Badge variant={variant}>{severity || "INFO"}</Badge>;
}

function EmptyState({ title, description }) {
    return (
        <div className="text-center p-10">
            <p className="font-semibold text-black">{title}</p>
            <p className="text-sm text-[#45464d] mt-1">{description}</p>
        </div>
    );
}

function percent(value = 0, total = 0) {
    if (!total) return 0;
    return Math.min(100, (value / total) * 100);
}
