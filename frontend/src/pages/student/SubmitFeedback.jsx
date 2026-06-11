import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Select, Skeleton, Textarea } from "../../components/ui";

export default function SubmitFeedback() {
    const { formId } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();
    const { request, loading } = useApi();
    const [form, setForm] = useState(null);
    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const startTimeRef = useRef(null);

    const fetchFormDetails = useCallback(async () => {
        try {
            const response = await request({ url: `/feedback/${formId}`, method: "GET" });
            const targetForm = response?.data;
            if (!targetForm) {
                toast.error("Form not found or unavailable");
                navigate("/student");
                return;
            }
            targetForm.questions.sort((a, b) => a.orderIndex - b.orderIndex);
            setForm(targetForm);
            startTimeRef.current = Date.now();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to load form details");
            navigate("/student");
        }
    }, [formId, navigate, request, toast]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchFormDetails();
    }, [fetchFormDetails]);

    const handleAnswerChange = (questionId, value, type) => {
        setAnswers((prev) => ({ ...prev, [questionId]: { value, type } }));
    };

    const handleCheckboxChange = (questionId, option, isChecked) => {
        setAnswers((prev) => {
            const current = prev[questionId]?.value || [];
            const next = isChecked ? [...current, option] : current.filter((item) => item !== option);
            return { ...prev, [questionId]: { value: next, type: "CHECKBOX" } };
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        for (const question of form.questions) {
            if (!question.isRequired) continue;
            const answer = answers[question.id]?.value;
            if (!answer || (Array.isArray(answer) && answer.length === 0)) {
                toast.error(`Please answer required question: "${question.questionText}"`);
                return;
            }
        }

        const responses = Object.entries(answers).map(([questionId, answer]) => {
            const payload = { questionId };
            if (isTextType(answer.type)) payload.answerText = answer.value;
            if (isRatingType(answer.type)) payload.answerNumber = Number(answer.value);
            if (isCheckboxType(answer.type)) payload.answerArray = answer.value;
            if (isSingleChoiceType(answer.type)) payload.answerText = answer.value;
            return payload;
        });

        setSubmitting(true);
        try {
            const response = await request({
                url: `/feedback/${formId}/submit`,
                method: "POST",
                data: {
                    metrics: {
                        startedAt: new Date(startTimeRef.current || Date.now()).toISOString(),
                        completionTimeMs: Date.now() - (startTimeRef.current || Date.now()),
                    },
                    responses,
                },
            });
            setReceipt(response.data);
            toast.success("Feedback submitted securely");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit feedback");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !form) {
        return (
            <div className="max-w-3xl mx-auto space-y-5 pb-20">
                <Skeleton preset="card" />
                <Skeleton preset="card" />
                <Skeleton preset="card" />
            </div>
        );
    }

    if (!form) return null;

    if (receipt) {
        const copyReceipt = async () => {
            try {
                await navigator.clipboard.writeText(receipt.anonymousToken);
                toast.success("Receipt token copied to clipboard");
            } catch {
                toast.error("Failed to copy token");
            }
        };

        return (
            <div className="max-w-2xl mx-auto pt-8 pb-20">
                <section className="sf-panel p-8 text-center space-y-6">
                    <Badge variant="success">Submission Verified</Badge>
                    <div>
                        <h1 className="sf-page-title">Feedback Submitted</h1>
                        <p className="text-[#45464d] mt-3">
                            Your response has been stored anonymously and separated from your account identity.
                        </p>
                    </div>
                    <div className="text-left bg-[#f7f9fb] border border-[#c6c6cd] p-5 space-y-4">
                        <div>
                            <p className="sf-label">Submission Receipt ID</p>
                            <p className="font-mono text-sm text-black bg-white border border-[#c6c6cd] px-3 py-2 mt-2 break-all">
                                {receipt.submissionId}
                            </p>
                        </div>
                        <div>
                            <p className="sf-label">Receipt Token</p>
                            <p className="font-mono text-sm text-black bg-white border border-[#c6c6cd] px-3 py-2 mt-2 break-all">
                                {receipt.anonymousToken}
                            </p>
                        </div>
                        <div>
                            <p className="sf-label">Timestamp</p>
                            <p className="font-mono text-sm mt-2">{new Date(receipt.receiptTimestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button variant="secondary" onClick={copyReceipt}>Copy Receipt</Button>
                        <Button variant="secondary" onClick={() => navigate("/student/submissions")}>View All Receipts</Button>
                        <Button onClick={() => navigate("/student")}>Return to Dashboard</Button>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-20">
            <section className="sf-panel p-6 lg:p-8">
                <Badge variant="info">Secure and Anonymous</Badge>
                <h1 className="sf-page-title mt-4">{form.title}</h1>
                {form.description && <p className="text-[#45464d] mt-3 whitespace-pre-wrap">{form.description}</p>}
            </section>

            <form onSubmit={handleSubmit} className="space-y-5">
                {form.questions.map((question, index) => (
                    <section key={question.id} className="sf-panel p-6">
                        <div className="mb-4">
                            <p className="sf-label">Question {String(index + 1).padStart(2, "0")}</p>
                            <h2 className="text-lg font-semibold text-black mt-2">
                                {question.questionText}
                                {question.isRequired && <span className="text-[#ba1a1a] ml-1">*</span>}
                            </h2>
                        </div>
                        {renderQuestionInput(question, answers[question.id]?.value || "", handleAnswerChange, handleCheckboxChange)}
                    </section>
                ))}

                <section className="sf-dark-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p className="text-sm text-slate-300 max-w-xl">
                        Submitting creates one anonymous response token for this campaign. Duplicate submissions are blocked server-side.
                    </p>
                    <div className="flex gap-3 justify-end">
                        <Button type="button" variant="secondary" onClick={() => navigate("/student")}>Cancel</Button>
                        <Button type="submit" loading={submitting}>Submit Feedback</Button>
                    </div>
                </section>
            </form>
        </div>
    );
}

function renderQuestionInput(question, value, handleAnswerChange, handleCheckboxChange) {
    if (isTextType(question.questionType)) {
        return (
            <Textarea
                placeholder="Type your answer here..."
                value={value}
                onChange={(event) => handleAnswerChange(question.id, event.target.value, question.questionType)}
                rows={question.questionType === "SHORT_ANSWER" ? 2 : 4}
            />
        );
    }

    if (question.questionType === "DROPDOWN") {
        return (
            <Select
                value={value}
                onChange={(event) => handleAnswerChange(question.id, event.target.value, question.questionType)}
                options={(question.options || []).map((option) => ({ value: option, label: option }))}
                placeholder="Select an option"
            />
        );
    }

    if (isSingleChoiceType(question.questionType)) {
        const options = question.questionType === "YES_NO" ? ["Yes", "No"] : (question.options || []);
        return (
            <div className="space-y-2">
                {options.map((option) => (
                    <label key={option} className="flex items-center gap-3 p-3 border border-[#c6c6cd] bg-[#f7f9fb] cursor-pointer hover:bg-white">
                        <input
                            type="radio"
                            name={`q_${question.id}`}
                            value={option}
                            checked={value === option}
                            onChange={(event) => handleAnswerChange(question.id, event.target.value, question.questionType)}
                        />
                        <span className="text-sm text-black">{option}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (isCheckboxType(question.questionType)) {
        const selected = Array.isArray(value) ? value : [];
        return (
            <div className="space-y-2">
                {(question.options || []).map((option) => (
                    <label key={option} className="flex items-center gap-3 p-3 border border-[#c6c6cd] bg-[#f7f9fb] cursor-pointer hover:bg-white">
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={(event) => handleCheckboxChange(question.id, option, event.target.checked)}
                        />
                        <span className="text-sm text-black">{option}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (isRatingType(question.questionType)) {
        const scale = question.questionType === "RATING_10" ? 10 : 5;
        return (
            <div className={scale === 10 ? "grid grid-cols-5 md:grid-cols-10 gap-2" : "grid grid-cols-5 gap-2"}>
                {Array.from({ length: scale }, (_, index) => index + 1).map((number) => (
                    <button
                        type="button"
                        key={number}
                        onClick={() => handleAnswerChange(question.id, number, "RATING")}
                        className={`h-12 border font-mono text-lg transition-colors ${
                            value === number
                                ? "bg-black border-black text-white"
                                : "bg-[#f7f9fb] border-[#c6c6cd] text-black hover:bg-white"
                        }`}
                    >
                        {number}
                    </button>
                ))}
            </div>
        );
    }

    return <p className="text-sm text-[#ba1a1a]">Unsupported question type.</p>;
}

function isTextType(type) {
    return ["TEXT", "SHORT_ANSWER", "PARAGRAPH"].includes(type);
}

function isRatingType(type) {
    return ["RATING", "LINEAR_SCALE", "RATING_SCALE", "RATING_10"].includes(type);
}

function isCheckboxType(type) {
    return ["CHECKBOX", "CHECKBOXES"].includes(type);
}

function isSingleChoiceType(type) {
    return ["MCQ", "MULTIPLE_CHOICE", "DROPDOWN", "YES_NO"].includes(type);
}
