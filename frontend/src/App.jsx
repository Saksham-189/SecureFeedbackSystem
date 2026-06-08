import { BrowserRouter, Route, Routes } from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Campaigns from "./pages/admin/Campaigns";
import AcademicStructure from "./pages/admin/AcademicStructure";
import UserManagement from "./pages/admin/UserManagement";
import AuditLogs from "./pages/admin/AuditLogs";
import FormAnalytics from "./pages/admin/FormAnalytics";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import StudentDashboard from "./pages/student/StudentDashboard";
import CampaignCenter from "./pages/student/CampaignCenter";
import SubmitFeedback from "./pages/student/SubmitFeedback";
import SubmissionHistory from "./pages/student/SubmissionHistory";
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyAnalytics from "./pages/faculty/FacultyAnalytics";
import StudentProfile from "./pages/student/StudentProfile";
import PrivacyCenter from "./pages/student/PrivacyCenter";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import { ROLES } from "./utils/roles";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
                            <DashboardLayout title="Admin Portal" subtitle="Secure feedback management" />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/campaigns" element={<Campaigns />} />
                    <Route path="/admin/academic" element={<AcademicStructure />} />
                    <Route path="/admin/users" element={<UserManagement />} />
                    <Route path="/admin/audit-logs" element={<AuditLogs />} />
                    <Route path="/admin/analytics/:formId" element={<FormAnalytics />} />
                </Route>

                <Route
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                            <DashboardLayout title="Super Admin Portal" subtitle="Platform governance" />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/superadmin" element={<SuperAdminDashboard />} />
                    <Route path="/superadmin/campaigns" element={<Campaigns />} />
                    <Route path="/superadmin/academic" element={<AcademicStructure />} />
                    <Route path="/superadmin/users" element={<UserManagement />} />
                    <Route path="/superadmin/audit-logs" element={<AuditLogs />} />
                    <Route path="/superadmin/analytics/:formId" element={<FormAnalytics />} />
                </Route>

                <Route
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.FACULTY]}>
                            <DashboardLayout title="Faculty Portal" subtitle="Anonymous feedback insights" />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/faculty" element={<FacultyDashboard />} />
                    <Route path="/faculty/analytics/:formId" element={<FacultyAnalytics />} />
                </Route>

                <Route
                    element={
                        <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
                            <DashboardLayout title="Student Portal" subtitle="Anonymous secure feedback" />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/student" element={<StudentDashboard />} />
                    <Route path="/student/campaigns" element={<CampaignCenter />} />
                    <Route path="/student/forms/:formId/submit" element={<SubmitFeedback />} />
                    <Route path="/student/submissions" element={<SubmissionHistory />} />
                    <Route path="/student/profile" element={<StudentProfile />} />
                    <Route path="/student/privacy" element={<PrivacyCenter />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
