ALTER TABLE "FeedbackResponse"
ADD COLUMN "sentimentLabel" TEXT,
ADD COLUMN "sentimentScore" DOUBLE PRECISION,
ADD COLUMN "themeTags" JSONB;

CREATE INDEX "FeedbackResponse_sentimentLabel_idx" ON "FeedbackResponse"("sentimentLabel");
