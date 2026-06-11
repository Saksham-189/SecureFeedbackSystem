import prisma from "../../prisma/prismaClient.js";
import generateAnonymousToken from "../../utils/generateAnonymousToken.js";
import auditLogger from "../../utils/auditLogger.js";
import { encryptField } from "../../utils/cryptoUtils.js";
import { assertStudentEligibleForForm } from "../campaign/campaign.service.js";
import { analyzeTextResponse } from "../analytics/ai.service.js";
import crypto from "crypto";

const getRoleName = (user) => user?.role?.name || user?.role;
const isSuperAdmin = (user) => getRoleName(user) === "SUPER_ADMIN";
const isAdminLike = (user) => ["ADMIN", "FACULTY"].includes(getRoleName(user));
const textQuestionTypes = new Set(["TEXT", "SHORT_ANSWER", "PARAGRAPH"]);
const ratingQuestionTypes = new Set(["RATING", "LINEAR_SCALE", "RATING_SCALE", "RATING_10"]);
const singleChoiceQuestionTypes = new Set(["MCQ", "MULTIPLE_CHOICE", "DROPDOWN", "YES_NO"]);
const checkboxQuestionTypes = new Set(["CHECKBOX", "CHECKBOXES"]);

const getOrCreateSemesterByNumber = async (semesterNumber, collegeId) => {
    const number = Number(semesterNumber);
    if (!Number.isInteger(number) || number < 1 || number > 8) {
        throw new Error("Semester target must be between 1 and 8");
    }

    const currentYear = await prisma.academicYear.findFirst({
        where: { collegeId, isCurrent: true }
    });

    const academicYear = currentYear || await prisma.academicYear.create({
        data: {
            collegeId,
            name: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
            isCurrent: true
        }
    });

    return prisma.semester.upsert({
        where: {
            academicYearId_number: {
                academicYearId: academicYear.id,
                number
            }
        },
        update: { name: `Semester ${number}` },
        create: {
            academicYearId: academicYear.id,
            number,
            name: `Semester ${number}`
        }
    });
};

const buildFormTarget = async (data, collegeId) => {
    const target = {};

    if (data.targetDepartmentId) {
        const department = await prisma.department.findFirst({
            where: { id: data.targetDepartmentId, collegeId }
        });
        if (!department) throw new Error("Target department not found");
        target.targetDepartmentId = department.id;
    }

    if (data.targetSemesterId) {
        const semester = await prisma.semester.findFirst({
            where: { id: data.targetSemesterId, academicYear: { collegeId } }
        });
        if (!semester) throw new Error("Target semester not found");
        target.targetSemesterId = semester.id;
    } else if (data.targetSemesterNumber) {
        const semester = await getOrCreateSemesterByNumber(data.targetSemesterNumber, collegeId);
        target.targetSemesterId = semester.id;
    }

    if (data.targetSectionId) {
        const section = await prisma.section.findFirst({
            where: { id: data.targetSectionId, department: { collegeId } }
        });
        if (!section) throw new Error("Target section not found");
        target.targetSectionId = section.id;
        target.targetDepartmentId = target.targetDepartmentId || section.departmentId;
        target.targetSemesterId = target.targetSemesterId || section.semesterId;
    }

    return target;
};

const upsertDeliveryCampaignForForm = async (tx, form, data, user) => {
    const target = await buildFormTarget(data, form.collegeId);
    const campaignData = {
        title: form.title,
        description: form.description || null,
        type: "FACULTY_EVAL",
        collegeId: form.collegeId,
        createdById: user.id,
        status: form.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
        startDate: null,
        endDate: form.expiresAt || null,
        targetDepartmentId: target.targetDepartmentId || null,
        targetSemesterId: target.targetSemesterId || null,
        targetSectionId: target.targetSectionId || null
    };

    if (form.campaignId) {
        return tx.campaign.update({
            where: { id: form.campaignId },
            data: campaignData
        });
    }

    const campaign = await tx.campaign.create({ data: campaignData });
    await tx.feedbackForm.update({
        where: { id: form.id },
        data: { campaignId: campaign.id }
    });
    return campaign;
};

const byCollegeScope = (user) => {
    if (isSuperAdmin(user)) return {};
    if (!user.collegeId) throw new Error("User is not assigned to a college");
    return { collegeId: user.collegeId };
};

// ============================================================================
// ADMIN: FORM BUILDER SERVICES
// ============================================================================

export const createFeedbackForm = async (data, user) => {
    if (getRoleName(user) !== "ADMIN") {
        throw new Error("Only College Admins can create feedback forms");
    }

    if (!user.collegeId) {
        throw new Error("Cannot create a form without an assigned college");
    }

    const form = await prisma.$transaction(async (tx) => {
        const created = await tx.feedbackForm.create({
            data: {
                title: data.title,
                description: data.description,
                collegeId: user.collegeId,
                status: data.status || "DRAFT",
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
                questions: {
                    create: data.questions.map(q => ({
                        orderIndex: q.orderIndex,
                        questionText: q.questionText,
                        questionType: q.questionType,
                        isRequired: q.isRequired,
                        options: q.options || null,
                        conditionalLogic: q.conditionalLogic || null
                    }))
                }
            },
            include: {
                questions: true
            }
        });

        await upsertDeliveryCampaignForForm(tx, created, data, user);

        return tx.feedbackForm.findUnique({
            where: { id: created.id },
            include: {
                questions: true,
                campaign: true
            }
        });
    });

    await auditLogger({
        userId: user.id,
        action: "FORM_CREATED",
        resourceType: "FORM",
        resourceId: form.id,
        severity: "INFO",
        details: { status: form.status }
    });

    return form;
};

export const updateFeedbackForm = async (formId, data, user) => {
    if (getRoleName(user) !== "ADMIN") {
        throw new Error("Only College Admins can update feedback forms");
    }

    // 1. Check if form exists and belongs to the college
    const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: formId }
    });

    if (!existingForm) throw new Error("Form not found");
    if (existingForm.collegeId !== user.collegeId) {
        throw new Error("Unauthorized access to form");
    }

    // 2. Prevent deep structural changes if PUBLISHED
    // If it's published and has submissions, changing questions corrupts data analytics.
    if (existingForm.status === "PUBLISHED" && data.questions) {
        const submissionCount = await prisma.feedbackSubmission.count({
            where: { formId }
        });
        
        if (submissionCount > 0) {
            throw new Error("Cannot edit questions of a published form with active submissions. Please duplicate it instead.");
        }
    }

    // 3. Perform update
    // For simplicity in this demo, if questions are provided, we delete old and insert new.
    // In a production system without submissions, this is acceptable.
    const updateData = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledFor !== undefined) {
        updateData.scheduledFor = data.scheduledFor ? new Date(data.scheduledFor) : null;
    }
    if (data.expiresAt !== undefined) {
        updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    if (data.questions) {
        await prisma.question.deleteMany({ where: { formId } });
        updateData.questions = {
            create: data.questions.map(q => ({
                orderIndex: q.orderIndex,
                questionText: q.questionText,
                questionType: q.questionType,
                isRequired: q.isRequired,
                options: q.options || null,
                conditionalLogic: q.conditionalLogic || null
            }))
        };
    }

    const updatedForm = await prisma.$transaction(async (tx) => {
        const updated = await tx.feedbackForm.update({
            where: { id: formId },
            data: updateData,
            include: {
                questions: {
                    orderBy: { orderIndex: "asc" }
                },
                campaign: true,
                _count: {
                    select: {
                        submissions: {
                            where: { status: "COMPLETED" }
                        }
                    }
                }
            }
        });

        await upsertDeliveryCampaignForForm(tx, updated, data, user);

        return tx.feedbackForm.findUnique({
            where: { id: formId },
            include: {
                questions: { orderBy: { orderIndex: "asc" } },
                campaign: {
                    include: {
                        targetDepartment: { select: { id: true, name: true, code: true } },
                        targetSemester: { select: { id: true, number: true, name: true } },
                        targetSection: { select: { id: true, name: true } }
                    }
                },
                _count: {
                    select: {
                        submissions: {
                            where: { status: "COMPLETED" }
                        }
                    }
                }
            }
        });
    });

    await auditLogger({
        userId: user.id,
        action: "FORM_UPDATED",
        resourceType: "FORM",
        resourceId: formId,
        severity: "INFO",
        details: { status: updatedForm.status }
    });

    return updatedForm;
};

export const deleteFeedbackForm = async (formId, user) => {
    if (getRoleName(user) !== "ADMIN") {
        throw new Error("Only College Admins can delete feedback forms");
    }

    const existingForm = await prisma.feedbackForm.findUnique({
        where: { id: formId },
        include: { _count: { select: { submissions: true } } }
    });

    if (!existingForm) throw new Error("Form not found");
    if (existingForm.collegeId !== user.collegeId) {
        throw new Error("Unauthorized access to form");
    }
    
    // Soft delete or Archive is usually preferred for audit reasons, 
    // but if requested to delete:
    if (existingForm.status === "PUBLISHED" && existingForm._count.submissions > 0) {
        throw new Error("Cannot delete a published form with submissions. Please archive it instead.");
    }

    await prisma.feedbackForm.delete({
        where: { id: formId }
    });

    await auditLogger({
        userId: user.id,
        action: "FORM_DELETED",
        resourceType: "FORM",
        resourceId: formId,
        severity: "WARNING"
    });

    return { success: true };
};

// ============================================================================
// STUDENT: SUBMISSION & INTEGRITY SERVICES
// ============================================================================

export const getAvailableForms = async (user) => {
    const now = new Date();
    
    return await prisma.feedbackForm.findMany({
        where: {
            collegeId: user.collegeId,
            status: "PUBLISHED",
            OR: [
                { scheduledFor: null },
                { scheduledFor: { lte: now } }
            ],
            AND: [
                {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: now } }
                    ]
                }
            ]
        },
        include: {
            questions: {
                orderBy: { orderIndex: "asc" }
            },
            // Check if student already submitted to mask it from their view if needed
            submissions: {
                where: { studentId: user.id },
                select: { id: true, status: true }
            }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const getFormsForAdmin = async (user) => {
    return await prisma.feedbackForm.findMany({
        where: byCollegeScope(user),
        include: {
            questions: {
                orderBy: { orderIndex: "asc" }
            },
            campaign: {
                include: {
                    targetDepartment: { select: { id: true, name: true, code: true } },
                    targetSemester: { select: { id: true, number: true, name: true } },
                    targetSection: { select: { id: true, name: true } }
                }
            },
            _count: {
                select: {
                    submissions: {
                        where: { status: "COMPLETED" }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });
};

export const getStudentSubmissions = async (user) => {
    return prisma.feedbackSubmission.findMany({
        where: {
            studentId: user.id,
            status: "COMPLETED",
            form: { collegeId: user.collegeId }
        },
        select: {
            id: true,
            anonymousToken: true,
            completedAt: true,
            completionTimeMs: true,
            form: {
                select: {
                    id: true,
                    title: true,
                    campaign: {
                        select: {
                            id: true,
                            title: true,
                            type: true,
                            targetDepartment: { select: { name: true, code: true } }
                        }
                    }
                }
            }
        },
        orderBy: { completedAt: "desc" }
    });
};

export const getFormById = async (formId, user) => {
    const include = {
        questions: {
            orderBy: { orderIndex: "asc" }
        }
    };

    if (isAdminLike(user)) {
        include._count = {
            select: {
                submissions: {
                    where: { status: "COMPLETED" }
                }
            }
        };
    } else {
        include.submissions = {
            where: { studentId: user.id },
            select: { id: true, status: true }
        };
    }

    const form = await prisma.feedbackForm.findFirst({
        where: {
            id: formId,
            ...byCollegeScope(user)
        },
        include
    });

    if (!form) throw new Error("Form not found");

    if (!isAdminLike(user)) {
        const now = new Date();
        const isScheduled = !form.scheduledFor || form.scheduledFor <= now;
        const isUnexpired = !form.expiresAt || form.expiresAt > now;

        if (form.status !== "PUBLISHED" || !isScheduled || !isUnexpired) {
            throw new Error("Form is not available");
        }

        await assertStudentEligibleForForm(formId, user);
    }

    return form;
};

export const submitFeedback = async (data, user, clientInfo = {}) => {
    // 1. Verify Form is Active
    const form = await prisma.feedbackForm.findUnique({
        where: { id: data.formId },
        include: { questions: true }
    });

    if (!form || form.status !== "PUBLISHED") {
        throw new Error("Form is not available for submission");
    }

    const now = new Date();
    if (form.collegeId !== user.collegeId) {
        throw new Error("Form is not available for your college");
    }

    if (form.scheduledFor && form.scheduledFor > now) {
        throw new Error("This form is not open yet");
    }

    if (form.expiresAt && form.expiresAt < now) {
        throw new Error("This form has expired");
    }

    await assertStudentEligibleForForm(data.formId, user);

    // 2. Duplicate Detection
    const existingSubmission = await prisma.feedbackSubmission.findFirst({
        where: {
            formId: data.formId,
            studentId: user.id
        }
    });

    if (existingSubmission && existingSubmission.status === "COMPLETED") {
        throw new Error("Feedback already submitted");
    }

    // 3. Anti-Abuse: Detect Impossible Completion Speed
    const startedAt = data.metrics?.startedAt ? new Date(data.metrics.startedAt) : now;
    const completionTimeMs = data.metrics?.completionTimeMs || (now.getTime() - startedAt.getTime());
    
    // If a 10-question form is completed in < 2 seconds, it's a bot
    const minimumPlausibleTime = form.questions.length * 500; // 500ms per question absolute minimum
    if (completionTimeMs < minimumPlausibleTime) {
        await prisma.abuseAnomaly.create({
            data: {
                formId: form.id,
                anomalyType: "RAPID_SUBMISSION",
                severity: "HIGH",
                metadata: { completionTimeMs, questionCount: form.questions.length, ip: clientInfo.ipAddress }
            }
        });
        // We log the anomaly, but depending on policy, we might silently reject or accept and flag.
        // For enterprise trust, we throw an error or mark it flagged.
        throw new Error("Submission rejected: Anomalous activity detected.");
    }

    // 4. Anonymization Layer
    const anonymousToken = generateAnonymousToken();

    // Securely hash device fingerprint and IP so we don't store raw PII in submissions
    const deviceFingerprintHash = clientInfo.deviceFingerprint 
        ? crypto.createHash("sha256").update(clientInfo.deviceFingerprint).digest("hex") 
        : null;
        
    const ipHash = clientInfo.ipAddress
        ? crypto.createHash("sha256").update(clientInfo.ipAddress).digest("hex")
        : null;

    // 5. Data Encryption & Normalization
    const questionsById = new Map(form.questions.map((question) => [question.id, question]));
    const responsesByQuestionId = new Map();

    for (const response of data.responses) {
        const question = questionsById.get(response.questionId);
        if (!question) {
            throw new Error("Submission contains an answer for an unknown question");
        }

        responsesByQuestionId.set(response.questionId, response);
    }

    for (const question of form.questions) {
        if (!question.isRequired) continue;

        const response = responsesByQuestionId.get(question.id);
        const hasText = typeof response?.answerText === "string" && response.answerText.trim().length > 0;
        const hasNumber = typeof response?.answerNumber === "number" && Number.isFinite(response.answerNumber);
        const hasArray = Array.isArray(response?.answerArray) && response.answerArray.length > 0;
        const hasFile = typeof response?.answerFile === "string" && response.answerFile.trim().length > 0;

        if (!response || (!hasText && !hasNumber && !hasArray && !hasFile)) {
            throw new Error(`Missing required answer: ${question.questionText}`);
        }
    }

    const encryptedResponses = Array.from(responsesByQuestionId.values()).map(response => {
        const question = questionsById.get(response.questionId);
        const intelligence = textQuestionTypes.has(question?.questionType) && response.answerText
            ? analyzeTextResponse(response.answerText)
            : {};

        const payload = {
            questionId: response.questionId,
            answerText: response.answerText ? encryptField(response.answerText) : null,
            answerNumber: response.answerNumber ?? null,
            answerArray: response.answerArray || null,
            answerFile: response.answerFile || null,
            sentimentLabel: intelligence.sentimentLabel || null,
            sentimentScore: intelligence.sentimentScore ?? null,
            themeTags: intelligence.themeTags || null
        };
        return payload;
    });

    // 6. DB Transaction
    const submission = await prisma.feedbackSubmission.create({
        data: {
            formId: data.formId,
            collegeId: form.collegeId,
            studentId: user.id,
            anonymousToken,
            status: "COMPLETED",
            deviceFingerprintHash,
            ipHash,
            completionTimeMs,
            startedAt,
            completedAt: now,
            responses: {
                create: encryptedResponses
            }
        },
        include: {
            responses: true
        }
    });

    await auditLogger({
        userId: user.id,
        action: "FEEDBACK_SUBMITTED",
        resourceType: "FORM",
        resourceId: data.formId,
        severity: "INFO"
    });

    // 7. Return detached token
    return {
        submissionId: submission.id,
        anonymousToken,
        receiptTimestamp: submission.completedAt
    };
};
