import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, Skeleton } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";

const emptyDraft = { name: "", domain: "" };

export default function CollegeManagement() {
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [colleges, setColleges] = useState([]);
    const [draft, setDraft] = useState(emptyDraft);
    const [saving, setSaving] = useState(false);

    const loadColleges = useCallback(async () => {
        const response = await request({ url: "/academic/colleges", method: "GET" });
        setColleges(response?.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadColleges().catch(() => toast.error("Failed to load colleges"));
    }, [loadColleges, toast]);

    const createCollege = async (event) => {
        event.preventDefault();
        setSaving(true);
        try {
            await request({ url: "/academic/colleges", method: "POST", data: draft });
            setDraft(emptyDraft);
            toast.success("College created");
            await loadColleges();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to create college");
        } finally {
            setSaving(false);
        }
    };

    const updateCollegeStatus = async (college, isActive) => {
        try {
            await request({
                url: `/academic/colleges/${college.id}`,
                method: "PATCH",
                data: { isActive },
            });
            toast.success(isActive ? "College enabled" : "College disabled");
            await loadColleges();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update college");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div>
                <p className="sf-label">Tenant Governance</p>
                <h1 className="sf-page-title mt-2">Colleges</h1>
                <p className="text-[#45464d] mt-1">Create institutions and control tenant availability.</p>
            </div>

            <form onSubmit={createCollege} className="sf-panel p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input label="College Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required />
                <Input label="Email Domain" value={draft.domain} onChange={(event) => setDraft({ ...draft, domain: event.target.value })} placeholder="example.edu" />
                <Button type="submit" loading={saving}>Create College</Button>
            </form>

            <section className="sf-panel overflow-hidden">
                <div className="p-5 border-b border-[#c6c6cd] bg-[#f7f9fb] flex items-center justify-between">
                    <h2 className="sf-section-title">Tenant Directory</h2>
                    <Badge variant="info">{colleges.length} colleges</Badge>
                </div>
                {loading && colleges.length === 0 ? (
                    <div className="p-6"><Skeleton preset="card" /></div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="bg-[#f2f4f6] border-b border-[#c6c6cd]">
                                    <th className="p-4 sf-label">College</th>
                                    <th className="p-4 sf-label">Domain</th>
                                    <th className="p-4 sf-label">Users</th>
                                    <th className="p-4 sf-label">Departments</th>
                                    <th className="p-4 sf-label">Campaigns</th>
                                    <th className="p-4 sf-label">Status</th>
                                    <th className="p-4 sf-label text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#c6c6cd]">
                                {colleges.map((college) => (
                                    <tr key={college.id} className="hover:bg-[#f7f9fb]">
                                        <td className="p-4 font-semibold text-black">{college.name}</td>
                                        <td className="p-4 text-[#45464d]">{college.domain || "-"}</td>
                                        <td className="p-4 sf-metric">{college._count?.users || 0}</td>
                                        <td className="p-4 sf-metric">{college._count?.departments || 0}</td>
                                        <td className="p-4 sf-metric">{college._count?.campaigns || 0}</td>
                                        <td className="p-4">
                                            <Badge variant={college.isActive ? "success" : "danger"}>
                                                {college.isActive ? "ACTIVE" : "DISABLED"}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button
                                                size="sm"
                                                variant={college.isActive ? "danger" : "secondary"}
                                                onClick={() => updateCollegeStatus(college, !college.isActive)}
                                            >
                                                {college.isActive ? "Disable" : "Enable"}
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
