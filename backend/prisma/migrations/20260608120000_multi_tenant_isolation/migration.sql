-- Strengthen tenant isolation with direct college ownership keys.

ALTER TABLE "College" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "designation" TEXT;

ALTER TABLE "AuditLog" ADD COLUMN "collegeId" TEXT;
UPDATE "AuditLog" AS al
SET "collegeId" = u."collegeId"
FROM "User" AS u
WHERE al."userId" = u."id";

ALTER TABLE "CourseAssignment" ADD COLUMN "collegeId" TEXT;
UPDATE "CourseAssignment" AS ca
SET "collegeId" = d."collegeId"
FROM "Course" AS c
JOIN "Department" AS d ON d."id" = c."departmentId"
WHERE ca."courseId" = c."id";
ALTER TABLE "CourseAssignment" ALTER COLUMN "collegeId" SET NOT NULL;

ALTER TABLE "Enrollment" ADD COLUMN "collegeId" TEXT;
UPDATE "Enrollment" AS e
SET "collegeId" = d."collegeId"
FROM "Section" AS s
JOIN "Department" AS d ON d."id" = s."departmentId"
WHERE e."sectionId" = s."id";
ALTER TABLE "Enrollment" ALTER COLUMN "collegeId" SET NOT NULL;

ALTER TABLE "FeedbackSubmission" ADD COLUMN "collegeId" TEXT;
UPDATE "FeedbackSubmission" AS fs
SET "collegeId" = ff."collegeId"
FROM "FeedbackForm" AS ff
WHERE fs."formId" = ff."id";
ALTER TABLE "FeedbackSubmission" ALTER COLUMN "collegeId" SET NOT NULL;

CREATE INDEX "AuditLog_collegeId_idx" ON "AuditLog"("collegeId");
CREATE INDEX "CourseAssignment_collegeId_idx" ON "CourseAssignment"("collegeId");
CREATE INDEX "Enrollment_collegeId_idx" ON "Enrollment"("collegeId");
CREATE INDEX "FeedbackSubmission_collegeId_idx" ON "FeedbackSubmission"("collegeId");

ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CourseAssignment" ADD CONSTRAINT "CourseAssignment_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FeedbackSubmission" ADD CONSTRAINT "FeedbackSubmission_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
