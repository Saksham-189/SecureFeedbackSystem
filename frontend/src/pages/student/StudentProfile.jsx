import { useAuth } from "../../context/AuthContext";
import { Badge } from "../../components/ui";
import { ROLE_LABELS } from "../../utils/roles";

export default function StudentProfile() {
    const { user } = useAuth();

    const initials = (user?.name || user?.email || "U")
        .split(" ")
        .map((part) => part.charAt(0))
        .join("")
        .slice(0, 2)
        .toUpperCase();
    const roleName = ROLE_LABELS[user?.role] || user?.role || "Student";
    const collegeName = user?.college?.name || user?.collegeName || "Not assigned";

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">Student Workspace</p>
                    <h1 className="sf-page-title mt-2">Profile</h1>
                    <p className="text-[#45464d] mt-1">
                        Your account identity is managed by institution administrators.
                    </p>
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
                        <h2 className="text-2xl font-semibold text-black mt-1 break-words">{user?.name || "Student"}</h2>
                        <p className="text-[#45464d] break-all">{user?.email || "No email available"}</p>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoBox label="Full Name" value={user?.name || "Not available"} />
                <InfoBox label="Email Address" value={user?.email || "Not available"} />
                <InfoBox label="Role" value={roleName} helper="Assigned by admin" />
                <InfoBox label="Institution" value={collegeName} helper="Scoped tenant" />
            </section>

            <section className="sf-dark-panel p-6">
                <p className="sf-label text-slate-400">Privacy Model</p>
                <h2 className="text-xl font-semibold text-white mt-2">Anonymous Feedback Boundary</h2>
                <p className="text-slate-400 mt-3 leading-relaxed">
                    Survey responses are stored with anonymous submission tokens. Administrators and faculty can see aggregate feedback only after privacy thresholds are met.
                </p>
            </section>
        </div>
    );
}

function InfoBox({ label, value, helper }) {
    return (
        <div className="sf-stat">
            <p className="sf-label">{label}</p>
            <p className="font-semibold text-black mt-3 break-words">{value}</p>
            {helper && <p className="text-xs text-[#6b7280] mt-2">{helper}</p>}
        </div>
    );
}
