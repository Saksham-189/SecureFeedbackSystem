import prisma from "../../prisma/prismaClient.js";
import auditLogger from "../../utils/auditLogger.js";

const CAMPAIGN_TYPES = new Set([
    "FACULTY_EVAL",
    "COURSE_EVAL",
    "LAB_EVAL",
    "INFRA_EVAL",
    "HOSTEL_EVAL",
    "MESS_EVAL",
    "PLACEMENT_EVAL",
    "EVENT_EVAL",
    "GRIEVANCE"
]);

const CAMPAIGN_STATUSES = new Set(["DRAFT", "PUBLISHED", "ACTIVE", "CLOSED", "ARCHIVED"]);

const getRoleName = (user) => user?.role?.name || user?.role;
const isSuperAdmin = (user) => getRoleName(user) === "SUPER_ADMIN";

const collegeScope = (user) => {
    if (!user?.collegeId && !isSuperAdmin(user)) {
        throw new Error("User is not assigned to a college");
    }
    return user.collegeId;
};

const openCampaignWhere = (now = new Date()) => ({
    status: { in: ["PUBLISHED", "ACTIVE"] },
    OR: [{ startDate: null }, { startDate: { lte: now } }],
    AND: [{ OR: [{ endDate: null }, { endDate: { gt: now } }] }]
});

const ensureDateOrder = (startDate, endDate) => {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw new Error("Campaign end date must be after the start date");
    }
};

const defaultQuestionsForType = (type) => {
    if (type === "GRIEVANCE") {
        return [
            { orderIndex: 0, questionText: "What category best describes this report?", questionType: "DROPDOWN", isRequired: true, options: ["Harassment", "Bullying", "Ragging", "Discrimination", "Academic Misconduct", "Other"] },
            { orderIndex: 1, questionText: "Please describe the concern.", questionType: "TEXT", isRequired: true },
            { orderIndex: 2, questionText: "How urgent is this issue?", questionType: "RATING", isRequired: true }
        ];
    }

    return [
        { orderIndex: 0, questionText: "Overall, how satisfied are you?", questionType: "RATING", isRequired: true },
        { orderIndex: 1, questionText: "What worked well?", questionType: "TEXT", isRequired: false },
        { orderIndex: 2, questionText: "What should be improved?", questionType: "TEXT", isRequired: false }
    ];
};

const assertTargetBelongsToCollege = async (data, collegeId) => {
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
    }

    if (data.targetSectionId) {
        const section = await prisma.section.findFirst({
            where: { id: data.targetSectionId, department: { collegeId } }
        });
        if (!section) throw new Error("Target section not found");
        target.targetSectionId = section.id;
    }

    if (data.targetCourseAssignmentId) {
        const assignment = await prisma.courseAssignment.findFirst({
            where: { id: data.targetCourseAssignmentId, course: { department: { collegeId } } },
            include: { course: true, section: true }
        });
        if (!assignment) throw new Error("Target course assignment not found");

        target.targetCourseAssignmentId = assignment.id;
        target.targetDepartmentId = target.targetDepartmentId || assignment.course.departmentId;
        target.targetSemesterId = target.targetSemesterId || assignment.semesterId;
        target.targetSectionId = target.targetSectionId || assignment.sectionId;
    }

    return target;
};

const includeCampaignDetails = {
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
    },
    forms: {
        include: {
            questions: { orderBy: { orderIndex: "asc" } },
            _count: { select: { submissions: { where: { status: "COMPLETED" } } } }
        }
    },
    createdBy: { select: { id: true, name: true, email: true } }
};

export const createCampaign = async (data, user) => {
    const collegeId = collegeScope(user);
    const title = data.title?.trim();
    const type = data.type || "FACULTY_EVAL";
    const status = data.status || "DRAFT";

    if (!title) throw new Error("Campaign title is required");
    if (!CAMPAIGN_TYPES.has(type)) throw new Error("Unsupported campaign type");
    if (!CAMPAIGN_STATUSES.has(status)) throw new Error("Unsupported campaign status");

    ensureDateOrder(data.startDate, data.endDate);
    const target = await assertTargetBelongsToCollege(data, collegeId);
    const questions = data.questions?.length ? data.questions : defaultQuestionsForType(type);
    const formTitle = data.formTitle?.trim() || title;

    const campaign = await prisma.$transaction(async (tx) => {
        const createdCampaign = await tx.campaign.create({
            data: {
                title,
                description: data.description?.trim() || null,
                type,
                collegeId,
                createdById: user.id,
                ...target,
                status,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null
            }
        });

        await tx.feedbackForm.create({
            data: {
                title: formTitle,
                description: data.formDescription?.trim() || data.description?.trim() || null,
                collegeId,
                campaignId: createdCampaign.id,
                status: ["PUBLISHED", "ACTIVE"].includes(status) ? "PUBLISHED" : "DRAFT",
                scheduledFor: data.startDate ? new Date(data.startDate) : null,
                expiresAt: data.endDate ? new Date(data.endDate) : null,
                questions: {
                    create: questions.map((question, index) => ({
                        orderIndex: question.orderIndex ?? index,
                        questionText: question.questionText,
                        questionType: question.questionType,
                        isRequired: question.isRequired ?? true,
                        options: question.options || null,
                        conditionalLogic: question.conditionalLogic || null
                    }))
                }
            }
        });

        return tx.campaign.findUnique({
            where: { id: createdCampaign.id },
            include: includeCampaignDetails
        });
    });

    await auditLogger({
        userId: user.id,
        action: "CAMPAIGN_CREATED",
        resourceType: "CAMPAIGN",
        resourceId: campaign.id,
        severity: "INFO",
        details: { type, status, target }
    });

    return campaign;
};

export const getCampaigns = async (user, filters = {}) => {
    const where = {
        ...(isSuperAdmin(user) ? {} : { collegeId: collegeScope(user) }),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.departmentId ? { targetDepartmentId: filters.departmentId } : {})
    };

    return prisma.campaign.findMany({
        where,
        include: includeCampaignDetails,
        orderBy: { createdAt: "desc" }
    });
};

export const getCampaignById = async (campaignId, user) => {
    return prisma.campaign.findFirst({
        where: {
            id: campaignId,
            ...(isSuperAdmin(user) ? {} : { collegeId: collegeScope(user) })
        },
        include: includeCampaignDetails
    });
};

export const updateCampaignStatus = async (campaignId, status, user) => {
    if (!CAMPAIGN_STATUSES.has(status)) throw new Error("Unsupported campaign status");

    const existing = await getCampaignById(campaignId, user);
    if (!existing) throw new Error("Campaign not found");

    const campaign = await prisma.$transaction(async (tx) => {
        const updated = await tx.campaign.update({
            where: { id: campaignId },
            data: { status }
        });

        if (["PUBLISHED", "ACTIVE"].includes(status)) {
            await tx.feedbackForm.updateMany({
                where: { campaignId, status: "DRAFT" },
                data: { status: "PUBLISHED" }
            });
        }

        if (["CLOSED", "ARCHIVED"].includes(status)) {
            await tx.feedbackForm.updateMany({
                where: { campaignId, status: "PUBLISHED" },
                data: { status: "ARCHIVED" }
            });
        }

        return updated;
    });

    await auditLogger({
        userId: user.id,
        action: "CAMPAIGN_STATUS_CHANGED",
        resourceType: "CAMPAIGN",
        resourceId: campaignId,
        severity: ["CLOSED", "ARCHIVED"].includes(status) ? "WARNING" : "INFO",
        details: { from: existing.status, to: status }
    });

    return getCampaignById(campaign.id, user);
};

export const studentMatchesCampaign = (campaign, enrollments) => {
    if (!campaign) return false;

    if (campaign.targetCourseAssignmentId) {
        const assignment = campaign.targetCourseAssignment;
        if (!assignment) return false;
        return enrollments.some((enrollment) =>
            enrollment.sectionId === assignment.sectionId &&
            enrollment.semesterId === assignment.semesterId
        );
    }

    return enrollments.some((enrollment) => {
        const departmentMatch = !campaign.targetDepartmentId || enrollment.section.departmentId === campaign.targetDepartmentId;
        const semesterMatch = !campaign.targetSemesterId || enrollment.semesterId === campaign.targetSemesterId;
        const sectionMatch = !campaign.targetSectionId || enrollment.sectionId === campaign.targetSectionId;
        return departmentMatch && semesterMatch && sectionMatch;
    });
};

export const assertStudentEligibleForForm = async (formId, user) => {
    const form = await prisma.feedbackForm.findFirst({
        where: { id: formId, collegeId: user.collegeId },
        include: {
            campaign: {
                include: {
                    targetCourseAssignment: true
                }
            }
        }
    });

    if (!form) throw new Error("Form not found");
    if (!form.campaignId) return form;

    const now = new Date();
    const campaign = form.campaign;
    const isOpen = ["PUBLISHED", "ACTIVE"].includes(campaign.status) &&
        (!campaign.startDate || campaign.startDate <= now) &&
        (!campaign.endDate || campaign.endDate > now);

    if (!isOpen) throw new Error("Campaign is not open for submissions");

    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: user.id },
        include: { section: true }
    });

    if (!studentMatchesCampaign(campaign, enrollments)) {
        throw new Error("You are not eligible for this feedback campaign");
    }

    return form;
};

export const getStudentCampaigns = async (studentId, collegeId) => {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId },
        include: { section: true }
    });

    if (enrollments.length === 0) return [];

    const campaigns = await prisma.campaign.findMany({
        where: {
            collegeId,
            ...openCampaignWhere()
        },
        include: {
            ...includeCampaignDetails,
            forms: {
                where: { status: "PUBLISHED" },
                include: {
                    questions: { orderBy: { orderIndex: "asc" } },
                    _count: { select: { submissions: { where: { status: "COMPLETED" } } } },
                    submissions: {
                        where: { studentId },
                        select: { id: true, status: true }
                    }
                }
            }
        },
        orderBy: { createdAt: "desc" }
    });

    return campaigns.filter((campaign) => studentMatchesCampaign(campaign, enrollments));
};

export const getFacultyCampaigns = async (user) => {
    return prisma.campaign.findMany({
        where: {
            ...(isSuperAdmin(user) ? {} : { collegeId: collegeScope(user) }),
            targetCourseAssignment: { facultyId: user.id },
            status: { in: ["PUBLISHED", "ACTIVE", "CLOSED", "ARCHIVED"] }
        },
        include: includeCampaignDetails,
        orderBy: { createdAt: "desc" }
    });
};
