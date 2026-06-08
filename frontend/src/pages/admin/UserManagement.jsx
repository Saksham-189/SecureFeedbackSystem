import { useCallback, useEffect, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Input, Select, Skeleton } from "../../components/ui";

const initialUser = { email: "", name: "", password: "", roleName: "STUDENT" };

export default function UserManagement() {
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [users, setUsers] = useState([]);
    const [showProvision, setShowProvision] = useState(false);
    const [newUser, setNewUser] = useState(initialUser);
    const [saving, setSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        const response = await request({ url: "/admin/users", method: "GET" });
        setUsers(response?.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers().catch(() => toast.error("Failed to load users"));
    }, [fetchUsers, toast]);

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
            setNewUser(initialUser);
            setShowProvision(false);
            toast.success("User provisioned");
            await fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to provision user");
        } finally {
            setSaving(false);
        }
    };

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
                            onChange={(event) => setNewUser({ ...newUser, roleName: event.target.value })}
                            options={[
                                { value: "STUDENT", label: "Student" },
                                { value: "FACULTY", label: "Faculty" },
                                { value: "ADMIN", label: "Admin" },
                            ]}
                            placeholder=""
                        />
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
