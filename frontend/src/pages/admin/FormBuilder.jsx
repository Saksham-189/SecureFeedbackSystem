import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import useApi from "../../hooks/useApi";
import { Badge, Button, Input, Select, Skeleton, Textarea } from "../../components/ui";

const QUESTION_TYPES = [
    { value: "SHORT_ANSWER", label: "Short Answer" },
    { value: "PARAGRAPH", label: "Paragraph" },
    { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
    { value: "CHECKBOXES", label: "Checkboxes" },
    { value: "DROPDOWN", label: "Dropdown" },
    { value: "LINEAR_SCALE", label: "Linear Scale (1-5)" },
    { value: "RATING_SCALE", label: "Rating Scale" },
    { value: "YES_NO", label: "Yes / No" },
    { value: "RATING_10", label: "Rating 1-10" },
];

const optionTypes = new Set(["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN"]);
const semesterOptions = Array.from({ length: 8 }, (_, index) => {
    const number = index + 1;
    return { value: String(number), label: `Semester ${number}` };
});
const toOptions = (items, getLabel) => items.map((item) => ({
    value: item.id,
    label: getLabel(item),
}));

const makeQuestion = (orderIndex = 0) => ({
    orderIndex,
    questionText: "",
    questionType: "SHORT_ANSWER",
    isRequired: true,
    options: ["Option 1", "Option 2"],
});

const toEditableQuestion = (question, index) => ({
    orderIndex: question.orderIndex ?? index,
    questionText: question.questionText || "",
    questionType: question.questionType || "SHORT_ANSWER",
    isRequired: question.isRequired ?? true,
    options: Array.isArray(question.options) && question.options.length ? question.options : ["Option 1", "Option 2"],
});

const toPayloadQuestion = (question, index) => {
    let options = null;
    if (optionTypes.has(question.questionType)) {
        options = question.options
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (question.questionType === "YES_NO") {
        options = ["Yes", "No"];
    }

    return {
        orderIndex: index,
        questionText: question.questionText.trim(),
        questionType: question.questionType,
        isRequired: question.isRequired,
        ...(options ? { options } : {}),
    };
};

export default function FormBuilder() {
    const { request, loading } = useApi();
    const { toast } = useToast();
    const [forms, setForms] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [sections, setSections] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("DRAFT");
    const [target, setTarget] = useState({ departmentId: "", semesterNumber: "", sectionId: "" });
    const [questions, setQuestions] = useState([makeQuestion()]);
    const [saving, setSaving] = useState(false);
    const [preview, setPreview] = useState(false);

    const loadForms = useCallback(async () => {
        const [formRes, departmentRes, sectionRes] = await Promise.all([
            request({ url: "/feedback/admin/forms", method: "GET" }),
            request({ url: "/academic/departments", method: "GET" }),
            request({ url: "/academic/sections", method: "GET" }),
        ]);
        setForms(formRes.data || []);
        setDepartments(departmentRes.data || []);
        setSections(sectionRes.data || []);
    }, [request]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadForms().catch((error) => {
            toast.error(error.response?.data?.message || "Failed to load forms");
        });
    }, [loadForms, toast]);

    const resetBuilder = () => {
        setEditingId(null);
        setTitle("");
        setDescription("");
        setStatus("DRAFT");
        setTarget({ departmentId: "", semesterNumber: "", sectionId: "" });
        setQuestions([makeQuestion()]);
        setPreview(false);
    };

    const editForm = (form) => {
        setEditingId(form.id);
        setTitle(form.title || "");
        setDescription(form.description || "");
        setStatus(form.status || "DRAFT");
        setTarget({
            departmentId: form.campaign?.targetDepartmentId || form.campaign?.targetDepartment?.id || "",
            semesterNumber: form.campaign?.targetSemester?.number ? String(form.campaign.targetSemester.number) : "",
            sectionId: form.campaign?.targetSectionId || form.campaign?.targetSection?.id || "",
        });
        setQuestions((form.questions || []).map(toEditableQuestion));
        setPreview(false);
    };

    const updateQuestion = (index, patch) => {
        setQuestions((current) => current.map((question, itemIndex) => (
            itemIndex === index ? { ...question, ...patch } : question
        )));
    };
    const updateOption = (questionIndex, optionIndex, value) => {
        setQuestions((current) => current.map((question, itemIndex) => {
            if (itemIndex !== questionIndex) return question;
            const options = [...question.options];
            options[optionIndex] = value;
            return { ...question, options };
        }));
    };
    const addOption = (questionIndex) => {
        setQuestions((current) => current.map((question, itemIndex) => (
            itemIndex === questionIndex
                ? { ...question, options: [...question.options, `Option ${question.options.length + 1}`] }
                : question
        )));
    };
    const deleteOption = (questionIndex, optionIndex) => {
        setQuestions((current) => current.map((question, itemIndex) => {
            if (itemIndex !== questionIndex || question.options.length <= 2) return question;
            return { ...question, options: question.options.filter((_, index) => index !== optionIndex) };
        }));
    };

    const addQuestion = () => setQuestions((current) => [...current, makeQuestion(current.length)]);
    const deleteQuestion = (index) => setQuestions((current) => (
        current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)
    ));
    const duplicateQuestion = (index) => setQuestions((current) => {
        const copy = { ...current[index] };
        return [...current.slice(0, index + 1), copy, ...current.slice(index + 1)];
    });
    const moveQuestion = (index, direction) => setQuestions((current) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= current.length) return current;
        const next = [...current];
        [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
        return next;
    });

    const visibleQuestions = useMemo(() => questions.map(toPayloadQuestion), [questions]);

    const saveForm = async (nextStatus = status) => {
        if (!title.trim()) {
            toast.error("Form title is required");
            return;
        }

        const payloadQuestions = questions.map(toPayloadQuestion);
        const invalid = payloadQuestions.find((question) => !question.questionText);
        if (invalid) {
            toast.error("Every question needs text");
            return;
        }

        const missingOptions = payloadQuestions.find((question) => optionTypes.has(question.questionType) && (!question.options || question.options.length < 2));
        if (missingOptions) {
            toast.error("Choice questions need at least two options");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                title: title.trim(),
                description: description.trim() || undefined,
                status: nextStatus,
                targetDepartmentId: target.departmentId || undefined,
                targetSemesterNumber: target.semesterNumber ? Number(target.semesterNumber) : undefined,
                targetSectionId: target.sectionId || undefined,
                questions: payloadQuestions,
            };

            if (editingId) {
                await request({ url: `/feedback/${editingId}`, method: "PUT", data: payload });
                toast.success(nextStatus === "PUBLISHED" ? "Form published" : "Form saved");
            } else {
                await request({ url: "/feedback", method: "POST", data: payload });
                toast.success(nextStatus === "PUBLISHED" ? "Form published" : "Draft saved");
            }

            await loadForms();
            resetBuilder();
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to save form");
        } finally {
            setSaving(false);
        }
    };

    const departmentOptions = toOptions(departments, (department) => `${department.code} - ${department.name}`);
    const sectionOptions = toOptions(
        sections.filter((section) => (
            (!target.departmentId || section.department?.id === target.departmentId) &&
            (!target.semesterNumber || String(section.semester?.number) === String(target.semesterNumber))
        )),
        (section) => `${section.department?.code || "Dept"}-${section.name}`
    );

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <p className="sf-label">Feedback Forms</p>
                    <h1 className="sf-page-title mt-2">Create Feedback Form</h1>
                    <p className="text-[#45464d] mt-1">Build questions, select the target audience, then save or publish.</p>
                </div>
                <Button variant="secondary" onClick={resetBuilder}>New Form</Button>
            </div>

            <section className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                <div className="xl:col-span-8 space-y-5">
                    <div className="sf-panel p-6 space-y-4">
                        <Input label="Form Title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Faculty Evaluation - Operating Systems" />
                        <Textarea label="Form Description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
                    </div>

                    {questions.map((question, index) => (
                        <section key={`${index}-${question.questionType}`} className="sf-panel p-5 space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <p className="sf-label">Question {String(index + 1).padStart(2, "0")}</p>
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" onClick={() => moveQuestion(index, -1)} disabled={index === 0}>Up</Button>
                                    <Button size="sm" variant="outline" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1}>Down</Button>
                                    <Button size="sm" variant="secondary" onClick={() => duplicateQuestion(index)}>Duplicate</Button>
                                    <Button size="sm" variant="danger" onClick={() => deleteQuestion(index)} disabled={questions.length === 1}>Delete</Button>
                                </div>
                            </div>
                            <Input
                                label="Question Text"
                                value={question.questionText}
                                onChange={(event) => updateQuestion(index, { questionText: event.target.value })}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="Question Type"
                                    value={question.questionType}
                                    onChange={(event) => updateQuestion(index, { questionType: event.target.value })}
                                    options={QUESTION_TYPES}
                                    placeholder=""
                                />
                                <label className="flex items-center gap-3 border border-[#c6c6cd] bg-[#f7f9fb] rounded px-4 py-3 mt-6 md:mt-0">
                                    <input
                                        type="checkbox"
                                        checked={question.isRequired}
                                        onChange={(event) => updateQuestion(index, { isRequired: event.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Required</span>
                                </label>
                            </div>
                            {optionTypes.has(question.questionType) && (
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-700">Options</p>
                                    {(question.options || []).map((option, optionIndex) => (
                                        <div key={`${index}-${optionIndex}`} className="flex gap-2">
                                            <Input
                                                value={option}
                                                onChange={(event) => updateOption(index, optionIndex, event.target.value)}
                                                aria-label={`Option ${optionIndex + 1}`}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => deleteOption(index, optionIndex)}
                                                disabled={question.options.length <= 2}
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    ))}
                                    <Button size="sm" variant="secondary" onClick={() => addOption(index)}>Add Option</Button>
                                </div>
                            )}
                        </section>
                    ))}

                    <div className="flex flex-wrap justify-between gap-3">
                        <Button variant="secondary" onClick={addQuestion}>Add Question</Button>
                    </div>

                    <section className="sf-panel p-6 space-y-4">
                        <div>
                            <p className="sf-label">Target Audience</p>
                            <h2 className="text-lg font-semibold text-black mt-1">Delivery Rules</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            <Select
                                label="Target Department"
                                value={target.departmentId}
                                onChange={(event) => setTarget((prev) => ({ ...prev, departmentId: event.target.value, sectionId: "" }))}
                                options={departmentOptions}
                                placeholder="All departments"
                            />
                            <Select
                                label="Target Semester"
                                value={target.semesterNumber}
                                onChange={(event) => setTarget((prev) => ({ ...prev, semesterNumber: event.target.value, sectionId: "" }))}
                                options={semesterOptions}
                                placeholder="All semesters"
                            />
                            <Select
                                label="Target Section"
                                value={target.sectionId}
                                onChange={(event) => setTarget((prev) => ({ ...prev, sectionId: event.target.value }))}
                                options={sectionOptions}
                                placeholder="All sections"
                            />
                            <Select
                                label="Status"
                                value={status}
                                onChange={(event) => setStatus(event.target.value)}
                                options={[
                                    { value: "DRAFT", label: "Draft" },
                                    { value: "PUBLISHED", label: "Published" },
                                ]}
                                placeholder=""
                            />
                        </div>
                    </section>

                    <div className="flex flex-wrap justify-between gap-3">
                        <Button variant="outline" onClick={() => setPreview((value) => !value)}>Preview Form</Button>
                        <div className="flex flex-wrap gap-3">
                            <Button variant="secondary" loading={saving} onClick={() => saveForm("DRAFT")}>Save Draft</Button>
                            <Button loading={saving} onClick={() => saveForm("PUBLISHED")}>Publish Form</Button>
                        </div>
                    </div>

                    {preview && (
                        <section className="sf-dark-panel p-6 space-y-4">
                            <div>
                                <p className="sf-label text-[#7c839b]">Preview</p>
                                <h2 className="text-2xl font-semibold text-white mt-2">{title || "Untitled Form"}</h2>
                                {description && <p className="text-[#bec6e0] mt-2">{description}</p>}
                            </div>
                            {visibleQuestions.map((question, index) => (
                                <div key={`${question.questionText}-${index}`} className="bg-white text-black p-4 rounded">
                                    <p className="font-semibold">{question.questionText || `Question ${index + 1}`} {question.isRequired && <span className="text-[#ba1a1a]">*</span>}</p>
                                    <p className="text-sm text-[#45464d] mt-1">{QUESTION_TYPES.find((item) => item.value === question.questionType)?.label}</p>
                                </div>
                            ))}
                        </section>
                    )}
                </div>

                <aside className="xl:col-span-4 sf-panel p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold">Saved Forms</h2>
                        <Badge variant="info">{forms.length}</Badge>
                    </div>
                    {loading && forms.length === 0 ? (
                        <Skeleton preset="card" />
                    ) : forms.length === 0 ? (
                        <p className="text-sm text-[#45464d]">No forms created yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {forms.map((form) => (
                                <button key={form.id} type="button" onClick={() => editForm(form)} className="w-full text-left border border-[#c6c6cd] bg-[#f7f9fb] hover:bg-white p-4 rounded">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-black">{form.title}</p>
                                            <p className="text-xs text-[#45464d] mt-1">{form.questions?.length || 0} questions | {form._count?.submissions || 0} responses</p>
                                        </div>
                                        <Badge variant={form.status === "PUBLISHED" ? "success" : "warning"}>{form.status}</Badge>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </aside>
            </section>
        </div>
    );
}
