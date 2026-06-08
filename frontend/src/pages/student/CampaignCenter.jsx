import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Skeleton } from "../../components/ui";

const formatDate = (value) =>
    value
        ? new Date(value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
          })
        : "—";

const getDueLabel = (endDate) => {
    if (!endDate) return null;
    const ms = new Date(endDate).getTime() - Date.now();
    if (ms <= 0) return "Overdue";
    const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
    if (days <= 3) return `${days}d left`;
    return null;
};

/**
 * Derive a flat list of rows — one per form per campaign.
 * Each row carries the campaign metadata alongside the form.
 */
const buildRows = (campaigns) =>
    campaigns.flatMap((campaign) =>
        (campaign.forms || []).map((form) => {
            const submitted = (form.submissions || []).length > 0;
            const ca = campaign.targetCourseAssignment;
            return {
                key: form.id,
                campaignTitle: campaign.title,
                formTitle: form.title,
                formId: form.id,
                faculty: ca?.faculty?.name || "—",
                courseCode: ca?.course?.code || "",
                courseName: ca?.course?.name || "",
                course:
                    ca?.course
                        ? `${ca.course.code} ${ca.course.name}`
                        : "—",
                department:
                    campaign.targetDepartment?.name || "—",
                endDate: campaign.endDate,
                submitted,
                dueLabel: getDueLabel(campaign.endDate),
            };
        })
    );

export default function CampaignCenter() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { request, loading } = useApi();
    const [campaigns, setCampaigns] = useState([]);

    const loadCampaigns = useCallback(async () => {
        const res = await request({
            url: "/campaigns/student",
            method: "GET",
        });
        setCampaigns(res.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadCampaigns().catch(() =>
            toast.error("Failed to load campaigns")
        );
    }, [loadCampaigns, toast]);

    const rows = useMemo(() => buildRows(campaigns), [campaigns]);

    /* ── Loading state ────────────────────────────────────── */
    if (loading && campaigns.length === 0) {
        return (
            <div className="max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
                <div className="flex flex-col gap-1">
                    <span className="sf-label">Student</span>
                    <h1 className="sf-page-title">Campaign Center</h1>
                </div>
                <div className="space-y-4">
                    <Skeleton preset="card" />
                    <Skeleton preset="card" />
                    <Skeleton preset="card" />
                </div>
            </div>
        );
    }

    /* ── Empty state ──────────────────────────────────────── */
    if (rows.length === 0) {
        return (
            <div className="max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
                <div className="flex flex-col gap-1">
                    <span className="sf-label">Student</span>
                    <h1 className="sf-page-title">Campaign Center</h1>
                </div>
                <div className="sf-panel-soft p-10 text-center">
                    <p className="font-semibold text-black">
                        No active campaigns found
                    </p>
                    <p className="text-sm text-[#45464d] mt-1 max-w-md mx-auto">
                        When your institution publishes a new feedback
                        campaign, it will appear here.
                    </p>
                </div>
            </div>
        );
    }

    /* ── Data state ───────────────────────────────────────── */
    return (
        <div className="max-w-[1000px] mx-auto flex flex-col gap-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <span className="sf-label">Student</span>
                    <h1 className="sf-page-title">Campaign Center</h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                        <span className="sf-label">Total</span>
                        <span className="sf-metric text-xl">
                            {rows.length}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-[#c6c6cd]" />
                    <div className="flex flex-col items-end gap-1">
                        <span className="sf-label">Pending</span>
                        <span className="sf-metric text-xl">
                            {rows.filter((r) => !r.submitted).length}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="sf-panel overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm min-w-[780px]">
                    <thead>
                        <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                            <th className="px-4 py-3 sf-label">
                                Campaign
                            </th>
                            <th className="px-4 py-3 sf-label">
                                Faculty
                            </th>
                            <th className="px-4 py-3 sf-label">
                                Course
                            </th>
                            <th className="px-4 py-3 sf-label">
                                Department
                            </th>
                            <th className="px-4 py-3 sf-label">
                                Due Date
                            </th>
                            <th className="px-4 py-3 sf-label text-center">
                                Status
                            </th>
                            <th className="px-4 py-3 sf-label text-right">
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#c6c6cd]">
                        {rows.map((row) => (
                            <tr
                                key={row.key}
                                className="hover:bg-[#f7f9fb] transition-colors"
                            >
                                {/* Campaign Name */}
                                <td className="px-4 py-4">
                                    <div className="font-semibold text-black leading-tight">
                                        {row.campaignTitle}
                                    </div>
                                    {row.formTitle !== row.campaignTitle && (
                                        <div className="text-xs text-[#45464d] mt-0.5">
                                            {row.formTitle}
                                        </div>
                                    )}
                                </td>

                                {/* Faculty */}
                                <td className="px-4 py-4 text-[#191c1e]">
                                    {row.faculty}
                                </td>

                                {/* Course */}
                                <td className="px-4 py-4">
                                    {row.courseCode ? (
                                        <div>
                                            <span className="font-semibold text-black">
                                                {row.courseCode}
                                            </span>
                                            <span className="text-[#45464d] ml-1">
                                                {row.courseName}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[#45464d]">
                                            —
                                        </span>
                                    )}
                                </td>

                                {/* Department */}
                                <td className="px-4 py-4 text-[#191c1e]">
                                    {row.department}
                                </td>

                                {/* Due Date */}
                                <td className="px-4 py-4">
                                    <div className="text-[#191c1e]">
                                        {formatDate(row.endDate)}
                                    </div>
                                    {row.dueLabel && (
                                        <span className="text-xs text-[#ba1a1a] font-semibold">
                                            {row.dueLabel}
                                        </span>
                                    )}
                                </td>

                                {/* Status */}
                                <td className="px-4 py-4 text-center">
                                    {row.submitted ? (
                                        <Badge variant="success" dot>
                                            Submitted
                                        </Badge>
                                    ) : (
                                        <Badge variant="warning" dot>
                                            Pending
                                        </Badge>
                                    )}
                                </td>

                                {/* CTA */}
                                <td className="px-4 py-4 text-right">
                                    <Button
                                        size="sm"
                                        variant={
                                            row.submitted
                                                ? "secondary"
                                                : "primary"
                                        }
                                        disabled={row.submitted}
                                        onClick={() =>
                                            navigate(
                                                `/student/forms/${row.formId}/submit`
                                            )
                                        }
                                    >
                                        {row.submitted
                                            ? "Submitted"
                                            : "Submit Feedback"}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
