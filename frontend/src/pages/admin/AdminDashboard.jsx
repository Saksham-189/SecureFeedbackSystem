import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";
import { ROLES } from "../../utils/roles";

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { request, loading } = useApi();
    const [campaigns, setCampaigns] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [departmentAnalytics, setDepartmentAnalytics] = useState([]);
    const [security, setSecurity] = useState(null);
    const [intelligence, setIntelligence] = useState(null);

    const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

    const loadData = useCallback(async () => {
        const [campaignRes, departmentRes, analyticsRes, securityRes, intelligenceRes] = await Promise.allSettled([
            request({ url: "/campaigns", method: "GET" }),
            request({ url: "/academic/departments", method: "GET" }),
            request({ url: "/analytics/departments", method: "GET" }),
            request({ url: "/admin/security-metrics", method: "GET" }),
            request({ url: "/analytics/admin/intelligence", method: "GET" }),
        ]);

        if (campaignRes.status === "fulfilled") setCampaigns(campaignRes.value.data || []);
        if (departmentRes.status === "fulfilled") setDepartments(departmentRes.value.data || []);
        if (analyticsRes.status === "fulfilled") setDepartmentAnalytics(analyticsRes.value.data || []);
        if (securityRes.status === "fulfilled") setSecurity(securityRes.value.data || null);
        if (intelligenceRes.status === "fulfilled") setIntelligence(intelligenceRes.value.data || null);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData().catch(() => {});
    }, [loadData]);

    const activeCampaigns = campaigns.filter((campaign) => ["PUBLISHED", "ACTIVE"].includes(campaign.status));
    const totalResponses = campaigns.reduce((sum, campaign) => (
        sum + (campaign.forms || []).reduce((formSum, form) => formSum + (form._count?.submissions || 0), 0)
    ), 0);
    const eligibleStudents = departmentAnalytics.reduce((sum, item) => sum + (item.eligibleStudents || 0), 0);
    const analyticsSubmissions = departmentAnalytics.reduce((sum, item) => sum + (item.submissions || 0), 0);
    const participation = eligibleStudents > 0
        ? Math.round((analyticsSubmissions / eligibleStudents) * 100)
        : null;

    return (
        <div className="max-w-7xl mx-auto space-y-5 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                <div>
                    <h1 className="sf-page-title">{isSuperAdmin ? "Platform Command" : "Institution Operations"}</h1>
                    <p className="text-[#45464d] mt-1">
                        {isSuperAdmin
                            ? "Multi-tenant governance and security oversight."
                            : "Real-time health assessment and campaign oversight."}
                    </p>
                </div>
                <Badge variant={security?.riskScore > 50 ? "danger" : "success"}>
                    {security?.riskScore > 50 ? "Action Required" : "System Nominal"}
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
                <Metric label={isSuperAdmin ? "Active Tenants" : "Departments"} value={departments.length} />
                <Metric label="Active Campaigns" value={activeCampaigns.length} />
                <Metric label="Participation" value={participation === null ? "-" : `${participation}%`} />
                <Metric label="Responses" value={totalResponses} />
            </div>

            <section className="sf-panel overflow-hidden">
                <div className="p-5 border-b border-[#c6c6cd] bg-[#f7f9fb] flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">Institution Intelligence</h2>
                        <p className="text-sm text-[#45464d]">Sentiment, themes, trends, and operational observations from completed submissions.</p>
                    </div>
                    <Badge variant={intelligence?.analyticsHidden ? "warning" : "info"}>
                        {intelligence?.analyticsHidden ? "Privacy Locked" : "Real Data"}
                    </Badge>
                </div>
                <div className="p-5">
                    {loading && !intelligence ? (
                        <Skeleton preset="card" />
                    ) : !intelligence || intelligence.analyticsHidden ? (
                        <EmptyState
                            title="Intelligence hidden"
                            description={`At least ${intelligence?.privacyThreshold || 5} submissions are required before aggregate insights are shown.`}
                            compact
                        />
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                            <div className="xl:col-span-4">
                                <SentimentPanel sentiment={intelligence.sentiment} />
                            </div>
                            <div className="xl:col-span-4">
                                <TopicList title="Top Discussion Topics" items={intelligence.themes} />
                            </div>
                            <div className="xl:col-span-4">
                                <ActionCenter observations={intelligence.actionCenter} />
                            </div>
                            <div className="xl:col-span-6">
                                <InsightList title="Strengths" items={intelligence.strengths} empty="No strength signals yet." />
                            </div>
                            <div className="xl:col-span-6">
                                <InsightList title="Improvement Areas" items={intelligence.improvementAreas} empty="No improvement signals yet." />
                            </div>
                            <div className="xl:col-span-12 border border-[#c6c6cd] rounded p-4 bg-white">
                                <p className="sf-label">Trend Analysis</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <p className="text-sm text-[#45464d]">{intelligence.trends?.ratingTrend}</p>
                                    <p className="text-sm text-[#45464d]">{intelligence.trends?.participationTrend}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                <section className="xl:col-span-8 sf-panel overflow-hidden">
                    <div className="p-6 border-b border-[#c6c6cd] flex items-center justify-between bg-[#f7f9fb]">
                        <h2 className="text-base font-semibold">Campaign Center</h2>
                        <Button size="sm" onClick={() => navigate("/admin/campaigns")}>View All Campaigns</Button>
                    </div>
                    {loading && campaigns.length === 0 ? (
                        <div className="p-6"><Skeleton preset="card" /></div>
                    ) : campaigns.length === 0 ? (
                        <EmptyState title="No campaigns created" description="Launch a targeted campaign to begin collecting feedback." action={() => navigate("/admin/campaigns")} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                                        <th className="p-4 sf-label">Campaign Name</th>
                                        <th className="p-4 sf-label">Department</th>
                                        <th className="p-4 sf-label">Responses</th>
                                        <th className="p-4 sf-label">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#c6c6cd]">
                                    {campaigns.slice(0, 6).map((campaign) => {
                                        const responses = (campaign.forms || []).reduce((sum, form) => sum + (form._count?.submissions || 0), 0);
                                        return (
                                            <tr key={campaign.id} className="hover:bg-[#f7f9fb]">
                                                <td className="p-4">
                                                    <div className="font-semibold text-black">{campaign.title}</div>
                                                    <div className="text-sm text-[#45464d]">{campaign.endDate ? `Ends ${new Date(campaign.endDate).toLocaleDateString()}` : "No deadline"}</div>
                                                </td>
                                                <td className="p-4 text-[#45464d]">{campaign.targetDepartment?.name || "College-wide"}</td>
                                                <td className="p-4 sf-metric">{responses}</td>
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
                    <section className="sf-panel p-6">
                        <h2 className="text-base font-semibold mb-4">Risk Monitor</h2>
                        {!security || security.riskScore === 0 ? (
                            <EmptyState title="No active risk signals" description="Security and abuse anomalies will appear here when detected." compact />
                        ) : (
                            <div className="border-l-4 border-[#ba1a1a] bg-[#ffdad6]/40 p-4">
                                <div className="flex justify-between">
                                    <span className="font-semibold text-[#93000a]">Risk score</span>
                                    <span className="sf-label text-[#ba1a1a]">{security.riskScore}/100</span>
                                </div>
                                <p className="text-sm text-[#93000a] mt-2">{security.criticalEvents} critical events in the last 24 hours.</p>
                            </div>
                        )}
                    </section>

                    <section className="sf-panel overflow-hidden">
                        <div className="p-4 border-b border-[#c6c6cd] bg-[#f7f9fb]">
                            <h2 className="text-base font-semibold">Department Health</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {departmentAnalytics.length === 0 ? (
                                <EmptyState title="No department analytics" description="Analytics appear after campaigns receive submissions." compact />
                            ) : departmentAnalytics.slice(0, 4).map((item) => (
                                <div key={item.department.id} className="flex items-center justify-between border-b border-[#eceef0] pb-3 last:border-0">
                                    <div>
                                        <p className="font-semibold">{item.department.code}</p>
                                        <p className="text-xs text-[#45464d]">{item.submissions} submissions</p>
                                    </div>
                                    <span className="sf-metric">{item.participationRate}%</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function SentimentPanel({ sentiment }) {
    const percentages = sentiment?.percentages || {};
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white h-full">
            <p className="sf-label">Sentiment Summary</p>
            <div className="mt-4 h-3 bg-[#eceef0] flex overflow-hidden rounded">
                <div className="bg-[#3980f4]" style={{ width: `${percentages.positive || 0}%` }} />
                <div className="bg-[#9ca3af]" style={{ width: `${percentages.neutral || 0}%` }} />
                <div className="bg-[#ba1a1a]" style={{ width: `${percentages.negative || 0}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                <MiniMetric label="Positive" value={`${percentages.positive || 0}%`} />
                <MiniMetric label="Neutral" value={`${percentages.neutral || 0}%`} />
                <MiniMetric label="Negative" value={`${percentages.negative || 0}%`} />
            </div>
        </div>
    );
}

function TopicList({ title, items = [] }) {
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white h-full">
            <p className="sf-label">{title}</p>
            {items.length === 0 ? (
                <p className="text-sm text-[#45464d] mt-4">No recurring topics detected yet.</p>
            ) : (
                <ol className="mt-4 space-y-3">
                    {items.slice(0, 5).map((item, index) => (
                        <li key={item.theme} className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium text-black">{index + 1}. {item.theme}</span>
                            <span className="sf-label">{item.count}</span>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

function InsightList({ title, items = [], empty }) {
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white">
            <p className="sf-label">{title}</p>
            {items.length === 0 ? (
                <p className="text-sm text-[#45464d] mt-3">{empty}</p>
            ) : (
                <div className="flex flex-wrap gap-2 mt-4">
                    {items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
            )}
        </div>
    );
}

function ActionCenter({ observations = [] }) {
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white h-full">
            <p className="sf-label">Admin Action Center</p>
            {observations.length === 0 ? (
                <p className="text-sm text-[#45464d] mt-4">No operational observations surfaced.</p>
            ) : (
                <div className="mt-4 space-y-3">
                    {observations.map((item, index) => (
                        <div key={`${item.type}-${index}`} className="border-l-4 border-[#3980f4] bg-[#f7f9fb] p-3">
                            <p className="text-sm text-black">{item.message}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function MiniMetric({ label, value }) {
    return (
        <div className="sf-stat p-2">
            <p className="sf-label">{label}</p>
            <p className="sf-metric mt-1">{value}</p>
        </div>
    );
}

function Metric({ label, value, tone = "default" }) {
    return (
        <div className="sf-stat">
            <div className="flex justify-between items-start">
                <span className="sf-label">{label}</span>
                <span className={tone === "danger" ? "text-[#ba1a1a]" : "text-black"}>{tone === "danger" ? "!" : ""}</span>
            </div>
            <p className={`sf-metric text-3xl mt-3 ${tone === "danger" ? "text-[#ba1a1a]" : "text-black"}`}>{value}</p>
        </div>
    );
}

function EmptyState({ title, description, action, compact = false }) {
    return (
        <div className={`text-center ${compact ? "py-4" : "p-10"}`}>
            <p className="font-semibold text-black">{title}</p>
            <p className="text-sm text-[#45464d] mt-1">{description}</p>
            {action && <Button className="mt-4" size="sm" onClick={action}>Launch Campaign</Button>}
        </div>
    );
}
