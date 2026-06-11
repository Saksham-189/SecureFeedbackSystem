import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Input, Select, Skeleton, Textarea } from "../../components/ui";

const CAMPAIGN_TYPES = [
    { value: "FACULTY_EVAL", label: "Faculty Evaluation" },
    { value: "COURSE_EVAL", label: "Course Evaluation" },
    { value: "LAB_EVAL", label: "Lab Evaluation" },
    { value: "INFRA_EVAL", label: "Infrastructure" },
    { value: "HOSTEL_EVAL", label: "Hostel" },
    { value: "MESS_EVAL", label: "Mess" },
    { value: "PLACEMENT_EVAL", label: "Placement Cell" },
    { value: "EVENT_EVAL", label: "Event" },
    { value: "GRIEVANCE", label: "Anonymous Grievance" },
];

const STATUS_VARIANT = {
    DRAFT: "warning",
    PUBLISHED: "success",
    ACTIVE: "success",
    CLOSED: "default",
    ARCHIVED: "default",
};

const initialForm = {
    title: "",
    description: "",
    type: "FACULTY_EVAL",
    status: "DRAFT",
    startDate: "",
    endDate: "",
    targetDepartmentId: "",
    targetSemesterNumber: "",
    targetSectionId: "",
    targetCourseAssignmentId: "",
    formId: "",
};

const toOptions = (items, getLabel) => items.map((item) => ({
    value: item.id,
    label: getLabel(item),
}));

const semesterNumberOptions = Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    return {
        value: String(number),
        label: `Semester ${number}`,
    };
});

export default function Campaigns() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [campaigns, setCampaigns] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [sections, setSections] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [forms, setForms] = useState([]);
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    const semesters = useMemo(
        () => academicYears.flatMap((year) => year.semesters || []),
        [academicYears]
    );

    const loadData = useCallback(async () => {
        const [campaignRes, departmentRes, yearRes, sectionRes, assignmentRes, formRes] = await Promise.all([
            request({ url: "/campaigns", method: "GET" }),
            request({ url: "/academic/departments", method: "GET" }),
            request({ url: "/academic/academic-years", method: "GET" }),
            request({ url: "/academic/sections", method: "GET" }),
            request({ url: "/academic/course-assignments", method: "GET" }),
            request({ url: "/feedback/admin/forms", method: "GET" }),
        ]);

        setCampaigns(campaignRes.data || []);
        setDepartments(departmentRes.data || []);
        setAcademicYears(yearRes.data || []);
        setSections(sectionRes.data || []);
        setAssignments(assignmentRes.data || []);
        setForms(formRes.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData().catch(() => toast.error("Failed to load campaign data"));
    }, [loadData, toast]);

    const updateField = (field, value) => {
        setForm((prev) => ({
            ...prev,
            [field]: value,
            ...(field === "targetCourseAssignmentId" && value
                ? { targetDepartmentId: "", targetSemesterNumber: "", targetSectionId: "" }
                : {}),
        }));
    };

    const handleCreate = async (event) => {
        event.preventDefault();
        if (!form.title.trim()) {
            toast.error("Campaign title is required");
            return;
        }
        if (!form.formId) {
            toast.error("Select a feedback form before creating a campaign");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
                endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
                targetSemesterNumber: form.targetSemesterNumber ? Number(form.targetSemesterNumber) : undefined,
                targetSemesterId: semesters.find((semester) => String(semester.number) === String(form.targetSemesterNumber))?.id,
            };

            Object.keys(payload).forEach((key) => {
                if (payload[key] === "") delete payload[key];
            });

            await request({ url: "/campaigns", method: "POST", data: payload });
            toast.success("Campaign created");
            setForm(initialForm);
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create campaign");
        } finally {
            setSaving(false);
        }
    };

    const changeStatus = async (campaignId, status) => {
        try {
            const response = await request({
                url: `/campaigns/${campaignId}/status`,
                method: "PATCH",
                data: { status },
            });

            setCampaigns((prev) => prev.map((campaign) => (
                campaign.id === campaignId ? response.data : campaign
            )));
            toast.success(`Campaign moved to ${status}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update campaign");
        }
    };

    const openResults = (formId) => {
        navigate(user?.role === "SUPER_ADMIN" ? `/superadmin/analytics/${formId}` : `/admin/analytics/${formId}`);
    };

    const departmentOptions = toOptions(departments, (department) => `${department.code} - ${department.name}`);
    const semesterOptions = semesterNumberOptions;
    const sectionOptions = toOptions(sections, (section) => {
        const semester = section.semester?.name || `Semester ${section.semester?.number || ""}`;
        return `${section.department?.code || "Dept"}-${section.name} (${semester})`;
    });
    const assignmentOptions = toOptions(assignments, (assignment) => {
        const course = assignment.course?.code || "Course";
        const faculty = assignment.faculty?.name || "Faculty";
        const section = assignment.section?.name || "Section";
        return `${course} - ${faculty} - ${section}`;
    });
    const formOptions = toOptions(
        forms.filter((item) => !item.campaignId || item.id === form.formId),
        (item) => `${item.title} (${item.questions?.length || 0} questions, ${item.status})`
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div>
                <p className="sf-label">Campaign Center</p>
                <h1 className="sf-page-title mt-2">Campaign Management</h1>
                <p className="text-[#45464d] mt-1">Create targeted feedback campaigns from academic structure and enrollment data.</p>
            </div>

            <form onSubmit={handleCreate} className="sf-panel p-6 lg:p-8 space-y-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Input
                        label="Campaign Title"
                        value={form.title}
                        onChange={(event) => updateField("title", event.target.value)}
                        placeholder="Faculty Evaluation - CSE Sem 5"
                    />
                    <Select
                        label="Campaign Type"
                        value={form.type}
                        onChange={(event) => updateField("type", event.target.value)}
                        options={CAMPAIGN_TYPES}
                        placeholder=""
                    />
                    <Select
                        label="Initial Status"
                        value={form.status}
                        onChange={(event) => updateField("status", event.target.value)}
                        options={[
                            { value: "DRAFT", label: "Draft" },
                            { value: "PUBLISHED", label: "Publish immediately" },
                        ]}
                        placeholder=""
                    />
                </div>

                <Textarea
                    label="Description"
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    placeholder="Who should respond and why this campaign is running..."
                    rows={3}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Feedback Form"
                        value={form.formId}
                        onChange={(event) => updateField("formId", event.target.value)}
                        options={formOptions}
                        placeholder="Select a saved form"
                    />
                    <Input
                        label="Start Date"
                        type="datetime-local"
                        value={form.startDate}
                        onChange={(event) => updateField("startDate", event.target.value)}
                    />
                    <Input
                        label="End Date"
                        type="datetime-local"
                        value={form.endDate}
                        onChange={(event) => updateField("endDate", event.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <Select
                        label="Department Target"
                        value={form.targetDepartmentId}
                        onChange={(event) => updateField("targetDepartmentId", event.target.value)}
                        options={departmentOptions}
                        placeholder="Entire college"
                        disabled={!!form.targetCourseAssignmentId}
                    />
                    <Select
                        label="Semester Target"
                        value={form.targetSemesterNumber}
                        onChange={(event) => updateField("targetSemesterNumber", event.target.value)}
                        options={semesterOptions}
                        placeholder="Any semester"
                        disabled={!!form.targetCourseAssignmentId}
                    />
                    <Select
                        label="Section Target"
                        value={form.targetSectionId}
                        onChange={(event) => updateField("targetSectionId", event.target.value)}
                        options={sectionOptions}
                        placeholder="Any section"
                        disabled={!!form.targetCourseAssignmentId}
                    />
                    <Select
                        label="Course Assignment"
                        value={form.targetCourseAssignmentId}
                        onChange={(event) => updateField("targetCourseAssignmentId", event.target.value)}
                        options={assignmentOptions}
                        placeholder="Optional course/faculty target"
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit" variant="primary" loading={saving}>Create Campaign</Button>
                </div>
            </form>

            <section className="sf-panel p-6 lg:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="sf-section-title">Campaign Registry</h2>
                        <p className="text-sm text-[#45464d] mt-1">Lifecycle, targeting, linked forms, and response counts.</p>
                    </div>
                    <Badge variant="info">{campaigns.length} campaigns</Badge>
                </div>

                {loading && campaigns.length === 0 ? (
                    <div className="space-y-4">
                        <Skeleton preset="card" />
                        <Skeleton preset="card" />
                    </div>
                ) : campaigns.length === 0 ? (
                    <div className="text-center py-12 text-[#45464d]">No campaigns created yet.</div>
                ) : (
                    <div className="space-y-4">
                        {campaigns.map((campaign) => (
                            <div key={campaign.id} className="bg-white border border-[#c6c6cd] p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-bold text-black">{campaign.title}</h3>
                                        <Badge variant={STATUS_VARIANT[campaign.status] || "default"}>{campaign.status}</Badge>
                                        <Badge variant="secondary">{campaign.type?.replace("_", " ")}</Badge>
                                    </div>
                                    <p className="text-sm text-[#45464d] max-w-3xl">{campaign.description || "No description provided."}</p>
                                    <p className="text-xs text-[#6b7280]">
                                        Target: {campaign.targetCourseAssignment?.course?.code || campaign.targetDepartment?.code || "College-wide"}
                                        {campaign.targetSemester ? ` | ${campaign.targetSemester.name || `Semester ${campaign.targetSemester.number}`}` : ""}
                                        {campaign.targetSection ? ` | Section ${campaign.targetSection.name}` : ""}
                                        {campaign.targetCourseAssignment?.faculty ? ` | ${campaign.targetCourseAssignment.faculty.name}` : ""}
                                    </p>
                                    <p className="text-xs text-[#6b7280]">
                                        {campaign.forms?.length || 0} forms | {(campaign.forms || []).reduce((sum, item) => sum + (item._count?.submissions || 0), 0)} responses
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(campaign.forms || []).map((formItem) => (
                                        <Button key={formItem.id} size="sm" variant="secondary" onClick={() => openResults(formItem.id)}>
                                            View Results
                                        </Button>
                                    ))}
                                    {campaign.status === "DRAFT" && (
                                        <Button size="sm" onClick={() => changeStatus(campaign.id, "PUBLISHED")}>Publish</Button>
                                    )}
                                    {["PUBLISHED", "ACTIVE"].includes(campaign.status) && (
                                        <Button size="sm" variant="secondary" onClick={() => changeStatus(campaign.id, "CLOSED")}>Close</Button>
                                    )}
                                    {campaign.status !== "ARCHIVED" && (
                                        <Button size="sm" variant="outline" onClick={() => changeStatus(campaign.id, "ARCHIVED")}>Archive</Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
