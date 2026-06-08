import { Badge } from "../../components/ui";

const PROTECTIONS = [
    {
        label: "ANONYMIZATION",
        status: "Active",
        description:
            "Every submission generates a detached anonymous token. Your identity is separated from your responses at the database level. Faculty and administrators cannot trace feedback to individual students.",
    },
    {
        label: "ENCRYPTION",
        status: "Active",
        description:
            "All text responses are encrypted using AES-256 before storage. IP addresses and device fingerprints are hashed with SHA-256 and never stored in plaintext.",
    },
    {
        label: "SUBMISSION INTEGRITY",
        status: "Enforced",
        description:
            "Each student can submit feedback only once per form. Server-side duplicate detection blocks any repeat submissions. Anti-abuse monitoring detects rapid-fire or bot submissions.",
    },
    {
        label: "AUDIT TRAIL",
        status: "Active",
        description:
            "All platform actions are logged to an immutable audit trail. Submission events, login attempts, and administrative changes are recorded with timestamps and severity levels.",
    },
];

export default function PrivacyCenter() {
    return (
        <div className="max-w-[800px] mx-auto flex flex-col gap-10 pb-20">
            {/* ── Header ── */}
            <section className="flex flex-col gap-1">
                <span className="sf-label">Privacy &amp; Security</span>
                <h1 className="sf-page-title mt-1">Privacy Center</h1>
                <p className="text-[#45464d] mt-1">
                    Real-time status of the security measures protecting your feedback.
                </p>
            </section>

            {/* ── Protection Cards (2-col grid) ── */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {PROTECTIONS.map((item) => (
                    <div key={item.label} className="sf-card flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="sf-label">{item.label}</span>
                            <Badge variant="success" dot>
                                {item.status}
                            </Badge>
                        </div>
                        <p className="text-sm text-[#45464d] leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                ))}
            </section>

            {/* ── Privacy Policy (full-width) ── */}
            <section className="sf-card flex flex-col gap-3">
                <span className="sf-label">DATA GOVERNANCE</span>
                <p className="text-sm text-[#45464d] leading-relaxed">
                    SecureFeedback adheres to institutional data governance standards.
                    Feedback data is used exclusively for academic quality improvement.
                    No personally identifiable information is shared with third parties.
                    Data retention follows your institution&apos;s IT policy. Students may
                    request a data audit through their institution&apos;s administration.
                </p>
            </section>

            {/* ── Trust Seal ── */}
            <section className="sf-dark-panel p-6">
                <div className="mb-3">
                    <span className="font-semibold text-white">Trust Seal</span>
                </div>
                <p className="text-sm text-[#bec6e0] leading-relaxed">
                    All protections are enforced server-side and cannot be bypassed by
                    frontend modifications.
                </p>
            </section>
        </div>
    );
}
