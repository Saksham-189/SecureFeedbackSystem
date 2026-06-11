import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "Open";

const getTimeLabel = (form) => {
    const dueDate = form.expiresAt || form.campaign?.endDate;
    if (!dueDate) return "No deadline";
    const ms = new Date(dueDate).getTime() - Date.now();
    if (ms <= 0) return "Closing";
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    return days === 1 ? "Ends in 1 day" : `Ends in ${days} days`;
};

export default function StudentDashboard() {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { request, loading } = useApi();
    const [campaigns, setCampaigns] = useState([]);
    const [submissions, setSubmissions] = useState([]);

    const loadData = useCallback(async () => {
        const [campaignRes, submissionRes] = await Promise.all([
            request({ url: "/campaigns/student", method: "GET" }),
            request({ url: "/feedback/submissions/me", method: "GET" }),
        ]);
        setCampaigns(campaignRes.data || []);
        setSubmissions(submissionRes.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData().catch(() => toast.error("Failed to load student workspace"));
    }, [loadData, toast]);

    const pendingForms = useMemo(() => (
        campaigns.flatMap((campaign) => (
            (campaign.forms || []).map((form) => ({
                ...form,
                campaign,
                submitted: (form.submissions || []).length > 0,
            }))
        )).filter((form) => !form.submitted)
    ), [campaigns]);

    const verifiedRate = submissions.length === 0
        ? null
        : Math.round((submissions.filter((item) => item.anonymousToken).length / submissions.length) * 100);

    return (
        <div className="max-w-[800px] mx-auto flex flex-col gap-10 pb-20">
            <section className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <span className="sf-label">Student Workspace</span>
                        <h1 className="sf-page-title mt-1">Hello, {user?.name?.split(" ")[0] || "Student"}</h1>
                    </div>
                    <div className="text-left md:text-right">
                        <span className="sf-label">Available Forms</span>
                        <div className="flex md:justify-end items-center gap-3 mt-2">
                            <div className="w-32 h-2 bg-[#eceef0] rounded-full overflow-hidden">
                                <div className="bg-black h-full" style={{ width: `${campaigns.length ? Math.min(100, campaigns.length * 25) : 0}%` }} />
                            </div>
                            <span className="sf-metric text-xl">{campaigns.length}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Metric label="Pending Actions" value={pendingForms.length} />
                    <Metric label="Verified Submissions" value={submissions.length} />
                    <Metric label="Anonymity Verified" value={verifiedRate === null ? "-" : `${verifiedRate}%`} />
                </div>
            </section>

            <section className="flex flex-col gap-4">
                <div>
                    <h2 className="text-base font-semibold">Action Required</h2>
                </div>

                {loading && campaigns.length === 0 ? (
                    <div className="space-y-4">
                        <Skeleton preset="card" />
                        <Skeleton preset="card" />
                    </div>
                ) : pendingForms.length === 0 ? (
                    <div className="sf-panel-soft p-8 text-center">
                        <p className="font-semibold text-black">All caught up</p>
                        <p className="text-sm text-[#45464d] mt-1">No eligible feedback forms are waiting for your response.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingForms.map((form, index) => (
                            <div key={form.id} className="sf-card hover:shadow-sm transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant={index === 0 ? "danger" : "secondary"}>{index === 0 ? "Priority" : "Standard"}</Badge>
                                            <span className="sf-label">{form.campaign.targetDepartment?.code || "Feedback Form"}</span>
                                        </div>
                                        <h3 className="sf-section-title">{form.title}</h3>
                                        <p className="text-sm text-[#45464d] max-w-xl">{form.description || "Confidential faculty feedback form."}</p>
                                    </div>
                                    <div className="flex flex-col md:items-end gap-2 shrink-0">
                                        <span className={`sf-label ${index === 0 ? "text-[#ba1a1a]" : ""}`}>{getTimeLabel(form)}</span>
                                        <Button onClick={() => navigate(`/student/forms/${form.id}/submit`)}>
                                            Start Survey
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-6 w-full h-1 bg-[#eceef0] rounded-full overflow-hidden">
                                    <div className={index === 0 ? "bg-[#ba1a1a] h-full" : "bg-black h-full"} style={{ width: `${form.campaign.endDate ? 75 : 35}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                <section className="lg:col-span-8 flex flex-col gap-4">
                    <div>
                        <h2 className="text-base font-semibold">Completed Forms</h2>
                    </div>
                    <div className="sf-panel overflow-hidden">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                                    <th className="px-4 py-3 sf-label">Feedback Form</th>
                                    <th className="px-4 py-3 sf-label text-center">Status</th>
                                    <th className="px-4 py-3 sf-label text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#c6c6cd]">
                                {submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-8 text-center text-[#45464d]">No submissions yet.</td>
                                    </tr>
                                ) : submissions.slice(0, 5).map((submission) => (
                                    <tr key={submission.id} className="hover:bg-[#f7f9fb]">
                                        <td className="px-4 py-4">
                                            <div className="font-semibold text-black">{submission.form?.campaign?.title || submission.form?.title}</div>
                                            <div className="text-sm text-[#45464d]">{submission.form?.campaign?.targetDepartment?.name || "Institution-wide"}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="inline-flex px-3 py-1 rounded-full bg-[#d5e3fd] text-[#3980f4] text-[11px] font-bold uppercase">Anonymity Verified</span>
                                        </td>
                                        <td className="px-4 py-4 text-right sf-label">{formatDate(submission.completedAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <aside className="lg:col-span-4 flex flex-col gap-4">
                    <div>
                        <h2 className="text-base font-semibold">Announcements</h2>
                    </div>
                    {campaigns.length === 0 ? (
                        <div className="sf-panel p-4">
                            <span className="sf-label">No Updates</span>
                            <p className="text-sm text-[#45464d] mt-2">Feedback form updates will appear here when your institution publishes them.</p>
                        </div>
                    ) : campaigns.slice(0, 2).map((campaign) => (
                        <div key={campaign.id} className="sf-panel p-4 space-y-2">
                            <span className="sf-label text-[#3980f4]">{campaign.type?.replace("_", " ")}</span>
                            <h4 className="font-semibold leading-tight">{campaign.forms?.[0]?.title || campaign.title}</h4>
                            <p className="text-sm text-[#45464d]">{campaign.description || `Open until ${formatDate(campaign.endDate)}`}</p>
                        </div>
                    ))}
                    <div className="sf-dark-panel p-6 space-y-3">
                        <div>
                            <span className="font-semibold">Trust Seal</span>
                        </div>
                        <p className="text-sm text-[#bec6e0] leading-relaxed">Every submission is encrypted, separated from your identity, and stored with a detached anonymous receipt token.</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function Metric({ label, value }) {
    return (
        <div className="sf-stat flex flex-col gap-1">
            <span className="sf-label">{label}</span>
            <span className="sf-metric text-xl text-black">{value}</span>
        </div>
    );
}
