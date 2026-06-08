import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Input, Select, Skeleton, Table } from "../../components/ui";

const tabs = [
    { id: "departments", label: "Departments" },
    { id: "courses", label: "Courses" },
    { id: "sections", label: "Sections" },
    { id: "assignments", label: "Teaching" },
    { id: "enrollments", label: "Enrollments" },
];

const toOptions = (items, getLabel) => items.map((item) => ({
    value: item.id,
    label: getLabel(item),
}));

export default function AcademicStructure() {
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState("departments");
    const [departments, setDepartments] = useState([]);
    const [academicYears, setAcademicYears] = useState([]);
    const [courses, setCourses] = useState([]);
    const [sections, setSections] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [departmentDraft, setDepartmentDraft] = useState({ name: "", code: "" });
    const [courseDraft, setCourseDraft] = useState({ name: "", code: "", credits: 3, departmentId: "" });
    const [sectionDraft, setSectionDraft] = useState({ name: "", departmentId: "", semesterId: "" });

    const semesters = useMemo(
        () => academicYears.flatMap((year) => year.semesters || []),
        [academicYears]
    );

    const loadData = useCallback(async () => {
        const [departmentRes, yearRes, courseRes, sectionRes, assignmentRes, enrollmentRes] = await Promise.all([
            request({ url: "/academic/departments", method: "GET" }),
            request({ url: "/academic/academic-years", method: "GET" }),
            request({ url: "/academic/courses", method: "GET" }),
            request({ url: "/academic/sections", method: "GET" }),
            request({ url: "/academic/course-assignments", method: "GET" }),
            request({ url: "/academic/enrollments", method: "GET" }),
        ]);

        setDepartments(departmentRes.data || []);
        setAcademicYears(yearRes.data || []);
        setCourses(courseRes.data || []);
        setSections(sectionRes.data || []);
        setAssignments(assignmentRes.data || []);
        setEnrollments(enrollmentRes.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadData().catch(() => toast.error("Failed to load academic structure"));
    }, [loadData, toast]);

    const departmentOptions = toOptions(departments, (department) => `${department.code} - ${department.name}`);
    const semesterOptions = toOptions(semesters, (semester) => semester.name || `Semester ${semester.number}`);

    const createDepartment = async (event) => {
        event.preventDefault();
        try {
            await request({ url: "/academic/departments", method: "POST", data: departmentDraft });
            setDepartmentDraft({ name: "", code: "" });
            toast.success("Department saved");
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save department");
        }
    };

    const createCourse = async (event) => {
        event.preventDefault();
        try {
            await request({ url: "/academic/courses", method: "POST", data: courseDraft });
            setCourseDraft({ name: "", code: "", credits: 3, departmentId: "" });
            toast.success("Course saved");
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save course");
        }
    };

    const createSection = async (event) => {
        event.preventDefault();
        try {
            await request({ url: "/academic/sections", method: "POST", data: sectionDraft });
            setSectionDraft({ name: "", departmentId: "", semesterId: "" });
            toast.success("Section saved");
            await loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save section");
        }
    };

    const departmentColumns = [
        { key: "code", label: "Code" },
        { key: "name", label: "Department" },
        { key: "_count", label: "Structure", render: (count) => `${count?.courses || 0} courses | ${count?.sections || 0} sections | ${count?.users || 0} users` },
    ];

    const courseColumns = [
        { key: "code", label: "Code" },
        { key: "name", label: "Course" },
        { key: "department", label: "Department", render: (department) => department?.code || "-" },
        { key: "credits", label: "Credits" },
        { key: "_count", label: "Assignments", render: (count) => count?.assignments || 0 },
    ];

    const sectionColumns = [
        { key: "name", label: "Section" },
        { key: "department", label: "Department", render: (department) => department?.code || "-" },
        { key: "semester", label: "Semester", render: (semester) => semester?.name || `Semester ${semester?.number || "-"}` },
        { key: "_count", label: "Load", render: (count) => `${count?.enrollments || 0} students | ${count?.courseAssignments || 0} courses` },
    ];

    const assignmentColumns = [
        { key: "course", label: "Course", render: (course) => `${course?.code || ""} ${course?.name || ""}` },
        { key: "faculty", label: "Faculty", render: (faculty) => faculty?.name || "-" },
        { key: "section", label: "Section", render: (section) => `${section?.department?.code || ""}-${section?.name || ""}` },
        { key: "semester", label: "Semester", render: (semester) => semester?.name || `Semester ${semester?.number || "-"}` },
    ];

    const enrollmentColumns = [
        { key: "student", label: "Student", render: (student) => student?.name || student?.email || "-" },
        { key: "section", label: "Section", render: (section) => `${section?.department?.code || ""}-${section?.name || ""}` },
        { key: "semester", label: "Semester", render: (semester) => semester?.name || `Semester ${semester?.number || "-"}` },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div>
                <p className="sf-label">Academic Registry</p>
                <h1 className="sf-page-title mt-2">Academic Structure</h1>
                <p className="text-[#45464d] mt-1">The hierarchy that powers campaign targeting, eligibility, and analytics segmentation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                <Metric label="Departments" value={departments.length} />
                <Metric label="Courses" value={courses.length} />
                <Metric label="Sections" value={sections.length} />
                <Metric label="Teaching Assignments" value={assignments.length} />
                <Metric label="Enrollments" value={enrollments.length} />
            </div>

            <section className="sf-panel p-6 lg:p-8 space-y-6">
                <div className="flex flex-wrap border border-[#c6c6cd] bg-white w-fit">
                    {tabs.map((tab) => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 text-sm font-semibold transition-colors ${
                                activeTab === tab.id
                                    ? "bg-black text-white"
                                    : "bg-white text-[#45464d] hover:bg-[#f7f9fb]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === "departments" && (
                    <InlineForm onSubmit={createDepartment}>
                        <Input label="Department Name" value={departmentDraft.name} onChange={(event) => setDepartmentDraft((prev) => ({ ...prev, name: event.target.value }))} />
                        <Input label="Code" value={departmentDraft.code} onChange={(event) => setDepartmentDraft((prev) => ({ ...prev, code: event.target.value }))} />
                        <Button type="submit">Save Department</Button>
                    </InlineForm>
                )}

                {activeTab === "courses" && (
                    <InlineForm onSubmit={createCourse}>
                        <Input label="Course Name" value={courseDraft.name} onChange={(event) => setCourseDraft((prev) => ({ ...prev, name: event.target.value }))} />
                        <Input label="Code" value={courseDraft.code} onChange={(event) => setCourseDraft((prev) => ({ ...prev, code: event.target.value }))} />
                        <Input label="Credits" type="number" min="1" max="8" value={courseDraft.credits} onChange={(event) => setCourseDraft((prev) => ({ ...prev, credits: Number(event.target.value) }))} />
                        <Select label="Department" value={courseDraft.departmentId} onChange={(event) => setCourseDraft((prev) => ({ ...prev, departmentId: event.target.value }))} options={departmentOptions} />
                        <Button type="submit">Save Course</Button>
                    </InlineForm>
                )}

                {activeTab === "sections" && (
                    <InlineForm onSubmit={createSection}>
                        <Input label="Section" value={sectionDraft.name} onChange={(event) => setSectionDraft((prev) => ({ ...prev, name: event.target.value }))} />
                        <Select label="Department" value={sectionDraft.departmentId} onChange={(event) => setSectionDraft((prev) => ({ ...prev, departmentId: event.target.value }))} options={departmentOptions} />
                        <Select label="Semester" value={sectionDraft.semesterId} onChange={(event) => setSectionDraft((prev) => ({ ...prev, semesterId: event.target.value }))} options={semesterOptions} />
                        <Button type="submit">Save Section</Button>
                    </InlineForm>
                )}

                {loading ? (
                    <div className="space-y-3">
                        <Skeleton preset="card" />
                        <Skeleton preset="card" />
                    </div>
                ) : (
                    <>
                        {activeTab === "departments" && <Table columns={departmentColumns} data={departments} />}
                        {activeTab === "courses" && <Table columns={courseColumns} data={courses} />}
                        {activeTab === "sections" && <Table columns={sectionColumns} data={sections} />}
                        {activeTab === "assignments" && <Table columns={assignmentColumns} data={assignments} />}
                        {activeTab === "enrollments" && <Table columns={enrollmentColumns} data={enrollments} />}
                    </>
                )}
            </section>
        </div>
    );
}

function InlineForm({ children, onSubmit }) {
    return (
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 bg-[#f7f9fb] border border-[#c6c6cd] p-4 items-end">
            {children}
        </form>
    );
}

function Metric({ label, value }) {
    return (
        <div className="sf-stat">
            <div className="flex items-center justify-between">
                <p className="sf-label">{label}</p>
                <Badge variant="info">Live</Badge>
            </div>
            <p className="sf-metric text-3xl mt-3">{value}</p>
        </div>
    );
}
