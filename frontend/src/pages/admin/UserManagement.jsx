import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Input, Select, Skeleton } from "../../components/ui";
import { getRegistrationMetadata } from "../../services/auth.service";

const getInitialUser = (isSuperAdmin) => ({
    email: "",
    name: "",
    password: "",
    roleName: isSuperAdmin ? "ADMIN" : "FACULTY",
    collegeId: "",
    departmentId: "",
    semesterNumber: "",
    sectionId: "",
    employeeId: "",
    studentIdNumber: "",
    designation: "",
});

export default function UserManagement() {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const { request, loading } = useApi();
    const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
    const [users, setUsers] = useState([]);
    const [showProvision, setShowProvision] = useState(false);
    const [newUser, setNewUser] = useState(() => getInitialUser(isSuperAdmin));
    const [metadata, setMetadata] = useState({ colleges: [], departments: [] });
    const [sections, setSections] = useState([]);
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        const response = await request({ url: "/admin/users", method: "GET" });
        setUsers(response?.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers().catch(() => toast.error("Failed to load users"));
    }, [fetchUsers, toast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setNewUser(getInitialUser(isSuperAdmin));
    }, [isSuperAdmin]);

    useEffect(() => {
        getRegistrationMetadata()
            .then((response) => setMetadata(response?.data || { colleges: [], departments: [] }))
            .catch(() => toast.error("Failed to load provisioning metadata"));
    }, [toast]);

    useEffect(() => {
        if (isSuperAdmin) return;
        request({ url: "/academic/sections", method: "GET" })
            .then((response) => setSections(response?.data || []))
            .catch(() => toast.error("Failed to load section metadata"));
    }, [isSuperAdmin, request, toast]);

    const handleToggleLock = async (userId, currentStatus) => {
        const action = currentStatus ? "unlock" : "lock";
        if (!confirm(`Confirm ${action} for this account?`)) return;

        try {
            await request({
                url: `/admin/users/${userId}/status`,
                method: "PATCH",
                data: { isLocked: !currentStatus },
            });
            setUsers((prev) => prev.map((user) => (
                user.id === userId ? { ...user, isLocked: !currentStatus } : user
            )));
            toast.success(`User ${currentStatus ? "unlocked" : "locked"}`);
        } catch (error) {
            toast.error(error.response?.data?.message || "Action failed");
        }
    };

    const handleProvision = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await request({ url: "/admin/users", method: "POST", data: newUser });
            setNewUser(getInitialUser(isSuperAdmin));
            setShowProvision(false);
            toast.success("User provisioned");
            await fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to provision user");
        } finally {
            setSaving(false);
        }
    };

    const roleOptions = isSuperAdmin
        ? [{ value: "ADMIN", label: "College Admin" }]
        : [
            { value: "FACULTY", label: "Faculty" },
            { value: "STUDENT", label: "Student" },
        ];

    const departmentOptions = (metadata.departments || [])
        .filter((department) => {
            const selectedCollegeId = isSuperAdmin ? newUser.collegeId : currentUser?.collegeId;
            return !selectedCollegeId || department.collegeId === selectedCollegeId;
        })
        .map((department) => ({
            value: department.id,
            label: `${department.code} - ${department.name}`,
        }));

    const collegeOptions = (metadata.colleges || []).map((college) => ({
        value: college.id,
        label: college.name,
    }));
    const semesterOptions = Array.from({ length: 8 }, (_, index) => {
        const number = index + 1;
        return { value: String(number), label: `Semester ${number}` };
    });
    const sectionOptions = sections
        .filter((section) => (
            (!newUser.departmentId || section.department?.id === newUser.departmentId) &&
            (!newUser.semesterNumber || String(section.semester?.number) === String(newUser.semesterNumber))
        ))
        .map((section) => ({
            value: section.id,
            label: `Section ${section.name}`,
        }));

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">Access Control</p>
                    <h1 className="sf-page-title mt-2">User Management</h1>
                    <p className="text-[#45464d] mt-1">Provision accounts and manage lock status within the institution scope.</p>
                </div>
                <Button onClick={() => setShowProvision((value) => !value)}>
                    {showProvision ? "Close Panel" : "Provision User"}
                </Button>
            </div>

            {showProvision && (
                <form onSubmit={handleProvision} className="sf-panel p-6 space-y-5 max-w-3xl">
                    <div>
                        <h2 className="sf-section-title">Provision Account</h2>
                        <p className="text-sm text-[#45464d] mt-1">Temporary credentials are hashed server-side before storage.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Full Name" value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} required />
                        <Input label="Email Address" type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} required />
                        <Input label="Temporary Password" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} required />
                        <Select
                            label="Role"
                            value={newUser.roleName}
                            onChange={(event) => setNewUser({ ...newUser, roleName: event.target.value, departmentId: "" })}
                            options={roleOptions}
                            placeholder=""
                        />
                        {isSuperAdmin && (
                            <Select
                                label="Assigned College"
                                value={newUser.collegeId}
                                onChange={(event) => setNewUser({ ...newUser, collegeId: event.target.value })}
                                options={collegeOptions}
                                placeholder="Select College"
                                required
                            />
                        )}
                        {!isSuperAdmin && newUser.roleName === "FACULTY" && (
                            <>
                                <Input label="Employee ID" value={newUser.employeeId} onChange={(event) => setNewUser({ ...newUser, employeeId: event.target.value })} />
                                <Input label="Designation" value={newUser.designation} onChange={(event) => setNewUser({ ...newUser, designation: event.target.value })} />
                                <Select
                                    label="Department"
                                    value={newUser.departmentId}
                                    onChange={(event) => setNewUser({ ...newUser, departmentId: event.target.value })}
                                    options={departmentOptions}
                                    placeholder="Select Department"
                                    required
                                />
                            </>
                        )}
                        {!isSuperAdmin && newUser.roleName === "STUDENT" && (
                            <>
                                <Input label="Student ID" value={newUser.studentIdNumber} onChange={(event) => setNewUser({ ...newUser, studentIdNumber: event.target.value })} />
                                <Select
                                    label="Department"
                                    value={newUser.departmentId}
                                    onChange={(event) => setNewUser({ ...newUser, departmentId: event.target.value, sectionId: "" })}
                                    options={departmentOptions}
                                    placeholder="Select Department"
                                    required
                                />
                                <Select
                                    label="Semester"
                                    value={newUser.semesterNumber}
                                    onChange={(event) => setNewUser({ ...newUser, semesterNumber: event.target.value, sectionId: "" })}
                                    options={semesterOptions}
                                    placeholder="Select Semester"
                                    required
                                />
                                <Select
                                    label="Section"
                                    value={newUser.sectionId}
                                    onChange={(event) => setNewUser({ ...newUser, sectionId: event.target.value })}
                                    options={sectionOptions}
                                    placeholder="Select Section"
                                    required
                                />
                            </>
                        )}
                    </div>
                    <div className="flex justify-end">
                        <Button type="submit" loading={saving}>Create Account</Button>
                    </div>
                </form>
            )}

            <section className="sf-panel overflow-hidden">
                <div className="p-5 border-b border-[#c6c6cd] bg-[#f7f9fb] flex items-center justify-between">
                    <h2 className="sf-section-title">Directory</h2>
                    <Badge variant="info">{users.length} users</Badge>
                </div>
                {loading && users.length === 0 ? (
                    <div className="p-6"><Skeleton preset="card" /></div>
                ) : users.length === 0 ? (
                    <div className="text-center p-10">
                        <p className="font-semibold text-black">No users found</p>
                        <p className="text-sm text-[#45464d] mt-1">Provision an account to populate this directory.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                                    <th className="p-4 sf-label">User</th>
                                    <th className="p-4 sf-label">Role</th>
                                    <th className="p-4 sf-label">Academic</th>
                                    <th className="p-4 sf-label">Status</th>
                                    <th className="p-4 sf-label">Failed Logins</th>
                                    <th className="p-4 sf-label text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#c6c6cd]">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#f7f9fb]">
                                        <td className="p-4">
                                            <p className="font-semibold text-black">{user.name}</p>
                                            <p className="text-xs text-[#45464d]">{user.email}</p>
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={user.role?.name === "ADMIN" ? "primary" : "secondary"}>
                                                {user.role?.name || "UNKNOWN"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-[#45464d]">
                                            {user.role?.name === "STUDENT" ? (
                                                <span>
                                                    {user.department?.code || "-"}
                                                    {user.enrollments?.[0]?.semester ? ` | Semester ${user.enrollments[0].semester.number}` : ""}
                                                    {user.enrollments?.[0]?.section ? ` | Section ${user.enrollments[0].section.name}` : ""}
                                                </span>
                                            ) : user.department?.code || "-"}
                                        </td>
                                        <td className="p-4">
                                            <Badge variant={user.isLocked ? "danger" : "success"}>
                                                {user.isLocked ? "LOCKED" : "ACTIVE"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 sf-metric">{user.failedLoginAttempts}</td>
                                        <td className="p-4 text-right">
                                            <Button
                                                size="sm"
                                                variant={user.isLocked ? "secondary" : "danger"}
                                                onClick={() => handleToggleLock(user.id, user.isLocked)}
                                            >
                                                {user.isLocked ? "Unlock" : "Lock"}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
