import { Badge, Button } from "../ui";

export default function FormAnalyticsView({ analytics, onBack, backLabel }) {
    const questions = Object.entries(analytics.questions || {});

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <section className="sf-panel p-6 lg:p-8 flex flex-col md:flex-row md:items-end justify-between gap-5">
                <div>
                    <Badge variant="info">Privacy Preserving Aggregation</Badge>
                    <h1 className="sf-page-title mt-4">Form Analytics</h1>
                    <p className="text-[#45464d] mt-2">Identity-scrubbed response data from eligible submissions only.</p>
                </div>
                <div className="sf-stat min-w-48">
                    <p className="sf-label">Total Responses</p>
                    <p className="sf-metric text-4xl mt-2">{analytics.totalSubmissions}</p>
                </div>
            </section>

            {analytics.aiInsights && (
                <section className="sf-panel p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                            <p className="sf-label">Feedback Themes</p>
                            <h2 className="text-xl font-semibold text-black mt-2">Qualitative Intelligence</h2>
                            <p className="text-[#45464d] mt-3 leading-relaxed">
                                {analytics.aiInsights.summary || "No text response summary is available yet."}
                            </p>
                            {analytics.aiInsights.toxicityFlags > 0 && (
                                <div className="mt-4 border-l-4 border-[#ba1a1a] bg-[#ffdad6]/40 p-3 text-sm text-[#93000a]">
                                    {analytics.aiInsights.toxicityFlags} responses were flagged and hidden by safety filters.
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="sf-label">Sentiment Distribution</p>
                            <div className="mt-4 h-4 bg-[#eceef0] flex overflow-hidden">
                                <div className="bg-[#3980f4]" style={{ width: `${analytics.aiInsights.sentiment?.percentages?.positive || 0}%` }} />
                                <div className="bg-[#9ca3af]" style={{ width: `${analytics.aiInsights.sentiment?.percentages?.neutral || 0}%` }} />
                                <div className="bg-[#ba1a1a]" style={{ width: `${analytics.aiInsights.sentiment?.percentages?.negative || 0}%` }} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                                <Sentiment label="Positive" value={analytics.aiInsights.sentiment?.percentages?.positive || 0} />
                                <Sentiment label="Neutral" value={analytics.aiInsights.sentiment?.percentages?.neutral || 0} />
                                <Sentiment label="Negative" value={analytics.aiInsights.sentiment?.percentages?.negative || 0} />
                            </div>
                            {analytics.aiInsights.themes?.length > 0 && (
                                <div className="mt-5">
                                    <p className="sf-label mb-3">Top Discussion Topics</p>
                                    <div className="flex flex-wrap gap-2">
                                    {analytics.aiInsights.themes.map((theme) => (
                                        <Badge key={theme.theme} variant="secondary">{theme.theme} ({theme.count})</Badge>
                                    ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <InsightList title="Strengths" items={analytics.aiInsights.strengths} empty="No strength signals detected yet." />
                        <InsightList title="Improvement Areas" items={analytics.aiInsights.improvementAreas} empty="No improvement signals detected yet." />
                    </div>
                </section>
            )}

            <section className="space-y-5">
                {questions.length === 0 ? (
                    <div className="sf-panel p-10 text-center">
                        <p className="font-semibold text-black">No question analytics available</p>
                        <p className="text-sm text-[#45464d] mt-1">Question-level data appears after valid submissions are recorded.</p>
                    </div>
                ) : questions.map(([questionId, question], index) => (
                    <QuestionAnalytics key={questionId} question={question} index={index} total={analytics.totalSubmissions} />
                ))}
            </section>

            <div>
                <Button variant="secondary" onClick={onBack}>{backLabel}</Button>
            </div>
        </div>
    );
}

function QuestionAnalytics({ question, index, total }) {
    return (
        <section className="sf-panel p-6">
            <div className="flex gap-4 items-start">
                <div className="w-10 h-10 border border-[#c6c6cd] bg-[#f7f9fb] flex items-center justify-center font-mono">
                    {String(index + 1).padStart(2, "0")}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="sf-label">{question.type} Question</p>
                    <h2 className="text-lg font-semibold text-black mt-1">{question.questionText}</h2>
                    <div className="mt-5">{renderQuestionData(question, total)}</div>
                </div>
            </div>
        </section>
    );
}

function renderQuestionData(question, total) {
    if (question.type === "RATING") {
        return (
            <div className="flex items-end gap-3">
                <span className="sf-metric text-5xl">{question.data.average || 0}</span>
                <span className="text-[#45464d] mb-2">/ 5.0 average</span>
            </div>
        );
    }

    if (["MCQ", "DROPDOWN", "CHECKBOX"].includes(question.type)) {
        const entries = Object.entries(question.data || {});
        if (entries.length === 0) {
            return <p className="text-sm text-[#45464d]">No selections submitted.</p>;
        }
        return (
            <div className="space-y-4">
                {entries.map(([option, count]) => {
                    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                        <div key={option}>
                            <div className="flex justify-between gap-3 text-sm">
                                <span className="font-medium text-black">{option}</span>
                                <span className="font-mono text-[#45464d]">{count} ({percentage}%)</span>
                            </div>
                            <div className="h-2 bg-[#eceef0] mt-2">
                                <div className="h-full bg-black" style={{ width: `${percentage}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    if (question.type === "TEXT") {
        if (!question.data?.length) {
            return <p className="text-sm text-[#45464d]">No text responses submitted.</p>;
        }
        return (
            <div className="space-y-3">
                {question.data.map((text, index) => (
                    <p key={`${text}-${index}`} className="border-l-4 border-[#3980f4] bg-[#f7f9fb] p-4 text-sm italic text-black">
                        "{text}"
                    </p>
                ))}
            </div>
        );
    }

    return <p className="text-sm text-[#45464d]">No renderer for this question type.</p>;
}

function Sentiment({ label, value }) {
    return (
        <div className="sf-stat p-3">
            <p className="sf-label">{label}</p>
            <p className="font-mono text-lg mt-1">{value}%</p>
        </div>
    );
}

function InsightList({ title, items = [], empty }) {
    return (
        <div className="border border-[#c6c6cd] rounded p-4 bg-[#f7f9fb]">
            <p className="sf-label">{title}</p>
            {items.length === 0 ? (
                <p className="text-sm text-[#45464d] mt-3">{empty}</p>
            ) : (
                <div className="flex flex-wrap gap-2 mt-4">
                    {items.map((item) => <Badge key={item} variant="secondary">{item}</Badge>)}
                </div>
            )}
        </div>
    );
}
