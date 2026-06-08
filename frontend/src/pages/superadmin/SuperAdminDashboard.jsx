import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

export default function SuperAdminDashboard() {
    const navigate = useNavigate();
    const { request, loading } = useApi();
    const [users, setUsers] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [securityMetrics, setSecurityMetrics] = useState(null);

    const loadData = useCallback(async () => {
        const [usersRes, campaignRes, departmentRes, auditRes, securityRes] = await Promise.allSettled([
            request({ url: "/admin/users", method: "GET" }),
            request({ url: "/campaigns", method: "GET" }),
            request({ url: "/academic/departments", method: "GET" }),
            request({ url: "/admin/audit-logs?limit=8", method: "GET" }),
            request({ url: "/admin/security-metrics", method: "GET" }),
        ]);

        if (usersRes.status === "fulfilled") setUsers(usersRes.value.data || []);
        if (campaignRes.status === "fulfilled") setCampaigns(campaignRes.value.data || []);
        if (departmentRes.status === "fulfilled") setDepartments(departmentRes.value.data || []);
        if (auditRes.status === "fulfilled") setAuditLogs(auditRes.value.data || []);
        if (securityRes.status === "fulfilled") setSecurityMetrics(securityRes.value.data || null);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData().catch(() => {});
    }, [loadData]);

    const campaignForms = useMemo(
        () => campaigns.flatMap((campaign) => campaign.forms || []),
        [campaigns]
    );
    const submissions = campaignForms.reduce((sum, form) => sum + (form._count?.submissions || 0), 0);
    const activeCampaigns = campaigns.filter((campaign) => ["PUBLISHED", "ACTIVE"].includes(campaign.status)).length;
    const lockedAccounts = securityMetrics?.lockedAccounts ?? 0;
    const riskScore = securityMetrics?.riskScore ?? 0;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">Operational Intelligence</p>
                    <h1 className="sf-page-title mt-2">Platform Command</h1>
                    <p className="text-[#45464d] mt-1">
                        Global tenant governance using the platform data currently available to this deployment.
                    </p>
                </div>
                <Badge variant={riskScore > 50 ? "danger" : "success"}>
                    {riskScore > 50 ? "Action Required" : "All Systems Operational"}
                </Badge>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <Metric label="Managed Users" value={loading ? "-" : users.length} />
                <Metric label="Departments" value={departments.length} />
                <Metric label="Active Campaigns" value={activeCampaigns} />
                <Metric label="Verified Submissions" value={submissions} />
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <section className="xl:col-span-8 sf-panel overflow-hidden">
                    <div className="p-6 border-b border-[#c6c6cd] bg-white flex items-center justify-between gap-4">
                        <div>
                            <h2 className="sf-section-title">Tenant Activity</h2>
                            <p className="text-sm text-[#45464d] mt-1">Campaign and response activity from connected institutions.</p>
                        </div>
                        <Button size="sm" onClick={() => navigate("/superadmin/campaigns")}>Manage Campaigns</Button>
                    </div>

                    {loading && campaigns.length === 0 ? (
                        <div className="p-6"><Skeleton preset="card" /></div>
                    ) : campaigns.length === 0 ? (
                        <EmptyState title="No campaign activity" description="Tenant activity appears after institutions create campaigns." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                                        <th className="p-4 sf-label">Campaign</th>
                                        <th className="p-4 sf-label">Scope</th>
                                        <th className="p-4 sf-label">Responses</th>
                                        <th className="p-4 sf-label">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#c6c6cd]">
                                    {campaigns.slice(0, 7).map((campaign) => {
                                        const responseCount = (campaign.forms || []).reduce((sum, form) => sum + (form._count?.submissions || 0), 0);
                                        return (
                                            <tr key={campaign.id} className="hover:bg-[#f7f9fb]">
                                                <td className="p-4">
                                                    <p className="font-semibold text-black">{campaign.title}</p>
                                                    <p className="text-xs text-[#45464d]">{campaign.type?.replaceAll("_", " ")}</p>
                                                </td>
                                                <td className="p-4 text-[#45464d]">
                                                    {campaign.targetDepartment?.code || campaign.targetCourseAssignment?.course?.code || "College-wide"}
                                                </td>
                                                <td className="p-4 sf-metric">{responseCount}</td>
                                                <td className="p-4"><Badge variant={["PUBLISHED", "ACTIVE"].includes(campaign.status) ? "success" : "secondary"}>{campaign.status}</Badge></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <aside className="xl:col-span-4 space-y-5">
                    <section className="sf-dark-panel p-6">
                        <div className="flex items-center justify-between">
                            <p className="sf-label text-slate-400">Security Center</p>
                            <Badge variant={riskScore > 50 ? "danger" : "success"}>{riskScore}/100</Badge>
                        </div>
                        <h2 className="text-2xl font-semibold text-white mt-4">Risk Monitor</h2>
                        <div className="mt-6 space-y-4">
                            <SecurityLine label="Failed Logins" value={securityMetrics?.failedLogins ?? 0} />
                            <SecurityLine label="Locked Accounts" value={lockedAccounts} />
                            <SecurityLine label="Critical Events" value={securityMetrics?.criticalEvents ?? 0} />
                        </div>
                        <Button className="mt-6" variant="secondary" fullWidth onClick={() => navigate("/superadmin/audit-logs")}>
                            Review Audit Logs
                        </Button>
                    </section>

                    <section className="sf-panel overflow-hidden">
                        <div className="p-4 border-b border-[#c6c6cd] bg-[#f7f9fb]">
                            <h2 className="sf-section-title">Recent Audit Events</h2>
                        </div>
                        <div className="divide-y divide-[#c6c6cd]">
                            {auditLogs.length === 0 ? (
                                <EmptyState title="No audit events" description="Audited platform actions will appear here." compact />
                            ) : auditLogs.slice(0, 5).map((log) => (
                                <div key={log.id} className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <p className="font-semibold text-black text-sm">{log.action}</p>
                                        <Badge variant={log.severity === "CRITICAL" ? "danger" : log.severity === "WARNING" ? "warning" : "secondary"}>
                                            {log.severity}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-[#45464d] mt-1">{log.user?.email || "System"}</p>
                                    <p className="text-xs font-mono text-[#6b7280] mt-2">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function Metric({ label, value }) {
    return (
        <div className="sf-stat">
            <p className="sf-label">{label}</p>
            <p className="sf-metric text-3xl mt-3">{value}</p>
        </div>
    );
}

function SecurityLine({ label, value }) {
    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-mono text-white">{value}</span>
            </div>
            <div className="h-1 bg-slate-700 mt-2">
                <div className="h-full bg-white" style={{ width: `${Math.min(100, Number(value) * 10)}%` }} />
            </div>
        </div>
    );
}

function EmptyState({ title, description, compact = false }) {
    return (
        <div className={`text-center ${compact ? "p-5" : "p-10"}`}>
            <p className="font-semibold text-black">{title}</p>
            <p className="text-sm text-[#45464d] mt-1">{description}</p>
        </div>
    );
}
