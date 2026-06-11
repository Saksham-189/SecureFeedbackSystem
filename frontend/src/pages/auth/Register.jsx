import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import { getRegistrationMetadata, registerUser } from "../../services/auth.service";
import { Button, Input, Select } from "../../components/ui";

export default function Register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [collegeId, setCollegeId] = useState("");
    const [departmentId, setDepartmentId] = useState("");
    const [semesterNumber, setSemesterNumber] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [metadata, setMetadata] = useState({ colleges: [], departments: [], sections: [] });
    const [loading, setLoading] = useState(false);
    const [fetchingMetadata, setFetchingMetadata] = useState(true);
    const [error, setError] = useState("");
    const { toast } = useToast();
    const navigate = useNavigate();
    const departmentOptions = (metadata.departments || [])
        .filter((department) => !collegeId || department.collegeId === collegeId)
        .map((department) => ({ label: `${department.code} - ${department.name}`, value: department.id }));
    const semesterOptions = Array.from({ length: 8 }, (_, index) => {
        const number = index + 1;
        return { label: `Semester ${number}`, value: String(number) };
    });
    const sectionOptions = (metadata.sections || [])
        .filter((section) => (
            (!collegeId || section.department?.collegeId === collegeId) &&
            (!departmentId || section.departmentId === departmentId) &&
            (!semesterNumber || String(section.semester?.number) === String(semesterNumber))
        ))
        .map((section) => ({ label: `Section ${section.name}`, value: section.id }));

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const response = await getRegistrationMetadata();
                if (response.success) setMetadata(response.data);
            } catch {
                toast.error("Failed to load registration options");
            } finally {
                setFetchingMetadata(false);
            }
        };

        fetchMetadata();
    }, [toast]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        if (!name || !email || !password || !collegeId || !departmentId || !semesterNumber || !sectionId) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const result = await registerUser({
                name,
                email,
                password,
                collegeId,
                departmentId,
                semesterNumber: Number(semesterNumber),
                sectionId,
            });
            if (result.success) {
                toast.success("Account created successfully. Please sign in.");
                navigate("/", { replace: true });
            }
        } catch (errorResponse) {
            const message = errorResponse.response?.data?.message || "Registration failed";
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8 flex flex-col items-center">
                    <img src="/logo.png" alt="SecureFeedback" className="h-16 w-auto object-contain mb-4" />
                    <h1 className="text-3xl font-bold text-black text-center">SecureFeedback</h1>
                    <p className="sf-label mt-2 text-center">Institution Access Request</p>
                </div>

                <section className="sf-panel p-8">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input label="Full Name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
                        <Input label="Email Address" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@institution.edu" />
                        <Input label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" />
                        <Select
                            label="College / Institution"
                            options={(metadata.colleges || []).map((college) => ({ label: college.name, value: college.id }))}
                            value={collegeId}
                            onChange={(event) => {
                                setCollegeId(event.target.value);
                                setDepartmentId("");
                                setSemesterNumber("");
                                setSectionId("");
                            }}
                            disabled={fetchingMetadata}
                            placeholder={fetchingMetadata ? "Loading..." : "Select College"}
                        />
                        <Select
                            label="Department"
                            options={departmentOptions}
                            value={departmentId}
                            onChange={(event) => {
                                setDepartmentId(event.target.value);
                                setSectionId("");
                            }}
                            disabled={fetchingMetadata || !collegeId}
                            placeholder={fetchingMetadata ? "Loading..." : collegeId ? "Select Department" : "Select College First"}
                        />
                        <Select
                            label="Semester"
                            options={semesterOptions}
                            value={semesterNumber}
                            onChange={(event) => {
                                setSemesterNumber(event.target.value);
                                setSectionId("");
                            }}
                            disabled={fetchingMetadata || !departmentId}
                            placeholder={departmentId ? "Select Semester" : "Select Department First"}
                        />
                        <Select
                            label="Section"
                            options={sectionOptions}
                            value={sectionId}
                            onChange={(event) => setSectionId(event.target.value)}
                            disabled={fetchingMetadata || !departmentId || !semesterNumber}
                            placeholder={semesterNumber ? "Select Section" : "Select Semester First"}
                        />

                        {error && (
                            <div className="border border-[#ba1a1a] bg-[#ffdad6]/40 px-4 py-3 text-sm text-[#93000a]" role="alert">
                                {error}
                            </div>
                        )}

                        <Button type="submit" size="lg" loading={loading} disabled={fetchingMetadata} fullWidth>
                            {loading ? "Creating Account..." : "Sign Up"}
                        </Button>
                    </form>

                    <div className="mt-5 text-center text-sm text-[#45464d]">
                        <span>Already have an account? </span>
                        <Link to="/" className="font-semibold text-black underline underline-offset-4">Sign in</Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
