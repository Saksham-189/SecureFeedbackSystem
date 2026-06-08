import Sentiment from "sentiment";

const sentimentAnalyzer = new Sentiment();

const TOXICITY_KEYWORDS = [
    "hate", "stupid", "idiot", "dumb", "useless", "terrible",
    "awful", "worst", "pathetic", "shut up", "kill", "die"
];

const THEME_RULES = [
    { theme: "Practical Learning", keywords: ["practical", "example", "examples", "coding", "exercise", "exercises", "assignment", "assignments", "project", "hands-on", "practice"] },
    { theme: "Attendance", keywords: ["attendance", "present", "absent", "mandatory", "strict", "flexible"] },
    { theme: "Lab Sessions", keywords: ["lab", "labs", "experiment", "experiments", "equipment", "infrastructure", "system", "computer"] },
    { theme: "Course Pace", keywords: ["pace", "fast", "slow", "speed", "rushed", "time", "syllabus", "deadline"] },
    { theme: "Concept Clarity", keywords: ["clear", "clarity", "explain", "explained", "understand", "concept", "concepts", "doubt", "doubts"] },
    { theme: "Course Organization", keywords: ["organized", "structure", "schedule", "planning", "notes", "material", "materials", "slides"] },
    { theme: "Faculty Availability", keywords: ["available", "availability", "support", "help", "helpful", "approachable", "responsive"] },
    { theme: "Communication", keywords: ["communication", "communicate", "announcements", "instructions", "updates", "language"] },
    { theme: "Assessment", keywords: ["exam", "test", "quiz", "marks", "grading", "assessment", "evaluation"] },
    { theme: "Workload", keywords: ["workload", "load", "pressure", "stress", "homework", "tasks"] }
];

const IMPROVEMENT_MARKERS = [
    "need", "needs", "improve", "improvement", "should", "more", "less",
    "better", "problem", "issue", "difficult", "strict", "longer", "declined"
];

const STRENGTH_MARKERS = [
    "good", "great", "excellent", "clear", "helpful", "organized", "available",
    "supportive", "useful", "well", "best", "understand"
];

const STOP_WORDS = new Set([
    "the", "is", "in", "at", "of", "on", "and", "a", "to", "for", "it", "with",
    "as", "this", "that", "i", "we", "you", "are", "was", "be", "can", "not",
    "have", "but", "from", "they", "them", "our", "your", "more", "should"
]);

const tokenize = (text = "") => (
    text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
);

const containsAny = (tokens, words) => {
    const tokenSet = new Set(tokens);
    return words.some((word) => tokenSet.has(word) || tokens.join(" ").includes(word));
};

export const analyzeSingleSentiment = (text = "") => {
    const result = sentimentAnalyzer.analyze(text);
    const label = result.score > 0 ? "POSITIVE" : result.score < 0 ? "NEGATIVE" : "NEUTRAL";

    return {
        label,
        score: result.score
    };
};

export const extractThemeTags = (text = "") => {
    const tokens = tokenize(text);
    return THEME_RULES
        .filter((rule) => containsAny(tokens, rule.keywords))
        .map((rule) => rule.theme);
};

export const analyzeTextResponse = (text = "") => {
    const sentiment = analyzeSingleSentiment(text);
    const themes = extractThemeTags(text);

    return {
        sentimentLabel: sentiment.label,
        sentimentScore: sentiment.score,
        themeTags: themes
    };
};

export const analyzeSentiment = (items) => {
    const normalized = (items || []).map((item) => {
        if (typeof item === "string") return analyzeSingleSentiment(item).label;
        return item.sentimentLabel || item.label || analyzeSingleSentiment(item.text || "").label;
    });

    if (normalized.length === 0) {
        return {
            positive: 0,
            neutral: 0,
            negative: 0,
            total: 0,
            percentages: { positive: 0, neutral: 0, negative: 0 }
        };
    }

    const positive = normalized.filter((label) => label === "POSITIVE").length;
    const neutral = normalized.filter((label) => label === "NEUTRAL").length;
    const negative = normalized.filter((label) => label === "NEGATIVE").length;

    return {
        positive,
        neutral,
        negative,
        total: normalized.length,
        percentages: {
            positive: Math.round((positive / normalized.length) * 100),
            neutral: Math.round((neutral / normalized.length) * 100),
            negative: Math.round((negative / normalized.length) * 100)
        }
    };
};

export const extractThemes = (items) => {
    const counts = new Map();

    (items || []).forEach((item) => {
        const text = typeof item === "string" ? item : item.text || "";
        const tags = Array.isArray(item?.themeTags) && item.themeTags.length
            ? item.themeTags
            : extractThemeTags(text);

        tags.forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1));

        if (tags.length === 0) {
            tokenize(text)
                .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
                .slice(0, 3)
                .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
        }
    });

    return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme, count]) => ({ theme, count }));
};

export const generateStrengthsAndImprovements = (items) => {
    const buckets = new Map();

    (items || []).forEach((item) => {
        const text = typeof item === "string" ? item : item.text || "";
        const tokens = tokenize(text);
        const analysis = typeof item === "string"
            ? analyzeTextResponse(text)
            : {
                sentimentLabel: item.sentimentLabel || analyzeSingleSentiment(text).label,
                themeTags: Array.isArray(item.themeTags) ? item.themeTags : extractThemeTags(text)
            };

        analysis.themeTags.forEach((theme) => {
            const current = buckets.get(theme) || { positive: 0, negative: 0, improvement: 0 };
            if (analysis.sentimentLabel === "POSITIVE" || containsAny(tokens, STRENGTH_MARKERS)) current.positive += 1;
            if (analysis.sentimentLabel === "NEGATIVE") current.negative += 1;
            if (containsAny(tokens, IMPROVEMENT_MARKERS)) current.improvement += 1;
            buckets.set(theme, current);
        });
    });

    const rows = Array.from(buckets.entries()).map(([theme, stats]) => ({ theme, ...stats }));

    return {
        strengths: rows
            .filter((row) => row.positive > 0)
            .sort((a, b) => b.positive - a.positive)
            .slice(0, 5)
            .map((row) => row.theme),
        improvementAreas: rows
            .filter((row) => row.improvement > 0 || row.negative > 0)
            .sort((a, b) => (b.improvement + b.negative) - (a.improvement + a.negative))
            .slice(0, 5)
            .map((row) => row.theme)
    };
};

export const detectToxicity = (text) => {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return TOXICITY_KEYWORDS.some((keyword) => lowerText.includes(keyword));
};

export const generateSummary = (items) => {
    if (!items || items.length === 0) return "No text feedback available to summarize.";

    const themes = extractThemes(items);
    if (themes.length === 0) return "Feedback is too generic to extract meaningful themes.";

    const { strengths, improvementAreas } = generateStrengthsAndImprovements(items);
    const parts = [`Students frequently discussed ${themes.map((t) => t.theme).join(", ")}.`];

    if (strengths.length) parts.push(`Strength signals: ${strengths.join(", ")}.`);
    if (improvementAreas.length) parts.push(`Improvement signals: ${improvementAreas.join(", ")}.`);

    return parts.join(" ");
};
