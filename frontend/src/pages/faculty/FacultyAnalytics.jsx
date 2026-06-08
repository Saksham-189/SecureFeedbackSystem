import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Button, Skeleton } from "../../components/ui";
import FormAnalyticsView from "../../components/analytics/FormAnalyticsView";

export default function FacultyAnalytics() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [analytics, setAnalytics] = useState(null);
    const [privacyError, setPrivacyError] = useState(null);

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
                navigate("/faculty");
            }
        }
    }, [formId, navigate, request, toast]);

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
            <div className="max-w-3xl mx-auto pt-10">
                <section className="sf-panel p-8 text-center space-y-5">
                    <p className="sf-label">Privacy Safeguard Active</p>
                    <h1 className="sf-page-title">Aggregation Locked</h1>
                    <p className="text-[#45464d] max-w-lg mx-auto">{privacyError}</p>
                    <div className="flex justify-center gap-3">
                        <Button variant="secondary" onClick={() => navigate("/faculty")}>Return</Button>
                        <Button variant="outline" onClick={fetchAnalytics}>Check Again</Button>
                    </div>
                </section>
            </div>
        );
    }

    if (!analytics) return null;

    return (
        <FormAnalyticsView
            analytics={analytics}
            onBack={() => navigate("/faculty")}
            backLabel="Back to Faculty Dashboard"
        />
    );
}
