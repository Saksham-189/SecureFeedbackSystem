import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

const formatTimestamp = (value) =>
    value ? new Date(value).toLocaleString() : "—";

export default function SubmissionHistory() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [submissions, setSubmissions] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    const loadSubmissions = useCallback(async () => {
        try {
            const response = await request({ url: "/feedback/submissions/me", method: "GET" });
            setSubmissions(response.data || []);
        } catch {
            toast.error("Failed to load submission history");
        }
    }, [request, toast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadSubmissions();
    }, [loadSubmissions]);

    const copyToken = async (token) => {
        try {
            await navigator.clipboard.writeText(token);
            toast.success("Receipt token copied to clipboard");
        } catch {
            toast.error("Failed to copy token");
        }
    };

    const toggleExpand = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    /* ---------- Loading state ---------- */
    if (loading && submissions.length === 0) {
        return (
            <div className="max-w-[960px] mx-auto space-y-6 pb-20">
                <div>
                    <span className="sf-label">Verified Records</span>
                    <div className="h-8 w-64 animate-shimmer rounded mt-2" />
                </div>
                <Skeleton.Table rows={5} cols={5} />
            </div>
        );
    }

    /* ---------- Main render ---------- */
    return (
        <div className="max-w-[960px] mx-auto flex flex-col gap-8 pb-20">
            {/* Header */}
            <section>
                <span className="sf-label">Verified Records</span>
                <h1 className="sf-page-title mt-1">Submission History</h1>
                <p className="text-[#45464d] mt-2 text-sm max-w-2xl">
                    Every submission is independently verifiable using its receipt token.
                </p>
            </section>

            {/* Table */}
            <section className="sf-panel overflow-hidden">
                <table className="w-full text-left border-collapse text-sm">
                    <thead>
                        <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                            <th className="px-4 py-3 sf-label">Campaign</th>
                            <th className="px-4 py-3 sf-label">Form</th>
                            <th className="px-4 py-3 sf-label">Receipt ID</th>
                            <th className="px-4 py-3 sf-label">Timestamp</th>
                            <th className="px-4 py-3 sf-label text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c6c6cd]">
                        {submissions.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-4 py-16 text-center">
                                    <p className="font-semibold text-black">No submissions found</p>
                                    <p className="text-sm text-[#45464d] mt-2 max-w-md mx-auto">
                                        No feedback submissions received. Complete a survey from the Campaign Center to see your submission receipts here.
                                    </p>
                                    <Button className="mt-5" onClick={() => navigate("/student")}>
                                        Go to Dashboard
                                    </Button>
                                </td>
                            </tr>
                        ) : (
                            submissions.map((submission) => {
                                const isExpanded = expandedId === submission.id;
                                const token = submission.anonymousToken || "";
                                const campaign = submission.form?.campaign;

                                return (
                                    <SubmissionRow
                                        key={submission.id}
                                        submission={submission}
                                        token={token}
                                        campaign={campaign}
                                        isExpanded={isExpanded}
                                        onToggle={() => toggleExpand(submission.id)}
                                        onCopy={() => copyToken(token)}
                                    />
                                );
                            })
                        )}
                    </tbody>
                </table>
            </section>

            {/* Footer */}
            {submissions.length > 0 && (
                <div className="sf-dark-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <span className="sf-metric text-sm">Total Submissions</span>
                        <span className="sf-metric text-xl ml-3">{submissions.length}</span>
                    </div>
                    <p className="text-sm text-[#bec6e0] max-w-lg">
                        Each receipt token cryptographically proves your submission exists without revealing your identity. Tokens are generated server-side and cannot be forged.
                    </p>
                </div>
            )}
        </div>
    );
}

/* ---------- Row + Expandable Detail ---------- */

function SubmissionRow({ submission, token, campaign, isExpanded, onToggle, onCopy }) {
    return (
        <>
            <tr
                className="hover:bg-[#f7f9fb] cursor-pointer transition-colors"
                onClick={onToggle}
            >
                <td className="px-4 py-4">
                    <span className="font-semibold text-black">
                        {campaign?.title || "—"}
                    </span>
                </td>
                <td className="px-4 py-4 text-[#45464d]">
                    {submission.form?.title || "—"}
                </td>
                <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                        <code className="font-mono text-xs bg-[#f7f9fb] border border-[#c6c6cd] px-2 py-1 rounded">
                            {token.substring(0, 8)}…
                        </code>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onCopy(); }}
                            className="text-[#3980f4] hover:text-[#2a6ad4] text-xs font-semibold"
                            title="Copy full receipt token"
                        >
                            Copy
                        </button>
                    </div>
                </td>
                <td className="px-4 py-4 sf-label">
                    {formatTimestamp(submission.completedAt)}
                </td>
                <td className="px-4 py-4 text-center">
                    {token ? (
                        <Badge variant="success" dot>Anonymity Verified</Badge>
                    ) : (
                        <Badge variant="warning">Pending</Badge>
                    )}
                </td>
            </tr>

            {/* Expanded receipt detail */}
            {isExpanded && (
                <tr>
                    <td colSpan="5" className="px-0 py-0">
                        <div className="bg-[#f7f9fb] border-t border-[#c6c6cd] px-6 py-5 space-y-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="info" size="sm">Full Receipt</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <p className="sf-label">Full Receipt ID</p>
                                    <p className="font-mono text-xs text-black bg-white border border-[#c6c6cd] px-3 py-2 mt-1 break-all rounded">
                                        {token || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="sf-label">Submission Timestamp</p>
                                    <p className="font-mono text-sm mt-1">
                                        {formatTimestamp(submission.completedAt)}
                                    </p>
                                </div>
                                <div>
                                    <p className="sf-label">Verification Token</p>
                                    <p className="font-mono text-xs text-black bg-white border border-[#c6c6cd] px-3 py-2 mt-1 break-all rounded">
                                        {token || "—"}
                                    </p>
                                </div>
                                <div>
                                    <p className="sf-label">Campaign Reference</p>
                                    <p className="text-sm text-black mt-1">
                                        {campaign?.title || "—"}
                                        {campaign?.type && (
                                            <span className="ml-2 text-[#45464d]">
                                                · {campaign.type.replace("_", " ")}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                                >
                                    Copy Receipt Token
                                </Button>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
