import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    collegeId: z.string().min(1, "Please select a college"),
    departmentId: z.string().min(1, "Please select a department"),
    semesterNumber: z.number().int().min(1).max(8),
    sectionId: z.string().min(1, "Please select a section")
});

export const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required")
});
