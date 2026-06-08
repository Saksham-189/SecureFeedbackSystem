import prisma from "../../prisma/prismaClient.js";
import { decryptField } from "../../utils/cryptoUtils.js";
import auditLogger from "../../utils/auditLogger.js";
import {
    analyzeSentiment,
    analyzeTextResponse,
    extractThemes,
    generateStrengthsAndImprovements,
    generateSummary,
    detectToxicity
} from "./ai.service.js";

// K-Anonymity Threshold: To prevent Deanonymization, we refuse to show analytics 
// if the number of respondents is below this threshold.
const PRIVACY_THRESHOLD = 5;
const isSuperAdmin = (user) => user?.role === "SUPER_ADMIN" || user?.role?.name === "SUPER_ADMIN";
const getRoleName = (user) => user?.role?.name || user?.role;

/**
 * Fetch and aggregate privacy-preserving analytics for a specific form.
 */
export const getFormAnalytics = async (formId, user) => {
    // 1. Authorization & Form Verification
    const form = await prisma.feedbackForm.findUnique({
        where: { id: formId },
        include: {
            questions: true,
            campaign: {
                include: {
                    targetCourseAssignment: true
                }
            }
        }
    });

    if (!form) throw new Error("Form not found");
    
    // Admins and Faculty can only view forms from their own college
    if (form.collegeId !== user.collegeId && !isSuperAdmin(user)) {
        throw new Error("Unauthorized to view analytics for this form");
    }

    if (
        getRoleName(user) === "FACULTY" &&
        form.campaign?.targetCourseAssignment?.facultyId !== user.id
    ) {
        throw new Error("Unauthorized to view analytics for this form");
    }

    // 2. Count total submissions
    const submissionCount = await prisma.feedbackSubmission.count({
        where: { formId, status: "COMPLETED" }
    });

    // 3. ENFORCE PRIVACY THRESHOLD
    if (submissionCount < PRIVACY_THRESHOLD) {
        await auditLogger({
            userId: user.id,
            action: "ANALYTICS_VIEW_DENIED_PRIVACY",
            resourceType: "FORM_ANALYTICS",
            resourceId: formId,
            severity: "INFO",
            details: { reason: "Submissions below privacy threshold", count: submissionCount }
        });

        throw new Error(`Analytics are hidden. At least ${PRIVACY_THRESHOLD} submissions are required to preserve student anonymity. (Currently: ${submissionCount})`);
    }

    // 4. Aggregate Responses safely
    // We do NOT return individual submissions. We aggregate them.
    const responses = await prisma.feedbackResponse.findMany({
        where: {
            submission: { formId, status: "COMPLETED" }
        },
        select: {
            questionId: true,
            answerText: true,
            answerNumber: true,
            answerArray: true,
            sentimentLabel: true,
            sentimentScore: true,
            themeTags: true
            // Intentionally excluding 'submissionId' and 'createdAt' to prevent correlation attacks
        }
    });

    const analytics = {
        totalSubmissions: submissionCount,
        questions: {},
        aiInsights: null
    };

    // Initialize analytics shape based on question type
    form.questions.forEach(q => {
        analytics.questions[q.id] = {
            questionText: q.questionText,
            type: q.questionType,
            data: {}
        };
        
        if (["MCQ", "DROPDOWN", "CHECKBOX"].includes(q.questionType)) {
            const opts = q.options || [];
            opts.forEach(o => analytics.questions[q.id].data[o] = 0);
        } else if (q.questionType === "RATING") {
            analytics.questions[q.id].data = { average: 0, count: 0, sum: 0 };
        } else if (q.questionType === "TEXT") {
            analytics.questions[q.id].data = []; // Will store decrypted text responses
        }
    });

    // Process Responses
    for (const res of responses) {
        const qStats = analytics.questions[res.questionId];
        if (!qStats) continue;

        if (qStats.type === "RATING" && res.answerNumber !== null) {
            qStats.data.sum += res.answerNumber;
            qStats.data.count += 1;
        } 
        else if (["MCQ", "DROPDOWN"].includes(qStats.type) && res.answerText) {
            // Because answerText was encrypted, we must decrypt it first if MCQ was stored securely
            let val = res.answerText;
            try {
                if (val.includes(':')) val = decryptField(val);
            } catch(e) {} // Fallback if it wasn't encrypted
            
            if (qStats.data[val] !== undefined) qStats.data[val] += 1;
        }
        else if (qStats.type === "CHECKBOX" && res.answerArray) {
            const arr = Array.isArray(res.answerArray) ? res.answerArray : [];
            arr.forEach(val => {
                if (qStats.data[val] !== undefined) qStats.data[val] += 1;
            });
        }
        else if (qStats.type === "TEXT" && res.answerText) {
            try {
                const plaintext = decryptField(res.answerText);
                const storedThemes = Array.isArray(res.themeTags) ? res.themeTags : [];
                const fallback = analyzeTextResponse(plaintext);

                qStats.data.push({
                    text: plaintext,
                    sentimentLabel: res.sentimentLabel || fallback.sentimentLabel,
                    sentimentScore: res.sentimentScore ?? fallback.sentimentScore,
                    themeTags: storedThemes.length ? storedThemes : fallback.themeTags
                });
            } catch (e) {
                // If decryption fails, skip
            }
        }
    }

    // Finalize averages and gather text for AI
    let allTextResponses = [];
    let toxicityFlags = 0;

    Object.values(analytics.questions).forEach(qStats => {
        if (qStats.type === "RATING" && qStats.data.count > 0) {
            qStats.data.average = Number((qStats.data.sum / qStats.data.count).toFixed(2));
        } else if (qStats.type === "TEXT") {
            // Filter out toxic comments from display, but count them
            const cleanData = [];
            qStats.data.forEach(item => {
                allTextResponses.push(item);
                if (detectToxicity(item.text)) {
                    toxicityFlags++;
                } else {
                    cleanData.push(item.text);
                }
            });
            qStats.data = cleanData;
            
            // Shuffle clean text comments to destroy temporal sequence inference
            qStats.data.sort(() => Math.random() - 0.5);
        }
    });

    // Generate AI Insights
    analytics.aiInsights = {
        sentiment: analyzeSentiment(allTextResponses),
        themes: extractThemes(allTextResponses),
        ...generateStrengthsAndImprovements(allTextResponses),
        summary: generateSummary(allTextResponses),
        toxicityFlags
    };

    await auditLogger({
        userId: user.id,
        action: "ANALYTICS_VIEWED",
        resourceType: "FORM_ANALYTICS",
        resourceId: formId,
        severity: "INFO"
    });

    return analytics;
};

const getAverageRatingForForms = async (formIds) => {
    if (formIds.length === 0) return null;

    const ratings = await prisma.feedbackResponse.aggregate({
        where: {
            question: { questionType: "RATING" },
            answerNumber: { not: null },
            submission: {
                formId: { in: formIds },
                status: "COMPLETED"
            }
        },
        _avg: { answerNumber: true }
    });

    return ratings._avg.answerNumber === null
        ? null
        : Number(ratings._avg.answerNumber.toFixed(2));
};

export const getDepartmentAnalytics = async (departmentId, user) => {
    const department = await prisma.department.findFirst({
        where: {
            id: departmentId,
            ...(isSuperAdmin(user) ? {} : { collegeId: user.collegeId })
        },
        include: {
            sections: {
                include: {
                    _count: { select: { enrollments: true } }
                }
            },
            courses: true
        }
    });

    if (!department) throw new Error("Department not found");

    const campaigns = await prisma.campaign.findMany({
        where: {
            collegeId: department.collegeId,
            targetDepartmentId: department.id
        },
        include: {
            forms: {
                select: { id: true }
            }
        }
    });

    const formIds = campaigns.flatMap((campaign) => campaign.forms.map((form) => form.id));
    const submissionCount = await prisma.feedbackSubmission.count({
        where: { formId: { in: formIds }, status: "COMPLETED" }
    });
    const eligibleStudents = department.sections.reduce((sum, section) => sum + section._count.enrollments, 0);
    const averageRating = submissionCount >= PRIVACY_THRESHOLD
        ? await getAverageRatingForForms(formIds)
        : null;

    return {
        department: {
            id: department.id,
            name: department.name,
            code: department.code
        },
        campaigns: campaigns.length,
        forms: formIds.length,
        courses: department.courses.length,
        eligibleStudents,
        submissions: submissionCount,
        participationRate: eligibleStudents > 0
            ? Number(((submissionCount / eligibleStudents) * 100).toFixed(1))
            : 0,
        averageRating,
        analyticsHidden: submissionCount < PRIVACY_THRESHOLD,
        privacyThreshold: PRIVACY_THRESHOLD
    };
};

export const getCrossDepartmentAnalytics = async (user) => {
    const departments = await prisma.department.findMany({
        where: isSuperAdmin(user) ? {} : { collegeId: user.collegeId },
        orderBy: { code: "asc" }
    });

    return Promise.all(
        departments.map((department) => getDepartmentAnalytics(department.id, user))
    );
};

const formIncludeForIntelligence = {
    campaign: {
        include: {
            targetDepartment: { select: { id: true, name: true, code: true } },
            targetSemester: { select: { id: true, number: true, name: true } },
            targetSection: { select: { id: true, name: true } },
            targetCourseAssignment: {
                include: {
                    course: { select: { id: true, name: true, code: true } },
                    faculty: { select: { id: true, name: true, email: true } },
                    section: { select: { id: true, name: true } },
                    semester: { select: { id: true, number: true, name: true } }
                }
            }
        }
    },
    _count: {
        select: {
            submissions: { where: { status: "COMPLETED" } }
        }
    }
};

const getScopedForms = async (user, scope) => {
    const baseWhere = isSuperAdmin(user) ? {} : { collegeId: user.collegeId };
    const facultyWhere = scope === "FACULTY"
        ? { campaign: { targetCourseAssignment: { facultyId: user.id } } }
        : {};

    return prisma.feedbackForm.findMany({
        where: {
            ...baseWhere,
            ...facultyWhere,
            campaignId: { not: null }
        },
        include: formIncludeForIntelligence,
        orderBy: { createdAt: "asc" }
    });
};

const getTextIntelligenceItems = async (formIds) => {
    if (formIds.length === 0) return [];

    const responses = await prisma.feedbackResponse.findMany({
        where: {
            question: { questionType: "TEXT" },
            answerText: { not: null },
            submission: {
                formId: { in: formIds },
                status: "COMPLETED"
            }
        },
        select: {
            answerText: true,
            sentimentLabel: true,
            sentimentScore: true,
            themeTags: true
        }
    });

    return responses.flatMap((response) => {
        try {
            const text = decryptField(response.answerText);
            const storedThemes = Array.isArray(response.themeTags) ? response.themeTags : [];
            const fallback = analyzeTextResponse(text);

            return [{
                text,
                sentimentLabel: response.sentimentLabel || fallback.sentimentLabel,
                sentimentScore: response.sentimentScore ?? fallback.sentimentScore,
                themeTags: storedThemes.length ? storedThemes : fallback.themeTags
            }];
        } catch {
            return [];
        }
    });
};

const getRatingAverage = async (formIds) => {
    const average = await getAverageRatingForForms(formIds);
    return average === null ? 0 : average;
};

const buildCampaignTrends = async (forms) => {
    const campaigns = new Map();

    forms.forEach((form) => {
        if (!form.campaign) return;
        const current = campaigns.get(form.campaign.id) || {
            id: form.campaign.id,
            title: form.campaign.title,
            type: form.campaign.type,
            createdAt: form.campaign.createdAt,
            department: form.campaign.targetDepartment,
            course: form.campaign.targetCourseAssignment?.course || null,
            forms: [],
            submissions: 0
        };
        current.forms.push(form.id);
        current.submissions += form._count?.submissions || 0;
        campaigns.set(form.campaign.id, current);
    });

    const trendRows = await Promise.all(
        Array.from(campaigns.values())
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            .map(async (campaign) => ({
                id: campaign.id,
                title: campaign.title,
                type: campaign.type,
                label: campaign.course?.code || campaign.department?.code || campaign.title,
                submissions: campaign.submissions,
                averageRating: campaign.submissions >= PRIVACY_THRESHOLD
                    ? await getRatingAverage(campaign.forms)
                    : null,
                analyticsHidden: campaign.submissions < PRIVACY_THRESHOLD
            }))
    );

    const visibleRatings = trendRows.filter((row) => row.averageRating !== null);
    const latest = visibleRatings.at(-1);
    const previous = visibleRatings.at(-2);
    const ratingDelta = latest && previous
        ? Number((latest.averageRating - previous.averageRating).toFixed(2))
        : null;

    return {
        campaigns: trendRows,
        ratingDelta,
        ratingTrend: ratingDelta === null
            ? "Not enough historical rating data yet."
            : ratingDelta > 0
                ? `Teaching satisfaction improving by ${ratingDelta} points.`
                : ratingDelta < 0
                    ? `Teaching satisfaction declined by ${Math.abs(ratingDelta)} points.`
                    : "Teaching satisfaction is stable across recent campaigns.",
        participationTrend: trendRows.length < 2
            ? "Not enough campaign history for participation trends."
            : trendRows.at(-1).submissions > trendRows.at(-2).submissions
                ? "Participation increased in the latest campaign."
                : trendRows.at(-1).submissions < trendRows.at(-2).submissions
                    ? "Participation declined in the latest campaign."
                    : "Participation is stable in the latest campaign."
    };
};

const buildActionCenter = async (user, themes, trends) => {
    const observations = [];
    const departments = await getCrossDepartmentAnalytics(user);

    departments.forEach((item) => {
        if (!item.analyticsHidden && item.participationRate < 40) {
            observations.push({
                type: "PARTICIPATION",
                severity: "WARNING",
                message: `Participation below 40% in ${item.department.code}.`
            });
        }
    });

    themes
        .filter((theme) => theme.count >= 3)
        .slice(0, 4)
        .forEach((theme) => {
            observations.push({
                type: "THEME",
                severity: "INFO",
                message: `${theme.theme} mentioned in ${theme.count} text responses.`
            });
        });

    trends.campaigns
        .filter((campaign, index, rows) => {
            const previous = rows[index - 1];
            return previous &&
                previous.averageRating !== null &&
                campaign.averageRating !== null &&
                campaign.averageRating < previous.averageRating;
        })
        .slice(-3)
        .forEach((campaign) => {
            observations.push({
                type: "RATING_TREND",
                severity: "WARNING",
                message: `${campaign.label} satisfaction declining across recent campaigns.`
            });
        });

    return observations.slice(0, 8);
};

export const getDashboardIntelligence = async (user, scope = "ADMIN") => {
    const forms = await getScopedForms(user, scope);
    const formIds = forms.map((form) => form.id);
    const totalSubmissions = forms.reduce((sum, form) => sum + (form._count?.submissions || 0), 0);

    if (totalSubmissions < PRIVACY_THRESHOLD) {
        return {
            totalSubmissions,
            analyticsHidden: true,
            privacyThreshold: PRIVACY_THRESHOLD,
            sentiment: analyzeSentiment([]),
            themes: [],
            strengths: [],
            improvementAreas: [],
            trends: {
                campaigns: [],
                ratingDelta: null,
                ratingTrend: "Analytics are hidden until the privacy threshold is met.",
                participationTrend: "Analytics are hidden until the privacy threshold is met."
            },
            actionCenter: []
        };
    }

    const textItems = await getTextIntelligenceItems(formIds);
    const themes = extractThemes(textItems);
    const strengthsAndImprovements = generateStrengthsAndImprovements(textItems);
    const trends = await buildCampaignTrends(forms);

    return {
        totalSubmissions,
        analyticsHidden: false,
        privacyThreshold: PRIVACY_THRESHOLD,
        sentiment: analyzeSentiment(textItems),
        themes,
        summary: generateSummary(textItems),
        ...strengthsAndImprovements,
        trends,
        actionCenter: scope === "ADMIN" ? await buildActionCenter(user, themes, trends) : []
    };
};
