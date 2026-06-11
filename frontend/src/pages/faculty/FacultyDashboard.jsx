import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

export default function FacultyDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [intelligence, setIntelligence] = useState(null);

    const loadCampaigns = useCallback(async () => {
        const [campaignRes, intelligenceRes] = await Promise.allSettled([
            request({ url: "/campaigns/faculty", method: "GET" }),
            request({ url: "/analytics/faculty/intelligence", method: "GET" }),
        ]);

        if (campaignRes.status === "fulfilled") setCampaigns(campaignRes.value.data || []);
        if (intelligenceRes.status === "fulfilled") setIntelligence(intelligenceRes.value.data || null);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCampaigns().catch(() => toast.error("Failed to load assigned forms"));
    }, [loadCampaigns, toast]);

    const forms = useMemo(
        () => campaigns.flatMap((campaign) => (campaign.forms || []).map((form) => ({ ...form, campaign }))),
        [campaigns]
    );
    const totalResponses = forms.reduce((sum, form) => sum + (form._count?.submissions || 0), 0);
    const activeForms = forms.filter((form) => form.status === "PUBLISHED").length;
    const closedForms = forms.filter((form) => form.status === "ARCHIVED").length;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <header>
                <span className="sf-label">Faculty Intelligence</span>
                <h1 className="sf-page-title mt-2">Performance Intelligence Hub</h1>
                <p className="text-[#45464d] mt-1">Anonymous feedback insights from forms assigned to {user?.name || "you"}.</p>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-8 space-y-5">
                    <section className="sf-card">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                            <div>
                                <p className="sf-label">Teaching Feedback Coverage</p>
                                <div className="flex items-baseline gap-4 mt-2">
                                    <span className="sf-metric text-5xl text-black">{totalResponses}</span>
                                    <Badge variant={totalResponses >= 5 ? "success" : "warning"}>
                                        {totalResponses >= 5 ? "Threshold met" : "Privacy threshold pending"}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-xs border border-[#c6c6cd] bg-black text-white rounded">Live</button>
                                <button className="px-3 py-1 text-xs border border-[#c6c6cd] rounded">Archive</button>
                            </div>
                        </div>

                        <div className="h-48 w-full bg-[#f2f4f6] rounded border border-[#c6c6cd] relative overflow-hidden sf-grid-dots">
                            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
                                <path d="M0,145 Q160,120 250,135 T430,110 T620,75 T800,95" fill="none" stroke="black" strokeLinecap="round" strokeWidth="3" />
                            </svg>
                            {totalResponses === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="sf-label bg-white/80 px-3 py-1 rounded">Awaiting submissions</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                            <Metric label="Active Forms" value={activeForms} />
                            <Metric label="Closed Forms" value={closedForms} />
                            <Metric label="Responses" value={totalResponses} />
                        </div>
                    </section>

                    <section className="sf-card">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
                            <div>
                                <h2 className="text-base font-semibold">Teaching Insight Layer</h2>
                                <p className="text-sm text-[#45464d]">Aggregate themes, sentiment, strengths, and improvement areas from assigned campaigns.</p>
                            </div>
                            <Badge variant={intelligence?.analyticsHidden ? "warning" : "info"}>
                                {intelligence?.analyticsHidden ? "Privacy Locked" : "Real Data"}
                            </Badge>
                        </div>
                        {loading && !intelligence ? (
                            <Skeleton preset="card" />
                        ) : !intelligence || intelligence.analyticsHidden ? (
                            <EmptyState
                                title="Insights hidden"
                                description={`At least ${intelligence?.privacyThreshold || 5} completed submissions are required.`}
                            />
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <SentimentPanel sentiment={intelligence.sentiment} />
                                <TopicList items={intelligence.themes} />
                                <InsightList title="Strengths" items={intelligence.strengths} empty="No strength signals yet." />
                                <InsightList title="Improvement Areas" items={intelligence.improvementAreas} empty="No improvement signals yet." />
                                <div className="lg:col-span-2 border border-[#c6c6cd] rounded p-4 bg-[#f7f9fb]">
                                    <p className="sf-label">Trend Analysis</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                        <p className="text-sm text-[#45464d]">{intelligence.trends?.ratingTrend}</p>
                                        <p className="text-sm text-[#45464d]">{intelligence.trends?.participationTrend}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    <section className="sf-card">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-base font-semibold">Course Sentiment Map</h2>
                                <p className="text-sm text-[#45464d]">Only real assigned campaigns are shown.</p>
                            </div>
                        </div>
                        {loading && forms.length === 0 ? (
                            <Skeleton preset="card" />
                        ) : forms.length === 0 ? (
                            <EmptyState title="No assigned forms" description="Published feedback forms assigned to your courses will appear here." />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {forms.map((form) => (
                                    <div key={form.id} className="border border-[#c6c6cd] rounded p-4 bg-[#f7f9fb]">
                                <p className="sf-label">{form.campaign?.targetCourseAssignment?.course?.code || "Feedback Form"}</p>
                                        <h3 className="font-semibold text-black mt-1">{form.title}</h3>
                                        <div className="flex items-center justify-between mt-4">
                                            <span className="text-sm text-[#45464d]">{form._count?.submissions || 0} responses</span>
                                            <Button size="sm" onClick={() => navigate(`/faculty/analytics/${form.id}`)}>View Results</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="xl:col-span-4 space-y-5">
                    <section className="sf-panel overflow-hidden">
                        <div className="p-4 border-b border-[#c6c6cd] bg-[#f2f4f6]">
                            <h2 className="font-semibold">Live Feedback Feed</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            {totalResponses < 5 ? (
                                <EmptyState title="Comments hidden" description="Text comments unlock only after the privacy threshold is met." />
                            ) : (
                                <p className="text-sm text-[#45464d]">Open form analytics to view anonymized, shuffled comments.</p>
                            )}
                        </div>
                    </section>

                    <section className="sf-dark-panel p-6">
                        <p className="sf-label text-[#7c839b]">Department Comparison</p>
                        <p className="text-3xl font-bold mt-2">{totalResponses >= 5 ? "Available" : "Hidden"}</p>
                        <p className="text-sm text-[#bec6e0] mt-3">Comparisons require enough responses to preserve anonymity.</p>
                    </section>
                </aside>
            </div>
        </div>
    );
}

function SentimentPanel({ sentiment }) {
    const percentages = sentiment?.percentages || {};
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white">
            <p className="sf-label">Sentiment Summary</p>
            <div className="mt-4 h-3 bg-[#eceef0] flex overflow-hidden rounded">
                <div className="bg-[#3980f4]" style={{ width: `${percentages.positive || 0}%` }} />
                <div className="bg-[#9ca3af]" style={{ width: `${percentages.neutral || 0}%` }} />
                <div className="bg-[#ba1a1a]" style={{ width: `${percentages.negative || 0}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
                <MiniMetric label="Positive" value={`${percentages.positive || 0}%`} />
                <MiniMetric label="Neutral" value={`${percentages.neutral || 0}%`} />
                <MiniMetric label="Negative" value={`${percentages.negative || 0}%`} />
            </div>
        </div>
    );
}

function TopicList({ items = [] }) {
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-white">
            <p className="sf-label">Top Discussion Topics</p>
            {items.length === 0 ? (
                <p className="text-sm text-[#45464d] mt-4">No recurring topics detected yet.</p>
            ) : (
                <ol className="mt-4 space-y-3">
                    {items.slice(0, 5).map((item, index) => (
                        <li key={item.theme} className="flex justify-between gap-3">
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

function MiniMetric({ label, value }) {
    return (
        <div className="sf-stat p-2">
            <p className="sf-label">{label}</p>
            <p className="sf-metric mt-1">{value}</p>
        </div>
    );
}

function Metric({ label, value }) {
    return (
        <div className="sf-stat">
            <p className="sf-label">{label}</p>
            <p className="sf-metric text-2xl mt-2">{value}</p>
        </div>
    );
}

function EmptyState({ title, description }) {
    return (
        <div className="text-center py-8">
            <p className="font-semibold text-black">{title}</p>
            <p className="text-sm text-[#45464d] mt-1">{description}</p>
        </div>
    );
}
