import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { getRegistrationMetadata } from "../../services/auth.service";
import { Badge, Button, Input, Select, Skeleton } from "../../components/ui";
import { ROLE_LABELS, ROLES } from "../../utils/roles";

export default function RoleProfile() {
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [profile, setProfile] = useState(null);
    const [loadError, setLoadError] = useState("");
    const [form, setForm] = useState({ name: "", employeeId: "", studentIdNumber: "", departmentId: "", semesterNumber: "", sectionId: "" });
    const [metadata, setMetadata] = useState({ departments: [], sections: [] });
    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
    const [saving, setSaving] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoadError("");
        const response = await request({ url: "/profile", method: "GET" });
        const data = response.data;
        setProfile(data);
        const enrollment = data.user?.enrollments?.[0];
        setForm({
            name: data.user?.name || "",
            employeeId: data.user?.employeeId || "",
            studentIdNumber: data.user?.studentIdNumber || "",
            departmentId: data.user?.department?.id || enrollment?.section?.department?.id || "",
            semesterNumber: enrollment?.semester?.number ? String(enrollment.semester.number) : "",
            sectionId: enrollment?.section?.id || "",
        });
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadProfile().catch((error) => {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message || "Unknown profile error";
            const detail = status ? `Profile endpoint returned ${status}: ${message}` : message;
            setLoadError(detail);
            toast.error(detail);
        });
    }, [loadProfile, toast]);

    useEffect(() => {
        getRegistrationMetadata()
            .then((response) => setMetadata(response?.data || { departments: [], sections: [] }))
            .catch(() => {});
    }, []);

    const role = profile?.role;
    const title = ROLE_LABELS[role] || role || "Profile";
    const currentEnrollment = profile?.user?.enrollments?.[0];
    const departmentOptions = (metadata.departments || [])
        .filter((department) => !profile?.user?.college?.id || department.collegeId === profile.user.college.id)
        .map((department) => ({ value: department.id, label: `${department.code} - ${department.name}` }));
    const semesterOptions = Array.from({ length: 8 }, (_, index) => {
        const number = index + 1;
        return { value: String(number), label: `Semester ${number}` };
    });
    const sectionOptions = (metadata.sections || [])
        .filter((section) => (
            (!profile?.user?.college?.id || section.department?.collegeId === profile.user.college.id) &&
            (!form.departmentId || section.departmentId === form.departmentId) &&
            (!form.semesterNumber || String(section.semester?.number) === String(form.semesterNumber))
        ))
        .map((section) => ({ value: section.id, label: `Section ${section.name}` }));
    const initials = useMemo(() => (
        (profile?.user?.name || profile?.user?.email || "U")
            .split(" ")
            .map((part) => part.charAt(0))
            .join("")
            .slice(0, 2)
            .toUpperCase()
    ), [profile]);

    const saveProfile = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await request({ url: "/profile", method: "PATCH", data: form });
            toast.success("Profile updated");
            await loadProfile();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await request({ url: "/profile/change-password", method: "POST", data: passwords });
            setPasswords({ currentPassword: "", newPassword: "" });
            toast.success("Password changed. Please sign in again.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to change password");
        } finally {
            setSaving(false);
        }
    };

    if (loading && !profile) {
        return <div className="max-w-5xl mx-auto pb-20"><Skeleton preset="card" /></div>;
    }

    if (!profile) {
        return (
            <div className="max-w-3xl mx-auto pt-10">
                <section className="sf-panel p-8 text-center space-y-4">
                    <p className="sf-label">Profile Load Failed</p>
                    <h1 className="sf-page-title">Profile unavailable</h1>
                    <p className="text-[#45464d]">{loadError || "No profile data was returned by the API."}</p>
                    <Button variant="secondary" onClick={loadProfile}>Retry</Button>
                </section>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">{title}</p>
                    <h1 className="sf-page-title mt-2">Profile</h1>
                    <p className="text-[#45464d] mt-1">Account, permissions, security, and academic context from the database.</p>
                </div>
                <Badge variant="success">Access Active</Badge>
            </div>

            <section className="sf-panel p-6 lg:p-8">
                <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                    <div className="w-20 h-20 border border-[#c6c6cd] bg-[#f7f9fb] rounded flex items-center justify-center sf-metric text-3xl">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="sf-label">Account Holder</p>
                        <h2 className="text-2xl font-semibold text-black mt-1 break-words">{profile.user?.name || "Unnamed User"}</h2>
                        <p className="text-[#45464d] break-all">{profile.user?.email}</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <InfoBox label="Full Name" value={profile.user?.name || "Not available"} />
                <InfoBox label="Email" value={profile.user?.email || "Not available"} />
                <InfoBox label="Platform Role" value={title} />
                <InfoBox label="Institution" value={profile.user?.college?.name || "Platform-wide"} />
                <InfoBox label="Department" value={profile.user?.department ? `${profile.user.department.code} - ${profile.user.department.name}` : "Not assigned"} />
                {role === ROLES.STUDENT && <InfoBox label="Semester" value={currentEnrollment?.semester ? `Semester ${currentEnrollment.semester.number}` : "Not assigned"} />}
                {role === ROLES.STUDENT && <InfoBox label="Section" value={currentEnrollment?.section ? `Section ${currentEnrollment.section.name}` : "Not assigned"} />}
                {role === ROLES.FACULTY && <InfoBox label="Employee ID" value={profile.user?.employeeId || "Not assigned"} />}
                {role === ROLES.STUDENT && <InfoBox label="Student ID / USN" value={profile.user?.studentIdNumber || "Not assigned"} />}
                {role === ROLES.STUDENT && <InfoBox label="Submissions" value={profile.submissionStats?.completedSubmissions || 0} />}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <form onSubmit={saveProfile} className="sf-panel p-6 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold">Profile Details</h2>
                        <p className="text-sm text-[#45464d] mt-1">Updates persist to your account record.</p>
                    </div>
                    <Input label="Full Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    {role === ROLES.FACULTY && (
                        <Input label="Employee ID" value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })} />
                    )}
                    {role === ROLES.STUDENT && (
                        <Input label="Student ID / USN" value={form.studentIdNumber} onChange={(event) => setForm({ ...form, studentIdNumber: event.target.value })} />
                    )}
                    {role === ROLES.STUDENT && (
                        <>
                            <Select
                                label="Department"
                                value={form.departmentId}
                                onChange={(event) => setForm({ ...form, departmentId: event.target.value, sectionId: "" })}
                                options={departmentOptions}
                                placeholder="Select Department"
                            />
                            <Select
                                label="Semester"
                                value={form.semesterNumber}
                                onChange={(event) => setForm({ ...form, semesterNumber: event.target.value, sectionId: "" })}
                                options={semesterOptions}
                                placeholder="Select Semester"
                            />
                            <Select
                                label="Section"
                                value={form.sectionId}
                                onChange={(event) => setForm({ ...form, sectionId: event.target.value })}
                                options={sectionOptions}
                                placeholder="Select Section"
                            />
                        </>
                    )}
                    <Button type="submit" loading={saving}>Save Profile</Button>
                </form>

                <form onSubmit={changePassword} className="sf-panel p-6 space-y-4">
                    <div>
                        <h2 className="text-base font-semibold">Change Password</h2>
                        <p className="text-sm text-[#45464d] mt-1">Changing password revokes active sessions.</p>
                    </div>
                    <Input label="Current Password" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} />
                    <Input label="New Password" type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} />
                    <Button type="submit" loading={saving}>Change Password</Button>
                </form>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <Panel title={role === ROLES.ADMIN ? "Assigned Administrative Permissions" : role === ROLES.SUPER_ADMIN ? "Platform Permissions Overview" : "Permissions Overview"}>
                    <List items={profile.permissions} empty="No permissions found." />
                </Panel>
                <Panel title="Active Sessions">
                    <List items={(profile.user?.sessions || []).map((session) => session.userAgent || session.deviceFingerprint || session.ipAddress || session.id)} empty="No active sessions." />
                </Panel>
                <Panel title="Audit Activity Summary">
                    <p className="sf-metric text-3xl">{profile.auditSummary?.totalEvents || 0}</p>
                    <p className="text-sm text-[#45464d] mt-2">Recorded audit events</p>
                    <div className="mt-4 space-y-2">
                        {(profile.auditSummary?.recentEvents || []).slice(0, 4).map((event) => (
                            <div key={event.id} className="text-sm border-b border-[#eceef0] pb-2 last:border-0">
                                <span className="font-medium text-black">{event.action}</span>
                                <span className="text-[#45464d]"> · {new Date(event.timestamp).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                </Panel>
            </section>

            {(role === ROLES.FACULTY || role === ROLES.STUDENT) && (
                <AcademicContext profile={profile} role={role} />
            )}

            <section className="sf-dark-panel p-6">
                <p className="sf-label text-[#7c839b]">{role === ROLES.STUDENT || role === ROLES.FACULTY ? "Privacy Information" : "Security Settings"}</p>
                <h2 className="text-xl font-semibold text-white mt-2">Anonymous Feedback Boundary</h2>
                <p className="text-[#bec6e0] mt-3 leading-relaxed">
                    Feedback analytics are shown only as aggregate outputs after privacy thresholds are met. Individual student identities remain detached from faculty and admin review screens.
                </p>
            </section>
        </div>
    );
}

function AcademicContext({ profile, role }) {
    const assignments = profile.user?.courseAssignments || [];
    const enrollments = profile.user?.enrollments || [];

    return (
        <section className="sf-panel p-6">
            <h2 className="text-base font-semibold">{role === ROLES.FACULTY ? "Assigned Courses and Sections" : "Semester and Section"}</h2>
            <div className="mt-4 space-y-3">
                {role === ROLES.FACULTY && assignments.length === 0 && <p className="text-sm text-[#45464d]">No assigned courses found.</p>}
                {role === ROLES.FACULTY && assignments.map((item) => (
                    <div key={item.id} className="border border-[#c6c6cd] rounded p-4 bg-[#f7f9fb]">
                        <p className="font-semibold text-black">{item.course?.code} - {item.course?.name}</p>
                        <p className="text-sm text-[#45464d]">Semester {item.semester?.number}, Section {item.section?.name}</p>
                    </div>
                ))}
                {role === ROLES.STUDENT && enrollments.length === 0 && <p className="text-sm text-[#45464d]">No enrollment found.</p>}
                {role === ROLES.STUDENT && enrollments.map((item) => (
                    <div key={item.id} className="border border-[#c6c6cd] rounded p-4 bg-[#f7f9fb]">
                        <p className="font-semibold text-black">{item.section?.department?.code} · Section {item.section?.name}</p>
                        <p className="text-sm text-[#45464d]">Semester {item.semester?.number}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

function Panel({ title, children }) {
    return (
        <section className="sf-panel p-5">
            <h2 className="text-base font-semibold">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function List({ items = [], empty }) {
    if (!items.length) return <p className="text-sm text-[#45464d]">{empty}</p>;
    return (
        <div className="space-y-2">
            {items.map((item, index) => (
                <div key={`${item}-${index}`} className="text-sm border-b border-[#eceef0] pb-2 last:border-0">{item}</div>
            ))}
        </div>
    );
}

function InfoBox({ label, value }) {
    return (
        <div className="sf-stat">
            <p className="sf-label">{label}</p>
            <p className="font-semibold text-black mt-3 break-words">{value}</p>
        </div>
    );
}
