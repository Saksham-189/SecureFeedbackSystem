import { z } from "zod";

export const createFormSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    scheduledFor: z.string().datetime().optional(),
    expiresAt: z.string().datetime().optional(),

    questions: z.array(
        z.object({
            orderIndex: z.number().int().min(0),
            questionText: z.string().min(1).max(1000),
            questionType: z.enum([
                "TEXT",
                "MCQ",
                "CHECKBOX",
                "DROPDOWN",
                "RATING",
                "MATRIX",
                "FILE_UPLOAD"
            ]),
            isRequired: z.boolean().default(true),
            options: z.any().optional(), // Can be array of strings, or object for matrix
            conditionalLogic: z.any().optional() // Branching rules
        })
    ).min(1, "A form must have at least one question")
});

export const updateFormSchema = createFormSchema.partial().extend({
    // Only allow updating drafts or archiving published forms
    id: z.string().uuid()
});

export const submitFeedbackSchema = z.object({
    formId: z.string().uuid(),
    
    // Integrity tracking metrics collected from frontend
    metrics: z.object({
        startedAt: z.string().datetime(),
        completionTimeMs: z.number().min(0).optional(),
        deviceFingerprint: z.string().optional() // Usually taken from headers, but can be explicit
    }).optional(),

    responses: z.array(
        z.object({
            questionId: z.string().uuid(),
            answerText: z.string().optional(),
            answerNumber: z.number().optional(),
            answerArray: z.array(z.string()).optional(),
            answerFile: z.string().optional()
        })
    ).min(1, "At least one response is required")
});