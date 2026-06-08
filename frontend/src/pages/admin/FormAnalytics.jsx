import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Button, Skeleton } from "../../components/ui";
import FormAnalyticsView from "../../components/analytics/FormAnalyticsView";

export default function FormAnalytics() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [analytics, setAnalytics] = useState(null);
    const [privacyError, setPrivacyError] = useState(null);
    const backPath = user?.role === "SUPER_ADMIN" ? "/superadmin" : "/admin";

    const fetchAnalytics = useCallback(async () => {
        try {
            setPrivacyError(null);
            const response = await request({ url: `/analytics/form/${formId}`, method: "GET" });
            setAnalytics(response?.data || null);
        } catch (error) {
            if (error.response?.status === 403) {
                setPrivacyError(error.response.data.message);
            } else {
                toast.error("Failed to load analytics");
                navigate(backPath);
            }
        }
    }, [backPath, formId, navigate, request, toast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (loading && !analytics && !privacyError) {
        return (
            <div className="max-w-4xl mx-auto space-y-5 pb-20">
                <Skeleton preset="card" />
                <Skeleton preset="card" />
            </div>
        );
    }

    if (privacyError) {
        return (
            <PrivacyGate
                message={privacyError}
                onBack={() => navigate(backPath)}
                onRetry={fetchAnalytics}
            />
        );
    }

    if (!analytics) return null;

    return (
        <FormAnalyticsView
            analytics={analytics}
            onBack={() => navigate(backPath)}
            backLabel="Back to Dashboard"
        />
    );
}

function PrivacyGate({ message, onBack, onRetry }) {
    return (
        <div className="max-w-3xl mx-auto pt-10">
            <section className="sf-panel p-8 text-center space-y-5">
                <p className="sf-label">Privacy Safeguard Active</p>
                <h1 className="sf-page-title">Aggregation Locked</h1>
                <p className="text-[#45464d] max-w-lg mx-auto">{message}</p>
                <div className="flex justify-center gap-3">
                    <Button variant="secondary" onClick={onBack}>Return</Button>
                    <Button variant="outline" onClick={onRetry}>Check Again</Button>
                </div>
            </section>
        </div>
    );
}
